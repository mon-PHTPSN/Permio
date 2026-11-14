# `@permio/scenario-packs`

Dependency-neutral M9 scenario packs for Permio.

The package defines three generated families: clinical referral and research
consent, professional qualification and temporary site access, and a delegated
purchasing Agent. Every family uses the same M2 template, M3 generator, M4
governance, and M5 capability/session interfaces.

Pack/template version `3.0.0` uses template schema 2 and the reusable
`private-state-transition-predicates-v1` proof family. Ordered declarations
cover every output claim: current signed referral, consent, selection,
qualification, shift and mandate records; a signed purchase request bounded by
its signed mandate ceiling; and a detached audit acknowledgment for emergency
access. The acknowledgment binds the original selected inputs and intent and
occupies the required output, avoiding a self-referential input commitment.
The public receipt schema remains `decision-receipt-v1`. Historical schema-1
template identities remain covered by compatibility tests.

`FileAuditAcknowledgmentStore` creates only its leaf directory; its parent must
already be durably provisioned. It verifies reopened bytes and syncs the file on
every acknowledgment, including retries. POSIX runs also sync the leaf and
parent directories; the directory-sync failure tests run under WSL on Windows.

## Evidence boundary

Predicate declarations configure required proofs; they do not establish that
the predicates have been proved or that the new proof family is activated.
Independent human security/privacy review and protocol-governance approval
remain required before native local activation and live acceptance.

M2-M5 fixtures are executable deterministic test material. M6 receipt, M7
transport, and M8 execution expectations are deliberately marked
`contract-fixture` with `liveEvidence: false`. They name required bindings but
do not define an alternative receipt codec or claim that any chain execution
occurred. They must be regenerated through the authoritative upstream
implementations after M6-M8 integration.

Generated private instances, account and session identifiers, context keys,
intent nonces, and signatures are private test artifacts. Public receipts,
ledger/indexer captures, gateway logs, EVM events, and generated documentation
must pass the scenario-pack privacy scanner before publication.
