# `@permio/scenario-generator`

This package turns a validated, versioned scenario template into disposable,
synthetic test material. It is application-neutral: template context, action,
record, and claim identifiers remain data rather than TypeScript unions or
source-code branches.

## Complete deterministic input

Generation requires all five fields below. The supplied template is validated
by `@permio/scenario-domain`, and its computed hash must equal `templateHash`.

```text
template + templateHash + generatorVersion + explicitSeed + policyProfile
  -> private synthetic instance + public schema summary + classification manifest
```

`explicitSeed` must start with `test:`. This guard makes the API unsuitable for
silently deriving production identities from a test seed. A policy profile
supplies a fixed UTC base timestamp, event interval, and synthetic value size;
the generator never reads the clock, operating-system entropy, locale, machine
state, or environment variables.

## Derivation algorithm (`1.0.0`)

1. Validate and canonicalize the complete input, including the template bytes
   and the supplied template-hash envelope.
2. Compute a master SHA-256 digest over length-prefixed fields under
   `permio:scenario-generator:master:v1`.
3. Derive each value with SHA-256 counter mode. Every value class has a distinct
   domain ending in `:v1`; coordinates use stable template identifiers rather
   than incidental array indexes, and each digest block has an explicit
   counter.
4. Derive a different principal for each `(contextId, slotId)` pair. A slot
   reused by two contexts never creates a global linkable principal.
5. Derive event timestamps as
   `baseTimestamp + (transitionIndex + 1) * eventIntervalSeconds`. No clock is
   consulted.
6. Prefix generated identifiers and values with `syn_` so downstream fixtures
   can enforce that the material is synthetic.

The exported `SCENARIO_GENERATOR_DOMAINS` object is the authoritative domain
registry. It separately names master derivation, policy-profile hashing,
instance IDs, principal IDs, record IDs and values, credential IDs and claims,
event IDs, and golden-output hashing. Domains and length prefixes prevent a
value derived for one purpose from being reused as another kind of value.

This algorithm is for reproducible tests, not production key generation. A
generator-version change is required for any incompatible algorithm change.

## Privacy boundary

`privateInstance` contains context-scoped principal identifiers, record values,
credential claims, event identifiers, and timestamps. `publicSummary` is
constructed separately from an allowlist and contains only versions, hashes,
and template-level schemas. The manifest is exhaustive for the generated
shape, defaults to private, and is re-derived and verified before every scan;
removing or weakening a private entry therefore fails closed.

`scanPublicArtifacts` checks purported receipts, ledger dumps, logs, and
generated HTML for raw, JSON-escaped, HTML-escaped, numeric-entity,
URL-encoded, hexadecimal, Base64, and Base64URL appearances of every classified
private string. `assertPublicArtifactsSafe` throws `ArtifactPrivacyError` with
the artifact, manifest path, encoding, and character offset for each finding.

Golden-vector format version 1 embeds the complete deterministic input,
canonical output bytes as lowercase hexadecimal, and a domain-separated
SHA-256 digest. The committed vector is generated with
`npm run generate:golden --workspace @permio/scenario-generator`; tests
recompute it byte-for-byte. Golden vectors deliberately contain private output
and are labelled `private-test-artifact`. They are reproducibility fixtures,
never public receipts or documentation artifacts.
