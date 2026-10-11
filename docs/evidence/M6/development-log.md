# M6 Development Log — Architecture Admission Boundary

Date: 2026-10-11<br>
Branch: `feat/m5-context-accounts`<br>
Status: pre-implementation architecture and environment inventory; M6 code not started

This log records concrete work performed while fixing the M4-to-Midnight
admission boundary. It is not M6 acceptance evidence and does not claim that a
Compact contract, proof, deployment, or live transaction has succeeded.

## Problem found in the prior M6 draft

The draft architecture named `threshold-approval-v1` as an initial Midnight
proof module and said reviewer approvals would be verified inside an activation
proof. That was incompatible with the selected boundary:

- M4 reviewer attestations are currently Ed25519 and are verified in
  `packages/scenario-governance/src/attestation.ts`;
- M4's immutable `ActivationRecord` stores the exact template target and the
  accepted reviewer IDs but is not itself a Midnight-signed envelope; and
- the pinned Compact 0.31.1 / ledger-8 environment does not provide the new
  Compact 0.35 ledger-9 Ed25519 verification path.

Leaving `threshold-approval-v1` in M6 would either require every M4 reviewer to
maintain a second Midnight-specific key or silently imply a Compact/ledger
upgrade. Neither choice was approved.

## Decision implemented in documentation

M4 remains the authority for:

- Ed25519 reviewer-signature verification;
- exact namespace, template ID, semantic version, and content-hash binding;
- eligible unique reviewers and duplicate rejection;
- namespace threshold enforcement and rejection state; and
- author/reviewer/governance separation of duties.

M6 v1 introduces `admit-m4-activation-v1`, a registry circuit rather than a
template-selectable proof module. The namespace-scoped
`governance-activator` signs the canonical admission envelope using the
allowlisted `midnight-jubjub-schnorr-v1` profile. The envelope binds the exact
template target, governance and proof-module-binding hashes, M4 activation
record hash, approval-evidence commitment, authority-root version and
sequence, target deployment, registry protocol version, and admission nonce.

Midnight verifies current key eligibility, the exact signature and target, and
nonce freshness before creating the immutable public template record. It does
not independently re-run the M4 reviewer threshold and documentation must not
claim that it does.

The admission key is not an administrator. It grants no authoring, review,
allocation, capability issuance, proof-module activation, retirement,
emergency revocation, or historical rewrite power.

## Reference implementation boundary

The sibling `../information-flow` checkout was inspected only for reusable
Midnight integration mechanics. Concrete reference points found there include:

- `src/midnight-wallet.ts`, which waits for `waitForSyncedState()` and exposes
  a stoppable wallet capability;
- scripts for redacted wallet diagnostics and a redacted live Preprod
  commitment test;
- deployment and reconnect by public contract address;
- compiler-managed output kept outside hand-written source; and
- a local proof-server configuration at `http://127.0.0.1:6300` using
  `proof-server:8.1.0`.

Permio will not import or copy the Information Flow application model,
contract state, named workflow, database, authority layout, deployed address,
wallet secret, synchronized checkpoint, or acceptance claim. Any reused
mechanic must be re-expressed against Permio's M2-M5 interfaces and tested as
Permio behavior.

## Reusable accounts and proof infrastructure

The workspace contains three existing actor-specific checkpoint directories:

```text
../information-flow/data/preprod-wallet-state/alice
../information-flow/data/preprod-wallet-state/bob
../information-flow/data/preprod-wallet-state/clara
```

They are disposable Preprod HD-account fixtures whose full historical sync has
already been retained. The directories are ignored and privacy-sensitive even
though the mnemonic is stored separately. Permio must not read, print, copy,
or commit their secret material. An opt-in Preprod adapter may reuse the
wallet capabilities and map them to generated Permio roles so synchronization
does not have to restart from genesis.

The mandatory M6 acceptance environment remains the pinned sibling
`../midnight-local-dev` ledger-8 stack:

| Component | Endpoint | Pinned version |
| --- | --- | --- |
| Midnight node | `http://127.0.0.1:9944` | `midnight-node:1.0.0` |
| Indexer | `http://127.0.0.1:8088/api/v4/graphql` | `indexer-standalone:4.3.3` |
| Proof server | `http://127.0.0.1:6300` | `proof-server:8.1.0` |

The documentation-only inspection confirmed the configured endpoint and the
three checkpoint directory names without reading secrets. A read-only request
to the local proof-server endpoint was blocked by the current process's socket
permissions, so this turn does not claim that the service is currently healthy
or unhealthy. M6 implementation must run the documented health check before
the first live proof test and record the observed version response.

## Documentation files changed

- `README.md` now summarizes the admission-envelope boundary and reusable
  environment without implying M6 is implemented.
- `docs/PERMIO_FROM_NEED_TO_DESIGN.md` explains the trust boundary in
  human-facing language.
- `docs/PROGRAMMABLE_CONTEXT_ARCHITECTURE.md` defines the canonical envelope,
  authority limits, and on-chain guarantee.
- `docs/DETERMINISTIC_MILESTONES.md` replaces the rejected threshold module
  with concrete M6 artifacts, negative cases, and environment requirements.
- `docs/evidence/M6/architecture-decision.md` records the approved decision.

Generated HTML is rebuilt from the canonical Markdown; it is not edited by
hand.

## Verification

The documentation and repository checks were run after the canonical Markdown
changed:

1. `npm run docs:build` regenerated all three bilingual HTML editions.
2. `npm run docs:check` confirmed that every generated HTML file matches its
   canonical Markdown source.
3. `git diff --check` reported no whitespace errors. Git emitted only the
   existing Windows LF-to-CRLF working-copy notices for generated HTML.
4. The first sandboxed `npm run check` passed documentation freshness and
   TypeScript, then Hardhat reported HHE22 because it could not recognize its
   local installation through the sandbox path.
5. The initial sandboxed `npm ci` attempt failed with Windows `EPERM` while
   creating `node_modules/ethers/node_modules`. Re-running the exact
   lockfile-based install outside that filesystem boundary succeeded: 164
   packages installed, 170 audited, zero vulnerabilities.
6. The complete `npm run check` then passed outside the sandbox:
   - generated documentation current;
   - TypeScript type-check passed;
   - Hardhat Solidity build passed with no contract changes to compile;
   - 6 protocol tests passed;
   - 15 scenario-domain tests passed;
   - 14 scenario-generator tests passed;
   - 16 scenario-governance tests passed;
   - 13 context-account tests passed; and
   - 6 deployed-contract Hardhat tests passed.

No Compact compilation, local Midnight proof, deployment, or Preprod wallet
operation was run because this batch changed documentation only and M6 remains
unimplemented. Those chain-facing checks remain mandatory M6 exit criteria;
they were not replaced by the passing off-chain and Solidity suites.
