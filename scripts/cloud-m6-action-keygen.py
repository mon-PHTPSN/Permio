"""Owned, bounded public-input key build. No wallet, deployment or proof API."""
import datetime as dt
import hashlib
import json
import os
import stat
from pathlib import Path
import shutil
import subprocess
import time

ROOT=Path('/opt/permio-m6-action-boundary-20261017-v8')
UNIT='permio-m6-action-keygen-job-v8.service'
TOOL=Path('/opt/permio-m6-membership-20261015/zkir')
PROGRAM=ROOT/'diagnoseLedgerBoundActionAncestry.zkir'
GIB=1024**3
SWAP=Path('/var/lib/permio-m6/swapfile')
ALLOW_SWAP_MANAGEMENT=False

def sha(file):
    h=hashlib.sha256()
    with file.open('rb') as f:
        for part in iter(lambda:f.read(1024**2),b''):h.update(part)
    return h.hexdigest()

def command(args):
    return subprocess.run(args,capture_output=True,text=True,check=True).stdout.strip()

def job():
    text=command(['systemctl','show',UNIT,'-p','MainPID','-p','ActiveState','-p','SubState','-p','Result','-p','ExecMainStatus','-p','ExecMainCode'])
    return dict(line.split('=',1) for line in text.splitlines() if '=' in line)

def counters(text):
    result={}
    for line in text.splitlines():
        words=line.replace(':',' ').split()
        if len(words)>1 and words[1].isdigit():result[words[0]]=int(words[1])
    return result

def active_swaps():
    return set(line.split()[0] for line in Path('/proc/swaps').read_text().splitlines()[1:])

def select_swap_action(active_paths, selected, allow_management, can_manage):
    if selected in active_paths:return 'inherit-active'
    if active_paths:raise RuntimeError('Other active swap requires coordination')
    if not allow_management or not can_manage:
        raise PermissionError('Existing inactive swap requires explicit host-management permission')
    return 'activate-existing'

def validate_swap_metadata(value):
    if not value['regularFile'] or value['symlink'] or not value['canonicalPath']:
        raise ValueError('Configured swap path is not a canonical regular file')
    if value['uid']!=0 or value['mode']!=0o600 or value['links']!=1:
        raise PermissionError('Existing swap ownership, mode or links are unsafe')
    if value['bytes']!=8*GIB or value['allocatedBytes']<value['bytes'] or not value['swapHeaderValid']:
        raise ValueError('Existing swap allocation or header differs from the reviewed file')

def inspect_existing_swap():
    info=SWAP.lstat()
    value={'path':str(SWAP),'regularFile':stat.S_ISREG(info.st_mode),'symlink':SWAP.is_symlink(),
        'canonicalPath':SWAP.resolve()==SWAP,'uid':info.st_uid,'gid':info.st_gid,'mode':info.st_mode&0o777,
        'links':info.st_nlink,'bytes':info.st_size,'allocatedBytes':info.st_blocks*512,
        'device':info.st_dev,'inode':info.st_ino,'swapHeaderValid':True}
    validate_swap_metadata(value)
    with os.fdopen(os.open(SWAP,os.O_RDONLY|os.O_NOFOLLOW),'rb') as file:
        opened=os.fstat(file.fileno())
        assert (opened.st_dev,opened.st_ino)==(info.st_dev,info.st_ino)
        file.seek(os.sysconf('SC_PAGE_SIZE')-10);value['swapHeaderValid']=file.read(10)==b'SWAPSPACE2'
    validate_swap_metadata(value)
    return value

def swap_identity(value):
    return tuple(value[key] for key in ['path','device','inode','uid','gid','mode','bytes','links'])

def self_test():
    count=0;selected='/reviewed/existing.swap'
    assert select_swap_action({selected},selected,False,False)=='inherit-active';count+=1
    assert select_swap_action(set(),selected,True,True)=='activate-existing';count+=1
    for active,allowed,admin,error in [(set(),False,True,PermissionError),(set(),True,False,PermissionError),({'/other.swap'},True,True,RuntimeError)]:
        try:select_swap_action(active,selected,allowed,admin)
        except error:count+=1
        else:raise AssertionError('Unsafe activation was accepted')
    good={'regularFile':True,'symlink':False,'canonicalPath':True,'uid':0,'mode':0o600,'links':1,'bytes':8*GIB,'allocatedBytes':8*GIB,'swapHeaderValid':True}
    validate_swap_metadata(good);count+=1
    for key,value,error in [('symlink',True,ValueError),('mode',0o644,PermissionError),('links',2,PermissionError),('bytes',4*GIB,ValueError),('allocatedBytes',GIB,ValueError),('swapHeaderValid',False,ValueError)]:
        try:validate_swap_metadata({**good,key:value})
        except error:count+=1
        else:raise AssertionError('Unsafe existing file was accepted')
    print(json.dumps({'existingSwapPolicyTests':count,'passed':True,'hostCommandsExecuted':False,'noPrivilegeEscalation':True}))

def run():
    assert os.getuid()==0 and ROOT.resolve()==ROOT and ROOT.stat().st_mode&0o777==0o700
    assert sha(PROGRAM)=='cfa7dd2e7b85d08e84f7d4bc7a709fd00c68547c558edfc5e7d0a80c86957d76'
    assert sha(TOOL)=='5443f87db07b7f19cc273380c224b77b4b7ca124deac6d54f7a165628fc5e1fc'
    assert command([str(TOOL),'--version'])=='midnight-zkir 2.1.0'
    assert sha(Path('/root/.cache/midnight/zk-params/bls_midnight_2p20'))=='1cc62978558fdc1e445cd70cfd9a86ec3c2e2151b6d74811232d37faf9133ff1'
    assert sha(Path('/root/.cache/midnight/zk-params/bls_midnight_2p21'))=='9cf1644a87f0f027ae5fc6278f91d823a6334ff3e338a29e2f2ef57d071ed64d'
    assert command(['systemctl','show',UNIT,'-p','LoadState','--value'])=='not-found'
    assert shutil.disk_usage(ROOT).free>5*GIB
    assert counters(Path('/proc/meminfo').read_text())['MemAvailable']>13*1024**2
    output=ROOT/'output';output.mkdir(mode=0o700)
    log=output/'compiler.txt';samples=output/'resources.jsonl'
    prover=output/'action.prover';verifier=output/'action.verifier'
    start=time.monotonic();report={
        'kind':'ledger-bound-full-action-ancestry-real-keygen','startedAtUtc':dt.datetime.now(dt.timezone.utc).isoformat(),
        'instanceId':'i-t4ni11rkjyzgi0vlb68d','region':'ap-southeast-1','compilerVersion':'0.31.1','zkirVersion':'2.1.0',
        'programSha256':sha(PROGRAM),'parameterCacheHomeExplicit':True,'isolatedFactoringCandidate':True,'previousAttemptPreserved':'/opt/permio-m6-action-boundary-20261017-v7/keygen-report.json','memoryHighBytes':(27*GIB)//2,'memoryMaxBytes':14*GIB,'swapMaxBytes':8*GIB,
        'cpuQuotaCores':2,'rayonThreads':1,'timeoutSeconds':3600,'walletLoaded':False,'transactionsSubmitted':0,
        'newDeployment':False,'mockKeysUsed':False,'proofGenerated':False,'ordinaryActionAcceptance':False,'milestoneComplete':False}
    group=Path('/sys/fs/cgroup/system.slice')/UNIT
    last={};launched=False
    swap=SWAP;before_swap=inspect_existing_swap()
    original_swaps=active_swaps()
    activated_here=False;vm_changed=False
    vm=Path('/proc/sys/vm/swappiness')
    probe_unit='permio-m6-action-paging-probe-v8.service'
    report.update(experimentalPagingProfile=True,existingSwapBytes=8*GIB,
        originalSwappiness=int(Path('/proc/sys/vm/swappiness').read_text()),globalVmSettingsChangedTemporarily=False,
        existingSwapFile=str(swap),newSwapFileCreated=False,existingSwapFilePreserved=True)
    try:
        action=select_swap_action(original_swaps,str(swap),ALLOW_SWAP_MANAGEMENT,os.geteuid()==0)
        checkpoint={'originalSwappiness':report['originalSwappiness'],'temporarySwappiness':60 if action=='activate-existing' else None,
            'existingSwapBytes':8*GIB,'existingFileMetadata':before_swap,'originalActiveSwapPaths':sorted(original_swaps),'action':action}
        checkpoint_file=ROOT/'swap-state-checkpoint.json'
        with checkpoint_file.open('x') as file:file.write(json.dumps(checkpoint,indent=2)+chr(10))
        checkpoint_file.chmod(0o600)
        report['swapAction']=action
        if action=='activate-existing':
            try:command(['swapon',str(swap)])
            finally:activated_here=str(swap) in active_swaps() and str(swap) not in original_swaps
        assert active_swaps()==original_swaps|{str(swap)}
        report['existingSwapAvailable']=True;report['activatedByThisRun']=activated_here
        checkpoint={'originalSwappiness':report['originalSwappiness'],'temporarySwappiness':60,'existingSwapBytes':8*GIB}
        checkpoint_file=ROOT/'vm-settings-checkpoint.json'
        checkpoint_file.write_text(json.dumps(checkpoint,indent=2)+chr(10));checkpoint_file.chmod(0o600)
        if activated_here:
            vm_changed=True;vm.write_text('60'+chr(10));assert int(vm.read_text())==60
            report['globalVmSettingsChangedTemporarily']=True
        probe_code="import json,time\nfrom pathlib import Path\na=bytearray(384*1024**2)\nfor i in range(0,len(a),4096):a[i]=1\ntime.sleep(2)\np=Path('/sys/fs/cgroup/system.slice/permio-m6-action-paging-probe-v8.service/memory.swap.current')\nused=int(p.read_text());assert used>0\nprint(json.dumps({'pagingPreflightPassed':True,'swapUsedBytes':used,'allocationBytes':len(a),'memoryMaxBytes':256*1024**2}))\n"
        probe_result=json.loads(command(['systemd-run','--unit='+probe_unit,'--property=MemoryMax=256M',
            '--property=MemorySwapMax=512M','--property=CPUQuota=100%','--property=RuntimeMaxSec=45',
            '--wait','--pipe','--collect','python3','-c',probe_code]))
        assert probe_result['pagingPreflightPassed'] and probe_result['swapUsedBytes']>0
        (ROOT/'paging-preflight-result.json').write_text(json.dumps(probe_result,indent=2)+chr(10))
        report['pagingPreflight']=probe_result
        command(['systemd-run','--unit='+UNIT,'--remain-after-exit','--property=MemoryAccounting=yes',
            '--property=MemoryHigh=13824M','--property=MemoryMax=14G','--property=MemorySwapMax=8G',
            '--property=CPUQuota=200%','--property=OOMPolicy=stop','--property=RuntimeMaxSec=3650',
            '--property=TimeoutStopSec=15','--property=WorkingDirectory='+str(ROOT),
            '--property=StandardOutput=append:'+str(log),'--property=StandardError=append:'+str(log),
            '--setenv=HOME=/root','--setenv=RAYON_NUM_THREADS=1','--setenv=TOKIO_WORKER_THREADS=1',
            str(TOOL),'compile','--verbose',str(PROGRAM),str(prover),str(verifier)])
        launched=True
        with samples.open('x') as file:
            while True:
                state=job();memory=counters(Path('/proc/meminfo').read_text())
                row={'atUtc':dt.datetime.now(dt.timezone.utc).isoformat(),'elapsedSeconds':time.monotonic()-start,
                     'MemAvailableKiB':memory['MemAvailable'],'diskFreeBytes':shutil.disk_usage(ROOT).free,
                     'jobState':state}
                if group.exists():
                    for name in ['memory.current','memory.peak','memory.swap.current','memory.events','cpu.stat']:
                        p=group/name
                        if p.exists():
                            value=p.read_text().strip();row[name]=counters(value) if name in ('memory.events','cpu.stat') else int(value)
                    for name,wanted in [('memory.high',(27*GIB)//2),('memory.max',14*GIB),('memory.swap.max',8*GIB)]:
                        assert (group/name).read_text().strip()==str(wanted)
                last=row;file.write(json.dumps(row)+'\n');file.flush()
                if state['MainPID']=='0':break
                reason='host-memory-reserve' if memory['MemAvailable']<512*1024 else 'disk-reserve' if row['diskFreeBytes']<GIB else 'bounded-duration' if row['elapsedSeconds']>=3600 else None
                if reason:
                    report['stopReason']=reason;command(['systemctl','stop',UNIT]);break
                time.sleep(3)
        report['jobOutcome']=job()
        report['realKeyBuildCompleted']=not report.get('stopReason') and report['jobOutcome']['Result']=='success' and report['jobOutcome']['ExecMainStatus']=='0' and all(p.is_file() and p.stat().st_size>0 for p in [prover,verifier])
        report['keyFiles']={p.name:{'bytes':p.stat().st_size,'sha256':sha(p)} for p in [prover,verifier] if p.is_file()}
    except Exception as error:
        report['controllerErrorType']=type(error).__name__;report['realKeyBuildCompleted']=False
        raise
    finally:
        report['ownedProbeStopped']=False
        try:
            pid=command(['systemctl','show',probe_unit,'-p','MainPID','--value'])
            if pid!='0':command(['systemctl','stop',probe_unit])
            report['ownedProbeStopped']=command(['systemctl','show',probe_unit,'-p','MainPID','--value'])=='0'
        except Exception as error:report['probeCleanupErrorType']=type(error).__name__
        try:
            if launched:
                report['jobBeforeCleanup']=job()
                if report['jobBeforeCleanup']['MainPID']!='0':command(['systemctl','stop',UNIT])
            report['ownedJobStopped']=not launched or job()['MainPID']=='0'
        except Exception as error:
            report['jobCleanupErrorType']=type(error).__name__;report['ownedJobStopped']=False
        report['originalSwapStateRestored']=False;report['existingSwapFileIdentityPreserved']=False
        if report['ownedJobStopped'] and report['ownedProbeStopped']:
            try:
                assert swap_identity(inspect_existing_swap())==swap_identity(before_swap)
                if activated_here and str(swap) in active_swaps():
                    memory=counters(Path('/proc/meminfo').read_text())
                    assert memory['MemAvailable']>memory['SwapTotal']-memory['SwapFree']+512*1024
                    command(['swapoff',str(swap)])
                assert active_swaps()==original_swaps
                report['originalSwapStateRestored']=True
                report['existingSwapFileIdentityPreserved']=swap_identity(inspect_existing_swap())==swap_identity(before_swap)
            except Exception as error:report['swapCleanupErrorType']=type(error).__name__
        report['globalVmSettingRestored']=False
        if report['ownedJobStopped'] and report['ownedProbeStopped']:
            try:
                current=int(vm.read_text())
                if vm_changed and current==60:vm.write_text(str(report['originalSwappiness'])+chr(10))
                assert int(vm.read_text())==report['originalSwappiness']
                report['globalVmSettingRestored']=True
            except Exception as error:report['vmRestoreErrorType']=type(error).__name__
        report['observedSwappinessAfter']=int(vm.read_text())
        report['completedAtUtc']=dt.datetime.now(dt.timezone.utc).isoformat();report['elapsedSeconds']=time.monotonic()-start
        report['lastResourceSample']=last;report['programUnchanged']=sha(PROGRAM)==report['programSha256']
        report['publicOutputHashes']={p.name:sha(p) for p in [log,samples] if p.is_file()}
        (ROOT/'keygen-report.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report),flush=True)
    return 0 if report.get('realKeyBuildCompleted') and report.get('originalSwapStateRestored') and report.get('existingSwapFileIdentityPreserved') and report.get('globalVmSettingRestored') and report.get('ownedProbeStopped') else 1

if __name__=='__main__':
    import argparse
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('mode',choices=['run','self-test'])
    parser.add_argument('--allow-existing-swap-management',action='store_true',help='Explicit permission to activate the reviewed inactive file and restore it afterward; never sudo, format, allocate or delete')
    args=parser.parse_args()
    ALLOW_SWAP_MANAGEMENT=args.allow_existing_swap_management
    if args.mode=='self-test':self_test()
    else:raise SystemExit(run())
