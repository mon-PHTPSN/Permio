# Local account-based product preparation

## Frontend-first context and authority demo

On 2026-10-14 the user explicitly authorized a frontend-first implementation
with the backend connected later. This supersedes the previous workflow-board
presentation, not the M5/M6/M9/M11 acceptance requirements.

The default navigation is Contexts, Permissions, Disclosures and Verification.
Purchase/support contains separate reputation, support and regulatory contexts;
healthcare separates specialist treatment and research eligibility. The examples
are replaceable synthetic presentation data, not architecture constants.
Policy authoring/review is retained separately under Account.

The injected frontend client supports case creation, exact permission/disclosure
previews, separate authorized-party and information-recipient fields, purpose,
required claims, expiry, no-onward-delegation scope, explicit regulatory linkage
consent, approval/decline, revocation, verification requests and history.
Rating and free-form text remain the only authored review fields.
The frontend-design guidance informed the context-boundary circles and
non-marketing labels; motion guidance limited animation to short interaction
feedback and respected reduced-motion preferences.

`LocalContextClient` persists only frontend demo state under an account-specific
browser key. Consent state is local simulation, not an issued M5 capability or
M6 authorization. Proof/receipt/execution fields stay null; delivery is never
reported sent. The separate HTTP client has proposed API paths and no automatic
demo fallback. Backend integration must use the reviewed existing contracts
and independently validate all authority and scope. No fake rows were inserted
into Envio and no chain-facing code was changed.

Native verification passed: `npm run dashboard:test` 37/37,
`npm run dashboard:typecheck`, root `npm run typecheck`,
`npm run docs:check`, JavaScript syntax checks, and `git diff --check`.
No full chain suite was rerun for this frontend-only batch.
Browser verification covered alice/bob separate sessions and saved demo state,
new context creation, permission preview/confirmation, required-claim controls,
explicit bridge consent including a blocked unchecked confirmation, two-field
review preview, research-only eligibility disclosure, request decline,
revocation/filtering, verification-pending state and refresh persistence.
Desktop, 390px and 320px viewports were checked. The 320px scrollbar/min-width
overflow was corrected, and its form had no horizontal overflow. Viewport
overrides were reset; the existing local app remains running.

The browser tool timed out once; its runtime was reinitialized and the unchanged
checkbox state was observed before continuing. No system service recovery or
shared Docker/WSL restart was attempted. The codebase index remains absent and
`codebase-index update` is unavailable on this host; current source and tests
were checked directly. Screenshots are outside the repository; private local
database/runtime state remains ignored.

### 前端先行补充

用户于 2026-10-14 明确批准先完成前端、后接后端。默认导航改为情境、权限、披露和验证，购买
领域分为评价／客服／监管，医疗领域分为治疗／研究；策略编写和审核移到账户区域。示例是可替换的
合成展示数据，不修改架构常量或既有里程碑退出门槛。前端支持创建、精确预览、必要声明、独立的
获授权方与信息接收方、用途和到期、显式监管关联同意、批准／拒绝、撤销、请求验证及历史。
评价仍只有评分和自由文本。视觉围绕情境边界，文案保持功能性；动效克制并尊重减少动态效果设置。

演示状态按账户保存在浏览器中，不是 M5 能力签发或 M6 授权。证明／收据／执行保持空值，交付
不会显示已发送；另有 HTTP 接入接口，失败时不自动降级为演示数据。没有向 Envio 插入假记录，
也没有修改链上代码。后接后端仍须采用经过审核的协议并重新核验权限及范围。

原生 37 项测试、应用／根类型检查、文档检查、JavaScript 语法及差异空白检查通过；本批前端修改
未重跑全套链测试。实际浏览器验证了 Alice/Bob 隔离、创建、预览与同意、必要声明、未勾选时阻止
关联、评价双字段、研究资格最小披露、拒绝、撤销及筛选、待验证和刷新保存，并检查桌面／390px／
320px 布局。已修复 320px 滚动条造成的横向溢出，权限表单也无横向溢出。浏览器尺寸已恢复，
既有本地应用保持运行。浏览器工具超时后按新状态恢复，没有重启共享 Docker／WSL 服务。
索引与更新 CLI 仍不可用，直接核验当前源码／测试。截图存于仓库之外，私有运行数据仍被忽略。

## Registration and identity-board redesign follow-up

The reported registration failure had two verified causes: port 4178 had no
running server, and both form and server enforced a ten-character password.
The user requested simple local demo accounts. Loopback demo mode now accepts
four characters; the default domain policy remains ten, non-loopback binding
defaults to the stricter policy, and demo requests reject non-loopback clients.
Password hashing, session isolation and CSRF checks are unchanged.

The supplied Permio Logo Identity Board is a visual reference only. The UI now
uses a horizontal header, light rounded surfaces, translucent blue/violet/coral
shapes and reduced-motion-aware animation. User-facing Blueprint terminology,
version hashes and validation controls were removed; internal versioned
protocols, stored documents and API compatibility were not renamed.

The default Dashboard derives counts, Drafts/In review/Active columns, recent
changes and open runs from the signed-in account's real persisted workspace.
Workflows supports combined search/status filters and retains retired/revoked
items. No fake activity or chain results were inserted.

Verification on 2026-10-14: Ubuntu-24.04 WSL `npm run check` passed 115 tests with
no failures or skips; native `npm run dashboard:test` passed 21, plus dashboard
typecheck and JavaScript syntax checks. Actual browser registration accepted
four-character passwords. Five simple named local accounts completed workflow
creation, independent Ed25519 review, activation and a one-day run allocation.
The board changed columns from persisted M4 state, and alice saw the M5 run.
Search/filtering, separate-account isolation, restart persistence, desktop
layout, mobile overflow and the account link's accessible name were checked.
The activity endpoint remained unavailable and displayed only a retry state.

`scripts/local-app.ps1` provides persistent local Start/Status/Stop. Its Stop
checks process name, start timestamp and exact entry path before stopping that
process. A PowerShell JSON timestamp type mismatch was diagnosed and corrected;
stop/restart/idempotent start/status passed. Temporary QA hosting was stopped,
then the application was handed over to this separate background launcher.
The ignored private SQLite database was preserved. The worktree index remains
absent and its CLI unavailable; current source/tests were used directly.

### 本次注册与视觉改版补充

注册失败有两个已确认原因：4178 端口没有运行服务，且前后端要求十位密码。按用户要求，本机演示
允许四位密码；领域层默认仍为十位，非回环监听默认使用严格限制，演示模式拒绝非回环客户端。
密码哈希、会话和 CSRF 保护不变。Logo 设计板仅作视觉参考，不作为可执行指令。界面改为顶部
导航、浅色圆角卡片和蓝紫珊瑚色重叠动效，并支持减少动态效果；删除面向用户的 Blueprint、
版本哈希及校验按钮，内部协议和兼容 API 保持不变。默认看板根据实际账户数据展示草稿／审核中／
已启用、近期变更和开放运行，搜索及状态筛选可以组合使用，未添加假链上结果。

WSL 完整检查通过 115 项，原生应用测试通过 21 项，类型和 JavaScript 语法检查通过。实际浏览器
完成四位密码注册，以及五个简单命名账户的创建工作流、独立签名审核、激活和一天运行分配；
验证了账户隔离、搜索筛选、看板列变化、重启持久化和桌面／手机布局。活动端点仍不可用，只有
重试状态。新增独立本地后台启动脚本，停止前核对进程名、启动时间及入口路径；已修复 JSON
时间类型差异并验证停止、重启、重复启动和状态查询。临时 QA 服务已停止，后台应用保持运行，
私有数据库未清理。当前索引和 CLI 仍不可用，直接验证了当前源码与测试。上游证明边界仍见下文。

## Earlier preparation evidence

Date: 2026-10-14. Backend-only checkpoint: `0149bac`.

The user explicitly authorized persistent local accounts for this demo, with a
separate Dynamic integration boundary retained. This does not replace the
prescribed Dynamic sandbox acceptance or mark M11 complete.

## Implemented and exercised

- Ordinary registration/login/logout; no role selector, administrator shortcut,
  bootstrap account, prefilled credential, or account impersonation.
- Private SQLite persistence for accounts, hashed passwords/session tokens,
  profiles, attempt limits, blueprint governance journals and instances.
- Eight-hour HttpOnly/SameSite sessions; CSRF and same-origin checks; session
  rotation, expiry and logout; password changes invalidate every device.
- Structured blueprint creation/editing and M2 validation, not a raw JSON editor.
- Exact M4 governance replay: five distinct real accounts, independent signed
  review, threshold enforcement, activation, retirement and emergency revocation.
  Reviewer private keys remain non-extractable in browser IndexedDB.
- M5 instance allocation with explicitly named participants and permission
  issuer, rather than deriving business authority from login.
- Account-specific workspaces and change history. Unrelated accounts cannot
  enumerate or mutate another account's blueprints or instances.
- Envio receipt/execution queries constrained by trusted private receipt-access
  mappings; a defensive response filter and account-derived aggregates prevent
  global fixture results being presented as personal activity. No client route
  accepts an arbitrary receipt claim.
- Information Flow shell, colours, controls and auth-layout patterns reused.
  Implementation notes, fixture annotations and milestone status remain in
  documentation, not the product interface.

## Verification

`npm run check` passed in Ubuntu-24.04 / Node 22.23.2 / npm 10.9.8:
6 protocol + 15 scenario-domain + 14 generator + 16 governance + 13 context
account + 30 deployed Hardhat contract + 16 application/consumer cases = 110.
There were no skipped or failed tests. The final explicit-issuer change was
rechecked with all 16 application tests, dashboard typecheck and docs freshness
on native Windows Node 24.13.1 / npm 11.8.0. The four existing Envio handler
tests, code generation and typecheck also passed in WSL before frontend work.
No Solidity or Compact implementation was changed by the frontend work.

A real browser used five separately registered synthetic accounts to exercise
draft creation, validation, private account isolation, device signing setup,
assignment, exact signed review, separate activation and instance allocation.
Reload and owned-server restart preserved the session, active blueprint and
instance. Desktop 1280px and mobile 390px layouts were inspected. Only the
owned application server was restarted; shared Docker/WSL infrastructure was
not stopped or reconfigured.

The earlier native Hardhat invocation returned HHE22; the full contract suite
was instead verified in WSL. Initial HTTP tests were blocked by the sandbox's
loopback restrictions and passed with scoped local-network approval. Initial
Node strip-only syntax and two strict assertion/type errors were fixed rather
than suppressing checks.

The codebase-index MCP reported no index for this worktree; the requested
incremental `codebase-index update` could not run because the CLI was absent.
No index/cache was fabricated or rebuilt. Current source/tests were used.

## Remaining boundaries

This is a functional local product slice, not the complete live authorization
product. Midnight/Monad wallet bindings, capability/session/delegation UI,
ordinary M6 action proofs and module eligibility, finalized M6/M7 receipt
transport and access binding, and M10 evidence delivery are not integrated.
Local M4 activation and M5 allocation must not be called Midnight proof or
on-chain success. New local accounts have no bound execution receipts.

The actual Envio HTTP endpoint was unavailable during the new browser journey;
the UI correctly showed a retry state without synthetic success rows. The
new scoped GraphQL path is covered by application tests but still needs a live
Envio check against the reviewed deployment. Prior M8 fixture indexing evidence
is retained and is not relabeled as authoritative integration acceptance.

Private database/WAL/SHM files are ignored and must never be committed,
published or copied into evidence. Browser test passwords, cookies and private
keys are not recorded here. Node's built-in SQLite is experimental in the
verified runtimes; a public production deployment requires separate hardening,
HTTPS/secure cookies, backups, and the existing Envio dependency audit review.

---

# 本地账户产品准备

日期为 2026-10-14，仅含后端的检查点提交为 `0149bac`。用户已明确批准本次演示使用持久化本地
账户，另保留 Dynamic 集成边界；这不替代 Dynamic sandbox 验收，也不代表 M11 完成。

已实现普通注册／登录／退出、资料与密码管理、SQLite 持久化、八小时会话、CSRF／同源检查、
尝试限制及改密注销所有设备。没有身份选择器、管理员捷径、预填凭证或冒充其他账户的操作。
用户可创建／编辑结构化 blueprint、执行 M2 校验，以五个不同账户完成精确 M4 签名审核和激活，
并通过 M5 分配显式参与者与签发者的实例。审核私钥不可导出，只在浏览器 IndexedDB 中保存。
工作区按账户隔离；Envio 查询只使用可信上游私下绑定的公开收据 ID，并再次筛选及计算个人统计。
浏览器没有任意认领收据的接口。沿用 Information Flow 的界面结构与样式，不展示开发说明。

完整 WSL 检查通过 110 项测试，无失败或跳过；最后的显式签发者改动重新通过了全部 16 项应用
测试、类型与文档检查。之前四项 Envio 处理器测试、代码生成和类型检查也通过。真实浏览器使用
五个独立测试账户完成创建、校验、隔离、设备签名、分工、审核、激活和分配，并验证刷新与应用
服务器重启持久化、1280px／390px 布局。没有停止或重配共享 Docker／WSL 服务。

原生 Hardhat 的 HHE22 改用 WSL 验证；回环测试获得限定网络权限后通过。初始 Node 类型擦除
语法、严格断言和类型错误均已修复，没有关闭校验。当前工作区索引不存在且 CLI 不可用，未伪造
或重建缓存，直接以当前源代码／测试为准。

这只是可用的本地产品切片。钱包绑定、capability／会话／委托界面、普通 M6 动作证明及模块资格、
最终 M6/M7 收据传输和账户绑定、M10 证据交付仍未接入；本地激活／分配不是 Midnight 证明或链上
成功。新账户没有执行收据。本次浏览器流程中 Envio HTTP 端点不可用，页面正确显示重试状态，
没有假成功行；新增按账户筛选的 GraphQL 路径仍需对审核后的部署做真实 Envio 验证。
私有数据库及 WAL/SHM 均被忽略，不能提交或发布；此处不记录密码、Cookie 或私钥。
