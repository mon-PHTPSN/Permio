import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { spawnSync, type ChildProcess } from 'node:child_process';
import { it } from 'node:test';
import { monitorOfflineCheckpoint, OFFLINE_CHECKPOINT_TIMEOUT_MS } from '../m6-checkpoint-supervisor.ts';

class OwnedChild extends EventEmitter {
  readonly signals: string[] = [];
  kill(signal: string) { this.signals.push(signal); queueMicrotask(() => this.emit('close', null, signal)); return true; }
}
const owned = (child: OwnedChild) => child as unknown as ChildProcess;
const success = { kind: 'm6-offline-preprod-checkpoint-inspection', milestoneComplete: false };
it('checkpoint inspection requires both its result and a successful owned-child exit', async () => {
  assert.equal(OFFLINE_CHECKPOINT_TIMEOUT_MS, 60_000);
  for (const code of [0, 1]) {
    const child = new OwnedChild(), progress: unknown[] = [];
    const pending = monitorOfflineCheckpoint(owned(child), value => progress.push(value));
    child.emit('message', { kind: 'm6-offline-checkpoint-progress', stage: 'restore-dust' });
    child.emit('message', success); child.emit('close', code, null);
    assert.equal((await pending).passed, code === 0); assert.equal(progress.length, 1); assert.equal(child.signals.length, 0);
  }
  const child = new OwnedChild(), pending = monitorOfflineCheckpoint(owned(child), () => undefined);
  child.emit('close', 0, null); assert.equal((await pending).passed, false);
});
it('the outer deadline terminates only the owned child and cannot turn an early success message into a pass', async () => {
  const child = new OwnedChild(), pending = monitorOfflineCheckpoint(owned(child), () => undefined, 5);
  child.emit('message', success);
  const result = await pending;
  assert.deepEqual(child.signals, ['SIGTERM']); assert.equal(result.passed, false);
  assert.equal(result.report.category, 'owned-process-deadline'); assert.equal(result.report.milestoneComplete, false);
});
it('spawn errors and a failing progress reporter do not expose error text or leave the child running', async () => {
  const child = new OwnedChild(), pending = monitorOfflineCheckpoint(owned(child), () => { throw Error('private-reporter-error'); });
  child.emit('message', { kind: 'm6-offline-checkpoint-progress' });
  const report = await pending; assert.equal(report.passed, false); assert.deepEqual(child.signals, ['SIGTERM']);
  assert(!JSON.stringify(report).includes('private-reporter-error'));
  const failed = new OwnedChild(), failedPending = monitorOfflineCheckpoint(owned(failed), () => undefined);
  failed.emit('error', Error('private-spawn-error'));
  assert(!JSON.stringify(await failedPending).includes('private-spawn-error'));
  await assert.rejects(monitorOfflineCheckpoint(owned(new OwnedChild()), () => undefined, Infinity));
});
it('the actual inspector CLI rejects incomplete or duplicate selectors before SDK loading or private reads', () => {
  for (const args of [[], ['--inspect-offline', '--slot', 'fixture-1'],
    ['--inspect-offline', '--local-config', 'private-input-not-read', '--checkpoint', 'private-input-not-read',
      '--account-index-var', 'ACCOUNT_INDEX', '--mnemonic-var', 'MNEMONIC', '--mnemonic-var', 'MNEMONIC']]) {
    const result = spawnSync(process.execPath, ['scripts/inspect-m6-preprod-checkpoint.ts', ...args], { encoding: 'utf8', timeout: 10_000 });
    assert.equal(result.status, 1);
    const report = JSON.parse(result.stdout.trim()); assert.equal(report.phase, 'argument-validation');
    assert.equal(report.networkRequestsIssued, false); assert(!result.stdout.includes('private-input-not-read'));
  }
});
