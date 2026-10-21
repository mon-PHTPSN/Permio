"""Owned prover-only CPU handoff; the original client and all transactions survive.

The original outer controller is frozen during the handoff and later resumes its
unchanged, verified final cleanup. No application proof is interrupted: an even
reset acknowledgement proves the previous application proof has completed, and
the current wallet worker finishes balancing before the old prover is stopped.
"""
import datetime as dt
import hashlib,importlib.util,json,os,signal,subprocess,time,urllib.request
from pathlib import Path

ROOT=Path('/opt/permio-m6-governance-20261018-v10')
OUTER='permio-m6-ordinary-v10-first-flow-v4-controller.service'
CLIENT='permio-m6-ordinary-v10-first-flow-v4-client.service'
NAME='permio-m6-ordinary-v10-first-flow-headroom-v1'
OUTPUT=ROOT/'proof-headroom-v1'
SOURCE_SHA='9af9e1df2991056243f7a1a7b703502765a3434f466c58a668c54f9696ba12b0'
STOP=False
AUX=ROOT/'ordinary-runtime-extra-paging.swap'
EXTRA_SWAP=3*1024**3//8

def cmd(args,timeout=60):return subprocess.check_output(args,text=True,stderr=subprocess.DEVNULL,timeout=timeout).strip()
def sha(p):
 h=hashlib.sha256()
 with p.open('rb') as f:
  for b in iter(lambda:f.read(1024**2),b''):h.update(b)
 return h.hexdigest()
def save(p,v):
 tmp=p.with_suffix('.writing');tmp.write_text(json.dumps(v,indent=2)+'\n');tmp.chmod(0o600);tmp.replace(p)
def unit(name):return dict(x.split('=',1) for x in cmd(['systemctl','show',name,'-p','MainPID','-p','Result','-p','ExecMainStatus','-p','ControlGroup']).splitlines())
def group(name):
 value=unit(name)['ControlGroup'];assert value=='/system.slice/'+name
 p=Path('/sys/fs/cgroup'+value);assert p.resolve()==p;return p
def freeze(p,value):
 (p/'cgroup.freeze').write_text(str(value)+'\n')
 for _ in range(50):
  events=dict(x.split() for x in (p/'cgroup.events').read_text().splitlines())
  if events.get('frozen')==str(value):return
  time.sleep(.1)
 raise AssertionError('Owned controller freezer state was not verified')
def acknowledgements():
 values=[]
 for p in (ROOT/'control').glob('reset-*.verified.json'):
  value=json.loads(p.read_text());number=p.name.split('-')[1].split('.')[0]
  assert value['number']==number and value['exactOwnedProverVerified'] and value['loopbackOnly']
  values.append(int(number))
 assert sorted(values)==list(range(1,len(values)+1))
 return len(values)
def inspect(container):return json.loads(cmd(['docker','inspect',container]))[0]
def last_checkpoint():
 p=ROOT/'runtime-first-flow-v4/client-public.jsonl'
 for line in reversed(p.read_text().splitlines()):
  try:value=json.loads(line)
  except ValueError:continue
  if value.get('kind')=='m6-v10-ordinary-flow':return value
 return {}

def main():
 global STOP
 assert os.geteuid()==0 and os.cpu_count()>=4 and ROOT.resolve()==ROOT and not OUTPUT.exists()
 source=ROOT/'ordinary-runtime-controller-v5.py';assert sha(source)==SOURCE_SHA
 spec=importlib.util.spec_from_file_location('verified_original_runtime',source);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
 assert sha(m.BINARY)==m.BINARY_SHA and m.TOTAL_SWAP==29*m.GIB//2
 assert m.PROVER_RAM==27*m.GIB//2
 m.PROVER_RAM=29*m.GIB//2
 m.TOTAL_SWAP=119*m.GIB//8
 output=OUTPUT;output.mkdir(mode=0o700)
 report={'kind':'owned-v10-proof-headroom-handoff','startedAtUtc':dt.datetime.now(dt.timezone.utc).isoformat(),
  'instanceId':'i-t4ni11rkjyzgi0vlb68d','region':'ap-southeast-1','cpuCores':2,'rayonThreads':2,
  'oneProofJobAtATime':True,'nativeBinarySha256':m.BINARY_SHA,'memoryMaxBytes':m.PROVER_RAM,
  'swapMaxBytes':m.TOTAL_SWAP,'clientSourceOrTransactionPlanChanged':False,'automaticSubmissionRetries':False,
  'stage':'awaiting-safe-wallet-boundary','handoffComplete':False,'originalCleanupControllerResumed':False}
 save(output/'report.json',report)
 client_pid=None;outer_frozen=False;parent_paused=False;old=None;new=None;handoff=False;last_reset=0;aux_identity=None;aux_active=False;aux_created=False
 def interrupted(signum,frame):
  global STOP
  STOP=True
 for sig in [signal.SIGTERM,signal.SIGINT]:signal.signal(sig,interrupted)
 try:
  started=time.monotonic()
  # We pause only the parent. Its already owned wallet child may finish its
  # current balance; submission remains governed by the original exact-once IPC.
  while True:
   assert not STOP and time.monotonic()-started<1800
   assert int(unit(OUTER)['MainPID'])>0 and int(unit(CLIENT)['MainPID'])>0
   event=last_checkpoint();n=acknowledgements()
   if n and n%2==0 and event.get('phase')=='wallet-checkpoint-stage':
    client_pid=int(unit(CLIENT)['MainPID']);client_group=group(CLIENT);outer_group=group(OUTER)
    assert Path('/proc/'+str(client_pid)+'/cgroup').read_text().strip()=='0::/system.slice/'+CLIENT
    os.kill(client_pid,signal.SIGSTOP);parent_paused=True
    freeze(outer_group,1);outer_frozen=True
    n=acknowledgements()
    # An acknowledgement could have appeared just before the pause. An odd
    # value means another application proof might be active; leave it alone.
    if n%2:
     freeze(outer_group,0);outer_frozen=False;os.kill(client_pid,signal.SIGCONT);parent_paused=False
    else:
     last_reset=n;break
   time.sleep(1)
  original=json.loads((ROOT/'runtime-first-flow-v4/report.json').read_text());old=original['containerId']
  item=inspect(old);assert item['Name']=='/permio-m6-ordinary-v10-first-flow-v4'
  assert item['Config']['Labels']['permio.owner']==m.OWNER and item['State']['Running']
  cache=[x['Source'] for x in item['Mounts'] if x['Destination']=='/.cache/midnight']
  assert len(cache)==1 and Path(cache[0]).resolve().is_relative_to(ROOT)
  rounds=sorted((ROOT/'private').glob('wallet-*-unbound.bin'));assert rounds
  current=rounds[-1].name.replace('-unbound.bin','-balanced.bin')
  report.update(stage='awaiting-owned-wallet-balance',lastOriginalReset=last_reset,
   originalControllerFrozen=True,clientParentPaused=True)
  save(output/'report.json',report)
  deadline=time.monotonic()+850
  while not (ROOT/'private'/current).exists():
   assert not STOP and time.monotonic()<deadline
   assert int(unit(CLIENT)['MainPID'])==client_pid
   assert m.memory()['MemAvailable']>256*1024
   disk=os.statvfs(ROOT);assert disk.f_bfree*disk.f_frsize>m.DISK_RESERVE
   assert inspect(old)['State']['Running'] and not inspect(old)['State']['OOMKilled']
   children=cmd(['pgrep','-P',str(client_pid)]).splitlines();assert children,'Wallet child ended before the safe balance checkpoint'
   time.sleep(.5)
  balanced=ROOT/'private'/current;s=balanced.lstat()
  assert s.st_uid==0 and s.st_mode&0o777==0o600 and not balanced.is_symlink()
  report.update(stage='replacing-idle-owned-prover',lastOriginalReset=last_reset,oldContainer=old,
   originalOuterMainPid=int(unit(OUTER)['MainPID']),parentPausedAtOwnedBalanceBoundary=True,
   currentBalancedBytes=s.st_size)
  save(output/'report.json',report)
  disk=os.statvfs(ROOT);assert disk.f_bfree*disk.f_frsize>EXTRA_SWAP+900*1024**2
  assert not AUX.exists() and not AUX.is_symlink()
  fd=os.open(AUX,os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_NOFOLLOW,0o600)
  aux_created=True
  try:os.posix_fallocate(fd,0,EXTRA_SWAP);os.fsync(fd)
  finally:os.close(fd)
  aux_identity=m.identity(AUX);assert AUX.stat().st_blocks*512>=EXTRA_SWAP
  cmd(['mkswap','--quiet',str(AUX)]);cmd(['swapon',str(AUX)]);aux_active=True
  assert m.swaps()=={str(m.SWAP),str(m.TEMP),str(AUX)}
  report.update(extraSwapBytes=EXTRA_SWAP,totalHostSwapBytes=m.TOTAL_SWAP,proverRamBytes=m.PROVER_RAM,
   publicFilesTemporarilyOffloadedWithVerifiedLocalBackup=True)
  save(output/'report.json',report)
  cmd(['docker','stop','--time','20',old]);assert not inspect(old)['State']['Running']
  assert not cmd(['docker','ps','--quiet'])
  new=cmd(['docker','create','--name',NAME,'--label','permio.owner='+m.OWNER,'--label','permio.cpu-profile=2',
   '--cpus','2','--memory',str(m.PROVER_RAM),'--memory-swap',str(m.PROVER_RAM+m.TOTAL_SWAP),'--pids-limit','128',
   '--publish','127.0.0.1:6300:6300','--log-driver','none','--security-opt','no-new-privileges','--cap-drop','ALL',
   '--mount','type=bind,src='+cache[0]+',dst=/.cache/midnight,readonly',
   '--mount','type=bind,src='+str(m.BINARY)+',dst=/opt/permio-owned/midnight-proof-server,readonly',
   '--env','RAYON_NUM_THREADS=2','--env','RUST_LOG=warn','--env','HOME=/','--env','XDG_CACHE_HOME=/.cache',
   '--entrypoint',m.LOADER,m.IMAGE,'--library-path',m.LIBS,'/opt/permio-owned/midnight-proof-server',
   '--port','6300','--no-fetch-params','--num-workers','1','--job-capacity','1','--job-timeout','3600'])
  prover_group=Path('/sys/fs/cgroup/system.slice/docker-'+new+'.scope')
  def verify():
   v=inspect(new);assert v['Name']=='/'+NAME and v['Config']['Labels']['permio.owner']==m.OWNER
   assert v['Config']['Image']==m.IMAGE and 'RAYON_NUM_THREADS=2' in v['Config']['Env']
   h=v['HostConfig'];assert h['NetworkMode']!='host' and h['NanoCpus']==2_000_000_000
   assert h['PortBindings']=={'6300/tcp':[{'HostIp':'127.0.0.1','HostPort':'6300'}]}
   assert h['Memory']==m.PROVER_RAM and h['MemorySwap']==m.PROVER_RAM+m.TOTAL_SWAP
   assert h['LogConfig']['Type']=='none' and all(not x['RW'] for x in v['Mounts'])
   return v
  def ready():
   verify();(prover_group/'memory.high').write_text(str(m.PROVER_RAM)+'\n')
   assert (prover_group/'memory.max').read_text().strip()==str(m.PROVER_RAM)
   assert (prover_group/'memory.swap.max').read_text().strip()==str(m.TOTAL_SWAP)
   for _ in range(60):
    assert verify()['State']['Running'] and not STOP
    try:
     with urllib.request.build_opener(urllib.request.ProxyHandler({})).open('http://127.0.0.1:6300/version',timeout=1) as r:assert r.read(256).decode().strip()=='8.1.3'
     return
    except (OSError,urllib.error.URLError):time.sleep(1)
   raise AssertionError('Replacement owned prover did not become ready')
  cmd(['docker','start',new]);ready()
  report.update(stage='monitoring-cpu2',newContainer=new,loopbackOnly=True,handoffComplete=True)
  handoff=True;save(output/'report.json',report)
  os.kill(client_pid,signal.SIGCONT);parent_paused=False
  report['clientParentPaused']=False;save(output/'report.json',report)
  with (output/'resources.jsonl').open('x') as samples:
   while True:
    state=unit(CLIENT);info=verify();mem=m.memory();disk=os.statvfs(ROOT)
    row={'observedAtUtc':dt.datetime.now(dt.timezone.utc).isoformat(),'clientState':state,
     'proverState':{k:info['State'][k] for k in ['Running','OOMKilled','ExitCode']},
     'client':m.sample(client_group),'prover':m.sample(prover_group),'hostMemAvailableKiB':mem['MemAvailable'],
     'hostSwapFreeKiB':mem['SwapFree'],'physicalFreeDiskBytes':disk.f_bfree*disk.f_frsize,
     'resetCount':last_reset}
    samples.write(json.dumps(row)+'\n');samples.flush()
    if state['MainPID']=='0':break
    assert not STOP and info['State']['Running'] and not info['State']['OOMKilled']
    assert row['physicalFreeDiskBytes']>m.DISK_RESERVE and mem['MemAvailable']>256*1024
    number=str(last_reset+1).zfill(3);request=ROOT/'control'/('reset-'+number+'.request.json')
    if request.exists():
     value=json.loads(request.read_text());assert value['owner']==m.OWNER and value['number']==number and int(number)<=80
     cmd(['docker','stop','--time','20',new]);assert not verify()['State']['Running']
     cmd(['docker','start',new]);ready()
     (client_group/'memory.high').write_text(str(m.GIB if int(number)%2 else 7*m.GIB//2)+'\n')
     save(ROOT/'control'/('reset-'+number+'.verified.json'),{'number':number,'exactOwnedProverVerified':True,'loopbackOnly':True})
     last_reset+=1;report['resetCount']=last_reset;save(output/'report.json',report)
    time.sleep(2)
  report.update(stage='client-ended',clientOutcome=unit(CLIENT))
 except Exception as error:
  report.update(errorType=type(error).__name__,stage='handoff-or-runtime-failed')
  if handoff and unit(CLIENT)['MainPID']!='0':cmd(['systemctl','stop',CLIENT],timeout=90)
 finally:
  if new:
   try:
    if inspect(new)['State']['Running']:cmd(['docker','stop','--time','30',new])
    report['replacementProverStopped']=not inspect(new)['State']['Running']
   except Exception as error:report['replacementStopError']=type(error).__name__
  if not handoff and old:
   # A setup failure restores the untouched original proof process before the
   # original client/controller continue. This is not a transaction retry.
   try:
    if not inspect(old)['State']['Running']:cmd(['docker','start',old])
    report['originalProverRestored']=inspect(old)['State']['Running']
   except Exception as error:report['rollbackError']=type(error).__name__
  try:
   if aux_identity:
    if str(AUX) in m.swaps():
     assert m.memory()['MemAvailable']>m.memory()['SwapTotal']-m.memory()['SwapFree']+512*1024
     cmd(['swapoff',str(AUX)],timeout=300)
    aux_active=str(AUX) in m.swaps();assert not aux_active
    assert AUX.resolve()==AUX and AUX.is_relative_to(ROOT) and m.identity(AUX)==aux_identity
    AUX.unlink()
   elif aux_created:
    s=AUX.lstat();assert AUX.resolve()==AUX and AUX.is_relative_to(ROOT) and not AUX.is_symlink()
    assert s.st_uid==0 and s.st_mode&0o777==0o600 and s.st_nlink==1 and s.st_size<=EXTRA_SWAP
    assert str(AUX) not in m.swaps();AUX.unlink()
   report['extraSwapRemoved']=not AUX.exists() and str(AUX) not in m.swaps()
  except Exception as error:report['extraSwapCleanupError']=type(error).__name__
  if outer_frozen and not aux_active and not AUX.exists():
   freeze(group(OUTER),0);report['originalCleanupControllerResumed']=True
  elif outer_frozen:report['originalCleanupStillFrozenAwaitingExtraSwapCleanup']=True
  if parent_paused and client_pid:
   try:os.kill(client_pid,signal.SIGCONT)
   except ProcessLookupError:pass
  report.update(endedAtUtc=dt.datetime.now(dt.timezone.utc).isoformat(),resetCount=last_reset,
   nativeBinaryUnchanged=sha(m.BINARY)==m.BINARY_SHA)
  save(output/'report.json',report)
 return 0 if handoff and report.get('clientOutcome',{}).get('ExecMainStatus')=='0' and report.get('replacementProverStopped') and report.get('extraSwapRemoved') else 1

if __name__=='__main__':raise SystemExit(main())
