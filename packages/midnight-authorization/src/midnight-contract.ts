import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  deployContract,
  findDeployedContract,
  type ContractProviders,
  type DeployedContract,
  type FoundContract,
} from "@midnight-ntwrk/midnight-js-contracts";
import type { ContractAddress } from "@midnight-ntwrk/midnight-js-protocol/compact-runtime";
import { CompiledContract } from "@midnight-ntwrk/midnight-js-protocol/compact-js";

import {
  Contract as GeneratedContract,
  ledger as readGeneratedLedger,
  pureCircuits as generatedPureCircuits,
} from "../contracts/managed/permio-authorization/contract/index.js";
export type {
  GovernanceActivatorLeaf,
  ActiveTemplateRecord,
  AuthorityRootRecord,
  AuthorityRootUpdateCommand,
  ProofModuleLifecycleCommand,
  ProofModuleProposal,
  ProofModuleRecord,
  ProofModuleReview,
  TemplateLifecycleCommand,
  CredentialStatusRootRecord,
  RuntimeCredentialStatusCommand,
  RuntimeCredentialStatusLeaf,
} from "../contracts/managed/permio-authorization/contract/index.js";
export const readPermioAuthorizationLedger = readGeneratedLedger;
export const permioAuthorizationPureCircuits = generatedPureCircuits;
import { permioAuthorizationWitnesses } from "./compact-crypto.ts";

export type PermioAuthorizationContract = GeneratedContract<undefined>;
export type PermioAuthorizationProviders =
  ContractProviders<PermioAuthorizationContract>;
export type DeployedPermioAuthorizationContract =
  DeployedContract<PermioAuthorizationContract>;
export type ConnectedPermioAuthorizationContract =
  FoundContract<PermioAuthorizationContract>;

export const PERMIO_AUTHORIZATION_CONTRACT_TAG =
  "permio-authorization-v1";
export const PERMIO_AUTHORIZATION_ASSETS_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../contracts/managed/permio-authorization",
);

export const permioAuthorizationCompiledContract =
  CompiledContract.make<PermioAuthorizationContract>(
    PERMIO_AUTHORIZATION_CONTRACT_TAG,
    GeneratedContract,
  ).pipe(
    CompiledContract.withWitnesses(permioAuthorizationWitnesses),
    CompiledContract.withCompiledFileAssets(
      PERMIO_AUTHORIZATION_ASSETS_PATH,
    ),
  );

export interface PermioAuthorizationConstructorArgs {
  readonly networkHash: Uint8Array;
  readonly namespaceHash: Uint8Array;
  readonly governancePolicyHash: Uint8Array;
  readonly authorityRoot: { readonly field: bigint };
  readonly authorityRootVersion: bigint;
  readonly authorityRootSequence: bigint;
  readonly credentialStatusRoot: { readonly field: bigint };
  readonly moduleReviewThreshold: bigint;
  readonly moduleApprovalThreshold: bigint;
  readonly authorityRootUpdateThreshold: bigint;
}

export async function deployPermioAuthorizationContract(
  providers: PermioAuthorizationProviders,
  args: PermioAuthorizationConstructorArgs,
): Promise<DeployedPermioAuthorizationContract> {
  return deployContract(providers, {
    compiledContract: permioAuthorizationCompiledContract,
    args: [
      args.networkHash,
      args.namespaceHash,
      args.governancePolicyHash,
      args.authorityRoot,
      args.authorityRootVersion,
      args.authorityRootSequence,
      args.credentialStatusRoot,
      args.moduleReviewThreshold,
      args.moduleApprovalThreshold,
      args.authorityRootUpdateThreshold,
    ],
  });
}

export async function connectPermioAuthorizationContract(
  providers: PermioAuthorizationProviders,
  contractAddress: ContractAddress,
): Promise<ConnectedPermioAuthorizationContract> {
  return findDeployedContract(providers, {
    compiledContract: permioAuthorizationCompiledContract,
    contractAddress,
  });
}
