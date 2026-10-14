# M8 Development Log — Generalized Execution Registry Preparation

Date: 2026-10-13<br>
Branch: `feat/m8-execution-registry`<br>
Status: local fixture contract/indexer verification complete; upstream and product acceptance remains blocked

This log records the dependency-neutral M8 work performed against explicitly
labeled expected M6/M7 fixtures, including a live local Envio fixture drill. It
is not M8 acceptance evidence and does not claim authoritative M6 receipt
validation, M7 transport authenticity, a reviewed deployment, or the required
M11 GraphQL product consumption.

## Privacy property and observable criterion

The registry and read model accept and expose only the public authorization
receipt fields required for exact downstream execution. They do not receive or
index a stable subject identifier, private M5 value, ciphertext, Dynamic
session identifier, Mera vault material, credential payload, or proof witness.

The observable local criteria are:

- signed receipt fields cannot be widened or substituted;
- source, signer epoch, validity, recipient, schema, and scoped replay rules
  fail closed;
- the submitting relayer remains distinct from authorization and governance;
- a receipt is routed once to the exact version-and-action adapter;
- downstream failure is recorded without rewriting or revoking the underlying
  authorization record; and
- deterministic public event projections and hourly aggregates contain only
  the declared schema fields.

## Implemented contract boundary

`contracts/ExecutionRegistry.sol` adds a generalized registry with six
pairwise-distinct initial authorities: default administration, receipt-schema
administration, source allowlisting, gateway-key rotation, adapter
registration, and emergency pause/revocation. Receipt verifiers are immutable
per receipt version, gateway keys use bounded epochs, sources are exact
network-and-contract pairs, and adapters are exact receipt-version and action
schema pairs.

`contracts/interfaces/IReceiptVerifier.sol` is the versioned decoding and
verification boundary. `contracts/interfaces/IExecutionAdapter.sol` is the
public execution boundary. A receipt is marked consumed before the adapter
call; a returned failure or revert is recorded as an execution result and
cannot cause the receipt to be executed a second time.

Existence is stored explicitly rather than inferred from timestamps, so a
valid local genesis timestamp of zero cannot make a stored receipt or
execution appear absent.

The verifier and adapter registrars also reject addresses without deployed
contract code. The deployed-contract suite now exercises immutable verifier,
gateway-epoch, and adapter registration; source removal; disabled, missing, and
future gateway-key paths; invalid validity windows and required fields;
non-canonical fixture bytes; duplicate receipts and nullifiers; missing and
disabled adapters; revocation and expiry; missing records; downstream returned
failure; and downstream reverts.

`contracts/fixtures/ExpectedM6M7ReceiptVerifier.sol` is deliberately marked
`EXPECTED_UPSTREAM_CONTRACT_FIXTURE_NOT_ACCEPTANCE_EVIDENCE` and refuses to
deploy outside Hardhat chain ID 31337. It models the currently documented
expected public fields and a target-chain/target-registry-bound EIP-712
signature. It must be deleted or replaced during reviewed M6/M7 integration;
the production deployment module does not deploy it.

`contracts/fixtures/RecordingExecutionAdapter.sol` is a local test double that
records the exact public receipt and execution-parameter hash and can exercise
returned-failure and revert paths.

`ignition/modules/ExecutionRegistry.ts` provides a local deployment module
whose defaults assign the six powers to six separate Hardhat accounts. Those
defaults are not production key-management guidance.

## Implemented HyperIndex preparation

`packages/execution-indexer` pins Envio 3.14.0 and supplies:

- a localhost Hardhat configuration targeting the deterministic first registry
  address produced by the explicitly fixture-only deployment module;
- a public-only GraphQL schema for receipt, execution, adapter, gateway-key,
  verifier, source, and hourly aggregate projections;
- deterministic handlers for every configured registry event;
- generated project types;
- reproducible code-generation, type-check, test, start, and backfill commands;
  and
- four in-memory handler tests covering success, failure, revocation,
  governance changes, aggregation, and forbidden private schema fields.

The localhost chain remains active because Envio's test indexer refuses a
configuration in which every chain is skipped. The configured address is
`0x5fbdb2315678afecb367f032d93f642f64180aa3`, the deterministic first registry
deployment on a fresh Hardhat chain. This remains an expected-upstream fixture,
not a reviewed production deployment.

The generated `.envio/types.d.ts` is intentionally ignored. The WSL-only
`npm run indexer:verify` sequence regenerates it before type-check and tests.
The root TypeScript configuration excludes the indexer package so a fresh
native-Windows checkout cannot pass or fail based on a stale local generated
file. The indexer workspace pins TypeScript 5.9.3 because Envio 3.14.0's
handler-check worker reads the classic `ts.sys.fileExists` compiler API;
TypeScript 7.0.2 does not expose that API shape. The root project remains on
TypeScript 7.0.2.

## Local verification

The following checks passed on 2026-10-12:

1. `npm run check` on native Windows:
   - all generated documentation was current;
   - root TypeScript type-check passed;
   - Solidity 0.8.31 compilation for the Osaka EVM target passed;
   - 6 protocol, 15 scenario-domain, 14 generator, 16 governance, and 13
     context-account tests passed; and
   - 24 generalized M8 plus 6 legacy deployed-contract tests passed against
     Hardhat's local EDR simulated chain.
2. `npm run indexer:codegen` passed in WSL 2 using Node.js 22.23.2 and Envio
   3.14.0.
3. `npm run indexer:typecheck` passed natively.
4. `npm run indexer:test` passed 4/4 in WSL 2. Envio rejects native Windows
   execution by design, so this is a required platform split rather than a
   skipped test.
5. `git diff --check` reported no whitespace errors; Git emitted only the
   repository's existing LF-to-CRLF working-copy notices for generated HTML.
6. `npm run deploy:m8:local` successfully deployed `ExecutionRegistryModule`
   to Hardhat's disposable in-process network. Ignition reported the expected
   warning that in-process deployment state is lost after the command.

The WSL commands emitted the known localhost-proxy warning because WSL is in
NAT mode. No command required that proxy and the tests completed successfully.

## Live HyperIndex infrastructure check

Docker Desktop 4.91.0, Docker Engine 29.8.0, and Compose 5.5.1 were confirmed
healthy from Ubuntu 24.04 WSL. Docker Desktop's native Linux CLI mount was not
persistent across the final WSL restart, while the engine and existing Envio
containers remained healthy. A narrow `/usr/local/bin/docker` link to the
installed Docker Desktop Windows CLI restored stable WSL command access. No
Docker data, named-pipe bridge, or production Docker setting was changed.

`ExecutionRegistryLocalFixture` deployed the registry, expected-upstream
verifier, and recording adapter to a persistent chain-31337 node. The registry
address was `0x5FbDB2315678afecb367f032d93F642f64180aa3`. The final seed command
registered and executed a signed fixture receipt at block 9. The successful
run recorded receipt ID
`0x620c236a7c33fee9cfea0d5decf2d43fd83b46a83e1d60f1b8035487c1a036ee`,
registration transaction
`0x1bc8a9fa20f2f12d56aadac978055dc4435b4608e3b1f12d522210ae7c728a63`,
and execution transaction
`0xcc56b477806140365a019bcba1c8f9d753961eb32932349adc757ec3bde874d3`.
These are disposable local fixture identifiers, not upstream authenticity or
public-network evidence.

Envio 3.14.0 pulled and started PostgreSQL 18.3 and Hasura GraphQL Engine
2.43.0. Its first indexer startup exposed the TypeScript 7 compiler-API
incompatibility described above. After the scoped TypeScript 5.9.3 pin,
`npm run indexer:verify` again passed code generation, type-check, and all 4/4
handler tests. `npm run indexer:backfill` then indexed the local fixture through
block 9. GraphQL returned one consumed, non-revoked receipt, one successful
execution, and one hourly aggregate with 1 registration, 1 attempt, 1 success,
and 0 failures. Restarting with `npm run indexer:dev` resumed the persisted
checkpoint at block 9 without duplication.

A disposable reorg drill snapshotted block 9, added a second receipt and
execution at blocks 10 and 11, and observed GraphQL counts and aggregates rise
from 1 to 2. Reverting the snapshot and mining an event-free alternative branch
through block 12 caused Envio to detect the block-11 hash mismatch, roll back
five orphaned events to block 9, remove the second receipt and execution, and
restore the original counts and aggregate exactly. This verifies the configured
fixture indexer's GraphQL, restart, backfill, and pre-finality rollback behavior;
it does not verify the future authoritative M6/M7 pipeline or a product consumer.

## Dependency audit

`npm audit --omit=dev --json` reported 10 production dependency findings in
the Envio 3.14.0 dependency tree: 3 low, 1 moderate, 6 high, and 0 critical.
The affected transitive packages include Express/body-parser/path-to-regexp,
qs, and the Envio-local viem/ws pair. npm's proposed automatic remedy replaces
Envio 3.14.0 with 2.32.12, a breaking downgrade that conflicts with the pinned
current project API. No automatic audit fix or unverified dependency override
was applied. A reviewed Envio release or compatibility-tested override is
required before production exposure.

## Remaining M8 exit-gate work

M8 remains incomplete until all of the following are demonstrated:

- replace the expected fixture with the reviewed, versioned M6 receipt codec
  and M7 transport verifier;
- deploy the generalized registry and real adapters in the required local and
  public Monad-compatible environments;
- point HyperIndex at the exact deployment address and start block;
- repeat the byte-exact projection, GraphQL, restart/backfill, and documented
  reorg checks against the reviewed M6/M7 contracts and required deployments;
- make the M11 receipt/execution history and aggregate view consume that
  GraphQL API, including explicit stale/unavailable UI behavior; and
- resolve or formally accept the Envio transitive dependency advisories before
  any production deployment.

The passing fixture and in-memory tests are prerequisites for those checks,
not substitutes for them.

---

# M8 开发日志——泛化执行注册表准备

日期：2026-10-13<br>
分支：`feat/m8-execution-registry`<br>
状态：本地 fixture 合约／索引器／浏览器验证已完成；上游与产品验收仍受阻塞

本日志记录基于明确标注的预期 M6/M7 fixture 所完成的依赖中立 M8 工作，包括实时本地 Envio
fixture 演练。它不是 M8 验收证据，也不声称已完成权威 M6 收据验证、M7 传输真实性验证、经过
审核的部署或所需的 M11 GraphQL 产品消费。

## 隐私属性与可观察标准

注册表和读取模型只接收并公开精确下游执行所需的公共授权收据字段。它们不接收或索引稳定主体
标识符、私有 M5 值、密文、Dynamic 会话标识符、Mera vault 材料、credential 载荷或证明 witness。

本地可观察标准包括：签名收据字段不能被扩大或替换；来源、签名者 epoch、有效期、接收方、
schema 和限定范围重放规则均采用失败关闭；提交中继器与授权及治理保持分离；收据只能被路由一次，
并且只能到精确版本与操作的 adapter；下游失败会被记录，但不会重写或撤销底层授权记录；以及
确定性的公共事件投影和小时聚合只包含声明的 schema 字段。

## 已实现的合约边界

`contracts/ExecutionRegistry.sol` 添加了泛化注册表，具有六个初始时必须两两不同的权限：默认管理、
收据 schema 管理、来源 allowlist、网关密钥轮换、adapter 登记和紧急暂停／撤销。收据验证器按
收据版本保持不可变，网关密钥使用有界 epoch，来源是精确的网络与合约对，adapter 是精确的收据
版本与 action schema 对。

`contracts/interfaces/IReceiptVerifier.sol` 是版本化解码与验证边界；
`contracts/interfaces/IExecutionAdapter.sol` 是公共执行边界。调用 adapter 前，收据会先标记为已消费；
返回失败或 revert 都会记录为执行结果，且不能让同一收据再次执行。

存在性通过显式状态保存，而不是从时间戳推断，因此有效的本地创世时间戳零不会让已存收据或执行
记录看似不存在。

验证器和 adapter 登记器还会拒绝没有已部署合约代码的地址。已部署合约测试套件现在覆盖：不可变
验证器、网关 epoch 与 adapter 登记；来源移除；禁用、缺失和未来网关密钥路径；无效有效期窗口与
必需字段；非规范 fixture 字节；重复收据与 nullifier；缺失及禁用 adapter；撤销与过期；缺失记录；
下游返回失败；以及下游 revert。

`contracts/fixtures/ExpectedM6M7ReceiptVerifier.sol` 明确标记为
`EXPECTED_UPSTREAM_CONTRACT_FIXTURE_NOT_ACCEPTANCE_EVIDENCE`，并拒绝部署到 Hardhat 链 ID
31337 以外的链。它对当前文档中的预期公共字段，以及绑定目标链和目标注册表的 EIP-712 签名进行
建模。经过审核的 M6/M7 集成必须删除或替换它；生产部署模块不会部署它。

`contracts/fixtures/RecordingExecutionAdapter.sol` 是本地测试替身，用于记录精确公共收据和执行参数
哈希，并覆盖返回失败与 revert 路径。

`ignition/modules/ExecutionRegistry.ts` 提供本地部署模块，其默认设置把六项权限分配给六个不同的
Hardhat 账户。这些默认设置不是生产密钥管理指导。

## 已实现的 HyperIndex 准备

`packages/execution-indexer` 固定 Envio 3.14.0，并提供：指向明确仅限 fixture 的部署模块所生成
确定性首个注册表地址的 localhost Hardhat 配置；面向收据、执行、adapter、网关密钥、验证器、来源和小时聚合投影的只含公开数据
GraphQL schema；所有已配置注册表事件的确定性 handler；生成的项目类型；可复现的代码生成、
类型检查、测试、启动和 backfill 命令；以及四个内存 handler 测试，覆盖成功、失败、撤销、治理
变化、聚合和禁止的私有 schema 字段。

localhost 链保持启用，因为 Envio 测试索引器拒绝所有链都被跳过的配置。所配置地址为
`0x5fbdb2315678afecb367f032d93f642f64180aa3`，即全新 Hardhat 链上确定性的首个注册表部署。
这仍是预期上游 fixture，而不是经过审核的生产部署。

生成的 `.envio/types.d.ts` 会被有意忽略。仅限 WSL 的 `npm run indexer:verify` 序列会在类型检查和
测试前重新生成它。根 TypeScript 配置排除了索引器包，因此全新的原生 Windows checkout 不会因为
过期的本地生成文件而通过或失败。索引器工作区固定 TypeScript 5.9.3，因为 Envio 3.14.0 的
handler 检查 worker 会读取经典 `ts.sys.fileExists` compiler API，而 TypeScript 7.0.2 不再提供
该 API 形状。根项目仍使用 TypeScript 7.0.2。

## 本地验证

以下检查于 2026-10-12 通过：原生 Windows 上的 `npm run check` 证明所有生成文档为最新、根
TypeScript 类型检查通过、面向 Osaka EVM 的 Solidity 0.8.31 编译通过、6 个协议测试、15 个
情境领域测试、14 个生成器测试、16 个治理测试、13 个上下文账户测试，以及在 Hardhat 本地 EDR
模拟链上运行的 24 个泛化 M8 与 6 个旧版部署合约测试通过。WSL 2 中使用 Node.js 22.23.2 与
Envio 3.14.0 的 `npm run indexer:codegen` 通过；原生环境的 `npm run indexer:typecheck` 通过；
WSL 2 中 `npm run indexer:test` 以 4/4 通过。Envio 按设计拒绝原生 Windows 执行，因此这种平台
拆分属于必需条件，而不是跳过测试。`git diff --check` 未发现空白错误，仅针对生成 HTML 输出仓库
已有的 LF 转 CRLF 工作副本提示。

`npm run deploy:m8:local` 已成功把 `ExecutionRegistryModule` 部署到 Hardhat 的一次性进程内网络。
Ignition 输出了预期提示：命令结束后，进程内部署状态会丢失。

WSL 命令发出了已知的 localhost proxy 提示，因为 WSL 使用 NAT 模式。没有命令依赖该 proxy，
测试均成功完成。

## 实时 HyperIndex 基础设施检查

已从 Ubuntu 24.04 WSL 确认 Docker Desktop 4.91.0、Docker Engine 29.8.0 和 Compose 5.5.1
健康。Docker Desktop 的原生 Linux CLI 挂载在最终一次 WSL 重启后没有保持，但引擎与现有 Envio
容器仍然健康。通过一个仅限 `/usr/local/bin/docker`、指向已安装 Docker Desktop Windows CLI 的
链接恢复了稳定的 WSL 命令访问。没有更改 Docker 数据、引入 named-pipe bridge 或修改生产设置。

`ExecutionRegistryLocalFixture` 已把注册表、预期上游验证器和记录 adapter 部署到持久 chain-31337
节点。注册表地址为 `0x5FbDB2315678afecb367f032d93F642f64180aa3`。最终填充命令在区块 9 注册并
执行了一条已签名 fixture 收据，记录的收据 ID 为
`0x620c236a7c33fee9cfea0d5decf2d43fd83b46a83e1d60f1b8035487c1a036ee`，注册交易为
`0x1bc8a9fa20f2f12d56aadac978055dc4435b4608e3b1f12d522210ae7c728a63`，执行交易为
`0xcc56b477806140365a019bcba1c8f9d753961eb32932349adc757ec3bde874d3`。这些是可丢弃的本地
fixture 标识符，不是上游真实性或公开网络证据。

Envio 3.14.0 已拉取并启动 PostgreSQL 18.3 与 Hasura GraphQL Engine 2.43.0。首次索引器启动暴露
了上述 TypeScript 7 compiler API 不兼容问题。固定局部 TypeScript 5.9.3 后，
`npm run indexer:verify` 再次通过代码生成、类型检查和全部 4/4 handler 测试。随后
`npm run indexer:backfill` 将本地 fixture 索引到区块 9。GraphQL 返回一条已消费、未撤销的收据，
一次成功执行，以及一个包含 1 次注册、1 次尝试、1 次成功和 0 次失败的小时聚合。使用
`npm run indexer:dev` 重启后，索引器从区块 9 的持久化检查点恢复，没有产生重复记录。

一次可丢弃的重组演练在区块 9 创建快照，在区块 10 和 11 添加第二条收据与执行，并观察到 GraphQL
计数及聚合从 1 增加到 2。回退快照并挖出一条不含事件、延伸至区块 12 的替代分支后，Envio 检测到
区块 11 哈希不一致，回滚五个被孤立的事件至区块 9，删除第二条收据与执行，并精确恢复原始计数与
聚合。这验证了已配置 fixture 索引器的 GraphQL、重启、backfill 与最终确认前回滚行为；它没有验证
未来的权威 M6/M7 流水线或产品消费者。

## 依赖审计

`npm audit --omit=dev --json` 在 Envio 3.14.0 依赖树中报告了 10 项生产依赖问题：3 项低危、
1 项中危、6 项高危、0 项严重。受影响的传递依赖包括 Express／body-parser／path-to-regexp、
qs，以及 Envio 局部使用的 viem/ws。npm 提议的自动修复会把 Envio 3.14.0 替换成 2.32.12，
这是与当前固定项目 API 冲突的破坏性降级。本次没有运行自动 audit fix，也没有加入未经验证的依赖
override。在任何生产暴露之前，需要经过审核的 Envio 发布版本或通过兼容性测试的 override。

## 剩余 M8 退出门槛工作

在完成以下所有事项前，M8 仍不完整：用经过审核并版本化的 M6 收据 codec 与 M7 传输验证器替换
预期 fixture；在必需的本地及公共 Monad 兼容环境部署泛化注册表和真实 adapter；让 HyperIndex
指向精确部署地址与起始区块；针对经过审核的 M6/M7 合约与所需部署，重复逐字节投影、GraphQL、
重启／backfill 和记录在案的重组检查；让 M11 收据／执行历史和聚合视图消费该 GraphQL API，并具备明确的陈旧／不可用 UI
行为；以及在任何生产部署前解决或正式接受 Envio 的传递依赖安全公告。

已通过的 fixture 与内存测试是这些检查的前置条件，而不能替代它们。
