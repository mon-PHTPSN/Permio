# Permio M8 execution indexer

This package is the public-only Envio HyperIndex read model for the M8
execution registry. It contains no private M5 values, stable cross-context
subject identifiers, ciphertext, Dynamic session identifiers, or Mera vault
material.

## Current status

`config.yaml` is deliberately marked
`EXPECTED_UPSTREAM_CONTRACT_FIXTURE_NOT_ACCEPTANCE_EVIDENCE`. Its local chain is
active so the in-memory handler tests can load the configuration. The configured
address is the deterministic first deployment produced by
`ExecutionRegistryLocalFixture` on a fresh Hardhat chain. Generated types,
handler tests, and fixture-chain events are preparation evidence only; they do
not establish live M6 receipt validation, M7 transport authenticity, production
M8 deployment, or Envio correctness.

## Reproducible commands

From the repository root:

```bash
npm run indexer:codegen
npm run indexer:typecheck
npm run indexer:test
npm run indexer:verify
npm run node
npm run deploy:m8:fixture:local
npm run seed:m8:fixture:local
npm run indexer:dev
npm run indexer:backfill
```

For the fixture smoke test, start a fresh Hardhat node, deploy the local fixture
module, seed its signed receipt and execution, and then start Envio. For any
reviewed deployment, replace the fixture address and start block with the exact
deployment values. Start Docker and supply `ENVIO_API_TOKEN` only through the
environment when the selected data source requires it. Envio commands and
handler tests require WSL 2 on Windows. The indexer workspace pins TypeScript
5.9.3 because Envio 3.14.0's handler-check worker requires the classic
TypeScript compiler API; the root project may continue using TypeScript 7.
`indexer:backfill` resets indexed state and must not be used against a
production database without an explicit recovery plan.

`indexer:verify` is the reproducible verification entry point: it regenerates
the intentionally ignored `.envio/types.d.ts` file before type-checking and
running the handler suite. The root TypeScript check deliberately excludes this
package so a fresh native-Windows checkout does not depend on stale local
generated types.

The product freshness check should query HyperIndex `_meta.progressBlockTime`.
Lag or an unavailable GraphQL endpoint is a read-model condition only and must
never approve, reject, revoke, replay, or otherwise change execution authority.

---

# 中文说明

本包是 M8 执行注册表的只含公开数据的 Envio HyperIndex 读取模型。它不包含私有 M5 值、
跨上下文稳定主体标识符、密文、Dynamic 会话标识符或 Mera vault 材料。

`config.yaml` 明确标记为
`EXPECTED_UPSTREAM_CONTRACT_FIXTURE_NOT_ACCEPTANCE_EVIDENCE`。本地链保持启用，以便内存
handler 测试能载入配置。所配置地址是全新 Hardhat 链上
`ExecutionRegistryLocalFixture` 第一次部署产生的确定性地址。生成类型、handler 测试与 fixture
链事件只属于准备证据，不能证明实时 M6 收据验证、M7 传输真实性、生产 M8 部署或 Envio 正确性。

从仓库根目录执行上面的命令。fixture 冒烟测试需要先启动全新 Hardhat 节点，再部署本地 fixture
模块、填充已签名收据与执行，然后启动 Envio。对于任何经过审核的部署，必须把 fixture 地址和
起始区块替换为精确部署值。启动 Docker，并且仅在选定数据源需要时通过环境提供
`ENVIO_API_TOKEN`。在 Windows 上，Envio 命令与 handler 测试必须使用 WSL 2。索引器工作区
固定 TypeScript 5.9.3，因为 Envio 3.14.0 的 handler 检查 worker 依赖经典 TypeScript compiler
API；根项目仍可继续使用 TypeScript 7。
`indexer:backfill` 会重置已索引状态；没有明确恢复计划时，不得对生产数据库执行它。

`indexer:verify` 是可复现的验证入口：它会先重新生成被有意忽略的 `.envio/types.d.ts`，再执行
类型检查和 handler 测试。根 TypeScript 检查会刻意排除此包，从而避免全新的原生 Windows
checkout 依赖过期的本地生成类型。

产品新鲜度检查应查询 HyperIndex `_meta.progressBlockTime`。索引延迟或 GraphQL endpoint 不可用
只属于读取模型状态，绝不能批准、拒绝、撤销、重放或以其他方式改变执行权限。
