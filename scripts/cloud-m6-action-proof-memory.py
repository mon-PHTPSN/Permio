"""Owned 14.5-GiB RAM / existing 8-GiB plus temporary 4-GiB swap synthetic action proof diagnostic.

No wallet, chain calls, cloud credentials, configurable commands or retries.
The caller must maintain the exact-instance cloud lease independently.
"""
import datetime as dt
import hashlib
import importlib.util
import json
import os
import stat
from pathlib import Path
import signal
import subprocess
import time
import urllib.error
import urllib.request

ROOT=Path('/opt/permio-m6-action-proof-20261017-v6')
CLIENT_ROOT=ROOT/'client'
CLIENT='permio-m6-action-proof-client-v6.service'
NAME='permio-m6-action-proof-v6'
OWNER='permio-m6-synthetic-action-proof-v6'
IMAGE='midnightntwrk/proof-server@sha256:0f4ab0716985eaebbe55a970348f52ff05ffd8a96631ed7232bd0c4ba02c115c'
NODE=Path('/opt/permio-m6-membership-20261015/node-v22.23.2-linux-x64/bin/node')
GIB=1024**3
HOST_SWAP=12*GIB
TEMP_SWAP_BYTES=4*GIB
TEMP_SWAP=ROOT/'temporary-paging.swap'
CLIENT_SWAP=HOST_SWAP
CLIENT_HIGH=GIB
PROVER_RAM=27*GIB//2
PROVER_HIGH=PROVER_RAM
INTERRUPTED=False

def command(args,timeout=45):
 return subprocess.check_output(args,text=True,stderr=subprocess.DEVNULL,timeout=timeout).strip()

def sha(p):
 h=hashlib.sha256()
 with p.open('rb') as f:
  for part in iter(lambda:f.read(1024**2),b''):h.update(part)
 return h.hexdigest()

def unit():
 return dict(line.split('=',1) for line in command(['systemctl','show',CLIENT,'-p','MainPID','-p','Result','-p','ExecMainStatus','-p','ExecMainCode','-p','SubState']).splitlines())

def inspect(identifier):
 values=json.loads(command(['docker','inspect',identifier]));assert len(values)==1
 value=values[0];assert value['Config']['Labels']['permio.owner']==OWNER and value['Name']=='/'+NAME
 return value

def sample_group(path):
 result={}
 for name in ['memory.current','memory.peak','memory.swap.current','memory.swap.peak','memory.events','cpu.stat']:
  p=path/name
  if p.exists():
   value=p.read_text().strip()
   result[name]=dict((words[0],int(words[1])) for words in (line.split() for line in value.splitlines())) if name in ('memory.events','cpu.stat') else int(value)
 return result

def limits(group,ram,swap,high):
 for name,value in [('memory.max',ram),('memory.swap.max',swap),('memory.high',high)]:
  assert (group/name).read_text().strip()==str(value)
 for parent in group.parents:
  if not parent.is_relative_to('/sys/fs/cgroup'):break
  for name,minimum in [('memory.max',ram),('memory.swap.max',swap)]:
   p=parent/name
   if p.exists():
    value=p.read_text().strip();assert value=='max' or int(value)>=minimum

def run():
 global INTERRUPTED
 manager_path=Path('/opt/permio-m6-action-boundary-20261017-v8/controller.py')
 assert sha(manager_path)=='74dfe263aaa3f565cdf27fcc883111121eeef91bd87c17fce5e5168ec54060e4'
 spec=importlib.util.spec_from_file_location('reviewed_existing_swap_manager',manager_path)
 manager=importlib.util.module_from_spec(spec);spec.loader.exec_module(manager)
 assert ROOT.resolve()==ROOT and ROOT.stat().st_mode&0o777==0o700
 assert command([str(NODE),'--version'])=='v22.23.2'
 assert command(['docker','ps','--quiet'])==''
 assert command(['systemctl','show',CLIENT,'-p','LoadState','--value'])=='not-found'
 assert manager.active_swaps()==set() and int(Path('/proc/sys/vm/swappiness').read_text())==0
 host=manager.counters(Path('/proc/meminfo').read_text())
 assert host['MemTotal']>=15*1024**2 and host['MemAvailable']>=14*1024**2
 before=manager.inspect_existing_swap()
 assert manager.select_swap_action(set(),str(manager.SWAP),True,True)=='activate-existing'
 manifest=json.loads((CLIENT_ROOT/'public-source-manifest.json').read_text())
 for name,expected in manifest['files'].items():assert sha(CLIENT_ROOT/name)==expected['sha256']
 build=Path('/opt/permio-m6-action-boundary-20261017-v8')
 key_report=json.loads((build/'keygen-report.json').read_text());assert key_report['realKeyBuildCompleted']
 for name,expected in key_report['keyFiles'].items():assert sha(build/'output'/name)==expected['sha256']
 assert sha(build/'diagnoseLedgerBoundActionAncestry.bzkir')=='8c15b683dfffa4139e8293340a7149c241b9abec67aa68f3693266e829b50ef6'
 output=ROOT/'output';output.mkdir(mode=0o700)
 checkpoint={'existingFileMetadata':before,'originalActiveSwapPaths':[],'originalSwappiness':0,'temporarySwappiness':60}
 (output/'host-checkpoint.json').write_text(json.dumps(checkpoint,indent=2)+'\n')
 report={'kind':'bounded-synthetic-depth16-action-proof','startedAtUtc':dt.datetime.now(dt.timezone.utc).isoformat(),
  'instanceId':'i-t4ni11rkjyzgi0vlb68d','region':'ap-southeast-1','image':IMAGE,
  'proverMemoryMaxBytes':PROVER_RAM,'proverMemoryHighBytes':PROVER_HIGH,'proverSwapMaxBytes':HOST_SWAP,
  'clientMemoryMaxBytes':GIB,'clientMemoryHighBytes':CLIENT_HIGH,'clientSwapMaxBytes':CLIENT_SWAP,
  'combinedClientProverRamCapBytes':29*GIB//2,'sharedHostSwapBytes':HOST_SWAP,'existingSwapBytes':8*GIB,'temporarySwapBytes':TEMP_SWAP_BYTES,'separateControllerRamCapBytes':GIB//2,
  'rayonThreads':1,'serverWorkers':1,'automaticRetries':0,'httpTimeoutSeconds':3600,'wholeDiagnosticTimeoutSeconds':3800,'swapReserveGuardRemoved':True,'hostMemoryReserveKiB':512*1024,
  'walletLoaded':False,'transactionsSubmitted':0,'newDeployment':False,'realConstraintCheckPassed':False,
  'realProofGenerated':False,'proofIndependentlyVerified':False,'ordinaryActionAcceptance':False,'milestoneComplete':False,
  'sourceArchiveSha256':json.loads((ROOT/'staging-request.json').read_text()).get('sourceArchiveSha256'),
  'sourceManifestSha256':sha(CLIENT_ROOT/'public-source-manifest.json'),
  'existingSwapFilePreserved':True,'newSwapFileCreated':False,'temporarySwapRemoved':False}
 container=None;activated=False;temporary_created=False;temporary_activated=False;temporary_identity=None;client_started=False;vm_changed=False;started=time.monotonic()
 def interrupt(signum,frame):
  global INTERRUPTED
  INTERRUPTED=True
 for signum in [signal.SIGTERM,signal.SIGINT]:signal.signal(signum,interrupt)
 try:
  disk=os.statvfs(ROOT);report['diskFreeBeforeBytes']=disk.f_bavail*disk.f_frsize
  assert report['diskFreeBeforeBytes']>=TEMP_SWAP_BYTES+GIB
  assert not TEMP_SWAP.exists() and not TEMP_SWAP.is_symlink()
  fd=os.open(TEMP_SWAP,os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_NOFOLLOW,0o600)
  temporary_created=True
  try:
   os.posix_fallocate(fd,0,TEMP_SWAP_BYTES);os.fsync(fd)
  finally:os.close(fd)
  s=TEMP_SWAP.lstat()
  assert TEMP_SWAP.resolve()==TEMP_SWAP and stat.S_ISREG(s.st_mode) and s.st_uid==0 and s.st_nlink==1 and s.st_mode&0o777==0o600
  assert s.st_size==TEMP_SWAP_BYTES and s.st_blocks*512>=s.st_size
  temporary_identity=(s.st_dev,s.st_ino,s.st_uid,s.st_gid,s.st_size,s.st_mode&0o777,s.st_nlink)
  command(['mkswap','--quiet',str(TEMP_SWAP)])
  report.update(newSwapFileCreated=True,temporarySwapIdentity=list(temporary_identity))
  try:command(['swapon',str(manager.SWAP)])
  finally:activated=str(manager.SWAP) in manager.active_swaps()
  assert activated
  try:command(['swapon',str(TEMP_SWAP)])
  finally:temporary_activated=str(TEMP_SWAP) in manager.active_swaps()
  assert temporary_activated and manager.active_swaps()=={str(manager.SWAP),str(TEMP_SWAP)}
  assert manager.counters(Path('/proc/meminfo').read_text())['SwapTotal']>=HOST_SWAP//1024-16
  vm_changed=True;Path('/proc/sys/vm/swappiness').write_text('60\n')
  container=command(['docker','create','--name',NAME,'--label','permio.owner='+OWNER,
   '--cpus','1','--memory',str(PROVER_RAM),'--memory-swap',str(PROVER_RAM+HOST_SWAP),'--pids-limit','128',
   '--publish','127.0.0.1:6302:6300','--log-driver','none','--security-opt','no-new-privileges',
   '--cap-drop','ALL','--mount','type=bind,src=/root/.cache/midnight/zk-params,dst=/.cache/midnight/zk-params,readonly',
   '--env','RAYON_NUM_THREADS=1','--env','RUST_LOG=warn','--env','HOME=/','--env','XDG_CACHE_HOME=/.cache',
   '--entrypoint','/bin/bash',IMAGE,'-c','exec midnight-proof-server --port 6300 --no-fetch-params --num-workers 1 --job-capacity 1 --job-timeout 3600'])
  info=inspect(container);assert info['HostConfig']['Memory']==PROVER_RAM and info['HostConfig']['MemorySwap']==PROVER_RAM+HOST_SWAP
  assert info['HostConfig']['NanoCpus']==10**9 and info['HostConfig']['NetworkMode']!='host'
  assert info['HostConfig']['PortBindings']=={'6300/tcp':[{'HostIp':'127.0.0.1','HostPort':'6302'}]}
  assert all(not mount['RW'] for mount in info['Mounts'])
  command(['docker','start',container]);info=inspect(container)
  assert info['NetworkSettings']['Ports']=={'6300/tcp':[{'HostIp':'127.0.0.1','HostPort':'6302'}]}
  group=Path('/sys/fs/cgroup/system.slice/docker-'+container+'.scope')
  assert Path('/proc/'+str(info['State']['Pid'])+'/cgroup').read_text().strip()=='0::/system.slice/docker-'+container+'.scope'
  (group/'memory.high').write_text(str(PROVER_HIGH)+'\n');limits(group,PROVER_RAM,HOST_SWAP,PROVER_HIGH)
  for attempt in range(60):
   assert inspect(container)['State']['Running'] and not INTERRUPTED
   try:
    with urllib.request.urlopen('http://127.0.0.1:6302/health',timeout=1) as response:assert response.status==200
    break
   except urllib.error.HTTPError as error:
    if error.code==404:break
    raise
   except urllib.error.URLError:time.sleep(1)
  else:raise TimeoutError('Loopback readiness bound exceeded')
  report.update(containerId=container,loopbackPublicationVerified=True,proverImageId=info['Image'])
  command(['systemd-run','--unit='+CLIENT,'--remain-after-exit','--property=MemoryMax='+str(GIB),
   '--property=MemoryHigh='+str(CLIENT_HIGH),'--property=MemorySwapMax='+str(CLIENT_SWAP),'--property=CPUQuota=100%',
   '--property=TasksMax=128','--property=RuntimeMaxSec=3750','--property=TimeoutStopSec=15','--property=Restart=no',
   '--property=WorkingDirectory='+str(CLIENT_ROOT),'--property=StandardOutput=append:'+str(output/'client.log'),
   '--property=StandardError=append:'+str(output/'client.log'),str(NODE),'--expose-gc','--experimental-strip-types','--max-old-space-size=3072',
   'scripts/run-m6-action-boundary-proof-memory.mjs','--prove'])
  client_started=True;client_group=Path('/sys/fs/cgroup/system.slice')/CLIENT
  limits(client_group,GIB,CLIENT_SWAP,CLIENT_HIGH)
  with (output/'resources.jsonl').open('x') as samples:
   while True:
    state=unit();info=inspect(container);memory=manager.counters(Path('/proc/meminfo').read_text())
    row={'atUtc':dt.datetime.now(dt.timezone.utc).isoformat(),'elapsedSeconds':time.monotonic()-started,
     'clientState':state,'proverState':info['State'],'prover':sample_group(group),'client':sample_group(client_group),
     'hostMemAvailableKiB':memory['MemAvailable'],'hostSwapFreeKiB':memory['SwapFree'],'hostDiskFreeBytes':os.statvfs(ROOT).f_bavail*os.statvfs(ROOT).f_frsize}
    samples.write(json.dumps(row)+'\n');samples.flush()
    if state['MainPID']=='0':break
    reason='caller-interrupted' if INTERRUPTED else 'whole-diagnostic-duration' if row['elapsedSeconds']>=3800 else 'prover-oom' if info['State']['OOMKilled'] else 'prover-exited' if not info['State']['Running'] else 'host-memory-reserve' if memory['MemAvailable']<512*1024 else 'host-disk-reserve' if row['hostDiskFreeBytes']<GIB else None
    if reason:report['stopReason']=reason;break
    time.sleep(2)
  report['clientOutcome']=unit();report['proverBeforeCleanup']=inspect(container)['State']
 except Exception as error:
  report['controllerErrorType']=type(error).__name__
 finally:
  report['ownedClientStopped']=not client_started
  try:
   if client_started and unit()['MainPID']!='0':command(['systemctl','stop',CLIENT])
   report['ownedClientStopped']=not client_started or unit()['MainPID']=='0'
  except Exception as error:report['clientCleanupErrorType']=type(error).__name__
  report['ownedProverStopped']=container is None
  try:
   if container and inspect(container)['State']['Running']:command(['docker','stop','--time','30',container])
   report['ownedProverStopped']=not container or not inspect(container)['State']['Running']
  except Exception as error:report['proverCleanupErrorType']=type(error).__name__
  report['originalSwapStateRestored']=False;report['globalVmSettingRestored']=False
  if report['ownedClientStopped'] and report['ownedProverStopped']:
   try:
    assert manager.swap_identity(manager.inspect_existing_swap())==manager.swap_identity(before)
    memory=manager.counters(Path('/proc/meminfo').read_text())
    assert memory['MemAvailable']>memory['SwapTotal']-memory['SwapFree']+512*1024
    if temporary_activated and str(TEMP_SWAP) in manager.active_swaps():command(['swapoff',str(TEMP_SWAP)])
    if activated and str(manager.SWAP) in manager.active_swaps():command(['swapoff',str(manager.SWAP)])
    assert manager.active_swaps()==set();report['originalSwapStateRestored']=True
    if temporary_created:
     s=TEMP_SWAP.lstat()
     assert (s.st_dev,s.st_ino,s.st_uid,s.st_gid,s.st_size,s.st_mode&0o777,s.st_nlink)==temporary_identity
     assert TEMP_SWAP.resolve()==TEMP_SWAP and stat.S_ISREG(s.st_mode) and not TEMP_SWAP.is_symlink()
     TEMP_SWAP.unlink();assert not TEMP_SWAP.exists()
    report['temporarySwapRemoved']=True
    disk=os.statvfs(ROOT);report['diskFreeAfterCleanupBytes']=disk.f_bavail*disk.f_frsize
    report['existingSwapFileIdentityPreserved']=manager.swap_identity(manager.inspect_existing_swap())==manager.swap_identity(before)
   except Exception as error:report['swapCleanupErrorType']=type(error).__name__
   try:
    vm=Path('/proc/sys/vm/swappiness');current=int(vm.read_text())
    if vm_changed and current==60:vm.write_text('0\n')
    assert int(vm.read_text())==0;report['globalVmSettingRestored']=True
   except Exception as error:report['vmCleanupErrorType']=type(error).__name__
  reports=[]
  for p in (CLIENT_ROOT/'logs/m6-action-boundary-xFPDIN').glob('isolated-action-proof-*.json'):
   value=json.loads(p.read_text());assert value['kind']=='isolated-full-depth-action-proof-diagnostic';reports.append(value)
  report['clientReports']=reports
  events=[]
  if (output/'client.log').exists():
   for line in (output/'client.log').read_text(errors='replace').splitlines():
    try:
     value=json.loads(line)
     if isinstance(value,dict) and value.get('event'):events.append(value)
    except json.JSONDecodeError:pass
  report['realConstraintCheckPassed']=any(p.get('realConstraintCheckPassed') for p in reports+events)
  report['realProofGenerated']=any(p.get('realProofGenerated') and p.get('proofFormatValidated') for p in reports)
  report['endedAtUtc']=dt.datetime.now(dt.timezone.utc).isoformat();report['elapsedSeconds']=time.monotonic()-started
  report['existingSwapFilePreserved']=manager.SWAP.is_file()
  (output/'report.json').write_text(json.dumps(report,indent=2)+'\n')
  print(json.dumps(report),flush=True)
 return 0 if report['realProofGenerated'] and all(report.get(k) for k in ['ownedClientStopped','ownedProverStopped','originalSwapStateRestored','globalVmSettingRestored','existingSwapFileIdentityPreserved','temporarySwapRemoved']) else 1

if __name__=='__main__':
 raise SystemExit(run())
