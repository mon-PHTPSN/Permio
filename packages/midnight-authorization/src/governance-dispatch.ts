import type {CircuitContext} from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import {pureCircuits, type GovernanceDispatchInput} from '../contracts/managed/permio-authorization/contract/index.js';
import type {ConnectedPermioAuthorizationContract,PermioAuthorizationContract} from './midnight-contract.ts';

export type GovernanceOperation = 'submitAuthorityRootApproval'|'proposeProofModule'|'reviewProofModule'|'governProofModule';
type Signature=GovernanceDispatchInput['signature'];
type Authority=GovernanceDispatchInput['authority'];
type AuthorityPath=GovernanceDispatchInput['authorityPath'];
export interface GovernanceOperationScope {
 <T>(operation:GovernanceOperation,run:()=>Promise<T>):Promise<T>;
}

/** v10 ABI inputs. Message domains and signatures remain those of each operation. */
export const governanceDispatchInputs={
 submitAuthorityRootApproval(rootUpdate:GovernanceDispatchInput['rootUpdate'],signature:Signature,authority:Authority,authorityPath:AuthorityPath):GovernanceDispatchInput {
  return {...pureCircuits.emptyGovernanceDispatchInput(),operation:0n,rootUpdate,signature,authority,authorityPath};
 },
 proposeProofModule(proposal:GovernanceDispatchInput['proposal']):GovernanceDispatchInput {
  return {...pureCircuits.emptyGovernanceDispatchInput(),operation:1n,proposal};
 },
 reviewProofModule(review:GovernanceDispatchInput['review'],signature:Signature,authority:Authority,authorityPath:AuthorityPath):GovernanceDispatchInput {
  return {...pureCircuits.emptyGovernanceDispatchInput(),operation:2n,review,signature,authority,authorityPath};
 },
 governProofModule(lifecycle:GovernanceDispatchInput['lifecycle'],signature:Signature,authority:Authority,authorityPath:AuthorityPath):GovernanceDispatchInput {
  return {...pureCircuits.emptyGovernanceDispatchInput(),operation:3n,lifecycle,signature,authority,authorityPath};
 }
};

/** Logical operations for generated-circuit evaluation; all invoke the one v10 circuit. */
export function governanceCircuitOperations(contract:Pick<PermioAuthorizationContract,'circuits'>) {
 const call=(context:CircuitContext<undefined>,input:GovernanceDispatchInput)=>contract.circuits.governAuthorization(context,input);
 return {
  proposeProofModule(context:CircuitContext<undefined>,...args:Parameters<typeof governanceDispatchInputs.proposeProofModule>) {
   const result=call(context,governanceDispatchInputs.proposeProofModule(...args));return {...result,result:result.result.moduleKey};
  },
  reviewProofModule(context:CircuitContext<undefined>,...args:Parameters<typeof governanceDispatchInputs.reviewProofModule>) {
   const result=call(context,governanceDispatchInputs.reviewProofModule(...args));return {...result,result:result.result.approvalCount};
  },
  governProofModule(context:CircuitContext<undefined>,...args:Parameters<typeof governanceDispatchInputs.governProofModule>) {
   const result=call(context,governanceDispatchInputs.governProofModule(...args));return {...result,result:result.result.approvalCount};
  },
  submitAuthorityRootApproval(context:CircuitContext<undefined>,...args:Parameters<typeof governanceDispatchInputs.submitAuthorityRootApproval>) {
   const result=call(context,governanceDispatchInputs.submitAuthorityRootApproval(...args));return {...result,result:result.result.approvalCount};
  }
 };
}

/** Connected v10 transactions. These are SDK helpers, not legacy public entry points. */
export function governanceCallOperations(connected:Pick<ConnectedPermioAuthorizationContract,'callTx'>,scope?:GovernanceOperationScope) {
 const call=(operation:GovernanceOperation,input:GovernanceDispatchInput)=>scope?
  scope(operation,()=>connected.callTx.governAuthorization(input)):connected.callTx.governAuthorization(input);
 return {
  async proposeProofModule(...args:Parameters<typeof governanceDispatchInputs.proposeProofModule>) {
   const result=await call('proposeProofModule',governanceDispatchInputs.proposeProofModule(...args));
   return {...result,private:{...result.private,result:result.private.result.moduleKey}};
  },
  async reviewProofModule(...args:Parameters<typeof governanceDispatchInputs.reviewProofModule>) {
   const result=await call('reviewProofModule',governanceDispatchInputs.reviewProofModule(...args));
   return {...result,private:{...result.private,result:result.private.result.approvalCount}};
  },
  async governProofModule(...args:Parameters<typeof governanceDispatchInputs.governProofModule>) {
   const result=await call('governProofModule',governanceDispatchInputs.governProofModule(...args));
   return {...result,private:{...result.private,result:result.private.result.approvalCount}};
  },
  async submitAuthorityRootApproval(...args:Parameters<typeof governanceDispatchInputs.submitAuthorityRootApproval>) {
   const result=await call('submitAuthorityRootApproval',governanceDispatchInputs.submitAuthorityRootApproval(...args));
   return {...result,private:{...result.private,result:result.private.result.approvalCount}};
  }
 };
}
