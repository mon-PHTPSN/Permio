import path from "node:path";
import { fileURLToPath } from "node:url";
import type { CircuitContext } from "@midnight-ntwrk/midnight-js-protocol/compact-runtime";
import { CompiledContract } from "@midnight-ntwrk/midnight-js-protocol/compact-js";
import type { FoundContract } from "@midnight-ntwrk/midnight-js-contracts";
import { Contract, ledger, pureCircuits } from "../contracts/managed/permio-authorization-v12/contract/index.js";
import { permioAuthorizationWitnesses } from "./compact-crypto.ts";

export type ActivationAuthorizationContract = Contract<undefined>;
export type ConnectedActivationAuthorizationContract = FoundContract<ActivationAuthorizationContract>;
export const ACTIVATION_AUTHORIZATION_CONTRACT_TAG = "permio-authorization-v12";
export const ACTIVATION_AUTHORIZATION_ASSETS_PATH = path.resolve(path.dirname(fileURLToPath(import.meta.url)),
  "../contracts/managed/permio-authorization-v12");
export const activationAuthorizationCompiledContract = CompiledContract.make<ActivationAuthorizationContract>(
  ACTIVATION_AUTHORIZATION_CONTRACT_TAG, Contract).pipe(CompiledContract.withWitnesses(permioAuthorizationWitnesses),
  CompiledContract.withCompiledFileAssets(ACTIVATION_AUTHORIZATION_ASSETS_PATH));
export { Contract as ActivationAuthorizationGeneratedContract, ledger as activationAuthorizationLedger,
  pureCircuits as activationAuthorizationPureCircuits };

export const activationLifecycleOperations = { begin: 1n, finalize: 2n } as const;
type Arguments = Parameters<ActivationAuthorizationContract["circuits"]["manageM4Activation"]> extends
  [unknown, unknown, ...infer Rest] ? Rest : never;
type Operation = "beginM4Activation" | "finalizeM4Activation";
export interface ActivationLifecycleOperationScope {
  <T>(operation: Operation, run: () => Promise<T>): Promise<T>;
}

/** v12 adapters retain the logical results of the original two activation calls. */
export function activationLifecycleCircuitOperations(contract: Pick<ActivationAuthorizationContract, "circuits">) {
  return {
    beginM4Activation(context: CircuitContext<undefined>, ...args: Arguments) {
      const result = contract.circuits.manageM4Activation(context, activationLifecycleOperations.begin, ...args);
      return { ...result, result: result.result.registryKey };
    },
    finalizeM4Activation(context: CircuitContext<undefined>, ...args: Arguments) {
      return contract.circuits.manageM4Activation(context, activationLifecycleOperations.finalize, ...args);
    },
  };
}

/** Explicit v12 transport. Scope retains logical operation accounting/checkpoints. */
export function activationLifecycleCallOperations(
  connected: Pick<ConnectedActivationAuthorizationContract, "callTx">, scope?: ActivationLifecycleOperationScope,
) {
  const call = (operation: Operation, selector: bigint, args: Arguments) => {
    const run = () => connected.callTx.manageM4Activation(selector, ...args);
    return scope ? scope(operation, run) : run();
  };
  return {
    async beginM4Activation(...args: Arguments) {
      const result = await call("beginM4Activation", activationLifecycleOperations.begin, args);
      return { ...result, private: { ...result.private, result: result.private.result.registryKey } };
    },
    finalizeM4Activation(...args: Arguments) {
      return call("finalizeM4Activation", activationLifecycleOperations.finalize, args);
    },
  };
}
