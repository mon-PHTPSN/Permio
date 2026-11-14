"""One owned public-program key build in the existing authorized ECS envelope."""
import argparse
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import signal
import stat
import subprocess
import time

ROOT = Path('/opt/permio-business-predicates-20261115-v11')
TOOL = Path('/opt/permio-m6-membership-20261015/zkir')
SWAP = Path('/var/lib/permio-m6/swapfile')
GIB = 1024**3


def sha(file):
    digest = hashlib.sha256()
    with file.open('rb') as stream:
        for part in iter(lambda: stream.read(1024**2), b''):
            digest.update(part)
    return digest.hexdigest()


def cmd(args):
    return subprocess.run(args, check=True, capture_output=True, text=True).stdout.strip()


def save(file, value):
    temporary = file.with_suffix(file.suffix + '.writing')
    temporary.write_text(json.dumps(value, indent=2) + '\n')
    temporary.replace(file)


def memory():
    return {line.split(':')[0]: int(line.split()[1])
            for line in Path('/proc/meminfo').read_text().splitlines()}


def swaps():
    return {line.split()[0] for line in Path('/proc/swaps').read_text().splitlines()[1:]}


def swap_identity():
    value = SWAP.lstat()
    assert stat.S_ISREG(value.st_mode) and not SWAP.is_symlink() and SWAP.resolve() == SWAP
    assert value.st_uid == 0 and value.st_mode & 0o777 == 0o600 and value.st_nlink == 1
    assert value.st_size == 8 * GIB and value.st_blocks * 512 >= value.st_size
    with SWAP.open('rb') as stream:
        stream.seek(os.sysconf('SC_PAGE_SIZE') - 10)
        assert stream.read(10) == b'SWAPSPACE2'
    return (value.st_dev, value.st_ino, value.st_size, value.st_mode, value.st_uid)


def stop_reason(available_kib, free_bytes, elapsed):
    if available_kib <= 512 * 1024:
        return 'host-memory-reserve'
    if free_bytes <= GIB:
        return 'disk-reserve'
    if elapsed >= 3600:
        return 'bounded-duration'
    return None


def interrupted(_signum, _frame):
    raise KeyboardInterrupt('Owned controller interrupted')


def restore_owned_state(unit, before_swap, original_swaps, vm, original_swappiness, report):
    report.update(ownedJobStopped=False, originalSwapStateRestored=False, originalSwappinessRestored=False)
    errors = []
    try:
        if cmd(['systemctl', 'show', unit, '-p', 'LoadState', '--value']) != 'not-found':
            cmd(['systemctl', 'stop', unit])
        assert cmd(['systemctl', 'show', unit, '-p', 'MainPID', '--value']) == '0'
        report['ownedJobStopped'] = True
    except BaseException as error:
        errors.append({'stage': 'owned-job-stop', 'errorType': type(error).__name__})
    if report['ownedJobStopped']:
        try:
            assert swap_identity() == before_swap
            if not original_swaps and str(SWAP) in swaps():
                value = memory()
                assert value['MemAvailable'] > value['SwapTotal'] - value['SwapFree'] + 512 * 1024
                cmd(['swapoff', str(SWAP)])
            assert swaps() == original_swaps
            report['originalSwapStateRestored'] = True
        except BaseException as error:
            errors.append({'stage': 'swap-state-restore', 'errorType': type(error).__name__})
        try:
            current = vm.read_text().strip()
            assert current in {'60', original_swappiness}, 'Concurrent VM change requires coordination'
            if current == '60':
                vm.write_text(original_swappiness + '\n')
            report['originalSwappinessRestored'] = vm.read_text().strip() == original_swappiness
        except BaseException as error:
            errors.append({'stage': 'swappiness-restore', 'errorType': type(error).__name__})
    if errors:
        report['cleanupErrors'] = errors
        raise RuntimeError('Owned cleanup incomplete; see report')


def run(name):
    assert re.fullmatch(r'[A-Za-z][A-Za-z0-9_]*', name)
    assert os.geteuid() == 0 and ROOT.resolve() == ROOT
    assert ROOT.stat().st_mode & 0o777 == 0o700
    inputs = json.loads((ROOT / 'inputs.json').read_text())
    assert name in inputs['buildCircuits']
    for relative, expected in inputs['files'].items():
        file = ROOT / relative
        assert file.resolve().is_relative_to(ROOT) and sha(file) == expected
    assert sha(TOOL) == '5443f87db07b7f19cc273380c224b77b4b7ca124deac6d54f7a165628fc5e1fc'
    assert cmd([str(TOOL), '--version']) == 'midnight-zkir 2.1.0'
    for k, expected in [(20, '1cc62978558fdc1e445cd70cfd9a86ec3c2e2151b6d74811232d37faf9133ff1'),
                        (21, '9cf1644a87f0f027ae5fc6278f91d823a6334ff3e338a29e2f2ef57d071ed64d')]:
        assert sha(Path('/root/.cache/midnight/zk-params') / ('bls_midnight_2p' + str(k))) == expected
    assert subprocess.run(['pgrep', '-x', 'zkir'], capture_output=True).returncode == 1
    assert memory()['MemAvailable'] > 13 * 1024**2
    assert shutil.disk_usage(ROOT).free > 2 * GIB
    before_swap = swap_identity()
    original_swaps = swaps()
    assert not original_swaps or original_swaps == {str(SWAP)}
    vm = Path('/proc/sys/vm/swappiness')
    original_swappiness = vm.read_text().strip()
    directory = ROOT / name
    directory.mkdir(mode=0o700)
    unit = 'permio-business-v11-' + name.lower() + '.service'
    assert cmd(['systemctl', 'show', unit, '-p', 'LoadState', '--value']) == 'not-found'
    program = ROOT / 'zkir' / (name + '.zkir')
    report = {'name': name, 'startedAtUtc': dt.datetime.now(dt.timezone.utc).isoformat(),
              'instanceId': 'i-t4ni11rkjyzgi0vlb68d', 'region': 'ap-southeast-1',
              'programSha256': sha(program), 'inputsSha256': sha(ROOT / 'inputs.json'),
              'sourceRevision': inputs['sourceRevision'], 'sourcePatchSha256': inputs['sourcePatchSha256'],
              'memoryHighBytes': 27 * GIB // 2, 'memoryMaxBytes': 14 * GIB, 'swapMaxBytes': 8 * GIB,
              'newSwapCreated': False, 'keysReady': False, 'transactionsSubmitted': 0,
              'walletLoaded': False, 'activation': False}
    save(directory / 'report.json', report)
    try:
        if not original_swaps:
            cmd(['swapon', str(SWAP)])
        assert swaps() == {str(SWAP)}
        vm.write_text('60\n')
        cmd(['systemd-run', '--unit=' + unit, '--remain-after-exit', '--property=MemoryHigh=13824M',
             '--property=MemoryMax=14G', '--property=MemorySwapMax=8G', '--property=CPUQuota=200%',
             '--property=OOMPolicy=stop', '--property=RuntimeMaxSec=3650', '--property=TimeoutStopSec=15',
             '--property=WorkingDirectory=' + str(ROOT),
             '--property=StandardOutput=append:' + str(directory / 'compiler.log'),
             '--property=StandardError=append:' + str(directory / 'compiler.log'),
             '--setenv=HOME=/root', '--setenv=RAYON_NUM_THREADS=1', '--setenv=TOKIO_WORKER_THREADS=1',
             str(TOOL), 'compile', '--verbose', str(program), str(directory / (name + '.prover')),
             str(directory / (name + '.verifier'))])
        group = Path('/sys/fs/cgroup/system.slice') / unit
        started = time.monotonic()
        with (directory / 'resources.jsonl').open('x') as stream:
            while True:
                state = dict(line.split('=', 1) for line in cmd(['systemctl', 'show', unit,
                    '-p', 'MainPID', '-p', 'Result', '-p', 'ExecMainStatus']).splitlines())
                sample = {'atUtc': dt.datetime.now(dt.timezone.utc).isoformat(),
                          'elapsedSeconds': time.monotonic() - started, 'state': state,
                          'availableMemoryKiB': memory()['MemAvailable'],
                          'diskFreeBytes': shutil.disk_usage(ROOT).free}
                if group.exists():
                    for counter, wanted in [('memory.high', 27 * GIB // 2), ('memory.max', 14 * GIB),
                                            ('memory.swap.max', 8 * GIB)]:
                        assert (group / counter).read_text().strip() == str(wanted)
                    for counter in ['memory.current', 'memory.peak', 'memory.swap.current', 'memory.events']:
                        sample[counter] = (group / counter).read_text().strip()
                stream.write(json.dumps(sample) + '\n')
                stream.flush()
                if state['MainPID'] == '0':
                    break
                reason = stop_reason(sample['availableMemoryKiB'], sample['diskFreeBytes'], sample['elapsedSeconds'])
                assert reason is None, reason
                time.sleep(3)
        report['lastSample'] = sample
        assert state['Result'] == 'success' and state['ExecMainStatus'] == '0'
        for folder, suffix, prefix in [(directory, 'prover', 'prover'), (directory, 'verifier', 'verifier'),
                                       (ROOT / 'zkir', 'bzkir', 'binaryProgram')]:
            file = folder / (name + '.' + suffix)
            assert file.stat().st_size > 0
            report[prefix + 'Bytes'] = file.stat().st_size
            report[prefix + 'Sha256'] = sha(file)
        assert sha(program) == report['programSha256']
        report['keysReady'] = True
    except BaseException as error:
        report['errorType'] = type(error).__name__
        report['safeReason'] = str(error) if isinstance(error, AssertionError) else 'Owned public key build failed'
        raise
    finally:
        try:
            restore_owned_state(unit, before_swap, original_swaps, vm, original_swappiness, report)
        finally:
            report['completedAtUtc'] = dt.datetime.now(dt.timezone.utc).isoformat()
            save(directory / 'report.json', report)


if __name__ == '__main__':
    signal.signal(signal.SIGTERM, interrupted)
    signal.signal(signal.SIGINT, interrupted)
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('name')
    run(parser.parse_args().name)
