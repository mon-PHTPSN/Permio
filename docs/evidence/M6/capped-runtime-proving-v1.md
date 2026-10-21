# M6 capped real-runtime proving — operational test profile

Date: 2026-10-15 (Asia/Shanghai). This is not M6 acceptance or a new trust model.

## User-approved reproduction of the experiment profile

Latest identical retry, E3i5Hf, runs after the user reports freeing processes.
No source/profile/guard changes are made. It accepts an account transaction
(proof-provider stage 427.301 seconds; separate UTC call-to-index span 473.607
seconds), completes the owned idle restart and reapplication of high5/max6
GiB, then starts the first cold slot proof. That proof does not complete:
shared free swap 431008 KiB falls below the 524288 KiB reserve while RAM
432588 KiB stays above the 393216 KiB reserve. No OOM or slot transaction is
observed. Its 302.657-second UTC provider-to-stop span is interrupted-stage
timing, not successful proof latency. Independent public observation confirms
instance/status/credential nonce 1, slot nonce/session 0. Own resources clean
up, original services remain healthy. Exact metrics, clock discrepancy,
separate hashes and original interrupted result are retained in the JSON.
The retry gets further but does not establish completion, a minimum hardware
requirement, or a controlled causal attribution to a particular closed process.

用户表示释放进程后同配置重试E3i5Hf，未改源码／配置／保护。账户交易接受（provider
阶段427.301秒，另列UTC调用至索引跨度473.607秒），自有闲置重启及high5／max6GiB
重新应用通过，随后首个冷槽位证明开始。但证明未完成：共享空闲swap431008KiB低于
保留524288KiB，RAM432588KiB仍高于保留393216KiB，无观察到的OOM或槽位交易。
provider开始至停止UTC跨度302.657秒只是中断阶段时间，不是成功证明延迟。独立公开
读取确认实例／凭证序号及凭证nonce1、槽位nonce／session0。自有资源清理，原服务
健康。JSON保留精确指标、时钟差异、独立哈希和原中断结果。重试推进更远，但不确定
完整成功、最低硬件或对某个关闭进程的受控因果归因。

The user asks to verify the successful experiment's configuration on actual
transaction proving. The new opt-in command is:

用户要求将成功实验的配置用于真实交易证明验证，新增明确启用命令如下：

```bash
node scripts/run-m6-capped-live.mjs --run --slot-state --reset-before-slot --experiment-reclaim
```

This is prover memory.high5GiB/memory.max6GiB/swap.max8GiB,1CPU/Rayon/server
worker, plus the unchanged separately capped1GiB client. The combined long-lived
hard allowance is7GiB, not the earlier5GiB. Shared total swap remains8GiB,
including the same6GiB temporary ext4 file and original2GiB. This does not enable
the deferred16GiB swap proposal. Node/indexer/database/controller and original
prover costs are outside the sum. It is a measured reproduction, not adaptive
proof-algorithm support or a production minimum. The successful key experiment
is not itself a successful transaction proof; its exact slot keys already are
reused, so no new key build is necessary.

证明器memory.high5GiB／memory.max6GiB／swap.max8GiB、1CPU／Rayon／server线程，
客户端仍单独硬限制1GiB。长期双方合计硬上限7GiB，不是此前5GiB。共享总swap仍8GiB，
由同6GiB临时ext4文件加原2GiB组成，不开启暂缓的16GiB提案。节点／索引器／数据库／
控制器及原证明器开销不含在合计内。这是配置复现测量，不是证明算法自适应能力或
生产最低配置；密钥实验成功不等于交易证明成功。其精确槽位密钥已经复用，无需重建。

Docker's cgroup mount is read-only inside the prover, and its host cgroup is
not visible in the Ubuntu PID namespace. A capability-free, network-disabled,
64MiB disposable helper mounts only that exact owned container's memory.high
file writable, plus the immediate parent hard/swap limits read-only. It checks
the exact owned ID/name/image/label,6GiB hard RAM/8GiB swap and1CPU, and rejects
foreign containers or restrictive ancestors. No privileged container, Docker
socket or broad writable host mount is introduced. The real leaf limits are
read back inside the prover before wallet startup and after the already-owned
idle restart; a missing5GiB high threshold fails closed. Default profiles remain
4GiB prover/max plus1GiB client, without silently changing historical results.

Docker证明器内cgroup挂载只读，其宿主cgroup在Ubuntu PID命名空间不可见。一个无
capability／禁网络／64MiB的一次性helper，仅将精确自有容器的memory.high文件可写
挂载，并只读挂载直接父级硬内存／swap限制。核验自有ID／name／image／label、硬RAM
6GiB／swap8GiB及1CPU，拒绝外来容器或更紧上级限制。不引入特权容器、Docker socket
或大范围可写宿主挂载。钱包前及既有自有闲置重启后均在证明器内读回真实限制，缺失
5GiB软阈值明确失败。默认仍证明器硬4GiB加客户端1GiB，不悄然改写历史结果。

Run BmF0kQ stops at the shared RAM reserve during account proving after
allocation succeeds. Exact contract/public-log references and results are in
reclaim-runtime-verification.json. New tests cover explicit profile selection,
fixed RAM accounting, unchanged shared swap/defaults, forbidden/duplicate
flags, foreign/unbounded helper targets, actual high-threshold verification,
and numeric reclaim events distinct from hard-limit/OOM events. All18focused
policy/sampler tests and strict typecheck pass. The first full check hits an
unchanged diagnostic's30second subprocess deadline; the unchanged isolated
test and full rerun then pass, without extending the timeout or skipping it.
The full rerun passes299tests. No final acceptance is
inferred from startup, key reuse, SDK preflight or an interrupted proof.

BmF0kQ分配通过，但账户证明时触整机RAM保留阈值停止。精确合约／公开日志引用和结果见
reclaim-runtime-verification.json。新增测试覆盖明确配置选择、固定RAM核算、共享
swap／默认配置不变、禁止／重复标志、外来／无限制helper目标、实际软阈值核验，以及
区别于硬上限／OOM的数值回收事件。18项定向策略／采样及严格类型通过；第一次完整
检查遇到未变诊断的30秒子进程期限，原样单独及完整重跑通过，完整299项，不提高期限
或跳过。启动、复用
密钥、SDK预检查或被中断证明均不代表最终验收。

Completed result: deployment plus11transactions through allocation accepted;
779soft-reclaim events,0captured hard-limit/OOM events. Prover RAM peak
5369212928bytes is slightly above the5GiB soft target but below6GiB hard;
maximum sampled prover swap207622144bytes. Client reported RAM/swap peaks
806260736/819232768bytes. At06:30:09.118Z shared RAM389256KiB is below
393216KiB reserve, though swap7075780KiB remains free. The safety stop is not
a cryptographic rejection or captured HTTP timeout. The account proof does
not complete; owned reset and slot proving are never reached.561controller/
233prover samples capture no sampling errors, but no final sampler-completion
event follows forced stop. Cleanup removes own client/container/temporary
swap; original2GiB and five services preserved. Independent public read
06:31:15.959Z confirms exact allocation and initial state, both instance/status
sequences0, credential/slot nonce counts0 and no staging. This is not a proof
minimum or evidence that increasing swap is necessary. A future budget controller
must choose/lower the soft target to leave caller/services/reserve headroom
within the already fixed hard/swap ceilings; it is not implemented here.

完成结果：部署加11笔到分配交易接受，779次软回收、捕获硬上限／OOM事件0。证明器
RAM峰5369212928bytes略超5GiB软目标但低于6GiB硬限制，swap最大采样207622144bytes；
客户端RAM／swap峰806260736／819232768bytes。UTC06:30:09.118共享RAM389256KiB
低于保留393216KiB，swap仍空闲7075780KiB。安全停止不是密码拒绝或已捕获HTTP
超时；账户证明未完成，自有重启／槽位证明从未到达。561控制器／233证明器采样无
捕获采样错误，但强停后无最终采样完成事件。自有客户端／容器／临时swap清理，原
2GiB及五服务保留。06:31:15.959独立公开读取确认精确分配／初始状态、实例／凭证
序号0、凭证／槽位nonce0、无暂存。这不是证明最低配置或必须扩大swap的证据。
未来预算控制器应在既有硬／swap上限内选择／降低软目标，为客户端／服务／保留量
留余量；此次尚未实现。

Full unchanged regression rerun passes299tests with0failures/skips, including
135generated Compact and6local Hardhat tests; the earlier diagnostic deadline
failure remains recorded. Whole controller monotonic time1342.961332105seconds
versus UTC span1404.05 differs by61.088667895seconds. Preserve the clock
discrepancy and do not call the interrupted account interval successful proof
latency. Exact fingerprints and remaining gates are in the separate JSON.

完整原样重跑299项通过、无失败跳过，含135生成Compact／6本地Hardhat，旧诊断
期限失败仍记录。控制器单调时间1342.961332105秒、UTC跨度1404.05秒，相差
61.088667895秒，保留时钟差异，不将账户中断区间称作成功证明延迟。精确指纹及待验
门槛见独立JSON。

## Latest result and opt-in cold-backend boundary

F5cqeV accepts a second real account call in184.905seconds, including a
163.374second proof-provider stage. Independent public observation confirms
instance/status sequences1, credential nonce1, no slot nonce/session. The
first corrected slot reaches proof-provider job14 but is interrupted by the
shared swap guard after48.290seconds; free swap341100KiB is below524288.
No slot transaction or OOM is observed. Own resources cleanly stop/remove;
original2GiB swap and prover remain. Exact public references, hashes, resource
peaks and observation time are in capped-runtime-verification.json.

F5cqeV第二次真实账户调用端到端184.905秒，其中proof-provider163.374秒；独立
公开观察实例／凭证序号1、凭证nonce1、无槽位nonce／session。修正后的首槽位到达
proof-provider任务14，但48.290秒后触及共享swap保护：空闲341100KiB低于524288，
没有槽位交易或观察到的OOM。自有资源清理，原2GiB swap及证明器保留。精确引用、
哈希、资源峰值及独立读取时间见验证JSON。

Immediately after account acceptance and before slot proving, one sample
records prover cgroup RAM2941095936bytes and swap5430046720bytes. This
retention is not identified as live objects versus allocator arenas. Without
reading a heap, private request or verbose server log, the next optional test
uses `--reset-before-slot`: preserve caller private state, independently check
the exact public state, pause/finish numeric sampling, request a restart of
only the controller-owned idle prover, then verify unchanged state again.
The controller binds the public request to its exact client PID/run and accepts
no arbitrary container, endpoint or command. It checks zero pending/processing
jobs, the same container/image and actual cgroup ceilings after restart, and
all original interruption/time/RAM/swap guards before releasing the caller.

账户接受后、槽位证明前，采样证明器cgroup RAM2941095936／swap5430046720bytes。
没有确定它们是活对象还是allocator保留区；不读heap、私有请求或详细服务日志。
下一项可选`--reset-before-slot`测试保留客户端私有状态，独立核验精确公开状态，
暂停并完成数值采样，仅请求重启控制器自有且闲置的证明器，随后再次核验状态不变。
公开请求绑定自有客户端PID／run，不接受任意容器、端点或命令；控制器要求运行／
排队任务为零，重启后同容器／镜像及实际cgroup上限不变，再通过原中断／时间／
RAM／swap保护才释放客户端。

The option is slot-only/default-off, performs one backend restart rather than
a proof/transaction retry, and does not renew protocol validity windows.
Combined hard RAM5GiB, shared host swap8GiB,4CPU/Rayon4/server pool2 and
600000ms HTTP wait remain unchanged. Run cBg1CS accepts a third account in
184.906seconds, successfully releases the retained backend RAM/swap, but its
cold first slot proof still stops at the shared swap reserve after113.803seconds.
No slot proof completes or transaction is accepted. The full295-test root
check passes, including six real local
Hardhat tests; two added policy tests reject non-slot/duplicate reset flags and
foreign or expanded reset requests. No Compact source/key/schema changes are
part of this operational option. Historical failures below remain separate.

选项默认关闭、仅限槽位，一次后端重启而非证明／交易重试，不续期协议有效窗口。
仍合计硬RAM5GiB／共享总swap8GiB、4CPU／Rayon4／serverpool2及HTTP600000ms。
cBg1CS第三次账户184.906秒接受、成功释放后端残留RAM／swap，但冷首槽位证明
113.803秒后仍触共享swap保护，没有槽位证明完成或交易接受。完整295项根检查通过，
含六项真实本地Hardhat；
新增两项策略测试拒绝非槽位／重复重启标志以及外来或扩展请求。本操作选项不改
Compact源码、密钥或模式；下方历史失败单独保留。

The verified reset reduces prover cgroup RAM2997391360/swap5317849088bytes
to RAM13496320/swap0, with the exact same container/image/limits. The cold
epoch then samples prover RAM up to4294967296bytes and swap5936447488bytes.
At21:20:44.806Z, free shared swap482248KiB triggers the512MiB guard while
RAM1409216KiB remains available; no OOM is observed.460controller and173prover
samples include154before/19after reset, no captured sampling failures, but no
final post-reset completion event after forced stop. Temporary client/container/
swap clean up by21:20:52.977Z, preserving original2GiB swap and prover. Public
reads during proving21:20:11.855Z and after cleanup21:21:27.315Z independently
confirm instance/status/credential nonce1 and slot session/nonce0. The first
sandbox read fails with a redacted category; approved reads pass, without
claiming a captured cause for the original failure. Timestamp filtering uses
DateTimeOffset rather than comparing UTC DateTime ticks to a local parsed date.
The larger16GiB shared-paging trial, with unchanged5GiB physical RAM and
prover/client swap ceilings12/4GiB, has been explicitly requested but is not
enabled. Its completion or production feasibility is not guaranteed.

核验重启将证明器cgroup RAM2997391360／swap5317849088bytes降至RAM13496320／
swap0，仍同容器／镜像／限制。冷阶段随后采样证明器RAM最高4294967296bytes、swap
5936447488bytes。UTC21:20:44.806空闲共享swap482248KiB触512MiB保护，仍有RAM
1409216KiB，无观察到的OOM。460控制器／173证明器采样含重启前154／后19，没有
捕获采样失败，但强制停止后无最终采样完成事件。21:20:52.977前自有客户端／容器／
swap清理，原2GiB／证明器保留。证明期间21:20:11.855及清理后21:21:27.315独立
公开读取确认实例／凭证序号及凭证nonce1、槽位session／nonce0。首次sandbox读取
脱敏失败，批准后两次成功，不宣称已捕获原失败原因。时间筛选用DateTimeOffset，
避免UTC DateTime与本地解析日期按ticks比较。已明确请求总共享swap16GiB、仍RAM
5GiB、证明器／客户端swap上限12／4GiB的测试，但未开启，不保证完成或生产可行。

## Why a second measurement is necessary

The separate paging experiment completed one k20 slot **key build**. The
subsequent v8 build verified all eleven real key pairs. Neither measures
runtime transaction proving. The fresh real allocation/governance run passes
17 post-deployment transactions on Local Dev, but uses the original uncapped
prover and does not execute participant-slot changes. Its exact evidence is
`v8-allocation-verification.json`; no slot/ordinary-action success follows from it.

## Exact runtime isolation and limits

`scripts/run-m6-capped-live.mjs --run --slot-state` creates only a temporary
`permio-m6-bounded-proof` container at **127.0.0.1:6301**, using the exact
existing weak-cache prover image:
`sha256:82f867abc556806f3742fb165b9cba8c898045a71e99bba8a8b33b37237bb1c9`.
It does not restart or modify the original prover at 6300, node, indexer,
Postgres or Hasura. Node 1.0.0/indexer 4.3.3, Compact 0.31.1, runtime 0.16.0,
ledger library 8.1.0 and all v8 circuit/key fingerprints remain unchanged.
The earlier 8.0.2 manual label was stale: the committed baseline lock,
current lock, protocol package declaration and resolved installed library
all specify 8.1.0. This audit corrects the report, not dependencies. Indexer
network protocol 1000000 is a separate version namespace.

Baseline joint profile: **4 GiB prover hard RAM, four CPU quota, one proving
job; client 0.75 GiB memory.high / 1 GiB hard RAM, one CPU**, two-hour
whole-workflow guard. The combined client/prover hard RAM ceiling is 5 GiB.
The explicit `--serial-prover` option instead sets one CPU quota and
`RAYON_NUM_THREADS=1`; the default remains four Rayon workers. The latest
controller also explicitly sets the server pool to one worker for serial,
two for default, with job capacity one and job lifetime 600 seconds. Earlier
trials did not capture/set the server-pool worker count; the pinned source
default two is not retroactively presented as an actual measurement. Only
those two profiles are allowed. Docker CPU and exact worker/job settings are
verified before the wallet starts. RAM, shared swap, protocol/workflow deadlines, safety
reserves, circuit/key/parameter hashes and acceptance criteria do not change.
The bounded local HTTP proof request wait is now 600000 ms, instead of the
SDK default 300000 ms retained for the original endpoint. This changes only
transport waiting, not circuit/credential validity windows or the two-hour
workflow guard. Five-minute request failure is only a hypothesis for the
earlier unclassified serial capture, not an established cause. Fewer workers might reduce temporary parallel working storage; this is a
measurement hypothesis, not a guaranteed low-memory algorithm.
The prover has an 8 GiB swap ceiling and client 4 GiB, but they **share the
same 8 GiB total host swap** with existing services, not 12 GiB reserved swap.
The runner checks actual Docker and cgroup limits before constructing a
wallet. Prover `memory.high` is `max` here;
this is not the key experiment's 5 GiB soft/6 GiB hard profile. Hard RAM limits
bound the container's charged memory, not all memory of the workstation or
the node/indexer, original idle prover or the whole workstation. Paging is
disk-backed memory and can be slow. The client runs in an exclusive transient
systemd unit; both its wrapper and controller verify actual leaf and ancestor
limits before wallet/SDK imports. V8's virtual old-space limit is explicitly
3072 MiB so automatic heap sizing does not confuse the 1 GiB physical cap
with a total virtual-memory budget. This is not a 3 GiB physical RAM grant.

The original public cache is mounted read-only. Only the missing existing
k20 public parameters are copied with exclusive creation after exact SHA-256
verification; no wallet, witness, signing secret, foreign parameter set or
experiment source is copied. The SDK's explicit boolean selector changes
only the local prover port, not network, ledger or indexer URLs. It cannot
accept arbitrary remote witness endpoints.

Only `/var/tmp/permio-m6-capped-live/paging.swap` is created, root-owned mode
0600 on native ext4, adding 6 GiB temporarily to the original 2 GiB. An
exclusive lock refuses another owner. Startup requires at least 4.25 GiB
available RAM and 6 GiB available-RAM-plus-existing-free-swap. This is a
monitored experiment, not an up-front memory reservation. Every two seconds
the controller checks shared VM counters and its exact owned container.
It stops at 384 MiB available RAM, below 512 MiB free swap independently of
available RAM, OOM, service exit,
interruption or timeout. No global swappiness, WSL memory size, original
container limit or acceptance condition is changed.

Cleanup verifies its exact client unit/cgroup/working directory and container
ID/name/ownership label before stopping both; no volumes are deleted. It disables/unlinks only its own
swap when safe, preserving original swap. Unsafe cleanup retains resources
and reports them rather than unlinking active swap. Positive chain mutations
already accepted are not rolled back by local cleanup.

## Actual first trials, not slot acceptance

1. `logs/m6-capped-live-hORdQj/report.json`: stopped at initial preflight
   before swap/container/wallet/transactions. The initial implementation
   unnecessarily required 6 GiB free physical RAM despite intending paging.
   A read-only diagnosis found 5,010,060 KiB available RAM and 2,091,852 KiB
   free original swap. The guard was corrected to count paging headroom;
   pure tests reject insufficient/malformed counters and preserve emergency
   stops. No proof or node failure occurred in this first preflight.
2. `logs/m6-capped-live-SrWwnd/report.json`: the actual 5 GiB hard RAM / 8 GiB
   swap profile was applied and checked. Fresh contract deployment plus
   module proposal and two reviews were accepted. At elapsed 349.931 seconds,
   shared available RAM reached 367,516 KiB, below the unchanged 384 MiB
   reserve; the controller stopped the client during module approval.
   No slot transaction had started. There was no OOM kill. At 365.585 seconds
   cleanup finished: owned container removed and swap disabled/unlinked.
   The original prover remained running on the same image. The 141 controller
   samples and partial public log remain evidence, **not a passed workflow**.
   The next trial lowers the prover cap to 3.5 GiB; the shared-machine stop
   is not disabled or reduced.
3. `logs/m6-capped-live-5okj7T/report.json`: actual 3.5 GiB prover cap and
   shared 8 GiB swap. Fresh deployment and eleven post-deployment transactions
   pass, including module/template activation and allocation. Real paging is
   observed (maximum sampled prover swap.current 2142744576 bytes), no OOM.
   At elapsed 881.893 seconds, 355248 KiB available RAM triggers the unchanged
   reserve during account issuance; cleanup finishes at 896.520 seconds.
   The owned service and swap are removed. A later public-only read confirms
   instance/credential sequences and credential/slot nonces all remain zero;
   absence of a log marker alone is not used to infer that result.
   This trial caps the prover but leaves the WSL test client uncapped.

The next profile therefore accounts for the client as well. Four pure-policy
tests cover startup/stop guards, the combined RAM ceiling, actual client and
ancestor limits and V8 virtual-heap distinction. The controller samples only
owned-client numeric counters, not its arguments, environment or witnesses.
The full root suite passes 279 tests (including six actual Hardhat contract
tests). The first joint run `logs/m6-capped-live-SiMfgB` uses a 2.75 GiB
prover plus 1 GiB client. It accepts activation/allocation but the prover is
OOM-killed during account issuance at elapsed 875.783 seconds. Maximum sampled
prover swap.current is 7306457088 bytes; reported client memory/swap peaks are
805830656/876896256 bytes. The last pre-kill samples show 79732 KiB free host
swap despite about 1.4 GiB available RAM, so the old guard requiring both low
RAM and low swap did not trigger. A later independent public read confirms
instance/credential sequences and credential/slot nonces zero. Both owned
processes are stopped and temporary swap is removed; original 2 GiB remains.
This is a real capped-prover OOM, unlike the earlier proactive stops;
last successful sampled OOM counters do not negate Docker's final OOMKilled.

The next run `logs/m6-capped-live-Dtx3GU` uses the 5 GiB combined profile and
the stricter independent swap guard. It accepts a real account issuance in
275.862 seconds call-start-to-indexed-acceptance, with no OOM or guard stop.
An independent public-only observation confirms instance/status sequence 1
and one credential nonce. The first slot begin then fails in 9.259 seconds
with a redacted unknown category; no slot change is accepted. Source inspection
finds that the reused slot key pair lacked the SDK-required `.bzkir`, although
the exact text ZKIR and both real keys were present. The ten newly built
entries had their binaries. This is an asset-inventory integration defect,
not evidence that the prescribed architecture or memory experiment failed.
The original captured error is not retrospectively assigned an HTTP status.

The exact successful experiment's compiler-produced slot binary is restored
(83923 bytes, SHA-256 9a5eb57ca747c0fd6f5abc56152168264f839ddbab15ba04467ccb54fac032e0).
Both builders and the strict wallet-startup guard now require manifest v2,
binding every entry's binary size/hash as well as existing key/program/binding
fingerprints. The old manifest is backed up; no mock keys/proofs or new crypto
are used. An interrupted diagnostic replay is separately recovered by exact
owned-resource checks, without restarting shared services or deleting volumes.

Corrected run `logs/m6-capped-live-q17jdT` passes deployment and eleven
post-deployment transactions through allocation, then stops during account
issuance at the independent swap reserve: 519652 KiB free, below 524288 KiB,
elapsed 960.214 seconds. No OOM occurs. Independent observation at
2026-10-14T19:26:58.525Z confirms instance/status sequence and credential/slot
nonces zero; the slot call was never reached. Cleanup completes at 976.888
seconds, removing the owned client/container/swap and preserving original
2 GiB swap and prover. The earlier successful account call is not generalized
into a reliably passing whole-workflow claim; shared background storage and
per-run variation remain uncharacterized. Four hundred controller and 154
prover samples are recorded, with no prover-sampling error. Individual peaks
are not necessarily simultaneous or isolated proof costs.

The subsequent `logs/m6-capped-live-8QHrol` trial explicitly chooses one
Rayon worker/CPU and the then-default five-minute HTTP wait. Deployment and
eleven post-deployment transactions through allocation pass. Account issuance
fails with the original redacted unknown category after 319.192 seconds; no
OOM or safety stop occurs. Controller/prover samples total 623/253; minimum
available RAM/free swap are 602308/1217052 KiB. Cleanup finishes at 1495.504
seconds, preserving original services/swap. An independent observation at
19:55:14.072Z confirms instance/status/credential-nonce/slot-nonce zero and
no staging. These are incomplete-call timings, not successful proof latency.

The subsequent `logs/m6-capped-live-ld9p0T` trial uses the explicit single server/
Rayon worker and ten-minute bounded local request wait, with the same physical
RAM/swap caps. A transparent proof-provider observer records only fixed job
numbers, monotonic elapsed time, configured request budget and fixed failure
categories. It does not inspect or serialize private transaction arguments,
does not log results/error text, and passes original proofs/errors through.
Its timing includes transaction proof/check/prove HTTP work, not isolated
cryptographic computation, wallet/submission/finality or ordinary-user latency.
Wrapped native timeouts and at most four cause links are classified safely;
cycles/accessors/proxies stay redacted. The original serial failure remains
unclassified in its historical capture. This later trial also stops, but for
an explicit resource reason: at 20:23:48.102Z free swap is 425300 KiB, below
524288 KiB. Eleven post-deployment transactions through allocation pass;
account proof-provider job13 is interrupted after 363.413 seconds to the last
safety sample, with no accepted account or slot call and no observed OOM.
This is not a captured HTTP timeout or a protocol/architecture rejection.
Cleanup finishes at 1478.771 seconds, original2GiB/prover preserved. Independent
public-only observation20:28:34.171Z confirms instance/status/nonces zero and
no staging. A later6301 readiness connection refusal occurs after the owned
prover was removed; it is not evidence that Docker crashed.

Captured samples are624 controller/249 prover, no captured sampling-failure
events, but no final sampling-completion event after forced interruption.
Configured combined RAM remains5GiB; reported prover peak4295135232 bytes and
sampled swap maximum5601128448, client RAM/swap peaks806072320/731258880.
Peaks need not coincide and kernel accounting can briefly exceed configured
memory by pages. The earlier successful account call is still valid evidence,
but the complete5GiB-RAM/shared8GiB-swap workflow is not reliably qualified.

The next proposed qualification keeps physical RAM capped at5GiB and allows
16GiB total shared swap (14GiB owned temporary plus original2GiB), only after
resource-budget approval. It is not implemented or running and is deferred
while removing avoidable idle-service overhead first. Read-only actual
host free space is57,623,773,184 bytes onC and322,635,673,600 onD; WSL's much
larger virtual filesystem availability is not physical host free space. A
larger paging budget does not guarantee completion or establish a production
minimum. No hash, trust, ancestry, witness location or architecture changes
are proposed. Ordinary-action and receipt implementation remain open as well.

Before increasing storage, a read-only audit at20:31:43.518Z finds the unused
original prover still retaining911816KiB RSS and939212KiB process swap,
with zero processing/pending jobs. Under the user's prior permission to stop
unused containers, only this exact stateless M6 prover is stopped and started
again after image/ID/idle checks. At20:33:58.655Z it is ready on the same
container/image/configuration: RSS9972KiB, swap0, cgroup RAM13533184bytes and
swap0. Node/indexer/databases/volumes are not restarted or changed. This
releases avoidable shared overhead; it does not prove that all prior pressure
had that cause or set a production minimum. The original service remains
running, with a cold in-memory parameter cache and its public disk cache intact.
A fresh normal four-CPU/Rayon run now retries the same5GiB combined RAM and
8GiB shared-swap budget; no larger swap profile is enabled. Its result is pending.
The complete root check passed 288 cases after node-replay diagnostics; the
latest observer/deadline recheck passes 293, zero failures/skips, including
six actual local Hardhat tests. Midnight152312.1201 ms/Hardhat4197 ms are
regression durations, not proof timings. This does not expand RAM or host swap.
A passing workflow must also include
actual slot ledger mutations, current-state/sequence and nonce checks,
reconnect, final governance checks and an independent public-state read.
Partial deployment, key readiness or SDK preflight rejection is insufficient.

## Meaning for delivery

No ordinary-action circuit or common DecisionReceipt has been added by this
operational wrapper. Slot assignment is administrative/instance management,
not a representative ordinary customer action. Neither this test nor finite
key-build time establishes browser/mobile proof feasibility, a production
RAM requirement, P95, throughput, SLA or permission to host private witnesses.
Consumer and enterprise delivery options remain conditional on their actual
privacy and action-proof measurements in `product-delivery-feasibility.md`.

## 中文译文

这是 2026-10-15 的运行配置测试，不是 M6 验收或新信任模型。独立实验完成的是一组
k20 密钥构建，当前 v8 十一组真实密钥已核验；都不是运行时证明测量。原无限制证明器
已通过新部署后 17 笔治理／分配交易，但没有槽位变更，不能推出槽位或普通动作通过。

工具只新建 localhost:6301 临时证明器，使用同一精确弱缓存镜像，不改或重启原证明器、
节点、索引器、Postgres、Hasura、固定工具链、电路或密钥。基准联合配置为证明器 RAM
硬上限 4 GiB／四 CPU／单任务，客户端软 0.75 GiB／硬 1 GiB／单 CPU，合计
硬 RAM 5 GiB；全流程两小时。证明器 swap ceiling 8 GiB、客户端 4 GiB，但共享
原 8 GiB 主机 swap，不是独立预留 12 GiB。
显式 --serial-prover 改为单 CPU／RAYON_NUM_THREADS=1，默认仍四Rayon线程；
最新controller还显式配置串行server pool1／默认2、任务容量1、任务存续600秒。
旧测试未显式配置／捕获pool线程数，不将源码默认2冒充实测。只允许这两种配置，
钱包前核验实际 CPU、工作线程及任务容量。RAM、swap、协议／全流程期限、
保护、电路／密钥／参数指纹和验收标准不变。减少临时并行存储只是假设，须实测，
不是保证有效的低内存算法。
受限本地HTTP等待现600000ms，原端点仍SDK默认300000ms；只改传输等待，不延长
电路／凭证有效窗口或全流程两小时保护。旧串行脱敏异常是五分钟HTTP期限的假设，
不是已证实原因。
先核验实际 Docker/cgroup 限制，再建
钱包；证明器 memory.high 为 max，不是密钥实验软 5 GiB／硬 6 GiB 配置。范围不含
节点／索引器／原空闲证明器或整机。客户端以自有 transient systemd unit 运行，
worker 和控制器均检查实际限制及上级；显式 V8 old-space 3072 MiB 是虚拟堆预算，
避免把物理 1 GiB 当作全部虚拟内存，不授予 3 GiB 物理 RAM。换页可能很慢。
版本核查纠正旧人工 8.0.2 标签：提交基线及当前锁文件、SDK协议包声明和实际解析的
账本库都是8.1.0，本轮只改报告，不改依赖。索引器网络协议1000000是不同版本空间。
只读挂载原公开缓存，只按精确哈希独占复制缺失 k20 参数；
不复制秘密、witness、其他参数集或实验源码。SDK 显式布尔开关只改本地证明器端口，
不接受任意远端 witness 地址或替代网络。

只在固定 ext4 路径独占创建 root/0600 的临时 6 GiB swap，保留原 2 GiB 和所有共享
服务。启动至少 4.25 GiB 可用 RAM，RAM 加原空闲 swap 至少 6 GiB；不是内存预留，
每两秒检查，384 MiB RAM 保留阈值，或独立于 RAM 的空闲 swap 低于 512 MiB，
以及 OOM、退出、中断或超时均停止。
不改全局 swappiness／WSL 大小／原容器限制或验收条件。核验并停止自有客户端单元及容器，
不删卷；安全时停用删除自有 swap，不安全则保留并报告；已上链交易不会因此回滚。

首次 hORdQj 在任何 swap／容器／钱包／交易前失败，原因是错误要求 6 GiB 空闲物理
内存；只读实测 RAM 5010060 KiB、空闲 swap 2091852 KiB 后修正预算检查并加负例，
不是证明／节点失败。实际 5 GiB 配置 SrWwnd 完成部署、提案和两次审查，在模块批准
期间 349.931 秒、共享可用 RAM 367516 KiB 时触发 384 MiB 保护，尚无槽位交易；
无 OOM，365.585 秒完成清理，自有容器及临时 swap 删除、原证明器仍运行。141 采样
及部分公开日志保留，不冒充成功。实际第二次 3.5 GiB 配置 5okj7T 通过部署及之后
11 笔交易，含模块／模板激活和分配，证明器 swap current 采样最大 2142744576 bytes，
无 OOM，但账户签发时 881.893 秒、共享 RAM 355248 KiB 再触保护，896.520 秒
完成清理。随后不用钱包的独立读取确认实例／凭证序号及凭证／槽位 nonce 都是零，
不单凭缺少日志推断。该配置没有限制客户端，因此下一项联合预算一并控制；四项纯策略
测试覆盖启动／停止、合计上限、客户端及上级实际限制、V8 堆区别，采样只读自有进程
计数，不读参数／环境或 witness。完整 279 项通过（含六项真实 Hardhat），实际
SiMfgB 为证明器 2.75／客户端 1 GiB，通过激活／分配，但账户签发时证明器确实
OOM；最后采样约 1.4 GiB 可用 RAM、空闲 swap 仅 79732 KiB，旧条件要求两者
同时低才停止，因而没有触发。证明器 swap current 最大采样 7306457088 bytes，
客户端报告内存／swap 峰值 805830656／876896256 bytes。独立公开读取仍为实例／
凭证序号及两 nonce 零，双方停止且临时 swap 已删、原 2 GiB 保留。不能用最后一次
成功采样的 OOM 零推翻容器最终 OOMKilled。Dtx3GU 使用合计 5 GiB 和独立
swap 保护，账户签发端到端 275.862 秒真实通过，无 OOM／保护停止；独立读取确认
实例／状态序号 1、凭证 nonce1。但首个槽位 begin 在 9.259 秒未知分类失败，
未接受槽位变更。源码定位复用槽位有精确文本／真实密钥，却缺 SDK 读取的 .bzkir，
另外十个新入口都有；这是本次资产清单集成缺陷，不是架构或实验失败。原脱敏错误
不事后指定 HTTP 状态。恢复成功实验同文本生成的公开 binary（83923 bytes，哈希
如英文），两个 builder 及钱包前 guard 现要求 v2 清单，绑定各入口二进制长度／哈希，
原密钥／程序／绑定不变，旧清单备份，不 mock。中断的诊断重跑另经精确自有资源
检查完成恢复，不重启共享服务／删卷。

修正后的 q17jdT 部署及后续十一笔交易到分配通过，但账户签发期间 960.214 秒触及
独立 swap 保护：空闲 519652 KiB，低于 524288，无 OOM。UTC19:26:58.525 独立
观察确认实例／状态序号、凭证／槽位 nonce 全零；从未到槽位调用。976.888 秒完成
自有客户端／容器／swap 清理，保留原 2 GiB 及证明器。不能把上次签发成功推广为
整流程稳定通过；共享后台存储和运行间差异尚未量化。400 控制器／154 证明器采样，
证明器采样无错误；各峰不一定同时，不是单证明成本。8QHrol 单Rayon／CPU、当时
五分钟HTTP等待通过部署及后续十一笔分配前交易，账户签发319.192秒后未知分类失败，
无OOM／保护。623／253采样，最低RAM／swap602308／1217052KiB；1495.504秒完成
清理保留原服务／swap，19:55:14.072Z独立观察确认实例／状态／两nonce全零、无暂存。
未完成调用时间不是成功证明延迟。新ld9p0T显式server／Rayon各1、HTTP等待十分钟，
物理RAM／swap预算不变。透明proof-provider观察器只记录固定任务号、单调时间、
配置预算及固定分类，不检查／序列化私有参数，不记证明结果或错误原文，原样传递证明／
错误。计时含交易proof/check/proveHTTP，不是纯密码运算、钱包／提交／最终性或普通
用户耗时。安全识别wrapped Timeout及最多四层cause，循环／accessor／proxy脱敏。
旧异常仍未知。ld9p0T也停止，但明确为资源保护：20:23:48.102Z空闲swap425300KiB
低于524288。部署后十一笔到分配通过，账户proof job13至最后安全采样363.413秒被中断，
账户／槽位未接受，无观察到的OOM；不是已捕获HTTP超时或协议／架构拒绝。1478.771秒
完成清理，原2GiB／证明器保留，20:28:34.171独立观察序号／状态／nonce零、无暂存。
之后6301拒绝连接是自有证明器已移除，不是Docker崩溃。624／249采样无捕获采样失败，
但强制中断没有最终完成事件。仍RAM合计5GiB，证明器peak4295135232／swap采样最大
5601128448、客户端RAM／swap峰806072320／731258880bytes，峰不一定同时、内核
计费可短暂超cap若干页。保留旧账户成功证据，但RAM5GiB＋共享swap8GiB整流程没有
稳定通过。下一项仅提议保持RAM5GiB、总共享swap16GiB（自有临时14＋原2），待资源
预算批准，尚未实施／运行。只读真实主机C空闲57623773184／D322635673600bytes，
WSL虚拟文件系统更大可用量不等于主机物理磁盘空闲。更大换页不保证完成／生产最低
配置，不提议改变哈希、信任、祖先、witness位置或架构。普通动作／收据实现也未完成。
较大预算暂缓，先去除闲置开销：20:31:43.518只读发现原闲置证明器仍RSS911816KiB／
swap939212KiB、运行／排队任务0。按用户此前可停不用容器的授权，核验精确image／ID／
闲置后仅重启该无状态M6证明器，20:33:58.655相同容器／镜像／配置ready，RSS9972KiB、
swap0、cgroup RAM13533184bytes／swap0。节点／索引器／数据库／卷不重启或改动。
释放可避免开销，不说过去所有压力由此引起、不作生产最低配置结论；原服务仍运行，
内存参数缓存变冷、公开磁盘缓存保留。新的常规四CPU／Rayon重试仍RAM合计5GiB、
总共享swap8GiB，未启用更大预算，结果待定。
node-replay后完整288通过，最新观察／期限
完整293全通过、无失败／跳过，含六项真实Hardhat；Midnight152312.1201／Hardhat4197ms
为回归耗时，不是证明，不扩大RAM／总swap。
未扩大 RAM 或总 swap。成功还需实际槽位变更、状态／序号／nonce、重连、
最终治理和独立公开状态检查；仅部署、密钥或 preflight 均不够。

该工具不实现普通动作或通用 DecisionReceipt。槽位分配是实例管理，不能代表普通客户
操作；不据此宣称浏览器／手机、生产最低内存、P95／吞吐／SLA 或托管私有 witness
已获批准。C/B 方案仍以专门可行性文档的真实隐私及动作证明测量为前提。
