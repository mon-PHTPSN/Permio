# Render demo deployment

Use repository `mon-PHTPSN/Permio`, branch `feat/m8-execution-registry`,
and the repository-root `render.yaml`. The Blueprint defines one Node web
service; it does not deploy contracts, Envio, or the unfinished M6/M7 pipeline.
No Render service has been created or validated by this preparation.

## Configuration

- Root directory: repository root (leave Render's Root Directory empty).
- Node: `24.13.1`, matching the native verification runtime.
- Build: `npm ci --include=dev && npm run dashboard:typecheck`.
- Start: `npm run dashboard:start`.
- Health check: `/healthz`, which checks SQLite independently of Envio.
- Host: `PERMIO_DASHBOARD_HOST=0.0.0.0`; port comes from Render's `PORT`.
- Cookies: `PERMIO_APP_SECURE_COOKIES=true`, served through Render HTTPS.
- Public account policy: `PERMIO_APP_LOCAL_DEMO=false` (10-character minimum
  passwords, rather than the loopback-only four-character policy).
- Database: `PERMIO_APP_DATABASE=/var/data/permio/application.sqlite`.
- Persistent disk: mount `/var/data/permio`, size 1 GB, single instance.

The Blueprint uses the paid Starter plan because Render requires a paid service
for persistent disks. Review the plan and disk charges in Render before creating
the service. Free services with ephemeral storage lose accounts and workflows
across restarts/redeploys and are unsuitable for this SQLite-backed setup.
Disk-backed redeploys briefly interrupt service; do not scale this configuration
to multiple application instances.

Optional server-side environment variables:
`PERMIO_ENVIO_GRAPHQL_URL`, `PERMIO_ENVIO_GRAPHQL_ADMIN_SECRET`, and
`PERMIO_ENVIO_FRESHNESS_SECONDS`. Configure both endpoint and secret when a
reviewed remote Envio service is available. Render cannot reach the developer's
localhost. Without that service, accounts and frontend context demos work,
while Activity/Reports return an explicit unavailable state. New accounts have
no receipt bindings until a trusted upstream integration supplies them.
Never put the admin secret in frontend files or commit environment files.

The hosted database starts empty. Do not upload local account databases,
credentials, browser review keys, or user data. Context journeys remain
account-scoped browser simulations with proof/delivery pending. Deployment
does not satisfy the M6–M8 or production M11 acceptance gates.

## Verify after deployment

1. Confirm Render deploys the intended branch and commit.
2. Open `/healthz` and confirm HTTP 200 with `{"status":"ok"}`.
3. Register two disposable accounts with passwords of at least 10 characters;
   verify login/logout, account isolation, and secure session cookies.
4. Verify Contexts, Permissions, Disclosures, and Verification render, and
   confirm unavailable Envio data never produces fabricated activity.
5. Redeploy and confirm the disposable accounts persist on the mounted disk.

## Preparation verification — 2026-10-14

Native Windows Node.js `24.13.1`: `npm ci --include=dev`,
`npm run dashboard:typecheck`, and `npm run check` passed. The complete check
covered generated documentation, TypeScript, Hardhat build, 64 domain tests,
30 Hardhat simulated-chain contract tests, and 38 application/frontend tests
(132 tests total, none skipped). Browser module syntax checks also passed.
A separate in-memory server process verified the real entry point with
`0.0.0.0`, Render-style `PORT`, `/healthz`, and the hosted password policy.
The hosted HTTP regression verifies Secure cookies and HTTP 503 for unavailable
Envio while health stays available. No public-network or Render deployment
verification is claimed.

The existing dependency audit still reports 10 findings (3 low, 1 moderate,
6 high) in the pinned Envio dependency tree, documented in the M8 development
log. No dependency upgrade or automatic breaking downgrade was applied.
The local navigation index was initialized, but reported 61 parse failures
out of 123 indexed files; its source-symbol coverage is incomplete. Exact
source and executable checks were used for this preparation.

The first GitHub CI run failed on a fresh checkout because the original
`check` command type-checked contract tests before generating Hardhat ABI types.
Local generated artifacts had masked this ordering defect. After
`npx hardhat clean`, standalone type checking reproduced the CI errors.
The corrected check builds Solidity before type checking, preserving all
strict type checks and tests; generated artifacts remain ignored.

References: [Render web services](https://render.com/docs/web-services),
[Blueprint specification](https://render.com/docs/blueprint-spec),
[persistent disks](https://render.com/docs/disks),
[Node versions](https://render.com/docs/node-version).

---

## 中文说明

从 `mon-PHTPSN/Permio` 仓库的 `feat/m8-execution-registry` 分支部署，使用仓库根目录的
`render.yaml`。Blueprint 是描述服务配置的 YAML 文件；本配置只部署一个 Node 应用服务，
不会部署合约、Envio 或尚未完成的 M6/M7 链路。本次准备尚未创建或验证 Render 服务。

Root Directory 留空。Node 固定为本机验证所用的 `24.13.1`；构建命令是
`npm ci --include=dev && npm run dashboard:typecheck`，启动命令是
`npm run dashboard:start`。`/healthz` 独立检查 SQLite，不依赖 Envio。
应用监听 `0.0.0.0`，使用 Render 提供的 `PORT`；HTTPS 会话启用 Secure Cookie。
公共部署关闭本机演示模式，密码至少十位，不采用仅限本机的四位密码策略。

SQLite 数据库位于 `/var/data/permio/application.sqlite`，挂载 1 GB 持久化磁盘，
仅运行一个实例。Render 的持久化磁盘要求付费服务，因此配置使用 Starter 方案。
创建服务前应在 Render 确认服务和磁盘费用。免费临时文件系统会在重启或重新部署后丢失账户
及工作流，不适合此配置；磁盘服务重新部署时有短暂中断，不应扩展为多个应用实例。

可选服务端变量为 `PERMIO_ENVIO_GRAPHQL_URL`、`PERMIO_ENVIO_GRAPHQL_ADMIN_SECRET`
和 `PERMIO_ENVIO_FRESHNESS_SECONDS`。有经过审核的远程 Envio 服务后，同时设置地址和秘密。
Render 无法连接开发机的 localhost。未配置远程服务时，账户和前端情境演示可用，
Activity/Reports 明确返回不可用状态；新账户只有经可信上游绑定后才拥有收据记录。
不要把管理秘密放进前端或提交环境文件。

托管数据库从空库开始，不上传本地账户数据库、凭证、浏览器审核密钥或用户数据。
情境流程仍是按账户隔离的浏览器模拟，证明和交付保持待处理状态。
部署不代表通过 M6–M8 或生产 M11 验收。

部署后应核对分支和提交，确认 `/healthz` 返回 HTTP 200 和 `{"status":"ok"}`；
注册两个临时账户，验证十位密码、登录退出、账户隔离及 Secure Cookie；检查情境、权限、
披露和验证页面，以及 Envio 不可用时没有虚构活动；重新部署后验证临时账户仍存在。
官方参考链接见上文。

2026-10-14 在原生 Windows Node.js `24.13.1` 上，全新锁定依赖安装、应用类型检查和
`npm run check` 全部通过。完整检查覆盖生成文档、TypeScript、Hardhat 构建、64 项领域测试、
30 项 Hardhat 模拟链合约测试及 38 项应用／前端测试，共 132 项，没有跳过。
浏览器模块语法检查通过；另以独立内存数据库进程验证了真实启动入口、`0.0.0.0`、Render 风格
`PORT`、健康端点及托管密码策略。HTTP 回归测试确认 Secure Cookie，且 Envio 不可用时业务
返回 503 而健康检查保持可用。这些结果不代表完成公共网络或 Render 部署验证。

固定 Envio 依赖树仍有此前记录的十项审计问题：三项低危、一项中危、六项高危，详见 M8 开发日志。
未执行依赖升级或自动破坏性降级。本地导航索引已初始化，但 123 个文件中报告 61 项解析失败，
符号覆盖不完整；本次以精确源码和可执行检查作为验证依据。

首轮 GitHub CI 在全新检出后失败，因为旧 `check` 命令在生成 Hardhat ABI 类型前就检查合约测试。
本地已有生成文件掩盖了顺序缺陷。执行 `npx hardhat clean` 后单独运行类型检查复现了相同错误。
修复后的完整检查先编译 Solidity 再检查类型，保留严格类型检查和全部测试，生成产物仍不提交。
