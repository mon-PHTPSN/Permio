import { parseOrdinaryUserArguments, runOrdinaryUserBenchmark } from "./m6-ordinary-user-workload.ts";

try {
  const options = parseOrdinaryUserArguments(process.argv.slice(2));
  if (options.requireChain) {
    // Deliberately fail closed until the real M6 action contract and receipt
    // are integrated. No fake receipt or governance transaction substitutes.
    process.stdout.write(`${JSON.stringify({
      benchmark: "ordinary-user-support-request-v1",
      scope: "required-chain-benchmark",
      status: "not-implemented",
      milestoneComplete: false,
      transactionsSubmitted: 0,
      proofGenerationMs: null,
      receipt: null,
    }, null, 2)}\n`);
    process.exitCode = 2;
  } else {
    process.stdout.write(`${JSON.stringify(runOrdinaryUserBenchmark(options.iterations), null, 2)}\n`);
  }
} catch {
  // Errors can contain private objects. Emit no arbitrary error text.
  process.stderr.write("Ordinary-user benchmark failed; no chain acceptance claimed.\n");
  process.exitCode = 1;
}
