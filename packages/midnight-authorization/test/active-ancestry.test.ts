import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createCircuitContext, createConstructorContext, dummyContractAddress,
} from "@midnight-ntwrk/midnight-js-protocol/compact-runtime";

import {
  pureCircuits,
  type RuntimeAccountCredential,
  type RuntimeCapabilityCredential,
  type RuntimeSessionCredential,
  type RuntimeScopeRoots,
  type RuntimeActionIntent,
} from "../contracts/managed/permio-authorization/contract/index.js";
import {
  CredentialStatusTree,
  createRuntimeStatusMultiproof,
  governanceActivatorPublicKey,
  hashProtocolIdentifier,
  prepareRuntimeActiveAncestry,
  type CredentialStatusEntry,
  buildRuntimeScopeTrees,
  buildRuntimeActionScopePaths,
  createPermioAuthorizationContract,
  hashRuntimeIdentifier,
  signRuntimeActionIntent,
  signRuntimeSessionCredential,
} from "../src/index.ts";

const namespace = "certified-ancestry-tests";
const bytes = (value: number) => new Uint8Array(32).fill(value);

/** Synthetic certified-status fixtures, not evidence of on-chain issuance. */
function fixture(count = 2, reuseAccount = false, scopeRoots?: RuntimeScopeRoots,
  sessionScopeRoots?: RuntimeScopeRoots) {
  const target = {
    namespaceHash: Uint8Array.from(Buffer.from(hashProtocolIdentifier("namespace", namespace).slice(2), "hex")),
    templateIdHash: bytes(1), semanticVersion: { major: 1n, minor: 0n, patch: 0n },
    templateContentHash: bytes(2),
  };
  const binding = { target, instanceCommitment: bytes(3), contextHash: bytes(4) };
  const accounts: RuntimeAccountCredential[] = Array.from({ length: count }, (_, index) => ({
    ...binding, credentialVersion: 1n, accountIdHash: bytes(index + 5), principalKind: 1n,
    m5AccountCommitment: bytes(index + 30), runtimePublicKey: governanceActivatorPublicKey(BigInt(index + 31)),
    statusIndex: BigInt(index * 2), issuedAt: 100n, validBefore: 3_000n,
  }));
  if (reuseAccount) accounts.fill(accounts[0]!);
  const commitments = accounts.map((account) => pureCircuits.runtimeAccountCredentialCommitment(account));
  const capabilities: RuntimeCapabilityCredential[] = [];
  for (let index = 0; index < count; index += 1) {
    capabilities.push({
      ...binding, credentialVersion: 3n, namespaceIssuerAuthorityCommitment: bytes(150),
      grantIdHash: bytes(index + 60), m5GrantCommitment: bytes(index + 90),
      subjectAccountCredentialCommitment: commitments[index]!,
      parentCapabilityCredentialCommitment: index === 0 ? bytes(0)
        : pureCircuits.runtimeCapabilityCredentialCommitment(capabilities[index - 1]!),
      issuerAccountCredentialCommitment: index === 0 ? bytes(0) : commitments[index - 1]!,
      scopeRoots: scopeRoots ?? {
        actionsRoot: { field: 1n }, resourceSelectorsRoot: { field: 2n }, resourcesRoot: { field: 3n },
        purposesRoot: { field: 4n }, recipientKindsRoot: { field: 5n }, recipientsRoot: { field: 6n },
        disclosurePolicyIdsRoot: { field: 7n },
      },
      scopeCounts: {
        actionsCount: BigInt(20 - index), resourceSelectorsCount: 1n, resourcesCount: 1n,
        purposesCount: 1n, recipientKindsCount: 1n, recipientsCount: 1n, disclosurePolicyIdsCount: 1n,
      },
      notBefore: 100n + BigInt(index), expiresAt: 2_000n - BigInt(index),
      delegationDepth: BigInt(index), maxDelegationDepth: 16n, statusIndex: BigInt(index * 2 + 1),
      issuedAt: 100n + BigInt(index),
    });
  }
  const session: RuntimeSessionCredential = {
    ...binding, credentialVersion: 2n, sessionIdHash: bytes(120), m5SessionCommitment: bytes(121),
    subjectAccountCredentialCommitment: commitments[count - 1]!,
    capabilityCredentialCommitment: pureCircuits.runtimeCapabilityCredentialCommitment(capabilities[count - 1]!),
    scopeRoots: sessionScopeRoots ?? capabilities[count - 1]!.scopeRoots,
    scopeCounts: capabilities[count - 1]!.scopeCounts,
    runtimePublicKey: governanceActivatorPublicKey(131n),
    notBefore: 200n, expiresAt: 1_000n, statusIndex: BigInt(count * 2), issuedAt: 200n,
  };
  const entries: Omit<CredentialStatusEntry, "status">[] = [
    ...[...new Map(accounts.map((account, index) => [account.statusIndex, { account, index }])).values()]
      .map(({ account, index }) => ({
        namespace, kind: "account" as const, statusIndex: account.statusIndex,
        credentialCommitment: commitments[index]!,
        revocationAuthorityAccountCredentialCommitment: commitments[index]!,
      })),
    ...capabilities.map((capability) => ({
      namespace, kind: "capability" as const, statusIndex: capability.statusIndex,
      credentialCommitment: pureCircuits.runtimeCapabilityCredentialCommitment(capability),
      revocationAuthorityAccountCredentialCommitment: capability.issuerAccountCredentialCommitment,
    })),
    {
      namespace, kind: "session", statusIndex: session.statusIndex,
      credentialCommitment: pureCircuits.runtimeSessionCredentialCommitment(session),
      revocationAuthorityAccountCredentialCommitment: commitments[count - 1]!,
    },
  ];
  const statusTree = new CredentialStatusTree();
  for (const entry of entries) statusTree.issue(entry);
  const input = { capabilities, accounts, session, statusTree, now: 500n };
  const ancestry = prepareRuntimeActiveAncestry(input);
  const verify = (candidate = ancestry, now = input.now) => pureCircuits.assertRuntimeActiveAncestry(
    candidate, statusTree.root, statusTree.sequence, now,
  );
  return { input, ancestry, verify, entries };
}

describe("issuance-certified active ancestry predicates", () => {
  it("supports root, delegated, and complete depth-16 chains with all 35 current memberships", () => {
    for (const count of [1, 2, 17]) {
      const { ancestry, verify } = fixture(count);
      assert.doesNotThrow(() => verify());
      assert.equal(ancestry.capabilityCount, BigInt(count));
      assert.equal(ancestry.statusProof.leafCount, BigInt(count * 2 + 1));
    }
  });

  it("supports repeated holder accounts without requiring duplicate status leaves", () => {
    const { ancestry, verify } = fixture(3, true);
    assert.doesNotThrow(() => verify());
    assert.equal(ancestry.statusProof.leafCount, 5n);
  });

  it("rejects current revoked root, middle, terminal, account, and session status", () => {
    for (const selected of [0, 1, 3, 4, 5, 6]) {
      const { input, ancestry, verify, entries } = fixture(3);
      input.statusTree.revoke(entries[selected]!);
      const statusProof = createRuntimeStatusMultiproof(input.statusTree.multiproofFor(
        entries.map(({ statusIndex }) => statusIndex),
      ));
      assert.throws(() => verify({ ...ancestry, statusProof }), /exact active credential/);
      assert.throws(() => prepareRuntimeActiveAncestry(input), /exact active credential/);
    }
  });

  it("rejects omitted and substituted ancestry, wrong holder, namespace, context, and instance", () => {
    const { ancestry, verify } = fixture(3);
    for (const change of [
      (value: typeof ancestry) => { value.capabilities[1]!.parentCapabilityCredentialCommitment = bytes(222); },
      (value: typeof ancestry) => { value.capabilities[1]!.issuerAccountCredentialCommitment = bytes(222); },
      (value: typeof ancestry) => { value.capabilities[1]!.namespaceIssuerAuthorityCommitment = bytes(222); },
      (value: typeof ancestry) => { value.capabilities[0]!.namespaceIssuerAuthorityCommitment = bytes(0); },
      (value: typeof ancestry) => { value.accounts[0]!.accountIdHash = bytes(222); },
      (value: typeof ancestry) => { value.accounts[0]!.contextHash = bytes(222); },
      (value: typeof ancestry) => { value.capabilities[0]!.instanceCommitment = bytes(222); },
      (value: typeof ancestry) => { value.capabilities[0]!.target.namespaceHash = bytes(222); },
      (value: typeof ancestry) => { value.capabilities[0]!.delegationDepth = 1n; },
      (value: typeof ancestry) => { value.session.capabilityCredentialCommitment = bytes(222); },
      (value: typeof ancestry) => { value.capabilityCount = 2n; },
    ]) {
      const candidate = structuredClone(ancestry);
      change(candidate);
      assert.throws(() => verify(candidate));
    }
  });

  it("rejects expiry, future issuance, unsupported versions, depth and padding", () => {
    const { ancestry, verify, input } = fixture();
    for (const now of [99n, 199n, 1_000n, 3_000n]) assert.throws(() => verify(ancestry, now));
    for (const change of [
      (value: typeof ancestry) => { value.capabilities[0]!.credentialVersion = 1n; },
      (value: typeof ancestry) => { value.capabilities[0]!.maxDelegationDepth = 17n; },
      (value: typeof ancestry) => { value.capabilities[0]!.issuedAt = 501n; },
      (value: typeof ancestry) => { value.accounts[0]!.validBefore = 500n; },
      (value: typeof ancestry) => { value.accounts[0]!.principalKind = 5n; },
      (value: typeof ancestry) => { value.accounts[2]!.issuedAt = 1n; },
      (value: typeof ancestry) => { value.capabilities[2]!.issuedAt = 1n; },
      (value: typeof ancestry) => { value.session.expiresAt = 3_001n; },
      (value: typeof ancestry) => { value.witnessVersion = 2n; },
      (value: typeof ancestry) => { value.capabilityCount = 0n; },
    ]) {
      const candidate = structuredClone(ancestry);
      change(candidate);
      assert.throws(() => verify(candidate));
    }
    assert.throws(() => prepareRuntimeActiveAncestry({ ...input, accounts: [] }), /corresponding accounts/);
  });

  it("does not grant authority from valid membership of an empty status leaf", () => {
    const { input, ancestry, verify, entries } = fixture();
    const indices = entries.map(({ statusIndex }) => statusIndex);
    indices[0] = 500n;
    const empty = createRuntimeStatusMultiproof(input.statusTree.multiproofFor(indices));
    assert.doesNotThrow(() => pureCircuits.assertRuntimeStatusMultiproof(
      empty, input.statusTree.root, input.statusTree.sequence,
    ));
    assert.throws(() => verify({ ...ancestry, statusProof: empty }), /exact active credential/);
  });
});

describe("private exact-action authorization predicate", () => {
  function actionFixture(expandSession = false) {
    const scopeValues = {
      actions: ["authorize"], resourceSelectors: ["item-id"], resources: ["item-one"],
      purposes: ["support"], recipientKinds: ["organization"], recipients: ["recipient-one"],
      disclosurePolicyIds: ["minimum"],
    };
    const scope = buildRuntimeScopeTrees(scopeValues);
    const signedSessionScope = expandSession ? buildRuntimeScopeTrees({
      ...scopeValues, resources: ["item-one", "item-outside-capability"],
    }) : scope;
    const { input, ancestry } = fixture(2, false, scope.roots, signedSessionScope.roots);
    const intent: RuntimeActionIntent = {
      intentVersion: 1n, target: input.session.target,
      instanceCommitment: input.session.instanceCommitment, contextHash: input.session.contextHash,
      sessionCredentialCommitment: pureCircuits.runtimeSessionCredentialCommitment(input.session),
      actionIdHash: hashRuntimeIdentifier("action-id", "authorize"),
      resourceSelectorHash: hashRuntimeIdentifier("resource-selector", "item-id"),
      resourceHash: hashRuntimeIdentifier("resource", "item-one"),
      purposeHash: hashRuntimeIdentifier("purpose", "support"),
      recipientKindHash: hashRuntimeIdentifier("recipient-kind", "organization"),
      recipientHash: hashRuntimeIdentifier("recipient", "recipient-one"),
      disclosurePolicyIdHash: hashRuntimeIdentifier("disclosure-policy-id", "minimum"),
      m5IntentCommitment: bytes(141), issuedAt: 400n,
      nonceHash: hashRuntimeIdentifier("intent-nonce", "intent-one"),
    };
    const paths = buildRuntimeActionScopePaths(intent, scope);
    const signedSessionPaths = buildRuntimeActionScopePaths(intent, signedSessionScope);
    const sessionSignature = signRuntimeSessionCredential(input.session, 32n, 151n);
    const intentSignature = signRuntimeActionIntent(intent, 131n, 157n);
    const contract = createPermioAuthorizationContract();
    const initialized = contract.initialState(
      createConstructorContext(undefined, "00".repeat(32)), bytes(11), intent.target.namespaceHash,
      bytes(12), { field: 0n }, 1n, 1n, input.statusTree.root, 2n, 2n, 2n,
    );
    const context = createCircuitContext(
      dummyContractAddress(), "00".repeat(32), initialized.currentContractState,
      undefined, undefined, undefined, 500,
    );
    const run = (candidate = intent, candidateSessionSignature = sessionSignature,
      candidateIntentSignature = intentSignature, capabilityPaths = paths, sessionPaths = signedSessionPaths) =>
      contract.circuits.verifyRuntimeActionAuthorization(
        context, ancestry, candidate, candidateSessionSignature, candidateIntentSignature,
        capabilityPaths, sessionPaths, input.statusTree.root, input.statusTree.sequence, 500n,
      );
    return { input, intent, paths, run, sessionSignature, intentSignature };
  }

  it("checks holder-signed session, session-signed intent and both exact private scopes", () => {
    const { run } = actionFixture();
    assert.doesNotThrow(() => run());
  });

  it("rejects legacy sessions that have no version-2 issuance certification", () => {
    const { input } = actionFixture();
    assert.throws(() => prepareRuntimeActiveAncestry({
      ...input, session: { ...input.session, credentialVersion: 1n },
    }), /unsupported/);
  });

  it("rejects unauthorized holder/session keys and altered signed intent content", () => {
    const { input, intent, run, sessionSignature } = actionFixture();
    assert.throws(() => run(intent, signRuntimeSessionCredential(input.session, 999n, 163n)), /signature/);
    assert.throws(() => run(intent, sessionSignature, signRuntimeActionIntent(intent, 999n, 167n)), /signature/);
    assert.throws(() => run({ ...intent, m5IntentCommitment: bytes(222) }), /signature/);
    assert.throws(() => run({ ...intent, instanceCommitment: bytes(222) }), /substitutes/);
    assert.throws(() => run({ ...intent, issuedAt: 501n }), /not yet valid/);
    assert.throws(() => run({ ...intent, nonceHash: bytes(0) }), /empty nonce/);
  });

  it("rejects signed out-of-scope fields and swapped or altered membership paths", () => {
    const { intent, paths, run, sessionSignature } = actionFixture();
    for (const field of [
      "actionIdHash", "resourceSelectorHash", "resourceHash", "purposeHash", "recipientKindHash",
      "recipientHash", "disclosurePolicyIdHash",
    ] as const) {
      const changed = { ...intent, [field]: bytes(222) };
      assert.throws(() => run(changed, sessionSignature, signRuntimeActionIntent(changed, 131n, 173n)), /outside/);
    }
    const altered = structuredClone(paths);
    altered.resources.leaf[0]! ^= 1;
    assert.throws(() => run(intent, sessionSignature, undefined, altered), /outside/);
    assert.throws(() => run(intent, sessionSignature, undefined, paths, altered), /outside/);
    assert.throws(() => run(intent, sessionSignature, undefined, {
      ...paths, purposes: paths.recipients,
    }), /outside/);
  });
});
