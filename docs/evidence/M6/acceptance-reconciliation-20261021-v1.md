# M6 engineering acceptance reconciliation and human-review handoff

Date: 2026-10-21T00:55:07.979150+00:00

Status: engineering evidence reconciled; M6 remains `IN_PROGRESS` and
`productionReady=false`. Independent human security/privacy review is **OPEN**.
The machine-readable record is [acceptance-reconciliation-20261021-v1.json](acceptance-reconciliation-20261021-v1.json).

## Verified scope

The same existing Preprod contract completed the approved remaining sequence:
158 conservatively counted attempts, 156 actual submissions, 152 successful
confirmations, four intended native negative outcomes, five application
instances and three receipts. The ceiling remains 172 attempts/five instances.
This reconciliation adds no deployment, wallet operation, proof request, native
submission, cloud permission, resource upgrade or architecture change.

The fresh offline verifier checked all 156 public transaction byte pairs,
decoded the three actual receipts, replayed four causal checks and two
deprecated-module admission checks, and verified public provenance for four
remote generated-circuit lifecycle controls. It did **not** replay retained
private witnesses offline or perform new node validation. Final restoration
passed. The frozen package has 417 artifacts scanned against 183 actual
private values with zero findings, and 418 integrity-verified files including
the scan report. Newly created local test/documentation files are outside
that frozen remote scan.

The complete local `npm run check` passed **456 tests**, with zero failures
or skips. Its exact suite counts and log hash are in
`../../../logs/m6-remaining-preprod-20261019/acceptance-local-validation-v1.json`.
All 4 contract/compiler/generated-source files from the frozen
source manifest still match. The v10 Compact contract, ABI, proving keys and
receipt v1 are unchanged.

## Input-boundary repairs and additional tests

The Compact adapter previously discarded an unsupported signature-profile
identifier and normalized an arbitrary registry protocol identifier to numeric
version 1. It now rejects unsupported values before conversion/signing.
Two regressions failed against the old code and pass after the fix. The
permissive hexadecimal decoder also accepted malformed values by truncating
a valid prefix. A shared strict decoder now requires the existing canonical
lowercase `0x` plus exactly 64 hexadecimal digits. Both integration regressions
failed before that change and pass afterward; valid v1 inputs are preserved.

Additional generated-circuit checks bind every activation-envelope field and
semantic-version component to its original signature, reject altered M4 and
approval-evidence commitments without records, and reject re-signed unsupported
protocol/envelope versions. Both action families now have coherent unsupported
module ID/version/schema/configuration/implementation tests: command signature,
policy, binding Merkle root/path and registry identity are rebuilt, so an
unrelated signature or path error cannot satisfy the test. The implementation
case specifically rejects an **unregistered exact identity**; registered metadata
mismatches remain separate tests. Authority-root command field mutations,
re-signed insufficient thresholds and eligible but wrong governance roles also
fail without changing state.

The independent local-agent read-only review found no actionable issue in this
narrow repair. It ran no tests or external operations and is **not** independent
human approval or a full M6 security audit.

## Acceptance matrix

The binding requirements are unchanged in `../../DETERMINISTIC_MILESTONES.md`.
The JSON record gives each criterion's precise evidence and limits. The spec
requires successful and negative native Preprod transactions in the live suite;
it does not require a separate native submission for every malformed field.

| Criterion | Recorded result | Evidence tier |
| --- | --- | --- |
| 1 | `PASSED_CONTROLLED_PREPROD_PRIVACY` | remote-private-value-artifact-scan, offline-public-integrity |
| 2 | `PASSED_MIXED_BINDING_CHECKS` | preprod-indexed-generated-circuit, local-generated-circuit, native-preprod-selected-cases |
| 3 | `PASSED_PREPROD_NATIVE` | native-preprod, read-only-node-validation, offline-public-vm |
| 4 | `PASSED_GENERATED_AND_ADAPTER` | local-generated-circuit, local-sdk-adapter |
| 5 | `PASSED_MIXED_LIFECYCLE` | native-preprod, offline-public-vm, remote-generated-circuit, offline-public-provenance |
| 6 | `PASSED_GENERATED_AND_ADAPTER` | local-generated-circuit, local-sdk-adapter |
| 7 | `PASSED_PREPROD_NATIVE` | native-preprod, offline-public-vm |
| 8 | `PASSED_PREPROD_NATIVE` | native-preprod, offline-public-vm |
| 9 | `PASSED_PREPROD_NATIVE` | native-preprod, offline-state-and-receipt-decoder |
| 10 | `PASSED_PREPROD_NATIVE` | native-preprod, indexed-read, offline-exact-bytes |
| 11 | `PASSED_CONTROLLED_ARTIFACT_SCAN` | remote-private-value-artifact-scan, offline-public-integrity |
| 12 | `PASSED_GENERATED_AUTHORIZATION` | local-generated-circuit, native-preprod-authorized-transitions |
| 13 | `PASSED_TARGETED_HISTORICAL_LOCAL_DEV` | historical-owned-local-dev-infrastructure |

Criterion 13 retains its explicit historical v8 Local Dev infrastructure scope.
It does not claim current v10 authorization acceptance or control of shared
Preprod. Criterion 4 preserves the approved trust model: M4 verifies its
reviewers' Ed25519 approvals, and Midnight checks the eligible governance
activator's exact Jubjub admission signature. No additional M4 reviewer
signature-verification claim is made.

## Independent human review

This is the remaining milestone gate. A human security/privacy reviewer must
examine the versioned protocol and implementation, assess the evidence and its
limitations, and record their identity, date, exact reviewed snapshot, findings
and resolution. Agent reviews, synthetic test-governance approvals and a generic
permission to continue do not constitute that review. No reviewer/signoff is
invented in this packet.

Review the governance/admission trust boundary, staged ordinary-action and full
ancestry checks, root/status transitions, atomic state/nullifier/receipt behavior,
cross-context linkability and observable preparation metadata. Review the
distinction between native rejection, public-program replay and generated
evaluation with retained private arguments. The original specific trigger of
code170 is still unproven; fresh synchronization and fee-proof rebuilding
succeeded with the same contract proof, as recorded in
[after157-dust-proof-recovery-v1.md](after157-dust-proof-recovery-v1.md).

Frozen live source manifest: `483b5d5373b467cd92ca04a95ec24aa6418463f96d1e51023f535999fb23a024`.
Generated contract source SHA-256: `21afd7ea01ad0727a5c8c8d865d7f557eebd4e276a10471ca3122fb14c751d53`.
The local SDK repair and added tests are identified separately below; do not
pretend the frozen live source included this later input-boundary repair.

| Local file | SHA-256 |
| --- | --- |
| `packages/midnight-authorization/src/compact-crypto.ts` | `09c1f9f592996a91de7b319721233e5bfe69e98ee392d7f62f201c5c6a657ebb` |
| `packages/midnight-authorization/src/binding-manifest.ts` | `5fe06e756c98d6421e8cf4cf5da38bb57926296a2c1f772e8f03532857e8e358` |
| `packages/midnight-authorization/src/hex32.ts` | `609522aa4aac852200d33fc7f3d4192a9721cf9739ee65940e6248c5fbb5f384` |
| `packages/midnight-authorization/test/admission-envelope.test.ts` | `690069e16762a0ac611c53dd4f2b58c4af401a466a5646cc68019b69db97b07b` |
| `packages/midnight-authorization/test/module-semantic-rejection.test.ts` | `751a65b929440da411bd14c581cf83de23f3743d9dd3da0419762814e2cc13e9` |

## 中文

工程证据已逐项对齐，但 M6 仍为 `IN_PROGRESS`，不具备生产就绪声明。
独立人工安全／隐私审查仍未完成；上面的 JSON 记录保留各条标准、证据类型、原始旧状态和限制。

同一现有 Preprod 合约已完成本次授权序列：保守计数158次，其中实际提交156次、成功确认152次、
预期原生负向结果4次、应用实例5个、收据3份。授权上限仍为172次／5实例。本次验收核对没有新增
部署、钱包操作、证明请求、链上提交、云权限、资源升级或架构变更。

重新离线核验已覆盖156组公开交易字节、3份实际收据、4项原因核验重放、2项弃用模块准入重放，
以及4项远端生成电路生命周期检查的公开来源。没有把保留私有参数的电路检查称为离线重放，
没有进行新的节点验证。最终公开文件恢复已通过。冻结证据包包含417份材料，针对183个实际私有值
扫描未发现泄露；包括扫描报告本身在内的418个文件均通过完整性检查。新建本地测试／文档不属于
这个冻结的远端扫描范围。

完整本地 `npm run check` 通过456项测试，无失败、无跳过。原冻结清单中的4份
合约、编译器元数据和生成源码保持一致；v10 Compact 合约、ABI、证明密钥及收据v1未修改。

适配器原来会忽略不支持的签名配置，并把任意注册协议标识转换为数值版本1；现已在转换／签名前
严格拒绝。原十六进制解码器还会把格式错误的字符串截断为其有效前缀；现改用共享严格解码器，
要求既有规范的 `0x` 加64位小写十六进制。两组回归测试分别在修复前失败、修复后通过，合法v1
输入保持原行为。

新增生成电路检查覆盖全部激活信封字段及语义版本分量、M4／审核证据承诺篡改、重新合法签名的
不支持版本、两种操作家族的模块ID／版本／schema／配置／未注册实现，以及权限根命令全部字段、
重新签名的不足阈值和已入树但权限种类不符的治理者。模块测试重建签名、策略、清单根／路径和
注册身份，避免由不相关签名或路径错误冒充目标语义检查。独立本地 Agent 只读复核未发现需要
处理的问题，但它既不是完整 M6 安全审计，也不能替代人工审查。

上述13行矩阵分别标注原生 Preprod、只读节点验证、公开 VM 重放、本地／远端生成电路、适配器、
离线完整性及历史 Local Dev 基础设施证据，不把这些级别混用。第13条继续保留历史v8基础设施
范围，不能称为当前v10授权验证；第4条继续由M4检查Ed25519审核签名，Midnight只检查合格
激活者的精确Jubjub准入签名，不虚构额外链上M4审核验证。

现在需要一名独立人工安全／隐私审查者检查协议、实现、证据及限制，记录身份、日期、确切快照、
发现与处理结果。Agent复核、合成测试治理批准或一般性的“继续”授权不等于此审查。审查应覆盖
治理信任边界、分阶段操作与完整祖先、根更新、状态／nullifier／收据原子性、跨上下文关联和
准备阶段可观察信息。170原始具体触发原因仍未证明，已验证的恢复结果见链接。冻结源码与后续
SDK修复的哈希分别列于上文，本记录没有虚构审查签署。
