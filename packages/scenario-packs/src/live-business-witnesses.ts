import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { lstat, mkdir, open } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { encodeCanonical } from "@permio/protocol";
import { parseScenarioTemplate } from "@permio/scenario-domain";
import type { MerkleTreeDigest, MerkleTreePath } from "@midnight-ntwrk/midnight-js-protocol/compact-runtime";
import { pureCircuits as pure, type RuntimeBusinessRecord, type RuntimeSignedBusinessRecord,
  type RuntimeBusinessPredicateContext, type RuntimeSelectedActionValue, type RuntimeActionIntent,
  type RuntimeSessionCredential, type RuntimeCapabilityCredential, type GovernanceActivatorLeaf,
  type RuntimeCredentialStatusLeaf } from "../../midnight-authorization/contracts/managed/permio-authorization-v11/contract/index.js";
import { runtimeBusinessRecordCommitment, signRuntimeBusinessRecord, runtimeBusinessAuditReference } from "../../midnight-authorization/src/business-predicates.ts";
import { createRuntimeBusinessTemplateActionPolicy } from "../../midnight-authorization/src/business-template-policy.ts";
import { createRuntimeActionEvidencePlan } from "../../midnight-authorization/src/action-execution.ts";
import { governanceActivatorPublicKey, MIDNIGHT_AUTHORITY_KINDS } from "../../midnight-authorization/src/compact-crypto.ts";

export type PrivateBusinessBody = null | boolean | number | string | readonly PrivateBusinessBody[] |
  { readonly [key: string]: PrivateBusinessBody };
export interface LiveBusinessRecordDeclaration {
  readonly body: PrivateBusinessBody;
  readonly value?: bigint;
  readonly unitHash?: Uint8Array;
  readonly validAfter: bigint;
  readonly validBefore: bigint;
}
export interface AuditAcknowledgmentMaterial {
  readonly intentCommitment: Uint8Array;
  readonly selectedInputsCommitment: Uint8Array;
  readonly selectedManifestPrivateBody: PrivateBusinessBody;
}
export interface AuditAcknowledgmentStore {
  /** Return only after durable storage and an independently reopened read agree. */
  saveAndVerify(material: AuditAcknowledgmentMaterial): Promise<{ readonly commitment: Uint8Array }>;
}

function canonicalBody(value: unknown, ancestors = new Set<object>()): string {
  if (value === null || typeof value === "boolean" || typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number" && Number.isFinite(value)) return JSON.stringify(value);
  if (typeof value !== "object" || value === null || ancestors.has(value)) {
    throw new TypeError("Private body must be finite, acyclic JSON data");
  }
  if (!Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) {
    throw new TypeError("Private body must contain plain JSON objects");
  }
  if (Object.getOwnPropertySymbols(value).length || Object.values(Object.getOwnPropertyDescriptors(value))
    .some(descriptor => descriptor.get || descriptor.set)) throw new TypeError("Private body must contain JSON data properties");
  ancestors.add(value);
  try {
    if (Array.isArray(value)) {
      if (Object.keys(value).length !== value.length) throw new TypeError("Private body arrays must be dense JSON arrays");
      return `[${value.map(item => canonicalBody(item, ancestors)).join(",")}]`;
    }
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalBody((value as Record<string, unknown>)[key], ancestors)}`).join(",")}}`;
  } finally { ancestors.delete(value); }
}
function digest(domain: string, fields: readonly (string | Uint8Array)[]): Uint8Array {
  return createHash("sha256").update(encodeCanonical(domain, fields)).digest();
}
function bytes32(value: Uint8Array, name: string, nonzero = false): Uint8Array {
  if (!(value instanceof Uint8Array) || value.length !== 32 || (nonzero && value.every(byte => byte === 0))) {
    throw new TypeError(`${name} must be a valid${nonzero ? " nonzero" : ""} 32-byte commitment`);
  }
  return value.slice();
}
function equal(left: Uint8Array, right: Uint8Array): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}
function uint64(value: bigint, name: string): bigint {
  if (typeof value !== "bigint" || value < 0n || value >= 2n ** 64n) throw new RangeError(`${name} must be Uint64`);
  return value;
}
const hex = (value: Uint8Array) => Buffer.from(value).toString("hex");

/** Private storage under an already durably provisioned parent directory. */
export class FileAuditAcknowledgmentStore implements AuditAcknowledgmentStore {
  readonly directory: string;
  constructor(directory: string) { this.directory = resolve(directory); }
  async saveAndVerify(material: AuditAcknowledgmentMaterial): Promise<{ commitment: Uint8Array }> {
    const content = canonicalBody({ formatVersion: 1,
      intentCommitment: hex(bytes32(material.intentCommitment, "audit intent", true)),
      selectedInputsCommitment: hex(bytes32(material.selectedInputsCommitment, "audit inputs", true)),
      selectedManifestPrivateBody: material.selectedManifestPrivateBody });
    const commitment = digest("permio:local-audit-storage:v1", [content]);
    try { await mkdir(this.directory, { mode: 0o700 }); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error; }
    const directoryStat = await lstat(this.directory);
    if (!directoryStat.isDirectory() || directoryStat.isSymbolicLink() ||
      (process.platform !== "win32" && (directoryStat.mode & 0o077) !== 0)) {
      throw new Error("Audit storage directory is not private regular storage");
    }
    const path = join(this.directory, `${hex(commitment)}.json`);
    let created = false;
    try {
      const file = await open(path, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL, 0o600);
      created = true;
      try { await file.writeFile(content, "utf8"); await file.sync(); } finally { await file.close(); }
    } catch (error) {
      if (created || (error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    }
    const entry = await lstat(path);
    if (!entry.isFile() || entry.isSymbolicLink()) throw new Error("Audit storage entry is not a private regular file");
    const reopened = await open(path, constants.O_RDWR | (constants.O_NOFOLLOW ?? 0));
    try {
      const stat = await reopened.stat();
      if (!stat.isFile() || (process.platform !== "win32" && (stat.mode & 0o077) !== 0)) {
        throw new Error("Audit storage file is not private regular storage");
      }
      if (await reopened.readFile("utf8") !== content) throw new Error("Audit storage reopened verification failed");
      await reopened.sync();
    } finally { await reopened.close(); }
    if (process.platform !== "win32") {
      for (const path of [this.directory, dirname(this.directory)]) {
        const directory = await open(path, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
        try {
          if (!(await directory.stat()).isDirectory()) throw new Error("Audit storage parent is not a regular directory");
          await directory.sync();
        } finally { await directory.close(); }
      }
    }
    return { commitment };
  }
}

export interface LiveBusinessWitnessInput {
  readonly template: unknown;
  readonly actionId: string;
  readonly seed: string;
  readonly anchorUnixSeconds: bigint;
  /** Unix seconds, deliberately distinct from Date.now() milliseconds. */
  readonly clock?: () => number;
  readonly validBefore: bigint;
  readonly intent: RuntimeActionIntent;
  readonly session: RuntimeSessionCredential;
  readonly rootCapability: RuntimeCapabilityCredential;
  readonly issuer: {
    readonly leaf: GovernanceActivatorLeaf;
    readonly secret: bigint;
    readonly authorityRoot: MerkleTreeDigest;
    readonly authorityPath: MerkleTreePath<Uint8Array>;
    readonly issuerRoot: MerkleTreeDigest;
    readonly issuerPath: MerkleTreePath<Uint8Array>;
    readonly issuerCount: bigint;
  };
  readonly status: { readonly root: MerkleTreeDigest; readonly leaf: RuntimeCredentialStatusLeaf;
    readonly path: MerkleTreePath<Uint8Array> };
  readonly records: Readonly<Record<string, LiveBusinessRecordDeclaration>>;
  readonly auditStore?: AuditAcknowledgmentStore;
}

/** Prepares private witnesses only. It does not issue credentials, prove, activate or execute an action. */
export async function createLiveBusinessWitnesses(input: LiveBusinessWitnessInput) {
  const now = (input.clock ?? (() => Math.floor(Date.now() / 1000)))();
  const anchor = uint64(input.anchorUnixSeconds, "anchor Unix seconds");
  if (!Number.isSafeInteger(now) || now < 0) throw new TypeError("clock must return integer Unix seconds");
  if (anchor > BigInt(now) || BigInt(now) - anchor > 60n) {
    throw new RangeError("anchor must be fresh Unix seconds, never future or millisecond fixture time");
  }
  if (typeof input.seed !== "string" || !input.seed.startsWith("test:") || input.seed.length < 6) {
    throw new TypeError("Explicit test seed is required for private witness preparation");
  }
  const deadline = uint64(input.validBefore, "action deadline");
  const template = parseScenarioTemplate(input.template);
  const projection = createRuntimeBusinessTemplateActionPolicy(template, input.actionId);
  const action = template.actions.find(({ id }) => id === input.actionId)!;
  const intent = structuredClone(input.intent), session = structuredClone(input.session), root = structuredClone(input.rootCapability);
  pure.assertRuntimeTemplateActionIntent(projection.policy, intent);
  const sameTarget = (left: typeof intent.target, right: typeof intent.target) => equal(left.namespaceHash, right.namespaceHash) &&
    equal(left.templateIdHash, right.templateIdHash) && equal(left.templateContentHash, right.templateContentHash) &&
    left.semanticVersion.major === right.semanticVersion.major && left.semanticVersion.minor === right.semanticVersion.minor &&
    left.semanticVersion.patch === right.semanticVersion.patch;
  if (!equal(pure.runtimeSessionCredentialCommitment(session), intent.sessionCredentialCommitment) ||
    !sameTarget(session.target, intent.target) || !equal(session.instanceCommitment, intent.instanceCommitment) ||
    !equal(session.contextHash, intent.contextHash)) throw new TypeError("Actual session does not match the exact intent");
  if (deadline <= anchor || intent.issuedAt > anchor || anchor < session.notBefore || deadline > session.expiresAt ||
    anchor < root.notBefore || deadline > root.expiresAt || !sameTarget(root.target, intent.target) ||
    !equal(root.instanceCommitment, intent.instanceCommitment) || !equal(root.contextHash, intent.contextHash) ||
    root.credentialVersion !== 3n || root.delegationDepth !== 0n || root.parentCapabilityCredentialCommitment.some(Boolean) ||
    root.issuerAccountCredentialCommitment.some(Boolean)) throw new TypeError("Root capability or action window does not match the exact intent");
  const issuer = input.issuer, issuerCommitment = pure.governanceActivatorLeafCommitment(issuer.leaf);
  const publicKey = governanceActivatorPublicKey(issuer.secret);
  if (publicKey.x !== issuer.leaf.publicKey.x || publicKey.y !== issuer.leaf.publicKey.y ||
    !equal(issuerCommitment, root.namespaceIssuerAuthorityCommitment) || issuer.leaf.authorityKind !== MIDNIGHT_AUTHORITY_KINDS.capabilityIssuer ||
    issuer.leaf.leafVersion !== 1n || !equal(issuer.leaf.namespaceHash, intent.target.namespaceHash) ||
    issuer.leaf.validAfter > anchor || issuer.leaf.validBefore < deadline) {
    throw new TypeError("Evidence issuer secret or current original issuer identity is invalid");
  }
  const recordTypes = Object.keys(input.records);
  if (recordTypes.length !== action.inputRecordTypes.length || recordTypes.some(type => !action.inputRecordTypes.includes(type))) {
    throw new TypeError("Private record declarations must cover exactly every selected input type");
  }
  const intentCommitment = pure.runtimeActionIntentCommitment(intent);
  const nonce = (label: string) => digest("permio:live-business-nonce:v1", [input.seed, anchor.toString(), intentCommitment, label]);
  const rootCommitment = pure.runtimeCapabilityCredentialCommitment(root);
  const common = { recordVersion: 1n, target: structuredClone(intent.target),
    instanceCommitment: intent.instanceCommitment.slice(), contextHash: intent.contextHash.slice(),
    subjectAccountCredentialCommitment: session.subjectAccountCredentialCommitment.slice(),
    rootCapabilityCommitment: rootCommitment, resourceHash: intent.resourceHash.slice(),
    purposeHash: intent.purposeHash.slice(), recipientHash: intent.recipientHash.slice(), issuerAuthorityCommitment: issuerCommitment };
  const signed = (record: RuntimeBusinessRecord): RuntimeSignedBusinessRecord => ({ record,
    signature: signRuntimeBusinessRecord(record, issuer.secret), issuer: structuredClone(issuer.leaf),
    authorityPath: structuredClone(issuer.authorityPath), issuerPath: structuredClone(issuer.issuerPath) });
  const records: Record<string, RuntimeSignedBusinessRecord> = {};
  for (const [index, type] of action.inputRecordTypes.entries()) {
    const declaration = input.records[type]!;
    const start = uint64(declaration.validAfter, "record validAfter"), end = uint64(declaration.validBefore, "record validBefore");
    if (start > anchor || anchor >= end || end < deadline) throw new RangeError("Private record window must cover the complete action deadline");
    records[type] = signed({ ...common, typeHash: projection.inputRecords.at(index).typeHash,
      validAfter: start, validBefore: end, value: uint64(declaration.value ?? 0n, "record value"),
      unitHash: bytes32(declaration.unitHash ?? new Uint8Array(32), "record unit"),
      referenceCommitment: new Uint8Array(32), bodyCommitment: digest("permio:private-business-body:v1", [canonicalBody(declaration.body)]),
      nonce: nonce(`record:${index}`) });
  }
  const selectedInputs = action.inputRecordTypes.map((type, index) => ({
    payloadCommitment: runtimeBusinessRecordCommitment(records[type]!.record), nonce: nonce(`input:${index}`) }));
  const selectedOutputs = action.outputClaimTypes.map((_, index) => ({ payloadCommitment: nonce(`pending-output:${index}`), nonce: nonce(`output:${index}`) }));
  const initialEvidence = createRuntimeActionEvidencePlan({ template, actionId: input.actionId, intent,
    inputs: selectedInputs, outputs: selectedOutputs });
  const predicateWitnesses = [];
  for (let index = 0; index < Number(projection.policy.predicateCount); index++) {
    const predicate = projection.predicateAt(index);
    const inputType = action.inputRecordTypes[Number(predicate.inputIndex)]!;
    let first = records[inputType]!, second = first;
    if (predicate.kind === 3n) {
      if (!input.auditStore) throw new TypeError("Audit acknowledgment requires a durable audit store");
      const stored = await input.auditStore.saveAndVerify({ intentCommitment: intentCommitment.slice(),
        selectedInputsCommitment: initialEvidence.selectedInputsCommitment.slice(),
        selectedManifestPrivateBody: structuredClone(input.records[inputType]!.body) });
      first = signed({ ...common, typeHash: predicate.outputTypeHash, validAfter: anchor, validBefore: deadline,
        value: 0n, unitHash: new Uint8Array(32), referenceCommitment: runtimeBusinessAuditReference(
          intentCommitment, initialEvidence.selectedInputsCommitment),
        bodyCommitment: bytes32(stored.commitment, "audit storage commitment", true), nonce: nonce(`audit:${index}`) });
      second = first;
      selectedOutputs[Number(predicate.outputIndex)]!.payloadCommitment = runtimeBusinessRecordCommitment(first.record);
    } else {
      if (predicate.kind === 2n) second = records[action.inputRecordTypes[Number(predicate.ceilingIndex)]!]!;
      selectedOutputs[Number(predicate.outputIndex)]!.payloadCommitment = pure.runtimeBusinessClaimCommitment(predicate,
        runtimeBusinessRecordCommitment(first.record), predicate.kind === 2n ? runtimeBusinessRecordCommitment(second.record) : new Uint8Array(32));
    }
    predicateWitnesses.push({ predicate, predicatePath: projection.predicatePathAt(index), first, second });
  }
  const evidence = createRuntimeActionEvidencePlan({ template, actionId: input.actionId, intent,
    inputs: selectedInputs, outputs: selectedOutputs });
  const context: RuntimeBusinessPredicateContext = { target: common.target, instanceCommitment: common.instanceCommitment,
    contextHash: common.contextHash, subjectAccountCredentialCommitment: common.subjectAccountCredentialCommitment,
    rootCapabilityCommitment: rootCommitment, rootIssuerAuthorityCommitment: issuerCommitment,
    resourceHash: common.resourceHash, purposeHash: common.purposeHash, recipientHash: common.recipientHash,
    effectiveAt: anchor, validBefore: deadline, intentCommitment, selectedInputsCommitment: evidence.selectedInputsCommitment,
    selectedOutputsCommitment: evidence.selectedOutputsCommitment, inputCount: BigInt(evidence.inputs.length),
    outputCount: BigInt(evidence.outputs.length), authorityRoot: structuredClone(issuer.authorityRoot),
    issuerRoot: structuredClone(issuer.issuerRoot), issuerCount: issuer.issuerCount, statusRoot: structuredClone(input.status.root),
    governancePolicyHash: issuer.leaf.governancePolicyHash.slice() };
  const padded = (values: readonly { readonly selected: RuntimeSelectedActionValue }[]) => Array.from({ length: 8 }, (_, index) =>
    values[index] ? structuredClone(values[index]!.selected) : { valueVersion: 0n, typeHash: new Uint8Array(32),
      contextHash: new Uint8Array(32), resourceHash: new Uint8Array(32), payloadCommitment: new Uint8Array(32), nonce: new Uint8Array(32) });
  return { nativeAcceptance: false as const, anchorUnixSeconds: anchor, records, evidence, context,
    predicateWitnesses, inputs: padded(evidence.inputs), outputs: padded(evidence.outputs),
    rootStatus: structuredClone(input.status.leaf), rootStatusPath: structuredClone(input.status.path) };
}
