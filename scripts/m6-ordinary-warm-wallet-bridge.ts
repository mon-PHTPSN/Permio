import assert from "node:assert/strict";
import { lstat } from "node:fs/promises";
import { connect } from "node:net";
import { createInterface } from "node:readline";
import { execFileSync } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
const directory=process.argv[2]!,round=process.argv[3]!;
assert(directory==="/opt/permio-m6-governance-20261018-v10/private"&&process.send);
if(!/^0\d{2}$/.test(round)||Number(round)<34||Number(round)>58) {
  await import("./m6-ordinary-wallet-worker-legacy-v1.ts");
}else {
  const p=directory+"/warm-preparations-v2.sock",s=await lstat(p);assert(s.isSocket()&&s.uid===0&&(s.mode&0o777)===0o600);
  const socket=connect(p);await new Promise<void>((resolve,reject)=>{socket.once("connect",resolve);socket.once("error",reject);});
  let digest:string|undefined,commandSent=false,complete=false;
  const send=(v:unknown)=>new Promise<void>((resolve,reject)=>process.send!(v,error=>error?reject(error):resolve()));
  process.on("message",value=>{
    const v=value as {operation?:string};assert(v.operation==="submit-exact-balanced-once"&&digest&&!commandSent);commandSent=true;
    socket.write(JSON.stringify({operation:v.operation,round:Number(round),sha256:digest})+"\n");
  });
  process.once("disconnect",()=>socket.destroy());
  socket.write(JSON.stringify({operation:"prepare-only",round:Number(round)})+"\n");
  const deadline=setTimeout(()=>process.exit(2),900000);
  try {
    for await(const line of createInterface({input:socket,crlfDelay:Infinity})) {
      const v=JSON.parse(line);
      if(v.control==="job-complete") {complete=true;break;}
      assert(["wallet-sdk-stage","submission-diagnostic","read-only-node-validation","balanced","submission-attempt","submission-returned","finalized","failed"].includes(v.phase));
      if(v.phase==="balanced") {assert(/^[a-f0-9]{64}$/.test(v.sha256));digest=v.sha256;}
      await send(v);
    }
    assert(complete);socket.end();
    if(round==="058") {
      for(let n=0;;n++) {
        const state=Object.fromEntries(execFileSync("systemctl",["show","permio-m6-ordinary-warm-wallet-v2.service","-p","MainPID","-p","ExecMainStatus"],{encoding:"utf8"}).trim().split("\n").map(x=>x.split("=")));
        if(state.MainPID==="0"){assert(state.ExecMainStatus==="0");break;}assert(n<120);await delay(500);
      }
      await send({phase:"warm-wallet-closed-before-main-proof",round:58,privateCheckpointSaved:true});
    }else await send({phase:"warm-wallet-session-retained",round:Number(round),privateUnixSocketOnly:true});
  }catch {process.exitCode=1;await send({phase:"failed",failedStage:"warm-wallet-bridge",detailsWithheld:true});}
  finally {clearTimeout(deadline);socket.destroy();process.disconnect?.();}
}
