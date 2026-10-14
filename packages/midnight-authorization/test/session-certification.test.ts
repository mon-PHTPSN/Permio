import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createCircuitContext, createConstructorContext, dummyContractAddress } from
  "@midnight-ntwrk/midnight-js-protocol/compact-runtime";
import {
  buildAuthorityRoot, buildRuntimeScopeTrees, CapabilityAttenuationPlan,
  SessionAttenuationPlan, createEmptyRuntimeScopeProgress,
  createPermioAuthorizationContract, createRuntimeCredentialStatusCommand,
  CredentialStatusTree, governanceActivatorPublicKey, hashProtocolIdentifier,
  MIDNIGHT_AUTHORITY_KINDS, permioAuthorizationPureCircuits as pure,
  readPermioAuthorizationLedger as ledger, signRuntimeCredentialStatusCommand,
  signRuntimeSessionCredential, type RuntimeAccountCredential,
  type RuntimeCapabilityCredential, type RuntimeCredentialStatusCommand,
  type RuntimeSessionCredential, type RuntimeScopeStage,
} from "../src/index.ts";
import { unitInstanceBinding, seedUnitAllocation } from "./fixtures/instance-binding.ts";

const namespace = "org.permio.session-test";
const bytes = (value: number) => new Uint8Array(32).fill(value);
const namespaceHash = Uint8Array.from(Buffer.from(hashProtocolIdentifier("namespace", namespace).slice(2), "hex"));
const policyHash = `0x${"22".repeat(32)}` as const;
const scope = {
  actions: ["read"], resourceSelectors: ["record-id"], resources: ["A"],
  purposes: ["support"], recipientKinds: ["organization"], recipients: ["recipient"],
  disclosurePolicyIds: ["minimum"],
};
const holderSecret = 43n;

// These unit fixtures seed exact active parent/account leaves in the constructor.
// They exercise generated Compact assertions, not live issuance or accepted proofs.
function fixture(options: {
  parentResources?: string[]; sessionResources?: string[];
  session?: Partial<RuntimeSessionCredential>;
} = {}) {
  const parentTrees = buildRuntimeScopeTrees({ ...scope, resources: options.parentResources ?? ["A"] });
  const sessionTrees = buildRuntimeScopeTrees({ ...scope, resources: options.sessionResources ?? ["A"] });
  const target = { namespaceHash, templateIdHash: bytes(3),
    semanticVersion: { major: 1n, minor: 0n, patch: 0n }, templateContentHash: bytes(4) };
  const account: RuntimeAccountCredential = {
    credentialVersion: 1n, target, instanceCommitment: bytes(5), contextHash: bytes(6),
    accountIdHash: bytes(7), principalKind: 1n, m5AccountCommitment: bytes(8),
    runtimePublicKey: governanceActivatorPublicKey(holderSecret), statusIndex: 1n,
    issuedAt: 100n, validBefore: 1_000n,
  };
  const accountHash = pure.runtimeAccountCredentialCommitment(account);
  const authorityLeaf = { leafVersion: 1n, namespaceHash, governancePolicyHash: bytes(0x22),
    authorityKind: MIDNIGHT_AUTHORITY_KINDS.capabilityIssuer,
    publicKey: governanceActivatorPublicKey(41n), validAfter: 0n, validBefore: 2_000n };
  const parent: RuntimeCapabilityCredential = {
    credentialVersion: 3n, target, instanceCommitment: account.instanceCommitment,
    namespaceIssuerAuthorityCommitment: pure.governanceActivatorLeafCommitment(authorityLeaf),
    contextHash: account.contextHash, grantIdHash: bytes(9), m5GrantCommitment: bytes(10),
    subjectAccountCredentialCommitment: accountHash,
    parentCapabilityCredentialCommitment: bytes(0), issuerAccountCredentialCommitment: bytes(0),
    scopeRoots: parentTrees.roots, scopeCounts: parentTrees.counts,
    notBefore: 120n, expiresAt: 900n, delegationDepth: 0n, maxDelegationDepth: 16n,
    issuedAt: 120n, statusIndex: 2n,
  };
  const parentHash = pure.runtimeCapabilityCredentialCommitment(parent);
  const session: RuntimeSessionCredential = {
    credentialVersion: 2n, target, instanceCommitment: account.instanceCommitment,
    contextHash: account.contextHash, sessionIdHash: bytes(11), m5SessionCommitment: bytes(12),
    subjectAccountCredentialCommitment: accountHash, capabilityCredentialCommitment: parentHash,
    scopeRoots: sessionTrees.roots, scopeCounts: sessionTrees.counts,
    runtimePublicKey: governanceActivatorPublicKey(47n), notBefore: 150n, expiresAt: 700n,
    issuedAt: 150n, statusIndex: 3n, ...options.session,
  };
  const sessionHash = pure.runtimeSessionCredentialCommitment(session);
  const status = new CredentialStatusTree();
  const accountEntry = { namespace, kind: "account" as const, credentialCommitment: accountHash,
    revocationAuthorityAccountCredentialCommitment: accountHash, statusIndex: account.statusIndex };
  const parentEntry = { namespace, kind: "capability" as const, credentialCommitment: parentHash,
    revocationAuthorityAccountCredentialCommitment: bytes(0), statusIndex: parent.statusIndex };
  status.issue(accountEntry);
  status.issue(parentEntry);
  const authority = buildAuthorityRoot([authorityLeaf]);
  const command = createRuntimeCredentialStatusCommand({
    namespace, governancePolicyHash: policyHash, authorityRootVersion: 1, authorityRootSequence: 1,
    credentialStatusRootSequence: status.sequence - 2n, kind: "session", credentialCommitment: sessionHash,
    subjectAccountCredentialCommitment: accountHash,
    revocationAuthorityAccountCredentialCommitment: accountHash, statusIndex: session.statusIndex,
    expectedStatus: "empty", nextStatus: "active", effectiveAt: Number(session.issuedAt),
    stagingExpiresAt: 500, commandNonce: `0x${"33".repeat(32)}`,
  });
  const contract = createPermioAuthorizationContract();
  const initial = contract.initialState(createConstructorContext(undefined, "00".repeat(32)),
    bytes(1), namespaceHash, bytes(0x22), authority.root, 1n, 1n, status.root, 2n, 2n, 2n);
  const instanceBinding = unitInstanceBinding(authorityLeaf, account);
  let context = createCircuitContext(dummyContractAddress(), "00".repeat(32),
    seedUnitAllocation(initial.currentContractState.data, instanceBinding), undefined, undefined, undefined, 150);
  const plan = new SessionAttenuationPlan(sessionTrees, parentTrees);
  type Overrides = {
    command?: RuntimeCredentialStatusCommand; credential?: RuntimeSessionCredential;
    commandSigner?: bigint; credentialSigner?: bigint; account?: RuntimeAccountCredential;
    parent?: RuntimeCapabilityCredential; stage?: RuntimeScopeStage;
    progress?: ReturnType<typeof createEmptyRuntimeScopeProgress>;
  };
  function invoke(operation: bigint, overrides: Overrides = {}) {
    const cmd = overrides.command ?? command;
    const credential = overrides.credential ?? session;
    const stage = overrides.stage;
    const currentPath = status.pathFor(session.statusIndex);
    return contract.circuits.updateRuntimeCredentialStatus(context, operation, cmd,
      signRuntimeCredentialStatusCommand(cmd, overrides.commandSigner ?? holderSecret, 53n),
      authorityLeaf, authority.pathFor(pure.governanceActivatorLeafCommitment(authorityLeaf)),
      overrides.account ?? account, status.pathFor(account.statusIndex), currentPath,
      parent, signRuntimeSessionCredential(credential, overrides.credentialSigner ?? holderSecret, 59n),
      overrides.parent ?? parent, status.pathFor(parent.statusIndex),
      overrides.progress ?? stage?.progress ?? plan.currentProgress,
      stage?.element ?? { elementVersion: 1n, dimension: 1n, valueHash: bytes(0) },
      stage?.childPath ?? currentPath, stage?.parentPath ?? currentPath, credential, instanceBinding);
  }
  function apply(operation: bigint, overrides: Overrides = {}) {
    context = invoke(operation, overrides).context;
  }
  function complete() {
    while (!plan.complete) apply(3n, { stage: plan.stageNext() });
  }
  function at(time: number) {
    context = createCircuitContext(dummyContractAddress(), "00".repeat(32),
      context.currentQueryContext.state, undefined, undefined, undefined, time);
  }
  function revokeParentOrHolder(kind: "parent" | "holder") {
    const entry = kind === "parent" ? parentEntry : accountEntry;
    const revocation = createRuntimeCredentialStatusCommand({
      namespace, governancePolicyHash: policyHash, authorityRootVersion: 1, authorityRootSequence: 1,
      credentialStatusRootSequence: status.sequence - 2n, kind: entry.kind,
      credentialCommitment: entry.credentialCommitment,
      revocationAuthorityAccountCredentialCommitment: entry.revocationAuthorityAccountCredentialCommitment,
      statusIndex: entry.statusIndex, expectedStatus: "active", nextStatus: "revoked",
      effectiveAt: 150, commandNonce: `0x${"44".repeat(32)}`,
    });
    // Parent is a namespace-issued root; the holder can revoke its own account.
    const signer = kind === "parent" ? 41n : holderSecret;
    const path = status.pathFor(entry.statusIndex);
    context = contract.circuits.updateRuntimeCredentialStatus(context, 1n, revocation,
      signRuntimeCredentialStatusCommand(revocation, signer, 61n), authorityLeaf,
      authority.pathFor(pure.governanceActivatorLeafCommitment(authorityLeaf)), account,
      status.pathFor(account.statusIndex), path, parent,
      signRuntimeSessionCredential(session, holderSecret, 67n), parent,
      status.pathFor(parent.statusIndex), createEmptyRuntimeScopeProgress(),
      { elementVersion: 1n, dimension: 1n, valueHash: bytes(0) }, path, path, session, instanceBinding).context;
    status.revoke(entry);
  }
  return { command, session, account, parent, plan, status, invoke, apply, complete, at,
    revokeParentOrHolder, view: () => ledger(context.currentQueryContext.state) };
}

describe("complete private session-scope certification", () => {
  it("activates only after all seven dimensions and exact finalization", () => {
    const f = fixture();
    assert.equal(f.command.commandVersion, 3n);
    assert.equal(f.plan.totalElementCount, 7n);
    f.apply(2n);
    assert.equal(f.view().credentialStatusRoots.lookup(namespaceHash).rootSequence, 0n);
    assert.equal(f.view().usedCredentialStatusCommandNonces.member(f.command.commandNonce), false);
    assert.throws(() => f.invoke(4n), /incomplete or mismatched/);
    f.complete();
    assert.equal(f.view().credentialStatusRoots.lookup(namespaceHash).rootSequence, 0n);
    f.apply(4n);
    f.status.issue({ namespace, kind: "session", credentialCommitment: pure.runtimeSessionCredentialCommitment(f.session),
      revocationAuthorityAccountCredentialCommitment: pure.runtimeAccountCredentialCommitment(f.account), statusIndex: 3n });
    assert.deepEqual(f.view().credentialStatusRoots.lookup(namespaceHash), { root: f.status.root, rootSequence: 1n });
    assert.equal(f.view().capabilityAttenuationSessions.member(f.command.commandNonce), false);
    assert.equal(f.view().usedCredentialStatusCommandNonces.member(f.command.commandNonce), true);
    assert.throws(() => f.invoke(4n), /nonce already used/);
  });

  it("rejects the original parent {A}, session {A,B}, selected-A counterexample", () => {
    const f = fixture({ sessionResources: ["A", "B"] });
    assert.throws(() => f.invoke(2n), /scope counts cannot exceed/);
  });

  it("checks every value even when child and parent counts are equal", () => {
    const f = fixture({ parentResources: ["A", "B"], sessionResources: ["A", "C"] });
    const parentTrees = buildRuntimeScopeTrees({ ...scope, resources: ["A", "B"] });
    // Deliberately forge witnesses using a root-mode plan to bypass SDK membership rejection.
    const forged = new CapabilityAttenuationPlan(buildRuntimeScopeTrees({ ...scope, resources: ["A", "C"] }));
    f.apply(2n);
    let rejected = false;
    while (!forged.complete) {
      const stage = forged.stageNext();
      const dimension = (Object.keys(scope) as (keyof typeof scope)[])[Number(stage.element.dimension) - 1]!;
      let parentPath;
      try { parentPath = parentTrees[dimension].pathForHash(stage.element.valueHash); }
      catch { parentPath = parentTrees.resources.pathFor("A"); }
      try { f.apply(3n, { stage: { ...stage, parentPath } }); } catch (error) {
        assert.match(String(error), /outside its parent scope/);
        assert.equal(stage.element.dimension, 3n);
        assert.deepEqual(stage.element.valueHash, buildRuntimeScopeTrees({ ...scope, resources: ["C"] }).resources.valueHashes[0]);
        rejected = true; break;
      }
    }
    assert.equal(rejected, true);
    assert.equal(f.view().credentialStatusRoots.lookup(namespaceHash).rootSequence, 0n);
  });

  it("rejects a scope and time window identical to the parent", () => {
    const f = fixture({ session: { notBefore: 120n, expiresAt: 900n, issuedAt: 120n } });
    assert.throws(() => f.invoke(2n), /strictly narrower/);
  });

  for (const [label, override] of [
    ["legacy session credential", { credentialVersion: 1n }],
    ["wrong namespace", { target: { namespaceHash: bytes(90), templateIdHash: bytes(3),
      semanticVersion: { major: 1n, minor: 0n, patch: 0n }, templateContentHash: bytes(4) } }],
    ["wrong context", { contextHash: bytes(90) }],
    ["wrong instance", { instanceCommitment: bytes(90) }],
    ["wrong parent", { capabilityCredentialCommitment: bytes(90) }],
    ["wrong holder", { subjectAccountCredentialCommitment: bytes(90) }],
    ["reused holder key", { runtimePublicKey: governanceActivatorPublicKey(holderSecret) }],
    ["invalid time window", { notBefore: 149n }],
  ] satisfies [string, Partial<RuntimeSessionCredential>][]) {
    it(`rejects ${label}`, () => {
      const f = fixture({ session: override });
      assert.throws(() => f.invoke(2n), /does not match|bindings are invalid|exact ancestry|exact holder|allocated exact instance/);
    });
  }

  it("rejects unauthorized command and credential signers independently", () => {
    const f = fixture();
    assert.throws(() => f.invoke(2n, { commandSigner: 71n }));
    assert.throws(() => f.invoke(2n, { credentialSigner: 71n }));
  });

  it("rejects a legacy command and altered exact credential hash", () => {
    const f = fixture();
    assert.throws(() => f.invoke(2n, { command: { ...f.command, commandVersion: 2n } }), /Unsupported/);
    assert.throws(() => f.invoke(2n, { command: { ...f.command, credentialCommitment: bytes(90) } }), /does not match/);
  });

  it("forbids direct session activation", () => {
    const f = fixture();
    assert.throws(() => f.invoke(1n, { command: { ...f.command, stagingExpiresAt: 0n } }), /requires staged scope/);
  });

  it("rejects duplicate, altered, and incomplete staging without advancing state", () => {
    const f = fixture();
    f.apply(2n);
    assert.throws(() => f.invoke(2n), /already exists/);
    const stage = f.plan.stageNext();
    assert.throws(() => f.invoke(3n, { stage, command: { ...f.command, credentialKind: 2n } }), /do not match the opened session/);
    f.apply(3n, { stage });
    assert.throws(() => f.invoke(3n, { stage }), /progress does not match/);
    assert.throws(() => f.invoke(4n), /incomplete or mismatched/);
    assert.equal(f.view().credentialStatusRoots.lookup(namespaceHash).rootSequence, 0n);
  });

  it("rejects forged counts that do not reconstruct the signed roots", () => {
    const f = fixture({ parentResources: ["A", "B"], sessionResources: ["A", "B"],
      session: { scopeCounts: { ...buildRuntimeScopeTrees(scope).counts } } });
    f.apply(2n);
    assert.throws(() => f.complete(), /count|exceed|complete|ordering/i);
    assert.throws(() => f.invoke(4n), /incomplete or mismatched/);
  });

  for (const kind of ["parent", "holder"] as const) {
    it(`rechecks current ${kind} status after full staging`, () => {
      const f = fixture();
      f.apply(2n); f.complete(); f.revokeParentOrHolder(kind);
      assert.throws(() => f.invoke(4n), /revoked during staging/);
      assert.equal(f.view().credentialStatusRoots.lookup(namespaceHash).rootSequence, 1n);
      assert.equal(f.view().usedCredentialStatusCommandNonces.member(f.command.commandNonce), false);
    });
  }

  it("cleans expired staging without activating or consuming the command nonce", () => {
    const f = fixture();
    f.apply(2n); f.at(500); f.apply(4n);
    assert.equal(f.view().capabilityAttenuationSessions.member(f.command.commandNonce), false);
    assert.equal(f.view().usedCredentialStatusCommandNonces.member(f.command.commandNonce), false);
    assert.equal(f.view().credentialStatusRoots.lookup(namespaceHash).rootSequence, 0n);
  });
});
