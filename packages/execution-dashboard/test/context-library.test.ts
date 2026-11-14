import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { test } from "node:test";
import { hashScenarioTemplate } from "@permio/scenario-domain";
import { createReviewerAttestation } from "@permio/scenario-governance";
import { ApplicationStore, ApplicationError } from "../src/application.ts";
import { libraryTemplate } from "./fixtures/context-library.ts";
import { createDashboardServer, readDashboardConfig } from "../src/server.ts";

const NOW = 1_791_900_000;
const credentials = (username: string) => ({ username, password: "synthetic-library-test-password" });

test("general definitions persist all contexts/actions under a fresh server-owned identity", async () => {
  const store = new ApplicationStore(":memory:", () => NOW);
  try {
    const author = await store.register(credentials("library-author"));
    const input = libraryTemplate();
    const draft = store.createBlueprint(author, { template: input });
    assert.equal(draft.state, "draft");
    assert.notEqual(draft.template.namespace, input.namespace);
    assert.notEqual(draft.template.templateId, input.templateId);
    assert.equal(draft.template.version, "2.1.0");
    assert.deepEqual(draft.template.contexts, input.contexts);
    assert.deepEqual(draft.template.actions, input.actions);
    assert.equal(draft.target.templateHash, hashScenarioTemplate(draft.template).value);
    const edited = { ...structuredClone(draft.template), description: "Edited without discarding later contexts" };
    assert.deepEqual(store.updateBlueprint(author, draft.id, { template: edited }).template, edited);
    assert.deepEqual(store.workspace(author).blueprints[0].template, edited);
    assert.throws(() => store.updateBlueprint(author, draft.id, { template: { ...edited, namespace: "forged.namespace" } }), /identity|namespace/i);
    const stranger = await store.register(credentials("library-stranger"));
    assert.equal(store.workspace(stranger).blueprints.length, 0);
    assert.throws(() => store.blueprint(stranger, draft.id), (error) => error instanceof ApplicationError && error.status === 404);
  } finally { store.close(); }
});

test("invalid general definitions do not store partial drafts", async () => {
  const store = new ApplicationStore(":memory:", () => NOW);
  try {
    const author = await store.register(credentials("library-author"));
    const base = libraryTemplate();
    const invalid = { ...base, actions: base.actions.map((action, index) => index === 1 ? { ...action, contextId: "missing-context" } : action) };
    assert.throws(() => store.createBlueprint(author, { template: invalid }), /UNKNOWN_REFERENCE/);
    assert.throws(() => store.createBlueprint(author, { template: { ...libraryTemplate(), script: "alert(1)" } }), /UNKNOWN_FIELD/);
    assert.equal(store.workspace(author).blueprints.length, 0);
  } finally { store.close(); }
});

test("approved allocation binds an immutable complete definition and rejects stale targets before writes", async () => {
  const store = new ApplicationStore(":memory:", () => NOW);
  try {
    const [author, reviewer, approver, allocator, revoker, participant, stranger] = await Promise.all(
      ["author", "reviewer", "approver", "allocator", "revoker", "participant", "stranger"].map((name) => store.register(credentials(name))));
    const key = generateKeyPairSync("ed25519");
    store.registerReviewKey(reviewer, key.publicKey.export({ type: "spki", format: "pem" }).toString().trim());
    const draft = store.createBlueprint(author, { template: libraryTemplate() });
    const values = { name: "Synthetic visit", duration: 3600, participants: "participant", issuer: "allocator", target: draft.target };
    assert.throws(() => store.createInstance(allocator, draft.id, values));
    const submitted = store.mutateBlueprint(author, draft.id, "submit", { reviewer: "reviewer", approver: "approver", allocator: "allocator", revoker: "revoker" });
    store.mutateBlueprint(reviewer, draft.id, "review", { attestation: createReviewerAttestation({ attestationVersion: 1,
      ...submitted.target, reviewerId: reviewer.id, decision: "approve", reviewedAt: NOW }, key.privateKey) });
    store.mutateBlueprint(approver, draft.id, "activate", {});
    assert.throws(() => store.createInstance(author, draft.id, values), /allocator authority/);
    assert.throws(() => store.createInstance(allocator, draft.id, { ...values, target: { ...draft.target, templateHash: `0x${"00".repeat(32)}` } }), /target|version|changed/i);
    assert.equal(store.workspace(allocator).instances.length, 0);
    const instance = store.createInstance(allocator, draft.id, values);
    assert.deepEqual(instance.template, draft.template);
    assert.deepEqual(instance.target, draft.target);
    (instance.template.contexts[1] as { description: string }).description = "Mutation of returned view";
    assert.deepEqual(store.workspace(participant).instances[0].template, draft.template);
    assert.equal(store.workspace(stranger).instances.length, 0);
    store.mutateBlueprint(approver, draft.id, "retire", {});
    assert.throws(() => store.createInstance(allocator, draft.id, values), /retired/);
    assert.deepEqual(store.workspace(participant).instances[0].target, draft.target);
  } finally { store.close(); }
});

test("HTTP library authoring preserves authentication/CSRF and returns actionable domain validation", async () => {
  const server = createDashboardServer(readDashboardConfig({}, { databasePath: ":memory:" }));
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address(); assert.ok(address && typeof address === "object");
  const base = `http://127.0.0.1:${address.port}`;
  try {
    const send = (path: string, body: unknown, extra: Record<string, string> = {}) => fetch(base + path, {
      method: "POST", headers: { origin: base, "content-type": "application/json", ...extra }, body: JSON.stringify(body),
    });
    assert.equal((await send("/api/blueprints", { template: libraryTemplate() })).status, 401);
    const registered = await send("/api/register", credentials("http-author"));
    const cookie = registered.headers.get("set-cookie")!.split(";")[0];
    const session = await registered.json() as { csrf: string };
    assert.equal((await send("/api/blueprints", { template: libraryTemplate() }, { cookie })).status, 403);
    const headers = { cookie, "x-csrf-token": session.csrf };
    const invalid = await send("/api/blueprints", { template: { ...libraryTemplate(), script: "untrusted" } }, headers);
    assert.equal(invalid.status, 400);
    const error = await invalid.json() as { error: string }; assert.match(error.error, /UNKNOWN_FIELD.*script/);
    const saved = await send("/api/blueprints", { template: libraryTemplate() }, headers);
    assert.equal(saved.status, 201);
    const definition = await saved.json() as { template: { contexts: unknown[] } }; assert.equal(definition.template.contexts.length, 2);
    const workspace = await fetch(base + "/api/workspace", { headers: { cookie } });
    assert.equal((await workspace.json() as { blueprints: unknown[] }).blueprints.length, 1);
    const oversized = await send("/api/blueprints", { template: { ...libraryTemplate(), description: "x".repeat(33_000) } }, headers);
    assert.equal(oversized.status, 413);
  } finally { await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); }
});
