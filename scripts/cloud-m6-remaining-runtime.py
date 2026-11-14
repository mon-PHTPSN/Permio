"""Owned initial preflight/deployment runtime. The task owner renews the ECS timer."""
import datetime as dt
import hashlib,json,os,signal,subprocess,sys,time,urllib.request
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
stopping=False

def command(args,timeout=60):
 return subprocess.check_output(args,timeout=timeout,text=True,stderr=subprocess.DEVNULL).strip()
def sha(p):
 h=hashlib.sha256()
 with p.open('rb') as f:
  for b in iter(lambda:f.read(1024**2),b''):h.update(b)
 return h.hexdigest()
def save(p,d):
 tmp=p.with_suffix('.writing');tmp.write_text(json.dumps(d,indent=2)+'\n');tmp.chmod(0o600);tmp.replace(p)
def memory():return {r.split(':')[0]:int(r.split()[1]) for r in Path('/proc/meminfo').read_text().splitlines()}

def main():
 global stopping
 assert len(sys.argv)==2 and sys.argv[1] in ['--preflight','--deploy-only','--prepare-governance']
 mode=sys.argv[1];name='permio-m6-remaining-'+mode[2:]+'-v1';unit=name+'-client.service'
 assert os.geteuid()==0 and ROOT.resolve()==ROOT and ROOT.stat().st_mode&0o777==0o700
 assert not command(['docker','ps','--quiet']) and not Path('/proc/swaps').read_text().splitlines()[1:]
 assert memory()['MemAvailable']>13*1024**2 and os.statvfs(ROOT).f_bavail*os.statvfs(ROOT).f_frsize>2*GIB
 assert sha(BINARY)==BINARY_SHA and command([str(NODE),'--version'])=='v22.23.2'
 assert IMAGE in json.loads(command(['docker','image','inspect',IMAGE]))[0]['RepoDigests']
 manifest=json.loads((ROOT/'client/public-source-manifest.json').read_text())
 for relative,h in manifest['files'].items():assert sha(ROOT/'client'/relative)==h
 output=ROOT/('runtime-'+mode[2:]+'-v1');assert not output.exists();output.mkdir(mode=0o700)
 control=ROOT/'control';control.mkdir(mode=0o700,exist_ok=True);assert not list(control.iterdir())
 assert command(['systemctl','show',unit,'-p','LoadState','--value'])=='not-found'
 cache=ROOT/('cache-'+mode[2:]+'-v1');assert not cache.exists();cache.mkdir(mode=0o700)
 inventory=json.loads((OLD/'builtin-cache-inventory-v1.json').read_text());assert len(inventory['files'])==25
 report={'kind':'m6-remaining-initial-runtime','owner':OWNER,'mode':mode,'startedAtUtc':dt.datetime.now(dt.timezone.utc).isoformat(),
  'instanceId':'i-t4ni11rkjyzgi0vlb68d','region':'ap-southeast-1','binarySha256':BINARY_SHA,
  'proverRamMaxBytes':29*GIB//2,'proverMemoryHighBytes':27*GIB//2,'sharedSwapBytes':0,
  'nativeCap':100,'phaseNativeCap':18 if mode=='--prepare-governance' else 1 if mode=='--deploy-only' else 0,
  'automaticNativeRetries':False,'fullM6Acceptance':False}
 container=None;started=False;linked=[];exit_code=1;stage='public-cache'
 def signal_handler(signum,frame):
  global stopping
  stopping=True
 for sig in [signal.SIGTERM,signal.SIGINT]:signal.signal(sig,signal_handler)
 def inspect():
  v=json.loads(command(['docker','inspect',container]))[0]
  assert v['Name']=='/'+name and v['Config']['Labels']['permio.owner']==OWNER
  assert v['HostConfig']['PortBindings']=={'6300/tcp':[{'HostIp':'127.0.0.1','HostPort':'6300'}]}
  assert v['HostConfig']['NetworkMode']!='host' and v['HostConfig']['Memory']==29*GIB//2
  assert v['HostConfig']['MemorySwap']==29*GIB//2 and v['HostConfig']['LogConfig']['Type']=='none'
  assert all(not x['RW'] for x in v['Mounts'])
  return v
 def ready():
  group=Path('/sys/fs/cgroup/system.slice/docker-'+container+'.scope')
  (group/'memory.high').write_text(str(27*GIB//2)+'\n')
  assert (group/'memory.max').read_text().strip()==str(29*GIB//2)
  for _ in range(60):
   assert inspect()['State']['Running'] and not stopping
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
  stage='prover-start'
  container=command(['docker','create','--name',name,'--label','permio.owner='+OWNER,'--cpus','2',
   '--memory',str(29*GIB//2),'--memory-swap',str(29*GIB//2),'--pids-limit','128',
   '--publish','127.0.0.1:6300:6300','--log-driver','none','--security-opt','no-new-privileges','--cap-drop','ALL',
   '--mount','type=bind,src='+str(cache)+',dst=/.cache/midnight,readonly',
   '--mount','type=bind,src='+str(BINARY)+',dst=/opt/permio-owned/midnight-proof-server,readonly',
   '--env','RAYON_NUM_THREADS=2','--env','RUST_LOG=warn','--env','HOME=/','--env','XDG_CACHE_HOME=/.cache',
   '--entrypoint',LOADER,IMAGE,'--library-path',LIBS,'/opt/permio-owned/midnight-proof-server',
   '--port','6300','--no-fetch-params','--num-workers','1','--job-capacity','1','--job-timeout','3600'])
  command(['docker','start',container]);ready()
  stage='client-start'
  command(['systemd-run','--unit='+unit,'--remain-after-exit','--property=MemoryMax=4G','--property=MemoryHigh=3584M',
   '--property=MemorySwapMax=0','--property=CPUQuota=200%','--property=TasksMax=256',
   '--property=RuntimeMaxSec='+('14400' if mode=='--prepare-governance' else '3600'),
   '--property=TimeoutStopSec=30','--property=KillMode=control-group','--property=Restart=no',
   '--property=WorkingDirectory='+str(ROOT/'client'),'--property=StandardOutput=append:'+str(output/'client-public.jsonl'),
   '--property=StandardError=append:'+str(ROOT/'private'/('client-'+mode[2:]+'-stderr.log')),
   str(NODE),'--expose-gc','--experimental-strip-types','--max-old-space-size=2048','scripts/run-live-m6-remaining.ts',mode])
  started=True;stage='client-running';save(output/'report.json',report)
  while True:
   info=dict(line.split('=',1) for line in command(['systemctl','show',unit,'-p','MainPID','-p','ExecMainStatus','-p','Result']).splitlines())
   if info['MainPID']=='0':
    report['clientOutcome']=info;assert info['ExecMainStatus']=='0';exit_code=0;break
   assert not stopping and inspect()['State']['Running'] and not inspect()['State']['OOMKilled']
   assert memory()['MemAvailable']>=256*1024,'Host RAM reserve reached'
   assert os.statvfs(ROOT).f_bavail*os.statvfs(ROOT).f_frsize>=768*1024**2,'Disk reserve reached'
   for request in sorted(control.glob('reset-*.request.json')):
    ack=request.with_name(request.name.replace('.request.','.verified.'))
    if ack.exists():continue
    value=json.loads(request.read_text());assert value['owner']==OWNER
    command(['docker','restart','--time','30',container]);ready()
    save(ack,{'number':value['number'],'exactOwnedProverVerified':True,'loopbackOnly':True})
   time.sleep(2)
 except Exception as e:report.update(errorType=type(e).__name__,failureStage=stage)
 finally:
  if started:command(['systemctl','stop',unit],timeout=90)
  if container:
   inspect();command(['docker','stop','--time','30',container],timeout=60);command(['docker','rm',container])
  for p in linked:
   assert p.is_file() and not p.is_symlink() and p.is_relative_to(cache);p.unlink()
  for p in sorted((p for p in cache.rglob('*') if p.is_dir()),key=lambda p:len(p.parts),reverse=True):p.rmdir()
  cache.rmdir()
  report.update(exitCode=exit_code,ownedClientStopped=True,ownedProverStopped=True,publicCacheViewRemoved=True,
   originalSwapInactive=not bool(Path('/proc/swaps').read_text().splitlines()[1:]),finishedAtUtc=dt.datetime.now(dt.timezone.utc).isoformat())
  save(output/'report.json',report);print(json.dumps(report),flush=True)
 return exit_code

if __name__=='__main__':sys.exit(main())
