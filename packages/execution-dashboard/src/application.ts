import { createHash, createPublicKey, randomBytes, randomUUID, scrypt, timingSafeEqual } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { promisify } from "node:util";
import { hashScenarioTemplate, parseScenarioTemplate, type ScenarioTemplate } from "@permio/scenario-domain";
import { ScenarioGovernanceRegistry, type NamespacePolicy, type ReviewerAttestation, type TemplateTarget } from "@permio/scenario-governance";
import { ContextAccountSystem } from "@permio/context-accounts";

const deriveKey = promisify(scrypt);
const id = () => `u${randomUUID().replaceAll("-", "")}`;
const digest = (value: string) => createHash("sha256").update(value).digest("hex");
export class ApplicationError extends Error {
  readonly status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}
export interface Account { id: string; username: string; displayName: string; createdAt: number; reviewKey: string | null }
export interface IdentityProvider {
  readonly mode: "local" | "dynamic";
  register(input: Record<string, unknown>): Promise<Account>;
  authenticate(input: Record<string, unknown>): Promise<Account>;
}
export interface Session { account: Account; csrf: string; expiresAt: number; tokenHash: string }
interface GovernanceEvent { type: "review" | "activate" | "retire" | "revoke" | "allocate"; actor: string; at: number; data: any }
interface Blueprint {
  id: string; ownerId: string; template: ScenarioTemplate; createdAt: number; updatedAt: number;
  validated: boolean; policy: NamespacePolicy | null; submittedAt: number | null;
  roles: Record<string, string>; events: GovernanceEvent[];
}
const roleNames = ["reviewer", "approver", "allocator", "revoker"] as const;
export function text(value: unknown, label: string, max = 160, optional = false): string {
  if (typeof value !== "string" || (!optional && !value.trim()) || value.length > max) {
    throw new ApplicationError(400, `Enter a valid ${label}.`);
  }
  return value.trim().normalize("NFC");
}
function username(value: unknown): string {
  const result = text(value, "username", 32).toLowerCase();
  if (!/^[a-z0-9][a-z0-9_-]{2,31}$/.test(result)) throw new ApplicationError(400, "Use 3–32 letters, numbers, underscores or hyphens for your username.");
  return result;
}
function password(value: unknown, minimumLength: number): string {
  if (typeof value !== "string" || value.length < minimumLength || value.length > 128) throw new ApplicationError(400, `Use a password between ${minimumLength} and 128 characters.`);
  return value;
}
function bounded(value: unknown, min: number, max: number, label: string): number {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < min || number > max) throw new ApplicationError(400, `Enter a valid ${label}.`);
  return number;
}
const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "action";
export function buildBlueprint(input: Record<string, unknown>, namespace: string, templateId?: string): ScenarioTemplate {
  const name = text(input.name, "workflow name", 100);
  const description = text(input.description, "description", 1000);
  const contextName = text(input.context, "context", 100);
  const actionName = text(input.action, "action", 100);
  const purpose = `p-${slug(text(input.purpose, "purpose", 160))}`;
  const recipient = `r-${slug(text(input.recipientKind, "recipient type", 100))}`;
  const resource = `r-${slug(text(input.resource, "resource type", 100))}`;
  const duration = bounded(input.duration, 60, 86400, "validity period");
  const action = `a-${slug(actionName)}`, context = `c-${slug(contextName)}`;
  return parseScenarioTemplate({
    schemaVersion: 1, namespace, templateId: templateId ?? `${namespace}/b-${slug(name)}`, version: "1.0.0",
    displayName: name, description,
    participantSlots: [{ id: "participant", description: "The person performing the action.", assignableBy: ["@instance-creator"] }],
    contexts: [{ id: context, description: contextName, allowedSlotIds: ["participant"], recordTypes: ["supporting-record"], claimTypes: ["authorization"], recipientKinds: [recipient], purposes: [purpose] }],
    states: ["ready", "completed"], initialState: "ready",
    actions: [{ id: action, description: actionName, contextId: context, actorSlotId: "participant", inputRecordTypes: ["supporting-record"], outputClaimTypes: ["authorization"], purpose, recipientKind: recipient, capabilityRuleId: "bounded-action", proofProfileId: "delegated-authorization", executionAdapterId: null }],
    transitions: [{ id: "complete-action", fromState: "ready", actionId: action, toState: "completed" }],
    capabilityRules: [{ id: "bounded-action", description: "A time-limited, recipient-bound action.", actionIds: [action], resourceSelector: resource, purpose, recipientConstraint: recipient, validForSeconds: duration, maxDelegationDepth: 0, disclosurePolicyId: "minimum-authorization", revocable: true }],
    proofProfiles: [{ id: "delegated-authorization", circuitId: "delegated-capability-action-v1", publicOutputSchemaId: "decision-receipt-v1" }],
    executionAdapters: [],
    privacyInvariants: [{ id: "context-specific-identity", description: "Do not disclose account identities or private supporting records in public receipts." }],
  });
}

export class ApplicationStore {
  readonly db: DatabaseSync;
  readonly identity: IdentityProvider;
  readonly now: () => number;
  readonly minimumPasswordLength: number;
  constructor(path: string, now: () => number = () => Math.floor(Date.now() / 1000), minimumPasswordLength = 10) {
    this.now = now;
    if (![4, 10].includes(minimumPasswordLength)) throw new Error("Unsupported password policy");
    this.minimumPasswordLength = minimumPasswordLength;
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
    this.db = new DatabaseSync(path);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS accounts(id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, displayName TEXT NOT NULL, passwordHash TEXT NOT NULL, salt TEXT NOT NULL, createdAt INTEGER NOT NULL, reviewKey TEXT);
      CREATE TABLE IF NOT EXISTS sessions(tokenHash TEXT PRIMARY KEY, accountId TEXT NOT NULL REFERENCES accounts(id), csrf TEXT NOT NULL, expiresAt INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS blueprints(id TEXT PRIMARY KEY, document TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS instances(id TEXT PRIMARY KEY, blueprintId TEXT NOT NULL, document TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS activity(id TEXT PRIMARY KEY, accountId TEXT NOT NULL, label TEXT NOT NULL, at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS receipt_access(accountId TEXT NOT NULL, receiptId TEXT NOT NULL, PRIMARY KEY(accountId,receiptId));
      CREATE TABLE IF NOT EXISTS attempts(key TEXT PRIMARY KEY, count INTEGER NOT NULL, expiresAt INTEGER NOT NULL);`);
    this.identity = { mode: "local", register: (input) => this.register(input), authenticate: (input) => this.authenticate(input) };
  }
  close(): void { this.db.close(); }
  transaction<T>(operation: () => T): T {
    this.db.exec("BEGIN IMMEDIATE");
    try { const result = operation(); this.db.exec("COMMIT"); return result; }
    catch (error) { this.db.exec("ROLLBACK"); throw error; }
  }
  account(accountId: string): Account {
    const row = this.db.prepare("SELECT id,username,displayName,createdAt,reviewKey FROM accounts WHERE id=?").get(accountId);
    if (!row) throw new ApplicationError(401, "Please log in again.");
    return { ...row } as unknown as Account;
  }
  private findUser(name: unknown): Account {
    const row = this.db.prepare("SELECT id FROM accounts WHERE username=?").get(username(name));
    if (!row) throw new ApplicationError(400, "One of the named accounts could not be found. Ask them to register first.");
    return this.account(String(row.id));
  }
  async register(input: Record<string, unknown>): Promise<Account> {
    const name = username(input.username), secret = password(input.password, this.minimumPasswordLength);
    const displayName = text(input.displayName ?? "", "display name", 80, true) || name;
    const salt = randomBytes(16).toString("hex");
    const hash = await deriveKey(secret, salt, 64) as Buffer;
    const accountId = id();
    try { this.db.prepare("INSERT INTO accounts(id,username,displayName,passwordHash,salt,createdAt) VALUES(?,?,?,?,?,?)").run(accountId, name, displayName, hash.toString("hex"), salt, this.now()); }
    catch (error) { if (this.db.prepare("SELECT id FROM accounts WHERE username=?").get(name)) throw new ApplicationError(409, "That username is unavailable."); throw error; }
    this.log(accountId, "Account created");
    return this.account(accountId);
  }
  async authenticate(input: Record<string, unknown>): Promise<Account> {
    const name = username(input.username);
    const secret = typeof input.password === "string" && input.password.length <= 128 ? input.password : "";
    const row = this.db.prepare("SELECT id,passwordHash,salt FROM accounts WHERE username=?").get(name);
    const hash = await deriveKey(secret, String(row?.salt ?? "unregistered-account-salt"), 64) as Buffer;
    const expected = row ? Buffer.from(String(row.passwordHash), "hex") : Buffer.alloc(64);
    if (!timingSafeEqual(hash, expected) || !row) throw new ApplicationError(401, "The username or password is incorrect.");
    return this.account(String(row.id));
  }
  throttle(key: string): void {
    const hashed = digest(key), now = this.now();
    this.db.prepare("DELETE FROM attempts WHERE expiresAt<=?").run(now);
    const row = this.db.prepare("SELECT count FROM attempts WHERE key=?").get(hashed);
    if (Number(row?.count ?? 0) >= 20) throw new ApplicationError(429, "Too many attempts. Please try again in 15 minutes.");
    this.db.prepare("INSERT INTO attempts VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1").run(hashed, now + 900);
  }
  createSession(accountId: string, previous?: string): { token: string; session: Session } {
    if (previous) this.logout(previous);
    this.db.prepare("DELETE FROM sessions WHERE expiresAt<=?").run(this.now());
    const token = randomBytes(32).toString("base64url"), csrf = randomBytes(24).toString("base64url"), expiresAt = this.now() + 8 * 3600;
    this.db.prepare("INSERT INTO sessions VALUES(?,?,?,?)").run(digest(token), accountId, csrf, expiresAt);
    return { token, session: { account: this.account(accountId), csrf, expiresAt, tokenHash: digest(token) } };
  }
  session(token?: string): Session | null {
    if (!token) return null;
    const row = this.db.prepare("SELECT * FROM sessions WHERE tokenHash=? AND expiresAt>?").get(digest(token), this.now());
    return row ? { account: this.account(String(row.accountId)), csrf: String(row.csrf), expiresAt: Number(row.expiresAt), tokenHash: String(row.tokenHash) } : null;
  }
  logout(token: string): void { this.db.prepare("DELETE FROM sessions WHERE tokenHash=?").run(digest(token)); }
  profile(user: Account, input: Record<string, unknown>): Account {
    const displayName = text(input.displayName, "display name", 80);
    this.db.prepare("UPDATE accounts SET displayName=? WHERE id=?").run(displayName, user.id);
    return this.account(user.id);
  }
  async changePassword(user: Account, input: Record<string, unknown>): Promise<void> {
    await this.authenticate({ username: user.username, password: input.currentPassword });
    const secret = password(input.newPassword, this.minimumPasswordLength), salt = randomBytes(16).toString("hex");
    const hash = await deriveKey(secret, salt, 64) as Buffer;
    this.transaction(() => {
      this.db.prepare("UPDATE accounts SET passwordHash=?,salt=? WHERE id=?").run(hash.toString("hex"), salt, user.id);
      this.db.prepare("DELETE FROM sessions WHERE accountId=?").run(user.id);
    });
  }
  registerReviewKey(user: Account, input: unknown): void {
    const pem = text(input, "signing key", 1000);
    try {
      const key = createPublicKey(pem);
      if (key.asymmetricKeyType !== "ed25519" || key.export({ type: "spki", format: "pem" }).toString().trim() !== pem) throw new Error();
    }
    catch { throw new ApplicationError(400, "This signing key is not supported."); }
    const current = this.account(user.id);
    if (current.reviewKey && current.reviewKey !== pem) throw new ApplicationError(409, "Use the device where you first enabled review signing.");
    this.db.prepare("UPDATE accounts SET reviewKey=? WHERE id=?").run(pem, user.id);
  }
  private log(accountId: string, label: string): void { this.db.prepare("INSERT INTO activity VALUES(?,?,?,?)").run(id(), accountId, label, this.now()); }
  private save(blueprint: Blueprint): void {
    this.db.prepare("INSERT INTO blueprints VALUES(?,?) ON CONFLICT(id) DO UPDATE SET document=excluded.document").run(blueprint.id, JSON.stringify(blueprint));
  }
  private raw(blueprintId: string): Blueprint {
    const row = this.db.prepare("SELECT document FROM blueprints WHERE id=?").get(blueprintId);
    if (!row) throw new ApplicationError(404, "Workflow not found.");
    return JSON.parse(String(row.document));
  }
  private accessible(user: Account, blueprint: Blueprint): void {
    if (blueprint.ownerId !== user.id && !Object.values(blueprint.roles).includes(user.id)) throw new ApplicationError(404, "Workflow not found.");
  }
  private registry(blueprint: Blueprint): ScenarioGovernanceRegistry {
    if (!blueprint.policy || blueprint.submittedAt === null) throw new ApplicationError(409, "Submit this workflow for review first.");
    const registry = new ScenarioGovernanceRegistry([blueprint.policy]);
    const record = registry.createDraft(blueprint.ownerId, blueprint.template, blueprint.createdAt);
    registry.recordValidation(blueprint.ownerId, record.target, { toolId: "scenario-domain", toolVersion: "1", findings: [] }, blueprint.submittedAt);
    registry.submitForReview(blueprint.ownerId, record.target, blueprint.submittedAt);
    for (const event of blueprint.events) {
      if (event.type === "review") registry.submitReview(event.data);
      if (event.type === "activate") registry.activate(event.actor, record.target, event.at);
      if (event.type === "retire") registry.retire(event.actor, record.target, event.at);
      if (event.type === "revoke") registry.revoke(event.actor, record.target, event.data.reason, event.at);
      if (event.type === "allocate") registry.authorizeInstantiation(event.actor, record.target, event.data.requestId, event.at);
    }
    return registry;
  }
  private target(blueprint: Blueprint): TemplateTarget {
    return { namespace: blueprint.template.namespace, templateId: blueprint.template.templateId, templateVersion: blueprint.template.version, templateHash: hashScenarioTemplate(blueprint.template).value };
  }
  blueprint(user: Account, blueprintId: string) {
    const blueprint = this.raw(blueprintId); this.accessible(user, blueprint);
    const record = blueprint.policy ? this.registry(blueprint).getTemplate(this.target(blueprint)) : null;
    const roles = Object.fromEntries(Object.entries(blueprint.roles).map(([role, accountId]) => [role, this.account(accountId).username]));
    return { id: blueprint.id, template: blueprint.template, target: this.target(blueprint), state: record?.state ?? (blueprint.validated ? "validated" : "draft"), createdAt: blueprint.createdAt, updatedAt: blueprint.updatedAt,
      owner: this.account(blueprint.ownerId).username, roles, reviews: record?.reviews.map((review) => ({ decision: review.payload.decision, reviewer: this.account(review.payload.reviewerId).username, at: review.payload.reviewedAt })) ?? [],
      myRole: blueprint.ownerId === user.id ? "author" : Object.keys(blueprint.roles).find((role) => blueprint.roles[role] === user.id),
      reviewed: record?.reviews.some((review) => review.payload.reviewerId === user.id) ?? false };
  }
  workspace(user: Account) {
    const blueprints = this.db.prepare("SELECT document FROM blueprints").all().map((row) => JSON.parse(String(row.document)) as Blueprint)
      .filter((item) => item.ownerId === user.id || Object.values(item.roles).includes(user.id)).map((item) => this.blueprint(user, item.id)).sort((a,b) => b.updatedAt-a.updatedAt);
    const instances = this.db.prepare("SELECT document FROM instances").all().map((row) => JSON.parse(String(row.document))).filter((item) => item.participants.includes(user.id) || item.managerId === user.id || item.issuerId === user.id)
      .map(({ participants, issuerId, ...item }) => ({ ...item, issuer: issuerId ? this.account(issuerId).username : null, participants: participants.map((accountId: string) => this.account(accountId).username) }));
    const activity = this.db.prepare("SELECT id,label,at FROM activity WHERE accountId=? ORDER BY at DESC,rowid DESC LIMIT 50").all(user.id);
    return { account: user, blueprints, instances, activity };
  }
  createBlueprint(user: Account, input: Record<string, unknown>) {
    const blueprintId = id(), namespace = `local.${blueprintId}`;
    const template = buildBlueprint(input, namespace);
    const blueprint: Blueprint = { id: blueprintId, ownerId: user.id, template, createdAt: this.now(), updatedAt: this.now(), validated: false, policy: null, submittedAt: null, roles: {}, events: [] };
    this.transaction(() => { this.save(blueprint); this.log(user.id, `Created ${template.displayName}`); });
    return this.blueprint(user, blueprintId);
  }
  updateBlueprint(user: Account, blueprintId: string, input: Record<string, unknown>) {
    const blueprint = this.raw(blueprintId); this.accessible(user, blueprint);
    if (blueprint.ownerId !== user.id || blueprint.policy) throw new ApplicationError(403, "Only the author can edit an unsubmitted draft.");
    blueprint.template = buildBlueprint(input, blueprint.template.namespace, blueprint.template.templateId);
    blueprint.updatedAt = this.now(); blueprint.validated = false; this.save(blueprint);
    return this.blueprint(user, blueprintId);
  }
  mutateBlueprint(user: Account, blueprintId: string, operation: string, input: Record<string, unknown>) {
    return this.transaction(() => {
      const blueprint = this.raw(blueprintId); this.accessible(user, blueprint); const now = this.now();
      if (operation === "validate" || operation === "submit") {
        if (blueprint.ownerId !== user.id || blueprint.policy) throw new ApplicationError(403, "Only the author can submit an unreviewed draft.");
        parseScenarioTemplate(blueprint.template);
        blueprint.validated = true;
        if (operation === "submit") {
          const assigned = Object.fromEntries(roleNames.map((role) => [role, this.findUser(input[role])]));
          if (new Set([user.id, ...Object.values(assigned).map((account) => account.id)]).size !== 5) throw new ApplicationError(400, "Author, reviewer, approver, run manager and emergency contact must be five different accounts.");
          if (!assigned.reviewer.reviewKey) throw new ApplicationError(400, "The reviewer must enable review signing in Account settings first.");
          const principal = (account: Account) => ({ principalId: account.id, kind: "human" as const });
          blueprint.roles = Object.fromEntries(roleNames.map((role) => [role, assigned[role].id]));
          blueprint.policy = { namespace: blueprint.template.namespace, impact: "standard", reviewThreshold: 1, authors: [principal(user)], reviewers: [{ ...principal(assigned.reviewer), publicKeyPem: assigned.reviewer.reviewKey }], governanceAuthorities: [principal(assigned.approver)], allocators: [principal(assigned.allocator)], emergencyRevokers: [principal(assigned.revoker)] };
          blueprint.submittedAt = now; this.registry(blueprint);
          for (const account of Object.values(assigned)) this.log(account.id, `${blueprint.template.displayName} shared with you`);
        }
      } else {
        const registry = this.registry(blueprint), target = this.target(blueprint);
        if (operation === "review") {
          if (blueprint.roles.reviewer !== user.id) throw new ApplicationError(403, "You are not the assigned reviewer.");
          const attestation = input.attestation as ReviewerAttestation;
          if (!attestation?.payload || attestation.payload.reviewerId !== user.id || Math.abs(attestation.payload.reviewedAt-now) > 300) throw new ApplicationError(400, "The review signature is invalid or expired.");
          registry.submitReview(attestation);
          blueprint.events.push({ type: "review", actor: user.id, at: now, data: attestation });
        } else if (operation === "activate") { registry.activate(user.id, target, now); blueprint.events.push({ type: "activate", actor: user.id, at: now, data: {} }); }
        else if (operation === "retire") { registry.retire(user.id, target, now); blueprint.events.push({ type: "retire", actor: user.id, at: now, data: {} }); }
        else if (operation === "revoke") { const reason = text(input.reason, "reason", 500); registry.revoke(user.id, target, reason, now); blueprint.events.push({ type: "revoke", actor: user.id, at: now, data: { reason } }); }
        else throw new ApplicationError(404, "Operation not found.");
      }
      blueprint.updatedAt = now; this.save(blueprint);
      const label: Record<string,string> = { submit:"Submitted for review", validate:"Validated", review:"Review submitted", activate:"Activated", retire:"Retired", revoke:"Revoked" };
      for (const accountId of new Set([blueprint.ownerId, user.id])) this.log(accountId, `${label[operation]}: ${blueprint.template.displayName}`);
      return this.blueprint(user, blueprintId);
    });
  }
  createInstance(user: Account, blueprintId: string, input: Record<string, unknown>) {
    return this.transaction(() => {
      const blueprint = this.raw(blueprintId); this.accessible(user, blueprint);
      const registry = this.registry(blueprint), now = this.now(), requestId = id(), instanceId = id();
      const name = text(input.name, "run name", 100);
      const duration = bounded(input.duration, 300, 604800, "run duration");
      const names = text(input.participants, "participants", 500).split(",").map((value) => value.trim());
      const participants = [...new Set(names.map((name) => this.findUser(name).id))];
      registry.authorizeInstantiation(user.id, this.target(blueprint), requestId, now);
      const issuer = this.findUser(input.issuer);
      const system = new ContextAccountSystem(registry);
      const instance = system.createScenarioInstance({ template: blueprint.template, instanceId, instantiationRequestId: requestId, expiresAt: now+duration, capabilityIssuers: [{ principalId: issuer.id, kind: "human" }] }, now);
      const document = { id: instanceId, name, blueprintId, blueprintName: blueprint.template.displayName, managerId: user.id, issuerId: issuer.id, participants, state: instance.state, createdAt: now, expiresAt: instance.expiresAt };
      blueprint.events.push({ type: "allocate", actor: user.id, at: now, data: { requestId } });
      this.save(blueprint);
      this.db.prepare("INSERT INTO instances VALUES(?,?,?)").run(instanceId, blueprintId, JSON.stringify(document));
      for (const accountId of new Set([user.id, issuer.id, ...participants])) this.log(accountId, `${name} added to your workspace`);
      return document;
    });
  }
  // Only a reviewed M6/M7 integration may establish these private bindings.
  // There is deliberately no client endpoint for claiming an arbitrary receipt.
  bindReceipt(accountIds: readonly string[], receiptId: string): void {
    this.transaction(() => { for (const accountId of accountIds) { this.account(accountId); this.db.prepare("INSERT OR IGNORE INTO receipt_access VALUES(?,?)").run(accountId, receiptId); } });
  }
  receiptIds(user: Account): string[] { return this.db.prepare("SELECT receiptId FROM receipt_access WHERE accountId=?").all(user.id).map((row) => String(row.receiptId)); }
}
