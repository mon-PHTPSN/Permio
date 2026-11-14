# Evidence bridge authorization v2

Source baseline: `8d08ece2271ca5eb291b2d88b4436c8045ba8938`.

The Midnight authorization contract has a dedicated `executeRuntimeEvidenceBridge` entry for module `cross-context-evidence-bridge`, version `1.0.0`, circuit and template proof-profile ID `cross-context-evidence-bridge-v1`. This uses policy version 3 and authoritative `DecisionReceipt` version 1. `prepareRuntimeAction` only prepares evidence/slot progress. The ordinary execution entry rejects this module, and both entries share a private execution core that retains all prior authorization, registry/governance, signature, current status, exact scope, slot ancestry, validity and nullifier checks.

The private fixed opening is serialized in this exact Compact field order:

```ts
type RuntimeEvidenceBridgeOpening = {
  bindingVersion: bigint; // 2n (Uint16)
  sourceContextHash: Uint8Array; // Bytes32
  sourceInstanceCommitment: Uint8Array; // Bytes32
  destinationContextCommitment: Uint8Array; // Bytes32
  destinationCaseCommitment: Uint8Array; // Bytes32
  purposeHash: Uint8Array; // Bytes32
  permittedUseHash: Uint8Array; // Bytes32
  expiresAt: bigint; // Uint64 seconds
  nonce: Uint8Array; // Bytes32, nonzero
  recipientKeyFingerprint: Uint8Array; // Bytes32
  manifestRoot: Uint8Array; // Bytes32
};
```

`runtimeEvidenceBridgeBinding` hashes the typed structure `{domain: pad32("permio:evidence-bridge:v2"), opening}` with Compact `persistentHash`. The source context, source instance and purpose must match the signed runtime intent, and the signed command window cannot extend beyond `expiresAt`. Purpose uses the existing runtime-purpose identifier hash. The permitted-use digest is `SHA256(encodeCanonical("permio:evidence-permitted-use:v2", [permittedUse]))`.

The existing selected manifest version 1 and ordered SHA-256 manifest root are preserved. The contract binds the supplied manifest root; it does not enumerate records or prove ciphertext contents. The service and recipient must independently recompute the root from the complete ordered manifest. There is no bridge-specific record-count cap, positive-size rule, ciphertext change or per-record proof.

## Signed identifier mapping and exact-resource prerequisite

The M5 intent carries lowercase `0x` hexadecimal strings for resource, recipient and nonce. They are hashed again by `createRuntimeActionIntent`; raw digest equality would be incorrect:

```ts
resourceHash = hashRuntimeIdentifier("resource", lowercase0xHex(binding));
recipientHash = hashRuntimeIdentifier("recipient", lowercase0xHex(recipientKeyFingerprint));
nonceHash = hashRuntimeIdentifier("intent-nonce", lowercase0xHex(nonce));
```

The circuit constructs the exact canonical 127-, 128- and 131-byte preimages using lowercase ASCII hex, rather than an opaque string witness. Tests first characterize `persistentHash(CompactTypeBytes(N), preimage)` against the installed runtime and existing `hashRuntimeIdentifier`, then compare the generated circuit helpers to those goldens.

**Both the capability and the session scope roots must explicitly contain the freshly prepared binding-string resource.** Source-item scopes do not authorize a new ciphertext binding. Reserve the session ID, prepare/encrypt the bundle and derive its binding first, then obtain exact capability and session authority for that resource before signing the intent/command. The fixture issues synthetic exact-scope credentials after preparation; it does not relax resource membership or infer a wildcard. A product that cannot obtain that exact authority must stop before submission rather than substitute a source-item resource.

## Browser helpers and typed receipt output

Import the dedicated subpath, which only imports compiler-generated pure helpers. It uses `Uint8Array` and `bigint`, with no `Buffer`, `node:crypto`, or package-root import. Browser bundlers must use the pinned runtime's browser export condition and WebAssembly support.

```ts
import {
  runtimeEvidenceBridgeBinding,
  runtimeEvidenceBridgeResourceHash,
  runtimeEvidenceBridgeRecipientHash,
  runtimeEvidenceBridgeNonceHash,
  runtimeEvidenceBridgeSelectedOutput,
  runtimeEvidenceBridgeOutputCommitment,
  type RuntimeEvidenceBridgeOpening,
} from "@permio/midnight-authorization/evidence-bridge";

const binding = runtimeEvidenceBridgeBinding(opening);
const intentResource = runtimeEvidenceBridgeResourceHash(binding);
const intentRecipient = runtimeEvidenceBridgeRecipientHash(opening.recipientKeyFingerprint);
const intentNonce = runtimeEvidenceBridgeNonceHash(opening.nonce);
// outputTypeHash comes from the activated template's single aggregate output claim.
const selected = runtimeEvidenceBridgeSelectedOutput(opening, outputTypeHash);
const expectedReceiptOutput = runtimeEvidenceBridgeOutputCommitment(opening, outputTypeHash);
```

The deterministic selected output has value version 1, the activated output type, source context, derived resource hash, typed bridge binding as payload, and the opening nonce. Its output is `runtimeSelectedActionValueStep(zero32, 0n, selected, true)`. The policy must declare exactly one aggregate bridge output regardless of manifest record count. The final `receipt.outputCommitment` remains this existing typed selected-output accumulator; it is not replaced by the raw binding.

The new entry takes the complete existing ordinary execution argument list followed by `(opening, outputTypeHash)`. The existing common execution core authenticates the one prepared type through the activated policy tree and signed accumulator. A wrong type, opening, output payload or nonce cannot match the one-step bridge output.

## Indexed receipt provenance

`createIndexedEvidenceBridgeDecisionReceiptReader(input)` accepts the same connection/provider/contract/receipt input shape as `createIndexedDecisionReceiptReader`. Its fixed internal profile requires `executeRuntimeEvidenceBridge` in both indexer metadata and the decoded transaction, and requires a nontransitioning bridge module `1.0.0` receipt. The ordinary factory continues to require `executeRuntimeAction`; callers cannot supply arbitrary entries. Both retain finality, exact serialized transaction/call state and exact receipt-creation transcript checks. The recipient must also pin the expected template, implementation, action schema and output type when consuming the receipt.

Regeneration retained the compiler public ledger receipt path `[1, 13]`. Generated simulation verifies the exact absence/insertion transcript for both entries with `assertV9DecisionReceiptInsertion`; the receipt schema is unchanged.

## Reproduction and evidence limits

Install only existing locked dependencies with `npm ci --ignore-scripts`. Compile source with the pinned local compiler (replace `REPO` with an absolute WSL repository path):

```sh
/root/.compact/versions/0.31.1/x86_64-unknown-linux-musl/compactc --skip-zk \
  REPO/packages/midnight-authorization/contracts/permio-authorization.compact \
  REPO/packages/midnight-authorization/contracts/managed/permio-authorization
```

The compiler reports compiler `0.31.1`, language `0.23.0`, runtime `0.16.0`. `--skip-zk` generates the real circuit programs and managed execution/ledger code. It does not generate proving/verifier keys. Existing managed JavaScript/type/compiler bindings are tracked; key and ZKIR outputs remain ignored. No key manifest was created, and no key, deployment, transaction, template activation, ECS task, actual proof or chain acceptance is claimed.

Targeted red evidence: the identifier tests initially passed 3 installed-runtime characterization checks and failed 3 missing generated helper checks. The first bridge suite failed all 6 tests with `UNSUPPORTED_PROOF_REQUIREMENT`; the dedicated reader test failed because its fixed bridge factory was absent. The first source compile parsed the new bridge but rejected a public network ledger read inside a private module conditional; hoisting that public read outside the conditional corrected disclosure analysis, and the second compile succeeded. A subsequent negative-fixture issue was corrected by keeping selected evidence nonce nonzero while testing an invalid zero opening nonce.

Root `npm run typecheck` in the clean peer initially reported missing Solidity-generated contract types in `scripts/integration/replay-recorded-m6.ts`, `test/ExecutionRegistry.ts` and `test/M6V1ReceiptVerifier.ts`, with no authorization-package diagnostics. Automatic approval review rejected `npm run compile:solidity` as outside this worker's authorization-package scope; that command did not run. Parent integration owns authoritative root verification in the prepared primary worktree.

The tests here use compiler-generated real circuit/ledger execution with crypto-valid synthetic genesis. Real key generation, actual zero-knowledge proof creation, deployment/activation, finalized chain execution, and complete receipt-gateway acceptance remain separate gates. The browser client and encrypted-vault integration are owned by the parent task.

Final worker checks: bridge simulation **7/7**, identifier/reader tests **10/10**, prior ordinary-action regression checks **13/13** and module semantic rejection **1/1** passed. Package-only source/test typecheck passed using a temporary scoped config. The browser subpath binding/output smoke check passed with `globalThis.Buffer` unset. See `verification.json`, `bridge-simulation.log` and `identifiers-and-reader.log` for commands, recorded results and limits. The bridge log preserves the successful single-file process output captured in the tool transcript; the identifier/reader log was redirected directly from its successful process.
