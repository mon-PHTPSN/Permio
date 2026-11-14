"""Linux-only disposable integration test; no Docker, swap or package locks."""
import importlib.util,json,os,shutil,tarfile,tempfile
from pathlib import Path

source=Path(__file__).absolute().parent.parent/'cloud-m6-remaining-space.py'
spec=importlib.util.spec_from_file_location('owned_space_under_test',source)
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
with tempfile.TemporaryDirectory(prefix='permio-public-restore-test-') as tmp:
 base=Path(tmp);m.ROOT=base/'owned';m.ROOT.mkdir();(m.ROOT/'transfer').mkdir()
 m.MEMBERSHIP=base/'membership';m.RUNTIME=base/'runtime';m.MODULES=m.MEMBERSHIP/'client/node_modules'
 m.ARCHIVE=m.MEMBERSHIP/'dependencies-reviewed.tar.gz';m.JOURNAL=m.ROOT/'journal.json'
 m.MODULES.mkdir(parents=True);(m.MODULES/'package').mkdir();(m.MODULES/'package/one.js').write_text('public one')
 (m.MODULES/'package/two.js').write_text('public two');(m.MODULES/'bin').symlink_to('package/one.js')
 with tarfile.open(m.ARCHIVE,'w:gz') as t:
  for p in sorted(m.MODULES.rglob('*')):
   if not p.is_symlink():t.add(p,arcname='node_modules/'+p.relative_to(m.MODULES).as_posix(),recursive=False)
 m.ARCHIVE_SHA=m.sha(m.ARCHIVE)
 pairs=[]
 for n in range(23):
  a=m.RUNTIME/'reproduced-keys'/f'public-{n}.prover'
  b=m.RUNTIME/'client/packages/midnight-authorization/contracts/managed/permio-authorization/keys'/a.name
  for p in [a,b]:p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(('public-key-'+str(n)).encode())
  pairs.append({'replaceTemporarily':m.metadata(a),'retain':m.metadata(b),'sha256':m.sha(a)})
 records=[];backups={}
 for n in range(11):
  a=m.ARCHIVE if n==10 else base/'public'/f'cached-{n}.bin'
  if n!=10:a.parent.mkdir(exist_ok=True);a.write_bytes(('public-offload-'+str(n)).encode())
  paths=[a]
  if n in [0,1]:
   b=a.with_suffix('.second')
   if n==0:os.link(a,b)
   else:shutil.copyfile(a,b);b.chmod(0o600)
   paths.append(b)
  records.append({'paths':[m.metadata(p) for p in paths],'sha256':m.sha(a),'originallyHardlinked':n==0,'localBackupVerified':True})
  backups[n]=a.read_bytes()
 plan={'allLocalBackupsVerified':True,'publicOnly':True,'duplicatePairs':pairs,'offloads':records}
 (m.ROOT/'public-space-plan-v1.json').write_text(json.dumps(plan))
 # Only test-local guards are substituted. The production content/metadata,
 # archive completeness, hardlink and restore checks execute unchanged.
 m.closed=lambda:None;m.package_locks=lambda:[]
 def inside(p):assert p.is_relative_to(base)
 m.allowed_offload=inside
 result=m.reclaim();assert result['reclaimed'] and not m.MODULES.exists()
 for n,data in backups.items():(m.ROOT/'transfer'/f'restore-public-{n:02d}.bin').write_bytes(data)
 # Simulate interruption after the first path of a hardlinked record restored.
 first=Path(records[0]['paths'][0]['path']);(m.ROOT/'transfer/restore-public-00.bin').rename(first)
 result=m.restore();assert result['restored'] and result['allContentAndMetadataRestored']
 assert m.restore()['alreadyRestored']
 for pair in pairs:
  a,b=m.allowed_pair(pair);assert a.stat().st_ino!=b.stat().st_ino
 print(json.dumps({'publicSpaceRoundTripPassed':True,'duplicatePairs':23,'offloadRecords':11,
  'interruptedHardlinkRestoreRecovered':True,'idempotentSecondRestore':True,'realHostResourcesModified':False}))
