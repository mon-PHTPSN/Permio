# M6 explicit Preprod admission runner v1

## Scope and privacy property

`npm run test:live:m6:preprod` adds an explicit Preprod entry point to the
existing M6 admission workflow; it does not replace the contract, proof system
or Local Dev runner. The selected network is used by both the constructor's
network hash and each M4 activation envelope. A real generated-contract
deployment is serialized in a test and checked for the Preprod hash, with no
Local Dev hash, then deliberately stopped before proving, balancing or sending.
This is executable network-binding evidence, not a submitted transaction.

新增命令为既有M6准入工作流提供显式Preprod入口，不替换合约、证明系统或Local Dev
runner。所选网络同时用于构造函数网络摘要和每份M4激活封装。测试实际构造并序列化
生成合约的部署交易，核对含Preprod而不含Local Dev摘要，再明确在证明、平衡或提交前
停止。这是可执行网络绑定证据，不是已提交交易。

The privacy property is that existing wallet inputs stay on the client and
only the intended authenticated provider receives its credential. Check mode
does not read snapshots, instantiate the wallet SDK, fund, prove, balance or
submit. Submission modes require exact existing snapshots and the same full
SDK identity restoration, explicit synchronization and positive available
DUST gate already measured. No fresh-wallet or retired-endpoint fallback is
introduced. Source snapshots are re-read and compared after a successful run;
no checkpoint or private binding sidecar is persisted by this runner.

隐私属性是现有钱包输入留在客户端，凭据仅发送给指定认证服务。check模式不读取快照、
不实例化钱包SDK、不充值、证明、平衡或提交。提交模式必须使用精确既有快照，并要求
此前实测的完整SDK身份恢复、显式同步及可用DUST为正。不引入新建钱包或退役端点回退。
成功运行后重读并核对原快照，不保存检查点或私有绑定sidecar。

## Explicit controls

```text
npm run test:live:m6:preprod -- --preprod --check \
  --local-config <ignored-local-config> --checkpoint <ignored-snapshot-directory> \
  --account-index-var <LOCAL_VARIABLE_NAME> --mnemonic-var <LOCAL_VARIABLE_NAME> \
  --proof-server http://127.0.0.1:6300
```

Replace only `--check` with one of `--submit-deployment`,
`--submit-governance`, `--submit-allocation`, `--submit-credential-binding` or
`--submit-slot-state` for the named real submission scope. Each run creates
a new fixture deployment; no resume-existing-deployment operation is claimed.
Deployment-only stops after the indexed constructor state and exact authority
root/network hash are verified, without activating a template. The other
modes reuse the original workflow, negative checks and protocol deadlines;
slot-state/credential scopes are not ordinary-action acceptance. Paths and
variable names are explicit selectors, never mnemonic values on the command
line. Unknown/duplicate controls, mixed submission modes, Local Dev account
or sampler/reset flags and non-allowlisted proof destinations fail closed.

仅将check替换为上述具名submit模式即可选择真实提交范围。每次运行创建新的fixture
部署，不声称能够恢复既有部署。仅部署模式在核对索引构造状态及精确权限根／网络摘要
后停止，不激活模板。其他模式复用原工作流、负面检查及协议期限；槽位／凭据模式不等于
普通动作验收。路径及变量名是显式选择器，命令行不放助记词。未知／重复参数、混合提交
模式、Local Dev账户或采样／重置参数及非白名单证明目标均拒绝。

Preflight verifies all exact current generated programs, binary IR, real
prover/verifier keys and manifest hashes before wallet use. It checks the
pinned Preprod genesis through authenticated RPC, real node/indexer
subscriptions and loopback prover HTTP health. Health alone does not attest
the prover version or proof/ledger compatibility. The core dependency pins
remain unchanged. Official [support matrix](https://docs.midnight.network/relnotes/support-matrix)
inspection on16October still lists compiler0.31.1/runtime0.16.0/SDK1.2.0/
Midnight.js4.1.1 with ledger8, and recommends proof-server8.1.3. The existing
8.1.0 prover is not declared compatible merely because it starts; actual
deployment/proof acceptance must establish the tested scope.

预检在使用钱包前核对全部当前生成程序、二进制IR、真实证明／验证密钥及manifest摘要，
通过认证RPC核对固定Preprod创世哈希，检查真实节点／indexer订阅及本地证明器HTTP健康。
健康检查本身不能证明版本或证明／账本兼容。核心依赖不变。10月16日检查上述官方矩阵
仍为编译器0.31.1／runtime0.16.0／SDK1.2.0／Midnight.js4.1.1搭配ledger8，推荐证明器
8.1.3。既有8.1.0不能仅因启动成功便称兼容，须以实际部署／证明验收确定已测范围。

## Owned process and failure behavior

The parent forks only its exact worker, suppresses raw SDK stdout/stderr,
and accepts fixed safe IPC phases/readiness booleans. A matching completed
scope and exit0 are both necessary. The worker redirects testkit's eager
import-time file logger to a newly created private temporary directory. Only
that validated owned directory is removed afterward; input files and public
reports remain. Private inputs require ignored, untracked, regular non-symlink
files with size bounds. Standard JSON/object inspection of the loaded input
holder omits values. This does not make its explicit secret accessor public-safe.

父进程只派生精确worker，屏蔽SDK原始stdout／stderr，仅接受固定安全IPC阶段及就绪
布尔值；请求范围一致的完成消息和exit0缺一不可。worker将testkit导入即创建的文件
日志器重定向至新建私有临时目录，之后只删除核实归属的该目录，保留输入和公开报告。
私有输入须为已忽略、未跟踪、有大小限制的普通非符号链接文件。输入容器的普通JSON／
对象检查省略值，但显式秘密访问器仍不是可公开内容。

A one-hour owned-process guard requests SIGTERM and, after five seconds,
SIGKILL only for that worker if necessary. It is not a RAM limit or a longer
governance validity window. V8 heap768MiB does not cap native/WASM memory;
real wallet runs additionally need the measured OS-level memory controls.
On failure in a submission scope, reconcile chain state before any manual
retry: a timed-out transaction can still be pending or included. No automatic
transaction retry is added. Existing proof-provider HTTP500/503 retries are
upstream proving behavior, not permission to resubmit an uncertain transaction.

自有进程整体保护限一小时，先SIGTERM，必要时五秒后仅对该worker SIGKILL；这不是
RAM上限，也不延长治理有效期。V8 heap768MiB不能限制原生／WASM内存，真实钱包运行
还需已测的操作系统内存控制。提交范围失败后须先核对链状态再人工重试，因为超时交易
仍可能待处理或已入链。不增加交易自动重试。证明provider上游HTTP500／503重试属于
证明行为，不授权重复提交结果未知的交易。

## Actual diagnostics and remaining gates

The first real `--check` invocation exits1 at08:25:58.257UTC, before wallet
loading or submission. The two loopback health endpoints are unavailable and
native Docker Engine requests return HTTP500, not a missing Hardhat or wallet
failure. Do not factory-reset Docker, kill unrelated services, change network
security rules or upload wallet data to make this pass. The exact pinned public
prover image is available on ECS. A stopped, networkless export container
extracts its public executable:23986080bytes, SHA-256
`0e7c638afff563a382316bb06cf31e4afe327e0ada9fd8f2e9b1ef5b73171e03`,
requiring at most GLIBC2.34. It is downloaded for a separate local WSL runtime
check; no version upgrade, private-input transfer or successful deployment is
implied by extraction. The live result and complete checks are recorded in
`preprod-runner-verification.json`; M6 remains incomplete.

首个真实check于UTC08:25:58.257以exit1结束，未加载钱包或提交。两个本地健康端点
不可用，原生Docker Engine请求HTTP500，不是Hardhat缺失或钱包失败。不能为通过检查
而重置Docker、停止无关服务、改安全规则或上传钱包。ECS已有精确固定公开证明器镜像，
停止且无网络的导出容器提取其公开可执行文件：23986080字节、上述SHA-256，最高要求
GLIBC2.34；下载后单独检查WSL运行。提取不等于升级、传私密输入或部署成功。真实结果及
完整检查见上述runner证据JSON；M6尚未完成。

The compressed download completes and both hashes pass. The unchanged binary
runs with WSL's system ELF loader, without Docker. Applied systemd limits are
memory.high2GiB, memory.max3GiB, swap.max1GiB, one CPU, one worker/job and a
30-minute service guard. Its network filter allows only loopback: health
returns200 on127.0.0.1 and an actual request to the VM's non-loopback address
times out. Raw prover output is discarded; existing public parameters are
read-only with fetching disabled. This setup does not qualify large action
proofs on a3GiB prover or change the plan to use ECS for large synthetic tests.

压缩下载完成，压缩及解压后的哈希均通过。不变二进制使用WSL系统ELF loader运行，
无需Docker。systemd实加软阈值2GiB、硬RAM3GiB、swap1GiB、单CPU、单工作线程／任务
及30分钟服务保护。网络过滤只允许回环：127.0.0.1健康200，实际请求VM非回环地址超时。
丢弃证明器原始输出，已有公开参数只读且禁用下载。这不证明大型动作证明能在3GiB完成，
也不改变大型合成测试使用ECS的计划。

The exact real WSL check passes at08:39:07.135UTC: assets, genesis, RPC, both
actual subscriptions and local health. The next deployment command is denied
by safety review before execution: spending existing test DUST and creating
permanent Preprod state require explicit approval. Its unit is verified absent
and inactive; that command does not load a wallet or send a transaction. Do
not bypass the denial through another entry point. Approval is requested for
exactly one deployment-only transaction, excluding activation and secret upload.
These are acceptance fixtures, not production governance identities or an
exception to reviewer/author/activation separation.

UTC08:39:07.135真实WSL check通过：产物、创世哈希、RPC、两类实际订阅及本地健康。
随后的部署命令在执行前被安全审查拒绝，花费现有测试DUST并创建永久Preprod状态需要
明确批准。unit核实不存在且未运行，该命令没有加载钱包或发送交易，不能换入口绕过。
已请求只批准一次仅部署交易，不含激活或传秘密。这些是验收fixture，不是生产治理
身份，也不构成审核者／作者／激活权限分离的例外。

Before submission the runner preserves only validated public candidate
transaction IDs for later reconciliation, never transaction bytes or private
payloads. A returned ID is not finality. The ninth safety case checks one
uncertain call is not retried, transaction serialization is never accessed by
this observer, and invalid identifiers cannot reach submission. Read-only
preflight does not exercise this transaction path.

提交前runner只保留校验过的公开候选交易ID以便核对，不记录交易字节或私密载荷。返回
ID不代表最终性。第九项安全测试核对未知结果不重试、观察器不调用交易序列化，以及
无效ID不能到达提交。只读预检不会执行此交易路径。

## Subsequent explicit approval and actual attempt

The user subsequently approves exactly one deployment-only transaction.
The operational approval blocker above is historical, not still pending.
The first approved run restores the real existing wallet, passes strict sync
and positive-DUST gates, and completes the contract-proof-provider boundary,
but fails before the guarded submission wrapper. There is no candidate or
returned transaction ID, contract address or successful Preprod deployment.
Client peak is660086784bytes with zero swap; exit-code1 is not an observed
OOM kill. An8.9ms contract provider boundary is not a real-proof performance
measurement. See [actual deployment evidence](preprod-deployment-verification.json)
for exact times, report hashes, source revisions and the diagnostic follow-up.

用户随后只批准一次仅部署交易，上述操作授权阻塞已成为历史，不再等待批准。首次
获批运行恢复实际既有钱包，通过严格同步及DUST正余额检查，并完成合约proof-provider
边界，但在受保护提交封装前失败，没有候选或返回交易ID、合约地址或成功Preprod部署。
客户端峰值660086784字节、swap零，exit-code1不是已观测OOM杀进程。8.9ms合约provider
边界不是实际证明性能测量。精确时间、报告哈希、源码版本及诊断后续见上述部署证据。

Balancing now has optional fixed start/complete/failure phase labels. Failure
classification returns an allowlisted category after reading at most four
own-property cause nodes; it does not expose raw errors or call private
accessors/serialization. The parent rejects arbitrary phase text. This does
not weaken readiness, change fees, add automatic submission retries or make
positive DUST sufficient for every transaction. Any actual submission-attempt
event still requires reconciliation before a failed run can be retried.

平衡阶段新增可选固定开始／完成／失败标记，失败分类最多读取四层自身属性cause，
只返回白名单类别，不暴露原始异常、不调用私密accessor或序列化；父进程拒绝任意阶段
文本。这不放宽就绪条件、不改费用、不加交易自动重试，也不意味着DUST为正就足够
支付每笔交易。只要实际出现提交尝试事件，失败重试前仍必须先核对链状态。

The diagnostic retry identifies a local wallet fee-prover failure before
submission. Inspection finds an incomplete public cache: BLS k11/k12 and all
built-in DUST/Zswap key material are missing. Provision14public files from the
official SRS and verify all18startup-required files against exact
`ledger-8.1.0` checksums, without overwriting existing files. The release itself
uses static paths `dust/9` and `zswap/9`; this is not a Ledger9 upgrade.
The corrected local launcher verifies that inventory before accepting private
requests. The binary, memory caps, private cache mount and localhost filter
are unchanged. This setup correction is not itself proof of successful
deployment; the subsequent real result must be recorded separately.

诊断重试定位为本地钱包费用证明器在提交前失败。检查发现公开缓存不完整：缺少BLS
k11／k12及全部内置DUST／Zswap密钥材料。按精确ledger-8.1.0校验值从官方SRS补齐
14份公开文件，核对全部18份启动必需文件，不覆盖既有文件。该版本本来就使用dust/9
及zswap/9静态路径，不代表升级Ledger9。修正后的本地启动器在接收私密请求前核验
该清单，二进制、内存上限、私密运行时只读缓存及回环过滤均不变。配置修正本身不证明
部署成功，后续真实结果必须单独记录。

The `--no-fetch-params` flag is not, by itself, an offline guarantee: the
pinned source skips proactive prefetch but retains on-demand resolution in
proof requests. Effective private-run isolation comes from the verified
outbound IP deny plus read-only cache. Public parameter provisioning happens
separately, without wallet SDK, credentials or witnesses. Do not disable
those isolation controls to let a private proving request download missing
material. The new cache check catches this setup error before another slow
wallet restoration.

no-fetch-params参数本身不保证完全离线：固定版本源码跳过主动预取，但证明请求仍有
按需解析。私密运行的实际隔离来自已经验证的出站IP拒绝及只读缓存。公共参数单独
补齐，不涉及钱包SDK、凭据或witness。不能为了让私密证明请求下载缺失材料而关闭
这些隔离控制。新增缓存核验会在再次耗时恢复钱包前发现这类配置错误。

After public cache correction, real local wallet fee proving/finalization
completes under the original caps. A subsequent pre-submission observer guard
reveals an incorrect64-hex transaction-ID assumption. Ledger8.1.0 transaction
identifiers are66hex characters: type00(Merged) or01(Unique), followed by32bytes.
They are not bare transaction hashes or a `0x` wrapper. The guard now validates
this exact format and requires a returned ID to match a recorded candidate.
A wallet-free real-SDK test reproduces the format and covers malformed IDs.
No commitment domain, template hash, chain format or automatic retry policy
changes. The rejected v3 guard never reaches the underlying submit call.

补齐公开缓存后，实际本地钱包费用证明／最终化在原上限内完成。随后提交前观察器
检查暴露错误的64位hex交易ID假设。Ledger8.1.0交易标识为66位hex：00（Merged）或
01（Unique）类型加32字节，不是裸交易哈希或0x封装。现已按精确格式校验，并要求
返回ID属于已记录候选。不加载钱包的真实SDK测试复现格式并覆盖异常ID。不改承诺
域、模板哈希、链格式或自动重试规则；v3的保护拒绝发生于底层提交调用之前。

## Final verified deployment result

The cache/ID-corrected run submits exactly one Preprod deployment and exits0
at17:51:33 Shanghai on16October. Independent token-only public reads verify
SucceedEntirely at block3004405, the exact Preprod constructor network binding,
unchanged original authority root version1/sequence1, all three thresholds2,
and zero templates, modules, instances or activation sessions. Contract address:
`7bf33bb7409fac2f85f6ad4e14a211707440b3ea36537c54085cf1157685cbdd`.
Source snapshots are rehashed unchanged. No template activation, private-input
upload, second submission, checkpoint persistence, commit or push occurs.

缓存及ID修正后的运行准确提交一次Preprod部署，于10月16日上海17:51:33以exit0结束。
独立仅凭provider token读取公开状态，核对区块3004405中SucceedEntirely、精确Preprod
构造网络绑定、未变化的原权限根version1／sequence1、三项阈值均2，以及模板、模块、
实例及激活会话均零。合约地址如上。源快照重算摘要确认未变；没有激活模板、上传私密
输入、第二次提交、持久化检查点、提交Git或推送。

Full-process monotonic duration558.263059seconds includes cold restore, asset
checks, sync, fee proving, submission and indexed verification; client peak
677834752bytes, swap0. The reused prover's cumulative peak88612864bytes/swap0
covers cache-fixed v3 and successful v4, not an isolated action proof. Complete
root checks pass342/342, including6Hardhat tests. All five owned local units
are stopped and port6300 is released. ECS separately finishes the existing
17:47 StopCharging schedule successfully, preserving disks/tools.

全进程单调耗时558.263059秒，含冷恢复、产物检查、同步、费用证明、提交及索引核验；
客户端峰值677834752字节、swap零。复用证明器累计峰值88612864字节／swap零覆盖
修正缓存后的v3及成功v4，不是独立动作证明。完整根检查342／342通过，含六项Hardhat。
五个自有本地unit均停止，6300端口释放；ECS另按既有上海17:47计划成功StopCharging，
保留磁盘及工具。

M6 is still incomplete: this verifies constructor deployment and the wallet
fee-proof path, not governance activation, ordinary authorization, receipts or
restart acceptance. The existing runner cannot resume the deployment across
runs; exact private fixture openings and freshly generated M4 reviewer keys
are not persisted. Midnight authority scalars in this acceptance script are
public deterministic test constants, not production governance keys.
A later governance scope creates a fresh fixture deployment and multiple
test transactions, requiring authority beyond this one-deployment approval.
This is an integration caveat, not permission to upload/persist signing keys
or silently activate templates in the completed deployment-only run.

M6仍未完成：本次验证构造部署及钱包费用证明，不等于治理激活、普通授权、收据或重启
验收。既有runner不能跨运行恢复该部署，精确私密fixture opening及新生成的M4审核
密钥不持久化；Midnight权限标量是公开确定性测试常量，不是生产治理密钥。后续
治理范围会创建新的fixture部署并提交多笔测试交易，需要超出本次单笔部署的授权。
这是集成限制，不授权上传／持久化签名密钥，也不允许在已完成的仅部署运行中擅自
激活模板。

## Approved governance run: partial result, not acceptance

The subsequent `approve` authorizes the17-transaction governance fixture
sequence, not ordinary-instance allocation. A new deployment succeeds at
Preprod block3004592, address
`8a4bf1770424eb78831605ef7a0464668a3dc475633455719bffe4acdbcef8ad`.
The next `proposeProofModule` contract proof provider completes in13.8202025
seconds and wallet balancing completes, but submission returns no confirmed
identifier before the worker fails. Retain both candidate identifiers and
reconcile them before retrying. At indexer tip3004872 neither proposal ID is
indexed, the queried node pending pool is empty, and modules/templates/instances
remain zero. Absence is not proof of final rejection. No module or template
activation is established;1of17planned transactions is confirmed.

随后approve授权17笔治理fixture交易，不包括普通实例分配。新部署在Preprod区块
3004592成功，地址如上。下一笔proposeProofModule的合约证明provider耗时
13.8202025秒，钱包配平完成，但worker失败前未返回已确认交易标识。保留两个候选
标识，重试前先对账。索引器高度3004872时，两者均未被索引、所查询节点待处理池
为空，模块／模板／实例均零。未查到不等于最终拒绝；没有模块或模板激活证据，
计划17笔中只确认1笔。

The existing submission guard intentionally withholds raw SDK errors; this
protects private data but currently loses the original rejection category.
Read-only reconciliation and separately guarded, non-submitting diagnostics
must not be described as governance acceptance. `system_dryRun` is advertised
but denied by the queried provider; metadata exposes runtime validity checking
through `state_call`. Diagnostic failures at wallet synchronization are also
separate from the original proposal outcome. Keep exact source/report hashes,
live resource samples and each failed attempt in
[preprod-governance-verification.json](preprod-governance-verification.json)
and the concrete development log. Do not enable raw SDK output, blind retry,
change the contract architecture or raise memory limits to obtain a pass.

既有提交保护有意屏蔽SDK原始错误，保护私密数据，但目前丢失原始拒绝类别。只读
对账及独立保护、不提交交易的诊断不能称为治理验收。查询provider虽列出
system_dryRun但拒绝调用，metadata提供经state_call执行的runtime有效性检查。
诊断在钱包同步阶段失败也须与原提案结果区分。上述证据文件及具体开发日志保留
精确源码／报告摘要、实时资源采样和每次失败。不为获得通过而开启SDK原始输出、
盲目重提、改变合约架构或提高内存上限。
