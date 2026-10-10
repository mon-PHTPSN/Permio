# `@permio/context-accounts`

Application-neutral context accounts, attenuating capabilities, and scoped
session keys for Permio scenario instances.

The package consumes an exact active M4 template allocation. It does not infer
authority from registration, login state, a global role, or a reusable public
identity. An instance binds one validated M2 template version and hash to
runtime state; a context account is valid only inside that instance and one
template-defined context.

## Authorization model

An action requires all of the following to agree:

- namespace, template ID, semantic version, and exact template hash;
- scenario instance and current state;
- context and action;
- resource selector and concrete resource;
- purpose, recipient kind, and exact recipient;
- validity window;
- disclosure policy; and
- instance, account, capability, ancestor-capability, and session revocation
  state.

Changing one constrained dimension returns a specific denial reason. A
successful action consumes its session-scoped nonce and applies the template's
deterministic state transition.

## Capabilities and sessions

Root capabilities may be issued only by principals explicitly named for that
instance. Delegated capabilities must be strict subsets of their parent across
actions, resources, purposes, recipients, disclosure policies, time, and
delegation depth. Revoking an ancestor prevents descendants from authorizing
new actions.

A session uses a fresh Ed25519 key and a strict subset of one capability. The
client signs a domain-separated, length-delimited `ActionIntent`; the registry
stores only the public key. Account keys cannot be reused as session keys, and
the same account or session key cannot be reused across logical accounts.

The caller identity supplied to issuance and revocation methods is an
authenticated application boundary, not a login-derived authorization rule.
The package still checks the caller against the instance, account, capability,
or session record before changing authority.

## Deliberate boundaries

This M5 package is an off-chain domain component. It does not generate a
Midnight proof, publish a public receipt, persist state, activate templates, or
execute a Monad action. Those boundaries belong to later milestones. The root
repository check continues to deploy and exercise the existing Solidity
registry on Hardhat's local EVM so contract regressions are not hidden by the
new off-chain tests.

## Development evidence

The implemented authorization order, all 19 denial reasons, capability and
session attenuation rules, rebase history, exact commands and test counts, and
remaining M6 boundary are recorded in the
[`M5 development log`](../../docs/evidence/M5/development-log.md). The
machine-readable exit gates and normalized artifact hashes are in
[`acceptance.json`](../../docs/evidence/M5/acceptance.json).
