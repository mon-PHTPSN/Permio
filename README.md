# Permio

Permio is a programmable contextual-privacy architecture: versioned scenario
templates and context-bound capabilities are authorized privately on Midnight,
then consumed as narrow receipts by Monad or ordinary applications. The current
checkout implements the M2 scenario-template domain, M3 deterministic
generator, M4 template governance, M5 context accounts and scoped sessions,
and the recipient-bound execution-registry slice. Generic Midnight proof
enforcement and the later receipt, execution, and encrypted-evidence
milestones remain incomplete against the authoritative architecture.

This is a clean implementation for Monad Metropolis Track 4: Trust, Identity &
AI Infrastructure.

Start with the human-first
[`from need to system design guide`](docs/permio-from-need-to-design.html), or
read its [`canonical Markdown source`](docs/PERMIO_FROM_NEED_TO_DESIGN.md). It
follows one continuous path from contextual-privacy needs through programmable
scenario templates, context-bound permissions, cross-domain use cases, module
boundaries, and implementation order.

The detailed architecture for scenario governance, generated instances,
privacy authorization, execution receipts, and encrypted evidence is available
as a [`semantic HTML reading edition`](docs/programmable-context-architecture.html)
and [`canonical Markdown source`](docs/PROGRAMMABLE_CONTEXT_ARCHITECTURE.md).
Edit only the Markdown source, then run `npm run docs:build` to regenerate the
HTML. `npm run docs:check` and the complete `npm run check` command reject stale
generated HTML.

Implementation is governed by the
[`deterministic milestone specification`](docs/DETERMINISTIC_MILESTONES.md),
also available as a generated
[`HTML milestone edition`](docs/deterministic-milestones.html). Each milestone
has fixed artifacts, privacy invariants, negative tests, and a binary exit gate.
M0 through M5 are complete. Machine-readable acceptance evidence is stored
under `docs/evidence/M0` through `docs/evidence/M5`. The actual M4 and M5
implementation work, negative cases, rebase resolutions, commands, results,
and limitations are recorded in the
[`M4 development log`](docs/evidence/M4/development-log.md) and
[`M5 development log`](docs/evidence/M5/development-log.md). `M6 — Generic
Midnight proof enforcement` is next. Its architecture is fixed: active template
and proof-module lifecycle facts are direct Midnight records; namespace
authority and current private-credential status use separate versioned Merkle
roots; instance allocation, capabilities, sessions, and action intents remain
private signed assertions; and private authorization state is ordered by public
commitments, sequences, and scoped nullifiers.

Templates may configure only exact active implementations from an allowlisted,
versioned proof-module registry. A template cannot introduce executable proof
logic or select `latest`. Unsupported proof semantics stop activation and enter
a separately reviewed protocol-upgrade process. For a declared state
transition, M6 verifies and atomically replaces the current state commitment
and sequence; M8 or the target application separately owns downstream execution
success or failure. The approved boundary is recorded in the
[`M6 architecture decision`](docs/evidence/M6/architecture-decision.md); the
concrete pre-implementation investigation is recorded in the
[`M6 development log`](docs/evidence/M6/development-log.md).

The selected post-M6 sponsor scope is Envio, Mera, and Dynamic; Qwen and other
external AI-agent runtimes are intentionally out of scope. M7 stays
provider-neutral, M8 adds an Envio HyperIndex read model that drives the product
dashboard, M10 uses Mera PRF for non-account custody of recipient evidence keys,
and M11 uses Dynamic for authentication plus the supported 1AM Midnight-wallet
connection and a separate Monad EVM-wallet binding. M12 requires live evidence
for all three integrations. The exact Dynamic wallet key/connector, SDK version,
and supported Midnight network must be recorded and verified in its sandbox
before the 1AM integration is claimed complete.

M4 continues to verify Ed25519 reviewer attestations, unique eligible
reviewers, thresholds, rejection state, and separation of duties. Midnight
does not repeat those checks in M6 v1. Instead, the namespace-scoped M4
governance/activation authority signs an exact, replay-protected activation
envelope with the allowlisted `midnight-jubjub-schnorr-v1` admission profile.
The M6 registry circuit verifies that authority and admits only the envelope's
exact namespace, template ID, semantic version, content hash, M4 activation
record hash, and approval-evidence commitment.

## Current scope

The implemented off-chain packages form a concrete dependency chain:

- `@permio/scenario-domain` validates and hashes application-neutral scenario
  templates;
- `@permio/scenario-generator` creates deterministic synthetic instances and
  scans public artifacts for private-value leakage;
- `@permio/scenario-governance` separates five authorities and governs exact
  template versions and hashes; and
- `@permio/context-accounts` consumes an active allocation, attenuates
  capabilities, issues fresh scoped sessions, and authorizes signed actions;
- `@permio/gateway` provides the M6-independent M7 foundation for strict public
  source/receipt-byte validation, exact source allowlisting, domain-separated
  outbox identity, and verifier-key rotation windows.

M6 has a separate `admit-m4-activation-v1` registry circuit plus the initial
runtime modules `delegated-capability-action-v1` and
`private-state-transition-v1`. Runtime modules emit a common minimal
`DecisionReceipt`. The M7 gateway is a finalized-source observer and byte-exact
transport signer; it does not re-evaluate private policy or reinterpret
module-specific output.

For M6 development, the sibling `../information-flow` checkout is a reference
for Midnight integration mechanics only: Compact compilation, managed
artifacts, resumable wallet synchronization, deployment/reconnect, proof-server
use, and public-only live evidence. It is not a Permio dependency or product
template, and its application model, contract state, named actors, wallet
secrets, checkpoints, and deployed addresses must not be copied into Permio.
The workspace provides three already-synchronized disposable Preprod account
checkpoints there and a pinned local proof server at `http://127.0.0.1:6300`.
The checkpoints and secrets remain ignored and privacy-sensitive; Local Dev is
still the mandatory M6 acceptance network, while Preprod reuse is an opt-in
secondary smoke test.

The current on-chain vertical slice remains a Solidity registry for short-lived
attestations. An authorized verifier signs an EIP-712 payload that binds a
claim to:

- one versioned schema;
- one Midnight network, contract, and transaction reference;
- one action commitment and scoped nullifier;
- one recipient and purpose; and
- one issuance and expiry window.

The registry verifies the signature, rejects a reused scoped entitlement, and
supports revocation. It does not receive a person's address, order ID,
credential ID, holder secret, or private source record.

EIP-712 is Ethereum's structured-data signing standard. A scoped nullifier is a
one-use marker that prevents replay within a defined context without becoming a
global user identifier.

## Toolchain

- Node.js 22.13 or newer
- Hardhat 3
- Solidity 0.8.31 targeting the `osaka` EVM version required by current Monad
  deployment guidance
- `viem` for typed EVM interactions and tests
- OpenZeppelin Contracts for audited ownership, EIP-712, and signature helpers

The setup is derived from Monad's official
[`hardhat3-monad`](https://github.com/monad-developers/hardhat3-monad)
template.

## Networks

| Network | Chain ID | RPC | Explorer |
| --- | ---: | --- | --- |
| Monad Testnet | 10143 | `https://rpc.testnet.monad.xyz` | `https://testnet.monadscan.com` |
| Monad Mainnet | 143 | `https://rpc.monad.xyz` | `https://monadscan.com` |

Testnet is the deployment target for the first Permio demo.

## Local development

```bash
npm install
npm run check
```

Local compilation and tests do not require a private key.

## Deployment

Prefer Hardhat's encrypted keystore:

```bash
npx hardhat keystore set PRIVATE_KEY
npx hardhat keystore set ETHERSCAN_API_KEY
npm run deploy:testnet
```

Alternatively, copy `.env.example` to `.env` and set the values there. Never
commit `.env`, a private key, a seed phrase, or production user data.

The deployment module initially authorizes the deployer as both owner and
verifier. Rotate the verifier with `setVerifier` before using a separate gateway
key, and transfer ownership before any production deployment.

## Trust boundary

The current contract trusts configured verifier keys. It verifies that a
verifier signed the exact recipient-, purpose-, schema-, commitment-, and
expiry-bound payload; it does not yet verify Midnight consensus or a Midnight
zero-knowledge proof directly on Monad.

The ordinary user should not submit the Monad transaction. A recipient or
relayer submits it so a reusable wallet does not become a cross-context user
identifier.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run typecheck` | Check TypeScript configuration and tests. |
| `npm run compile` | Compile the Solidity contract. |
| `npm test` | Run protocol, scenario-domain, generator, governance, context-account, and Hardhat contract tests. |
| `npm run check` | Run all local verification. |
| `npm run node` | Start a local Hardhat JSON-RPC node. |
| `npm run deploy:local` | Deploy to Hardhat's simulated network. |
| `npm run deploy:testnet` | Deploy to Monad Testnet. |
| `npm run deploy:mainnet` | Deploy to Monad Mainnet. |

## License

Apache-2.0. See `LICENSE`.

---

# 中文说明

Permio 是一套可编程情境隐私架构：版本化情境模板和上下文能力在 Midnight 上完成私有授权，
再由 Monad 或普通应用以狭窄收据的形式消费。当前 checkout 已实现 M2 情境模板领域、M3
确定性生成器、M4 模板治理、M5 上下文账户与有限会话，以及接收方绑定执行注册表切片。
通用 Midnight 证明强制执行，以及后续收据、执行和加密证据里程碑仍未完成。
这是面向 Monad Metropolis Track 4“信任、身份与 AI 基础设施”的全新实现。

建议先阅读以人的理解路径为主的
[`从需求到系统设计指南`](docs/permio-from-need-to-design.html)，或查看其
[`规范 Markdown 源文件`](docs/PERMIO_FROM_NEED_TO_DESIGN.md)。它沿着一条连续主线，
从情境隐私需求出发，依次解释可编程情境模板、上下文权限、跨领域用例、模块边界和实施顺序。

情境治理、生成实例、隐私授权、执行收据和加密证据的详细架构提供
[`语义化 HTML 阅读版`](docs/programmable-context-architecture.html)和
[`规范 Markdown 源文件`](docs/PROGRAMMABLE_CONTEXT_ARCHITECTURE.md)。
只编辑 Markdown 源文件，然后运行 `npm run docs:build` 重新生成 HTML。
`npm run docs:check` 和完整的 `npm run check` 命令会拒绝过期的 HTML 生成文件。

实施过程由[`确定性里程碑规范`](docs/DETERMINISTIC_MILESTONES.md)约束，并提供自动生成的
[`HTML 里程碑版本`](docs/deterministic-milestones.html)。每个里程碑都规定了固定产物、
隐私不变量、负向测试和二元退出门槛。
M0 至 M5 均已完成。机器可读的验收证据保存在 `docs/evidence/M0` 至
`docs/evidence/M5`。M4 和 M5 的实际实现工作、负向用例、变基冲突解决、执行命令、结果与
限制分别记录在[`M4 开发日志`](docs/evidence/M4/development-log.md)和
[`M5 开发日志`](docs/evidence/M5/development-log.md)。下一个里程碑是
`M6——通用 Midnight 证明强制执行`。其架构已经固定：活跃模板与证明模块生命周期事实使用
Midnight 直接记录；namespace 权限和当前私有 credential 状态使用两个独立的版本化 Merkle
root；实例分配、capability、session 和 action intent 保持为私有签名断言；私有授权状态通过
公开 commitment、序号和限定范围 nullifier 排序。

模板只能配置 allowlist 中精确、活跃、版本化的证明模块实现，不能引入可执行证明逻辑，也不能
选择 `latest`。不支持的证明语义会停止激活，并进入独立审核的协议升级流程。对于声明的状态
转换，M6 验证并原子替换当前状态 commitment 与序号；M8 或目标应用另行负责下游执行成功或失败。
获批准边界记录在[`M6 架构决策`](docs/evidence/M6/architecture-decision.md)中。
具体的实现前调查记录在[`M6 开发日志`](docs/evidence/M6/development-log.md)中。

M4 继续验证 Ed25519 审核者证明、合格审核者唯一性、阈值、拒绝状态和职责分离。M6 v1 不在
Midnight 上重复这些检查。命名空间范围内的 M4 治理／激活权限改为使用 allowlist 中的
`midnight-jubjub-schnorr-v1` 准入 profile，对精确且防重放的激活封装签名。M6 注册电路验证该
权限，并且只登记封装中的精确 namespace、template ID、语义版本、内容哈希、M4 激活记录哈希
和审批证据 commitment。

当前链下包形成明确的依赖链：`@permio/scenario-domain` 验证并哈希应用无关的情境模板；
`@permio/scenario-generator` 生成确定性的合成实例，并扫描公开产物中的私有值泄漏；
`@permio/scenario-governance` 分离五类权限，并治理精确的模板版本与哈希；
`@permio/context-accounts` 消费已激活的分配，收窄能力范围，签发新鲜的有限会话，并授权
签名操作；`@permio/gateway` 提供不依赖 M6 的 M7 基础能力，包括严格验证公开来源与收据字节、
精确来源 allowlist、域分离的 outbox 身份，以及验证者密钥轮换时间窗。

M6 使用独立的 `admit-m4-activation-v1` 注册电路，以及首批运行时模块
`delegated-capability-action-v1` 和 `private-state-transition-v1`。运行时模块统一输出最小
`DecisionReceipt`。M7 网关只观察已最终确认来源并对逐字节不变的传输封装签名；它不会重新
评估私有策略，也不会解释模块特定输出。

M6 开发可以把相邻的 `../information-flow` checkout 用作 Midnight 集成机制的参考，包括
Compact 编译、托管生成产物、可恢复钱包同步、部署／重连、proof server 使用和只包含公开数据
的真实链证据。它不是 Permio 的依赖或产品模板；其应用模型、合约状态、具名参与者、钱包秘密、
checkpoint 和已部署地址都不能复制进 Permio。Workspace 已在该 checkout 中提供三个完成同步的
一次性 Preprod 账户 checkpoint，并提供固定版本的本地证明服务器
`http://127.0.0.1:6300`。Checkpoint 与秘密保持 ignored 且属于隐私敏感数据；Local Dev 仍是
M6 的强制验收网络，复用 Preprod 账户只属于显式选择的补充 smoke test。

第一个纵向功能切片是短期证明的 Solidity 注册表。授权验证者使用 EIP-712 对载荷签名，
把声明绑定到一个版本化模式、Midnight 网络/合约/交易引用、一个操作承诺和限定范围的
空值标识、一个接收方和用途，以及签发与过期时间。注册表验证签名、拒绝重复使用限定范围
的权益，并支持撤销。它不会接收个人地址、订单 ID、凭证 ID、持有人秘密或私有源记录。

EIP-712 是以太坊的结构化数据签名标准。限定范围的空值标识是在指定上下文中阻止重放的
一次性标记，但它不会成为全局用户标识。

本项目使用 Node.js 22.13 或更新版本、Hardhat 3、面向 `osaka` EVM 版本的 Solidity
0.8.31、用于类型化 EVM 交互与测试的 `viem`，以及提供所有权、EIP-712 和签名辅助组件
的 OpenZeppelin Contracts。配置源自 Monad 官方 `hardhat3-monad` 模板。

Monad 测试网链 ID 为 10143，主网链 ID 为 143。第一版 Permio 演示以测试网作为部署
目标。本地开发执行 `npm install` 和 `npm run check`，本地编译与测试不需要私钥。

部署时优先使用 Hardhat 加密密钥库保存 `PRIVATE_KEY` 和 `ETHERSCAN_API_KEY`。也可以
复制 `.env.example` 为 `.env`，但绝不能提交 `.env`、私钥、助记词或生产用户数据。
部署模块最初把部署者同时设为所有者和验证者；使用独立网关密钥之前，应通过
`setVerifier` 更换验证者，任何生产部署前也应转移所有权。

当前合约信任预先配置的验证者密钥。它验证签名是否精确绑定接收方、用途、模式、承诺和
有效期；目前不会在 Monad 上直接验证 Midnight 共识或 Midnight 零知识证明。普通用户
不应提交 Monad 交易，应由接收方或中继器提交，以避免可复用钱包成为跨上下文用户标识。

本项目采用 Apache-2.0 许可证，详见 `LICENSE`。
