import { readFile, lstat, mkdir, writeFile } from 'node:fs/promises';
import { execFileSync, fork } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { parse } from 'dotenv';
import { monitorOfflineCheckpoint } from './m6-checkpoint-supervisor.ts';
import type { PreprodCheckpointSnapshots } from '../packages/midnight-authorization/src/preprod-checkpoint.ts';

let phase = 'argument-validation';
const publish = (value: object) => process.send?.(value);
async function main() {
  const args = process.argv.slice(2);
  const flags = ['--local-config', '--checkpoint', '--account-index-var', '--mnemonic-var', '--slot'];
  if (args.length !== 11 || args[0] !== '--inspect-offline') throw Error('explicit-offline-mode-required');
  const options = new Map<string, string>();
  for (let index = 1; index < args.length; index += 2) {
    if (!flags.includes(args[index]!) || options.has(args[index]!)) throw Error('invalid-options');
    options.set(args[index]!, args[index + 1]!);
  }
  const get = (key: string) => options.get(key)!;
  if (!/^fixture-[1-9][0-9]?$/.test(get('--slot')) ||
    !/^[A-Z][A-Z0-9_]{1,80}$/.test(get('--account-index-var')) || !/^[A-Z][A-Z0-9_]{1,80}$/.test(get('--mnemonic-var'))) throw Error('invalid-selector');
  const { PreprodConnectionProfile } = await import('../packages/midnight-authorization/src/preprod-profile.ts');
  const { inspectPreprodWalletCheckpoint, privateCheckpointContentHashes } = await import('../packages/midnight-authorization/src/preprod-checkpoint.ts');
  const config = path.resolve(get('--local-config')), directory = path.resolve(get('--checkpoint'));
  phase = 'private-file-guard';
  const ignored = (file: string) => {
    execFileSync('git', ['check-ignore', '--quiet', '--', file], { cwd: path.dirname(config), stdio: 'ignore', timeout: 10_000 });
    try { execFileSync('git', ['ls-files', '--error-unmatch', '--', file], { cwd: path.dirname(config), stdio: 'ignore', timeout: 10_000 }); }
    catch (error) { if ((error as { status?: number }).status === 1) return; throw Error('git-privacy-check-failed'); }
    throw Error('private-input-tracked');
  };
  ignored(config);
  phase = 'local-configuration-read';
  const configuration = parse(await readFile(config, 'utf8'));
  const index = configuration[get('--account-index-var')];
  if (typeof index !== 'string' || !/^(0|[1-9][0-9]*)$/.test(index)) throw Error('invalid-account-index');
  const load = async (): Promise<PreprodCheckpointSnapshots> => {
    const entries = await Promise.all((['shielded', 'unshielded', 'dust'] as const).map(async key => {
      const file = path.join(directory, key + '.json'); ignored(file);
      const metadata = await lstat(file);
      if (!metadata.isFile() || metadata.isSymbolicLink() || metadata.size < 1 || metadata.size > 32 * 1024 ** 2) throw Error('invalid-snapshot-file');
      return [key, await readFile(file, 'utf8')] as const;
    }));
    return Object.fromEntries(entries) as PreprodCheckpointSnapshots;
  };
  const snapshots = await load();
  phase = 'offline-sdk-deserialization';
  publish({ kind: 'm6-offline-checkpoint-progress', phase, slot: get('--slot'), synchronizationStarted: false, checkpointFilesWritten: false });
  const before = privateCheckpointContentHashes(snapshots);
  const started = performance.now();
  const result = await inspectPreprodWalletCheckpoint(new PreprodConnectionProfile(configuration.BLOCKFROST_PROJECT_ID!),
    { kind: 'mnemonic', value: configuration[get('--mnemonic-var')]!, accountIndex: Number(index) }, snapshots, stage => {
      const usage = process.memoryUsage();
      publish({ kind: 'm6-offline-checkpoint-progress', stage, slot: get('--slot'),
        elapsedMs: Math.round(performance.now() - started), rssBytes: usage.rss, heapUsedBytes: usage.heapUsed,
        synchronizationStarted: false, checkpointFilesWritten: false });
    });
  const after = privateCheckpointContentHashes(await load());
  if (JSON.stringify(before) !== JSON.stringify(after)) throw Error('checkpoint-source-changed');
  const report = { ...result, slot: get('--slot'), sourceCheckpointHashesUnchanged: true, observedAtUtc: new Date().toISOString() };
  publish(report);
}

// RxJS timeouts cannot interrupt synchronous native/WASM deserialization. Only the
// owning parent may terminate this exact child. This is a deadline, not a hard RSS cap.
async function supervise() {
  const child = fork(fileURLToPath(import.meta.url), process.argv.slice(2), {
    execArgv: ['--max-old-space-size=768'], stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
  });
  const { passed, report: result } = await monitorOfflineCheckpoint(child, value => console.log(JSON.stringify(value)));
  await mkdir('logs', { recursive: true });
  const report = { ...result, observedAtUtc: new Date().toISOString() };
  const label = passed ? result.slot : 'failed';
  await writeFile(path.join('logs', `m6-preprod-checkpoint-${label}-${Date.now()}.json`), JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  if (!passed) {
    console.log(JSON.stringify(report));
    process.exitCode = 1; return;
  }
  console.log(JSON.stringify(report));
}

if (process.send) {
  main().catch(() => {
    publish({ kind: 'm6-offline-preprod-checkpoint-inspection-failed', phase, detailsWithheld: true,
      networkRequestsIssued: false, checkpointFilesWritten: false, transactionSubmitted: false, milestoneComplete: false });
    process.exitCode = 1;
  }).finally(() => process.disconnect?.());
} else {
  supervise().catch(() => {
    console.log(JSON.stringify({ kind: 'm6-offline-preprod-checkpoint-inspection-failed', phase: 'owned-process-supervision', detailsWithheld: true,
      checkpointFilesWritten: false, transactionSubmitted: false, milestoneComplete: false }));
    process.exitCode = 1;
  });
}
