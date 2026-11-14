import { createHash, randomBytes } from "node:crypto";
import { ecMulGenerator } from "@midnight-ntwrk/midnight-js-protocol/compact-runtime";
import { encodeCanonical } from "@permio/protocol";
import { parseScenarioTemplate } from "@permio/scenario-domain";
import {
  pureCircuits as pure,
  type RuntimeBusinessRecord,
  type RuntimeBusinessPredicate,
  type RuntimeSignedBusinessRecord,
} from "../contracts/managed/permio-authorization-v11/contract/index.js";
import { governanceActivatorPublicKey, JUBJUB_SCALAR_ORDER, TWO_TO_248 } from "./compact-crypto.ts";

function typeHash(kind: "record-type" | "claim-type", value: string): Uint8Array {
  return createHash("sha256").update(encodeCanonical(`permio:${kind}:v1`, [value])).digest();
}

/** Projects schema-2 declarations against the exact ordered action schemas. */
export function createRuntimeBusinessPredicates(templateInput: unknown, actionId: string): RuntimeBusinessPredicate[] {
  const template = parseScenarioTemplate(templateInput);
  if (template.schemaVersion !== 2) throw new TypeError("Business predicates require template schema 2");
  const action = template.actions.find(({ id }) => id === actionId);
  if (!action) throw new TypeError("Unknown action for business predicate projection");
  const profile = template.proofProfiles.find(({ id }) => id === action.proofProfileId)!;
  const indexOf = (values: readonly string[], value: string): bigint => {
    const index = values.indexOf(value);
    if (index < 0 || index >= 8) throw new TypeError("Predicate type is outside the selected eight-item action schema");
    return BigInt(index);
  };
  return profile.predicates!.map((predicate): RuntimeBusinessPredicate => ({
    predicateVersion: 1n,
    kind: predicate.kind === "current-record-v1" ? 1n : predicate.kind === "bounded-value-v1" ? 2n : 3n,
    inputIndex: indexOf(action.inputRecordTypes, predicate.inputRecordType),
    ceilingIndex: predicate.kind === "bounded-value-v1" ? indexOf(action.inputRecordTypes, predicate.ceilingRecordType) : 0n,
    outputIndex: indexOf(action.outputClaimTypes, predicate.outputClaimType),
    inputTypeHash: typeHash("record-type", predicate.inputRecordType),
    ceilingTypeHash: predicate.kind === "bounded-value-v1" ? typeHash("record-type", predicate.ceilingRecordType) : new Uint8Array(32),
    outputTypeHash: typeHash("claim-type", predicate.outputClaimType),
  }));
}

export function runtimeBusinessRecordCommitment(record: RuntimeBusinessRecord): Uint8Array {
  return pure.runtimeBusinessRecordCommitment(record);
}

function randomScalar(): bigint {
  let value = 0n;
  while (value === 0n) value = BigInt(`0x${randomBytes(32).toString("hex")}`) % JUBJUB_SCALAR_ORDER;
  return value;
}

/** Signs the compiled record challenge using the existing Schnorr profile. */
export function signRuntimeBusinessRecord(
  record: RuntimeBusinessRecord, issuerSecret: bigint, nonce = randomScalar(),
): RuntimeSignedBusinessRecord["signature"] {
  const publicKey = governanceActivatorPublicKey(issuerSecret);
  if (nonce <= 0n || nonce >= JUBJUB_SCALAR_ORDER) throw new RangeError("signature nonce must be a non-zero Jubjub scalar");
  const announcement = ecMulGenerator(nonce);
  const challenge = pure.runtimeBusinessRecordSignatureChallenge(announcement, publicKey, record) % TWO_TO_248;
  return { announcement, response: (nonce + challenge * issuerSecret) % JUBJUB_SCALAR_ORDER };
}

export function runtimeBusinessAuditReference(intentCommitment: Uint8Array, selectedInputsCommitment: Uint8Array): Uint8Array {
  return pure.runtimeBusinessAuditReference(intentCommitment, selectedInputsCommitment);
}
