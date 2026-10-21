import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { parse } from 'dotenv';
import { PreprodConnectionProfile } from '../packages/midnight-authorization/src/preprod-profile.ts';
import { probePreprodTransports } from './m6-preprod-transport.ts';

async function main() {
  if (process.argv.length !== 5 || process.argv[2] !== '--check' || process.argv[3] !== '--local-config') {
    throw Error('explicit-readonly-mode-required');
  }
  // Read only the token in memory. Do not load, copy, print or upload any wallet secret.
  const values = parse(await readFile(path.resolve(process.argv[4]!), 'utf8'));
  const profile = new PreprodConnectionProfile(values.BLOCKFROST_PROJECT_ID!);
  const report = { ...await probePreprodTransports(profile), observedAtUtc: new Date().toISOString() };
  await mkdir('logs', { recursive: true });
  await writeFile(path.join('logs', `m6-preprod-transport-${Date.now()}.json`), JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  console.log(JSON.stringify(report));
  if (!report.http.passed || !report.nodeSubscription.passed || !report.indexerSubscription.passed) process.exitCode = 1;
}
main().catch(() => { console.log(JSON.stringify({ kind: 'm6-preprod-readonly-transport-failed', detailsWithheld: true,
  walletLoaded: false, transactionSubmitted: false, milestoneComplete: false })); process.exitCode = 1; });
