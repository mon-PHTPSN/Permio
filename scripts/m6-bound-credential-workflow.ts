import assert from "node:assert/strict";
import { generateKeyPairSync, randomBytes } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import type { ContextAccountSystem, ScenarioInstance } from "@permio/context-accounts";
import type { ScenarioTemplate } from "@permio/scenario-domain";
import {
  CapabilityAttenuationPlan, SessionAttenuationPlan, CredentialStatusTree,
  createEmptyRuntimeScopeProgress, createEmptyRuntimeSessionCredential,
  createRuntimeAccountCredential, createRuntimeCapabilityCredential, createRuntimeSessionCredential,
  createRuntimeCredentialStatusCommand, createRuntimeCredentialInstanceBinding,
  advanceRuntimeCredentialInstanceBinding,
  governanceActivatorPublicKey, signRuntimeCredentialStatusCommand,
  signRuntimeCapabilityCredential, signRuntimeSessionCredential,
  permioAuthorizationPureCircuits as pure, readPermioAuthorizationLedger as ledger,
  type AuthorityRootBuild, type GovernanceActivatorLeaf, type Hex32,
  type ConnectedPermioAuthorizationContract, type PermioAuthorizationProviders,
  type RuntimeCredentialStatusCommand, type RuntimeSessionCredential,
  type RuntimeScopeStage, type RuntimeInstanceAllocation, type RuntimeStateOpening,
} from "@permio/midnight-authorization";

export async function runBoundCredentialWorkflow(input: {
  system: Pick<ContextAccountSystem, "registerContextAccount" | "issueRootCapability" | "issueSession" |
    "revokeCapability" | "revokeSession">; instance: ScenarioInstance; template: ScenarioTemplate;
  allocation: RuntimeInstanceAllocation; issuers: AuthorityRootBuild; authority: AuthorityRootBuild;
  stateOpening: RuntimeStateOpening;
  issuer: GovernanceActivatorLeaf; issuerSecret: bigint;
  secondaryIssuer: GovernanceActivatorLeaf; secondaryIssuerSecret: bigint;
  outsiderIssuer: GovernanceActivatorLeaf; outsiderIssuerSecret: bigint;
  contract: ConnectedPermioAuthorizationContract; providers: PermioAuthorizationProviders;
  address: string; governancePolicyHash: Hex32;
  retainForOrdinaryAction?: boolean;
  initialCredentialStatus?: CredentialStatusTree;
  authorityRootVersion?: bigint;
  authorityRootSequence?: bigint;
  credentialStatusIndices?: { account: bigint; capability: bigint; session: bigint };
  /** Schedule a fresh test grant without extending its template duration. */
  rootCapabilityNotBeforeDelaySeconds?: 3600;
  afterRootCapabilityCertified?(credentials: {
    accountSource: ReturnType<ContextAccountSystem["registerContextAccount"]>;
    account: ReturnType<typeof createRuntimeAccountCredential>; status: CredentialStatusTree;
    binding: ReturnType<typeof createRuntimeCredentialInstanceBinding>;
  }): Promise<ReturnType<typeof createRuntimeCredentialInstanceBinding>>;
  checkpoint?(stage: string, value: unknown): Promise<void>;
  emit(event: string, fields: Readonly<Record<string, unknown>>): void;
}) {
  const { instance, allocation, contract, providers, issuer, issuerSecret } = input;
  const emit = (name: string, fields: Readonly<Record<string, unknown>>) => input.emit(name, {
    scope: "allocated-credential-and-session-regression-not-action-acceptance", ...fields });
  const bytes = (value: number) => new Uint8Array(32).fill(value);
  const id = (kind: string) => `private-${kind}-${randomBytes(16).toString("hex")}`;
  const holderSecret = 179n;
  const indices = input.credentialStatusIndices ?? { account: 7n, capability: 8n, session: 9n };
  assert(new Set(Object.values(indices)).size === 3);
  emit("allocated-credential-workflow-started", { expectedCredentialTransactions: 21,
    ordinaryActionAcceptance: false });
  const accountKey = generateKeyPairSync("ed25519");
  const sessionKey = generateKeyPairSync("ed25519");
  const privateKeySentinels = [accountKey, sessionKey].flatMap(key => [
    key.privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
    key.privateKey.export({ type: "pkcs8", format: "der" }).toString("hex"),
    key.publicKey.export({ type: "spki", format: "der" }).toString("hex"),
    key.privateKey.export({type:"pkcs8",format:"der"}).subarray(-32).toString("hex"),
    key.publicKey.export({type:"spki",format:"der"}).subarray(-32).toString("hex"),
  ]);
  const action = input.template.actions[0]!;
  const rule = input.template.capabilityRules.find((candidate) => candidate.id === action.capabilityRuleId)!;
  const accountAt = Math.floor(Date.now() / 1000) - 1;
  const accountSource = input.system.registerContextAccount({ accountId: id("account"),
    instanceId: instance.instanceId, contextId: action.contextId, kind: "human",
    publicKeyPem: accountKey.publicKey.export({ type: "spki", format: "pem" }).toString() }, accountAt);
  const account = createRuntimeAccountCredential({ account: accountSource, instance,
    runtimePublicKey: governanceActivatorPublicKey(holderSecret), statusIndex: indices.account, validBefore: instance.expiresAt - 1 });
  const accountHash = pure.runtimeAccountCredentialCommitment(account);
  const scope = { actions: [action.id], resourceSelectors: [rule.resourceSelector], resources: [id("record")],
    purposes: [action.purpose], recipientKinds: [action.recipientKind], recipients: [id("recipient")],
    disclosurePolicyIds: [rule.disclosurePolicyId] };
  const grantNotBefore = accountAt + (input.rootCapabilityNotBeforeDelaySeconds ?? 0);
  const grant = input.system.issueRootCapability(instance.capabilityIssuers[0]!.principalId, {
    grantId: id("grant"), instanceId: instance.instanceId, contextId: accountSource.contextId,
    subjectAccountId: accountSource.accountId, scope, notBefore: grantNotBefore,
    expiresAt: Math.min(instance.expiresAt - 60, grantNotBefore + rule.validForSeconds), maxDelegationDepth: 0 }, accountAt);
  assert(grant.expiresAt - grant.notBefore <= rule.validForSeconds,
    "Live fixture must stay inside its declared M2 duration, even before final policy proof integration");
  const capability = createRuntimeCapabilityCredential({ grant, instanceCommitment: allocation.instanceCommitment,
    subjectAccountCredential: account, statusIndex: indices.capability,
    namespaceIssuer: { principalId: grant.issuerRef, authority: issuer } });
  const capabilityHash = pure.runtimeCapabilityCredentialCommitment(capability.credential);
  const status = input.initialCredentialStatus ?? new CredentialStatusTree();
  const initialStatusSequence = status.sequence;
  let binding = createRuntimeCredentialInstanceBinding(allocation, input.issuers, issuer, instance.expiresAt - 1,
    { opening: input.stateOpening, sequence: 0n });
  const privateStateNonces = [binding.state.nonce, binding.nextStateNonce];
  const issuerPath = input.authority.pathFor(pure.governanceActivatorLeafCommitment(issuer));
  let accepted = 0;
  let phase = "account-issuance";
  if (input.retainForOrdinaryAction) await input.checkpoint?.("ordinary-account-and-root-prepared", {
    accountSource, account, grant, capability, scope, binding, holderSecret,
    accountPrivateKeyPem: accountKey.privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
  });
  function command(kind: "account" | "capability" | "session", commitment: Uint8Array,
    index: bigint, stagedUntil = 0, revoke = false): RuntimeCredentialStatusCommand {
    return createRuntimeCredentialStatusCommand({ instanceBinding: binding, namespace: instance.namespace, governancePolicyHash: input.governancePolicyHash,
      authorityRootVersion: Number(input.authorityRootVersion ?? 1n), authorityRootSequence: Number(input.authorityRootSequence ?? 1n), credentialStatusRootSequence: status.sequence,
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
    const argumentsForCall = [operation, cmd,
      signRuntimeCredentialStatusCommand(cmd, signer), issuer, issuerPath, account,
      status.pathFor(account.statusIndex), path, capability.credential,
      cmd.credentialKind === 3n ? signRuntimeSessionCredential(session, holderSecret)
        : signRuntimeCapabilityCredential(capability.credential, issuerSecret),
      capability.credential, status.pathFor(capability.credential.statusIndex),
      stage?.progress ?? plan?.currentProgress ?? createEmptyRuntimeScopeProgress(),
      stage?.element ?? { elementVersion: 1n, dimension: 1n, valueHash: bytes(0) },
      stage?.childPath ?? path, stage?.parentPath ?? path, session, binding] as const;
    if (input.retainForOrdinaryAction) await input.checkpoint?.("ordinary-credential-call-prepared", {
      phase, arguments: argumentsForCall, acceptedCredentialTransactions: accepted,
    });
    const result = await contract.callTx.updateRuntimeCredentialStatus(...argumentsForCall);
    if (operation === 1n || operation === 4n) {
      binding = advanceRuntimeCredentialInstanceBinding(binding, cmd);
      privateStateNonces.push(binding.nextStateNonce);
    }
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
    const currentInstance = view.runtimeInstances.lookup(allocation.instanceCommitment);
    assert.deepEqual(currentInstance.currentStateCommitment, pure.runtimeStateCommitment(binding.state));
    assert.equal(currentInstance.transitionSequence, binding.stateSequence);
  }
  const issueAccount = command("account", accountHash, account.statusIndex);
  const outsiderPath = input.authority.pathFor(pure.governanceActivatorLeafCommitment(input.outsiderIssuer));
  await assert.rejects(contract.callTx.updateRuntimeCredentialStatus(1n, issueAccount,
    signRuntimeCredentialStatusCommand(issueAccount, input.outsiderIssuerSecret), input.outsiderIssuer,
    outsiderPath, account, status.pathFor(indices.account), status.pathFor(indices.account), capability.credential,
    signRuntimeCapabilityCredential(capability.credential, issuerSecret), capability.credential, status.pathFor(indices.capability),
    createEmptyRuntimeScopeProgress(), { elementVersion: 1n, dimension: 1n, valueHash: bytes(0) },
    status.pathFor(indices.account), status.pathFor(indices.account), createEmptyRuntimeSessionCredential(), binding), /not explicitly authorized/u);
  emit("eligible-but-unallocated-issuer-preflight-rejected", { nodeRejectedTransaction: false });
  await send(1n, issueAccount); status.issue(entry("account", accountHash, indices.account)); await verifyRoot();
  phase = "root-capability-certification";
  const rootCommand = command("capability", capabilityHash, indices.capability, grant.expiresAt - 1);
  const rootPlan = new CapabilityAttenuationPlan(capability.scope);
  await send(2n, rootCommand, undefined, rootPlan);
  while (!rootPlan.complete) await send(3n, rootCommand, undefined, rootPlan, rootPlan.stageNext());
  await send(4n, rootCommand, undefined, rootPlan);
  status.issue(entry("capability", capabilityHash, indices.capability)); await verifyRoot();
  if (input.afterRootCapabilityCertified) {
    const prior = binding;
    binding = await input.afterRootCapabilityCertified({ accountSource, account, status, binding });
    assert.equal(binding.stateSequence, prior.stateSequence + 1n);
    privateStateNonces.push(binding.state.nonce, binding.nextStateNonce);
    await verifyRoot();
  }
  if (grant.notBefore > Math.floor(Date.now() / 1000) - 1) {
    emit("future-capability-awaiting-real-activation-time", { privateCredentialValidityLogged: false,
      templateDurationPreserved: true, sessionIssuedBeforeParentActive: false, permissionGrantedByWaiting: false });
    while (Math.floor(Date.now() / 1000) - 1 < grant.notBefore) await delay(Math.min(30000,
      (grant.notBefore + 1) * 1000 - Date.now()));
  }
  phase = "session-certification";
  const sessionAt = Math.floor(Date.now() / 1000) - 1;
  sessionSource = input.system.issueSession(accountSource.accountId, grant.grantId, {
    sessionId: id("session"), publicKeyPem: sessionKey.publicKey.export({ type: "spki", format: "pem" }).toString(),
    scope, notBefore: sessionAt, expiresAt: Math.min(instance.expiresAt - 600, grant.expiresAt - 60) }, sessionAt);
  const session = createRuntimeSessionCredential({ session: sessionSource, instanceCommitment: allocation.instanceCommitment,
    subjectAccountCredential: account, capabilityCredential: capability.credential,
    runtimePublicKey: governanceActivatorPublicKey(47n), statusIndex: indices.session });
  const sessionHash = pure.runtimeSessionCredentialCommitment(session.credential);
  if (input.retainForOrdinaryAction) await input.checkpoint?.("ordinary-credentials-prepared", {
    accountSource, account, grant, capability, scope, sessionSource, session, statusSequence: status.sequence,
    binding, holderSecret, sessionSecret: 47n,
    sessionPrivateKeyPem: sessionKey.privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
    accountPrivateKeyPem: accountKey.privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
  });
  const sessionCommand = command("session", sessionHash, indices.session, sessionSource.expiresAt - 1);
  const sessionPlan = new SessionAttenuationPlan(session.scope, capability.scope);
  await send(2n, sessionCommand, session.credential, sessionPlan);
  while (!sessionPlan.complete) await send(3n, sessionCommand, session.credential, sessionPlan, sessionPlan.stageNext());
  await send(4n, sessionCommand, session.credential, sessionPlan);
  status.issue(entry("session", sessionHash, indices.session)); await verifyRoot();
  if (input.retainForOrdinaryAction) {
    assert.equal(accepted, 19); assert.equal(status.sequence, initialStatusSequence + 3n);
    assert.equal(binding.stateSequence, input.afterRootCapabilityCertified ? 4n : 3n);
    emit("ordinary-credentials-certified", { acceptedTransactions: accepted, credentialStatusRootSequence: Number(status.sequence),
      instanceStateSequence: Number(binding.stateSequence), actualM4M5ApisUsed: true, ordinaryActionAcceptance: false });
    return { privateSentinels: [accountSource.accountId, grant.grantId, sessionSource.sessionId,
      ...privateStateNonces.map(nonce => Buffer.from(nonce).toString("hex")), ...scope.resources, ...scope.recipients,
      accountSource.publicKeyPem, sessionSource.publicKeyPem, ...privateKeySentinels],
      credentials: { accountSource, account, grant, capability, scope, sessionSource, session, status,
        binding, holderSecret, sessionSecret: 47n, sessionPrivateKey: sessionKey.privateKey } };
  }
  phase = "session-revocation";
  const revokeSession = command("session", sessionHash, indices.session, 0, true);
  await send(1n, revokeSession, session.credential);
  input.system.revokeSession(accountSource.accountId, sessionSource.sessionId, Number(revokeSession.effectiveAt));
  status.revoke(entry("session", sessionHash, indices.session)); await verifyRoot();
  phase = "root-capability-original-issuer-revocation";
  const revokeRoot = command("capability", capabilityHash, indices.capability, 0, true);
  const secondaryBinding = createRuntimeCredentialInstanceBinding(allocation, input.issuers,
    input.secondaryIssuer, instance.expiresAt - 1,
    { opening: binding.state, sequence: binding.stateSequence, nextNonce: binding.nextStateNonce });
  await assert.rejects(contract.callTx.updateRuntimeCredentialStatus(1n, revokeRoot,
    signRuntimeCredentialStatusCommand(revokeRoot, input.secondaryIssuerSecret), input.secondaryIssuer,
    input.authority.pathFor(pure.governanceActivatorLeafCommitment(input.secondaryIssuer)), account,
    status.pathFor(indices.account), status.pathFor(indices.capability), capability.credential,
    signRuntimeCapabilityCredential(capability.credential, issuerSecret), capability.credential, status.pathFor(indices.capability),
    createEmptyRuntimeScopeProgress(), { elementVersion: 1n, dimension: 1n, valueHash: bytes(0) },
    status.pathFor(indices.capability), status.pathFor(indices.capability), session.credential, secondaryBinding), /exact original namespace issuer/u);
  emit("allocated-but-nonoriginal-issuer-revocation-preflight-rejected", { nodeRejectedTransaction: false });
  await send(1n, revokeRoot, session.credential);
  input.system.revokeCapability(grant.issuerRef, grant.grantId, Number(revokeRoot.effectiveAt));
  status.revoke(entry("capability", capabilityHash, indices.capability)); await verifyRoot();
  assert.equal(accepted, 21); assert.equal(status.sequence, initialStatusSequence + 5n);
  assert.equal(binding.stateSequence, 5n);
  emit("allocated-credential-and-session-regression-verified", { acceptedTransactions: accepted,
    instanceStateSequence: Number(binding.stateSequence),
    currentStateCommitment: Buffer.from(pure.runtimeStateCommitment(binding.state)).toString("hex"),
    credentialStatusRootSequence: Number(status.sequence), capabilityVersion: 3, sessionVersion: 2,
    actualM4M5ApisUsed: true, allocationAndIssuerEnforced: true, ordinaryActionAcceptance: false });
  return { privateSentinels: [accountSource.accountId, grant.grantId, sessionSource.sessionId,
    ...privateStateNonces.map(nonce => Buffer.from(nonce).toString("hex")),
    ...scope.resources, ...scope.recipients, accountSource.publicKeyPem, sessionSource.publicKeyPem, ...privateKeySentinels] };
}
