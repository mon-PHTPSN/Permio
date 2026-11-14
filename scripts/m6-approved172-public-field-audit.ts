import assert from "node:assert/strict";
import {StateValue} from "@midnight-ntwrk/midnight-js-protocol/ledger";

/** In-memory public-state counterfactual only; never a contract write or transaction. */
export function copyM6PublicFieldForAudit(
  original:Parameters<typeof StateValue.decode>[0],replacement:Parameters<typeof StateValue.decode>[0],route:readonly number[],
) {
  assert(route.length>0&&route.every(n=>Number.isSafeInteger(n)&&n>=0&&n<16));
  const source=route.reduce((node,index)=>{const next=node.asArray()?.[index];assert(next);return next;},StateValue.decode(replacement));
  assert(source.asMap(),"Only a map/set field may be projected for this audit");
  const replace=(node:StateValue,path:readonly number[]):StateValue=>{
    if(!path.length){assert(node.asMap());return source;}
    const children=node.asArray();assert(children?.[path[0]!]);
    return children.reduce((out,child,index)=>out.arrayPush(index===path[0]?replace(child,path.slice(1)):child),StateValue.newArray());
  };
  return replace(StateValue.decode(original),route).encode();
}
