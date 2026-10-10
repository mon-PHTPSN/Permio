import {
  createPrivateKey,
  createPublicKey,
  KeyObject,
  sign,
  verify,
} from "node:crypto";

import {
  ACTION_INTENT_ALGORITHM,
  ACTION_INTENT_DOMAIN,
  ACTION_INTENT_VERSION,
  type ActionIntentPayload,
  type SignedActionIntent,
} from "./model.ts";

type SigningKey = KeyObject | string | Buffer;

function assertSafeTime(value: number): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError("issuedAt must be a non-negative safe integer");
  }
}

function lengthPrefix(value: Uint8Array): Buffer {
  const prefix = Buffer.allocUnsafe(4);
  prefix.writeUInt32BE(value.byteLength);
  return prefix;
}

export function serializeActionIntentPayload(
  payload: ActionIntentPayload,
): Uint8Array {
  if (payload.intentVersion !== ACTION_INTENT_VERSION) {
    throw new TypeError("unsupported action intent version");
  }
  assertSafeTime(payload.issuedAt);
  const canonical = JSON.stringify({
    actionId: payload.actionId.normalize("NFC"),
    contextId: payload.contextId.normalize("NFC"),
    disclosurePolicyId: payload.disclosurePolicyId.normalize("NFC"),
    instanceId: payload.instanceId.normalize("NFC"),
    intentVersion: payload.intentVersion,
    issuedAt: payload.issuedAt,
    namespace: payload.namespace.normalize("NFC"),
    nonce: payload.nonce.normalize("NFC"),
    purpose: payload.purpose.normalize("NFC"),
    recipient: payload.recipient.normalize("NFC"),
    recipientKind: payload.recipientKind.normalize("NFC"),
    resource: payload.resource.normalize("NFC"),
    resourceSelector: payload.resourceSelector.normalize("NFC"),
    sessionId: payload.sessionId.normalize("NFC"),
    templateHash: payload.templateHash,
    templateId: payload.templateId.normalize("NFC"),
    templateVersion: payload.templateVersion,
  });
  const domain = Buffer.from(ACTION_INTENT_DOMAIN, "utf8");
  const body = Buffer.from(canonical, "utf8");
  return Buffer.concat([
    lengthPrefix(domain),
    domain,
    lengthPrefix(body),
    body,
  ]);
}

export function createSignedActionIntent(
  payload: ActionIntentPayload,
  privateKey: SigningKey,
): SignedActionIntent {
  const key =
    privateKey instanceof KeyObject ? privateKey : createPrivateKey(privateKey);
  if (key.asymmetricKeyType !== "ed25519") {
    throw new TypeError("action intents require an Ed25519 private key");
  }
  return {
    domain: ACTION_INTENT_DOMAIN,
    algorithm: ACTION_INTENT_ALGORITHM,
    payload: structuredClone(payload),
    signature: sign(
      null,
      serializeActionIntentPayload(payload),
      key,
    ).toString("base64url"),
  };
}

export function verifySignedActionIntent(
  intent: SignedActionIntent,
  publicKey: SigningKey,
): boolean {
  if (
    intent.domain !== ACTION_INTENT_DOMAIN ||
    intent.algorithm !== ACTION_INTENT_ALGORITHM ||
    intent.payload.intentVersion !== ACTION_INTENT_VERSION
  ) {
    return false;
  }
  try {
    const key =
      publicKey instanceof KeyObject ? publicKey : createPublicKey(publicKey);
    return (
      key.asymmetricKeyType === "ed25519" &&
      verify(
        null,
        serializeActionIntentPayload(intent.payload),
        key,
        Buffer.from(intent.signature, "base64url"),
      )
    );
  } catch {
    return false;
  }
}
