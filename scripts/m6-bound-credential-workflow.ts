import assert from "node:assert/strict";
import { generateKeyPairSync, randomBytes } from "node:crypto";
import type { ContextAccountSystem, ScenarioInstance } from "@permio/context-accounts";
import type { ScenarioTemplate } from "@permio/scenario-domain";
import {
  CapabilityAttenuationPlan, SessionAttenuationPlan, CredentialStatusTree,
  createEmptyRuntimeScopeProgress, createEmptyRuntimeSessionCredential,
  createRuntimeAccountCredential, createRuntimeCapabilityCredential, createRuntimeSessionCredential,
  createRuntimeCredentialStatusCommand, createRuntimeCredentialInstanceBinding,
  governanceActivatorPublicKey, signRuntimeCredentialStatusCommand,
  signRuntimeCapabilityCredential, signRuntimeSessionCredential,
  permioAuthorizationPureCircuits as pure, readPermioAuthorizationLedger as ledger,
  type AuthorityRootBuild, type GovernanceActivatorLeaf, type Hex32,
  type ConnectedPermioAuthorizationContract, type PermioAuthorizationProviders,
  type RuntimeCredentialStatusCommand, type RuntimeSessionCredential,
  type RuntimeScopeStage, type RuntimeInstanceAllocation,
} from "@permio/midnight-authorization";

export async function runBoundCredentialWorkflow(input: {
  system: ContextAccountSystem; instance: ScenarioInstance; template: ScenarioTemplate;
  allocation: RuntimeInstanceAllocation; issuers: AuthorityRootBuild; authority: AuthorityRootBuild;
  issuer: GovernanceActivatorLeaf; issuerSecret: bigint;
  secondaryIssuer: GovernanceActivatorLeaf; secondaryIssuerSecret: bigint;
  outsiderIssuer: GovernanceActivatorLeaf; outsiderIssuerSecret: bigint;
  contract: ConnectedPermioAuthorizationContract; providers: PermioAuthorizationProviders;
  address: string; governancePolicyHash: Hex32;
  emit(event: string, fields: Readonly<Record<string, unknown>>): void;
}) {
  const { instance, allocation, contract, providers, issuer, issuerSecret } = input;
  const emit = (name: string, fields: Readonly<Record<string, unknown>>) => input.emit(name, {
    scope: "allocated-credential-and-session-regression-not-action-acceptance", ...fields });
  const bytes = (value: number) => new Uint8Array(32).fill(value);
  const id = (kind: string) => `private-${kind}-${randomBytes(16).toString("hex")}`;
  const holderSecret = 179n;
  emit("allocated-credential-workflow-started", { expectedCredentialTransactions: 21,
    ordinaryActionAcceptance: false });
  const accountKey = generateKeyPairSync("ed25519");
  const sessionKey = generateKeyPairSync("ed25519");
  const action = input.template.actions[0]!;
  const rule = input.template.capabilityRules.find((candidate) => candidate.id === action.capabilityRuleId)!;
  const accountAt = Math.floor(Date.now() / 1000) - 1;
  const accountSource = input.system.registerContextAccount({ accountId: id("account"),
    instanceId: instance.instanceId, contextId: action.contextId, kind: "human",
    publicKeyPem: accountKey.publicKey.export({ type: "spki", format: "pem" }).toString() }, accountAt);
  const account = createRuntimeAccountCredential({ account: accountSource, instance,
    runtimePublicKey: governanceActivatorPublicKey(holderSecret), statusIndex: 7n, validBefore: instance.expiresAt - 1 });
  const accountHash = pure.runtimeAccountCredentialCommitment(account);
  const scope = { actions: [action.id], resourceSelectors: [rule.resourceSelector], resources: [id("record")],
    purposes: [action.purpose], recipientKinds: [action.recipientKind], recipients: [id("recipient")],
    disclosurePolicyIds: [rule.disclosurePolicyId] };
  const grant = input.system.issueRootCapability(instance.capabilityIssuers[0]!.principalId, {
    grantId: id("grant"), instanceId: instance.instanceId, contextId: accountSource.contextId,
    subjectAccountId: accountSource.accountId, scope, notBefore: accountAt,
    expiresAt: instance.expiresAt - 60, maxDelegationDepth: 0 }, accountAt);
  assert(grant.expiresAt - grant.notBefore <= rule.validForSeconds,
    "Live fixture must stay inside its declared M2 duration, even before final policy proof integration");
  const capability = createRuntimeCapabilityCredential({ grant, instanceCommitment: allocation.instanceCommitment,
    subjectAccountCredential: account, statusIndex: 8n,
    namespaceIssuer: { principalId: grant.issuerRef, authority: issuer } });
  const capabilityHash = pure.runtimeCapabilityCredentialCommitment(capability.credential);
  const status = new CredentialStatusTree();
  const binding = createRuntimeCredentialInstanceBinding(allocation, input.issuers, issuer, instance.expiresAt - 1);
  const issuerPath = input.authority.pathFor(pure.governanceActivatorLeafCommitment(issuer));
  let accepted = 0;
  let phase = "account-issuance";
  function command(kind: "account" | "capability" | "session", commitment: Uint8Array,
    index: bigint, stagedUntil = 0, revoke = false): RuntimeCredentialStatusCommand {
    return createRuntimeCredentialStatusCommand({ namespace: instance.namespace, governancePolicyHash: input.governancePolicyHash,
      authorityRootVersion: 1, authorityRootSequence: 1, credentialStatusRootSequence: status.sequence,
      kind, credentialCommitment: commitment, subjectAccountCredentialCommitment: accountHash,
      revocationAuthorityAccountCredentialCommitment: kind === "capability" ? bytes(0) : accountHash,
      statusIndex: index, expectedStatus: revoke ? "active" : "empty", nextStatus: revoke ? "revoked" : "active",
      effectiveAt: revoke ? Math.floor(Date.now() / 1000) - 1 : kind === "account" ? accountAt :
        kind === "capability" ? grant.issuedAt : sessionSource!.issuedAt,
      stagingExpiresAt: stagedUntil, commandNonce: `0x${randomBytes(32).toString("hex")}` });
  }
  let sessionSource: ReturnType<ContextAccountSystem["issueSession"]> | undefined;
  async function send(operation: bigint, cmd: RuntimeCredentialStatusCommand,
    session: RuntimeSessionCredential = createEmptyRuntimeSessionCredential(),
    plan?: CapabilityAttenuationPlan, stage?: RuntimeScopeStage) {
    const path = status.pathFor(cmd.statusIndex);
    const signer = cmd.credentialKind === 3n ? holderSecret : issuerSecret;
    const started = performance.now();
    emit("bound-credential-transaction-started", { phase, operation: Number(operation) });
    const result = await contract.callTx.updateRuntimeCredentialStatus(operation, cmd,
      signRuntimeCredentialStatusCommand(cmd, signer), issuer, issuerPath, account,
      status.pathFor(account.statusIndex), path, capability.credential,
      cmd.credentialKind === 3n ? signRuntimeSessionCredential(session, holderSecret)
        : signRuntimeCapabilityCredential(capability.credential, issuerSecret),
      capability.credential, status.pathFor(capability.credential.statusIndex),
      stage?.progress ?? plan?.currentProgress ?? createEmptyRuntimeScopeProgress(),
      stage?.element ?? { elementVersion: 1n, dimension: 1n, valueHash: bytes(0) },
      stage?.childPath ?? path, stage?.parentPath ?? path, session, binding);
    accepted += 1;
    emit("bound-credential-transaction-accepted", { phase, operation: Number(operation), transactionId: result.public.txId,
      requestToAcceptanceMs: Math.round(performance.now() - started), isolatedProofLatencyMeasured: false });
  }
  const entry = (kind: "account" | "capability" | "session", commitment: Uint8Array, index: bigint) => ({
    namespace: instance.namespace, kind, credentialCommitment: commitment, statusIndex: index,
    revocationAuthorityAccountCredentialCommitment: kind === "capability" ? bytes(0) : accountHash });
  async function verifyRoot() {
    const state = await providers.publicDataProvider.queryContractState(input.address);
    assert(state);
    const view = ledger(state.data);
    const root = view.credentialStatusRoots.lookup(allocation.target.namespaceHash);
    assert.deepEqual(root.root, status.root); assert.equal(root.rootSequence, status.sequence);
    assert.deepEqual(view.runtimeInstances.lookup(allocation.instanceCommitment).allocationCommitment,
      pure.runtimeInstanceAllocationCommitment(allocation));
  }
  const issueAccount = command("account", accountHash, account.statusIndex);
  const outsiderPath = input.authority.pathFor(pure.governanceActivatorLeafCommitment(input.outsiderIssuer));
  await assert.rejects(contract.callTx.updateRuntimeCredentialStatus(1n, issueAccount,
    signRuntimeCredentialStatusCommand(issueAccount, input.outsiderIssuerSecret), input.outsiderIssuer,
    outsiderPath, account, status.pathFor(7n), status.pathFor(7n), capability.credential,
    signRuntimeCapabilityCredential(capability.credential, issuerSecret), capability.credential, status.pathFor(8n),
    createEmptyRuntimeScopeProgress(), { elementVersion: 1n, dimension: 1n, valueHash: bytes(0) },
    status.pathFor(7n), status.pathFor(7n), createEmptyRuntimeSessionCredential(), binding), /not explicitly authorized/u);
  emit("eligible-but-unallocated-issuer-preflight-rejected", { nodeRejectedTransaction: false });
  await send(1n, issueAccount); status.issue(entry("account", accountHash, 7n)); await verifyRoot();
  phase = "root-capability-certification";
  const rootCommand = command("capability", capabilityHash, 8n, grant.expiresAt - 1);
  const rootPlan = new CapabilityAttenuationPlan(capability.scope);
  await send(2n, rootCommand, undefined, rootPlan);
  while (!rootPlan.complete) await send(3n, rootCommand, undefined, rootPlan, rootPlan.stageNext());
  await send(4n, rootCommand, undefined, rootPlan);
  status.issue(entry("capability", capabilityHash, 8n)); await verifyRoot();
  phase = "session-certification";
  const sessionAt = Math.floor(Date.now() / 1000) - 1;
  sessionSource = input.system.issueSession(accountSource.accountId, grant.grantId, {
    sessionId: id("session"), publicKeyPem: sessionKey.publicKey.export({ type: "spki", format: "pem" }).toString(),
    scope, notBefore: sessionAt, expiresAt: instance.expiresAt - 600 }, sessionAt);
  const session = createRuntimeSessionCredential({ session: sessionSource, instanceCommitment: allocation.instanceCommitment,
    subjectAccountCredential: account, capabilityCredential: capability.credential,
    runtimePublicKey: governanceActivatorPublicKey(47n), statusIndex: 9n });
  const sessionHash = pure.runtimeSessionCredentialCommitment(session.credential);
  const sessionCommand = command("session", sessionHash, 9n, sessionSource.expiresAt - 1);
  const sessionPlan = new SessionAttenuationPlan(session.scope, capability.scope);
  await send(2n, sessionCommand, session.credential, sessionPlan);
  while (!sessionPlan.complete) await send(3n, sessionCommand, session.credential, sessionPlan, sessionPlan.stageNext());
  await send(4n, sessionCommand, session.credential, sessionPlan);
  status.issue(entry("session", sessionHash, 9n)); await verifyRoot();
  phase = "session-revocation";
  const revokeSession = command("session", sessionHash, 9n, 0, true);
  await send(1n, revokeSession, session.credential);
  input.system.revokeSession(accountSource.accountId, sessionSource.sessionId, Number(revokeSession.effectiveAt));
  status.revoke(entry("session", sessionHash, 9n)); await verifyRoot();
  phase = "root-capability-original-issuer-revocation";
  const revokeRoot = command("capability", capabilityHash, 8n, 0, true);
  const secondaryBinding = createRuntimeCredentialInstanceBinding(allocation, input.issuers,
    input.secondaryIssuer, instance.expiresAt - 1);
  await assert.rejects(contract.callTx.updateRuntimeCredentialStatus(1n, revokeRoot,
    signRuntimeCredentialStatusCommand(revokeRoot, input.secondaryIssuerSecret), input.secondaryIssuer,
    input.authority.pathFor(pure.governanceActivatorLeafCommitment(input.secondaryIssuer)), account,
    status.pathFor(7n), status.pathFor(8n), capability.credential,
    signRuntimeCapabilityCredential(capability.credential, issuerSecret), capability.credential, status.pathFor(8n),
    createEmptyRuntimeScopeProgress(), { elementVersion: 1n, dimension: 1n, valueHash: bytes(0) },
    status.pathFor(8n), status.pathFor(8n), session.credential, secondaryBinding), /exact original namespace issuer/u);
  emit("allocated-but-nonoriginal-issuer-revocation-preflight-rejected", { nodeRejectedTransaction: false });
  await send(1n, revokeRoot, session.credential);
  input.system.revokeCapability(grant.issuerRef, grant.grantId, Number(revokeRoot.effectiveAt));
  status.revoke(entry("capability", capabilityHash, 8n)); await verifyRoot();
  assert.equal(accepted, 21); assert.equal(status.sequence, 5n);
  emit("allocated-credential-and-session-regression-verified", { acceptedTransactions: accepted,
    credentialStatusRootSequence: Number(status.sequence), capabilityVersion: 3, sessionVersion: 2,
    actualM4M5ApisUsed: true, allocationAndIssuerEnforced: true, ordinaryActionAcceptance: false });
  return { privateSentinels: [accountSource.accountId, grant.grantId, sessionSource.sessionId,
    ...scope.resources, ...scope.recipients, accountSource.publicKeyPem, sessionSource.publicKeyPem] };
}
