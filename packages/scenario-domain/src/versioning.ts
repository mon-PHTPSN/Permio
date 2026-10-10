import type {
  SemanticVersion,
  ScenarioTemplate,
  TemplateRevision,
  TemplateRevisionKind,
} from "./model.ts";
import { parseScenarioTemplate } from "./validation.ts";

export const TEMPLATE_REVISION_ERROR_CODES = [
  "INVALID_SEMANTIC_VERSION",
  "TEMPLATE_ID_CHANGED",
  "VERSION_NOT_INCREASED",
  "PATCH_SEMANTICS_CHANGED",
  "MINOR_BREAKING_CHANGE",
] as const;

export type TemplateRevisionErrorCode =
  (typeof TEMPLATE_REVISION_ERROR_CODES)[number];

export class TemplateRevisionError extends Error {
  readonly code: TemplateRevisionErrorCode;

  constructor(code: TemplateRevisionErrorCode, message: string) {
    super(`${code}: ${message}`);
    this.name = "TemplateRevisionError";
    this.code = code;
  }
}

const STRICT_SEMANTIC_VERSION =
  /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/;

export function parseSemanticVersion(value: string): SemanticVersion {
  const match = STRICT_SEMANTIC_VERSION.exec(value);
  if (match === null) {
    throw new TemplateRevisionError(
      "INVALID_SEMANTIC_VERSION",
      `expected strict MAJOR.MINOR.PATCH, received '${value}'`,
    );
  }
  const parsed = {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
  if (Object.values(parsed).some((part) => !Number.isSafeInteger(part))) {
    throw new TemplateRevisionError(
      "INVALID_SEMANTIC_VERSION",
      `version components must be safe integers, received '${value}'`,
    );
  }
  return parsed;
}

export function compareSemanticVersions(left: string, right: string): number {
  const a = parseSemanticVersion(left);
  const b = parseSemanticVersion(right);
  return a.major - b.major || a.minor - b.minor || a.patch - b.patch;
}

function revisionKind(previous: SemanticVersion, next: SemanticVersion): TemplateRevisionKind {
  if (next.major !== previous.major) return "major";
  if (next.minor !== previous.minor) return "minor";
  return "patch";
}

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const object = value as Record<string, unknown>;
    return `{${Object.keys(object)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stable(object[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function withoutDescription<T extends { readonly description: string }>(
  value: T,
): Omit<T, "description"> {
  const { description: _description, ...semantic } = value;
  return semantic;
}

function semanticProjection(template: ScenarioTemplate): unknown {
  return {
    schemaVersion: template.schemaVersion,
    namespace: template.namespace,
    templateId: template.templateId,
    participantSlots: template.participantSlots.map(withoutDescription),
    contexts: template.contexts.map(withoutDescription),
    states: template.states,
    initialState: template.initialState,
    actions: template.actions.map(withoutDescription),
    transitions: template.transitions,
    capabilityRules: template.capabilityRules.map(withoutDescription),
    proofProfiles: template.proofProfiles,
    executionAdapters: template.executionAdapters,
    privacyInvariants: template.privacyInvariants.map(({ id }) => ({ id })),
  };
}

function assertExistingItemsUnchanged<T extends { readonly id: string }>(
  previous: readonly T[],
  next: readonly T[],
  label: string,
  projection: (value: T) => unknown = (value) => value,
): void {
  const nextById = new Map(next.map((value) => [value.id, value]));
  for (const previousValue of previous) {
    const nextValue = nextById.get(previousValue.id);
    if (nextValue === undefined) {
      throw new TemplateRevisionError(
        "MINOR_BREAKING_CHANGE",
        `${label} '${previousValue.id}' was removed`,
      );
    }
    if (stable(projection(previousValue)) !== stable(projection(nextValue))) {
      throw new TemplateRevisionError(
        "MINOR_BREAKING_CHANGE",
        `${label} '${previousValue.id}' changed semantically`,
      );
    }
  }
}

function assertMinorCompatible(
  previous: ScenarioTemplate,
  next: ScenarioTemplate,
): void {
  if (
    previous.schemaVersion !== next.schemaVersion ||
    previous.initialState !== next.initialState
  ) {
    throw new TemplateRevisionError(
      "MINOR_BREAKING_CHANGE",
      "schemaVersion and initialState must remain unchanged in a minor revision",
    );
  }
  for (const state of previous.states) {
    if (!next.states.includes(state)) {
      throw new TemplateRevisionError(
        "MINOR_BREAKING_CHANGE",
        `state '${state}' was removed`,
      );
    }
  }
  assertExistingItemsUnchanged(
    previous.participantSlots,
    next.participantSlots,
    "participant slot",
    withoutDescription,
  );
  assertExistingItemsUnchanged(previous.contexts, next.contexts, "context", withoutDescription);
  assertExistingItemsUnchanged(previous.actions, next.actions, "action", withoutDescription);
  assertExistingItemsUnchanged(previous.transitions, next.transitions, "transition");
  assertExistingItemsUnchanged(
    previous.capabilityRules,
    next.capabilityRules,
    "capability rule",
    withoutDescription,
  );
  assertExistingItemsUnchanged(previous.proofProfiles, next.proofProfiles, "proof profile");
  assertExistingItemsUnchanged(
    previous.executionAdapters,
    next.executionAdapters,
    "execution adapter",
  );
  assertExistingItemsUnchanged(
    previous.privacyInvariants,
    next.privacyInvariants,
    "privacy invariant",
    ({ id }) => ({ id }),
  );
}

export function assertTemplateRevision(
  previousInput: unknown,
  nextInput: unknown,
): TemplateRevision {
  const previous = parseScenarioTemplate(previousInput);
  const next = parseScenarioTemplate(nextInput);
  if (
    previous.namespace !== next.namespace ||
    previous.templateId !== next.templateId
  ) {
    throw new TemplateRevisionError(
      "TEMPLATE_ID_CHANGED",
      "namespace and templateId identify a lineage and cannot change in-place",
    );
  }
  if (compareSemanticVersions(previous.version, next.version) >= 0) {
    throw new TemplateRevisionError(
      "VERSION_NOT_INCREASED",
      `'${next.version}' must be greater than '${previous.version}'`,
    );
  }

  const previousVersion = parseSemanticVersion(previous.version);
  const nextVersion = parseSemanticVersion(next.version);
  const kind = revisionKind(previousVersion, nextVersion);
  if (kind === "patch" && stable(semanticProjection(previous)) !== stable(semanticProjection(next))) {
    throw new TemplateRevisionError(
      "PATCH_SEMANTICS_CHANGED",
      "a patch revision may change prose but not template semantics",
    );
  }
  if (kind === "minor") assertMinorCompatible(previous, next);

  return {
    kind,
    previousVersion: previous.version,
    nextVersion: next.version,
  };
}
