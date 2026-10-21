# M6 deployment weight decision — approved for implementation

Date: 2026-10-18. The user approved governance-entry consolidation in this chat.
Implementation is in progress; validation and chain acceptance are pending. No deployment
or transaction was submitted during the two first-flow attempts. The ordinary
action/state change/finalized common receipt acceptance remains unfinished.

## Verified problem

The real 13-entry v9 deployment was balanced successfully, including a genuine
DUST proof. Its preserved native transaction is 35,232 bytes; the SDK's unsigned
Substrate wrapper is 35,243 bytes. Correctly encoded read-only runtime validation
returns `Invalid.ExhaustsResources`. The unsigned remark control returns
`Invalid.Call`, distinguishing a real validation result from an encoding trap.

Actual Preprod runtime metadata reports spec version 1000300, transaction version
3, normal maximum extrinsic reference time 1,299,891,843,000, normal maximum
length 786,432 bytes, and maximum block reference time 2,000,000,000,000.
The actual runtime's `getTransactionCost` returns 1,488,360,000,001 for the exact
balanced deployment: its ledger cost alone is approximately 14.5% above the
normal per-extrinsic reference-time limit, before any node overhead. Its byte
length is below the byte cap. This is a chain resource boundary, not the ECS
memory limit, wallet balance, or our transaction-count guard.

The queried node reports serialized ledger version `8.1.1`; the pinned client
ledger package is `8.1.3`, Compact 0.31.1 and Compact runtime 0.16.0. This records
observed versions; rejection before ledger execution does not prove full
application-proof compatibility. No upgrade is proposed on that evidence alone.

Evidence in `logs/m6-ordinary-action-v9-key-build-ecs-20261018/`:

- `runtime-validation-encoding-controls-v1.json`: exact raw encoding and controls.
- `node-deployment-limits-v1.json`: actual runtime limits and APIs.
- `ledger-deployment-cost-v1.json`: actual candidate ledger cost.
- `local-assets-verification.json`: all 13 real verification/proving key hashes.
- `full-root-check-v2.json`: existing 382 passing checks; these do not establish
  live chain acceptance.

The original validation helper double-encoded the extrinsic's SCALE length via
the metadata byte-vector codec, producing an RPC/Wasm trap. That separate helper
bug is corrected and regression-tested. The corrected raw call still rejects
this deployment for resources. There is no automatic submission retry.

## Recommended bounded change

Version the public contract ABI from v9 to v10 and consolidate these four public
proof entry points into one fixed-operation governance dispatcher:

1. `submitAuthorityRootApproval`
2. `proposeProofModule`
3. `reviewProofModule`
4. `governProofModule`

The dispatcher selects exactly one logical operation per transaction and invokes
the same internal checks. It must preserve the separate signed message domains,
signer roles, review/approval thresholds, authority-root binding, proposal
identity, counters, expiry, revocation and map updates. No dispatch branch may
bypass another branch's prerequisites or accept ambiguous/multiple operations.

This reduces public proof entry points from 13 to 10. It is a measured-next-step
proposal, not a promise that 10 fits: a larger dispatcher key can affect cost.
Keep all other M6 functionality, the single-contract trust model, complete
capability and participant-slot ancestry, current-root checks, scoped nullifier,
and the one atomic ordinary-action finalization unchanged. Preserve common
receipt v1; update generated ABI, SDK adapters and fixtures explicitly to v10.
Do not introduce a second receipt format, privileged action keeper, maintenance
authority, verifier omission, shorter ancestry or weaker signature checks.

The logical first-flow sequence remains at most 40 test-DUST transactions on
one new disposable deployment; the four governance entry budgets become one
combined dispatcher budget while retaining per-logical-operation limits. No
automatic submissions/retries, additional deployment, production activation,
RAM permission expansion, server upgrade or public API exposure is included.
The historical revoked 25-transaction contract remains unrelated.

## Validation before any submission

Compile with the pinned toolchain; build genuine dispatcher keys within the
existing 16 GiB/swap resource envelope. Reuse another key only when its exact
compiled program bytes match the recorded genuine key manifest. Verify all
assets, ABI/adapters and full acceptance tests. Add cross-branch signature,
wrong-operation, threshold and authority-root negative cases, and check that
each operation has the same intended ledger effects as before consolidation.

Measure the real constructor with all 10 genuine verifiers against the actual
node cost/weight parameters before wallet work. Then balance once and require
successful read-only validation of those exact balanced bytes before the first
submission. Leave practical weight headroom; a near-limit or rejected candidate
does not authorize another architectural change. Record its cost and return to
the user if this direction still cannot meet the limit or resource envelope.

After those gates, continue the existing first-flow plan and require actual M5
issuance, inert preparation, atomic state/nullifier/receipt effects, successful
finalized transaction, exact authenticated indexer receipt reconciliation, and
revocation cleanup. Until then, M6 and the requested first flow remain incomplete.

## Implementation and validation evidence, 2026-10-18

The approved v10 dispatcher has been implemented. All nine unaffected proof
programs are byte-identical to v9; the new genuine dispatcher key measures k=19,
276,527 rows. All ten genuine asset pairs are hash-verified locally and on the
authorized ECS. The full repository check passed 386 tests with zero failures,
including cross-operation signature rejection and the existing threshold,
authority-root, lifecycle, ordinary-action and receipt suites.

Actual-node unbalanced constructor cost is 1,190,360,000,001 plus 20,000,000,000
node overhead, below the 1,299,891,843,000 normal extrinsic limit with 6.88%
headroom. A read-only comparison of the preserved v9 candidates measured an
8,960,000,000 DUST-balancing increment. The preflight therefore reserves
18,000,000,000 for balancing and requires at least 5% headroom on the actual
balanced deployment, in addition to successful exact-byte node validation.
An initial arbitrary 10% preflight threshold was replaced by this measured
reserve; this does not change the approved architecture or transaction scope.

The v10 governance ABI and SDK contract tag are new. The exact unchanged ordinary
action implementation keeps its frozen v9 implementation-reference profile,
with network, exact deployment and registered code hash binding. Receipt v1 and
its public ledger layout remain unchanged. This is not reuse of the old revoked
contract or acceptance of an old receipt.

Corrected zero-transaction private-service preflight passed, including actual
node/indexer subscriptions, real keys and built-in prover cache readability.
The first generated controller checksum mismatched Windows newline encoding;
the corrected controller hashes the actual transferred bytes and its subsequent
preflight succeeded. The first-flow run is active, with no chain acceptance or
receipt success yet claimed. Evidence is in
`logs/m6-governance-v10-assets-20261018/`; the full test log is
`logs/m6-v10-full-root-check-20261018-r2.txt`.

## Other options and decision boundary

Keep v9 unchanged: preserve all current code/keys, but this candidate cannot pass
the observed normal transaction weight limit. More ECS memory cannot change it.

Native incremental verifier installation followed by freezing maintenance
authority is an investigation alternative only. Its exact pinned-ledger API,
freezing guarantees, deployment sequence and temporary bootstrap authority have
not been verified; it is not approved or selected here. Removing required M6
operations, dividing the trust model across contracts or increasing network
limits is not part of the recommended change.

The canonical workspace `AGENTS.md` says: “do not independently adopt an
alternative architecture or workaround” and “consult the user before changing
the architecture.” Consolidation changes public proof entry points and ABI;
the user's approval now permits implementation of this exact plan. Public diagnostics, result downloads
and restoration of temporarily offloaded public files may continue meanwhile.

---

## 中文翻译

用户已在本聊天批准治理入口合并，现开始实施；验证和链上验收尚未完成。两次完整流程尝试均未提交部署或交易，普通操作、
状态变更、最终链上确认和通用收据验收仍未完成。

真实 13 入口 v9 部署已完成平衡并成功生成 DUST 证明。原生交易 35,232 字节，SDK 的
Substrate 包装为 35,243 字节。正确编码的只读验证返回 `Invalid.ExhaustsResources`；
无签名 remark 对照返回 `Invalid.Call`，说明已经获得真实验证结果。

实际 Preprod 运行时 spec 版本为 1000300、交易版本为 3，普通单笔交易参考时间权重上限
为 1,299,891,843,000，长度上限 786,432 字节，整块上限 2,000,000,000,000。该部署
报告成本为 1,488,360,000,001，仅账本成本就比普通单笔权重上限高约 14.5%，尚未计入
节点额外开销；长度没有超限。这是链上资源限制，不是服务器内存、钱包余额或自定交易
数量上限。节点报告账本 8.1.1，固定客户端为 8.1.3／Compact 0.31.1／运行时 0.16.0；
尚不能据此声称应用证明完全兼容，也不因此擅自升级工具链。

原验证工具通过元数据字节向量编码，重复添加 SCALE 长度前缀而导致 RPC／Wasm 错误。
这一独立错误已修正并回归测试；正确验证仍因资源超限拒绝部署。上述目录保留编码对照、
节点上限、实际成本、13 份真实密钥和 382 项已通过检查的证据；本地检查不等于链上验收。

建议将公开合约 ABI 从 v9 升为 v10，把权限根批准、模块提案、模块审核和模块治理四个
公开证明入口合为一个固定操作分派入口，每笔仍只执行一个逻辑操作。保持各自签名域、
角色、审核／批准门槛、权限根、提案身份、计数器、有效期、撤销和状态更新；禁止跨分支
绕过前置条件、混淆操作或一笔混入多个操作。公开入口从 13 减到 10，但新入口密钥大小
可能影响成本，必须实测，不能保证一定部署成功。

保留全部 M6 功能、单合约信任模型、完整能力链和槽位祖先、当前根检查、作用域 nullifier，
以及普通操作最后一笔原子更新状态并生成收据。通用收据仍为 v1，ABI／SDK／夹具明确升为
v10。不新增特权执行者、维护权限、第二种收据，不删验证器、不缩短祖先、不削弱签名。

完整流程仍限定一个新的一次性部署、最多 40 笔测试 DUST 交易；合并后的入口预算仍按逻辑
操作分别限制。不自动重试提交、不增加部署、不激活生产模块、不扩权、不升级服务器、
不开放公网开发 API。旧的 25 笔撤销合约与本次无关。

实施后先固定工具链编译，在当前 16 GiB 和交换文件条件下生成真实密钥；仅在程序字节
完全一致时复用旧密钥。核对资产和 ABI／适配器，跑完整检查，增加跨操作签名、错误分支、
门槛和权限根反例，并核对合并前后的实际状态效果一致。钱包工作之前，用全部 10 份真实
验证器向实际节点测成本和权重；平衡一次后，准确交易字节必须先通过只读验证再提交，
且保留实际余量。如果仍超限或资源不足，记录事实并再次讨论，不能擅自换另一种架构。

通过这些门槛后继续原完整流程计划，验收真实 M5 签发、准备阶段无授权效果、最终原子
更新状态／nullifier／收据、成功且最终确认的交易、准确索引收据核对以及撤销清理。
这些完成前，M6 和本次完整流程均不宣称完成。

保持 v9 可保留代码与密钥，但当前部署不能通过已观察到的限制。分批注册验证器后冻结
维护权限只能作为研究替代：固定账本 API、冻结保障和临时引导权限尚未核实，并未选用。
删减必需功能、拆分合约信任模型或提高网络上限均不在建议方案中。

工作区 AGENTS.md 明确要求不得自行采用架构替代方案，并要求架构变更前咨询用户。合并
入口会改变公开证明入口和 ABI；用户现已批准按本文方案实施。可同时继续公开诊断、
下载结果和恢复临时移出的公开文件。

实施及验证进展：v10 已完成治理入口合并，九个未改动的证明程序与 v9 字节一致；新治理
密钥为 k=19、276,527 行，全部 10 对真实密钥在本地及 ECS 均通过哈希核验。完整仓库检查
386 项全部通过，包括跨操作签名、门槛、权限根、生命周期、普通操作和收据测试。

节点报告未平衡构造交易成本 1,190,360,000,001，加节点开销 20,000,000,000，低于
1,299,891,843,000 上限，有 6.88% 余量。保存的 v9 交易比较显示 DUST 平衡增加
8,960,000,000，因此现预留 18,000,000,000，并要求准确平衡后的部署仍至少有 5% 余量，
且通过准确字节的只读节点验证。最初保守设定的 10% 门槛已改为依据实测的预留量，这不
改变已批准的架构或交易范围。ABI／SDK 标签为 v10；普通操作实现完全不变，保留其冻结
的 v9 实现引用配置及准确网络、部署、注册代码哈希绑定；收据仍为 v1。

零交易私有服务预检已通过。首份控制脚本的缓存校验和因 Windows 换行编码不匹配而被
拦截，已改为核验实际传输字节，随后预检成功。首次完整流程正在运行，尚未声称链上
接收或收据验收成功；相关日志位于上述 v10 证据目录。
