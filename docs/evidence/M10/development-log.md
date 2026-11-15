# Encrypted evidence vault: initial primitives

Historical entry for the initial encryption and key-custody slice. The subsequent
confirmed-delivery implementation and current verification are recorded in
[the workflow log](delivery-workflow-development.md).

Baseline: `fa826b561c370b7ecc74af8602f2a9514dfb7204`.

Evidence strategy chosen before behavior: no existing evidence-vault package or
tests exist. Add focused tests first, run them to observe the missing API, then
implement real WebCrypto encryption and the official Mera 0.2.0 secret-vault
integration. Tests use a clearly labeled deterministic WebAuthn fixture at the
authenticator boundary; this is not hardware, synced-passkey, or chain evidence.

Verify selected-record round trip, ciphertext/manifest binding, changed bridge
scope, wrong key, expiry, verifier denial/revocation, and the provider's persisted
output. The receipt verifier remains mandatory and consumes the actual M6 v1
`DecisionReceipt` type. No bridge proof module or receipt format is invented.

M10 acceptance remains pending, including live M6/M7 bridge authorization,
separate-channel retries, retrieval storage isolation, browser disclosure UI,
and real authenticator/fresh-profile compatibility. No live transactions or ECS.

## Implemented behavior

- Local P-256/HKDF-SHA-256/AES-256-GCM selected-record encryption, explicit
  source/destination/case/recipient/purpose/permitted-use/expiry/nonce binding,
  ordered record manifest, ciphertext digests, and M5 payload binding.
- Mandatory injected receipt verifier consuming the actual M6 v1
  `DecisionReceipt` export. No receipt-output semantics, bridge proof module,
  transport authenticity or chain finality has been invented.
- Provider-neutral recipient-key custody and real `mera-prf-v1` integration.
  A fresh SDK-generated 32-byte PRF salt and a fresh versioned namespace protect
  each normal, rotatable encryption private key. RP/namespace/fingerprint and
  algorithms are checked against the encrypted vault binding. The unwrapped
  key is non-exportable and used only through a local callback.

## Provider verification

Official package: [@category-labs/mera 0.2.0](https://www.npmjs.com/package/@category-labs/mera/v/0.2.0).
Publisher repository: [Category Labs Mera](https://github.com/category-labs/mera).
Metadata inspected with `npm view @category-labs/mera@0.2.0 ... --json` and
`gh repo view category-labs/mera --json defaultBranchRef,url,licenseInfo`.

`npm pack @category-labs/mera@0.2.0 --ignore-scripts` supplied official source
and declarations. Inspected `src/secret.ts`, `src/passkey.ts`, `src/webauthn.ts`,
`src/types.ts`, and `src/index.ts`. The public
`createSecretVaultWithExistingPasskey` and `decryptSecretVaultWithPasskey` APIs
perform AES-GCM vault protection and user-verified PRF assertions. Source
confirms fresh internal salts and temporary secret/PRF buffer cleanup. The SDK
does not bind namespace/RP/fingerprint inside its generic secret; this adapter
encodes those values with the private key and verifies them before key use.
Configured custom WebAuthn clients also reject a mismatched returned credential.
The built-in browser path uses WebAuthn's credential allowlist.

Registry integrity independently reproduced by SHA-512 of the downloaded
tarball (the scratch tarball/source was removed after inspection):

```text
sha512-cdBTSy1NvHJn+GqbAnSREeAx2QD+OuQM+vU2O/HDB+8Ya9/+lyVGklJzvSw6NJxzxoee9lpEcPS7/AvbAD4xsA==
```

License: MIT OR Apache-2.0. Mera requires Node >=24; this package records that
engine without changing the repository's existing toolchain pins. Observed
runtime: Node 24.13.1, npm 11.8.0. No account derivation/signing API is called.
The architecture's official Mera documentation URL was unavailable through the
web tool; API claims above are grounded in the pinned official package source.

## Test evidence

Existing tests inspected for interfaces/conventions:
`packages/context-accounts/test/context-accounts.test.ts`,
`packages/midnight-authorization/test/indexed-decision-receipt.test.ts`, and
`packages/scenario-packs/test/scenario-packs.test.ts`. These remain unchanged.
The M10 package is a new leaf; existing consumers have not been migrated.

Proof-first red command, before production files existed:

```sh
node --test packages/evidence-vault/test/evidence.test.ts
```

Observed exit 1: `ERR_MODULE_NOT_FOUND` for
`packages/evidence-vault/src/index.ts`, confirming the requested API was absent.
An initial provider test also caught an overly broad test-string check that
mistook the nonsecret algorithm name `Mera-secret-v1` for leaked secret data.
It was corrected to inspect actual persisted field names. It is not counted as
a product defect or cryptographic red evidence.

Initial-slice verification:

```sh
npm test --workspace @permio/evidence-vault
npm run typecheck --workspace @permio/evidence-vault
npm run compile
npm run typecheck
```

Results: 6/6 tests pass; scoped typecheck passes. Solidity compilation generates
7 contracts with solc 0.8.31 (Osaka). Full repository typecheck passes afterward.
Before compilation, the fresh worktree lacked generated contract types and
reported ABI-consumer diagnostics; those disappeared after the prescribed build.

Tests cover round trip after verifier success; exact manifest fields and M5
payload binding; changed source/destination/case/recipient/purpose/use/expiry/
nonce/record set; wrong recipient; expiry; prospective authorization denial;
ciphertext mutation/extra ciphertext; authenticated-encryption purpose binding;
real Mera SDK wrapping with independent salts/namespaces; fresh software-adapter
unlock and evidence decryption; non-exportable private keys; persisted field
allowlist; WebAuthn request minimization; and wrong credential/RP/namespace/salt/
ciphertext/fingerprint denial. Synthetic receipt values use the complete actual
M6 v1 type. The test authorization adapter is labeled as a fixture and does not
establish M6/M7 correctness.

Initial-slice root changes: `package-lock.json` only, adding the new workspace link/record,
Mera 0.2.0 and its three exact nested dependencies. Existing lock records and
versions are preserved. No root scripts/manifest, roadmap status, unrelated
package, private instructions, ECS state or Git index was changed.

## Acceptance still pending

- Integrate the deployed authorization and production delivery adapters for the
  approved sequence. The local client controller is implemented; live acceptance
  remains pending. See [the workflow evidence](delivery-workflow-development.md).
- Register/integrate the approved M6 bridge module and wire an authentic exact
  M6/M7 verifier, current credential/revocation reads and one-use authorization.
- Connect the complete disclosure/linkage preview to the browser confirmation UI.
- Verify production receipt/ciphertext channels and durable restart recovery;
  local separate-channel HTTP retry evidence is recorded in the workflow log.
- Implement authenticated retrieval/storage isolation and demonstrate that other
  records/instances cannot be enumerated; preserve immutable receipt history
  while expiry/revocation blocks new retrieval authorization.
- Run a real supported passkey on a second device/fresh browser profile against
  the same vault, document the RP migration/authenticator support matrix, and
  inspect actual product storage/log/server traffic for secret exclusion.
- Perform full scenario/local-chain/public-network and sponsor acceptance when
  separately authorized. Local fixture checks do not satisfy these gates.

Repository navigation: no Devin tools were exposed. The available code-index
healthcheck reported the original checkout and a stale October 14 snapshot,
so exact local source was used. That index was not updated from this isolated
worktree; no fresh indexed analysis is claimed.

## Coordinator validation after latest baseline update

The worktree was created from `fa826b5` and then fast-forwarded to
`30f3f361b63b08492b37e9272a59ceb4151d05cd` after the concurrent M9
compatibility fix was committed. The local M10 implementation was preserved.
On 2026-11-14 the coordinator independently reran the final M10 tests (6/6,
zero skipped) and full `npm run typecheck`; both passed on that updated head.
At that checkpoint the implementation was uncommitted in `feat/m10-encrypted-evidence`; the subsequent workflow log records its continuation.
