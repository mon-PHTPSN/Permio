import assert from "node:assert/strict";
import { lstat, mkdtemp, open, readdir, readFile, rm, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it, mock } from "node:test";
import { createCircuitContext, createConstructorContext, sampleContractAddress } from "@midnight-ntwrk/midnight-js-protocol/compact-runtime";
import { Contract, pureCircuits as pure } from "../../midnight-authorization/contracts/managed/permio-authorization-v11/contract/index.js";
import { ordinaryActionFixture } from "../../midnight-authorization/test/fixtures/ordinary-action.ts";
import { buildAuthorityRoot } from "../../midnight-authorization/src/authority-root.ts";
import { CredentialStatusTree } from "../../midnight-authorization/src/credential-status.ts";
import { permioAuthorizationWitnesses } from "../../midnight-authorization/src/compact-crypto.ts";
import { createRuntimeBusinessTemplateActionPolicy } from "../../midnight-authorization/src/business-template-policy.ts";
import { createLiveBusinessWitnesses, FileAuditAcknowledgmentStore } from "../src/live-business-witnesses.ts";

const bytes = (value: number) => new Uint8Array(32).fill(value);
let base: ReturnType<typeof ordinaryActionFixture> | undefined;
function setup(kind: 1 | 2 | 3 = 1) {
  const f = base ??= ordinaryActionFixture();
  const template = { ...structuredClone(f.template), schemaVersion: 2 as const, version: "2.0.0",
    contexts: f.template.contexts.map(context => ({ ...context, recordTypes: kind === 2 ? ["record-one", "record-two"] : ["record-one"] })),
    actions: f.template.actions.map(action => ({ ...action, inputRecordTypes: kind === 2 ? ["record-one", "record-two"] : ["record-one"] })),
    proofProfiles: [{ id: "action-proof", circuitId: "private-state-transition-predicates-v1", publicOutputSchemaId: "decision-receipt-v1",
      predicates: kind === 2
        ? [{ kind: "bounded-value-v1" as const, inputRecordType: "record-two", ceilingRecordType: "record-one", outputClaimType: "claim-one" }]
        : [{ kind: kind === 3 ? "audit-acknowledgment-v1" as const : "current-record-v1" as const,
          inputRecordType: "record-one", outputClaimType: "claim-one" }],
    }],
  };
  const projection = createRuntimeBusinessTemplateActionPolicy(template, "perform");
  const rootCapability = { ...structuredClone(f.ancestry.capabilities[0]!), target: projection.policy.target };
  const session = { ...structuredClone(f.ancestry.session), target: projection.policy.target,
    capabilityCredentialCommitment: pure.runtimeCapabilityCredentialCommitment(rootCapability) };
  const intent = { ...structuredClone(f.intent), target: projection.policy.target,
    sessionCredentialCommitment: pure.runtimeSessionCredentialCommitment(session) };
  const authority = buildAuthorityRoot([f.issuer]);
  const commitment = pure.governanceActivatorLeafCommitment(f.issuer);
  const status = new CredentialStatusTree();
  const rootCommitment = pure.runtimeCapabilityCredentialCommitment(rootCapability);
  status.issue({ namespace: template.namespace, kind: "capability", statusIndex: rootCapability.statusIndex,
    credentialCommitment: rootCommitment, revocationAuthorityAccountCredentialCommitment: bytes(0) });
  const rootStatus = { leafVersion: 3n, namespaceHash: intent.target.namespaceHash, credentialKind: 2n,
    credentialCommitment: rootCommitment, revocationAuthorityAccountCredentialCommitment: bytes(0),
    statusIndex: rootCapability.statusIndex, status: 1n };
  const record = { body: { privateText: "selected private test record" }, value: 50n,
    unitHash: bytes(40), validAfter: 450n, validBefore: 1000n };
  const records: Record<string, typeof record> = { "record-one": structuredClone(record) };
  if (kind === 2) records["record-two"] = structuredClone(record);
  const input = { template, actionId: "perform", seed: "test:live-business-adapter-v1", anchorUnixSeconds: 500n,
    clock: () => 500, validBefore: 900n, intent, session, rootCapability,
    issuer: { leaf: structuredClone(f.issuer), secret: 11n,
      authorityRoot: authority.root, authorityPath: authority.pathFor(commitment), issuerRoot: authority.root,
      issuerPath: authority.pathFor(commitment), issuerCount: 1n },
    status: { root: status.root, leaf: rootStatus, path: status.pathFor(rootCapability.statusIndex) },
    records,
  };
  const contract = new Contract(permioAuthorizationWitnesses);
  const initial = contract.initialState(createConstructorContext(undefined, "00".repeat(32)), bytes(1),
    intent.target.namespaceHash, bytes(0), authority.root, 1n, 1n, status.root, 2n, 2n, 2n);
  const address = sampleContractAddress();
  const verify = (result: Awaited<ReturnType<typeof createLiveBusinessWitnesses>>) => {
    for (const witness of result.predicateWitnesses) {
      contract.circuits.verifyRuntimeBusinessPredicate(createCircuitContext(address, "00".repeat(32),
        initial.currentContractState.data, undefined, undefined, undefined, 500), result.context,
      witness.predicate, witness.first, witness.second, result.inputs, result.outputs, rootStatus, input.status.path);
    }
  };
  return { input, verify };
}

describe("fresh private business witness preparation", () => {
  it("rejects millisecond, future, stale, and imprecise anchors", async () => {
    const { input } = setup();
    for (const anchorUnixSeconds of [500_000n, 501n, 400n]) {
      await assert.rejects(createLiveBusinessWitnesses({ ...input, anchorUnixSeconds }), /anchor|seconds|fresh/i);
    }
    await assert.rejects(createLiveBusinessWitnesses({ ...input, clock: () => 500.1 }), /clock|seconds/i);
  });

  it("reproduces seeded records and selections while using fresh signature nonces", async () => {
    const { input, verify } = setup();
    const first = await createLiveBusinessWitnesses(input), second = await createLiveBusinessWitnesses(input);
    assert.deepEqual(first.records["record-one"]!.record, second.records["record-one"]!.record);
    assert.deepEqual(first.evidence, second.evidence);
    assert.notDeepEqual(first.records["record-one"]!.signature, second.records["record-one"]!.signature);
    assert.equal(first.nativeAcceptance, false);
    verify(first);
    first.predicateWitnesses[0]!.first.record.bodyCommitment = bytes(250);
    assert.throws(() => verify(first));
  });

  it("rejects a mismatched intent, session, issuer, private body, or incomplete record window", async () => {
    const { input } = setup();
    await assert.rejects(createLiveBusinessWitnesses({ ...input, intent: { ...input.intent, actionIdHash: bytes(251) } }), /intent|action/i);
    await assert.rejects(createLiveBusinessWitnesses({ ...input, session: { ...input.session, subjectAccountCredentialCommitment: bytes(252) } }), /session/i);
    await assert.rejects(createLiveBusinessWitnesses({ ...input, issuer: { ...input.issuer, secret: 12n } }), /issuer|secret/i);
    await assert.rejects(createLiveBusinessWitnesses({ ...input, records: { "record-one": { ...input.records["record-one"]!, validBefore: 899n } } }), /window|deadline/i);
    await assert.rejects(createLiveBusinessWitnesses({ ...input, records: { "record-one": { ...input.records["record-one"]!, body: { invalid: Number.NaN } } } }), /body|JSON/i);
  });

  it("requires exactly every declared input and creates exact output coverage", async () => {
    const { input } = setup();
    await assert.rejects(createLiveBusinessWitnesses({ ...input, records: {} }), /record|input/i);
    await assert.rejects(createLiveBusinessWitnesses({ ...input, records: { ...input.records, extra: input.records["record-one"]! } }), /record|input/i);
    const result = await createLiveBusinessWitnesses(input);
    assert.equal(result.predicateWitnesses.length, 1);
    assert.equal(result.evidence.outputs.length, 1);
  });

  it("derives a delegated terminal subject from the exact session rather than the root holder", async () => {
    const { input } = setup();
    input.session.subjectAccountCredentialCommitment = bytes(249);
    input.session.capabilityCredentialCommitment = bytes(248);
    input.intent.sessionCredentialCommitment = pure.runtimeSessionCredentialCommitment(input.session);
    const result = await createLiveBusinessWitnesses(input);
    assert.deepEqual(result.records["record-one"]!.record.subjectAccountCredentialCommitment, bytes(249));
    assert.notDeepEqual(result.records["record-one"]!.record.subjectAccountCredentialCommitment,
      input.rootCapability.subjectAccountCredentialCommitment);
    // Preparation does not certify the intervening delegated ancestry.
    assert.equal(result.nativeAcceptance, false);
  });

  it("prepares bounded values without claiming that an excessive value was proved", async () => {
    const { input, verify } = setup(2);
    verify(await createLiveBusinessWitnesses(input));
    input.records["record-two"]!.value = 51n;
    const excessive = await createLiveBusinessWitnesses(input);
    assert.equal(excessive.nativeAcceptance, false);
    assert.throws(() => verify(excessive), /ceiling/i);
    input.records["record-two"]!.value = 2n ** 64n;
    await assert.rejects(createLiveBusinessWitnesses(input), /Uint64|value/i);
  });

  it("requires durable audit storage and propagates storage failure before signing", async () => {
    const { input } = setup(3);
    await assert.rejects(createLiveBusinessWitnesses(input), /audit.*store/i);
    await assert.rejects(createLiveBusinessWitnesses({ ...input,
      auditStore: { async saveAndVerify() { throw new Error("audit store unavailable"); } } }), /audit store unavailable/i);
  });

  it("persists and reopens audit material before selecting a detached signed acknowledgment", async () => {
    const directory = await mkdtemp(join(tmpdir(), "permio-private-audit-"));
    try {
      const { input, verify } = setup(3);
      const store = new FileAuditAcknowledgmentStore(directory);
      const result = await createLiveBusinessWitnesses({ ...input, auditStore: store });
      verify(result);
      assert.equal(result.evidence.inputs.length, 1);
      const ack = result.predicateWitnesses[0]!.first.record;
      assert.deepEqual(ack.referenceCommitment, pure.runtimeBusinessAuditReference(
        result.context.intentCommitment, result.evidence.selectedInputsCommitment));
      assert.deepEqual(result.evidence.outputs[0]!.selected.payloadCommitment, pure.runtimeBusinessRecordCommitment(ack));
      const files = await readdir(directory);
      assert.equal(files.length, 1);
      const stored = await readFile(join(directory, files[0]!), "utf8");
      assert.match(stored, /selected private test record/);
      assert.equal(stored.includes("issuerSecret"), false);
      const reopened = await createLiveBusinessWitnesses({ ...input, auditStore: new FileAuditAcknowledgmentStore(directory) });
      assert.deepEqual(reopened.evidence, result.evidence);
      await assert.rejects(createLiveBusinessWitnesses({ ...input,
        auditStore: { async saveAndVerify() { return { commitment: bytes(0) }; } } }), /audit.*commitment/i);
      await writeFile(join(directory, files[0]!), "tampered durable material", "utf8");
      await assert.rejects(createLiveBusinessWitnesses({ ...input, auditStore: store }), /reopened verification/i);
    } finally {
      // The only recursive cleanup target is this test's freshly created directory.
      assert.ok(directory.startsWith(join(tmpdir(), "permio-private-audit-")));
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("retries file durability before acknowledging bytes left by a failed sync", async () => {
    const directory = await mkdtemp(join(tmpdir(), "permio-private-audit-"));
    const probe = await open(join(directory, "prototype-probe"), "wx", 0o600);
    const prototype = Object.getPrototypeOf(probe) as typeof probe;
    const originalSync = prototype.sync;
    await probe.close();
    await unlink(join(directory, "prototype-probe"));
    let failFileSync = true;
    const sync = mock.method(prototype, "sync", async function (this: typeof probe) {
      if (failFileSync && (await this.stat()).isFile()) throw new Error("injected audit file sync failure");
      return originalSync.call(this);
    });
    try {
      const store = new FileAuditAcknowledgmentStore(directory);
      const material = { intentCommitment: bytes(71), selectedInputsCommitment: bytes(72),
        selectedManifestPrivateBody: { selected: "private test body" } };
      await assert.rejects(store.saveAndVerify(material), /injected audit file sync failure/);
      assert.equal((await readdir(directory)).length, 1);
      await assert.rejects(store.saveAndVerify(material), /injected audit file sync failure/);
      failFileSync = false;
      assert.equal((await store.saveAndVerify(material)).commitment.length, 32);
    } finally {
      sync.mock.restore();
      assert.ok(directory.startsWith(join(tmpdir(), "permio-private-audit-")));
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("requires an already provisioned parent instead of creating unsynced ancestors", async () => {
    const directory = await mkdtemp(join(tmpdir(), "permio-private-audit-"));
    try {
      const store = new FileAuditAcknowledgmentStore(join(directory, "missing-parent", "audit"));
      await assert.rejects(store.saveAndVerify({ intentCommitment: bytes(73), selectedInputsCommitment: bytes(74),
        selectedManifestPrivateBody: "private test material" }), /ENOENT/);
    } finally {
      assert.ok(directory.startsWith(join(tmpdir(), "permio-private-audit-")));
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("propagates parent-directory sync failures for a newly created audit directory and retries", {
    skip: process.platform === "win32" ? "Node directory fsync is exercised on POSIX" : false,
  }, async () => {
    const directory = await mkdtemp(join(tmpdir(), "permio-private-audit-"));
    const parentStat = await lstat(directory);
    const probe = await open(directory, "r");
    const prototype = Object.getPrototypeOf(probe) as typeof probe;
    const originalSync = prototype.sync;
    await probe.close();
    let failParentSync = true;
    const sync = mock.method(prototype, "sync", async function (this: typeof probe) {
      const stat = await this.stat();
      if (failParentSync && stat.dev === parentStat.dev && stat.ino === parentStat.ino) {
        throw new Error("injected audit parent sync failure");
      }
      return originalSync.call(this);
    });
    try {
      const store = new FileAuditAcknowledgmentStore(join(directory, "audit"));
      const material = { intentCommitment: bytes(75), selectedInputsCommitment: bytes(76),
        selectedManifestPrivateBody: "private parent-sync test material" };
      await assert.rejects(store.saveAndVerify(material), /injected audit parent sync failure/);
      await assert.rejects(store.saveAndVerify(material), /injected audit parent sync failure/);
      failParentSync = false;
      assert.equal((await store.saveAndVerify(material)).commitment.length, 32);
    } finally {
      sync.mock.restore();
      assert.ok(directory.startsWith(join(tmpdir(), "permio-private-audit-")));
      await rm(directory, { recursive: true, force: true });
    }
  });
});
