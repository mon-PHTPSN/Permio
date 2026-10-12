import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { hashScenarioTemplate, parseScenarioTemplate } from "@permio/scenario-domain";
import type {
  ActivationRecord,
  ReviewerAttestation,
  TemplateRecord,
} from "@permio/scenario-governance";

import {
  createActivationAdmissionArtifact,
  createPermioAuthorizationContract,
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
  toCompactProofModuleProposal,
  type ActivationAdmissionInput,
  type ProofModuleBindingManifest,
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

function fixture() {
  const value = template();
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

function activateFixtureModule(
  contract: ReturnType<typeof createPermioAuthorizationContract>,
  context: CircuitContext<undefined>,
  governance: ReturnType<typeof moduleGovernance>,
  proposal: ReturnType<typeof moduleProposal>,
): CircuitContext<undefined> {
  const proposed = contract.circuits.proposeProofModule(context, proposal);
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
    nextContext = contract.circuits.reviewProofModule(
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
  const firstApprovalResult = contract.circuits.governProofModule(
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
  const secondApprovalResult = contract.circuits.governProofModule(
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
  return contract.circuits.governProofModule(
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
    const proposed = contract.circuits.proposeProofModule(context, proposal);
    context = proposed.context;
    assert.throws(
      () => contract.circuits.proposeProofModule(context, proposal),
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
    const first = contract.circuits.reviewProofModule(
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
        contract.circuits.reviewProofModule(
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
        contract.circuits.governProofModule(
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
    const second = contract.circuits.reviewProofModule(
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
    const firstApprovalResult = contract.circuits.governProofModule(
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
        contract.circuits.governProofModule(
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
        contract.circuits.governProofModule(
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
    const secondApprovalResult = contract.circuits.governProofModule(
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
        contract.circuits.governProofModule(
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
    context = contract.circuits.governProofModule(
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
    context = contract.circuits.governProofModule(
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
    context = contract.circuits.governProofModule(
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
    assert.throws(
      () =>
        contract.circuits.submitAuthorityRootApproval(
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
        contract.circuits.submitAuthorityRootApproval(
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
    const firstRootApproval = contract.circuits.submitAuthorityRootApproval(
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
        contract.circuits.submitAuthorityRootApproval(
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
    const secondRootApproval = contract.circuits.submitAuthorityRootApproval(
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
        contract.circuits.submitAuthorityRootApproval(
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
    context = contract.circuits.governProofModule(
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
