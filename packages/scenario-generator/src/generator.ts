import { createHash } from "node:crypto";

import {
  serializeScenarioTemplate,
  type ScenarioTemplate,
} from "@permio/scenario-domain";

import {
  canonicalizeGeneratorValue,
  frame,
  hashDomainSeparated,
  serializeGeneratorValue,
} from "./canonical.ts";
import { createClassificationManifest } from "./classification.ts";
import {
  SCENARIO_GENERATOR_DOMAINS,
  SCENARIO_GENERATOR_SCHEMA_VERSION,
  type GeneratedScenario,
  type PublicScenarioSchema,
  type ScenarioGeneratorDerivationDomain,
  type ScenarioGeneratorInput,
  type SyntheticCredential,
  type SyntheticEvent,
  type SyntheticPrincipal,
  type SyntheticRecord,
} from "./model.ts";
import { parseScenarioGeneratorInput } from "./validation.ts";

class DeterministicDeriver {
  readonly #master: Buffer;
  readonly #valueBytes: number;

  constructor(input: ScenarioGeneratorInput, policyCanonical: string) {
    this.#valueBytes = input.policyProfile.syntheticValueBytes;
    this.#master = createHash("sha256")
      .update(
        frame(
          SCENARIO_GENERATOR_DOMAINS.master,
          input.generatorVersion,
          serializeScenarioTemplate(input.template),
          input.templateHash.algorithm,
          input.templateHash.domain,
          input.templateHash.value,
          input.explicitSeed,
          policyCanonical,
        ),
      )
      .digest();
  }

  derive(
    domain: Exclude<
      ScenarioGeneratorDerivationDomain,
      | typeof SCENARIO_GENERATOR_DOMAINS.master
      | typeof SCENARIO_GENERATOR_DOMAINS.policyProfileHash
      | typeof SCENARIO_GENERATOR_DOMAINS.goldenOutputHash
    >,
    coordinates: readonly string[],
    bytes = this.#valueBytes,
  ): string {
    const chunks: Buffer[] = [];
    let block = 0;
    let derivedBytes = 0;
    while (derivedBytes < bytes) {
      const counter = Buffer.allocUnsafe(4);
      counter.writeUInt32BE(block);
      chunks.push(
        createHash("sha256")
          .update(frame(domain, this.#master, ...coordinates, counter))
          .digest(),
      );
      derivedBytes += 32;
      block += 1;
    }
    return Buffer.concat(chunks).subarray(0, bytes).toString("hex");
  }
}

function principalMap(
  template: ScenarioTemplate,
  deriver: DeterministicDeriver,
): ReadonlyMap<string, SyntheticPrincipal> {
  return new Map(
    template.contexts.flatMap((context) =>
      context.allowedSlotIds.map((slotId) => [
        principalKey(context.id, slotId),
        {
          id: `syn_prn_${deriver.derive(
            SCENARIO_GENERATOR_DOMAINS.principalId,
            [context.id, slotId],
          )}`,
          contextId: context.id,
          slotId,
        },
      ] as const),
    ),
  );
}

function principalKey(contextId: string, slotId: string): string {
  return `${contextId}\u0000${slotId}`;
}

function buildPublicSchema(template: ScenarioTemplate): PublicScenarioSchema {
  const actions = new Map(template.actions.map((action) => [action.id, action]));
  return {
    principalSchemas: template.contexts.flatMap((context) =>
      context.allowedSlotIds.map((slotId) => ({
        contextId: context.id,
        slotId,
      })),
    ),
    recordSchemas: template.contexts.flatMap((context) =>
      context.recordTypes.map((recordType) => ({
        contextId: context.id,
        recordType,
      })),
    ),
    credentialSchemas: template.actions.map((action) => ({
      contextId: action.contextId,
      actionId: action.id,
      claimTypes: [...action.outputClaimTypes],
      proofProfileId: action.proofProfileId,
    })),
    eventSchemas: template.transitions.map((transition) => {
      const action = actions.get(transition.actionId)!;
      return {
        actionId: action.id,
        contextId: action.contextId,
        fromState: transition.fromState,
        toState: transition.toState,
      };
    }),
  };
}

export function generateScenario(inputValue: unknown): GeneratedScenario {
  const input = parseScenarioGeneratorInput(inputValue);
  const policyCanonical = canonicalizeGeneratorValue(input.policyProfile);
  const policyProfileHash = hashDomainSeparated(
    SCENARIO_GENERATOR_DOMAINS.policyProfileHash,
    policyCanonical,
  );
  const deriver = new DeterministicDeriver(input, policyCanonical);
  const principalsBySlot = principalMap(input.template, deriver);
  const principals = [...principalsBySlot.values()];

  const records: SyntheticRecord[] = input.template.contexts.flatMap((context) =>
    context.recordTypes.map((recordType, recordIndex) => {
      const ownerSlot =
        context.allowedSlotIds[recordIndex % context.allowedSlotIds.length]!;
      return {
        id: `syn_rec_${deriver.derive(SCENARIO_GENERATOR_DOMAINS.recordId, [
          context.id,
          recordType,
        ])}`,
        contextId: context.id,
        recordType,
        ownerPrincipalId: principalsBySlot.get(
          principalKey(context.id, ownerSlot),
        )!.id,
        value: `syn_val_${deriver.derive(
          SCENARIO_GENERATOR_DOMAINS.recordValue,
          [context.id, recordType],
        )}`,
      };
    }),
  );

  const credentials: SyntheticCredential[] = input.template.actions.map(
    (action) => ({
      id: `syn_crd_${deriver.derive(
        SCENARIO_GENERATOR_DOMAINS.credentialId,
        [action.contextId, action.id],
      )}`,
      contextId: action.contextId,
      actionId: action.id,
      subjectPrincipalId: principalsBySlot.get(
        principalKey(action.contextId, action.actorSlotId),
      )!.id,
      proofProfileId: action.proofProfileId,
      claims: Object.fromEntries(
        action.outputClaimTypes.map((claimType) => [
          claimType,
          `syn_clm_${deriver.derive(
            SCENARIO_GENERATOR_DOMAINS.credentialClaim,
            [action.contextId, action.id, claimType],
          )}`,
        ]),
      ),
    }),
  );

  const actionMap = new Map(
    input.template.actions.map((action) => [action.id, action]),
  );
  const baseTimestamp = Date.parse(input.policyProfile.baseTimestamp);
  const events: SyntheticEvent[] = input.template.transitions.map(
    (transition, index) => {
      const action = actionMap.get(transition.actionId)!;
      return {
        id: `syn_evt_${deriver.derive(SCENARIO_GENERATOR_DOMAINS.eventId, [
          action.contextId,
          transition.id,
        ])}`,
        actionId: action.id,
        contextId: action.contextId,
        actorPrincipalId: principalsBySlot.get(
          principalKey(action.contextId, action.actorSlotId),
        )!.id,
        fromState: transition.fromState,
        toState: transition.toState,
        timestamp: new Date(
          baseTimestamp +
            (index + 1) * input.policyProfile.eventIntervalSeconds * 1_000,
        ).toISOString(),
      };
    },
  );

  const privateInstance = {
    schemaVersion: SCENARIO_GENERATOR_SCHEMA_VERSION,
    instanceId: `syn_ins_${deriver.derive(
      SCENARIO_GENERATOR_DOMAINS.instanceId,
      ["instance"],
    )}`,
    generatedTimestamp: input.policyProfile.baseTimestamp,
    principals,
    records,
    credentials,
    events,
  } as const;

  const publicSummary = {
    schemaVersion: SCENARIO_GENERATOR_SCHEMA_VERSION,
    generatorVersion: input.generatorVersion,
    templateHash: input.templateHash,
    policyProfileHash,
    schema: buildPublicSchema(input.template),
  } as const;

  const generated = {
    generatorVersion: input.generatorVersion,
    templateHash: input.templateHash,
    policyProfileHash,
    privateInstance,
    publicSummary,
    classificationManifest: createClassificationManifest(privateInstance),
  } as const;
  return structuredClone(generated);
}

export function serializeGeneratedScenario(value: GeneratedScenario): Uint8Array {
  return serializeGeneratorValue(value);
}
