"""Temporarily reclaim byte-verified public caches for the owned M6 V9 job.

No wallets, credentials, private payloads, source trees or global tools are touched.
The old public cache archive has an exact local backup; the dependency archive
stays on ECS. Duplicate paths and the unused dependency tree are restored.
"""
import hashlib
import json
import os
from pathlib import Path
import shutil
import stat
import subprocess
import tarfile

ROOT=Path('/opt/permio-m6-ordinary-action-20261018-v9')
MEMBERSHIP=Path('/opt/permio-m6-membership-20261015')
RUNTIME=Path('/opt/permio-m6-runtime-20261017-v1')
MODULES=MEMBERSHIP/'client/node_modules'
ARCHIVE=MEMBERSHIP/'dependencies-reviewed.tar.gz'
ARCHIVE_SHA='3dd0150245b6ebb73d6a3de753204b0ce8c6e3e05d387c5421fe85a47c1b6b28'
CACHE_ARCHIVE_SHA='eb4d36b4cae19965afbd872495129e9c6c2b15f4b0d36dd476c04629e3cea352'
JOURNAL=ROOT/'space-recovery-journal-v2.json'

def sha(p):
 h=hashlib.sha256()
 with p.open('rb') as f:
  for chunk in iter(lambda:f.read(1024**2),b''):h.update(chunk)
 return h.hexdigest()

def write(value):
 temp=JOURNAL.with_suffix('.writing')
 with temp.open('w',encoding='utf-8') as f:
  json.dump(value,f,indent=2);f.write('\n');f.flush();os.fsync(f.fileno())
 temp.chmod(0o600);temp.replace(JOURNAL)

def safe_file(p):
 s=p.lstat()
 assert p.resolve()==p and stat.S_ISREG(s.st_mode) and not p.is_symlink()
 return s

def valid_pair(pair):
 a=Path(pair['replaceTemporarily']['path']);b=Path(pair['retain']['path'])
 if a.parent==RUNTIME/'reproduced-keys':
  assert a.name.endswith(('.prover','.verifier'))
  assert b==RUNTIME/'client/packages/midnight-authorization/contracts/managed/permio-authorization/keys'/a.name
 elif a==MEMBERSHIP/'output/membership.prover':
  assert b==MEMBERSHIP/'client/logs/m6-current-status-managed/keys/checkRuntimeStatusMultiproof.prover'
 else:
  assert a.is_relative_to(MEMBERSHIP/'public-cache')
  assert b==Path('/root/.cache/midnight')/a.relative_to(MEMBERSHIP/'public-cache')
 assert pair['replaceTemporarily']['sha256']==pair['retain']['sha256']
 return a,b

def closed_jobs():
 assert not Path('/proc/swaps').read_text().splitlines()[1:]
 assert subprocess.check_output(['docker','ps','--quiet'],text=True).strip()==''
 for version in range(1,9):
  for kind in ['controller','client']:
   if version==8 and kind=='controller':continue
   name='permio-m6-action-proof-'+kind+'-v'+str(version)+'.service'
   assert subprocess.check_output(['systemctl','show',name,'-p','MainPID','--value'],text=True).strip()=='0'

def verify_modules(directory,expected_links):
 assert sha(ARCHIVE)==ARCHIVE_SHA and directory.resolve()==directory and directory.is_dir() and not directory.is_symlink()
 expected=set();overrides={}
 with tarfile.open(ARCHIVE,'r:gz') as bundle:
  for entry in bundle:
   name=Path(entry.name)
   assert not name.is_absolute() and '..' not in name.parts and name.parts[0]=='node_modules'
   if entry.isdir():continue
   assert entry.isfile() and not entry.issym() and not entry.islnk()
   relative=name.relative_to('node_modules').as_posix();expected.add(relative)
   p=directory/relative;s=safe_file(p);assert s.st_size==entry.size
   h=hashlib.sha256();stream=bundle.extractfile(entry)
   for chunk in iter(lambda:stream.read(1024**2),b''):h.update(chunk)
   assert sha(p)==h.hexdigest(),relative
   if s.st_mode&0o777!=entry.mode&0o777:overrides[relative]=s.st_mode&0o777
 actual=set();links=[]
 for current,dirs,files in os.walk(directory,followlinks=False):
  for name in dirs+files:
   p=Path(current)/name
   if p.is_symlink():links.append({'path':p.relative_to(directory).as_posix(),'target':os.readlink(p)})
  for name in files:
   p=Path(current)/name
   if not p.is_symlink():assert p.is_file();actual.add(p.relative_to(directory).as_posix())
 assert actual==expected
 assert sorted(links,key=lambda x:x['path'])==sorted(expected_links,key=lambda x:x['path'])
 return {'regularFilesVerified':len(actual),'modeOverrides':overrides}

def reclaim():
 closed_jobs();assert ROOT.resolve()==ROOT and ROOT.stat().st_mode&0o777==0o700 and not JOURNAL.exists()
 plan=json.loads((ROOT/'space-recovery-plan-v2.json').read_text())
 assert plan['membershipDependencies']['allFilesCoveredAndMatching'] and not plan['membershipDependencies']['runtimeLinksIntoThisTree']
 pairs=plan['duplicatePairs'];assert len(pairs)==24
 for pair in pairs:
  a,b=valid_pair(pair)
  for p,m in [(a,pair['replaceTemporarily']),(b,pair['retain'])]:
   s=safe_file(p);assert s.st_nlink==1 and s.st_dev==m['device'] and s.st_ino==m['inode'] and s.st_size==m['bytes'] and sha(p)==m['sha256']
 for current,dirs,files in os.walk(RUNTIME/'client/node_modules',followlinks=False):
  for name in dirs+files:
   p=Path(current)/name
   if p.is_symlink():assert not p.resolve().is_relative_to(MODULES)
 root_stat=MODULES.lstat();assert MODULES.resolve()==MODULES and not MODULES.is_symlink()
 module_check=verify_modules(MODULES,plan['membershipDependencies']['symlinks'])
 journal={'kind':'owned-public-space-recovery-v9','duplicatePairs':pairs,'deduplicated':[],
  'dependencyLinks':plan['membershipDependencies']['symlinks'],'dependencyCheck':module_check,
  'dependencyRootMetadata':{'mode':root_stat.st_mode&0o777,'uid':root_stat.st_uid,'gid':root_stat.st_gid,'mtimeNs':root_stat.st_mtime_ns},
  'dependencyRemovalStarted':False,'cacheArchiveOffloaded':False,'restored':False}
 write(journal)
 for pair in pairs:
  a,b=valid_pair(pair);temp=a.with_name('.permio-m6-v8-link-'+a.name)
  assert not temp.exists() and not temp.is_symlink()
  os.link(b,temp,follow_symlinks=False);assert safe_file(temp).st_ino==b.stat().st_ino
  os.replace(temp,a);assert a.stat().st_ino==b.stat().st_ino and sha(a)==pair['retain']['sha256']
  journal['deduplicated'].append(str(a));write(journal)
 retired=ROOT/'retired-membership-node_modules';assert not retired.exists() and not retired.is_symlink()
 journal['dependencyRemovalStarted']=True;write(journal)
 MODULES.rename(retired)
 assert retired.resolve()==retired and retired.is_relative_to(ROOT) and not retired.is_symlink()
 shutil.rmtree(retired)
 cache=MEMBERSHIP/'public-cache.tar.gz'
 if cache.exists():
  s=safe_file(cache);assert s.st_nlink==1 and sha(cache)==CACHE_ARCHIVE_SHA
  assert plan['exactLocalCacheArchiveBackupVerified'] is True
  cache.unlink();journal['cacheArchiveOffloaded']=True
 journal['freeIncludingReservedAfterBytes']=os.statvfs(ROOT).f_bfree*os.statvfs(ROOT).f_frsize
 journal['availableAfterBytes']=os.statvfs(ROOT).f_bavail*os.statvfs(ROOT).f_frsize
 write(journal)
 return journal

def restore():
 closed_jobs()
 if not JOURNAL.exists():return {'reclaimJournalAbsent':True,'restored':True}
 journal=json.loads(JOURNAL.read_text())
 if journal['restored']:return journal
 if journal['dependencyRemovalStarted'] and not MODULES.exists():
  retired=ROOT/'retired-membership-node_modules'
  if retired.exists():
   assert retired.resolve()==retired and not retired.is_symlink() and retired.is_relative_to(ROOT)
   shutil.rmtree(retired)
  parent=ROOT/'dependency-restore';parent.mkdir(mode=0o700,exist_ok=True)
  directory=parent/'node_modules'
  assert not directory.exists() and not directory.is_symlink() and sha(ARCHIVE)==ARCHIVE_SHA
  with tarfile.open(ARCHIVE,'r:gz') as bundle:
   for entry in bundle.getmembers():
    p=Path(entry.name);assert not p.is_absolute() and '..' not in p.parts and p.parts[0]=='node_modules'
    assert entry.isfile() or entry.isdir()
   bundle.extractall(parent,filter='data')
  for link in journal['dependencyLinks']:
   p=directory/link['path'];assert p.is_relative_to(directory) and not p.exists() and not p.is_symlink()
   p.parent.mkdir(parents=True,exist_ok=True);p.symlink_to(link['target'])
  for relative,mode in journal['dependencyCheck']['modeOverrides'].items():(directory/relative).chmod(mode)
  check=verify_modules(directory,journal['dependencyLinks'])
  assert check['modeOverrides']==journal['dependencyCheck']['modeOverrides']
  directory.rename(MODULES);parent.rmdir()
  m=journal['dependencyRootMetadata'];os.chown(MODULES,m['uid'],m['gid']);MODULES.chmod(m['mode']);os.utime(MODULES,ns=(m['mtimeNs'],m['mtimeNs']))
  journal['dependenciesRestoredAndHashVerified']=True;write(journal)
 elif journal['dependencyRemovalStarted']:
  check=verify_modules(MODULES,journal['dependencyLinks']);assert check['modeOverrides']==journal['dependencyCheck']['modeOverrides']
  journal['dependenciesRestoredAndHashVerified']=True;write(journal)
 for pair in journal['duplicatePairs']:
  a,b=valid_pair(pair);original=pair['replaceTemporarily'];sa=safe_file(a);sb=safe_file(b)
  assert sha(a)==sha(b)==original['sha256']
  link_temp=a.with_name('.permio-m6-v8-link-'+a.name)
  if link_temp.exists():
   assert safe_file(link_temp).st_ino==sb.st_ino;link_temp.unlink()
  if sa.st_ino==sb.st_ino:
   temp=a.with_name('.permio-m6-v8-restore-'+a.name);assert not temp.is_symlink()
   if temp.exists():
    s=safe_file(temp);assert s.st_uid==0 and s.st_size<=original['bytes'];temp.unlink()
   shutil.copyfile(b,temp);os.chown(temp,original['uid'],original['gid']);temp.chmod(original['mode'])
   os.utime(temp,ns=(original['mtimeNs'],original['mtimeNs']));assert sha(temp)==original['sha256']
   temp.replace(a)
  assert safe_file(a).st_ino!=safe_file(b).st_ino and a.stat().st_nlink==1
 for pair in journal['duplicatePairs']:assert Path(pair['retain']['path']).stat().st_nlink==1
 journal.update(restored=True,duplicateContentsAndSeparateFilesRestored=True)
 write(journal)
 return journal
