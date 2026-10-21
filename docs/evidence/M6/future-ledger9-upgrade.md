# Future Compact/Ledger-9 Upgrade Candidate

Date recorded: 2026-10-12<br>
Status: future investigation; not part of the current M6 implementation<br>
Current baseline: Compact compiler 0.31.1, ledger 8, Midnight node 1.0.0

## Why this candidate exists

The current ledger-8/Compact-0.31.1 stack has produced three concrete design or
delivery constraints during M6:

1. It has no native Compact Ed25519 verification path for the existing M4/M5
   signatures. M6 therefore preserves those portable identities but needs a
   separately profiled Jubjub/Schnorr runtime credential for Midnight.
2. It does not provide the ledger-9 cross-contract composition needed for a
   runtime contract to read an authoritative governance registry directly.
   Splitting the M6 contract on ledger 8 would therefore require a new signed
   synchronization bridge and its own stale-state and atomicity protocol.
3. The current single contract reached the Local Dev deployment-weight limit
   after root and template lifecycle circuits were added. The node rejected the
   36,225-byte deployment transaction before contract creation. Consolidating
   three pairs of equivalent entry points reduced the contract from fourteen to
   eleven circuits and restored successful Local Dev deployment without raising
   limits. Remaining runtime circuits may still exhaust the available
   deployment headroom, so this constraint remains relevant to future design.
4. A fixed private witness preserving M5's full delegation depth compiled to
   ZKIR, but proving-key generation for the ancestry-only probe stopped making
   progress before producing keys. The probe already repeated seventeen
   credential/status checks and issuance signatures and still omitted the
   session, action-intent, scope, state, nullifier, and receipt requirements.
   Ledger 9's newer ZKIR path may change that result, but no release note claims
   that it removes this linear proof workload.

These observations justify evaluating ledger 9; they do not prove that an
upgrade automatically fixes contract size or is safe for production.

## Platform facts to re-verify at decision time

The official Compact 0.35 release notes describe ledger-9 cross-contract calls,
`kernel.caller()`, Curve25519 support, SHA-512, and native Ed25519 verification.
They also state that ledger 9 was not yet deployed on Midnight Mainnet at that
release and direct current Mainnet-targeted contracts to remain on Compact
0.31.x:

<https://github.com/midnightntwrk/compact/releases/tag/compactc-v0.35.0>

Those statements are time-sensitive. Before an upgrade, verify the then-current
official compatibility matrix and release notes rather than assuming 0.35.0 is
still the correct target.

## Required decision scope

The upgrade must be proposed as a new protocol and deployment version. It must
not mutate or reinterpret existing M4 attestations, M5 `ActionIntent`
signatures, M6 template records, module records, nullifiers, state sequences,
or receipts.

The proposal must decide explicitly:

- whether native Ed25519 is used only to verify existing M4/M5 credentials or
  also replaces the v1 Midnight runtime-key profile in a new protocol version;
- whether governance and runtime remain in one contract or use native
  cross-contract calls, including the exact contract addresses and interface
  hashes that are trusted;
- how atomic state/nullifier ordering is preserved across any contract calls;
- how existing ledger-8 templates and instances remain usable, retire, or
  migrate without rewriting history; and
- whether deployment weight actually improves under the chosen compiler and
  node limits.

## Compatibility and security gates

Record and pin one verified set of versions for the Compact compiler and
language, ledger/runtime, node, indexer, proof server, wallet SDK, Midnight.js,
and generated-contract runtime. Review every breaking change from 0.31.1 to the
selected release, including serialization, signature verification, public-state
encoding, cross-contract resolution, and caller semantics.

The implementation may proceed only after all of these checks pass:

1. compile the unchanged ledger-8 protocol fixtures and document every
   incompatible encoding or semantic change;
2. compile a minimal ledger-9 canary for Ed25519 and reject altered messages,
   keys, signatures, and identity-point edge cases;
3. compile a two-contract canary and prove that an exact governance record is
   read from the pinned registry contract rather than supplied by an untrusted
   caller;
4. measure deployment transaction size and weight for the proposed M6 contract
   layout instead of assuming the newer ledger raises usable limits;
5. compile the unchanged depth-16 ancestry probe with the ledger-9 ZKIR path,
   record key-generation time and artifacts, deploy it on the pinned local
   stack, and complete at least one real proof before treating the fixed-witness
   design as viable;
6. run the complete M2-M6 negative suites, including stale roots, duplicate
   approvals, privilege collapse, replay, retired/revoked templates, altered
   hashes, used nullifiers, and conflicting state sequences;
7. run real ledger-9 Local Dev deployment, proof, transaction, finality,
   indexed-state, reconnect, and restart tests; and
8. perform an explicit privacy and public-state scan before any public-network
   smoke test.

## Non-goals of the current work

This record does not authorize a toolchain upgrade, a multi-contract split, a
new synchronization authority, or removal of the v1 Jubjub/Schnorr runtime-key
design. M6 continues against the pinned ledger-8 stack until the user approves a
separate upgrade architecture after the platform is verified ready.
