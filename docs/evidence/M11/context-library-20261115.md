# Programmable context library — local acceptance

Date: 2026-11-15 (Asia/Shanghai). Baseline: `57c2b25`. Backend unit: `433b965`. Library UI and navigation fix: `de7fb81`.

The dashboard now supports reusable template authoring, an authenticated context library and configured instances. New context creation selects an active template from this library instead of the two fixed browser examples. Authors can use the guided single-action form or edit/import a complete declarative `ScenarioTemplate` definition. The editor, library search and detail views preserve all contexts and actions.

This reuses M2 validation and canonical hashing, M4 review/governance and M5 allocation. Imports receive a fresh server-owned namespace and template identity with no inherited approval. Only the owner can edit an unsubmitted draft. Allocation checks the exact namespace, template ID, version and content hash before storing the event. Each new instance stores its complete definition and target; existing account/participant visibility rules apply. Older instances remain visible with an explicit missing-snapshot message.

## Automated verification

The complete `npm test` command exited successfully: **713 Node test cases, 712 passed, one platform-specific skip, zero failures**, plus **44 Solidity tests passed**. This includes the eight new context-library backend/HTTP/view cases and the existing M2–M9 regression suites. The skip belongs to the existing Windows/POSIX-specific test coverage.

Additional checks passed: root and dashboard TypeScript checks, dashboard tests (**48/48**), scenario-domain (**25/25**), scenario-governance (**16/16**), `npm run docs:check`, and syntax checks for the changed JavaScript modules. Full-suite output is retained locally in ignored `logs/context-library-full-test.log`.

Regression coverage includes lossless multi-context create/update, fresh import identity, draft identity forgery, unknown executable properties, invalid references, unrelated-account isolation, stale allocation targets, immutable stored snapshots, retirement, participant access, HTTP authentication/CSRF, useful domain errors, request-size limits, imported-text escaping and legacy instance views. Required failing cases were observed before implementation: full-template creation initially failed the old flat-form validation; domain validation initially returned HTTP 500 instead of 400; view tests initially lacked the renderer and expiry label.

A supplementary in-memory target-shape probe passed: `null`, string, number, array, missing-hash object and additional-key object each returned HTTP-equivalent application status 409. The instance count remained zero and the stored blueprint document remained byte-for-byte unchanged. These six variants were checked manually; the committed automated cases cover stale target content and omitted-target compatibility.

## Real browser verification

An isolated server used `127.0.0.1:4189` and the disposable local database `logs/context-library-browser-20261115.sqlite`. Six synthetic accounts exercised separate author, reviewer, approver, allocator, revoker and participant roles through the normal UI.

- Created a custom two-context/two-action visitor template in the full definition editor; an unsupported `script` field produced `UNKNOWN_FIELD` without saving a partial draft.
- Edited and saved the complete definition without losing the later renewal context/action.
- Verified an unrelated account's empty library, independent browser Ed25519 review signing, separate activation and allocator-only creation. These were local domain operations.
- Searched for the later `renew-access` action, allocated a configured instance and verified its complete stored definition and exact target after reload and participant login.
- Imported the saved JSON file through the actual file chooser. The resulting draft had a new namespace/identity and unassigned review responsibilities.
- Created an additional custom equipment-checkout draft through the guided form, preserving its 900-second validity default.
- Inspected desktop and 390 × 844 mobile layouts; there was no horizontal overflow. Browser console error collection was empty.

The visitor instance was `u90915bb886da4066b2fdf9597afe9eb0`, bound to template `local.ue6793c4589c449a2b6588b16d1c999c6/definition`, version `1.0.0`, hash `0xae930d129379662ee8d3afcdf79ce0362216462b1022cb2e7ba62ff57300fcf1`. These are synthetic local evidence identifiers.

Screenshots are retained locally in ignored `logs/context-library-desktop-20261115.jpg` and `logs/context-library-mobile-20261115.jpg`; they are not published artifacts. The test database, browser signing keys and generated import files are excluded from Git.

## Final review and scope

Five simplification lenses completed. Shared text escaping replaced duplicate helpers, and unreachable guided-form prefilling was removed. Exact HTML/default comparisons and protected test hashes were unchanged. The final code passed dashboard tests (48/48), both TypeScript checks, documentation checks, JavaScript syntax checks and `git diff --check` again. A browser reload confirmed the library, empty guided defaults and complete two-context edit form, with no console errors. The isolated test server was then stopped; no other development service was changed. The local code index was updated successfully.

The completed `ce-code-review` receipt (`status: complete`, run `20261115-context-library`) reviewed the 16-path feature diff from `57c2b25`, SHA-256 `bf37df9f74c046aa52e9c2e56eb65e2429f07b46509a05fe46d1ec6b9c5260fe`. It found one confirmed P2 issue, #1: a delayed New context refresh could open a stale picker after sidebar navigation. This finding was applied inline: navigation increments a revision synchronously; a superseded load renders the destination and returns. Three tests exercise the real controller and registered navigation listener with a deferred response, including navigation away and back. The two race cases failed before the fix; all three passed afterward. No actionable finding remains unresolved. A different-provider review route was unavailable; the adversarial check used the local fallback.

After that final navigation patch, dashboard tests passed **51/51**, root/dashboard type checks, documentation and JavaScript syntax checks passed, and the real browser reopened the library and New context selection with no console errors. The full 713-case Node/44-case Solidity run above preceded this narrow frontend patch; the affected dashboard suite was rerun afterward. The review's remaining automated target-shape matrix suggestion is covered by the supplementary manual probe above, not claimed as committed automated coverage.

No deployment, cloud operation, native proof generation, new proof-module registration or Midnight activation was performed. Configurable definitions refer to the existing declarative domain model; this does not add arbitrary executable scripts or new proof circuits. Local M4 approval/activation and M5 allocation do not establish Midnight authorization, independent human acceptance, native M9 completion or full M11 completion. Those existing gates remain open.

Start the dashboard with `npm run dashboard:start` and open its Context library navigation (`#library`). Account/template operations do not require the execution-history indexer.

## 中文翻译

```text
可编程 Context 库——本地验收

日期：2026-11-15（上海时区）。基线为57c2b25，后端实施提交为433b965，模板库界面及导航修复提交为de7fb81。

仪表板现已支持可复用模板编写、经过认证的 context 库和配置化实例。创建新 context 时从模板库选择已激活模板，替换原来的两个固定浏览器示例入口。作者可以使用单动作引导表单，也可以编辑或导入完整的声明式 ScenarioTemplate 定义。编辑器、搜索和详情均保留全部 context 和动作。

实现复用 M2 验证与规范哈希、M4 审核治理和 M5 分配。导入会获得服务器生成的新命名空间及模板标识，不继承批准。只有所有者能编辑尚未提交的草稿。分配会在写入事件前检查精确命名空间、模板 ID、版本和内容哈希。新实例保存完整定义和目标，仍沿用账户／参与者可见性限制。旧实例保持可见，并明确说明缺少快照。

自动验证：完整 npm test 成功退出，共713个 Node 用例，712个通过、1个平台相关用例跳过、0个失败，另有44个 Solidity 测试通过。涵盖新增的8个库后端／HTTP／视图用例及既有 M2–M9 回归。跳过项来自既有 Windows／POSIX 平台差异测试。

根项目和仪表板类型检查、仪表板48/48、scenario-domain25/25、scenario-governance16/16、文档检查和更改的 JavaScript 语法检查均通过。完整日志保存在被忽略的 logs/context-library-full-test.log。

回归覆盖复杂模板无损创建／更新、新导入标识、草稿标识伪造、未知可执行字段、无效引用、无关账户隔离、旧分配目标、不可变快照、退役、参与者读取、HTTP认证／CSRF、有用的领域错误、请求大小限制、导入文本转义及旧实例展示。实施前已实际观察到完整模板被旧表单拒绝、领域错误返回500而非400，以及渲染模块和过期标识缺失等失败。

另一个内存数据库目标格式检查已通过：null、字符串、数字、数组、缺少哈希字段的对象、包含额外字段的对象，六种输入均返回应用状态409。实例数保持零，已保存模板文档逐字节不变。这六种情况进行了手动验证；已提交的自动用例覆盖旧目标内容和省略目标的兼容性。

真实浏览器验证在127.0.0.1:4189及一次性数据库 logs/context-library-browser-20261115.sqlite 上进行。六个合成账户分别担任作者、审核者、激活审批者、分配者、撤销者及参与者，全部使用正常界面。

创建了双context双动作的自定义访客模板；未知script字段被UNKNOWN_FIELD拒绝且未部分保存。完整编辑保留后续续期context／动作。确认无关账户模板库为空、浏览器Ed25519独立签名审核、独立激活及仅分配者可创建实例；这些均为本地域操作。通过后续renew-access动作搜索、分配配置化实例，并在刷新和参与者登录后确认完整快照与精确目标。使用实际文件选择器导入JSON，生成新命名空间／标识及尚未分配审核职责的草稿。另用引导表单创建自定义设备借用模板，默认有效期为900秒。检查桌面和390×844移动端，无横向溢出，浏览器错误日志为空。

访客实例标识为u90915bb886da4066b2fdf9597afe9eb0；模板为local.ue6793c4589c449a2b6588b16d1c999c6/definition，版本1.0.0，哈希为0xae930d129379662ee8d3afcdf79ce0362216462b1022cb2e7ba62ff57300fcf1。这些均为合成本地证据标识。

截图位于被忽略的logs/context-library-desktop-20261115.jpg及logs/context-library-mobile-20261115.jpg，并未公开发布。测试数据库、浏览器签名密钥和生成的导入文件均不进入Git。

五项简化审查已经完成：复用文本转义函数，移除引导表单无法触达的预填逻辑。精确HTML／默认值比较及受保护测试哈希均保持一致。最终代码再次通过仪表板48/48、两项类型检查、文档检查、JavaScript语法检查及git diff --check。浏览器刷新确认模板库、引导表单空白默认值和完整双context编辑表单，控制台无错误。随后停止了独立测试服务器，没有改动其他开发服务。本地代码索引已成功更新。

ce-code-review已完成，记录status为complete，运行标识为20261115-context-library。审查覆盖从57c2b25开始的16个文件差异，SHA-256为bf37df9f74c046aa52e9c2e56eb65e2429f07b46509a05fe46d1ec6b9c5260fe。确认了一个P2问题#1：New context延迟加载可能在侧栏导航后打开过期弹窗。已直接修复：导航同步增加版本计数；加载被后续导航取代时显示目标页面并返回。三个测试使用真实控制器及已注册的导航监听器，延迟返回数据，覆盖正常停留、离开和离开再返回。修复前两个竞争用例失败，修复后三个全部通过。没有未解决的可操作问题。不同提供商的审查路径不可用，对抗性检查使用了本地后备审查。

导航补丁之后，仪表板51/51、根项目／仪表板类型检查、文档及JavaScript语法检查均通过。真实浏览器重新打开模板库和New context选择，无控制台错误。上文713个Node／44个Solidity完整测试在这一局部前端补丁之前运行；补丁后重新运行了受影响的仪表板完整套件。审查提出的目标格式自动测试矩阵建议已由上文补充手动检查验证，没有将其声称为已提交的自动覆盖。

没有进行部署、云操作、原生证明生成、新证明模块注册或Midnight激活。可配置定义沿用既有声明式领域模型，并未增加任意脚本执行或新证明电路。本地M4批准／激活和M5分配不等于Midnight授权、独立真人验收、原生M9完成或完整M11完成，既有关卡仍开放。

使用npm run dashboard:start启动，在Context library导航（#library）进入。账户和模板操作不依赖执行历史索引器。
```
