import { isDeepStrictEqual } from "node:util";
import { ContractCall, Transaction } from "@midnight-ntwrk/midnight-js-protocol/ledger";
import { Bytes32Descriptor, CompactTypeUnsignedInteger, ContractState, persistentHash, type Alignment, type Value } from "@midnight-ntwrk/midnight-js-protocol/compact-runtime";
import type { FinalizedTxData, PublicDataProvider } from "@midnight-ntwrk/midnight-js-types";
import { ledger, pureCircuits as pure, type TemplateRegistryTarget } from "../../midnight-authorization/contracts/managed/permio-authorization/contract/index.js";
import { runtimeDecisionReceiptId, type DecisionReceipt, type DecisionReceiptSourceReader, type RuntimeDecisionReceiptBody } from "../../midnight-authorization/src/decision-receipt.ts";
import { assertV9DecisionReceiptInsertion, createIndexedDecisionReceiptReader } from "../../midnight-authorization/src/indexed-decision-receipt.ts";
import { IndexedReceiptUnavailableError, isTransientIndexedReceiptRead } from "../../midnight-authorization/src/indexed-receipt-read.ts";
import type { Hex32 } from "../../midnight-authorization/src/model.ts";
import { PreprodConnectionProfile } from "../../midnight-authorization/src/preprod-profile.ts";
import { GatewaySourceError } from "./errors.ts";
import type { GatewayCheckpoint } from "./durable-store.ts";
import type { GatewayObserverDependencies, FinalizedReceiptBatch } from "./observer.ts";
import { encodeM6ReceiptV1 } from "./m6-receipt-codec.ts";

/** Official indexer v4.3.3 ingests node.finalized_blocks, not best-chain heads.
 * Pin: midnightntwrk/midnight-indexer/v4.3.3/chain-indexer/src/application.rs:208.
 * This trusts that configured service and the pinned SDK; it is not a consensus light client.
 */
export const INDEXED_GATEWAY_FINALITY_POLICY = "trusted-finalized-only-midnight-indexer" as const;
export interface IndexedGatewaySourceConfiguration {
  readonly network: "preprod" | "undeployed";
  readonly contract: Hex32;
  readonly startBlock: number;
  readonly finalityPolicy: typeof INDEXED_GATEWAY_FINALITY_POLICY;
  readonly publicDataProvider: PublicDataProvider;
  readonly profile?: PreprodConnectionProfile;
  readonly indexerUrl?: string;
  /** Application wait bound; the SDK watcher itself retains its indefinite-wait contract. */
  readonly transactionLookupTimeoutMilliseconds?: number;
}
const rejected = (): never => { throw new GatewaySourceError("REJECTED"); };
const integrity = (): never => { throw new GatewaySourceError("INTEGRITY"); };
const normalize = (value: unknown): string => typeof value === "string" ? value.replace(/^0x/, "") : "";
function hash(value: unknown): Hex32 {
  const result = normalize(value); if (!/^[0-9a-f]{64}$/.test(result)) return rejected(); return `0x${result}`;
}
function height(value: unknown): number {
  if (!Number.isSafeInteger(value) || (value as number) <= 0 || (value as number) > 2 ** 31 - 1) return rejected();
  return value as number;
}
function binary(value: unknown, maxBytes = 4 * 1024 ** 2): Buffer {
  const result = normalize(value);
  if (!/^[0-9a-f]+$/.test(result) || result.length % 2 || result.length > maxBytes * 2) return rejected();
  return Buffer.from(result, "hex");
}
function urlFor(config: IndexedGatewaySourceConfiguration): URL {
  if (!/^0x[0-9a-f]{64}$/.test(config.contract) || config.finalityPolicy !== INDEXED_GATEWAY_FINALITY_POLICY) return rejected();
  height(config.startBlock);
  if (config.network === "preprod") {
    if (!(config.profile instanceof PreprodConnectionProfile) || config.indexerUrl !== undefined) return rejected();
    return new URL(config.profile.environmentForSdk().indexer);
  }
  if (config.network !== "undeployed" || typeof config.indexerUrl !== "string") return rejected();
  const url = new URL(config.indexerUrl);
  if (url.username || url.password || url.search || url.hash || url.pathname !== "/api/v4/graphql" || url.protocol !== "http:" ||
      !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname)) return rejected();
  return url;
}
const BLOCK_QUERY = `query GatewayFinalizedBlock($offset: BlockOffset!) {
  block(offset: $offset) { hash height protocolVersion parent { hash height }
    transactions { __typename protocolVersion hash raw
      contractActions { __typename address state ... on ContractCall { entryPoint } }
      ... on RegularTransaction { identifiers transactionResult { status } }
    }
  }
}`;
const CHECKPOINT_QUERY = `query GatewayCheckpoint($offset: BlockOffset!) {
  block(offset: $offset) { hash height protocolVersion parent { hash height } }
}`;
async function readBlock(url: URL, at: number, query = BLOCK_QUERY): Promise<any | null> {
  try {
    const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json" },
      signal: AbortSignal.timeout(30_000), body: JSON.stringify({ query, variables: { offset: { height: at } } }) });
    if ([429, 502, 503, 504].includes(response.status)) { await response.body?.cancel(); throw new IndexedReceiptUnavailableError(); }
    if (!response.ok) { await response.body?.cancel(); return rejected(); }
    const text = await response.text(); if (text.length > 32 * 1024 ** 2) return rejected();
    const payload = JSON.parse(text);
    if (!payload || payload.errors || !payload.data || !("block" in payload.data)) return rejected();
    return payload.data.block;
  } catch (error) {
    if (error instanceof IndexedReceiptUnavailableError || isTransientIndexedReceiptRead(error)) throw new IndexedReceiptUnavailableError();
    if (error instanceof GatewaySourceError) throw error;
    return rejected();
  }
}
interface Descriptor<T> { alignment(): Alignment; toValue(value: T): Value; fromValue(value: Value): T }
const uint64 = new CompactTypeUnsignedInteger(2n ** 64n - 1n, 8);
const templateDescriptor: Descriptor<TemplateRegistryTarget> = {
  alignment: () => [...Bytes32Descriptor.alignment(), ...Bytes32Descriptor.alignment(), ...uint64.alignment(), ...uint64.alignment(), ...uint64.alignment(), ...Bytes32Descriptor.alignment()],
  toValue: value => [...Bytes32Descriptor.toValue(value.namespaceHash), ...Bytes32Descriptor.toValue(value.templateIdHash), ...uint64.toValue(value.semanticVersion.major), ...uint64.toValue(value.semanticVersion.minor), ...uint64.toValue(value.semanticVersion.patch), ...Bytes32Descriptor.toValue(value.templateContentHash)],
  fromValue: value => ({ namespaceHash: Bytes32Descriptor.fromValue(value), templateIdHash: Bytes32Descriptor.fromValue(value), semanticVersion: { major: uint64.fromValue(value), minor: uint64.fromValue(value), patch: uint64.fromValue(value) }, templateContentHash: Bytes32Descriptor.fromValue(value) }),
};
function checkpointHeight(checkpoint: GatewayCheckpoint): number {
  const at = Number(checkpoint.sequence);
  if (!/^[1-9][0-9]*$/.test(checkpoint.sequence) || checkpoint.cursor !== `midnight-block:${checkpoint.sequence}` || String(at) !== checkpoint.sequence) return rejected();
  hash(checkpoint.blockHash); return height(at);
}

/** Real configured-indexer adapter. Only receipt-producing transactions are reconciled again by the authoritative M6 reader. */
export function createIndexedGatewaySource(input: IndexedGatewaySourceConfiguration): Pick<GatewayObserverDependencies, "discovery" | "receiptReader" | "historicalStatus"> {
  const config = Object.freeze({ ...input });
  const url = urlFor(config), protocol = config.network === "preprod" ? 1000300 : 1000000;
  const transactionLookupTimeoutMilliseconds = config.transactionLookupTimeoutMilliseconds ?? 30_000;
  if (!Number.isSafeInteger(transactionLookupTimeoutMilliseconds) || transactionLookupTimeoutMilliseconds <= 0 ||
      transactionLookupTimeoutMilliseconds > 2 ** 31 - 1) return rejected();
  const pendingLookups = new Map<string, Promise<FinalizedTxData>>();
  async function finalizedTransaction(transactionId: string): Promise<FinalizedTxData> {
    let pending = pendingLookups.get(transactionId);
    if (!pending) {
      pending = Promise.resolve().then(() => config.publicDataProvider.watchForTxData(transactionId));
      pendingLookups.set(transactionId, pending);
    }
    const timeout = new IndexedReceiptUnavailableError();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const result = await Promise.race([pending, new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => reject(timeout), transactionLookupTimeoutMilliseconds);
      })]);
      if (pendingLookups.get(transactionId) === pending) pendingLookups.delete(transactionId);
      return result;
    } catch (error) {
      // A timed-out caller leaves one SDK watch available for the next retry, including a late result.
      if (error !== timeout && pendingLookups.get(transactionId) === pending) pendingLookups.delete(transactionId);
      throw error;
    } finally { clearTimeout(timer); }
  }
  type DiscoveredCall = { readonly receiptId: Hex32; readonly txHash: Hex32; readonly blockHash: Hex32;
    readonly height: number; readonly body: RuntimeDecisionReceiptBody;
    readonly status: { readonly templateActive: boolean; readonly moduleActive: boolean }; verified: boolean };
  let discovered = new Map<string, DiscoveredCall>();
  function eligibility(view: ReturnType<typeof ledger>, body: RuntimeDecisionReceiptBody) {
    const templateKey = persistentHash(templateDescriptor, body.target), moduleKey = pure.proofModuleRegistryKeyFromIdentity(body.moduleIdentity);
    const template = view.activeTemplates.member(templateKey) ? view.activeTemplates.lookup(templateKey) : null;
    const module = view.proofModules.member(moduleKey) ? view.proofModules.lookup(moduleKey) : null;
    return Object.freeze({
      templateActive: template !== null && isDeepStrictEqual(template.target, body.target) && [1n, 2n].includes(template.lifecycleStatus),
      moduleActive: module !== null && isDeepStrictEqual(module.identity, body.moduleIdentity) && module.lifecycleStatus === 4n,
    });
  }
  function validateBlock(block: any, at: number, requireTransactions = true): void {
    if (!block || height(block.height) !== at || block.protocolVersion !== protocol || (requireTransactions && !Array.isArray(block.transactions)) ||
        !block.parent || block.parent.height !== at - 1) return rejected();
    hash(block.hash); hash(block.parent.hash);
  }
  const receiptReader: DecisionReceiptSourceReader = { async readReceiptAtTransaction(transactionId) {
    const record = discovered.get(transactionId); if (!record) return rejected();
    let finalized;
    try { finalized = await finalizedTransaction(transactionId); }
    catch (error) {
      if (error instanceof IndexedReceiptUnavailableError || isTransientIndexedReceiptRead(error)) throw new IndexedReceiptUnavailableError();
      return rejected();
    }
    if (finalized.blockHeight !== record.height || hash(finalized.blockHash) !== record.blockHash || hash(finalized.txHash) !== record.txHash ||
        typeof finalized.tx?.transactionHash !== "function" || hash(finalized.tx.transactionHash()) !== record.txHash) return integrity();
    const pinnedProvider: PublicDataProvider = { ...config.publicDataProvider, async watchForTxData(id) {
      if (id !== transactionId) return rejected(); return finalized;
    } };
    const observed = await createIndexedDecisionReceiptReader({ network: config.network, contract: config.contract, receiptId: record.receiptId,
      publicDataProvider: pinnedProvider, ...(config.network === "preprod" ? { profile: config.profile } : { indexerUrl: config.indexerUrl }) }).readReceiptAtTransaction(transactionId);
    if (discovered.get(transactionId) !== record || observed.ledgerSequence !== BigInt(record.height) ||
        !isDeepStrictEqual(observed.bodyAtTransaction, record.body)) return integrity();
    record.verified = true;
    return observed;
  } };
  return {
    receiptReader,
    discovery: {
      async scan(after): Promise<FinalizedReceiptBatch | null> {
        try {
          const at = after === null ? config.startBlock : checkpointHeight(after) + 1;
          height(at);
          const block = await readBlock(url, at); if (block === null) return null;
          validateBlock(block, at);
          if (after && hash(block.parent.hash) !== after.blockHash) return integrity();
          const events: { transactionId: string; receiptId: Hex32; eventIndex: number }[] = [], seen = new Set<string>();
          const nextDiscovered = new Map<string, DiscoveredCall>();
          for (const tx of block.transactions) {
            if (!tx || !Array.isArray(tx.contractActions)) return rejected();
            for (const action of tx.contractActions) {
              if (!action || !["ContractCall", "ContractDeploy", "ContractUpdate"].includes(action.__typename)) return rejected();
              hash(action.address);
              if (action.__typename === "ContractCall" && typeof action.entryPoint !== "string") return rejected();
            }
            const txHash = hash(tx.hash); if (seen.has(txHash)) return rejected(); seen.add(txHash);
            const actions = tx.contractActions.filter((action: any) => action?.__typename === "ContractCall" && normalize(action.address) === config.contract.slice(2) && action.entryPoint === "executeRuntimeAction");
            if (actions.length === 0) continue;
            if (actions.length !== 1 || tx.contractActions.length !== 1 || tx.__typename !== "RegularTransaction" || tx.protocolVersion !== protocol ||
                !["SUCCESS", "FAILURE", "PARTIAL_SUCCESS"].includes(tx.transactionResult?.status)) return rejected();
            if (tx.transactionResult.status !== "SUCCESS") continue;
            const decoded = Transaction.deserialize("signature", "proof", "binding", binary(tx.raw));
            if (normalize(decoded.transactionHash()) !== txHash.slice(2)) return rejected();
            const calls = [...(decoded.intents?.values() ?? [])].flatMap(intent => intent.actions);
            if (calls.length !== 1 || !(calls[0] instanceof ContractCall)) return rejected();
            const call = calls[0], entry = typeof call.entryPoint === "string" ? call.entryPoint : Buffer.from(call.entryPoint).toString("utf8");
            if (call.address !== config.contract.slice(2) || entry !== "executeRuntimeAction") return rejected();
            const ids = decoded.identifiers();
            if (!Array.isArray(tx.identifiers) || tx.identifiers.length !== ids.length) return rejected();
            const indexedIds = new Set(tx.identifiers.map(normalize));
            if (indexedIds.size !== ids.length || !ids.every(id => indexedIds.has(id))) return rejected();
            const callIntents = [...(decoded.intents ?? [])].filter(([, intent]) => intent.actions.length > 0);
            if (callIntents.length !== 1) return rejected();
            const [segment, intent] = callIntents[0]!;
            // The public SDK preserves each intent's binding commitment when erasing proofs.
            // Use an ephemeral copy to isolate the call ID from balancing intents/Zswap IDs.
            // Authorization and VM reconciliation below always use the original bound call.
            const identityOnly = decoded.eraseProofs();
            identityOnly.intents = new Map([[segment, intent.eraseProofs()]]);
            identityOnly.guaranteedOffer = undefined;
            identityOnly.fallibleOffer = undefined;
            const callIds = identityOnly.identifiers();
            if (callIds.length !== 1 || !/^[0-9a-f]{66}$/.test(callIds[0]!) || !ids.includes(callIds[0]!)) return rejected();
            const transactionId = callIds[0]!;
            const view = ledger(ContractState.deserialize(binary(actions[0].state, 8 * 1024 ** 2)).data);
            const programs = [call.guaranteedTranscript?.program, call.fallibleTranscript?.program].filter(Boolean);
            const inserted = [...view.decisionReceipts].filter(([, body]) => programs.some(program => {
              try { assertV9DecisionReceiptInsertion(program!, body); return true; } catch { return false; }
            }));
            if (inserted.length !== 1) return rejected();
            const [key, body] = inserted[0]!, receiptId = runtimeDecisionReceiptId(body);
            if (`0x${Buffer.from(key).toString("hex")}` !== receiptId) return rejected();
            if (events.some(event => event.transactionId === transactionId || event.receiptId === receiptId)) return rejected();
            nextDiscovered.set(transactionId, { receiptId, txHash, blockHash: hash(block.hash), height: at, body,
              status: eligibility(view, body), verified: false });
            events.push({ transactionId, receiptId, eventIndex: 0 });
          }
          discovered = nextDiscovered;
          return { checkpoint: { cursor: `midnight-block:${at}`, sequence: String(at), blockHash: hash(block.hash) }, events };
        } catch (error) {
          if (error instanceof IndexedReceiptUnavailableError || error instanceof GatewaySourceError) throw error;
          return rejected();
        }
      },
      async verifyCheckpoint(checkpoint) {
        const at = checkpointHeight(checkpoint), block = await readBlock(url, at, CHECKPOINT_QUERY);
        if (block === null) throw new IndexedReceiptUnavailableError();
        validateBlock(block, at, false); return hash(block.hash) === checkpoint.blockHash;
      },
    },
    historicalStatus: { async read(receipt: DecisionReceipt) {
      try {
        encodeM6ReceiptV1(receipt);
        const record = discovered.get(receipt.sourceTransaction);
        if (!record || !record.verified || record.receiptId !== receipt.receiptId ||
            receipt.sourceNetwork !== config.network || receipt.sourceContract !== config.contract ||
            receipt.sourceLedgerSequence !== String(record.height)) return rejected();
        // Eligibility is cached from the exact scan state whose receipt insertion
        // and SDK transaction/block were reconciled above. Never re-read latest or block-end state.
        return { sourceLedgerSequence: receipt.sourceLedgerSequence, templateRegistry: config.contract,
          proofModuleRegistry: config.contract, ...record.status };
      } catch (error) {
        if (error instanceof IndexedReceiptUnavailableError || error instanceof GatewaySourceError) throw error;
        return rejected();
      }
    } },
  };
}