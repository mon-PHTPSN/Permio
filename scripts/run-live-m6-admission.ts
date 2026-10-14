import assert from "node:assert/strict";
import { generateKeyPairSync, randomBytes } from "node:crypto";
import { appendFileSync, mkdirSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { parseLiveM6Arguments, startProverMemorySampler } from "./m6-prover-memory.ts";
import { runBoundCredentialWorkflow } from "./m6-bound-credential-workflow.ts";
import { runSlotStateWorkflow } from "./m6-slot-state-workflow.ts";

import { parseScenarioTemplate } from "@permio/scenario-domain";
import {
  ContextAccountSystem,
  SlotBoundContextAccountSystem,
} from "@permio/context-accounts";
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
  createRuntimeInstanceAllocation,
  createRuntimePolicyBindingManifest,
  createRuntimeAllocationPolicyWitness,
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
  signRuntimeInstanceAllocation,
  signTemplateLifecycleCommand,
  toCompactActivationAdmissionEnvelope,
  toCompactProofModuleProposal,
  type ProofModuleBindingManifest,
  type AuthorityRootUpdateCommand,
  type GovernanceActivatorLeaf,
  type ProofModuleLifecycleCommand,
  type ProofModuleReview,
  type RuntimeInstanceAllocation,
  type RuntimeAllocationPolicyWitness,
  PERMIO_AUTHORIZATION_ASSETS_PATH,
  PERMIO_AUTHORIZATION_CONTRACT_TAG,
  verifyPermioAuthorizationAssets,
  type TemplateLifecycleCommand,
} from "@permio/midnight-authorization";

interface LocalAccountFile {
  readonly accounts: readonly {
    readonly mnemonic: string;
  }[];
}

const { accountFile: accountFileArgument, governanceOnly, allocationOnly, credentialBinding, slotState, memorySmoke, profileMemory } =
  parseLiveM6Arguments(process.argv.slice(2));
const verificationScope = slotState ? "private-slot-state-and-governance-not-action-acceptance" : credentialBinding || (!governanceOnly && !memorySmoke)
  ? "allocation-and-credential-binding-not-action-acceptance" :
  allocationOnly ? "allocation-and-governance-not-action-acceptance" :
  memorySmoke ? "memory-smoke-not-acceptance" :
  governanceOnly ? "governance-only" : "governance-and-runtime-scope";

function hexBytes(value: `0x${string}`): Uint8Array {
  return Uint8Array.from(Buffer.from(value.slice(2), "hex"));
}

const publicEvidencePath = path.resolve(
  "logs",
  `m6-live-${new Date().toISOString().replaceAll(":", "-")}.jsonl`,
);

function milestone(event: string, evidence: Readonly<Record<string, unknown>>): void {
  const line = `${JSON.stringify({ timestamp: new Date().toISOString(), event, ...evidence })}\n`;
  mkdirSync(path.dirname(publicEvidencePath), { recursive: true });
  appendFileSync(publicEvidencePath, line, "utf8");
  process.stdout.write(line);
}

function createM4Activation() {
  const initialState = `private-ready-${randomBytes(12).toString("hex")}`;
  const completedState = `private-completed-${randomBytes(12).toString("hex")}`;
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
    states: [initialState, completedState],
    initialState,
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
        fromState: initialState,
        actionId: "perform-action",
        toState: completedState,
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
        // Long-lived synthetic setup profile, not a short interactive user grant.
        validForSeconds: 14_400,
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
  const configuredBindings = createRuntimePolicyBindingManifest(record.template,
    bindings.bindings.map(({ configurationHash: _unused, ...selection }) => selection));
  return { activation, bindings: configuredBindings, policy, record, registry };
}

async function main(): Promise<void> {
  if (memorySmoke) {
    milestone("historical-memory-smoke-unavailable", {
      reason: "The old unallocated credential fixture is incompatible with the current deployment; use --credential-binding.",
      milestoneComplete: false,
    });
    throw new Error("unsupported-historical-memory-workload");
  }
  await verifyPermioAuthorizationAssets(PERMIO_AUTHORIZATION_ASSETS_PATH);
  const accountFilePath = path.resolve(
    accountFileArgument ?? "../midnight-local-dev/accounts.example.json",
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
  const allocatorSecret = 191n;
  const secondaryIssuerSecret = 197n;
  const outsiderIssuerSecret = 199n;
  const slotGovernorSecret = 211n;
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
  const allocator = moduleAuthority(MIDNIGHT_AUTHORITY_KINDS.allocator, allocatorSecret);
  const secondaryIssuer = moduleAuthority(MIDNIGHT_AUTHORITY_KINDS.capabilityIssuer, secondaryIssuerSecret);
  const outsiderIssuer = moduleAuthority(MIDNIGHT_AUTHORITY_KINDS.capabilityIssuer, outsiderIssuerSecret);
  const slotGovernor = moduleAuthority(MIDNIGHT_AUTHORITY_KINDS.participantSlotGovernor, slotGovernorSecret);
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
    allocator,
    secondaryIssuer,
    outsiderIssuer,
    slotGovernor,
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
    allocator,
    secondaryIssuer,
    outsiderIssuer,
    slotGovernor,
  ]);
  const initialBinding = m4.bindings.bindings[0]!;

  const memorySampler = profileMemory ? await startProverMemorySampler(milestone) : undefined;
  const wallet = await createFundedLocalWallet(mnemonic).catch(async (error: unknown) => {
    await memorySampler?.stop();
    throw error;
  });
  try {
    const providers = createLocalAuthorizationProviders(wallet);
    milestone("local-stack-ready", {
      networkId: "undeployed",
      node: "midnight-node:1.0.0",
      indexer: "indexer-standalone:4.3.3",
      proofServer: "proof-server:8.1.0",
      compiler: "0.31.1",
      verificationScope,
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
    let allocation: RuntimeInstanceAllocation | undefined;
    let privateAllocationSentinels: readonly string[] = [];
    const governanceTime = Math.floor(Date.now() / 1_000) - 5;
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
        `${contractAddress}:${PERMIO_AUTHORIZATION_CONTRACT_TAG}:test-only-admission-binding`,
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
    await memorySampler?.capture("first-governance-approval-indexed");
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
      stagingExpiresAt: Number(envelope.stagingExpiresAt),
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

    // Test nonce replay while the signed envelope is still timely. A complete
    // credential regression can outlive this one-hour admission window;
    // replaying after that correctly fails the earlier expiry guard instead.
    await assert.rejects(
      connected.callTx.beginM4Activation(envelope, signature, activator,
        authorityRoot.pathFor(activatorCommitment)),
      /nonce already used/i,
    );
    milestone("replay-rejected", { contractAddress,
      negativeCheckBoundary: "generated-Compact-preflight-not-node-rejected-transaction" });

    if (allocationOnly || credentialBinding || slotState || !governanceOnly) {
      const createdAt = Math.floor(Date.now() / 1_000) - 1;
      const requestId = `private-allocation-${randomBytes(12).toString("hex")}`;
      const instanceId = `private-instance-${randomBytes(12).toString("hex")}`;
      const authorization = m4.registry.authorizeInstantiation(
        "allocator-one", m4.activation, requestId, createdAt);
      const instances = new ContextAccountSystem(m4.registry);
      const instance = instances.createScenarioInstance({ instanceId,
        instantiationRequestId: requestId, template: m4.record.template, expiresAt: createdAt + 7200,
        capabilityIssuers: [{ principalId: "fixture-capability-issuer", kind: "service" },
          { principalId: "fixture-secondary-issuer", kind: "service" }] }, createdAt);
      const prepared = createRuntimeInstanceAllocation({ authorization, templateRecord: m4.record, instance,
        allocatorAuthority: allocator,
        capabilityIssuers: [{ principalId: "fixture-capability-issuer", kind: "service", authority: capabilityIssuer },
          { principalId: "fixture-secondary-issuer", kind: "service", authority: secondaryIssuer }],
        authorityRootVersion: 1n, authorityRootSequence: 1n, targetNetworkHash: hexBytes(networkHash),
        targetContractIdentity: Uint8Array.from(Buffer.from(contractAddress, "hex")),
        allocationValidBefore: createdAt + 3600 });
      allocation = prepared.allocation;
      const allocationPolicy = createRuntimeAllocationPolicyWitness(m4.record.template, m4.bindings, prepared.stateOpening);
      privateAllocationSentinels = [requestId, instanceId, "fixture-capability-issuer", "fixture-secondary-issuer",
        Buffer.from(prepared.stateOpening.nonce).toString("hex"), Buffer.from(allocation.allocationNonce).toString("hex"),
        ...m4.record.template.states, Buffer.from(allocationPolicy.policy.initialStateIdHash).toString("hex")];
      const allocatorPath = authorityRoot.pathFor(allocation.allocatorAuthorityCommitment);
      const signed = signRuntimeInstanceAllocation(allocation, allocatorSecret);
      await assert.rejects(connected.callTx.allocateRuntimeInstance(allocation,
        signRuntimeInstanceAllocation(allocation, activatorSecret), allocator, allocatorPath, allocationPolicy),
      /Invalid governance activation signature/u);
      await assert.rejects(connected.callTx.allocateRuntimeInstance({ ...allocation,
        initialStateCommitment: randomBytes(32) }, signed, allocator, allocatorPath, allocationPolicy),
      /Invalid governance activation signature/u);
      await assert.rejects(connected.callTx.allocateRuntimeInstance({ ...allocation,
        authorityRootSequence: 0n }, signed, allocator, allocatorPath, allocationPolicy), /stale or mismatched/u);
      await assert.rejects(connected.callTx.allocateRuntimeInstance({ ...allocation,
        target: { ...allocation.target, templateContentHash: randomBytes(32) } }, signed, allocator, allocatorPath, allocationPolicy),
      /not registered/u);
      await assert.rejects(connected.callTx.allocateRuntimeInstance(allocation, signed, allocator, allocatorPath,
        { ...allocationPolicy, policy: { ...allocationPolicy.policy, maxCapabilityDuration: allocationPolicy.policy.maxCapabilityDuration + 1n } }),
      /configuration hash/u);
      await assert.rejects(connected.callTx.allocateRuntimeInstance(allocation, signed, allocator, allocatorPath,
        { ...allocationPolicy, policy: { ...allocationPolicy.policy, policyVersion: 1n } }),
      /exact template action binding/u);
      await assert.rejects(connected.callTx.allocateRuntimeInstance(allocation, signed, allocator, allocatorPath,
        { ...allocationPolicy, policy: { ...allocationPolicy.policy,
          slotAssignmentRulesRoot: { field: allocationPolicy.policy.slotAssignmentRulesRoot.field + 1n } } }),
      /configuration hash/u);
      await assert.rejects(connected.callTx.allocateRuntimeInstance(allocation, signed, allocator, allocatorPath,
        { ...allocationPolicy, policy: { ...allocationPolicy.policy,
          slotAssignmentRuleCount: allocationPolicy.policy.slotAssignmentRuleCount + 1n } }),
      /configuration hash/u);
      await assert.rejects(connected.callTx.allocateRuntimeInstance(allocation, signed, allocator, allocatorPath,
        { ...allocationPolicy, initialState: { ...allocationPolicy.initialState, stateIdHash: randomBytes(32) } }),
      /exact initial state/u);
      const arbitraryState = { ...allocationPolicy.initialState, stateIdHash: randomBytes(32) };
      const arbitraryAllocation = { ...allocation, initialStateCommitment: pureCircuits.runtimeStateCommitment(arbitraryState) };
      await assert.rejects(connected.callTx.allocateRuntimeInstance(arbitraryAllocation,
        signRuntimeInstanceAllocation(arbitraryAllocation, allocatorSecret), allocator, allocatorPath,
        { ...allocationPolicy, initialState: arbitraryState }), /exact initial state/u);
      const accepted = await connected.callTx.allocateRuntimeInstance(allocation, signed, allocator, allocatorPath, allocationPolicy);
      const state = await providers.publicDataProvider.queryContractState(contractAddress);
      assert(state, "allocation must be indexed");
      const view = ledger(state.data);
      const allocated = view.runtimeInstances.lookup(allocation.instanceCommitment);
      assert.deepEqual(allocated.allocationCommitment, pureCircuits.runtimeInstanceAllocationCommitment(allocation));
      assert.deepEqual(allocated.currentStateCommitment, allocation.initialStateCommitment);
      assert.equal(allocated.transitionSequence, 0n);
      assert.equal(view.usedAllocationRequestNullifiers.size(), 1n);
      assert.equal(view.usedInstanceIdentityNullifiers.size(), 1n);
      await assert.rejects(connected.callTx.allocateRuntimeInstance(allocation, signed, allocator, allocatorPath, allocationPolicy),
        /already consumed/u);
      milestone("private-instance-allocation-accepted", { contractAddress, transactionId: accepted.public.txId,
        instanceCommitment: Buffer.from(allocation.instanceCommitment).toString("hex"),
        allocationCommitment: Buffer.from(allocated.allocationCommitment).toString("hex"),
        transitionSequence: 0, allocatedInstances: 1,
        preflightNegativeChecks: ["wrong-signature", "altered-state-commitment", "stale-root", "altered-template-hash", "altered-policy-configuration", "legacy-policy-version", "altered-slot-rule-root", "altered-slot-rule-count", "wrong-initial-state", "correctly-signed-arbitrary-initial-state", "replay"],
        negativeCheckBoundary: "generated-Compact-preflight-not-node-rejected-transactions",
        credentialDispatcherConsumesAllocation: true, ordinaryActionAcceptance: false });
      milestone("template-policy-initial-state-binding-verified", { contractAddress,
        policyVersion: 2, slotAssignmentRulesCommitted: true, slotAssignmentAuthorityProved: false,
        initialStateOpeningVerified: true, exactActivationConfigurationVerified: true,
        privatePolicyPublished: false, ordinaryActionAcceptance: false });
      if (slotState) {
        const slots = new SlotBoundContextAccountSystem(m4.registry);
        const slotInstance = slots.createScenarioInstance({ instanceId,
          instantiationRequestId: requestId, template: m4.record.template, expiresAt: instance.expiresAt,
          capabilityIssuers: instance.capabilityIssuers }, createdAt);
        const checked = await runSlotStateWorkflow({ system: slots, instance: slotInstance, template: m4.record.template,
          allocation, stateOpening: prepared.stateOpening, issuers: prepared.issuers, authority: authorityRoot,
          issuer: capabilityIssuer, issuerSecret: capabilityIssuerSecret, allocator, allocatorSecret,
          slotGovernor, slotGovernorSecret, activator, activatorSecret, contract: connected, providers,
          address: contractAddress, governancePolicyHash, binding: allocationPolicy, emit: milestone });
        privateAllocationSentinels = [...privateAllocationSentinels, ...checked.privateSentinels];
      }
      if (credentialBinding || !governanceOnly) {
        const checked = await runBoundCredentialWorkflow({ system: instances, instance, template: m4.record.template,
          allocation, issuers: prepared.issuers, authority: authorityRoot, issuer: capabilityIssuer,
          issuerSecret: capabilityIssuerSecret, secondaryIssuer, secondaryIssuerSecret,
          outsiderIssuer, outsiderIssuerSecret, contract: connected, providers, address: contractAddress,
          governancePolicyHash, emit: milestone });
        privateAllocationSentinels = [...privateAllocationSentinels, ...checked.privateSentinels];
      }
    }

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
    const expectedCredentialSequence = slotState ? 1n : credentialBinding || !governanceOnly ? 5n : 0n;
    assert.equal(afterReconnect.credentialStatusRoots.lookup(hexBytes(namespaceHash)).rootSequence,
      expectedCredentialSequence);
    assert.equal(afterReconnect.capabilityAttenuationSessions.size(), 0n);
    assert.equal(afterReconnect.activeTemplates.size(), 1n);
    assert.equal(afterReconnect.templateActivationSequence, 1n);
    if (allocation) {
      assert.deepEqual(afterReconnect.runtimeInstances.lookup(allocation.instanceCommitment).allocationCommitment,
        pureCircuits.runtimeInstanceAllocationCommitment(allocation));
      assert.equal(afterReconnect.usedAllocationRequestNullifiers.size(), 1n);
      const reconnectedInstance = afterReconnect.runtimeInstances.lookup(allocation.instanceCommitment);
      assert.equal(reconnectedInstance.transitionSequence, slotState ? 4n : 0n);
      if (slotState) {
        assert.equal(afterReconnect.runtimeSlotSessions.size(), 0n);
        assert.equal(afterReconnect.usedRuntimeSlotCommandNonces.size(), 4n);
      }
      milestone("allocation-reconnect-verified", { contractAddress, allocatedInstances: 1,
        transitionSequence: Number(reconnectedInstance.transitionSequence) });
    }
    milestone("reconnect-verified", {
      contractAddress,
      credentialStatusRootSequence: Number(expectedCredentialSequence),
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
    // Prepare a genuinely valid new M4/M5 allocation just before retirement.
    // Reusing the original allocation's hour-old deadline would make these
    // negatives invalid for a second reason and obscure the lifecycle check.
    let prospectiveAllocation: RuntimeInstanceAllocation | undefined;
    let prospectivePolicy: RuntimeAllocationPolicyWitness | undefined;
    if (allocation) {
      const createdAt = Math.floor(Date.now() / 1000) - 1;
      const requestId = `private-prospective-${randomBytes(12).toString("hex")}`;
      const instanceId = `private-prospective-instance-${randomBytes(12).toString("hex")}`;
      const authorization = m4.registry.authorizeInstantiation("allocator-one",
        m4.activation, requestId, createdAt);
      const instances = new ContextAccountSystem(m4.registry);
      const instance = instances.createScenarioInstance({ instanceId,
        instantiationRequestId: requestId, template: m4.record.template, expiresAt: createdAt + 7200,
        capabilityIssuers: [{ principalId: "fixture-capability-issuer", kind: "service" }] }, createdAt);
      const prepared = createRuntimeInstanceAllocation({ authorization, templateRecord: m4.record, instance,
        allocatorAuthority: allocator,
        capabilityIssuers: [{ principalId: "fixture-capability-issuer", kind: "service", authority: capabilityIssuer }],
        authorityRootVersion: 2n, authorityRootSequence: 2n, targetNetworkHash: hexBytes(networkHash),
        targetContractIdentity: Uint8Array.from(Buffer.from(contractAddress, "hex")),
        allocationValidBefore: createdAt + 3600 });
      prospectiveAllocation = prepared.allocation;
      prospectivePolicy = createRuntimeAllocationPolicyWitness(m4.record.template, m4.bindings, prepared.stateOpening);
      privateAllocationSentinels = [...privateAllocationSentinels, requestId, instanceId,
        Buffer.from(prepared.stateOpening.nonce).toString("hex"),
        Buffer.from(prepared.allocation.allocationNonce).toString("hex")];
    }
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
    if (allocation) {
      assert(prospectiveAllocation && prospectivePolicy);
      const next = prospectiveAllocation;
      await assert.rejects(connected.callTx.allocateRuntimeInstance(next,
        signRuntimeInstanceAllocation(next, allocatorSecret), allocator,
        rotatedAuthorityRoot.pathFor(allocation.allocatorAuthorityCommitment), prospectivePolicy), /active exact template/u);
      milestone("retired-template-allocation-preflight-rejected", { contractAddress,
        negativeCheckBoundary: "generated-Compact-preflight-not-node-rejected-transaction" });
    }

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
    assert.equal(finalLedger.credentialStatusRoots.lookup(hexBytes(namespaceHash)).rootSequence,
      expectedCredentialSequence);
    assert.equal(finalLedger.capabilityAttenuationSessions.size(), 0n);
    assert.equal(finalLedger.usedCredentialStatusCommandNonces.size(), expectedCredentialSequence);
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
    if (allocation) {
      assert(prospectiveAllocation && prospectivePolicy);
      const next = prospectiveAllocation;
      await assert.rejects(connected.callTx.allocateRuntimeInstance(next,
        signRuntimeInstanceAllocation(next, allocatorSecret), allocator,
        rotatedAuthorityRoot.pathFor(allocation.allocatorAuthorityCommitment), prospectivePolicy), /active exact template/u);
      assert.deepEqual(finalLedger.runtimeInstances.lookup(allocation.instanceCommitment).allocationCommitment,
        pureCircuits.runtimeInstanceAllocationCommitment(allocation));
      assert.equal(finalLedger.runtimeInstances.size(), 1n);
      const publicLog = await readFile(publicEvidencePath, "utf8");
      assert(privateAllocationSentinels.every((sentinel) => !publicLog.includes(sentinel)),
        "allocation witness appeared in public evidence");
      milestone("allocation-history-and-log-privacy-verified", { contractAddress, allocatedInstances: 1,
        capturedLogSentinelsChecked: privateAllocationSentinels.length,
        revokedTemplatePreflightRejected: true, ordinaryActionAcceptance: false });
    }
    milestone("final-governance-state-verified", {
      contractAddress,
      verificationScope,
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
      credentialStatusRootSequence: Number(expectedCredentialSequence),
      remainingCredentialStagingSessions: Number(finalLedger.capabilityAttenuationSessions.size()),
    });
  } finally {
    try {
      await wallet.stop();
    } finally {
      await memorySampler?.stop();
    }
  }
}

try {
  await main();
} catch (error: unknown) {
  const message = error instanceof Error ? error.message : "";
  milestone("failed", {
    category: /ENOENT|Compact asset|Compact prov|Compact key|Compact generated|real-key/.test(message)
      ? "missing-or-mismatched-build-assets" : "unclassified-private-error",
    milestoneComplete: false, detailsWithheldToProtectPrivateWitness: true,
  });
  process.exitCode = 1;
}
