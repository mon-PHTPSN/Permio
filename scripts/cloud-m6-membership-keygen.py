"""Real-key retry of the historical membership diagnostic, not M6 acceptance.

Only public compiler/program/SRS inputs are accepted. Run in the documented
owned systemd unit; this script never loads a wallet or submits a transaction.
"""
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import subprocess
import time

ROOT = Path('/opt/permio-m6-membership-20261015')
UNIT = 'permio-m6-membership-keygen.service'
GIB = 1024 ** 3
HIGH, MAX, SWAP = 10 * GIB, 12 * GIB, 0
EXPECTED = {
    'zkir': '5443f87db07b7f19cc273380c224b77b4b7ca124deac6d54f7a165628fc5e1fc',
    'checkRuntimeStatusMultiproof.zkir': '6d1a58afebf6c221f560f07bc66570feba74b917e029f81e27f42777c314d8ab',
}
PARAMETER_SHA = '1cc62978558fdc1e445cd70cfd9a86ec3c2e2151b6d74811232d37faf9133ff1'


def sha(file):
    digest = hashlib.sha256()
    with file.open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()


def counters(text):
    result = {}
    for line in text.splitlines():
        parts = line.replace(':', ' ').split()
        if len(parts) >= 2 and parts[1].isdigit():
            if parts[0] in result:
                raise ValueError('Duplicate numeric counter')
            result[parts[0]] = int(parts[1])
    return result


def stop_reason(available_kib, elapsed):
    if available_kib < 384 * 1024:
        return 'host-memory-reserve'
    if elapsed >= 3500:
        return 'bounded-duration'
    return None


def run(home_retry=False):
    assert os.getuid() == 0 and ROOT.resolve() == ROOT
    assert ROOT.stat().st_mode & 0o777 == 0o700
    unit = 'permio-m6-membership-keygen-home.service' if home_retry else UNIT
    group = Path('/sys/fs/cgroup/system.slice') / unit
    assert Path('/proc/self/cgroup').read_text().strip() == f'0::/system.slice/{unit}'
    for name, expected in [('memory.high', HIGH), ('memory.max', MAX), ('memory.swap.max', SWAP)]:
        assert (group / name).read_text().strip() == str(expected), 'Actual resource ceiling differs'
    parent = group.parent
    while True:
        for name, minimum in [('memory.max', MAX), ('memory.swap.max', SWAP)]:
            file = parent / name
            if file.exists():
                value = file.read_text().strip()
                assert value == 'max' or int(value) >= minimum, 'Restrictive cgroup ancestor'
        if parent == Path('/sys/fs/cgroup'):
            break
        parent = parent.parent
    for name, digest in EXPECTED.items():
        assert sha(ROOT / name) == digest, 'Public build input mismatch'
    assert sha(Path('/root/.cache/midnight/zk-params/bls_midnight_2p20')) == PARAMETER_SHA
    version = subprocess.check_output([str(ROOT / 'zkir'), '--version'], text=True).strip()
    assert version == 'midnight-zkir 2.1.0'
    output = ROOT / ('output-home' if home_retry else 'output')
    output.mkdir(mode=0o700)
    prover, verifier = output / 'membership.prover', output / 'membership.verifier'
    start = time.monotonic()
    report = {'kind': 'historical-35-leaf-membership-real-key-retry', 'startedAtUtc': dt.datetime.now(dt.timezone.utc).isoformat(),
              'compilerToolchain': '0.31.1', 'zkirVersion': version, 'inputHashes': EXPECTED,
              'srsSha256': PARAMETER_SHA, 'memoryHighBytes': HIGH, 'memoryMaxBytes': MAX,
              'memorySwapMaxBytes': SWAP, 'oneRayonWorker': True, 'walletLoaded': False,
              'mockKeysUsed': False, 'proofGenerated': False, 'transactionSubmitted': False,
              'historicalDiagnosticNotCurrentContractAcceptance': True, 'milestoneComplete': False,
              'unit': unit, 'explicitParameterCache': '/root/.cache', 'homeEnvironmentRetry': home_retry}
    child = None
    try:
        env = {**os.environ, 'HOME': '/root', 'XDG_CACHE_HOME': '/root/.cache',
               'RAYON_NUM_THREADS': '1', 'TOKIO_WORKER_THREADS': '1'}
        with (output / 'compiler.log').open('xb') as log, (output / 'resources.jsonl').open('x') as samples:
            child = subprocess.Popen([str(ROOT / 'zkir'), 'compile', str(ROOT / 'checkRuntimeStatusMultiproof.zkir'), str(prover), str(verifier)],
                                     stdout=log, stderr=subprocess.STDOUT, env=env)
            while child.poll() is None:
                memory = counters(Path('/proc/meminfo').read_text())
                sample = {'elapsedSeconds': time.monotonic() - start, 'availableKiB': memory['MemAvailable']}
                for name in ['memory.current', 'memory.peak', 'memory.swap.current', 'memory.events']:
                    value = (group / name).read_text().strip()
                    sample[name] = counters(value) if name == 'memory.events' else int(value)
                samples.write(json.dumps(sample) + '\n')
                samples.flush()
                reason = stop_reason(memory['MemAvailable'], sample['elapsedSeconds'])
                if reason:
                    report['stopReason'] = reason
                    child.terminate()
                    break
                time.sleep(2)
            try:
                report['exitCode'] = child.wait(timeout=10)
            except subprocess.TimeoutExpired:
                child.kill()
                report['exitCode'] = child.wait()
        report['realKeyBuildCompleted'] = report['exitCode'] == 0 and not report.get('stopReason') and all(p.is_file() and p.stat().st_size > 0 for p in [prover, verifier])
        if report['realKeyBuildCompleted']:
            report['keys'] = {p.name: {'bytes': p.stat().st_size, 'sha256': sha(p)} for p in [prover, verifier]}
    finally:
        if child is not None and child.poll() is None:
            child.terminate()
            try:
                child.wait(timeout=10)
            except subprocess.TimeoutExpired:
                child.kill()
                child.wait()
        report['completedAtUtc'] = dt.datetime.now(dt.timezone.utc).isoformat()
        report['elapsedSeconds'] = time.monotonic() - start
        report['cgroupMemoryPeakBytes'] = int((group / 'memory.peak').read_text())
        report['cgroupEvents'] = counters((group / 'memory.events').read_text())
        (output / 'report.json').write_text(json.dumps(report, indent=2) + '\n')
        print(json.dumps(report), flush=True)
    return 0 if report.get('realKeyBuildCompleted') else 1


if __name__ == '__main__':
    # Positional modes begin with --; parse one explicit token without fallbacks.
    import sys
    assert len(sys.argv) == 2 and sys.argv[1] in ('--run', '--retry-home', '--self-test')
    if sys.argv[1] == '--self-test':
        assert counters('MemAvailable: 123 kB\nhigh 4\nsecret ignored') == {'MemAvailable': 123, 'high': 4}
        try:
            counters('high 1\nhigh 2')
            raise AssertionError('Duplicate counter accepted')
        except ValueError:
            pass
        assert stop_reason(383 * 1024, 1) == 'host-memory-reserve'
        assert stop_reason(1024 * 1024, 3500) == 'bounded-duration'
        assert stop_reason(1024 * 1024, 1) is None
        print(json.dumps({'selfTests': 5, 'passed': True, 'walletLoaded': False}))
    else:
        raise SystemExit(run(home_retry=sys.argv[1] == '--retry-home'))
