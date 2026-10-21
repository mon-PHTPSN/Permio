"""One bounded live zswap cache trial for the already running M6 V8 proof.

No proof restart, swapfile, swap-capacity, cryptography or persistent boot changes.
Original sysfs settings are restored on completion, timeout and service cleanup.
"""
import datetime as dt
import json
from pathlib import Path
import signal
import subprocess
import sys
import time

ROOT=Path('/opt/permio-m6-action-proof-20261017-v8')
PARAMS=Path('/sys/module/zswap/parameters')
STATE=ROOT/'zswap-session.json'
UNIT='permio-m6-action-proof-controller-v8.service'
NAME='permio-m6-action-proof-v8'
STOP=False

def now():return dt.datetime.now(dt.timezone.utc).isoformat()
def save(value):
 p=STATE.with_suffix('.writing')
 p.write_text(json.dumps(value,indent=2)+'\n');p.chmod(0o600);p.replace(STATE)
def read_config():return {name:(PARAMS/name).read_text().strip() for name in ['enabled','max_pool_percent','compressor','shrinker_enabled','accept_threshold_percent']}
def controller_pid():return subprocess.check_output(['systemctl','show',UNIT,'-p','MainPID','--value'],text=True,timeout=5).strip()
def container():
 v=json.loads(subprocess.check_output(['docker','inspect',NAME],text=True,timeout=5))[0]
 assert v['Config']['Labels']['permio.owner']=='permio-m6-synthetic-action-proof-v8'
 return v
def restore():
 if not STATE.exists():return
 value=json.loads(STATE.read_text());before=value['originalConfiguration'];current=read_config()
 conflicts=[]
 if value.get('enableWriteAttempted'):
  if current['enabled']=='Y':(PARAMS/'enabled').write_text(before['enabled']+'\n')
  elif current['enabled']!=before['enabled']:conflicts.append('enabled')
 current=read_config()
 if value.get('poolWriteAttempted'):
  if current['max_pool_percent']=='6':(PARAMS/'max_pool_percent').write_text(before['max_pool_percent']+'\n')
  elif current['max_pool_percent']!=before['max_pool_percent']:conflicts.append('max_pool_percent')
 current=read_config();value.update(restorationObservedAtUtc=now(),configurationAfterRestore=current,
  originalConfigurationRestored=current==before,configurationConflicts=conflicts)
 save(value)
 assert value['originalConfigurationRestored'] and not conflicts
def run():
 global STOP
 assert ROOT.resolve()==ROOT and ROOT.stat().st_mode&0o777==0o700 and not STATE.exists()
 before=read_config();assert before=={'enabled':'N','max_pool_percent':'20','compressor':'lzo','shrinker_enabled':'Y','accept_threshold_percent':'90'}
 assert controller_pid()=='53283'
 v=container();assert v['State']['Running'] and v['State']['Pid']==53384
 paths={line.split()[0] for line in Path('/proc/swaps').read_text().splitlines()[1:]}
 assert paths=={'/var/lib/permio-m6/swapfile',str(ROOT/'temporary-paging.swap')}
 group=Path('/sys/fs/cgroup/system.slice/docker-'+v['Id']+'.scope')
 assert int((group/'memory.max').read_text())==27*1024**3//2
 assert int((group/'memory.swap.max').read_text())==15*1024**3
 state={'kind':'owned-m6-v8-live-zswap-cache-trial','startedAtUtc':now(),'originalConfiguration':before,
  'maximumSeconds':600,'poolPercentDuringTrial':6,'proverContainerId':v['Id'],'proverPid':53384,
  'proofRestarted':False,'swapCapacityChanged':False,'originalConfigurationRestored':False}
 save(state)
 def stop(signum,frame):
  global STOP
  STOP=True
 for signum in [signal.SIGTERM,signal.SIGINT]:signal.signal(signum,stop)
 try:
  state['poolWriteAttempted']=True;save(state);(PARAMS/'max_pool_percent').write_text('6\n')
  assert read_config()['max_pool_percent']=='6'
  state['enableWriteAttempted']=True;save(state);(PARAMS/'enabled').write_text('Y\n')
  assert read_config()['enabled']=='Y'
  state['enabledVerifiedAtUtc']=now();state['configurationDuringTrial']=read_config();save(state)
  start=time.monotonic()
  with (ROOT/'zswap-samples.jsonl').open('x',encoding='utf-8') as samples:
   while not STOP and time.monotonic()-start<600:
    current=container()
    if controller_pid()=='0' or not current['State']['Running']:state['endReason']='owned-proof-ended';break
    stats={k:int(n) for k,n in (line.split() for line in (group/'memory.stat').read_text().splitlines()) if k in ['zswap','zswapped','pgmajfault','anon','file']}
    row={'atUtc':now(),'elapsedSeconds':time.monotonic()-start,'memoryCurrentBytes':int((group/'memory.current').read_text()),'swapCurrentBytes':int((group/'memory.swap.current').read_text()),'memoryStat':stats}
    samples.write(json.dumps(row)+'\n');samples.flush();time.sleep(10)
   else:state['endReason']='caller-stopped' if STOP else 'ten-minute-trial-complete'
 except Exception as error:state['safeErrorType']=type(error).__name__
 finally:
  state['endedAtUtc']=now();save(state);restore()
 return 0

if __name__=='__main__':
 if sys.argv[1:]==['--restore-only']:restore()
 else:
  assert sys.argv[1:]==[]
  raise SystemExit(run())
