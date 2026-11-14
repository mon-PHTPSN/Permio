import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { createUnprovenCallTx, getPublicStates } from "@midnight-ntwrk/midnight-js-contracts";
import { indexerPublicDataProvider } from "@midnight-ntwrk/midnight-js-indexer-public-data-provider";
import { SlotBoundContextAccountSystem } from "@permio/context-accounts";
import * as sdk from "@permio/midnight-authorization";
import { restoreM6GovernanceFixture, type createM6RemainingFixturePair } from "./run-live-m6-admission.ts";
import { runOrdinaryActionWorkflow, type PreparedOrdinaryAction } from "./m6-ordinary-action-workflow.ts";
import type { createRemainingWalletTransport } from "./m6-remaining-wallet-transport.ts";
import { setUnprovenActionWindow, readM6LedgerTtlSeconds } from "./m6-unproven-action-window.ts";
import { verifyLiveActionMutations } from "./m6-live-action-mutations.ts";
import { captureRemainingPublicEvidence } from "./m6-remaining-public-evidence.ts";

const pure = sdk.permioAuthorizationPureCircuits;
const hex = (value: string) => Uint8Array.from(Buffer.from(value.replace(/^0x/u, ""), "hex"));
const now = () => Math.floor(Date.now() / 1000) - 1;
type Input = {
  fixtures: ReturnType<typeof createM6RemainingFixturePair>;
  address: string; profile: sdk.PreprodConnectionProfile; providers: sdk.PermioAuthorizationProviders;
  wallet: Awaited<ReturnType<typeof createRemainingWalletTransport>>;
  privateScanValues: readonly string[];
  checkpoint(stage: string, value: unknown): Promise<void>;
  emit(value: Readonly<Record<string, unknown>>): void;
};

/** Actual M4/M5 users, two instances, genuine proofs and exact native outcomes. */
export async function runRemainingOrdinaryMatrix(input: Input) {
  const { providers, wallet, address, emit, checkpoint } = input;
  assert.equal(wallet.journalState().reservedMaximumAttempts, 19);
  const { ledgerParameters } = await getPublicStates(providers.publicDataProvider, address);
  const ledgerTtlSeconds = readM6LedgerTtlSeconds(ledgerParameters);
  assert(ledgerTtlSeconds > 3 * 3600 + 120, "Network TTL cannot safely accommodate the bounded competing-proof plan");
  emit({ phase: "live-ledger-transaction-window-qualified", ledgerTtlSeconds, selectedMaximumSeconds: 3 * 3600,
    signedAuthorizationWindowRemainsBinding: true, nativeSubmissions: 0 });
  const contract = await sdk.connectPermioAuthorizationContract(providers, address);
  const m4s = [input.fixtures.stateful, input.fixtures.nonTransitioning].map(restoreM6GovernanceFixture);
  const policyHash = sdk.hashNamespacePolicy(m4s[0]!.policy);
  const namespaceHash = hex(sdk.hashProtocolIdentifier("namespace", m4s[0]!.activation.namespace));
  const specs = [[3n,29n],[7n,101n],[7n,103n],[8n,107n],[8n,127n],[9n,109n],
    [10n,113n],[11n,149n],[11n,151n],[12n,157n],[5n,163n],[6n,173n],[4n,191n],[6n,197n],[6n,199n],[13n,211n]] as const;
  const leaves = specs.map(([authorityKind, secret]) => ({ leafVersion: 1n, namespaceHash,
    governancePolicyHash: hex(policyHash), authorityKind, publicKey: sdk.governanceActivatorPublicKey(secret),
    validAfter: 1700000000n, validBefore: 2000000000n }));
  let authority = sdk.buildAuthorityRoot(leaves), rootSequence = 1n;
  const status = new sdk.CredentialStatusTree();
  const read = async () => {
    const state = await providers.publicDataProvider.queryContractState(address); assert(state);
    return sdk.readPermioAuthorizationLedger(state.data);
  };
  const initial = await read();
  assert.equal(initial.runtimeInstances.size(), 0n); assert.equal(initial.proofModules.size(), 2n);
  assert.equal(initial.activeTemplates.size(), 2n); assert.equal(initial.decisionReceipts.size(), 0n);
  assert.deepEqual(initial.authorityRoots.lookup(namespaceHash).root, authority.root);
  assert.deepEqual(initial.credentialStatusRoots.lookup(namespaceHash).root, status.root);
  const publicInstances = (view: Awaited<ReturnType<typeof read>>) => [...view.runtimeInstances];

  async function createCandidate(candidate: PreparedOrdinaryAction, label: string) {
    const created = await createUnprovenCallTx(providers, { compiledContract: sdk.permioAuthorizationCompiledContract,
      contractAddress: address, circuitId: "executeRuntimeAction", args: candidate.arguments });
    const window = setUnprovenActionWindow(created.private.unprovenTx, candidate.arguments[0].validBefore);
    emit({ phase: "candidate-proof-window-verified", label, ...window });
    return created;
  }
  async function prove(candidate: PreparedOrdinaryAction, label: string,
    ready?: Awaited<ReturnType<typeof createCandidate>>) {
    const created = ready ?? await createCandidate(candidate, label);
    const transaction = await providers.proofProvider.proveTx(created.private.unprovenTx);
    await checkpoint("genuine-candidate-proof", { label, bytes: transaction.serialize(), receiptId: created.private.result,
      command: candidate.arguments[0] });
    return { transaction, receiptId: created.private.result };
  }
  async function finalize(proved: Awaited<ReturnType<typeof prove>>) {
    const balanced = await wallet.balanceTx(proved.transaction), transactionId = await wallet.submitTx(balanced);
    const final = await providers.publicDataProvider.watchForTxData(transactionId);
    assert.equal(final.status, "SucceedEntirely");
    assert(Buffer.from(final.tx.serialize()).equals(Buffer.from(balanced.serialize())));
    return { transactionId, receiptId: proved.receiptId };
  }
  async function rotateAuthority() {
    assert.equal(rootSequence, 1n);
    const rotated = sdk.buildAuthorityRoot([{ ...leaves[0]!, publicKey: sdk.governanceActivatorPublicKey(167n) }, ...leaves.slice(1)]);
    const command = { commandVersion: 1n, namespaceHash, currentGovernancePolicyHash: hex(policyHash),
      currentRoot: authority.root, currentRootVersion: 1n, currentRootSequence: 1n,
      nextGovernancePolicyHash: hex(policyHash), nextRoot: rotated.root, nextRootVersion: 2n, nextRootSequence: 2n,
      nextModuleReviewThreshold: 2n, nextModuleApprovalThreshold: 2n, nextAuthorityRootUpdateThreshold: 2n,
      effectiveAt: BigInt(now()), updateNonce: randomBytes(32) };
    await checkpoint("exact-authority-rotation", { command, leaves });
    const operations = sdk.governanceCallOperations(contract, wallet.withGovernanceOperation);
    for (const [index, secret] of [[7, 149n], [8, 151n]] as const) {
      const leaf = leaves[index]!;
      const result = await operations.submitAuthorityRootApproval(command, sdk.signAuthorityRootUpdateCommand(command, secret),
        leaf, authority.pathFor(pure.governanceActivatorLeafCommitment(leaf)));
      emit({ phase: "authority-root-approval-finalized", approval: index === 7 ? 1 : 2, transactionId: result.public.txId });
    }
    authority = rotated; rootSequence = 2n;
    assert.deepEqual((await read()).authorityRoots.lookup(namespaceHash).root, rotated.root);
  }

  const privateSentinels: string[] = [];
  let first: Awaited<ReturnType<typeof runFlow>> | undefined;
  async function runFlow(index: 0 | 1) {
    const m4 = m4s[index]!, createdAt = now();
    const requestId = `private-allocation-${randomBytes(16).toString("hex")}`;
    const authorization = m4.registry.authorizeInstantiation("allocator-one", m4.activation, requestId, createdAt);
    const system = new SlotBoundContextAccountSystem(m4.registry);
    const instance = system.createScenarioInstance({ instanceId: `private-instance-${randomBytes(16).toString("hex")}`,
      instantiationRequestId: requestId, template: m4.record.template, expiresAt: createdAt + 14400,
      capabilityIssuers: [{ principalId: "fixture-capability-issuer", kind: "service" },
        { principalId: "fixture-secondary-issuer", kind: "service" }] }, createdAt);
    const prepared = sdk.createRuntimeInstanceAllocation({ authorization, templateRecord: m4.record, instance,
      allocatorAuthority: leaves[12]!, capabilityIssuers: [
        { principalId: "fixture-capability-issuer", kind: "service", authority: leaves[11]! },
        { principalId: "fixture-secondary-issuer", kind: "service", authority: leaves[13]! }],
      authorityRootVersion: rootSequence, authorityRootSequence: rootSequence,
      targetNetworkHash: hex(sdk.hashProtocolIdentifier("network-id", "preprod")), targetContractIdentity: hex(address),
      allocationValidBefore: createdAt + 3600 });
    const allocation = prepared.allocation;
    const allocationPolicy = sdk.createRuntimeAllocationPolicyWitness(m4.record.template, m4.bindings, prepared.stateOpening);
    await checkpoint("remaining-instance-allocation", { index, authorization, instance, allocation,
      stateOpening: prepared.stateOpening, policy: allocationPolicy, rootSequence });
    const prior = publicInstances(await read());
    const allocated = await contract.callTx.allocateRuntimeInstance(allocation, sdk.signRuntimeInstanceAllocation(allocation, 191n),
      leaves[12]!, authority.pathFor(allocation.allocatorAuthorityCommitment), allocationPolicy);
    const after = await read();
    for (const [key, value] of prior) assert.deepEqual(after.runtimeInstances.lookup(key), value);
    emit({ phase: "ordinary-instance-allocated", index, transactionId: allocated.public.txId,
      expiresAtUtc: new Date(instance.expiresAt * 1000).toISOString(), priorInstancesPreserved: true });
    const checked = await runOrdinaryActionWorkflow({ system, instance, template: m4.record.template,
      allocation, stateOpening: prepared.stateOpening, initialCredentialStatus: status,
      credentialStatusIndices: index === 0 ? { account: 7n, capability: 8n, session: 9n } : { account: 10n, capability: 11n, session: 12n },
      issuers: prepared.issuers, authority, issuer: leaves[11]!, issuerSecret: 173n,
      secondaryIssuer: leaves[13]!, secondaryIssuerSecret: 197n, outsiderIssuer: leaves[14]!, outsiderIssuerSecret: 199n,
      allocator: leaves[12]!, allocatorSecret: 191n, allocationPolicy, authorityRootVersion: rootSequence,
      authorityRootSequence: rootSequence, authorityAtAction: () => ({ root: authority, version: rootSequence, sequence: rootSequence }),
      contract, providers, address, governancePolicyHash: policyHash, network: "preprod", profile: input.profile,
      checkpoint, emit: (event, fields) => emit({ event, ...fields }), transitioning: index === 0,
      competingCandidates: index === 0 ? 3 : 2, selectedCandidate: index === 0 ? 1 : 0,
      async afterPrepared(candidate, number) {
        if (index !== 0 || number !== 0) return;
        const before = await read(), proof = await prove(candidate, "once-valid-authority-root-one");
        await wallet.validateCandidate(proof.transaction);
        await rotateAuthority();
        const after = await read();
        assert.deepEqual(publicInstances(before), publicInstances(after));
        assert.deepEqual(before.credentialStatusRoots.lookup(namespaceHash), after.credentialStatusRoots.lookup(namespaceHash));
        assert.deepEqual([...before.activeTemplates], [...after.activeTemplates]);
        assert.deepEqual([...before.proofModules], [...after.proofModules]);
        await wallet.submitNegative(proof.transaction, "stale-authority-root");
        emit({ phase: "stale-authority-root-native-rejection-verified", pairedPositiveControl: true,
          instanceStatusAndModulesUnchanged: true, authoritySequenceBefore: 1, authoritySequenceAfter: 2 });
      },
      async executePrepared(candidates) {
        const winner = index === 0 ? 1 : 0, loser = index === 0 ? 2 : 1;
        await verifyLiveActionMutations({ providers, address, candidate: candidates[winner]!, emit });
        const winnerLabel = index === 0 ? "state-transition-winner" : "non-transitioning-winner";
        const loserLabel = index === 0 ? "independent-competing-transition" : "status-root-positive-control";
        // Freeze both unproven transaction windows before either long proof.
        // Neither proof construction nor balancing changes already proved TTLs.
        const ready = [await createCandidate(candidates[winner]!, winnerLabel), await createCandidate(candidates[loser]!, loserLabel)];
        const proofs = [await prove(candidates[winner]!, winnerLabel, ready[0]), await prove(candidates[loser]!, loserLabel, ready[1])];
        await wallet.validateCandidate(proofs[1]!.transaction);
        const before = await read(), result = await finalize(proofs[0]!);
        if (index === 0) {
          const after = await read(), command = candidates[loser]!.arguments[0];
          assert(after.runtimeActionSessions.member(pure.runtimeActionCommandCommitment(command)));
          assert(!after.usedRuntimeActionNullifiers.member(pure.runtimeScopedActionNullifier(allocation, candidates[loser]!.arguments[2])));
          assert.deepEqual(before.authorityRoots.lookup(namespaceHash), after.authorityRoots.lookup(namespaceHash));
          assert.deepEqual(before.credentialStatusRoots.lookup(namespaceHash), after.credentialStatusRoots.lookup(namespaceHash));
          await wallet.submitNegative(proofs[1]!.transaction, "independent-competing-transition");
          const env = input.profile.environmentForSdk(), cold = indexerPublicDataProvider(env.indexer, env.indexerWS);
          const reconnected = await cold.queryContractState(address); assert(reconnected);
          assert.deepEqual(publicInstances(sdk.readPermioAuthorizationLedger(reconnected.data)), publicInstances(await read()));
          emit({ phase: "same-state-conflict-native-rejected", pairedPositiveControl: true,
            loserPreparationStillPresent: true, loserNullifierUnused: true, dustBalancedAfreshForEachAttempt: true });
        } else {
          assert(first);
          const stable = await read(), stableInstance = stable.runtimeInstances.lookup(allocation.instanceCommitment);
          assert.deepEqual(stableInstance, before.runtimeInstances.lookup(allocation.instanceCommitment));
          const env = input.profile.environmentForSdk(), cold = indexerPublicDataProvider(env.indexer, env.indexerWS);
          const indexed = await cold.queryContractState(address); assert(indexed);
          const reconnected = sdk.readPermioAuthorizationLedger(indexed.data);
          assert.deepEqual(reconnected.runtimeInstances.lookup(allocation.instanceCommitment), stableInstance);
          assert(reconnected.usedRuntimeActionNullifiers.member(pure.runtimeScopedActionNullifier(allocation, candidates[winner]!.arguments[2])));
          await assert.rejects(createUnprovenCallTx(providers, { compiledContract: sdk.permioAuthorizationCompiledContract,
            contractAddress: address, circuitId: "executeRuntimeAction", args: candidates[winner]!.arguments }), /Action nullifier already consumed/u);
          await wallet.submitNegative(proofs[0]!.transaction, "scoped-action-replay-after-cold-reconnect");
          emit({ phase: "non-transitioning-nullifier-replay-native-rejected", stateAndSequenceUnchanged: true,
            coldReconnectVerified: true, exactGeneratedRejectionIdentifiedNullifier: true, dustBalancedAfresh: true });
          const targetAncestry = candidates[loser]!.arguments[3];
          const targetIndices = [targetAncestry.accounts[0]!.statusIndex, targetAncestry.capabilities[0]!.statusIndex, targetAncestry.session.statusIndex];
          const targetLeaves = targetIndices.map(index => status.pathFor(index).leaf.slice());
          await revokeFirstCapability(first);
          assert.deepEqual((await read()).runtimeInstances.lookup(allocation.instanceCommitment), stableInstance);
          assert.deepEqual(targetIndices.map(index => status.pathFor(index).leaf), targetLeaves);
          await wallet.submitNegative(proofs[1]!.transaction, "stale-credential-status-root");
          emit({ phase: "stale-status-root-native-rejection-verified", pairedPositiveControl: true,
            targetInstanceAndTargetCredentialsUnchanged: true, changedOtherInstanceCapabilityOnly: true });
        }
        return result;
      },
    });
    privateSentinels.push(requestId, instance.instanceId, Buffer.from(allocation.allocationNonce).toString("hex"),
      Buffer.from(prepared.stateOpening.nonce).toString("hex"), Buffer.from(allocationPolicy.policy.initialStateIdHash).toString("hex"),
      ...checked.privateSentinels);
    await checkpoint("remaining-ordinary-flow-completed", { index, allocation, instance, checked });
    return { allocation, instance, prepared, checked };
  }

  async function revokeFirstCapability(first: { allocation: sdk.RuntimeInstanceAllocation;
    instance: Parameters<typeof sdk.createRuntimeInstanceAllocation>[0]["instance"];
    prepared: ReturnType<typeof sdk.createRuntimeInstanceAllocation>;
    checked: Awaited<ReturnType<typeof runOrdinaryActionWorkflow>> }) {
    const c = first.checked.setup.credentials; assert(c);
    const binding = sdk.createRuntimeCredentialInstanceBinding(first.allocation, first.prepared.issuers, leaves[11]!,
      now() + 3600, { opening: first.checked.candidates[1]!.expectedNextState, sequence: first.checked.sequence + 1n });
    const cmd = sdk.createRuntimeCredentialStatusCommand({ instanceBinding: binding, namespace: first.instance.namespace,
      governancePolicyHash: policyHash, authorityRootVersion: 2, authorityRootSequence: 2,
      credentialStatusRootSequence: status.sequence, kind: "capability", credentialCommitment: pure.runtimeCapabilityCredentialCommitment(c.capability.credential),
      subjectAccountCredentialCommitment: pure.runtimeAccountCredentialCommitment(c.account),
      revocationAuthorityAccountCredentialCommitment: new Uint8Array(32),
      statusIndex: c.capability.credential.statusIndex, expectedStatus: "active", nextStatus: "revoked",
      effectiveAt: now(), commandNonce: `0x${randomBytes(32).toString("hex")}` });
    const path = status.pathFor(cmd.statusIndex);
    const args = [1n, cmd, sdk.signRuntimeCredentialStatusCommand(cmd, 173n), leaves[11]!,
      authority.pathFor(pure.governanceActivatorLeafCommitment(leaves[11]!)), c.account, status.pathFor(c.account.statusIndex), path,
      c.capability.credential, sdk.signRuntimeCapabilityCredential(c.capability.credential, 173n), c.capability.credential,
      status.pathFor(c.capability.credential.statusIndex), sdk.createEmptyRuntimeScopeProgress(),
      { elementVersion: 1n, dimension: 1n, valueHash: new Uint8Array(32) }, path, path, c.session.credential, binding] as const;
    await checkpoint("first-capability-revocation-prepared", { arguments: args });
    const result = await contract.callTx.updateRuntimeCredentialStatus(...args);
    status.revoke({ namespace: first.instance.namespace, kind: "capability", credentialCommitment: cmd.credentialCommitment,
      revocationAuthorityAccountCredentialCommitment: new Uint8Array(32), statusIndex: cmd.statusIndex });
    assert.deepEqual((await read()).credentialStatusRoots.lookup(namespaceHash).root, status.root);
    emit({ phase: "other-instance-capability-revoked", transactionId: result.public.txId, rootSequence: String(status.sequence) });
  }

  first = await runFlow(0);
  const second = await runFlow(1);
  await checkpoint("two-ordinary-flows-completed", { first, second, privateSentinels });
  const final = await read();
  assert.equal(final.decisionReceipts.size(), 2n); assert.equal(final.usedRuntimeActionNullifiers.size(), 2n);
  emit({ phase: "ordinary-matrix-success-and-negative-tests-finished", receipts: 2, consumedScopedNullifiers: 2,
    nativeNegativeCases: wallet.journalState().negativeCases, pendingPreparationCount: Number(final.runtimeActionSessions.size()),
    resourceAndGovernanceCleanupStillRequired: true, milestoneComplete: false });
  const beforeCleanupInstances = [...final.runtimeInstances];
  const beforeCleanupReceipts = [...final.decisionReceipts];
  for (const [registryKey] of final.activeTemplates) {
    for (const nextLifecycleStatus of [2n, 3n]) {
      const current = (await read()).activeTemplates.lookup(registryKey);
      const command = { commandVersion: 1n, registryKey, recordCommitment: pure.activeTemplateRecordCommitment(current),
        namespaceHash, governancePolicyHash: hex(policyHash), authorityRootVersion: 2n, authorityRootSequence: 2n,
        expectedLifecycleStatus: current.lifecycleStatus, nextLifecycleStatus, effectiveAt: BigInt(now()),
        effectiveSequence: (await read()).templateLifecycleSequence + 1n, reasonHash: randomBytes(32), commandNonce: randomBytes(32) };
      const leaf = leaves[nextLifecycleStatus === 2n ? 9 : 10]!, secret = nextLifecycleStatus === 2n ? 157n : 163n;
      await checkpoint("remaining-template-retirement", { command });
      const result = await contract.callTx.terminateTemplate(command, sdk.signTemplateLifecycleCommand(command, secret), leaf,
        authority.pathFor(pure.governanceActivatorLeafCommitment(leaf)));
      emit({ phase: "test-template-lifecycle-finalized", transactionId: result.public.txId, lifecycleStatus: Number(nextLifecycleStatus) });
    }
  }
  for (const [moduleKey] of final.proofModules) {
    const current = (await read()).proofModules.lookup(moduleKey);
    const command = { commandVersion: 1n, moduleKey, recordCommitment: pure.proofModuleRecordCommitment(current),
      governanceNamespaceHash: namespaceHash, governancePolicyHash: hex(policyHash), authorityRootVersion: 2n, authorityRootSequence: 2n,
      expectedLifecycleStatus: 4n, nextLifecycleStatus: 6n, effectiveAt: BigInt(now()), reasonHash: randomBytes(32), commandNonce: randomBytes(32) };
    const result = await sdk.governanceCallOperations(contract, wallet.withGovernanceOperation).governProofModule(command,
      sdk.signProofModuleLifecycleCommand(command, 113n), leaves[6]!, authority.pathFor(pure.governanceActivatorLeafCommitment(leaves[6]!)));
    emit({ phase: "test-module-emergency-revoked", transactionId: result.public.txId, lifecycleStatus: 6 });
  }
  // These two losing sessions belong to the older first-instance window.
  // Cleanup bypasses authorization only after expiry, granting no authority.
  for (const candidate of [first.checked.candidates[0]!, first.checked.candidates[2]!]) {
    let waits = 0;
    while (BigInt(now() - 120) <= candidate.arguments[0].validBefore) {
      assert(++waits <= 480, "Cleanup wait exceeded four hours; preserve and reconcile the pending session");
      if (waits === 1 || waits % 20 === 0) emit({ phase: "waiting-for-exact-losing-session-expiry",
        expiresAtUtc: new Date(Number(candidate.arguments[0].validBefore) * 1000).toISOString(), nativeSubmissionsDuringWait: 0 });
      await delay(30000);
    }
    const result = await contract.callTx.prepareRuntimeAction(...candidate.preparationArguments);
    emit({ phase: "expired-losing-action-preparation-cleaned", transactionId: result.public.txId, grantsAuthority: false });
  }
  const cleaned = await read();
  assert.deepEqual([...cleaned.runtimeInstances], beforeCleanupInstances);
  assert.deepEqual([...cleaned.decisionReceipts], beforeCleanupReceipts);
  assert([...cleaned.activeTemplates].every(([, record]) => record.lifecycleStatus === 3n));
  assert([...cleaned.proofModules].every(([, record]) => record.lifecycleStatus === 6n));
  assert.equal(cleaned.runtimeActionSessions.size(), 1n);
  assert.equal(wallet.journalState().reservedMaximumAttempts, 100);
  const cold = indexerPublicDataProvider(input.profile.environmentForSdk().indexer, input.profile.environmentForSdk().indexerWS);
  const reconnected = await cold.queryContractState(address); assert(reconnected);
  assert(Buffer.from(reconnected.serialize()).equals(Buffer.from((await providers.publicDataProvider.queryContractState(address))!.serialize())));
  for (const fixture of [input.fixtures.stateful, input.fixtures.nonTransitioning]) {
    privateSentinels.push(...fixture.record.template.states);
    for (const reviewer of fixture.policy.reviewers) privateSentinels.push(reviewer.principalId, reviewer.publicKeyPem);
  }
  const scan = await captureRemainingPublicEvidence({ providers, address, receipts: [first.checked.receipt, second.checked.receipt],
    privateValues: [...privateSentinels, ...input.privateScanValues] });
  emit({ phase: "remaining-preprod-evidence-captured", ...scan, reservedMaximumAttempts: 100,
    remainingPreparationCount: 1, remainingPreparationHasRevokedTemplateAndModule: true,
    remainingPreparationRetainedAsFailClosedTestHistory: true, independentHumanReviewStillRequired: true, milestoneComplete: false });
  return { first, second, privateSentinels };
}
