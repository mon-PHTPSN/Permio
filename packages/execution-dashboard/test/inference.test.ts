import assert from "node:assert/strict";
import { test } from "node:test";
import { createDashboardServer, readDashboardConfig } from "../src/server.ts";

test("inference exposes precise pending gates without replacing local login with Dynamic", async () => {
  const server = createDashboardServer(readDashboardConfig({}, { databasePath: ":memory:" }));
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const base = `http://127.0.0.1:${address.port}`;
  try {
    const registered = await fetch(`${base}/api/register`, { method: "POST", headers: {"content-type":"application/json"}, body: JSON.stringify({username:"inference-user",password:"test-only-password"}) });
    const cookie = registered.headers.get("set-cookie")!.split(";")[0];
    const response = await fetch(`${base}/api/inference`, { headers:{cookie} });
    assert.equal(response.status, 200);
    const status = await response.json() as any;
    assert.equal(status.provider.state, "unconfigured");
    assert.equal(status.authorization.state, "unconfigured");
    assert.equal(status.identity.dynamic, "pending");
    assert.equal(status.identity.midnight1am, "pending");
    assert.equal(status.identity.monadEvm, "pending");
    assert.equal(status.evidenceDelivery.state, "pending_m10");
  } finally { await new Promise<void>((resolve) => server.close(() => resolve())); }
});

import { createHash, generateKeyPairSync, sign } from "node:crypto";
import { createReviewerAttestation } from "@permio/scenario-governance";
import { InferenceWorkflow, type AuthorizedInferenceScope, type PrivateInferenceProvider, type InferenceResult } from "../src/inference.ts";
import { ApplicationStore } from "../src/application.ts";
import { nearAiProvider } from "../src/near-ai.ts";

const NOW = 1_791_900_000;
const verified: InferenceResult = {responseSigner:"provider_tee",answer:"Synthetic advisory answer",verification:{gateway:"passed",model:"passed",connection:"passed",response:"passed"}};
async function fixture() {
  let now=NOW;
  const store = new ApplicationStore(":memory:",() => now);
  const user = await store.register({username:"scoped-user",password:"test-only-password"});
  const other = await store.register({username:"other-user",password:"test-only-password"});
  const session = store.createSession(user.id).session;
  let scope: AuthorizedInferenceScope | null = {instanceId:"generated-instance",contextId:"generated-context",recipient:"synthetic approved workload",purpose:"synthetic advisory purpose",model:"synthetic-tee-model",authorityRevision:"synthetic-current-decision-1",validUntil:NOW+600,
    inputs:[{id:"selected",label:"Selected observation",value:"synthetic permitted observation"},{id:"hidden",label:"Unselected observation",value:"synthetic unselected private value"}]};
  const sent: unknown[] = [];
  let result = verified;
  const provider: PrivateInferenceProvider = {status:() => ({state:"configured",model:"synthetic-tee-model",message:"Synthetic test only",sdkVersion:"test",privacyTier:"synthetic"}),complete:async (view,beforeSend) => {await beforeSend();sent.push(view);return result;}};
  const workflow = new InferenceWorkflow(provider,{readCurrent:async (account) => account.id === user.id ? scope : null},() => now,(session) => store.activeSession(session));
  return {store,user,other,session,workflow,provider,sent,setScope:(value:AuthorizedInferenceScope|null) => {scope=value;},getScope:() => scope!,setNow:(value:number) => {now=value;},setResult:(value:InferenceResult) => {result=value;}};
}

test("synthetic current authorization sends exactly selected inputs once and grants no AI action authority", async () => {
  const f=await fixture();
  try {
    const preview=await f.workflow.prepare(f.session,"generated-instance","generated-context",["selected"]);
    assert.deepEqual(preview.inputs,[{id:"selected",label:"Selected observation",value:"synthetic permitted observation"}]);
    await assert.rejects(f.workflow.run(f.session,preview.id),/confirm/);
    await f.workflow.consent(f.session,preview.id);
    const answer=await f.workflow.run(f.session,preview.id);
    assert.equal(answer.actionAuthority,"none"); assert.equal(answer.kind,"answer");
    assert.deepEqual(f.sent,[{instanceId:"generated-instance",contextId:"generated-context",recipient:"synthetic approved workload",purpose:"synthetic advisory purpose",model:"synthetic-tee-model",inputs:preview.inputs}]);
    assert.equal(JSON.stringify(f.sent).includes("unselected private"),false);
    assert.equal(JSON.stringify(f.sent).includes(f.user.id),false);
    assert.equal(f.store.db.prepare("SELECT label FROM activity WHERE accountId=?").all(f.user.id).some((row) => String(row.label).includes("observation")),false);
    await assert.rejects(f.workflow.run(f.session,preview.id),/not found/);
    assert.equal(f.sent.length,1);
  } finally {f.store.close();}
});

test("wrong context, recipient/purpose changes, stale authorization, revoked scope and expiry never transmit", async () => {
  const f=await fixture();
  try {
    await assert.rejects(f.workflow.prepare(f.session,"generated-instance","other-context",["selected"]),/does not permit/);
    await assert.rejects(f.workflow.prepare(f.session,"generated-instance","generated-context",["credential-signature"]),/only inputs/);
    await assert.rejects(f.workflow.prepare(f.session,"generated-instance","generated-context",["selected","selected"]),/only inputs/);
    for (const mutation of [{recipient:"different recipient"},{purpose:"different purpose"},{authorityRevision:"new-decision"},{inputs:[{id:"selected",label:"Changed",value:"changed"}]}]) {
      const original=f.getScope();
      const preview=await f.workflow.prepare(f.session,original.instanceId,original.contextId,["selected"]);
      await f.workflow.consent(f.session,preview.id);
      f.setScope({...original,...mutation});
      await assert.rejects(f.workflow.run(f.session,preview.id),/changed/);
      f.setScope(original);
    }
    const preview=await f.workflow.prepare(f.session,"generated-instance","generated-context",["selected"]);
    await f.workflow.consent(f.session,preview.id); f.setScope(null);
    await assert.rejects(f.workflow.run(f.session,preview.id),/does not permit/);
    f.setScope({instanceId:"generated-instance",contextId:"generated-context",recipient:"synthetic approved workload",purpose:"synthetic advisory purpose",model:"synthetic-tee-model",authorityRevision:"test",validUntil:NOW+600,inputs:[{id:"selected",label:"Selected",value:"test"}]});
    const expiring=await f.workflow.prepare(f.session,"generated-instance","generated-context",["selected"]);
    await f.workflow.consent(f.session,expiring.id); f.setNow(NOW+301);
    await assert.rejects(f.workflow.run(f.session,expiring.id),/expired/);
    assert.deepEqual(f.sent,[]);
  } finally {f.store.close();}
});

test("consent is session/account bound and revocation before send wins even during provider preflight", async () => {
  const f=await fixture();
  try {
    const p=await f.workflow.prepare(f.session,"generated-instance","generated-context",["selected"]);
    await assert.rejects(f.workflow.consent(f.store.createSession(f.other.id).session,p.id),/not found/);
    await assert.rejects(f.workflow.consent(f.store.createSession(f.user.id).session,p.id),/not found/);
    await f.workflow.consent(f.session,p.id); f.workflow.revoke(f.session,p.id);
    await assert.rejects(f.workflow.run(f.session,p.id),/not found/);
    let begin!:()=>void, resume!:()=>void;
    const begun=new Promise<void>((resolve) => {begin=resolve;});
    const gate=new Promise<void>((resolve) => {resume=resolve;});
    const workflow=new InferenceWorkflow({...f.provider,complete:async(view,beforeSend) => {begin();await gate;await beforeSend();f.sent.push(view);return verified;}},{readCurrent:async()=>f.getScope()},()=>NOW,(session) => f.store.activeSession(session));
    const waiting=await workflow.prepare(f.session,"generated-instance","generated-context",["selected"]);
    await workflow.consent(f.session,waiting.id);
    const running=workflow.run(f.session,waiting.id); await begun;
    workflow.revoke(f.session,waiting.id); resume();
    await assert.rejects(running,/withdrawn/); assert.deepEqual(f.sent,[]);
  } finally {f.store.close();}
});

test("all required verification failures withhold the answer; encrypted evidence delivery is pending",async () => {
  const f=await fixture();
  try {
    for (const check of ["gateway","model","connection","response"] as const) for (const state of ["failed","absent","unsupported"] as const) {
      const p=await f.workflow.prepare(f.session,"generated-instance","generated-context",["selected"]);
      await f.workflow.consent(f.session,p.id); f.setResult({...verified,verification:{...verified.verification,[check]:state}});
      await assert.rejects(f.workflow.run(f.session,p.id),/verification failed/);
    }
    f.setScope({...f.getScope(),requiresEvidenceDelivery:true});
    await assert.rejects(f.workflow.prepare(f.session,"generated-instance","generated-context",["selected"]),/encrypted evidence delivery/);
  } finally {f.store.close();}
});

test("unconfigured provider and unsupported runtime cannot import/send to a provider",async () => {
  assert.equal(nearAiProvider({}).status().state,"unconfigured");
  const provider=nearAiProvider({NEARAI_API_KEY:"synthetic-not-a-real-key",PERMIO_NEARAI_MODEL:"synthetic-model"});
  if (process.versions.node === "24.13.1") assert.equal(provider.status().state,"unsupported_runtime");
  const f=await fixture();
  try {
    const workflow=new InferenceWorkflow(f.provider,undefined,()=>NOW,(session) => f.store.activeSession(session));
    await assert.rejects(workflow.prepare(f.session,"generated-instance","generated-context",["selected"]),/context permissions and Midnight authorization/);
    assert.deepEqual(f.sent,[]);
  } finally {f.store.close();}
});

test("forged client authorization and receipts cannot replace the server adapter", async () => {
  let calls=0;
  const server=createDashboardServer(readDashboardConfig({}, {databasePath:":memory:",inference:{provider:{status:()=>({state:"configured",model:"synthetic-model",message:"test",sdkVersion:"test",privacyTier:"synthetic"}),complete:async()=>{calls++;return verified;}}}}));
  const store=server.application;
  await new Promise<void>((resolve)=>server.listen(0,"127.0.0.1",resolve));
  const address=server.address();assert.ok(address&&typeof address==="object");const base=`http://127.0.0.1:${address.port}`;
  try {
    const accounts=await Promise.all(["author","reviewer","approver","allocator","revoker","participant","issuer","outsider"].map((username)=>store.register({username,password:"test-only-password"})));
    const [author,reviewer,approver,allocator,,participant]=accounts;
    const keys=generateKeyPairSync("ed25519"); store.registerReviewKey(reviewer,keys.publicKey.export({type:"spki",format:"pem"}).toString().trim());
    const blueprint=store.createBlueprint(author,{name:"Generated run",description:"Synthetic integration workflow",context:"Site access",action:"Enter site",purpose:"Scheduled visit",recipientKind:"Site operator",resource:"Site entrance",duration:900});
    const submitted=store.mutateBlueprint(author,blueprint.id,"submit",{reviewer:"reviewer",approver:"approver",allocator:"allocator",revoker:"revoker"});
    store.mutateBlueprint(reviewer,blueprint.id,"review",{attestation:createReviewerAttestation({attestationVersion:1,...submitted.target,reviewerId:reviewer.id,decision:"approve",reviewedAt:store.now()},keys.privateKey)});
    store.mutateBlueprint(approver,blueprint.id,"activate",{});
    const instance=store.createInstance(allocator,blueprint.id,{name:"Synthetic visit",duration:900,participants:"participant",issuer:"issuer"});
    const created=store.createSession(participant.id);
    const headers={"content-type":"application/json",cookie:`permio_session=${created.token}`,"x-csrf-token":created.session.csrf};
    const response=await fetch(`${base}/api/inference/preview`,{method:"POST",headers,body:JSON.stringify({instanceId:instance.id,contextId:blueprint.template.contexts[0].id,inputIds:["fake"],authorized:true,m6Authorized:true,receipt:{decision:"allow"},inputs:[{id:"fake",value:"client-supplied"}]})});
    assert.equal(response.status,503);assert.match(await response.text(),/context permissions and Midnight authorization/);assert.equal(calls,0);
    const outsider=store.createSession(accounts[7].id);
    const denied=await fetch(`${base}/api/inference/scope`,{method:"POST",headers:{...headers,cookie:`permio_session=${outsider.token}`,"x-csrf-token":outsider.session.csrf},body:JSON.stringify({instanceId:instance.id,contextId:blueprint.template.contexts[0].id})});
    assert.equal(denied.status,404);assert.equal(calls,0);
  } finally {await new Promise<void>((resolve)=>server.close(()=>resolve()));}
});

test("pinned SDK byte verifier rejects unsigned, altered and wrong-signer synthetic responses", async () => {
  const {verifyGatewayResponse} = await import("@nearai/inference-sdk");
  const keys=generateKeyPairSync("ed25519");
  const signer={signingAlgo:"ed25519" as const,signingAddress:keys.publicKey.export({type:"spki",format:"der"}).subarray(-32).toString("hex")};
  const requestBody=Buffer.from('{"model":"synthetic-model","messages":[]}');
  const responseBody=Buffer.from('{"id":"synthetic-response"}');
  const hash=(value:Uint8Array)=>createHash("sha256").update(value).digest("hex");
  const signedText=`${hash(requestBody)}:${hash(responseBody)}`;
  const signature={kind:"gateway" as const,signedText,signer,signature:sign(null,Buffer.from(signedText),keys.privateKey).toString("hex")};
  // Synthetic key binding only. This test does not verify hardware attestation.
  const attestation={signer} as Parameters<typeof verifyGatewayResponse>[0]["attestation"];
  assert.doesNotThrow(()=>verifyGatewayResponse({requestBody,responseBody,signature,attestation}));
  assert.throws(()=>verifyGatewayResponse({requestBody,responseBody:Buffer.from("altered"),signature,attestation}),/match/);
  assert.throws(()=>verifyGatewayResponse({requestBody,responseBody,signature:{...signature,signature:""},attestation}));
  assert.throws(()=>verifyGatewayResponse({requestBody,responseBody,signature:{...signature,signature:"00".repeat(64)},attestation}));
  assert.throws(()=>verifyGatewayResponse({requestBody,responseBody,signature,attestation:{...attestation,signer:{...signer,signingAddress:"11".repeat(32)}}}),/signer/);
});

test("response byte signer provenance distinguishes a gateway signature from a model TEE signature", async () => {
  const f=await fixture();
  try {
    f.setResult({...verified,responseSigner:"gateway"});
    const p=await f.workflow.prepare(f.session,"generated-instance","generated-context",["selected"]);
    await f.workflow.consent(f.session,p.id);
    const result=await f.workflow.run(f.session,p.id);
    assert.equal(result.responseSigner,"gateway");
    assert.equal(result.verification.model,"passed");
    assert.equal(result.actionAuthority,"none");
  } finally {f.store.close();}
});

test("product session revocation during preflight prevents transmission", async () => {
  const f=await fixture();
  try {
    let begin!:()=>void,resume!:()=>void;
    const begun=new Promise<void>((resolve)=>{begin=resolve;});
    const gate=new Promise<void>((resolve)=>{resume=resolve;});
    const workflow=new InferenceWorkflow({...f.provider,complete:async(view,beforeSend)=>{begin();await gate;await beforeSend();f.sent.push(view);return verified;}},{readCurrent:async()=>f.getScope()},()=>NOW,(session)=>f.store.activeSession(session));
    const p=await workflow.prepare(f.session,"generated-instance","generated-context",["selected"]);
    await workflow.consent(f.session,p.id);
    const running=workflow.run(f.session,p.id);await begun;
    await f.store.changePassword(f.user,{currentPassword:"test-only-password",newPassword:"changed-test-only-password"});
    resume();await assert.rejects(running,/session.*revoked/);assert.deepEqual(f.sent,[]);
  } finally {f.store.close();}
});
