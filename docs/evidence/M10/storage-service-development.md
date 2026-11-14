# Durable private evidence retrieval

Date: 2026-11-15. Starting commit: `8d08ece`.
Worktree branch: `feat/m10-encrypted-evidence`.

The existing client workflow encrypted and delivered selected records but did
not persist them or enforce a receiving service's access boundary. This change
adds a separate Node-only HTTP/SQLite service. The browser import remains free
of Node storage/server dependencies.

## Implemented boundary

The host explicitly provisions per-binding, per-recipient access credentials
with operation and expiry restrictions. Credentials contain only a token digest;
the original random token is delivered privately to its intended authenticated
caller. No public receipt grants access, and no HTTP endpoint issues credentials.

Uploads verify the exact message schema, ordered manifest and ciphertext hashes,
binding, delivery identifier and mandatory current bridge authorization before
a transaction writes ciphertext and immutable public receipt history. Retrieval
uses the credential's binding/recipient as SQL predicates and repeats current
authorization checks. There is no list/search/history route. Unrelated and
unknown identifiers have identical not-found responses.

The server validates expiry again after asynchronous verification. Revocation,
expiry and verifier failures block new retrieval while preserving history.
Retrying the exact upload is idempotent; a changed ciphertext or receipt cannot
replace the saved version. Raw adapter diagnostics and undeclared private fields
are excluded. The server never receives a recipient private key or decrypts.

## Evidence

Existing client, encryption, passkey-custody and gateway SQLite patterns were
read before implementation. The new proof test is `test/server.test.ts`.

Before production source existed:

```sh
node --test packages/evidence-vault/test/server.test.ts
```

Expected red: `ERR_MODULE_NOT_FOUND` for `src/server.ts`, exit 1.
An initial implementation check then caught unsupported Node type-stripping
syntax (a TypeScript parameter property) and a readonly negative fixture.
Those tooling/fixture errors were corrected, not counted as cryptographic proof.

Current focused service result: six tests pass, zero failures/skips. Scoped
package typecheck passes. Tests use actual Node HTTP requests, independent
random credentials, real SQLite persistence/restart, real WebCrypto encryption
and recipient-only decryption. Authorization/finality/current-revocation values
are explicitly synthetic; they are not live bridge acceptance.

Covered behavior: authenticated round trip and restart; wrong/missing credentials,
wrong operations and unrelated binding isolation; no listing/search; idempotent
retry and overwrite rejection; credential/disclosure expiry, current revocation
and diagnostics suppression; expiry during an awaited verification; bounded
input and rejection of extra plaintext fields. A checkpointed SQLite file is
inspected to confirm it does not contain plaintext, raw access tokens or private
adapter diagnostics.

## Integration still required

The user approved extending the authorization package with the explicit
evidence-bridge proof module while preserving DecisionReceipt v1. That extension
was implemented in a separate clean managed worktree from the same committed
baseline and integrated with independently regenerated contract bindings. The
concrete finalized receipt verifier is described in finalized-bridge-development.md.

Production account-to-recipient provisioning, finalized bridge/current-status
adapters, HTTPS hosting, browser disclosure/key handling and real supported
passkey tests remain distinct acceptance work. No cloud service, deployment,
transaction, template activation or remote Git write was performed here.
