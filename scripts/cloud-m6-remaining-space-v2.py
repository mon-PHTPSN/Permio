"""Reversible recovery of exact, locally backed-up PUBLIC artifacts only.

The reviewed plan records every path, hash, metadata and restoration source.
All instance jobs must be stopped before reclaim/restore. No private tree,
credential, wallet, source file or unverified last copy is a recovery target.
"""
import fcntl,hashlib,json,os,shutil,stat,subprocess,sys,tarfile
from pathlib import Path

ROOT=Path('/opt/permio-m6-remaining-preprod-20261019-v1')
MODULES=Path('/opt/permio-m6-membership-20261015/client/node_modules')
ARCHIVE=Path('/opt/permio-m6-membership-20261015/dependencies-reviewed.tar.gz')
ARCHIVE_SHA='3dd0150245b6ebb73d6a3de753204b0ce8c6e3e05d387c5421fe85a47c1b6b28'
JOURNAL=ROOT/'public-space-journal-v2.json'
RUNTIME=Path('/opt/permio-m6-runtime-20261017-v1')
MEMBERSHIP=Path('/opt/permio-m6-membership-20261015')
OLD=Path('/opt/permio-m6-ordinary-action-20261018-v9')

def sha(p):
 with p.open('rb') as f:return hashlib.file_digest(f,'sha256').hexdigest()

def save(v):
 t=JOURNAL.with_suffix('.writing');t.write_text(json.dumps(v,indent=2)+'\n');t.chmod(0o600);t.replace(JOURNAL)

def metadata(p):
 s=p.lstat();assert p.resolve()==p and stat.S_ISREG(s.st_mode) and not p.is_symlink()
 return {'path':str(p),'bytes':s.st_size,'device':s.st_dev,'inode':s.st_ino,'links':s.st_nlink,
  'allocatedBytes':s.st_blocks*512,'mode':s.st_mode&0o777,'uid':s.st_uid,'gid':s.st_gid,'mtimeNs':s.st_mtime_ns}

def closed():
 assert os.geteuid()==0 and ROOT.resolve()==ROOT and ROOT.stat().st_mode&0o777==0o700
 assert not subprocess.check_output(['docker','ps','--quiet'],text=True).strip()
 assert not Path('/proc/swaps').read_text().splitlines()[1:]
 for mode in ['deploy-only','prepare-governance','ordinary-matrix']:
  for role in ['controller','client']:
   n='permio-m6-remaining-'+mode+'-v1-'+role+'.service'
   assert subprocess.check_output(['systemctl','show',n,'-p','MainPID','--value'],text=True).strip()=='0'
 for version in [2,3,4,5,6,7,8]:
  for role in ['controller','client']:
   assert subprocess.check_output(['systemctl','show','permio-m6-remaining-ordinary-matrix-v'+str(version)+'-'+role+'.service','-p','MainPID','--value'],text=True).strip()=='0'

def allowed_pair(pair):
 a,b=map(lambda x:Path(pair[x]['path']),['replaceTemporarily','retain'])
 assert a!=b
 if a.parent==RUNTIME/'reproduced-keys':
  assert a.suffix in ['.prover','.verifier'] and b==RUNTIME/'client/packages/midnight-authorization/contracts/managed/permio-authorization/keys'/a.name
 else:
  assert a.is_relative_to(MEMBERSHIP/'public-cache') and b==Path('/root/.cache/midnight')/a.relative_to(MEMBERSHIP/'public-cache')
 return a,b

def allowed_offload(p):
 exact={ARCHIVE,MEMBERSHIP/'output/membership.prover',MEMBERSHIP/'client/logs/m6-current-status-managed/keys/checkRuntimeStatusMultiproof.prover',
  Path('/root/.cache/midnight/zk-params/bls_midnight_2p22'),Path('/opt/permio-m6-action-boundary-20261017-v8/output/action.prover')}
 names={'submitAuthorityRootApproval.prover','proposeProofModule.prover','reviewProofModule.prover','governProofModule.prover'}
 apt={'containerd_2.2.2-0ubuntu1.1_amd64.deb','docker.io_29.1.3-0ubuntu4.1_amd64.deb','runc_1.4.0-0ubuntu1_amd64.deb'}
 assert p in exact or p.name in names and p.parent in [OLD/'keys',OLD/'client/packages/midnight-authorization/contracts/managed/permio-authorization/keys'] or p.parent==Path('/var/cache/apt/archives') and p.name in apt

def verify_dependencies():
 assert MODULES.resolve()==MODULES and MODULES.is_dir() and not MODULES.is_symlink() and sha(ARCHIVE)==ARCHIVE_SHA
 expected=set();entries={};overrides={}
 with tarfile.open(ARCHIVE,'r:gz') as bundle:
  for entry in bundle:
   n=Path(entry.name);assert n.parts[0]=='node_modules' and not n.is_absolute() and '..' not in n.parts
   if entry.isdir():continue
   assert entry.isfile() and not entry.issym() and not entry.islnk()
   relative=n.relative_to('node_modules').as_posix();p=MODULES/relative;s=p.lstat();expected.add(relative)
   assert stat.S_ISREG(s.st_mode) and not p.is_symlink() and s.st_nlink==1 and s.st_size==entry.size
   stream=bundle.extractfile(entry);assert hashlib.file_digest(stream,'sha256').hexdigest()==sha(p)
   entries[relative]={'mode':s.st_mode&0o777,'uid':s.st_uid,'gid':s.st_gid,'mtimeNs':s.st_mtime_ns}
 actual=set();links=[];directories={}
 for current,dirs,files in os.walk(MODULES,followlinks=False):
  for name in dirs+files:
   p=Path(current)/name;s=p.lstat();relative=p.relative_to(MODULES).as_posix()
   if p.is_symlink():links.append({'path':relative,'target':os.readlink(p)})
   elif p.is_file():actual.add(relative)
   elif p.is_dir():directories[relative]={'mode':s.st_mode&0o777,'uid':s.st_uid,'gid':s.st_gid,'mtimeNs':s.st_mtime_ns}
 assert actual==expected
 s=MODULES.stat();directories['.']={'mode':s.st_mode&0o777,'uid':s.st_uid,'gid':s.st_gid,'mtimeNs':s.st_mtime_ns}
 return {'files':entries,'directories':directories,'links':links,'archiveSha256':ARCHIVE_SHA}

def package_locks():
 locks=[]
 for name in ['/var/lib/dpkg/lock-frontend','/var/lib/dpkg/lock','/var/cache/apt/archives/lock']:
  f=open(name,'a+');fcntl.lockf(f.fileno(),fcntl.LOCK_EX|fcntl.LOCK_NB);locks.append(f)
 return locks

def reclaim():
 closed();assert not JOURNAL.exists();locks=package_locks()
 plan=json.loads((ROOT/'public-space-plan-v2.json').read_text());assert plan['allLocalBackupsVerified'] and plan['publicOnly']
 pairs=plan['duplicatePairs'];assert len(pairs)==23
 for pair in pairs:
  a,b=allowed_pair(pair)
  for p,m in [(a,pair['replaceTemporarily']),(b,pair['retain'])]:
   assert metadata(p)==m and m['links']==1 and sha(p)==pair['sha256']
 records=plan['offloads'];assert len(records)==11
 for record in records:
  assert record['localBackupVerified']
  for m in record['paths']:
   p=Path(m['path']);allowed_offload(p);assert metadata(p)==m and sha(p)==record['sha256']
 # Public archives cover every byte and preserve every file's original metadata.
 deps=verify_dependencies()
 for base in [ROOT/'client/node_modules',Path('/opt/permio-m6-governance-20261018-v10/client/node_modules'),RUNTIME/'client/node_modules']:
  for current,dirs,files in os.walk(base,followlinks=False):
   for name in dirs+files:
    p=Path(current)/name
    if p.is_symlink():assert not p.resolve().is_relative_to(MODULES)
 journal={'kind':'m6-remaining-public-space','planSha256':sha(ROOT/'public-space-plan-v2.json'),'pairs':pairs,'offloads':records,
  'dependencies':deps,'deduplicated':[],'offloaded':[],'dependencyRemovalStarted':False,'restored':False}
 save(journal)
 for pair in pairs:
  a,b=allowed_pair(pair);tmp=a.with_name('.m6-remaining-link-'+a.name);assert not tmp.exists()
  os.link(b,tmp,follow_symlinks=False);tmp.replace(a);assert sha(a)==pair['sha256']
  journal['deduplicated'].append(str(a));save(journal)
 journal['dependencyRemovalStarted']=True;save(journal)
 retired=ROOT/'retired-public-membership-dependencies';assert not retired.exists()
 MODULES.rename(retired);assert retired.resolve()==retired and retired.is_relative_to(ROOT) and not retired.is_symlink();shutil.rmtree(retired)
 for record in records:
  for m in record['paths']:
   p=Path(m['path']);allowed_offload(p);assert sha(p)==record['sha256'];p.unlink()
   journal['offloaded'].append(str(p));save(journal)
 v=os.statvfs(ROOT);journal['physicalFreeAfterBytes']=v.f_bfree*v.f_frsize
 assert journal['physicalFreeAfterBytes']>=55*1024**3//8+3*1024**3//4
 save(journal);return {'reclaimed':True,'physicalFreeBytes':journal['physicalFreeAfterBytes'],'publicOffloadedPaths':len(journal['offloaded']),
  'publicDuplicatePairs':len(pairs),'dependencyFilesVerified':len(deps['files']),'allRestoreSourcesVerifiedLocally':True}

def restore():
 closed();locks=package_locks();j=json.loads(JOURNAL.read_text())
 if j['restored']:return {'restored':True,'alreadyRestored':True}
 # Offloaded public bytes are restored from checksum-verified, safe transfer
 # files first. A source may be reused for several formerly hardlinked paths.
 for i,record in enumerate(j['offloads']):
  paths=[Path(m['path']) for m in record['paths']]
  missing=[p for p in paths if not p.exists()]
  if missing:
   anchor=next((p for p in paths if p.exists()),None)
   first=missing[0]
   if anchor is None:
    source=ROOT/'transfer'/('restore-public-'+str(i).zfill(2)+'.bin')
    assert source.resolve()==source and source.is_file() and not source.is_symlink() and sha(source)==record['sha256']
    meta=next(m for m in record['paths'] if m['path']==str(first));assert source.stat().st_size==meta['bytes']
   else:assert sha(anchor)==record['sha256']
   for p in missing:
    allowed_offload(p);assert not p.is_symlink()
    if p==first and anchor is None:source.rename(p);anchor=p
    elif record.get('originallyHardlinked'):os.link(anchor,p,follow_symlinks=False)
    else:shutil.copyfile(anchor,p)
  for m in record['paths']:
   p=Path(m['path']);assert sha(p)==record['sha256'];os.chown(p,m['uid'],m['gid']);p.chmod(m['mode']);os.utime(p,ns=(m['mtimeNs'],m['mtimeNs']))
  assert all(metadata(Path(m['path']))['links']==m['links'] for m in record['paths'])
 if j['dependencyRemovalStarted'] and not MODULES.exists():
  assert sha(ARCHIVE)==ARCHIVE_SHA
  parent=ROOT/'public-dependency-restore';assert not parent.exists();parent.mkdir(mode=0o700)
  with tarfile.open(ARCHIVE,'r:gz') as bundle:
   for entry in bundle.getmembers():
    n=Path(entry.name);assert not n.is_absolute() and '..' not in n.parts and n.parts[0]=='node_modules' and (entry.isfile() or entry.isdir())
   bundle.extractall(parent,filter='data')
  directory=parent/'node_modules';d=j['dependencies']
  for link in d['links']:
   p=directory/link['path'];assert p.is_relative_to(directory) and not p.exists() and not p.is_symlink();p.parent.mkdir(parents=True,exist_ok=True);p.symlink_to(link['target'])
  for relative,m in d['files'].items():
   p=directory/relative;os.chown(p,m['uid'],m['gid']);p.chmod(m['mode']);os.utime(p,ns=(m['mtimeNs'],m['mtimeNs']))
  for relative,m in sorted(d['directories'].items(),key=lambda x:len(Path(x[0]).parts),reverse=True):
   p=directory/relative;os.chown(p,m['uid'],m['gid']);p.chmod(m['mode']);os.utime(p,ns=(m['mtimeNs'],m['mtimeNs']))
  directory.rename(MODULES);parent.rmdir()
 assert verify_dependencies()==j['dependencies']
 for pair in j['pairs']:
  a,b=allowed_pair(pair);m=pair['replaceTemporarily'];assert sha(a)==sha(b)==pair['sha256']
  if a.stat().st_ino==b.stat().st_ino:
   tmp=a.with_name('.m6-remaining-restore-'+a.name);assert not tmp.exists();shutil.copyfile(b,tmp)
   os.chown(tmp,m['uid'],m['gid']);tmp.chmod(m['mode']);os.utime(tmp,ns=(m['mtimeNs'],m['mtimeNs']));assert sha(tmp)==pair['sha256'];tmp.replace(a)
  for p,original in [(a,m),(b,pair['retain'])]:
   actual=metadata(p);assert all(actual[k]==original[k] for k in ['bytes','links','mode','uid','gid','mtimeNs'])
 j.update(restored=True,allContentAndMetadataRestored=True);save(j)
 return {'restored':True,'allContentAndMetadataRestored':True,'offloadedPublicPaths':len(j['offloaded']),'duplicatePairsRestored':len(j['pairs'])}

if __name__=='__main__':
 assert len(sys.argv)==2 and sys.argv[1] in ['reclaim','restore']
 print(json.dumps(reclaim() if sys.argv[1]=='reclaim' else restore()))
