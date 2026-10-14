import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { HttpContextClient, LocalContextClient } from "../web/context-client.js";

const NOW = 1_791_900_000;
function setup(accountId="alice") {
  const records = new Map<string,string>();
  const storage = { getItem:(key:string) => records.get(key) ?? null, setItem:(key:string,value:string) => {records.set(key,value);} };
  let clock = NOW;
  const client = new LocalContextClient({accountId,storage,now:() => clock,makeId:randomUUID});
  return {client,storage,records,advance:(seconds:number) => {clock+=seconds;},now:() => clock};
}
async function permissionInput(client:LocalContextClient, policyId="support") {
  const state = await client.list(), context = state.contexts.find((item) => item.policyId === policyId)!;
  return {contextId:context.id,authorizedParty:"bob",recipient:"Acme Audio support",duration:3600,claims:["merchant_issued","product_matches","within_support_period","unused_entitlement"]};
}

test("front-end examples contain separate purchase and clinical contexts without manufactured chain outputs", async () => {
  const {client} = setup(), state = await client.list();
  assert.equal(state.cases.length,2);
  assert.deepEqual(state.contexts.map((item) => item.policyId),["reputation","support","regulatory","treatment","research"]);
  assert.equal(state.requests.filter((item) => item.status === "pending").length,2);
  for (const permission of state.permissions) {
    assert.equal(permission.proof,null); assert.equal(permission.receipt,null); assert.equal(permission.execution,null);
    assert.equal(permission.proofStatus,"not_requested");
  }
});

test("demo state persists per signed-in account and returned models cannot mutate storage", async () => {
  const {client,storage} = setup();
  const state = await client.list();
  state.cases[0].title = "Changed outside client";
  assert.notEqual((await client.list()).cases[0].title,state.cases[0].title);
  await client.createContext({profileId:"purchase",title:"A second purchase"});
  const reopened = new LocalContextClient({accountId:"alice",storage,now:() => NOW,makeId:randomUUID});
  const other = new LocalContextClient({accountId:"bob",storage,now:() => NOW,makeId:randomUUID});
  assert.equal((await reopened.list()).cases.length,3);
  assert.equal((await other.list()).cases.length,2);
  assert.notEqual((await other.list()).contexts[0].id,(await reopened.list()).contexts[0].id);
});

test("permission previews bind an exact scope and retain unselected claims in the hidden view", async () => {
  const {client} = setup(), input = await permissionInput(client), preview = await client.previewPermission(input);
  assert.equal(preview.recipient,"Acme Audio support");
  assert.equal(preview.authorizedParty,"bob");
  assert.equal(preview.purpose,"Replacement eligibility");
  assert.deepEqual(preview.visible.map((item) => item.id),input.claims);
  assert.ok(preview.hidden.includes("Your public review identity"));
  assert.equal(preview.delegationAllowed,false);
  const treatment = (await client.list()).contexts.find((item) => item.policyId === "treatment")!;
  const narrower = await client.previewPermission({...input,contextId:treatment.id,recipient:"Dr. Chen",claims:["observations"]});
  assert.ok(narrower.hidden.includes("Referral summary"));
  await assert.rejects(client.previewPermission({...input,claims:["product_matches"]}),/required/);
  await assert.rejects(client.previewPermission({...input,claims:["review_text"]}),/only the information/);
  await assert.rejects(client.previewPermission({...input,purpose:"Marketing"}),/purpose/);
  await assert.rejects(client.previewPermission({...input,duration:99999999}),/validity/);
  await assert.rejects(client.previewPermission({...input,contextId:"foreign-context"}),/not found/);
});

test("confirming consent consumes its preview without asserting proof verification or execution", async () => {
  const {client} = setup(), preview = await client.previewPermission(await permissionInput(client));
  const permission = await client.confirmPermission(preview.id);
  assert.equal(permission.proofStatus,"not_requested");
  assert.equal(permission.proof,null); assert.equal(permission.receipt,null); assert.equal(permission.execution,null);
  await assert.rejects(client.confirmPermission(preview.id),/changed or expired/);
  assert.equal((await client.list()).permissions.length,2);
});

test("expired or stale previews cannot be confirmed", async () => {
  const {client,advance} = setup(), preview = await client.previewPermission(await permissionInput(client));
  advance(301); await assert.rejects(client.confirmPermission(preview.id),/expired/);
  const next = await client.previewPermission(await permissionInput(client));
  await client.createContext({profileId:"healthcare",title:"Another referral"});
  await assert.rejects(client.confirmPermission(next.id),/changed/);
});

test("a second tab cannot overwrite a newer saved consent state", async () => {
  const {client,storage,now} = setup();
  const second = new LocalContextClient({accountId:"alice",storage,now,makeId:randomUUID});
  const preview = await client.previewPermission(await permissionInput(client));
  await second.createContext({profileId:"purchase",title:"Created in another tab"});
  await assert.rejects(client.confirmPermission(preview.id),/another tab/);
  assert.equal((await client.list()).cases.length,3);
});

test("a regulatory preview requires explicit consent to the selected-record linkage", async () => {
  const {client} = setup(), state = await client.list();
  const context = state.contexts.find((item) => item.policyId === "regulatory")!;
  const claims = ["purchase_details","review_snapshot","support_decision","selected_linkage"];
  const preview = await client.previewPermission({contextId:context.id,recipient:"Named investigator",authorizedParty:"Case officer",claims,duration:3600});
  assert.equal(preview.bridge,true);
  await assert.rejects(client.confirmPermission(preview.id),/Confirm the new link/);
  const permission = await client.confirmPermission(preview.id,true);
  assert.equal(permission.recipient,"Named investigator");
  assert.deepEqual(permission.claims,claims);
});

test("disclosure consent queues verification but never sends private records or creates a receipt", async () => {
  const {client} = setup(), request = (await client.list()).requests.find((item) => item.status === "pending")!;
  const preview = await client.previewDisclosure({requestId:request.id,recipient:"Substituted recipient",claims:["unrelated_record"]});
  assert.equal(preview.recipient,request.recipient);
  assert.deepEqual(preview.claims,request.claims);
  const result = await client.approveDisclosure(preview.id);
  assert.equal(result.status,"awaiting_verification"); assert.equal(result.delivered,false);
  const permission = (await client.list()).permissions.find((item) => item.id === result.permissionId)!;
  assert.equal(permission.proofStatus,"pending");
  assert.equal(permission.proof,null); assert.equal(permission.receipt,null); assert.equal(permission.execution,null);
});

test("declined requests cannot be confirmed with an earlier preview", async () => {
  const {client} = setup(), request = (await client.list()).requests[0];
  const preview = await client.previewDisclosure({requestId:request.id});
  await client.declineDisclosure(request.id);
  await assert.rejects(client.approveDisclosure(preview.id),/changed/);
  assert.equal((await client.list()).requests[0].status,"declined");
});

test("revoking one consent cancels its queued disclosure without changing other contexts", async () => {
  const {client} = setup(), request = (await client.list()).requests[0];
  const result = await client.approveDisclosure((await client.previewDisclosure({requestId:request.id})).id);
  await client.revokePermission(result.permissionId!);
  const state = await client.list();
  assert.equal(state.requests.find((item) => item.id === result.id)!.status,"cancelled");
  assert.equal(state.permissions.find((item) => item.id === result.permissionId)!.status,"revoked");
  assert.equal(state.permissions.find((item) => item.contextId !== result.contextId)!.status,"consent_recorded");
  await assert.rejects(client.requestVerification(result.permissionId!),/no longer current/);
});

test("expiry and verification requests have separate observable states", async () => {
  const {client,advance} = setup(), permission = (await client.list()).permissions[0];
  await client.requestVerification(permission.id);
  assert.equal((await client.list()).permissions[0].proofStatus,"pending");
  await assert.rejects(client.requestVerification(permission.id),/already/);
  advance(86400);
  assert.equal((await client.list()).permissions[0].status,"expired");
  await assert.rejects(client.revokePermission(permission.id),/no longer current/);
});

test("review authoring remains exactly rating and free-form text, with no claim of opinion truth", async () => {
  const {client} = setup(), context = (await client.list()).contexts.find((item) => item.policyId === "reputation")!;
  const input = {contextId:context.id,recipient:"Public",duration:3600,claims:["rating","review_text","purchase_eligibility"],review:{rating:2,review_text:"The battery did not last as expected."}};
  const request = await client.createDisclosure(input);
  assert.deepEqual(Object.keys(request.review!).sort(),["rating","review_text"]);
  const preview = await client.previewDisclosure({requestId:request.id});
  assert.equal(preview.authorizedParty,"You");
  assert.ok(preview.hidden.includes("Your identity"));
  assert.ok(preview.hidden.includes("Order reference"));
  assert.equal(preview.checks.includes("Opinion truth"),false);
  await assert.rejects(client.createDisclosure({...input,review:{...input.review,severity:"high"}}),/rating/);
  await assert.rejects(client.createDisclosure({...input,review:{...input.review,rating:6}}),/rating/);
  await assert.rejects(client.previewPermission({...input,recipient:"Merchant"}),/public/);
});

test("a storage failure rolls back a local change instead of presenting unsaved success", async () => {
  const {client,storage} = setup(), before = await client.list();
  storage.setItem = () => {throw new Error("Quota exceeded");};
  await assert.rejects(client.createContext({profileId:"purchase",title:"Not saved"}),/could not be saved/);
  assert.equal((await client.list()).cases.length,before.cases.length);
});

test("invalid saved state is not silently replaced with examples", () => {
  const {storage,records,client} = setup();
  records.set(client.key,'{"schemaVersion":1,"accountId":"someone-else"}');
  const original = records.get(client.key);
  assert.throws(() => new LocalContextClient({accountId:"alice",storage}),/cannot be opened/);
  assert.equal(records.get(client.key),original);
});

test("the HTTP integration adapter propagates a missing backend without a demo fallback", async () => {
  const calls:{path:string;method?:string;body?:unknown}[] = [];
  const client = new HttpContextClient(async (path,method,body) => {calls.push({path,method,body}); throw new Error("Not implemented");});
  await assert.rejects(client.list(),/Not implemented/);
  await assert.rejects(client.revokePermission("unsafe/id"),/Not implemented/);
  assert.equal(calls[0].path,"/api/contexts/workspace");
  assert.equal(calls[1].path,"/api/context-permissions/unsafe%2Fid/revoke");
  assert.equal(calls.length,2);
});
