import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { describe, it } from "node:test";
import { createCircuitContext, createConstructorContext, sampleContractAddress } from "@midnight-ntwrk/midnight-js-protocol/compact-runtime";
import { Contract, pureCircuits as pure, type RuntimeActionIntent, type RuntimeCapabilityCredential,
  type RuntimeSessionCredential } from "../../midnight-authorization/contracts/managed/permio-authorization-v11/contract/index.js";
import { buildAuthorityRoot } from "../../midnight-authorization/src/authority-root.ts";
import { governanceActivatorPublicKey, permioAuthorizationWitnesses } from "../../midnight-authorization/src/compact-crypto.ts";
import { CredentialStatusTree } from "../../midnight-authorization/src/credential-status.ts";
import { buildRuntimeScopeTrees, hashRuntimeIdentifier } from "../../midnight-authorization/src/runtime-credentials.ts";
import { createRuntimeBusinessTemplateActionPolicy } from "../../midnight-authorization/src/business-template-policy.ts";
import { SCENARIO_PACKS, getScenarioPack } from "../src/templates.ts";
import type { ScenarioPackFlow, ScenarioPackId } from "../src/model.ts";
import { createLiveBusinessWitnesses, FileAuditAcknowledgmentStore,
  type LiveBusinessRecordDeclaration, type LiveBusinessWitnessInput } from "../src/live-business-witnesses.ts";

const bytes = (value: number) => new Uint8Array(32).fill(value);
const digest = (value: string) => createHash("sha256").update(value).digest();
const hex = (value: Uint8Array) => Buffer.from(value).toString("hex");
const packIds = Object.keys(SCENARIO_PACKS) as ScenarioPackId[];

/** Synthetic eligibility/status context for compiled predicate evaluation; no issuance or final-ledger acceptance. */
function fixture(packId: ScenarioPackId, seed: string, flow: ScenarioPackFlow) {
  const pack = getScenarioPack(packId), template = pack.template;
  const projection = createRuntimeBusinessTemplateActionPolicy(template, flow.actionId);
  const action = template.actions.find(row => row.id === flow.actionId)!;
  const rule = template.capabilityRules.find(row => row.id === action.capabilityRuleId)!;
  const target = projection.policy.target;
  const issuer = { leafVersion: 1n, namespaceHash: target.namespaceHash, governancePolicyHash: bytes(0),
    authorityKind: 6n, publicKey: governanceActivatorPublicKey(11n), validAfter: 100n, validBefore: 1000n };
  const issuerCommitment = pure.governanceActivatorLeafCommitment(issuer);
  const authority = buildAuthorityRoot([issuer]);
  const common = { target, instanceCommitment: digest(`${packId}:${seed}:${flow.id}:instance`),
    contextHash: hashRuntimeIdentifier("context-id", flow.contextId) };
  const scopes = buildRuntimeScopeTrees({ actions: [flow.actionId], resourceSelectors: [flow.resourceSelector],
    resources: [flow.resource], purposes: [flow.purpose], recipientKinds: [flow.recipientKind],
    recipients: [flow.recipient], disclosurePolicyIds: [flow.disclosurePolicyId] });
  const counts = { actionsCount: 1n, resourceSelectorsCount: 1n, resourcesCount: 1n, purposesCount: 1n,
    recipientKindsCount: 1n, recipientsCount: 1n, disclosurePolicyIdsCount: 1n };
  const subject = digest(`${packId}:${seed}:${flow.id}:subject`);
  const rootCapability: RuntimeCapabilityCredential = { ...common, credentialVersion: 3n,
    grantIdHash: digest(`${seed}:${flow.id}:grant`), m5GrantCommitment: digest(`${seed}:${flow.id}:grant-source`),
    subjectAccountCredentialCommitment: subject, parentCapabilityCredentialCommitment: bytes(0),
    issuerAccountCredentialCommitment: bytes(0), namespaceIssuerAuthorityCommitment: issuerCommitment,
    scopeRoots: scopes.roots, scopeCounts: counts, notBefore: 450n, expiresAt: 700n,
    delegationDepth: 0n, maxDelegationDepth: BigInt(rule.maxDelegationDepth), statusIndex: 1n, issuedAt: 450n };
  assert.ok(rootCapability.expiresAt - rootCapability.notBefore <= BigInt(rule.validForSeconds));
  const rootCommitment = pure.runtimeCapabilityCredentialCommitment(rootCapability);
  const session: RuntimeSessionCredential = { ...common, credentialVersion: 2n,
    sessionIdHash: digest(`${seed}:${flow.id}:session`), m5SessionCommitment: digest(`${seed}:${flow.id}:session-source`),
    subjectAccountCredentialCommitment: subject, capabilityCredentialCommitment: rootCommitment,
    scopeRoots: scopes.roots, scopeCounts: counts, runtimePublicKey: governanceActivatorPublicKey(31n),
    notBefore: 460n, expiresAt: 650n, statusIndex: 2n, issuedAt: 460n };
  const intent: RuntimeActionIntent = { ...common, intentVersion: 1n,
    sessionCredentialCommitment: pure.runtimeSessionCredentialCommitment(session),
    actionIdHash: hashRuntimeIdentifier("action-id", flow.actionId),
    resourceSelectorHash: hashRuntimeIdentifier("resource-selector", flow.resourceSelector),
    resourceHash: hashRuntimeIdentifier("resource", flow.resource), purposeHash: hashRuntimeIdentifier("purpose", flow.purpose),
    recipientKindHash: hashRuntimeIdentifier("recipient-kind", flow.recipientKind),
    recipientHash: hashRuntimeIdentifier("recipient", flow.recipient),
    disclosurePolicyIdHash: hashRuntimeIdentifier("disclosure-policy-id", flow.disclosurePolicyId),
    m5IntentCommitment: digest(`${seed}:${flow.id}:intent-source`), issuedAt: 480n, nonceHash: digest(`${seed}:${flow.id}:intent-nonce`) };
  const status = new CredentialStatusTree();
  const entry = { namespace: template.namespace, kind: "capability" as const, statusIndex: rootCapability.statusIndex,
    credentialCommitment: rootCommitment, revocationAuthorityAccountCredentialCommitment: bytes(0) };
  status.issue(entry);
  const rootStatus = { leafVersion: 3n, namespaceHash: target.namespaceHash, credentialKind: 2n,
    credentialCommitment: rootCommitment, revocationAuthorityAccountCredentialCommitment: bytes(0),
    statusIndex: 1n, status: 1n };
  const records: Record<string, LiveBusinessRecordDeclaration> = {};
  const privateMarkers: string[] = [];
  for (const type of action.inputRecordTypes) {
    const marker = `private-generated-witness:${packId}:${seed}:${flow.id}:${type}`;
    privateMarkers.push(marker);
    records[type] = { body: { selectedPrivateMarker: marker }, value: 50n, unitHash: digest("test:shared-value-unit"),
      validAfter: 450n, validBefore: 700n };
  }
  const input: LiveBusinessWitnessInput = { template, actionId: flow.actionId, seed, anchorUnixSeconds: 500n,
    clock: () => 500, validBefore: 600n, intent, session, rootCapability,
    issuer: { leaf: issuer, secret: 11n, authorityRoot: authority.root, authorityPath: authority.pathFor(issuerCommitment),
      issuerRoot: authority.root, issuerPath: authority.pathFor(issuerCommitment), issuerCount: 1n },
    status: { root: status.root, leaf: rootStatus, path: status.pathFor(rootCapability.statusIndex) }, records };
  const contract = new Contract(permioAuthorizationWitnesses);
  const initial = contract.initialState(createConstructorContext(undefined, "00".repeat(32)), bytes(1),
    target.namespaceHash, bytes(0), authority.root, 1n, 1n, status.root, 2n, 2n, 2n);
  const address = sampleContractAddress();
  function verify(result: Awaited<ReturnType<typeof createLiveBusinessWitnesses>>) {
    for (const witness of result.predicateWitnesses) {
      contract.circuits.verifyRuntimeBusinessPredicate(createCircuitContext(address, "00".repeat(32),
        initial.currentContractState.data, undefined, undefined, undefined, 500), result.context,
      witness.predicate, witness.first, witness.second, result.inputs, result.outputs, result.rootStatus, result.rootStatusPath);
    }
  }
  return { input, action, projection, privateMarkers, verify, status, statusEntry: entry };
}

describe("actual generated-pack profiles through compiled business predicates (synthetic eligibility only)", () => {
  for (const packId of packIds) {
    const pack = getScenarioPack(packId);
    for (const seed of pack.seeds) {
      for (const flow of pack.flows) {
        it(`${packId}/${seed}/${flow.id} accepts every configured predicate and keeps bodies out of commitment captures`, async () => {
          const f = fixture(packId, seed, flow);
          const directory = resolve(await mkdtemp(join(tmpdir(), "permio-generated-business-")));
          try {
            const result = await createLiveBusinessWitnesses({ ...f.input, auditStore: new FileAuditAcknowledgmentStore(directory) });
            assert.equal(result.nativeAcceptance, false);
            assert.equal(result.predicateWitnesses.length, Number(f.projection.policy.predicateCount));
            assert.equal(result.evidence.inputs.length, f.action.inputRecordTypes.length);
            assert.equal(result.evidence.outputs.length, f.action.outputClaimTypes.length);
            assert.deepEqual(result.context.target, f.projection.policy.target);
            assert.deepEqual(result.context.contextHash, f.projection.policy.contextHash);
            assert.doesNotThrow(() => f.verify(result));
            const publicCommitmentCapture = JSON.stringify({
              selectedInputsCommitment: hex(result.evidence.selectedInputsCommitment),
              selectedOutputsCommitment: hex(result.evidence.selectedOutputsCommitment),
              outputCommitments: result.evidence.outputs.map(row => hex(row.selected.payloadCommitment)),
            });
            for (const marker of f.privateMarkers) {
              for (const encoding of [marker, Buffer.from(marker).toString("base64"), Buffer.from(marker).toString("hex")]) {
                assert.equal(publicCommitmentCapture.includes(encoding), false);
              }
            }
          } finally {
            assert.equal(dirname(directory), resolve(tmpdir()));
            assert.ok(directory.startsWith(join(resolve(tmpdir()), "permio-generated-business-")));
            await rm(directory, { recursive: true, force: true });
          }
        });
      }
    }
  }

  it("rejects one above the actual purchasing profile's signed ceiling", async () => {
    const pack = getScenarioPack("delegated-purchasing-agent");
    const f = fixture(pack.id, pack.seeds[0], pack.flows[0]!);
    const bounded = pack.template.proofProfiles[0]!.predicates!.find(row => row.kind === "bounded-value-v1")!;
    const records = { ...f.input.records,
      [bounded.inputRecordType]: { ...f.input.records[bounded.inputRecordType]!, value: 51n } };
    const result = await createLiveBusinessWitnesses({ ...f.input, records });
    assert.equal(result.nativeAcceptance, false);
    assert.throws(() => f.verify(result), /ceiling/i);
  });

  it("rejects a genuinely revoked root in the actual qualification profile's current status root", async () => {
    const pack = getScenarioPack("professional-site-access");
    const f = fixture(pack.id, pack.seeds[0], pack.flows[0]!);
    const result = await createLiveBusinessWitnesses(f.input);
    f.status.revoke(f.statusEntry);
    result.rootStatus.status = 2n;
    result.rootStatusPath = f.status.pathFor(f.statusEntry.statusIndex);
    result.context.statusRoot = f.status.root;
    assert.throws(() => f.verify(result), /active|status/i);
  });

  it("rejects missing durable audit storage for the actual emergency profile", async () => {
    const pack = getScenarioPack("clinical-referral-consent");
    const flow = pack.flows.find(row => row.id === "emergency-access")!;
    const f = fixture(pack.id, pack.seeds[0], flow);
    await assert.rejects(createLiveBusinessWitnesses(f.input), /audit.*store/i);
  });
});
