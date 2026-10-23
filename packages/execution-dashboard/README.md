# Permio application

## Context-first frontend demo

On 2026-10-14 the user explicitly approved completing the frontend with
replaceable demonstration data before the M6/backend integration is ready.
The default interface is now Contexts, Permissions, Disclosures, and
Verification. Policy authoring/review remains separate under Account.

The two examples are purchase/review/support/regulatory disclosure, adapted
from the Information Flow specification, and clinical referral/research consent,
from the Permio architecture. They are presentation data in
`web/context-profiles.js`, not additions to the protocol ontology or claims
that the M9/M11 exit gates are complete. Purchase use contains three separate
contexts; treatment and research remain separate contexts with different
recipients and disclosures.

`LocalContextClient` stores synthetic context cases, permission-consent records,
disclosure requests and their history in browser localStorage under an
account-specific, versioned key. It supports creation, exact disclosure
previews, explicit linkage consent, approval/decline, expiry, revocation,
verification-request state, refresh persistence, and stale-tab checks.
It is a frontend simulation, not a security boundary, capability issuer,
private evidence vault, or medical record system. Use synthetic input only.
Do not put real records, credentials, keys or health data into this demo.

Authentication remains the real persistent local-account backend described
below. Frontend demo state is separate from its database and from Envio.
Logging out clears in-memory previews and listeners; it does not erase the
account's saved demo state or expose it through another account's UI.
This browser isolation is not a substitute for production server authorization.

Consent is shown as recorded; proof status remains Not requested/Awaiting
verification, and delivery remains Not sent. The demo never fabricates a
Midnight proof, DecisionReceipt, gateway transport, transaction hash, or Envio
execution row. An author enters only rating and free-form text for a review.
Required claims cannot be removed from an action; optional treatment disclosure
may be narrowed. An opinion is never presented as cryptographically true.

### Backend integration seam

`ContextInterface` accepts an injected `ContextClient`.
`HttpContextClient` implements the same presentation operations through the
existing same-origin JSON/CSRF request helper. Its proposed endpoints are:

| Operation | Endpoint |
| --- | --- |
| Workspace | GET /api/contexts/workspace |
| New context case | POST /api/contexts |
| Permission preview/confirmation | POST /api/context-permissions/preview and /api/context-permissions |
| Consent revocation | POST /api/context-permissions/:id/revoke |
| Disclosure creation/preview/approval | POST /api/context-disclosures, /preview, and /approve |
| Request decline | POST /api/context-disclosures/:id/decline |
| Verification request | POST /api/context-permissions/:id/verification |

These routes are **not implemented by the server yet**. The local client is an
explicit choice, never an automatic fallback from a failed HTTP request.
Presentation DTOs are not a new receipt codec or authoritative M5/M6 contract.
When connecting the backend, map the reviewed M5 context/account/capability/
session model and exact M6/M7/M8 contracts into these views. Recheck all scope,
issuer authority, consent, version, recipient, time, revocation and disclosure
conditions on the server. User consent alone cannot mint an issuer capability,
activate a template, or bypass unavailable proof modules.

The 37 application/consumer/frontend-client tests pass natively, alongside
dashboard typecheck and JavaScript syntax checks. The new 15 frontend tests
cover scoped storage, previews, required claims, explicit bridges, replay/stale
previews, expiry, revocation, review shape, storage failure and the HTTP adapter's
no-fallback behavior. Browser checks exercise the same visible interactions.
No new dependency or chain-facing implementation was introduced.

### 中文说明

用户于 2026-10-14 明确批准先用可替换演示数据完成前端。默认导航改为情境、权限、披露和验证，
策略编写／审核另置于账户页面。两个示例为 Information Flow 的购买／评价／客服／监管披露，
以及 Permio 的临床转诊／研究同意。前者包含三个独立情境，后者将治疗和研究分开；这些是展示
数据，不是协议新增定义，也不代表 M9／M11 已完成。

本地演示客户端在浏览器按账户、按版本保存案例、权限同意、披露请求和历史，支持创建、精确预览、
显式关联同意、批准／拒绝、到期、撤销、请求验证、刷新保存及多标签页冲突检查。它不是安全边界、
能力签发者、证据保险库或医疗记录系统，只能使用合成输入。登录仍使用真实持久化本地账户后端；
演示状态与其数据库及 Envio 完全分开。退出清理内存预览，不删除已保存的演示状态。

界面只记录同意，证明保持未请求／待验证，交付保持未发送；不伪造证明、收据、网关传输、交易
哈希或 Envio 执行记录。评价只包含评分和自由文本，必要声明不可移除，治疗中的可选披露可以收窄。
不能把观点展示成已证明的事实。

预留的 HTTP 客户端使用同源 JSON／CSRF 接口，具体路径见上表；服务端尚未实现这些新路径。
不会在 HTTP 请求失败后自动切回演示数据。将来应映射既有 M5 和经过审核的 M6/M7/M8 契约，
并在后端重新核验完整范围及权限；用户同意不能自行签发能力、激活模板或绕过缺失的证明模块。
37 项应用／消费端／前端客户端测试、类型检查及 JavaScript 语法检查通过，未增加依赖或修改链上实现。

## Existing local-account and governance backend

This package is the local account-based Permio application. Registration,
login/logout, profiles, password changes, and eight-hour cookie sessions persist
in a private SQLite database. Registration grants no business or administrator
role. The user explicitly approved local accounts for this demo on 2026-10-14;
`IdentityProvider` retains a separate future Dynamic integration boundary.

Users create and edit structured workflows, validate them with M2, and assign
four separate registered accounts for review, activation, instance management,
and emergency revocation. Together with the author, these are five distinct
principals as required by M4. Review signatures use the exact M4 codec; the
Ed25519 private key is non-extractable and remains in browser IndexedDB. The
server stores only its public key. M4 replay validates all persisted workflow
events before a mutation, and M5 validates instance allocation. Assigned
participants and the instance manager see their instances; unrelated accounts
cannot enumerate or modify them.

Activity and Reports query public Envio projections using only receipt IDs
privately bound to the signed-in account by a trusted upstream integration.
Queries are filtered at GraphQL and checked again before responding. Totals
are recomputed from scoped rows; global aggregate rows are not exposed as
personal results. There is no browser endpoint to claim an arbitrary receipt.
New accounts therefore do not inherit fixture receipts or another user's data.

These are real local application/domain operations, not Midnight authorization
transactions. Final M6 action proofs, module eligibility/binding, finalized
DecisionReceipt transport, wallet/session/capability UI, M10 evidence delivery,
and Dynamic sandbox integration remain incomplete. No local approval or
allocation fabricates a proof, public receipt, on-chain execution, or cross-chain
identity. The production M11 gate is unchanged.

The application retains the Information Flow list/detail behavior and existing
Permio SVG mark. At the user's request, its presentation now follows the supplied
Permio identity board: a horizontal header, light surfaces, overlapping blue,
violet and coral shapes, and restrained motion with reduced-motion support.
The default Dashboard contains real account-scoped counts, a three-column
workflow board, recent changes, and open runs. Archived workflows remain
available in the searchable Workflows library. Original presentation sources are
`information-flow/frontend/app/globals.css`, `permio-app.jsx`, and
`information-flow/web/permio-mark.svg`; account, wallet, and permission logic is
not copied. Search, status filters, receipt details, keyboard dismissal, mobile
layouts, automatic refresh, and clear retry states complete this view.

The current execution deployment remains an expected-M6/M7 fixture on local Hardhat chain
31337. Per the user's product-copy requirement, implementation status and
deployment boundaries are recorded here and in the handoff, rather than in
the product interface. The server retains the explicit boundary metadata for
integration. It proxies one fixed GraphQL query so the browser never
receives the Hasura admin secret. An unavailable endpoint produces an explicit
HTTP 503 state with empty receipt, execution, and aggregate arrays; the UI never
falls back to cached or canned success rows.

## Start

The account and workflow features work independently of Envio availability.
Envio must be running to load receipt/execution history; an outage never affects
account access or grants authority.

Start the application from the repository root. For execution-history checks,
also run the Hardhat fixture and Envio:

```powershell
npm run dashboard:start
```

For a persistent local Windows session, the repository also provides an
idempotent launcher. It starts the existing native Node runtime in the
background, binds loopback only, and retains the private SQLite database.
Its Stop action verifies the saved process identity and command path before
stopping it; it never kills another listener to free the port.

```powershell
.\scripts\local-app.ps1 Start
.\scripts\local-app.ps1 Status
.\scripts\local-app.ps1 Stop
```

Open <http://127.0.0.1:4178>. The defaults are suitable only for the disposable
local fixture. Override them with environment variables when pointing at a
reviewed deployment:

- `PERMIO_ENVIO_GRAPHQL_URL` — GraphQL endpoint; defaults to
  `http://127.0.0.1:8080/v1/graphql`.
- `PERMIO_ENVIO_GRAPHQL_ADMIN_SECRET` — server-side Hasura secret. A missing
  value defaults to `testing` only for a loopback endpoint and is mandatory for
  every non-loopback URL.
- `PERMIO_ENVIO_FRESHNESS_SECONDS` — timestamp fallback threshold when Envio
  does not expose comparable progress/source blocks.
- `PERMIO_DASHBOARD_HOST` and `PERMIO_DASHBOARD_PORT` — listener configuration;
  defaults to `127.0.0.1:4178`.
- `PERMIO_APP_DATABASE` — private SQLite path; defaults to
  `packages/execution-dashboard/.data/application.sqlite`. The whole directory
  is ignored, including its WAL/SHM files. Do not publish or copy it into artifacts.
- `PERMIO_APP_SECURE_COOKIES=true` — required behind an HTTPS production origin.
  The local server binds loopback by default; this is not a public deployment.

The server uses salted scrypt password hashes, hashed random session tokens,
HttpOnly/SameSite cookies, CSRF tokens, same-origin write checks, durable login
attempt limits, fixed GraphQL queries, and strict body-size limits. Sessions
rotate on login and all devices are invalidated by a password change. No
passwords, tokens, private signing keys, or database payloads are logged.

Local loopback mode accepts passwords of at least four characters, including the
user-requested `alice / 1234`. `PERMIO_APP_LOCAL_DEMO=false` retains the ten-character
minimum. Non-loopback binding defaults to the stricter policy; demo mode also
rejects non-loopback clients. Do not reuse the demo database or credentials for a
public deployment. Password hashing, session isolation and CSRF checks are unchanged.

Run `npm run dashboard:test` and `npm run dashboard:typecheck`. The 21 consumer
and application tests cover persistence/reopen, separate-account isolation,
signed M4 approvals and negative cases, M5 allocation/retirement, key changes,
session expiry/revocation, CSRF/cross-origin denial, HTTP journeys, and scoped
Envio queries, simple demo passwords, board columns, attention counts, run expiry,
and combined workflow search/status filters. HTTP tests require permission to connect to local loopback.

`_meta.isReady`, `_meta.progressBlock`, and `_meta.sourceBlock` drive the
freshness state. Indexer lag and endpoint outage are presentation states only;
they cannot approve, reject, revoke, replay, or otherwise change execution
authority.

---

# Permio 应用

按用户提供的 Logo 设计图，界面改为顶部导航、浅色圆角卡片、蓝紫珊瑚色重叠图形和克制的动效，
并支持减少动态效果。默认 Dashboard 展示账户自己的草稿／审核中／已启用工作流看板、统计、
近期变更和开放运行；归档项目仍可在 Workflows 中搜索。界面不再使用 blueprint 或开发状态说明。
仅限本机的演示模式允许四位密码；非回环监听默认保留十位限制，演示模式拒绝非回环客户端。
不得把演示数据库或简单密码用于公开部署，密码哈希、会话隔离和 CSRF 保护保持不变。
Windows 可用上面的 local-app.ps1 启动／查询／停止后台应用；停止操作只针对经过身份和路径校验的
本应用进程，不会清理其他端口监听者。账户及工作流在重启后保留。

本包实现基于持久化本地账户的 Permio 应用，包括注册、登录／退出、资料、密码管理与八小时 Cookie
会话。用户于 2026-10-14 明确批准演示使用本地账户；另保留 Dynamic 身份集成边界。注册不会授予
任何业务或管理员身份。

用户可创建和编辑结构化工作流、执行 M2 校验，并分别指定审核者、激活审批者、实例管理者及紧急
撤销者。连同作者必须是五个不同账户。审核使用精确 M4 签名编码，Ed25519 私钥不可导出，仅保存在
浏览器 IndexedDB；服务器只保存公钥。持久化治理事件通过 M4 重放校验，实例分配通过 M5 校验。
只有被分配的参与者和实例管理者可以看到对应实例，无关账户不能枚举或修改。

Activity 和 Reports 只向 Envio 查询经过可信上游私下绑定到当前账户的公开收据 ID，并在返回前再次
筛选。个人统计根据这些行计算，不借用全局聚合；浏览器没有认领任意收据的接口。新账户不会继承
fixture 收据或其他人的数据。

这些是真实本地应用／领域操作，不是 Midnight 授权交易。最终 M6 动作证明、模块绑定、最终收据传输、
钱包／会话／capability 界面、M10 证据交付及 Dynamic sandbox 集成仍未完成。不会把本地审批或
实例分配伪造成证明、公开收据、链上执行或跨链身份；M11 完整验收门槛不变。

Activity 和 Reports 保留 Information Flow 的列表／详情行为和现有 Permio SVG 标志。导航和视觉
已按用户提供的设计板调整。最初展示层来源为 `information-flow/frontend/app/globals.css`、`permio-app.jsx`
及 `information-flow/web/permio-mark.svg`；没有复制账户、钱包或权限逻辑。页面支持搜索、状态筛选、
收据详情、键盘关闭、移动布局、自动刷新和明确的重试状态。

当前执行部署仍是本地 Hardhat chain 31337 上的预期 M6/M7 fixture。按用户对产品文案的要求，开发状态和
部署边界记录在本文档及交付说明中，不出现在产品界面。服务器保留明确的边界元数据供后续集成。
服务器只代理一条固定的
GraphQL 查询，因此浏览器永远不会收到 Hasura 管理密钥。端点不可用时会返回明确的 HTTP 503 状态，
收据、执行和聚合数组均为空；界面绝不会退回缓存数据或静态成功行。

从仓库根目录启动应用；验证执行历史时，另需运行 Hardhat fixture 与 Envio：

```powershell
npm run dashboard:start
```

打开 <http://127.0.0.1:4178>。默认配置只适用于可丢弃的本地 fixture。指向经过审核的部署时，请使用
`PERMIO_ENVIO_GRAPHQL_URL`、`PERMIO_ENVIO_GRAPHQL_ADMIN_SECRET`、
`PERMIO_ENVIO_FRESHNESS_SECONDS`、`PERMIO_DASHBOARD_HOST` 与
`PERMIO_DASHBOARD_PORT` 环境变量覆盖默认值。只有 loopback 端点可在未配置密钥时使用本地测试值
`testing`；任何非 loopback URL 都必须显式提供密钥。

账户和工作流功能不依赖 Envio 在线；只有执行历史需要该服务。数据库默认保存在被忽略的
`packages/execution-dashboard/.data/application.sqlite`，可用 `PERMIO_APP_DATABASE` 覆盖；不能
发布数据库或 WAL/SHM 文件。HTTPS 部署需设置 `PERMIO_APP_SECURE_COOKIES=true`。服务器默认
仅绑定本机，没有进行公开部署。

服务采用加盐 scrypt 密码哈希、随机会话令牌哈希、HttpOnly/SameSite Cookie、CSRF、同源写入校验、
持久化尝试限制与请求大小限制。登录轮换会话，改密注销所有设备；不记录密码、令牌、私钥或数据库内容。
`npm run dashboard:test` 与 `npm run dashboard:typecheck` 检查 21 项账户／消费端和看板行为；HTTP
测试需要本机回环连接权限。

新鲜度状态来自 `_meta.isReady`、`_meta.progressBlock` 与 `_meta.sourceBlock`。索引延迟和端点故障
只属于展示状态，不能批准、拒绝、撤销、重放或以其他方式改变执行权限。
