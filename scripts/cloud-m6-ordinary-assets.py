"""Verify genuine v9 output, install public assets in the isolated client and export metadata."""
import hashlib
import json
import os
from pathlib import Path
import tarfile

ROOT = Path('/opt/permio-m6-ordinary-action-20261018-v9')


def sha(file):
    result = hashlib.sha256()
    with file.open('rb') as stream:
        for part in iter(lambda: stream.read(1024**2), b''): result.update(part)
    return result.hexdigest()


def main():
    assert os.geteuid() == 0 and ROOT.resolve() == ROOT
    report = json.loads((ROOT / 'key-build-report.json').read_text())
    assert report['complete'] and report['existingSwapPreserved'] and report['originalSwapStateRestored'] and report['originalSwappinessRestored']
    assert len(report['entries']) == 13 and len({entry['name'] for entry in report['entries']}) == 13
    info = json.loads((ROOT / 'compiler/contract-info.json').read_text())
    assert {entry['name'] for entry in report['entries']} == {entry['name'] for entry in info['circuits'] if entry['proof']}
    for entry in report['entries']:
        name = entry['name']
        assert sha(ROOT / 'zkir' / (name + '.zkir')) == entry['programSha256']
        assert sha(ROOT / 'zkir' / (name + '.bzkir')) == entry['binaryProgramSha256']
        for suffix in ['prover', 'verifier']:
            file = ROOT / 'keys' / (name + '.' + suffix)
            assert sha(file) == entry[suffix + 'Sha256'] and file.stat().st_size == entry[suffix + 'Bytes']
    inventory = {'manifestVersion': 2, 'mode': 'real-bounded-keys', 'compilerVersion': '0.31.1', 'runtimeVersion': '0.16.0',
                 'generatedAtUtc': report['completedAtUtc'], 'contractSha256': sha(ROOT / 'contract/index.js'),
                 'compilerInfoSha256': sha(ROOT / 'compiler/contract-info.json'), 'circuits': report['entries']}
    manifest = ROOT / 'keys/build-manifest.json'
    assert not manifest.exists()
    with manifest.open('x') as stream: stream.write(json.dumps(inventory, indent=2) + '\n')
    manifest.chmod(0o600)
    assets = ROOT / 'client/packages/midnight-authorization/contracts/managed/permio-authorization'
    assert not assets.exists()
    public_files = []
    for directory in ['contract', 'compiler', 'zkir', 'keys']:
        destination = assets / directory
        destination.mkdir(mode=0o700, parents=True)
        for source in (ROOT / directory).iterdir():
            assert source.is_file() and not source.is_symlink()
            os.link(source, destination / source.name, follow_symlinks=False)
            if not source.name.endswith('.prover'): public_files.append(source)
    export = ROOT / 'public-assets-and-key-report-v1.tar.gz'
    assert not export.exists()
    with tarfile.open(export, 'w:gz') as bundle:
        for file in public_files + [ROOT / 'key-build-report.json', ROOT / 'inputs.json']:
            bundle.add(file, arcname=file.relative_to(ROOT).as_posix())
        for file in ROOT.glob('*.compiler.txt'): bundle.add(file, arcname=file.name)
        for file in ROOT.glob('*.resources.jsonl'): bundle.add(file, arcname=file.name)
    print(json.dumps({'genuineInventoryVerified': True, 'circuits': 13,
                      'publicClientAssetsInstalled': True, 'oldAssetsUnchanged': True,
                      'publicMetadataArchiveBytes': export.stat().st_size, 'publicMetadataArchiveSha256': sha(export),
                      'keyFiles': {entry['name']: {'bytes': entry['proverBytes'], 'sha256': entry['proverSha256']} for entry in report['entries']},
                      'walletLoaded': False, 'transactionsSubmitted': 0}))


if __name__ == '__main__': main()
