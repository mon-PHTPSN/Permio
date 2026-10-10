# `@permio/scenario-governance`

Application-neutral governance for versioned Permio scenario templates.

The package consumes templates validated by `@permio/scenario-domain` and
binds every governance action to an exact namespace, template ID, semantic
version, and content hash. It deliberately does not contain scenario catalog
entries, instance data, UI policy, context accounts, or execution logic.

## Authority boundaries

Each namespace policy declares five disjoint authority sets:

- authors may create and advance their own immutable draft;
- reviewers may issue Ed25519 attestations for one exact template target;
- governance authorities may activate and retire versions after threshold
  review;
- allocators may request instantiation only while that exact version is active;
- emergency revokers may prospectively stop a version.

There is no universal administrator. Human and automated Agents use the same
authoring path, and neither receives review or activation authority merely by
creating a draft.

## Lifecycle

```text
draft -> validated -> in_review -> active -> retired
                                    |          |
                                    +-> revoked<+
```

Validation reports always carry `grantsTrust: false`. They report structure and
risk for human or organizational review; they do not approve or activate a
template. Activation requires unique eligible reviewer signatures meeting the
namespace threshold, followed by a separate governance action.

Activation records and earlier instantiation authorizations are append-only.
Retirement and prospective revocation prevent new instances but do not rewrite
historical records.

## Cryptographic binding

Reviewer attestations use Ed25519 over a domain-separated, length-delimited
canonical payload containing:

- namespace;
- template ID;
- semantic version;
- exact scenario-template SHA-256 hash;
- reviewer identity, decision, and review time.

Changing any bound field invalidates the signature. Namespace policies store
only reviewer public keys; private keys remain outside this package.

## Development evidence

The concrete implementation decisions, negative cases, M3 rebase conflicts,
commands, test counts, and remaining boundaries are recorded in the
[`M4 development log`](../../docs/evidence/M4/development-log.md). The
machine-readable exit gates and normalized artifact hashes are in
[`acceptance.json`](../../docs/evidence/M4/acceptance.json).
