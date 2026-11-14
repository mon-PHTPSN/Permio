"""Owned, immutable public cache view; source files are never overwritten."""
import hashlib,json,os,re,stat
from pathlib import Path
ROOT=Path('/opt/permio-m6-governance-20261018-v10')
PUBLIC=Path('/opt/permio-m6-membership-20261015/public-cache')
INVENTORY_SHA='698e5d0510e8f837f9fc0336ada7c06e485b7c17cac680a99d02bb4a3c03fcfc'
def sha(p):
 h=hashlib.sha256()
 with p.open('rb') as f:
  for b in iter(lambda:f.read(1024**2),b''):h.update(b)
 return h.hexdigest()
def save(p,value):
 temp=p.with_suffix('.writing');temp.write_text(json.dumps(value,indent=2)+'\n');temp.chmod(0o600);temp.replace(p)
def location(kind):
 assert re.fullmatch(r'(first-flow-v[234]|preflight-v2)',kind)
 return ROOT/('prover-public-cache-'+kind)
def prepare(kind,output):
 inventory=ROOT/'builtin-cache-inventory-v1.json';assert sha(inventory)==INVENTORY_SHA
 data=json.loads(inventory.read_text());assert len(data['files'])==25
 directory=location(kind);assert not directory.exists() and not directory.is_symlink()
 directory.mkdir(mode=0o700);assert directory.resolve()==directory and directory.is_relative_to(ROOT)
 journal={'directory':str(directory),'inventorySha256':INVENTORY_SHA,'files':[],'removed':False}
 file=output/'public-cache-links.json';assert not file.exists();save(file,journal)
 for relative,expected in data['files'].items():
  assert re.fullmatch(r'zk-params/(bls_midnight_2p(6|1[0-9]|20|21)|(dust|zswap)/9/(spend|sign|output)\.(prover|verifier|bzkir))',relative)
  source=PUBLIC/relative if expected['source']=='reviewed-public-cache' else Path('/root/.cache/midnight')/relative
  if expected['source']!='reviewed-public-cache':assert relative=='zk-params/bls_midnight_2p21'
  s=source.lstat();assert source.resolve()==source and stat.S_ISREG(s.st_mode) and s.st_uid==0 and sha(source)==expected['sha256'] and s.st_size==expected['bytes']
  target=directory/relative;target.parent.mkdir(mode=0o700,parents=True,exist_ok=True)
  assert target.parent.resolve()==target.parent and target.is_relative_to(directory)
  journal['files'].append({'relative':relative,'device':s.st_dev,'inode':s.st_ino,**expected});save(file,journal)
  os.link(source,target,follow_symlinks=False);assert target.stat().st_ino==s.st_ino
 assert len(list(directory.rglob('*.prover')))==4
 return directory
def remove(kind,output):
 directory=location(kind);file=output/'public-cache-links.json'
 if not file.exists():assert not directory.exists();return True
 journal=json.loads(file.read_text());assert journal['directory']==str(directory) and journal['inventorySha256']==INVENTORY_SHA
 if journal['removed']:assert not directory.exists();return True
 assert directory.resolve()==directory and directory.is_relative_to(ROOT) and not directory.is_symlink()
 expected={entry['relative']:entry for entry in journal['files']}
 actual={p.relative_to(directory).as_posix() for p in directory.rglob('*') if p.is_file() or p.is_symlink()}
 assert actual.issubset(expected)
 for relative in actual:
  p=directory/relative;entry=expected[relative];s=p.lstat()
  assert not p.is_symlink() and stat.S_ISREG(s.st_mode) and (s.st_dev,s.st_ino,s.st_size)==(entry['device'],entry['inode'],entry['bytes']) and sha(p)==entry['sha256']
  p.unlink()
 for p in sorted((p for p in directory.rglob('*') if p.is_dir()),key=lambda p:len(p.parts),reverse=True):
  assert p.resolve()==p and not p.is_symlink() and p.is_relative_to(directory);p.rmdir()
 directory.rmdir();journal['removed']=True;save(file,journal);return True
