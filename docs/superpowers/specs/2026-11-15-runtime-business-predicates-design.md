# Reusable private business predicates

The user authorized extending the shared Midnight authorization proof modules,
then resuming the generated scenario packs' local end-to-end acceptance. This
design implements that request within the existing versioned contract and
module-governance architecture. It does not change public DecisionReceipt v1.

## Contract

- Prove current, issuer-signed private evidence for one exact template,
  instance, subject, context, resource, purpose and recipient.
- Prove a private requested Uint64 value is at most a private authorized
  Uint64 ceiling, using the same nonzero unit identifier. Both values must
  come from signed records committed by the holder's exact action command.
- Require an issuer-signed audit acknowledgment before an action that needs
  it. The acknowledgment binds the exact intent and selected-input commitment;
  its commitment becomes the required output claim. It establishes possession
  of that acknowledgment, not future compliance or an external service's honesty.
- Preserve all allocation, participant-slot, delegated ancestry, session,
  freshness, revocation, nullifier and atomic state-transition checks.
- Reject unknown predicates and unsupported versions before live activation.
  A generic output claim name or nonzero payload commitment is insufficient.

## Version and trust boundaries

Keep template schema 1 and existing template hashes unchanged. Template schema
2 adds a strictly validated `predicates` list to proof profiles. Each predicate
has `kind`, `inputRecordType`, `outputClaimType` and, for a bounded value,
`ceilingRecordType`. Kinds are `current-record-v1`, `bounded-value-v1`, and
`audit-acknowledgment-v1`. No expressions or template executable code are allowed.
References must belong to every action selecting the profile. Predicate order
is canonical data; duplicate output claims are rejected. Limits are eight
predicates, eight selected inputs, and eight selected outputs per action.

The new reusable family is `private-state-transition-predicates-v1`, module ID
`private-state-transition-predicates`, version `1.0.0`, in authorization
contract v11. Old contract bindings and real v10 assets remain separate and
usable. Policy v4 commits the existing policy plus the ordered predicate root
and count; it must not reinterpret a v3 configuration commitment. New source,
compiled programs, input/configuration schemas, and exact bindings are frozen
and hashed independently. No toolchain upgrade is needed: compiler 0.31.1,
runtime 0.16.0, Midnight JS 4.1.1.

Use the existing namespace authority root and instance capability-issuer root.
An evidence signer must be the root capability's exact original namespace
issuer, an eligible kind-6 issuer in both roots, and remain eligible at action
time. This equality preserves the existing exact-issuer revocation route;
another otherwise eligible namespace issuer cannot sign these records.
No new root or privileged service is introduced.
Every signed record binds the exact root capability that supports this action;
revoking that capability or an ancestor denies the action through the current
credential-status root. A qualification authority must revoke that associated
authorization when withdrawing the qualification; this is an explicit issuer
obligation, not an inference from account/session validity.

## Private record and predicate proof

`RuntimeBusinessRecord` v1 contains the template target, instance and context,
subject account credential commitment, root-capability commitment, record-type
hash, resource/purpose/recipient hashes, validity in Unix seconds, private
Uint64 value, unit hash, reference commitment, body commitment, issuer-authority
commitment, and a fresh nonce. Its domain-separated Compact commitment is the
selected payload commitment. Schnorr verification uses the existing signature
profile and authority-leaf eligibility rules.

Current-record predicates prove exact type and scope, issuer signature,
`validAfter <= effectiveAt < validBefore`, and an action deadline no later than
record expiry. A derived claim commitment binds the predicate and record.
Bounded-value predicates additionally verify the two records' units and
`requested.value <= ceiling.value`; no arithmetic wraps and no string label
stands in for the comparison. Audit predicates bind their acknowledgment's
reference to the exact intent and selected-input commitment and bind its digest
to the selected output. The acknowledgment is detached private evidence and
never occupies a selected-input slot: its digest occupies the configured
selected output, preventing a commitment self-reference.
Audit acknowledgments use the same record/signature
format; they are private evidence, not another public authorization receipt.

Predicate witnesses must reproduce the holder-signed selected-value hash chain
before selecting a record. A same-type substitute payload is rejected. All
required outputs must be covered; their commitments are checked against the
same signed command. Predicate completion is ordered, bound to the command and
current roots, and required by the final transaction. Preparation cannot emit a
receipt, consume a nullifier, or advance application state. The final call
rechecks freshness and ancestry and commits the unchanged receipt format.

## Generated scenarios and live inputs

Publish new pack/template major versions for the semantic profile change;
preserve old fixture evidence and hashes. Clinical referral/consent use current
records; emergency access also uses the audit acknowledgment. Qualification
and shift assignment each yield their exact current-record claim. Purchasing
uses a current mandate and compares the signed request to its signed ceiling.
No participant names, medical terms or purchase branches enter shared modules.

Generate private records, issuer keys and witnesses from explicit test seeds.
A live input includes a recorded current anchor time in Unix seconds; it does
not reinterpret the deterministic millisecond fixtures, change node clocks or
extend template duration limits. Durable local audit storage precedes signing
an acknowledgment and is checked after reopening. Keep all private material
outside public artifacts. Scan actual receipts, ledger/indexer captures,
gateway logs, execution events and public reports against every private value.

## Execution and acceptance

Tests first establish failures for expired/not-yet-valid records, ineligible
or substituted issuers, altered signatures, cross-instance/subject/scope,
revoked root capability, mixed units, amount above ceiling, input/output
substitution, missing audit acknowledgment, skipped predicate and replay.
Use the actual generated Compact predicates; TypeScript validation alone is
insufficient. Regenerate compiler-managed output; never edit it by hand.

Compile and measure changed circuits before key generation. Use existing
local resources without weakening memory limits or changing the toolchain.
Only keys matching exact programs may be reused. Record resource or proving
failures rather than weakening proof semantics or treating mocks as live.

The existing architecture decision explicitly requires independent human
security/privacy review and protocol-governance approval for a new proof
family. Agents may implement and test but do not satisfy those thresholds.
Prepare the exact reviewable source, schema, generated artifacts, hashes and
test evidence before requesting that final approval. Do not silently activate
a new family with synthetic signatures presented as human approvals. Native
local activation and three-pack end-to-end acceptance resume only when the
required approval boundary is actually satisfied. Keep this gate OPEN until then.

## 中文译文

```text
用户已授权扩展共享的 Midnight 授权证明模块，然后继续生成场景包的本地端到端验收。
本设计沿用现有版本化合约和模块治理架构，不改变公开 DecisionReceipt v1。

契约：证明签发方签名的私有证据在精确模板、实例、主体、上下文、资源、目的和接收方范围内当前有效；
使用相同且非零的单位标识，证明私有 Uint64 请求值不超过私有 Uint64 授权上限。
这两个数值必须来自持有者精确操作命令所承诺的签名记录。
需要审计的操作必须先获得签发方签名的审计确认，绑定精确意图和已选输入承诺，
并将确认承诺纳入必需输出。它证明确认已取得，不证明未来合规或外部服务诚实。
保留实例分配、参与者槽、委托祖先、会话、时效、撤销、空值标记及原子状态变更检查。
未知谓词和版本在真实激活之前拒绝；通用声明名称或非零载荷承诺不足以证明业务语义。

版本和信任：保留模板模式 1 和既有哈希。模式 2 在证明配置中增加严格验证的 predicates 列表。
每项包含 kind、inputRecordType、outputClaimType；数值上限另有 ceilingRecordType。
固定种类为 current-record-v1、bounded-value-v1、audit-acknowledgment-v1，无表达式或可执行模板。
引用必须属于采用该配置的每个操作；顺序为规范数据，拒绝重复输出。
每个操作最多八个谓词、八个输入、八个输出。
新通用家族为 private-state-transition-predicates-v1，模块版本 1.0.0，授权合约 v11。
旧 v10 绑定和真实资源分开保留。策略 v4 承诺原策略、谓词根和数量，不重新解释 v3 承诺。
分别冻结和哈希源码、编译程序、输入／配置模式和精确绑定；沿用既定工具链。
复用命名空间权限根和实例签发方根，证据签名者须是两个根中当前合格的第 6 类签发方。
证据签名者还必须是根能力的精确原始命名空间签发方，以复用现有精确签发方撤销路径；其他合格签发方不能替签。
不引入新根或特权服务。每份记录绑定支持该操作的根能力；撤销它或祖先便拒绝操作。
资质签发机构撤回资质时必须撤销对应授权，这是明确义务，不由账户或会话有效性推断。

私有记录和证明：记录 v1 包含精确目标、实例、上下文、主体账户凭证承诺、根能力承诺、
记录类型、资源／目的／接收方哈希、Unix 秒有效期、私有 Uint64 数值、单位哈希、
引用承诺、正文承诺、签发方权限承诺和新随机数。其分域 Compact 承诺就是已选载荷承诺。
复用 Schnorr 签名配置和权限叶资格检查。
当前记录谓词检查精确类型、范围、签名、有效期及操作截止不超过记录失效时间，
并派生绑定谓词和记录的输出承诺。数值谓词另验证单位一致和请求值不超过上限，避免溢出。
审计谓词将确认绑定到精确意图和输入承诺，并将其摘要绑定到已选输出。
确认是独立私有证据，绝不放在已选输入中；其摘要占据配置的输出，避免承诺自引用。
审计确认是私有证据，不是另一套公开授权回执。
见证必须先重建持有者签名的已选值哈希链，再选择记录；拒绝同类型载荷替换。
所有必需输出均须覆盖并匹配同一命令。谓词完成进度有序绑定命令和当前根，最终交易必须检查。
准备阶段不产生回执、不消耗空值标记、不推进应用状态；最终调用重检时效和祖先再写入既定回执。

生成和真实输入：语义配置变化发布新的包／模板主版本，保留旧证据和哈希。
医疗转诊和同意采用当前记录，紧急访问另需审计确认；资质及班次各产生精确的有效记录声明。
采购检查当前委托，并比较签名请求和签名上限。共享模块不加入参与者姓名或领域分支。
用显式测试种子生成私有记录、签发密钥和见证；真实输入明确记录当前 Unix 秒时间锚点，
不重解释原毫秒夹具、不更改节点时钟、不放宽模板期限。
先持久保存本地审计记录再签确认，重开存储后核验。所有私有材料不得进入公开产物，
并用全部私有值扫描真实回执、账本／索引器捕获、网关日志、执行事件和公开报告。

执行和验收：先测试并观察过期、尚未生效、无资格或替换的签发方、改签名、跨实例／主体／范围、
已撤销根能力、单位混用、超额、输入／输出替换、缺审计确认、跳过谓词和重放的失败。
使用真实生成的 Compact 谓词；仅 TypeScript 检查不足。通过编译器重新生成产物，不手改。
生成密钥前先编译和测量改动电路；不放宽资源限制、不换工具链，只复用精确程序匹配的密钥。
如资源或证明失败，记录实际阻碍，不能弱化语义或把模拟称为真实执行。
现有架构决策明确要求新证明家族通过独立人工安全／隐私审查和协议治理批准。
代理可实现和测试，但不能计入批准阈值。先准备可审查源码、模式、产物、哈希和证据，
再请求最终批准；不得把合成签名冒充人工批准来激活。
满足该边界后才继续原生本地激活及三个场景包端到端验收；此前保持验收门槛未通过。
```
