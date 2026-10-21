import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { ledger } from '../packages/midnight-authorization/contracts/managed/permio-authorization/contract/index.js';
export function parsePublicStateArguments(args: readonly string[]) {
  const files = args.filter(value => !value.startsWith("--"));
  const options = args.filter(value => value.startsWith("--"));
  assert(files.length === 1 && /^logs[\\/]+m6-live-[0-9TZ.-]+\.jsonl$/u.test(files[0]!) &&
    options.length <= 2 && new Set(options).size === options.length &&
    options.every(value => value === "--final" || value === "--slot-state" || value === "--allocation-only" || value === "--observe-only") &&
    !(options.includes("--slot-state") && options.includes("--allocation-only")) &&
    !(options.includes("--observe-only") && options.length !== 1),
  "usage: verify-live-m6-public-state.ts logs/m6-live-<timestamp>.jsonl [--observe-only | [--final] [--slot-state | --allocation-only]]");
  return { logFile: files[0]!, final: options.includes("--final"), slotState: options.includes("--slot-state"),
    allocationOnly: options.includes("--allocation-only"), observeOnly: options.includes("--observe-only") };
}

/** Diagnostic log expectations, not receipt authentication or ledger acceptance. */
export function expectedInstanceStateEvidence(
  rows: readonly Record<string, unknown>[], allocated: Record<string, unknown>, slotState: boolean, final: boolean,
  allocationOnly = false,
): { sequence: bigint; commitment?: string } {
  assert(allocated.contractTag === undefined || allocated.contractTag === 'permio-authorization-v8',
    "Unsupported explicitly tagged allocation evidence");
  const stateBoundCredentials = allocated.contractTag === 'permio-authorization-v8';
  if (allocationOnly) {
    assert(!slotState && !rows.some(row => row.event === 'slot-state-workflow-verified' ||
      row.event === 'allocated-credential-and-session-regression-verified'), 'Evidence is not allocation-only');
    return { sequence: 0n };
  }
  if (slotState) {
    const event = rows.find(row => row.event === 'slot-state-workflow-verified');
    const sequence = stateBoundCredentials ? 5 : 4;
    assert(event && event.stateSequence === sequence && event.consumedSlotCommandNonces === 4 &&
      typeof event.currentStateCommitment === 'string' && /^[0-9a-f]{64}$/u.test(event.currentStateCommitment),
    "Missing exact public slot-state completion event");
    return { sequence: BigInt(sequence), commitment: event.currentStateCommitment };
  }
  if (stateBoundCredentials) {
    const event = rows.find(row => row.event === 'allocated-credential-and-session-regression-verified');
    if (final || event) {
      assert(event && event.instanceStateSequence === 5 && typeof event.currentStateCommitment === 'string' &&
        /^[0-9a-f]{64}$/u.test(event.currentStateCommitment), "Missing exact v8 credential-state completion event");
      return { sequence: 5n, commitment: event.currentStateCommitment };
    }
  }
  return { sequence: 0n };
}

export async function verifyPublicState(args: readonly string[]) {
  const { logFile, final, slotState, allocationOnly, observeOnly } = parsePublicStateArguments(args);
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const logRoot = fs.realpathSync(path.join(root, "logs"));
  const log = fs.realpathSync(path.resolve(root, logFile));
  assert(log.startsWith(logRoot + path.sep), "Public log must remain inside this worktree logs directory");
  setNetworkId('undeployed');
  const rows = fs.readFileSync(log, "utf8").trim().split("\n").map(line => JSON.parse(line));
  const allocated = rows.find(r => r.event === 'private-instance-allocation-accepted');
  assert(allocated && [allocated.contractAddress, allocated.instanceCommitment, allocated.allocationCommitment]
    .every(value => typeof value === "string" && /^[0-9a-f]{64}$/u.test(value)), "Missing exact public allocation event");
  assert(allocated.contractTag === undefined || allocated.contractTag === 'permio-authorization-v8',
    'Unsupported explicitly tagged allocation evidence');
  const provider = indexerPublicDataProvider('http://127.0.0.1:8088/api/v4/graphql','ws://127.0.0.1:8088/api/v4/graphql/ws');
  const state = await provider.queryContractState(allocated.contractAddress);
  assert(state);
  const view = ledger(state.data);
  const instance = view.runtimeInstances.lookup(Uint8Array.from(Buffer.from(allocated.instanceCommitment,'hex')));
  assert.equal(Buffer.from(instance.allocationCommitment).toString('hex'),allocated.allocationCommitment);
  if (!observeOnly) {
    const expectedState = expectedInstanceStateEvidence(rows, allocated, slotState, final, allocationOnly);
    assert.equal(instance.transitionSequence, expectedState.sequence);
    if (expectedState.commitment) assert.equal(Buffer.from(instance.currentStateCommitment).toString('hex'), expectedState.commitment);
  }
  if (slotState) {
    assert.equal(view.runtimeSlotSessions.size(),0n);
    assert.equal(view.usedRuntimeSlotCommandNonces.size(),4n);
  }
  assert.equal(view.runtimeInstances.size(),1n);
  assert.equal(view.usedAllocationRequestNullifiers.size(),1n);
  assert.equal(view.usedInstanceIdentityNullifiers.size(),1n);
  const [ns,authority] = [...view.authorityRoots][0];
  const credential = view.credentialStatusRoots.lookup(ns);
  const template = [...view.activeTemplates][0][1];
  const module = [...view.proofModules][0][1];
  if (final) {
    assert.equal(credential.rootSequence,allocationOnly ? 0n : slotState ? 1n : 5n);
    assert.equal(view.usedCredentialStatusCommandNonces.size(),allocationOnly ? 0n : slotState ? 1n : 5n);
    if (allocationOnly) {
      assert.equal(view.runtimeSlotSessions.size(),0n);
      assert.equal(view.usedRuntimeSlotCommandNonces.size(),0n);
    }
    assert.equal(view.capabilityAttenuationSessions.size(),0n);
    assert.equal(authority.rootVersion,2n); assert.equal(authority.rootSequence,2n);
    assert.equal(template.lifecycleStatus,3n); assert.equal(module.lifecycleStatus,6n);
    assert.equal(view.proofModuleRegistrySequence,8n);
    assert.equal(view.templateActivationSequence,1n); assert.equal(view.templateLifecycleSequence,3n);
  }
  const number = (v: bigint) => Number(v);
  return {event:observeOnly ? 'independent-public-state-observation' : 'independent-public-state-read',timestamp:new Date().toISOString(),
    observationOnly:observeOnly,verificationScope:observeOnly ? 'diagnostic-only-not-acceptance' : 'explicit-fixture-state-assertions-not-full-M6-acceptance',
    finalAssertions:final,slotStateAssertions:slotState,allocationOnlyAssertions:allocationOnly,
    contractAddress:allocated.contractAddress,walletOrPrivateWitnessUsed:false,
    instanceCommitment:allocated.instanceCommitment,allocationCommitment:allocated.allocationCommitment,
    currentStateCommitment:Buffer.from(instance.currentStateCommitment).toString('hex'),
    publicInstanceFields:Object.keys(instance).sort(),transitionSequence:number(instance.transitionSequence),allocatedInstances:1,
    remainingSlotStagingSessions:number(view.runtimeSlotSessions.size()),
    usedSlotCommandNonces:number(view.usedRuntimeSlotCommandNonces.size()),
    allocationRequestNullifiers:1,instanceIdentityNullifiers:1,instanceLifecycleStatus:number(instance.lifecycleStatus),
    credentialStatusRootSequence:number(credential.rootSequence),
    usedCredentialStatusCommandNonces:number(view.usedCredentialStatusCommandNonces.size()),
    remainingCredentialStagingSessions:number(view.capabilityAttenuationSessions.size()),
    authorityRootVersion:number(authority.rootVersion),authorityRootSequence:number(authority.rootSequence),
    templateLifecycleStatus:number(template.lifecycleStatus),moduleLifecycleStatus:number(module.lifecycleStatus),
    moduleRegistrySequence:number(view.proofModuleRegistrySequence),
    templateActivationSequence:number(view.templateActivationSequence),templateLifecycleSequence:number(view.templateLifecycleSequence)};
}

// Public reader only: never construct a wallet, load an account file, or prove.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { console.log(JSON.stringify(await verifyPublicState(process.argv.slice(2)))); }
  catch { console.log(JSON.stringify({ event: "independent-public-read-failed", detailsWithheld: true })); process.exitCode = 1; }
}
