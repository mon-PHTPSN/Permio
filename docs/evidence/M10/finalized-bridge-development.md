# Finalized evidence bridge verifier

Date: 2026-11-15. Baseline: `8d08ece2271ca5eb291b2d88b4436c8045ba8938`.

The user explicitly approved extending the Midnight authorization package with
an evidence-bridge proof module and circuit-verifiable manifest binding while
preserving DecisionReceipt v1. The client, storage service and contract now use
the same binding-v2 typed opening. Manifest version 1 and ciphertext encryption
remain unchanged. The ordered manifest root is not limited to eight records.

## Implemented checks

The browser-safe `@permio/midnight-authorization/evidence-bridge` helpers wrap
actual generated Compact pure circuits. `createEvidenceBridgeOpening()` hashes
the purpose using the existing runtime identifier domain and permitted use under
a separate v2 domain, then includes the exact source/destination, instance/case,
recipient-key fingerprint, expiry, nonce and ordered manifest root. The action
resource is the lowercase 0x encoding of the generated binding; resource,
recipient and nonce identifiers retain their existing canonical string encoding.

The separate Node-only `createFinalizedEvidenceBridgeVerifier()` calls the
authoritative finalized receipt decoder through a mandatory trusted source
factory. The authorization package supplies the fixed-entry
`createIndexedEvidenceBridgeDecisionReceiptReader()`; an arbitrary entry name
cannot be configured. The verifier compares all 25 public receipt fields, pins
the approved module version/implementation and template/action/output schema,
checks source instance/context and runtime purpose/recipient hashes, requires
canonical non-transitioning state fields and enforces receipt/disclosure windows.
It recomputes the aggregate output accumulator with generated code. That output
commitment is not the bridge binding itself.

Current private credential status remains a mandatory authenticated callback,
without an accepting default. A finalized receipt establishes the historical
decision, not perpetual authorization. Both HTTP retrieval and the client
workflow recheck the clock after awaited verification. The server never receives
private recipient keys and never decrypts evidence.

## Exact-resource prerequisite

Encryption creates a new resource binding. Both the capability and signing
session must explicitly cover that resource before signing. Existing permission
for the source record is insufficient. The product reserves its intended session
identifier and obtains the exact binding scope through the authenticated issuer;
neither the signer nor proof adapter may silently replace the signed session.
The contract tests issue explicit exact-resource credentials for this case.

## Verification boundaries

`test/midnight-verifier.test.ts` runs the real generated binding/output helpers,
typed receipt commitment and authoritative v1 decoder, WebCrypto encryption and
recipient decryption. Source finality observations and current credential status
are labeled test fixtures. Negative cases cover a substituted receipt or ledger
sequence, unrelated context/instance/purpose/recipient/output/schema, altered
manifest scope/root, pending/failed/foreign transaction observations, receipt
validity edges, disclosure expiry, overlong receipt windows and current revocation.
A twelve-record manifest confirms there is no artificial fixed record cap.

Initial test execution failed because the bridge subpath did not yet exist.
After source integration and independent pinned compilation, the evidence-vault
suite passes 28 tests with zero failures/skips. Project-wide typecheck passes.
The bridge worker separately records generated contract execution evidence in
`bridge-authorization/`; integrated final counts and review are recorded in
`storage-bridge-verification.json`.

No new proving keys, real zero-knowledge proof, chain deployment, transaction,
proof-module activation, cloud operation or production account provisioning is
claimed. Generated execution is distinct from live proof acceptance. The existing
fail-closed compiled-asset guard remains required before deployment; prior keys
must not be represented as matching the changed contract. Browser confirmation,
real supported passkey/device testing and product identity/current-status wiring
remain required for full live acceptance.
