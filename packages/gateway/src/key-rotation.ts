import { getAddress } from "viem";

import { GatewayError } from "./errors.ts";
import type { GatewayKeyEpoch } from "./model.ts";
import {
  assertProtocolIdentifier,
  assertUnixTime,
  normalizeVerifierAddress,
} from "./validation.ts";

function normalizeEpoch(epoch: GatewayKeyEpoch): GatewayKeyEpoch {
  const activeFrom = assertUnixTime(epoch.activeFrom, "activeFrom");
  const signingCutoff = assertUnixTime(epoch.signingCutoff, "signingCutoff");
  const verificationCutoff = assertUnixTime(
    epoch.verificationCutoff,
    "verificationCutoff",
  );
  if (
    activeFrom >= signingCutoff ||
    signingCutoff > verificationCutoff
  ) {
    throw new GatewayError(
      "INVALID_KEY_EPOCH",
      "key epochs require activeFrom < signingCutoff <= verificationCutoff",
    );
  }
  return {
    keyId: assertProtocolIdentifier(epoch.keyId, "keyId"),
    verifier: normalizeVerifierAddress(epoch.verifier),
    activeFrom,
    signingCutoff,
    verificationCutoff,
  };
}

export function normalizeGatewayKeyEpochs(
  epochs: readonly GatewayKeyEpoch[],
): readonly GatewayKeyEpoch[] {
  const normalized = epochs.map(normalizeEpoch);
  const keyIds = new Set<string>();
  const activationTimes = new Set<number>();
  for (const epoch of normalized) {
    if (keyIds.has(epoch.keyId)) {
      throw new GatewayError(
        "INVALID_KEY_EPOCH",
        `duplicate gateway keyId '${epoch.keyId}'`,
      );
    }
    if (activationTimes.has(epoch.activeFrom)) {
      throw new GatewayError(
        "INVALID_KEY_EPOCH",
        "gateway key activation times must be unique",
      );
    }
    keyIds.add(epoch.keyId);
    activationTimes.add(epoch.activeFrom);
  }
  return normalized.sort((left, right) => left.activeFrom - right.activeFrom);
}

export function selectGatewaySigningKey(
  epochs: readonly GatewayKeyEpoch[],
  signedAt: number,
): GatewayKeyEpoch {
  const at = assertUnixTime(signedAt, "signedAt");
  const candidates = normalizeGatewayKeyEpochs(epochs).filter(
    (epoch) => at >= epoch.activeFrom && at < epoch.signingCutoff,
  );
  const selected = candidates.at(-1);
  if (selected === undefined) {
    throw new GatewayError(
      "NO_ACTIVE_SIGNING_KEY",
      "no gateway key epoch is active for signing",
    );
  }
  return selected;
}

export function gatewayVerifierIsAccepted(
  epoch: GatewayKeyEpoch,
  verifier: string,
  signedAt: number,
  verifiedAt: number,
): boolean {
  const normalized = normalizeEpoch(epoch);
  const signatureTime = assertUnixTime(signedAt, "signedAt");
  const verificationTime = assertUnixTime(verifiedAt, "verifiedAt");
  if (verificationTime < signatureTime) {
    return false;
  }
  try {
    return (
      getAddress(verifier) === normalized.verifier &&
      signatureTime >= normalized.activeFrom &&
      signatureTime < normalized.signingCutoff &&
      verificationTime < normalized.verificationCutoff
    );
  } catch {
    return false;
  }
}
