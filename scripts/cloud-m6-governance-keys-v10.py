"""One-shot public v10 key build; no wallet, deployment, signing or submission."""
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import shutil
import stat
import subprocess
import time

ROOT = Path('/opt/permio-m6-governance-20261018-v10')
TOOL = Path('/opt/permio-m6-membership-20261015/zkir')
OLD = Path('/opt/permio-m6-ordinary-action-20261018-v9/client/packages/midnight-authorization/contracts/managed/permio-authorization')
SWAP = Path('/var/lib/permio-m6/swapfile')
GIB = 1024**3


def sha(file):
    h = hashlib.sha256()
    with file.open('rb') as stream:
        for part in iter(lambda: stream.read(1024**2), b''):
            h.update(part)
    return h.hexdigest()


def cmd(args):
    return subprocess.run(args, check=True, capture_output=True, text=True).stdout.strip()


def save(file, value):
    temporary = file.with_suffix(file.suffix + '.writing')
    temporary.write_text(json.dumps(value, indent=2) + '\n')
    temporary.replace(file)


def mem():
    return {line.split(':')[0]: int(line.split()[1]) for line in Path('/proc/meminfo').read_text().splitlines()}


def swaps():
    return {line.split()[0] for line in Path('/proc/swaps').read_text().splitlines()[1:]}


def main():
    assert os.geteuid() == 0 and ROOT.resolve() == ROOT
    assert ROOT.stat().st_mode & 0o777 == 0o700
    manifest = json.loads((ROOT / 'inputs.json').read_text())
    for name, expected in manifest['files'].items():
        file = ROOT / name
        assert file.resolve().is_relative_to(ROOT) and sha(file) == expected
    assert sha(TOOL) == '5443f87db07b7f19cc273380c224b77b4b7ca124deac6d54f7a165628fc5e1fc'
    assert cmd([str(TOOL), '--version']) == 'midnight-zkir 2.1.0'
    names = manifest['circuits']
    assert len(names) == 10 and len(set(names)) == 10
    assert 'executeRuntimeAction' in names and 'prepareRuntimeAction' in names
    assert not (ROOT / 'key-build-report.json').exists(), 'No automatic retry or overwrite'
    process_check = subprocess.run(['pgrep', '-x', 'zkir'], capture_output=True)
    assert process_check.returncode == 1, 'Coordinate another compiler before building'
    assert mem()['MemAvailable'] > 13 * 1024**2 and shutil.disk_usage(ROOT).free > 4 * GIB
    meta = SWAP.lstat()
    assert stat.S_ISREG(meta.st_mode) and not SWAP.is_symlink() and SWAP.resolve() == SWAP
    assert meta.st_uid == 0 and meta.st_mode & 0o777 == 0o600 and meta.st_nlink == 1
    assert meta.st_size == 8 * GIB and meta.st_blocks * 512 >= meta.st_size
    identity = (meta.st_dev, meta.st_ino, meta.st_size, meta.st_mode, meta.st_uid)
    with SWAP.open('rb') as stream:
        stream.seek(os.sysconf('SC_PAGE_SIZE') - 10)
        assert stream.read(10) == b'SWAPSPACE2'
    original_swaps = swaps()
    assert not original_swaps or original_swaps == {str(SWAP)}
    original_swappiness = Path('/proc/sys/vm/swappiness').read_text().strip()
    report = {'kind': 'governance-v10-real-key-build', 'startedAtUtc': dt.datetime.now(dt.timezone.utc).isoformat(),
              'instanceId': 'i-t4ni11rkjyzgi0vlb68d', 'region': 'ap-southeast-1',
              'compilerVersion': '0.31.1', 'runtimeVersion': '0.16.0', 'zkirVersion': '2.1.0',
              'sourceRevision': manifest['sourceRevision'], 'inputsSha256': sha(ROOT / 'inputs.json'),
              'memoryHighBytes': 27 * GIB // 2, 'memoryMaxBytes': 14 * GIB, 'swapMaxBytes': 8 * GIB,
              'existingSwapActivatedHere': not original_swaps, 'newSwapCreated': False,
              'walletLoaded': False, 'transactionsSubmitted': 0, 'newDeployment': False,
              'entries': [], 'jobs': [], 'complete': False, 'milestoneComplete': False}
    save(ROOT / 'key-build-report.json', report)
    active_unit = None
    try:
        if not original_swaps:
            cmd(['swapon', str(SWAP)])
        assert swaps() == {str(SWAP)}
        Path('/proc/sys/vm/swappiness').write_text('60\n')
        (ROOT / 'keys').mkdir(mode=0o700)
        old_manifest = json.loads((OLD / 'keys/build-manifest.json').read_text())
        old_entries = {entry['name']: entry for entry in old_manifest['circuits']}
        # Build the costliest new entry first, then every changed remaining entry.
        for name in sorted(names, key=lambda name: (name != 'governAuthorization', name)):
            program = ROOT / 'zkir' / (name + '.zkir')
            entry = {'name': name, 'programSha256': sha(program)}
            if name in manifest['reuse']:
                old = old_entries[name]
                for key, expected in manifest['reuse'][name].items(): assert old[key] == expected
                assert sha(OLD / 'zkir' / (name + '.zkir')) == entry['programSha256'] == old['programSha256']
                for suffix in ['prover', 'verifier']:
                    source = OLD / 'keys' / (name + '.' + suffix)
                    assert sha(source) == old[suffix + 'Sha256']
                    os.link(source, ROOT / 'keys' / source.name)
                binary = OLD / 'zkir' / (name + '.bzkir')
                assert sha(binary) == old['binaryProgramSha256']
                os.link(binary, ROOT / 'zkir' / binary.name)
                entry['source'] = 'byte-identical-v9-program-and-verified-key-reuse'
            else:
                unit = 'permio-m6-v10-keys-' + name.lower() + '.service'
                assert cmd(['systemctl', 'show', unit, '-p', 'LoadState', '--value']) == 'not-found'
                log = ROOT / (name + '.compiler.txt')
                job = {'name': name, 'unit': unit, 'startedAtUtc': dt.datetime.now(dt.timezone.utc).isoformat()}
                report['jobs'].append(job)
                save(ROOT / 'key-build-report.json', report)
                cmd(['systemd-run', '--unit=' + unit, '--remain-after-exit', '--property=MemoryHigh=13824M',
                     '--property=MemoryMax=14G', '--property=MemorySwapMax=8G', '--property=CPUQuota=200%',
                     '--property=OOMPolicy=stop', '--property=RuntimeMaxSec=3650', '--property=TimeoutStopSec=15',
                     '--property=WorkingDirectory=' + str(ROOT), '--property=StandardOutput=append:' + str(log),
                     '--property=StandardError=append:' + str(log), '--setenv=HOME=/root',
                     '--setenv=RAYON_NUM_THREADS=1', '--setenv=TOKIO_WORKER_THREADS=1',
                     str(TOOL), 'compile', '--verbose', str(program), str(ROOT / 'keys' / (name + '.prover')),
                     str(ROOT / 'keys' / (name + '.verifier'))])
                active_unit = unit
                cgroup = Path('/sys/fs/cgroup/system.slice') / unit
                started = time.monotonic()
                with (ROOT / (name + '.resources.jsonl')).open('x') as stream:
                    while True:
                        state = dict(line.split('=', 1) for line in cmd(['systemctl', 'show', unit,
                            '-p', 'MainPID', '-p', 'Result', '-p', 'ExecMainStatus']).splitlines())
                        sample = {'atUtc': dt.datetime.now(dt.timezone.utc).isoformat(),
                                  'elapsedSeconds': time.monotonic() - started, 'state': state,
                                  'availableMemoryKiB': mem()['MemAvailable'], 'diskFreeBytes': shutil.disk_usage(ROOT).free}
                        for counter in ['memory.current', 'memory.peak', 'memory.swap.current', 'memory.events']:
                            file = cgroup / counter
                            if file.exists(): sample[counter] = file.read_text().strip()
                        for counter, wanted in [('memory.high', 27 * GIB // 2), ('memory.max', 14 * GIB), ('memory.swap.max', 8 * GIB)]:
                            if cgroup.exists(): assert (cgroup / counter).read_text().strip() == str(wanted)
                        stream.write(json.dumps(sample) + '\n'); stream.flush()
                        if state['MainPID'] == '0': break
                        assert sample['availableMemoryKiB'] > 512 * 1024, 'Host memory reserve'
                        assert sample['diskFreeBytes'] > GIB, 'Disk reserve'
                        assert sample['elapsedSeconds'] < 3600, 'Bounded compile duration'
                        time.sleep(3)
                job.update(completedAtUtc=dt.datetime.now(dt.timezone.utc).isoformat(), lastSample=sample)
                assert state['Result'] == 'success' and state['ExecMainStatus'] == '0'
                active_unit = None
                entry['source'] = 'real-pinned-zkir-compilation'
            for suffix in ['prover', 'verifier']:
                file = ROOT / 'keys' / (name + '.' + suffix)
                assert file.stat().st_size > 0
                entry[suffix + 'Bytes'] = file.stat().st_size
                entry[suffix + 'Sha256'] = sha(file)
            binary = ROOT / 'zkir' / (name + '.bzkir')
            entry.update(binaryProgramBytes=binary.stat().st_size, binaryProgramSha256=sha(binary))
            report['entries'].append(entry)
            save(ROOT / 'key-build-report.json', report)
        assert len(report['entries']) == 10
        for name, expected in manifest['files'].items(): assert sha(ROOT / name) == expected
        report['complete'] = True
    except Exception as error:
        report['errorType'] = type(error).__name__
        report['safeReason'] = str(error) if isinstance(error, AssertionError) else 'Owned public build failed; inspect sanitized compiler log'
        raise
    finally:
        if active_unit: cmd(['systemctl', 'stop', active_unit])
        if not original_swaps and str(SWAP) in swaps():
            memory = mem()
            assert memory['MemAvailable'] > memory['SwapTotal'] - memory['SwapFree'] + 512 * 1024
            cmd(['swapoff', str(SWAP)])
        assert swaps() == original_swaps
        Path('/proc/sys/vm/swappiness').write_text(original_swappiness + '\n')
        meta = SWAP.lstat()
        report.update(existingSwapPreserved=(meta.st_dev, meta.st_ino, meta.st_size, meta.st_mode, meta.st_uid) == identity,
                      originalSwapStateRestored=swaps() == original_swaps,
                      originalSwappinessRestored=Path('/proc/sys/vm/swappiness').read_text().strip() == original_swappiness,
                      completedAtUtc=dt.datetime.now(dt.timezone.utc).isoformat())
        save(ROOT / 'key-build-report.json', report)


if __name__ == '__main__':
    main()
