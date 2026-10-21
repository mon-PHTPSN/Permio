# Remaining Preprod acceptance scope — approved

The user approved this scope on 19 October 2026 by replying "ok" after its
contract, server and 100-attempt boundaries were explained. The isolated server
preflight passed with zero submissions. Current execution counts and exact
source/network/runtime evidence are recorded under
`logs/m6-remaining-preprod-20261019/`; approval is not milestone acceptance.

The completed first-flow approval is exhausted: 62/62 native submissions finalized
on `9a5b8e294e61463c5ce5948ba0120479dd69a582e0e7fc5f84c8c9c4197af3bc`.
Its template and exact state-transition module are revoked and its signed session
expired. Historical records remain readable. No part of this plan has submitted
a new transaction at approval time. The separately tracked ECS continuation
subsequently began under that approval.

The current source disallows proposing an already registered exact module
identity and disallows revoked→active lifecycle transitions. The action entry
supports the frozen module version 1.0.0. Reviving the old module, inventing a new
implementation hash for unchanged code, or weakening these checks would not be
an acceptable test setup. A clean test deployment allows the remaining stateful
and non-transitioning tests with the unchanged v10 ABI and ordinary profile v9.

Proposed authorization is **at most 100 additional native submission attempts**,
including at most one fresh disposable v10 contract deployment, two built-in
module registrations, two synthetic exact template activations, and two
application instances. The earlier 62 remain historical; the combined ceiling
would be 162. These are our test guardrails, not an infrastructure limit.

| Phase | Maximum native attempts |
| --- | ---: |
| One fresh contract deployment | 1 |
| Two existing module families: proposal, two reviews, two approvals, activation each | 12 |
| Two templates: admission begin, one exact binding, finalization each | 6 |
| Two application instance allocations | 2 |
| Each account + root capability + session: 1 + 9 + 9 | 38 |
| Each root slot: begin and finalization | 4 |
| Stateful conflict pair: two four-call preparations and one successful finalization | 9 |
| Non-transitioning action: four preparation calls and one finalization | 5 |
| Two authority-root approvals and at most two credential-status updates | 4 |
| Two template retirements/revocations and two module emergency revocations | 6 |
| Explicit negative submission attempts, including the losing state transition | 13 |
| **Total ceiling** | **100** |

Before ordinary-instance allocation, the internal phase allocation was refined
within the same approved 100-attempt ceiling: 96 normal calls and four native
negative attempts. The refinement adds separate preparation/control transactions
for attributable stale-root tests, a second non-transitioning candidate, and two
expired-session cleanups. It uses one credential revocation. The exact revised
counts and rationale are recorded in
`logs/m6-remaining-preprod-20261019/internal-phase-allocation-v2.json`; the original
87/13 plan above remains historical. Other mutations are explicitly generated-
circuit checks against actual indexed Preprod state, not native transactions.
One unusable pending non-transitioning preparation is retained as test history
under the subsequently revoked template and module. No contract, server, trust,
ABI, receipt, or aggregate-attempt boundary changes.

The runner must compute and freeze a per-entry/per-phase manifest from the exact
generated fixtures before any submission. If scope needs more calls, it must
stop at the budget boundary. Failed, rejected and uncertain native submission
attempts all consume this ceiling. There are no automatic native retries. A
wallet/node timeout requires exact-ID reconciliation before any next attempt.
Create and sign each fixture just before its test phase, with a verified validity
window covering the measured proving/setup cost. Never extend or reuse an expired
signed session. Verify disk headroom and a checksum-backed restoration plan before
temporarily offloading any already backed-up public duplicate to make swap room.

The matrix includes competing state transitions, action/nullifier replay after
cold reconnect, stale authority/status roots, revoked credentials/templates/
modules, expired intent, and recipient/purpose/resource/evidence substitutions.
Generated-circuit preflight rejection, exact-node read-only validation rejection,
and native node rejection are recorded separately. Wrong DUST inputs, transport
failures, expiry masking another condition, or a generic rejection do not prove
the intended security property. Only exact attributable results close a gate.

Only the existing dedicated disposable Preprod test identities/provider and
test DUST may be used. Before deployment, verify exact network/genesis, genuine
existing keys and source hashes, node cost and exact balanced-transaction
validation. Preserve compiler 0.31.1, single-contract trust, receipt v1, all
authority/signature checks and prospective revocation. Synthetic test approvals
do not substitute for the required independent human security/privacy review.

Use the existing 16 GiB Singapore host with the already tested bounded prover
and swap arrangement. Refresh its verified two-hour economical stop while used;
download and verify outputs, restore temporary resources, then leave a final
two-hour stop. No new server, memory upgrade, RAM grant, public developer port,
production asset, automatic funding, protocol-family invention or proof-key
toolchain upgrade is authorized by this proposal.

## Checkpoint continuation refinement

The measured timing guard in `logs/m6-remaining-preprod-20261019/signed-window-forecast-v1.json`
rejects the original first-instance ordering: about 278 minutes for a signed window
of about 230 minutes. An owned guard will pause the original test only after all 45
transactions are confirmed and its final preparation and fee-wallet checkpoints
are saved. The continuation must reconcile every exact finalized transaction and
pass the real generated action circuit before submitting round 46. No completed
call is resubmitted, and the first signature's expiry stays unchanged.

The same 96 normal + 4 negative budget is reordered: first complete the stateful pair,
then use the second instance for the once-valid stale-authority candidate and
root rotation before its non-transitioning/status pair. Rounds 89..96 retain
their previous roles. The final four calls deprecate and then revoke each module;
these replace the two optional expired-preparation cleanups. All three unused
preparations remain fail-closed history under revoked templates/modules. This
adds live deprecated-state coverage without increasing the approved total.
Snapshot 6 completes only rounds 46..51 after the verified 45-call checkpoint:
four competing-action preparation calls, the state-changing winner and the
independent competing rejection. Its transport ceiling is 51 and it cannot
allocate the second instance. Snapshot 7 is prepared separately and resumes
the exact 51 outcomes without replaying the first flow.

The fresh second disposable instance may last six hours. Its root capability
starts one hour after account setup and still lasts at most the existing
template's four hours. Account/root certification and the creator's root-slot
assignment precede session issuance. The workflow waits for the actual
capability start time before calling the real M5 session API; it never changes
the clock, extends an existing signature or grants permission by preparation.
Its session ends before that capability expires. The second order is allocation
52, account/root 53..62, slot 63..64, session 65..73, then the unchanged 74..100
roles described above.

Small proofs may select 2..4 CPU threads with 11.5 GiB soft RAM and 14.5 GiB hard RAM;
the largest action remains one thread/13.5 GiB soft RAM. The actual requested and
verified profile is recorded on every reset. Host RAM, swap, proof binary,
contract, circuit, ABI, receipt, instance count and 100-attempt ceiling do not
change. Snapshot 3 remained frozen while active; prepared snapshots 4 and 5 were
not run. Snapshot 6 was installed only after all 45 confirmations, saved private
checkpoints and verified cleanup. A redundant stop of an already stopped
transient client interrupted the original cleanup; the exact owned prover,
temporary swap and cache were subsequently removed and independently verified,
with the original swap file preserved. Snapshot 7 may be installed only after
the first-flow phase closes at 51 and both historical binding-program controls
pass read-only qualification. The module-row public-VM audit holds the original valid clock and
is explicitly separate from native fee/crypto validation. Exact per-entry counts
are in `logs/m6-remaining-preprod-20261019/internal-phase-allocation-v4.json`:
18 governance calls and 20 action preparations, preserving 96 normal plus four
native negative attempts. This is a test-order/resource refinement within the
existing scope.

## Current execution correction — same approved 100/two-instance boundary

Snapshot 6 finalized 50 actual submissions. Its reservation 51 was balanced but
never submitted: the harness incorrectly required pool rejection for a call
whose complete contract program is in one fallible transcript. The original
signed window expired. Preserve that reservation and all original bytes; mark
it explicitly abandoned only after stopped-job, exact-byte, expiry and absent-
indexed-identifier checks. Never submit or replay those expired bytes.

Pool acceptance does not establish contract authorization. An included negative
now requires exact indexed bytes, `FailFallible`, the intended failed contract
segment and an unchanged complete contract state. Definite attributable native
RPC rejection remains a distinct outcome. Transport/fee/weight/expiry failures
and `SucceedEntirely` never pass. A genuine finalized public transaction is the
regression fixture for the separate fee intent and actual contract segment.
Included negative fee effects are retained in the wallet checkpoint.

Snapshot 8 passed 428 local checks with no failures or skips. It resumes after
the 50 confirmed submissions and abandoned reservation 51, using identifiers
52..92 for at most 41 further native calls: 38 normal calls and three negative
outcomes. It stops with at most 91 actual submissions, two instances and two
receipts. The existing 100-attempt and two-instance approval remains enforced;
an abandoned identifier is not a native attempt. Final retirement/revocation is
deferred to preserve the remaining conflict-test opportunity. All snapshot 7
packets were staged but never applied and are superseded.

The separate `fallible-outcome-recovery-plan-v1.md` proposes 131 total attempts
and a third instance. It awaits the user's decision and grants no authority by
itself. The current second-only runner cannot allocate that third instance.
The first action's receipt and 127 scanned public artifacts were recovered;
all 128 packaged files, including the scan report, were downloaded and verified.

# 中文翻译

用户于 2026 年 10 月 19 日在理解合约、服务器及最多 100 次尝试的范围后回复“ok”，
批准本方案。隔离的服务器预检已通过，提交数量为零。实际执行次数和准确源码、网络、
运行证据记录在上述日志目录中；批准方案不代表里程碑已验收。

首条流程的授权已用完：现有合约全部 62 笔原生提交均最终确认，模板及准确状态变更模块
已撤销，签名会话已过期，历史仍可查询。批准时本方案尚未提交新交易或启动 ECS 工作；此后已在该授权范围内开始执行。

当前源码禁止重新注册同一准确模块身份，也禁止把已撤销模块重新激活；操作入口支持固定
模块版本 1.0.0。不能复活旧模块、为未改变代码虚构实现哈希或放宽检查来继续测试。
因此提议新建一次性测试合约，保持现有 v10 ABI 和普通操作 v9 配置不变。

提议额外授权最多 100 次原生提交尝试，含最多一次新测试合约部署、两个既有模块注册、
两个合成准确模板激活、两个应用实例。此前 62 笔保留为历史，合计上限为 162。
这是自定测试保护范围，不是基础设施限制。上表逐项列出预算，含部署／正常步骤最多
87 次，以及包括冲突失败方在内最多 13 次负例提交。

发送前必须根据准确生成用例计算并冻结逐入口、逐阶段预算清单。超出范围立即停止；
失败、被拒绝及结果不明的原生提交均计入上限，不自动重试。钱包／节点超时必须先按
准确交易 ID 核对，再执行下一项。
每个阶段临近执行时再生成并签署用例，核验有效期足够覆盖实测证明／准备耗时，不延长或
复用过期签名会话。若需临时移出已备份的重复公开文件来腾出交换空间，先核验磁盘余量、
校验值及完整还原方案。

覆盖状态冲突、冷启动重连后的操作／nullifier 重放、过期权限根和状态根、撤销凭据／
模板／模块、过期意图及接收方／目的／资源／证据替换。生成电路预检、节点只读校验和
原生提交拒绝分别记录。DUST 输入错误、网络故障、过期掩盖其他条件或泛化拒绝都不能
证明目标安全性质；只有原因明确的准确结果才能关闭验收项。

仅使用现有专用一次性 Preprod 测试身份、API 凭据及测试 DUST。提交前核验准确网络、
真实密钥和源码、节点成本及准确平衡交易。保留编译器 0.31.1、单合约信任、收据 v1、
全部权限／签名检查和前瞻撤销语义。合成测试审批不能替代独立人工安全与隐私审查。

继续使用现有 16 GiB 新加坡服务器和已测试的受限证明器／交换空间。使用期间按规定
刷新两小时节省停机，下载核验结果并还原临时资源，完成后留下最后两小时停机。
本提案不授权新服务器、内存升级、RAM 扩权、公开开发端口、生产资产、自动领币、
新证明家族或证明密钥工具链升级。

普通实例分配前，在同一已批准的 100 次总上限内，内部阶段预算细化为正常调用最多 96 次、原生负例 4 次。额外准备交易用于隔离过期权限根、过期状态根与并发冲突，另包含第二个不改变状态的候选操作、两次过期准备清理，以及一次凭据撤销。准确预算和原因记录在上述 v2 JSON 中；原 87／13 表保留为历史。其他篡改检查明确标记为基于真实 Preprod 索引状态的生成电路检查，不冒充原生提交。一个不可用的准备记录保留在随后被撤销的模板和模块下，作为测试历史；合约、服务器、信任、ABI、收据和总提交范围均未扩大。

检查点继续执行细化：实测时间预算检查发现，原第一实例顺序约需278分钟，签名窗口只有约230分钟。专属保护程序只会在全部45笔交易确认、最终准备和付费钱包检查点保存后，暂停原测试进程。继续执行前必须逐笔核对准确确认交易，并让已保存的操作通过真实生成电路。不会重放已完成调用，也不会延长或复用过期签名。

仍保持96笔正常调用、4笔原生负例：先完成状态变更及冲突测试，再于第二实例上完成曾经有效的旧权限根候选、权限根轮换，以及不改变状态／旧状态根候选。第89至96笔用途保持不变；最后四笔分别将两个模块弃用、再撤销，替代两笔可选的过期准备清理，在同一总上限内增加真实弃用状态覆盖。三份未使用准备均保留在已撤销模板／模块下，作为不可授权的历史。快照6仅执行第46至51笔：四笔竞争操作准备、状态变更成功方和独立冲突拒绝。其传输层上限为51，不能分配第二实例。快照7单独准备，在逐一核对51次结果后继续，不重放首条流程。

第二个一次性实例可持续六小时。其根能力从账户配置一小时后开始生效，持续时间仍不超过现有模板的四小时。账户与根能力认证、创建者根槽位分配先于会话签发。程序等待真实时间到达权限生效时刻后，才调用真实M5会话API；不修改时钟、不延长已有签名，也不把准备当成授权。会话先于根能力到期。第二阶段顺序为：52分配，53至62账户／根能力，63至64槽位，65至73会话，随后74至100用途不变。

小型证明可选择2至4个CPU线程，软内存11.5GiB、硬内存14.5GiB；最大操作证明保持单线程、软内存13.5GiB。每次重置记录并核验实际配置。主机内存、交换空间、证明程序、合约、电路、ABI、收据、实例数量及100次提交上限均保持不变。原任务活动时冻结源码快照3；准备过的快照4和5均未执行。快照6在45笔全部确认、私密检查点保存及清理核验后安装。原清理曾因重复停止已停止的临时客户端而中断，随后已移除并独立核验本任务的准确证明器、临时交换文件和缓存，同时保留原有交换文件。快照7只能在首条流程于51次尝试后结束，且两份历史绑定程序通过只读对照核验后安装。模块记录公开虚拟机审计固定原有效时钟，明确区别于原生费用／密码学校验。上述v4预算JSON记录正常治理调用18笔、操作准备20笔，仍合计正常96笔、原生负例4笔。这是在既有授权范围内调整测试顺序和资源配置。

## 当前执行修正：保持原有 100 次／两个实例的授权

快照 6 已确认 50 次真实提交。预留项 51 只完成费用平衡，从未提交：测试程序错误地
要求交易池拒绝交易，而整个合约程序位于一个可失败阶段。原签名窗口已过期。保留其
预留记录和原始字节；仅在核验进程停止、字节准确、签名过期及索引中无对应标识后，
显式标记为未提交即放弃。绝不提交或重放过期字节。

交易池接受不能证明合约授权。入块负向结果必须具有准确索引字节、`FailFallible`、
目标合约阶段失败及整个合约状态不变的证据。可归因的原生 RPC 拒绝单独记录。连接、
费用、权重、过期等失败及完整成功均不能算通过。使用真实已确认的公开交易回归验证
独立费用意图和准确合约阶段；入块负向交易产生的费用影响会保存在钱包检查点。

快照 8 的 428 项本地检查全部通过，没有失败或跳过。它在 50 次已确认提交和预留项
51 放弃后，使用 52..92 标识继续最多 41 次真实调用：38 次正常调用和三次负向结果。
达到最多 91 次真实提交、两个实例、两份收据后停止。仍执行原有 100 次和两个实例的
授权；放弃的标识不算原生提交。暂缓最终退役／撤销，以保留剩余冲突测试的执行机会。
所有快照 7 数据包仅暂存，均未应用，现已被替代。

另行准备的恢复方案提议总计 131 次和第三个实例，仍等待用户决定，文档自身不产生
授权。当前第二实例专用程序无法创建第三个实例。第一条操作的收据及 127 个扫描通过
的公开文件已恢复；包含扫描报告在内的 128 个打包文件已全部下载并核验。
