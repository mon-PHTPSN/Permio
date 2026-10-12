import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { describe, it } from "node:test";

import {
  createCircuitContext,
  createConstructorContext,
  dummyContractAddress,
} from "@midnight-ntwrk/midnight-js-protocol/compact-runtime";

import {
  createSignedActionIntent,
  type CapabilityGrant,
  type CapabilityScope,
  type ContextAccount,
  type ScenarioInstance,
  type SessionGrant,
  type SignedActionIntent,
} from "@permio/context-accounts";

import {
  createRuntimeAccountCredential,
  createRuntimeActionIntent,
  createRuntimeCapabilityCredential,
  createRuntimeSessionCredential,
  createRuntimeCredentialStatusCommand,
  createPermioAuthorizationContract,
  CredentialStatusTree,
  buildAuthorityRoot,
  governanceActivatorPublicKey,
  hashProtocolIdentifier,
  hashM5ScenarioInstance,
  MIDNIGHT_AUTHORITY_KINDS,
  permioAuthorizationPureCircuits,
  readPermioAuthorizationLedger,
  signRuntimeCredentialStatusCommand,
  signRuntimeAccountCredential,
  signRuntimeActionIntent,
  signRuntimeCapabilityCredential,
  signRuntimeSessionCredential,
  verifyRuntimeSignature,
} from "../src/index.ts";

const TARGET = {
  namespace: "support",
  templateId: "private-escalation",
  templateVersion: "1.2.3",
  templateHash: `0x${"ab".repeat(32)}` as const,
};

const ROOT_SCOPE: CapabilityScope = {
  actions: ["escalate", "read-summary"],
  resourceSelectors: ["case-id"],
  resources: ["case-100", "case-200"],
  purposes: ["customer-support"],
  recipientKinds: ["organization"],
  recipients: ["merchant-one", "merchant-two"],
  disclosurePolicyIds: ["summary-only"],
};

const CHILD_SCOPE: CapabilityScope = {
  actions: ["escalate"],
  resourceSelectors: ["case-id"],
  resources: ["case-100"],
  purposes: ["customer-support"],
  recipientKinds: ["organization"],
  recipients: ["merchant-one"],
  disclosurePolicyIds: ["summary-only"],
};

function ed25519Pair() {
  const pair = generateKeyPairSync("ed25519");
  return {
    privateKey: pair.privateKey,
    publicKeyPem: pair.publicKey.export({ type: "spki", format: "pem" }).toString(),
  };
}

function fixtures() {
  const holderM5 = ed25519Pair();
  const delegateM5 = ed25519Pair();
  const sessionM5 = ed25519Pair();
  const instance: ScenarioInstance = {
    ...TARGET,
    instanceId: "instance-100",
    instantiationRequestId: "allocation-100",
    allocatedBy: "allocator-one",
    state: "ready",
    createdAt: 100,
    expiresAt: 1_000,
    revokedAt: null,
    capabilityIssuers: [{ principalId: "issuer-one", kind: "service" }],
  };
  const holder: ContextAccount = {
    accountId: "holder-one",
    instanceId: instance.instanceId,
    contextId: "support-context",
    kind: "human",
    publicKeyPem: holderM5.publicKeyPem,
    registeredAt: 110,
    revokedAt: null,
  };
  const delegate: ContextAccount = {
    accountId: "delegate-one",
    instanceId: instance.instanceId,
    contextId: "support-context",
    kind: "agent",
    publicKeyPem: delegateM5.publicKeyPem,
    registeredAt: 120,
    revokedAt: null,
  };
  const rootGrant: CapabilityGrant = {
    ...TARGET,
    grantId: "grant-root",
    parentGrantId: null,
    instanceId: instance.instanceId,
    contextId: holder.contextId,
    subjectAccountId: holder.accountId,
    issuerRef: "issuer-one",
    scope: ROOT_SCOPE,
    notBefore: 130,
    expiresAt: 900,
    delegationDepth: 0,
    maxDelegationDepth: 3,
    issuedAt: 130,
    revokedAt: null,
  };
  const childGrant: CapabilityGrant = {
    ...TARGET,
    grantId: "grant-child",
    parentGrantId: rootGrant.grantId,
    instanceId: instance.instanceId,
    contextId: delegate.contextId,
    subjectAccountId: delegate.accountId,
    issuerRef: holder.accountId,
    scope: CHILD_SCOPE,
    notBefore: 140,
    expiresAt: 800,
    delegationDepth: 1,
    maxDelegationDepth: 2,
    issuedAt: 140,
    revokedAt: null,
  };
  const session: SessionGrant = {
    ...TARGET,
    sessionId: "session-one",
    capabilityGrantId: childGrant.grantId,
    instanceId: instance.instanceId,
    contextId: delegate.contextId,
    subjectAccountId: delegate.accountId,
    publicKeyPem: sessionM5.publicKeyPem,
    scope: CHILD_SCOPE,
    notBefore: 150,
    expiresAt: 700,
    issuedAt: 150,
    revokedAt: null,
  };
  return {
    holderM5,
    delegateM5,
    sessionM5,
    instance,
    holder,
    delegate,
    rootGrant,
    childGrant,
    session,
  };
}

describe("M6 Midnight runtime credential bindings", () => {
  it("binds the exact M5 account, capability ancestry, session, and intent to Schnorr keys", () => {
    const value = fixtures();
    const issuerSecret = 11n;
    const holderSecret = 13n;
    const delegateSecret = 17n;
    const sessionSecret = 19n;
    const holderCredential = createRuntimeAccountCredential({
      account: value.holder,
      instance: value.instance,
      runtimePublicKey: governanceActivatorPublicKey(holderSecret),
      statusIndex: 1n,
      validBefore: 900,
    });
    const delegateCredential = createRuntimeAccountCredential({
      account: value.delegate,
      instance: value.instance,
      runtimePublicKey: governanceActivatorPublicKey(delegateSecret),
      statusIndex: 2n,
      validBefore: 800,
    });
    const instanceCommitment = hashM5ScenarioInstance(value.instance);
    const rootCapability = createRuntimeCapabilityCredential({
      grant: value.rootGrant,
      instanceCommitment,
      subjectAccountCredential: holderCredential,
      statusIndex: 3n,
    });
    const delegatedCapability = createRuntimeCapabilityCredential({
      grant: value.childGrant,
      instanceCommitment,
      subjectAccountCredential: delegateCredential,
      parentCapabilityCredential: rootCapability.credential,
      issuerAccountCredential: holderCredential,
      statusIndex: 4n,
    });
    const session = createRuntimeSessionCredential({
      session: value.session,
      instanceCommitment,
      subjectAccountCredential: delegateCredential,
      capabilityCredential: delegatedCapability.credential,
      runtimePublicKey: governanceActivatorPublicKey(sessionSecret),
      statusIndex: 5n,
    });
    const m5Intent = createSignedActionIntent(
      {
        ...TARGET,
        intentVersion: 1,
        sessionId: value.session.sessionId,
        instanceId: value.instance.instanceId,
        contextId: value.session.contextId,
        actionId: "escalate",
        resourceSelector: "case-id",
        resource: "case-100",
        purpose: "customer-support",
        recipientKind: "organization",
        recipient: "merchant-one",
        disclosurePolicyId: "summary-only",
        issuedAt: 160,
        nonce: "intent-one",
      },
      value.sessionM5.privateKey,
    );
    const runtimeIntent = createRuntimeActionIntent(
      m5Intent,
      value.session.publicKeyPem,
      session.credential,
    );

    const accountSignature = signRuntimeAccountCredential(holderCredential, issuerSecret, 23n);
    const rootSignature = signRuntimeCapabilityCredential(rootCapability.credential, issuerSecret, 29n);
    const delegatedSignature = signRuntimeCapabilityCredential(delegatedCapability.credential, holderSecret, 31n);
    const sessionSignature = signRuntimeSessionCredential(session.credential, delegateSecret, 37n);
    const intentSignature = signRuntimeActionIntent(runtimeIntent, sessionSecret, 41n);

    assert.equal(verifyRuntimeSignature(
      { kind: "account", value: holderCredential },
      accountSignature,
      governanceActivatorPublicKey(issuerSecret),
    ), true);
    assert.equal(verifyRuntimeSignature(
      { kind: "capability", value: rootCapability.credential },
      rootSignature,
      governanceActivatorPublicKey(issuerSecret),
    ), true);
    assert.equal(verifyRuntimeSignature(
      { kind: "capability", value: delegatedCapability.credential },
      delegatedSignature,
      holderCredential.runtimePublicKey,
    ), true);
    assert.equal(verifyRuntimeSignature(
      { kind: "session", value: session.credential },
      sessionSignature,
      delegateCredential.runtimePublicKey,
    ), true);
    assert.equal(verifyRuntimeSignature(
      { kind: "intent", value: runtimeIntent },
      intentSignature,
      session.credential.runtimePublicKey,
    ), true);

    assert.doesNotThrow(() => delegatedCapability.scope.actions.pathFor("escalate"));
    assert.throws(
      () => delegatedCapability.scope.actions.pathFor("read-summary"),
      /not present/,
    );
  });

  it("rejects an altered M5 intent before creating a Midnight runtime intent", () => {
    const value = fixtures();
    const account = createRuntimeAccountCredential({
      account: value.delegate,
      instance: value.instance,
      runtimePublicKey: governanceActivatorPublicKey(17n),
      statusIndex: 1n,
      validBefore: 800,
    });
    const capability = createRuntimeCapabilityCredential({
      grant: { ...value.childGrant, parentGrantId: null, issuerRef: "issuer-one", delegationDepth: 0 },
      instanceCommitment: hashM5ScenarioInstance(value.instance),
      subjectAccountCredential: account,
      statusIndex: 2n,
    });
    const session = createRuntimeSessionCredential({
      session: value.session,
      instanceCommitment: hashM5ScenarioInstance(value.instance),
      subjectAccountCredential: account,
      capabilityCredential: capability.credential,
      runtimePublicKey: governanceActivatorPublicKey(19n),
      statusIndex: 3n,
    });
    const signed = createSignedActionIntent({
      ...TARGET,
      intentVersion: 1,
      sessionId: value.session.sessionId,
      instanceId: value.instance.instanceId,
      contextId: value.session.contextId,
      actionId: "escalate",
      resourceSelector: "case-id",
      resource: "case-100",
      purpose: "customer-support",
      recipientKind: "organization",
      recipient: "merchant-one",
      disclosurePolicyId: "summary-only",
      issuedAt: 160,
      nonce: "intent-one",
    }, value.sessionM5.privateKey);
    const altered: SignedActionIntent = {
      ...signed,
      payload: { ...signed.payload, recipient: "merchant-two" },
    };
    assert.throws(
      () => createRuntimeActionIntent(altered, value.session.publicKeyPem, session.credential),
      /Ed25519 signature is invalid/,
    );
  });

  it("rejects a delegated capability with an altered parent-holder binding", () => {
    const value = fixtures();
    const holder = createRuntimeAccountCredential({
      account: value.holder,
      instance: value.instance,
      runtimePublicKey: governanceActivatorPublicKey(13n),
      statusIndex: 1n,
      validBefore: 900,
    });
    const delegate = createRuntimeAccountCredential({
      account: value.delegate,
      instance: value.instance,
      runtimePublicKey: governanceActivatorPublicKey(17n),
      statusIndex: 2n,
      validBefore: 800,
    });
    const instanceCommitment = hashM5ScenarioInstance(value.instance);
    const parent = createRuntimeCapabilityCredential({
      grant: value.rootGrant,
      instanceCommitment,
      subjectAccountCredential: holder,
      statusIndex: 3n,
    });
    assert.throws(
      () => createRuntimeCapabilityCredential({
        grant: value.childGrant,
        instanceCommitment,
        subjectAccountCredential: delegate,
        parentCapabilityCredential: parent.credential,
        issuerAccountCredential: delegate,
        statusIndex: 4n,
      }),
      /parent and issuer chain/,
    );
  });

  it("binds signatures to the exact credential content", () => {
    const value = fixtures();
    const credential = createRuntimeAccountCredential({
      account: value.holder,
      instance: value.instance,
      runtimePublicKey: governanceActivatorPublicKey(13n),
      statusIndex: 1n,
      validBefore: 900,
    });
    const signature = signRuntimeAccountCredential(credential, 11n, 23n);
    assert.equal(verifyRuntimeSignature(
      { kind: "account", value: { ...credential, validBefore: 899n } },
      signature,
      governanceActivatorPublicKey(11n),
    ), false);
    assert.equal(verifyRuntimeSignature(
      { kind: "account", value: credential },
      signature,
      governanceActivatorPublicKey(12n),
    ), false);
  });

  it("advances the on-chain status root only for exact authorized empty-to-active and active-to-revoked leaves", () => {
    const value = fixtures();
    const namespaceHash = Uint8Array.from(Buffer.from(
      hashProtocolIdentifier("namespace", TARGET.namespace).slice(2),
      "hex",
    ));
    const governancePolicyHash = Uint8Array.from({ length: 32 }, (_, index) => index + 1);
    const issuerSecret = 11n;
    const accountSecret = 13n;
    const issuer = {
      leafVersion: 1n,
      namespaceHash,
      governancePolicyHash,
      authorityKind: MIDNIGHT_AUTHORITY_KINDS.capabilityIssuer,
      publicKey: governanceActivatorPublicKey(issuerSecret),
      validAfter: 0n,
      validBefore: 2_000_000_000n,
    };
    const authority = buildAuthorityRoot([issuer]);
    const issuerCommitment = permioAuthorizationPureCircuits
      .governanceActivatorLeafCommitment(issuer);
    const status = new CredentialStatusTree();
    const account = createRuntimeAccountCredential({
      account: value.holder,
      instance: value.instance,
      runtimePublicKey: governanceActivatorPublicKey(accountSecret),
      statusIndex: 7n,
      validBefore: 900,
    });
    const accountCommitment = permioAuthorizationPureCircuits
      .runtimeAccountCredentialCommitment(account);
    const contract = createPermioAuthorizationContract();
    const initialized = contract.initialState(
      createConstructorContext(undefined, "00".repeat(32)),
      Uint8Array.from({ length: 32 }, () => 9),
      namespaceHash,
      governancePolicyHash,
      authority.root,
      1n,
      1n,
      status.root,
      2n,
      2n,
      2n,
    );
    let context = createCircuitContext(
      dummyContractAddress(),
      "00".repeat(32),
      initialized.currentContractState,
      undefined,
      undefined,
      undefined,
      200,
    );
    const issue = createRuntimeCredentialStatusCommand({
      namespace: TARGET.namespace,
      governancePolicyHash: `0x${Buffer.from(governancePolicyHash).toString("hex")}`,
      authorityRootVersion: 1,
      authorityRootSequence: 1,
      credentialStatusRootSequence: status.sequence,
      kind: "account",
      credentialCommitment: accountCommitment,
      subjectAccountCredentialCommitment: accountCommitment,
      revocationAuthorityAccountCredentialCommitment: accountCommitment,
      statusIndex: account.statusIndex,
      expectedStatus: "empty",
      nextStatus: "active",
      effectiveAt: 200,
      commandNonce: `0x${"01".repeat(32)}`,
    });
    const emptyPath = status.pathFor(account.statusIndex);
    const issued = contract.circuits.updateRuntimeCredentialStatus(
      context,
      issue,
      signRuntimeCredentialStatusCommand(issue, issuerSecret, 23n),
      issuer,
      authority.pathFor(issuerCommitment),
      account,
      emptyPath,
      emptyPath,
    );
    context = issued.context;
    const issuedTransition = status.issue({
      namespace: TARGET.namespace,
      kind: "account",
      credentialCommitment: accountCommitment,
      revocationAuthorityAccountCredentialCommitment: accountCommitment,
      statusIndex: account.statusIndex,
    });
    let ledger = readPermioAuthorizationLedger(context.currentQueryContext.state);
    let rootRecord = ledger.credentialStatusRoots.lookup(namespaceHash);
    assert.equal(rootRecord.root.field, issuedTransition.nextRoot.field);
    assert.equal(rootRecord.rootSequence, 1n);

    assert.throws(() => contract.circuits.updateRuntimeCredentialStatus(
      context,
      issue,
      signRuntimeCredentialStatusCommand(issue, issuerSecret, 29n),
      issuer,
      authority.pathFor(issuerCommitment),
      account,
      emptyPath,
      emptyPath,
    ), /nonce already used|root sequence is stale|empty status leaf/);

    context = createCircuitContext(
      dummyContractAddress(),
      "00".repeat(32),
      context.currentQueryContext.state,
      undefined,
      undefined,
      undefined,
      201,
    );
    const revoke = createRuntimeCredentialStatusCommand({
      namespace: TARGET.namespace,
      governancePolicyHash: `0x${Buffer.from(governancePolicyHash).toString("hex")}`,
      authorityRootVersion: 1,
      authorityRootSequence: 1,
      credentialStatusRootSequence: status.sequence,
      kind: "account",
      credentialCommitment: accountCommitment,
      subjectAccountCredentialCommitment: accountCommitment,
      revocationAuthorityAccountCredentialCommitment: accountCommitment,
      statusIndex: account.statusIndex,
      expectedStatus: "active",
      nextStatus: "revoked",
      effectiveAt: 201,
      commandNonce: `0x${"02".repeat(32)}`,
    });
    const activePath = status.pathFor(account.statusIndex);
    assert.throws(() => contract.circuits.updateRuntimeCredentialStatus(
      context,
      revoke,
      signRuntimeCredentialStatusCommand(revoke, 17n, 31n),
      issuer,
      authority.pathFor(issuerCommitment),
      account,
      activePath,
      activePath,
    ), /Invalid governance activation signature/);
    const revoked = contract.circuits.updateRuntimeCredentialStatus(
      context,
      revoke,
      signRuntimeCredentialStatusCommand(revoke, accountSecret, 37n),
      issuer,
      authority.pathFor(issuerCommitment),
      account,
      activePath,
      activePath,
    );
    context = revoked.context;
    const revokedTransition = status.revoke({
      namespace: TARGET.namespace,
      kind: "account",
      credentialCommitment: accountCommitment,
      revocationAuthorityAccountCredentialCommitment: accountCommitment,
      statusIndex: account.statusIndex,
    });
    ledger = readPermioAuthorizationLedger(context.currentQueryContext.state);
    rootRecord = ledger.credentialStatusRoots.lookup(namespaceHash);
    assert.equal(rootRecord.root.field, revokedTransition.nextRoot.field);
    assert.equal(rootRecord.rootSequence, 2n);
  });

  it("keeps independent sparse status indexes and rejects duplicate or altered replacements", () => {
    const status = new CredentialStatusTree();
    const first = {
      namespace: TARGET.namespace,
      kind: "capability" as const,
      credentialCommitment: Uint8Array.from({ length: 32 }, () => 1),
      revocationAuthorityAccountCredentialCommitment:
        Uint8Array.from({ length: 32 }, () => 2),
      statusIndex: 7n,
    };
    const second = {
      namespace: TARGET.namespace,
      kind: "session" as const,
      credentialCommitment: Uint8Array.from({ length: 32 }, () => 3),
      revocationAuthorityAccountCredentialCommitment:
        Uint8Array.from({ length: 32 }, () => 4),
      statusIndex: 700_001n,
    };
    status.issue(first);
    const secondEmptyPath = status.pathFor(second.statusIndex);
    assert.equal(
      permioAuthorizationPureCircuits.runtimeCredentialStatusPathRoot(secondEmptyPath).field,
      status.root.field,
    );
    status.issue(second);
    assert.equal(
      permioAuthorizationPureCircuits.runtimeCredentialStatusPathRoot(
        status.pathFor(first.statusIndex),
      ).field,
      status.root.field,
    );
    assert.throws(() => status.issue(first), /already occupied/);
    assert.throws(() => status.revoke({
      ...first,
      credentialCommitment: Uint8Array.from({ length: 32 }, () => 9),
    }), /exact active status leaf/);
  });
});
