# `@permio/scenario-packs`

Dependency-neutral M9 scenario packs for Permio.

The package defines three generated families: clinical referral and research
consent, professional qualification and temporary site access, and a delegated
purchasing Agent. Every family uses the same M2 template, M3 generator, M4
governance, and M5 capability/session interfaces.

## Evidence boundary

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
