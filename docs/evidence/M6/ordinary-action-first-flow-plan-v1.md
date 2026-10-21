# First ordinary-action test plan v1

Status: two v9 attempts closed with zero submissions; v10 implementation and
validation are in progress under the approved governance consolidation plan.
The user requested the complete M6 ordinary-user
operation/state-change/chain-confirmation/receipt flow and explicitly approved
staged ordinary actions. This document records concrete scope; it does not claim
the user separately approved the number 40 or fabricate an approval record.

Use the existing disposable Preprod test-wallet identity and replaceable test
provider credential on the authorized Singapore ECS. Preserve the single-contract
ledger-8/compiler-0.31.1 trust model and private Workbench/loopback boundary. No
production wallet, customer data, real asset, RAM grant, public port or automatic
funding/registration is in scope. First verify the real key inventory, deployment
weight, exact network genesis, node/indexer subscriptions and configured prover.

| Operation | Maximum transactions | Cumulative maximum |
| --- | ---: | ---: |
| One new disposable v10 deployment | 1 | 1 |
| Module proposal, two reviews, two approvals, activation | 6 | 7 |
| Template admission begin, one binding, finalization | 3 | 10 |
| One instance allocation | 1 | 11 |
| Account issuance | 1 | 12 |
| Root capability certification: begin, seven scope values, finalization | 9 | 21 |
| Session certification: begin, seven scope values, finalization | 9 | 30 |
| Root participant-slot begin/finalization | 2 | 32 |
| Action begin, one slot ancestor, input, output, atomic finalization | 5 | 37 |
| Template retirement/revocation and module emergency revocation | 3 | 40 |

The transport enforces one deployment, one action per transaction, the same
exact resulting contract address, per-entry budgets and the total cap. It makes
no automatic submission retries. It records candidate public identifiers before
submission; a failure or uncertain outcome requires reconciliation before any
further execution. The previous 25-transaction contract ended revoked and is
not reused or counted as authorization for this new deployment.

The v10 governance dispatcher combines authority-root approvals, module proposals,
reviews and lifecycle commands. It preserves all logical-operation budgets; root
rotation remains outside this first-flow plan. Public proof entries decrease
from 13 to 10. The byte-identical ordinary-action implementation retains its v9
implementation-reference domain/profile, bound to the exact network, deployment
and registered code hash; the overall governance ABI and SDK contract tag are v10.
Receipt v1 and its ledger layout remain unchanged. Genuine-key actual-node cost
checks and exact balanced-transaction validation are required before submission.

All credentials, openings, selected private synthetic values, action arguments,
wallet checkpoints and pre-balancing proof artifacts remain in the owned root-only
private directory. Each wallet process exits before the next application proof;
the temporary key/payload worker exits before HTTP proving. Persist completed
unbound application proofs privately before resetting only the owned prover.
Keep all original public artifacts and verify downloaded results before finishing
the ECS activity record. Refresh the verified two-hour stop timer at least every
30 minutes, including while coordinating work or downloads.

Acceptance for this slice requires actual M4/M5 API issuance, no authority/state/
nullifier/receipt effect from preparation, one successful final state transition,
and one exact common receipt. The authenticated indexer adapter must reconcile
the serialized successful finalized transaction, exact contract/entry, call-time
state and absence/insertion operations for that receipt. An old receipt in latest
state cannot pass. Confirm cleanup leaves the test template/module revoked and
the historical receipt intact. This is not full M6, end-user resource/latency,
UI, independent consensus-light-client, malicious-proof or restart acceptance.

---

# 中文翻译

状态：两次 v9 尝试均在提交前结束，提交数量为零；现按已批准的治理入口合并方案实施并验证
v10。用户要求跑通 M6 普通用户操作、状态变更、链上确认和收据生成
的完整流程，并已明确批准分阶段普通操作。本文记录具体范围，不声称用户另行批准了
40 这个数字，也不伪造批准记录。

在获授权的新加坡 ECS 上使用现有的一次性 Preprod 测试钱包及可替换测试 API 凭据，
保持单合约、ledger-8／编译器 0.31.1 信任模型和私有 Workbench／回环边界。不使用生产
钱包、客户数据、真实资产，不扩充 RAM 权限、不开放公网端口、不自动领币或注册。
先核验真实密钥清单、部署权重、准确网络创世哈希、节点／索引器订阅及证明服务。

v10 交易上限逐项为：新部署 1；模块提案／双审核／双批准／激活 6，累计 7；模板准入 3，
累计 10；分配 1，累计 11；账户签发 1，累计 12；根能力 begin／七项范围／finalize 共
9，累计 21；会话相同步骤 9，累计 30；根槽位开始／最终确认 2，累计 32；操作开始、
一层槽位、输入、输出和原子最终确认共 5，累计 37；模板退役／撤销和模块撤销 3，累计
40。传输层限定单部署、每笔一个操作、同一准确合约地址、逐入口预算及总上限，不自动
重试提交。发送前记录候选公开交易 ID；失败或结果不明时，继续前必须核对结果。旧
25 笔测试合约已撤销，不能复用，也不作为新部署的授权。

v10 将权限根批准、模块提案、审核及生命周期合为统一治理入口，保留各逻辑操作的次数
限制；权限根轮换不在首次流程范围内。公开证明入口从 13 减为 10。字节完全一致的普通
操作实现保留其 v9 实现引用域／配置，仍绑定准确网络、部署和注册代码哈希；整个治理
ABI 和 SDK 合约标签升为 v10。收据 v1 及账本布局不变。提交前必须核验真实密钥的实际
节点成本，并通过准确平衡交易的只读验证。

凭据、私有状态开口、合成选定内容、操作参数、钱包检查点及平衡前证明只存于本任务
root 私有目录。下一次应用证明前退出钱包进程，HTTP 证明前退出临时密钥／载荷 worker；
重置本任务证明服务前先私下保存已完成的未平衡证明交易。保留原公开产物，下载并核验
结果后才结束 ECS 活动记录。工作、协调和下载期间至少每 30 分钟刷新经核验的两小时
停机期限。

本段验收要求实际调用 M4／M5 API 签发；准备阶段不授权、不改变状态、不消耗 nullifier、
不生成收据；最终交易成功变更状态并生成一份准确通用收据。认证索引适配器必须核对
准确成功且最终确认的序列化交易、合约／入口、调用时状态及该收据先不存在再插入的操作，
不能从最新状态中的旧收据推断本次成功。清理后测试模板和模块应撤销，历史收据仍保留。
这不代表完整 M6、用户端资源／时延、UI、独立共识轻客户端、恶意证明或重启验收。
