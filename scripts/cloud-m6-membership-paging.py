"""Opt-in historical membership paging diagnostic, NOT M6 chain acceptance.

Run only in the documented dedicated ECS systemd unit. No wallets, credentials,
private preimages, cloud lifecycle APIs or configurable commands are accepted.
The caller must resolve the cloud stop schedule separately before execution.
"""
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import signal
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.request

ROOT = Path('/opt/permio-m6-membership-20261015')
SWAP = Path('/var/lib/permio-m6/swapfile')
UNIT = 'permio-m6-membership-paging.service'
CLIENT = 'permio-m6-membership-paging-client.service'
NAME = 'permio-m6-membership-paging'
OWNER = 'm6-historical-membership-paging'
IMAGE = 'midnightntwrk/proof-server@sha256:801bbc0340e9e96f16735f77b523f23c7459e3359842f7c79c2c53f4e994d531'
GIB = 1024 ** 3
HIGH, RAM, SWAP_MAX, CLIENT_RAM = 10 * GIB, 23 * GIB // 2, 8 * GIB, 5 * GIB // 2
INTERRUPTED = False


def command(args, timeout=30):
    # Never include stderr, command output or exception text in failure reports.
    return subprocess.check_output(args, text=True, stderr=subprocess.DEVNULL, timeout=timeout).strip()


def digest(file):
    value = hashlib.sha256()
    with file.open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            value.update(chunk)
    return value.hexdigest()


def counters(text):
    result = {}
    for line in text.splitlines():
        parts = line.replace(':', ' ').split()
        if len(parts) >= 2 and parts[1].isdigit():
            assert parts[0] not in result, 'Duplicate counter'
            result[parts[0]] = int(parts[1])
    return result


def stop_reason(memory, elapsed, state, interrupted=False):
    assert elapsed >= 0 and isinstance(state['Running'], bool) and isinstance(state['OOMKilled'], bool)
    assert all(isinstance(memory[k], int) and memory[k] >= 0 for k in ['MemAvailable', 'SwapFree'])
    if interrupted:
        return 'caller-interrupted'
    if elapsed >= 2000:
        return 'bounded-duration'
    if state['OOMKilled']:
        return 'prover-oom-kill'
    if not state['Running']:
        return 'prover-exited'
    if memory['MemAvailable'] < 384 * 1024:
        return 'host-memory-reserve'
    if memory['SwapFree'] < 128 * 1024:
        return 'swap-reserve'
    return None


def verify_counter_chain(chain, ram, swap, high):
    assert chain, 'Missing cgroup ancestry'
    for name, expected in [('memory.max', ram), ('memory.swap.max', swap), ('memory.high', high)]:
        assert chain[0].get(name) == str(expected), 'Actual cgroup limit mismatch'
    for ancestor in chain[1:]:
        for name, minimum in [('memory.max', ram), ('memory.swap.max', swap)]:
            value = ancestor.get(name, 'max')
            assert value == 'max' or int(value) >= minimum, 'Restrictive cgroup ancestor'


def verify_limits(leaf, ram, swap, high):
    assert leaf.is_relative_to('/sys/fs/cgroup')
    chain = [{name: (leaf / name).read_text().strip() for name in ['memory.max', 'memory.swap.max', 'memory.high']}]
    parent = leaf.parent
    while True:
        chain.append({name: (parent / name).read_text().strip() for name in ['memory.max', 'memory.swap.max']
                      if (parent / name).exists()})
        if parent == Path('/sys/fs/cgroup'):
            break
        parent = parent.parent
    verify_counter_chain(chain, ram, swap, high)


def client_cleanup_action(properties, group_exists):
    """systemd may garbage-collect a successful transient client before cleanup."""
    assert set(properties) == {'LoadState', 'ActiveState'}
    if properties['LoadState'] == 'not-found':
        assert properties['ActiveState'] == 'inactive' and not group_exists, 'Missing unit still has live state'
        return 'already-collected'
    assert properties['LoadState'] == 'loaded'
    assert properties['ActiveState'] in ['inactive', 'active', 'activating', 'deactivating', 'failed']
    if properties['ActiveState'] in ['inactive', 'failed'] and not group_exists:
        return 'already-stopped'
    return 'stop-owned-unit'


def client_properties():
    raw = command(['systemctl', 'show', CLIENT, '--property=LoadState', '--property=ActiveState'])
    return dict(line.split('=', 1) for line in raw.splitlines())


def sample_group(group):
    result = {}
    for name in ['memory.current', 'memory.peak', 'memory.swap.current', 'memory.swap.peak', 'memory.events']:
        file = group / name
        if file.exists():
            raw = file.read_text().strip()
            result[name] = counters(raw) if name == 'memory.events' else int(raw)
    return result


def inspect(container):
    assert re.fullmatch('[a-f0-9]{64}', container)
    info = json.loads(command(['docker', 'inspect', container]))[0]
    assert info['Id'] == container and info['Name'] == '/' + NAME
    assert info['Config']['Labels']['permio.owner'] == OWNER
    return info


def verify_proof(report, proof_file, client_exit):
    assert client_exit == 0 and report['realProofGenerated'] is True
    assert report['proofFormatValidated'] is True and report['proofArtifactPersisted'] is True
    assert report['proofIndependentlyVerified'] is False and report['transactionSubmitted'] is False
    assert report['milestoneComplete'] is False and proof_file.stat().st_size > 0
    assert proof_file.stat().st_size == report['proofBytes'] and digest(proof_file) == report['proofSha256']


def run():
    global INTERRUPTED
    assert sys.platform == 'linux' and os.getuid() == 0 and ROOT.resolve() == ROOT
    assert ROOT.stat().st_mode & 0o777 == 0o700
    assert Path('/proc/self/cgroup').read_text().strip() == '0::/system.slice/' + UNIT
    verify_limits(Path('/sys/fs/cgroup/system.slice') / UNIT, GIB // 2, 0, GIB // 2)
    assert command(['systemctl', 'show', 'permio-m6-membership-keygen.service', '--property=ActiveState', '--value']) == 'inactive'
    assert not command(['docker', 'ps', '-q']), 'Dedicated diagnostic must not overlap running containers'
    assert not SWAP.is_symlink() and SWAP.resolve() == SWAP and SWAP.stat().st_size == SWAP_MAX
    assert SWAP.stat().st_uid == 0 and SWAP.stat().st_mode & 0o777 == 0o600
    assert SWAP.parent.stat().st_mode & 0o777 == 0o700
    assert len(Path('/proc/swaps').read_text().splitlines()) == 1, 'Do not modify another swap workload'
    memory = counters(Path('/proc/meminfo').read_text())
    assert memory['SwapTotal'] == 0 and memory['MemAvailable'] >= 14 * 1024 ** 2
    assert shutil.disk_usage(ROOT).free >= 2 * GIB, 'Insufficient result/copy disk headroom'
    with socket.socket() as probe:
        probe.bind(('127.0.0.1', 6300))
    # New exclusive output directory also prevents accidental reruns/overwrites.
    output = ROOT / 'paging-output'
    output.mkdir(mode=0o700)
    client = ROOT / 'client'
    assets = client / 'logs/m6-current-status-managed'
    build = json.loads((ROOT / 'output/report.json').read_text())
    assert build['realKeyBuildCompleted'] is True and build['mockKeysUsed'] is False
    assert build['inputHashes']['checkRuntimeStatusMultiproof.zkir'] == '6d1a58afebf6c221f560f07bc66570feba74b917e029f81e27f42777c314d8ab'
    for suffix in ['prover', 'verifier']:
        source = ROOT / ('output/membership.' + suffix)
        assert digest(source) == build['keys']['membership.' + suffix]['sha256']
    assert digest(client / 'scripts/run-m6-membership-proof-paging.ts') == '89355f2fc825cde6d3c1bf492ad604bdbaf1818025db354a7ef3afd3d4522224'
    (assets / 'keys').mkdir(mode=0o700)
    for suffix in ['prover', 'verifier']:
        shutil.copyfile(ROOT / ('output/membership.' + suffix), assets / ('keys/checkRuntimeStatusMultiproof.' + suffix))
    assert not (assets / 'key-build-report.json').exists()
    shutil.copyfile(ROOT / 'output/report.json', assets / 'key-build-report.json')
    assert not (assets / 'isolated-proof.bin').exists() and not (assets / 'isolated-proof-report.json').exists()
    original_swappiness = Path('/proc/sys/vm/swappiness').read_text().strip()
    assert original_swappiness == '0', 'Record/review a changed host baseline first'
    started = time.monotonic()
    report = {'kind': 'historical-35-leaf-membership-paging-not-chain-acceptance',
              'startedAtUtc': dt.datetime.now(dt.timezone.utc).isoformat(), 'image': IMAGE,
              'proverMemoryHighBytes': HIGH, 'proverMemoryMaxBytes': RAM, 'proverSwapMaxBytes': SWAP_MAX,
              'clientMemoryMaxBytes': CLIENT_RAM, 'clientSwapMaxBytes': 0, 'rayonWorkers': 1,
              'proofJobTimeoutSeconds': 1800, 'diagnosticTimeoutSeconds': 2000,
              'originalSwappiness': 0, 'temporarySwappiness': 60, 'swapFilePreserved': True,
              'walletLoaded': False, 'mockKeysUsed': False, 'realProofGenerated': False,
              'proofIndependentlyVerified': False, 'transactionSubmitted': False, 'milestoneComplete': False}
    container, client_started, swap_on = None, False, False
    group = None
    client_group = Path('/sys/fs/cgroup/system.slice') / CLIENT
    def interrupt(_signum, _frame):
        global INTERRUPTED
        INTERRUPTED = True
    for signum in [signal.SIGTERM, signal.SIGINT]:
        signal.signal(signum, interrupt)
    try:
        command(['swapon', str(SWAP)])
        swap_on = True
        Path('/proc/sys/vm/swappiness').write_text('60\n')
        container = command(['docker', 'create', '--name', NAME, '--label', 'permio.owner=' + OWNER,
            '--cpus', '1', '--memory', str(RAM), '--memory-swap', str(RAM + SWAP_MAX),
            '--pids-limit', '128', '--publish', '127.0.0.1:6300:6300',
            '--mount', 'type=bind,src=' + str(ROOT / 'public-cache') + ',dst=/.cache/midnight,readonly',
            '--env', 'RAYON_NUM_THREADS=1', '--env', 'HOME=/', '--env', 'XDG_CACHE_HOME=/.cache',
            '--entrypoint', '/bin/bash', IMAGE, '-c',
            'exec midnight-proof-server --port 6300 --no-fetch-params --num-workers 1 --job-capacity 1 --job-timeout 1800'])
        info = inspect(container)
        assert info['HostConfig']['Memory'] == RAM and info['HostConfig']['MemorySwap'] == RAM + SWAP_MAX
        assert info['HostConfig']['NanoCpus'] == 1000000000 and not info['Mounts'][0]['RW']
        command(['docker', 'start', container])
        info = inspect(container)
        pid = info['State']['Pid']
        assert pid > 0
        relative = Path('/proc/' + str(pid) + '/cgroup').read_text().strip()
        assert relative == '0::/system.slice/docker-' + container + '.scope'
        group = Path('/sys/fs/cgroup/system.slice/docker-' + container + '.scope')
        (group / 'memory.high').write_text(str(HIGH) + '\n')
        verify_limits(group, RAM, SWAP_MAX, HIGH)
        deadline = time.monotonic() + 120
        while True:
            assert not INTERRUPTED and time.monotonic() < deadline, 'Readiness not observed within bound'
            assert inspect(container)['State']['Running'], 'Prover exited before readiness'
            try:
                with urllib.request.urlopen('http://127.0.0.1:6300/health', timeout=2) as response:
                    assert response.status == 200
                break
            except urllib.error.HTTPError as error:
                if error.code == 404:
                    break  # Listener only; the real provider.check still runs in the client.
                raise
            except urllib.error.URLError:
                time.sleep(1)
        # Do not inherit the controller's smaller cgroup: client is a bounded sibling.
        command(['systemd-run', '--unit=' + CLIENT, '--property=Description=Permio historical membership paging client',
            '--property=MemoryHigh=' + str(CLIENT_RAM), '--property=MemoryMax=' + str(CLIENT_RAM),
            '--property=MemorySwapMax=0', '--property=CPUQuota=100%', '--property=TasksMax=128',
            '--property=RuntimeMaxSec=1950', '--property=TimeoutStopSec=10', '--property=Restart=no',
            '--property=WorkingDirectory=' + str(client),
            '--property=StandardOutput=append:' + str(output / 'client.log'),
            '--property=StandardError=append:' + str(output / 'client.log'),
            str(ROOT / 'node-v22.23.2-linux-x64/bin/node'), '--max-old-space-size=768',
            'scripts/run-m6-membership-proof-paging.ts', '--prove-paging'])
        client_started = True
        verify_limits(client_group, CLIENT_RAM, 0, CLIENT_RAM)
        with (output / 'resources.jsonl').open('x') as samples:
            while True:
                memory = counters(Path('/proc/meminfo').read_text())
                info = inspect(container)
                sample = {'elapsedSeconds': time.monotonic() - started,
                          'availableKiB': memory['MemAvailable'], 'swapFreeKiB': memory['SwapFree'],
                          'prover': sample_group(group), 'client': sample_group(client_group),
                          'pagingCounters': {k: v for k, v in counters(Path('/proc/vmstat').read_text()).items()
                                             if k in ('pswpin', 'pswpout')}}
                samples.write(json.dumps(sample) + '\n')
                samples.flush()
                reason = stop_reason(memory, sample['elapsedSeconds'], info['State'], INTERRUPTED)
                if reason:
                    report['stopReason'] = reason
                    break
                active = command(['systemctl', 'show', CLIENT, '--property=ActiveState', '--value'])
                if active not in ('activating', 'active', 'deactivating'):
                    report['clientExitCode'] = int(command(['systemctl', 'show', CLIENT, '--property=ExecMainStatus', '--value']))
                    if (assets / 'isolated-proof-report.json').is_file():
                        proof_report = json.loads((assets / 'isolated-proof-report.json').read_text())
                        verify_proof(proof_report, assets / 'isolated-proof.bin', report['clientExitCode'])
                        report['realProofGenerated'] = True
                        report['proofSha256'] = proof_report['proofSha256']
                        report['proofBytes'] = proof_report['proofBytes']
                    else:
                        report['stopReason'] = 'client-ended-without-proof-report'
                    break
                time.sleep(2)
    except Exception as error:
        report['failureType'] = type(error).__name__
        report['detailsWithheld'] = True
    finally:
        # Independent cleanup steps: a failed Docker stop must not skip sysctl restoration.
        errors = []
        if client_started:
            try:
                report['finalClientCounters'] = sample_group(client_group)
                action = client_cleanup_action(client_properties(), client_group.exists())
                if action == 'stop-owned-unit':
                    try:
                        command(['systemctl', 'stop', CLIENT], timeout=20)
                    except subprocess.CalledProcessError:
                        # Accept only a proven terminal state if collection races stop.
                        assert client_cleanup_action(client_properties(), client_group.exists()) in ['already-collected', 'already-stopped']
                final = client_properties()
                assert final['ActiveState'] == 'inactive'
                assert not client_group.exists() or counters((client_group / 'cgroup.events').read_text()).get('populated') == 0
                report['ownedClientStopped'] = True
                report['clientCleanupAction'] = action
            except Exception:
                errors.append('owned-client-cleanup')
        if container:
            try:
                if group:
                    report['finalProverCgroupAvailable'] = group.is_dir()
                    report['finalProverCountersBeforeStop'] = sample_group(group)
                info = inspect(container)
                report['proverStateBeforeStop'] = {k: info['State'][k] for k in ['Running', 'OOMKilled', 'ExitCode']}
                command(['docker', 'stop', '--time', '10', container], timeout=25)
                report['ownedProverStopped'] = not inspect(container)['State']['Running']
                # Preserve the container locally, but do not export arbitrary server logs.
                report['rawProverLogsNotExported'] = True
            except Exception:
                errors.append('owned-prover-cleanup')
        try:
            Path('/proc/sys/vm/swappiness').write_text(original_swappiness + '\n')
            report['swappinessRestored'] = Path('/proc/sys/vm/swappiness').read_text().strip() == original_swappiness
            if swap_on:
                memory = counters(Path('/proc/meminfo').read_text())
                used = memory['SwapTotal'] - memory['SwapFree']
                report['swapUsedKiBBeforeCleanup'] = used
                if memory['MemAvailable'] > used + 512 * 1024 and not errors:
                    command(['swapoff', str(SWAP)], timeout=120)
                    report['temporarySwapDisabled'] = len(Path('/proc/swaps').read_text().splitlines()) == 1
                else:
                    errors.append('swapoff-headroom-or-cleanup-not-safe')
        except Exception:
            errors.append('temporary-paging-cleanup')
        report['cleanupErrors'] = errors
        report['completedAtUtc'] = dt.datetime.now(dt.timezone.utc).isoformat()
        report['elapsedSeconds'] = time.monotonic() - started
        with (output / 'report.json').open('x') as file:
            json.dump(report, file, indent=2)
            file.write('\n')
        print(json.dumps(report), flush=True)
    return 0 if report['realProofGenerated'] and not report.get('stopReason') and not report.get('failureType') and not report['cleanupErrors'] else 1


def self_test():
    import tempfile
    import unittest
    class Policy(unittest.TestCase):
        def test_normal_paging_not_failure(self):
            self.assertIsNone(stop_reason({'MemAvailable': 512 * 1024, 'SwapFree': 256 * 1024}, 1500, {'Running': True, 'OOMKilled': False}))

        def test_each_guard(self):
            state = {'Running': True, 'OOMKilled': False}
            mem = {'MemAvailable': 1024 ** 2, 'SwapFree': 1024 ** 2}
            self.assertEqual(stop_reason(mem, 1, state, True), 'caller-interrupted')
            self.assertEqual(stop_reason(mem, 2000, state), 'bounded-duration')
            self.assertEqual(stop_reason(mem, 1, {**state, 'OOMKilled': True}), 'prover-oom-kill')
            self.assertEqual(stop_reason(mem, 1, {**state, 'Running': False}), 'prover-exited')
            self.assertEqual(stop_reason({**mem, 'MemAvailable': 383 * 1024}, 1, state), 'host-memory-reserve')
            self.assertEqual(stop_reason({**mem, 'SwapFree': 127 * 1024}, 1, state), 'swap-reserve')

        def test_missing_counters(self):
            with self.assertRaises(KeyError):
                stop_reason({}, 1, {'Running': True, 'OOMKilled': False})

        def test_numeric_no_payload(self):
            self.assertEqual(counters('Name: private\nhigh 2\nMemAvailable: 32 kB'), {'high': 2, 'MemAvailable': 32})
            with self.assertRaises(AssertionError):
                counters('high 1\nhigh 2')

        def test_proof_requires_hash_and_success_without_chain_claim(self):
            with tempfile.TemporaryDirectory(prefix='m6-paging-policy-', dir=Path.cwd() / 'logs') as temp:
                proof = Path(temp) / 'synthetic-proof-format-not-real.bin'
                proof.write_bytes(b'synthetic-test-only')
                report = {'realProofGenerated': True, 'proofFormatValidated': True, 'proofArtifactPersisted': True,
                          'proofIndependentlyVerified': False, 'transactionSubmitted': False, 'milestoneComplete': False,
                          'proofBytes': proof.stat().st_size, 'proofSha256': digest(proof)}
                verify_proof(report, proof, 0)
                for patch in [{'proofSha256': '00' * 32}, {'proofBytes': 0}, {'milestoneComplete': True},
                              {'transactionSubmitted': True}, {'proofIndependentlyVerified': True}]:
                    with self.assertRaises(AssertionError):
                        verify_proof({**report, **patch}, proof, 0)
                with self.assertRaises(AssertionError):
                    verify_proof(report, proof, 1)

        def test_actual_limits_and_ancestors_required(self):
            leaf = {'memory.max': str(RAM), 'memory.high': str(HIGH), 'memory.swap.max': str(SWAP_MAX)}
            verify_counter_chain([leaf, {'memory.max': 'max'}], RAM, SWAP_MAX, HIGH)
            for key in leaf:
                with self.assertRaises(AssertionError):
                    verify_counter_chain([{**leaf, key: 'max'}], RAM, SWAP_MAX, HIGH)
            for ancestor in [{'memory.max': '1'}, {'memory.swap.max': '0'}]:
                with self.assertRaises(AssertionError):
                    verify_counter_chain([leaf, ancestor], RAM, SWAP_MAX, HIGH)
            with self.assertRaises(AssertionError):
                verify_counter_chain([], RAM, SWAP_MAX, HIGH)

        def test_combined_memory_does_not_raise_previous_ram_cap(self):
            self.assertEqual(RAM + CLIENT_RAM, 14 * GIB)
            self.assertEqual(HIGH, 10 * GIB)
            self.assertEqual(SWAP_MAX, 8 * GIB)

        def test_collected_or_stopped_client_cleanup_is_idempotent(self):
            self.assertEqual(client_cleanup_action({'LoadState': 'not-found', 'ActiveState': 'inactive'}, False), 'already-collected')
            self.assertEqual(client_cleanup_action({'LoadState': 'loaded', 'ActiveState': 'inactive'}, False), 'already-stopped')
            self.assertEqual(client_cleanup_action({'LoadState': 'loaded', 'ActiveState': 'active'}, True), 'stop-owned-unit')

        def test_missing_or_unknown_unit_cannot_hide_live_group(self):
            for properties, exists in [({'LoadState': 'not-found', 'ActiveState': 'inactive'}, True),
                                       ({'LoadState': 'not-found', 'ActiveState': 'active'}, False),
                                       ({'LoadState': 'error', 'ActiveState': 'inactive'}, False)]:
                with self.assertRaises(AssertionError):
                    client_cleanup_action(properties, exists)
    result = unittest.TextTestRunner().run(unittest.defaultTestLoader.loadTestsFromTestCase(Policy))
    return 0 if result.wasSuccessful() else 1


if __name__ == '__main__':
    assert len(sys.argv) == 2 and sys.argv[1] in ['--run', '--self-test'], 'Explicit allowlisted mode required'
    try:
        raise SystemExit(self_test() if sys.argv[1] == '--self-test' else run())
    except Exception as error:
        print(json.dumps({'failureType': type(error).__name__, 'detailsWithheld': True, 'milestoneComplete': False}))
        raise SystemExit(1)
