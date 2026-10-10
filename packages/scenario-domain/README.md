# `@permio/scenario-domain`

This package defines and validates versioned, programmable scenario templates.
It contains no application-specific scenario catalog and does not execute code
from a template.

## Protocol boundaries

- `schemaVersion` versions the template envelope and parser contract.
- `namespace/template-id` identifies one template lineage.
- `version` is strict semantic versioning: patches are prose-only, minor
  revisions are additive, and breaking semantic changes require a major bump.
- `hashScenarioTemplate` validates the complete template, normalizes strings to
  Unicode NFC, sorts object keys, preserves array order, and applies a
  length-delimited SHA-256 domain separator.

## Validation error taxonomy

| Code | Meaning |
| --- | --- |
| `INVALID_TYPE` | A value is not JSON data of the required type. |
| `MISSING_FIELD` | A required schema field is absent. |
| `UNKNOWN_FIELD` | The object contains data outside the exact schema. |
| `INVALID_VALUE` | A value violates a format or range rule. |
| `EMPTY_COLLECTION` | A required collection has no entries. |
| `DUPLICATE_ID` | An identifier or unique string is repeated. |
| `UNKNOWN_REFERENCE` | A reference does not resolve. |
| `INCONSISTENT_REFERENCE` | Resolved definitions contradict one another. |
| `UNREACHABLE_STATE` | The initial state cannot reach a declared state. |
| `AMBIGUOUS_TRANSITION` | One state and action select multiple transitions. |

`TemplateRevisionError` separately reports invalid version syntax, changed
lineage, non-increasing versions, patch-level semantic changes, and breaking
minor revisions.
