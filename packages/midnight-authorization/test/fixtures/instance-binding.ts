import assert from "node:assert/strict";
import {
  Bytes32Descriptor, CompactTypeUnsignedInteger, StateValue, ChargedState,
  type MerkleTreePath,
} from "@midnight-ntwrk/midnight-js-protocol/compact-runtime";
import {
  buildAuthorityRoot, governanceActivatorPublicKey, hashProtocolIdentifier,
  permioAuthorizationPureCircuits as pure, readPermioAuthorizationLedger as ledger,
  createRuntimeCapabilityCredential as createCapability,
  type GovernanceActivatorLeaf, type RuntimeAccountCredential, type RuntimeCredentialInstanceBinding,
  type CreateRuntimeCapabilityCredentialInput,
} from "../../src/index.ts";

const bytes = (value: number) => new Uint8Array(32).fill(value);

/** Explicit synthetic namespace fixture; never a production key or authority. */
export function unitNamespaceIssuer(namespace: string, secret = 11n): GovernanceActivatorLeaf {
  return { leafVersion: 1n, namespaceHash: Buffer.from(hashProtocolIdentifier("namespace", namespace).slice(2), "hex"),
    governancePolicyHash: bytes(0), authorityKind: 6n, publicKey: governanceActivatorPublicKey(secret),
    validAfter: 0n, validBefore: 2_000_000_000n };
}

/** Old crypto-only fixtures receive an explicit synthetic issuer binding. */
export function unitCreateCapability(input: CreateRuntimeCapabilityCredentialInput) {
  return createCapability({ ...input, namespaceIssuer: input.namespaceIssuer ??
    (input.grant.parentGrantId === null ? { principalId: input.grant.issuerRef,
      authority: unitNamespaceIssuer(input.grant.namespace) } : undefined) });
}

export function unitInstanceBinding(issuer: GovernanceActivatorLeaf, account: RuntimeAccountCredential): RuntimeCredentialInstanceBinding {
  const issuers = buildAuthorityRoot([issuer]);
  const state = { stateVersion: 2n, instanceCommitment: account.instanceCommitment.slice(), stateIdHash: bytes(57),
    lastMutationAt: 0n, slotAssignmentsRoot: pure.runtimePrivateMapEmptyRoot(), slotAssignmentCount: 1n,
    slotBindingsRoot: pure.runtimePrivateMapEmptyRoot(), slotBindingCount: 1n, nonce: bytes(55) };
  return {
    allocation: { allocationVersion: 1n, target: structuredClone(account.target),
      instanceCommitment: account.instanceCommitment.slice(), instanceIdHash: bytes(51),
      allocationRequestIdHash: bytes(52), m4AuthorizationCommitment: bytes(53),
      allocatorAuthorityCommitment: bytes(54), capabilityIssuersRoot: issuers.root, capabilityIssuerCount: 1n,
      initialStateCommitment: pure.runtimeStateCommitment(state), governancePolicyHash: issuer.governancePolicyHash.slice(),
      authorityRootVersion: 1n, authorityRootSequence: 1n, targetNetworkHash: bytes(1),
      targetContractIdentity: bytes(0), authorizedAt: 0n, createdAt: 0n, expiresAt: 2_000_000_000n,
      allocationValidBefore: 1_000n, allocationNonce: bytes(56) },
    issuerPath: issuers.pathFor(pure.governanceActivatorLeafCommitment(issuer)),
    validBefore: account.validBefore < issuer.validBefore ? account.validBefore : issuer.validBefore,
    state, stateSequence: 0n, nextStateNonce: bytes(58),
  };
}

/**
 * Test-only synthetic genesis, analogous to existing seeded active-status fixtures.
 * Does NOT call allocation, verify M4 or prove issuance. Real-chain runners must
 * allocate normally. Find the map via its generated view, not a hardcoded slot.
 */
export function seedUnitAllocation(state: StateValue | ChargedState, binding: RuntimeCredentialInstanceBinding): StateValue {
  const root = state instanceof ChargedState ? state.state : state;
  const allocation = binding.allocation;
  const uint64 = new CompactTypeUnsignedInteger(2n ** 64n - 1n, 8);
  const uint8 = new CompactTypeUnsignedInteger(255n, 1);
  const alignedKey = { value: Bytes32Descriptor.toValue(allocation.instanceCommitment), alignment: Bytes32Descriptor.alignment() };
  const commitment = pure.runtimeInstanceAllocationCommitment(allocation);
  const record = StateValue.newCell({
    value: [...Bytes32Descriptor.toValue(commitment), ...Bytes32Descriptor.toValue(allocation.initialStateCommitment),
      ...uint64.toValue(0n), ...uint8.toValue(1n)],
    alignment: [...Bytes32Descriptor.alignment(), ...Bytes32Descriptor.alignment(), ...uint64.alignment(), ...uint8.alignment()],
  });
  function* candidates(node: StateValue): Generator<StateValue> {
    const map = node.asMap();
    if (map) yield StateValue.newMap(map.insert(alignedKey, record));
    const children = node.asArray();
    if (children) for (let index = 0; index < children.length; index += 1) {
      for (const changed of candidates(children[index]!)) {
        yield children.reduce((array, child, offset) => array.arrayPush(offset === index ? changed : child), StateValue.newArray());
      }
    }
  }
  for (const candidate of candidates(root)) {
    try {
      const view = ledger(candidate).runtimeInstances;
      if (view.member(allocation.instanceCommitment)) {
        assert.deepEqual(view.lookup(allocation.instanceCommitment).allocationCommitment, commitment);
        return candidate;
      }
    } catch { /* wrong synthetic map candidate; no live state is modified */ }
  }
  throw new Error("Could not locate the generated unit-fixture instance map");
}

export function emptyUnitPath(): MerkleTreePath<Uint8Array> {
  return { leaf: bytes(0), path: Array.from({ length: 20 }, () => ({ sibling: { field: 0n }, goes_left: true })) };
}
