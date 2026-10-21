# Ordinary-action execution boundary v1 — approved direction

Date: 2026-10-18. The user explicitly approved staged ordinary actions in this
chat after reviewing this plan. This approves implementation of the staged
direction and its transaction/metadata costs, not production module activation
or M6 acceptance.
Full ordinary-action implementation and chain acceptance are
unfinished. The successful V8 proof is a synthetic ancestry diagnostic, not an
action transaction or receipt. The existing Preprod fixture's template and
module ended revoked; it cannot be reused as an active action deployment.

## Concrete constraint and existing authorization

The approved depth-16 capability witness contains at most 17 capabilities.
Participant-slot provenance has a different bound: the actual M2/M4/M5-P1
regression constructs 34 assignment records with capability depth zero.
Compact 0.31.1 rejects runtime-sized vectors and runtime loop bounds. Those
facts and exact diagnostics are preserved in
`slot-assignment-architecture-boundary.md` and
`slot-assignment-boundary-verification.json`.

The approved slot dispatcher already verifies arbitrary-length assignment
ancestry through bounded transactions. Its operations authorize issuance or
revocation. They do not certify an ordinary user's action: invoking them would
require assignment-management authority, and their completion produces no
action-bound authorization result. An action must also revalidate every
ancestor against the current committed maps and current account-status root.
An off-chain `isParticipantSlotActive` result is not a substitute.

The previous approval covers staged private slot **management**. Extending
staging to every ordinary action changes its transaction count, observable
preparation metadata and invalidation behavior. The user explicitly approved
this extension in the current chat. It adds no trust bridge or new authority;
the approval does not establish successful proof or chain acceptance.

## Approved implementation path

Keep one deployment, the pinned ledger-8 toolchain, all capability-depth and
slot-provenance semantics, and the current authority model.

1. Prepare a private, versioned action command signed by the certified session
   key. Bind the exact original intent, deployment, allocation, instance state
   and sequence, authority/status sequences, activated policy/module binding,
   selected evidence/output commitments, next-state commitment, action nonce
   and proof window. Preserve existing M5 Ed25519 identities and signatures.
2. Begin a commitment-only action-preparation session. It grants nothing,
   consumes no action nullifier and emits no receipt. It is not a slot-management
   command and does not require allocator or governance authority.
3. Verify one exact slot ancestor per bounded step, following immutable parent
   IDs with strictly decreasing issued sequences to the admitted origin. Check
   current map membership and active account status at every step. Require the
   terminal assignment to match the policy's actor slot and action subject.
4. Bind selected typed record/output commitments to the signed command. Policy
   projection v3 adds exact ordered required input/output type roots/counts;
   activation authenticates the complete configuration commitment. Records do not
   become public and generic authorization does not assert that an opinion or
   allegation is true.
5. Finalize with the full certified capability/session ancestry and signatures.
   Recheck exact current state, roots, registries, schema and validity. In the
   **single final transaction**, check the deterministic template transition,
   consume the scoped nullifier, update state/sequence atomically and persist
   the common receipt body. Obtain transaction/ledger provenance from the
   exact finalized indexed call, not from caller-supplied receipt fields.
6. Any intervening credential/slot/state/root change invalidates pending
   preparation. Expiry cleanup removes only temporary progress. There is no
   automatic resubmission, slot-depth cutoff, truncated ancestry, privileged
   keeper, operator approval of an action, public developer API, second
   contract, new RAM grant or compiler/ledger upgrade.

At least begin + N slot steps + finalization are required for N slot ancestors,
plus any necessary bounded evidence steps. N and transaction timing become
observable. A root-slot user still incurs preparation transactions; a distant
ancestor revocation cannot be bypassed by skipping work. Proof/deployment cost
must be measured on the existing 16 GiB server. No end-user memory or latency
qualification is inferred.

The alternative is to retain a single proof invocation and investigate another
provenance representation before action implementation. No sound fixed-length
or recursive representation on the pinned stack has yet been demonstrated.
Neither shortening chains nor trusting a server is an authorized fallback.

## Implementation and acceptance status

`runtime-action-outcome.compact` is an internal outcome kernel, exporting no
public transaction entry. It checks exact allocated state/deployment/window,
rejects reused scoped action nullifiers, preserves slot maps, atomically
updates a transitioning instance, and stores a whitelisted receipt body.
An isolated test-only entry exercises it against synthetic genesis. This entry
omits authorization deliberately and must never be deployed, proved, signed or
submitted. No successful generated-code test is chain or authorization evidence.

The v9 production entries now implement preparation and final execution; there
is no public entry into the outcome kernel alone. Compact 0.31.1 compilation
passes. The focused suites pass 44 action/ancestry/policy/receipt tests and 14
status-program/preparation tests. Fixtures seed synthetic genesis and therefore
do not establish real issuance, proving, deployment or finality.

`decision-receipt.ts` checks the exact typed receipt commitment and source
bindings. `indexed-decision-receipt.ts` now supplies a read-only adapter using
the existing authenticated Preprod profile. It reconciles successful SDK
finality with the exact indexed serialized transaction, entry point, call state,
and the public VM operations proving absence and insertion of this exact receipt.
Generated-code tests reject substituted and duplicated insertion transcripts.
The complete adapter still needs real-chain qualification. It trusts its
configured indexer and is not a consensus light client or independent proof
verifier. The public `recipient` field is the M5 recipient hash, not an address.

All thirteen genuine v9 key entries have been built on the existing Singapore
16 GiB ECS and downloaded with exact hash verification. The final circuit has
1,949,234 rows at k=21. The complete root check passes: 382 tests, zero failures,
plus documentation, type and build checks. Offline deployment fee calculation
passes for a 31,970-byte unbalanced deployment; this does not establish balanced
transaction acceptance by the node. Live network/genesis, node/indexer
subscriptions, real assets and the loopback-only patched prover preflight pass.
V8 generated bindings/programs and public keys remain recoverable locally;
sealed prior evidence is unchanged. The two-hour stop deadline is maintained.

The new first-flow harness prepares a bounded 40-transaction disposable test:
one deployment, six module-governance calls, three template-admission calls,
one allocation, nineteen credential-certification calls, two root-slot calls,
five action calls, and three cleanup calls. Its controlled single-attempt run
has started; no chain or receipt acceptance is claimed yet. Each exact balanced
transaction receives read-only node validation before submission. The prior
25-transaction approval applies only to
its completed historical contract; this new concrete plan is not relabeled as
that old approval. No approval record may be fabricated.

---

# 中文翻译

2026-10-18。用户已明确批准此分阶段方向及交易／元数据成本；批准不代表生产激活或完成
M6。V8 成功结果仅为合成祖先证明诊断，不是普通操作
上链或收据。既有 Preprod 测试的模板和模块最终已撤销，不能作为活动操作部署复用。

能力链最多 17 个凭证，但槽位来源链没有相同上限；实际 M2/M4/M5-P1 回归已构造能力
深度为零、槽位链长 34 的情况。Compact 0.31.1 拒绝运行时长度向量和循环。现有分阶段
槽位入口验证签发／撤销，需要管理权限，并不认证普通用户操作。操作必须重新核对当前
私有映射、全部祖先及当前账户状态根，不能信任宿主提供的活动标志。

此前批准的是分阶段槽位管理。将分阶段机制用于每次普通操作，会改变交易数量、可观察
的准备信息及失效行为；用户已在当前聊天批准该扩展，仍须核验真实证明和上链行为。

建议保留单合约、固定 ledger-8 工具链、完整能力深度与槽位来源语义及现有权限模型。
会话密钥另签版本化操作命令，绑定原始意图、部署、分配、状态／序号、权限与状态根、
活动策略／模块、证据和输出承诺、下一状态、nonce 及有效期；M5 身份／签名保持不变。
开始只登记准备承诺，不授权、不消耗操作 nullifier、不出收据。每步检查一个准确槽位
祖先及其当前账户状态，按不可变父 ID 和递减签发序号走到合法起点，终端槽位必须对应
实际操作者。选定记录和输出通过新的版本化、激活认证的数据投影绑定到命令，记录保持
私密，也不把通用授权解释为证明意见或指控为真。策略投影 v3 已增加准确、有序的输入／
输出类型根及数量，通过激活认证其完整配置承诺。

最后一笔交易重新检查完整能力／会话祖先、签名、当前根／状态、注册记录、schema 和
有效期，并原子核验确定性转换、消耗 nullifier、更新状态／序号和保存通用收据正文。
交易与区块来源从实际最终确认的索引调用补齐，不能由用户自行声明。中间凭证、槽位、
状态或根变化会使准备过程失效；过期清理只删临时进度。不会自动重试、截短来源链、
引入特权 keeper／服务器授权、新权限、新合约或工具链升级。

N 层槽位祖先至少需要开始 + N 步 + 最终确认，另加必要证据步骤；数量与时间可观察，
即使根槽位用户也要支付准备交易。资源与部署可行性仍须在现有 16 GiB 机器测量，不
据此承诺用户端资源或时延。另一方向是先研究仍保持单次证明的来源表示；当前固定版本
尚无已验证的可行表示，不能擅自限制链长或信任服务器。

当前实现：内部 outcome kernel 没有独立公开交易入口，检查准确状态、
部署、期限和防重放，保留槽位映射，原子更新状态并保存白名单收据。独立测试入口故意
省略授权，只能用于合成创世下的生成代码测试，严禁部署、签名、证明或提交。SDK 核对
类型化收据承诺和来源，只接受准确成功、最终确认调用的观察；拒绝未确认、失败、跨部署
或替换的数据。现已实现使用已有认证 Preprod 配置的只读索引适配器：核对 SDK 最终状态、
准确序列化交易、入口、调用时状态，以及准确收据先不存在再插入的公开 VM 操作。生成
代码测试会拒绝替换或重复插入记录；完整适配器仍待真实链上核验。它信任所配置的索引器，
不是共识轻客户端或独立证明验证器。公开 recipient 字段是 M5 接收方哈希，并非地址。

v9 普通操作准备／执行入口已实现并通过 Compact 0.31.1 编译；44 项操作／祖先／策略／收据
测试和 14 项状态证明测试通过。这些测试直接设置合成创世，不能作为实际签发、证明或
链上确认的证据。全部 13 个 v9 真实密钥已在现有新加坡 16 GiB ECS 构建完成，并下载到本地
逐一校验哈希。最终电路测得 1,949,234 行、k=21；完整根检查通过：382 项测试、零失败，
文档、类型和构建检查也通过。31,970 字节未平衡部署的离线费用计算通过，但这不代表节点
接受完成余额处理后的交易。实际网络／创世标识、节点／索引器订阅、真实资产和仅回环可达
的定制证明服务预检已通过。v8 绑定、程序和公共密钥仍有本地可恢复副本，历史封存证据未改动，
并持续维护滚动两小时停机期限。

新的首次流程测试代码限定为 40 笔一次性测试交易：部署 1、模块治理 6、模板准入 3、
分配 1、凭证认证 19、根槽位 2、普通操作 5、清理 3。受控的单次运行已开始，尚不宣称
链上接收或收据验收；每笔完成余额处理后的准确交易在提交前先接受节点只读校验。
此前 25 笔批准仅适用于已经完成的历史合约，不能当成新方案的批准，也不得伪造批准记录。
