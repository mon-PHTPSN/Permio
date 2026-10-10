import {
  SCENARIO_TEMPLATE_SCHEMA_VERSION,
  type ActionDefinition,
  type CapabilityRule,
  type ContextDefinition,
  type ExecutionAdapter,
  type ParticipantSlot,
  type PrivacyInvariant,
  type ProofProfile,
  type ScenarioTemplate,
  type StateTransition,
} from "./model.ts";

export const SCENARIO_TEMPLATE_VALIDATION_CODES = [
  "INVALID_TYPE",
  "MISSING_FIELD",
  "UNKNOWN_FIELD",
  "INVALID_VALUE",
  "EMPTY_COLLECTION",
  "DUPLICATE_ID",
  "UNKNOWN_REFERENCE",
  "INCONSISTENT_REFERENCE",
  "UNREACHABLE_STATE",
  "AMBIGUOUS_TRANSITION",
] as const;

export type ScenarioTemplateValidationCode =
  (typeof SCENARIO_TEMPLATE_VALIDATION_CODES)[number];

export class ScenarioTemplateValidationError extends TypeError {
  readonly code: ScenarioTemplateValidationCode;
  readonly path: string;

  constructor(
    code: ScenarioTemplateValidationCode,
    path: string,
    message: string,
  ) {
    super(`${code} at ${path}: ${message}`);
    this.name = "ScenarioTemplateValidationError";
    this.code = code;
    this.path = path;
  }
}

export type ScenarioTemplateValidationResult =
  | { readonly ok: true; readonly value: ScenarioTemplate }
  | { readonly ok: false; readonly error: ScenarioTemplateValidationError };

type UnknownObject = Record<string, unknown>;

const IDENTIFIER_PATTERN = /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/;
const NAMESPACE_PATTERN = /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/;
const SEMANTIC_VERSION_PATTERN =
  /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/;
const RESERVED_ASSIGNMENT_AUTHORITIES = new Set([
  "@instance-creator",
  "@namespace-governance",
]);

function fail(
  code: ScenarioTemplateValidationCode,
  path: string,
  message: string,
): never {
  throw new ScenarioTemplateValidationError(code, path, message);
}

function readObject(value: unknown, path: string): UnknownObject {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return fail("INVALID_TYPE", path, "expected a plain object");
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    return fail("INVALID_TYPE", path, "expected a plain object");
  }
  if (Object.getOwnPropertySymbols(value).length !== 0) {
    return fail("INVALID_TYPE", path, "symbol properties are not valid JSON data");
  }
  for (const [key, descriptor] of Object.entries(
    Object.getOwnPropertyDescriptors(value),
  )) {
    if (descriptor.get !== undefined || descriptor.set !== undefined) {
      return fail(
        "INVALID_TYPE",
        `${path}.${key}`,
        "accessor properties are not valid JSON data",
      );
    }
    if (!descriptor.enumerable) {
      return fail(
        "INVALID_TYPE",
        `${path}.${key}`,
        "non-enumerable properties are not valid JSON data",
      );
    }
  }
  return value as UnknownObject;
}

function assertExactKeys(
  value: UnknownObject,
  expected: readonly string[],
  path: string,
): void {
  for (const key of expected) {
    if (!Object.hasOwn(value, key)) {
      fail("MISSING_FIELD", `${path}.${key}`, "required field is missing");
    }
  }
  for (const key of Object.keys(value)) {
    if (!expected.includes(key)) {
      fail("UNKNOWN_FIELD", `${path}.${key}`, "field is not defined by the schema");
    }
  }
}

function readString(value: unknown, path: string): string {
  if (typeof value !== "string") {
    return fail("INVALID_TYPE", path, "expected a string");
  }
  const normalized = value.normalize("NFC");
  if (normalized.length === 0) {
    return fail("INVALID_VALUE", path, "must not be empty");
  }
  if (normalized.trim() !== normalized) {
    return fail("INVALID_VALUE", path, "must not have leading or trailing whitespace");
  }
  return normalized;
}

function readIdentifier(value: unknown, path: string): string {
  const identifier = readString(value, path);
  if (!IDENTIFIER_PATTERN.test(identifier)) {
    return fail(
      "INVALID_VALUE",
      path,
      "expected a lowercase identifier using letters, digits, '.', '_' or '-'",
    );
  }
  return identifier;
}

function readStringArray(
  value: unknown,
  path: string,
  options: { readonly allowEmpty?: boolean; readonly identifiers?: boolean } = {},
): readonly string[] {
  if (!Array.isArray(value)) {
    return fail("INVALID_TYPE", path, "expected an array");
  }
  if (!options.allowEmpty && value.length === 0) {
    return fail("EMPTY_COLLECTION", path, "must contain at least one item");
  }
  const result = value.map((item, index) =>
    options.identifiers
      ? readIdentifier(item, `${path}[${index}]`)
      : readString(item, `${path}[${index}]`),
  );
  assertUniqueStrings(result, path);
  return result;
}

function readInteger(
  value: unknown,
  path: string,
  minimum: number,
  maximum: number,
): number {
  if (!Number.isSafeInteger(value)) {
    return fail("INVALID_TYPE", path, "expected a safe integer");
  }
  const number = value as number;
  if (number < minimum || number > maximum) {
    return fail(
      "INVALID_VALUE",
      path,
      `expected an integer from ${minimum} through ${maximum}`,
    );
  }
  return number;
}

function readBoolean(value: unknown, path: string): boolean {
  if (typeof value !== "boolean") {
    return fail("INVALID_TYPE", path, "expected a boolean");
  }
  return value;
}

function readNullableIdentifier(value: unknown, path: string): string | null {
  return value === null ? null : readIdentifier(value, path);
}

function assertUniqueStrings(values: readonly string[], path: string): void {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) {
      fail("DUPLICATE_ID", path, `duplicate value '${value}'`);
    }
    seen.add(value);
  }
}

function assertUniqueIds<T extends { readonly id: string }>(
  values: readonly T[],
  path: string,
): void {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value.id)) {
      fail("DUPLICATE_ID", path, `duplicate id '${value.id}'`);
    }
    seen.add(value.id);
  }
}

function readObjectArray<T>(
  value: unknown,
  path: string,
  reader: (item: unknown, path: string) => T,
  allowEmpty = false,
): readonly T[] {
  if (!Array.isArray(value)) {
    return fail("INVALID_TYPE", path, "expected an array");
  }
  if (!allowEmpty && value.length === 0) {
    return fail("EMPTY_COLLECTION", path, "must contain at least one item");
  }
  return value.map((item, index) => reader(item, `${path}[${index}]`));
}

function readParticipantSlot(value: unknown, path: string): ParticipantSlot {
  const object = readObject(value, path);
  assertExactKeys(object, ["id", "description", "assignableBy"], path);
  return {
    id: readIdentifier(object.id, `${path}.id`),
    description: readString(object.description, `${path}.description`),
    assignableBy: readStringArray(object.assignableBy, `${path}.assignableBy`),
  };
}

function readContext(value: unknown, path: string): ContextDefinition {
  const object = readObject(value, path);
  assertExactKeys(
    object,
    [
      "id",
      "description",
      "allowedSlotIds",
      "recordTypes",
      "claimTypes",
      "recipientKinds",
      "purposes",
    ],
    path,
  );
  return {
    id: readIdentifier(object.id, `${path}.id`),
    description: readString(object.description, `${path}.description`),
    allowedSlotIds: readStringArray(
      object.allowedSlotIds,
      `${path}.allowedSlotIds`,
      { identifiers: true },
    ),
    recordTypes: readStringArray(object.recordTypes, `${path}.recordTypes`, {
      identifiers: true,
    }),
    claimTypes: readStringArray(object.claimTypes, `${path}.claimTypes`, {
      identifiers: true,
    }),
    recipientKinds: readStringArray(
      object.recipientKinds,
      `${path}.recipientKinds`,
      { identifiers: true },
    ),
    purposes: readStringArray(object.purposes, `${path}.purposes`, {
      identifiers: true,
    }),
  };
}

function readAction(value: unknown, path: string): ActionDefinition {
  const object = readObject(value, path);
  assertExactKeys(
    object,
    [
      "id",
      "description",
      "contextId",
      "actorSlotId",
      "inputRecordTypes",
      "outputClaimTypes",
      "purpose",
      "recipientKind",
      "capabilityRuleId",
      "proofProfileId",
      "executionAdapterId",
    ],
    path,
  );
  return {
    id: readIdentifier(object.id, `${path}.id`),
    description: readString(object.description, `${path}.description`),
    contextId: readIdentifier(object.contextId, `${path}.contextId`),
    actorSlotId: readIdentifier(object.actorSlotId, `${path}.actorSlotId`),
    inputRecordTypes: readStringArray(
      object.inputRecordTypes,
      `${path}.inputRecordTypes`,
      { identifiers: true },
    ),
    outputClaimTypes: readStringArray(
      object.outputClaimTypes,
      `${path}.outputClaimTypes`,
      { identifiers: true },
    ),
    purpose: readIdentifier(object.purpose, `${path}.purpose`),
    recipientKind: readIdentifier(
      object.recipientKind,
      `${path}.recipientKind`,
    ),
    capabilityRuleId: readIdentifier(
      object.capabilityRuleId,
      `${path}.capabilityRuleId`,
    ),
    proofProfileId: readIdentifier(
      object.proofProfileId,
      `${path}.proofProfileId`,
    ),
    executionAdapterId: readNullableIdentifier(
      object.executionAdapterId,
      `${path}.executionAdapterId`,
    ),
  };
}

function readTransition(value: unknown, path: string): StateTransition {
  const object = readObject(value, path);
  assertExactKeys(object, ["id", "fromState", "actionId", "toState"], path);
  return {
    id: readIdentifier(object.id, `${path}.id`),
    fromState: readIdentifier(object.fromState, `${path}.fromState`),
    actionId: readIdentifier(object.actionId, `${path}.actionId`),
    toState: readIdentifier(object.toState, `${path}.toState`),
  };
}

function readCapabilityRule(value: unknown, path: string): CapabilityRule {
  const object = readObject(value, path);
  assertExactKeys(
    object,
    [
      "id",
      "description",
      "actionIds",
      "resourceSelector",
      "purpose",
      "recipientConstraint",
      "validForSeconds",
      "maxDelegationDepth",
      "disclosurePolicyId",
      "revocable",
    ],
    path,
  );
  return {
    id: readIdentifier(object.id, `${path}.id`),
    description: readString(object.description, `${path}.description`),
    actionIds: readStringArray(object.actionIds, `${path}.actionIds`, {
      identifiers: true,
    }),
    resourceSelector: readIdentifier(
      object.resourceSelector,
      `${path}.resourceSelector`,
    ),
    purpose: readIdentifier(object.purpose, `${path}.purpose`),
    recipientConstraint: readIdentifier(
      object.recipientConstraint,
      `${path}.recipientConstraint`,
    ),
    validForSeconds: readInteger(
      object.validForSeconds,
      `${path}.validForSeconds`,
      1,
      31_536_000,
    ),
    maxDelegationDepth: readInteger(
      object.maxDelegationDepth,
      `${path}.maxDelegationDepth`,
      0,
      16,
    ),
    disclosurePolicyId: readIdentifier(
      object.disclosurePolicyId,
      `${path}.disclosurePolicyId`,
    ),
    revocable: readBoolean(object.revocable, `${path}.revocable`),
  };
}

function readProofProfile(value: unknown, path: string): ProofProfile {
  const object = readObject(value, path);
  assertExactKeys(object, ["id", "circuitId", "publicOutputSchemaId"], path);
  return {
    id: readIdentifier(object.id, `${path}.id`),
    circuitId: readIdentifier(object.circuitId, `${path}.circuitId`),
    publicOutputSchemaId: readIdentifier(
      object.publicOutputSchemaId,
      `${path}.publicOutputSchemaId`,
    ),
  };
}

function readExecutionAdapter(value: unknown, path: string): ExecutionAdapter {
  const object = readObject(value, path);
  assertExactKeys(object, ["id", "kind", "schemaId"], path);
  return {
    id: readIdentifier(object.id, `${path}.id`),
    kind: readIdentifier(object.kind, `${path}.kind`),
    schemaId: readIdentifier(object.schemaId, `${path}.schemaId`),
  };
}

function readPrivacyInvariant(value: unknown, path: string): PrivacyInvariant {
  const object = readObject(value, path);
  assertExactKeys(object, ["id", "description"], path);
  return {
    id: readIdentifier(object.id, `${path}.id`),
    description: readString(object.description, `${path}.description`),
  };
}

function assertReference(
  references: ReadonlySet<string>,
  value: string,
  path: string,
  kind: string,
): void {
  if (!references.has(value)) {
    fail("UNKNOWN_REFERENCE", path, `unknown ${kind} '${value}'`);
  }
}

function assertSubset(
  allowed: ReadonlySet<string>,
  values: readonly string[],
  path: string,
  kind: string,
): void {
  for (const value of values) {
    if (!allowed.has(value)) {
      fail(
        "INCONSISTENT_REFERENCE",
        path,
        `${kind} '${value}' is not permitted by the referenced context`,
      );
    }
  }
}

function validateReferences(template: ScenarioTemplate): void {
  const slots = new Set(template.participantSlots.map(({ id }) => id));
  const contexts = new Map(template.contexts.map((context) => [context.id, context]));
  const states = new Set(template.states);
  const actions = new Map(template.actions.map((action) => [action.id, action]));
  const capabilityRules = new Map(
    template.capabilityRules.map((rule) => [rule.id, rule]),
  );
  const proofProfiles = new Set(template.proofProfiles.map(({ id }) => id));
  const executionAdapters = new Set(
    template.executionAdapters.map(({ id }) => id),
  );

  assertReference(states, template.initialState, "ScenarioTemplate.initialState", "state");

  for (const [index, slot] of template.participantSlots.entries()) {
    for (const authority of slot.assignableBy) {
      if (!RESERVED_ASSIGNMENT_AUTHORITIES.has(authority)) {
        assertReference(
          slots,
          authority,
          `ScenarioTemplate.participantSlots[${index}].assignableBy`,
          "participant slot",
        );
      }
    }
  }

  for (const [index, context] of template.contexts.entries()) {
    for (const slotId of context.allowedSlotIds) {
      assertReference(
        slots,
        slotId,
        `ScenarioTemplate.contexts[${index}].allowedSlotIds`,
        "participant slot",
      );
    }
  }

  for (const [index, action] of template.actions.entries()) {
    const context = contexts.get(action.contextId);
    if (context === undefined) {
      fail(
        "UNKNOWN_REFERENCE",
        `ScenarioTemplate.actions[${index}].contextId`,
        `unknown context '${action.contextId}'`,
      );
    }
    assertReference(
      slots,
      action.actorSlotId,
      `ScenarioTemplate.actions[${index}].actorSlotId`,
      "participant slot",
    );
    if (!context.allowedSlotIds.includes(action.actorSlotId)) {
      fail(
        "INCONSISTENT_REFERENCE",
        `ScenarioTemplate.actions[${index}].actorSlotId`,
        `participant slot '${action.actorSlotId}' is not allowed in context '${context.id}'`,
      );
    }
    assertSubset(
      new Set(context.recordTypes),
      action.inputRecordTypes,
      `ScenarioTemplate.actions[${index}].inputRecordTypes`,
      "record type",
    );
    assertSubset(
      new Set(context.claimTypes),
      action.outputClaimTypes,
      `ScenarioTemplate.actions[${index}].outputClaimTypes`,
      "claim type",
    );
    assertReference(
      new Set(context.purposes),
      action.purpose,
      `ScenarioTemplate.actions[${index}].purpose`,
      "context purpose",
    );
    assertReference(
      new Set(context.recipientKinds),
      action.recipientKind,
      `ScenarioTemplate.actions[${index}].recipientKind`,
      "recipient kind",
    );
    assertReference(
      new Set(capabilityRules.keys()),
      action.capabilityRuleId,
      `ScenarioTemplate.actions[${index}].capabilityRuleId`,
      "capability rule",
    );
    assertReference(
      proofProfiles,
      action.proofProfileId,
      `ScenarioTemplate.actions[${index}].proofProfileId`,
      "proof profile",
    );
    if (action.executionAdapterId !== null) {
      assertReference(
        executionAdapters,
        action.executionAdapterId,
        `ScenarioTemplate.actions[${index}].executionAdapterId`,
        "execution adapter",
      );
    }
    const rule = capabilityRules.get(action.capabilityRuleId)!;
    if (!rule.actionIds.includes(action.id) || rule.purpose !== action.purpose) {
      fail(
        "INCONSISTENT_REFERENCE",
        `ScenarioTemplate.actions[${index}].capabilityRuleId`,
        "capability rule must include the action and use the same purpose",
      );
    }
  }

  const transitionKeys = new Set<string>();
  const transitionedActions = new Set<string>();
  const reachable = new Set<string>([template.initialState]);
  for (const [index, transition] of template.transitions.entries()) {
    assertReference(
      states,
      transition.fromState,
      `ScenarioTemplate.transitions[${index}].fromState`,
      "state",
    );
    assertReference(
      states,
      transition.toState,
      `ScenarioTemplate.transitions[${index}].toState`,
      "state",
    );
    assertReference(
      new Set(actions.keys()),
      transition.actionId,
      `ScenarioTemplate.transitions[${index}].actionId`,
      "action",
    );
    const key = `${transition.fromState}\u0000${transition.actionId}`;
    if (transitionKeys.has(key)) {
      fail(
        "AMBIGUOUS_TRANSITION",
        `ScenarioTemplate.transitions[${index}]`,
        `state '${transition.fromState}' has more than one transition for action '${transition.actionId}'`,
      );
    }
    transitionKeys.add(key);
    transitionedActions.add(transition.actionId);
  }

  for (const action of template.actions) {
    if (!transitionedActions.has(action.id)) {
      fail(
        "INCONSISTENT_REFERENCE",
        "ScenarioTemplate.transitions",
        `action '${action.id}' has no state transition`,
      );
    }
  }

  let changed = true;
  while (changed) {
    changed = false;
    for (const transition of template.transitions) {
      if (reachable.has(transition.fromState) && !reachable.has(transition.toState)) {
        reachable.add(transition.toState);
        changed = true;
      }
    }
  }
  for (const [index, state] of template.states.entries()) {
    if (!reachable.has(state)) {
      fail(
        "UNREACHABLE_STATE",
        `ScenarioTemplate.states[${index}]`,
        `state '${state}' is not reachable from '${template.initialState}'`,
      );
    }
  }

  for (const [index, rule] of template.capabilityRules.entries()) {
    for (const actionId of rule.actionIds) {
      assertReference(
        new Set(actions.keys()),
        actionId,
        `ScenarioTemplate.capabilityRules[${index}].actionIds`,
        "action",
      );
    }
  }
}

export function parseScenarioTemplate(input: unknown): ScenarioTemplate {
  const path = "ScenarioTemplate";
  const object = readObject(input, path);
  assertExactKeys(
    object,
    [
      "schemaVersion",
      "namespace",
      "templateId",
      "version",
      "displayName",
      "description",
      "participantSlots",
      "contexts",
      "states",
      "initialState",
      "actions",
      "transitions",
      "capabilityRules",
      "proofProfiles",
      "executionAdapters",
      "privacyInvariants",
    ],
    path,
  );

  if (object.schemaVersion !== SCENARIO_TEMPLATE_SCHEMA_VERSION) {
    fail(
      "INVALID_VALUE",
      `${path}.schemaVersion`,
      `expected ${SCENARIO_TEMPLATE_SCHEMA_VERSION}`,
    );
  }

  const namespace = readString(object.namespace, `${path}.namespace`);
  if (!NAMESPACE_PATTERN.test(namespace)) {
    fail(
      "INVALID_VALUE",
      `${path}.namespace`,
      "expected a lowercase dotted namespace",
    );
  }
  const templateId = readString(object.templateId, `${path}.templateId`);
  const expectedTemplatePrefix = `${namespace}/`;
  if (
    !templateId.startsWith(expectedTemplatePrefix) ||
    !IDENTIFIER_PATTERN.test(templateId.slice(expectedTemplatePrefix.length))
  ) {
    fail(
      "INVALID_VALUE",
      `${path}.templateId`,
      `expected '${expectedTemplatePrefix}<lowercase-identifier>'`,
    );
  }
  const version = readString(object.version, `${path}.version`);
  const semanticVersion = SEMANTIC_VERSION_PATTERN.exec(version);
  if (
    semanticVersion === null ||
    semanticVersion.slice(1).some((part) => !Number.isSafeInteger(Number(part)))
  ) {
    fail(
      "INVALID_VALUE",
      `${path}.version`,
      "expected strict MAJOR.MINOR.PATCH semantic version",
    );
  }

  const participantSlots = readObjectArray(
    object.participantSlots,
    `${path}.participantSlots`,
    readParticipantSlot,
  );
  const contexts = readObjectArray(
    object.contexts,
    `${path}.contexts`,
    readContext,
  );
  const actions = readObjectArray(
    object.actions,
    `${path}.actions`,
    readAction,
  );
  const transitions = readObjectArray(
    object.transitions,
    `${path}.transitions`,
    readTransition,
  );
  const capabilityRules = readObjectArray(
    object.capabilityRules,
    `${path}.capabilityRules`,
    readCapabilityRule,
  );
  const proofProfiles = readObjectArray(
    object.proofProfiles,
    `${path}.proofProfiles`,
    readProofProfile,
  );
  const executionAdapters = readObjectArray(
    object.executionAdapters,
    `${path}.executionAdapters`,
    readExecutionAdapter,
    true,
  );
  const privacyInvariants = readObjectArray(
    object.privacyInvariants,
    `${path}.privacyInvariants`,
    readPrivacyInvariant,
  );

  assertUniqueIds(participantSlots, `${path}.participantSlots`);
  assertUniqueIds(contexts, `${path}.contexts`);
  assertUniqueIds(actions, `${path}.actions`);
  assertUniqueIds(transitions, `${path}.transitions`);
  assertUniqueIds(capabilityRules, `${path}.capabilityRules`);
  assertUniqueIds(proofProfiles, `${path}.proofProfiles`);
  assertUniqueIds(executionAdapters, `${path}.executionAdapters`);
  assertUniqueIds(privacyInvariants, `${path}.privacyInvariants`);

  const template: ScenarioTemplate = {
    schemaVersion: SCENARIO_TEMPLATE_SCHEMA_VERSION,
    namespace,
    templateId,
    version,
    displayName: readString(object.displayName, `${path}.displayName`),
    description: readString(object.description, `${path}.description`),
    participantSlots,
    contexts,
    states: readStringArray(object.states, `${path}.states`, {
      identifiers: true,
    }),
    initialState: readIdentifier(object.initialState, `${path}.initialState`),
    actions,
    transitions,
    capabilityRules,
    proofProfiles,
    executionAdapters,
    privacyInvariants,
  };

  validateReferences(template);
  return structuredClone(template);
}

export function validateScenarioTemplate(
  input: unknown,
): ScenarioTemplateValidationResult {
  try {
    return { ok: true, value: parseScenarioTemplate(input) };
  } catch (error) {
    if (error instanceof ScenarioTemplateValidationError) {
      return { ok: false, error };
    }
    throw error;
  }
}
