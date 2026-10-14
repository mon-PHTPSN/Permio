import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { createReviewerAttestation } from "@permio/scenario-governance";
import { ApplicationStore, ApplicationError } from "../src/application.ts";
import { createDashboardServer, fetchDashboardReadModel, readDashboardConfig } from "../src/server.ts";

const NOW = 1_791_900_000;
const input = { name: "Temporary access", description: "Access for a scheduled visit.", context: "Site entrance", action: "Enter site", purpose: "Scheduled visit", recipientKind: "Site operator", resource: "Site entrance", duration: 900 };
const credentials = (name: string) => ({ username: name, displayName: name, password: "test-only-strong-password" });
const makeStore = () => new ApplicationStore(":memory:", () => NOW);

test("hosted deployment keeps health independent of Envio and requires secure account cookies", async () => {
  const config = readDashboardConfig({
    PERMIO_DASHBOARD_HOST: "0.0.0.0",
    PERMIO_APP_LOCAL_DEMO: "false",
    PERMIO_APP_SECURE_COOKIES: "true",
  }, { databasePath: ":memory:", fetchImplementation: async () => { throw new Error("Envio offline"); } });
  assert.equal(config.localDemo, false);
  const server = createDashboardServer(config);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const base = `http://127.0.0.1:${address.port}`;
  try {
    const health = await fetch(`${base}/healthz`);
    assert.equal(health.status, 200);
    assert.deepEqual(await health.json(), { status: "ok" });
    const register = (password: string) => fetch(`${base}/api/register`, {
      method: "POST", headers: { "content-type": "application/json", origin: base },
      body: JSON.stringify({ username: "hosted-user", password }),
    });
    assert.equal((await register("1234")).status, 400);
    const response = await register("hosted-test-only-password");
    assert.equal(response.status, 200);
    assert.match(response.headers.get("set-cookie") ?? "", /; Secure/);
    assert.match(response.headers.get("set-cookie") ?? "", /HttpOnly; SameSite=Strict/);
    const cookie = response.headers.get("set-cookie")!.split(";")[0];
    assert.equal((await fetch(`${base}/api/m8/read-model`, { headers: { cookie } })).status, 503);
    assert.equal((await fetch(`${base}/healthz`)).status, 200);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});

test("local accounts persist with salted hashes, not plaintext passwords or registration roles", async () => {
  const path = join(mkdtempSync(join(tmpdir(), "permio-accounts-")), "accounts.sqlite");
  let store = new ApplicationStore(path, () => NOW);
  const user = await store.identity.register({ ...credentials("author"), role: "administrator", isAdministrator: true });
  assert.equal("isAdministrator" in user, false);
  const row = store.db.prepare("SELECT passwordHash,salt FROM accounts WHERE id=?").get(user.id)!;
  assert.equal(JSON.stringify(row).includes(credentials("author").password), false);
  const { token } = store.createSession(user.id);
  store.close(); store = new ApplicationStore(path, () => NOW);
  assert.equal((await store.identity.authenticate(credentials("author"))).id, user.id);
  assert.equal(store.session(token)?.account.id, user.id);
  assert.equal(store.db.prepare("SELECT tokenHash FROM sessions").get()?.tokenHash === token, false);
  store.close();
});

test("registration validation, case-insensitive uniqueness and invalid login fail closed", async () => {
  const store = makeStore();
  await assert.rejects(store.register({ ...credentials("abc"), password: "short" }), /10 and 128/);
  await store.register(credentials("author"));
  await assert.rejects(store.register(credentials("AUTHOR")), /unavailable/);
  await assert.rejects(store.authenticate({ ...credentials("author"), password: "incorrect-password" }), /incorrect/);
  await assert.rejects(store.authenticate(credentials("missing")), /incorrect/);
  store.close();
});

test("simple local demo accounts accept alice / 1234 without weakening the default password policy", async () => {
  const store = new ApplicationStore(":memory:", () => NOW, 4);
  const account = await store.register({ username:"alice", password:"1234" });
  assert.equal(account.displayName, "alice");
  assert.equal((await store.authenticate({ username:"alice", password:"1234" })).id, account.id);
  await assert.rejects(store.register({ username:"bob", password:"123" }), /4 and 128/);
  await store.changePassword(account, { currentPassword:"1234", newPassword:"5678" });
  assert.equal((await store.authenticate({ username:"alice", password:"5678" })).id, account.id);
  store.close();
  assert.equal(readDashboardConfig({ PERMIO_DASHBOARD_HOST:"0.0.0.0" }).localDemo, false);
  assert.equal(readDashboardConfig({ PERMIO_APP_LOCAL_DEMO:"false" }).localDemo, false);
});

test("sessions expire, rotate, and revoke; password changes invalidate every device", async () => {
  let now = NOW;
  const store = new ApplicationStore(":memory:", () => now);
  const user = await store.register(credentials("author"));
  const first = store.createSession(user.id), second = store.createSession(user.id, first.token);
  assert.equal(store.session(first.token), null);
  now += 8*3600; assert.equal(store.session(second.token), null);
  now = NOW;
  const a = store.createSession(user.id), b = store.createSession(user.id);
  await store.changePassword(user, { currentPassword: credentials("author").password, newPassword: "changed-test-only-password" });
  assert.equal(store.session(a.token), null); assert.equal(store.session(b.token), null);
  await assert.rejects(store.authenticate(credentials("author")), /incorrect/);
  await store.authenticate({ username: "author", password: "changed-test-only-password" });
  store.close();
});

test("accounts cannot enumerate, read, edit or claim another account's blueprints and receipts", async () => {
  const store = makeStore();
  const author = await store.register(credentials("author")), stranger = await store.register(credentials("stranger"));
  const blueprint = store.createBlueprint(author, input);
  assert.equal(store.workspace(stranger).blueprints.length, 0);
  assert.throws(() => store.blueprint(stranger, blueprint.id), (error) => error instanceof ApplicationError && error.status === 404);
  assert.throws(() => store.updateBlueprint(stranger, blueprint.id, input), /not found/);
  assert.equal(store.workspace(author).blueprints.length, 1);
  store.bindReceipt([author.id], "registry:allowed");
  assert.deepEqual(store.receiptIds(stranger), []);
  assert.deepEqual(store.receiptIds(author), ["registry:allowed"]);
  store.close();
});

test("five real accounts complete exact signed M4 review, activation, allocation and retirement through existing domains", async () => {
  const store = makeStore();
  const [author, reviewer, approver, allocator, revoker, participant] = await Promise.all(["author", "reviewer", "approver", "allocator", "revoker", "participant"].map((name) => store.register(credentials(name))));
  const keys = generateKeyPairSync("ed25519");
  store.registerReviewKey(reviewer, keys.publicKey.export({ type:"spki",format:"pem" }).toString().trim());
  const blueprint = store.createBlueprint(author, input);
  assert.throws(() => store.createInstance(author, blueprint.id, { name:"No authority", duration:3600, participants:"participant" }), /review first/);
  store.mutateBlueprint(author, blueprint.id, "validate", {});
  assert.throws(() => store.mutateBlueprint(author, blueprint.id, "submit", { reviewer:"reviewer",approver:"author",allocator:"allocator",revoker:"revoker" }), /five different/);
  const submitted = store.mutateBlueprint(author, blueprint.id, "submit", { reviewer:"reviewer",approver:"approver",allocator:"allocator",revoker:"revoker" });
  assert.equal(submitted.state, "in_review");
  assert.throws(() => store.mutateBlueprint(approver, blueprint.id, "activate", {}), /unique approvals/);
  assert.throws(() => store.updateBlueprint(author, blueprint.id, input), /unsubmitted draft/);
  const attestation = createReviewerAttestation({ attestationVersion:1, ...submitted.target, reviewerId:reviewer.id, decision:"approve", reviewedAt:NOW }, keys.privateKey);
  assert.throws(() => store.mutateBlueprint(author, blueprint.id, "review", { attestation }), /assigned reviewer/);
  assert.throws(() => store.mutateBlueprint(reviewer, blueprint.id, "review", { attestation:{ ...attestation,payload:{ ...attestation.payload,templateHash:`0x${"00".repeat(32)}` } } }), /hash|target/i);
  store.mutateBlueprint(reviewer, blueprint.id, "review", { attestation });
  assert.throws(() => store.mutateBlueprint(author, blueprint.id, "activate", {}), /lacks governance authority/);
  assert.equal(store.mutateBlueprint(approver, blueprint.id, "activate", {}).state, "active");
  assert.throws(() => store.createInstance(author, blueprint.id, { name:"No authority",duration:3600,participants:"participant" }), /lacks allocator authority/);
  const instance = store.createInstance(allocator, blueprint.id, { name:"Visit",duration:3600,participants:"participant",issuer:"allocator" });
  assert.equal(instance.state, "ready");
  assert.equal(store.workspace(participant).instances.length, 1);
  assert.equal(store.workspace(author).instances.length, 0);
  assert.equal(store.mutateBlueprint(approver, blueprint.id, "retire", {}).state, "retired");
  assert.throws(() => store.createInstance(allocator, blueprint.id, { name:"Another",duration:3600,participants:"participant" }), /retired/);
  assert.equal(store.workspace(participant).instances.length, 1);
  assert.deepEqual(store.receiptIds(participant), []);
  store.close();
});

test("review keys are public-only and cannot silently change devices", async () => {
  const store = makeStore(), user = await store.register(credentials("reviewer"));
  assert.throws(() => store.registerReviewKey(user, "not a public key"), /not supported/);
  const privatePem = generateKeyPairSync("ed25519").privateKey.export({ type:"pkcs8",format:"pem" }).toString().trim();
  assert.throws(() => store.registerReviewKey(user, privatePem), /not supported/);
  assert.equal(store.account(user.id).reviewKey, null);
  const key = generateKeyPairSync("ed25519").publicKey.export({ type:"spki",format:"pem" }).toString().trim();
  store.registerReviewKey(user, key);
  const other = generateKeyPairSync("ed25519").publicKey.export({ type:"spki",format:"pem" }).toString().trim();
  assert.throws(() => store.registerReviewKey(user, other), /first enabled/);
  assert.equal(JSON.stringify(store.workspace(store.account(user.id))).includes("PRIVATE KEY"), false);
  store.close();
});

test("authentication attempt limits are persistent", () => {
  const store = makeStore();
  for (let i=0;i<20;i++) store.throttle("test-ip");
  assert.throws(() => store.throttle("test-ip"), (error) => error instanceof ApplicationError && error.status === 429);
  store.close();
});

test("account-scoped Envio queries and totals cannot include another user's public rows", async () => {
  let query = "";
  const config = readDashboardConfig({}, { fetchImplementation: async (_url,options) => {
    query = JSON.parse(String(options?.body)).query;
    return Response.json({ data:{ _meta:[{chainId:31337,isReady:true,progressBlock:9,sourceBlock:9}], ReceiptProjection:[{id:"registry:allowed",registeredAt:NOW},{id:"registry:foreign",registeredAt:NOW}], ExecutionProjection:[{id:"a",receiptId:"registry:allowed",success:true,executedAt:NOW},{id:"b",receiptId:"registry:foreign",success:false,executedAt:NOW}] } });
  } });
  const result = await fetchDashboardReadModel(config, ["registry:allowed"]);
  assert.match(query, /where: \{id: \{_in:/); assert.match(query, /receiptId: \{_in:/);
  assert.doesNotMatch(query, /TimeBucketAggregate/);
  assert.equal(result.receipts.length, 1); assert.equal(result.executions.length, 1);
  assert.equal(result.aggregates[0].executionSuccesses, 1); assert.equal(result.aggregates[0].executionFailures, 0);
  assert.equal(JSON.stringify(result).includes("registry:foreign"), false);
});

test("HTTP registration, login, CSRF, cross-origin rejection, isolation and logout", async () => {
  const server = createDashboardServer(readDashboardConfig({}, { databasePath:":memory:" }));
  await new Promise<void>((resolve) => server.listen(0,"127.0.0.1",resolve));
  const address = server.address(); assert.ok(address && typeof address !== "string");
  const origin = `http://127.0.0.1:${address.port}`;
  const request = async (path: string, method = "GET", body?: unknown, cookie?: string, csrf?: string, requestOrigin=origin) => {
    const response = await fetch(origin+path, { method,headers:{ ...(body ? {"content-type":"application/json"}:{}),...(cookie ? {cookie}:{}),...(csrf ? {"x-csrf-token":csrf}:{}),origin:requestOrigin },body:body ? JSON.stringify(body):undefined });
    return { status:response.status,body:await response.json() as Record<string, any>,cookie:response.headers.get("set-cookie") };
  };
  try {
    assert.equal((await request("/api/workspace")).status, 401);
    assert.equal((await request("/api/m8/read-model")).status, 401);
    const first = await request("/api/register","POST",{ username:"first", password:"1234" });
    assert.equal(first.status, 200); assert.match(first.cookie!, /HttpOnly; SameSite=Strict/);
    const cookie = first.cookie!.split(";")[0], csrf=first.body.csrf;
    assert.equal((await request("/api/blueprints","POST",input,cookie)).status,403);
    assert.equal((await request("/api/blueprints","POST",input,cookie,csrf,"https://foreign.example")).status,403);
    const blueprint = await request("/api/blueprints","POST",input,cookie,csrf);
    assert.equal(blueprint.status,201);
    const second = await request("/api/register","POST",credentials("second"));
    const otherCookie=second.cookie!.split(";")[0];
    assert.equal((await request(`/api/blueprints/${blueprint.body.id}`,"GET",undefined,otherCookie)).status,404);
    assert.equal((await request("/api/workspace","GET",undefined,otherCookie)).body.blueprints.length,0);
    assert.equal((await request("/api/claim-receipt","POST",{receiptId:"foreign"},cookie,csrf)).status,404);
    const profile = await request("/api/account/profile","POST",{displayName:"Changed"},cookie,csrf);
    assert.equal(profile.body.account.displayName,"Changed");
    const session = await request("/api/session","GET",undefined,cookie);
    assert.equal(session.body.account.displayName,"Changed");
    const responseBody=JSON.stringify(session.body);
    assert.doesNotMatch(responseBody,/passwordHash|salt|tokenHash|test-only-strong-password/);
    await request("/api/logout","POST",{},cookie,csrf);
    assert.equal((await request("/api/workspace","GET",undefined,cookie)).status,401);
    assert.equal((await request("/api/login","POST",{ username:"first", password:"1234" })).status,200);
  } finally { await new Promise<void>((resolve,reject) => server.close((error) => error ? reject(error) : resolve())); }
});
