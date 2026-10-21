import assert from 'node:assert/strict';
import {it} from 'node:test';
import {pureCircuits} from '../contracts/managed/permio-authorization/contract/index.js';
import {ordinaryActionFixture} from './fixtures/ordinary-action.ts';

it('v10 exposes one governance proof circuit and rejects unknown or mismatched operations',()=>{
 const f=ordinaryActionFixture(),empty=pureCircuits.emptyGovernanceDispatchInput();
 for(const name of ['submitAuthorityRootApproval','proposeProofModule','reviewProofModule','governProofModule']){
  assert(!(name in f.contract.provableCircuits));assert(!(name in f.contract.circuits));
 }
 assert('governAuthorization' in f.contract.provableCircuits);
 assert.throws(()=>f.contract.circuits.governAuthorization(f.context(),{...empty,operation:4n}),/Unknown governance dispatch operation/);
 // Unrelated populated fields cannot supply the selected branch's required command.
 const input={...empty,operation:0n,review:{...empty.review,reviewVersion:1n}};
 assert.throws(()=>f.contract.circuits.governAuthorization(f.context(),input),/authority-root update version/i);
 assert.equal(f.view().proofModuleRegistrySequence,0n);
});
