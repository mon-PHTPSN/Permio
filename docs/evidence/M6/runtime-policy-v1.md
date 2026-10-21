# M6 runtime-template policy v1 — allocation slice

Implementation date: 2026-10-14. Contract profile: `permio-authorization-v5`.
This is a private data schema and an allocation guard, not final M6 acceptance
or approval of either production runtime proof module.

## Exact source and trust boundary

`createRuntimeTemplateActionPolicy` reparses the supplied M2 template with
`parseScenarioTemplate` and retains its exact `hashScenarioTemplate` target:
namespace, template ID, semantic version and content hash. It projects each
action into fixed-size values; it does not execute template expressions.

`createRuntimePolicyBindingManifest` explicitly derives configuration hashes
for the selected implementations. `createRuntimeAllocationPolicyWitness`
checks a supplied manifest without repairing it. It requires every action's
configuration, profile and module to match the projection, then opens action
index zero for allocation. All actions repeat the same exact initial-state
hash. The activation adapter already checks the M4 record against the exact
M2 template and signs the resulting binding root through the existing
namespace activation envelope.

Midnight proves correspondence to that governance-authenticated projection,
not arbitrary JSON parsing inside Compact. The namespace activator is still
responsible for the M2-to-projection correspondence, under the already approved
M4 admission trust boundary. No additional synchronization signer, reviewer
key registration, authority root, universal administrator or transaction
circuit is introduced. M4's Ed25519 reviews remain off-chain.

## Configuration layout

`RuntimeTemplateActionPolicy` uses the exact exported Compact struct order:

- `policyVersion = 1`, exact template `target`, canonical M2 `actionIndex`;
- `bindingActionIdHash`, runtime `actionIdHash`, `proofProfileIdHash`,
  `proofFamilyHash`;
- `contextHash`, `actorSlotIdHash`, `initialStateIdHash`;
- `resourceSelectorHash`, `purposeHash`, `recipientKindHash`,
  `disclosurePolicyIdHash`, `capabilityRuleIdHash`;
- `maxCapabilityDuration` (seconds), `maxDelegationDepth`, `revocable`;
- `inputRecordTypesHash`, `outputClaimTypesHash`, `executionAdapterHash`;
- depth-20 `transitionRoot` and exact `transitionCount`.

The configuration commitment is Compact `persistentHash` of the typed
`{domain: pad(32, "permio:runtime-policy:v1"), policy}` value, not a JSON hash
or the SHA-256 canonical manifest hash. The generated implementation defines
its byte layout. Incompatible layout changes require a new policy version,
configuration schema and exact module binding, not reinterpretation of v1.

Identifier/data-list hashes use SHA-256 over `encodeCanonical` from
`@permio/protocol`, with the following domains:

| Value | Domain |
| --- | --- |
| Activation binding action | `permio:action-id:v1` |
| Signed runtime action | `permio:runtime-action-id:v1` |
| Profile / family | `permio:proof-profile-id:v1` / `permio:proof-module-id:v1` |
| Context, selector, purpose, recipient kind, disclosure | Existing `permio:runtime-<kind>:v1` domains |
| Private state | `permio:private-state-id:v1` |
| Actor slot / capability rule | `permio:participant-slot-id:v1` / `permio:capability-rule-id:v1` |
| Input records / output claims | `permio:input-record-types:v1` / `permio:output-claim-types:v1` |
| Execution adapter | `permio:execution-adapter:v1` |

The two action hashes intentionally differ. Both are derived from the same
validated action ID; neither existing domain is changed. Lists retain canonical
M2 order. Adapter encoding is `["absent"]` or `["present", id, kind, schemaId]`,
so absence cannot collide with a configured adapter.

Each transition is the Compact commitment of the typed
`{transitionVersion: 1, actionIdHash, fromStateIdHash, toStateIdHash}` row,
where the action hash is the runtime-domain hash. Only declared rows enter
the depth-20 tree, in canonical M2 order. Ambiguous state/action pairs are
rejected by M2 validation. An absent row is a denial, not an inferred self-loop;
an explicitly declared same-state row is retained. Private labels and paths
are not published by allocation.

M2 requires at least one declared transition for every action. Consequently a
non-transitioning action must have an explicit same-state row, and is still
denied in any state for which no row is declared. No template schema change
or implicit permission is introduced.

## Allocation enforcement

`allocateRuntimeInstance` has one new mandatory final argument,
`RuntimeAllocationPolicyWitness {policy, binding, bindingPath, initialState}`.
After the existing allocator, root, lifetime, signature and replay checks it:

1. checks the exact target, policy/binding versions, action/profile/family,
   index range, positive duration and depth at most 16;
2. recomputes the configuration commitment and binding commitment and proves
   binding membership in the activated template's root;
3. requires action index zero and a v1 state opening for the same instance;
4. requires the state's label hash to equal the activated initial-state hash,
   a nonzero 32-byte nonce and the exact allocator-signed state commitment; and
5. only then inserts the instance and consumes allocation replay nullifiers.

Thus even a correctly signed allocator command cannot initialize an arbitrary
state. The public instance record remains allocation commitment, state
commitment, sequence and lifecycle status. Allocation does not issue a
capability, authorize an action or emit a DecisionReceipt.

## Remaining enforcement

The intent and transition predicates are generated and tested but are not
ledger-bound action entry points. Actor-slot identity, duration/depth policy
enforcement during grant issuance, record/claim evidence semantics, active
exact module/configuration-schema checks, both action families, atomic action
state/nullifiers, common receipts, negative node transactions, contention and
ordinary-action restart/privacy/performance gates remain incomplete.

The SDK recognizes only the two agreed v1 family IDs, module version `1.0.0`
and `decision-receipt-v1` profile. Unknown fields, module families, versions
and receipt profiles fail closed. Recognizing a schema never approves or
activates an implementation. Local live tests still use explicitly labeled
admission-only module fixtures, not reviewed production modules.

Existing v4 deployment evidence is historical. v5 needs a fresh deployment
and real regenerated keys; do not reconnect to an old address using v5
generated bindings. No toolchain, ledger, memory/swap or OOM-policy change is
part of this slice.

## Verified allocation slice

The exact v5 build passed 180 repository tests and ten real key pairs. A fresh
unchanged Local Dev deployment and 17 finalized transactions passed allocation,
reconnect and governance/lifecycle checks. Wallet-free public reads before
and after lifecycle changes preserved the exact allocation/state commitments
and sequence zero. The activation-event-to-allocation interval was 49.008
seconds, including SDK/preflight/proving/submission/indexing, not isolated
proof or ordinary-action latency. All 13 captured-log private sentinels were
absent; full artifact/inference privacy remains an exit gate.

Exact hashes, transaction references, resource samples, failed development
attempts and remaining gates are in template-policy-verification.json and
development-log.md. Only allocation's program and keys differ from v4.

## 中文翻译

本文件记录 2026-10-14 实现的 v1 私有运行时模板策略及 v5 分配检查，不是 M6 最终验收，也不表示两个生产运行时证明模块已经获得批准。

策略生成器重新验证 M2 模板，保留命名空间、模板 ID、语义版本和内容哈希的精确目标。清单构造器明确生成配置哈希；分配见证构造器检查传入清单，不自动修复错误。所有动作的配置必须对应模板，分配展开第零个动作，其中包含全模板一致的初始状态哈希。既有 M4 适配器检查激活记录与模板，再由命名空间激活者对绑定根签名。链上证明对应经过治理认证的策略投影，不在 Compact 中解析任意 JSON；投影对应关系仍由既定激活信任边界负责，未增加签名者、权限根、万能管理员或交易电路，也未把 M4 的 Ed25519 审查搬到链上。

配置严格采用导出的 Compact 字段顺序：版本、精确模板目标、动作索引；激活绑定动作哈希、运行时动作哈希、证明配置及证明家族哈希；上下文、参与者槽及初始状态哈希；资源选择器、目的、接收方类型、披露策略和能力规则哈希；能力最长秒数、最大委托深度和可撤销性；输入记录类型、输出声明类型和执行适配器哈希；深度 20 的迁移树根与数量。承诺使用带 `permio:runtime-policy:v1` 域的 Compact 强类型 persistentHash，不是 JSON 哈希或清单哈希。改变布局必须升级策略版本、配置模式和精确模块绑定。

上表列出全部哈希域。激活动作与运行时动作使用不同的既有哈希域；二者从同一个验证后的动作 ID 派生，不修改历史协议。列表保持 M2 的规范顺序；适配器缺失编码与存在编码明确区分。迁移行包含版本、运行时动作哈希、原状态哈希和目标状态哈希，只把模板声明的迁移加入树。M2 拒绝同一状态／动作的歧义，且要求每个动作至少声明一条迁移；不改变状态的动作必须明确声明原状态等于目标状态的行，在未声明行的状态仍拒绝，不自动假设状态不变，也不修改模板模式。分配不公开状态标签和路径。

分配交易新增必填策略见证参数。在既有权限、根、有效期、签名和重放检查之后，检查精确目标及绑定、版本、索引、正数时长和不超过 16 的深度，重算配置／绑定承诺并验证激活根成员关系，再要求第零个动作、同一实例的 v1 状态、模板初始状态哈希、非零随机 nonce，以及与分配器签名相同的状态承诺。全部通过才写入实例并消耗分配 nullifier。因此即使分配器正确签名，也不能初始化任意状态。公开实例结构未变，分配不签发权限、不授权动作、不产生 DecisionReceipt。

意图及迁移谓词已生成并测试，但尚未接入链上动作入口。参与者槽身份、签发时的时长／深度策略、记录／声明证据语义、精确活动模块及配置模式检查、两个动作家族、原子状态与 nullifier、公共收据、节点负面交易、并发，以及普通动作重启／隐私／性能验收仍未完成。SDK 仅识别已确定的两个 v1 家族、模块版本 1.0.0 和 decision-receipt-v1 配置，未知字段或版本明确拒绝；识别数据模式不授予信任。真实链测试中的模块仍是明确标注的激活测试夹具，不是获审生产模块。v4 证据保留为历史；v5 必须使用新部署和真实重建密钥，不能混用旧地址。未更改工具链、账本、内存、swap 或 OOM 策略。

本轮已通过 180 项测试、十组真实密钥、新部署加 17 笔最终确认交易；分配、重连、治理／生命周期及无钱包独立公开读取通过，实例／分配／状态承诺和序号零保留不变。激活至分配核验为 49.008 秒，含 SDK、预检查、证明、提交与索引，不是普通动作或独立证明延迟。13 项私有日志哨兵均未出现；完整产物及推断隐私仍是未完成门槛。精确哈希、交易引用、资源、开发失败及待完成项保存在验证 JSON 和开发日志中；只有分配程序和密钥相较 v4 改变。
