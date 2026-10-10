import { canonicalizeGeneratorValue } from "./canonical.ts";
import {
  CLASSIFICATION_MANIFEST_VERSION,
  type ClassificationEntry,
  type ClassificationManifest,
  type GeneratedScenario,
  type SyntheticScenarioInstance,
} from "./model.ts";

export class ClassificationManifestError extends TypeError {
  constructor(message: string) {
    super(`INVALID_CLASSIFICATION_MANIFEST: ${message}`);
    this.name = "ClassificationManifestError";
  }
}

function pathKey(value: string): string {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(value)
    ? `.${value}`
    : `[${JSON.stringify(value)}]`;
}

function privateEntry(path: string, rationale: string): ClassificationEntry {
  return { path, classification: "private", rationale };
}

function publicEntry(path: string, rationale: string): ClassificationEntry {
  return { path, classification: "public", rationale };
}

function leafPaths(value: unknown, path: string): readonly string[] {
  if (value === null || typeof value !== "object") return [path];
  if (Array.isArray(value)) {
    return value.length === 0
      ? [path]
      : value.flatMap((item, index) => leafPaths(item, `${path}[${index}]`));
  }
  const keys = Object.keys(value);
  return keys.length === 0
    ? [path]
    : keys.flatMap((key) =>
        leafPaths(
          (value as Record<string, unknown>)[key],
          `${path}${pathKey(key)}`,
        ),
      );
}

function entryCoversLeaf(entry: ClassificationEntry, leafPath: string): boolean {
  if (entry.path === leafPath) return true;
  return (
    entry.classification === "public" &&
    (leafPath.startsWith(`${entry.path}.`) || leafPath.startsWith(`${entry.path}[`))
  );
}

export function createClassificationManifest(
  instance: SyntheticScenarioInstance,
): ClassificationManifest {
  const generatedValue = "Synthetic instance value; never a public artifact field.";
  const publicSchema = "Versioned template schema metadata; contains no instance value.";
  const entries: ClassificationEntry[] = [
    publicEntry("$.generatorVersion", publicSchema),
    publicEntry("$.templateHash", publicSchema),
    publicEntry("$.policyProfileHash", publicSchema),
    publicEntry("$.publicSummary", "Explicit allowlist of versions, hashes, and schema."),
    publicEntry("$.classificationManifest", "Classification metadata contains paths and policy text only."),
    publicEntry("$.privateInstance.schemaVersion", publicSchema),
    privateEntry("$.privateInstance.instanceId", generatedValue),
    privateEntry("$.privateInstance.generatedTimestamp", generatedValue),
  ];

  instance.principals.forEach((_principal, index) => {
    entries.push(
      privateEntry(`$.privateInstance.principals[${index}].id`, generatedValue),
      publicEntry(`$.privateInstance.principals[${index}].contextId`, publicSchema),
      publicEntry(`$.privateInstance.principals[${index}].slotId`, publicSchema),
    );
  });
  instance.records.forEach((_record, index) => {
    entries.push(
      privateEntry(`$.privateInstance.records[${index}].id`, generatedValue),
      publicEntry(`$.privateInstance.records[${index}].contextId`, publicSchema),
      publicEntry(`$.privateInstance.records[${index}].recordType`, publicSchema),
      privateEntry(`$.privateInstance.records[${index}].ownerPrincipalId`, generatedValue),
      privateEntry(`$.privateInstance.records[${index}].value`, generatedValue),
    );
  });
  instance.credentials.forEach((credential, index) => {
    entries.push(
      privateEntry(`$.privateInstance.credentials[${index}].id`, generatedValue),
      publicEntry(`$.privateInstance.credentials[${index}].contextId`, publicSchema),
      publicEntry(`$.privateInstance.credentials[${index}].actionId`, publicSchema),
      privateEntry(`$.privateInstance.credentials[${index}].subjectPrincipalId`, generatedValue),
      publicEntry(`$.privateInstance.credentials[${index}].proofProfileId`, publicSchema),
    );
    for (const claimType of Object.keys(credential.claims)) {
      entries.push(
        privateEntry(
          `$.privateInstance.credentials[${index}].claims${pathKey(claimType)}`,
          generatedValue,
        ),
      );
    }
  });
  instance.events.forEach((_event, index) => {
    entries.push(
      privateEntry(`$.privateInstance.events[${index}].id`, generatedValue),
      publicEntry(`$.privateInstance.events[${index}].actionId`, publicSchema),
      publicEntry(`$.privateInstance.events[${index}].contextId`, publicSchema),
      privateEntry(`$.privateInstance.events[${index}].actorPrincipalId`, generatedValue),
      publicEntry(`$.privateInstance.events[${index}].fromState`, publicSchema),
      publicEntry(`$.privateInstance.events[${index}].toState`, publicSchema),
      privateEntry(`$.privateInstance.events[${index}].timestamp`, generatedValue),
    );
  });

  return {
    version: CLASSIFICATION_MANIFEST_VERSION,
    defaultClassification: "private",
    entries,
  };
}

export function assertClassificationManifest(
  generated: GeneratedScenario,
): void {
  const expected = createClassificationManifest(generated.privateInstance);
  if (
    canonicalizeGeneratorValue(generated.classificationManifest) !==
    canonicalizeGeneratorValue(expected)
  ) {
    throw new ClassificationManifestError(
      "the manifest does not exactly classify the generated public schema and private instance fields",
    );
  }
  const unclassified = leafPaths(generated, "$").filter(
    (path) => !expected.entries.some((entry) => entryCoversLeaf(entry, path)),
  );
  if (unclassified.length > 0) {
    throw new ClassificationManifestError(
      `generated leaves are not classified: ${unclassified.join(", ")}`,
    );
  }
}
