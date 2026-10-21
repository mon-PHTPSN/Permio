import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { createUnprovenCallTx } from "@midnight-ntwrk/midnight-js-contracts";
import { permioAuthorizationCompiledContract, type PermioAuthorizationProviders } from "@permio/midnight-authorization";
import type { PreparedOrdinaryAction } from "./m6-ordinary-action-workflow.ts";

type Args = PreparedOrdinaryAction["arguments"];
export function ordinaryActionMutationCases(): { label: string; mutate(args: Args): void; expected: RegExp }[] {
  return [
    { label: "state-sequence", mutate: a => { a[0].stateSequence++; }, expected: /state or allocation is stale/u },
    { label: "authority-root-sequence", mutate: a => { a[0].authorityRootSequence++; }, expected: /root is stale/u },
    { label: "status-root-sequence", mutate: a => { a[0].statusRootSequence++; }, expected: /root is stale/u },
    { label: "state-commitment", mutate: a => { a[0].stateCommitment = randomBytes(32); }, expected: /exact signed inputs/u },
    { label: "evidence-output-commitment", mutate: a => { a[0].selectedOutputsCommitment = randomBytes(32); }, expected: /signature/iu },
    { label: "expired-window", mutate: a => { a[0].validBefore = a[0].effectiveAt; }, expected: /window is backdated/u },
    { label: "command-signature", mutate: a => { a[1].response++; }, expected: /signature/iu },
    { label: "session-signature", mutate: a => { a[4].response++; }, expected: /signature/iu },
    { label: "intent-signature", mutate: a => { a[5].response++; }, expected: /signature/iu },
    { label: "next-state-nonce", mutate: a => { a[20] = randomBytes(32); }, expected: /exact next private state|preserve the entire private state/u },
    ...(["contextHash", "actionIdHash", "resourceHash", "purposeHash", "recipientHash", "disclosurePolicyIdHash"] as const)
      .map(field => ({ label: `intent-${field}`, mutate: (a: Args) => { a[2][field] = randomBytes(32); }, expected: /exact signed inputs/u })),
    ...(["moduleIdHash", "implementationHash", "configurationHash", "receiptSchemaHash"] as const)
      .map(field => ({ label: `module-${field}`, mutate: (a: Args) => { a[11][field] = randomBytes(32); }, expected: /exact signed inputs/u })),
  ];
}

/** Real indexed Preprod state, generated circuit only: never a native result. */
export async function verifyLiveActionMutations(input: {
  providers: PermioAuthorizationProviders; address: string; candidate: PreparedOrdinaryAction;
  emit(value: Readonly<Record<string, unknown>>): void;
}) {
  const create = (args: Args) => createUnprovenCallTx(input.providers, { compiledContract: permioAuthorizationCompiledContract,
    contractAddress: input.address, circuitId: "executeRuntimeAction", args });
  await create(input.candidate.arguments);
  const vectors = ordinaryActionMutationCases();
  for (const vector of vectors) {
    const args = structuredClone(input.candidate.arguments); vector.mutate(args);
    await assert.rejects(create(args), vector.expected);
    input.emit({ phase: "live-indexed-generated-mutation-rejected", case: vector.label,
      baselineGeneratedCallSucceeded: true, nativeSubmissions: 0, genuineProofGenerated: false,
      nativeAcceptanceGateClosedByThisCheck: false });
  }
  return { generatedMutationCases: vectors.length, nativeSubmissions: 0 };
}
