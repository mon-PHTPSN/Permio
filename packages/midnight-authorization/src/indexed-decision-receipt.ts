import assert from "node:assert/strict";
import { isDeepStrictEqual } from "node:util";
import { ContractCall, Transaction,
  type AlignedValue, type Op } from "@midnight-ntwrk/midnight-js-protocol/ledger";
import { Bytes32Descriptor, CompactTypeBoolean, CompactTypeUnsignedInteger, ContractState, StateValue } from "@midnight-ntwrk/midnight-js-protocol/compact-runtime";
import { getNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import type { PublicDataProvider } from "@midnight-ntwrk/midnight-js-types";
import { ledger } from "../contracts/managed/permio-authorization/contract/index.js";
import { runtimeDecisionReceiptAlignedValue, runtimeDecisionReceiptId,
  type DecisionReceiptSourceReader, type RuntimeDecisionReceiptBody } from "./decision-receipt.ts";
import type { Hex32 } from "./model.ts";
import { PreprodConnectionProfile } from "./preprod-profile.ts";
import { IndexedReceiptUnavailableError, isTransientIndexedReceiptRead, readIndexedReceiptPayload } from "./indexed-receipt-read.ts";

const index = new CompactTypeUnsignedInteger(255n, 1);
const alignedIndex = (value: bigint): AlignedValue => ({ value: index.toValue(value), alignment: index.alignment() });
const alignedId = (value: Uint8Array): AlignedValue => ({ value: Bytes32Descriptor.toValue(value), alignment: Bytes32Descriptor.alignment() });
const cell = (value: AlignedValue) => StateValue.newCell(value).encode();

/** Version-specific public VM reconciliation, not a caller's claimed receipt result. */
export function assertV9DecisionReceiptInsertion(program: readonly Op<AlignedValue>[], body: RuntimeDecisionReceiptBody): void {
  const receiptId = Uint8Array.from(Buffer.from(runtimeDecisionReceiptId(body).slice(2), "hex"));
  // These exact indices are the compiler-generated v9 public ledger layout.
  const path = [{ tag: "value" as const, value: alignedIndex(1n) }, { tag: "value" as const, value: alignedIndex(13n) }];
  const absent: Op<AlignedValue>[] = [
    { dup: { n: 0 } }, { idx: { cached: false, pushPath: false, path } },
    { push: { storage: false, value: cell(alignedId(receiptId)) } }, "member",
    { popeq: { cached: true, result: { value: CompactTypeBoolean.toValue(false), alignment: CompactTypeBoolean.alignment() } } },
  ];
  const insertion: Op<AlignedValue>[] = [
    { idx: { cached: false, pushPath: true, path } },
    { push: { storage: false, value: cell(alignedId(receiptId)) } },
    { push: { storage: true, value: cell(runtimeDecisionReceiptAlignedValue(body)) } },
    { ins: { cached: false, n: 1 } }, { ins: { cached: true, n: 2 } },
  ];
  const matches = (needle: readonly Op<AlignedValue>[]) => program.flatMap((_, offset) =>
    isDeepStrictEqual(program.slice(offset, offset + needle.length), needle) ? [offset] : []);
  const reads = matches(absent), writes = matches(insertion);
  assert(reads.length === 1 && writes.length === 1 && reads[0]! < writes[0]!,
    "Exact v9 action did not prove absence and insert this receipt body");
}

/**
 * Read-only adapter for the configured trusted indexer. Reconciles SDK finality,
 * serialized transaction identity, exact call/state and the receipt insertion.
 * It is not a self-verifying consensus light client and performs no submission.
 */
export function createIndexedDecisionReceiptReader(input: {
  readonly network: "preprod" | "undeployed";
  readonly indexerUrl?: string;
  readonly profile?: PreprodConnectionProfile;
  readonly publicDataProvider: PublicDataProvider;
  readonly contract: Hex32;
  readonly receiptId: Hex32;
}): DecisionReceiptSourceReader {
  const { network, publicDataProvider, contract, receiptId } = input;
  assert(network !== "preprod" || input.profile instanceof PreprodConnectionProfile);
  assert(network !== "preprod" || input.indexerUrl === undefined, "Use the existing authenticated Preprod profile");
  const url = new URL(network === "preprod" ? input.profile!.environmentForSdk().indexer : input.indexerUrl!);
  if (network === "undeployed") assert(!url.username && !url.password && !url.search && !url.hash &&
    url.pathname === "/api/v4/graphql" && url.protocol === "http:" && ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname));
  assert(/^0x[0-9a-f]{64}$/.test(contract) && /^0x[0-9a-f]{64}$/.test(receiptId));
  return { async readReceiptAtTransaction(transactionId) {
    let stage = "source-and-finality";
    try {
    assert(/^[0-9a-f]{66}$/.test(transactionId) && getNetworkId() === network);
    // The SDK retains its specified indefinite watch behavior; callers may put
    // their own application deadline around this read-only operation.
    const finalized = await publicDataProvider.watchForTxData(transactionId);
    assert(finalized.status === "SucceedEntirely" && finalized.identifiers.includes(transactionId) &&
      finalized.tx.identifiers().includes(transactionId) && Number.isSafeInteger(finalized.blockHeight) && finalized.blockHeight > 0);
    stage = "exact-indexer-transaction";
    const payload = await readIndexedReceiptPayload(url, transactionId);
    const normalize = (value: unknown): string => typeof value === "string" ? value.replace(/^0x/, "") : "";
    const matches = payload.data.transactions.filter((tx: any) => Array.isArray(tx.identifiers) &&
      tx.identifiers.some((id: unknown) => normalize(id) === transactionId));
    assert(matches.length === 1, "Indexer did not return the exact transaction once");
    const tx = matches[0];
    // Qualified on finalized Preprod call3036936: indexer protocol1000300.
    // The pinned Local Dev fixture uses1000000. Unknown versions fail closed.
    assert(tx.protocolVersion === (network === "preprod" ? 1000300 : 1000000) && tx.transactionResult?.status === "SUCCESS" &&
      normalize(tx.hash) === normalize(finalized.txHash) && normalize(tx.block?.hash) === normalize(finalized.blockHash) &&
      tx.block.height === finalized.blockHeight && tx.contractActions?.length === 1);
    const action = tx.contractActions[0];
    assert(action.__typename === "ContractCall" && normalize(action.address) === contract.slice(2) &&
      action.entryPoint === "executeRuntimeAction", "Receipt source must be the exact ordinary-action entry");
    const raw = normalize(tx.raw), state = normalize(action.state);
    assert(/^[0-9a-f]+$/.test(raw) && raw.length % 2 === 0 && raw.length <= 8 * 1024**2 &&
      /^[0-9a-f]+$/.test(state) && state.length % 2 === 0);
    stage = "serialized-call-and-state";
    const decoded = Transaction.deserialize("signature", "proof", "binding", Buffer.from(raw, "hex"));
    assert(decoded.identifiers().includes(transactionId));
    const calls = [...(decoded.intents?.values() ?? [])].flatMap(intent => intent.actions);
    assert(calls.length === 1 && calls[0] instanceof ContractCall);
    const call = calls[0];
    const entry = typeof call.entryPoint === "string" ? call.entryPoint : Buffer.from(call.entryPoint).toString("utf8");
    assert(call.address === contract.slice(2) && entry === "executeRuntimeAction");
    const view = ledger(ContractState.deserialize(Buffer.from(state, "hex")).data);
    const key = Buffer.from(receiptId.slice(2), "hex");
    assert(view.decisionReceipts.member(key), "Receipt is absent from this exact call state");
    const body = view.decisionReceipts.lookup(key);
    assert(runtimeDecisionReceiptId(body) === receiptId);
    const programs = [call.guaranteedTranscript?.program, call.fallibleTranscript?.program].filter(Boolean);
    stage = "receipt-creation-transcript";
    // Partition boundaries must not be crossed to fabricate an instruction match.
    assert(programs.some(program => {
      try { assertV9DecisionReceiptInsertion(program!, body); return true; } catch { return false; }
    }), "Receipt was not created by this exact call transcript");
    return { network, contract, transactionId, ledgerSequence: BigInt(finalized.blockHeight),
      finalized: true, transactionSucceeded: true, receiptIdFromCall: receiptId, bodyAtTransaction: body };
    } catch (error) {
      if (error instanceof IndexedReceiptUnavailableError ||
          stage === "source-and-finality" && isTransientIndexedReceiptRead(error)) {
        throw new IndexedReceiptUnavailableError();
      }
      // The authenticated profile contains a provider credential in its URL.
      // Preserve a useful fixed stage without forwarding fetch/SDK error data.
      throw Error(`Indexed decision receipt verification failed at ${stage}; transport details withheld`);
    }
  } };
}
