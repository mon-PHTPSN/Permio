# M9 Development Log — Dependency-Neutral Scenario Packs

Date: 2026-10-12  
Branch: `feat/m9-scenario-packs`  
Baseline: `c50959c1b71125f6dfda447423e0dbbe047a04cd`  
Status: preparation implemented; live M6-M8 acceptance blocked

## Implemented preparation

`@permio/scenario-packs` defines the three required generated families:

1. clinical referral and research consent, with separate treatment, research,
   and optional emergency contexts;
2. professional qualification and temporary site access; and
3. a delegated financial or purchasing Agent.

Every family has an exact M2 template, two explicit `test:` seeds, an M3 policy
profile, a five-authority M4 namespace policy, generated M5 context accounts,
an attenuated delegated grant, a fresh session, a signed positive intent, a
human disclosure preview, and fixture-only upstream expectations.

The M5 harness executes every stable denial outcome: unknown session, invalid
signature, template and instance mismatch, every revocation boundary, validity
failures, context/action/state/resource/purpose/recipient/disclosure mismatch,
and replay. Extra vectors distinguish resource selector from resource and
recipient kind from exact recipient.

Test-only Ed25519 keys are derived deterministically from a versioned,
length-delimited SHA-256 domain and encoded as RFC 8410 PKCS#8 seed keys. Key
material is not returned from the public fixture. Context identifiers, public
keys, intent signatures, and nonces are classified as additional private test
values for public-artifact scanning.

The shared M3 scanner now names indexer dumps, gateway logs, EVM events, and
generated documents directly and exposes the same raw and encoded matching
engine for additional classified private values.

## Upstream boundary

M6, M7, and M8 expectations use a versioned `contract-fixture` wrapper pinned
to the architecture baseline. Every wrapper declares `liveEvidence: false`,
uses `pending-m6`, `pending-m7`, and `pending-m8` markers, and records required
bindings without inventing an authoritative receipt, transport signature, or
execution transaction.

M9 remains incomplete until the fixtures are replaced by the authoritative M6
codec, M7 durable transport interface, and M8 deployed registry/adapter, and
each pack completes the required live local path.

## Verification

- `npm run typecheck` passed.
- `npm run test:scenario-packs` passed 17/17 tests.
- `npm run check` passed documentation freshness, TypeScript, Solidity 0.8.31
  compilation for the Osaka EVM target, all M0-M5 tests, and all M9 tests.
- `npm run test:contracts` passed 6/6 deployed Hardhat tests.

The full Hardhat commands required execution outside the restricted filesystem
sandbox so Hardhat could resolve its confirmed local installation. No network
deployment or live Midnight transaction was attempted or claimed.
