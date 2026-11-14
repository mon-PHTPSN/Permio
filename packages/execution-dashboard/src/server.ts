import { readFile } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ApplicationError, ApplicationStore, type Account } from "./application.ts";

export const LOCAL_CHAIN_ID = 31_337;
export const LOCAL_REGISTRY_ADDRESS = "0x5fbdb2315678afecb367f032d93f642f64180aa3";
export const DEFAULT_GRAPHQL_URL = "http://127.0.0.1:8080/v1/graphql";
export const FIXTURE_BOUNDARY_LABEL = "Local Hardhat 31337 · Expected M6/M7 fixture";

const DEFAULT_PORT = 4_178;
const DEFAULT_FRESHNESS_SECONDS = 90;
const PUBLIC_DIRECTORY = fileURLToPath(new URL("../web", import.meta.url));

export const DASHBOARD_QUERY = `query M8ProductReadModel {
  _meta {
    chainId
    isReady
    progressBlock
    progressBlockTime
    sourceBlock
    eventsProcessed
  }
  ReceiptProjection(order_by: {registeredBlock: desc}, limit: 50) {
    id
    registry
    receiptVersion
    recipient
    actionSchemaId
    purposeHash
    validAfter
    validBefore
    gatewayKeyId
    gatewaySigner
    gatewaySignedAt
    registeredAt
    registeredBlock
    registeredTransaction
    sourceNetwork
    sourceNetworkName
    sourceContract
    sourceTransaction
    sourceLedgerSequence
    namespaceHash
    templateContentHash
    proofModuleImplementationHash
    instanceCommitment
    previousStateCommitment
    nextStateCommitment
    transitionSequence
    contextHash
    scopedNullifier
    outputCommitment
    templateIdHash
    templateVersion
    proofModuleId
    proofModuleVersion
    revoked
    consumed
    executionId
  }
  ExecutionProjection(order_by: {blockNumber: desc}, limit: 50) {
    id
    registry
    receiptId
    adapter
    actionSchemaId
    relayer
    recipient
    success
    resultCommitment
    errorHash
    executedAt
    blockNumber
    transactionHash
  }
  TimeBucketAggregate(order_by: {bucketStart: desc}, limit: 24) {
    id
    registry
    bucketKind
    bucketStart
    actionSchemaId
    receiptsRegistered
    executionAttempts
    executionSuccesses
    executionFailures
    receiptsRevoked
    updatedAt
    updatedBlock
  }
}`;

interface GraphQlResponse {
  readonly data?: {
    readonly _meta?: readonly {
      readonly chainId?: number | null;
      readonly isReady?: boolean | null;
      readonly progressBlock?: number | null;
      readonly progressBlockTime?: string | number | null;
      readonly sourceBlock?: number | null;
      readonly eventsProcessed?: number | null;
    }[];
    readonly ReceiptProjection?: readonly Record<string, unknown>[];
    readonly ExecutionProjection?: readonly Record<string, unknown>[];
    readonly TimeBucketAggregate?: readonly Record<string, unknown>[];
  };
  readonly errors?: readonly { readonly message?: string }[];
}

export interface DashboardConfig {
  readonly graphqlUrl: string;
  readonly graphqlAdminSecret?: string;
  readonly freshnessSeconds: number;
  readonly now: () => Date;
  readonly fetchImplementation: typeof fetch;
  readonly databasePath?: string;
  readonly secureCookies?: boolean;
  readonly localDemo?: boolean;
}

export interface DashboardReadModel {
  readonly status: "available";
  readonly observedAt: string;
  readonly boundary: {
    readonly label: string;
    readonly chainId: number;
    readonly registryAddress: string;
    readonly authoritativeUpstream: false;
  };
  readonly freshness: {
    readonly state: "fresh" | "aging" | "unknown";
    readonly isReady: boolean | null;
    readonly progressBlock: number | null;
    readonly sourceBlock: number | null;
    readonly lagBlocks: number | null;
    readonly progressBlockTime: string | null;
    readonly ageSeconds: number | null;
    readonly thresholdSeconds: number;
  };
  readonly receipts: readonly Record<string, unknown>[];
  readonly executions: readonly Record<string, unknown>[];
  readonly aggregates: readonly Record<string, unknown>[];
}

export interface UnavailableReadModel {
  readonly status: "unavailable";
  readonly observedAt: string;
  readonly boundary: {
    readonly label: string;
    readonly chainId: number;
    readonly registryAddress: string;
    readonly authoritativeUpstream: false;
  };
  readonly message: string;
  readonly detail: string;
  readonly receipts: readonly [];
  readonly executions: readonly [];
  readonly aggregates: readonly [];
}

function isLoopback(url: string): boolean {
  const hostname = new URL(url).hostname;
  return hostname === "127.0.0.1" || hostname === "localhost" || hostname === "::1";
}

export function readDashboardConfig(
  environment: NodeJS.ProcessEnv = process.env,
  overrides: Partial<DashboardConfig> = {},
): DashboardConfig {
  const graphqlUrl = overrides.graphqlUrl ?? environment.PERMIO_ENVIO_GRAPHQL_URL ?? DEFAULT_GRAPHQL_URL;
  const configuredSecret = overrides.graphqlAdminSecret ?? environment.PERMIO_ENVIO_GRAPHQL_ADMIN_SECRET;
  const graphqlAdminSecret = configuredSecret ?? (isLoopback(graphqlUrl) ? "testing" : undefined);
  const freshnessSeconds =
    overrides.freshnessSeconds ??
    Number(environment.PERMIO_ENVIO_FRESHNESS_SECONDS ?? DEFAULT_FRESHNESS_SECONDS);

  if (!Number.isFinite(freshnessSeconds) || freshnessSeconds <= 0) {
    throw new Error("PERMIO_ENVIO_FRESHNESS_SECONDS must be a positive number");
  }
  if (!graphqlAdminSecret && !isLoopback(graphqlUrl)) {
    throw new Error("PERMIO_ENVIO_GRAPHQL_ADMIN_SECRET is required for a non-loopback endpoint");
  }

  return {
    graphqlUrl,
    graphqlAdminSecret,
    freshnessSeconds,
    now: overrides.now ?? (() => new Date()),
    fetchImplementation: overrides.fetchImplementation ?? fetch,
    databasePath: overrides.databasePath ?? environment.PERMIO_APP_DATABASE ?? fileURLToPath(new URL("../.data/application.sqlite", import.meta.url)),
    secureCookies: overrides.secureCookies ?? environment.PERMIO_APP_SECURE_COOKIES === "true",
    localDemo: overrides.localDemo ?? (environment.PERMIO_APP_LOCAL_DEMO !== "false" && ["127.0.0.1", "localhost", "::1"].includes(environment.PERMIO_DASHBOARD_HOST ?? "127.0.0.1")),
  };
}

function parseProgressTime(value: string | number | null | undefined): Date | null {
  if (value === null || value === undefined) return null;
  const numeric = Number(value);
  if (Number.isFinite(numeric)) {
    const milliseconds = numeric > 10_000_000_000 ? numeric : numeric * 1_000;
    const date = new Date(milliseconds);
    return Number.isNaN(date.valueOf()) ? null : date;
  }
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? null : date;
}

function requireArray(
  value: readonly Record<string, unknown>[] | undefined,
  field: string,
): readonly Record<string, unknown>[] {
  if (!Array.isArray(value)) throw new Error(`GraphQL response is missing ${field}`);
  return value;
}

export async function fetchDashboardReadModel(
  config: DashboardConfig,
  receiptIds?: readonly string[],
): Promise<DashboardReadModel> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (config.graphqlAdminSecret) headers["x-hasura-admin-secret"] = config.graphqlAdminSecret;

  const response = await config.fetchImplementation(config.graphqlUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({ query: receiptIds ? DASHBOARD_QUERY
      .replace("ReceiptProjection(order_by:", `ReceiptProjection(where: {id: {_in: ${JSON.stringify(receiptIds)}}}, order_by:`)
      .replace("ExecutionProjection(order_by:", `ExecutionProjection(where: {receiptId: {_in: ${JSON.stringify(receiptIds)}}}, order_by:`)
      .replace(/\s+TimeBucketAggregate\([\s\S]*?\n  }/, "") : DASHBOARD_QUERY }),
    signal: AbortSignal.timeout(5_000),
  });
  if (!response.ok) throw new Error(`GraphQL endpoint returned HTTP ${response.status}`);

  const payload = (await response.json()) as GraphQlResponse;
  if (payload.errors?.length) {
    throw new Error(
      `GraphQL query failed: ${payload.errors.map((error) => error.message ?? "unknown error").join("; ")}`,
    );
  }
  if (!payload.data) throw new Error("GraphQL response did not contain data");

  const observedAt = config.now();
  const metadata = payload.data._meta?.find((item) => item.chainId === LOCAL_CHAIN_ID) ?? payload.data._meta?.[0];
  const progressTime = parseProgressTime(metadata?.progressBlockTime);
  const ageSeconds = progressTime
    ? Math.max(0, Math.floor((observedAt.valueOf() - progressTime.valueOf()) / 1_000))
    : null;
  const progressBlock = metadata?.progressBlock ?? null;
  const sourceBlock = metadata?.sourceBlock ?? null;
  const lagBlocks =
    progressBlock !== null && sourceBlock !== null
      ? Math.max(0, sourceBlock - progressBlock)
      : null;
  const freshnessState =
    metadata?.isReady === false
      ? "aging"
      : lagBlocks !== null
        ? lagBlocks === 0
          ? "fresh"
          : "aging"
        : ageSeconds === null
          ? "unknown"
          : ageSeconds <= config.freshnessSeconds
            ? "fresh"
            : "aging";

  const permitted = receiptIds ? new Set(receiptIds) : null;
  const receipts = requireArray(payload.data.ReceiptProjection, "ReceiptProjection").filter((row) => !permitted || permitted.has(String(row.id)));
  const executions = requireArray(payload.data.ExecutionProjection, "ExecutionProjection").filter((row) => !permitted || permitted.has(String(row.receiptId)));
  const buckets = new Map<number, Record<string, unknown>>();
  if (permitted) {
    for (const [rows, field] of [[receipts, "receiptsRegistered"], [executions, "executionAttempts"]] as const) {
      for (const row of rows) {
        const at = Number(row.registeredAt ?? row.executedAt);
        if (!Number.isFinite(at)) continue;
        const hour = Math.floor(at / 3600) * 3600;
        const bucket = buckets.get(hour) ?? { id: String(hour), bucketStart: hour, receiptsRegistered: 0, executionAttempts: 0, executionSuccesses: 0, executionFailures: 0 };
        bucket[field] = Number(bucket[field]) + 1;
        if (field === "executionAttempts") { const outcome = row.success === true ? "executionSuccesses" : "executionFailures"; bucket[outcome] = Number(bucket[outcome]) + 1; }
        buckets.set(hour, bucket);
      }
    }
  }
  return {
    status: "available",
    observedAt: observedAt.toISOString(),
    boundary: {
      label: FIXTURE_BOUNDARY_LABEL,
      chainId: LOCAL_CHAIN_ID,
      registryAddress: LOCAL_REGISTRY_ADDRESS,
      authoritativeUpstream: false,
    },
    freshness: {
      state: freshnessState,
      isReady: metadata?.isReady ?? null,
      progressBlock,
      sourceBlock,
      lagBlocks,
      progressBlockTime: progressTime?.toISOString() ?? null,
      ageSeconds,
      thresholdSeconds: config.freshnessSeconds,
    },
    receipts, executions,
    aggregates: permitted ? [...buckets.values()].sort((a,b) => Number(b.bucketStart)-Number(a.bucketStart)) : requireArray(payload.data.TimeBucketAggregate, "TimeBucketAggregate"),
  };
}

export function createUnavailableReadModel(
  config: Pick<DashboardConfig, "now">,
  error: unknown,
): UnavailableReadModel {
  return {
    status: "unavailable",
    observedAt: config.now().toISOString(),
    boundary: {
      label: FIXTURE_BOUNDARY_LABEL,
      chainId: LOCAL_CHAIN_ID,
      registryAddress: LOCAL_REGISTRY_ADDRESS,
      authoritativeUpstream: false,
    },
    message: "Envio read model unavailable. Execution authority is unchanged.",
    detail: error instanceof Error ? error.message : "Unknown GraphQL error",
    receipts: [],
    executions: [],
    aggregates: [],
  };
}

function writeJson(response: ServerResponse, statusCode: number, body: unknown): void {
  response.writeHead(statusCode, {
    "cache-control": "no-store",
    "content-type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(body));
}

const contentTypes: Readonly<Record<string, string>> = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
};

async function serveStatic(pathname: string, response: ServerResponse): Promise<void> {
  const relativePath = pathname === "/" ? "index.html" : pathname.slice(1);
  if (!/^[a-zA-Z0-9._/-]+$/.test(relativePath) || relativePath.includes("..")) {
    response.writeHead(404).end();
    return;
  }
  try {
    const contents = await readFile(join(PUBLIC_DIRECTORY, relativePath));
    response.writeHead(200, {
      "cache-control": "no-store",
      "content-type": contentTypes[extname(relativePath)] ?? "application/octet-stream",
    });
    response.end(contents);
  } catch {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" }).end("Not found");
  }
}

export function createDashboardServer(config: DashboardConfig) {
  const store = new ApplicationStore(config.databasePath ?? ":memory:", () => Math.floor(config.now().valueOf()/1000), config.localDemo ? 4 : 10);
  const server = createServer(async (request: IncomingMessage, response: ServerResponse) => {
    response.setHeader("x-content-type-options", "nosniff");
    response.setHeader("referrer-policy", "no-referrer");
    response.setHeader("content-security-policy", "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    const url = new URL(request.url ?? "/", "http://127.0.0.1");
    const token = request.headers.cookie?.split(";").map((part) => part.trim()).find((part) => part.startsWith("permio_session="))?.slice(15);
    const session = store.session(token);
    const cookie = (value: string, maxAge: number) => response.setHeader("set-cookie", `permio_session=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${config.secureCookies ? "; Secure" : ""}`);
    const signedIn = (): Account => { if (!session) throw new ApplicationError(401, "Please log in to continue."); return session.account; };
    try {
      if (config.localDemo && !["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(request.socket.remoteAddress ?? "")) throw new ApplicationError(403, "This application is available on this computer only.");
      if (request.method === "GET" && url.pathname === "/healthz") {
        store.db.prepare("SELECT 1").get();
        writeJson(response, 200, { status: "ok" });
        return;
      }
      if (url.pathname.startsWith("/api/")) {
        if (!["GET", "POST", "PUT"].includes(request.method ?? "")) throw new ApplicationError(405, "Method not allowed.");
        if (request.method !== "GET") {
          const origin = request.headers.origin;
          if (request.headers["sec-fetch-site"] === "cross-site" || (origin && new URL(origin).host !== request.headers.host)) throw new ApplicationError(403, "Please submit this request from the application.");
          if (!["/api/login", "/api/register"].includes(url.pathname)) {
            signedIn();
            if (request.headers["x-csrf-token"] !== session!.csrf) throw new ApplicationError(403, "Refresh the page and try again.");
          }
        }
        if (request.method === "GET" && url.pathname === "/api/session") {
          writeJson(response, 200, { ...(session ? { authenticated: true, account: session.account, csrf: session.csrf, expiresAt: session.expiresAt } : { authenticated: false }), identityMode: store.identity.mode, minimumPasswordLength: store.minimumPasswordLength }); return;
        }
        if (request.method === "POST" && ["/api/login", "/api/register"].includes(url.pathname)) {
          store.throttle(`${request.socket.remoteAddress}:authentication`);
          const input = await readBody(request);
          const account = url.pathname === "/api/register" ? await store.identity.register(input) : await store.identity.authenticate(input);
          const created = store.createSession(account.id, token); cookie(created.token, 8*3600);
          writeJson(response, 200, { authenticated: true, account, csrf: created.session.csrf, expiresAt: created.session.expiresAt, minimumPasswordLength: store.minimumPasswordLength }); return;
        }
        const user = signedIn();
        if (request.method === "POST" && url.pathname === "/api/logout") { if (token) store.logout(token); cookie("", 0); writeJson(response, 200, { authenticated: false }); return; }
        if (request.method === "GET" && url.pathname === "/api/workspace") { writeJson(response, 200, store.workspace(user)); return; }
        if (request.method === "GET" && url.pathname === "/api/m8/read-model") {
          try { writeJson(response, 200, await fetchDashboardReadModel(config, store.receiptIds(user))); }
          catch (error) { writeJson(response, 503, { ...createUnavailableReadModel(config, error), detail: undefined, message: "Activity is temporarily unavailable. Please try again." }); }
          return;
        }
        if (request.method === "POST" && url.pathname === "/api/account/profile") { writeJson(response, 200, { account: store.profile(user, await readBody(request)) }); return; }
        if (request.method === "POST" && url.pathname === "/api/account/password") { store.throttle(`${user.id}:password`); await store.changePassword(user, await readBody(request)); cookie("", 0); writeJson(response, 200, { authenticated: false }); return; }
        if (request.method === "POST" && url.pathname === "/api/account/review-key") { store.registerReviewKey(user, (await readBody(request)).publicKey); writeJson(response, 200, { ready: true }); return; }
        if (request.method === "POST" && url.pathname === "/api/blueprints") { writeJson(response, 201, store.createBlueprint(user, await readBody(request))); return; }
        const match = /^\/api\/blueprints\/(u[a-f0-9]{32})(?:\/(validate|submit|review|activate|retire|revoke|instances))?$/.exec(url.pathname);
        if (match) {
          if (request.method === "GET" && !match[2]) { writeJson(response, 200, store.blueprint(user, match[1])); return; }
          if (request.method === "PUT" && !match[2]) { writeJson(response, 200, store.updateBlueprint(user, match[1], await readBody(request))); return; }
          if (request.method === "POST" && match[2]) {
            const input = await readBody(request);
            const value = match[2] === "instances" ? store.createInstance(user, match[1], input) : store.mutateBlueprint(user, match[1], match[2], input);
            writeJson(response, 200, value); return;
          }
        }
        throw new ApplicationError(404, "Not found.");
      }
      if (request.method === "GET") { await serveStatic(url.pathname, response); return; }
      response.writeHead(405, { allow: "GET" }).end();
    } catch (error) {
      if (error instanceof ApplicationError) writeJson(response, error.status, { error: error.message });
      else if (error && typeof error === "object" && "code" in error && /^(UNAUTHORIZED|THRESHOLD_NOT_MET|REVIEW_REJECTED|NOT_ACTIVE|RETIRED|REVOKED|INVALID_STATE|INVALID_TIME|INVALID_ATTESTATION|TARGET_MISMATCH|DUPLICATE_REVIEW|INVALID_POLICY|DUPLICATE_ID|INVALID_INPUT)$/.test(String(error.code))) {
        const messages: Record<string,string> = { UNAUTHORIZED:"You do not have permission to perform this action.", THRESHOLD_NOT_MET:"An independent review is required before activation.", REVIEW_REJECTED:"A reviewer rejected this version. Create a revised workflow before resubmitting.", NOT_ACTIVE:"Activate this workflow before starting a run.", RETIRED:"This workflow has been retired. New runs cannot be started.", REVOKED:"This workflow has been revoked.", INVALID_STATE:"This action is not available in the workflow’s current state.", INVALID_TIME:"This request has expired or is not yet valid.", INVALID_ATTESTATION:"The review signature could not be verified.", TARGET_MISMATCH:"The workflow version has changed. Refresh and review it again.", DUPLICATE_REVIEW:"You have already reviewed this version." };
        writeJson(response, 409, { error: messages[String(error.code)] ?? "This operation is not permitted." });
      }
      else writeJson(response, 500, { error: "Unable to complete this request. Please try again." });
    }
  });
  server.on("close", () => store.close());
  return Object.assign(server, { application: store });
}

async function readBody(request: IncomingMessage): Promise<Record<string, unknown>> {
  if (!request.headers["content-type"]?.startsWith("application/json")) throw new ApplicationError(415, "Submit this form as JSON.");
  const chunks: Buffer[] = []; let size = 0;
  for await (const chunk of request) { size += chunk.length; if (size > 32_768) throw new ApplicationError(413, "This request is too large."); chunks.push(Buffer.from(chunk)); }
  try { const body = JSON.parse(Buffer.concat(chunks).toString("utf8")); if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error(); return body; }
  catch { throw new ApplicationError(400, "The request could not be read. Please try again."); }
}

async function start(): Promise<void> {
  const config = readDashboardConfig();
  const port = Number(process.env.PERMIO_DASHBOARD_PORT ?? process.env.PORT ?? DEFAULT_PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) throw new Error("Dashboard port must be between 1 and 65535");
  const host = process.env.PERMIO_DASHBOARD_HOST ?? "127.0.0.1";
  const server = createDashboardServer(config);
  server.listen(port, host, () => {
    console.log(`Permio M8 dashboard: http://${host}:${port}`);
    console.log("Envio endpoint configured");
    console.log(FIXTURE_BOUNDARY_LABEL);
  });
  const shutdown = () => {
    server.close((error) => { process.exitCode = error ? 1 : 0; });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await start();
}
