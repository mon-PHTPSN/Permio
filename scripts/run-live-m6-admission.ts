import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { parseScenarioTemplate } from "@permio/scenario-domain";
import {
  createReviewerAttestation,
  ScenarioGovernanceRegistry,
  type NamespacePolicy,
} from "@permio/scenario-governance";
import {
  buildAuthorityRoot,
  buildProofModuleBindingTree,
  connectPermioAuthorizationContract,
  createActivationAdmissionArtifact,
  createRuntimeAccountCredential,
  createRuntimeCredentialStatusCommand,
  CredentialStatusTree,
  createFundedLocalWallet,
  createLocalAuthorizationProviders,
  deployPermioAuthorizationContract,
  governanceActivatorPublicKey,
  hashApprovalEvidence,
  hashNamespacePolicy,
  hashProtocolIdentifier,
  MIDNIGHT_AUTHORITY_KINDS,
  permioAuthorizationPureCircuits as pureCircuits,
  readPermioAuthorizationLedger as ledger,
  signActivationAdmissionEnvelope,
  signAuthorityRootUpdateCommand,
  signProofModuleLifecycleCommand,
  signProofModuleReview,
  signRuntimeCredentialStatusCommand,
  signTemplateLifecycleCommand,
  toCompactActivationAdmissionEnvelope,
  toCompactProofModuleProposal,
  type ProofModuleBindingManifest,
  type AuthorityRootUpdateCommand,
  type GovernanceActivatorLeaf,
  type ProofModuleLifecycleCommand,
  type ProofModuleReview,
  type TemplateLifecycleCommand,
} from "@permio/midnight-authorization";

interface LocalAccountFile {
  readonly accounts: readonly {
    readonly mnemonic: string;
  }[];
}

function hexBytes(value: `0x${string}`): Uint8Array {
  return Uint8Array.from(Buffer.from(value.slice(2), "hex"));
}

function milestone(event: string, evidence: Readonly<Record<string, unknown>>): void {
  process.stdout.write(
    `${JSON.stringify({ timestamp: new Date().toISOString(), event, ...evidence })}\n`,
  );
}

function createM4Activation() {
  const reviewerOne = generateKeyPairSync("ed25519");
  const reviewerTwo = generateKeyPairSync("ed25519");
  const publicKey = (key: typeof reviewerOne.publicKey) =>
    key.export({ type: "spki", format: "pem" }).toString();
  const policy: NamespacePolicy = {
    namespace: "org.permio.live",
    impact: "high",
    reviewThreshold: 2,
    authors: [{ principalId: "author-one", kind: "human" }],
    reviewers: [
      {
        principalId: "reviewer-one",
        kind: "human",
        publicKeyPem: publicKey(reviewerOne.publicKey),
      },
      {
        principalId: "reviewer-two",
        kind: "human",
        publicKeyPem: publicKey(reviewerTwo.publicKey),
      },
    ],
    governanceAuthorities: [
      { principalId: "governance-one", kind: "organization" },
    ],
    allocators: [{ principalId: "allocator-one", kind: "service" }],
    emergencyRevokers: [
      { principalId: "emergency-one", kind: "organization" },
    ],
  };
  const template = parseScenarioTemplate({
    schemaVersion: 1,
    namespace: policy.namespace,
    templateId: "org.permio.live/context-action",
    version: "1.0.0",
    displayName: "Context-bound action",
    description: "A neutral live-test template for one context-bound action.",
    participantSlots: [
      {
        id: "requester",
        description: "Requests the action.",
        assignableBy: ["@instance-creator"],
      },
      {
        id: "recipient",
        description: "Receives the minimum result.",
        assignableBy: ["@namespace-governance"],
      },
    ],
    contexts: [
      {
        id: "bounded-context",
        description: "A recipient- and purpose-bound context.",
        allowedSlotIds: ["requester", "recipient"],
        recordTypes: ["source-record"],
        claimTypes: ["eligible"],
        recipientKinds: ["named-recipient"],
        purposes: ["bounded-purpose"],
      },
    ],
    states: ["ready", "completed"],
    initialState: "ready",
    actions: [
      {
        id: "perform-action",
        description: "Performs one recipient-bound action.",
        contextId: "bounded-context",
        actorSlotId: "requester",
        inputRecordTypes: ["source-record"],
        outputClaimTypes: ["eligible"],
        purpose: "bounded-purpose",
        recipientKind: "named-recipient",
        capabilityRuleId: "perform-capability",
        proofProfileId: "delegated-action-proof",
        executionAdapterId: null,
      },
    ],
    transitions: [
      {
        id: "complete",
        fromState: "ready",
        actionId: "perform-action",
        toState: "completed",
      },
    ],
    capabilityRules: [
      {
        id: "perform-capability",
        description: "Allows the exact recipient-bound action.",
        actionIds: ["perform-action"],
        resourceSelector: "selected-record",
        purpose: "bounded-purpose",
        recipientConstraint: "named-recipient",
        validForSeconds: 900,
        maxDelegationDepth: 1,
        disclosurePolicyId: "minimum-result",
        revocable: true,
      },
    ],
    proofProfiles: [
      {
        id: "delegated-action-proof",
        circuitId: "delegated-capability-action-v1",
        publicOutputSchemaId: "decision-receipt-v1",
      },
    ],
    executionAdapters: [],
    privacyInvariants: [
      {
        id: "recipient-bound",
        description: "The result cannot be widened to another recipient.",
      },
    ],
  });
  const registry = new ScenarioGovernanceRegistry([policy]);
  const draft = registry.createDraft("author-one", template, 1_790_000_000);
  registry.recordValidation(
    "author-one",
    draft.target,
    { toolId: "permio-validator", toolVersion: "1.0.0", findings: [] },
    1_790_000_001,
  );
  registry.submitForReview("author-one", draft.target, 1_790_000_002);
  const review = (
    reviewerId: string,
    privateKey: typeof reviewerOne.privateKey,
    reviewedAt: number,
  ) =>
    createReviewerAttestation(
      {
        attestationVersion: 1,
        ...draft.target,
        reviewerId,
        decision: "approve",
        reviewedAt,
      },
      privateKey,
    );
  registry.submitReview(review("reviewer-one", reviewerOne.privateKey, 1_790_000_003));
  registry.submitReview(review("reviewer-two", reviewerTwo.privateKey, 1_790_000_004));
  const activation = registry.activate(
    "governance-one",
    draft.target,
    1_790_000_005,
  );
  const record = registry.getTemplate(draft.target);
  const bindings: ProofModuleBindingManifest = {
    manifestVersion: 1,
    bindings: [
      {
        actionId: "perform-action",
        proofProfileId: "delegated-action-proof",
        moduleId: "delegated-capability-action",
        moduleVersion: "1.0.0",
        implementationHash: `0x${"11".repeat(32)}`,
        configurationHash: `0x${"22".repeat(32)}`,
        receiptSchemaHash: `0x${"33".repeat(32)}`,
      },
    ],
  };
  return { activation, bindings, policy, record };
}

async function main(): Promise<void> {
  const accountFilePath = path.resolve(
    process.argv[2] ?? "../midnight-local-dev/accounts.example.json",
  );
  const accountFile = JSON.parse(
    await readFile(accountFilePath, "utf8"),
  ) as LocalAccountFile;
  const mnemonic = accountFile.accounts[0]?.mnemonic;
  assert(mnemonic, "local account file must contain one funded account");

  const m4 = createM4Activation();
  const governancePolicyHash = hashNamespacePolicy(m4.policy);
  const namespaceHash = hashProtocolIdentifier("namespace", m4.activation.namespace);
  const networkHash = hashProtocolIdentifier("network-id", "undeployed");
  const activatorSecret = 29n;
  const activator: GovernanceActivatorLeaf = {
    leafVersion: 1n,
    namespaceHash: hexBytes(namespaceHash),
    governancePolicyHash: hexBytes(governancePolicyHash),
    authorityKind: 3n,
    publicKey: governanceActivatorPublicKey(activatorSecret),
    validAfter: 1_700_000_000n,
    validBefore: 2_000_000_000n,
  };
  const activatorCommitment =
    pureCircuits.governanceActivatorLeafCommitment(activator);
  const moduleReviewerOneSecret = 101n;
  const moduleReviewerTwoSecret = 103n;
  const moduleApproverSecret = 107n;
  const moduleApproverTwoSecret = 127n;
  const moduleActivatorSecret = 109n;
  const moduleEmergencyRevokerSecret = 113n;
  const rootGovernorOneSecret = 149n;
  const rootGovernorTwoSecret = 151n;
  const templateRetirerSecret = 157n;
  const templateEmergencyRevokerSecret = 163n;
  const rotatedActivatorSecret = 167n;
  const capabilityIssuerSecret = 173n;
  const moduleAuthority = (
    authorityKind: bigint,
    secret: bigint,
  ): GovernanceActivatorLeaf => ({
    leafVersion: 1n,
    namespaceHash: hexBytes(namespaceHash),
    governancePolicyHash: hexBytes(governancePolicyHash),
    authorityKind,
    publicKey: governanceActivatorPublicKey(secret),
    validAfter: 1_700_000_000n,
    validBefore: 2_000_000_000n,
  });
  const moduleReviewerOne = moduleAuthority(
    MIDNIGHT_AUTHORITY_KINDS.proofModuleReviewer,
    moduleReviewerOneSecret,
  );
  const moduleReviewerTwo = moduleAuthority(
    MIDNIGHT_AUTHORITY_KINDS.proofModuleReviewer,
    moduleReviewerTwoSecret,
  );
  const moduleApprover = moduleAuthority(
    MIDNIGHT_AUTHORITY_KINDS.proofModuleApprover,
    moduleApproverSecret,
  );
  const moduleApproverTwo = moduleAuthority(
    MIDNIGHT_AUTHORITY_KINDS.proofModuleApprover,
    moduleApproverTwoSecret,
  );
  const moduleActivator = moduleAuthority(
    MIDNIGHT_AUTHORITY_KINDS.proofModuleActivator,
    moduleActivatorSecret,
  );
  const moduleEmergencyRevoker = moduleAuthority(
    MIDNIGHT_AUTHORITY_KINDS.proofModuleEmergencyRevoker,
    moduleEmergencyRevokerSecret,
  );
  const rootGovernorOne = moduleAuthority(
    MIDNIGHT_AUTHORITY_KINDS.authorityRootGovernor,
    rootGovernorOneSecret,
  );
  const rootGovernorTwo = moduleAuthority(
    MIDNIGHT_AUTHORITY_KINDS.authorityRootGovernor,
    rootGovernorTwoSecret,
  );
  const templateRetirer = moduleAuthority(
    MIDNIGHT_AUTHORITY_KINDS.templateRetirer,
    templateRetirerSecret,
  );
  const templateEmergencyRevoker = moduleAuthority(
    MIDNIGHT_AUTHORITY_KINDS.emergencyRevoker,
    templateEmergencyRevokerSecret,
  );
  const capabilityIssuer = moduleAuthority(
    MIDNIGHT_AUTHORITY_KINDS.capabilityIssuer,
    capabilityIssuerSecret,
  );
  const rotatedActivator: GovernanceActivatorLeaf = {
    ...activator,
    publicKey: governanceActivatorPublicKey(rotatedActivatorSecret),
  };
  const authorityRoot = buildAuthorityRoot([
    activator,
    moduleReviewerOne,
    moduleReviewerTwo,
    moduleApprover,
    moduleApproverTwo,
    moduleActivator,
    moduleEmergencyRevoker,
    rootGovernorOne,
    rootGovernorTwo,
    templateRetirer,
    templateEmergencyRevoker,
    capabilityIssuer,
  ]);
  const rotatedAuthorityRoot = buildAuthorityRoot([
    rotatedActivator,
    moduleReviewerOne,
    moduleReviewerTwo,
    moduleApprover,
    moduleApproverTwo,
    moduleActivator,
    moduleEmergencyRevoker,
    rootGovernorOne,
    rootGovernorTwo,
    templateRetirer,
    templateEmergencyRevoker,
    capabilityIssuer,
  ]);
  const initialBinding = m4.bindings.bindings[0]!;

  const wallet = await createFundedLocalWallet(mnemonic);
  try {
    const providers = createLocalAuthorizationProviders(wallet);
    milestone("local-stack-ready", {
      networkId: "undeployed",
      node: "midnight-node:1.0.0",
      indexer: "indexer-standalone:4.3.3",
      proofServer: "proof-server:8.1.0",
      compiler: "0.31.1",
    });
    const credentialStatus = new CredentialStatusTree();
    const deployed = await deployPermioAuthorizationContract(providers, {
      networkHash: hexBytes(networkHash),
      namespaceHash: hexBytes(namespaceHash),
      governancePolicyHash: hexBytes(governancePolicyHash),
      authorityRoot: authorityRoot.root,
      authorityRootVersion: 1n,
      authorityRootSequence: 1n,
      credentialStatusRoot: credentialStatus.root,
      moduleReviewThreshold: 2n,
      moduleApprovalThreshold: 2n,
      authorityRootUpdateThreshold: 2n,
    });
    const contractAddress = deployed.deployTxData.public.contractAddress;
    milestone("contract-deployed", { contractAddress });

    const connected = await connectPermioAuthorizationContract(
      providers,
      contractAddress,
    );
    const governanceTime = Math.floor(Date.now() / 1_000) - 5;
    const runtimeAccountSecret = 179n;
    const runtimeIdentity = generateKeyPairSync("ed25519");
    const liveInstance = {
      namespace: m4.activation.namespace,
      templateId: m4.activation.templateId,
      templateVersion: m4.activation.templateVersion,
      templateHash: m4.activation.templateHash,
      instanceId: "live-instance-one",
      instantiationRequestId: "live-allocation-one",
      allocatedBy: "allocator-one",
      state: "ready",
      createdAt: governanceTime - 10,
      expiresAt: governanceTime + 7_200,
      revokedAt: null,
      capabilityIssuers: [{ principalId: "capability-issuer-one", kind: "service" as const }],
    };
    const liveAccount = {
      accountId: "live-account-one",
      instanceId: liveInstance.instanceId,
      contextId: "bounded-context",
      kind: "human" as const,
      publicKeyPem: runtimeIdentity.publicKey
        .export({ type: "spki", format: "pem" })
        .toString(),
      registeredAt: governanceTime - 5,
      revokedAt: null,
    };
    const runtimeAccount = createRuntimeAccountCredential({
      account: liveAccount,
      instance: liveInstance,
      runtimePublicKey: governanceActivatorPublicKey(runtimeAccountSecret),
      statusIndex: 7n,
      validBefore: governanceTime + 3_600,
    });
    const runtimeAccountCommitment =
      pureCircuits.runtimeAccountCredentialCommitment(runtimeAccount);
    const issueRuntimeAccount = createRuntimeCredentialStatusCommand({
      namespace: m4.activation.namespace,
      governancePolicyHash,
      authorityRootVersion: 1,
      authorityRootSequence: 1,
      credentialStatusRootSequence: credentialStatus.sequence,
      kind: "account",
      credentialCommitment: runtimeAccountCommitment,
      subjectAccountCredentialCommitment: runtimeAccountCommitment,
      revocationAuthorityAccountCredentialCommitment: runtimeAccountCommitment,
      statusIndex: runtimeAccount.statusIndex,
      expectedStatus: "empty",
      nextStatus: "active",
      effectiveAt: governanceTime,
      commandNonce: `0x${"91".repeat(32)}`,
    });
    const emptyStatusPath = credentialStatus.pathFor(runtimeAccount.statusIndex);
    const issuedRuntimeAccount = await connected.callTx.updateRuntimeCredentialStatus(
      issueRuntimeAccount,
      signRuntimeCredentialStatusCommand(
        issueRuntimeAccount,
        capabilityIssuerSecret,
        181n,
      ),
      capabilityIssuer,
      authorityRoot.pathFor(
        pureCircuits.governanceActivatorLeafCommitment(capabilityIssuer),
      ),
      runtimeAccount,
      emptyStatusPath,
      emptyStatusPath,
    );
    const issuedStatusTransition = credentialStatus.issue({
      namespace: m4.activation.namespace,
      kind: "account",
      credentialCommitment: runtimeAccountCommitment,
      revocationAuthorityAccountCredentialCommitment: runtimeAccountCommitment,
      statusIndex: runtimeAccount.statusIndex,
    });
    let indexedState = await providers.publicDataProvider.queryContractState(
      contractAddress,
    );
    assert(indexedState, "credential-status issuance must be indexed");
    let indexedStatus = ledger(indexedState.data).credentialStatusRoots.lookup(
      hexBytes(namespaceHash),
    );
    assert.equal(indexedStatus.root.field, issuedStatusTransition.nextRoot.field);
    assert.equal(indexedStatus.rootSequence, 1n);
    milestone("runtime-account-status-activated", {
      contractAddress,
      transactionId: issuedRuntimeAccount.public.txId,
      credentialStatusRootSequence: 1,
    });

    const revokeRuntimeAccount = createRuntimeCredentialStatusCommand({
      namespace: m4.activation.namespace,
      governancePolicyHash,
      authorityRootVersion: 1,
      authorityRootSequence: 1,
      credentialStatusRootSequence: credentialStatus.sequence,
      kind: "account",
      credentialCommitment: runtimeAccountCommitment,
      subjectAccountCredentialCommitment: runtimeAccountCommitment,
      revocationAuthorityAccountCredentialCommitment: runtimeAccountCommitment,
      statusIndex: runtimeAccount.statusIndex,
      expectedStatus: "active",
      nextStatus: "revoked",
      effectiveAt: governanceTime,
      commandNonce: `0x${"92".repeat(32)}`,
    });
    const activeStatusPath = credentialStatus.pathFor(runtimeAccount.statusIndex);
    await assert.rejects(
      connected.callTx.updateRuntimeCredentialStatus(
        revokeRuntimeAccount,
        signRuntimeCredentialStatusCommand(revokeRuntimeAccount, 191n, 193n),
        capabilityIssuer,
        authorityRoot.pathFor(
          pureCircuits.governanceActivatorLeafCommitment(capabilityIssuer),
        ),
        runtimeAccount,
        activeStatusPath,
        activeStatusPath,
      ),
      /invalid governance activation signature/i,
    );
    milestone("runtime-account-unauthorized-revocation-rejected", {
      contractAddress,
    });
    const revokedRuntimeAccount = await connected.callTx.updateRuntimeCredentialStatus(
      revokeRuntimeAccount,
      signRuntimeCredentialStatusCommand(
        revokeRuntimeAccount,
        runtimeAccountSecret,
        197n,
      ),
      capabilityIssuer,
      authorityRoot.pathFor(
        pureCircuits.governanceActivatorLeafCommitment(capabilityIssuer),
      ),
      runtimeAccount,
      activeStatusPath,
      activeStatusPath,
    );
    const revokedStatusTransition = credentialStatus.revoke({
      namespace: m4.activation.namespace,
      kind: "account",
      credentialCommitment: runtimeAccountCommitment,
      revocationAuthorityAccountCredentialCommitment: runtimeAccountCommitment,
      statusIndex: runtimeAccount.statusIndex,
    });
    indexedState = await providers.publicDataProvider.queryContractState(contractAddress);
    assert(indexedState, "credential-status revocation must be indexed");
    indexedStatus = ledger(indexedState.data).credentialStatusRoots.lookup(
      hexBytes(namespaceHash),
    );
    assert.equal(indexedStatus.root.field, revokedStatusTransition.nextRoot.field);
    assert.equal(indexedStatus.rootSequence, 2n);
    milestone("runtime-account-status-revoked", {
      contractAddress,
      transactionId: revokedRuntimeAccount.public.txId,
      credentialStatusRootSequence: 2,
    });

    const moduleProposal = toCompactProofModuleProposal({
      moduleId: initialBinding.moduleId,
      moduleVersion: initialBinding.moduleVersion,
      implementationHash: initialBinding.implementationHash,
      governanceNamespaceHash: namespaceHash,
      governancePolicyHash,
      authorityRootVersion: 1,
      authorityRootSequence: 1,
      implementationReferenceHash: hashProtocolIdentifier(
        "contract-identity",
        `${contractAddress}:permio-authorization-v1:test-only-admission-binding`,
      ),
      sourceHash: `0x${"62".repeat(32)}`,
      inputSchemaHash: `0x${"63".repeat(32)}`,
      configurationSchemaHash: `0x${"64".repeat(32)}`,
      receiptSchemaHash: initialBinding.receiptSchemaHash,
      compilerVersionHash: `0x${"65".repeat(32)}`,
      compatibilityPolicyHash: `0x${"66".repeat(32)}`,
      proposedAt: governanceTime,
    });
    const proposed = await connected.callTx.proposeProofModule(moduleProposal);
    const moduleKey = proposed.private.result;
    milestone("test-module-proposed", {
      contractAddress,
      transactionId: proposed.public.txId,
      grantsTrust: false,
    });
    const proposalCommitment =
      pureCircuits.proofModuleProposalCommitment(moduleProposal);
    const liveReviews: readonly [GovernanceActivatorLeaf, bigint, number][] = [
      [moduleReviewerOne, moduleReviewerOneSecret, 1],
      [moduleReviewerTwo, moduleReviewerTwoSecret, 2],
    ];
    for (const [reviewer, secret, index] of liveReviews) {
      const review: ProofModuleReview = {
        reviewVersion: 1n,
        moduleKey,
        proposalCommitment,
        governanceNamespaceHash: hexBytes(namespaceHash),
        governancePolicyHash: hexBytes(governancePolicyHash),
        authorityRootVersion: 1n,
        authorityRootSequence: 1n,
        reviewedAt: BigInt(governanceTime + index),
        reviewNonce: new Uint8Array(32).fill(70 + index),
      };
      const reviewed = await connected.callTx.reviewProofModule(
        review,
        signProofModuleReview(review, secret, 170n + BigInt(index)),
        reviewer,
        authorityRoot.pathFor(
          pureCircuits.governanceActivatorLeafCommitment(reviewer),
        ),
      );
      milestone("test-module-review-recorded", {
        contractAddress,
        transactionId: reviewed.public.txId,
        reviewCount: Number(reviewed.private.result),
      });
    }
    const readModuleRecord = async () => {
      const publicState = await providers.publicDataProvider.queryContractState(
        contractAddress,
      );
      assert(publicState, "proof-module governance state must be indexed");
      return ledger(publicState.data).proofModules.lookup(moduleKey);
    };
    let moduleRecord = await readModuleRecord();
    const approval: ProofModuleLifecycleCommand = {
      commandVersion: 1n,
      moduleKey,
      recordCommitment: pureCircuits.proofModuleRecordCommitment(moduleRecord),
      governanceNamespaceHash: hexBytes(namespaceHash),
      governancePolicyHash: hexBytes(governancePolicyHash),
      authorityRootVersion: 1n,
      authorityRootSequence: 1n,
      expectedLifecycleStatus: 2n,
      nextLifecycleStatus: 3n,
      effectiveAt: BigInt(governanceTime + 3),
      reasonHash: new Uint8Array(32).fill(80),
      commandNonce: new Uint8Array(32).fill(81),
    };
    const firstApproval = await connected.callTx.governProofModule(
      approval,
      signProofModuleLifecycleCommand(approval, moduleApproverSecret, 181n),
      moduleApprover,
      authorityRoot.pathFor(
        pureCircuits.governanceActivatorLeafCommitment(moduleApprover),
      ),
    );
    milestone("test-module-approval-recorded", {
      contractAddress,
      transactionId: firstApproval.public.txId,
      approvalCount: Number(firstApproval.private.result),
      syntheticLocalFixture: true,
    });
    moduleRecord = await readModuleRecord();
    assert.equal(moduleRecord.lifecycleStatus, 2n);
    const prematureActivation: ProofModuleLifecycleCommand = {
      ...approval,
      recordCommitment: pureCircuits.proofModuleRecordCommitment(moduleRecord),
      expectedLifecycleStatus: 2n,
      nextLifecycleStatus: 4n,
      effectiveAt: BigInt(governanceTime + 4),
      reasonHash: new Uint8Array(32).fill(82),
      commandNonce: new Uint8Array(32).fill(83),
    };
    await assert.rejects(
      connected.callTx.governProofModule(
        prematureActivation,
        signProofModuleLifecycleCommand(
          prematureActivation,
          moduleActivatorSecret,
          191n,
        ),
        moduleActivator,
        authorityRoot.pathFor(
          pureCircuits.governanceActivatorLeafCommitment(moduleActivator),
        ),
      ),
      /invalid proof-module activation transition/i,
    );
    milestone("module-activation-before-approval-threshold-rejected", {
      contractAddress,
    });
    const duplicateApproval: ProofModuleLifecycleCommand = {
      ...approval,
      recordCommitment: pureCircuits.proofModuleRecordCommitment(moduleRecord),
      effectiveAt: BigInt(governanceTime + 4),
      commandNonce: new Uint8Array(32).fill(84),
    };
    await assert.rejects(
      connected.callTx.governProofModule(
        duplicateApproval,
        signProofModuleLifecycleCommand(
          duplicateApproval,
          moduleApproverSecret,
          193n,
        ),
        moduleApprover,
        authorityRoot.pathFor(
          pureCircuits.governanceActivatorLeafCommitment(moduleApprover),
        ),
      ),
      /duplicate proof-module approver approval/i,
    );
    milestone("duplicate-module-approval-rejected", { contractAddress });
    const secondApproval: ProofModuleLifecycleCommand = {
      ...approval,
      recordCommitment: pureCircuits.proofModuleRecordCommitment(moduleRecord),
      effectiveAt: BigInt(governanceTime + 4),
      commandNonce: new Uint8Array(32).fill(85),
    };
    const approved = await connected.callTx.governProofModule(
      secondApproval,
      signProofModuleLifecycleCommand(
        secondApproval,
        moduleApproverTwoSecret,
        197n,
      ),
      moduleApproverTwo,
      authorityRoot.pathFor(
        pureCircuits.governanceActivatorLeafCommitment(moduleApproverTwo),
      ),
    );
    milestone("test-module-approved", {
      contractAddress,
      transactionId: approved.public.txId,
      approvalCount: Number(approved.private.result),
      syntheticLocalFixture: true,
    });
    moduleRecord = await readModuleRecord();
    assert.equal(moduleRecord.lifecycleStatus, 3n);
    const moduleActivation: ProofModuleLifecycleCommand = {
      ...secondApproval,
      recordCommitment: pureCircuits.proofModuleRecordCommitment(moduleRecord),
      expectedLifecycleStatus: 3n,
      nextLifecycleStatus: 4n,
      effectiveAt: BigInt(governanceTime + 5),
      reasonHash: new Uint8Array(32).fill(86),
      commandNonce: new Uint8Array(32).fill(87),
    };
    const activatedModule = await connected.callTx.governProofModule(
      moduleActivation,
      signProofModuleLifecycleCommand(
        moduleActivation,
        moduleActivatorSecret,
        199n,
      ),
      moduleActivator,
      authorityRoot.pathFor(
        pureCircuits.governanceActivatorLeafCommitment(moduleActivator),
      ),
    );
    milestone("test-module-activated", {
      contractAddress,
      transactionId: activatedModule.public.txId,
      syntheticLocalFixture: true,
    });
    const approvalEvidenceCommitment = hashApprovalEvidence(
      m4.activation,
      m4.record.reviews,
    );
    const shortExpiry = Math.floor(Date.now() / 1_000) + 90;
    const expiringArtifact = createActivationAdmissionArtifact(m4.record, {
      activation: m4.activation,
      governancePolicyHash,
      proofModuleBindings: m4.bindings,
      proofModuleRegistrySequence: 6,
      approvalEvidenceCommitment,
      authorityRootVersion: 1,
      authorityRootSequence: 1,
      targetNetworkId: "undeployed",
      targetContractIdentity: `0x${contractAddress}`,
      admissionNonce: `0x${"54".repeat(32)}`,
      stagingExpiresAt: shortExpiry,
    });
    const expiringEnvelope = toCompactActivationAdmissionEnvelope(
      expiringArtifact.envelope,
    );
    const expiringSignature = signActivationAdmissionEnvelope(
      expiringEnvelope,
      activatorSecret,
      47n,
    );
    const expiringSession = await connected.callTx.beginM4Activation(
      expiringEnvelope,
      expiringSignature,
      activator,
      authorityRoot.pathFor(activatorCommitment),
    );
    milestone("expiring-staging-opened", {
      contractAddress,
      transactionId: expiringSession.public.txId,
      expiresAt: shortExpiry,
    });
    const waitMilliseconds = Math.max(
      0,
      (shortExpiry - Math.floor(Date.now() / 1_000) + 2) * 1_000,
    );
    let remainingWait = waitMilliseconds;
    while (remainingWait > 0) {
      const interval = Math.min(remainingWait, 30_000);
      await new Promise<void>((resolve) => setTimeout(resolve, interval));
      remainingWait -= interval;
    }
    const artifact = createActivationAdmissionArtifact(m4.record, {
      activation: m4.activation,
      governancePolicyHash,
      proofModuleBindings: m4.bindings,
      proofModuleRegistrySequence: 6,
      approvalEvidenceCommitment,
      authorityRootVersion: 1,
      authorityRootSequence: 1,
      targetNetworkId: "undeployed",
      targetContractIdentity: `0x${contractAddress}`,
      admissionNonce: `0x${"55".repeat(32)}`,
      stagingExpiresAt: Math.floor(Date.now() / 1_000) + 3_600,
    });
    const envelope = toCompactActivationAdmissionEnvelope(artifact.envelope);
    const signature = signActivationAdmissionEnvelope(
      envelope,
      activatorSecret,
      53n,
    );
    const begun = await connected.callTx.beginM4Activation(
      envelope,
      signature,
      activator,
      authorityRoot.pathFor(activatorCommitment),
    );
    const bindingTree = buildProofModuleBindingTree(artifact.bindings);
    milestone("activation-staging-opened", {
      contractAddress,
      transactionId: begun.public.txId,
      bindingCount: artifact.bindings.length,
      expiredPriorSessionCleaned: true,
    });
    for (let index = 0; index < artifact.bindings.length; index += 1) {
      const staged = await connected.callTx.stageM4ActivationBinding(
        begun.private.result,
        bindingTree.compactBindingAt(index),
        bindingTree.pathFor(index),
      );
      milestone("activation-binding-staged", {
        contractAddress,
        transactionId: staged.public.txId,
        actionIndex: index,
      });
    }
    const admitted = await connected.callTx.finalizeM4Activation(
      envelope,
      signature,
      activator,
      authorityRoot.pathFor(activatorCommitment),
    );
    assert.equal(admitted.private.result.activated, true);
    milestone("activation-admitted", {
      contractAddress,
      transactionId: admitted.public.txId,
      templateContentHash: m4.activation.templateHash,
      envelopeHash: artifact.envelopeHash,
      authorityRootVersion: 1,
      authorityRootSequence: 1,
    });

    const state = await providers.publicDataProvider.queryContractState(
      contractAddress,
    );
    assert(state, "finalized contract state must be indexed");
    const indexed = ledger(state.data);
    assert.equal(indexed.activeTemplates.size(), 1n);
    assert.equal(indexed.usedAdmissionNonces.size(), 1n);
    assert.equal(indexed.templateActivationSequence, 1n);
    assert.equal(indexed.activationSessions.size(), 0n);
    assert.equal(indexed.reservedAdmissionNonces.size(), 0n);
    assert.equal(indexed.proofModules.size(), 1n);
    assert.equal(indexed.proofModuleRegistrySequence, 6n);
    milestone("indexed-state-verified", {
      contractAddress,
      activeTemplateCount: Number(indexed.activeTemplates.size()),
      usedAdmissionNonceCount: Number(indexed.usedAdmissionNonces.size()),
      activationSequence: Number(indexed.templateActivationSequence),
      activationSessionCount: Number(indexed.activationSessions.size()),
      reservedAdmissionNonceCount: Number(
        indexed.reservedAdmissionNonces.size(),
      ),
      proofModuleCount: Number(indexed.proofModules.size()),
      proofModuleRegistrySequence: Number(indexed.proofModuleRegistrySequence),
    });

    await assert.rejects(
      connected.callTx.beginM4Activation(
        envelope,
        signature,
        activator,
        authorityRoot.pathFor(activatorCommitment),
      ),
      /nonce already used/i,
    );
    milestone("replay-rejected", { contractAddress });

    const reconnected = await connectPermioAuthorizationContract(
      providers,
      contractAddress,
    );
    assert.equal(
      reconnected.deployTxData.public.contractAddress,
      contractAddress,
    );
    const reconnectedState = await providers.publicDataProvider.queryContractState(
      contractAddress,
    );
    assert(reconnectedState, "reconnected contract state must remain indexed");
    const afterReconnect = ledger(reconnectedState.data);
    assert.equal(afterReconnect.activeTemplates.size(), 1n);
    assert.equal(afterReconnect.templateActivationSequence, 1n);
    milestone("reconnect-verified", {
      contractAddress,
      activeTemplateCount: Number(afterReconnect.activeTemplates.size()),
      activationSequence: Number(afterReconnect.templateActivationSequence),
    });

    const rootUpdateTime = BigInt(Math.floor(Date.now() / 1_000) - 1);
    const rootUpdate: AuthorityRootUpdateCommand = {
      commandVersion: 1n,
      namespaceHash: hexBytes(namespaceHash),
      currentGovernancePolicyHash: hexBytes(governancePolicyHash),
      currentRoot: authorityRoot.root,
      currentRootVersion: 1n,
      currentRootSequence: 1n,
      nextGovernancePolicyHash: hexBytes(governancePolicyHash),
      nextRoot: rotatedAuthorityRoot.root,
      nextRootVersion: 2n,
      nextRootSequence: 2n,
      nextModuleReviewThreshold: 2n,
      nextModuleApprovalThreshold: 2n,
      nextAuthorityRootUpdateThreshold: 2n,
      effectiveAt: rootUpdateTime,
      updateNonce: new Uint8Array(32).fill(92),
    };
    await assert.rejects(
      connected.callTx.submitAuthorityRootApproval(
        rootUpdate,
        signAuthorityRootUpdateCommand(rootUpdate, activatorSecret, 233n),
        activator,
        authorityRoot.pathFor(activatorCommitment),
      ),
      /outside the update scope/i,
    );
    milestone("authority-root-privilege-collapse-rejected", { contractAddress });
    const firstRootApproval = await connected.callTx.submitAuthorityRootApproval(
      rootUpdate,
      signAuthorityRootUpdateCommand(
        rootUpdate,
        rootGovernorOneSecret,
        239n,
      ),
      rootGovernorOne,
      authorityRoot.pathFor(
        pureCircuits.governanceActivatorLeafCommitment(rootGovernorOne),
      ),
    );
    assert.equal(firstRootApproval.private.result, 1n);
    milestone("authority-root-approval-recorded", {
      contractAddress,
      transactionId: firstRootApproval.public.txId,
      approvalCount: 1,
      rootChanged: false,
    });
    await assert.rejects(
      connected.callTx.submitAuthorityRootApproval(
        rootUpdate,
        signAuthorityRootUpdateCommand(
          rootUpdate,
          rootGovernorOneSecret,
          241n,
        ),
        rootGovernorOne,
        authorityRoot.pathFor(
          pureCircuits.governanceActivatorLeafCommitment(rootGovernorOne),
        ),
      ),
      /duplicate authority-root governor approval/i,
    );
    milestone("duplicate-authority-root-approval-rejected", { contractAddress });
    const rotatedRoot = await connected.callTx.submitAuthorityRootApproval(
      rootUpdate,
      signAuthorityRootUpdateCommand(
        rootUpdate,
        rootGovernorTwoSecret,
        251n,
      ),
      rootGovernorTwo,
      authorityRoot.pathFor(
        pureCircuits.governanceActivatorLeafCommitment(rootGovernorTwo),
      ),
    );
    assert.equal(rotatedRoot.private.result, 2n);
    milestone("authority-root-rotated", {
      contractAddress,
      transactionId: rotatedRoot.public.txId,
      approvalCount: 2,
      rootVersion: 2,
      rootSequence: 2,
    });

    moduleRecord = await readModuleRecord();
    const deprecation: ProofModuleLifecycleCommand = {
      ...moduleActivation,
      recordCommitment: pureCircuits.proofModuleRecordCommitment(moduleRecord),
      expectedLifecycleStatus: 4n,
      nextLifecycleStatus: 5n,
      governancePolicyHash: hexBytes(governancePolicyHash),
      authorityRootVersion: 2n,
      authorityRootSequence: 2n,
      effectiveAt: BigInt(Math.floor(Date.now() / 1_000) - 1),
      reasonHash: new Uint8Array(32).fill(88),
      commandNonce: new Uint8Array(32).fill(89),
    };
    await assert.rejects(
      connected.callTx.governProofModule(
        deprecation,
        signProofModuleLifecycleCommand(
          deprecation,
          moduleActivatorSecret,
          211n,
        ),
        moduleActivator,
        rotatedAuthorityRoot.pathFor(
          pureCircuits.governanceActivatorLeafCommitment(moduleActivator),
        ),
      ),
      /outside the required scope/,
    );
    milestone("module-deprecation-privilege-collapse-rejected", {
      contractAddress,
    });
    const deprecated = await connected.callTx.governProofModule(
      deprecation,
      signProofModuleLifecycleCommand(
        deprecation,
        moduleApproverSecret,
        223n,
      ),
      moduleApprover,
      rotatedAuthorityRoot.pathFor(
        pureCircuits.governanceActivatorLeafCommitment(moduleApprover),
      ),
    );
    milestone("test-module-deprecated", {
      contractAddress,
      transactionId: deprecated.public.txId,
      prospective: true,
    });
    moduleRecord = await readModuleRecord();
    const revocation: ProofModuleLifecycleCommand = {
      ...deprecation,
      recordCommitment: pureCircuits.proofModuleRecordCommitment(moduleRecord),
      expectedLifecycleStatus: 5n,
      nextLifecycleStatus: 6n,
      effectiveAt: BigInt(Math.floor(Date.now() / 1_000) - 1),
      reasonHash: new Uint8Array(32).fill(90),
      commandNonce: new Uint8Array(32).fill(91),
    };
    await assert.rejects(
      connected.callTx.governProofModule(
        revocation,
        signProofModuleLifecycleCommand(
          revocation,
          moduleApproverSecret,
          227n,
        ),
        moduleApprover,
        rotatedAuthorityRoot.pathFor(
          pureCircuits.governanceActivatorLeafCommitment(moduleApprover),
        ),
      ),
      /outside the required scope/,
    );
    milestone("module-revocation-privilege-collapse-rejected", {
      contractAddress,
    });
    const revoked = await connected.callTx.governProofModule(
      revocation,
      signProofModuleLifecycleCommand(
        revocation,
        moduleEmergencyRevokerSecret,
        229n,
      ),
      moduleEmergencyRevoker,
      rotatedAuthorityRoot.pathFor(
        pureCircuits.governanceActivatorLeafCommitment(
          moduleEmergencyRevoker,
        ),
      ),
    );
    milestone("test-module-revoked", {
      contractAddress,
      transactionId: revoked.public.txId,
      prospective: true,
    });

    const templateStateBeforeRetirement =
      await providers.publicDataProvider.queryContractState(contractAddress);
    assert(
      templateStateBeforeRetirement,
      "active template state must be indexed before retirement",
    );
    const activeTemplate = ledger(
      templateStateBeforeRetirement.data,
    ).activeTemplates.lookup(admitted.private.result.registryKey);
    const retirement: TemplateLifecycleCommand = {
      commandVersion: 1n,
      registryKey: admitted.private.result.registryKey,
      recordCommitment:
        pureCircuits.activeTemplateRecordCommitment(activeTemplate),
      namespaceHash: hexBytes(namespaceHash),
      governancePolicyHash: hexBytes(governancePolicyHash),
      authorityRootVersion: 2n,
      authorityRootSequence: 2n,
      expectedLifecycleStatus: 1n,
      nextLifecycleStatus: 2n,
      effectiveAt: BigInt(Math.floor(Date.now() / 1_000) - 1),
      effectiveSequence: 2n,
      reasonHash: new Uint8Array(32).fill(93),
      commandNonce: new Uint8Array(32).fill(94),
    };
    await assert.rejects(
      connected.callTx.terminateTemplate(
        retirement,
        signTemplateLifecycleCommand(
          retirement,
          rootGovernorOneSecret,
          313n,
        ),
        rootGovernorOne,
        rotatedAuthorityRoot.pathFor(
          pureCircuits.governanceActivatorLeafCommitment(rootGovernorOne),
        ),
      ),
      /outside the required scope/,
    );
    milestone("template-retirement-privilege-collapse-rejected", {
      contractAddress,
    });
    const retired = await connected.callTx.terminateTemplate(
      retirement,
      signTemplateLifecycleCommand(retirement, templateRetirerSecret, 317n),
      templateRetirer,
      rotatedAuthorityRoot.pathFor(
        pureCircuits.governanceActivatorLeafCommitment(templateRetirer),
      ),
    );
    milestone("template-retired", {
      contractAddress,
      transactionId: retired.public.txId,
      lifecycleStatus: 2,
      prospective: true,
    });

    const templateStateAfterRetirement =
      await providers.publicDataProvider.queryContractState(contractAddress);
    assert(
      templateStateAfterRetirement,
      "retired template state must be indexed",
    );
    const retiredTemplate = ledger(
      templateStateAfterRetirement.data,
    ).activeTemplates.lookup(admitted.private.result.registryKey);
    assert.equal(retiredTemplate.lifecycleStatus, 2n);
    assert.equal(retiredTemplate.activationSequence, 1n);
    assert.equal(retiredTemplate.activatedAt, activeTemplate.activatedAt);
    assert.equal(retiredTemplate.retiredAt, retirement.effectiveAt);
    assert.equal(retiredTemplate.terminationEffectiveSequence, 2n);

    const templateRevocation: TemplateLifecycleCommand = {
      ...retirement,
      recordCommitment:
        pureCircuits.activeTemplateRecordCommitment(retiredTemplate),
      expectedLifecycleStatus: 2n,
      nextLifecycleStatus: 3n,
      effectiveAt: BigInt(Math.floor(Date.now() / 1_000) - 1),
      effectiveSequence: 3n,
      reasonHash: new Uint8Array(32).fill(95),
      commandNonce: new Uint8Array(32).fill(96),
    };
    await assert.rejects(
      connected.callTx.terminateTemplate(
        templateRevocation,
        signTemplateLifecycleCommand(
          templateRevocation,
          templateRetirerSecret,
          331n,
        ),
        templateRetirer,
        rotatedAuthorityRoot.pathFor(
          pureCircuits.governanceActivatorLeafCommitment(templateRetirer),
        ),
      ),
      /outside the required scope/,
    );
    milestone("template-revocation-privilege-collapse-rejected", {
      contractAddress,
    });
    const templateRevoked = await connected.callTx.terminateTemplate(
      templateRevocation,
      signTemplateLifecycleCommand(
        templateRevocation,
        templateEmergencyRevokerSecret,
        337n,
      ),
      templateEmergencyRevoker,
      rotatedAuthorityRoot.pathFor(
        pureCircuits.governanceActivatorLeafCommitment(
          templateEmergencyRevoker,
        ),
      ),
    );
    milestone("template-revoked", {
      contractAddress,
      transactionId: templateRevoked.public.txId,
      lifecycleStatus: 3,
      prospective: true,
    });

    const finalPublicState = await providers.publicDataProvider.queryContractState(
      contractAddress,
    );
    assert(finalPublicState, "final governance state must remain indexed");
    const finalLedger = ledger(finalPublicState.data);
    const finalModule = finalLedger.proofModules.lookup(moduleKey);
    const finalTemplate = finalLedger.activeTemplates.lookup(
      admitted.private.result.registryKey,
    );
    const finalAuthorityRoot = finalLedger.authorityRoots.lookup(
      hexBytes(namespaceHash),
    );
    assert.equal(finalModule.lifecycleStatus, 6n);
    assert.equal(finalTemplate.lifecycleStatus, 3n);
    assert.equal(finalTemplate.activationSequence, 1n);
    assert.equal(finalTemplate.activatedAt, activeTemplate.activatedAt);
    assert.equal(finalTemplate.retiredAt, retirement.effectiveAt);
    assert.equal(finalTemplate.revokedAt, templateRevocation.effectiveAt);
    assert.equal(finalTemplate.terminationEffectiveSequence, 3n);
    assert.equal(finalLedger.activeTemplates.size(), 1n);
    assert.equal(finalLedger.templateActivationSequence, 1n);
    assert.equal(finalLedger.templateLifecycleSequence, 3n);
    assert.equal(finalLedger.usedTemplateLifecycleCommandNonces.size(), 2n);
    assert.equal(finalLedger.proofModuleRegistrySequence, 8n);
    assert.equal(finalAuthorityRoot.rootVersion, 2n);
    assert.equal(finalAuthorityRoot.rootSequence, 2n);
    assert.equal(finalLedger.authorityRootUpdateApprovals.size(), 2n);
    assert.equal(finalLedger.authorityRootUpdateProgress.size(), 0n);
    milestone("final-governance-state-verified", {
      contractAddress,
      proofModuleLifecycleStatus: Number(finalModule.lifecycleStatus),
      proofModuleRegistrySequence: Number(
        finalLedger.proofModuleRegistrySequence,
      ),
      templateLifecycleStatus: Number(finalTemplate.lifecycleStatus),
      templateActivationSequence: Number(
        finalLedger.templateActivationSequence,
      ),
      templateLifecycleSequence: Number(finalLedger.templateLifecycleSequence),
      usedTemplateLifecycleCommandNonceCount: Number(
        finalLedger.usedTemplateLifecycleCommandNonces.size(),
      ),
      authorityRootVersion: Number(finalAuthorityRoot.rootVersion),
      authorityRootSequence: Number(finalAuthorityRoot.rootSequence),
      authorityRootApprovalCount: Number(
        finalLedger.authorityRootUpdateApprovals.size(),
      ),
      historicalActiveTemplateCount: Number(finalLedger.activeTemplates.size()),
    });
  } finally {
    await wallet.stop();
  }
}

await main();
