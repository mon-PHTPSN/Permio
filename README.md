# Permio

Permio is a programmable contextual-privacy architecture: versioned scenario
templates and context-bound capabilities are authorized privately on Midnight,
then consumed as narrow receipts by Monad or ordinary applications. The current
checkout implements the scenario-template domain package and the
recipient-bound execution-registry slice. Later authorization, generation, and
governance milestones remain incomplete against the authoritative architecture.

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
`M0 — Documentation and naming baseline` and the historical `M1 — Existing
receipt-protocol baseline` are complete. `M2 — Scenario-template domain
package` is also complete, with acceptance evidence in
[`docs/evidence/M2/acceptance.json`](docs/evidence/M2/acceptance.json); `M3 —
Deterministic scenario generator` is next.

## Current scope

The first vertical slice is a Solidity registry for short-lived attestations.
An authorized verifier signs an EIP-712 payload that binds a claim to:

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
| `npm test` | Run protocol, scenario-domain, and contract integration tests. |
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
再由 Monad 或普通应用以狭窄收据的形式消费。当前 checkout 已实现情境模板领域包和接收方绑定
执行注册表切片；后续授权、生成和治理里程碑尚未完成，因此还未完整符合权威架构。
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
`M0——文档与命名基线`、历史 `M1——现有收据协议基线` 和
`M2——情境模板领域包` 均已完成。M2 的验收证据位于
[`docs/evidence/M2/acceptance.json`](docs/evidence/M2/acceptance.json)；下一个实施里程碑是
`M3——确定性情境生成器`。

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
