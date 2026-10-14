# Permio consumer and enterprise delivery feasibility

Initial assessment: 2026-10-13; measured continuation: 2026-10-14. M6 remains
incomplete. The existing implementation
has proved and submitted real governance and credential transactions; it has
not yet proved a normal customer action or established production capacity.
Website and enterprise integration remain the delivery directions. The next
performance workload is a customer submitting one support request, not a
governance approval presented as a customer click.

This assessment concerns proof/transaction execution time, memory and CPU
requirements, and production capacity, not the time needed to develop M6.
It separates observed results, future delivery plans, and conditional runtime
and hardware estimates. It does not change the architecture,
deterministic milestone definitions, privacy boundary, or acceptance gates.

## Latest measured continuation — 2026-10-14

### v5 authenticated-policy allocation — current bounded slice

The new initial-state guard was proved and finalized on the unchanged local
stack: a fresh ten-circuit deployment plus 17 governance/allocation transactions,
all successful. Allocation grew to `k=17`, 97,862 rows from `k=16`, 52,704.
The activation-event-to-allocation/indexed-verification interval was **49.008
seconds**, including SDK preparation, preflight negatives, proving, submission
and indexing. This is one warm local allocation sample, not isolated proof
latency, an ordinary customer action, P95 or a production SLA.

The complete run's 210 samples observed proof-service RSS up to 4,074,788 KiB
(3.89 GiB), swap up to 35,228 KiB, and a simultaneous RSS-plus-swap maximum of
4,092,240 KiB (3.90 GiB), with zero sampling errors and zero new OOM/OOM-kill
events. The service HWM already predates this run; it is not a new peak.
These samples combine governance and allocation, not an isolated allocation
memory requirement. The service retained its four-CPU quota and no RAM cap,
inside the approximately 7.65 GiB WSL environment. This does not establish
that a capped 6 GiB consumer prover or an ordinary runtime action will work.
The v4 credential setup measurements and unresolved ordinary-action proof
gate below remain applicable. Website/B-end delivery plans are unchanged.

v5 初始状态检查已在未修改环境中真实证明并上链，新部署及 17 笔治理／分配交易全部通过。分配电路由 k16／52,704 行增至 k17／97,862 行；模板激活至分配及索引核验为 49.008 秒，包含 SDK、预检查、证明、提交和索引，只是一次热环境分配样本，不是独立证明、普通客户动作、P95 或生产 SLA。210 次采样的整体证明服务 RSS 最高 3.89 GiB，swap 最高约 34.4 MiB，同时合计最高 3.90 GiB，无采样错误或新增 OOM；历史 HWM 未被当作新峰值。这混合治理与分配，未隔离分配最低内存；仍使用四 CPU、无容器 RAM 上限及约 7.65 GiB WSL，不能据此声称受限 6 GiB 消费端或普通动作可行。既有 v4 凭证配置测量、普通动作未完成条件及网站／B 端规划仍保留。

### Allocation follow-up, historical matching v3 build

The unchanged Local Dev node also accepted the ten-circuit v3 deployment and
one real private-instance allocation (`k=16`, 52,704 rows). Template activation
to the allocation/indexed-verification event was **30.039 seconds**; stack ready
to that event was 535.817 seconds, including shared module/template governance
and an intentional staging-expiry wait. The short interval includes SDK
preparation, negative preflight checks, proving, submission and indexing. It
is one allocation sample, **not** isolated proof latency, a normal customer
action, a throughput/P95 measurement or an interactive session-provisioning
result. No isolated allocation memory minimum or strict 6 GiB profile was measured.

未修改的本地节点已接受十电路 v3 部署及一笔真实私有实例分配，分配电路为 k=16、52,704 行。模板激活事件至分配及索引核验事件为 30.039 秒；基础设施就绪至该事件为 535.817 秒，含共享治理配置和刻意等待暂存过期。较短窗口也含 SDK 准备、负面预检查、证明、提交和索引，只是一次分配样本，不是独立证明时间、普通客户操作、吞吐量／P95 或交互式会话配置结果；未测分配专属最低内存或严格 6 GiB 配置。

The credential dispatcher keeps the same source logic and row count, but the
new contract build changes its exact program/key hashes. The preceding
21-transaction credential/session trace remains **v2** evidence and must be
rerun on the final matching verifier. The two website/enterprise delivery
directions and their witness-trust boundaries are unchanged. Allocation
success does not resolve the outstanding full runtime-action proof or justify
new production-capacity claims. See `allocation-verification.json` for the
exact allocation transaction and partial verification boundary.

凭证入口的逻辑及行数未变，但新合约构建改变了精确程序／密钥哈希。此前 21 笔凭证／会话轨迹仍属于 v2，必须在最终匹配验证器上重跑。网站及企业集成两条交付方向和 witness 信任边界保持不变；分配成功不代表完整动作证明已解决，也不能据此增加生产容量承诺。精确分配交易和部分验收边界见 allocation-verification.json。

### Preceding v2 credential/session recovery measurement

The approved clean WSL/Docker recovery cleared a lingering OOM-related
`init.scope` stop state. The unchanged session-capable `k=19`, 484,064-row
dispatcher then generated all nine real key pairs: 627.2 seconds by the
monitor's elapsed timer, maximum observed compiler HWM 4.86 GiB and no new
OOM. Wall-clock timestamps span 660.372 seconds, so retain that clock caveat.
This particular repeated interruption was not proof that the machine needed
more RAM. The earlier different `k=20` membership diagnostic was not rerun
and is not retrospectively declared successful.

完整恢复 WSL／Docker 清除了残留的 OOM 相关停止状态。未改变的会话认证电路成功生成九组真实密钥，监测器计时 627.2 秒，已观察编译器高水位约 4.86 GiB，没有新增 OOM；墙钟时间戳跨度为 660.372 秒，保留时钟差异。本次反复中断并不证明必须增加内存；更早的另一项 k=20 成员证明诊断没有重跑，不能追认为成功。

The real Local Dev credential workflow then passed **21 runtime transactions**
plus deployment: account issuance, eight root-capability values and finalization,
seven session values and finalization, session revocation, indexed-root checks
and reconnect. Asset verification to final verification took 3,714.819 seconds
(61m55s). The adjacent event window covering all nine session-provisioning
transactions was 1,607.164 seconds (26m47s). Consecutive accepted-runtime-
transaction intervals were 150.141–197.531 seconds, mean 174.959 seconds.
These windows include orchestration, proving, submission and indexing, not
isolated proof generation and not an ordinary customer action.

真实本地链凭证流程随后通过全部 21 笔运行时交易及部署，包括完整 capability／会话分阶段认证、激活、撤销、索引根检查和重新连接。资产校验至最终验证共约 61 分 55 秒；覆盖会话九笔配置交易的相邻事件窗口约 26 分 47 秒；连续接受交易的间隔为 150.141–197.531 秒，平均 174.959 秒。这些是含编排、证明、提交和索引等待的端到端窗口，不是独立证明耗时，也不是普通客户操作证明。

Configuration was the existing **locally patched** 8.1.0 weak-cache proof
service, four allocated CPUs, one job slot, shared 7.65 GiB WSL memory and
2 GiB swap. Kernel-recorded service-lifetime process HWM was 7,211,336 KiB
(6.88 GiB); cgroup memory peak was 7,436,992,512 bytes (6.93 GiB), and swap
peak 1,477,718,016 bytes (1.38 GiB), with zero OOM events. These peaks need
not be simultaneous. Neither a strict 6 GiB RSS cap nor a no-swap profile
was tested. This is also not a stock-upstream proof-server result or a
demonstrated minimum hardware specification.

配置为原有本地修改的 8.1.0 弱缓存证明服务、四 CPU 配额、一个任务槽、共享约 7.65 GiB WSL 内存及 2 GiB 交换空间。服务生命周期内，内核记录的进程内存高水位为约 6.88 GiB，容器组内存峰值约 6.93 GiB，交换峰值约 1.38 GiB，OOM 为零；这些峰值不一定同时发生。未测试严格 6 GiB RSS 限制或禁用交换，也不是原版上游证明器的结果，不能当作最低硬件配置。

This establishes finite, repeatable-in-the-recorded-run execution of the
credential/session slice without upgrading hardware or weakening checks.
Its approximately 27-minute session setup is **not an interactive consumer
onboarding result**. Low-frequency enterprise-controlled background provisioning
remains a candidate, not an approved production service. Ordinary-action
circuits, atomic state/nullifiers, common receipts, required negative/restart
acceptance and sustained capacity still need completion and measurement.
The consumer and enterprise directions below remain plans with the same
private-witness trust boundaries. The later evidence supersedes historical
"current" measurements below; those older observations are retained, not
combined into one uninterrupted broader acceptance run. See
[clean restart and real session evidence](clean-restart-verification.json).

这些结果证明，当前凭证／会话切片在本次记录的连续运行中可以有限时间执行，无需升级硬件或削弱检查。但约 27 分钟的会话配置不能当作交互式 C 端开通已就绪。企业自行控制的低频后台配置仍只是候选方向，不是已批准的生产服务；普通操作、原子状态／nullifier、通用收据、负面／重启验收及持续容量仍待实现和测量。后文两个交付方向及私密见证信任边界不变；历史测量保留，但不与本轮拼接为更广范围的一次性通过结果。

## Customer delivery statement

The implemented Midnight governance and credential proofs are computationally
feasible: actual proofs have been accepted by the local chain on a four-CPU
prover profile. Observed completed operations take roughly 30 to 265 seconds,
including proving and chain confirmation. In particular, the tested credential
transaction's proof work completed within its 264.647-second end-to-end window;
it is not an indefinitely running proof. The observed prover peak is about
6.42 GiB. Multi-transaction capability provisioning currently takes about
23 to 25 minutes in the recorded staged run. These results establish practical
execution of the implemented circuits, not every remaining M6 requirement.

For preliminary planning of similarly sized server-side proof transactions,
allow approximately 0.5 to 5 minutes per completed operation on the measured
four-CPU profile, rather than assuming real-time responses. This is an
order-of-magnitude planning envelope derived from existing operations, not a
measured ordinary-customer proof time, percentile guarantee or upper bound
for a larger circuit. A single-job worker with 4 to 8 allocated CPU cores and
16 GiB RAM is a reasonable next evaluation configuration. It provides a
memory-headroom hypothesis, not a demonstrated speedup or a solution to
unfinished circuit logic.

The current product is a technically demonstrated prototype, not yet a
production-ready authorization service. A customer-controlled enterprise
deployment is a credible production direction after the missing runtime
authorization and receipt are completed, security/revocation/replay behavior
passes the required chain tests, and sustained capacity is measured. At the
current measured costs, low-frequency asynchronous administration is a more
plausible initial workload than high-volume onboarding or interactive consumer
authorization. This assessment does not authorize a production rollout today.

A consumer website remains a delivery goal, but its ordinary-action proof
still needs to meet explicit device, privacy and user-wait requirements. The
present 6.42 GiB peak and minute-scale infrastructure operations do not justify
claiming an ordinary mobile/browser experience is ready. Further circuit and
prover optimization may be necessary after the representative action is
implemented and measured. Production feasibility is therefore conditional,
not ruled out and not established merely by buying a larger server.

## What the present blockers establish

| Blocker | Established evidence | Consequence for production |
| --- | --- | --- |
| Retained prover memory and limited VM headroom | The stock mixed workflow was OOM-killed. Releasing cache ownership on the same machine reduced post-credential RSS by 95.5% and allowed the bounded mixed diagnostic to finish without restarting. | This part is demonstrably memory/resource-related. It supports pursuing better memory management and isolated workers, but does not establish full sustained stability or fix the single-proof peak. |
| Large circuit and proving-key generation | The earlier depth-16 probe passed source analysis but did not produce proving keys; a larger `k=20` dispatcher probe also failed its local key-generation gate. The approved optimized `k=19` dispatcher generated keys and produced accepted proofs. | This is a circuit/toolchain/resource feasibility boundary, not evidence of a proof requiring years. No successful larger-memory comparison establishes that hardware alone fixes the failed probes. Offline key generation must be distinguished from generating an individual user's proof. |
| Expensive successful operations | The current dispatcher has 517,658 arithmetic constraint rows. Actual accepted staging steps take roughly 2.3 to 2.6 minutes each and provisioning uses several transactions. | Less retained memory does not remove these costs. Low-frequency setup may tolerate them; broad interactive use may require additional optimization. |
| Unfinished ordinary-action authorization | Current-root ancestry/account checks, the two runtime families, atomic state/nullifier updates and the common receipt are not yet fully implemented. | Extra RAM cannot implement missing checks. There is no validated ordinary-action circuit cost from which to promise production latency. |

The remaining feasibility question is whether the complete required
ordinary-action authorization fits a practical circuit and deployment budget
while preserving all guarantees. If its compiled shape is comparable to the
tested proof class, the observed minute-scale envelope is a useful initial
risk assumption. If it is materially larger or needs additional proof
transactions, its cost must be reassessed rather than extrapolated as if the
existing measurements were a guarantee.

## Completed work and remaining proof work

| Work | What exists and what its evidence establishes | Remaining limitation |
| --- | --- | --- |
| M2 through M5 foundations | Validated exact template hashes, independent review and activation, bounded context accounts, capabilities, sessions and signed actions are implemented and tested. | M5 authorization runs off-chain; its returned decision is not a Midnight receipt. |
| Midnight module and template governance | Real local transactions have exercised threshold governance, staged exact-hash template admission, lifecycle changes, authority-root rotation and reconnect. Earlier complete governance regressions are recorded in the development log. | They establish governance behavior, not customer-action proving. The latest memory run stopped at module approval, without activation. |
| Runtime credential bindings and status | M5 bindings and separately profiled Schnorr signatures exist. The current nine-transaction-circuit build has generated keys and real indexed account issuance/revocation evidence. | Status membership does not alone prove action authorization or active ancestry. |
| Staged capability issuance | The real local chain accepted eight parent scope elements, seven delegated elements, and both finalizations. Existing evidence records exact transactions and status-root sequence 5 after account revocation. | The combined run later OOM-killed the stock prover during module approval. A sustained full run with the patched prover and the remaining negative cases are outstanding. |
| Current-root shared membership preparation | The off-chain multiproof builder has seven tests, including stale roots and altered paths. | The Compact action-time verifier must additionally enforce exact active leaves, certified ancestry and accounts. A membership path for a revoked leaf is still a valid membership path. |
| Prover retained-memory mitigation | An opt-in ledger 8.1.0 weak-cache build passed 36 upstream server tests, 58 crypto tests, and a real uninterrupted credential-to-governance diagnostic. | This is a local patched distribution, not an official production release, a reduced proof cost, or full M6 acceptance. |
| Representative user workload | Real M4/M5 APIs now drive a synthetic customer support request and a one-level delegated session. Seven M6 scope paths are prepared and checked with generated Compact pure functions. | ZK proof generation, chain state/nullifier changes, a common receipt, gateway delivery and execution are not implemented by this benchmark. |
| Remaining runtime proof families | `delegated-capability-action-v1` and `private-state-transition-v1` are fixed requirements. | Their action entry points, current-root verification, atomic state/nullifier logic, common receipt, live negative cases and restart acceptance remain to be completed. |

Historical successful phases are not combined into an uninterrupted passing
run. Existing partial evidence remains partial. Sources:
[architecture decisions](architecture-decision.md),
[development log](development-log.md),
[staged delegation evidence](delegation-prover-verification.json), and
[memory evidence](prover-memory-verification.json).

## Operations that currently take substantial time

The credential dispatcher has 517,658 arithmetic constraint rows in the
`k=19` proving class and a 169,945,774-byte public proving key. These are
cryptographic constraints, not database records. Even a simple selected branch
uses that consolidated circuit. The key is public proving material, not a
wallet signing key.

The patched diagnostic took 553.067 seconds for its bounded deployment and
credential/governance sequence. Its deployment-to-credential-indexed interval
was 264.647 seconds, compared with 185.975 seconds in the stock baseline.
Those intervals include preparation, proving, submission and indexing; they
are not isolated proof timings or estimates of every customer action.
An earlier parent capability begin-to-finalize interval was 1,080.015 seconds.
Staging is provisioning work across multiple transactions, not an ordinary
single-action request. These measurements come from the recorded workstation
and cannot predict faster hardware linearly.

The matching post-credential RSS fell from 4.45 GiB to approximately 203 MiB;
the final checkpoint was approximately 309 MiB. However, the observed prover
peak remained 6.42 GiB. Weak-cache release trades retained key memory for
possible re-decoding on later requests. Low idle memory therefore does not
imply low request memory, faster proofs, or high concurrency.

Key generation, multi-transaction provisioning, negative/restart verification
and sustained load tests cannot be collapsed into one instant check. Cached
public parameters and compatible local assets can be reused; current
authorization, revocation and proof checks cannot be skipped to save time.

## Future consumer website direction

The browser presents the selected action, recipient, purpose, expiry and
disclosure preview, obtains explicit confirmation, and shows authorization
separately from downstream execution. Reading a catalogue or opening a page
is not inherently a proof transaction. Chain-dependent effects must wait for
the required authorization; a progress indicator cannot replace it.

The privacy-preserving baseline is proof generation on a user-controlled
device or machine. A browser/wallet proving path is an evaluation target, not
currently verified for these circuits, mobile devices or the pinned SDK.
Consumers should not be assumed to install the whole development stack.

An optional hosted proving product would allow the selected operator to
process private witness inputs. HTTPS protects the connection, not against
that operator. This requires an explicit product/privacy decision and consent;
it is not silently equivalent to device-side privacy. Ordinary proving must
remain separate from authoring, review, activation, allocation, gateway
signing and emergency revocation authorities. The control plane still never
receives private witnesses.

Hardware-protected remote proving is a research option, not a committed
dependency. Midnight's [MPS 0004](https://github.com/midnightntwrk/midnight-improvement-proposals/blob/main/mps/mps-0004-trusted-proof-serving.md)
was `Proposed` when checked on 2026-10-13. Any candidate would need a verified
implementation, attestation, threat model, pinned compatibility and actual
Permio proof tests. Its illustrative standard-token benchmarks do not predict
our custom circuit costs.

## Future enterprise integration direction

Provide a versioned SDK/API and a customer-controlled proving deployment.
The enterprise may process only witnesses it is already authorized to access;
enterprise hosting does not automatically authorize access to an end user's
secrets. Permio's hosted control plane and gateway consume their prescribed
public artifacts, not private proving requests.

Credential issuance, delegation provisioning and governance can be queued as
background jobs with explicit progress and failure/retry states. A future
worker service needs bounded concurrency, tenant isolation, authenticated
transport, no private request logging, idempotent submission, health checks,
metrics and capacity limits. None of those controls grants a worker authority
to approve templates or bypass chain verification. Queueing improves delivery
behavior but does not reduce proof mathematics or total compute.

## Configuration and capacity estimates

These are starting configurations for evaluation, not measured minimums,
purchase recommendations, service guarantees or settings applied to this
workstation. No memory limit, toolchain version or infrastructure budget has
been changed by this assessment.

| Evaluation target | Planning configuration | Basis and qualification |
| --- | --- | --- |
| Isolated enterprise proving worker | 4 to 8 vCPU, 16 GiB RAM, one active proving job; initially retain four Rayon threads | Observed peak 6.42 GiB × 1.5 headroom ≈ 9.63 GiB, plus OS/runtime overhead. Target roughly 12 GiB available to that workload. Future larger circuits may exceed it. |
| Development host running node, indexer, wallet and prover together | 8 or more CPU cores and 32 GiB RAM for a new evaluation machine | Allows isolation and headroom over the existing 15.79 GiB host and 7.648 GiB shared VM. This is an engineering estimate, not a verified full-stack requirement. |
| Consumer desktop evaluation | Test an 8 GiB laptop as a constrained device and a 16 GiB laptop as a second tier | The current 6.42 GiB prover peak is not an acceptable general-browser budget. Ordinary-action proof memory must be measured independently. |
| Consumer mobile evaluation | No supported memory or timing specification yet | Test target browsers and wallet paths after a real normal-action proof exists. Do not infer mobile feasibility from a desktop Node process. |

Scale on measured worker occupancy, not registered users. If arrival rate is
`R` requests per minute and each logical request occupies a worker for `T`
seconds across all required proofs, a planning estimate at 70% utilization is
`workers = ceil(R × T / (60 × 0.7))`. It excludes failure reserves and burst
capacity. For an explicitly hypothetical 10-second request and 10 requests
per minute, this gives three workers. At a hypothetical 300 seconds it gives
72 workers. Neither service time is a measured customer proof; the examples
show why real action timings determine economic feasibility. Multiplying the
203 MiB idle checkpoint by user count would be invalid.

## Observed proof transaction runtimes

The available logs measure intervals between public milestone events after
completed operations. They do not isolate proof-server CPU time, queue wait,
key decoding, local preparation, wallet balancing or chain/indexer delay.
The following figures therefore describe observed operation latency, not
pure proof-generation latency. Pure `/prove` request times and normal customer
proof times remain unmeasured; neither can be replaced by a development
schedule or the client-only benchmark below.

Both recorded profiles use one proving worker, a four-CPU quota and four Rayon
threads. The host had 15.79 GiB physical memory and the shared Docker/WSL VM
7.648 GiB. The weak-cache and stock rows are separate runs and are not a
controlled speed comparison. Values are derived from existing public events
in [proof-runtime-assessment.json](proof-runtime-assessment.json).

| Operation | Observed elapsed time | Prover and scope |
| --- | --- | --- |
| Account credential operation | 264.647 seconds, about 4.4 minutes | Weak-cache diagnostic; previous deployment milestone to indexed credential milestone. |
| Module proposal | 29.165 seconds | Same weak-cache run; preceding credential milestone to completed proposal. |
| Individual module review | 35.400 and 36.123 seconds | Same weak-cache run; two successive reviews. |
| Individual module approval | 78.753 and 82.543 seconds | Same weak-cache run; last review to first approval, then completed negative preflight checks to second approval. |
| One parent scope staging element | 137.588 to 156.282 seconds, about 2.3 to 2.6 minutes | Eight consecutive steps in the earlier stock-prover run. |
| One delegated scope staging element | 142.790 to 156.118 seconds | Seven consecutive steps in that stock-prover run. |
| Parent capability provisioning | 1,488.209 seconds, about 24.8 minutes | Previous account milestone to begin, eight stages and finalization. |
| Delegated capability provisioning | 1,356.048 seconds, about 22.6 minutes | Previous delegate-account milestone to begin, seven stages and finalization. |
| Normal customer action ZK proof | Not measured | Actual action circuit and receipt are unfinished; the 218 to 323 ms client p95 is not a proof time. |

The stock run's capability phases succeeded, but its later combined governance
phase failed with OOM. Those timings do not establish a complete successful
workflow or a patched-prover staging result. The earlier 1,080.015-second
parent begin-to-finalize observation used a different run and narrower timing
boundary; it must not be substituted for the 1,488.209-second whole provisioning
interval above.

## Runtime feasibility under candidate configurations

For the currently measured heavy credential dispatcher, use minutes per
completed operation, not milliseconds, as the observed baseline on the
four-CPU profile. Provisioning a small staged capability can take tens of
minutes over several transactions. This may support low-frequency background
administration if the customer accepts that wait, but it does not establish
suitability for an interactive consumer operation or mass account onboarding.

For an isolated worker with 16 GiB RAM, the 6.42 GiB observed peak plus roughly
50% headroom leaves a plausible single-job evaluation budget. It is not a
measurement that future ordinary-action proofs fit in that memory. Two
simultaneous jobs at this peak would need approximately 19.3 GiB after the same
headroom allowance, before other service overhead; do not assume a 16 GiB
worker can safely run two. Peak memory is relevant to concurrency; the 203 MiB
post-request checkpoint is not the per-job budget.

Increasing CPU from four to eight cores has no measured speedup factor here.
More RAM may avoid swapping or OOM, but no observation demonstrates that a
16 GiB worker reduces a 265-second operation to seconds. The first configuration
comparison should keep the exact circuit/key hashes and operation constant,
measure isolated proof/check durations and total transaction latency on four
and eight allocated cores, and record peak memory without swapping. No such
configuration change is applied by this document.

A consumer website requires independent timings for its ordinary-action
proof, including worst permitted scope/delegation and the chosen device or
approved prover. Until those measurements exist, neither a subsecond claim
nor a numeric mobile hardware requirement is justified. AI remains responsible
for implementation; this assessment imposes no human development-day budget.

## Representative ordinary user workload

Use a synthetic customer support request: a customer has a context account,
receives permission for an order, opens a session narrowed to one order and
one support recipient, previews the request, signs a fresh intent and submits
it. Compare the direct customer session with a one-level delegated session.
The M5 state moves from `ready` to `submitted`; a replay is rejected. This
does not prove a purchase occurred or a support claim is true.

The executable benchmark uses actual M4/M5 implementations, including two
independent exact-hash reviews and activation outside the timed action. It
times intent signing, seven private scope-path preparations with generated
Compact root checks, and M5 authorization separately. Setup is measured
separately and remains entirely off-chain. Each sample uses a fresh fixture
so neither replay nor the state transition is bypassed for speed.

```powershell
npm run benchmark:m6:user -- --iterations 20
# Expected exit 2 until the real action circuit and receipt are integrated:
npm run benchmark:m6:user -- --require-chain
```

The 2026-10-13 native Node 24.13.1 run in the Windows filesystem sandbox
passed 20 serial samples per case,
10 denial vectors and 42 replay checks. Nearest-rank p95 means the time at or
below which 95% of these samples fell; 20 samples are descriptive, not a
production service-level agreement.

| Measured client phase | Customer session p50 / p95 | Delegated session p50 / p95 |
| --- | --- | --- |
| Intent signing | 0.254 / 0.525 ms | 0.193 / 0.258 ms |
| Seven scope paths and root checks | 270.964 / 322.120 ms | 193.515 / 217.383 ms |
| M5 authorization | 0.478 / 0.803 ms | 0.382 / 0.506 ms |
| Total timed client action | 272.001 / 323.315 ms | 194.089 / 218.273 ms |

Cases run in fixed order; their difference is not evidence that delegation
is faster. Node startup/module loading and fixture setup are excluded from
the action totals. The whole client process high-water RSS was 122,560 KiB,
including imports and fixtures; it is not prover memory or a mobile budget.
Proof generation, submission, indexed confirmation and prover peak remain
`null` in [ordinary-user-benchmark.json](ordinary-user-benchmark.json).
Required-chain mode exits 2 without submitting anything, rather than passing
on a governance transaction, fake receipt or M5 in-memory decision.

## Production feasibility conclusion and next measurement

A customer-controlled enterprise pilot is a plausible delivery route, but
current code is not production accepted. A general consumer website with
private proofs is not yet performance-qualified. The completed client checks
are useful groundwork; they cannot establish the dominant missing proof cost.

Implement and immediately chain-test the representative action within the
approved M6 architecture. Separate circuit execution/witness preparation,
proof/check requests, balancing, submission and indexed confirmation. Record
exact versions and hashes, cold and repeated runs, maximum delegation/scope
cases, CPU, peak/retained memory, queue delay, transaction count, and failure
recovery. Then evaluate target consumer devices and isolated enterprise
workers under repeated and concurrent requests. Run a 30-minute stability
diagnostic first and a longer 24-hour pilot soak before a capacity claim;
neither replaces the milestone's required functional and restart tests.

Set customer latency and workload requirements with the user before turning
them into delivery commitments. If normal actions still take minutes or
exceed target-device memory, report that concrete incompatibility and options
before changing trust boundaries, circuits or ledger versions. Do not claim
that a larger server, asynchronous UI or remote prover has resolved it.
Midnight's [local proving guide](https://docs.midnight.network/guides/local-proving)
confirms that a conventional prover receives private inputs; this remains a
privacy constraint in both delivery directions.

## 中文译文

评估日期：2026-10-13。M6 仍未完成。现有实现已经为真实治理和凭证交易生成证明并提交上链，但还没有为普通用户操作生成证明，也没有建立生产容量结论。网站和企业集成仍是交付方向。接下来的性能工作负载是一位用户提交一次客服请求，而不是把治理审批当作用户点击。

本评估关注证明及交易执行耗时、内存和 CPU 要求、生产容量，不评估开发 M6 的工期。文档区分实测结果、未来交付规划及有条件的运行耗时和硬件估算，不改变既定架构、确定性 milestone、隐私边界或验收门槛。

### 面向客户的交付说明

已实现的 Midnight 治理和凭证证明在计算上可行：真实证明已在四 CPU 证明器配置下被本地链接受。已完成操作的实测耗时约为 30 至 265 秒，包含证明和链上确认。特别是已测凭证交易的证明工作在 264.647 秒的全流程窗口内完成，不是一个无限运行的证明。证明器实测峰值约为 6.42 GiB。多交易能力配置在已记录分阶段运行中约需 23 至 25 分钟。这些结果说明已实现电路能实际执行，不代表 M6 剩余全部要求均已验证。

对规模相近的服务器侧证明交易，初步规划可在已测四 CPU 配置下按每次完成操作约 0.5 至 5 分钟考虑，不默认实时响应。这是由已有操作推导的数量级预算，不是普通用户证明的实测时间、百分位保证，也不是更大电路的时间上限。4 至 8 个分配 CPU 核、16 GiB RAM、同时一个任务，可作为下一步合理评估配置；它是内存余量假设，不代表已经测得加速，也不能补齐未完成的电路逻辑。

当前产品是已有技术实证的原型，还不是生产就绪的授权服务。企业自行控制的部署是可信的生产方向，但前提是补齐运行时授权和收据，让安全、撤销、重放行为通过规定链上测试，并测得持续容量。按当前成本，低频异步管理比高量开户或 C 端交互式授权更适合作为初始工作负载。本评估不授权现在直接投产。

C 端网站仍是交付目标，但普通操作证明尚需满足明确的设备、隐私及用户等待要求。现有 6.42 GiB 峰值和分钟级基础操作，不能支持“普通手机或浏览器体验已就绪”的承诺。代表性操作实现并测量后，可能还需继续优化电路和证明器。因此，生产可行性是有条件的，既未被否定，也不能靠购买更大服务器就认定已经成立。

### 当前阻碍能说明什么

| 阻碍 | 已有证据 | 对生产的意义 |
| --- | --- | --- |
| 证明器驻留内存及虚拟机余量不足 | 原版组合流程发生 OOM；同一机器修改缓存所有权后，凭证后 RSS 降低 95.5%，有界组合诊断无需重启即完成。 | 这部分明确与内存和资源有关，支持继续改善内存管理及隔离工作节点；但不代表完整持续稳定性或单次峰值已解决。 |
| 大电路及证明密钥生成 | 较早 depth-16 探针通过源码分析却没有生成证明密钥，较大的 k=20 分发探针也未通过本地密钥生成门槛；已批准优化的 k=19 分发电路则完成密钥生成并产生链接受的证明。 | 这是电路、工具链和资源可行性的边界，不是证明需要数年的证据。尚无更大内存下成功的对照，不能认定硬件单独就能解决失败探针。还要区分离线证明密钥生成与单个用户生成证明。 |
| 已成功操作仍昂贵 | 当前分发电路有 517,658 行算术约束，真实暂存步骤每次约 2.3 至 2.6 分钟，完整配置需要多笔交易。 | 驻留内存降低不会消除这些成本。低频配置或许可接受，广泛交互使用可能还需优化。 |
| 普通操作授权实现未完成 | 当前根祖先与账户检查、两个运行时家族、原子状态及 nullifier 更新、公共收据尚未全部实现。 | 加内存不能实现缺失的检查，也还没有经过验证的普通操作电路成本可用于承诺生产延迟。 |

剩余的可行性问题，是完整的普通操作授权能否在保留全部保证的同时，落在实用的电路和部署预算内。若编译规模与已测证明类别相近，分钟级区间可以作为初始风险假设；若明显更大或需更多证明交易，就必须重新评估，不能把现有实测当作保证直接外推。

### 已完成和未完成的证明工作

| 工作 | 已实现及证据所能说明的内容 | 剩余限制 |
| --- | --- | --- |
| M2 至 M5 基础 | 模板校验与精确哈希、独立审查和激活、有限上下文账户、能力、会话和签名操作均已实现并有测试。 | M5 授权是链下执行；返回的决定不是 Midnight 收据。 |
| Midnight 模块和模板治理 | 真实本地交易已经验证阈值治理、分阶段精确哈希模板登记、生命周期、权限根轮换和重连。开发日志记录了之前完整的治理回归。 | 证明的是治理行为，不是用户操作的证明性能。最新内存测试只到模块批准，没有激活。 |
| 运行时凭证绑定和状态 | M5 绑定和独立配置的 Schnorr 签名已实现。当前九个交易电路的构建已生成密钥，并有账户签发、撤销和索引状态的真实证据。 | 状态成员关系本身不能证明操作授权或有效祖先链。 |
| 分阶段能力签发 | 本地链接受了父能力八个范围元素、委托能力七个元素和两次最终确认；账户撤销后状态根序号为 5。 | 完整组合运行随后在模块审批阶段使原版证明器内存不足退出。修改后证明器的持续完整流程及其余负面用例还需验证。 |
| 当前状态根共享成员证明准备 | 链下 multiproof 构造器已有七项测试，包括过期根和路径篡改。 | Compact 操作时验证器还需检查精确的有效叶、经签发认证的祖先链及账户。被撤销叶的成员路径依然可以是合法成员路径。 |
| 证明器驻留内存缓解 | 可选 ledger 8.1.0 弱缓存构建通过了 36 项上游服务测试、58 项密码库测试和不中途重启的真实凭证至治理诊断。 | 这是本地修改发行版，不是官方生产版，也不代表证明成本降低或 M6 完整通过。 |
| 代表性用户工作负载 | 使用真实 M4/M5 API 驱动合成客服请求及一层有限委托会话，准备七个 M6 范围路径并用编译生成的 Compact 纯函数检查。 | 该基准没有实现零知识证明、链上状态及 nullifier 更新、公共收据、网关传输或执行。 |
| 剩余运行时证明家族 | `delegated-capability-action-v1` 和 `private-state-transition-v1` 是确定要求。 | 操作入口、当前根验证、原子状态及 nullifier 逻辑、公共收据、真实链负面用例及重启验收仍待完成。 |

不能把历史上分别通过的阶段拼成一次连续通过的运行。现有部分证据继续保持部分状态。依据为本目录的架构决策、开发日志、`delegation-prover-verification.json` 和 `prover-memory-verification.json`。

### 当前比较耗时的操作

凭证分发电路包含 517,658 行算术约束，属于 `k=19` 证明规模，公开证明密钥为 169,945,774 字节。这里的行是密码学约束，不是数据库数据。即使选择简单分支，也仍使用这个合并电路；公开证明密钥不是钱包签名私钥。

修改后的有界部署及凭证、治理诊断总计 553.067 秒；部署完成至凭证交易被索引的间隔为 264.647 秒，原版基线为 185.975 秒。它们包含准备、证明、提交和索引，不是独立的证明耗时，也不是每次用户操作的估计。较早的父能力开始至最终确认耗时 1,080.015 秒；这是多笔交易的配置流程，不是普通单次操作。不能按硬件配置线性推算这些实测值。

可比的凭证完成检查点 RSS 从 4.45 GiB 降至约 203 MiB，最终检查点约 309 MiB，但证明器峰值仍为 6.42 GiB。弱缓存释放内存的代价可能是后续请求重新解码密钥，因此低空闲内存不等于低请求内存、证明更快或高并发。

密钥生成、多交易配置、负面及重启验证、持续负载测试不能瞬间完成。可以复用公开参数缓存和兼容的本地资产，但不能为了省时间跳过当前授权、撤销和证明检查。

### 未来 C 端网站方向

浏览器展示操作、接收方、目的、有效期和披露预览，取得明确确认，并区分授权与后续执行。浏览目录或打开页面本身不一定需要证明交易；依赖链上授权的效果必须等待授权，不能用进度条代替。

保留隐私的基线是在用户控制的设备或机器上生成证明。浏览器或钱包证明路径是评估目标，还没有针对这些电路、移动设备或固定 SDK 验证。不能默认消费者需要安装整套开发环境。

可选托管证明产品会允许选定服务商处理私密见证。HTTPS 保护连接，不防止服务商看到输入；这需要明确的产品、隐私决策及同意，不能等同于设备端隐私。证明运行方与作者、审查者、激活者、分配者、网关签名方和紧急撤销方仍须隔离，控制平面仍不得接收私密见证。

硬件保护的远程证明是研究选项，不是已承诺依赖。2026-10-13 核对时，Midnight MPS 0004 仍为 Proposed。采用前需验证实现、远程证明、威胁模型、固定版本兼容及实际 Permio 证明；其中普通代币的示例基准不能推算我们自定义电路的成本。

### 未来 B 端集成方向

提供版本化 SDK/API 及企业客户自行控制的证明部署。企业只能处理本来有权接触的见证；企业托管不自动赋予其查看终端用户秘密的权利。Permio 托管控制平面和网关只处理规定的公开产物，不接收私密证明请求。

凭证签发、委托配置和治理可以采用有明确进度、失败及重试状态的后台队列。未来工作服务需要限制并发、租户隔离、传输认证、禁止私密请求日志、幂等提交、健康检查、指标及容量限制。这些运维能力不赋予审批权限，也不能绕过链上验证；排队改善交付流程，不降低证明计算量。

### 配置和容量估算

以下是评估起点，不是实测最低配置、购买建议、服务保证或已经应用的设置。本次没有修改内存限制、工具链或基础设施预算。

| 评估对象 | 规划配置 | 依据及限制 |
| --- | --- | --- |
| 独立企业证明工作节点 | 4 至 8 vCPU、16 GiB RAM、同时一个证明任务，初期保留四个 Rayon 线程。 | 峰值 6.42 GiB 乘 1.5 余量约为 9.63 GiB，再考虑系统开销，目标约 12 GiB 可用于该工作负载。更大的未来电路仍可能超出。 |
| 节点、索引器、钱包和证明器同机开发 | 新评估机器考虑至少 8 CPU 核、32 GiB RAM。 | 比当前 15.79 GiB 主机和 7.648 GiB 共享虚拟机留出隔离及余量；是工程估算，不是已验证全栈要求。 |
| C 端桌面评估 | 测试一台 8 GiB 受限笔记本和一台 16 GiB 笔记本。 | 当前 6.42 GiB 峰值不能当作普通浏览器合理预算，必须单独测量普通操作证明。 |
| C 端移动设备 | 暂无可声明的内存和时间规格。 | 真实普通操作证明完成后测试目标浏览器及钱包，不能从桌面 Node 推断手机可行性。 |

容量按工作节点占用时间计算，而不是注册用户数。若每分钟请求数为 R，每个逻辑请求全部证明占用工作节点 T 秒，以 70% 利用率估算：`workers = ceil(R × T / (60 × 0.7))`。不含故障备用和突发余量。明确假设每次 10 秒、每分钟 10 次请求，需要三个工作节点；假设每次 300 秒，则需要 72 个。这两个耗时都不是用户证明实测，只用于说明真实操作耗时如何决定经济可行性。把 203 MiB 空闲占用乘用户数是不成立的。

### 已观察到的证明交易运行耗时

现有日志测量的是操作完成后公开里程碑事件之间的间隔，没有单独计量证明服务器 CPU 时间、排队、密钥解码、本地准备、钱包余额平衡或链与索引器等待。下表描述实测操作延迟，不是纯证明生成延迟。独立的 `/prove` 请求耗时和普通用户证明耗时仍未测得，不能用开发工期或下方仅客户端的基准替代。

两组记录均为一个证明工作线程、四 CPU 配额和四个 Rayon 线程；主机物理内存为 15.79 GiB，共享 Docker/WSL 虚拟机为 7.648 GiB。弱缓存和原版来自不同运行，不构成受控速度比较。数据由已有公开事件推导，保存在 `proof-runtime-assessment.json`。

| 操作 | 实测耗时 | 证明器及范围 |
| --- | --- | --- |
| 账户凭证操作 | 264.647 秒，约 4.4 分钟。 | 弱缓存诊断，从前一部署事件到凭证被索引事件。 |
| 模块提案 | 29.165 秒。 | 同一弱缓存运行，从前一凭证事件到提案完成。 |
| 单次模块审查 | 35.400 和 36.123 秒。 | 同一弱缓存运行，两次连续审查。 |
| 单次模块批准 | 78.753 和 82.543 秒。 | 同一弱缓存运行，最后一次审查至首次批准，以及负面预检查完成至第二次批准。 |
| 父能力单个范围元素暂存 | 137.588 至 156.282 秒，约 2.3 至 2.6 分钟。 | 较早原版证明器运行中的八个连续步骤。 |
| 委托能力单个范围元素暂存 | 142.790 至 156.118 秒。 | 同一原版运行中的七个连续步骤。 |
| 父能力完整配置 | 1,488.209 秒，约 24.8 分钟。 | 从前一账户事件到开始、八次暂存及最终确认。 |
| 委托能力完整配置 | 1,356.048 秒，约 22.6 分钟。 | 从前一委托账户事件到开始、七次暂存及最终确认。 |
| 普通用户操作的零知识证明 | 尚未测得。 | 真实操作电路及收据尚未完成；218 至 323 毫秒的客户端 p95 不是证明时间。 |

原版运行中的能力阶段成功，但随后组合治理阶段发生 OOM，不能把这些耗时当作完整成功流程或修改后证明器的范围暂存结果。之前记录的 1,080.015 秒父能力开始至最终确认，来自另一轮运行及更窄的计时边界，不能替换上表 1,488.209 秒的完整配置间隔。

### 候选配置下的运行可行性

对当前已测的重型凭证分发电路，四 CPU 配置的已观察基线是每次完成操作以分钟计，而不是毫秒。小型能力的多交易配置可能需要数十分钟。如果客户接受等待，它或许适合低频后台管理，但不能据此认定适合 C 端交互或大规模账户开通。

独立工作节点若有 16 GiB RAM，已测 6.42 GiB 峰值加约 50% 余量，可作为单任务评估预算；这不是未来普通操作证明也能容纳的实测结论。两个同时运行的任务若达到该峰值，按相同余量约需 19.3 GiB，尚未计入其他服务开销，不能假定 16 GiB 可以安全并发两个。并发容量应使用峰值，不应使用请求结束后 203 MiB 的检查点。

四核增加到八核的加速倍数尚未测量。更多内存可能避免交换或 OOM，但没有证据表明 16 GiB 就能把 265 秒的操作降到几秒。首次配置比较应保持电路、密钥哈希及操作不变，在四核和八核分配下分别测量独立 proof/check 耗时、整笔交易延迟和不发生交换的峰值内存。本文件没有应用这类配置修改。

C 端网站必须独立测量普通操作证明，包括最大允许范围及委托深度，以及目标设备或获准证明服务。得到测量前，不能声称亚秒级证明，也不能给出确定的手机硬件要求。实现继续交给 AI；本评估不设置人工开发人日预算。

### 代表性普通用户工作负载

使用合成客服请求：用户已有上下文账户，取得订单权限，建立仅限一张订单和一个客服接收方的会话，预览请求，签署新意图并提交；与一层有限委托会话比较。M5 状态从 ready 变为 submitted，重放被拒绝；不证明购买真实发生或申诉内容为真。

可执行基准使用真实 M4/M5 实现，包括不计入操作耗时的两个独立精确哈希审查及激活。分别测量签名、七个私密范围路径准备及生成的 Compact 根检查、M5 授权；配置另计且全为链下。每个样本使用新夹具，不为提速绕过重放和状态转换。运行命令见上方；要求链模式在真实电路和收据集成前应以退出码 2 失败。

2026-10-13 在 Windows 文件系统沙箱内使用原生 Node 24.13.1 运行，每组 20 个串行样本、10 个拒绝用例和 42 次重放检查全部通过。最近秩 p95 指本组 95% 样本不超过的时间；20 个样本仅作描述，不构成生产 SLA。

| 客户端阶段 | 普通会话 p50 / p95 | 委托会话 p50 / p95 |
| --- | --- | --- |
| 意图签名 | 0.254 / 0.525 毫秒 | 0.193 / 0.258 毫秒 |
| 七个范围路径及根检查 | 270.964 / 322.120 毫秒 | 193.515 / 217.383 毫秒 |
| M5 授权 | 0.478 / 0.803 毫秒 | 0.382 / 0.506 毫秒 |
| 计时客户端操作总计 | 272.001 / 323.315 毫秒 | 194.089 / 218.273 毫秒 |

两组按固定顺序运行，不能据差异断言委托更快。操作总计不包含 Node 启动、模块加载和夹具配置。整个客户端进程的最高 RSS 为 122,560 KiB，含导入和夹具，不是证明器占用或移动端预算。JSON 中证明、提交、索引确认及证明器峰值均为 null。要求链模式不提交交易并以退出码 2 失败，不能用治理交易、伪收据或 M5 内存决定替代。

### 生产可行性结论和下一步测量

企业自行控制的试点是合理交付方向，但现有代码未通过生产验收；面向普通消费者的隐私证明网站也尚未完成性能验证。客户端检查是有用基础，不能说明缺失的主要证明成本。

应在已批准的 M6 架构内实现代表性操作，并在可测试时立即做真实链验证。分别测量电路执行及见证准备、proof/check 请求、余额平衡、提交和索引确认；记录精确版本及哈希、首次及连续运行、最大委托和范围、CPU、峰值及驻留内存、队列等待、交易数量和恢复。随后在目标消费设备和独立企业工作节点上测试连续及并发请求。先做 30 分钟稳定性诊断，容量结论前再做较长的 24 小时试点持续测试；都不替代 milestone 的功能和重启要求。

将用户延迟和工作负载要求与用户确定后再转成交付承诺。如果普通操作仍需数分钟或超出目标设备内存，应报告具体不兼容和选项，再讨论信任边界、电路或账本版本，不能宣称更大服务器、异步 UI 或远程证明器已经解决。Midnight 官方本地证明指南确认普通证明器会收到私密输入；两个交付方向都须遵守此隐私限制。


### v4 credential-binding build and first live transaction (2026-10-14)

Final keys generated at 2026-10-13T21:02:19.940Z: all ten real pairs,
dispatcher k19/418,338 rows; compiler observed HWM 5,097,252 KiB (about
4.86 GiB), zero sampled compiler swap and no new kernel OOM. This is build
memory, not transaction proving memory. The pinned local node accepted the
fresh v4 deployment; the real allocated account transaction completed in
183.838 seconds including proving, submission and indexing. The in-progress
run already sampled prover RSS above 6 GiB. Therefore this is not evidence
that a 6 GiB client budget is met, and the historical service high-water mark
is not attributable to this run. Full serial credential regression results
will be recorded separately; ordinary-action performance remains unmeasured.

The allocated root-capability certification completed at
`2026-10-13T21:41:31.381Z`: nine accepted transactions (begin, seven
scope stages, finalize) from the first request at `21:15:38.867Z` took
**1,552.514 seconds / 25.875 minutes**. This single observed setup would not
fit a 900-second grant lifetime. The deliberately long-lived fixture makes
the functional regression testable; it does not solve that production
latency limitation or establish a production SLA. Session setup and ordinary
actions are separate costs and must not be inferred from this root sample.

The first complete credential subtrace accepted all 21 credential transactions:
request-to-acceptance median **168.820 s**, nearest-rank p95 **185.806 s**,
range **155.538–195.355 s**. These 21 dependent, serial samples include proving,
submission and indexing; they are not isolated proof latency or a production
SLA. Session certification took **1,543.463 s / 25.724 min** for nine
transactions. The following replay assertion failed because its old
one-hour admission envelope had expired; the contract correctly rejected it.
The strict nonce-replay test was moved immediately after activation, and the
unchanged v4 contract/keys are undergoing a complete rerun. This failure is not
reclassified as a chain proof failure or a successful whole-harness run.

This same subtrace sampled **6.64 GiB maximum RSS**, **1.25 GiB maximum
process swap**, and **7.60 GiB maximum simultaneous RSS plus swap** (the
independent maxima must not simply be added). Paging therefore occurred;
this was not a swap-free 6 GiB configuration. All 832 resource samples were
captured without sampler errors; cgroup OOM/OOM-kill deltas were zero.
Samples are lower bounds, and the service-lifetime HWM/peak predates this run.
The observed host CPU is an i5-11300H, with eight WSL online CPUs but a
four-CPU prover quota, shared WSL RAM 7.65 GiB plus 2 GiB swap, and one proof
job. This demonstrates that this functional setup can run on that local
configuration; it neither establishes minimum hardware nor consumer delivery
readiness. No swap, memory, concurrency or OOM policy was changed.

v4 十组真实密钥已生成，最大电路 k19/418,338 行，编译器观测高水位约 4.86 GiB，无新增 OOM。真实分配后的账户交易端到端为 183.838 秒；运行中的证明器采样已经超过 6 GiB，不能声称达到 6 GiB 客户端预算。编译器、历史服务峰值、本轮证明器采样和普通动作成本必须分开；完整串行回归结果另行记录。

真实根能力认证于 UTC 21:41:31.381 完成，九笔交易（开启、七次暂存、确认）从 21:15:38.867 的首个请求起共耗时 1,552.514 秒，即 25.875 分钟。这一次实际设置无法在 900 秒授权有效期内完成。长时效夹具使功能回归能够测试，但并未解决生产延迟问题，也不是生产 SLA；会话设置和普通动作的成本需分别测量，不能由此推算。

首轮 21 笔凭证交易全部被接受，端到端中位耗时 168.820 秒、最近秩 p95 为 185.806 秒，范围 155.538–195.355 秒；会话九笔认证设置共 25.724 分钟。这些是相关的串行样本，包含证明、提交和索引，不是独立证明耗时或 SLA。后续重放断言因一小时激活封装已过期而失败，合约正确拒绝，不能把整轮工具运行记为通过；已将严格 nonce 重放检查前移，并使用未变更的合约和密钥完整重跑。首轮采样 RSS 最高 6.64 GiB，进程 swap 最高 1.25 GiB，同时 RSS 加 swap 最高 7.60 GiB，独立峰值不能直接相加。这不是无 swap 的 6 GiB 配置；832 次采样无错误、OOM 增量为零，但仍不是精确峰值保证。观测配置为 i5-11300H、WSL 八个在线 CPU／证明器四 CPU 配额、共享 WSL 内存 7.65 GiB 加 2 GiB swap、单证明任务；证明该功能配置能运行，不证明最低硬件或 C 端交付就绪。未改变任何内存、swap、并发或 OOM 策略。


### Corrected full v4 rerun: measured result, not production acceptance

The corrected complete harness passed deployment plus 38 real transactions,
with all 21 credential calls, reconnect and lifecycle checks; all 170 local
tests passed. The contract, verifier and key hashes were unchanged. Only
the replay-test ordering and fresh lifecycle-negative fixture were corrected.
The first attempt's later harness failure is preserved.

| Measured field | First 21-call subtrace; harness later failed | Corrected full run |
| --- | --- | --- |
| Credential request p50 / p95 | 168.820 / 185.806 s | 180.310 / 216.015 s |
| Credential request range | 155.538–195.355 s | 157.214–220.931 s |
| Root / session nine-call setup | 25.875 / 25.724 min | 28.289 / 27.982 min |
| Maximum sampled RSS | 6.64 GiB | 6.65 GiB |
| Maximum sampled process swap | 1.25 GiB | 1.28 GiB |
| Maximum simultaneous RSS plus swap | 7.60 GiB | 7.62 GiB |
| Sampler errors / cgroup OOM delta | 0 / 0 (832 samples) | 0 / 0 (961 samples) |

The corrected run's 22:18:42.020Z–23:39:07.289Z window includes deployment,
governance and intentional expiry waiting, not just credential proofs.
Timings include proving, submission and indexing; p95 is descriptive nearest
rank on 21 correlated calls, not an SLA. Sampling does not guarantee the exact
peak. No memory/swap/CPU/concurrency policy changed and the prover was not
recycled. This is an observed functional laptop/WSL configuration, not a
minimum-hardware estimate. Ordinary-action proofs and production throughput
remain unmeasured; a 900-second setup profile demonstrably does not fit these
observed certification runs. The two planned C-end/B-end delivery directions
remain plans, not implementations proven ready by this result.

Afterward, only node/indexer were restarted; independent public reads retained
the exact allocation/state commitments, status sequence 5, five consumed
credential nonces, zero sessions and all final governance history. This is
durable public-state evidence for this slice, not full action/wallet restart
acceptance. See issuer-binding-verification.json for exact hashes, transactions,
resource data and remaining gates. The public expiry-minus-one deadline
choice is not expiry-hiding evidence, and sentinel scans are not complete
artifact/inference privacy acceptance.

修正后的完整测试工具已通过部署加 38 笔真实交易，包含全部 21 笔凭证操作、重新连接和生命周期；170 项本地测试全部通过，合约／验证器／密钥未变，只修正了重放测试顺序和新鲜负面夹具，首轮失败完整保留。上表分别列出两次结果：重跑中位／p95 为 180.310／216.015 秒，范围 157.214–220.931 秒，根能力／会话九笔设置为 28.289／27.982 分钟；采样 RSS 6.65 GiB、swap 1.28 GiB，同时合计 7.62 GiB，961 次采样无错误／OOM。它们包含证明、提交、索引，不是独立证明耗时、精确峰值、最低硬件或生产 SLA。完整运行窗口还包含部署、治理和故意的过期等待。未改变资源策略，未重启证明器；900 秒设置配置无法容纳这些实测认证流程，普通动作和吞吐仍未测量，C/B 端方向仍是规划。节点／索引器定向重启后的公开状态保持一致，但不代替完整动作／钱包恢复验收；公开截止时间约定和哨兵扫描也不证明完整隐私。

## 2026-10-14 v6 update — slot-aware client preparation, not a proof SLA

M5-P1 is now integrated into the representative ordinary-user fixture. Both
customer and bounded delegated modes explicitly receive a permitted requester
slot, prepare the seven scope paths plus complete private slot-rule provenance,
sign the intent, and pass slot-aware M5 authorization. Twelve negatives and
twelve replay checks pass. Chain-required mode remains fail-closed; no ordinary
action proof/transaction/receipt has been produced.

Command: node scripts/run-m6-ordinary-user-benchmark.ts --iterations 5.
Recorded: 2026-10-14T02:06:00.730Z, Windows Node v24.13.1.
These five-sample measurements ran concurrently with root tests and local
governance proving. They are descriptive client-only values, not an isolated,
cold, browser/mobile benchmark or a throughput/production guarantee.

| Mode | Total client p50 / p95 (ms) | Slot-witness preparation p50 / p95 (ms) |
| --- | --- | --- |
| Customer session | 722.833 / 1290.758 | 180.705 / 300.117 |
| Bounded delegated session | 690.940 / 1187.905 | 68.489 / 125.920 |

First measured action after module import: 716.304 ms / 806.120 ms respectively.
Process maximum RSS was 104,052 KiB, including module loading and all fixture
setup. Total client time includes signing, seven scope paths, private slot
preparation and M5 authorization. It excludes chain proving, submission and
indexing; their ordinary-action measurements remain null. Percentiles from
separate phases must not be added to invent an end-to-end percentile.

The authenticated rule-tree build rejects excessive combinations before
expanding/hashing over one million leaves. This avoids that particular host
memory amplification; it does not solve ZK prover memory. V6's unchanged
credential circuit remains k19/418,338 rows, while allocation is k17/100,179.
Real key-generation peak compiler RSS was 5,097,256 KiB. Compiler memory is not
the customer's action-proof requirement. C/B delivery directions above remain
plans, not accepted production readiness; current assignment issuance/current
role-state proofs and ordinary actions still need implementation and measurement.

v6 已让代表性普通用户和有限委托流程使用真实 M5-P1 分配，准备七条范围路径与完整私有槽位链后签名并授权，12 项负例及 12 次重放检查通过；要求真实链模式仍失败关闭，没有普通动作证明、交易或收据。2026-10-14T02:06:00.730Z 的 Windows Node v24.13.1 五样本测试与仓库检查／治理证明并行运行，非独立冷启动、浏览器／手机、吞吐或生产保证。普通用户总客户端 p50／p95 为 722.833／1290.758 毫秒，槽位准备为 180.705／300.117；有限委托分别为 690.940／1187.905 和 68.489／125.920。导入后首次操作分别 716.304／806.120 毫秒。进程最高 RSS 104,052 KiB，包含模块及夹具设置；时间包含签名、范围路径、槽位准备及 M5 授权，不含链上证明、提交或索引，各阶段百分位不能直接相加。提前限制规则乘积只避免这一宿主内存放大，不解决 ZK 证明内存。v6 凭证仍 k19／418,338 行，分配 k17／100,179，真实密钥编译内存最高 5,097,256 KiB，不是客户动作证明需求。C/B 交付方向仍是规划，真实分配／角色状态证明及普通动作仍待实现和实测。

### V6 live-result boundary

The fresh v6 governance/allocation retry finalized deployment plus 17
transactions. Activation to allocation verification was 46.503 seconds,
including eleven preflight negatives, SDK work, proof/submission/indexing;
ordinary-action proof latency remains unmeasured. The retry did not run the
optional profiler. The failed first attempt's sampled RSS 4,090,604 KiB had
ten gaps and is not the successful run's peak or a hardware minimum. Its RPC
observation timed out although replacement staging affected indexed state.
The fresh retry used unchanged resources after concurrent tests ended; this
does not establish profiling/load as the cause. Existing C/B plans and lack
of production acceptance are unchanged. Exact outcomes and integrity checks
are retained separately in slot-assignment-verification.json.

v6 新部署加 17 笔治理／分配交易确认，激活至分配核验 46.503 秒包含十一项预执行负例、SDK、证明／提交／索引，普通动作证明时间仍未测。成功重跑未开启可选采样；首轮失败采样 RSS 4,090,604 KiB 有十次缺口，不能冒充成功峰值或最低硬件。首轮 RPC 观察虽超时，替换暂存仍影响索引状态。测试结束后以相同资源新部署重跑通过，不证明采样或负载是根因。C/B 规划及生产未验收状态不变，具体结果另存证据。

## 2026-10-14 v7 continuation — interrupted key build is not a customer proof estimate

V7 implements staged private participant-slot state in source, with no slot
ancestry truncation or new host trust. Source regression passes; fresh v7 slot
deployment is still pending. On the unchanged 7831 MiB shared WSL VM with
2048 MiB swap, three healthy M6 services and an idle prover, an actual pinned
slot-key attempt measured k20/818608. It stopped after 674.337 seconds because
available memory crossed a 768 MiB safety reserve, not because its 1800-second
timeout expired or a node rejected a proof. Sampled compiler RSS/HWM was
5,925,572 KiB (about 5.65 GiB), compiler swap zero. The guard is reactive, not a
hard cap; completed-key peak/time remain unknown and no usable pair was produced.

This is development/deployment key generation, not the ordinary user's action
proof. It establishes that this attempt did not finish under the current safe
shared-VM profile; it does NOT establish that customers need this memory, that
more time alone solves it, a minimum production machine size, or that the
architecture is infeasible. C-end/B-end plans remain as above, conditional on
actual action proofs and privacy boundaries. Do not sell a 6 GiB client proof
budget or a k20 production SLA from this stopped build. Next work must either
reduce real circuit/build cost within the approved architecture or measure an
explicitly agreed resource profile; no silent resource escalation or trust
substitution is justified. Fingerprints, guards, recovered stack and all
255 passing root checks are in slot-key-resource-attempt-verification.json.

v7 源码已实现完整分阶段私有槽位，不截断链、不信任宿主，但真实新部署待密钥。固定
7831 MiB 共享 WSL／2048 MiB swap、三个健康服务且证明器空闲时，真实密钥测得 k20／
818608，674.337 秒时因 768 MiB 可用内存安全保留阈值停止，非时间到、非节点拒绝；
编译器采样 RSS/HWM 5,925,572 KiB（约 5.65 GiB），自身 swap 零，响应式保护不保证
硬上限，完整密钥峰值／耗时未知，无可用 pair。这是开发／部署密钥生成，不是普通用户
动作证明，只说明该次尝试未在当前安全共享 VM 配置下完成；不证明客户要这么多内存、
只加时间可解决、最低生产硬件或架构不可行。C/B 规划仍待实证，不销售“客户端 6 GiB”
或 k20 SLA；后续须在已批架构内降成本，或按用户明确同意的资源配置实测，不能擅加
资源／替换信任。精确指纹、保护、恢复及完整 255 项通过结果见独立 JSON。
