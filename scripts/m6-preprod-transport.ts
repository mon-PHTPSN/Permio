import { WebSocket, type RawData } from 'ws';
import { PreprodConnectionProfile } from '../packages/midnight-authorization/src/preprod-profile.ts';

type SocketFactory = (url: string, protocol?: string) => WebSocket;
type TransportResult = Readonly<{ passed: boolean; category: string; blockHeight?: number; queryBlockHeight?: number }>;
export interface PreprodTransportDependencies { readonly fetch?: typeof fetch; readonly socket?: SocketFactory }

/** Public readiness fields only; never return a URL, provider body, RPC error or websocket error text. */
export async function probePreprodTransports(profile: PreprodConnectionProfile,
  dependencies: PreprodTransportDependencies = {}) {
  const env = profile.environmentForSdk();
  const request = dependencies.fetch ?? fetch;
  const socket = dependencies.socket ?? ((url, protocol) => {
    const options = { followRedirects: false, handshakeTimeout: 15_000, maxPayload: 262_144 };
    return protocol ? new WebSocket(url, protocol, options) : new WebSocket(url, options);
  });
  async function rpc(method: string, params: unknown[] = []): Promise<unknown> {
    const response = await request(env.node, { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }), signal: AbortSignal.timeout(15_000), redirect: 'error' });
    if (!response.ok) throw Error('rpc-http');
    const body = await response.json() as { error?: unknown; result?: unknown };
    if (body.error || body.result === undefined) throw Error('rpc-rejected');
    return body.result;
  }
  const http: { passed: boolean; genesisHash?: string; ledgerVersion?: string; category: string } = { passed: false, category: 'not-checked' };
  try {
    const genesis = await rpc('chain_getBlockHash', [0]);
    const ledger = await rpc('midnight_ledgerVersion');
    if (typeof genesis !== 'string' || !/^0x[0-9a-f]{64}$/.test(genesis) ||
      typeof ledger !== 'string' || !/^8\.[0-9]+\.[0-9]+$/.test(ledger)) throw Error('unexpected-rpc-shape');
    Object.assign(http, { passed: true, genesisHash: genesis, ledgerVersion: ledger, category: 'rpc-observed' });
  } catch { http.category = 'rpc-unavailable-or-unexpected-response'; }

  function websocket(kind: 'node' | 'indexer'): Promise<TransportResult> {
    return new Promise(resolve => {
      let ws: WebSocket | undefined, finished = false, subscription: string | undefined, queryHeight: number | undefined;
      const finish = (result: TransportResult) => {
        if (finished) return;
        finished = true; clearTimeout(timer);
        if (ws) { ws.removeAllListeners(); ws.on('error', () => undefined); ws.terminate(); }
        resolve(result);
      };
      const timer = setTimeout(() => finish({ passed: false, category: 'bounded-transport-timeout' }), 20_000);
      try {
        ws = socket(kind === 'node' ? env.nodeWS : env.indexerWS, kind === 'indexer' ? 'graphql-transport-ws' : undefined);
        ws.on('error', () => finish({ passed: false, category: 'websocket-transport-failed' }));
        ws.on('close', () => finish({ passed: false, category: 'websocket-closed-before-result' }));
        ws.on('open', () => {
          try { ws!.send(JSON.stringify(kind === 'node'
            ? { jsonrpc: '2.0', id: 11, method: 'chain_subscribeNewHeads', params: [] }
            : { type: 'connection_init' })); }
          catch { finish({ passed: false, category: 'websocket-send-failed' }); }
        });
        ws.on('message', (raw: RawData) => {
          try {
            if (raw.toString().length > 262_144) throw Error('oversized');
            const message = JSON.parse(raw.toString());
            if (kind === 'node') {
              if (message.id === 11 && typeof message.result === 'string') { subscription = message.result; return; }
              if (message.error) { finish({ passed: false, category: 'node-subscription-rejected' }); return; }
              if (subscription && message.method === 'chain_newHead' && message.params?.subscription === subscription) {
                const value = message.params.result?.number;
                if (typeof value !== 'string' || !/^0x[0-9a-f]+$/i.test(value) || BigInt(value) > BigInt(Number.MAX_SAFE_INTEGER)) throw Error('height');
                ws!.send(JSON.stringify({ jsonrpc: '2.0', id: 12, method: 'chain_unsubscribeNewHeads', params: [subscription] }));
                finish({ passed: true, category: 'node-new-head-subscription-observed', blockHeight: Number(BigInt(value)) });
              }
            } else if (message.type === 'connection_ack') {
              ws!.send(JSON.stringify({ id: 'm6-readonly', type: 'subscribe', payload: { query: 'query { block { height } }' } }));
            } else if (message.type === 'next' && message.id === 'm6-readonly') {
              const height = message.payload?.data?.block?.height;
              if (queryHeight !== undefined || message.payload.errors || !Number.isSafeInteger(height) || height < 0 || height > 0x7fffffff) throw Error('graphql-response');
              queryHeight = height;
              ws!.send(JSON.stringify({ id: 'm6-readonly', type: 'complete' }));
              // Pinned Midnight.js 4.1.1 schema: blocks(offset: BlockOffset). Start at the
              // just-observed public height, never replay from genesis for a transport check.
              ws!.send(JSON.stringify({ id: 'm6-blocks', type: 'subscribe', payload: {
                query: 'subscription M6_READONLY_BLOCKS($offset: BlockOffset!) { blocks(offset: $offset) { height } }',
                variables: { offset: { height } },
              } }));
            } else if (message.type === 'next' && message.id === 'm6-blocks') {
              const height = message.payload?.data?.blocks?.height;
              if (queryHeight === undefined || message.payload.errors || !Number.isSafeInteger(height) || height < queryHeight) throw Error('graphql-subscription-response');
              ws!.send(JSON.stringify({ id: 'm6-blocks', type: 'complete' }));
              finish({ passed: true, category: 'indexer-block-subscription-observed', blockHeight: height, queryBlockHeight: queryHeight });
            } else if (message.type === 'complete' && message.id === 'm6-blocks') {
              finish({ passed: false, category: 'indexer-subscription-completed-without-result' });
            } else if (message.type === 'error' || message.type === 'connection_error') {
              finish({ passed: false, category: 'indexer-websocket-rejected' });
            }
          } catch { finish({ passed: false, category: 'unexpected-websocket-response' }); }
        });
      } catch { finish({ passed: false, category: 'websocket-initialization-failed' }); }
    });
  }
  const [nodeSubscription, indexerSubscription] = await Promise.all([websocket('node'), websocket('indexer')]);
  return { kind: 'm6-preprod-readonly-transport-readiness', networkId: 'preprod', providerId: 'blockfrost-midnight-preprod-v1',
    http, nodeSubscription, indexerSubscription, walletLoaded: false, proofGenerated: false,
    transactionSubmitted: false, indexerSubscriptionVerified: indexerSubscription.passed, milestoneComplete: false } as const;
}
