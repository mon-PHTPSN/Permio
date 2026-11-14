"""Pause only the owned M6 client at an exact, already finalized checkpoint."""
import datetime as dt,json,os,stat,subprocess,time
from pathlib import Path
ROOT=Path('/opt/permio-m6-remaining-preprod-20261019-v1')
CLIENT='permio-m6-remaining-ordinary-matrix-v1-client.service'
CONTROLLER='permio-m6-remaining-ordinary-matrix-v1-controller.service'
REPORT=ROOT/'pause-after45-v1.json'
def unit(name):
 return dict(row.split('=',1) for row in subprocess.check_output(['systemctl','show',name,'-p','MainPID','-p','Result','-p','ExecMainStatus'],text=True).splitlines())
def save(value):
 p=REPORT.with_suffix('.writing');p.write_text(json.dumps(value,indent=2)+'\n');p.chmod(0o600);p.replace(REPORT)
def main():
 assert os.geteuid()==0 and ROOT.resolve()==ROOT and ROOT.stat().st_mode&0o777==0o700 and not REPORT.exists()
 result={'kind':'m6-owned-finalized-checkpoint-pause','startedAtUtc':dt.datetime.now(dt.timezone.utc).isoformat(),
  'instanceId':'i-t4ni11rkjyzgi0vlb68d','region':'ap-southeast-1','targetNativeRound':45,
  'nativeSubmissionsByThisJob':0,'stopsInstance':False,'sourceOrSignaturesModified':False}
 save(result)
 try:
  for _ in range(3600):
   assert not list((ROOT/'private').glob('wallet-046-*')),'Boundary passed; preserve and reconcile'
   info=unit(CLIENT);assert info['MainPID']!='0','Original client ended before checkpoint'
   events=[]
   for row in (ROOT/'runtime-ordinary-matrix-v1/client-public.jsonl').read_text().splitlines():
    try:events.append(json.loads(row))
    except json.JSONDecodeError:pass
   confirmed=[e for e in events if e.get('phase')=='finalized' and e.get('round')==45]
   disposed=any(e.get('phase')=='wallet-process-disposed' and e.get('round')==45 and e.get('checkpointUpdatedPrivately') for e in events)
   final_preparation=False
   for p in sorted((ROOT/'private').glob('checkpoint-*.json')):
    assert p.is_file() and not p.is_symlink() and p.stat().st_uid==0 and stat.S_IMODE(p.stat().st_mode)==0o600
    record=json.loads(p.read_text())
    if record.get('stage')=='ordinary-action-final-prepared':final_preparation=True
   if confirmed and disposed and final_preparation:
    assert len(confirmed)==1 and len(list((ROOT/'private').glob('wallet-???-submission.json')))==45
    assert len(list((ROOT/'private').glob('wallet-???-reservation.json')))==45
    snapshots=ROOT/'private/rolling-wallet-snapshots.json';assert snapshots.is_file() and not snapshots.is_symlink()
    assert snapshots.stat().st_mtime_ns>=(ROOT/'private/wallet-045-submission.json').stat().st_mtime_ns
    result.update(checkpointFullyWritten=True,rollingWalletCheckpointSaved=True,transactionId=confirmed[0]['transactionId'],
      ledgerSequence=confirmed[0]['ledgerSequence'],alreadyFinalized=45,intentionalCheckpointBoundaryStop=True)
    save(result)
    subprocess.run(['systemctl','stop',CLIENT],check=True,timeout=90,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    for _ in range(150):
     if unit(CONTROLLER)['MainPID']=='0':break
     time.sleep(2)
    assert unit(CONTROLLER)['MainPID']=='0' and unit(CLIENT)['MainPID']=='0'
    assert not list((ROOT/'private').glob('wallet-046-*'))
    report=json.loads((ROOT/'runtime-ordinary-matrix-v1/report.json').read_text())
    assert report['ownedClientStopped'] and report['ownedProverStopped'] and report['originalSwapRestored']
    assert report['temporarySwapRemoved'] and report['originalSwappinessRestored']
    result.update(pausedAtExactFinalizedBoundary=True,ownedClientAndProverStopped=True,
      temporaryResourcesRestored=True,completedAtUtc=dt.datetime.now(dt.timezone.utc).isoformat(),
      publicFileRestorationStillRequired=True,completedTransactionsReplayed=False)
    save(result);print(json.dumps(result),flush=True);return
   time.sleep(2)
  raise TimeoutError('Checkpoint not reached within two hours')
 except Exception as error:
  result.update(pausedAtExactFinalizedBoundary=False,errorType=type(error).__name__,detailsWithheld=True,
    endedAtUtc=dt.datetime.now(dt.timezone.utc).isoformat());save(result);print(json.dumps(result),flush=True);raise
if __name__=='__main__':main()
