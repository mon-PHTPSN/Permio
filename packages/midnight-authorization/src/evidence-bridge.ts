import { pureCircuits as pure, type RuntimeEvidenceBridgeOpening,
  type RuntimeSelectedActionValue } from "../contracts/managed/permio-authorization/contract/index.js";

export type { RuntimeEvidenceBridgeOpening, RuntimeSelectedActionValue };

/** Browser-safe generated Compact helpers; no package-root or Node dependencies. */
export const runtimeEvidenceBridgeBinding = (opening: RuntimeEvidenceBridgeOpening): Uint8Array =>
  pure.runtimeEvidenceBridgeBinding(opening);
export const runtimeEvidenceBridgeResourceHash = (binding: Uint8Array): Uint8Array =>
  pure.runtimeEvidenceBridgeResourceHash(binding);
export const runtimeEvidenceBridgeRecipientHash = (fingerprint: Uint8Array): Uint8Array =>
  pure.runtimeEvidenceBridgeRecipientHash(fingerprint);
export const runtimeEvidenceBridgeNonceHash = (nonce: Uint8Array): Uint8Array =>
  pure.runtimeEvidenceBridgeNonceHash(nonce);
export const runtimeEvidenceBridgeSelectedOutput = (opening: RuntimeEvidenceBridgeOpening,
  outputTypeHash: Uint8Array): RuntimeSelectedActionValue => pure.runtimeEvidenceBridgeSelectedOutput(opening, outputTypeHash);
export const runtimeEvidenceBridgeOutputCommitment = (opening: RuntimeEvidenceBridgeOpening,
  outputTypeHash: Uint8Array): Uint8Array => pure.runtimeEvidenceBridgeOutputCommitment(opening, outputTypeHash);
