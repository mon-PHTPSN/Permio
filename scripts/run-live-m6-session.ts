// Compatibility entry: v4 certification requires real allocation first. Never
// restore the historical unallocated constructor fixture to bypass this gate.
// The shared parser validates account-file and profiling options, including
// mutually exclusive workload flags. Do not discard caller options here.
process.argv = [...process.argv, "--credential-binding"];
await import("./run-live-m6-admission.ts");
