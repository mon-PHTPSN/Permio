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
  createRuntimeSessionCredential,
  createEmptyRuntimeSessionCredential,
  createRuntimeCredentialStatusCommand,
  advanceRuntimeCredentialInstanceBinding,
  createEmptyRuntimeScopeProgress,
  assertRuntimeScopeHashesCanonicallyOrderable,
  buildRuntimeScopeTree,
  CapabilityAttenuationPlan,
  createPermioAuthorizationContract,
  CredentialStatusTree,
  buildAuthorityRoot,
  governanceActivatorPublicKey,
  hashProtocolIdentifier,
  hashM5ScenarioInstance,
  MIDNIGHT_AUTHORITY_KINDS,
  permioAuthorizationPureCircuits,
  readPermioAuthorizationLedger,
  runtimeScopeOrderKey,
  signRuntimeCredentialStatusCommand,
  signRuntimeAccountCredential,
  signRuntimeActionIntent,
  signRuntimeCapabilityCredential,
  signRuntimeSessionCredential,
  verifyRuntimeSignature,
} from "../src/index.ts";
import { unitCreateCapability as createRuntimeCapabilityCredential, unitInstanceBinding, seedUnitAllocation } from "./fixtures/instance-binding.ts";

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
      value.instance,
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
      () => createRuntimeActionIntent(altered, value.session.publicKeyPem, session.credential, value.instance),
      /Ed25519 signature is invalid/,
    );
    const wrongInstance = createSignedActionIntent(
      { ...signed.payload, instanceId: "different-instance" }, value.sessionM5.privateKey,
    );
    assert.throws(() => createRuntimeActionIntent(
      wrongInstance, value.session.publicKeyPem, session.credential, value.instance,
    ), /exact allocated M5 instance/);
    assert.throws(() => createRuntimeActionIntent(
      signed, value.session.publicKeyPem, session.credential,
      { ...value.instance, expiresAt: value.instance.expiresAt + 1 },
    ), /exact allocated M5 instance/);
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

  it("orders private scope hashes by the circuit's 64-bit limb and rejects limb collisions", () => {
    const tree = buildRuntimeScopeTree("resource", ["case-300", "case-100", "case-200"]);
    const orderKeys = tree.valueHashes.map(runtimeScopeOrderKey);
    assert.deepEqual(orderKeys, [...orderKeys].sort((left, right) => (
      left < right ? -1 : left > right ? 1 : 0
    )));

    const first = new Uint8Array(32);
    const distinctSameOrderKey = new Uint8Array(32);
    distinctSameOrderKey[0] = 1;
    assert.equal(runtimeScopeOrderKey(first), runtimeScopeOrderKey(distinctSameOrderKey));
    const endianVector = new Uint8Array(32);
    endianVector[24] = 2;
    endianVector[31] = 1;
    assert.equal(runtimeScopeOrderKey(endianVector), 0x0100000000000002n);
    assert.throws(
      () => assertRuntimeScopeHashesCanonicallyOrderable([first, distinctSameOrderKey]),
      /distinct hashes with the same 64-bit ordering key/,
    );
    assert.throws(
      () => assertRuntimeScopeHashesCanonicallyOrderable([first, first]),
      /duplicate value hashes/,
    );
  });

  it("reconstructs the exact private child scope and rejects values outside the parent", () => {
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
    const child = createRuntimeCapabilityCredential({
      grant: value.childGrant,
      instanceCommitment,
      subjectAccountCredential: delegate,
      parentCapabilityCredential: parent.credential,
      issuerAccountCredential: holder,
      statusIndex: 4n,
    });
    const plan = new CapabilityAttenuationPlan(child.scope, parent.scope);
    assert.equal(plan.totalElementCount, 7n);
    while (!plan.complete) {
      const stage = plan.stageNext();
      assert.equal(stage.childPath.leaf.length, 32);
      assert.equal(stage.parentPath.leaf.length, 32);
    }
    assert.deepEqual(plan.currentProgress.roots, child.credential.scopeRoots);
    assert.deepEqual(plan.currentProgress.counts, child.credential.scopeCounts);

    const expandedGrant: CapabilityGrant = {
      ...value.childGrant,
      scope: { ...value.childGrant.scope, resources: ["case-999"] },
    };
    const expanded = createRuntimeCapabilityCredential({
      grant: expandedGrant,
      instanceCommitment,
      subjectAccountCredential: delegate,
      parentCapabilityCredential: parent.credential,
      issuerAccountCredential: holder,
      statusIndex: 5n,
    });
    const invalidPlan = new CapabilityAttenuationPlan(expanded.scope, parent.scope);
    let rejectedValue = false;
    while (!invalidPlan.complete) {
      const before = invalidPlan.currentProgress;
      try {
        invalidPlan.stageNext();
      } catch (error) {
        assert.match(String(error), /not present in the runtime scope/);
        assert.deepEqual(invalidPlan.currentProgress, before);
        assert.throws(() => invalidPlan.stageNext(), /not present in the runtime scope/);
        assert.deepEqual(invalidPlan.currentProgress, before);
        rejectedValue = true;
        break;
      }
    }
    assert.equal(rejectedValue, true);
  });

  it("activates a root capability only after exact staged scope completion", () => {
    const value = fixtures();
    const namespaceHash = Uint8Array.from(Buffer.from(
      hashProtocolIdentifier("namespace", TARGET.namespace).slice(2),
      "hex",
    ));
    const governancePolicyHash = Uint8Array.from({ length: 32 }, (_, index) => index + 11);
    const issuerSecret = 41n;
    const issuer = {
      leafVersion: 1n,
      namespaceHash,
      governancePolicyHash,
      authorityKind: MIDNIGHT_AUTHORITY_KINDS.capabilityIssuer,
      publicKey: governanceActivatorPublicKey(issuerSecret),
      validAfter: 0n,
      validBefore: 2_000n,
    };
    const authority = buildAuthorityRoot([issuer]);
    const issuerCommitment = permioAuthorizationPureCircuits
      .governanceActivatorLeafCommitment(issuer);
    const account = createRuntimeAccountCredential({
      account: value.holder,
      instance: value.instance,
      runtimePublicKey: governanceActivatorPublicKey(43n),
      statusIndex: 1n,
      validBefore: 900,
    });
    const capability = createRuntimeCapabilityCredential({
      namespaceIssuer: { principalId: value.rootGrant.issuerRef, authority: issuer },
      grant: value.rootGrant,
      instanceCommitment: hashM5ScenarioInstance(value.instance),
      subjectAccountCredential: account,
      statusIndex: 3n,
    });
    const capabilityCommitment = permioAuthorizationPureCircuits
      .runtimeCapabilityCredentialCommitment(capability.credential);
    const status = new CredentialStatusTree();
    const instanceBinding = unitInstanceBinding(issuer, account);
    const command = createRuntimeCredentialStatusCommand({
      instanceBinding,
      namespace: TARGET.namespace,
      governancePolicyHash: `0x${Buffer.from(governancePolicyHash).toString("hex")}`,
      authorityRootVersion: 1,
      authorityRootSequence: 1,
      credentialStatusRootSequence: status.sequence,
      kind: "capability",
      credentialCommitment: capabilityCommitment,
      subjectAccountCredentialCommitment:
        capability.credential.subjectAccountCredentialCommitment,
      revocationAuthorityAccountCredentialCommitment: new Uint8Array(32),
      statusIndex: capability.credential.statusIndex,
      expectedStatus: "empty",
      nextStatus: "active",
      effectiveAt: value.rootGrant.issuedAt,
      stagingExpiresAt: 180,
      commandNonce: `0x${"31".repeat(32)}`,
    });
    const commandSignature = signRuntimeCredentialStatusCommand(command, issuerSecret, 47n);
    const capabilitySignature = signRuntimeCapabilityCredential(
      capability.credential,
      issuerSecret,
      53n,
    );
    const emptyStatusPath = status.pathFor(capability.credential.statusIndex);
    const emptyProgress = createEmptyRuntimeScopeProgress();
    const placeholderElement: {
      readonly elementVersion: bigint;
      readonly dimension: bigint;
      readonly valueHash: Uint8Array;
    } = {
      elementVersion: 1n,
      dimension: 1n,
      valueHash: new Uint8Array(32),
    };
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
      seedUnitAllocation(initialized.currentContractState.data, instanceBinding),
      undefined,
      undefined,
      undefined,
      value.rootGrant.issuedAt,
    );
    const invoke = (
      operation: bigint,
      progress: ReturnType<typeof createEmptyRuntimeScopeProgress>,
      element = placeholderElement,
      childPath = emptyStatusPath,
      parentPath = emptyStatusPath,
    ) => contract.circuits.updateRuntimeCredentialStatus(
      context,
      operation,
      command,
      commandSignature,
      issuer,
      authority.pathFor(issuerCommitment),
      account,
      emptyStatusPath,
      emptyStatusPath,
      capability.credential,
      capabilitySignature,
      capability.credential,
      emptyStatusPath,
      progress,
      element,
      childPath,
      parentPath,
      createEmptyRuntimeSessionCredential(),
      instanceBinding,
    );

    context = invoke(2n, emptyProgress).context;
    let ledger = readPermioAuthorizationLedger(context.currentQueryContext.state);
    assert.equal(ledger.capabilityAttenuationSessions.member(command.commandNonce), true);
    assert.equal(ledger.usedCredentialStatusCommandNonces.member(command.commandNonce), false);

    const plan = new CapabilityAttenuationPlan(capability.scope);
    const first = plan.stageNext();
    context = invoke(
      3n,
      first.progress,
      first.element,
      first.childPath,
      first.parentPath,
    ).context;
    assert.throws(() => invoke(
      3n,
      first.progress,
      first.element,
      first.childPath,
      first.parentPath,
    ), /progress does not match/);
    assert.throws(() => invoke(4n, plan.currentProgress), /incomplete or mismatched/);

    const second = plan.stageNext();
    assert.equal(second.element.dimension, first.element.dimension);
    assert.throws(() => invoke(
      3n,
      second.progress,
      first.element,
      second.childPath,
      second.parentPath,
    ), /unique and canonically ordered/);
    const collidingValueHash = first.element.valueHash.slice();
    collidingValueHash[0] = collidingValueHash[0]! ^ 1;
    assert.notDeepEqual(collidingValueHash, first.element.valueHash);
    assert.equal(runtimeScopeOrderKey(collidingValueHash),
      runtimeScopeOrderKey(first.element.valueHash));
    assert.throws(() => invoke(
      3n,
      second.progress,
      { ...first.element, valueHash: collidingValueHash },
      second.childPath,
      second.parentPath,
    ), /unique and canonically ordered/);
    context = invoke(
      3n,
      second.progress,
      second.element,
      second.childPath,
      second.parentPath,
    ).context;

    while (!plan.complete) {
      const stage = plan.stageNext();
      context = invoke(
        3n,
        stage.progress,
        stage.element,
        stage.childPath,
        stage.parentPath,
      ).context;
    }
    context = invoke(4n, plan.currentProgress).context;
    Object.assign(instanceBinding, advanceRuntimeCredentialInstanceBinding(instanceBinding, command));
    const transition = status.issue({
      namespace: TARGET.namespace,
      kind: "capability",
      credentialCommitment: capabilityCommitment,
      revocationAuthorityAccountCredentialCommitment: new Uint8Array(32),
      statusIndex: capability.credential.statusIndex,
    });
    ledger = readPermioAuthorizationLedger(context.currentQueryContext.state);
    const rootRecord = ledger.credentialStatusRoots.lookup(namespaceHash);
    assert.equal(rootRecord.root.field, transition.nextRoot.field);
    assert.equal(rootRecord.rootSequence, 1n);
    assert.equal(ledger.capabilityAttenuationSessions.member(command.commandNonce), false);
    assert.equal(ledger.usedCredentialStatusCommandNonces.member(command.commandNonce), true);

    const expiringGrant: CapabilityGrant = {
      ...value.rootGrant,
      grantId: "grant-expiring",
      notBefore: 181,
      issuedAt: 181,
      expiresAt: 300,
    };
    const expiringCapability = createRuntimeCapabilityCredential({
      namespaceIssuer: { principalId: value.rootGrant.issuerRef, authority: issuer },
      grant: expiringGrant,
      instanceCommitment: hashM5ScenarioInstance(value.instance),
      subjectAccountCredential: account,
      statusIndex: 4n,
    });
    const expiringCommitment = permioAuthorizationPureCircuits
      .runtimeCapabilityCredentialCommitment(expiringCapability.credential);
    const expiringCommand = createRuntimeCredentialStatusCommand({
      instanceBinding,
      namespace: TARGET.namespace,
      governancePolicyHash: `0x${Buffer.from(governancePolicyHash).toString("hex")}`,
      authorityRootVersion: 1,
      authorityRootSequence: 1,
      credentialStatusRootSequence: status.sequence,
      kind: "capability",
      credentialCommitment: expiringCommitment,
      subjectAccountCredentialCommitment:
        expiringCapability.credential.subjectAccountCredentialCommitment,
      revocationAuthorityAccountCredentialCommitment: new Uint8Array(32),
      statusIndex: expiringCapability.credential.statusIndex,
      expectedStatus: "empty",
      nextStatus: "active",
      effectiveAt: expiringGrant.issuedAt,
      stagingExpiresAt: 185,
      commandNonce: `0x${"32".repeat(32)}`,
    });
    const expiringPath = status.pathFor(expiringCapability.credential.statusIndex);
    const expiringCommandSignature = signRuntimeCredentialStatusCommand(
      expiringCommand,
      issuerSecret,
      59n,
    );
    const expiringCapabilitySignature = signRuntimeCapabilityCredential(
      expiringCapability.credential,
      issuerSecret,
      61n,
    );
    const invokeExpiring = (operation: bigint) =>
      contract.circuits.updateRuntimeCredentialStatus(
        context,
        operation,
        expiringCommand,
        expiringCommandSignature,
        issuer,
        authority.pathFor(issuerCommitment),
        account,
        expiringPath,
        expiringPath,
        expiringCapability.credential,
        expiringCapabilitySignature,
        expiringCapability.credential,
        expiringPath,
        createEmptyRuntimeScopeProgress(),
        placeholderElement,
        expiringPath,
        expiringPath,
        createEmptyRuntimeSessionCredential(),
        instanceBinding,
      );
    context = createCircuitContext(
      dummyContractAddress(),
      "00".repeat(32),
      context.currentQueryContext.state,
      undefined,
      undefined,
      undefined,
      expiringGrant.issuedAt,
    );
    context = invokeExpiring(2n).context;
    context = createCircuitContext(
      dummyContractAddress(),
      "00".repeat(32),
      context.currentQueryContext.state,
      undefined,
      undefined,
      undefined,
      185,
    );
    context = invokeExpiring(4n).context;
    ledger = readPermioAuthorizationLedger(context.currentQueryContext.state);
    assert.equal(ledger.capabilityAttenuationSessions.member(expiringCommand.commandNonce), false);
    assert.equal(ledger.usedCredentialStatusCommandNonces.member(expiringCommand.commandNonce), false);
    assert.equal(ledger.credentialStatusRoots.lookup(namespaceHash).rootSequence, 1n);
    assert.throws(() => invokeExpiring(4n), /session does not exist/);
  });

  it("rejects non-attenuated and out-of-parent delegated capability scopes", () => {
    const value = fixtures();
    const namespaceHash = Uint8Array.from(Buffer.from(
      hashProtocolIdentifier("namespace", TARGET.namespace).slice(2),
      "hex",
    ));
    const governancePolicyHash = Uint8Array.from({ length: 32 }, (_, index) => index + 21);
    const namespaceIssuerSecret = 67n;
    const holderSecret = 71n;
    const namespaceIssuer = {
      leafVersion: 1n,
      namespaceHash,
      governancePolicyHash,
      authorityKind: MIDNIGHT_AUTHORITY_KINDS.capabilityIssuer,
      publicKey: governanceActivatorPublicKey(namespaceIssuerSecret),
      validAfter: 0n,
      validBefore: 2_000n,
    };
    const authority = buildAuthorityRoot([namespaceIssuer]);
    const holder = createRuntimeAccountCredential({
      account: value.holder,
      instance: value.instance,
      runtimePublicKey: governanceActivatorPublicKey(holderSecret),
      statusIndex: 1n,
      validBefore: 900,
    });
    const delegate = createRuntimeAccountCredential({
      account: value.delegate,
      instance: value.instance,
      runtimePublicKey: governanceActivatorPublicKey(73n),
      statusIndex: 2n,
      validBefore: 800,
    });
    const instanceCommitment = hashM5ScenarioInstance(value.instance);
    const parent = createRuntimeCapabilityCredential({
      namespaceIssuer: { principalId: value.rootGrant.issuerRef, authority: namespaceIssuer },
      grant: value.rootGrant,
      instanceCommitment,
      subjectAccountCredential: holder,
      statusIndex: 3n,
    });
    const holderCommitment = permioAuthorizationPureCircuits
      .runtimeAccountCredentialCommitment(holder);
    const parentCommitment = permioAuthorizationPureCircuits
      .runtimeCapabilityCredentialCommitment(parent.credential);
    const status = new CredentialStatusTree();
    status.issue({
      namespace: TARGET.namespace,
      kind: "account",
      credentialCommitment: holderCommitment,
      revocationAuthorityAccountCredentialCommitment: holderCommitment,
      statusIndex: holder.statusIndex,
    });
    status.issue({
      namespace: TARGET.namespace,
      kind: "capability",
      credentialCommitment: parentCommitment,
      revocationAuthorityAccountCredentialCommitment: new Uint8Array(32),
      statusIndex: parent.credential.statusIndex,
    });
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
    const instanceBinding = unitInstanceBinding(namespaceIssuer, holder);
    let context = createCircuitContext(
      dummyContractAddress(),
      "00".repeat(32),
      seedUnitAllocation(initialized.currentContractState.data, instanceBinding),
      undefined,
      undefined,
      undefined,
      value.childGrant.issuedAt,
    );
    const namespacePath = authority.pathFor(
      permioAuthorizationPureCircuits.governanceActivatorLeafCommitment(namespaceIssuer),
    );
    const holderPath = status.pathFor(holder.statusIndex);
    const parentPath = status.pathFor(parent.credential.statusIndex);
    const emptyProgress = createEmptyRuntimeScopeProgress();
    const placeholderElement: {
      readonly elementVersion: bigint;
      readonly dimension: bigint;
      readonly valueHash: Uint8Array;
    } = { elementVersion: 1n, dimension: 1n, valueHash: new Uint8Array(32) };

    const equalGrant: CapabilityGrant = {
      ...value.childGrant,
      scope: value.rootGrant.scope,
      notBefore: value.rootGrant.notBefore,
      expiresAt: value.rootGrant.expiresAt,
      maxDelegationDepth: value.rootGrant.maxDelegationDepth,
      issuedAt: value.rootGrant.issuedAt,
    };
    const equalCapability = createRuntimeCapabilityCredential({
      grant: equalGrant,
      instanceCommitment,
      subjectAccountCredential: delegate,
      parentCapabilityCredential: parent.credential,
      issuerAccountCredential: holder,
      statusIndex: 4n,
    });
    const equalCommand = createRuntimeCredentialStatusCommand({
      instanceBinding,
      namespace: TARGET.namespace,
      governancePolicyHash: `0x${Buffer.from(governancePolicyHash).toString("hex")}`,
      authorityRootVersion: 1,
      authorityRootSequence: 1,
      credentialStatusRootSequence: 0n,
      kind: "capability",
      credentialCommitment: permioAuthorizationPureCircuits
        .runtimeCapabilityCredentialCommitment(equalCapability.credential),
      subjectAccountCredentialCommitment:
        equalCapability.credential.subjectAccountCredentialCommitment,
      revocationAuthorityAccountCredentialCommitment: holderCommitment,
      statusIndex: equalCapability.credential.statusIndex,
      expectedStatus: "empty",
      nextStatus: "active",
      effectiveAt: equalGrant.issuedAt,
      stagingExpiresAt: 180,
      commandNonce: `0x${"41".repeat(32)}`,
    });
    const equalEmptyPath = status.pathFor(equalCapability.credential.statusIndex);
    assert.throws(() => contract.circuits.updateRuntimeCredentialStatus(
      context,
      2n,
      equalCommand,
      signRuntimeCredentialStatusCommand(equalCommand, holderSecret, 79n),
      namespaceIssuer,
      namespacePath,
      holder,
      holderPath,
      equalEmptyPath,
      equalCapability.credential,
      signRuntimeCapabilityCredential(equalCapability.credential, holderSecret, 83n),
      parent.credential,
      parentPath,
      emptyProgress,
      placeholderElement,
      equalEmptyPath,
      equalEmptyPath,
      createEmptyRuntimeSessionCredential(),
      instanceBinding,
    ), /strictly narrower/);

    const expandedGrant: CapabilityGrant = {
      ...value.childGrant,
      scope: { ...value.childGrant.scope, resources: ["case-999"] },
    };
    const expanded = createRuntimeCapabilityCredential({
      grant: expandedGrant,
      instanceCommitment,
      subjectAccountCredential: delegate,
      parentCapabilityCredential: parent.credential,
      issuerAccountCredential: holder,
      statusIndex: 5n,
    });
    const expandedCommand = createRuntimeCredentialStatusCommand({
      instanceBinding,
      namespace: TARGET.namespace,
      governancePolicyHash: `0x${Buffer.from(governancePolicyHash).toString("hex")}`,
      authorityRootVersion: 1,
      authorityRootSequence: 1,
      credentialStatusRootSequence: 0n,
      kind: "capability",
      credentialCommitment: permioAuthorizationPureCircuits
        .runtimeCapabilityCredentialCommitment(expanded.credential),
      subjectAccountCredentialCommitment:
        expanded.credential.subjectAccountCredentialCommitment,
      revocationAuthorityAccountCredentialCommitment: holderCommitment,
      statusIndex: expanded.credential.statusIndex,
      expectedStatus: "empty",
      nextStatus: "active",
      effectiveAt: expandedGrant.issuedAt,
      stagingExpiresAt: 180,
      commandNonce: `0x${"42".repeat(32)}`,
    });
    const expandedCommandSignature = signRuntimeCredentialStatusCommand(
      expandedCommand,
      holderSecret,
      89n,
    );
    const expandedSignature = signRuntimeCapabilityCredential(
      expanded.credential,
      holderSecret,
      97n,
    );
    const expandedEmptyPath = status.pathFor(expanded.credential.statusIndex);
    const invoke = (
      operation: bigint,
      progress: ReturnType<typeof createEmptyRuntimeScopeProgress>,
      element = placeholderElement,
      childPath = expandedEmptyPath,
      parentScopePath = expandedEmptyPath,
    ) => contract.circuits.updateRuntimeCredentialStatus(
      context,
      operation,
      expandedCommand,
      expandedCommandSignature,
      namespaceIssuer,
      namespacePath,
      holder,
      holderPath,
      expandedEmptyPath,
      expanded.credential,
      expandedSignature,
      parent.credential,
      parentPath,
      progress,
      element,
      childPath,
      parentScopePath,
      createEmptyRuntimeSessionCredential(),
      instanceBinding,
    );
    context = invoke(2n, emptyProgress).context;
    const plan = new CapabilityAttenuationPlan(expanded.scope);
    const parentTree = (dimension: bigint) => {
      switch (dimension) {
        case 1n: return parent.scope.actions;
        case 2n: return parent.scope.resourceSelectors;
        case 3n: return parent.scope.resources;
        case 4n: return parent.scope.purposes;
        case 5n: return parent.scope.recipientKinds;
        case 6n: return parent.scope.recipients;
        default: return parent.scope.disclosurePolicyIds;
      }
    };
    let rejectedExpansion = false;
    while (!plan.complete) {
      const stage = plan.stageNext();
      let membershipPath;
      try {
        membershipPath = parentTree(stage.element.dimension)
          .pathForHash(stage.element.valueHash);
      } catch {
        membershipPath = parent.scope.resources.pathFor("case-100");
      }
      try {
        context = invoke(
          3n,
          stage.progress,
          stage.element,
          stage.childPath,
          membershipPath,
        ).context;
      } catch (error) {
        assert.match(String(error), /outside its parent scope/);
        rejectedExpansion = true;
        break;
      }
    }
    assert.equal(rejectedExpansion, true);
    const ledger = readPermioAuthorizationLedger(context.currentQueryContext.state);
    assert.equal(ledger.credentialStatusRoots.lookup(namespaceHash).rootSequence, 0n);
    assert.equal(ledger.usedCredentialStatusCommandNonces.member(expandedCommand.commandNonce), false);

    const validChild = createRuntimeCapabilityCredential({
      grant: value.childGrant,
      instanceCommitment,
      subjectAccountCredential: delegate,
      parentCapabilityCredential: parent.credential,
      issuerAccountCredential: holder,
      statusIndex: 6n,
    });
    const validChildCommitment = permioAuthorizationPureCircuits
      .runtimeCapabilityCredentialCommitment(validChild.credential);
    const validChildCommand = createRuntimeCredentialStatusCommand({
      instanceBinding,
      namespace: TARGET.namespace,
      governancePolicyHash: `0x${Buffer.from(governancePolicyHash).toString("hex")}`,
      authorityRootVersion: 1,
      authorityRootSequence: 1,
      credentialStatusRootSequence: 0n,
      kind: "capability",
      credentialCommitment: validChildCommitment,
      subjectAccountCredentialCommitment:
        validChild.credential.subjectAccountCredentialCommitment,
      revocationAuthorityAccountCredentialCommitment: holderCommitment,
      statusIndex: validChild.credential.statusIndex,
      expectedStatus: "empty",
      nextStatus: "active",
      effectiveAt: value.childGrant.issuedAt,
      stagingExpiresAt: 180,
      commandNonce: `0x${"43".repeat(32)}`,
    });
    const validCommandSignature = signRuntimeCredentialStatusCommand(
      validChildCommand,
      holderSecret,
      101n,
    );
    const validCapabilitySignature = signRuntimeCapabilityCredential(
      validChild.credential,
      holderSecret,
      103n,
    );
    const validEmptyPath = status.pathFor(validChild.credential.statusIndex);
    const invokeValid = (
      operation: bigint,
      progress: ReturnType<typeof createEmptyRuntimeScopeProgress>,
      element = placeholderElement,
      childPath = validEmptyPath,
      parentScopePath = validEmptyPath,
      accountStatusPath = status.pathFor(holder.statusIndex),
      parentStatusPath = status.pathFor(parent.credential.statusIndex),
    ) => contract.circuits.updateRuntimeCredentialStatus(
      context,
      operation,
      validChildCommand,
      validCommandSignature,
      namespaceIssuer,
      namespacePath,
      holder,
      accountStatusPath,
      status.pathFor(validChild.credential.statusIndex),
      validChild.credential,
      validCapabilitySignature,
      parent.credential,
      parentStatusPath,
      progress,
      element,
      childPath,
      parentScopePath,
      createEmptyRuntimeSessionCredential(),
      instanceBinding,
    );
    context = invokeValid(2n, createEmptyRuntimeScopeProgress()).context;
    const validPlan = new CapabilityAttenuationPlan(validChild.scope, parent.scope);
    while (!validPlan.complete) {
      const stage = validPlan.stageNext();
      context = invokeValid(
        3n,
        stage.progress,
        stage.element,
        stage.childPath,
        stage.parentPath,
      ).context;
    }

    const revokeParent = createRuntimeCredentialStatusCommand({
      instanceBinding,
      namespace: TARGET.namespace,
      governancePolicyHash: `0x${Buffer.from(governancePolicyHash).toString("hex")}`,
      authorityRootVersion: 1,
      authorityRootSequence: 1,
      credentialStatusRootSequence: 0n,
      kind: "capability",
      credentialCommitment: parentCommitment,
      subjectAccountCredentialCommitment:
        parent.credential.subjectAccountCredentialCommitment,
      revocationAuthorityAccountCredentialCommitment: new Uint8Array(32),
      statusIndex: parent.credential.statusIndex,
      expectedStatus: "active",
      nextStatus: "revoked",
      effectiveAt: 150,
      commandNonce: `0x${"44".repeat(32)}`,
    });
    context = createCircuitContext(
      dummyContractAddress(),
      "00".repeat(32),
      context.currentQueryContext.state,
      undefined,
      undefined,
      undefined,
      150,
    );
    const parentActivePath = status.pathFor(parent.credential.statusIndex);
    context = contract.circuits.updateRuntimeCredentialStatus(
      context,
      1n,
      revokeParent,
      signRuntimeCredentialStatusCommand(revokeParent, namespaceIssuerSecret, 107n),
      namespaceIssuer,
      namespacePath,
      holder,
      status.pathFor(holder.statusIndex),
      parentActivePath,
      parent.credential,
      signRuntimeCapabilityCredential(parent.credential, namespaceIssuerSecret, 109n),
      parent.credential,
      parentActivePath,
      createEmptyRuntimeScopeProgress(),
      placeholderElement,
      parentActivePath,
      parentActivePath,
      createEmptyRuntimeSessionCredential(),
      instanceBinding,
    ).context;
    status.revoke({
      namespace: TARGET.namespace,
      kind: "capability",
      credentialCommitment: parentCommitment,
      revocationAuthorityAccountCredentialCommitment: new Uint8Array(32),
      statusIndex: parent.credential.statusIndex,
    });
    assert.throws(() => invokeValid(
      4n,
      validPlan.currentProgress,
      placeholderElement,
      status.pathFor(validChild.credential.statusIndex),
      status.pathFor(validChild.credential.statusIndex),
      status.pathFor(holder.statusIndex),
      status.pathFor(parent.credential.statusIndex),
    ), /stale against the exact instance state/);
    const revokedLedger = readPermioAuthorizationLedger(context.currentQueryContext.state);
    assert.equal(revokedLedger.credentialStatusRoots.lookup(namespaceHash).rootSequence, 1n);
    assert.equal(revokedLedger.usedCredentialStatusCommandNonces.member(validChildCommand.commandNonce), false);
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
    const placeholderCapability = createRuntimeCapabilityCredential({
      namespaceIssuer: { principalId: value.rootGrant.issuerRef, authority: issuer },
      grant: value.rootGrant,
      instanceCommitment: hashM5ScenarioInstance(value.instance),
      subjectAccountCredential: account,
      statusIndex: 8n,
    }).credential;
    const placeholderCapabilitySignature = signRuntimeCapabilityCredential(
      placeholderCapability,
      issuerSecret,
      19n,
    );
    const emptyScopeProgress = createEmptyRuntimeScopeProgress();
    const placeholderScopeElement = {
      elementVersion: 1n,
      dimension: 1n,
      valueHash: new Uint8Array(32),
    };
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
    const instanceBinding = unitInstanceBinding(issuer, account);
    let context = createCircuitContext(
      dummyContractAddress(),
      "00".repeat(32),
      seedUnitAllocation(initialized.currentContractState.data, instanceBinding),
      undefined,
      undefined,
      undefined,
      200,
    );
    const issue = createRuntimeCredentialStatusCommand({
      instanceBinding,
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
      1n,
      issue,
      signRuntimeCredentialStatusCommand(issue, issuerSecret, 23n),
      issuer,
      authority.pathFor(issuerCommitment),
      account,
      emptyPath,
      emptyPath,
      placeholderCapability,
      placeholderCapabilitySignature,
      placeholderCapability,
      emptyPath,
      emptyScopeProgress,
      placeholderScopeElement,
      emptyPath,
      emptyPath,
      createEmptyRuntimeSessionCredential(),
      instanceBinding,
    );
    context = issued.context;
    Object.assign(instanceBinding, advanceRuntimeCredentialInstanceBinding(instanceBinding, issue));
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
      1n,
      issue,
      signRuntimeCredentialStatusCommand(issue, issuerSecret, 29n),
      issuer,
      authority.pathFor(issuerCommitment),
      account,
      emptyPath,
      emptyPath,
      placeholderCapability,
      placeholderCapabilitySignature,
      placeholderCapability,
      emptyPath,
      emptyScopeProgress,
      placeholderScopeElement,
      emptyPath,
      emptyPath,
      createEmptyRuntimeSessionCredential(),
      instanceBinding,
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
      instanceBinding,
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
      1n,
      revoke,
      signRuntimeCredentialStatusCommand(revoke, 17n, 31n),
      issuer,
      authority.pathFor(issuerCommitment),
      account,
      activePath,
      activePath,
      placeholderCapability,
      placeholderCapabilitySignature,
      placeholderCapability,
      activePath,
      emptyScopeProgress,
      placeholderScopeElement,
      activePath,
      activePath,
      createEmptyRuntimeSessionCredential(),
      instanceBinding,
    ), /Invalid governance activation signature/);
    const revoked = contract.circuits.updateRuntimeCredentialStatus(
      context,
      1n,
      revoke,
      signRuntimeCredentialStatusCommand(revoke, accountSecret, 37n),
      issuer,
      authority.pathFor(issuerCommitment),
      account,
      activePath,
      activePath,
      placeholderCapability,
      placeholderCapabilitySignature,
      placeholderCapability,
      activePath,
      emptyScopeProgress,
      placeholderScopeElement,
      activePath,
      activePath,
      createEmptyRuntimeSessionCredential(),
      instanceBinding,
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
