import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { lstat, readFile, realpath } from "node:fs/promises";
import { ContractCall, LedgerParameters, StateValue, Transaction } from "@midnight-ntwrk/midnight-js-protocol/ledger";
import { Bytes32Descriptor, ContractState } from "@midnight-ntwrk/midnight-js-protocol/compact-runtime";
import type { PreprodConnectionProfile } from "@permio/midnight-authorization";
import { ledger } from "../packages/midnight-authorization/contracts/managed/permio-authorization/contract/index.js";
import { auditM6PublicCallReadSet } from "./m6-public-transcript-audit.ts";

type Encoded = Parameters<typeof StateValue.decode>[0];
const root = "/opt/permio-m6-remaining-preprod-20261019-v1";
const address = "70c139af18859fc0074f015c8c88bd727dd2a4a63afa85dcc427d98e127bbd8c";
const hash = (value: Uint8Array) => createHash("sha256").update(value).digest("hex");

/** In-memory public counterfactual; this never modifies a contract or a file. */
export function copyM6PublicMapEntryForAudit(base: Encoded, replacement: Encoded, route: readonly number[], key: Uint8Array): Encoded {
  assert(key.length === 32 && route.length > 0 && route.every(index => Number.isSafeInteger(index) && index >= 0 && index < 16));
  const aligned = { value: Bytes32Descriptor.toValue(key), alignment: Bytes32Descriptor.alignment() };
  const descend = (node: StateValue) => route.reduce((current, index) => {
    const child = current.asArray()?.[index]; assert(child); return child;
  }, node);
  const source = descend(StateValue.decode(replacement)).asMap()?.get(aligned); assert(source);
  const replace = (node: StateValue, rest: readonly number[]): StateValue => {
    if (!rest.length) {
      const map = node.asMap(); assert(map && map.get(aligned)); return StateValue.newMap(map.insert(aligned, source));
    }
    const array = node.asArray(); assert(array?.[rest[0]!]);
    return array.reduce((result, child, index) => result.arrayPush(index === rest[0]
      ? replace(child, rest.slice(1)) : child), StateValue.newArray());
  };
  return replace(StateValue.decode(base), route).encode();
}

/** Exact finalized M4 binding proof, held-valid clock, actual indexed module row. */
export async function auditM6DeprecatedModuleAdmission(input: {
  profile: Pick<PreprodConnectionProfile, "environmentForSdk">; moduleKey: Uint8Array;
  currentState: ContractState; expectedModuleStatus: 4n | 5n;
}) {
  assert(process.platform === "linux" && input.moduleKey.length === 32);
  const url = new URL(input.profile.environmentForSdk().indexer);
  assert(url.origin === "https://midnight-preprod.blockfrost.io" && url.pathname === "/api/v0" && !url.username && !url.password && !url.hash);
  async function file(name: string) {
    assert(/^wallet-[0-9]{3}-(?:balanced\.bin|submission\.json)$/u.test(name));
    const path = root + "/private/" + name, stat = await lstat(path);
    assert(stat.isFile() && !stat.isSymbolicLink() && stat.uid === 0 && (stat.mode & 0o777) === 0o600 && await realpath(path) === path);
    return readFile(path);
  }
  const normalize = (value: unknown) => typeof value === "string" ? value.replace(/^0x/u, "") : "";
  const decode = (value: unknown) => {
    const text = normalize(value); assert(/^[0-9a-f]+$/u.test(text) && text.length % 2 === 0 && text.length <= 16 * 1024 ** 2);
    return Buffer.from(text, "hex");
  };
  async function exact(round: number, entry: string) {
    const number = String(round).padStart(3, "0"), bytes = await file(`wallet-${number}-balanced.bin`);
    const journal = JSON.parse((await file(`wallet-${number}-submission.json`)).toString());
    const transaction = Transaction.deserialize("signature", "proof", "binding", bytes);
    assert(Buffer.from(transaction.serialize()).equals(bytes) && journal.balancedSha256 === hash(bytes));
    assert.deepEqual(transaction.identifiers(), journal.transactionIds);
    const id = journal.transactionIds.at(-1); assert(/^[0-9a-f]{66}$/u.test(id));
    const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, signal: AbortSignal.timeout(30_000),
      body: JSON.stringify({ query: `query M6DeprecatedBindingSource($offset: TransactionOffset!) {
        transactions(offset: $offset) { protocolVersion raw block { hash height ledgerParameters }
          contractActions { __typename address state ... on ContractCall { entryPoint } }
          ... on RegularTransaction { identifiers transactionResult { status } } }
      }`, variables: { offset: { identifier: id } } }) });
    assert(response.ok); const text = await response.text(); assert(text.length < 20 * 1024 ** 2);
    const payload = JSON.parse(text); assert(!payload.errors && Array.isArray(payload.data?.transactions));
    const matches = payload.data.transactions.filter((tx: any) => tx.identifiers?.some((value: unknown) => normalize(value) === id));
    assert(matches.length === 1); const tx = matches[0];
    assert(tx.protocolVersion === 1000300 && tx.transactionResult?.status === "SUCCESS" && Number.isSafeInteger(tx.block?.height) && tx.block.height > 0);
    assert(decode(tx.raw).equals(bytes) && tx.contractActions?.length === 1);
    const action = tx.contractActions[0]; assert(action.__typename === "ContractCall" && normalize(action.address) === address && action.entryPoint === entry);
    const actions = [...(transaction.intents?.values() ?? [])].flatMap(intent => intent.actions);
    assert(actions.length === 1 && actions[0] instanceof ContractCall && actions[0].address === address);
    const call = actions[0], actualEntry = typeof call.entryPoint === "string" ? call.entryPoint : Buffer.from(call.entryPoint).toString("utf8");
    assert(actualEntry === entry);
    const clockSeconds = BigInt(Math.floor(Date.parse(journal.attemptedAtUtc) / 1000));
    assert(clockSeconds > 0n && [...transaction.intents!.values()].every(intent => intent.ttl.getTime() > Number(clockSeconds) * 1000));
    return { id: id as string, call, clockSeconds, state: ContractState.deserialize(decode(action.state)),
      height: tx.block.height as number, parameters: LedgerParameters.deserialize(decode(tx.block.ledgerParameters)) };
  }
  const current = ledger(input.currentState.data);
  assert(current.proofModules.member(input.moduleKey));
  assert.equal(current.proofModules.lookup(input.moduleKey).lifecycleStatus, input.expectedModuleStatus);
  let before = await exact(8, "beginM4Activation");
  const firstFamily = ledger(before.state.data).proofModules.member(input.moduleKey);
  const proofRound = firstFamily ? 9 : 18;
  if (!firstFamily) before = await exact(17, "beginM4Activation");
  assert(ledger(before.state.data).proofModules.member(input.moduleKey));
  assert.equal(ledger(before.state.data).proofModules.lookup(input.moduleKey).lifecycleStatus, 4n);
  const proved = await exact(proofRound, "stageM4ActivationBinding"); assert(proved.height > before.height);
  const info = JSON.parse(await readFile(new URL("../packages/midnight-authorization/contracts/managed/permio-authorization/compiler/contract-info.json", import.meta.url), "utf8"));
  const route = info.ledger.find((field: any) => field.name === "proofModules").index as number[];
  assert.deepEqual(route, [0, 4]);
  const original = before.state.data.state.encode();
  const run = (encodedState: Encoded) => auditM6PublicCallReadSet({ call: proved.call, encodedState,
    parameters: before.parameters, clockSeconds: proved.clockSeconds });
  const control = run(original); assert(control.accepted, "Exact historical binding program must pass before module substitution");
  const projected = copyM6PublicMapEntryForAudit(original, input.currentState.data.state.encode(), route, input.moduleKey);
  const changed = run(projected);
  assert.equal(changed.accepted, input.expectedModuleStatus === 4n);
  const restored = run(copyM6PublicMapEntryForAudit(projected, original, route, input.moduleKey)); assert(restored.accepted);
  return { kind: "m6-deprecated-module-admission-audit", observedAtUtc: new Date().toISOString(), contract: address,
    moduleKey: Buffer.from(input.moduleKey).toString("hex"), actualIndexedModuleStatus: Number(input.expectedModuleStatus),
    exactHistoricalFinalizedBytesReconciled: true, sourceStageRound: proofRound, sourceStageTransactionId: proved.id,
    controlBlock: before.height, provedStageBlock: proved.height, historicalControlAccepted: control.accepted,
    actualModuleRecordProjectionAccepted: changed.accepted, restoringOnlyModuleRecordAcceptsAgain: restored.accepted,
    currentStateSha256: hash(input.currentState.serialize()), boundary: "public-vm-readset-not-native-transaction-validation",
    clockHeldInsideOriginalSignedWindow: true, nativeSubmissions: 0, proofsRequested: 0, privateValuesLogged: false };
}
