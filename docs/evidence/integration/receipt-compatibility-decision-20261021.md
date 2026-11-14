# M6/M7/M8 receipt compatibility decision

Status: APPROVED_BY_USER. The user selected the lossless M8 extension in this chat on 2026-10-21. The approved extension is implemented; the combined local check passed 603 tests. Live acceptance and independent human review remain open.

The integration branch starts at published M6 head `f96ed6e1795e4193a1bd05b2baa7bae79dccd64a` and contains the complete M7 preparation (`bc2b93001cdb3bf90bfe0515848a44ce7da28509`) and M8 preparation (`5142daf557064e86fd126f2fb5cfa29187cf98cf`) histories. Existing milestone worktrees and ignored evidence are preserved. M9 integration is outside scope.

## Concrete incompatibility

| Boundary | Authoritative M6 v1 | M8 preparation interface |
| --- | --- | --- |
| Recipient | Exact 32-byte runtime recipient hash | 20-byte EVM address |
| Source transaction | Pinned SDK 33-byte transaction identifier (66 lowercase hex digits without prefix) | `bytes32` |
| Receipt identity | Compact typed persistent commitment | Fixture-only Keccak of the transport encoding |
| Version values | Exact semantic version strings derived from uint64 components | Fixture `bytes32` tokens |

Evidence: `packages/midnight-authorization/src/decision-receipt.ts` declares the exact fields, validates the 33-byte transaction identifier, and computes the authoritative receipt commitment. Its tests explicitly reject substituting a 32-byte hash. `runtime-credentials.ts` derives recipient identifiers with a domain-separated hash. At the M8 preparation baseline, `contracts/interfaces/IReceiptVerifier.sol` used `address recipient` and `bytes32 sourceTransaction`; `contracts/fixtures/ExpectedM6M7ReceiptVerifier.sol` declared a fixture-only receipt identity and version. These representations cannot be connected by truncation or an address cast without losing authorization/source information.

Affected requirements: M7 processing steps 3 and 5 and acceptance 6 (unchanged fields); M8 exact source/recipient/version enforcement and adapter scope; public-only Envio projections and the existing dashboard's source reference.

## Approved decision

Approved: extend the M8 verifier, record, events and projections to retain all M6 v1 fields losslessly, preserve the M6 receipt ID, and introduce a separate explicit recipient-to-adapter binding. The binding must not convert the recipient hash into an address, grant broader authority, or reinterpret outputCommitment. The shared transport encoding is now tested against the unchanged M6 decoder and local Solidity verifier.

Alternative: retain M8's existing interface and keep the integration blocked, preserving its fixture label. Changing M6's finalized receipt contract or truncating fields is not an acceptable compatibility repair.

The workspace AGENTS.md requires consulting the user before adopting an architecture when implementation reveals a prescribed architecture is incompatible with required behavior. The scoped asynchronous question was answered explicitly: "Extend M8 losslessly (recommended)". This authorizes the lossless verifier, storage, indexer and dashboard extension with a separate exact recipient-to-adapter binding.

## Independent authorized work

M7 now includes configured indexed-source discovery, exact historical eligibility checks, the lossless M6 codec and persistent signed delivery packets. Dependency injection remains available for operator configuration and tests. Three actual recorded Preprod SDK receipts also passed codec and local EVM replay, each registering and executing once despite acknowledgement loss and restart. These checks do not establish new live M6-to-EVM acceptance or complete historical block discovery; the evidence tiers are recorded separately.

M6 independent human security/privacy review remains OPEN. Main requires an actual code-owner approval and dismisses stale approvals. No branches or milestone worktrees are eligible for cleanup until the accepted integration preserves their work and all cleanup checks succeed. ECS remains unused by this task; no new proof request or native transaction is authorized or performed.

## 中文

用户已于2026-10-21在本聊天明确选择“无损扩展 M8”，批准验证器、存储、索引器和界面的无损扩展，以及独立明确的接收方至适配器绑定。批准的扩展已实现，完整本地检查通过603项测试；在线验收与独立人工审查仍未完成。集成从已发布 M6 精确提交开始，完整保留 M7/M8 准备分支历史、原工作区和被忽略的本地证据；M9 不在本次范围内。

M6 的接收方是32字节运行时标识哈希，来源交易标识为SDK要求的33字节，收据ID是Compact类型承诺，版本来自精确uint64分量。M8准备接口使用20字节地址、bytes32交易字段，以及明确标注为夹具的标识和版本。截断或强制转换会损失授权与来源信息，违反M7不可修改收据及M8精确接收方／来源验证要求。

建议无损扩展M8的验证器、记录、事件和投影，保留M6原收据ID，并单独明确绑定接收方与执行适配器；不得扩大权限或重新解释outputCommitment。另一方案是保持M8接口不变并维持集成阻塞。现行AGENTS.md要求遇到此类架构不兼容时咨询用户；用户已明确回答并批准该具体方案。

M7现已实现配置化索引来源发现、精确历史资格检查、无损M6编码和已签名投递包持久化，操作员配置与测试仍通过依赖注入提供。三份真实Preprod SDK历史收据也已通过编码与本地EVM回放；即使确认丢失后重启，每份也只登记和执行一次。这些证据不能代表新的在线端到端验收或完整历史区块发现，证据层级另行记录。人工安全／隐私审查仍为OPEN；主分支仍需真实代码所有者批准；在集成被接受且完成清理核查前保留所有分支。此任务未使用ECS、请求新证明或提交原生交易。
