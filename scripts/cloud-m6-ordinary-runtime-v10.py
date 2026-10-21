"""Owned single-attempt Preprod runtime. Caller independently renews the ECS lease.

The real patched pinned prover is private on loopback. Application proofs and
wallet workers run sequentially; no cloud credentials, retries or other jobs.
"""
import datetime as dt
import hashlib,importlib.util,json,os,signal,stat,subprocess,sys,time,urllib.request
from pathlib import Path

ROOT=Path('/opt/permio-m6-governance-20261018-v10')
NODE=Path('/opt/permio-m6-membership-20261015/node-v22.23.2-linux-x64/bin/node')
BINARY=Path('/opt/permio-m6-action-proof-20261017-v8/backend/midnight-proof-server')
BINARY_SHA='0661d89eb6a9e18041a41f35a13fe6789d0f149e2244ae3587921114e31c9093'
IMAGE='midnightntwrk/proof-server@sha256:0f4ab0716985eaebbe55a970348f52ff05ffd8a96631ed7232bd0c4ba02c115c'
LOADER='/nix/store/jms7zxzm7w1whczwny5m3gkgdjghmi2r-glibc-2.42-51/lib/ld-linux-x86-64.so.2'
LIBS='/nix/store/jms7zxzm7w1whczwny5m3gkgdjghmi2r-glibc-2.42-51/lib:/nix/store/vpxblivamvic1p5r5zny934jvg33m50r-xgcc-15.2.0-libgcc/lib:/nix/store/1ga782ml07vy0h503ac4cin0h8d7q6yh-libidn2-2.3.8/lib:/nix/store/p7jg95rzvfalb95k3mskk0jqxc9d724n-libunistring-1.4.1/lib'
OWNER='permio-m6-ordinary-action-v9-20261018'
GIB=1024**3
TEMP_SWAP=13*GIB//2
TOTAL_SWAP=8*GIB+TEMP_SWAP
SWAP=Path('/var/lib/permio-m6/swapfile')
TEMP=ROOT/'ordinary-runtime-paging.swap'
PROVER_RAM=27*GIB//2
DISK_RESERVE=3*GIB//4
CACHE_MODULE_SHA='b53b59cf97b04ff87382a2d9a80d63b10be3a93b9590f1b031a17882142ef402'
INTERRUPTED=False

def sha(p):
 h=hashlib.sha256()
 with p.open('rb') as f:
  for b in iter(lambda:f.read(1024**2),b''):h.update(b)
 return h.hexdigest()
def command(args,timeout=60):
 return subprocess.check_output(args,text=True,stderr=subprocess.DEVNULL,timeout=timeout).strip()
def save(p,value):
 temp=p.with_suffix('.writing');temp.write_text(json.dumps(value,indent=2)+'\n');temp.chmod(0o600);temp.replace(p)
def identity(p):
 s=p.lstat();assert p.resolve()==p and stat.S_ISREG(s.st_mode) and not p.is_symlink()
 return (s.st_dev,s.st_ino,s.st_size,s.st_uid,s.st_gid,s.st_mode&0o777,s.st_nlink)
def swaps():return {line.split()[0] for line in Path('/proc/swaps').read_text().splitlines()[1:]}
def memory():return {line.split(':')[0]:int(line.split()[1]) for line in Path('/proc/meminfo').read_text().splitlines()}
def sample(group):
 result={}
 for name in ['memory.current','memory.peak','memory.swap.current','memory.swap.peak','memory.events']:
  p=group/name
  if p.exists():result[name]=p.read_text().strip()
 return result

def main():
 global INTERRUPTED
 assert len(sys.argv)==2 and sys.argv[1] in ['--preflight','--execute-first-flow-v1','--resume-after-admission-begin-v1','--resume-after-admission-finalized-v1']
 mode=sys.argv[1];live=mode!='--preflight';resuming=mode.startswith('--resume-')
 kind='first-flow-v4' if mode=='--resume-after-admission-finalized-v1' else 'first-flow-v3' if resuming else ('first-flow' if live else 'preflight')+'-v2'
 name='permio-m6-ordinary-v10-'+kind;unit=name+'-client.service'
 output=ROOT/('runtime-'+kind);control=ROOT/'control';client=ROOT/'client'
 assert os.geteuid()==0 and ROOT.resolve()==ROOT and ROOT.stat().st_mode&0o777==0o700
 assert not output.exists() and command(['docker','ps','--quiet'])=='' and not swaps()
 assert command(['systemctl','show',unit,'-p','LoadState','--value'])=='not-found'
 assert sha(BINARY)==BINARY_SHA and command([str(NODE),'--version'])=='v22.23.2'
 image=json.loads(command(['docker','image','inspect',IMAGE]))[0];assert IMAGE in image['RepoDigests']
 manifest=json.loads((client/'public-client-source-manifest.json').read_text())
 for relative,expected in manifest['files'].items():assert sha(client/relative)==expected
 assert memory()['MemAvailable']>13*1024**2
 output.mkdir(mode=0o700);control.mkdir(mode=0o700,exist_ok=True)
 assert control.resolve()==control and not list(control.iterdir())
 private=ROOT/'private';assert private.resolve()==private and private.stat().st_mode&0o777==0o700
 assert identity(private/'inputs.json')[3:]==(0,0,0o600,1)
 before=identity(SWAP);assert before[2:]==(8*GIB,0,0,0o600,1)
 original_vm=Path('/proc/sys/vm/swappiness').read_text().strip()
 cache_module=ROOT/'ordinary-runtime-cache-v1.py';assert sha(cache_module)==CACHE_MODULE_SHA
 spec=importlib.util.spec_from_file_location('owned_v10_public_cache',cache_module)
 cache=importlib.util.module_from_spec(spec);spec.loader.exec_module(cache)
 report={'kind':'ordinary-action-v10-owned-runtime','mode':mode,'instanceId':'i-t4ni11rkjyzgi0vlb68d','region':'ap-southeast-1',
  'startedAtUtc':dt.datetime.now(dt.timezone.utc).isoformat(),'sourceManifestSha256':sha(client/'public-client-source-manifest.json'),
  'nativeBinarySha256':BINARY_SHA,'proverMemoryMaxBytes':PROVER_RAM,'clientMemoryMaxBytes':4*GIB,'clientCpuCores':2,
  'clientProofPhaseMemoryHighBytes':GIB,'sharedHostSwapBytes':TOTAL_SWAP if live else 0,'diskReserveBytes':DISK_RESERVE,'automaticRetries':0,
  'transactionCap':40 if live else 0,'resetCount':0,'milestoneComplete':False,'stage':'initialization'}
 container=None;client_started=False;temp_identity=None;started=time.monotonic();active_swap=False;cache_directory=None
 def interrupted(signum,frame):
  global INTERRUPTED
  INTERRUPTED=True
 for sig in [signal.SIGTERM,signal.SIGINT]:signal.signal(sig,interrupted)
 def state():return dict(line.split('=',1) for line in command(['systemctl','show',unit,'-p','MainPID','-p','Result','-p','ExecMainStatus']).splitlines())
 def inspect():
  item=json.loads(command(['docker','inspect',container]))[0]
  assert item['Name']=='/'+name and item['Config']['Labels']['permio.owner']==OWNER
  assert item['HostConfig']['NetworkMode']!='host' and item['HostConfig']['PortBindings']=={'6300/tcp':[{'HostIp':'127.0.0.1','HostPort':'6300'}]}
  assert item['HostConfig']['Memory']==PROVER_RAM and item['HostConfig']['MemorySwap']==PROVER_RAM+(TOTAL_SWAP if live else 0)
  assert item['HostConfig']['NanoCpus']==(2_000_000_000 if resuming else 1_000_000_000)
  assert 'RAYON_NUM_THREADS='+('2' if resuming else '1') in item['Config']['Env']
  assert item['HostConfig']['LogConfig']['Type']=='none' and all(not mount['RW'] for mount in item['Mounts'])
  return item
 def ready():
  inspect();group=Path('/sys/fs/cgroup/system.slice/docker-'+container+'.scope')
  (group/'memory.high').write_text(str(PROVER_RAM)+'\n')
  assert (group/'memory.max').read_text().strip()==str(PROVER_RAM)
  assert (group/'memory.swap.max').read_text().strip()==str(TOTAL_SWAP if live else 0)
  for attempt in range(60):
   assert inspect()['State']['Running'] and not INTERRUPTED
   try:
    with urllib.request.build_opener(urllib.request.ProxyHandler({})).open('http://127.0.0.1:6300/version',timeout=1) as r:
     assert r.read(256).decode().strip()=='8.1.3'
    command(['docker','exec',container,'/nix/store/d24gb0hj1rasyyp3jh0x52i5fd4mkxsi-bash-interactive-x86_64-unknown-linux-musl-5.3p9/bin/bash',
     '-c','test -r /.cache/midnight/zk-params/dust/9/spend.prover && test -r /.cache/midnight/zk-params/zswap/9/spend.prover && test -r /.cache/midnight/zk-params/bls_midnight_2p21'])
    report['builtInKeyPathsReadable']=True
    return
   except (OSError,urllib.error.URLError):time.sleep(1)
  raise TimeoutError('Owned prover readiness')
 try:
  report['stage']='public-cache-setup';cache_directory=cache.prepare(kind,output)
  report['publicCacheInventorySha256']=cache.INVENTORY_SHA
  if live:
   report['stage']='swap-setup'
   disk=os.statvfs(ROOT);assert disk.f_bfree*disk.f_frsize>=TEMP_SWAP+DISK_RESERVE
   assert not TEMP.exists() and not TEMP.is_symlink()
   fd=os.open(TEMP,os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_NOFOLLOW,0o600)
   try:os.posix_fallocate(fd,0,TEMP_SWAP);os.fsync(fd)
   finally:os.close(fd)
   temp_identity=identity(TEMP);assert TEMP.stat().st_blocks*512>=TEMP_SWAP
   command(['mkswap','--quiet',str(TEMP)]);active_swap=True;command(['swapon',str(SWAP)]);command(['swapon',str(TEMP)])
   assert swaps()=={str(SWAP),str(TEMP)}
   Path('/proc/sys/vm/swappiness').write_text('60\n')
  report['stage']='prover-start'
  container=command(['docker','create','--name',name,'--label','permio.owner='+OWNER,'--cpus','2' if resuming else '1',
   '--memory',str(PROVER_RAM),'--memory-swap',str(PROVER_RAM+(TOTAL_SWAP if live else 0)),'--pids-limit','128',
   '--publish','127.0.0.1:6300:6300','--log-driver','none','--security-opt','no-new-privileges','--cap-drop','ALL',
   '--mount','type=bind,src='+str(cache_directory)+',dst=/.cache/midnight,readonly',
   '--mount','type=bind,src='+str(BINARY)+',dst=/opt/permio-owned/midnight-proof-server,readonly',
   '--env','RAYON_NUM_THREADS='+('2' if resuming else '1'),'--env','RUST_LOG=warn','--env','HOME=/','--env','XDG_CACHE_HOME=/.cache',
   '--entrypoint',LOADER,IMAGE,'--library-path',LIBS,'/opt/permio-owned/midnight-proof-server',
   '--port','6300','--no-fetch-params','--num-workers','1','--job-capacity','1','--job-timeout','3600'])
  inspect();command(['docker','start',container]);ready();report.update(containerId=container,loopbackOnly=True)
  report['stage']='client-start'
  log=output/'client-public.jsonl';log.touch(mode=0o600)
  command(['systemd-run','--unit='+unit,'--remain-after-exit','--property=MemoryMax=4G','--property=MemoryHigh=3584M',
   '--property=MemorySwapMax='+(str(TOTAL_SWAP) if live else '0'),'--property=CPUQuota=200%','--property=TasksMax=256',
   '--property=RuntimeMaxSec=21600','--property=TimeoutStopSec=30','--property=KillMode=control-group','--property=Restart=no',
   '--property=WorkingDirectory='+str(client),'--property=StandardOutput=append:'+str(log),'--property=StandardError=append:'+str(log),
   str(NODE),'--expose-gc','--experimental-strip-types','--max-old-space-size=2048','scripts/run-live-m6-ordinary.ts',mode])
  client_started=True;client_group=Path('/sys/fs/cgroup/system.slice')/unit
  assert (client_group/'memory.max').read_text().strip()==str(4*GIB)
  report['stage']='client-running';save(output/'report.json',report)
  with (output/'resources.jsonl').open('x') as samples:
   while True:
    current=state();info=inspect();mem=memory();disk=os.statvfs(ROOT)
    row={'atUtc':dt.datetime.now(dt.timezone.utc).isoformat(),'elapsedSeconds':time.monotonic()-started,
     'clientState':current,'proverState':{key:info['State'][key] for key in ['Running','OOMKilled','ExitCode']},
     'client':sample(client_group),'prover':sample(Path('/sys/fs/cgroup/system.slice/docker-'+container+'.scope')),
     'hostMemAvailableKiB':mem['MemAvailable'],'hostSwapFreeKiB':mem['SwapFree'],'physicalFreeDiskBytes':disk.f_bfree*disk.f_frsize}
    samples.write(json.dumps(row)+'\n');samples.flush()
    if current['MainPID']=='0':break
    assert not INTERRUPTED and row['elapsedSeconds']<21600 and not info['State']['OOMKilled'] and info['State']['Running']
    assert row['physicalFreeDiskBytes']>DISK_RESERVE and mem['MemAvailable']>256*1024
    number=str(report['resetCount']+1).zfill(3);request=control/('reset-'+number+'.request.json')
    if request.exists():
     assert identity(request)[3:]==(0,0,0o600,1)
     value=json.loads(request.read_text());assert value['owner']==OWNER and value['number']==number and int(number)<=80
     inspect();command(['docker','stop','--time','20',container]);assert not inspect()['State']['Running']
     command(['docker','start',container]);ready()
     (client_group/'memory.high').write_text(str(GIB if int(number)%2 else 7*GIB//2)+'\n')
     save(control/('reset-'+number+'.verified.json'),{'number':number,'exactOwnedProverVerified':True,'loopbackOnly':True})
     report['resetCount']+=1;save(output/'report.json',report)
    time.sleep(2)
  report.update(clientOutcome=state(),stage='client-ended')
 except Exception as error:report.update(errorType=type(error).__name__)
 finally:
  report['ownedClientStopped']=not client_started
  try:
   if client_started and state()['MainPID']!='0':command(['systemctl','stop',unit])
   report['ownedClientStopped']=not client_started or state()['MainPID']=='0'
  except Exception as error:report['clientCleanupErrorType']=type(error).__name__
  report['ownedProverStopped']=container is None
  try:
   if container and inspect()['State']['Running']:command(['docker','stop','--time','30',container])
   report['ownedProverStopped']=container is None or not inspect()['State']['Running']
  except Exception as error:report['proverCleanupErrorType']=type(error).__name__
  try:
   assert report['ownedClientStopped'] and report['ownedProverStopped']
   report['publicCacheViewRemoved']=cache.remove(kind,output)
  except Exception as error:report['cacheCleanupErrorType']=type(error).__name__
  try:
   assert report['ownedClientStopped'] and report['ownedProverStopped'] and identity(SWAP)==before
   mem=memory();assert mem['MemAvailable']>mem['SwapTotal']-mem['SwapFree']+512*1024
   if str(TEMP) in swaps():command(['swapoff',str(TEMP)],timeout=300)
   if active_swap and str(SWAP) in swaps():command(['swapoff',str(SWAP)],timeout=300)
   assert not swaps()
   if temp_identity:
    assert identity(TEMP)==temp_identity and TEMP.is_relative_to(ROOT);TEMP.unlink()
   Path('/proc/sys/vm/swappiness').write_text(original_vm+'\n')
   report.update(originalSwapRestored=True,originalSwapFilePreserved=identity(SWAP)==before,
    temporarySwapRemoved=not TEMP.exists(),originalSwappinessRestored=Path('/proc/sys/vm/swappiness').read_text().strip()==original_vm)
  except Exception as error:report['hostRestoreErrorType']=type(error).__name__
  report['endedAtUtc']=dt.datetime.now(dt.timezone.utc).isoformat();report['elapsedSeconds']=time.monotonic()-started
  report['nativeBinaryUnchanged']=sha(BINARY)==BINARY_SHA
  save(output/'report.json',report);print(json.dumps(report),flush=True)
 return 0 if report.get('clientOutcome',{}).get('ExecMainStatus')=='0' and all(report.get(k) for k in ['ownedClientStopped','ownedProverStopped','originalSwapRestored','temporarySwapRemoved','originalSwappinessRestored','publicCacheViewRemoved']) else 1

if __name__=='__main__':raise SystemExit(main())
