import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { describe, it } from "node:test";

import { hashScenarioTemplate, parseScenarioTemplate } from "@permio/scenario-domain";
import type {
  ActivationRecord,
  ReviewerAttestation,
  TemplateRecord,
} from "@permio/scenario-governance";

import {
  CapabilityAttenuationPlan,
  governanceCircuitOperations,
  CredentialStatusTree,
  createEmptyRuntimeScopeProgress,
  createEmptyRuntimeSessionCredential,
  createRuntimeAccountCredential,
  createRuntimeCapabilityCredential,
  createRuntimeCredentialInstanceBinding,
  advanceRuntimeCredentialInstanceBinding,
  createRuntimeCredentialStatusCommand,
  signRuntimeCapabilityCredential,
  signRuntimeCredentialStatusCommand,
  createActivationAdmissionArtifact,
  createPermioAuthorizationContract,
  createRuntimeInstanceAllocation,
  createRuntimePolicyBindingManifest,
  createRuntimeAllocationPolicyWitness,
  hashM5ScenarioInstance,
  signRuntimeInstanceAllocation,
  signRuntimeSlotCommand,
  RuntimePrivateMap,
  createRuntimeTemplateActionPolicy,
  hashRuntimeIdentifier,
  type RuntimeStateOpening,
  type RuntimeSlotCommand,
  type RuntimeSlotRecord,
  type RuntimeSlotAncestryStep,
  type RuntimeSlotProgress,
  buildAuthorityRoot,
  buildProofModuleBindingTree,
  governanceActivatorPublicKey,
  hashApprovalEvidence,
  MIDNIGHT_AUTHORITY_KINDS,
  signActivationAdmissionEnvelope,
  signAuthorityRootUpdateCommand,
  signProofModuleLifecycleCommand,
  signProofModuleReview,
  signTemplateLifecycleCommand,
  toCompactActivationAdmissionEnvelope,
  toCompactProofModuleBinding,
  toCompactProofModuleProposal,
  type ActivationAdmissionInput,
  type ProofModuleBindingManifest,
  type RuntimeCredentialStatusCommand,
  type RuntimeCredentialInstanceBinding,
  type RuntimeAccountCredential,
  type RuntimeCapabilityCredential,
  type RuntimeScopeStage,
} from "../src/index.ts";
import {
  createCircuitContext,
  createConstructorContext,
  dummyContractAddress,
  type CircuitContext,
} from "@midnight-ntwrk/midnight-js-protocol/compact-runtime";
import {
  ledger,
  pureCircuits,
  type AuthorityRootUpdateCommand,
  type GovernanceActivatorLeaf,
  type ProofModuleLifecycleCommand,
  type ProofModuleReview,
  type TemplateLifecycleCommand,
} from "../contracts/managed/permio-authorization/contract/index.js";

function hexBytes(value: `0x${string}`): Uint8Array {
  return Uint8Array.from(Buffer.from(value.slice(2), "hex"));
}

function template() {
  return parseScenarioTemplate({
    schemaVersion: 1,
    namespace: "org.example",
    templateId: "org.example/context-access",
    version: "1.0.0",
    displayName: "Context Access",
    description: "A neutral template for context-bound access.",
    participantSlots: [
      {
        id: "subject",
        description: "The party requesting an action.",
        assignableBy: ["@instance-creator"],
      },
      {
        id: "verifier",
        description: "The intended verifier.",
        assignableBy: ["@namespace-governance"],
      },
    ],
    contexts: [
      {
        id: "access",
        description: "A purpose-limited access context.",
        allowedSlotIds: ["subject", "verifier"],
        recordTypes: ["credential"],
        claimTypes: ["eligible"],
        recipientKinds: ["specific-recipient"],
        purposes: ["access-check"],
      },
    ],
    states: ["ready", "authorized"],
    initialState: "ready",
    actions: [
      {
        id: "authorize-access",
        description: "Authorize one context-bound access action.",
        contextId: "access",
        actorSlotId: "subject",
        inputRecordTypes: ["credential"],
        outputClaimTypes: ["eligible"],
        purpose: "access-check",
        recipientKind: "specific-recipient",
        capabilityRuleId: "access-capability",
        proofProfileId: "eligibility-proof",
        executionAdapterId: "receipt-registry",
      },
    ],
    transitions: [
      {
        id: "authorize",
        fromState: "ready",
        actionId: "authorize-access",
        toState: "authorized",
      },
    ],
    capabilityRules: [
      {
        id: "access-capability",
        description: "A short-lived, recipient-bound capability.",
        actionIds: ["authorize-access"],
        resourceSelector: "instance-resource",
        purpose: "access-check",
        recipientConstraint: "specific-recipient",
        validForSeconds: 900,
        maxDelegationDepth: 0,
        disclosurePolicyId: "minimum-eligible-claim",
        revocable: true,
      },
    ],
    proofProfiles: [
      {
        id: "eligibility-proof",
        circuitId: "delegated-capability-action-v1",
        publicOutputSchemaId: "decision-receipt-v1",
      },
    ],
    executionAdapters: [
      {
        id: "receipt-registry",
        kind: "commitment-receipt",
        schemaId: "receipt-v1",
      },
    ],
    privacyInvariants: [
      {
        id: "no-global-subject-id",
        description: "Do not expose an identifier shared across contexts.",
      },
    ],
  });
}

function fixture(value = template()) {
  const templateHash = hashScenarioTemplate(value).value;
  const target = {
    namespace: value.namespace,
    templateId: value.templateId,
    templateVersion: value.version,
    templateHash,
  } as const;
  const activation: ActivationRecord = {
    ...target,
    activatedBy: "governance-one",
    activatedAt: 1_800_000_000,
    approvalReviewerIds: ["reviewer-one", "reviewer-two"],
    reviewThreshold: 2,
  };
  const reviews: readonly ReviewerAttestation[] = [
    {
      domain: "permio:reviewer-attestation:v1",
      algorithm: "ed25519",
      payload: {
        attestationVersion: 1,
        ...target,
        reviewerId: "reviewer-two",
        decision: "approve",
        reviewedAt: 1_799_999_901,
      },
      signature: "reviewer-two-signature",
    },
    {
      domain: "permio:reviewer-attestation:v1",
      algorithm: "ed25519",
      payload: {
        attestationVersion: 1,
        ...target,
        reviewerId: "reviewer-one",
        decision: "approve",
        reviewedAt: 1_799_999_900,
      },
      signature: "reviewer-one-signature",
    },
  ];
  const record: TemplateRecord = {
    target,
    template: value,
    authorId: "author-one",
    state: "active",
    validationReport: null,
    reviews,
    lifecycle: [],
  };
  const bindings: ProofModuleBindingManifest = {
    manifestVersion: 1,
    bindings: [
      {
        actionId: "authorize-access",
        proofProfileId: "eligibility-proof",
        moduleId: "delegated-capability-action",
        moduleVersion: "1.0.0",
        implementationHash: `0x${"11".repeat(32)}`,
        configurationHash: `0x${"22".repeat(32)}`,
        receiptSchemaHash: `0x${"33".repeat(32)}`,
      },
    ],
  };
  const input: ActivationAdmissionInput = {
    activation,
    governancePolicyHash: `0x${"44".repeat(32)}`,
    proofModuleBindings: bindings,
    proofModuleRegistrySequence: 6,
    approvalEvidenceCommitment: hashApprovalEvidence(activation, reviews),
    authorityRootVersion: 1,
    authorityRootSequence: 7,
    targetNetworkId: "undeployed",
    targetContractIdentity: `0x${"aa".repeat(32)}`,
    admissionNonce: `0x${"55".repeat(32)}`,
    stagingExpiresAt: 1_800_000_600,
  };
  return { activation, bindings, input, record, reviews };
}

function moduleProposal(
  binding: ProofModuleBindingManifest["bindings"][number],
  envelope: ReturnType<typeof toCompactActivationAdmissionEnvelope>,
) {
  return toCompactProofModuleProposal({
    moduleId: binding.moduleId,
    moduleVersion: binding.moduleVersion,
    implementationHash: binding.implementationHash,
    governanceNamespaceHash: `0x${Buffer.from(envelope.namespaceHash).toString("hex")}`,
    governancePolicyHash: `0x${Buffer.from(envelope.governancePolicyHash).toString("hex")}`,
    authorityRootVersion: Number(envelope.authorityRootVersion),
    authorityRootSequence: Number(envelope.authorityRootSequence),
    implementationReferenceHash: `0x${"61".repeat(32)}`,
    sourceHash: `0x${"62".repeat(32)}`,
    inputSchemaHash: `0x${"63".repeat(32)}`,
    configurationSchemaHash: `0x${"64".repeat(32)}`,
    receiptSchemaHash: binding.receiptSchemaHash,
    compilerVersionHash: `0x${"65".repeat(32)}`,
    compatibilityPolicyHash: `0x${"66".repeat(32)}`,
    proposedAt: 1_700_000_000,
  });
}

function moduleGovernance(
  activator: GovernanceActivatorLeaf,
  additionalAuthorities: readonly GovernanceActivatorLeaf[] = [],
) {
  const common = {
    leafVersion: 1n,
    namespaceHash: activator.namespaceHash,
    governancePolicyHash: activator.governancePolicyHash,
    validAfter: 0n,
    validBefore: 2_000_000_000n,
  } as const;
  const reviewerOneSecret = 101n;
  const reviewerTwoSecret = 103n;
  const approverSecret = 107n;
  const approverTwoSecret = 127n;
  const moduleActivatorSecret = 109n;
  const moduleRevokerSecret = 113n;
  const rootGovernorOneSecret = 149n;
  const rootGovernorTwoSecret = 151n;
  const templateRetirerSecret = 157n;
  const templateEmergencyRevokerSecret = 163n;
  const reviewerOne: GovernanceActivatorLeaf = {
    ...common,
    authorityKind: MIDNIGHT_AUTHORITY_KINDS.proofModuleReviewer,
    publicKey: governanceActivatorPublicKey(reviewerOneSecret),
  };
  const reviewerTwo: GovernanceActivatorLeaf = {
    ...common,
    authorityKind: MIDNIGHT_AUTHORITY_KINDS.proofModuleReviewer,
    publicKey: governanceActivatorPublicKey(reviewerTwoSecret),
  };
  const approver: GovernanceActivatorLeaf = {
    ...common,
    authorityKind: MIDNIGHT_AUTHORITY_KINDS.proofModuleApprover,
    publicKey: governanceActivatorPublicKey(approverSecret),
  };
  const approverTwo: GovernanceActivatorLeaf = {
    ...common,
    authorityKind: MIDNIGHT_AUTHORITY_KINDS.proofModuleApprover,
    publicKey: governanceActivatorPublicKey(approverTwoSecret),
  };
  const moduleActivator: GovernanceActivatorLeaf = {
    ...common,
    authorityKind: MIDNIGHT_AUTHORITY_KINDS.proofModuleActivator,
    publicKey: governanceActivatorPublicKey(moduleActivatorSecret),
  };
  const moduleRevoker: GovernanceActivatorLeaf = {
    ...common,
    authorityKind: MIDNIGHT_AUTHORITY_KINDS.proofModuleEmergencyRevoker,
    publicKey: governanceActivatorPublicKey(moduleRevokerSecret),
  };
  const rootGovernorOne: GovernanceActivatorLeaf = {
    ...common,
    authorityKind: MIDNIGHT_AUTHORITY_KINDS.authorityRootGovernor,
    publicKey: governanceActivatorPublicKey(rootGovernorOneSecret),
  };
  const rootGovernorTwo: GovernanceActivatorLeaf = {
    ...common,
    authorityKind: MIDNIGHT_AUTHORITY_KINDS.authorityRootGovernor,
    publicKey: governanceActivatorPublicKey(rootGovernorTwoSecret),
  };
  const templateRetirer: GovernanceActivatorLeaf = {
    ...common,
    authorityKind: MIDNIGHT_AUTHORITY_KINDS.templateRetirer,
    publicKey: governanceActivatorPublicKey(templateRetirerSecret),
  };
  const templateEmergencyRevoker: GovernanceActivatorLeaf = {
    ...common,
    authorityKind: MIDNIGHT_AUTHORITY_KINDS.emergencyRevoker,
    publicKey: governanceActivatorPublicKey(templateEmergencyRevokerSecret),
  };
  return {
    authority: buildAuthorityRoot([
      activator,
      reviewerOne,
      reviewerTwo,
      approver,
      approverTwo,
      moduleActivator,
      moduleRevoker,
      rootGovernorOne,
      rootGovernorTwo,
      templateRetirer,
      templateEmergencyRevoker,
      ...additionalAuthorities,
    ]),
    reviewerOne,
    reviewerOneSecret,
    reviewerTwo,
    reviewerTwoSecret,
    approver,
    approverSecret,
    approverTwo,
    approverTwoSecret,
    moduleActivator,
    moduleActivatorSecret,
    moduleRevoker,
    moduleRevokerSecret,
    rootGovernorOne,
    rootGovernorOneSecret,
    rootGovernorTwo,
    rootGovernorTwoSecret,
    templateRetirer,
    templateRetirerSecret,
    templateEmergencyRevoker,
    templateEmergencyRevokerSecret,
  };
}

function allocationFixture(includeSecondaryIssuer = false, slotTemplate = template()) {
  const { input, record } = fixture(slotTemplate);
  const configuredBindings = createRuntimePolicyBindingManifest(record.template,
    input.proofModuleBindings.bindings.map(({ configurationHash: _unused, ...selection }) => selection));
  const artifact = createActivationAdmissionArtifact(record, { ...input,
    proofModuleBindings: configuredBindings,
    targetContractIdentity: `0x${"00".repeat(32)}` });
  const envelope = toCompactActivationAdmissionEnvelope(artifact.envelope);
  const leaf = (authorityKind: bigint, secret: bigint): GovernanceActivatorLeaf => ({
    leafVersion: 1n, namespaceHash: envelope.namespaceHash,
    governancePolicyHash: envelope.governancePolicyHash, authorityKind,
    publicKey: governanceActivatorPublicKey(secret), validAfter: 0n, validBefore: 2_000_000_000n,
  });
  const activator = leaf(3n, 29n), allocator = leaf(4n, 181n);
  const issuer = leaf(6n, 191n), otherIssuer = leaf(6n, 193n);
  const slotGovernor = leaf(13n, 211n), otherAllocator = leaf(4n, 199n);
  const governance = moduleGovernance(activator, [allocator, issuer, otherIssuer, slotGovernor, otherAllocator]);
  const contract = createPermioAuthorizationContract();
  const initialized = contract.initialState(createConstructorContext(undefined, "00".repeat(32)),
    envelope.targetNetworkHash, envelope.namespaceHash, envelope.governancePolicyHash,
    governance.authority.root, envelope.authorityRootVersion, envelope.authorityRootSequence,
    new CredentialStatusTree().root, 2n, 2n, 2n);
  let context = createCircuitContext(dummyContractAddress(), "00".repeat(32),
    initialized.currentContractState, undefined, undefined, undefined, 1_800_000_100);
  context = activateFixtureModule(contract, context, governance,
    moduleProposal(configuredBindings.bindings[0]!, envelope));
  const signature = signActivationAdmissionEnvelope(envelope, 29n, 53n);
  const activatorPath = governance.authority.pathFor(pureCircuits.governanceActivatorLeafCommitment(activator));
  const begun = contract.circuits.beginM4Activation(context, envelope, signature, activator, activatorPath);
  const bindings = buildProofModuleBindingTree(artifact.bindings);
  context = contract.circuits.stageM4ActivationBinding(begun.context, begun.result,
    bindings.compactBindingAt(0), bindings.pathFor(0)).context;
  const finalized = contract.circuits.finalizeM4Activation(context, envelope, signature, activator, activatorPath);
  context = finalized.context;
  const instance = { ...record.target, instanceId: "private-instance", instantiationRequestId: "allocation-one",
    allocatedBy: "allocator-one", state: record.template.initialState, createdAt: 1_800_000_100,
    expiresAt: 1_800_001_000, revokedAt: null,
    capabilityIssuers: [{ principalId: "issuer-one", kind: "service" as const },
      ...(includeSecondaryIssuer ? [{ principalId: "issuer-two", kind: "service" as const }] : [])] };
  const adapterInput = { authorization: { ...record.target, requestId: instance.instantiationRequestId,
    allocatorId: instance.allocatedBy, authorizedAt: 1_800_000_010 }, templateRecord: record, instance,
    allocatorAuthority: allocator,
    capabilityIssuers: [{ principalId: "issuer-one", kind: "service" as const, authority: issuer },
      ...(includeSecondaryIssuer ? [{ principalId: "issuer-two", kind: "service" as const, authority: otherIssuer }] : [])],
    authorityRootVersion: envelope.authorityRootVersion, authorityRootSequence: envelope.authorityRootSequence,
    targetNetworkHash: envelope.targetNetworkHash, targetContractIdentity: envelope.targetContractIdentity,
    allocationValidBefore: 1_800_000_500,
    allocationNonce: new Uint8Array(32).fill(21), initialStateNonce: new Uint8Array(32).fill(22) };
  const prepared = createRuntimeInstanceAllocation(adapterInput);
  const policyWitness = createRuntimeAllocationPolicyWitness(record.template, configuredBindings, prepared.stateOpening);
  function call(allocation = prepared.allocation, signer = 181n, authority = allocator,
    signature = signRuntimeInstanceAllocation(allocation, signer, 197n), witness = policyWitness) {
    return contract.circuits.allocateRuntimeInstance(context, allocation,
      signature, authority,
      governance.authority.pathFor(pureCircuits.governanceActivatorLeafCommitment(authority)), witness);
  }
  return { adapterInput, ...prepared, policyWitness, allocator, issuer, otherIssuer, slotGovernor, otherAllocator, governance, contract, call,
    context: () => context,
    view: () => ledger(context.currentQueryContext.state),
    apply: () => { context = call().context; },
    at: (time: number) => { context = createCircuitContext(dummyContractAddress(), "00".repeat(32),
      context.currentQueryContext.state, undefined, undefined, undefined, time); },
    terminate: (status: 2n | 3n) => {
      const state = ledger(context.currentQueryContext.state);
      const current = state.activeTemplates.lookup(finalized.result.registryKey);
      const authority = status === 2n ? governance.templateRetirer : governance.templateEmergencyRevoker;
      const secret = status === 2n ? governance.templateRetirerSecret : governance.templateEmergencyRevokerSecret;
      const command: TemplateLifecycleCommand = { commandVersion: 1n,
        registryKey: finalized.result.registryKey, recordCommitment: pureCircuits.activeTemplateRecordCommitment(current),
        namespaceHash: envelope.namespaceHash, governancePolicyHash: envelope.governancePolicyHash,
        authorityRootVersion: envelope.authorityRootVersion, authorityRootSequence: envelope.authorityRootSequence,
        expectedLifecycleStatus: 1n, nextLifecycleStatus: status, effectiveAt: 1_800_000_100n,
        effectiveSequence: 2n, reasonHash: new Uint8Array(32).fill(23), commandNonce: new Uint8Array(32).fill(24) };
      context = contract.circuits.terminateTemplate(context, command,
        signTemplateLifecycleCommand(command, secret, 199n), authority,
        governance.authority.pathFor(pureCircuits.governanceActivatorLeafCommitment(authority))).context;
    } };
}

function allocatedCredentialFixture(includeSecondaryIssuer = false, slotTemplate = template()) {
  const f = allocationFixture(includeSecondaryIssuer, slotTemplate);
  let context = f.call().context;
  const status = new CredentialStatusTree();
  const instance = f.adapterInput.instance;
  const source = { accountId: "private-bound-holder", instanceId: instance.instanceId,
    contextId: "access", kind: "human" as const, registeredAt: instance.createdAt,
    publicKeyPem: generateKeyPairSync("ed25519").publicKey.export({ type: "spki", format: "pem" }).toString(),
    revokedAt: null };
  const account = createRuntimeAccountCredential({ account: source, instance,
    runtimePublicKey: governanceActivatorPublicKey(223n), statusIndex: 7n, validBefore: instance.expiresAt - 1 });
  const accountHash = pureCircuits.runtimeAccountCredentialCommitment(account);
  const grant = { namespace: instance.namespace, templateId: instance.templateId,
    templateVersion: instance.templateVersion, templateHash: instance.templateHash,
    grantId: "private-bound-root", parentGrantId: null, instanceId: instance.instanceId,
    contextId: source.contextId, subjectAccountId: source.accountId, issuerRef: "issuer-one",
    scope: { actions: ["authorize-access"], resourceSelectors: ["instance-resource"], resources: ["private-resource"],
      purposes: ["access-check"], recipientKinds: ["specific-recipient"], recipients: ["private-recipient"],
      disclosurePolicyIds: ["minimum-eligible-claim"] },
    notBefore: instance.createdAt, expiresAt: instance.expiresAt - 2, delegationDepth: 0,
    maxDelegationDepth: 0, issuedAt: instance.createdAt, revokedAt: null };
  const capability = createRuntimeCapabilityCredential({ grant, instanceCommitment: f.allocation.instanceCommitment,
    subjectAccountCredential: account, statusIndex: 8n, namespaceIssuer: { principalId: grant.issuerRef, authority: f.issuer } });
  const capabilityHash = pureCircuits.runtimeCapabilityCredentialCommitment(capability.credential);
  let binding = createRuntimeCredentialInstanceBinding(f.allocation, f.issuers, f.issuer, instance.expiresAt - 2,
    { opening: f.stateOpening, sequence: 0n });
  let nonce = 60;
  const command = (kind: "account" | "capability", revoke = false,
    effectiveAt = instance.createdAt): RuntimeCredentialStatusCommand =>
    createRuntimeCredentialStatusCommand({ instanceBinding: binding, namespace: instance.namespace,
      governancePolicyHash: `0x${Buffer.from(f.allocation.governancePolicyHash).toString("hex")}`,
      authorityRootVersion: Number(f.allocation.authorityRootVersion),
      authorityRootSequence: Number(f.allocation.authorityRootSequence), credentialStatusRootSequence: status.sequence,
      kind, credentialCommitment: kind === "account" ? accountHash : capabilityHash,
      subjectAccountCredentialCommitment: accountHash,
      revocationAuthorityAccountCredentialCommitment: kind === "account" ? accountHash : new Uint8Array(32),
      statusIndex: kind === "account" ? 7n : 8n, expectedStatus: revoke ? "active" : "empty",
      nextStatus: revoke ? "revoked" : "active", effectiveAt,
      stagingExpiresAt: kind === "capability" && !revoke ? instance.createdAt + 500 : 0,
      commandNonce: `0x${(++nonce).toString(16).padStart(2, "0").repeat(32)}` });
  const entry = (kind: "account" | "capability") => ({ namespace: instance.namespace, kind,
    credentialCommitment: kind === "account" ? accountHash : capabilityHash,
    revocationAuthorityAccountCredentialCommitment: kind === "account" ? accountHash : new Uint8Array(32),
    statusIndex: kind === "account" ? 7n : 8n });
  const invokedCommands = new WeakMap<object, RuntimeCredentialStatusCommand>();
  function invoke(operation: bigint, cmd: RuntimeCredentialStatusCommand, options: {
    binding?: RuntimeCredentialInstanceBinding; authority?: GovernanceActivatorLeaf; secret?: bigint;
    account?: RuntimeAccountCredential; capability?: RuntimeCapabilityCredential;
    pathIndex?: bigint; context?: typeof context; plan?: CapabilityAttenuationPlan; stage?: RuntimeScopeStage;
    signature?: ReturnType<typeof signRuntimeCredentialStatusCommand>;
  } = {}) {
    const authority = options.authority ?? f.issuer;
    const cap = options.capability ?? capability.credential;
    const path = status.pathFor(options.pathIndex ?? cmd.statusIndex);
    const result = f.contract.circuits.updateRuntimeCredentialStatus(options.context ?? context, operation, cmd,
      options.signature ?? signRuntimeCredentialStatusCommand(cmd, options.secret ?? 191n), authority,
      f.governance.authority.pathFor(pureCircuits.governanceActivatorLeafCommitment(authority)),
      options.account ?? account, status.pathFor(7n), path, cap,
      signRuntimeCapabilityCredential(cap, options.secret ?? 191n), capability.credential, status.pathFor(8n),
      options.stage?.progress ?? options.plan?.currentProgress ?? createEmptyRuntimeScopeProgress(),
      options.stage?.element ?? { elementVersion: 1n, dimension: 1n, valueHash: new Uint8Array(32) },
      options.stage?.childPath ?? path, options.stage?.parentPath ?? path,
      createEmptyRuntimeSessionCredential(), options.binding ?? binding);
    invokedCommands.set(result, cmd);
    return result;
  }
  const apply = (result: ReturnType<typeof invoke>) => {
    context = result.context;
    const current = ledger(context.currentQueryContext.state).runtimeInstances.lookup(f.allocation.instanceCommitment);
    const cmd = invokedCommands.get(result);
    if (cmd && current.transitionSequence !== binding.stateSequence) {
      binding = advanceRuntimeCredentialInstanceBinding(binding, cmd, new Uint8Array(32).fill(++nonce));
    }
  };
  const issueAccount = () => { apply(invoke(1n, command("account"))); status.issue(entry("account")); };
  function certifyRoot() {
    const cmd = command("capability");
    const plan = new CapabilityAttenuationPlan(capability.scope);
    apply(invoke(2n, cmd, { plan }));
    while (!plan.complete) apply(invoke(3n, cmd, { plan, stage: plan.stageNext() }));
    apply(invoke(4n, cmd, { plan })); status.issue(entry("capability"));
  }
  return { ...f, account, accountHash, capability, get binding() { return binding; }, command, invoke, apply, issueAccount, certifyRoot, status,
    syncPrivateState: (state: RuntimeStateOpening) => {
      const current = ledger(context.currentQueryContext.state).runtimeInstances.lookup(f.allocation.instanceCommitment);
      assert.deepEqual(current.currentStateCommitment, pureCircuits.runtimeStateCommitment(state));
      binding = { ...binding, state: structuredClone(state), stateSequence: current.transitionSequence,
        nextStateNonce: new Uint8Array(32).fill(++nonce) };
    },
    currentContext: () => context,
    currentView: () => ledger(context.currentQueryContext.state),
    at: (time: number) => { context = createCircuitContext(dummyContractAddress(), "00".repeat(32),
      context.currentQueryContext.state, undefined, undefined, undefined, time); } };
}

describe("allocation-bound credential issuance (generated Compact, not node acceptance)", () => {
  it("issues an exact allocated account and root, preserving immutable allocation", () => {
    const f = allocatedCredentialFixture(); f.issueAccount(); f.certifyRoot();
    assert.equal(f.currentView().credentialStatusRoots.lookup(f.allocation.target.namespaceHash).rootSequence, 2n);
    assert.deepEqual(f.currentView().runtimeInstances.lookup(f.allocation.instanceCommitment).allocationCommitment,
      pureCircuits.runtimeInstanceAllocationCommitment(f.allocation));
    assert.equal(f.capability.credential.credentialVersion, 3n);
    const current = f.currentView().runtimeInstances.lookup(f.allocation.instanceCommitment);
    assert.equal(current.transitionSequence, 2n);
    assert.deepEqual(current.currentStateCommitment, pureCircuits.runtimeStateCommitment(f.binding.state));
    assert.deepEqual(f.binding.state.stateIdHash, Uint8Array.from(f.stateOpening.stateIdHash));
    assert.deepEqual(f.binding.state.slotAssignmentsRoot, f.stateOpening.slotAssignmentsRoot);
    assert.deepEqual(f.binding.state.slotBindingsRoot, f.stateOpening.slotBindingsRoot);
  });

  it("rejects absent, altered, cross-instance and cross-template allocations before issuance", () => {
    const f = allocatedCredentialFixture(); const cmd = f.command("account");
    assert.throws(() => f.invoke(1n, cmd, { context: f.context() }), /allocated exact instance/);
    for (const allocation of [
      { ...f.allocation, allocationNonce: new Uint8Array(32).fill(201) },
      { ...f.allocation, instanceCommitment: new Uint8Array(32).fill(202) },
      { ...f.allocation, target: { ...f.allocation.target, templateContentHash: new Uint8Array(32).fill(203) } },
    ]) assert.throws(() => f.invoke(1n, cmd, { binding: { ...f.binding, allocation } }), /immutable private allocation/);
    assert.equal(f.currentView().usedCredentialStatusCommandNonces.size(), 0n);
  });

  it("rejects legacy commands and altered allocation, state, sequence, or next-state hashes without mutation", () => {
    const f = allocatedCredentialFixture(), cmd = f.command("account");
    for (const changed of [
      { ...cmd, commandVersion: 3n },
      { ...cmd, allocationCommitment: new Uint8Array(32).fill(204) },
      { ...cmd, instanceStateCommitment: new Uint8Array(32).fill(205) },
      { ...cmd, instanceStateSequence: 1n },
      { ...cmd, nextInstanceStateCommitment: new Uint8Array(32).fill(206) },
    ]) assert.throws(() => f.invoke(1n, changed), /Unsupported|immutable private allocation|stale against|exact next private/);
    const current = f.currentView().runtimeInstances.lookup(f.allocation.instanceCommitment);
    assert.equal(current.transitionSequence, 0n);
    assert.deepEqual(current.currentStateCommitment, f.allocation.initialStateCommitment);
    assert.equal(f.currentView().usedCredentialStatusCommandNonces.size(), 0n);
    assert.equal(f.currentView().credentialStatusRoots.lookup(f.allocation.target.namespaceHash).rootSequence, 0n);
  });

  it("rejects substituted private state openings and zero, reused, or unsigned next nonces", () => {
    const f = allocatedCredentialFixture(), cmd = f.command("account");
    assert.throws(() => f.invoke(1n, cmd, { binding: { ...f.binding,
      state: { ...f.binding.state, stateIdHash: new Uint8Array(32).fill(207) } } }), /stale against/);
    for (const nextStateNonce of [new Uint8Array(32), f.binding.state.nonce]) {
      assert.throws(() => f.invoke(1n, cmd, { binding: { ...f.binding, nextStateNonce } }), /fresh private state nonce/);
    }
    assert.throws(() => f.invoke(1n, cmd, { binding: { ...f.binding,
      nextStateNonce: new Uint8Array(32).fill(208) } }), /exact next private/);
    assert.equal(f.currentView().usedCredentialStatusCommandNonces.size(), 0n);
  });

  it("cryptographically binds a valid next-state change to the issuer's original signature", () => {
    const f = allocatedCredentialFixture(), cmd = f.command("account");
    const binding = { ...f.binding, nextStateNonce: new Uint8Array(32).fill(209) };
    const altered = { ...cmd, nextInstanceStateCommitment: pureCircuits.runtimeStateCommitment(
      pureCircuits.runtimeCredentialNextState(binding.state, cmd.effectiveAt, binding.nextStateNonce)) };
    assert.throws(() => f.invoke(1n, altered, { binding,
      signature: signRuntimeCredentialStatusCommand(cmd, 191n) }), /Invalid governance activation signature/);
    assert.equal(f.currentView().usedCredentialStatusCommandNonces.size(), 0n);
  });

  it("keeps staging non-authorizing and rejects finalization after a competing credential mutation", () => {
    const f = allocatedCredentialFixture(), cmd = f.command("capability");
    const plan = new CapabilityAttenuationPlan(f.capability.scope);
    f.apply(f.invoke(2n, cmd, { plan }));
    while (!plan.complete) f.apply(f.invoke(3n, cmd, { plan, stage: plan.stageNext() }));
    assert.equal(f.currentView().runtimeInstances.lookup(f.allocation.instanceCommitment).transitionSequence, 0n);
    assert.equal(f.currentView().usedCredentialStatusCommandNonces.size(), 0n);
    f.issueAccount();
    assert.throws(() => f.invoke(4n, cmd, { plan }), /stale against/);
    assert.equal(f.currentView().runtimeInstances.lookup(f.allocation.instanceCommitment).transitionSequence, 1n);
    assert.equal(f.currentView().credentialStatusRoots.lookup(f.allocation.target.namespaceHash).rootSequence, 1n);
    assert.equal(f.currentView().usedCredentialStatusCommandNonces.member(cmd.commandNonce), false);
    assert.equal(f.currentView().capabilityAttenuationSessions.member(cmd.commandNonce), true);
    f.at(Number(cmd.stagingExpiresAt));
    f.apply(f.invoke(4n, cmd, { plan }));
    assert.equal(f.currentView().capabilityAttenuationSessions.member(cmd.commandNonce), false);
    assert.equal(f.currentView().runtimeInstances.lookup(f.allocation.instanceCommitment).transitionSequence, 1n);
    assert.equal(f.currentView().usedCredentialStatusCommandNonces.member(cmd.commandNonce), false);
  });

  it("rejects a concurrent direct command without consuming its nonce or rewriting the winning state", () => {
    const f = allocatedCredentialFixture(), losing = f.command("account");
    f.issueAccount();
    const winner = structuredClone(f.currentView().runtimeInstances.lookup(f.allocation.instanceCommitment));
    assert.throws(() => f.invoke(1n, losing), /stale against/);
    assert.deepEqual(f.currentView().runtimeInstances.lookup(f.allocation.instanceCommitment), winner);
    assert.equal(f.currentView().usedCredentialStatusCommandNonces.member(losing.commandNonce), false);
  });

  it("rejects a current namespace issuer not on this instance's exact issuer list", () => {
    const f = allocatedCredentialFixture();
    assert.throws(() => f.invoke(1n, f.command("account"), { authority: f.otherIssuer, secret: 193n }), /not explicitly authorized/);
    assert.equal(f.currentView().credentialStatusRoots.lookup(f.allocation.target.namespaceHash).rootSequence, 0n);
  });

  it("rejects another empty slot even when it reconstructs the exact current root", () => {
    const f = allocatedCredentialFixture();
    assert.deepEqual(pureCircuits.runtimeCredentialStatusPathRoot(f.status.pathFor(7n)),
      pureCircuits.runtimeCredentialStatusPathRoot(f.status.pathFor(99n)));
    assert.throws(() => f.invoke(1n, f.command("account"), { pathIndex: 99n }), /path position/);
    assert.equal(f.currentView().usedCredentialStatusCommandNonces.size(), 0n);
  });

  it("binds every direction bit to its physical status index", () => {
    const tree = new CredentialStatusTree();
    for (const index of [0n, 1n, 7n, 99n, 1_048_575n]) {
      assert.equal(pureCircuits.runtimeCredentialStatusPathIndex(tree.pathFor(index)), index);
    }
  });

  it("rejects expired and overlong proof windows, credential lifetime extension and pre-allocation accounts", () => {
    const f = allocatedCredentialFixture(); const cmd = f.command("account");
    assert.throws(() => f.invoke(1n, cmd, { binding: { ...f.binding, validBefore: f.allocation.expiresAt + 1n } }), /allocated instance lifetime/);
    const account = { ...f.account, issuedAt: f.allocation.createdAt - 1n };
    const hash = pureCircuits.runtimeAccountCredentialCommitment(account);
    assert.throws(() => f.invoke(1n, { ...cmd, credentialCommitment: hash,
      revocationAuthorityAccountCredentialCommitment: hash }, { account }), /self-revocation authority/);
    const extended = { ...f.account, validBefore: f.allocation.expiresAt + 1n };
    const extendedHash = pureCircuits.runtimeAccountCredentialCommitment(extended);
    assert.throws(() => f.invoke(1n, { ...cmd, credentialCommitment: extendedHash,
      revocationAuthorityAccountCredentialCommitment: extendedHash }, { account: extended }), /self-revocation authority/);
    f.at(Number(f.binding.validBefore));
    assert.throws(() => f.invoke(1n, cmd), /submission window has expired/);
  });

  it("only the original issuer may revoke, even when a second issuer is allocated and signs correctly", () => {
    const f = allocatedCredentialFixture(true); f.issueAccount(); f.certifyRoot();
    const cmd = f.command("capability", true);
    const binding = createRuntimeCredentialInstanceBinding(f.allocation, f.issuers, f.otherIssuer, Number(f.binding.validBefore),
      { opening: f.binding.state, sequence: f.binding.stateSequence, nextNonce: f.binding.nextStateNonce });
    assert.throws(() => f.invoke(1n, cmd, { authority: f.otherIssuer, secret: 193n, binding }), /exact original namespace issuer/);
    assert.equal(f.status.sequence, 2n);
    f.apply(f.invoke(1n, cmd));
    assert.equal(f.currentView().credentialStatusRoots.lookup(f.allocation.target.namespaceHash).rootSequence, 3n);
  });

  it("rejects legacy capability version and issuer substitution at certification begin and finalization", () => {
    const f = allocatedCredentialFixture(true); f.issueAccount();
    const cmd = f.command("capability");
    assert.throws(() => f.invoke(2n, cmd, { capability: { ...f.capability.credential, credentialVersion: 2n } }), /exact original namespace issuer/);
    const plan = new CapabilityAttenuationPlan(f.capability.scope);
    f.apply(f.invoke(2n, cmd, { plan }));
    while (!plan.complete) f.apply(f.invoke(3n, cmd, { plan, stage: plan.stageNext() }));
    const binding = createRuntimeCredentialInstanceBinding(f.allocation, f.issuers, f.otherIssuer, Number(f.binding.validBefore),
      { opening: f.binding.state, sequence: f.binding.stateSequence, nextNonce: f.binding.nextStateNonce });
    assert.throws(() => f.invoke(4n, cmd, { plan, binding, authority: f.otherIssuer, secret: 193n }), /exact original namespace issuer/);
    assert.equal(f.currentView().credentialStatusRoots.lookup(f.allocation.target.namespaceHash).rootSequence, 1n);
    f.apply(f.invoke(4n, cmd, { plan }));
  });
});

function slotManagementFixture() {
  const original = template();
  const slotTemplate = parseScenarioTemplate({ ...original, participantSlots: [
    { ...original.participantSlots[0]!, assignableBy: ["@instance-creator", "@namespace-governance", "manager"] },
    original.participantSlots[1]!,
    { id: "manager", description: "A purpose-bound assigning slot.", assignableBy: ["@instance-creator", "manager"] },
  ], contexts: [{ ...original.contexts[0]!, allowedSlotIds: ["subject", "verifier", "manager"] }] });
  const f = allocatedCredentialFixture(false, slotTemplate); f.issueAccount();
  const assignments = new RuntimePrivateMap(), bindings = new RuntimePrivateMap();
  const records = new Map<string, RuntimeSlotRecord>();
  let state: RuntimeStateOpening = structuredClone(f.binding.state);
  let nonce = 80;
  const hex = (value: Uint8Array) => Buffer.from(value).toString("hex");
  const zero = () => new Uint8Array(32);
  const projection = createRuntimeTemplateActionPolicy(slotTemplate, "authorize-access");
  const authorityPath = (leaf: GovernanceActivatorLeaf) => f.governance.authority.pathFor(pureCircuits.governanceActivatorLeafCommitment(leaf));
  function request(options: { kind?: 1n | 2n; slot?: string; parent?: RuntimeSlotRecord;
    id?: Uint8Array; authority?: GovernanceActivatorLeaf; authorityKind?: bigint; secret?: bigint; effectiveAt?: bigint } = {}) {
    const slot = options.slot ?? "subject", authorityKind = options.authorityKind ?? (options.parent ? 3n : 1n);
    const authority = options.authority ?? (authorityKind === 2n ? f.slotGovernor : f.allocator);
    const secret = options.secret ?? (authorityKind === 3n ? 223n : authorityKind === 2n ? 211n : 181n);
    const kind = options.kind ?? 1n, id = options.id ?? new Uint8Array(32).fill(++nonce);
    const target = records.get(hex(id));
    const rule = projection.slotRules.witnessFor("access", slot,
      authorityKind === 1n ? "@instance-creator" : authorityKind === 2n ? "@namespace-governance" : "manager");
    const command: RuntimeSlotCommand = {
      commandVersion: 1n, kind, target: f.allocation.target, instanceCommitment: f.allocation.instanceCommitment,
      allocationCommitment: pureCircuits.runtimeInstanceAllocationCommitment(f.allocation),
      stateCommitment: pureCircuits.runtimeStateCommitment(state), stateSequence: f.currentView().runtimeInstances.lookup(f.allocation.instanceCommitment).transitionSequence,
      authorityRootVersion: f.allocation.authorityRootVersion,
      authorityRootSequence: f.allocation.authorityRootSequence, credentialStatusRootSequence: f.status.sequence,
      contextHash: f.account.contextHash, slotIdHash: rule.rule.slotIdHash, subjectAccountCredentialCommitment: f.accountHash,
      subjectAccountIdHash: f.account.accountIdHash, assignmentIdHash: id,
      parentAssignmentIdHash: options.parent?.assignment.assignmentIdHash ?? zero(),
      assignerAccountCredentialCommitment: authorityKind === 3n ? f.accountHash : zero(),
      authorityKind, namespaceAuthorityCommitment: authorityKind === 3n ? zero() : pureCircuits.governanceActivatorLeafCommitment(authority),
      m5AssignmentCommitment: target?.assignment.m5AssignmentCommitment ?? new Uint8Array(32).fill(210),
      effectiveAt: options.effectiveAt ?? f.allocation.createdAt, validBefore: f.allocation.createdAt + 400n,
      commandNonce: new Uint8Array(32).fill(++nonce),
    };
    const record: RuntimeSlotRecord = { assignment: pureCircuits.runtimeSlotAssignmentFromCommand(command), status: 1n, revokedAt: 0n };
    const bindingKey = pureCircuits.runtimeSlotBindingKey(command), bindingOpening = bindings.witnessFor(bindingKey);
    const bindingExists = hex(bindingOpening.node.key) === hex(bindingKey);
    const previous = bindingExists ? records.get(hex(bindingOpening.node.value))! : undefined;
    const targetRecord = kind === 2n ? target! : previous ?? record;
    const assignmentPlan = kind === 1n ? assignments.planInsert(id, pureCircuits.runtimeSlotRecordCommitment(record)) : undefined;
    const assignmentOpening = assignmentPlan?.predecessor ?? assignments.witnessFor(id);
    const bindingPlan = kind === 1n && !bindingExists ? bindings.planInsert(bindingKey, id) : undefined;
    const previousBindingOpening = previous ? assignments.witnessFor(previous.assignment.assignmentIdHash) : assignmentOpening;
    let progress: RuntimeSlotProgress = pureCircuits.runtimeSlotInitialProgress(command,
      kind === 1n && previous ? previous.assignment.assignmentIdHash : zero(),
      kind === 1n && previous ? previous.assignment.subjectAccountCredentialCommitment : zero());
    const openingFor = (rec: RuntimeSlotRecord): RuntimeSlotAncestryStep => ({
      record: rec, opening: assignments.witnessFor(rec.assignment.assignmentIdHash),
      account: f.account, accountStatus: 1n, accountStatusPath: f.status.pathFor(f.account.statusIndex),
    });
    const step = options.parent ? openingFor(options.parent) : {
      record, opening: assignmentOpening, account: f.account,
      accountStatus: 1n, accountStatusPath: f.status.pathFor(f.account.statusIndex),
    };
    const policyOpening = { policy: projection.policy, binding: f.policyWitness.binding,
      bindingPath: f.policyWitness.bindingPath, rule: rule.rule, rulePath: rule.path };
    const nextNonce = new Uint8Array(32).fill(++nonce);
    function call(operation: bigint, overrides: { command?: RuntimeSlotCommand; progress?: RuntimeSlotProgress;
      step?: RuntimeSlotAncestryStep; secret?: bigint; state?: RuntimeStateOpening; nextNonce?: Uint8Array } = {}) {
      const cmd = overrides.command ?? command;
      return f.contract.circuits.manageRuntimeParticipantSlots(f.currentContext(), operation, cmd,
        signRuntimeSlotCommand(cmd, overrides.secret ?? secret), f.allocation, overrides.state ?? state,
        overrides.nextNonce ?? nextNonce, policyOpening, authority, authorityPath(authority), f.account,
        f.status.pathFor(f.account.statusIndex), f.account, f.status.pathFor(f.account.statusIndex),
        overrides.progress ?? progress, overrides.step ?? step, targetRecord, assignmentOpening,
        assignmentPlan?.appendPath ?? assignmentOpening.path, bindingOpening,
        bindingPlan?.appendPath ?? bindingOpening.path, previousBindingOpening);
    }
    function advance(overrides: Partial<RuntimeSlotAncestryStep> = {}) {
      const nextRecord = records.get(hex(progress.nextAssignmentIdHash))!;
      const nextStep = { ...openingFor(nextRecord), ...overrides };
      const next = pureCircuits.runtimeSlotAdvanceProgress(progress, nextStep, state, command, f.status.root);
      f.apply(call(2n, { step: nextStep })); progress = next;
    }
    function finalize() {
      const result = call(3n); f.apply(result);
      if (kind === 1n) {
        assignments.insert(id, pureCircuits.runtimeSlotRecordCommitment(record)); records.set(hex(id), record);
        if (bindingExists) bindings.replace(bindingKey, bindingOpening.node.value, id); else bindings.insert(bindingKey, id);
      } else {
        const revoked = { ...targetRecord, status: 2n, revokedAt: command.effectiveAt };
        assignments.replace(id, pureCircuits.runtimeSlotRecordCommitment(targetRecord), pureCircuits.runtimeSlotRecordCommitment(revoked));
        records.set(hex(id), revoked);
      }
      state = { ...state, slotAssignmentsRoot: assignments.root, slotAssignmentCount: assignments.count,
        lastMutationAt: command.effectiveAt,
        slotBindingsRoot: bindings.root, slotBindingCount: bindings.count, nonce: nextNonce };
      f.syncPrivateState(state);
      assert.deepEqual(f.currentView().runtimeInstances.lookup(f.allocation.instanceCommitment).currentStateCommitment,
        pureCircuits.runtimeStateCommitment(state));
      return records.get(hex(id))!;
    }
    return { command, record, call, advance, finalize, begin: () => f.apply(call(1n)), progress: () => progress };
  }
  return { f, assignments, bindings, records, request, state: () => state,
    syncCredentialState: () => { state = structuredClone(f.binding.state); } };
}

describe("staged private participant slots (generated Compact, not node acceptance)", () => {
  it("begins without granting a role, then atomically issues/revokes while retaining exact history", () => {
    const s = slotManagementFixture(), issue = s.request();
    issue.begin();
    assert.equal(s.f.currentView().runtimeSlotSessions.size(), 1n);
    assert.equal(s.f.currentView().runtimeInstances.lookup(s.f.allocation.instanceCommitment).transitionSequence, 1n);
    const original = issue.finalize();
    assert.equal(s.f.currentView().runtimeSlotSessions.size(), 0n);
    assert.equal(s.f.currentView().usedRuntimeSlotCommandNonces.size(), 1n);
    assert.equal(s.assignments.count, 2n); assert.equal(s.bindings.count, 2n);
    const revoke = s.request({ kind: 2n, id: original.assignment.assignmentIdHash }); revoke.begin(); const revoked = revoke.finalize();
    assert.deepEqual(revoked.assignment, original.assignment); assert.equal(revoked.status, 2n);
    assert.equal(s.f.currentView().runtimeInstances.lookup(s.f.allocation.instanceCommitment).transitionSequence, 3n);
    assert.equal(s.assignments.count, 2n); assert.equal(s.bindings.count, 2n);
    assert.throws(() => issue.call(3n), /nonce was already consumed/);
    assert.throws(() => s.request({ id: original.assignment.assignmentIdHash }), /already exists/);
  });

  it("keeps slot governance separately scoped rather than inheriting activation or issuer powers", () => {
    const s = slotManagementFixture(), approved = s.request({ authorityKind: 2n });
    approved.begin(); approved.finalize();
    const other = slotManagementFixture();
    for (const [authority, secret] of [[other.f.allocator, 181n], [other.f.issuer, 191n], [other.f.governance.moduleActivator, other.f.governance.moduleActivatorSecret]] as const) {
      assert.throws(() => other.request({ authorityKind: 2n, authority, secret }).call(1n), /separately scoped/);
    }
    assert.equal(other.f.currentView().runtimeSlotSessions.size(), 0n);
    assert.throws(() => other.request({ authority: other.f.otherAllocator, secret: 199n }).call(1n), /original instance creator/);
  });

  it("verifies exact occupied-slot ancestry before permitting finalization", () => {
    const s = slotManagementFixture(), root = s.request({ slot: "manager" }); root.begin(); const manager = root.finalize();
    const child = s.request({ parent: manager }); child.begin();
    assert.throws(() => child.call(3n), /verification is incomplete/);
    assert.throws(() => child.call(2n, { progress: { ...child.progress(), nextAssignmentIdHash: new Uint8Array(32).fill(99) } }), /exact staged opening/);
    child.advance(); assert.equal(child.progress().phase, 3n); child.finalize();
    assert.equal(s.f.currentView().runtimeInstances.lookup(s.f.allocation.instanceCommitment).transitionSequence, 3n);
    assert.throws(() => child.call(2n), /nonce was already consumed/);
  });

  it("rejects duplicate active bindings, but permits a new exact ID after revocation without reviving old descendants", () => {
    const s = slotManagementFixture(), first = s.request(); first.begin(); const record = first.finalize();
    const duplicate = s.request(); duplicate.begin(); duplicate.advance();
    assert.throws(() => duplicate.call(3n), /already occupies/);
    const revoke = s.request({ kind: 2n, id: record.assignment.assignmentIdHash }); revoke.begin(); revoke.finalize();
    assert.throws(() => duplicate.call(3n), /stale against/);
    const replacement = s.request(); replacement.begin(); replacement.advance(); const next = replacement.finalize();
    assert.notDeepEqual(next.assignment.assignmentIdHash, record.assignment.assignmentIdHash);
    assert.equal(s.assignments.count, 3n); assert.equal(s.bindings.count, 2n);
    assert.equal(s.records.get(Buffer.from(record.assignment.assignmentIdHash).toString("hex"))!.status, 2n);
  });

  it("invalidates staged descendant authority after ancestor revocation changes private state", () => {
    const s = slotManagementFixture(), root = s.request({ slot: "manager" }); root.begin(); const manager = root.finalize();
    const child = s.request({ parent: manager }); child.begin(); child.advance();
    const revoke = s.request({ kind: 2n, slot: "manager", id: manager.assignment.assignmentIdHash }); revoke.begin(); revoke.finalize();
    assert.throws(() => child.call(3n), /stale against/);
    const fresh = s.request({ parent: s.records.get(Buffer.from(manager.assignment.assignmentIdHash).toString("hex"))! }); fresh.begin();
    assert.throws(() => fresh.advance(), /ancestor or holder has been revoked/);
  });

  it("rejects wrong signatures, altered exact hashes, stale roots, wrong state and forged completion", () => {
    const s = slotManagementFixture(), request = s.request(), cmd = request.command;
    assert.throws(() => request.call(1n, { secret: 211n }), /Invalid governance activation signature/);
    for (const changed of [
      { ...cmd, authorityRootSequence: 0n }, { ...cmd, credentialStatusRootSequence: 0n },
      { ...cmd, stateSequence: 0n }, { ...cmd, stateCommitment: new Uint8Array(32).fill(2) },
      { ...cmd, allocationCommitment: new Uint8Array(32).fill(9) },
      { ...cmd, target: { ...cmd.target, templateContentHash: new Uint8Array(32).fill(3) } },
    ]) assert.throws(() => request.call(1n, { command: changed }), /stale|substitutes/);
    assert.throws(() => request.call(1n, { state: { ...s.state(), slotAssignmentCount: 2n } }), /stale against/);
    request.begin();
    assert.throws(() => request.call(3n, { progress: { ...request.progress(), steps: 99n } }), /verification is incomplete/);
    assert.throws(() => request.call(3n, { nextNonce: s.state().nonce }), /fresh private state nonce/);
    assert.equal(s.f.currentView().runtimeInstances.lookup(s.f.allocation.instanceCommitment).transitionSequence, 1n);
  });

  it("cleans an expired verification session without consuming a nonce, granting a slot or advancing state", () => {
    const s = slotManagementFixture(), request = s.request(); request.begin();
    s.f.at(Number(request.command.validBefore));
    s.f.apply(request.call(2n));
    assert.equal(s.f.currentView().runtimeSlotSessions.size(), 0n);
    assert.equal(s.f.currentView().usedRuntimeSlotCommandNonces.size(), 0n);
    assert.equal(s.f.currentView().runtimeInstances.lookup(s.f.allocation.instanceCommitment).transitionSequence, 1n);
  });

  it("cannot backdate a slot mutation before the committed instance watermark", () => {
    const s = slotManagementFixture(); s.f.at(Number(s.f.allocation.createdAt + 100n));
    const issue = s.request({ slot: "manager", effectiveAt: s.f.allocation.createdAt + 30n }); issue.begin(); issue.finalize();
    assert.equal(s.state().lastMutationAt, s.f.allocation.createdAt + 30n);
    assert.throws(() => s.request().call(1n), /stale against/);
    assert.equal(s.f.currentView().runtimeInstances.lookup(s.f.allocation.instanceCommitment).transitionSequence, 2n);
  });

  it("cannot finalize two different slot mutations from one state commitment and sequence", () => {
    const s = slotManagementFixture(), first = s.request(), competing = s.request({ slot: "verifier", authorityKind: 2n });
    first.begin(); competing.begin(); first.finalize();
    assert.throws(() => competing.call(3n), /stale against/);
    assert.equal(s.f.currentView().usedRuntimeSlotCommandNonces.size(), 1n);
    assert.equal(s.f.currentView().runtimeInstances.lookup(s.f.allocation.instanceCommitment).transitionSequence, 2n);
  });

  it("invalidates staged authority after current account revocation advances the status root", () => {
    const s = slotManagementFixture(), root = s.request({ slot: "manager" }); root.begin(); const manager = root.finalize();
    const child = s.request({ parent: manager }); child.begin(); child.advance();
    s.f.apply(s.f.invoke(1n, s.f.command("account", true), { secret: 223n }));
    s.syncCredentialState();
    s.f.status.revoke({ namespace: s.f.adapterInput.instance.namespace, kind: "account", credentialCommitment: s.f.accountHash,
      revocationAuthorityAccountCredentialCommitment: s.f.accountHash, statusIndex: s.f.account.statusIndex });
    assert.throws(() => child.call(3n), /stale against the exact allocation\/private instance state/);
    assert.throws(() => s.request({ parent: manager }).call(1n), /current credential-status root/);
  });

  it("rejects credential backdating after a later slot mutation, without consuming either command nonce", () => {
    const s = slotManagementFixture(); s.f.at(Number(s.f.allocation.createdAt + 100n));
    const slot = s.request({ slot: "manager", effectiveAt: s.f.allocation.createdAt + 30n });
    slot.begin(); slot.finalize();
    const cmd = s.f.command("account", true, Number(s.f.allocation.createdAt + 30n));
    const effectiveAt = s.f.allocation.createdAt + 29n;
    const forged = { ...cmd, effectiveAt, nextInstanceStateCommitment: pureCircuits.runtimeStateCommitment(
      pureCircuits.runtimeCredentialNextState(s.f.binding.state, effectiveAt, s.f.binding.nextStateNonce)) };
    assert.throws(() => s.f.invoke(1n, forged, { secret: 223n }), /cannot backdate/);
    assert.equal(s.f.currentView().usedCredentialStatusCommandNonces.member(cmd.commandNonce), false);
    assert.equal(s.f.currentView().usedRuntimeSlotCommandNonces.size(), 1n);
    assert.equal(s.f.currentView().runtimeInstances.lookup(s.f.allocation.instanceCommitment).transitionSequence, 2n);
    assert.equal(s.f.binding.state.lastMutationAt, s.f.allocation.createdAt + 30n);
  });

  it("rejects slot backdating after a credential revocation advances the same private watermark", () => {
    const s = slotManagementFixture(); s.f.at(Number(s.f.allocation.createdAt + 100n));
    const cmd = s.f.command("account", true, Number(s.f.allocation.createdAt + 30n));
    s.f.apply(s.f.invoke(1n, cmd, { secret: 223n }));
    s.f.status.revoke({ namespace: s.f.adapterInput.instance.namespace, kind: "account", credentialCommitment: s.f.accountHash,
      revocationAuthorityAccountCredentialCommitment: s.f.accountHash, statusIndex: s.f.account.statusIndex });
    s.syncCredentialState();
    assert.throws(() => s.request({ effectiveAt: s.f.allocation.createdAt + 29n }).call(1n), /stale against/);
    assert.equal(s.f.currentView().usedRuntimeSlotCommandNonces.size(), 0n);
    assert.equal(s.f.currentView().runtimeInstances.lookup(s.f.allocation.instanceCommitment).transitionSequence, 2n);
  });

  it("rejects finalizing a fully staged capability against an intervening slot mutation", () => {
    const s = slotManagementFixture(), cmd = s.f.command("capability");
    const plan = new CapabilityAttenuationPlan(s.f.capability.scope);
    s.f.apply(s.f.invoke(2n, cmd, { plan }));
    while (!plan.complete) s.f.apply(s.f.invoke(3n, cmd, { plan, stage: plan.stageNext() }));
    const slot = s.request({ slot: "manager" }); slot.begin(); slot.finalize();
    assert.throws(() => s.f.invoke(4n, cmd, { plan }), /stale against/);
    assert.equal(s.f.currentView().usedCredentialStatusCommandNonces.member(cmd.commandNonce), false);
    assert.equal(s.f.currentView().credentialStatusRoots.lookup(s.f.allocation.target.namespaceHash).rootSequence, 1n);
    assert.equal(s.f.currentView().runtimeInstances.lookup(s.f.allocation.instanceCommitment).transitionSequence, 2n);
  });

  it("keeps duplicate-binding identity stable when only the runtime credential commitment changes", () => {
    const s = slotManagementFixture(), command = s.request().command;
    const changed = { ...command, subjectAccountCredentialCommitment: new Uint8Array(32).fill(254) };
    assert.deepEqual(pureCircuits.runtimeSlotBindingKey(command), pureCircuits.runtimeSlotBindingKey(changed));
    assert.notDeepEqual(pureCircuits.runtimeSlotBindingKey(command), pureCircuits.runtimeSlotBindingKey({ ...changed,
      subjectAccountIdHash: new Uint8Array(32).fill(253) }));
  });
});

describe("private runtime instance allocation (generated Compact, not live acceptance)", () => {
  it("binds the original M4/M5 allocation and initializes only public commitments", () => {
    const f = allocationFixture();
    f.apply();
    const record = f.view().runtimeInstances.lookup(f.allocation.instanceCommitment);
    assert.deepEqual(f.allocation.instanceCommitment, hashM5ScenarioInstance(f.adapterInput.instance));
    assert.deepEqual(record.allocationCommitment, pureCircuits.runtimeInstanceAllocationCommitment(f.allocation));
    assert.deepEqual(record.currentStateCommitment, pureCircuits.runtimeStateCommitment(f.stateOpening));
    assert.equal(record.transitionSequence, 0n);
    assert.equal(record.lifecycleStatus, 1n);
    assert.deepEqual(Object.keys(record).sort(), ["allocationCommitment", "currentStateCommitment", "lifecycleStatus", "transitionSequence"]);
    assert.equal(f.view().usedAllocationRequestNullifiers.size(), 1n);
    assert.equal(f.view().usedInstanceIdentityNullifiers.size(), 1n);
  });

  it("rejects an allocator-signed arbitrary initial state and altered authenticated policy", () => {
    const f = allocationFixture(), witness = f.policyWitness;
    const call = (allocation = f.allocation, policyWitness = witness) => f.call(allocation, 181n, f.allocator,
      signRuntimeInstanceAllocation(allocation, 181n, 197n), policyWitness);
    assert.throws(() => call({ ...f.allocation, initialStateCommitment: new Uint8Array(32).fill(99) }), /exact initial state/);
    const wrongState = { ...witness.initialState, stateIdHash: new Uint8Array(32).fill(98) };
    assert.throws(() => call({ ...f.allocation, initialStateCommitment: pureCircuits.runtimeStateCommitment(wrongState) },
      { ...witness, initialState: wrongState }), /exact initial state/);
    assert.throws(() => call(f.allocation, { ...witness,
      policy: { ...witness.policy, maxCapabilityDuration: witness.policy.maxCapabilityDuration + 1n } }), /configuration hash/);
    assert.throws(() => call(f.allocation, { ...witness, bindingPath: { ...witness.bindingPath, leaf: new Uint8Array(32) } }), /absent/);
    assert.throws(() => call(f.allocation, { ...witness, initialState: { ...witness.initialState,
      instanceCommitment: new Uint8Array(32).fill(97) } }), /exact initial state/);
    assert.throws(() => call(f.allocation, { ...witness, initialState: { ...witness.initialState, nonce: new Uint8Array(32) } }), /exact initial state/);
    assert.equal(f.view().runtimeInstances.size(), 0n);
    assert.equal(f.view().usedAllocationRequestNullifiers.size(), 0n);
  });

  it("rejects replay, reusing a request for another instance, and reusing an instance with a different snapshot", () => {
    const f = allocationFixture(); f.apply();
    assert.throws(() => f.call(), /already consumed/);
    assert.throws(() => f.call({ ...f.allocation, instanceCommitment: new Uint8Array(32).fill(30),
      instanceIdHash: new Uint8Array(32).fill(31) }), /already consumed/);
    assert.throws(() => f.call({ ...f.allocation, instanceCommitment: new Uint8Array(32).fill(32),
      allocationRequestIdHash: new Uint8Array(32).fill(33) }), /already allocated/);
    assert.equal(f.view().runtimeInstances.size(), 1n);
  });

  it("rejects ineligible signatures and governance/issuer privilege collapse", () => {
    const f = allocationFixture();
    assert.throws(() => f.call(f.allocation, 29n), /Invalid governance activation signature/);
    for (const [authority, signer] of [
      [f.issuer, 191n],
      [f.governance.moduleActivator, f.governance.moduleActivatorSecret],
    ] as const) {
      const allocation = { ...f.allocation,
        allocatorAuthorityCommitment: pureCircuits.governanceActivatorLeafCommitment(authority) };
      assert.throws(() => f.call(allocation, signer, authority), /exact namespace allocator/);
    }
    assert.equal(f.view().runtimeInstances.size(), 0n);
  });

  it("rejects altered signed fields, stale roots, exact-hash substitution, and another deployment", () => {
    const f = allocationFixture();
    const signature = signRuntimeInstanceAllocation(f.allocation, 181n, 197n);
    // Changes to all private signed bindings are rejected even when their local shapes are valid.
    for (const field of ["instanceCommitment", "instanceIdHash", "allocationRequestIdHash",
      "m4AuthorizationCommitment", "initialStateCommitment", "allocationNonce"] as const) {
      assert.throws(() => f.call({ ...f.allocation, [field]: new Uint8Array(32).fill(34) }, 181n, f.allocator, signature),
      /Invalid governance activation signature/);
    }
    for (const altered of [
      { ...f.allocation, capabilityIssuersRoot: { field: f.allocation.capabilityIssuersRoot.field + 1n } },
      { ...f.allocation, capabilityIssuerCount: f.allocation.capabilityIssuerCount + 1n },
      { ...f.allocation, authorizedAt: f.allocation.authorizedAt + 1n },
      { ...f.allocation, createdAt: f.allocation.createdAt - 1n },
      { ...f.allocation, expiresAt: f.allocation.expiresAt + 1n },
      { ...f.allocation, allocationValidBefore: f.allocation.allocationValidBefore - 1n },
    ]) assert.throws(() => f.call(altered, 181n, f.allocator, signature), /Invalid governance activation signature/);
    assert.throws(() => f.call({ ...f.allocation, authorityRootSequence: 6n }), /stale or mismatched/);
    assert.throws(() => f.call({ ...f.allocation, target: { ...f.allocation.target,
      templateContentHash: new Uint8Array(32).fill(35) } }), /not registered/);
    assert.throws(() => f.call({ ...f.allocation, targetContractIdentity: new Uint8Array(32).fill(36) }), /another network or deployment/);
    assert.equal(f.view().runtimeInstances.size(), 0n);
  });

  it("rejects expired/future submissions and malformed private allocation bounds", () => {
    const f = allocationFixture();
    for (const allocation of [
      { ...f.allocation, capabilityIssuerCount: 0n },
      { ...f.allocation, allocationNonce: new Uint8Array(32) },
      { ...f.allocation, authorizedAt: f.allocation.createdAt + 1n },
      { ...f.allocation, allocationValidBefore: f.allocation.expiresAt + 1n },
    ]) assert.throws(() => f.call(allocation), /private bindings|lifetime|window/);
    f.at(1_800_000_099); assert.throws(() => f.call(), /not yet effective/);
    f.at(1_800_000_500); assert.throws(() => f.call(), /window expired/);
  });

  for (const status of [2n, 3n] as const) {
    it(`blocks new allocation after template lifecycle ${status} while preserving existing history`, () => {
      const f = allocationFixture(); f.apply();
      const before = f.view().runtimeInstances.lookup(f.allocation.instanceCommitment);
      f.terminate(status);
      assert.throws(() => f.call({ ...f.allocation, instanceCommitment: new Uint8Array(32).fill(37) }), /active exact template/);
      assert.deepEqual(f.view().runtimeInstances.lookup(f.allocation.instanceCommitment), before);
    });
  }

  it("requires both exact instance issuer membership and current namespace eligibility", () => {
    const f = allocationFixture();
    const issuerCommitment = pureCircuits.governanceActivatorLeafCommitment(f.issuer);
    const path = f.issuers.pathFor(issuerCommitment);
    const root = f.view().authorityRoots.lookup(f.allocation.target.namespaceHash);
    const verify = (issuer = f.issuer, current = root) => pureCircuits.assertRuntimeInstanceIssuer(
      f.allocation, issuer, path, current,
      f.governance.authority.pathFor(pureCircuits.governanceActivatorLeafCommitment(issuer)), f.allocation.createdAt);
    assert.doesNotThrow(() => verify());
    assert.throws(() => verify(f.otherIssuer), /not explicitly authorized/);
    assert.throws(() => verify(f.allocator), /capability-issuer scope/);
    assert.throws(() => verify(f.issuer, { ...root, root: buildAuthorityRoot([f.otherIssuer]).root }), /current namespace authority root/);
  });

  it("rejects M4/M5 mismatches, mutable snapshots, incomplete issuers, duplicate keys, and bad nonces in the adapter", () => {
    const f = allocationFixture(), input = f.adapterInput;
    for (const value of [
      { ...input, authorization: { ...input.authorization, allocatorId: "wrong-allocator" } },
      { ...input, instance: { ...input.instance, state: "authorized" } },
      { ...input, templateRecord: { ...input.templateRecord, state: "retired" as const } },
      { ...input, instance: { ...input.instance, templateHash: `0x${"ff".repeat(32)}` as const } },
      { ...input, capabilityIssuers: [] },
      { ...input, allocationNonce: new Uint8Array(32) },
      { ...input, initialStateNonce: new Uint8Array(32) },
    ]) assert.throws(() => createRuntimeInstanceAllocation(value));
    assert.throws(() => createRuntimeInstanceAllocation({ ...input,
      instance: { ...input.instance, capabilityIssuers: [...input.instance.capabilityIssuers,
        { principalId: "issuer-two", kind: "human" }] },
      capabilityIssuers: [...input.capabilityIssuers, { principalId: "issuer-two", kind: "human", authority: f.issuer }],
    }), /unique, exact/);
  });
});

function activateFixtureModule(
  contract: ReturnType<typeof createPermioAuthorizationContract>,
  context: CircuitContext<undefined>,
  governance: ReturnType<typeof moduleGovernance>,
  proposal: ReturnType<typeof moduleProposal>,
): CircuitContext<undefined> {
  const proposed = governanceCircuitOperations(contract).proposeProofModule(context, proposal);
  let nextContext = proposed.context;
  const proposalCommitment = pureCircuits.proofModuleProposalCommitment(proposal);
  const reviews: readonly [GovernanceActivatorLeaf, bigint, number][] = [
    [governance.reviewerOne, governance.reviewerOneSecret, 1],
    [governance.reviewerTwo, governance.reviewerTwoSecret, 2],
  ];
  for (const [reviewer, secret, index] of reviews) {
    const review: ProofModuleReview = {
      reviewVersion: 1n,
      moduleKey: proposed.result,
      proposalCommitment,
      governanceNamespaceHash: proposal.governanceNamespaceHash,
      governancePolicyHash: proposal.governancePolicyHash,
      authorityRootVersion: proposal.authorityRootVersion,
      authorityRootSequence: proposal.authorityRootSequence,
      reviewedAt: 1_700_000_010n + BigInt(index),
      reviewNonce: new Uint8Array(32).fill(120 + index),
    };
    nextContext = governanceCircuitOperations(contract).reviewProofModule(
      nextContext,
      review,
      signProofModuleReview(review, secret, 130n + BigInt(index)),
      reviewer,
      governance.authority.pathFor(
        pureCircuits.governanceActivatorLeafCommitment(reviewer),
      ),
    ).context;
  }
  let state = ledger(nextContext.currentQueryContext.state);
  const reviewed = state.proofModules.lookup(proposed.result);
  const firstApproval: ProofModuleLifecycleCommand = {
    commandVersion: 1n,
    moduleKey: proposed.result,
    recordCommitment: pureCircuits.proofModuleRecordCommitment(reviewed),
    governanceNamespaceHash: proposal.governanceNamespaceHash,
    governancePolicyHash: proposal.governancePolicyHash,
    authorityRootVersion: proposal.authorityRootVersion,
    authorityRootSequence: proposal.authorityRootSequence,
    expectedLifecycleStatus: 2n,
    nextLifecycleStatus: 3n,
    effectiveAt: 1_700_000_020n,
    reasonHash: new Uint8Array(32).fill(140),
    commandNonce: new Uint8Array(32).fill(141),
  };
  const firstApprovalResult = governanceCircuitOperations(contract).governProofModule(
    nextContext,
    firstApproval,
    signProofModuleLifecycleCommand(
      firstApproval,
      governance.approverSecret,
      149n,
    ),
    governance.approver,
    governance.authority.pathFor(
      pureCircuits.governanceActivatorLeafCommitment(governance.approver),
    ),
  );
  nextContext = firstApprovalResult.context;
  assert.equal(firstApprovalResult.result, 1n);
  state = ledger(nextContext.currentQueryContext.state);
  const partiallyApproved = state.proofModules.lookup(proposed.result);
  assert.equal(partiallyApproved.lifecycleStatus, 2n);
  const secondApproval: ProofModuleLifecycleCommand = {
    ...firstApproval,
    recordCommitment: pureCircuits.proofModuleRecordCommitment(partiallyApproved),
    effectiveAt: 1_700_000_021n,
    commandNonce: new Uint8Array(32).fill(142),
  };
  const secondApprovalResult = governanceCircuitOperations(contract).governProofModule(
    nextContext,
    secondApproval,
    signProofModuleLifecycleCommand(
      secondApproval,
      governance.approverTwoSecret,
      151n,
    ),
    governance.approverTwo,
    governance.authority.pathFor(
      pureCircuits.governanceActivatorLeafCommitment(governance.approverTwo),
    ),
  );
  nextContext = secondApprovalResult.context;
  assert.equal(secondApprovalResult.result, 2n);
  state = ledger(nextContext.currentQueryContext.state);
  const approved = state.proofModules.lookup(proposed.result);
  const activation: ProofModuleLifecycleCommand = {
    ...secondApproval,
    recordCommitment: pureCircuits.proofModuleRecordCommitment(approved),
    expectedLifecycleStatus: 3n,
    nextLifecycleStatus: 4n,
    effectiveAt: 1_700_000_030n,
    reasonHash: new Uint8Array(32).fill(150),
    commandNonce: new Uint8Array(32).fill(151),
  };
  return governanceCircuitOperations(contract).governProofModule(
    nextContext,
    activation,
    signProofModuleLifecycleCommand(
      activation,
      governance.moduleActivatorSecret,
      157n,
    ),
    governance.moduleActivator,
    governance.authority.pathFor(
      pureCircuits.governanceActivatorLeafCommitment(governance.moduleActivator),
    ),
  ).context;
}

describe("M4 activation admission envelope", () => {
  it("binds an active M4 record, exact M2 hash, module manifest, root, target, and nonce", () => {
    const { input, record } = fixture();
    const first = createActivationAdmissionArtifact(record, input);
    const second = createActivationAdmissionArtifact(
      structuredClone(record),
      structuredClone(input),
    );

    assert.deepEqual(second, first);
    assert.match(first.envelopeHash, /^0x[0-9a-f]{64}$/);
    assert.equal(first.envelope.templateContentHash, record.target.templateHash);
    assert.equal(first.envelope.authorityRootSequence, 7);
    assert.equal(first.envelope.signatureProfile, "midnight-jubjub-schnorr-v1");
  });

  it("changes the envelope hash when any security-relevant binding changes", () => {
    const { input, record } = fixture();
    const baseline = createActivationAdmissionArtifact(record, input).envelopeHash;
    const mutations: readonly Partial<ActivationAdmissionInput>[] = [
      { governancePolicyHash: `0x${"66".repeat(32)}` },
      { approvalEvidenceCommitment: `0x${"77".repeat(32)}` },
      { authorityRootVersion: 2 },
      { authorityRootSequence: 8 },
      { targetNetworkId: "preprod" },
      { targetContractIdentity: `0x${"99".repeat(32)}` },
      { admissionNonce: `0x${"88".repeat(32)}` },
    ];
    for (const mutation of mutations) {
      assert.notEqual(
        createActivationAdmissionArtifact(record, { ...input, ...mutation })
          .envelopeHash,
        baseline,
      );
    }
  });

  it("rejects unsupported signature profiles before Compact conversion rather than normalizing them", () => {
    const { input, record } = fixture();
    const { envelope } = createActivationAdmissionArtifact(record, input);
    assert.doesNotThrow(() => toCompactActivationAdmissionEnvelope(envelope));
    for (const signatureProfile of ["ed25519-v1", "midnight-jubjub-schnorr-v2", undefined, null]) {
      assert.throws(() => toCompactActivationAdmissionEnvelope({ ...envelope,
        signatureProfile } as unknown as typeof envelope), /Unsupported governance signature profile/);
    }
  });

  it("rejects unsupported registry protocol versions before Compact conversion rather than normalizing them", () => {
    const { input, record } = fixture();
    const { envelope } = createActivationAdmissionArtifact(record, input);
    assert.equal(toCompactActivationAdmissionEnvelope(envelope).registryProtocolVersion, 1n);
    for (const registryProtocolVersion of ["permio-midnight-authorization-v2", 1, undefined, null]) {
      assert.throws(() => toCompactActivationAdmissionEnvelope({ ...envelope,
        registryProtocolVersion } as unknown as typeof envelope), /Unsupported registry protocol version/);
    }
  });

  it("rejects malformed envelope hashes instead of truncating an otherwise valid prefix", () => {
    const { input, record } = fixture();
    const { envelope } = createActivationAdmissionArtifact(record, input);
    for (const [field, value] of Object.entries(envelope)) {
      if (typeof value !== "string" || !value.startsWith("0x")) continue;
      for (const malformed of [value + "zz", value.slice(0, -2), value.slice(2)]) {
        assert.throws(() => toCompactActivationAdmissionEnvelope({ ...envelope,
          [field]: malformed }), /lowercase 32-byte hexadecimal/, field);
      }
    }
  });

  it("rejects malformed module-binding hashes instead of truncating an otherwise valid prefix", () => {
    const { input, record } = fixture();
    const binding = createActivationAdmissionArtifact(record, input).bindings[0]!;
    for (const field of ["implementationHash", "configurationHash", "receiptSchemaHash"] as const) {
      for (const malformed of [binding[field] + "zz", binding[field].slice(0, -2), binding[field].slice(2)]) {
        assert.throws(() => toCompactProofModuleBinding({ ...binding,
          [field]: malformed as `0x${string}` }), /lowercase 32-byte hexadecimal/, field);
      }
    }
  });

  it("rejects altered template content even when the claimed target hash is unchanged", () => {
    const { input, record } = fixture();
    const altered: TemplateRecord = {
      ...structuredClone(record),
      template: { ...record.template, displayName: "Altered content" },
    };
    assert.throws(
      () => createActivationAdmissionArtifact(altered, input),
      /exact validated template content/,
    );
  });

  it("rejects inactive M4 state, insufficient or duplicate approvals, and mismatched evidence", () => {
    const { activation, input, record, reviews } = fixture();
    assert.throws(
      () => createActivationAdmissionArtifact({ ...record, state: "retired" }, input),
      /must be active/,
    );
    assert.throws(
      () =>
        createActivationAdmissionArtifact(record, {
          ...input,
          activation: { ...activation, approvalReviewerIds: ["reviewer-one"] },
        }),
      /meet the recorded threshold/,
    );
    assert.throws(
      () =>
        createActivationAdmissionArtifact(record, {
          ...input,
          activation: {
            ...activation,
            approvalReviewerIds: ["reviewer-one", "reviewer-one"],
          },
        }),
      /sorted, unique/,
    );
    assert.throws(
      () => hashApprovalEvidence(activation, reviews.slice(0, 1)),
      /does not match/,
    );
  });

  it("requires one exact proof-module binding per template action", () => {
    const { input, record } = fixture();
    assert.throws(
      () =>
        createActivationAdmissionArtifact(record, {
          ...input,
          proofModuleBindings: { manifestVersion: 1, bindings: [] },
        }),
      /every template action/,
    );
    assert.throws(
      () =>
        createActivationAdmissionArtifact(record, {
          ...input,
          proofModuleBindings: {
            manifestVersion: 1,
            bindings: [
              {
                ...input.proofModuleBindings.bindings[0]!,
                implementationHash: `0x${"AA".repeat(32)}`,
              },
            ],
          },
        }),
      /lowercase 32-byte/,
    );
  });

  it("verifies only the governance-activator signature over the exact Compact envelope", () => {
    const { input, record } = fixture();
    const artifact = createActivationAdmissionArtifact(record, input);
    const envelope = toCompactActivationAdmissionEnvelope(artifact.envelope);
    const secret = 29n;
    const publicKey = governanceActivatorPublicKey(secret);
    const signature = signActivationAdmissionEnvelope(envelope, secret, 53n);
    const contract = createPermioAuthorizationContract();
    const initial = contract.initialState(
      createConstructorContext(undefined, "00".repeat(32)),
      envelope.targetNetworkHash,
      envelope.namespaceHash,
      envelope.governancePolicyHash,
      { field: 0n },
      envelope.authorityRootVersion,
      envelope.authorityRootSequence,
      { field: 0n },
      2n,
      2n,
      2n,
    );
    const context = createCircuitContext(
      dummyContractAddress(),
      "00".repeat(32),
      initial.currentContractState,
      undefined,
    );

    assert.doesNotThrow(() =>
      contract.circuits.verifyGovernanceActivationSignature(
        context,
        envelope,
        signature,
        publicKey,
      ),
    );
    for (const [field, value] of Object.entries(envelope)) {
      const candidates = value instanceof Uint8Array
        ? [{ ...envelope, [field]: Uint8Array.from(value, (byte, index) => index === 0 ? byte ^ 1 : byte) }]
        : typeof value === "bigint" ? [{ ...envelope, [field]: value + 1n }]
        : "field" in value ? [{ ...envelope, [field]: { field: value.field + 1n } }]
        : (["major", "minor", "patch"] as const).map(part =>
          ({ ...envelope, semanticVersion: { ...envelope.semanticVersion, [part]: envelope.semanticVersion[part] + 1n } }));
      for (const candidate of candidates) {
        assert.notEqual(pureCircuits.governanceActivationSignatureChallenge(signature.announcement, publicKey, candidate),
          pureCircuits.governanceActivationSignatureChallenge(signature.announcement, publicKey, envelope), field);
        assert.throws(() => contract.circuits.verifyGovernanceActivationSignature(context, candidate, signature, publicKey),
          /Invalid governance activation signature|Unsupported (admission envelope|registry protocol) version/, field);
      }
    }
    assert.throws(
      () =>
        contract.circuits.verifyGovernanceActivationSignature(
          context,
          { ...envelope, admissionNonce: new Uint8Array(32).fill(99) },
          signature,
          publicKey,
        ),
      /Invalid governance activation signature/,
    );
    assert.throws(
      () =>
        contract.circuits.verifyGovernanceActivationSignature(
          context,
          envelope,
          { ...signature, response: signature.response + 1n },
          publicKey,
        ),
      /Invalid governance activation signature/,
    );
    assert.throws(
      () =>
        contract.circuits.verifyGovernanceActivationSignature(
          context,
          envelope,
          {
            announcement: governanceActivatorPublicKey(53n),
            response: 53n,
          },
          { x: 0n, y: 1n },
        ),
      /identity point/,
    );
  });

  it("admits one exact activation under the current authority root and rejects replay", () => {
    const { input, record } = fixture();
    const artifact = createActivationAdmissionArtifact(record, {
      ...input,
      targetContractIdentity: `0x${"00".repeat(32)}`,
    });
    const envelope = toCompactActivationAdmissionEnvelope(artifact.envelope);
    const secret = 29n;
    const activator: GovernanceActivatorLeaf = {
      leafVersion: 1n,
      namespaceHash: envelope.namespaceHash,
      governancePolicyHash: envelope.governancePolicyHash,
      authorityKind: 3n,
      publicKey: governanceActivatorPublicKey(secret),
      validAfter: 0n,
      validBefore: 2_000_000_000n,
    };
    const commitment = pureCircuits.governanceActivatorLeafCommitment(activator);
    const governance = moduleGovernance(activator);
    const authority = governance.authority;
    const signature = signActivationAdmissionEnvelope(envelope, secret, 53n);
    const contract = createPermioAuthorizationContract();
    const initialized = contract.initialState(
      createConstructorContext(undefined, "00".repeat(32)),
      envelope.targetNetworkHash,
      envelope.namespaceHash,
      envelope.governancePolicyHash,
      authority.root,
      envelope.authorityRootVersion,
      envelope.authorityRootSequence,
      { field: 0n },
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
      1_800_000_100,
    );
    context = activateFixtureModule(
      contract,
      context,
      governance,
      moduleProposal(input.proofModuleBindings.bindings[0]!, envelope),
    );

    const bindingTree = buildProofModuleBindingTree(artifact.bindings);
    const begun = contract.circuits.beginM4Activation(
      context,
      envelope,
      signature,
      activator,
      authority.pathFor(commitment),
    );
    context = begun.context;
    let state = ledger(context.currentQueryContext.state);
    assert.equal(state.activeTemplates.size(), 0n);
    assert.equal(state.activationSessions.size(), 1n);
    assert.equal(state.reservedAdmissionNonces.size(), 1n);

    const staged = contract.circuits.stageM4ActivationBinding(
      context,
      begun.result,
      bindingTree.compactBindingAt(0),
      bindingTree.pathFor(0),
    );
    assert.equal(staged.result, true);
    context = staged.context;
    const finalized = contract.circuits.finalizeM4Activation(
      context,
      envelope,
      signature,
      activator,
      authority.pathFor(commitment),
    );
    assert.equal(finalized.result.activated, true);
    context = finalized.context;
    state = ledger(context.currentQueryContext.state);
    assert.equal(state.templateActivationSequence, 1n);
    assert.equal(state.activeTemplates.size(), 1n);
    assert.equal(state.usedAdmissionNonces.size(), 1n);
    assert.equal(state.activationSessions.size(), 0n);
    assert.equal(state.reservedAdmissionNonces.size(), 0n);
    assert.equal(state.activeTemplates.lookup(finalized.result.registryKey).lifecycleStatus, 1n);
    assert.deepEqual(
      state.activeTemplates.lookup(finalized.result.registryKey).target.templateContentHash,
      hexBytes(record.target.templateHash),
    );

    assert.throws(
      () =>
        contract.circuits.beginM4Activation(
          context,
          envelope,
          signature,
          activator,
          authority.pathFor(commitment),
        ),
      /nonce already used/i,
    );
    // A long integration workflow may outlive admission's window. Expiry
    // intentionally precedes nonce reuse; test replay promptly, not after
    // an hour of unrelated credential proofs and with a loosened regex.
    const lateContext = createCircuitContext(dummyContractAddress(), "00".repeat(32),
      context.currentQueryContext.state, undefined, undefined, undefined,
      Number(envelope.stagingExpiresAt) + 1);
    assert.throws(() => contract.circuits.beginM4Activation(lateContext,
      envelope, signature, activator, authority.pathFor(commitment)),
    /Activation staging deadline has passed/);
  });

  it("rejects missing, altered, out-of-order, and duplicate staged bindings", () => {
    const { input, record } = fixture();
    const artifact = createActivationAdmissionArtifact(record, {
      ...input,
      targetContractIdentity: `0x${"00".repeat(32)}`,
    });
    const envelope = toCompactActivationAdmissionEnvelope(artifact.envelope);
    const secret = 29n;
    const activator: GovernanceActivatorLeaf = {
      leafVersion: 1n,
      namespaceHash: envelope.namespaceHash,
      governancePolicyHash: envelope.governancePolicyHash,
      authorityKind: 3n,
      publicKey: governanceActivatorPublicKey(secret),
      validAfter: 0n,
      validBefore: 2_000_000_000n,
    };
    const commitment = pureCircuits.governanceActivatorLeafCommitment(activator);
    const governance = moduleGovernance(activator);
    const authority = governance.authority;
    const signature = signActivationAdmissionEnvelope(envelope, secret, 53n);
    const contract = createPermioAuthorizationContract();
    const initialized = contract.initialState(
      createConstructorContext(undefined, "00".repeat(32)),
      envelope.targetNetworkHash,
      envelope.namespaceHash,
      envelope.governancePolicyHash,
      authority.root,
      envelope.authorityRootVersion,
      envelope.authorityRootSequence,
      { field: 0n },
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
      1_800_000_100,
    );
    context = activateFixtureModule(
      contract,
      context,
      governance,
      moduleProposal(input.proofModuleBindings.bindings[0]!, envelope),
    );
    const begun = contract.circuits.beginM4Activation(
      context,
      envelope,
      signature,
      activator,
      authority.pathFor(commitment),
    );
    context = begun.context;
    assert.throws(
      () =>
        contract.circuits.finalizeM4Activation(
          context,
          envelope,
          signature,
          activator,
          authority.pathFor(commitment),
        ),
      /Not every action binding/,
    );

    const bindingTree = buildProofModuleBindingTree(artifact.bindings);
    const binding = bindingTree.compactBindingAt(0);
    assert.throws(
      () =>
        contract.circuits.stageM4ActivationBinding(
          context,
          begun.result,
          { ...binding, actionIndex: 1n },
          bindingTree.pathFor(0),
        ),
      /canonical order/,
    );
    assert.throws(
      () =>
        contract.circuits.stageM4ActivationBinding(
          context,
          begun.result,
          { ...binding, actionIdHash: new Uint8Array(32).fill(9) },
          bindingTree.pathFor(0),
        ),
      /signed manifest/,
    );
    const staged = contract.circuits.stageM4ActivationBinding(
      context,
      begun.result,
      binding,
      bindingTree.pathFor(0),
    );
    context = staged.context;
    assert.throws(
      () =>
        contract.circuits.stageM4ActivationBinding(
          context,
          begun.result,
          binding,
          bindingTree.pathFor(0),
        ),
      /canonical order/,
    );

    const unregisteredArtifact = createActivationAdmissionArtifact(record, {
      ...input,
      targetContractIdentity: `0x${"00".repeat(32)}`,
      admissionNonce: `0x${"57".repeat(32)}`,
      proofModuleBindings: {
        manifestVersion: 1,
        bindings: [
          {
            ...input.proofModuleBindings.bindings[0]!,
            implementationHash: `0x${"71".repeat(32)}`,
          },
        ],
      },
    });
    const unregisteredEnvelope = toCompactActivationAdmissionEnvelope(
      unregisteredArtifact.envelope,
    );
    const unregisteredSignature = signActivationAdmissionEnvelope(
      unregisteredEnvelope,
      secret,
      61n,
    );
    const unregisteredInitialized = contract.initialState(
      createConstructorContext(undefined, "00".repeat(32)),
      unregisteredEnvelope.targetNetworkHash,
      unregisteredEnvelope.namespaceHash,
      unregisteredEnvelope.governancePolicyHash,
      authority.root,
      unregisteredEnvelope.authorityRootVersion,
      unregisteredEnvelope.authorityRootSequence,
      { field: 0n },
      2n,
      2n,
      2n,
    );
    let unregisteredContext = createCircuitContext(
      dummyContractAddress(),
      "00".repeat(32),
      unregisteredInitialized.currentContractState,
      undefined,
      undefined,
      undefined,
      1_800_000_100,
    );
    unregisteredContext = activateFixtureModule(
      contract,
      unregisteredContext,
      governance,
      moduleProposal(
        input.proofModuleBindings.bindings[0]!,
        unregisteredEnvelope,
      ),
    );
    const unregisteredBegun = contract.circuits.beginM4Activation(
      unregisteredContext,
      unregisteredEnvelope,
      unregisteredSignature,
      activator,
      authority.pathFor(commitment),
    );
    const unregisteredTree = buildProofModuleBindingTree(
      unregisteredArtifact.bindings,
    );
    assert.throws(
      () =>
        contract.circuits.stageM4ActivationBinding(
          unregisteredBegun.context,
          unregisteredBegun.result,
          unregisteredTree.compactBindingAt(0),
          unregisteredTree.pathFor(0),
        ),
      /not registered/,
    );
  });

  it("lazily removes expired sessions and releases their reserved nonce", () => {
    const { input, record } = fixture();
    const artifact = createActivationAdmissionArtifact(record, {
      ...input,
      targetContractIdentity: `0x${"00".repeat(32)}`,
      stagingExpiresAt: 1_800_000_200,
    });
    const envelope = toCompactActivationAdmissionEnvelope(artifact.envelope);
    const secret = 29n;
    const activator: GovernanceActivatorLeaf = {
      leafVersion: 1n,
      namespaceHash: envelope.namespaceHash,
      governancePolicyHash: envelope.governancePolicyHash,
      authorityKind: 3n,
      publicKey: governanceActivatorPublicKey(secret),
      validAfter: 0n,
      validBefore: 2_000_000_000n,
    };
    const commitment = pureCircuits.governanceActivatorLeafCommitment(activator);
    const governance = moduleGovernance(activator);
    const authority = governance.authority;
    const signature = signActivationAdmissionEnvelope(envelope, secret, 53n);
    const contract = createPermioAuthorizationContract();
    const initialized = contract.initialState(
      createConstructorContext(undefined, "00".repeat(32)),
      envelope.targetNetworkHash,
      envelope.namespaceHash,
      envelope.governancePolicyHash,
      authority.root,
      envelope.authorityRootVersion,
      envelope.authorityRootSequence,
      { field: 0n },
      2n,
      2n,
      2n,
    );
    let beforeExpiry = createCircuitContext(
      dummyContractAddress(),
      "00".repeat(32),
      initialized.currentContractState,
      undefined,
      undefined,
      undefined,
      1_800_000_100,
    );
    beforeExpiry = activateFixtureModule(
      contract,
      beforeExpiry,
      governance,
      moduleProposal(input.proofModuleBindings.bindings[0]!, envelope),
    );
    const begun = contract.circuits.beginM4Activation(
      beforeExpiry,
      envelope,
      signature,
      activator,
      authority.pathFor(commitment),
    );
    const afterExpiry = createCircuitContext(
      dummyContractAddress(),
      "00".repeat(32),
      begun.context.currentQueryContext.state,
      undefined,
      undefined,
      undefined,
      1_800_000_201,
    );
    const bindingTree = buildProofModuleBindingTree(artifact.bindings);
    const cleaned = contract.circuits.stageM4ActivationBinding(
      afterExpiry,
      begun.result,
      bindingTree.compactBindingAt(0),
      bindingTree.pathFor(0),
    );
    assert.equal(cleaned.result, false);
    const state = ledger(cleaned.context.currentQueryContext.state);
    assert.equal(state.activationSessions.size(), 0n);
    assert.equal(state.reservedAdmissionNonces.size(), 0n);
    assert.equal(state.activeTemplates.size(), 0n);

    const restartedArtifact = createActivationAdmissionArtifact(record, {
      ...input,
      targetContractIdentity: `0x${"00".repeat(32)}`,
      admissionNonce: `0x${"56".repeat(32)}`,
      stagingExpiresAt: 1_800_000_300,
    });
    const restartedEnvelope = toCompactActivationAdmissionEnvelope(
      restartedArtifact.envelope,
    );
    const restartedSignature = signActivationAdmissionEnvelope(
      restartedEnvelope,
      secret,
      59n,
    );
    const restarted = contract.circuits.beginM4Activation(
      cleaned.context,
      restartedEnvelope,
      restartedSignature,
      activator,
      authority.pathFor(commitment),
    );
    assert.equal(
      ledger(restarted.context.currentQueryContext.state).activationSessions.size(),
      1n,
    );
    const explicitCleanupContext = createCircuitContext(
      dummyContractAddress(),
      "00".repeat(32),
      restarted.context.currentQueryContext.state,
      undefined,
      undefined,
      undefined,
      1_800_000_301,
    );
    const automaticallyCleaned = contract.circuits.finalizeM4Activation(
      explicitCleanupContext,
      restartedEnvelope,
      restartedSignature,
      activator,
      authority.pathFor(commitment),
    );
    assert.equal(automaticallyCleaned.result.activated, false);
    const finalState = ledger(automaticallyCleaned.context.currentQueryContext.state);
    assert.equal(finalState.activationSessions.size(), 0n);
    assert.equal(finalState.reservedAdmissionNonces.size(), 0n);
  });

  it("rejects stale roots, ineligible authority paths, wrong deployment targets, and altered hashes", () => {
    const { input, record } = fixture();
    const artifact = createActivationAdmissionArtifact(record, {
      ...input,
      targetContractIdentity: `0x${"00".repeat(32)}`,
    });
    const envelope = toCompactActivationAdmissionEnvelope(artifact.envelope);
    const secret = 29n;
    const activator: GovernanceActivatorLeaf = {
      leafVersion: 1n,
      namespaceHash: envelope.namespaceHash,
      governancePolicyHash: envelope.governancePolicyHash,
      authorityKind: 3n,
      publicKey: governanceActivatorPublicKey(secret),
      validAfter: 1_700_000_000n,
      validBefore: 1_900_000_000n,
    };
    const eligibleCommitment = pureCircuits.governanceActivatorLeafCommitment(activator);
    const governance = moduleGovernance(activator);
    const authority = governance.authority;
    const signature = signActivationAdmissionEnvelope(envelope, secret, 53n);
    const contract = createPermioAuthorizationContract();
    const initialized = contract.initialState(
      createConstructorContext(undefined, "00".repeat(32)),
      envelope.targetNetworkHash,
      envelope.namespaceHash,
      envelope.governancePolicyHash,
      authority.root,
      envelope.authorityRootVersion,
      envelope.authorityRootSequence,
      { field: 0n },
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
      1_800_000_100,
    );
    context = activateFixtureModule(
      contract,
      context,
      governance,
      moduleProposal(input.proofModuleBindings.bindings[0]!, envelope),
    );
    const call = (
      candidateEnvelope = envelope,
      candidateActivator = activator,
      candidatePath = authority.pathFor(eligibleCommitment),
      candidateSignature = signature,
    ) =>
      contract.circuits.beginM4Activation(
        context,
        candidateEnvelope,
        candidateSignature,
        candidateActivator,
        candidatePath,
      );

    assert.throws(
      () => call({ ...envelope, authorityRootSequence: envelope.authorityRootSequence + 1n }),
      /stale or mismatched/,
    );
    assert.throws(
      () => call({ ...envelope, targetContractIdentity: new Uint8Array(32).fill(9) }),
      /another contract deployment/,
    );
    assert.throws(
      () => call({ ...envelope, targetNetworkHash: new Uint8Array(32).fill(9) }),
      /another Midnight network/,
    );
    assert.throws(
      () => call({ ...envelope, templateContentHash: new Uint8Array(32).fill(9) }),
      /Invalid governance activation signature/,
    );
    const unchanged = context.currentQueryContext.state.state.encode();
    for (const field of ["m4ActivationRecordHash", "approvalEvidenceCommitment"] as const) {
      assert.throws(() => call({ ...envelope, [field]: new Uint8Array(32).fill(9) }),
        /Invalid governance activation signature/, field);
      assert.deepEqual(context.currentQueryContext.state.state.encode(), unchanged);
    }
    for (const [field, expected] of [["envelopeVersion", /Unsupported admission envelope version/],
      ["registryProtocolVersion", /Unsupported registry protocol version/]] as const) {
      const unsupported = { ...envelope, [field]: 2n };
      assert.throws(() => call(unsupported, activator, authority.pathFor(eligibleCommitment),
        signActivationAdmissionEnvelope(unsupported, secret, 59n)), expected);
      assert.deepEqual(context.currentQueryContext.state.state.encode(), unchanged);
    }
    assert.throws(
      () => call(envelope, { ...activator, authorityKind: 4n }),
      /outside the admission scope/,
    );
    assert.throws(
      () => call(envelope, { ...activator, publicKey: governanceActivatorPublicKey(31n) }),
      /not eligible under the current authority root/,
    );
  });

  it("governs modules through unique review, approval, activation, deprecation, and revocation", () => {
    const { input, record } = fixture();
    const artifact = createActivationAdmissionArtifact(record, {
      ...input,
      targetContractIdentity: `0x${"00".repeat(32)}`,
    });
    const envelope = toCompactActivationAdmissionEnvelope(artifact.envelope);
    const governanceActivator: GovernanceActivatorLeaf = {
      leafVersion: 1n,
      namespaceHash: envelope.namespaceHash,
      governancePolicyHash: envelope.governancePolicyHash,
      authorityKind: MIDNIGHT_AUTHORITY_KINDS.governanceActivator,
      publicKey: governanceActivatorPublicKey(29n),
      validAfter: 0n,
      validBefore: 2_000_000_000n,
    };
    const governance = moduleGovernance(governanceActivator);
    const contract = createPermioAuthorizationContract();
    const initialized = contract.initialState(
      createConstructorContext(undefined, "00".repeat(32)),
      envelope.targetNetworkHash,
      envelope.namespaceHash,
      envelope.governancePolicyHash,
      governance.authority.root,
      envelope.authorityRootVersion,
      envelope.authorityRootSequence,
      { field: 0n },
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
      1_800_000_100,
    );
    const proposal = moduleProposal(
      input.proofModuleBindings.bindings[0]!,
      envelope,
    );
    const proposed = governanceCircuitOperations(contract).proposeProofModule(context, proposal);
    context = proposed.context;
    assert.throws(
      () => governanceCircuitOperations(contract).proposeProofModule(context, proposal),
      /already registered/,
    );
    const proposalCommitment = pureCircuits.proofModuleProposalCommitment(proposal);
    const firstReview: ProofModuleReview = {
      reviewVersion: 1n,
      moduleKey: proposed.result,
      proposalCommitment,
      governanceNamespaceHash: proposal.governanceNamespaceHash,
      governancePolicyHash: proposal.governancePolicyHash,
      authorityRootVersion: proposal.authorityRootVersion,
      authorityRootSequence: proposal.authorityRootSequence,
      reviewedAt: 1_700_000_011n,
      reviewNonce: new Uint8Array(32).fill(171),
    };
    assert.throws(() => governanceCircuitOperations(contract).reviewProofModule(
      context, firstReview,
      signProofModuleLifecycleCommand(pureCircuits.emptyGovernanceDispatchInput().lifecycle,
        governance.reviewerOneSecret, 172n),
      governance.reviewerOne,
      governance.authority.pathFor(pureCircuits.governanceActivatorLeafCommitment(governance.reviewerOne))),
      /signature|schnorr/i, 'A signature for another governance operation must not authorize a review');
    const first = governanceCircuitOperations(contract).reviewProofModule(
      context,
      firstReview,
      signProofModuleReview(firstReview, governance.reviewerOneSecret, 173n),
      governance.reviewerOne,
      governance.authority.pathFor(
        pureCircuits.governanceActivatorLeafCommitment(governance.reviewerOne),
      ),
    );
    context = first.context;
    assert.equal(first.result, 1n);
    assert.equal(
      ledger(context.currentQueryContext.state).proofModules.lookup(proposed.result)
        .lifecycleStatus,
      1n,
    );
    const duplicateReview = {
      ...firstReview,
      reviewNonce: new Uint8Array(32).fill(172),
    };
    assert.throws(
      () =>
        governanceCircuitOperations(contract).reviewProofModule(
          context,
          duplicateReview,
          signProofModuleReview(
            duplicateReview,
            governance.reviewerOneSecret,
            179n,
          ),
          governance.reviewerOne,
          governance.authority.pathFor(
            pureCircuits.governanceActivatorLeafCommitment(governance.reviewerOne),
          ),
        ),
      /Duplicate proof-module reviewer approval/,
    );
    let moduleRecord = ledger(context.currentQueryContext.state).proofModules.lookup(
      proposed.result,
    );
    const prematureApproval: ProofModuleLifecycleCommand = {
      commandVersion: 1n,
      moduleKey: proposed.result,
      recordCommitment: pureCircuits.proofModuleRecordCommitment(moduleRecord),
      governanceNamespaceHash: proposal.governanceNamespaceHash,
      governancePolicyHash: proposal.governancePolicyHash,
      authorityRootVersion: proposal.authorityRootVersion,
      authorityRootSequence: proposal.authorityRootSequence,
      expectedLifecycleStatus: 1n,
      nextLifecycleStatus: 3n,
      effectiveAt: 1_700_000_020n,
      reasonHash: new Uint8Array(32).fill(180),
      commandNonce: new Uint8Array(32).fill(181),
    };
    assert.throws(
      () =>
        governanceCircuitOperations(contract).governProofModule(
          context,
          prematureApproval,
          signProofModuleLifecycleCommand(
            prematureApproval,
            governance.approverSecret,
            191n,
          ),
          governance.approver,
          governance.authority.pathFor(
            pureCircuits.governanceActivatorLeafCommitment(governance.approver),
          ),
        ),
      /required independent review/,
    );
    const secondReview: ProofModuleReview = {
      ...firstReview,
      reviewedAt: 1_700_000_012n,
      reviewNonce: new Uint8Array(32).fill(182),
    };
    const second = governanceCircuitOperations(contract).reviewProofModule(
      context,
      secondReview,
      signProofModuleReview(secondReview, governance.reviewerTwoSecret, 193n),
      governance.reviewerTwo,
      governance.authority.pathFor(
        pureCircuits.governanceActivatorLeafCommitment(governance.reviewerTwo),
      ),
    );
    context = second.context;
    assert.equal(second.result, 2n);
    moduleRecord = ledger(context.currentQueryContext.state).proofModules.lookup(
      proposed.result,
    );
    assert.equal(moduleRecord.lifecycleStatus, 2n);
    const approval: ProofModuleLifecycleCommand = {
      ...prematureApproval,
      recordCommitment: pureCircuits.proofModuleRecordCommitment(moduleRecord),
      expectedLifecycleStatus: 2n,
      commandNonce: new Uint8Array(32).fill(183),
    };
    const firstApprovalResult = governanceCircuitOperations(contract).governProofModule(
      context,
      approval,
      signProofModuleLifecycleCommand(approval, governance.approverSecret, 197n),
      governance.approver,
      governance.authority.pathFor(
        pureCircuits.governanceActivatorLeafCommitment(governance.approver),
      ),
    );
    context = firstApprovalResult.context;
    assert.equal(firstApprovalResult.result, 1n);
    moduleRecord = ledger(context.currentQueryContext.state).proofModules.lookup(
      proposed.result,
    );
    assert.equal(moduleRecord.lifecycleStatus, 2n);
    assert.equal(moduleRecord.approvalCount, 1n);
    const prematureActivation: ProofModuleLifecycleCommand = {
      ...approval,
      recordCommitment: pureCircuits.proofModuleRecordCommitment(moduleRecord),
      expectedLifecycleStatus: 2n,
      nextLifecycleStatus: 4n,
      effectiveAt: 1_700_000_021n,
      commandNonce: new Uint8Array(32).fill(189),
    };
    assert.throws(
      () =>
        governanceCircuitOperations(contract).governProofModule(
          context,
          prematureActivation,
          signProofModuleLifecycleCommand(
            prematureActivation,
            governance.moduleActivatorSecret,
            199n,
          ),
          governance.moduleActivator,
          governance.authority.pathFor(
            pureCircuits.governanceActivatorLeafCommitment(
              governance.moduleActivator,
            ),
          ),
        ),
      /Invalid proof-module activation transition/,
    );
    const duplicateApproval: ProofModuleLifecycleCommand = {
      ...approval,
      recordCommitment: pureCircuits.proofModuleRecordCommitment(moduleRecord),
      effectiveAt: 1_700_000_021n,
      commandNonce: new Uint8Array(32).fill(184),
    };
    assert.throws(
      () =>
        governanceCircuitOperations(contract).governProofModule(
          context,
          duplicateApproval,
          signProofModuleLifecycleCommand(
            duplicateApproval,
            governance.approverSecret,
            199n,
          ),
          governance.approver,
          governance.authority.pathFor(
            pureCircuits.governanceActivatorLeafCommitment(governance.approver),
          ),
        ),
      /Duplicate proof-module approver approval/,
    );
    const secondApproval: ProofModuleLifecycleCommand = {
      ...approval,
      recordCommitment: pureCircuits.proofModuleRecordCommitment(moduleRecord),
      effectiveAt: 1_700_000_022n,
      commandNonce: new Uint8Array(32).fill(185),
    };
    const secondApprovalResult = governanceCircuitOperations(contract).governProofModule(
      context,
      secondApproval,
      signProofModuleLifecycleCommand(
        secondApproval,
        governance.approverTwoSecret,
        211n,
      ),
      governance.approverTwo,
      governance.authority.pathFor(
        pureCircuits.governanceActivatorLeafCommitment(governance.approverTwo),
      ),
    );
    context = secondApprovalResult.context;
    assert.equal(secondApprovalResult.result, 2n);
    moduleRecord = ledger(context.currentQueryContext.state).proofModules.lookup(
      proposed.result,
    );
    assert.equal(moduleRecord.lifecycleStatus, 3n);
    assert.equal(moduleRecord.approvalCount, 2n);
    assert.deepEqual(
      moduleRecord.approvalEvidenceCommitment,
      moduleRecord.approvalEvidenceAccumulator,
    );
    assert.notDeepEqual(
      moduleRecord.approvalEvidenceCommitment,
      moduleRecord.reviewEvidenceAccumulator,
    );
    const activation: ProofModuleLifecycleCommand = {
      ...secondApproval,
      recordCommitment: pureCircuits.proofModuleRecordCommitment(moduleRecord),
      expectedLifecycleStatus: 3n,
      nextLifecycleStatus: 4n,
      effectiveAt: 1_700_000_030n,
      commandNonce: new Uint8Array(32).fill(186),
    };
    assert.throws(
      () =>
        governanceCircuitOperations(contract).governProofModule(
          context,
          activation,
          signProofModuleLifecycleCommand(
            activation,
            governance.approverSecret,
            223n,
          ),
          governance.approver,
          governance.authority.pathFor(
            pureCircuits.governanceActivatorLeafCommitment(governance.approver),
          ),
        ),
      /outside the required scope/,
    );
    context = governanceCircuitOperations(contract).governProofModule(
      context,
      activation,
      signProofModuleLifecycleCommand(
        activation,
        governance.moduleActivatorSecret,
        227n,
      ),
      governance.moduleActivator,
      governance.authority.pathFor(
        pureCircuits.governanceActivatorLeafCommitment(governance.moduleActivator),
      ),
    ).context;
    moduleRecord = ledger(context.currentQueryContext.state).proofModules.lookup(
      proposed.result,
    );
    assert.equal(moduleRecord.lifecycleStatus, 4n);
    const deprecation: ProofModuleLifecycleCommand = {
      ...activation,
      recordCommitment: pureCircuits.proofModuleRecordCommitment(moduleRecord),
      expectedLifecycleStatus: 4n,
      nextLifecycleStatus: 5n,
      effectiveAt: 1_700_000_040n,
      commandNonce: new Uint8Array(32).fill(187),
    };
    context = governanceCircuitOperations(contract).governProofModule(
      context,
      deprecation,
      signProofModuleLifecycleCommand(
        deprecation,
        governance.approverSecret,
        229n,
      ),
      governance.approver,
      governance.authority.pathFor(
        pureCircuits.governanceActivatorLeafCommitment(governance.approver),
      ),
    ).context;
    moduleRecord = ledger(context.currentQueryContext.state).proofModules.lookup(
      proposed.result,
    );
    assert.equal(moduleRecord.lifecycleStatus, 5n);
    const revocation: ProofModuleLifecycleCommand = {
      ...deprecation,
      recordCommitment: pureCircuits.proofModuleRecordCommitment(moduleRecord),
      expectedLifecycleStatus: 5n,
      nextLifecycleStatus: 6n,
      effectiveAt: 1_700_000_050n,
      commandNonce: new Uint8Array(32).fill(188),
    };
    context = governanceCircuitOperations(contract).governProofModule(
      context,
      revocation,
      signProofModuleLifecycleCommand(
        revocation,
        governance.moduleRevokerSecret,
        233n,
      ),
      governance.moduleRevoker,
      governance.authority.pathFor(
        pureCircuits.governanceActivatorLeafCommitment(governance.moduleRevoker),
      ),
    ).context;
    moduleRecord = ledger(context.currentQueryContext.state).proofModules.lookup(
      proposed.result,
    );
    assert.equal(moduleRecord.lifecycleStatus, 6n);
    assert.equal(moduleRecord.activatedAt, 1_700_000_030n);
    assert.equal(moduleRecord.deprecatedAt, 1_700_000_040n);
    assert.equal(moduleRecord.revokedAt, 1_700_000_050n);
    assert.equal(
      ledger(context.currentQueryContext.state).proofModuleReviews.size(),
      2n,
    );
    assert.equal(
      ledger(context.currentQueryContext.state).proofModuleApprovals.size(),
      2n,
    );
    assert.equal(
      ledger(context.currentQueryContext.state).proofModuleRegistrySequence,
      8n,
    );
  });

  it("rotates authority roots by threshold and keeps template retirement separate", () => {
    const { input, record } = fixture();
    const artifact = createActivationAdmissionArtifact(record, {
      ...input,
      targetContractIdentity: `0x${"00".repeat(32)}`,
    });
    const envelope = toCompactActivationAdmissionEnvelope(artifact.envelope);
    const activatorSecret = 29n;
    const activator: GovernanceActivatorLeaf = {
      leafVersion: 1n,
      namespaceHash: envelope.namespaceHash,
      governancePolicyHash: envelope.governancePolicyHash,
      authorityKind: MIDNIGHT_AUTHORITY_KINDS.governanceActivator,
      publicKey: governanceActivatorPublicKey(activatorSecret),
      validAfter: 0n,
      validBefore: 2_000_000_000n,
    };
    const governance = moduleGovernance(activator);
    const contract = createPermioAuthorizationContract();
    const initialized = contract.initialState(
      createConstructorContext(undefined, "00".repeat(32)),
      envelope.targetNetworkHash,
      envelope.namespaceHash,
      envelope.governancePolicyHash,
      governance.authority.root,
      envelope.authorityRootVersion,
      envelope.authorityRootSequence,
      { field: 0n },
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
      1_800_000_100,
    );
    const proposal = moduleProposal(
      input.proofModuleBindings.bindings[0]!,
      envelope,
    );
    context = activateFixtureModule(contract, context, governance, proposal);
    const bindingTree = buildProofModuleBindingTree(artifact.bindings);
    const activationSignature = signActivationAdmissionEnvelope(
      envelope,
      activatorSecret,
      241n,
    );
    const begun = contract.circuits.beginM4Activation(
      context,
      envelope,
      activationSignature,
      activator,
      governance.authority.pathFor(
        pureCircuits.governanceActivatorLeafCommitment(activator),
      ),
    );
    context = contract.circuits.stageM4ActivationBinding(
      begun.context,
      begun.result,
      bindingTree.compactBindingAt(0),
      bindingTree.pathFor(0),
    ).context;
    const finalized = contract.circuits.finalizeM4Activation(
      context,
      envelope,
      activationSignature,
      activator,
      governance.authority.pathFor(
        pureCircuits.governanceActivatorLeafCommitment(activator),
      ),
    );
    context = finalized.context;
    assert.equal(finalized.result.activated, true);

    const rotatedActivator: GovernanceActivatorLeaf = {
      ...activator,
      publicKey: governanceActivatorPublicKey(31n),
    };
    const rotatedGovernance = moduleGovernance(rotatedActivator);
    const rootUpdate: AuthorityRootUpdateCommand = {
      commandVersion: 1n,
      namespaceHash: envelope.namespaceHash,
      currentGovernancePolicyHash: envelope.governancePolicyHash,
      currentRoot: governance.authority.root,
      currentRootVersion: envelope.authorityRootVersion,
      currentRootSequence: envelope.authorityRootSequence,
      nextGovernancePolicyHash: envelope.governancePolicyHash,
      nextRoot: rotatedGovernance.authority.root,
      nextRootVersion: envelope.authorityRootVersion + 1n,
      nextRootSequence: envelope.authorityRootSequence + 1n,
      nextModuleReviewThreshold: 2n,
      nextModuleApprovalThreshold: 2n,
      nextAuthorityRootUpdateThreshold: 2n,
      effectiveAt: 1_800_000_000n,
      updateNonce: new Uint8Array(32).fill(201),
    };
    const skippedSequence = {
      ...rootUpdate,
      nextRootSequence: rootUpdate.nextRootSequence + 1n,
      updateNonce: new Uint8Array(32).fill(202),
    };
    const governor = governance.rootGovernorOne;
    const governorPath = governance.authority.pathFor(pureCircuits.governanceActivatorLeafCommitment(governor));
    const rootSignature = signAuthorityRootUpdateCommand(rootUpdate, governance.rootGovernorOneSecret, 251n);
    const originalState = context.currentQueryContext.state.state.encode();
    for (const [field, value] of Object.entries(rootUpdate)) {
      const replacement = value instanceof Uint8Array
        ? Uint8Array.from(value, (byte, index) => index === 0 ? byte ^ 1 : byte)
        : typeof value === "bigint" ? value + 1n : { field: value.field + 1n };
      const altered = { ...rootUpdate, [field]: replacement };
      assert.notEqual(pureCircuits.authorityRootUpdateSignatureChallenge(rootSignature.announcement, governor.publicKey, altered),
        pureCircuits.authorityRootUpdateSignatureChallenge(rootSignature.announcement, governor.publicKey, rootUpdate), field);
      assert.throws(() => governanceCircuitOperations(contract).submitAuthorityRootApproval(
        context, altered, rootSignature, governor, governorPath),
      /Unsupported authority-root update version|No authority root|exact current root|advance exactly once|signature/iu, field);
      assert.deepEqual(context.currentQueryContext.state.state.encode(), originalState);
    }
    for (const field of ["nextModuleReviewThreshold", "nextModuleApprovalThreshold", "nextAuthorityRootUpdateThreshold"] as const) {
      const invalid = { ...rootUpdate, [field]: 1n };
      assert.throws(() => governanceCircuitOperations(contract).submitAuthorityRootApproval(context, invalid,
        signAuthorityRootUpdateCommand(invalid, governance.rootGovernorOneSecret, 253n), governor, governorPath),
      /thresholds must be at least two/, field);
      assert.deepEqual(context.currentQueryContext.state.state.encode(), originalState);
    }
    for (const [ineligible, secret] of [[activator, activatorSecret],
      [governance.reviewerOne, governance.reviewerOneSecret],
      [governance.moduleActivator, governance.moduleActivatorSecret]] as const) {
      assert.throws(() => governanceCircuitOperations(contract).submitAuthorityRootApproval(context, rootUpdate,
        signAuthorityRootUpdateCommand(rootUpdate, secret, 255n), ineligible,
        governance.authority.pathFor(pureCircuits.governanceActivatorLeafCommitment(ineligible))), /outside the update scope/);
      assert.deepEqual(context.currentQueryContext.state.state.encode(), originalState);
    }
    assert.throws(
      () =>
        governanceCircuitOperations(contract).submitAuthorityRootApproval(
          context,
          skippedSequence,
          signAuthorityRootUpdateCommand(
            skippedSequence,
            governance.rootGovernorOneSecret,
            251n,
          ),
          governance.rootGovernorOne,
          governance.authority.pathFor(
            pureCircuits.governanceActivatorLeafCommitment(
              governance.rootGovernorOne,
            ),
          ),
        ),
      /advance exactly once/,
    );
    assert.throws(
      () =>
        governanceCircuitOperations(contract).submitAuthorityRootApproval(
          context,
          rootUpdate,
          signAuthorityRootUpdateCommand(rootUpdate, activatorSecret, 257n),
          activator,
          governance.authority.pathFor(
            pureCircuits.governanceActivatorLeafCommitment(activator),
          ),
        ),
      /outside the update scope/,
    );
    const firstRootApproval = governanceCircuitOperations(contract).submitAuthorityRootApproval(
      context,
      rootUpdate,
      signAuthorityRootUpdateCommand(
        rootUpdate,
        governance.rootGovernorOneSecret,
        263n,
      ),
      governance.rootGovernorOne,
      governance.authority.pathFor(
        pureCircuits.governanceActivatorLeafCommitment(
          governance.rootGovernorOne,
        ),
      ),
    );
    context = firstRootApproval.context;
    assert.equal(firstRootApproval.result, 1n);
    assert.equal(
      ledger(context.currentQueryContext.state).authorityRoots.lookup(
        envelope.namespaceHash,
      ).rootVersion,
      1n,
    );
    assert.throws(
      () =>
        governanceCircuitOperations(contract).submitAuthorityRootApproval(
          context,
          rootUpdate,
          signAuthorityRootUpdateCommand(
            rootUpdate,
            governance.rootGovernorOneSecret,
            269n,
          ),
          governance.rootGovernorOne,
          governance.authority.pathFor(
            pureCircuits.governanceActivatorLeafCommitment(
              governance.rootGovernorOne,
            ),
          ),
        ),
      /Duplicate authority-root governor approval/,
    );
    const secondRootApproval = governanceCircuitOperations(contract).submitAuthorityRootApproval(
      context,
      rootUpdate,
      signAuthorityRootUpdateCommand(
        rootUpdate,
        governance.rootGovernorTwoSecret,
        271n,
      ),
      governance.rootGovernorTwo,
      governance.authority.pathFor(
        pureCircuits.governanceActivatorLeafCommitment(
          governance.rootGovernorTwo,
        ),
      ),
    );
    context = secondRootApproval.context;
    assert.equal(secondRootApproval.result, 2n);
    let state = ledger(context.currentQueryContext.state);
    const rotatedRoot = state.authorityRoots.lookup(envelope.namespaceHash);
    assert.equal(rotatedRoot.rootVersion, 2n);
    assert.equal(rotatedRoot.rootSequence, 8n);
    assert.equal(rotatedRoot.root.field, rotatedGovernance.authority.root.field);
    assert.equal(state.authorityRootUpdateProgress.size(), 0n);
    assert.equal(state.authorityRootUpdateApprovals.size(), 2n);
    assert.throws(
      () =>
        governanceCircuitOperations(contract).submitAuthorityRootApproval(
          context,
          rootUpdate,
          signAuthorityRootUpdateCommand(
            rootUpdate,
            governance.rootGovernorTwoSecret,
            277n,
          ),
          governance.rootGovernorTwo,
          governance.authority.pathFor(
            pureCircuits.governanceActivatorLeafCommitment(
              governance.rootGovernorTwo,
            ),
          ),
        ),
      /exact current root/,
    );

    const moduleKey = pureCircuits.proofModuleRegistryKeyFromIdentity(
      proposal.identity,
    );
    let moduleRecord = state.proofModules.lookup(moduleKey);
    const moduleDeprecation: ProofModuleLifecycleCommand = {
      commandVersion: 1n,
      moduleKey,
      recordCommitment: pureCircuits.proofModuleRecordCommitment(moduleRecord),
      governanceNamespaceHash: envelope.namespaceHash,
      governancePolicyHash: envelope.governancePolicyHash,
      authorityRootVersion: 2n,
      authorityRootSequence: 8n,
      expectedLifecycleStatus: 4n,
      nextLifecycleStatus: 5n,
      effectiveAt: 1_800_000_001n,
      reasonHash: new Uint8Array(32).fill(203),
      commandNonce: new Uint8Array(32).fill(204),
    };
    context = governanceCircuitOperations(contract).governProofModule(
      context,
      moduleDeprecation,
      signProofModuleLifecycleCommand(
        moduleDeprecation,
        rotatedGovernance.approverSecret,
        281n,
      ),
      rotatedGovernance.approver,
      rotatedGovernance.authority.pathFor(
        pureCircuits.governanceActivatorLeafCommitment(
          rotatedGovernance.approver,
        ),
      ),
    ).context;
    moduleRecord = ledger(context.currentQueryContext.state).proofModules.lookup(
      moduleKey,
    );
    assert.equal(moduleRecord.lifecycleStatus, 5n);
    assert.equal(moduleRecord.authorityRootVersion, 1n);

    state = ledger(context.currentQueryContext.state);
    const activeRecord = state.activeTemplates.lookup(
      finalized.result.registryKey,
    );
    const retirement: TemplateLifecycleCommand = {
      commandVersion: 1n,
      registryKey: finalized.result.registryKey,
      recordCommitment: pureCircuits.activeTemplateRecordCommitment(activeRecord),
      namespaceHash: envelope.namespaceHash,
      governancePolicyHash: envelope.governancePolicyHash,
      authorityRootVersion: 2n,
      authorityRootSequence: 8n,
      expectedLifecycleStatus: 1n,
      nextLifecycleStatus: 2n,
      effectiveAt: 1_800_000_002n,
      effectiveSequence: 2n,
      reasonHash: new Uint8Array(32).fill(205),
      commandNonce: new Uint8Array(32).fill(206),
    };
    assert.throws(
      () =>
        contract.circuits.terminateTemplate(
          context,
          retirement,
          signTemplateLifecycleCommand(
            retirement,
            rotatedGovernance.rootGovernorOneSecret,
            283n,
          ),
          rotatedGovernance.rootGovernorOne,
          rotatedGovernance.authority.pathFor(
            pureCircuits.governanceActivatorLeafCommitment(
              rotatedGovernance.rootGovernorOne,
            ),
          ),
        ),
      /outside the required scope/,
    );
    context = contract.circuits.terminateTemplate(
      context,
      retirement,
      signTemplateLifecycleCommand(
        retirement,
        rotatedGovernance.templateRetirerSecret,
        293n,
      ),
      rotatedGovernance.templateRetirer,
      rotatedGovernance.authority.pathFor(
        pureCircuits.governanceActivatorLeafCommitment(
          rotatedGovernance.templateRetirer,
        ),
      ),
    ).context;
    state = ledger(context.currentQueryContext.state);
    const retiredRecord = state.activeTemplates.lookup(
      finalized.result.registryKey,
    );
    assert.equal(retiredRecord.lifecycleStatus, 2n);
    assert.equal(retiredRecord.activationSequence, 1n);
    assert.equal(retiredRecord.activatedAt, envelope.activatedAt);
    assert.equal(retiredRecord.retiredAt, retirement.effectiveAt);
    assert.equal(retiredRecord.terminationEffectiveSequence, 2n);
    assert.deepEqual(retiredRecord.terminationReasonHash, retirement.reasonHash);
    const revocation: TemplateLifecycleCommand = {
      ...retirement,
      recordCommitment:
        pureCircuits.activeTemplateRecordCommitment(retiredRecord),
      expectedLifecycleStatus: 2n,
      nextLifecycleStatus: 3n,
      effectiveAt: 1_800_000_003n,
      effectiveSequence: 3n,
      reasonHash: new Uint8Array(32).fill(207),
      commandNonce: new Uint8Array(32).fill(208),
    };
    assert.throws(
      () =>
        contract.circuits.terminateTemplate(
          context,
          revocation,
          signTemplateLifecycleCommand(
            revocation,
            rotatedGovernance.templateRetirerSecret,
            307n,
          ),
          rotatedGovernance.templateRetirer,
          rotatedGovernance.authority.pathFor(
            pureCircuits.governanceActivatorLeafCommitment(
              rotatedGovernance.templateRetirer,
            ),
          ),
        ),
      /outside the required scope/,
    );
    context = contract.circuits.terminateTemplate(
      context,
      revocation,
      signTemplateLifecycleCommand(
        revocation,
        rotatedGovernance.templateEmergencyRevokerSecret,
        311n,
      ),
      rotatedGovernance.templateEmergencyRevoker,
      rotatedGovernance.authority.pathFor(
        pureCircuits.governanceActivatorLeafCommitment(
          rotatedGovernance.templateEmergencyRevoker,
        ),
      ),
    ).context;
    state = ledger(context.currentQueryContext.state);
    const revokedRecord = state.activeTemplates.lookup(
      finalized.result.registryKey,
    );
    assert.equal(revokedRecord.lifecycleStatus, 3n);
    assert.equal(revokedRecord.activationSequence, 1n);
    assert.equal(revokedRecord.retiredAt, retirement.effectiveAt);
    assert.equal(revokedRecord.revokedAt, revocation.effectiveAt);
    assert.equal(revokedRecord.terminationEffectiveSequence, 3n);
    assert.deepEqual(revokedRecord.terminationReasonHash, revocation.reasonHash);
    assert.equal(state.templateActivationSequence, 1n);
    assert.equal(state.templateLifecycleSequence, 3n);
    assert.equal(state.usedTemplateLifecycleCommandNonces.size(), 2n);
  });
});
