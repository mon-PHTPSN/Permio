# `@permio/midnight-authorization`

This application-neutral package defines the first M6 boundary between an
immutable M4 activation and the Midnight authorization registry. It validates
that an M4 activation still names the exact active M2 template content,
canonicalizes the admission envelope, commits the exact M4 activation and
review evidence, and binds every template action to one exact proof-module
implementation and receipt schema.

The package does not grant trust or replace M4 review. Template admission is a
staged on-chain protocol:

1. `beginM4Activation` verifies the exact governance envelope and reserves its
   nonce without activating the template.
2. `stageM4ActivationBinding` accepts one complete action binding at the next
   canonical index, verifies its depth-20 manifest path, and requires the exact
   proof-module ID, version, implementation hash, and receipt schema to match
   an active public module record.
3. `finalizeM4Activation` rechecks the current admission authority and writes
   the immutable active-template record only after every index was staged.

Actions are not divided internally. A variable-length action list is processed
one whole binding per transaction, in M2 action order. The session stores only
a next index and rolling accumulator, so temporary on-chain state is constant
size regardless of the number of actions.

Every session has a governance-signed Unix-time deadline enforced with
Compact's protocol block-time comparisons. An expired or stale session is
removed automatically when a begin, staging, or finalization call touches it.
Cleanup releases the reserved nonce but cannot delete active templates, used
nonces, or activation history. There is no privileged maintenance actor and no
separate cleanup transaction circuit.

Proof modules have their own public governance lifecycle. A proposal records
the exact module ID, semantic version, implementation hash, implementation
reference, source hash, input/configuration/receipt schema hashes, compiler
hash, compatibility-policy hash, and the current namespace authority-root
reference. Proposing is non-trusting: it creates status `proposed` only.

`reviewProofModule` requires unique eligible `protocol-reviewer` authorities
until the configured review threshold is met. `governProofModule` dispatches
the signed requested lifecycle transition. Its approval branch requires a
separately configured threshold of unique eligible `module-approver`
authorities. Review and approval use separate evidence accumulators, so one
cannot be presented as the other. Reaching either threshold does not activate
the module. Only the dispatcher branch requiring an eligible
`module-activator` can move an approved module to `active`.

The implemented public lifecycle is:

```text
proposed -> reviewed -> approved -> active -> deprecated -> revoked
```

An eligible module approver may apply the already-pinned compatibility policy
by deprecating an active module. Only a `module-emergency-revoker` may revoke
an active or deprecated module. Both transitions are prospective: they block
new template admission or proof use without deleting the module record,
historical template activations, or receipts. Agents may build and test module
code, but the package does not treat an agent as a production human reviewer,
approver, or activator.

Namespace authority roots are themselves threshold-governed. The current root
record stores an `authorityRootUpdateThreshold` of at least two. A signed update
binds the exact old and new policy, root, version, sequence, all three next
thresholds, effective time, and nonce. One `authority-root-governor` cannot
rotate the root, duplicate approval by the same eligible leaf is rejected, and
the governance activator has no root-rotation privilege.

Template lifecycle is separate from module lifecycle and root governance.
`terminateTemplate` selects the required authority from the requested target
state: a dedicated `template-retirer` may change only `active -> retired`, while
an emergency revoker may change `active|retired -> revoked`. Both are
prospective and preserve the exact
activation sequence, activation time, content hash, and admission evidence;
they append a reason, effective time, and template-lifecycle sequence instead
of rewriting history.

The pre-consolidation fourteen-circuit single-contract build was not
live-accepted. On the pinned Local Dev stack, the node rejected its 36,225-byte
deployment transaction with RPC 1010 because it would exhaust the block limits.
Consolidating equivalent entry points reduced the final build to eleven
circuits, which deployed and completed the live governance/lifecycle flow on
the same unmodified stack. No local limit was raised and no verification was
removed.

The first size-preserving refactor replaces separate first/subsequent root
approval entry points with `submitAuthorityRootApproval`. Each governor still
submits an independent signature and transaction; the circuit determines from
public progress whether it is recording approval one or a later unique
approval. This changes neither the threshold nor the authority model.

That consolidation reduced the generated deployment transaction from 36,225
to 33,809 bytes, but Local Dev still rejected it with the same RPC 1010 block
limit error. The node's normal-class byte limit is 786,432 bytes, confirming
that execution weight—not raw transaction length—was the limiting dimension.

The next approved size reduction combines module approval, activation,
deprecation, and revocation into `governProofModule`, and removes the standalone
cleanup circuit in favor of automatic bounded cleanup in the existing staging
entries. Each signed module branch retains its original authority kind, legal
source statuses, duplicate protection, threshold, and nonce checks. Template
retirement and revocation remain consolidated in `terminateTemplate`. The
approver/retirer paths cannot exercise their corresponding activation or
emergency-revocation paths.

The next implemented slice adds canonical M5-to-Midnight account, capability,
session, and action-intent bindings, separately profiled Jubjub/Schnorr
signatures, seven private scope-membership roots, and one verified depth-20
credential-status transition circuit. Issuance proves the assigned leaf is
empty; revocation proves the exact active leaf; both derive the replacement
root and advance a namespace sequence. The leaf permanently binds its proper
prospective revocation authority, so a caller cannot substitute another active
account key.

This refactor reduced the source from twelve to nine transaction circuits.
Compact 0.31.1 compiled it, all 18 package tests passed, and the unchanged
ledger-8 Local Dev stack deployed contract
`131ed4886a6419a949728289de8c67e176fddfb15f7bf2d058c12812de2627d7`.
The live run activated and revoked a runtime account status, rejected an
unauthorized revocation, and completed the full governance, admission,
lifecycle, indexed-state, replay, and reconnect regression. Credential-status
deployment is therefore live-accepted; the two runtime authorization proof
families and common receipt remain incomplete.

The subsequently approved fixed-size private witness for the complete M5
depth-16 capability ancestry passed Compact source, type, bounded-loop, and
privacy analysis but did not complete proving-key generation on the pinned
0.31.1 toolchain. A combined ten-circuit feasibility build entered a stable
26-thread synchronization wait after 13 minutes 45 seconds of CPU time; after
24 minutes 57 seconds of wall time both probe key files were still empty. The
probe was removed and the nine-circuit baseline was recompiled successfully.
No smaller-depth, terminal-only, accumulator, multi-contract, or raised-limit
fallback has been adopted; selecting one would change an approved architecture
or M5 guarantee.

All hashes emitted here are lowercase `0x`-prefixed SHA-256 digests over the
versioned, length-delimited canonical encoding from `@permio/protocol`. The M2
template content hash remains the exact SHA-256 value produced by
`@permio/scenario-domain`; it is checked, not recomputed under a new scheme.
