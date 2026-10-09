# Permio Deterministic Milestones

Status: implementation contract  
Date: 9 October 2026  
Scope: Alice, Bob, and Clara composite flow across Midnight and Monad

## 1 Purpose and completion rule

This document converts the composite architecture into a sequential execution
contract. A milestone is complete only when every named artifact exists, every
acceptance test passes, every privacy invariant is demonstrated, and its
acceptance record is committed. Partial behavior, screenshots without machine
evidence, and an implementation that merely resembles the target do not count.

"Deterministic" means the observable result is fixed: schemas, public fields,
private fields, state transitions, file locations, failure behavior, and test
evidence are prescribed. Internal code organization inside a named module may
vary only when it does not change those outputs.

Milestones are strictly ordered. Work may be researched in advance, but code
for milestone `M(n+1)` must not be merged into `main` before `M(n)` has a
passing acceptance record. A milestone has exactly four states:

- `NOT_STARTED`: no implementation has been accepted.
- `IN_PROGRESS`: implementation exists but at least one exit condition fails.
- `BLOCKED`: an external dependency prevents a required exit condition.
- `COMPLETE`: all exit conditions pass at one recorded commit.

The acceptance record for milestone `MN` is
`docs/evidence/MN/acceptance.json`. It contains the milestone ID, Git commit,
tool versions, commands, test result summaries, deployment identifiers when
applicable, and SHA-256 hashes of non-Git evidence. It contains no private
witness, mnemonic, credential, signing key, cookie, or personal data.

## 2 Fixed protocol decisions

The following values are locked in `M1` and reused without aliases:

| Meaning | Exact canonical value |
| --- | --- |
| Support schema string | `permio.support-eligibility.v1` |
| Review schema string | `permio.review-eligible-unique.v1` |
| Regulatory schema string | `permio.regulatory-bridge.v1` |
| Replacement-support purpose | `permio.support.replacement.v1` |
| Review-publication purpose | `permio.review.publish.v1` |
| Complaint-assessment purpose | `permio.regulatory.consumer-complaint-assessment.v1` |
| Support receipt lifetime | `900` seconds |
| Review receipt lifetime | `31536000` seconds |
| Regulatory receipt lifetime | `604800` seconds |
| Local Midnight network label | `midnight-local-dev` |
| Public Midnight network label | `midnight-preprod` |
| Local Monad chain ID | Hardhat chain ID reported by the local node |
| Public Monad chain ID | `10143` |
| EIP-712 domain name | `Permio Recipient-Bound Attestation Registry` |
| EIP-712 domain version | `1` |

On Monad, schema IDs and purpose hashes are `keccak256` of the exact UTF-8
strings above. A relay nullifier is derived from the Midnight scoped nullifier,
schema ID, purpose hash, recipient, Monad chain ID, and registry address. The
raw Midnight nullifier is never copied into a Monad transaction.

## 3 Milestone dependency chain

```text
M0 Baseline
  -> M1 Protocol freeze
  -> M2 Midnight V2 contract
  -> M3 Midnight client and state
  -> M4 Gateway and durable outbox
  -> M5 Local support vertical slice
  -> M6 Public support deployment
  -> M7 Reputation context
  -> M8 Regulatory context
  -> M9 Account-first product UI
  -> M10 Release candidate
```

The support path is deliberately completed locally and on public test networks
before review and regulation are added. This proves that both chains perform a
necessary function before the project expands horizontally.

## 4 M0 — Repository baseline

Status: `COMPLETE` at baseline commit `b25b005`.

### Required result

- `RecipientBoundAttestationRegistry.sol` implements recipient-, purpose-,
  schema-, expiry-, and verifier-bound EIP-712 receipts.
- Hardhat tests cover valid relayed registration, recipient substitution,
  scoped replay, unauthorized verifier, and revocation.
- The Alice–Bob–Clara architecture has canonical Markdown and generated HTML.
- `npm run check` rejects stale generated HTML and runs typecheck, contract
  compilation, and tests.

### Exit gate

`npm run check` passes with exactly the existing five registry behaviors, the
working tree is clean, and no deployment key or private fixture is committed.

### Non-goals

M0 does not claim that a Midnight proof has been verified, that a gateway
exists, or that the registry is deployed to Monad Testnet.

## 5 M1 — Protocol and workspace freeze

Status: `COMPLETE` at implementation commit
`d5982c9d1994adc63ad6e2c644670cecc59914d5`. The committed acceptance record is
`docs/evidence/M1/acceptance.json`.

### Objective

Create one versioned protocol package that every Compact circuit, TypeScript
service, test, and Solidity client must consume. Remove duplicate hand-written
schema and purpose constants.

### Required artifacts

- `packages/protocol/package.json`
- `packages/protocol/src/schema.ts`
- `packages/protocol/src/canonical-encoding.ts`
- `packages/protocol/src/eip712.ts`
- `packages/protocol/fixtures/alice-bob-clara.v1.json`
- `packages/protocol/fixtures/hash-vectors.v1.json`
- `packages/protocol/test/protocol.test.ts`
- npm workspace configuration at the repository root
- `docs/evidence/M1/acceptance.json`

The fixture contains public placeholder values only. Bob's holder secret is a
deterministic test-only byte string clearly labeled as non-production and must
never match a Midnight Local Dev example mnemonic.

### Binary acceptance gate

1. The three schema hashes and three purpose hashes equal the committed vector
   values on Windows and Ubuntu.
2. EIP-712 type fields and ordering exactly match the Solidity type hash.
3. Length-delimited canonical encoding distinguishes ambiguous concatenations.
4. Review, support, decision, evidence, bridge, and relay-nullifier domains are
   pairwise distinct.
5. Existing registry tests import protocol constants rather than redefining
   them.
6. `npm run check` passes from a clean `npm ci` installation.

### Rejection conditions

M1 fails if two packages define the same protocol string independently, if a
test computes its expected value from the same function under test, or if an
encoding change can occur without incrementing a version.

## 6 M2 — Midnight V2 contract and proofs

Status: `NOT_STARTED`; depends on `M1`. This is the next implementation
milestone.

### Objective

Port the minimum Midnight contract into Permio and implement the corrected
support decision and regulatory bridge circuits. Alice must never need Bob's
holder secret to record a support decision.

### Required artifacts

- `packages/midnight-contract/contracts/permio.compact`
- compiler-managed output under `packages/midnight-contract/managed/`
- `packages/midnight-contract/test/issuer.test.ts`
- `packages/midnight-contract/test/review.test.ts`
- `packages/midnight-contract/test/support.test.ts`
- `packages/midnight-contract/test/regulatory-bridge.test.ts`
- `packages/midnight-contract/test/privacy-boundary.test.ts`
- recorded Compact compiler and devtool versions
- `docs/evidence/M2/acceptance.json`

The contract exports exactly these circuits:

1. `registerCredentialIssuer`
2. `publishReview`
3. `openSupportCase`
4. `recordSupportDecisionV2`
5. `authorizeRegulatoryBridgeV2`

### Public and private boundary

Public state may contain issuer IDs and public keys, context-specific
nullifiers, versioned action commitments, bridge commitments, and counters. It
must not contain plaintext order IDs, credential IDs, holder secrets, exact
purchase dates, review text, decision reasons, regulatory evidence, or a stable
identifier shared by review and support.

### Binary acceptance gate

1. Alice's credential signature is rejected after any signed field changes.
2. Bob can open one eligible H1 support case within 30 days.
3. Reusing the support entitlement fails.
4. `recordSupportDecisionV2` succeeds with Alice's registered key and no Bob
   credential or holder secret in its interface.
5. A second decision for the same support nullifier fails.
6. The regulatory bridge binds Clara, case, purpose, evidence set, policy
   version, and expiry.
7. Recipient, purpose, case, or evidence substitution fails.
8. Review and support nullifiers for the same credential are unequal.
9. A serialized ledger-state scan contains none of the private fixture values.
10. Compilation and all circuit tests pass using the recorded tool versions.

### Rejection conditions

M2 fails if it retains the V1 decision interface, introduces a global Bob
pseudonym, hand-edits compiler output, or describes an off-chain policy check
as an on-chain proof.

## 7 M3 — Midnight client, adapters, and recoverable state

Status: `NOT_STARTED`; depends on `M2`.

### Objective

Provide typed, testable application interfaces for generating and submitting
the five Midnight actions while keeping private inputs inside Bob's or Alice's
controlled execution boundary.

### Required artifacts

- `packages/midnight-client/src/ports.ts`
- `packages/midnight-client/src/providers.ts`
- `packages/midnight-client/src/transactions.ts`
- `packages/midnight-client/src/private-state.ts`
- `packages/midnight-client/src/receipts.ts`
- `packages/midnight-client/test/transactions.test.ts`
- `packages/midnight-client/test/recovery.test.ts`
- `packages/midnight-client/test/redaction.test.ts`
- `docs/evidence/M3/acceptance.json`

### Required state machine

```text
DRAFT
-> POLICY_APPROVED
-> PROVING
-> MIDNIGHT_SUBMITTED
-> MIDNIGHT_CONFIRMED
```

Only the transition immediately following the persisted state may run. Retrying
the same transition uses the same idempotency key and cannot change its public
commitment.

### Binary acceptance gate

1. Provider configuration supports generated-runtime tests and Midnight Local
   Dev without changing domain code.
2. Each action exposes an explicit private-input type and public receipt type.
3. Logs, thrown errors, serialized jobs, and receipts exclude all private
   fixture values.
4. A forced restart after submission resumes observation rather than creating
   a second transaction.
5. An invalid state transition is rejected.
6. Account A cannot load Account B's encrypted private state.
7. Tests run without a live network; a separately named integration command
   targets Midnight Local Dev.

### Rejection conditions

M3 fails if a hosted Permio process receives Bob's holder secret, if private
state is global rather than account-scoped, or if retries can change a
commitment.

## 8 M4 — Gateway, policy, and durable Monad outbox

Status: `NOT_STARTED`; depends on `M3`.

### Objective

Implement the narrow trusted bridge. The gateway reads only confirmed Midnight
public outputs, applies versioned policy, signs one EIP-712 attestation, and
publishes it through an independently keyed relayer.

### Required artifacts

- `packages/gateway/src/midnight-observer.ts`
- `packages/gateway/src/policy.ts`
- `packages/gateway/src/relay-nullifier.ts`
- `packages/gateway/src/attestation-signer.ts`
- `packages/gateway/src/outbox.ts`
- `packages/gateway/src/monad-publisher.ts`
- `packages/gateway/src/worker.ts`
- `packages/gateway/test/policy.test.ts`
- `packages/gateway/test/outbox-recovery.test.ts`
- `packages/gateway/test/key-separation.test.ts`
- `docs/evidence/M4/acceptance.json`

### Required outbox lifecycle

```text
MIDNIGHT_CONFIRMED
-> ATTESTATION_PREPARED
-> ATTESTATION_SIGNED
-> MONAD_SUBMITTED
-> MONAD_FINALIZED
-> CONSUMED | REVOKED
```

The idempotency key binds Midnight network, Compact contract, Midnight
transaction, schema, purpose, recipient, Monad chain ID, and registry address.

### Binary acceptance gate

1. The observer rejects the wrong network, contract, circuit/action, or public
   commitment.
2. The policy rejects unapproved schema-purpose-recipient combinations.
3. The gateway signs with the verifier key; the relayer submits with a
   different key.
4. A relay nullifier changes if recipient, purpose, chain ID, or registry
   address changes.
5. Two workers processing one outbox row produce at most one accepted Monad
   receipt.
6. Restarting at every lifecycle state converges on one final attestation ID.
7. The outbox and logs contain no Midnight witness data.
8. Expired and revoked receipts are not reported as valid.

### Rejection conditions

M4 fails if the gateway accepts a client assertion without reading Midnight,
if verifier and relayer keys are equal, or if an in-memory queue is the only
record of a submitted transaction.

## 9 M5 — Local dual-chain support vertical slice

Status: `NOT_STARTED`; depends on `M4`.

### Objective

Prove the complete support path on Midnight Local Dev and a local Hardhat node.
This is the first point at which Permio may claim a working composite
architecture.

### Required artifacts

- `test/e2e/local-support.e2e.test.ts`
- `test/e2e/local-support-negative.e2e.test.ts`
- `infra/local/README.md`
- `infra/local/config.example.json`
- redacted machine-readable test receipt
- `docs/evidence/M5/acceptance.json`

### Exact happy path

1. Alice's issuer key is registered on Midnight Local Dev.
2. Alice signs Bob's H1 purchase credential off-chain.
3. Bob proves replacement eligibility and opens `CASE-BOB-001`.
4. The gateway observes the confirmed public support commitment.
5. The gateway produces a 900-second support attestation for Alice's exact
   local recipient contract.
6. The neutral relayer submits it to the local Monad registry.
7. Alice's consumer verifies `isValidFor` and records one decision.
8. The UI-independent receipt contains both chain references and no Bob
   identity.

### Binary acceptance gate

The happy path passes from one command. Separate tests prove that an invalid
credential, expired purchase, duplicate support request, substituted
recipient, substituted purpose, unauthorized gateway, reused scope, and
expired receipt each fail at the named boundary. Stopping and restarting the
gateway after both chain submissions still produces exactly one Monad record.

### Rejection conditions

M5 fails if either chain is mocked, if Bob submits the Monad transaction, or if
the demo requires copying a holder secret into the gateway process.

## 10 M6 — Midnight Preprod and Monad Testnet support deployment

Status: `NOT_STARTED`; depends on `M5`.

### Objective

Reproduce the support vertical slice on public non-production networks and
record enough information to verify the deployment without exposing secrets.

### Required artifacts

- `deployments/midnight-preprod/manifest.json`
- `deployments/monad-testnet/10143/manifest.json`
- `deployments/monad-testnet/10143/abi/RecipientBoundAttestationRegistry.json`
- `scripts/deploy-midnight-preprod.mjs`
- the existing Hardhat Ignition Monad module with pinned parameters
- `scripts/smoke-public-support.mjs`
- `docs/evidence/M6/acceptance.json`

Each manifest records network, chain ID where applicable, contract address or
identifier, source commit, compiler version, artifact hash, deployment
transaction, timestamp, and public explorer/indexer references. It never
records a private key or mnemonic.

### Binary acceptance gate

1. Source is clean and tagged before deployment.
2. Deployed bytecode or contract artifact matches the recorded source commit.
3. One redacted Alice–Bob support transaction reaches Midnight confirmation.
4. One recipient-bound receipt reaches Monad `Finalized`.
5. The receipt is valid only for Alice's configured recipient and exact
   support purpose.
6. A public smoke command re-verifies both chain references.
7. The application labels the bridge as gateway-attested, not trustless.

### Rejection conditions

M6 fails if it deploys to either mainnet, depends on an unrecorded local
artifact, exposes funded account credentials, or reports completion at Monad
transaction inclusion rather than finalization.

## 11 M7 — Reputation context

Status: `NOT_STARTED`; depends on `M6`.

### Objective

Add Bob's one-review-per-purchase flow through the same Midnight contract,
gateway, Monad registry, and lifecycle abstractions without linking it to the
support receipt.

### Required artifacts

- reputation policy in `packages/gateway/src/policy.ts`
- public review application service and storage adapter
- local dual-chain reputation test
- Preprod/Testnet reputation smoke test
- cross-context unlinkability test
- `docs/evidence/M7/acceptance.json`

### Binary acceptance gate

1. Bob authors only rating and free-form review text.
2. One credential produces one review for the fixed merchant-product scope.
3. The public receives rating, text, verified status, merchant, product, and
   permitted time metadata only.
4. A second review with the same entitlement fails.
5. The support and review public records share no stable Bob-derived field.
6. Alice cannot query the support receipt to identify Bob's public review.
7. The UI states that the proof establishes eligibility and uniqueness, not
   truth.

### Rejection conditions

M7 fails if it adds a public Bob profile, copies the support nullifier, adds
unapproved review fields, or claims the review opinion is proven true.

## 12 M8 — Clara regulatory bridge and evidence package

Status: `NOT_STARTED`; depends on `M7`.

### Objective

Let Bob explicitly authorize one purpose-bound, recipient-bound bridge that
allows Clara to verify the selected review, support case, Alice decision, and
chronology without revealing unrelated activity.

### Required artifacts

- regulatory policy in `packages/gateway/src/policy.ts`
- `packages/evidence/src/manifest.ts`
- `packages/evidence/src/encryption.ts`
- `packages/evidence/src/verification.ts`
- Clara verification command or API
- local and public-network regulatory tests
- `docs/evidence/M8/acceptance.json`

### Exact evidence manifest

The manifest contains version, Clara recipient identifier, regulatory case ID,
purpose, policy version, review commitment, support commitment, decision
commitment, evidence-set hash, bridge commitment, creation time, and expiry.
Plaintext evidence is encrypted to Clara's case key and transported separately
from the ZK proof and Monad receipt.

### Binary acceptance gate

1. Bob sees and confirms Clara, case, purpose, exact selected records, newly
   created linkability, and expiry before authorization.
2. Clara verifies the Midnight bridge, Monad receipt, evidence manifest,
   ciphertext integrity, and chronology.
3. Another recipient, case, purpose, or evidence set fails verification.
4. Clara cannot enumerate Bob's other reviews, credentials, or support cases.
5. Alice receives no new review-to-Bob link from the regulatory workflow.
6. Expired, revoked, or altered evidence is rejected.

### Rejection conditions

M8 fails if the bridge is implicit, if Clara receives a reusable global Bob
identifier, if the evidence package is public, or if an application signature
is described as proof that Bob's allegation is true.

## 13 M9 — Account-first product UI

Status: `NOT_STARTED`; depends on `M8`.

### Objective

Integrate the three contexts into the account-based product without restoring
actor cards, perspective selectors, scenario runners, or exposed administrator
credentials.

### Required artifacts

- `apps/web` for browser UI
- `apps/api` for account, policy, persistence, and orchestration endpoints
- account-isolated encrypted private-state integration
- disclosure preview component
- two-chain lifecycle receipt component
- Alice, Bob, and Clara browser journey tests
- accessibility and secret-leak tests
- `docs/evidence/M9/acceptance.json`

### Binary acceptance gate

1. Alice, Bob, and Clara register or log in through separate sessions.
2. Bob can complete review, support, and regulatory authorization from his own
   account with a disclosure preview before each proof.
3. Alice sees only merchant and support views authorized for her account.
4. Clara sees only assigned cases and Bob-authorized evidence.
5. Lifecycle states distinguish proof generation, Midnight confirmation,
   gateway signature, Monad submission, and Monad finalization.
6. No private input appears in DOM text, URLs, browser storage intended for
   public data, API error bodies, logs, or analytics.
7. Refresh and process restart preserve state without duplicate submission.
8. The browser journeys pass with four isolated sessions: Alice, Bob, Clara,
   and an unauthorized ordinary account.

### Rejection conditions

M9 fails if a scenario selector bypasses authentication, if an administrator
credential is prefilled or displayed, or if the UI calls an in-progress
transaction final.

## 14 M10 — Hackathon release candidate

Status: `NOT_STARTED`; depends on `M9`.

### Objective

Produce one reproducible release candidate whose claims match its implemented
privacy and trust boundaries.

### Required artifacts

- tagged release candidate commit
- `docs/DEMO_RUNBOOK.md` and generated HTML
- `docs/SECURITY_AND_TRUST.md` and generated HTML
- architecture, milestone, deployment, and acceptance evidence links in README
- license and third-party notices
- dependency and secret scans
- clean-install verification on Ubuntu and the supported Windows workflow
- final `docs/evidence/M10/acceptance.json`

### Required demo sequence

1. Show Alice's issuer registration without exposing her key.
2. Show Bob receiving a private credential.
3. Show Bob proving support eligibility and a neutral relayer submitting the
   Monad receipt.
4. Show Alice validating the receipt and recording a decision without Bob's
   secret.
5. Show Bob publishing one unlinkable verified review.
6. Show Bob explicitly authorizing Clara's regulatory bridge.
7. Show Clara verifying only the selected evidence.
8. Show recipient substitution and replay attempts fail.

### Binary acceptance gate

1. `npm ci` and `npm run check` pass from a fresh checkout.
2. All milestone acceptance records reference the release candidate or an
   explicitly recorded ancestor without unresolved failures.
3. The public-network smoke tests pass against the recorded Preprod and Testnet
   deployments.
4. Repository, built assets, logs, evidence, and browser output pass the secret
   and private-fixture scans.
5. The demo runbook completes without manual database edits or hidden setup.
6. README claims distinguish ZK-proven facts, gateway-attested facts, public
   user-authored content, and unproven opinions.
7. A rollback and verifier-revocation procedure is tested.

### Rejection conditions

M10 fails if any demo claim exceeds the implemented proof, if the demo depends
on mainnet funds, if a private fixture appears publicly, or if a failed
acceptance gate is waived without changing the milestone specification.

## 15 Cross-milestone rules

### Change control

After `M1`, changing a schema, purpose, encoding, domain separator, EIP-712
field, public Compact output, or acceptance fixture requires a protocol decision
record under `docs/decisions/`, a version increment, migration impact, updated
vectors, and updated tests. Editing an expected value solely to make a failing
test pass is prohibited.

### Evidence quality

Every acceptance command must be reproducible from the referenced commit.
Screenshots may supplement but never replace assertions, receipts, or manifest
checks. Live-network identifiers are public evidence; secrets are never
evidence. Machine-generated evidence must be redacted before commit.

### Definition of blocked

A milestone may be `BLOCKED` only when a required external service or network
is unavailable, a required platform defect has been reproduced, or an owner
decision is genuinely missing. A failing test, unfinished implementation, or
uncertain design is `IN_PROGRESS`, not `BLOCKED`.

### Definition of done

The result of a milestone is the exact committed artifacts plus passing gates,
not a progress percentage. If one required negative test, privacy scan,
restart test, manifest, or acceptance record is missing, the milestone remains
`IN_PROGRESS`.

---

# Permio 确定性里程碑

状态：实施契约  
日期：2026 年 10 月 9 日  
范围：Alice、Bob、Clara 在 Midnight 与 Monad 上的复合流程

## 1 目标与完成规则

本文档把复合架构转化为严格顺序执行的实施契约。只有当指定产物全部存在、验收测试全部
通过、隐私不变量得到证明，并且验收记录已提交时，一个里程碑才算完成。部分功能、缺少
机器证据的截图，或者只是与目标相似的实现，都不能算完成。

“确定性”表示可观察结果是固定的：模式、公开字段、私有字段、状态转换、文件位置、失败
行为和测试证据均已规定。命名模块内部的代码组织可以不同，但不能改变这些结果。

里程碑必须严格按顺序完成。可以提前研究后续工作，但 `M(n)` 没有通过验收时，
`M(n+1)` 的代码不能合并到 `main`。状态只有 `NOT_STARTED`、`IN_PROGRESS`、`BLOCKED`
和 `COMPLETE` 四种。每个 `MN` 的验收记录固定为
`docs/evidence/MN/acceptance.json`，记录提交、工具版本、命令、测试摘要、必要的公开部署
标识和非 Git 证据的 SHA-256 哈希，但绝不包含 witness、助记词、凭证、私钥、Cookie 或
个人数据。

## 2 固定协议决策

`M1` 必须锁定并统一使用以下值：客服模式 `permio.support-eligibility.v1`、评价模式
`permio.review-eligible-unique.v1`、监管模式 `permio.regulatory-bridge.v1`；对应用途为
`permio.support.replacement.v1`、`permio.review.publish.v1` 和
`permio.regulatory.consumer-complaint-assessment.v1`。客服收据有效期为 900 秒，评价为
31536000 秒，监管为 604800 秒。公开 Midnight 网络标签为 `midnight-preprod`，Monad
Testnet 链 ID 为 `10143`。EIP-712 域名固定为
`Permio Recipient-Bound Attestation Registry`，版本为 `1`。

Monad 的模式 ID 和用途哈希是上述精确 UTF-8 字符串的 `keccak256`。Monad 中继空值标识
绑定 Midnight 限定范围空值标识、模式、用途、接收方、Monad 链 ID 和注册表地址；原始
Midnight 空值标识不得直接复制到 Monad 交易。

## 3 依赖顺序

```text
M0 仓库基线
  -> M1 协议冻结
  -> M2 Midnight V2 合约
  -> M3 Midnight 客户端与状态
  -> M4 网关与持久化 outbox
  -> M5 本地客服纵向切片
  -> M6 公开测试网客服部署
  -> M7 评价上下文
  -> M8 监管上下文
  -> M9 账户优先产品界面
  -> M10 发布候选版本
```

客服路径必须先在本地和公开测试网络完整完成，然后才能扩展评价与监管。这能够先证明两条
链都承担了不可替代的职责，再横向增加场景。

## 4 M0 — 仓库基线

状态：已在基线提交 `b25b005` 完成。现有 Solidity 注册表绑定接收方、用途、模式、过期
时间和验证者；五项 Hardhat 测试覆盖正常中继登记、接收方替换、限定范围重放、未授权
验证者和撤销；架构文档使用 Markdown 权威源文件和自动生成 HTML；`npm run check` 会
检查文档新鲜度、类型、合约和测试。M0 不代表已经验证 Midnight 证明、实现跨链网关或
完成 Monad Testnet 部署。

## 5 M1 — 协议与工作区冻结

状态：`COMPLETE`，实施提交为
`d5982c9d1994adc63ad6e2c644670cecc59914d5`，验收记录为
`docs/evidence/M1/acceptance.json`。已经建立唯一的 `packages/protocol`，其中
包含模式常量、规范编码、EIP-712 类型、Alice–Bob–Clara 固定数据、哈希向量和协议测试，
并把仓库改为 npm workspace。其他包不得重复手写协议字符串。

验收要求：三种模式和三种用途在 Windows 与 Ubuntu 上产生完全相同的固定哈希；EIP-712
字段及顺序与 Solidity 类型哈希完全一致；长度分隔编码消除拼接歧义；各承诺和空值标识域
两两不同；现有合约测试导入协议常量；干净执行 `npm ci` 后 `npm run check` 通过。若测试
用被测函数本身计算期望值，或者编码能在不升级版本的情况下变化，M1 失败。

## 6 M2 — Midnight V2 合约与证明

状态：`NOT_STARTED`，依赖 M1，是下一个实施里程碑。必须把最小 Midnight 合约迁入
`packages/midnight-contract`，只导出 `registerCredentialIssuer`、`publishReview`、
`openSupportCase`、`recordSupportDecisionV2` 和 `authorizeRegulatoryBridgeV2` 五个电路，
并记录 Compact 编译器与 devtool 版本。

公开状态只允许签发者 ID 与公钥、上下文限定空值标识、版本化动作承诺、桥接承诺和计数器。
订单号、凭证号、持有人秘密、精确购买日期、评价文本、决定理由和监管证据必须保持私有。
验收必须证明：签发字段不可篡改；30 天内的 H1 客服资格有效且只能使用一次；V2 客服决定
不接收 Bob 凭证或秘密；重复决定失败；监管桥接绑定 Clara、案件、用途、证据集合、策略
版本和期限；替换任何绑定字段都会失败；同一凭证的评价与客服空值标识不同；账本状态扫描
不存在私有固定数据。

## 7 M3 — Midnight 客户端、适配器与可恢复状态

状态：`NOT_STARTED`，依赖 M2。必须在 `packages/midnight-client` 提供 provider、交易、
私有状态和收据接口。固定状态机为 `DRAFT -> POLICY_APPROVED -> PROVING ->
MIDNIGHT_SUBMITTED -> MIDNIGHT_CONFIRMED`。重试只能执行持久化状态之后的下一步，并使用
同一个幂等键，不能改变公开承诺。

验收必须证明：生成运行时测试与 Midnight Local Dev 共用领域代码；每个动作都有明确的
私有输入与公开收据类型；日志、错误、任务和收据不含私有固定数据；提交后重启只恢复观察，
不会创建第二笔交易；非法状态转换失败；账户之间无法读取对方私有状态。若托管的 Permio
进程接收 Bob 的持有人秘密，M3 失败。

## 8 M4 — 网关、策略与持久化 Monad outbox

状态：`NOT_STARTED`，依赖 M3。网关必须只读取已确认的 Midnight 公开输出，执行版本化
策略，使用验证者密钥签署 EIP-712，再由不同的中继器密钥提交。固定生命周期为
`MIDNIGHT_CONFIRMED -> ATTESTATION_PREPARED -> ATTESTATION_SIGNED ->
MONAD_SUBMITTED -> MONAD_FINALIZED -> CONSUMED | REVOKED`。

验收必须证明：错误网络、合约、动作或承诺被拒绝；未批准的模式、用途、接收方组合被拒绝；
验证者与中继器密钥不同；接收方、用途、链 ID 或注册表改变时中继空值标识也改变；两个
worker 竞争一个 outbox 项时最多产生一条有效 Monad 收据；在任意状态重启都收敛到同一个
证明 ID；outbox 和日志不含 witness。只使用内存队列或相信客户端自报 Midnight 结果时，
M4 失败。

## 9 M5 — 本地双链客服纵向切片

状态：`NOT_STARTED`，依赖 M4。必须使用真实 Midnight Local Dev 和本地 Hardhat 节点
完成 Alice 登记签发者、Alice 为 Bob 签署 H1 凭证、Bob 为 `CASE-BOB-001` 证明换货资格、
网关观察 Midnight 承诺、签署 900 秒收据、中立中继器提交 Monad、Alice 验证并记录决定
的完整路径。Bob 不得拥有或使用 Monad 地址。

一个命令必须完成正常路径；独立负向测试必须证明无效凭证、超期购买、重复客服请求、替换
接收方、替换用途、未授权网关、重复范围和过期收据分别在指定边界失败。两次链上提交之后
重启网关仍只能得到一条 Monad 记录。如果任一链被模拟，或者 Bob 的秘密进入网关进程，
M5 失败。

## 10 M6 — Midnight Preprod 与 Monad Testnet 客服部署

状态：`NOT_STARTED`，依赖 M5。必须通过脚本把同一客服切片部署到 Midnight Preprod 和
链 ID `10143` 的 Monad Testnet，并在 `deployments/` 保存不含秘密的清单、ABI、源码提交、
编译器版本、产物哈希、部署交易和公开查询链接。

验收必须证明：部署前源码干净并打标签；部署产物对应记录的提交；一条脱敏客服交易在
Midnight 确认；一条严格绑定 Alice 接收方和客服用途的收据在 Monad 达到 `Finalized`；
公开 smoke 命令能够重新验证两条链引用；界面明确标记这是网关证明而不是无信任桥。
部署到任一主网、泄露测试账户凭据或仅在交易被包含时就宣布完成，均判定 M6 失败。

## 11 M7 — 评价上下文

状态：`NOT_STARTED`，依赖 M6。必须通过同一 Midnight 合约、网关、Monad 注册表和生命
周期抽象添加每次购买一次评价的流程。Bob 只能创作评分和自由文本。公开结果只包含评分、
文本、验证状态、商家、产品和允许的时间元数据。

验收必须证明：重复评价失败；评价和客服公开记录没有稳定的 Bob 派生字段；Alice 不能从
客服收据识别 Bob 的公开评价；界面明确说明证明只建立资格与唯一性，不证明意见真实。
引入公开 Bob 资料、复用客服空值标识或增加未经批准的评价字段，均判定 M7 失败。

## 12 M8 — Clara 监管桥接与证据包

状态：`NOT_STARTED`，依赖 M7。Bob 必须明确授权一条限定用途、限定接收方的桥接，让
Clara 验证选定的评价、客服案件、Alice 决定和时间顺序，同时无法看到无关活动。证据
manifest 固定绑定 Clara、监管案件、用途、策略版本、三个承诺、证据集合、桥接、创建时间
和期限。明文证据使用 Clara 案件密钥加密，并与 ZK 证明和 Monad 收据分开传输。

验收必须证明：Bob 授权前看到接收方、案件、用途、精确记录、新增关联和期限；Clara 能
验证桥接、收据、manifest、密文完整性与时间顺序；替换接收方、案件、用途或证据集合失败；
Clara 无法枚举 Bob 的其他活动；Alice 不获得新的评价关联；过期、撤销或篡改证据失败。
隐式桥接、全局 Bob 标识或公开证据包均判定 M8 失败。

## 13 M9 — 账户优先产品界面

状态：`NOT_STARTED`，依赖 M8。必须把三个上下文整合进真实账户界面，不得恢复角色卡片、
视角选择器、场景运行器或暴露管理员凭据。必须提供披露预览、双链生命周期收据，以及
Alice、Bob、Clara 和一个未授权普通账户四个隔离浏览器会话的测试。

验收必须证明：三人分别登录；Bob 在每次证明前确认披露；Alice 只能看到被授权的商家和
客服视图；Clara 只能看到分配案件和 Bob 授权证据；界面区分证明生成、Midnight 确认、
网关签名、Monad 提交与最终确认；私有输入不出现在 DOM、URL、公共浏览器存储、API 错误、
日志或分析数据中；刷新与进程重启不产生重复提交。

## 14 M10 — 黑客松发布候选版本

状态：`NOT_STARTED`，依赖 M9。必须生成带标签的候选版本、演示手册、安全与信任文档、
部署及验收索引、许可证和第三方声明，并在 Ubuntu 与受支持的 Windows 工作流中从干净
安装完成验证。

最终演示顺序固定为：Alice 登记签发者；Bob 接收私有凭证；Bob 证明客服资格并由中立
中继器提交 Monad；Alice 在不知道 Bob 秘密的情况下验证并记录决定；Bob 发布一条不可
关联的已验证评价；Bob 明确授权 Clara；Clara 只验证选定证据；最后展示接收方替换和
重放失败。

验收必须证明：干净检出后 `npm ci` 与 `npm run check` 通过；全部里程碑验收记录可追溯；
公开网络 smoke 测试通过；仓库、构建产物、日志、证据和浏览器输出通过秘密与私有固定数据
扫描；演示不需要手工修改数据库或隐藏设置；README 区分 ZK 证明事实、网关证明事实、
用户公开内容和未证明观点；回滚与验证者撤销流程已测试。

## 15 跨里程碑规则

M1 之后，任何模式、用途、编码、域分离符、EIP-712 字段、Compact 公开输出或验收固定数据
的变化，都必须新增 `docs/decisions/` 协议决策记录、升级版本、说明迁移影响并更新向量与
测试。禁止只为让失败测试通过而修改期望值。

所有验收命令必须能从记录的提交复现。截图只能补充，不能替代断言、收据或 manifest。
公开链标识可以作为证据，秘密不能作为证据。只有外部服务不可用、平台缺陷已复现或确实
缺少所有者决策时，里程碑才能标记为 `BLOCKED`；测试失败、代码未完成或设计不确定都属于
`IN_PROGRESS`。

里程碑结果是精确的已提交产物和通过的门槛，而不是完成百分比。缺少任何负向测试、隐私
扫描、重启测试、部署清单或验收记录时，该里程碑仍是 `IN_PROGRESS`。
