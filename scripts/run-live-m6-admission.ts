import assert from "node:assert/strict";
import { generateKeyPairSync, randomBytes } from "node:crypto";
import { appendFileSync, mkdirSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { observePreprodSubmissions } from "./m6-preprod-admission.ts";
import { parseLiveM6Arguments, startProverMemorySampler, readProverMemory } from "./m6-prover-memory.ts";
import { runBoundCredentialWorkflow } from "./m6-bound-credential-workflow.ts";
import { runSlotStateWorkflow } from "./m6-slot-state-workflow.ts";
import { runOrdinaryActionWorkflow } from "./m6-ordinary-action-workflow.ts";
import { classifyLiveM6Failure } from "./m6-live-failure.ts";
import { observeLocalProofProvider } from "./m6-proof-observation.ts";
import { requestOwnedSlotProverReset } from "./m6-slot-prover-reset.ts";

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
  governanceCallOperations,
  type GovernanceOperationScope,
  buildProofModuleBindingTree,
  connectPermioAuthorizationContract,
  createActivationAdmissionArtifact,
  createRuntimeInstanceAllocation,
  createRuntimePolicyBindingManifest,
  createRuntimeAllocationPolicyWitness,
  CredentialStatusTree,
  createFundedLocalWallet,
  createLocalAuthorizationProviders,
  localProofRequestConfig,
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
  type Hex32,
  type PreprodConnectionProfile,
  PERMIO_AUTHORIZATION_ASSETS_PATH,
  PERMIO_AUTHORIZATION_CONTRACT_TAG,
  verifyPermioAuthorizationAssets,
  type TemplateLifecycleCommand,
  type PermioAuthorizationProviders,
} from "@permio/midnight-authorization";

interface LocalAccountFile {
  readonly accounts: readonly {
    readonly mnemonic: string;
  }[];
}

export interface M6PreprodAdmissionRuntime {
  readonly networkId: 'preprod';
  readonly deploymentOnly?: boolean;
  readonly governanceOperationScope?: GovernanceOperationScope;
  readonly ordinaryAction?: { readonly implementationHash: Hex32; readonly sourceHash: Hex32; readonly profile: PreprodConnectionProfile };
  /** Operator-reconciled test continuation only: seven governance/deploy calls
   * and the admission begin are already finalized; no call is replayed. */
  readonly resumeAfterAdmissionBegin?: { readonly fixture: M6PreprodGovernanceFixture;
    readonly contractAddress: string; readonly beginTransactionId: string;
    readonly admissionFinalized?: true; readonly finalizationTransactionId?: string };
  /** Dedicated disposable private test material only, outside public evidence. */
  checkpointOrdinary?(stage: string, value: unknown): Promise<void>;
  /** Save test fixture material locally before spending DUST; never public evidence. */
  checkpointFixture?(fixture: M6PreprodGovernanceFixture): Promise<void>;
  /** Frozen, actual M4-signed synthetic fixture for the separately approved remaining suite. */
  readonly fixtureOverride?: M6PreprodGovernanceFixture;
  /** Operator-qualified fresh deployment in the approved 100-attempt suite. */
  readonly existingFreshDeployment?: { readonly contractAddress: string; readonly registeredModules: 0 | 1;
    readonly activeTemplates: 0 | 1 };
  readonly pauseAfterAdmission?: true;
  /** Preserve the private opening before allocation can reach the submission boundary. */
  checkpointAllocation?(fixture: {
    readonly contractAddress: string;
    readonly authorization: ReturnType<ScenarioGovernanceRegistry['authorizeInstantiation']>;
    readonly instance: ReturnType<ContextAccountSystem['createScenarioInstance']>;
    readonly allocation: RuntimeInstanceAllocation;
    readonly stateOpening: ReturnType<typeof createRuntimeInstanceAllocation>['stateOpening'];
    readonly policy: RuntimeAllocationPolicyWitness;
  }): Promise<void>;
  /** Private synthetic recovery material; never forward these values to public evidence. */
  checkpointRuntime?(stage: 'slot-account-prepared' | 'slot-command-prepared', value: unknown): Promise<void>;
  /** Own the restored wallet for the entire awaited workflow, then close it. */
  withProviders<T>(use: (providers: PermioAuthorizationProviders) => Promise<T>): Promise<T>;
}

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

function createM4Activation(ordinary?: M6PreprodAdmissionRuntime["ordinaryAction"], variant?: {
  nonTransitioning?: boolean; suffix: string;
  reviewers: readonly [ReturnType<typeof generateKeyPairSync>, ReturnType<typeof generateKeyPairSync>];
}) {
  const initialState = `private-ready-${randomBytes(12).toString("hex")}`;
  const completedState = `private-completed-${randomBytes(12).toString("hex")}`;
  const reviewerOne = variant?.reviewers[0] ?? generateKeyPairSync("ed25519");
  const reviewerTwo = variant?.reviewers[1] ?? generateKeyPairSync("ed25519");
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
    templateId: "org.permio.live/context-action" + (variant ? "-" + variant.suffix : ""),
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
    states: variant?.nonTransitioning ? [initialState] : [initialState, completedState],
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
        toState: variant?.nonTransitioning ? initialState : completedState,
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
        circuitId: ordinary && !variant?.nonTransitioning ? "private-state-transition-v1" : "delegated-capability-action-v1",
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
        moduleId: ordinary && !variant?.nonTransitioning ? "private-state-transition" : "delegated-capability-action",
        moduleVersion: "1.0.0",
        implementationHash: ordinary?.implementationHash ?? `0x${"11".repeat(32)}`,
        configurationHash: `0x${"22".repeat(32)}`,
        receiptSchemaHash: ordinary ? `0x${Buffer.from(pureCircuits.runtimeActionReceiptSchemaHash()).toString("hex")}` : `0x${"33".repeat(32)}`,
      },
    ],
  };
  const configuredBindings = createRuntimePolicyBindingManifest(record.template,
    bindings.bindings.map(({ configurationHash: _unused, ...selection }) => selection));
  return { activation, bindings: configuredBindings, policy, record, registry };
}

export type M6PreprodGovernanceFixture = Omit<ReturnType<typeof createM4Activation>, 'registry'>;

/** Both real M4 workflows share one exact namespace policy and its reviewer keys. */
export function createM6RemainingFixturePair(ordinary: NonNullable<M6PreprodAdmissionRuntime["ordinaryAction"]>) {
  const reviewers = [generateKeyPairSync("ed25519"), generateKeyPairSync("ed25519")] as const;
  const stateful = createM4Activation(ordinary, { reviewers, suffix: "stateful" });
  const nonTransitioning = createM4Activation(ordinary, { reviewers, suffix: "non-transitioning", nonTransitioning: true });
  assert.equal(hashNamespacePolicy(stateful.policy), hashNamespacePolicy(nonTransitioning.policy));
  const stripRegistry = ({ registry: _registry, ...fixture }: typeof stateful) => fixture;
  return { stateful: stripRegistry(stateful), nonTransitioning: stripRegistry(nonTransitioning) };
}

/** Rebuild the actual M4 registry by revalidating its original signed reviews. */
export function restoreM6GovernanceFixture(fixture: M6PreprodGovernanceFixture) {
  const { policy, record, activation, bindings } = fixture;
  assert(record.state === "active" && record.validationReport && record.lifecycle.length === 4);
  const registry = new ScenarioGovernanceRegistry([policy]);
  const draft = registry.createDraft(record.authorId, record.template, record.lifecycle[0]!.occurredAt);
  assert.deepEqual(draft.target, record.target);
  registry.recordValidation(record.authorId, record.target, record.validationReport, record.validationReport.reportedAt);
  registry.submitForReview(record.authorId, record.target, record.lifecycle[2]!.occurredAt);
  for (const review of record.reviews) registry.submitReview(review);
  assert.deepEqual(registry.activate(activation.activatedBy, record.target, activation.activatedAt), activation);
  assert.deepEqual(registry.getTemplate(record.target), record);
  assert.deepEqual(createRuntimePolicyBindingManifest(record.template,
    bindings.bindings.map(({ configurationHash: _unused, ...selection }) => selection)), bindings);
  return { ...fixture, registry };
}

export async function runLiveM6Admission(options: ReturnType<typeof parseLiveM6Arguments>,
  preprod?: M6PreprodAdmissionRuntime): Promise<void> {
  const { accountFile: accountFileArgument, governanceOnly, allocationOnly, credentialBinding,
    slotState, memorySmoke, profileMemory, boundedProver } = options;
  assert(!preprod || (preprod.networkId === 'preprod' && !accountFileArgument && !profileMemory && !boundedProver && !memorySmoke),
    'Preprod cannot reuse Local Dev account, sampler or prover-reset controls');
  const networkId = preprod?.networkId ?? 'undeployed';
  const commandNonce = (label: number) => preprod?.fixtureOverride ? randomBytes(32) : new Uint8Array(32).fill(label);
  const signatureNonce = (value: bigint) => preprod?.fixtureOverride ? undefined : value;
  const verificationScope = slotState ? "private-slot-state-and-governance-not-action-acceptance" : credentialBinding || (!governanceOnly && !memorySmoke)
    ? "allocation-and-credential-binding-not-action-acceptance" :
    allocationOnly ? "allocation-and-governance-not-action-acceptance" :
    memorySmoke ? "memory-smoke-not-acceptance" : governanceOnly ? "governance-only" : "governance-and-runtime-scope";
  if (memorySmoke) {
    milestone("historical-memory-smoke-unavailable", {
      reason: "The old unallocated credential fixture is incompatible with the current deployment; use --credential-binding.",
      milestoneComplete: false,
    });
    throw new Error("unsupported-historical-memory-workload");
  }

  const resume = preprod?.resumeAfterAdmissionBegin;
  const freshExisting = preprod?.existingFreshDeployment;
  assert(!freshExisting || (!resume && preprod.ordinaryAction && preprod.fixtureOverride &&
    /^[0-9a-f]{64}$/u.test(freshExisting.contractAddress) &&
    freshExisting.contractAddress !== "9a5b8e294e61463c5ce5948ba0120479dd69a582e0e7fc5f84c8c9c4197af3bc"));
  assert(!resume || (preprod.ordinaryAction && /^9a5b8e294e61463c5ce5948ba0120479dd69a582e0e7fc5f84c8c9c4197af3bc$/.test(resume.contractAddress) &&
    /^[0-9a-f]{66}$/.test(resume.beginTransactionId)), "Continuation must name the reconciled existing test contract");
  assert(!resume?.admissionFinalized || /^[0-9a-f]{66}$/.test(resume.finalizationTransactionId!));
  assert(!preprod?.fixtureOverride || (!resume && preprod.ordinaryAction), "Fixture override is a fresh ordinary-suite input only");
  const m4 = resume ? restoreM6GovernanceFixture(resume.fixture) : preprod?.fixtureOverride
    ? restoreM6GovernanceFixture(preprod.fixtureOverride) : createM4Activation(preprod?.ordinaryAction);
  if (preprod?.checkpointFixture) {
    const { registry: _registry, ...fixture } = m4;
    await preprod.checkpointFixture(fixture);
  }
  // Persist pure M4 recovery material before requiring local proving assets.
  // Asset integrity still gates every wallet/provider operation below.
  await verifyPermioAuthorizationAssets(PERMIO_AUTHORIZATION_ASSETS_PATH);
  let mnemonic: string | undefined;
  if (!preprod) {
    const accountFilePath = path.resolve(accountFileArgument ?? "../midnight-local-dev/accounts.example.json");
    const accountFile = JSON.parse(await readFile(accountFilePath, "utf8")) as LocalAccountFile;
    mnemonic = accountFile.accounts[0]?.mnemonic;
    assert(mnemonic, "local account file must contain one funded account");
  }

  const governancePolicyHash = hashNamespacePolicy(m4.policy);
  const namespaceHash = hashProtocolIdentifier("namespace", m4.activation.namespace);
  const networkHash = hashProtocolIdentifier("network-id", networkId);
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

  let memorySampler = profileMemory ? await startProverMemorySampler(milestone,
    boundedProver ? () => readProverMemory("permio-m6-bounded-proof") : undefined) : undefined;
  const execute = async (baseProviders: PermioAuthorizationProviders) => {
    // The first real k=21 action measured a long proof on this 16 GB test host.
    // This is only a transport wait; signed contract lifetimes are unchanged.
    const proofRequestTimeoutMs = preprod?.ordinaryAction ? 3_600_000 : preprod ? 600_000 : localProofRequestConfig(boundedProver).timeout;
    const providers = { ...baseProviders,
      midnightProvider: preprod ? observePreprodSubmissions(baseProviders.midnightProvider, milestone) : baseProviders.midnightProvider,
      proofProvider: observeLocalProofProvider(baseProviders.proofProvider,
      milestone, proofRequestTimeoutMs) };
    milestone(preprod ? "preprod-stack-ready" : "local-stack-ready", {
      proverSelector: preprod ? "explicit-caller-controlled-loopback" : boundedProver ? "secondary-loopback-6301" : "original-loopback-6300",
      networkId,
      node: preprod ? "explicit-authenticated-Blockfrost-Preprod" : "midnight-node:1.0.0",
      indexer: preprod ? "explicit-authenticated-Blockfrost-Preprod" : "indexer-standalone:4.3.3",
      proofServer: preprod ? "caller-verified-ledger8-loopback-not-version-attestation" : "proof-server:8.1.0",
      compiler: "0.31.1",
      proofRequestTimeoutMs,
      verificationScope,
    });
    const credentialStatus = new CredentialStatusTree();
    const deployed = resume || freshExisting ? undefined : await deployPermioAuthorizationContract(providers, {
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
    const contractAddress = resume?.contractAddress ?? freshExisting?.contractAddress ?? deployed!.deployTxData.public.contractAddress;
    milestone(resume || freshExisting ? "existing-contract-continuation" : "contract-deployed", { contractAddress });

    const connected = await connectPermioAuthorizationContract(
      providers,
      contractAddress,
    );
    if (freshExisting) {
      const state = await providers.publicDataProvider.queryContractState(contractAddress); assert(state);
      const initial = ledger(state.data);
      assert.deepEqual(initial.targetNetworkHash, hexBytes(networkHash));
      const authority = initial.authorityRoots.lookup(hexBytes(namespaceHash));
      assert.deepEqual(authority.root, authorityRoot.root); assert.equal(authority.rootSequence, 1n);
      assert.deepEqual(authority.governancePolicyHash, hexBytes(governancePolicyHash));
      assert.equal(initial.proofModules.size(), BigInt(freshExisting.registeredModules));
      assert.equal(initial.activeTemplates.size(), BigInt(freshExisting.activeTemplates));
      assert.equal(initial.runtimeInstances.size(), 0n); assert.equal(initial.decisionReceipts.size(), 0n);
      assert.equal(initial.credentialStatusRoots.lookup(hexBytes(namespaceHash)).rootSequence, 0n);
    }
    if (preprod?.deploymentOnly) {
      const state = await providers.publicDataProvider.queryContractState(contractAddress);
      assert(state, 'Preprod deployment must be indexed');
      const initial = ledger(state.data);
      assert.deepEqual(initial.targetNetworkHash, hexBytes(networkHash));
      assert.deepEqual(initial.authorityRoots.lookup(hexBytes(namespaceHash)).root, authorityRoot.root);
      assert.equal(initial.activeTemplates.size(), 0n);
      milestone('preprod-deployment-only-verified', { contractAddress, networkId,
        indexedConstructorStateVerified: true, templateActivated: false, milestoneComplete: false });
      return;
    }
    let allocation: RuntimeInstanceAllocation | undefined;
    let privateAllocationSentinels: readonly string[] = [];
    const governanceTime = Math.floor(Date.now() / 1_000) - 5;
    let moduleKey: Uint8Array;
    const readModuleRecord = async () => {
      const publicState = await providers.publicDataProvider.queryContractState(contractAddress);
      assert(publicState, "proof-module governance state must be indexed");
      return ledger(publicState.data).proofModules.lookup(moduleKey);
    };
    let moduleRecord: Awaited<ReturnType<typeof readModuleRecord>>;
    let moduleActivation!: ProofModuleLifecycleCommand;
    let resumedSession: ReturnType<typeof ledger>["activationSessions"] extends { lookup(key: Uint8Array): infer T } ? T : never;
    let resumedRegistryKey: Uint8Array | undefined;
    if (resume) {
      const publicState = await providers.publicDataProvider.queryContractState(contractAddress); assert(publicState);
      const view = ledger(publicState.data);
      assert.deepEqual(view.targetNetworkHash, hexBytes(networkHash));
      assert.deepEqual(view.authorityRoots.lookup(hexBytes(namespaceHash)).root, authorityRoot.root);
      assert.equal(view.proofModules.size(), 1n); assert.equal(view.activationSessions.size(), resume.admissionFinalized ? 0n : 1n);
      assert.equal(view.activeTemplates.size(), resume.admissionFinalized ? 1n : 0n); assert.equal(view.runtimeInstances.size(), 0n);
      assert.equal(view.decisionReceipts.size(), 0n); assert.equal(view.proofModuleRegistrySequence, 6n);
      const [key, module] = [...view.proofModules][0]!; moduleKey = key;
      assert.equal(module.lifecycleStatus, 4n); assert.equal(module.reviewCount, 2n); assert.equal(module.approvalCount, 2n);
      assert.deepEqual(module.identity.implementationHash, hexBytes(initialBinding.implementationHash));
      assert.deepEqual(module.sourceHash, hexBytes(preprod.ordinaryAction!.sourceHash));
      assert.deepEqual(module.governancePolicyHash, hexBytes(governancePolicyHash));
      assert.deepEqual(module.implementationReferenceHash, pureCircuits.runtimeActionImplementationReference(
        hexBytes(networkHash), Uint8Array.from(Buffer.from(contractAddress, "hex")), pureCircuits.runtimeStateTransitionModuleId()));
      if (resume.admissionFinalized) {
        const [key, active] = [...view.activeTemplates][0]!; resumedRegistryKey = key;
        assert.equal(active.lifecycleStatus, 1n); assert.equal(active.activationSequence, 1n);
        assert.deepEqual(active.target.templateContentHash, hexBytes(m4.activation.templateHash));
        assert.deepEqual(active.governancePolicyHash, hexBytes(governancePolicyHash));
        assert.equal(view.templateActivationSequence, 1n);
      } else {
        [resumedRegistryKey, resumedSession] = [...view.activationSessions][0]!;
        assert.equal(resumedSession.nextBindingIndex, 0n);
        assert(resumedSession.expiresAt > BigInt(Math.floor(Date.now() / 1000) + 900), "Existing staging session needs at least fifteen minutes remaining");
      }
      milestone("existing-governance-and-admission-session-reconciled", { contractAddress,
        alreadyFinalized: resume.admissionFinalized ? 10 : 8, newDeployment: false, nativeSubmissionRetried: false });
    } else {
    const moduleProposal = toCompactProofModuleProposal({
      moduleId: initialBinding.moduleId,
      moduleVersion: initialBinding.moduleVersion,
      implementationHash: initialBinding.implementationHash,
      governanceNamespaceHash: namespaceHash,
      governancePolicyHash,
      authorityRootVersion: 1,
      authorityRootSequence: 1,
      implementationReferenceHash: preprod?.ordinaryAction ?
        `0x${Buffer.from(pureCircuits.runtimeActionImplementationReference(hexBytes(networkHash),
          Uint8Array.from(Buffer.from(contractAddress, "hex")),
          initialBinding.moduleId === "private-state-transition" ? pureCircuits.runtimeStateTransitionModuleId()
            : pureCircuits.runtimeDelegatedActionModuleId())).toString("hex")}` : hashProtocolIdentifier(
        "contract-identity",
        `${contractAddress}:${PERMIO_AUTHORIZATION_CONTRACT_TAG}:test-only-admission-binding`,
      ),
      sourceHash: preprod?.ordinaryAction?.sourceHash ?? `0x${"62".repeat(32)}`,
      inputSchemaHash: preprod?.ordinaryAction ? `0x${Buffer.from(pureCircuits.runtimeActionInputSchemaHash()).toString("hex")}` : `0x${"63".repeat(32)}`,
      configurationSchemaHash: preprod?.ordinaryAction ? `0x${Buffer.from(pureCircuits.runtimeActionConfigurationSchemaHash()).toString("hex")}` : `0x${"64".repeat(32)}`,
      receiptSchemaHash: initialBinding.receiptSchemaHash,
      compilerVersionHash: preprod?.ordinaryAction ? `0x${Buffer.from(pureCircuits.runtimeActionCompilerProfileHash()).toString("hex")}` : `0x${"65".repeat(32)}`,
      compatibilityPolicyHash: preprod?.ordinaryAction ? `0x${Buffer.from(pureCircuits.runtimeActionCompatibilityPolicyHash()).toString("hex")}` : `0x${"66".repeat(32)}`,
      proposedAt: governanceTime,
    });
    const proposed = await governanceCallOperations(connected, preprod?.governanceOperationScope).proposeProofModule(moduleProposal);
    moduleKey = proposed.private.result;
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
        reviewNonce: commandNonce(70 + index),
      };
      const reviewed = await governanceCallOperations(connected, preprod?.governanceOperationScope).reviewProofModule(
        review,
        signProofModuleReview(review, secret, signatureNonce(170n + BigInt(index))),
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
    moduleRecord = await readModuleRecord();
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
      commandNonce: commandNonce(81),
    };
    const firstApproval = await governanceCallOperations(connected, preprod?.governanceOperationScope).governProofModule(
      approval,
      signProofModuleLifecycleCommand(approval, moduleApproverSecret, signatureNonce(181n)),
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
      commandNonce: commandNonce(83),
    };
    await assert.rejects(
      governanceCallOperations(connected, preprod?.governanceOperationScope).governProofModule(
        prematureActivation,
        signProofModuleLifecycleCommand(
          prematureActivation,
          moduleActivatorSecret,
          signatureNonce(191n),
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
      commandNonce: commandNonce(84),
    };
    await assert.rejects(
      governanceCallOperations(connected, preprod?.governanceOperationScope).governProofModule(
        duplicateApproval,
        signProofModuleLifecycleCommand(
          duplicateApproval,
          moduleApproverSecret,
          signatureNonce(193n),
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
      commandNonce: commandNonce(85),
    };
    const approved = await governanceCallOperations(connected, preprod?.governanceOperationScope).governProofModule(
      secondApproval,
      signProofModuleLifecycleCommand(
        secondApproval,
        moduleApproverTwoSecret,
        signatureNonce(197n),
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
    moduleActivation = {
      ...secondApproval,
      recordCommitment: pureCircuits.proofModuleRecordCommitment(moduleRecord),
      expectedLifecycleStatus: 3n,
      nextLifecycleStatus: 4n,
      effectiveAt: BigInt(governanceTime + 5),
      reasonHash: new Uint8Array(32).fill(86),
      commandNonce: commandNonce(87),
    };
    const activatedModule = await governanceCallOperations(connected, preprod?.governanceOperationScope).governProofModule(
      moduleActivation,
      signProofModuleLifecycleCommand(
        moduleActivation,
        moduleActivatorSecret,
        signatureNonce(199n),
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
    }
    const approvalEvidenceCommitment = hashApprovalEvidence(
      m4.activation,
      m4.record.reviews,
    );
    if (!preprod?.ordinaryAction) {
    const shortExpiry = Math.floor(Date.now() / 1_000) + 90;
    const expiringArtifact = createActivationAdmissionArtifact(m4.record, {
      activation: m4.activation,
      governancePolicyHash,
      proofModuleBindings: m4.bindings,
      proofModuleRegistrySequence: freshExisting ? 6 * (freshExisting.registeredModules + 1) : 6,
      approvalEvidenceCommitment,
      authorityRootVersion: 1,
      authorityRootSequence: 1,
      targetNetworkId: networkId,
      targetContractIdentity: `0x${contractAddress}`,
      admissionNonce: preprod?.fixtureOverride ? `0x${randomBytes(32).toString("hex")}` : `0x${"54".repeat(32)}`,
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
    }
    const artifact = createActivationAdmissionArtifact(m4.record, {
      activation: m4.activation,
      governancePolicyHash,
      proofModuleBindings: m4.bindings,
      proofModuleRegistrySequence: freshExisting ? 6 * (freshExisting.registeredModules + 1) : 6,
      approvalEvidenceCommitment,
      authorityRootVersion: 1,
      authorityRootSequence: 1,
      targetNetworkId: networkId,
      targetContractIdentity: `0x${contractAddress}`,
      admissionNonce: preprod?.fixtureOverride ? `0x${randomBytes(32).toString("hex")}` : `0x${"55".repeat(32)}`,
      stagingExpiresAt: resume && !resume.admissionFinalized ? Number(resumedSession!.expiresAt) : Math.floor(Date.now() / 1_000) + 3_600,
    });
    const envelope = toCompactActivationAdmissionEnvelope(artifact.envelope);
    const signature = signActivationAdmissionEnvelope(
      envelope,
      activatorSecret,
      signatureNonce(53n),
    );
    if (resume && !resume.admissionFinalized) {
      assert.deepEqual(pureCircuits.activationAdmissionEnvelopeCommitment(envelope), resumedSession!.envelopeCommitment);
    }
    const begun = resume ? { private: { result: resumedRegistryKey! }, public: { txId: resume.beginTransactionId } }
      : await connected.callTx.beginM4Activation(
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
      expiredPriorSessionCleaned: !preprod?.ordinaryAction,
    });
    for (let index = 0; index < (resume?.admissionFinalized ? 0 : artifact.bindings.length); index += 1) {
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
    if (resume?.admissionFinalized) {
      const indexed = await providers.publicDataProvider.queryContractState(contractAddress); assert(indexed);
      const active = ledger(indexed.data).activeTemplates.lookup(resumedRegistryKey!);
      for (const field of ["proofModuleBindingsHash", "proofModuleBindingRoot", "proofModuleBindingCount",
        "proofModuleRegistrySequence", "m4ActivationRecordHash", "approvalEvidenceCommitment"] as const) {
        assert.deepEqual(active[field], envelope[field]);
      }
    }
    const admitted = resume?.admissionFinalized ? { private: { result: { activated: true, registryKey: resumedRegistryKey! } },
      public: { txId: resume.finalizationTransactionId! } } : await connected.callTx.finalizeM4Activation(
      envelope,
      signature,
      activator,
      authorityRoot.pathFor(activatorCommitment),
    );
    assert.equal(admitted.private.result.activated, true);
    milestone(resume?.admissionFinalized ? "existing-activation-admission-reconciled" : "activation-admitted", {
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

    if (preprod?.pauseAfterAdmission) {
      assert(preprod.ordinaryAction && freshExisting);
      await preprod.checkpointOrdinary?.("remaining-module-and-template-admitted", {
        contractAddress, moduleKey, registryKey: admitted.private.result.registryKey, fixture: preprod.fixtureOverride,
      });
      milestone("remaining-admission-phase-complete", { contractAddress, moduleId: initialBinding.moduleId,
        instancesAllocatedByPhase: 0, historicalCallsReplayed: false, milestoneComplete: false });
      return;
    }

    if (allocationOnly || credentialBinding || slotState || !governanceOnly) {
      const createdAt = Math.floor(Date.now() / 1_000) - 1;
      const requestId = `private-allocation-${randomBytes(12).toString("hex")}`;
      const instanceId = `private-instance-${randomBytes(12).toString("hex")}`;
      const authorization = m4.registry.authorizeInstantiation(
        "allocator-one", m4.activation, requestId, createdAt);
      const instances = preprod?.ordinaryAction ? new SlotBoundContextAccountSystem(m4.registry) : new ContextAccountSystem(m4.registry);
      const instance = instances.createScenarioInstance({ instanceId,
        instantiationRequestId: requestId, template: m4.record.template, expiresAt: createdAt + (preprod?.ordinaryAction ? 14400 : 7200),
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
      await preprod?.checkpointAllocation?.({ contractAddress, authorization, instance, allocation,
        stateOpening: prepared.stateOpening, policy: allocationPolicy });
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
        contractTag: PERMIO_AUTHORIZATION_CONTRACT_TAG,
        instanceCommitment: Buffer.from(allocation.instanceCommitment).toString("hex"),
        allocationCommitment: Buffer.from(allocated.allocationCommitment).toString("hex"),
        transitionSequence: 0, allocatedInstances: 1,
        preflightNegativeChecks: ["wrong-signature", "altered-state-commitment", "stale-root", "altered-template-hash", "altered-policy-configuration", "legacy-policy-version", "altered-slot-rule-root", "altered-slot-rule-count", "wrong-initial-state", "correctly-signed-arbitrary-initial-state", "replay"],
        negativeCheckBoundary: "generated-Compact-preflight-not-node-rejected-transactions",
        credentialDispatcherConsumesAllocation: true, ordinaryActionAcceptance: false });
      milestone("template-policy-initial-state-binding-verified", { contractAddress,
        policyVersion: 3, slotAssignmentRulesCommitted: true, slotAssignmentAuthorityProved: false,
        initialStateOpeningVerified: true, exactActivationConfigurationVerified: true,
        privatePolicyPublished: false, ordinaryActionAcceptance: false });
      if (preprod?.ordinaryAction) {
        assert(instances instanceof SlotBoundContextAccountSystem);
        const checked = await runOrdinaryActionWorkflow({ system: instances, instance, template: m4.record.template,
          allocation, stateOpening: prepared.stateOpening, issuers: prepared.issuers, authority: authorityRoot,
          issuer: capabilityIssuer, issuerSecret: capabilityIssuerSecret, secondaryIssuer, secondaryIssuerSecret,
          outsiderIssuer, outsiderIssuerSecret, allocator, allocatorSecret, allocationPolicy,
          contract: connected, providers, address: contractAddress, governancePolicyHash, emit: milestone,
          network: networkId, profile: preprod.ordinaryAction.profile, checkpoint: preprod.checkpointOrdinary });
        const publicLog = await readFile(publicEvidencePath, "utf8");
        for (const sentinel of [...privateAllocationSentinels, ...checked.privateSentinels]) {
          assert(!publicLog.includes(sentinel), "Private ordinary-action material appeared in public evidence");
        }
        // Three separately authorized cleanup calls leave the disposable test
        // module/template unusable while preserving the confirmed receipt.
        for (const nextLifecycleStatus of [2n, 3n]) {
          const beforeCleanup = await providers.publicDataProvider.queryContractState(contractAddress); assert(beforeCleanup);
          const cleanupView = ledger(beforeCleanup.data);
          const record = cleanupView.activeTemplates.lookup(admitted.private.result.registryKey);
          const cleanup: TemplateLifecycleCommand = {
            commandVersion: 1n, registryKey: admitted.private.result.registryKey,
            recordCommitment: pureCircuits.activeTemplateRecordCommitment(record), namespaceHash: hexBytes(namespaceHash),
            governancePolicyHash: hexBytes(governancePolicyHash), authorityRootVersion: 1n, authorityRootSequence: 1n,
            expectedLifecycleStatus: record.lifecycleStatus, nextLifecycleStatus,
            effectiveAt: BigInt(Math.floor(Date.now() / 1000) - 1),
            effectiveSequence: cleanupView.templateLifecycleSequence + 1n,
            reasonHash: randomBytes(32), commandNonce: randomBytes(32),
          };
          const authority = nextLifecycleStatus === 2n ? templateRetirer : templateEmergencyRevoker;
          const secret = nextLifecycleStatus === 2n ? templateRetirerSecret : templateEmergencyRevokerSecret;
          const cleaned = await connected.callTx.terminateTemplate(cleanup, signTemplateLifecycleCommand(cleanup, secret),
            authority, authorityRoot.pathFor(pureCircuits.governanceActivatorLeafCommitment(authority)));
          milestone("ordinary-test-template-cleaned", { transactionId: cleaned.public.txId, lifecycleStatus: Number(nextLifecycleStatus) });
        }
        const beforeModuleCleanup = await readModuleRecord();
        const moduleCleanup: ProofModuleLifecycleCommand = {
          commandVersion: 1n, moduleKey, recordCommitment: pureCircuits.proofModuleRecordCommitment(beforeModuleCleanup),
          governanceNamespaceHash: hexBytes(namespaceHash), governancePolicyHash: hexBytes(governancePolicyHash),
          authorityRootVersion: 1n, authorityRootSequence: 1n, expectedLifecycleStatus: 4n, nextLifecycleStatus: 6n,
          effectiveAt: BigInt(Math.floor(Date.now() / 1000) - 1), reasonHash: randomBytes(32), commandNonce: randomBytes(32),
        };
        const moduleCleaned = await governanceCallOperations(connected, preprod?.governanceOperationScope).governProofModule(moduleCleanup,
          signProofModuleLifecycleCommand(moduleCleanup, moduleEmergencyRevokerSecret), moduleEmergencyRevoker,
          authorityRoot.pathFor(pureCircuits.governanceActivatorLeafCommitment(moduleEmergencyRevoker)));
        milestone("ordinary-test-module-revoked", { transactionId: moduleCleaned.public.txId, lifecycleStatus: 6 });
        const afterCleanup = await providers.publicDataProvider.queryContractState(contractAddress); assert(afterCleanup);
        const afterCleanupView = ledger(afterCleanup.data);
        assert.equal(afterCleanupView.decisionReceipts.size(), 1n);
        assert.equal(afterCleanupView.activeTemplates.lookup(admitted.private.result.registryKey).lifecycleStatus, 3n);
        assert.equal(afterCleanupView.proofModules.lookup(moduleKey).lifecycleStatus, 6n);
        milestone("ordinary-action-first-flow-verified", { contractAddress, contractTag: PERMIO_AUTHORIZATION_CONTRACT_TAG,
          exactIndexedCallAndReceiptVerified: true, privacyLogScanPassed: true,
          disposableTemplateAndModuleRevoked: true,
          syntheticTestDataOnly: true, fullM6Acceptance: false, milestoneComplete: false });
        return;
      }
      if (slotState) {
        const slots = new SlotBoundContextAccountSystem(m4.registry);
        const slotInstance = slots.createScenarioInstance({ instanceId,
          instantiationRequestId: requestId, template: m4.record.template, expiresAt: instance.expiresAt,
          capabilityIssuers: instance.capabilityIssuers }, createdAt);
        const checked = await runSlotStateWorkflow({ system: slots, instance: slotInstance, template: m4.record.template,
          allocation, stateOpening: prepared.stateOpening, issuers: prepared.issuers, authority: authorityRoot,
          issuer: capabilityIssuer, issuerSecret: capabilityIssuerSecret, allocator, allocatorSecret,
          slotGovernor, slotGovernorSecret, activator, activatorSecret, contract: connected, providers,
          address: contractAddress, governancePolicyHash, binding: allocationPolicy, emit: milestone,
          checkpoint: preprod?.checkpointRuntime,
          beforeSlots: boundedProver && process.env.PERMIO_M6_SLOT_RESET_DIRECTORY ? async () => {
            milestone("slot-prover-reset-requested", { scope: "operational-only-no-authority-or-state-change" });
            await memorySampler?.stop();
            await requestOwnedSlotProverReset(process.env.PERMIO_M6_SLOT_RESET_DIRECTORY!);
            memorySampler = await startProverMemorySampler(milestone, () => readProverMemory("permio-m6-bounded-proof"));
            milestone("slot-prover-reset-completed", { scope: "operational-only-no-authority-or-state-change",
              callerPrivateStateRetained: true, protocolDeadlinesOrChecksChanged: false });
          } : undefined });
        privateAllocationSentinels = [...privateAllocationSentinels, ...checked.privateSentinels];
      }
      if (credentialBinding || !governanceOnly) {
        const checked = await runBoundCredentialWorkflow({ system: instances, instance, template: m4.record.template,
          allocation, stateOpening: prepared.stateOpening, issuers: prepared.issuers, authority: authorityRoot, issuer: capabilityIssuer,
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
      assert.equal(reconnectedInstance.transitionSequence, slotState ? 5n : expectedCredentialSequence);
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
      updateNonce: commandNonce(92),
    };
    await assert.rejects(
      governanceCallOperations(connected, preprod?.governanceOperationScope).submitAuthorityRootApproval(
        rootUpdate,
        signAuthorityRootUpdateCommand(rootUpdate, activatorSecret, 233n),
        activator,
        authorityRoot.pathFor(activatorCommitment),
      ),
      /outside the update scope/i,
    );
    milestone("authority-root-privilege-collapse-rejected", { contractAddress });
    const firstRootApproval = await governanceCallOperations(connected, preprod?.governanceOperationScope).submitAuthorityRootApproval(
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
      governanceCallOperations(connected, preprod?.governanceOperationScope).submitAuthorityRootApproval(
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
    const rotatedRoot = await governanceCallOperations(connected, preprod?.governanceOperationScope).submitAuthorityRootApproval(
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
      commandNonce: commandNonce(89),
    };
    await assert.rejects(
      governanceCallOperations(connected, preprod?.governanceOperationScope).governProofModule(
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
    const deprecated = await governanceCallOperations(connected, preprod?.governanceOperationScope).governProofModule(
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
      commandNonce: commandNonce(91),
    };
    await assert.rejects(
      governanceCallOperations(connected, preprod?.governanceOperationScope).governProofModule(
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
    const revoked = await governanceCallOperations(connected, preprod?.governanceOperationScope).governProofModule(
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
      commandNonce: commandNonce(94),
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
      commandNonce: commandNonce(96),
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
  };
  try {
    if (preprod) await preprod.withProviders(execute);
    else {
      const wallet = await createFundedLocalWallet(mnemonic!, boundedProver);
      try { await execute(createLocalAuthorizationProviders(wallet, boundedProver)); }
      finally { await wallet.stop(); }
    }
  } finally { await memorySampler?.stop(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try { await runLiveM6Admission(parseLiveM6Arguments(process.argv.slice(2))); }
  catch (error: unknown) {
    milestone("failed", {
      category: classifyLiveM6Failure(error),
      milestoneComplete: false, detailsWithheldToProtectPrivateWitness: true,
    });
    process.exitCode = 1;
  }
}
