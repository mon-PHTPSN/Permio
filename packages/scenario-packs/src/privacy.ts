import {
  ArtifactPrivacyError,
  scanClassifiedPrivateValues,
  scanPublicArtifacts,
  type PrivacyFinding,
  type PublicArtifact,
} from "@permio/scenario-generator";

import type { ScenarioPackFixture } from "./model.ts";

export function scanScenarioPackPublicArtifacts(
  fixture: ScenarioPackFixture,
  artifacts: readonly PublicArtifact[],
): readonly PrivacyFinding[] {
  return [
    ...scanPublicArtifacts(fixture.generated, artifacts),
    ...scanClassifiedPrivateValues(fixture.additionalPrivateValues, artifacts),
  ];
}

export function assertScenarioPackPublicArtifactsSafe(
  fixture: ScenarioPackFixture,
  artifacts: readonly PublicArtifact[],
): void {
  const findings = scanScenarioPackPublicArtifacts(fixture, artifacts);
  if (findings.length > 0) throw new ArtifactPrivacyError(findings);
}
