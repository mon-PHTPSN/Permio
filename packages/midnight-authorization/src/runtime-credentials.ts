import { createHash } from "node:crypto";

import {
  type JubjubPoint,
  type MerkleTreeDigest,
  type MerkleTreePath,
} from "@midnight-ntwrk/midnight-js-protocol/compact-runtime";
import {
  verifySignedActionIntent,
  type CapabilityGrant,
  type CapabilityScope,
  type ContextAccount,
  type ScenarioInstance,
  type SessionGrant,
  type SignedActionIntent,
  type ParticipantSlotAssignment,
} from "@permio/context-accounts";
import { encodeCanonical } from "@permio/protocol";
import { parseSemanticVersion } from "@permio/scenario-domain";
import type { TemplateTarget } from "@permio/scenario-governance";

import {
  pureCircuits,
  type RuntimeAccountCredential,
  type RuntimeActionIntent,
  type RuntimeCapabilityCredential,
  type RuntimeScopeCounts,
  type RuntimeScopeRoots,
  type RuntimeSessionCredential,
  type TemplateRegistryTarget,
} from "../contracts/managed/permio-authorization/contract/index.js";
import type { Hex32 } from "./model.ts";
import { hashProtocolIdentifier } from "./canonical.ts";
import { sparseBytes32MerklePath } from "./credential-status.ts";

export const MIDNIGHT_RUNTIME_CREDENTIAL_VERSION = 1 as const;
export const MIDNIGHT_RUNTIME_CAPABILITY_CREDENTIAL_VERSION = 3 as const;
export const MIDNIGHT_RUNTIME_SESSION_CREDENTIAL_VERSION = 2 as const;
export const MIDNIGHT_RUNTIME_INTENT_VERSION = 1 as const;
export const RUNTIME_SCOPE_TREE_DEPTH = 20;
export const ZERO_COMMITMENT = new Uint8Array(32);

export type RuntimeIdentifierKind =
  | "instance-id"
  | "context-id"
  | "account-id"
  | "grant-id"
  | "session-id"
  | "action-id"
  | "resource-selector"
  | "resource"
  | "purpose"
  | "recipient-kind"
  | "recipient"
  | "disclosure-policy-id"
  | "intent-nonce";

export interface RuntimeScopeTree {
  readonly root: MerkleTreeDigest;
  readonly valueHashes: readonly Uint8Array[];
  pathFor(value: string): MerkleTreePath<Uint8Array>;
  pathForHash(valueHash: Uint8Array): MerkleTreePath<Uint8Array>;
}

export interface RuntimeScopeTrees {
  readonly roots: RuntimeScopeRoots;
  readonly counts: RuntimeScopeCounts;
  readonly actions: RuntimeScopeTree;
  readonly resourceSelectors: RuntimeScopeTree;
  readonly resources: RuntimeScopeTree;
  readonly purposes: RuntimeScopeTree;
  readonly recipientKinds: RuntimeScopeTree;
  readonly recipients: RuntimeScopeTree;
  readonly disclosurePolicyIds: RuntimeScopeTree;
}

export interface CreateRuntimeAccountCredentialInput {
  readonly account: ContextAccount;
  readonly instance: ScenarioInstance;
  readonly runtimePublicKey: JubjubPoint;
  readonly statusIndex: bigint;
  readonly validBefore: number;
}

export interface CreateRuntimeCapabilityCredentialInput {
  readonly grant: CapabilityGrant;
  readonly instanceCommitment: Uint8Array;
  readonly subjectAccountCredential: RuntimeAccountCredential;
  readonly parentCapabilityCredential?: RuntimeCapabilityCredential;
  readonly issuerAccountCredential?: RuntimeAccountCredential;
  /** Exact allocated namespace issuer for a root grant; descendants inherit it. */
  readonly namespaceIssuer?: { readonly principalId: string; readonly authority: import("./midnight-contract.ts").GovernanceActivatorLeaf };
  readonly statusIndex: bigint;
}

export interface CreateRuntimeSessionCredentialInput {
  readonly session: SessionGrant;
  readonly instanceCommitment: Uint8Array;
  readonly subjectAccountCredential: RuntimeAccountCredential;
  readonly capabilityCredential: RuntimeCapabilityCredential;
  readonly runtimePublicKey: JubjubPoint;
  readonly statusIndex: bigint;
}

function sha256(bytes: Uint8Array): Hex32 {
  return `0x${createHash("sha256").update(bytes).digest("hex")}`;
}

function bytes(hex: Hex32): Uint8Array {
  return Uint8Array.from(Buffer.from(hex.slice(2), "hex"));
}

function hex(value: Uint8Array): string {
  return Buffer.from(value).toString("hex");
}

function equalBytes(left: Uint8Array, right: Uint8Array): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

export function runtimeScopeOrderKey(valueHash: Uint8Array): bigint {
  if (!(valueHash instanceof Uint8Array) || valueHash.length !== 32) {
    throw new TypeError("runtime scope value hash must be exactly 32 bytes");
  }
  let result = 0n;
  for (let index = 31; index >= 24; index -= 1) {
    result = (result << 8n) | BigInt(valueHash[index]!);
  }
  return result;
}

export function assertRuntimeScopeHashesCanonicallyOrderable(
  valueHashes: readonly Uint8Array[],
): void {
  const seenHashes = new Set<string>();
  const seenOrderKeys = new Set<bigint>();
  for (const valueHash of valueHashes) {
    const orderKey = runtimeScopeOrderKey(valueHash);
    const hashHex = hex(valueHash);
    if (seenHashes.has(hashHex)) {
      throw new TypeError("runtime scope contains duplicate value hashes");
    }
    seenHashes.add(hashHex);
    if (seenOrderKeys.has(orderKey)) {
      throw new TypeError(
        "runtime scope contains distinct hashes with the same 64-bit ordering key",
      );
    }
    seenOrderKeys.add(orderKey);
  }
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  if (value !== null && typeof value === "object") {
    const record = value as Readonly<Record<string, unknown>>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
      .join(",")}}`;
  }
  if (typeof value === "string") {
    return JSON.stringify(value.normalize("NFC"));
  }
  return JSON.stringify(value);
}

function hashM5(domain: string, value: unknown): Uint8Array {
  return bytes(sha256(encodeCanonical(domain, [canonicalJson(value)])));
}

function assertIndex(value: bigint): void {
  if (value < 0n || value >= 2n ** BigInt(RUNTIME_SCOPE_TREE_DEPTH)) {
    throw new RangeError("credential statusIndex must fit the v1 depth-20 status tree");
  }
}

function assertTime(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError(`${label} must be a non-negative safe integer`);
  }
}

function principalKind(kind: ContextAccount["kind"]): bigint {
  switch (kind) {
    case "human": return 1n;
    case "service": return 2n;
    case "contract": return 3n;
    case "agent": return 4n;
  }
}

function target(target: TemplateTarget): TemplateRegistryTarget {
  const version = parseSemanticVersion(target.templateVersion);
  return {
    namespaceHash: bytes(hashProtocolIdentifier("namespace", target.namespace)),
    templateIdHash: bytes(hashProtocolIdentifier("template-id", target.templateId)),
    semanticVersion: {
      major: BigInt(version.major),
      minor: BigInt(version.minor),
      patch: BigInt(version.patch),
    },
    templateContentHash: bytes(target.templateHash as Hex32),
  };
}

function sameTarget(left: TemplateRegistryTarget, right: TemplateRegistryTarget): boolean {
  return (
    equalBytes(left.namespaceHash, right.namespaceHash) &&
    equalBytes(left.templateIdHash, right.templateIdHash) &&
    left.semanticVersion.major === right.semanticVersion.major &&
    left.semanticVersion.minor === right.semanticVersion.minor &&
    left.semanticVersion.patch === right.semanticVersion.patch &&
    equalBytes(left.templateContentHash, right.templateContentHash)
  );
}

export function hashRuntimeIdentifier(
  kind: RuntimeIdentifierKind,
  value: string,
): Uint8Array {
  if (value.length === 0 || value !== value.trim() || value !== value.normalize("NFC")) {
    throw new TypeError(`${kind} must be non-empty NFC text without edge whitespace`);
  }
  return bytes(
    sha256(encodeCanonical(`permio:runtime-${kind}:v1`, [value])),
  );
}

export function hashM5ScenarioInstance(instance: ScenarioInstance): Uint8Array {
  return hashM5("permio:m5-scenario-instance:v1", instance);
}

export function hashM5ContextAccount(account: ContextAccount): Uint8Array {
  return hashM5("permio:m5-context-account:v1", account);
}

/** Canonical private evidence only; does not authenticate the M5 caller or grant a slot. */
export function hashM5ParticipantSlotAssignment(assignment: ParticipantSlotAssignment): Uint8Array {
  return hashM5("permio:m5-participant-slot:v1", assignment);
}

export function hashM5CapabilityGrant(grant: CapabilityGrant): Uint8Array {
  return hashM5("permio:m5-capability-grant:v1", grant);
}

export function hashM5SessionGrant(session: SessionGrant): Uint8Array {
  return hashM5("permio:m5-session-grant:v1", session);
}

export function hashM5SignedActionIntent(intent: SignedActionIntent): Uint8Array {
  return hashM5("permio:m5-signed-action-intent:v1", intent);
}

export function buildRuntimeScopeTree(
  kind: RuntimeIdentifierKind,
  values: readonly string[],
): RuntimeScopeTree {
  if (values.length === 0) {
    throw new TypeError(`${kind} scope must not be empty`);
  }
  const byHash = values
    .map((value) => ({
      value,
      valueHash: hashRuntimeIdentifier(kind, value),
    }));
  if (new Set(byHash.map(({ valueHash }) => hex(valueHash))).size !== byHash.length) {
    throw new TypeError(`${kind} scope contains duplicate values`);
  }
  assertRuntimeScopeHashesCanonicallyOrderable(byHash.map(({ valueHash }) => valueHash));
  byHash.sort((left, right) => {
    const leftKey = runtimeScopeOrderKey(left.valueHash);
    const rightKey = runtimeScopeOrderKey(right.valueHash);
    return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
  });
  const leafCommitments = byHash.map(({ valueHash }) =>
    pureCircuits.runtimeScopeValueCommitment(valueHash));
  const rawLeaves = new Map(
    leafCommitments.map((commitment, index) => [BigInt(index), commitment] as const),
  );
  const root = pureCircuits.runtimeCredentialStatusPathRoot(
    sparseBytes32MerklePath(rawLeaves, 0n),
  );
  return {
    root,
    valueHashes: byHash.map(({ valueHash }) => valueHash.slice()),
    pathFor(value) {
      const valueHash = hashRuntimeIdentifier(kind, value);
      return this.pathForHash(valueHash);
    },
    pathForHash(valueHash) {
      if (!(valueHash instanceof Uint8Array) || valueHash.length !== 32) {
        throw new TypeError("runtime scope value hash must be exactly 32 bytes");
      }
      const index = byHash.findIndex((candidate) =>
        equalBytes(candidate.valueHash, valueHash));
      if (index < 0) {
        throw new TypeError("value hash is not present in the runtime scope");
      }
      return sparseBytes32MerklePath(rawLeaves, BigInt(index));
    },
  };
}

export function buildRuntimeScopeTrees(scope: CapabilityScope): RuntimeScopeTrees {
  const actions = buildRuntimeScopeTree("action-id", scope.actions);
  const resourceSelectors = buildRuntimeScopeTree(
    "resource-selector",
    scope.resourceSelectors,
  );
  const resources = buildRuntimeScopeTree("resource", scope.resources);
  const purposes = buildRuntimeScopeTree("purpose", scope.purposes);
  const recipientKinds = buildRuntimeScopeTree(
    "recipient-kind",
    scope.recipientKinds,
  );
  const recipients = buildRuntimeScopeTree("recipient", scope.recipients);
  const disclosurePolicyIds = buildRuntimeScopeTree(
    "disclosure-policy-id",
    scope.disclosurePolicyIds,
  );
  return {
    roots: {
      actionsRoot: actions.root,
      resourceSelectorsRoot: resourceSelectors.root,
      resourcesRoot: resources.root,
      purposesRoot: purposes.root,
      recipientKindsRoot: recipientKinds.root,
      recipientsRoot: recipients.root,
      disclosurePolicyIdsRoot: disclosurePolicyIds.root,
    },
    counts: {
      actionsCount: BigInt(actions.valueHashes.length),
      resourceSelectorsCount: BigInt(resourceSelectors.valueHashes.length),
      resourcesCount: BigInt(resources.valueHashes.length),
      purposesCount: BigInt(purposes.valueHashes.length),
      recipientKindsCount: BigInt(recipientKinds.valueHashes.length),
      recipientsCount: BigInt(recipients.valueHashes.length),
      disclosurePolicyIdsCount: BigInt(disclosurePolicyIds.valueHashes.length),
    },
    actions,
    resourceSelectors,
    resources,
    purposes,
    recipientKinds,
    recipients,
    disclosurePolicyIds,
  };
}

export function createRuntimeAccountCredential(
  input: CreateRuntimeAccountCredentialInput,
): RuntimeAccountCredential {
  assertIndex(input.statusIndex);
  assertTime(input.validBefore, "validBefore");
  const { account, instance } = input;
  if (
    account.instanceId !== instance.instanceId ||
    account.revokedAt !== null ||
    instance.revokedAt !== null ||
    input.validBefore <= account.registeredAt ||
    input.validBefore > instance.expiresAt
  ) {
    throw new TypeError("runtime account credential requires an active matching M5 account and instance window");
  }
  return {
    credentialVersion: BigInt(MIDNIGHT_RUNTIME_CREDENTIAL_VERSION),
    target: target(instance),
    instanceCommitment: hashM5ScenarioInstance(instance),
    contextHash: hashRuntimeIdentifier("context-id", account.contextId),
    accountIdHash: hashRuntimeIdentifier("account-id", account.accountId),
    principalKind: principalKind(account.kind),
    m5AccountCommitment: hashM5ContextAccount(account),
    runtimePublicKey: input.runtimePublicKey,
    statusIndex: input.statusIndex,
    issuedAt: BigInt(account.registeredAt),
    validBefore: BigInt(input.validBefore),
  };
}

export function createRuntimeCapabilityCredential(
  input: CreateRuntimeCapabilityCredentialInput,
): { readonly credential: RuntimeCapabilityCredential; readonly scope: RuntimeScopeTrees } {
  assertIndex(input.statusIndex);
  const { grant, subjectAccountCredential } = input;
  const compactTarget = target(grant);
  if (
    grant.revokedAt !== null ||
    !sameTarget(compactTarget, subjectAccountCredential.target) ||
    !equalBytes(input.instanceCommitment, subjectAccountCredential.instanceCommitment) ||
    !equalBytes(hashRuntimeIdentifier("context-id", grant.contextId), subjectAccountCredential.contextHash) ||
    !equalBytes(hashRuntimeIdentifier("account-id", grant.subjectAccountId), subjectAccountCredential.accountIdHash)
  ) {
    throw new TypeError("runtime capability does not match its active M5 subject account");
  }
  const isRoot = grant.parentGrantId === null;
  if (isRoot && (!input.namespaceIssuer || input.namespaceIssuer.principalId !== grant.issuerRef ||
      input.namespaceIssuer.authority.leafVersion !== 1n || input.namespaceIssuer.authority.authorityKind !== 6n ||
      !equalBytes(input.namespaceIssuer.authority.namespaceHash, compactTarget.namespaceHash))) {
    throw new TypeError("root capability requires its exact profiled M5 namespace issuer");
  }
  if (isRoot !== (input.parentCapabilityCredential === undefined)) {
    throw new TypeError("root and delegated capability ancestry are inconsistent");
  }
  if (isRoot !== (input.issuerAccountCredential === undefined)) {
    throw new TypeError("delegated capabilities require the parent holder's runtime account credential");
  }
  let parentCommitment: Uint8Array<ArrayBufferLike> = ZERO_COMMITMENT;
  let issuerCommitment: Uint8Array<ArrayBufferLike> = ZERO_COMMITMENT;
  if (!isRoot) {
    const parent = input.parentCapabilityCredential!;
    const issuer = input.issuerAccountCredential!;
    if (
      !sameTarget(compactTarget, parent.target) ||
      !equalBytes(input.instanceCommitment, parent.instanceCommitment) ||
      !equalBytes(hashRuntimeIdentifier("grant-id", grant.parentGrantId!), parent.grantIdHash) ||
      !equalBytes(hashRuntimeIdentifier("account-id", grant.issuerRef), issuer.accountIdHash) ||
      !equalBytes(parent.subjectAccountCredentialCommitment, pureCircuits.runtimeAccountCredentialCommitment(issuer)) ||
      grant.delegationDepth !== Number(parent.delegationDepth) + 1 ||
      grant.maxDelegationDepth > Number(parent.maxDelegationDepth)
    ) {
      throw new TypeError("delegated runtime capability does not match its parent and issuer chain");
    }
    parentCommitment = pureCircuits.runtimeCapabilityCredentialCommitment(parent);
    issuerCommitment = pureCircuits.runtimeAccountCredentialCommitment(issuer);
  }
  const scope = buildRuntimeScopeTrees(grant.scope);
  return {
    credential: {
      credentialVersion: BigInt(MIDNIGHT_RUNTIME_CAPABILITY_CREDENTIAL_VERSION),
      target: compactTarget,
      instanceCommitment: input.instanceCommitment.slice(),
      contextHash: hashRuntimeIdentifier("context-id", grant.contextId),
      grantIdHash: hashRuntimeIdentifier("grant-id", grant.grantId),
      m5GrantCommitment: hashM5CapabilityGrant(grant),
      subjectAccountCredentialCommitment:
        pureCircuits.runtimeAccountCredentialCommitment(subjectAccountCredential),
      parentCapabilityCredentialCommitment: parentCommitment,
      issuerAccountCredentialCommitment: issuerCommitment,
      namespaceIssuerAuthorityCommitment: isRoot
        ? pureCircuits.governanceActivatorLeafCommitment(input.namespaceIssuer!.authority)
        : input.parentCapabilityCredential!.namespaceIssuerAuthorityCommitment.slice(),
      scopeRoots: scope.roots,
      scopeCounts: scope.counts,
      notBefore: BigInt(grant.notBefore),
      expiresAt: BigInt(grant.expiresAt),
      delegationDepth: BigInt(grant.delegationDepth),
      maxDelegationDepth: BigInt(grant.maxDelegationDepth),
      statusIndex: input.statusIndex,
      issuedAt: BigInt(grant.issuedAt),
    },
    scope,
  };
}

export function createRuntimeSessionCredential(
  input: CreateRuntimeSessionCredentialInput,
): { readonly credential: RuntimeSessionCredential; readonly scope: RuntimeScopeTrees } {
  assertIndex(input.statusIndex);
  const { session, subjectAccountCredential, capabilityCredential } = input;
  const compactTarget = target(session);
  if (
    session.revokedAt !== null ||
    !sameTarget(compactTarget, subjectAccountCredential.target) ||
    !sameTarget(compactTarget, capabilityCredential.target) ||
    !equalBytes(input.instanceCommitment, subjectAccountCredential.instanceCommitment) ||
    !equalBytes(input.instanceCommitment, capabilityCredential.instanceCommitment) ||
    !equalBytes(hashRuntimeIdentifier("context-id", session.contextId), subjectAccountCredential.contextHash) ||
    !equalBytes(hashRuntimeIdentifier("context-id", session.contextId), capabilityCredential.contextHash) ||
    !equalBytes(hashRuntimeIdentifier("account-id", session.subjectAccountId), subjectAccountCredential.accountIdHash) ||
    !equalBytes(hashRuntimeIdentifier("grant-id", session.capabilityGrantId), capabilityCredential.grantIdHash) ||
    !equalBytes(
      pureCircuits.runtimeAccountCredentialCommitment(subjectAccountCredential),
      capabilityCredential.subjectAccountCredentialCommitment,
    )
  ) {
    throw new TypeError("runtime session does not match its active M5 account and capability");
  }
  const scope = buildRuntimeScopeTrees(session.scope);
  return {
    credential: {
      credentialVersion: BigInt(MIDNIGHT_RUNTIME_SESSION_CREDENTIAL_VERSION),
      target: compactTarget,
      instanceCommitment: input.instanceCommitment.slice(),
      contextHash: hashRuntimeIdentifier("context-id", session.contextId),
      sessionIdHash: hashRuntimeIdentifier("session-id", session.sessionId),
      m5SessionCommitment: hashM5SessionGrant(session),
      subjectAccountCredentialCommitment:
        pureCircuits.runtimeAccountCredentialCommitment(subjectAccountCredential),
      capabilityCredentialCommitment:
        pureCircuits.runtimeCapabilityCredentialCommitment(capabilityCredential),
      scopeRoots: scope.roots,
      scopeCounts: scope.counts,
      runtimePublicKey: input.runtimePublicKey,
      notBefore: BigInt(session.notBefore),
      expiresAt: BigInt(session.expiresAt),
      statusIndex: input.statusIndex,
      issuedAt: BigInt(session.issuedAt),
    },
    scope,
  };
}

/** Canonical unused dispatcher argument, never a credential eligible for issuance. */
export function createEmptyRuntimeSessionCredential(): RuntimeSessionCredential {
  const zero = () => new Uint8Array(32);
  return {
    credentialVersion: 0n,
    target: { namespaceHash: zero(), templateIdHash: zero(),
      semanticVersion: { major: 0n, minor: 0n, patch: 0n }, templateContentHash: zero() },
    instanceCommitment: zero(), contextHash: zero(), sessionIdHash: zero(), m5SessionCommitment: zero(),
    subjectAccountCredentialCommitment: zero(), capabilityCredentialCommitment: zero(),
    scopeRoots: { actionsRoot: { field: 0n }, resourceSelectorsRoot: { field: 0n },
      resourcesRoot: { field: 0n }, purposesRoot: { field: 0n }, recipientKindsRoot: { field: 0n },
      recipientsRoot: { field: 0n }, disclosurePolicyIdsRoot: { field: 0n } },
    scopeCounts: { actionsCount: 0n, resourceSelectorsCount: 0n, resourcesCount: 0n,
      purposesCount: 0n, recipientKindsCount: 0n, recipientsCount: 0n, disclosurePolicyIdsCount: 0n },
    runtimePublicKey: { x: 0n, y: 1n }, notBefore: 0n, expiresAt: 0n, statusIndex: 0n, issuedAt: 0n,
  };
}

export function createRuntimeActionIntent(
  intent: SignedActionIntent,
  m5SessionPublicKeyPem: string,
  sessionCredential: RuntimeSessionCredential,
  allocatedInstance: ScenarioInstance,
): RuntimeActionIntent {
  if (!verifySignedActionIntent(intent, m5SessionPublicKeyPem)) {
    throw new TypeError("M5 ActionIntent Ed25519 signature is invalid");
  }
  const payload = intent.payload;
  const compactTarget = target(payload);
  if (
    payload.instanceId !== allocatedInstance.instanceId ||
    !sameTarget(target(allocatedInstance), sessionCredential.target) ||
    !equalBytes(hashM5ScenarioInstance(allocatedInstance), sessionCredential.instanceCommitment)
  ) {
    throw new TypeError("runtime action intent does not match its exact allocated M5 instance");
  }
  if (
    !sameTarget(compactTarget, sessionCredential.target) ||
    !equalBytes(hashRuntimeIdentifier("session-id", payload.sessionId), sessionCredential.sessionIdHash) ||
    !equalBytes(hashRuntimeIdentifier("context-id", payload.contextId), sessionCredential.contextHash)
  ) {
    throw new TypeError("runtime action intent does not match its M5 session credential");
  }
  return {
    intentVersion: BigInt(MIDNIGHT_RUNTIME_INTENT_VERSION),
    target: compactTarget,
    instanceCommitment: sessionCredential.instanceCommitment.slice(),
    contextHash: sessionCredential.contextHash.slice(),
    sessionCredentialCommitment:
      pureCircuits.runtimeSessionCredentialCommitment(sessionCredential),
    actionIdHash: hashRuntimeIdentifier("action-id", payload.actionId),
    resourceSelectorHash: hashRuntimeIdentifier("resource-selector", payload.resourceSelector),
    resourceHash: hashRuntimeIdentifier("resource", payload.resource),
    purposeHash: hashRuntimeIdentifier("purpose", payload.purpose),
    recipientKindHash: hashRuntimeIdentifier("recipient-kind", payload.recipientKind),
    recipientHash: hashRuntimeIdentifier("recipient", payload.recipient),
    disclosurePolicyIdHash: hashRuntimeIdentifier(
      "disclosure-policy-id",
      payload.disclosurePolicyId,
    ),
    m5IntentCommitment: hashM5SignedActionIntent(intent),
    issuedAt: BigInt(payload.issuedAt),
    nonceHash: hashRuntimeIdentifier("intent-nonce", payload.nonce),
  };
}
