import assert from "node:assert/strict";

/** Raw work logs stay in the caller's private directory. Only this copy is exported. */
export function sanitizeM6RuntimePublicLog(input: Uint8Array) {
  const privateAllocationEvents = new Set(["ordinary-instance-allocated", "first-instance-allocation-and-credentials-restored-read-only"]);
  const counts = new Map<string, number>();
  const lines = Buffer.from(input).toString("utf8").split(/\r?\n/u).filter(line => line.trim()).map(line => {
    const record = JSON.parse(line) as Record<string, unknown>;
    assert(record && typeof record === "object" && !Array.isArray(record), "Unexpected unstructured work log; retain it privately");
    const phase = record.phase ?? record.event;
    const remove = (field: string) => {
      if (Object.hasOwn(record, field)) { delete record[field]; counts.set(`${String(phase)}:${field}`, (counts.get(`${String(phase)}:${field}`) ?? 0) + 1); }
    };
    if (typeof phase === "string" && privateAllocationEvents.has(phase)) remove("expiresAtUtc");
    if (phase === "future-capability-awaiting-real-activation-time") {
      remove("expiresAtUtc"); remove("notBeforeUtc"); remove("maximumDurationSeconds");
    }
    if (Object.hasOwn(record, "expiresAtUtc")) assert(phase === "candidate-proof-window-verified" && record.boundedBySignedWindow === true,
      "Unknown validity metadata must be classified before public export");
    assert(!Object.hasOwn(record, "notBeforeUtc") && !Object.hasOwn(record, "maximumDurationSeconds"),
      "Private credential validity metadata must not be exported");
    return JSON.stringify(record);
  });
  return { bytes: Buffer.from(lines.join("\n") + (lines.length ? "\n" : "")), report: {
    rawLogRetainedInsideCallerBoundary: true, privateValuesLogged: false,
    removedFields: [...counts].map(([field, count]) => ({ field, count })),
    removedPrivateFieldCount: [...counts.values()].reduce((a,b) => a+b,0), publicTransactionDeadlinesPreserved: true,
  } };
}
