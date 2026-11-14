# Fresh application-instance continuation on the existing contract

Status: explicitly approved by the user in this chat on 2026-10-19: total 62 on the same contract. Implementation and preflight must finish before the fresh four-hour window starts.

The existing disposable Preprod contract is
`9a5b8e294e61463c5ce5948ba0120479dd69a582e0e7fc5f84c8c9c4197af3bc`.
It has 32 submitted and finalized transactions, one deployed contract, one
allocated application instance, three certified credentials and an admitted root
slot assignment. Its ordinary-action receipt and nullifier counts remain zero.
Transaction 32 is `00d5c339db05b193aa4c669fb8093fcb7ea274e703ceece58f8277467ade9cac31`,
finalized at block3039271. Its instance state sequence is4.

The recovery client restored serialized scope data without rebuilding its
`pathForHash` methods and stopped before preparing or submitting transaction33.
The recovery now rebuilds all seven Merkle trees from the original M5 scope and
requires their roots to match the already-certified credentials. Four targeted
scope-recovery and wallet-budget tests pass, and TypeScript checking passes.
The prior full repository run passed389 checks. This does not establish an
ordinary-action chain receipt.

The existing signed test session expires at approximately2026-10-19 04:49
Asia/Shanghai. The two actual slot proofs took363719ms and332167ms. Four action
preparation proofs plus the prior24.35-minute largest-proof benchmark already
exceed the reliable remaining window, before wallet work and recovery. No
expiry, signature, proof, ancestry or on-chain time check will be bypassed.

The proposed continuation preserves the existing contract, active module,
admitted template, genuine keys, governance ABI10, ordinary-action profile9,
receiptv1 and all permission checks. It creates one fresh application instance
inside that contract. This is a new application record, with no new ECS server
or contract deployment. Preserve the old instance and its history.

The previous approval cap was40. The proposed total cap is**62**, comprising the
32 confirmed transactions and at most30 further transactions:

| Operation | Additional transactions | Global transaction numbers |
| --- | ---: | --- |
| Allocate one fresh application instance | 1 | 33 |
| Issue its context-account credential | 1 | 34 |
| Certify root capability: begin, seven scope elements, finalize | 9 | 35–43 |
| Certify session: begin, seven scope elements, finalize | 9 | 44–52 |
| Prepare and finalize root slot assignment | 2 | 53–54 |
| Action preparation: begin, ancestor, input, output | 4 | 55–58 |
| Atomic action/state/nullifier/receipt finalization | 1 | 59 |
| Retire/revoke template and emergency-revoke module | 3 | 60–62 |
| **Total** | **30** | **32+30=62** |

This is an operator approval cap, not an Alibaba Cloud or Midnight infrastructure
limit. Do not replay any of the32 transactions. No automatic native submission
retries, extra deployments, funding, registration, RAM grants, server upgrade or
public development ports are included. An uncertain outcome requires exact-ID
reconciliation before further execution.

Use a fresh four-hour instance lifetime and fresh private IDs/openings. Keep the
existing template's14400-second capability-duration limit. Preserve the original
three status leaves; use previously empty indices10,11,12 for the new account,
capability and session. Reconstruct and compare the namespace status root before
any write. The new instance starts at state sequence0; final ordinary receipt
sequence remains5. Final read-only acceptance expects two instance records,
exactly one ordinary receipt/nullifier, and no unfinished preparation sessions.

Reuse the existing SDK's `withRestoredPreprodWallet` session across the smaller
credential/slot/preparation calls, bounded to their exact entries and numbers.
Use only the same disposable fee-wallet identity. Its root-only Unix socket
adds no public listener or on-chain authority. Page the idle wallet during
application proofs; retain the16GiB host,14.5GiB prover RAM cap and14.875GiB shared
swap. Export its private checkpoint and verify its process has exited before the
largest action proof. That proof and final transaction use the existing isolated
wallet path. Preserve exact-byte node validation and one-shot submission.

Before starting: complete the recovery regressions and updated protocol tests,
verify the genuine assets and private service boundary, reconcile all32 finalized
IDs, verify the actual current ledger and fresh DUST readiness, and refresh the
two-hour ECS deadline. Afterward, perform an independent cold receipt read,
download/hash-check public evidence, restore all offloaded public files, and
leave a final verified two-hour economical-stop deadline. Full M6 acceptance
remains open beyond this first ordinary flow.

---

# 中文翻译

状态：用户已于2026-10-19在本聊天明确批准，同一合约总计62笔。完成实现和预检后才开始新的四小时有效期。

现有一次性 Preprod 合约为
`9a5b8e294e61463c5ce5948ba0120479dd69a582e0e7fc5f84c8c9c4197af3bc`。
目前32笔交易均已提交并最终确认；只有一个已部署合约，包含一个应用实例、三份已认证
凭据和一个已生效的根槽位分配。普通操作收据及 nullifier 均为零。第32笔交易为
`00d5c339db05b193aa4c669fb8093fcb7ea274e703ceece58f8277467ade9cac31`，
在区块3039271最终确认；该实例状态序号为4。

恢复客户端重建了序列化作用域数据，却遗漏了 `pathForHash` 方法，在准备或提交第33笔
交易前退出。修复会根据原始 M5 作用域重建七棵 Merkle 树，并要求其根与已经认证的凭据
一致。四项作用域恢复和钱包预算针对性测试通过，TypeScript 检查通过。此前完整仓库检查
389项通过；这些不等于普通操作链上收据验收。

原有已签名测试会话约在北京时间2026-10-19 04:49到期。两次真实槽位证明耗时363719毫秒
和332167毫秒。四次操作准备证明加上此前最大证明24.35分钟的实测基准，已超过可靠的剩余
时间窗口，尚未计入钱包和恢复工作。不会绕过有效期、签名、证明、祖先或链上时间检查。

新方案保留现有合约、活动模块、已接纳模板、真实密钥、治理 ABI10、普通操作配置9、
收据v1及全部权限检查，在同一合约内创建一个新的应用实例。它是应用记录，不新增 ECS
服务器，也不重新部署合约。保留旧实例及其历史。

此前批准上限为40笔；现请求总上限62笔，即已确认的32笔加最多30笔：新应用实例分配1笔
（第33笔）、账户凭据1笔（34）、根能力认证9笔（35–43）、会话认证9笔（44–52）、根槽位
准备及最终分配2笔（53–54）、操作准备4笔（55–58）、原子操作／状态／nullifier／收据
最终确认1笔（59）、模板退役／撤销及模块紧急撤销3笔（60–62）。合计32+30=62。

这是操作授权上限，并非阿里云或 Midnight 的基础设施限制。前32笔不重放，不自动重试
原生交易提交，不增加部署、领币、注册、RAM 权限、服务器配置或公网开发端口。结果不明时
先按准确交易标识核验，再继续。

新实例从当前时间起使用四小时有效期及新的私有标识和开口，保留模板14400秒能力有效期
上限。保留原三条状态叶子，新账户、能力和会话使用此前为空的索引10、11、12；写入前
重建并核验命名空间状态根。新实例状态从0开始，最终普通收据序号仍为5。最终只读验收
要求两个实例记录、恰好一份普通收据和一个 nullifier，且没有未完成的准备会话。

较小的凭据、槽位及操作准备调用复用现有 SDK 的 `withRestoredPreprodWallet` 会话，严格
限定入口及编号，只使用原有一次性费用钱包。仅 root 可访问的 Unix socket 不新增公网
监听或链上权限。应用证明期间让空闲钱包分页，继续使用16GiB主机、14.5GiB证明内存上限
及14.875GiB共享交换空间。在最大操作证明前导出私有检查点，并核验钱包进程已退出；
最大证明和最终交易沿用原有隔离钱包路径，保留准确字节的节点验证及一次性提交。

启动前完成恢复回归及更新后的协议测试，核验真实资产和私有服务边界，核验全部32笔
最终确认、当前实际账本及新鲜 DUST 就绪状态，刷新两小时 ECS 停机期限。完成后独立冷读
收据，下载并核验公开证据哈希，恢复全部临时移出的公开文件，保留最后一次经核验的两小时
节省停机期限。此普通流程之外，完整 M6 验收仍未结束。
