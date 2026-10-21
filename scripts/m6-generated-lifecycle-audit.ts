import assert from "node:assert/strict";
import {ChargedState,StateValue,createCircuitContext} from "@midnight-ntwrk/midnight-js-protocol/compact-runtime";
import type {PermioAuthorizationContract} from "@permio/midnight-authorization";
import type {PreparedOrdinaryAction} from "./m6-ordinary-action-workflow.ts";
import {copyM6PublicMapEntryForAudit} from "./m6-deprecated-module-admission-audit.ts";
import {ledger} from "../packages/midnight-authorization/contracts/managed/permio-authorization/contract/index.js";

/** Evaluate the generated circuit with the original witness, not an old public transcript. */
export function auditM6GeneratedLifecycle(input:{
 contract:PermioAuthorizationContract;address:string;arguments:Readonly<PreparedOrdinaryAction["arguments"]>;
 preparedState:Parameters<typeof StateValue.decode>[0];lifecycleState:Parameters<typeof StateValue.decode>[0];
 registry:"proofModules"|"activeTemplates";key:Uint8Array;clockSeconds:bigint;
}){
 assert(/^[0-9a-f]{64}$/u.test(input.address)&&input.clockSeconds>0n&&input.clockSeconds<=BigInt(Number.MAX_SAFE_INTEGER));
 const route=input.registry==="proofModules"?[0,4]:[0,11];
 const old=ledger(new ChargedState(StateValue.decode(input.preparedState)))[input.registry].lookup(input.key),next=ledger(new ChargedState(StateValue.decode(input.lifecycleState)))[input.registry].lookup(input.key);
 assert.equal(old.lifecycleStatus,input.registry==="proofModules"?4n:1n);assert.equal(next.lifecycleStatus,input.registry==="proofModules"?6n:3n);
 const mutable=input.registry==="proofModules"?["lifecycleStatus","deprecatedAt","revokedAt"]:["lifecycleStatus","terminationEffectiveSequence","terminationReasonHash","retiredAt","revokedAt"];
 const immutable=(row:object)=>Object.fromEntries(Object.entries(row).filter(([name])=>!mutable.includes(name)));assert.deepEqual(immutable(old),immutable(next));
 const execute=(encoded:typeof input.preparedState)=>input.contract.circuits.executeRuntimeAction(
  createCircuitContext(input.address,"00".repeat(32),new ChargedState(StateValue.decode(encoded)),undefined,undefined,undefined,Number(input.clockSeconds)),...input.arguments);
 const baseline=execute(input.preparedState);
 const projected=copyM6PublicMapEntryForAudit(input.preparedState,input.lifecycleState,route,input.key);
 const expected=input.registry==="proofModules"?/Action module implementation, lifecycle, version or receipt schema is unsupported/u:/Revoked template cannot authorize an action/u;
 assert.throws(()=>execute(projected),expected,"The generated circuit must fail at the intended lifecycle check, not an unrelated stale root, clock, or nullifier");
 const restored=execute(copyM6PublicMapEntryForAudit(projected,input.preparedState,route,input.key));assert.deepEqual(restored.result,baseline.result);
 return{passed:true,boundary:"generated-circuit-with-retained-abi-inputs"as const,registry:input.registry,
  baselineAccepted:true,actualLifecycleRowRejectedAtExpectedCheck:true,restoringOnlyRegistryRowAccepted:true,
  resultReceiptId:Buffer.from(baseline.result).toString("hex"),proofsRequested:0,nativeSubmissions:0,
  immutableRegistryFieldsUnchanged:true,privateWitnessValuesIncluded:false,doesNotClaimNewNativeTransactionValidation:true};
}
