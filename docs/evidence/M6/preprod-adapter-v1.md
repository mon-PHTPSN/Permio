# M6 explicit Preprod adapter and saved-wallet inspection v1

## Latest verified continuation — 16 October 2026

The earlier access and short-deadline failures below are historical, not the
current blocker. Authenticated Windows RPC, node new-head subscription and
indexer block subscription all pass at06:50:12.926UTC. Preprod reports
ledger8.1.1 and genesis
`0xdf831b09a8baa92badf47762ce5ac439b7e47e3ed3d39600cfdd44fad552361b`.
Node height3002596 and indexer height3002593 are observations, not finality
evidence. WSL independently passes the same three transport checks before its
wallet catch-up attempt. No credential is transferred to ECS.

下文此前的访问失败及短时限失败均为历史记录，不是当前阻塞。UTC06:50:12.926，Windows
认证RPC、节点新区块头订阅及indexer区块订阅全部通过。Preprod报告ledger8.1.1及上述
创世哈希，节点高度3002596、indexer高度3002593只是观测，不是最终性证据。WSL在钱包
追赶前也独立通过相同三项连接检查，没有将凭据传给ECS。

The existing fixture-1 wallet fully restores with the unchanged pinned SDK in
read-only, network-isolated WSL. After SDK import, full inspection takes
313136ms; the original ledger `DustLocalState.deserialize` call accounts for
312111ms. All three restored component identities match the selected derived
account. The final RSS sample is650076160bytes (about620MiB), not a measured
peak. Applied limits are1GiB memory.high,1.5GiB memory.max,512MiB maximum swap,
one CPU and a900-second whole-process guard. An earlier300-second diagnostic
times out with recorded peak594665472bytes and zero swap, not an OOM. The
successful unit's final peak accounting was collected too late and is unknown;
do not substitute unset systemd counters with zero. No tree collapse, snapshot
edit, fresh wallet, dependency upgrade or validation bypass is used.

现有fixture-1钱包已在只读、隔离网络的WSL中用不变的固定SDK完整恢复。SDK导入后完整
检查耗时313136ms，其中原始ledger反序列化调用占312111ms，三个组件身份均与选定派生
账户一致。结束时RSS采样650076160字节（约620MiB），不是实测峰值。已应用软阈值1GiB、
硬上限1.5GiB、swap上限512MiB、单CPU及900秒进程保护。此前300秒诊断超时，记录峰值
594665472字节、swap为零，并非OOM。成功unit的最终峰值计数读取过晚，现已不可得，
不能将systemd未设置计数当成零。没有折叠树、修改快照、新建钱包、升级依赖或绕过验证。

The pinned upstream wallet has an open, triaged
[large Dust deserialization issue](https://github.com/midnightntwrk/midnight-wallet/issues/639).
Our trace has a matching symptom; this is not proof of the identical internal
cause. The existing serialized progress is not current synchronization, and
legacy snapshots do not establish their original provider history. Restoration
must not be called proof generation or transaction acceptance.

固定版本的上游钱包存在上述已分诊、未关闭的大Dust反序列化问题。本次记录的症状相符，
但尚不能证明内部根因相同。保存的旧进度不代表当前同步，旧快照也不能证明原服务来源。
钱包恢复不能称为生成证明或交易验收。

`withRestoredPreprodWallet` now owns one restoration for an awaited workflow.
It remains offline until an explicit `synchronize()` call; that call uses the
restored components and `.start(false)`, without faucet funding or automatic
DUST registration. Signing transport stays unusable until synchronized with
spendable DUST, and closes after the callback even if it throws. In-flight
initialization is joined before disposal; a captured wallet cannot restart or
submit after the scope closes. No checkpoints are written by this API.

新增API在一次等待完成的工作流内只恢复一次钱包；必须显式调用`synchronize()`才联网，
复用已恢复组件并使用`.start(false)`，不请求faucet、不自动注册DUST。同步并存在可花费
DUST之前禁止使用签名传输，回调结束或抛错后关闭；清理前等待尚未完成的初始化，捕获的
钱包对象不能在作用域关闭后重启或提交。此API不写检查点。

Readiness also requires a positive SDK DUST balance at the current time, not
merely a coin entry. This is not a guarantee of sufficient fees for every
transaction: balancing must still determine the actual cost. The state-wait
timeout does not bound synchronous restoration or SDK initialization, so the
diagnostic retains an owned whole-process guard. Raw SDK stderr is suppressed
because its node client may independently log token-bearing URLs; fixed caught
exceptions alone do not sanitize library logs.

就绪还要求SDK计算的当前DUST余额为正，不只是存在coin条目。这不保证每笔交易费用
都够，实际费用仍由平衡步骤确定。状态等待超时不能限制同步反序列化或SDK初始化，故
诊断保留自有进程整体时限。SDK节点客户端可能独立记录含token的URL，因此屏蔽原始
SDK stderr；只将捕获异常脱敏还不足以净化第三方库日志。

`createPreprodAuthorizationProviders` wires the exact pinned Midnight.js
providers without silently changing the global signing network. It checks all
eight wallet environment fields and rechecks drift before balancing/submission
and after asynchronous balancing. It returns narrow guarded transport methods,
not the secret-bearing SDK wallet. Provider exceptions are redacted; an unknown
submission outcome requires reconciliation, never an automatic retry. This is
wiring, not successful deployment or verified prover compatibility. The Local
Dev admission runner has not yet been switched to Preprod.

新的provider构造函数连接精确固定版本Midnight.js组件，不擅改全局签名网络。检查钱包
环境全部八个字段，在平衡／提交前及异步平衡后重新核对，返回受保护的窄接口，不返回
含秘密的SDK钱包。服务异常脱敏；提交结果未知时必须先核对，不能自动重试。这只是接线，
并不表示部署成功或证明器兼容已验证，原Local Dev admission runner尚未切换到Preprod。

See `preprod-wallet-readiness-verification.json` for the latest exact checks,
catch-up outcome, source/report hashes and server stop schedule. The previous
`preprod-adapter-verification.json` is retained as an explicitly historical
snapshot, including its failed guard and earlier source hashes. M6 is incomplete.

最新精确检查、追赶结果、源码／报告摘要及服务器停机安排见上述新JSON。旧适配器JSON
明确保留为历史快照，包括失败保护及当时的源码摘要。M6尚未完成。

The final positive-balance run passes with the final checkpoint source hash
`f5e78084aa554f14f78bd8578052d5edda6ff83ba01373fe94a2a2b80488d27a`.
SDK strict synchronization and a positive available DUST balance are verified.
Catch-up takes75094ms after restoration; complete post-import workflow308173ms,
whole-process monotonic time410.397003seconds. Cgroup memory peak623501312bytes
and swap0 differ from the final process RSS sample713302016bytes. The same
1.5GiB hard limit is retained. Exit0, source snapshots unchanged, no funding,
proving/balancing/submission or secret transfer. Readiness is an observation
inside the completed scope, not guaranteed future connectivity or fee coverage.
The final complete root check passes330/330 including six Hardhat tests.

最终余额为正测试使用上述最终源码摘要并通过：SDK严格同步及可用DUST余额为正均核实。
恢复后追赶75094ms，导入后完整工作流308173ms，全进程单调时钟410.397003秒。cgroup
内存峰值623501312字节、swap零，与结束时进程RSS采样713302016字节是不同计量；
保持相同1.5GiB硬上限。exit0、原快照不变，未充值、证明／平衡／提交或传秘密。就绪
只是已结束作用域内的一次观察，不保证未来连接或费用覆盖。最终完整根检查330／330
通过，含六项Hardhat。

## Implemented boundary, not deployment acceptance

`preprod-profile.ts` fixes node HTTP/WS and indexer HTTP/WS to the documented
Blockfrost Preprod endpoints. Only a `nightpreprod` project ID is accepted;
authentication is added in memory at the explicit SDK boundary. JSON and normal
object inspection omit it. The proof destination must be caller-controlled
HTTP loopback on port6300 or6301; no remote private-witness destination, retired
endpoint fallback, faucet or fresh-wallet fallback is introduced.

`preprod-profile.ts`将节点及indexer的HTTP／WS固定为官方Blockfrost Preprod端点，
仅接受`nightpreprod`项目ID，在显式SDK边界内存中添加认证，JSON及普通对象检查不含凭据。
证明器只能是调用者控制的HTTP loopback6300／6301；没有远程私密见证目标、退役端点
回退、faucet或新建钱包回退。

Private checkpoint-binding helpers cover schema version, Preprod network,
provider endpoint fingerprint, chain genesis, derived component identities and
all three exact snapshot hashes. Token rotation does not change the provider
fingerprint. The sidecar is local binding metadata, NOT a governance attestation,
proof of historical provider provenance or public actor identifier. Helpers are
tested, but no binding sidecar is written for an existing wallet in this run.

私有检查点绑定工具覆盖schema版本、Preprod网络、服务端点指纹、链创世哈希、派生的组件
身份及三个快照的精确哈希。轮换token不会改变服务端点指纹。此sidecar仅为本地绑定元数据，
不是治理证明、历史服务来源证明或公开用户标识；工具已测试，本轮未为现有钱包写sidecar。

## Read-only transport probe

`npm run check:m6:preprod-transports -- --check --local-config PATH` reads the
existing token locally and sends it only to the fixed intended provider. RPC
checks the genesis hash and ledger8 version. Node WS requires a matching
`chain_subscribeNewHeads` notification. Indexer WS first queries the latest
height, then requests `blocks(offset: {height})` as a genuine GraphQL
subscription using the pinned Midnight.js4.1.1 schema. A query response alone,
an empty subscription or a block before the requested offset cannot pass.
Owned sockets close on success, rejection or bounded timeout; errors are fixed,
redacted categories. RPC has a15-second deadline per call and WS a20-second
deadline per socket. The command does not load a wallet, prove or submit.

上述命令在本地读取既有token，只发送给固定目标服务。RPC检查创世哈希与ledger8版本；
节点WS必须收到匹配的`chain_subscribeNewHeads`通知。indexer先查最新高度，再按固定
Midnight.js4.1.1 schema真正订阅`blocks(offset: {height})`，不会从创世重放。仅查询成功、
空订阅或返回早于指定高度的区块均不能通过。自有socket在成功、拒绝或有限超时后关闭；
错误为固定脱敏分类。每次RPC15秒、每个WS20秒；命令不加载钱包、不生成证明、不提交交易。

Only synthetic transport tests have run for this new probe. Its authenticated
live invocation was blocked by approval review before execution. No current
RPC/WS success, indexer subscription or Preprod compatibility is claimed.
Official endpoint/toolchain references are the
[network page](https://docs.midnight.network/relnotes/network) and
[support matrix](https://docs.midnight.network/relnotes/support-matrix).

此新探测目前仅运行合成连接测试。认证的真实调用在执行前被审批审查阻止；不声称当前
RPC／WS成功、indexer订阅成功或Preprod兼容。官方端点及工具链依据为上述network及
support matrix页面。

## Offline checkpoint check and actual diagnostic

`npm run inspect:m6:preprod-checkpoint -- --inspect-offline --local-config PATH
--checkpoint DIRECTORY --account-index-var ENV_NAME --mnemonic-var ENV_NAME
--slot fixture-1` accepts explicit local paths and variable names, not secrets
on the command line. Config and each snapshot must be ignored and untracked.
Git privacy checks have10-second limits. Snapshot files must be regular,
non-symlink files of at most32MiB. The pinned SDK derives all three component
identities, rejects mismatched headers early, then fully restores and checks
the SDK states. It never calls wallet `.start()`, synchronizes or submits.
On successful completion it checks source hashes again and writes a public-only
inspection report; no existing checkpoint is rewritten. Progress emits only
fixed stage names, elapsed time and process memory counters.

上述离线命令显式接受本地路径和变量名，不通过命令行传秘密。配置和每个快照必须已忽略
且未跟踪；Git隐私检查限时10秒。快照须为普通非符号链接文件，最大32MiB。固定SDK派生
三个组件身份，先拒绝不匹配的header，再完整恢复并核对SDK状态；不调用`.start()`、
不启动同步、不提交。成功后再次核对源哈希，仅写公开检查报告，不覆盖已有检查点。
进度仅输出固定阶段名、耗时及进程内存计数。

Actual existing fixture-1 attempt: a90-second outer process guard previously
expired during SDK restoration. After instrumentation, a30-second owned-process
guard locates the unfinished synchronous call at `DustWallet.restore`.
Shielded and unshielded calls return. With the early identity check added,
headers pass; stages begin at25ms (derive),184ms (header check),197ms
(shielded),257ms (unshielded),267ms (Dust). At Dust entry RSS is443248640bytes
and JS heap used161837384bytes; these are entry samples, NOT peak measurements.
The owned child is terminated with SIGTERM at the30-second whole-process
cutoff. Raw stderr is withheld. No synchronization, checkpoint write, wallet
upload or transaction occurs. Only fixture-1 is attempted after instrumentation;
fixtures2/3 have not been restored by this code.

真实既有fixture-1先前在SDK恢复阶段触发90秒外部进程保护。增加计时后，30秒自有进程
保护将未返回的同步调用定位在`DustWallet.restore`，shielded／unshielded调用均已返回。
增加身份前检后header通过：derive25ms、header184ms、shielded197ms、unshielded257ms、
Dust267ms；进入Dust时RSS443248640字节、JS heap161837384字节。这是入口采样，不是
峰值。整个进程达到30秒后仅对自有子进程SIGTERM，不显示原始stderr。没有同步、检查点
写入、钱包上传或交易；增加计时后只尝试fixture-1，此代码尚未恢复fixture2／3。

SDK source inspection shows the Dust restore path parses JSON, decodes hex,
calls ledger8 `DustLocalState.deserialize`, restores core state, then constructs
the runtime. The trace does NOT isolate which internal substep dominates.
The observed SDK versions match the existing application exactly: wallet-sdk
1.2.0, facade4.1.0, dust4.2.0, shielded3.0.2, unshielded3.1.0 and ledger8.1.0.
No OOM, corruption, dependency mismatch, infinite hang, minimum hardware or
necessary resynchronization has been established. A JS heap setting of768MiB
is not a hard RSS/native/WASM memory limit. The ten-second RxJS state timeout
does not interrupt synchronous restoration; real-file diagnostics need an
outer owned-process time guard, as used here.

SDK源码显示Dust恢复路径包括JSON解析、hex解码、ledger8的`DustLocalState.deserialize`、
core状态恢复及runtime构建；当前记录尚不能区分内部哪个子步骤占主导。SDK版本与既有
应用完全一致：wallet-sdk1.2.0、facade4.1.0、dust4.2.0、shielded3.0.2、unshielded3.1.0、
ledger8.1.0。尚未证实OOM、损坏、版本不匹配、无限卡死、最低硬件或必须重做同步。
JS heap768MiB并非RSS／原生／WASM硬上限，十秒RxJS状态超时也不能中断同步恢复；
真实文件诊断须像本次一样使用外部自有进程时间保护。

The CLI now enforces that outer guard itself: its parent forks only the exact
inspector script, suppresses raw child stdout/stderr, and receives structured
public-only progress/results over local IPC. A fixed60-second child deadline
requests SIGTERM only of that owned process. A success message is insufficient:
the child must exit0 before a successful report is saved. Deadline, spawn,
reporter or nonzero-exit failures cannot pass. Failure reports are also saved
under ignored `logs/`. The child has a768MiB V8 heap setting, explicitly not a
total RSS/native/WASM hard ceiling. SDK imports are deferred to the validated
child, so malformed selectors fail without loading the wallet SDK.

CLI现已内置该外层保护：父进程只派生精确检查脚本，屏蔽子进程原始stdout／stderr，
通过本地IPC接收仅含公开信息的结构化进度／结果。子进程固定60秒截止，只对自有进程
请求SIGTERM。收到成功消息还不够，必须子进程exit0才保存成功报告；超时、启动失败、
报告器失败或非零退出均不能通过。失败报告也保存于忽略的`logs/`。子进程设置V8 heap
768MiB，明确不是RSS／原生／WASM总内存硬上限。SDK只在参数验证后的子进程中加载，
无效选择器无需加载钱包SDK即失败。

The actual guarded CLI returns a deadline failure at06:37:37.999UTC on
16October; child SIGTERM and command exit1 are confirmed. Its public report
hash is54f82789c25d6b141378fbb9d099950577290ac632c12a3cf0fdb2fc4e2962c2.
This validates the guard, not successful Dust restoration. Final local
diagnostics pass67/67 and Midnight tests145/145; other suites pass
6/15/14/16/50. That is313 non-contract cases across runs, not one successful
root check: both Hardhat build/test startup remain blocked by HHE22 in this
sandbox, before the six contract cases. Docs, types, JSON/source/report hashes
and a78-file local configured-secret-marker scan pass. The latter is not the
full M6 public-receipt privacy acceptance. Exact results are in
`preprod-adapter-verification.json`.

真实保护CLI于10月16日UTC06:37:37.999返回超时失败，确认子进程SIGTERM及命令exit1，
公开报告摘要如上。这验证保护机制，不是Dust恢复成功。最终本地诊断67／67、Midnight
145／145，其他包6／15／14／16／50通过，跨运行合计313项非合约测试，并非一次完整根
检查通过：Hardhat构建／测试仍在此沙箱启动时HHE22，六项合约测试未执行。文档、类型、
JSON／源码／报告摘要及78文件本地配置秘密标记扫描通过；后者不是完整M6公开收据隐私
验收。精确结果见上述JSON。

## Remaining integration and lifecycle boundary

The existing Local Dev admission runner remains unchanged by this adapter
slice; it is NOT yet wired to a restored Preprod wallet. Real restored-wallet
readiness/catch-up, provider/chain binding, exact prover compatibility,
deployment, current slot/action proofs, finality, receipt/privacy and reconnect
acceptance remain outstanding. Synthetic SDK snapshots prove only the offline
implementation contract. They do not replace existing wallet restoration or
any M6 chain gate. No dependencies, lockfile, compiler or architecture change.

本适配器切片未改既有Local Dev admission runner，也尚未将其接入恢复的Preprod钱包。
真实钱包恢复／追赶、服务与链绑定、精确证明器兼容、部署、当前槽位／动作证明、最终性、
收据隐私及重连验收仍未完成。合成SDK快照仅验证离线代码契约，不代替现有钱包恢复或
任何M6链门槛。没有改变依赖、锁文件、编译器或架构。

On the user's continuation, the old one-time stop `exec-b6cdcd0903664f84aee8`
(planned14:59 Shanghai on16October) was cancelled and read back `Cancelled`
before work. The deletion deadline was verified empty. Approval review then
reported unavailable until15:17 Shanghai; no replacement stop schedule could
be verified. The old14:59 deadline is no longer active. The last observed
instance was Running; current state is not rechecked. Compute billing may
continue. Preserve instance/disks/tools; once access recovers, recheck state,
coordinate tasks and schedule a fresh one-hour graceful `StopCharging` action.
Do not treat this document as an installed timer or use deletion as a fallback.

用户继续任务后，先取消旧单次停机`exec-b6cdcd0903664f84aee8`（原计划10月16日上海
14:59），并读回`Cancelled`；删除期限核实为空。随后审批审查报告需等到上海15:17，
未能核实新的停机任务，旧14:59期限已失效。最后观测实例为Running，尚未重查现态，
计算费用可能继续。保留实例／磁盘／工具，访问恢复后重查、协调任务，重新安排一小时后
优雅`StopCharging`。本文不是已安装定时器，不以删除作为回退。
