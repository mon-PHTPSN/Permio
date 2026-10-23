# M6 v1 receipt transport to the execution registry

Status: implemented local boundary, pending live upstream acceptance. The user approved this lossless representation on 2026-10-21. M6 remains the authority for the receipt schema, Compact receipt commitment and finalized provenance. No proof-module or receipt contract is changed here.

## Exact representation

`packages/gateway/src/m6-receipt-codec.ts` defines the ABI tuple consumed by `contracts/M6V1ReceiptVerifier.sol`. Its ordered `M6_RECEIPT_V1_FIELDS` declaration is the wire contract. The verifier rejects trailing bytes and noncanonical ABI encodings by exact re-encoding. The original `receiptId` is carried unchanged; Keccak of the wire payload authenticates transport bytes and never replaces that ID.

| M6 public field | M8 representation |
| --- | --- |
| `receiptVersion: 1` | Numeric one padded to `bytes32` for the registry version selector |
| `recipient` | Exact `bytes32`, independent of EVM addresses |
| `sourceTransaction` | Exactly 33 bytes; only the ABI representation adds `0x` |
| `proofModuleVersion`, `semanticVersion` | Exact canonical decimal triplets; each component is uint64. The latter is named `templateVersion` at the registry boundary |
| `implementationHash` | Exact `bytes32`, named `proofModuleImplementationHash` |
| `sourceNetwork` | Exact name retained as `sourceNetworkName`; `sourceNetwork` stores M6's authoritative domain-separated network hash |
| Optional state triple | All null maps to two zero commitments and sequence zero; the decoder restores null. A transition requires positive sequence and distinct nonzero commitments |
| Other commitments, nullifier and hashes | Exact `bytes32` |
| Validity, ledger and transition sequence | Exact uint64, without JavaScript Number conversion |

The TypeScript codec reconstructs the M6 runtime body and recomputes its Compact typed commitment. It rejects altered committed fields, truncated identifiers, additional fields, noncanonical decimal versions and inconsistent state triples. Structural validation cannot establish authorization or finality: only the trusted M6 source reader and historical registry checks can establish those properties.

## Signed transport

The existing gateway EIP-712 domain is `Permio Gateway Transport`, version `1`, with the exact destination chain and execution-registry address. The signed `GatewayTransport` fields are `outboxKey`, `sourceIdentityHash`, `receiptHash`, `keyId`, `signedAt`, `targetChainId` and `targetRegistry`. `receiptHash` is Keccak of the exact encoded receipt. The source identity is Keccak of ABI encoding `(string networkName, bytes32 sourceContract, bytes transaction, uint32 eventIndex, uint64 sourceLedgerSequence)`; M6 v1 requires event index zero.

`encodeM6GatewaySignature` encodes five flat ABI parameters: `(bytes32 outboxKey, bytes32 sourceIdentityHash, string keyId, uint64 signedAt, bytes signature)`. The receipt bytes and this metadata are the two payload arguments to `registerReceipt`. Solidity reconstructs the source identity, checks the canonical wire shape and named network hash, and recovers the gateway signer against the registry domain. The registry selects the configured epoch using `keccak256(bytes(keyId))`, then enforces source authorization, key status, validity, replay and execution scope.

The Solidity verifier authenticates the gateway's assertion. It does not verify a Midnight proof, recompute Compact persistentHash, or independently establish finality. An approved gateway must have performed those upstream checks before signing. The original expected-upstream verifier remains explicitly fixture-only and restricted to local chain 31337.

The registry stores distinct signing and verification cutoffs. A signature timestamp must precede the signing cutoff, and registration must occur before the verification cutoff, matching M7 overlap semantics. Signed public packets are persisted before HTTP dispatch, retained unchanged across retries and restarts, and rotated by appending a new epoch packet only after the previous verification cutoff. Historical public epochs remain configured so saved signatures can be authenticated; removed or forbidden historical keys fail closed.

## Recipient-to-adapter policy

Adapter registration remains scoped to `(receiptVersion, actionSchemaId)`. A separate recipient binding adds the exact 32-byte recipient to that scope and names the already registered adapter. Only the adapter registrar can create or disable a binding. Each binding is registered once and cannot be silently redirected or re-enabled. Execution requires both the action adapter and the exact recipient binding to be enabled and to name the same adapter.

The registry stores and emits the recipient identifier unchanged. The adapter receives that exact receipt, and `outputCommitment` grants no extra authority. Envio stores `RecipientAdapterBinding` separately from receipt and execution projections; the dashboard retains full public references and distinguishes the execution adapter from the recipient. The canonical zero state triple is restored to nullable projection fields. A complete non-transitioning receipt displays "No state transition"; incomplete or partially populated data remains unknown.

## Verification boundary

Tests cover both M6 state forms, maximum uint64 version components, sequences above JavaScript's safe integer range, all 33 transaction bytes, signature domain separation, malformed encodings, same-low-20-byte recipients, binding scope/disablement and one-time execution. A local test uses the real M6 decoder and commitment, shared TypeScript codec and gateway signer, and deployed local EVM verifier, registry and adapter. The loopback HTTP recovery test uses this same wire codec. Envio code generation, typecheck and handler tests run with pinned 3.14.0 on Linux. Desktop and mobile rendering checks use a clearly synthetic public receipt.

The real source adapters and signed-envelope persistence are implemented and tested locally, with recorded public input replay to local EVM. This evidence does not close operational live source configuration, a new live M6-to-EVM acceptance run, live Envio indexing, human security/privacy review or protected code-owner approval. No new Midnight submission, remote proof request, ECS work or branch cleanup is authorized by this representation change.

## Configured source adapter

`createIndexedGatewaySource` scans every transaction in consecutive complete blocks, including empty blocks, from an explicit deployment height. It requires the trusted-finalized-only-indexer policy and the existing authenticated Preprod profile (or loopback Local Dev endpoint). The policy is grounded in the official [versioned finalized-block ingestion path](https://github.com/midnightntwrk/midnight-indexer/blob/v4.3.3/chain-indexer/src/application.rs#L208), rather than an invented number of confirmations. This remains provider trust, not independent consensus verification.

Discovery derives the action-bearing intent identifier using the pinned public SDK erasure API on an identity-only copy; balancing and Zswap aliases cannot substitute for the recorded action provenance. Authorization always uses the original bound serialized call and the unchanged M6 VM insertion checks. SDK block hash, transaction hash and height must match discovery. Historical template/module eligibility is cached from that exact call state and is exposed only after reconciliation. Templates in lifecycle 1 or 2 are eligible for existing instances under M6; modules must be in lifecycle 4. Current or block-end state cannot replace that historical state. Checkpoint parent/hash conflicts halt the store; semantic failures remain terminal and transient I/O is retried with sanitized categories.

The source adapter, durable delivery factory and existing `GatewayObserver.run(signal)` compose through the observer dependencies; source credentials and signing accounts remain operator-owned injected configuration. The SDK watcher keeps its documented indefinite-wait contract. The adapter bounds each application wait with `transactionLookupTimeoutMilliseconds` (default 30,000), reports timeout as temporary source unavailability, and reuses the same pending watch across retries and late settlement. Checkpoint verification requests only hash, height, protocol and parent metadata; a temporarily absent checkpoint is retryable, while a conflicting hash still halts the durable store. No gateway, relayer or indexer service is deployed by these local checks.

## Recorded public receipt replay

The three retained actual Preprod SDK receipts passed an offline codec round trip and persistent signed HTTP delivery to newly deployed, isolated simulated EVM contracts at historical timestamps. Each registered and executed once; an intentionally lost acknowledgement followed by a SQLite reopen reused the identical signed packet. This is recorded-input/local-EVM evidence, not a new live M6-to-EVM run or proof of complete historical block discovery. Reports are `recorded-preprod-codec.json` and `recorded-preprod-local-evm.json` beside this document.

Reproduce after `npm run compile` with the committed public-only receipt fixture (the same source SHA-256 recorded in both reports):

```powershell
node scripts/integration/replay-recorded-m6.ts packages/gateway/test/fixtures/recorded-preprod-public-receipts.json <report.json>
```

## 中文

本边界已实现并进行本地验证，真实上游验收仍待完成。用户于2026-10-21明确批准无损表示；M6 仍是回执模式、Compact 承诺及最终确认来源的权威，本次不修改证明模块或 M6 回执契约。

共享 TypeScript ABI 字段顺序与 Solidity 验证器一致。保留原始回执 ID，传输字节的 Keccak 哈希只用于认证，不能替代该 ID。回执版本1无损填充至注册表的 bytes32 选择器；接收方保留完整32字节，来源交易保留完整33字节。模块与模板版本保留精确十进制三元组，每个分量均为 uint64。来源网络保留精确名称及 M6 原始域分离哈希。不存在状态转换时，三个 null 值与两个零承诺及零序号双向对应；发生转换时要求正序号、非零且不同的前后状态承诺。其他公开承诺与哈希保持原样，所有大整数避免转换成 JavaScript Number。

TypeScript 编码器重建 M6 运行时回执并计算 Compact 类型承诺，拒绝已承诺字段变更、截断标识、额外字段、非规范版本和不一致状态。结构完整性不能证明授权或最终确认；这些性质仍须由可信 M6 来源读取器及精确历史注册状态检查确定。

EIP-712 域为 Permio Gateway Transport、版本1，绑定精确目标链及执行注册表地址。签名覆盖发件箱键、来源身份哈希、精确回执字节哈希、密钥标识、签署时间和目标。来源身份哈希由网络名称、来源合约、完整交易字节、事件索引0及账本序号的 ABI 编码计算。签名元数据使用五个平铺 ABI 参数；Solidity 验证规范编码、来源身份与网络哈希，并恢复网关签名者。注册表按密钥名称的 Keccak 选择 epoch，继续执行来源、密钥状态、有效期、重放与执行范围检查。

Solidity 验证器认证网关断言，不验证 Midnight 证明、不重新计算 Compact persistentHash，也不独立确定最终确认。网关签署前必须完成上游检查。旧预期上游验证器仍明确标为夹具，并限制在本地31337链。

适配器注册仍限定于回执版本与操作模式；独立绑定再加入完整32字节接收方，指向已注册适配器。仅适配器注册管理员可创建或禁用绑定，每个绑定只注册一次，不能静默重定向或重新启用。执行要求操作适配器与精确接收方绑定均启用且指向同一适配器。注册表、事件、适配器、Envio 和界面均保留原始接收方，outputCommitment 不增加权限；绑定投影与回执、执行投影分开存储。规范的零状态三元组在投影中恢复为空值；完整非转换收据显示“No state transition”，不完整或部分数据仍表示未知。

验证覆盖两类状态回执、最大 uint64 版本、超过 JavaScript 安全整数范围的序号、完整33字节交易、签名域、畸形编码、低20字节相同的不同接收方、绑定范围与禁用，以及单次执行。真实 M6 解码器和承诺、共享编码器与签名器、本地部署的 EVM 合约贯通测试，以及使用同一编码的本机 HTTP 恢复测试均属于本地证据。Envio 3.14.0 在 Linux 下验证代码生成、类型及处理器；桌面与手机界面检查使用明确的合成公开回执。

来源发现、精确历史状态适配器和已签名信封持久化已实现，并已有真实 Preprod 公开输入的离线回放证据。在线来源配置、新的在线端到端验收、在线 Envio 索引、人工安全／隐私审查和受保护代码所有者批准仍未完成。本次表示变更不授权新的 Midnight 提交、远程证明请求、ECS 操作或分支清理。


注册表现分别存储签署截止与验证截止：签署时间必须早于签署截止，注册时刻必须早于验证截止，与 M7 重叠期规则一致。公开签名包先持久化再发送，重试与重启后保持原样；旧验证截止后仅追加新 epoch 包。历史公开 epoch 须保留配置，移除或禁止旧密钥会按设计停止投递。三份真实 Preprod SDK 回执已离线贯通编码、持久签名 HTTP 及历史时刻的隔离本地 EVM，每份均只注册和执行一次；确认丢失后重开 SQLite 复用完全相同的签名包。该证据不代表新的在线端到端运行或完整历史区块发现。相邻 JSON 报告和上述命令可复现这一公开数据回放；仓库中的公开收据夹具与两份报告记录的来源 SHA-256 完全一致。


来源适配器从明确部署高度逐个扫描完整连续区块，包含空块；要求已验证的官方最终确认索引器策略及现有认证 Preprod 配置或本机开发端点。其依据是上述官方版本源码的最终确认摄取路径，仍属于提供器信任，而非独立共识验证。操作意图标识通过固定 SDK 的只读身份副本提取，不能用余额调整或 Zswap 别名替代；授权仍核对原始绑定调用和 M6 VM 插入。SDK 区块哈希、交易哈希及高度须与发现结果一致，历史资格仅来自该精确状态，并在核对后开放。模板生命周期1或2、模块生命周期4遵循 M6 原规则；不得替换为当前或区块末尾状态。来源冲突停止存储，语义错误终止处理，临时 I/O 分类重试。操作员仍负责提供来源和签名配置；SDK 交易观察器保持其文档规定的无限等待契约；适配器使用 `transactionLookupTimeoutMilliseconds` 限制每次应用层等待，默认30,000毫秒，超时按来源暂不可用处理，重试与延迟完成均复用同一待完成观察任务。检查点验证仅查询哈希、高度、协议及父区块元数据；暂时缺失可重试，哈希冲突仍停止持久存储。本地检查未部署网关、中继或索引服务。
