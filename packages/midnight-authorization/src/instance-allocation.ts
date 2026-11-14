import { createHash, randomBytes } from "node:crypto";
import { encodeCanonical } from "@permio/protocol";
import { hashScenarioTemplate, parseScenarioTemplate, parseSemanticVersion } from "@permio/scenario-domain";
import type { ScenarioInstance } from "@permio/context-accounts";
import type { InstantiationAuthorization, TemplateRecord } from "@permio/scenario-governance";
import {
  pureCircuits as pure,
  type GovernanceActivatorLeaf, type RuntimeInstanceAllocation, type RuntimeStateOpening,
  type RuntimeCredentialInstanceBinding,
  type RuntimeCredentialStatusCommand,
} from "../contracts/managed/permio-authorization/contract/index.js";
import { buildAuthorityRoot, type AuthorityRootBuild } from "./authority-root.ts";
import { hashProtocolIdentifier } from "./canonical.ts";
import { hashM5ScenarioInstance } from "./runtime-credentials.ts";
import type { Hex32 } from "./model.ts";

export interface RuntimeInstanceIssuerBinding {
  readonly principalId: string;
  readonly kind: ScenarioInstance["capabilityIssuers"][number]["kind"];
  readonly authority: GovernanceActivatorLeaf;
}

/** Selected proof deadline is public; it cannot extend any private authority window. */
export function createRuntimeCredentialInstanceBinding(
  allocation: RuntimeInstanceAllocation, issuers: AuthorityRootBuild,
  issuer: GovernanceActivatorLeaf, validBefore: number,
  instanceState: { readonly opening: RuntimeStateOpening; readonly sequence: bigint; readonly nextNonce?: Uint8Array },
): RuntimeCredentialInstanceBinding {
  time(validBefore);
  if (validBefore === 0) throw new TypeError("credential submission deadline must be positive");
  if (issuers.root.field !== allocation.capabilityIssuersRoot.field) {
    throw new TypeError("credential issuer tree does not match the exact private allocation");
  }
  if (instanceState.opening.stateVersion !== 2n ||
      !equal(instanceState.opening.instanceCommitment, allocation.instanceCommitment) ||
      instanceState.sequence < 0n || instanceState.sequence >= 2n ** 64n - 1n) {
    throw new TypeError("credential state binding requires the exact v2 instance and an incrementable Uint64 sequence");
  }
  const nextStateNonce = requiredBytes(instanceState.nextNonce ?? randomBytes(32), "next credential state nonce");
  if (equal(nextStateNonce, instanceState.opening.nonce)) throw new TypeError("next credential state nonce must be fresh");
  return { allocation: structuredClone(allocation),
    issuerPath: issuers.pathFor(pure.governanceActivatorLeafCommitment(issuer)), validBefore: BigInt(validBefore),
    state: structuredClone(instanceState.opening), stateSequence: instanceState.sequence, nextStateNonce };
}

/** Call only after accepted finalization; staging and cleanup do not advance state. */
export function advanceRuntimeCredentialInstanceBinding(
  binding: RuntimeCredentialInstanceBinding, command: RuntimeCredentialStatusCommand,
  nextNonce: Uint8Array = randomBytes(32),
): RuntimeCredentialInstanceBinding {
  const next = pure.runtimeCredentialNextState(binding.state, command.effectiveAt, binding.nextStateNonce);
  if (command.commandVersion !== 4n || command.instanceStateSequence !== binding.stateSequence ||
      !equal(command.allocationCommitment, pure.runtimeInstanceAllocationCommitment(binding.allocation)) ||
      !equal(command.instanceStateCommitment, pure.runtimeStateCommitment(binding.state)) ||
      !equal(command.nextInstanceStateCommitment, pure.runtimeStateCommitment(next)) ||
      command.effectiveAt < binding.state.lastMutationAt || binding.stateSequence >= 2n ** 64n - 1n) {
    throw new TypeError("accepted credential command does not match its exact private state binding");
  }
  const nonce = requiredBytes(nextNonce, "next credential state nonce");
  if (equal(nonce, next.nonce)) throw new TypeError("next credential state nonce must be fresh");
  return { ...structuredClone(binding), state: next, stateSequence: binding.stateSequence + 1n, nextStateNonce: nonce };
}

export interface CreateRuntimeInstanceAllocationInput {
  readonly authorization: InstantiationAuthorization;
  readonly templateRecord: TemplateRecord;
  /** Original creation snapshot, not a snapshot of a later instance state. */
  readonly instance: ScenarioInstance;
  readonly allocatorAuthority: GovernanceActivatorLeaf;
  readonly capabilityIssuers: readonly RuntimeInstanceIssuerBinding[];
  readonly authorityRootVersion: bigint;
  readonly authorityRootSequence: bigint;
  readonly targetNetworkHash: Uint8Array;
  readonly targetContractIdentity: Uint8Array;
  /** Public transaction deadline, distinct from the private instance lifetime. */
  readonly allocationValidBefore: number;
  readonly allocationNonce?: Uint8Array;
  readonly initialStateNonce?: Uint8Array;
}

function bytes(value: Hex32): Uint8Array {
  if (!/^0x[0-9a-f]{64}$/.test(value)) throw new TypeError("expected a canonical 32-byte hash");
  return Uint8Array.from(Buffer.from(value.slice(2), "hex"));
}
function equal(a: Uint8Array, b: Uint8Array): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}
function requiredBytes(value: Uint8Array, name: string, nonzero = true): Uint8Array {
  if (!(value instanceof Uint8Array) || value.length !== 32 || (nonzero && value.every((v) => v === 0))) {
    throw new TypeError(`${name} requires exactly 32${nonzero ? " nonzero" : ""} bytes`);
  }
  return value.slice();
}
function time(value: number): void {
  if (!Number.isSafeInteger(value) || value < 0) throw new TypeError("allocation time must be a nonnegative safe integer");
}
function identifierHash(kind: string, value: string): Uint8Array {
  if (typeof value !== "string" || value.length === 0 || value !== value.trim() || value !== value.normalize("NFC")) {
    throw new TypeError("allocation identifiers must be nonempty NFC text without edge whitespace");
  }
  return createHash("sha256").update(encodeCanonical(`permio:${kind}:v1`, [value])).digest();
}

/** M4 returns a typed authorization, not a cryptographically signed allocation. */
export function hashM4InstantiationAuthorization(value: InstantiationAuthorization): Uint8Array {
  time(value.authorizedAt);
  return createHash("sha256").update(encodeCanonical("permio:m4-instantiation-authorization:v1", [
    value.namespace, value.templateId, value.templateVersion, value.templateHash,
    value.requestId, value.allocatorId, String(value.authorizedAt),
  ])).digest();
}

/** Validates the M4/M5 bridge locally; only a verified allocator signature grants on-chain allocation. */
export function createRuntimeInstanceAllocation(input: CreateRuntimeInstanceAllocationInput) {
  const { authorization, instance, allocatorAuthority: allocator } = input;
  const template = parseScenarioTemplate(input.templateRecord.template);
  const templateHash = hashScenarioTemplate(template).value;
  if (input.templateRecord.state !== "active" || instance.revokedAt !== null ||
      instance.state !== template.initialState || instance.instantiationRequestId !== authorization.requestId ||
      instance.allocatedBy !== authorization.allocatorId ||
      [instance, authorization, input.templateRecord.target].some((target) =>
        target.namespace !== template.namespace || target.templateId !== template.templateId ||
        target.templateVersion !== template.version || target.templateHash !== templateHash)) {
    throw new TypeError("allocation requires the exact active M4 template and original matching M5 instance");
  }
  [authorization.authorizedAt, instance.createdAt, instance.expiresAt, input.allocationValidBefore].forEach(time);
  if (instance.createdAt < authorization.authorizedAt ||
      input.allocationValidBefore <= instance.createdAt || input.allocationValidBefore > instance.expiresAt) {
    throw new TypeError("allocation lifetime or submission window is invalid");
  }
  for (const sequence of [input.authorityRootVersion, input.authorityRootSequence]) {
    if (sequence <= 0n || sequence >= 2n ** 64n) throw new RangeError("allocation root reference must be a positive Uint64");
  }
  const namespaceHash = bytes(hashProtocolIdentifier("namespace", instance.namespace));
  if (allocator.leafVersion !== 1n || allocator.authorityKind !== 4n ||
      !equal(allocator.namespaceHash, namespaceHash) || BigInt(instance.createdAt) < allocator.validAfter ||
      BigInt(input.allocationValidBefore) > allocator.validBefore ||
      (allocator.publicKey.x === 0n && allocator.publicKey.y === 1n)) {
    throw new TypeError("allocation requires an eligible profiled namespace allocator");
  }
  if (instance.capabilityIssuers.length === 0 ||
      input.capabilityIssuers.length !== instance.capabilityIssuers.length) {
    throw new TypeError("allocation requires every explicit M5 instance issuer exactly once");
  }
  const seenPrincipals = new Set<string>();
  const seenKeys = new Set<string>();
  const leaves = input.capabilityIssuers.map((binding) => {
    identifierHash("instance-issuer-id", binding.principalId);
    const leaf = binding.authority;
    const key = `${leaf.publicKey.x}:${leaf.publicKey.y}`;
    if (seenPrincipals.has(binding.principalId) || seenKeys.has(key) ||
        instance.capabilityIssuers.filter((issuer) => issuer.principalId === binding.principalId && issuer.kind === binding.kind).length !== 1 ||
        leaf.leafVersion !== 1n || leaf.authorityKind !== 6n || !equal(leaf.namespaceHash, namespaceHash) ||
        !equal(leaf.governancePolicyHash, allocator.governancePolicyHash) ||
        BigInt(instance.createdAt) < leaf.validAfter || BigInt(instance.createdAt) >= leaf.validBefore ||
        (leaf.publicKey.x === 0n && leaf.publicKey.y === 1n)) {
      throw new TypeError("instance issuer bindings must be unique, exact, valid namespace capability issuers");
    }
    seenPrincipals.add(binding.principalId);
    seenKeys.add(key);
    return structuredClone(leaf);
  });
  const issuers = buildAuthorityRoot(leaves);
  const instanceCommitment = hashM5ScenarioInstance(instance);
  const stateOpening: RuntimeStateOpening = {
    stateVersion: 2n, instanceCommitment,
    lastMutationAt: BigInt(instance.createdAt),
    slotAssignmentsRoot: pure.runtimePrivateMapEmptyRoot(), slotAssignmentCount: 1n,
    slotBindingsRoot: pure.runtimePrivateMapEmptyRoot(), slotBindingCount: 1n,
    stateIdHash: identifierHash("private-state-id", instance.state),
    nonce: requiredBytes(input.initialStateNonce ?? randomBytes(32), "initial state nonce"),
  };
  const version = parseSemanticVersion(instance.templateVersion);
  const allocation: RuntimeInstanceAllocation = {
    allocationVersion: 1n,
    target: { namespaceHash, templateIdHash: bytes(hashProtocolIdentifier("template-id", instance.templateId)),
      semanticVersion: { major: BigInt(version.major), minor: BigInt(version.minor), patch: BigInt(version.patch) },
      templateContentHash: bytes(templateHash as Hex32) },
    instanceCommitment, instanceIdHash: identifierHash("instance-allocation-id", instance.instanceId),
    allocationRequestIdHash: identifierHash("instance-allocation-request-id", authorization.requestId),
    m4AuthorizationCommitment: hashM4InstantiationAuthorization(authorization),
    allocatorAuthorityCommitment: pure.governanceActivatorLeafCommitment(allocator),
    capabilityIssuersRoot: issuers.root, capabilityIssuerCount: BigInt(leaves.length),
    initialStateCommitment: pure.runtimeStateCommitment(stateOpening),
    governancePolicyHash: allocator.governancePolicyHash.slice(),
    authorityRootVersion: input.authorityRootVersion, authorityRootSequence: input.authorityRootSequence,
    targetNetworkHash: requiredBytes(input.targetNetworkHash, "network hash"),
    targetContractIdentity: requiredBytes(input.targetContractIdentity, "deployment identity", false),
    authorizedAt: BigInt(authorization.authorizedAt), createdAt: BigInt(instance.createdAt),
    expiresAt: BigInt(instance.expiresAt), allocationValidBefore: BigInt(input.allocationValidBefore),
    allocationNonce: requiredBytes(input.allocationNonce ?? randomBytes(32), "allocation nonce"),
  };
  return { allocation, stateOpening, issuers };
}
