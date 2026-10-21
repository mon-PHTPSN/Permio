import assert from "node:assert/strict";
/** Exact baseline only. The approved15 reserve never enables automatic retries. */
export function recovery150Step(round:number):{entry:string;governance?:string;negativeCase?:string}{
  assert(Number.isSafeInteger(round)&&round>=56&&round<=136);
  if(round===56||round===88)return{entry:"allocateRuntimeInstance"};
  if(round>=57&&round<=66||round>=69&&round<=77||round>=89&&round<=98||round>=101&&round<=109||round===127)
    return{entry:"updateRuntimeCredentialStatus"};
  if(round===67||round===68||round===99||round===100)return{entry:"manageRuntimeParticipantSlots"};
  if(round>=78&&round<=85||round>=110&&round<=113||round>=117&&round<=124)return{entry:"prepareRuntimeAction"};
  if(round===86||round===125)return{entry:"executeRuntimeAction"};
  if(round===114||round===115)return{entry:"governAuthorization",governance:"submitAuthorityRootApproval"};
  if(round>=129&&round<=132)return{entry:"terminateTemplate"};
  if(round>=133)return{entry:"governAuthorization",governance:"governProofModule"};
  const negativeCase=({87:"independent-competing-transition",116:"stale-authority-root",
    126:"scoped-action-replay-after-cold-reconnect",128:"stale-credential-status-root"}as Record<number,string>)[round];
  assert(negativeCase);return{entry:"executeRuntimeAction",negativeCase};
}
export function recovery150WarmBatch(round:number){
  assert(Number.isSafeInteger(round)&&round>=1&&round<=151);
  const range=round>=57&&round<=85?[57,85]:round>=89&&round<=113?[89,113]:round>=117&&round<=124?[117,124]:undefined;
  if(!range)return undefined;
  const step=recovery150Step(round);assert(!step.negativeCase&&!step.governance);
  return{first:range[0]!,last:range[1]!,entry:step.entry};
}
