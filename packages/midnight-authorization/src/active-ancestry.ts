import {
  pureCircuits,
  type RuntimeAccountCredential,
  type RuntimeActiveAncestry,
  type RuntimeCapabilityCredential,
  type RuntimeSessionCredential,
} from "../contracts/managed/permio-authorization/contract/index.js";
import { CredentialStatusTree } from "./credential-status.ts";
import { createRuntimeStatusMultiproof } from "./status-multiproof-program.ts";

const zero = () => new Uint8Array(32);
const emptyTarget = () => ({
  namespaceHash: zero(), templateIdHash: zero(),
  semanticVersion: { major: 0n, minor: 0n, patch: 0n }, templateContentHash: zero(),
});

function emptyAccount(): RuntimeAccountCredential {
  return {
    credentialVersion: 0n, target: emptyTarget(), instanceCommitment: zero(),
    contextHash: zero(), accountIdHash: zero(), principalKind: 0n,
    m5AccountCommitment: zero(), runtimePublicKey: { x: 0n, y: 1n },
    statusIndex: 0n, issuedAt: 0n, validBefore: 0n,
  };
}

function emptyCapability(): RuntimeCapabilityCredential {
  return {
    credentialVersion: 0n, target: emptyTarget(), instanceCommitment: zero(), contextHash: zero(),
    grantIdHash: zero(), m5GrantCommitment: zero(), subjectAccountCredentialCommitment: zero(),
    parentCapabilityCredentialCommitment: zero(), issuerAccountCredentialCommitment: zero(),
    namespaceIssuerAuthorityCommitment: zero(),
    scopeRoots: {
      actionsRoot: { field: 0n }, resourceSelectorsRoot: { field: 0n }, resourcesRoot: { field: 0n },
      purposesRoot: { field: 0n }, recipientKindsRoot: { field: 0n }, recipientsRoot: { field: 0n },
      disclosurePolicyIdsRoot: { field: 0n },
    },
    scopeCounts: {
      actionsCount: 0n, resourceSelectorsCount: 0n, resourcesCount: 0n, purposesCount: 0n,
      recipientKindsCount: 0n, recipientsCount: 0n, disclosurePolicyIdsCount: 0n,
    },
    notBefore: 0n, expiresAt: 0n, delegationDepth: 0n, maxDelegationDepth: 0n,
    statusIndex: 0n, issuedAt: 0n,
  };
}

export interface PrepareRuntimeActiveAncestryInput {
  /** Complete certified root-to-terminal chain, not terminal-only ancestry. */
  readonly capabilities: readonly RuntimeCapabilityCredential[];
  /** Holder of each corresponding capability; repeated accounts are permitted. */
  readonly accounts: readonly RuntimeAccountCredential[];
  readonly session: RuntimeSessionCredential;
  readonly statusTree: CredentialStatusTree;
  readonly now: bigint;
}

/** Private witness/preflight only: never issues credentials or authorizes an action. */
export function prepareRuntimeActiveAncestry(
  input: PrepareRuntimeActiveAncestryInput,
): RuntimeActiveAncestry {
  const count = input.capabilities.length;
  if (count < 1 || count > 17 || input.accounts.length !== count) {
    throw new RangeError("active ancestry requires one to 17 capabilities and their corresponding accounts");
  }
  const indices = [...new Set([
    ...input.capabilities.map(({ statusIndex }) => statusIndex),
    ...input.accounts.map(({ statusIndex }) => statusIndex),
    input.session.statusIndex,
  ])];
  const ancestry: RuntimeActiveAncestry = {
    witnessVersion: 1n,
    capabilityCount: BigInt(count),
    capabilities: [
      ...structuredClone(input.capabilities), ...Array.from({ length: 17 - count }, emptyCapability),
    ],
    accounts: [
      ...structuredClone(input.accounts), ...Array.from({ length: 17 - count }, emptyAccount),
    ],
    session: structuredClone(input.session),
    statusProof: createRuntimeStatusMultiproof(input.statusTree.multiproofFor(indices)),
  };
  pureCircuits.assertRuntimeActiveAncestry(
    ancestry, input.statusTree.root, input.statusTree.sequence, input.now,
  );
  return ancestry;
}
