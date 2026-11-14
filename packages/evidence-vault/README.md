# Encrypted evidence vault: local implementation

This package provides local client primitives. The confirmed-disclosure workflow
coordinates signing, authorization-receipt
verification and independent delivery channels. Deployment-specific bridge
authorization and evidence-server integration remain pending. The
approved preview, local encryption, signing, authorization and delivery order
is recorded in [the sequence decision](../../docs/evidence/M10/bridge-sequence-decision.md).

## Local evidence encryption

`createRecipientEncryptionKey()` creates a normal, rotatable P-256 encryption
keypair. Its public descriptor contains the exact SPKI encoding (the standard
public-key representation), algorithm, and SHA-256 fingerprint. The returned
private `CryptoKey` cannot be exported.

`encryptSelectedRecords(scope, records, recipient)` prepares selected ciphertexts
and a versioned manifest. Each record binds its commitment, media type, length,
source context/instance, destination context/case, exact recipient fingerprint,
purpose, permitted use, expiry, and nonce through authenticated encryption.
Encryption uses an independent ephemeral P-256 key and random 96-bit nonce per
record, HKDF-SHA-256 key derivation, and AES-256-GCM authenticated encryption.
The manifest contains ciphertext digests and commitments, never record plaintext.
It is private delivery metadata, not an allowlist for public publication.

`selectedRecordManifestRoot()` commits to the ordered selected-record metadata
and ciphertext digests. `bridgeBindingCommitment()` additionally commits to the
complete scope. Their versioned domains and length-delimited encoding are a new
versioned evidence-delivery commitment; the authorization contract's receipt
schema remains authoritative.

`bindBridgeActionIntent(existingContextAccountPayload, manifest)` puts that complete binding
in the existing context-account `ActionIntent.resource` field and sets the exact recipient fingerprint,
purpose, and nonce. It returns an ordinary context-account payload for the caller's existing
scoped-session signing API. Template/action/disclosure policy and source private
instance identifiers remain the caller's approved context-account values. This helper grants
no capability and does not make an unregistered bridge action executable.

`verifyAndDecryptEvidence(bundle, expectedBinding, recipientKey, authorization)`
checks expiry, key fingerprint, manifest root, complete binding, exact ciphertext
set and digests before calling the mandatory `BridgeReceiptVerifier`. The
verifier consumes the real `@permio/midnight-authorization` v1 `DecisionReceipt`
type and must reconcile the exact finalized source, approved bridge module,
receipt-gateway authenticity when applicable, full signed binding, and current revocation.
There is no permissive default. Only after it succeeds does authenticated
decryption run. `expectedBinding` must come from the authorized intent, not an
untrusted bundle. Hash integrity alone does not establish authorization or the
truth of a record's contents.

New recipient keys cannot decrypt existing ciphertext. Rotation creates a new
key/vault and requires a new bridge intent/receipt for new encryption. This slice
does not implement a re-encryption exception or silently select a replacement key.

## Passkey custody

`RecipientKeyCustodyAdapter` keeps provider-specific custody separate from
protocol-facing encryption keys. `createMeraRecipientKeyCustodyAdapter({rpId})`
implements `mera-prf-v1` using **`@category-labs/mera` 0.2.0**. `createVault()`
requires an already enrolled passkey's credential metadata. Each call generates
a distinct versioned namespace and invokes the SDK's secret-vault API, which
generates a fresh random 32-byte PRF salt. PRF means a pseudorandom function;
the passkey's output unlocks the protected key rather than becoming a wallet.
There is no caller-supplied namespace or salt reuse option.

`withUnlockedKey(manifest, {publicKey, namespace}, use)` requires the expected
public descriptor and namespace from a trusted recipient-key registration. It
checks the configured relying-party hostname, manifest version/algorithms and
fingerprint, then checks those same bindings inside the decrypted vault. A key
agreement challenge confirms the unwrapped private/public key pair. The callback
receives a non-exportable decryption key, not raw private-key bytes. The SDK's
salt/ciphertext/nonce and nonsecret credential-recovery metadata are the only
provider-specific persisted values. RP migration and authenticator compatibility
need explicit deployment evidence; failure never falls back to another identity.

The package has no built-in persistence, server, ledger or logging. Delivery
uses explicit caller-supplied channels after current authorization checks.
Only the JSON-safe returned vault manifest is suitable for private persistence;
public encryption keys are registered separately. Temporary private-key and
unwrapped-vault byte buffers are cleared in `finally` blocks. JavaScript and the
crypto runtime do not guarantee forensic erasure of internal copies. Callers
must keep callbacks/plaintext in the client, clear returned plaintext after use,
and avoid retaining key handles. Browser code runs in an HTTPS secure context.

## Confirmed evidence delivery

`createEvidenceDelivery({scope, records, recipient, intent}, adapters)` creates
an isolated local snapshot and a disclosure preview. It does not encrypt, sign
or transmit at creation. The preview identifies source/destination contexts,
source instance and destination case, recipient key fingerprint, selected
record commitments/types/lengths, purpose, permitted use, expiry and linkage.
The host interface displays it before calling `confirm(previewId)` on the
participant's explicit confirmation. A changed selection or scope requires a
new preview/workflow; call `withdraw()` on the abandoned one.

`authorize()` encrypts exactly once, calculates the manifest and complete
binding, asks the context-account signer to sign that bound `ActionIntent`,
verifies the exact returned payload/signature, requests authorization and
verifies the returned receipt. The local proof adapter receives a private
manifest opening (scope, record
commitments and ciphertext digests) to prove the binding, but no record plaintext
or ciphertext bytes. This opening is not part of the public receipt channel.
It must use the approved bridge module, and
its verifier must authenticate the exact finalized authorization-contract
receipt, approved policy/module and current revocation. There is no permissive
or fabricated default. Signature/authorization failures block both channels.

`deliver("receipt")` sends only the full authoritative public receipt and its
channel delivery ID. `deliver("ciphertext")` sends the encrypted bundle and
its complete binding through the separate evidence channel. Each send rechecks
current receipt authorization, withdrawal and expiry after asynchronous
preflight. Both channels have independent status and stable, distinct retry
IDs. An acknowledged channel is not resent. A failed/unacknowledged channel
can retry with the same bytes and ID, without new encryption, signing or
authorization admission. Receivers must deduplicate the ID and independently
enforce authorization; a client controller is not a server access boundary.

Channel arguments are copies, so a transport cannot mutate retained ciphertext.
Only declared signed-request and receipt fields cross their respective
boundaries. Adapter errors are sanitized. Withdrawal prevents future sends;
an already transmitted disclosure cannot be recalled. A late acknowledgement
remains visible in `status()` even after withdrawal. `verifyAndDecryptEvidence`
performs the recipient's receipt, manifest/digest, key, expiry and revocation
checks before decryption.

The workflow clears its owned plaintext byte arrays after preparation/failure/
withdrawal and when expiry is observed. It has no idle cleanup timer or durable
outbox; the host must dispose of abandoned workflows with `withdraw()`. Neither
JavaScript strings nor crypto-runtime copies have guaranteed forensic erasure.
Restart recovery and authenticated server-side retrieval remain separate
integration requirements.

```ts
const delivery = await createEvidenceDelivery(input, adapters);
const preview = delivery.preview();
// Display this exact preview and wait for explicit participant confirmation.
delivery.confirm(preview.previewId);
await delivery.authorize();
await delivery.deliver("receipt");
await delivery.deliver("ciphertext");
// Retry only an unacknowledged channel; never create a new ciphertext for it.
```

## Verification and limits

Node.js 24 or later is required by the pinned Mera SDK. Run from the repository:

```sh
npm install --ignore-scripts
npm test --workspace @permio/evidence-vault
npm run typecheck --workspace @permio/evidence-vault
```

Tests exercise real WebCrypto and the real Mera vault implementation with a
labeled software authenticator. That fixture proves neither hardware support
nor synchronized-passkey recovery. Workflow tests use real context-account
signatures and local HTTP delivery, with explicitly synthetic external
authorization. No browser UI, authenticated retrieval service, live bridge
authorization, durable restart recovery or real cross-device test is included. See [the development log](../../docs/evidence/M10/development-log.md)
for exact commands and remaining acceptance gates.
