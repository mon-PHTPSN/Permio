"""Owned ordinary matrix runtime; the caller renews the cloud stop deadline.

One prover, 14.5 GiB hard RAM, verified host swap. The large circuit uses one
Rayon thread/13.5 GiB soft RAM; small circuits select2..4/11.5 GiB. No retries.
Public disk recovery must already have a separately verified restoration plan.
"""
import datetime as dt
import hashlib,json,os,signal,stat,subprocess,sys,time,urllib.request
from pathlib import Path

ROOT=Path('/opt/permio-m6-remaining-preprod-20261019-v1')
OLD=Path('/opt/permio-m6-governance-20261018-v10')
NODE=Path('/opt/permio-m6-membership-20261015/node-v22.23.2-linux-x64/bin/node')
BINARY=Path('/opt/permio-m6-action-proof-20261017-v8/backend/midnight-proof-server')
BINARY_SHA='0661d89eb6a9e18041a41f35a13fe6789d0f149e2244ae3587921114e31c9093'
IMAGE='midnightntwrk/proof-server@sha256:0f4ab0716985eaebbe55a970348f52ff05ffd8a96631ed7232bd0c4ba02c115c'
LOADER='/nix/store/jms7zxzm7w1whczwny5m3gkgdjghmi2r-glibc-2.42-51/lib/ld-linux-x86-64.so.2'
LIBS='/nix/store/jms7zxzm7w1whczwny5m3gkgdjghmi2r-glibc-2.42-51/lib:/nix/store/vpxblivamvic1p5r5zny934jvg33m50r-xgcc-15.2.0-libgcc/lib:/nix/store/1ga782ml07vy0h503ac4cin0h8d7q6yh-libidn2-2.3.8/lib:/nix/store/p7jg95rzvfalb95k3mskk0jqxc9d724n-libunistring-1.4.1/lib'
OWNER='permio-m6-remaining-preprod-20261019-v1'
GIB=1024**3
RAM=29*GIB//2
HIGH=27*GIB//2
SMALL_HIGH=23*GIB//2
TEMP_BYTES=55*GIB//8
TOTAL_SWAP=8*GIB+TEMP_BYTES
SWAP=Path('/var/lib/permio-m6/swapfile')
TEMP=ROOT/'matrix-owned-paging.swap'
NAME='permio-m6-remaining-ordinary-matrix-v5'
UNIT=NAME+'-client.service'
INTERRUPTED=False

def command(args,timeout=60):
 return subprocess.check_output(args,text=True,stderr=subprocess.DEVNULL,timeout=timeout).strip()

def sha(p):
 h=hashlib.sha256()
 with p.open('rb') as f:
  for b in iter(lambda:f.read(1024**2),b''):h.update(b)
 return h.hexdigest()

def save(p,v):
 t=p.with_suffix('.writing');t.write_text(json.dumps(v,indent=2)+'\n');t.chmod(0o600);t.replace(p)

def identity(p):
 s=p.lstat();assert p.resolve()==p and stat.S_ISREG(s.st_mode) and not p.is_symlink()
 return (s.st_dev,s.st_ino,s.st_size,s.st_uid,s.st_gid,s.st_mode&0o777,s.st_nlink)

def swaps():return {r.split()[0] for r in Path('/proc/swaps').read_text().splitlines()[1:]}
def memory():return {r.split(':')[0]:int(r.split()[1]) for r in Path('/proc/meminfo').read_text().splitlines()}
def sample(group):return {n:(group/n).read_text().strip() for n in ['memory.current','memory.peak','memory.swap.current','memory.swap.peak','memory.events'] if (group/n).exists()}

def main():
 global INTERRUPTED
 assert len(sys.argv)==1 and os.geteuid()==0 and ROOT.resolve()==ROOT and ROOT.stat().st_mode&0o777==0o700
 assert not command(['docker','ps','--quiet']) and not swaps() and memory()['MemAvailable']>13*1024**2
 assert sha(BINARY)==BINARY_SHA and command([str(NODE),'--version'])=='v22.23.2'
 assert IMAGE in json.loads(command(['docker','image','inspect',IMAGE]))[0]['RepoDigests']
 assert command(['systemctl','show',UNIT,'-p','LoadState','--value'])=='not-found'
 for role in ['controller','client']:
  assert command(['systemctl','show','permio-m6-remaining-ordinary-matrix-v1-'+role+'.service','-p','MainPID','--value'])=='0'
 manifest=json.loads((ROOT/'client/public-source-manifest.json').read_text())
 for relative,h in manifest['files'].items():assert sha(ROOT/'client'/relative)==h
 output=ROOT/'runtime-ordinary-matrix-v5';assert not output.exists();output.mkdir(mode=0o700)
 control=ROOT/'control-ordinary-v5';assert not control.exists();control.mkdir(mode=0o700)
 save(control/'small-prover-profile.json',{'owner':OWNER,'cpuThreads':4,'mainProofThreadsRemainOne':True})
 before=identity(SWAP);assert before[2:]==(8*GIB,0,0,0o600,1)
 with SWAP.open('rb') as f:f.seek(4086);assert f.read(10)==b'SWAPSPACE2'
 original_vm=Path('/proc/sys/vm/swappiness').read_text().strip()
 cache=ROOT/'cache-ordinary-matrix-v5';assert not cache.exists();cache.mkdir(mode=0o700)
 inventory=json.loads((OLD/'builtin-cache-inventory-v1.json').read_text());assert len(inventory['files'])==25
 report={'kind':'m6-remaining-ordinary-runtime','owner':OWNER,'startedAtUtc':dt.datetime.now(dt.timezone.utc).isoformat(),
  'instanceId':'i-t4ni11rkjyzgi0vlb68d','region':'ap-southeast-1','proverRamMaxBytes':RAM,
  'proverMemoryHighBytesByThreads':{'1':HIGH,'2':SMALL_HIGH,'3':SMALL_HIGH,'4':SMALL_HIGH},'continuationFromExactlyFinalized':53,'continuationFromConservativeAttempts':54,'phaseReservationCeiling':136,'additionalNativeAttemptsMaximum':81,
  'sharedHostSwapBytes':TOTAL_SWAP,'temporarySwapBytes':TEMP_BYTES,'nativeCap':150,'automaticNativeRetries':False,
  'sourceManifestSha256':sha(ROOT/'client/public-source-manifest.json'),'binarySha256':BINARY_SHA,'milestoneComplete':False}
 container=None;started=False;linked=[];temp_identity=None;activated=False;exit_code=1;stage='cache'
 threads=4
 def signal_handler(signum,frame):
  global INTERRUPTED
  INTERRUPTED=True
 for sig in [signal.SIGTERM,signal.SIGINT]:signal.signal(sig,signal_handler)
 def inspect():
  v=json.loads(command(['docker','inspect',container]))[0]
  assert v['Name']=='/'+NAME and v['Config']['Labels']['permio.owner']==OWNER
  assert v['HostConfig']['PortBindings']=={'6300/tcp':[{'HostIp':'127.0.0.1','HostPort':'6300'}]}
  assert v['HostConfig']['NetworkMode']!='host' and v['HostConfig']['Memory']==RAM and v['HostConfig']['MemorySwap']==RAM+TOTAL_SWAP
  assert v['HostConfig']['NanoCpus']==threads*1000000000 and 'RAYON_NUM_THREADS='+str(threads) in v['Config']['Env']
  assert v['HostConfig']['LogConfig']['Type']=='none' and all(not m['RW'] for m in v['Mounts'])
  return v
 def create_prover(selected):
  nonlocal container,threads
  assert selected in [1,2,3,4];threads=selected
  container=command(['docker','create','--name',NAME,'--label','permio.owner='+OWNER,'--cpus',str(threads),
   '--memory',str(RAM),'--memory-swap',str(RAM+TOTAL_SWAP),'--pids-limit','128','--publish','127.0.0.1:6300:6300',
   '--log-driver','none','--security-opt','no-new-privileges','--cap-drop','ALL',
   '--mount','type=bind,src='+str(cache)+',dst=/.cache/midnight,readonly',
   '--mount','type=bind,src='+str(BINARY)+',dst=/opt/permio-owned/midnight-proof-server,readonly',
   '--env','RAYON_NUM_THREADS='+str(threads),'--env','RUST_LOG=warn','--env','HOME=/','--env','XDG_CACHE_HOME=/.cache',
   '--entrypoint',LOADER,IMAGE,'--library-path',LIBS,'/opt/permio-owned/midnight-proof-server',
   '--port','6300','--no-fetch-params','--num-workers','1','--job-capacity','1','--job-timeout','3600'])
  inspect();command(['docker','start',container])
  group=Path('/sys/fs/cgroup/system.slice/docker-'+container+'.scope')
  (group/'memory.high').write_text(str(HIGH if selected==1 else SMALL_HIGH)+'\n')
  assert (group/'memory.high').read_text().strip()==str(HIGH if selected==1 else SMALL_HIGH)
  assert (group/'memory.max').read_text().strip()==str(RAM) and (group/'memory.swap.max').read_text().strip()==str(TOTAL_SWAP)
  for _ in range(60):
   assert inspect()['State']['Running'] and not INTERRUPTED
   try:
    with urllib.request.urlopen('http://127.0.0.1:6300/version',timeout=1) as r:
     if r.read(128).decode().strip()=='8.1.3':return
   except OSError:pass
   time.sleep(1)
  raise TimeoutError('Owned prover readiness')
 try:
  for relative,expected in inventory['files'].items():
   source=Path('/opt/permio-m6-membership-20261015/public-cache')/relative if expected['source']=='reviewed-public-cache' else Path('/root/.cache/midnight')/relative
   assert source.resolve()==source and source.is_file() and sha(source)==expected['sha256'] and source.stat().st_size==expected['bytes']
   p=cache/relative;p.parent.mkdir(mode=0o700,parents=True,exist_ok=True);os.link(source,p,follow_symlinks=False);linked.append(p)
  stage='swap'
  disk=os.statvfs(ROOT);assert disk.f_bfree*disk.f_frsize>=TEMP_BYTES+3*GIB//4
  fd=os.open(TEMP,os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_NOFOLLOW,0o600)
  try:os.posix_fallocate(fd,0,TEMP_BYTES);os.fsync(fd)
  finally:os.close(fd);temp_identity=identity(TEMP)
  assert TEMP.stat().st_blocks*512>=TEMP_BYTES
  command(['mkswap','--quiet',str(TEMP)]);activated=True
  command(['swapon',str(SWAP)]);command(['swapon',str(TEMP)]);assert swaps()=={str(SWAP),str(TEMP)}
  Path('/proc/sys/vm/swappiness').write_text('60\n')
  stage='prover';create_prover(4)
  stage='client'
  command(['systemd-run','--unit='+UNIT,'--remain-after-exit','--property=UMask=0077','--property=MemoryMax=4G','--property=MemoryHigh=3584M',
   '--property=MemorySwapMax='+str(TOTAL_SWAP),'--property=CPUQuota=200%','--property=TasksMax=256',
   '--property=RuntimeMaxSec=43200','--property=TimeoutStopSec=30','--property=KillMode=control-group','--property=Restart=no',
   '--property=WorkingDirectory='+str(ROOT/'client'),'--property=StandardOutput=append:'+str(output/'client-public.jsonl'),
   '--property=StandardError=append:'+str(ROOT/'private/matrix-v5-client-stderr.log'),str(NODE),'--expose-gc',
   '--experimental-strip-types','--max-old-space-size=2048','scripts/run-live-m6-remaining-resume55.ts','--fresh-after55'])
  started=True;client_group=Path('/sys/fs/cgroup/system.slice')/UNIT;stage='running';save(output/'report.json',report)
  count=0;last_sample=0
  with (output/'resources.jsonl').open('x') as samples:
   while True:
    info=dict(line.split('=',1) for line in command(['systemctl','show',UNIT,'-p','MainPID','-p','ExecMainStatus','-p','Result']).splitlines())
    if info['MainPID']=='0':report['clientOutcome']=info;assert info['ExecMainStatus']=='0';exit_code=0;break
    state=inspect();mem=memory();disk=os.statvfs(ROOT)
    assert not INTERRUPTED and state['State']['Running'] and not state['State']['OOMKilled']
    assert mem['MemAvailable']>=256*1024 and disk.f_bfree*disk.f_frsize>=3*GIB//4
    if time.monotonic()-last_sample>=15:
     row={'atUtc':dt.datetime.now(dt.timezone.utc).isoformat(),'proverThreads':threads,'hostMemAvailableKiB':mem['MemAvailable'],
      'hostSwapFreeKiB':mem['SwapFree'],'physicalFreeDiskBytes':disk.f_bfree*disk.f_frsize,
      'client':sample(client_group),'prover':sample(Path('/sys/fs/cgroup/system.slice/docker-'+container+'.scope'))}
     samples.write(json.dumps(row)+'\n');samples.flush();last_sample=time.monotonic()
    number=str(count+1).zfill(3);request=control/('reset-'+number+'.request.json')
    if request.exists():
     assert identity(request)[3:]==(0,0,0o600,1)
     value=json.loads(request.read_text());assert value['owner']==OWNER and value['number']==number and count<360
     selected=value['cpuThreads'];assert selected in [1,2,3,4]
     inspect();command(['docker','stop','--time','30',container]);command(['docker','rm',container]);container=None
     create_prover(selected);(client_group/'memory.high').write_text(str(GIB if selected==1 else 7*GIB//2)+'\n')
     save(control/('reset-'+number+'.verified.json'),{'number':number,'exactOwnedProverVerified':True,'loopbackOnly':True,
      'cpuThreads':threads,'ramMaxBytes':RAM,'ramHighBytes':HIGH if selected==1 else SMALL_HIGH,'sharedHostSwapBytes':TOTAL_SWAP})
     count+=1;report['resetCount']=count;save(output/'report.json',report)
    time.sleep(2)
 except Exception as error:report.update(errorType=type(error).__name__,failureStage=stage)
 finally:
  if started:
   if command(['systemctl','show',UNIT,'-p','MainPID','--value'])!='0':command(['systemctl','stop',UNIT],timeout=90)
   assert command(['systemctl','show',UNIT,'-p','MainPID','--value'])=='0'
  if container:
   inspect();command(['docker','stop','--time','30',container]);command(['docker','rm',container]);container=None
  report.update(ownedClientStopped=True,ownedProverStopped=True)
  assert identity(SWAP)==before
  if activated:
   mem=memory();assert mem['MemAvailable']>mem['SwapTotal']-mem['SwapFree']+512*1024
   if str(TEMP) in swaps():command(['swapoff',str(TEMP)],timeout=300)
   if str(SWAP) in swaps():command(['swapoff',str(SWAP)],timeout=300)
  assert not swaps()
  if temp_identity:assert identity(TEMP)==temp_identity and TEMP.is_relative_to(ROOT);TEMP.unlink()
  Path('/proc/sys/vm/swappiness').write_text(original_vm+'\n')
  for p in linked:assert p.is_file() and not p.is_symlink() and p.is_relative_to(cache);p.unlink()
  for p in sorted((p for p in cache.rglob('*') if p.is_dir()),key=lambda p:len(p.parts),reverse=True):p.rmdir()
  cache.rmdir()
  report.update(exitCode=exit_code,originalSwapRestored=not swaps(),originalSwapFilePreserved=identity(SWAP)==before,
   temporarySwapRemoved=not TEMP.exists(),originalSwappinessRestored=Path('/proc/sys/vm/swappiness').read_text().strip()==original_vm,
   publicCacheViewRemoved=True,finishedAtUtc=dt.datetime.now(dt.timezone.utc).isoformat())
  save(output/'report.json',report);print(json.dumps(report),flush=True)
 return exit_code

if __name__=='__main__':sys.exit(main())
