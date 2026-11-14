# Encrypted evidence vault: local implementation

This package provides local client primitives. The confirmed-disclosure workflow
coordinates signing, authorization-receipt
verification and independent delivery channels. A separate private HTTP/SQLite
service provides durable ciphertext retrieval.
Live deployment and product identity provisioning remain pending. The
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

`selectedRecordManifestRoot()` preserves the v1 ordered record/ciphertext format.
`createEvidenceBridgeOpening()` constructs the fixed typed bridge header, and
`bridgeBindingCommitment()` uses the authorization package's generated Compact
hash helper with binding version **2**. The header binds source context/instance,
destination context/case, purpose, permitted use, expiry, nonce, exact recipient
key fingerprint and manifest root. There is no fixed record-count cap; HTTP size
limits still bound upload resources. Old local binding-v1 commitments are not
accepted or silently migrated. No binding-v1 live deployment is claimed.

The bridge emits one typed aggregate selected output. Receipt v1 commits to its
ordered output accumulator, which is deliberately different from the bridge
binding. The receipt recipient is the runtime hash of the exact fingerprint;
it is not an EVM address or a truncated value. The bridge helper matches the
existing canonical resource, recipient and nonce identifier encoding.

`bindBridgeActionIntent(existingContextAccountPayload, manifest)` puts that complete binding
in the existing context-account `ActionIntent.resource` field and sets the exact recipient fingerprint,
purpose, and nonce. It returns an ordinary context-account payload for the caller's existing
scoped-session signing API. Template/action/disclosure policy and source private
instance identifiers remain the caller's approved context-account values. This helper grants
no capability and does not make an unregistered bridge action executable.

After encryption, both the capability and signing session must explicitly cover
the newly calculated binding resource before the signature is produced. An old
record-resource permission does not cover it. The host reserves the intended
session ID and obtains the exact scope through its authenticated issuer; the
signer may not substitute another session or modify the confirmed payload.

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

The browser entry has no persistence, server or logging. The separate Node-only
service below stores ciphertext and public receipts. Delivery
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
Client outbox recovery remains separate; the Node service below provides
durable authenticated ciphertext retrieval.

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

## Private ciphertext service

The separate `@permio/evidence-vault/server` export provides
`EvidenceVaultStore`, `createEvidenceVaultCredential()` and
`createEvidenceVaultServer()`. It is Node-only and is not imported by the
browser entry. SQLite stores the ciphertext bundle and the full public receipt;
it stores neither plaintext, private keys, passkey material nor access tokens.
Receipt acquisition uses a required trusted resolver, outside the ciphertext
upload body. The public receipt channel remains separate.

The host provisions a random access token for one exact bridge binding and
recipient-key fingerprint, an expiry and explicit `deliver` or `retrieve`
operations. Only its SHA-256 digest belongs in private service configuration.
Give the original token only to the intended caller after the product's
authenticated account/recipient binding has been checked. These private access
credentials grant no on-chain capability, are never inferred from possession
of a public receipt, and have no HTTP issuance endpoint. Sender upload and
recipient retrieval may use different tokens and permissions.

- `PUT /v1/evidence/<deliveryId>` accepts only the exact ciphertext-delivery
  schema after checking the scoped credential, manifest/ciphertext digests,
  complete binding, stable identifier and current authorization.
- `GET /v1/evidence/<deliveryId>` requires a retrieval credential for that exact
  binding and recipient. It rechecks the stored receipt and current revocation,
  expiry and authorization before returning the unchanged encrypted bundle.
- There is no list/search or public history route. Unknown and out-of-scope
  identifiers produce the same not-found response. Responses prohibit caching.
- Retries are idempotent. Existing ciphertext and receipt bodies cannot be
  overwritten, including after a service restart. Expiry or revocation blocks
  new retrieval without deleting immutable receipt history.
- Input size is bounded, undeclared fields are rejected, and HTTP errors never
  include private adapter diagnostics. The service does not log request bodies
  or credentials.

The resolver and `BridgeReceiptVerifier` remain mandatory. They must reconcile
the approved finalized bridge receipt and current authorization; the storage
tests label their external authorization fixture explicitly. Local service
tests do not establish a deployed network or product identity integration.

`createFinalizedEvidenceBridgeVerifier()` (from the Node-only server export)
provides the concrete receipt and manifest checks. Its trusted deployment
configuration pins the network/contract, evidence-bridge module version and
implementation, template version/content, action schema and aggregate output
type. The required source-reader factory should use
`createIndexedEvidenceBridgeDecisionReceiptReader()` from the authorization
package; it reconciles both the indexer and serialized transaction entry
`executeRuntimeEvidenceBridge`, finality and exact receipt creation. All 25 public
receipt fields must match the authoritative decoder. The verifier recomputes
the binding, runtime recipient and generated selected-output accumulator, checks
non-transitioning state fields and enforces both receipt/disclosure windows.

Current authorization is a separate mandatory authenticated callback. A receipt
records the decision at execution; it cannot by itself establish that private
credentials remain unrevoked later. There is no accepting callback default.
Production must supply this status integration and its trusted source/resolver;
test-only source observations are explicitly labeled.

Keep the SQLite file and credential configuration in a private directory outside
web roots, build outputs and Git, with host access limited to the service user.
Bind the service to loopback behind the intended authenticated HTTPS product
entry point. No deployment, public listener or reverse-proxy rule is installed
by this package. It supplies no browser key storage or decryption endpoint.

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
authorization. No browser UI, production identity provisioning, live bridge
authorization, browser outbox recovery or real cross-device test is included.
Service restart persistence is tested separately with real SQLite and HTTP. See [the development log](../../docs/evidence/M10/development-log.md)
for exact commands and remaining acceptance gates.
