# Permio NEAR AI Integration

Status: PLANNED — implementation and live acceptance pending<br>
Decision date: 14 November 2026<br>
Scope: full Permio product with NEAR AI Cloud private inference

## 1 Product decision

Keep the programmable scenario library, generated instances, governance,
context accounts, scoped capabilities, Midnight authorization, receipts,
execution, encrypted evidence, and product workflows. Clinical referral/
research consent, professional qualification/site access, and delegated
finance/purchasing remain first-class scenario families.

NEAR AI Cloud is the selected planned inference provider. This supersedes the
earlier exclusion of Qwen and external AI runtimes. The entry presents the full
Permio product; a focused demo does not reduce it to a standalone chatbot.
No existing AI runtime, completed provider swap, or live acceptance is claimed.

## 2 Responsibilities and information flow

1. The user selects an instance and previews recipient, purpose, selected
   inputs, expiry, and any new linkage.
2. Permio checks current capabilities, sessions, consent, and applicable M6
   authorization before disclosing the approved view.
3. The authorized inference client establishes the required verified NEAR AI
   path, then sends only that view to a Confidential TEE model. A trusted
   execution environment (TEE) isolates computation in hardware; attestation
   provides evidence about its measured environment.
4. The client checks the required response evidence. The UI distinguishes an
   answer, an unverified answer, and a proposed action.
5. Proposed actions require the ordinary Permio authorization/execution path;
   new recipients, purposes, inputs, or actions require their own permission.

Document the exact recipient/workload binding and every plaintext-processing
component before sending sensitive inputs. An ordinary application relay is
not protected by the model's TEE guarantee. M10 governs evidence delivery when
used. Inference never receives wallet/vault keys, session secrets, credential
signatures, or proof witnesses. This decision prescribes no new public receipt
schema and no NEAR-chain deployment.

Keep inputs, outputs, and conversation history context-specific. Check further
turns, retrieval, and tool calls against current permissions; a shared provider
account cannot grant cross-user memory. Revocation blocks subsequent
unauthorized use, not information already disclosed. Describe actual retention
and deletion behavior before making a no-retention claim.

## 3 Provider and verification requirements

Use NEAR AI Cloud Gateway with an explicitly selected Confidential TEE model.
OpenAI API compatibility helps integration but establishes neither
authorization nor private inference. Record model features and client/verifier
versions; verify needed tool-calling and structured-output support.

Incognito models use external providers without the same model-side TEE
guarantee and cannot silently replace the private model. Follow the official
verification flow and declared policy for fresh gateway/model evidence,
connection binding, and response signatures. Gateway-only verification is not
model verification; an absent signature cannot yield response-verified status.

Required pre-send evidence that is missing, stale, invalid, or mismatched
blocks transmission. Failed required response checks block use of that
response. Show precise failure/recovery states without private diagnostic
content. TEE evidence proves only checked properties; it does not establish
AI correctness or replace Midnight authorization.

## 4 Roadmap and acceptance

M0–M10 keep their existing protocol/evidence responsibilities. M11 adds the
authorized inference client and product experience; M12 adds real service,
verification, and browser evidence. Existing incomplete milestones remain
incomplete. Documentation and synthetic tests do not close live gates.

| ID | Required observable acceptance |
| --- | --- |
| NI-01 | Valid scoped access reaches inference; wrong context, recipient, purpose, expired/revoked permission, or stale authorization is rejected before unauthorized transmission. |
| NI-02 | Privately capture the test outbound request and prove only permitted inputs were sent. Isolate accounts, contexts, later turns and retrieval; inputs, outputs and secrets stay out of public artifacts and logs. |
| NI-03 | A real call uses the recorded Confidential TEE model and supported features. Unavailable/incompatible models cause explicit failure without privacy downgrade. |
| NI-04 | Actual required gateway/model/connection/response checks pass. Stale evidence, altered signatures and mismatched bindings fail at the correct stage; UI distinguishes passed, failed, unsupported and absent checks. |
| NI-05 | Independent Permio checks bound AI-proposed actions, including prompt-injected access/tool requests. Model instructions alone cannot activate templates, grant capabilities or cause side effects. |
| NI-06 | Reproduce an authorized journey using real inference, browser interaction and each applicable authorization/execution boundary. Every required scenario family has generated positive/negative coverage and a real inference journey; any unexercised live family leaves NI-06 incomplete. Show subsequent denial after revocation; publish sanitized evidence only. |

Record source revisions, generated-input provenance, applicable public protocol
references, model/tier, verification policy/version, timestamps, outcomes, and
reproducible commands. Keep private request comparisons out of publishable
evidence. Label synthetic tests, historical replay, live service, browser and
chain results separately. Recorded receipt replays cannot prove live NEAR AI.

## 5 Competition disclosure

Present the full product and identify the new NEAR AI work separately.
Preserve existing history; record a real baseline revision and reviewable
integration diff when implementation starts. Disclose prior work, changes
within the eligible window, and outstanding verification. This document is a
scope decision, not proof of implementation or a submitted entry.

Rules checked on 14 November allow existing cross-chain products and judge
their new NEAR integration with baseline disclosure. Eligible development
starts 19 October; submission ends 14 November 2026 at 23:59 UTC
(15 November at 07:59 Asia/Shanghai). A public repository and public X demo
post are required. Recheck live rules before submitting.

## 6 Official sources

- [NEAR AI quickstart](https://docs.near.ai/cloud/quickstart)
- [Model capabilities and privacy tiers](https://docs.near.ai/cloud/models)
- [Verification guide](https://docs.near.ai/cloud/verification)
- [Hackathon rules, Q-001–Q-004 and submission](https://nearhackathon.com/HACKATHON.md)

---

# Permio NEAR AI 集成

状态：PLANNED——待实现与实时验收<br>
决策日期：2026 年 11 月 14 日<br>
范围：完整 Permio 产品与 NEAR AI Cloud 隐私推理

## 1 产品决策

保留可编程情境库、生成实例、治理、上下文账户、有限 capability、Midnight 授权、收据、
执行、加密证据和产品工作流。临床转诊／研究同意、专业资格／场地访问、受委托金融／采购
继续作为三个一等情境族。

NEAR AI Cloud 是选定的计划推理服务。本决策取代此前排除 Qwen 和外部 AI 运行时的范围
选择。参赛作品展示完整 Permio 产品；聚焦的演示不把产品缩减为独立聊天机器人。不声明已有
AI 运行时、完成服务替换或通过实时验收。

## 2 职责与信息流

1. 用户选择实例，预览接收方、用途、选定输入、期限和任何新增关联。
2. 披露获准视图之前，Permio 检查当前 capability、session、同意与适用的 M6 授权。
3. 获准推理客户端建立必需的已验证 NEAR AI 路径，再仅向 Confidential TEE 模型发送该视图。
   可信执行环境（TEE）通过硬件隔离计算；attestation 提供关于其测量环境的证据。
4. 客户端检查必需响应证据。UI 区分回答、未验证回答和操作建议。
5. 操作建议需要正常 Permio 授权／执行路径；新增接收方、用途、输入或操作需要各自的许可。

传输敏感输入之前，记录精确接收方／workload 绑定和所有处理明文的组件。普通应用中继不受
模型 TEE 保证保护。使用证据交付时由 M10 约束。推理不接收钱包／vault 密钥、session 秘密、
credential 签名或证明 witness。本决策不规定新公开收据 schema，也不要求部署到 NEAR 链。

输入、输出和对话历史保持情境隔离。追加对话、检索和工具调用检查当前权限；共享供应商账户
不能授予跨用户记忆。撤销阻止后续未授权使用，不能抹除已披露信息。声称不保留数据之前，
说明实际保留与删除行为。

## 3 服务与验证要求

使用 NEAR AI Cloud Gateway，明确选择 Confidential TEE 模型。兼容 OpenAI API 便于集成，
但不能建立授权或隐私推理保证。记录模型能力及客户端／验证器版本，验证所需工具调用和
结构化输出支持。

Incognito 模型使用外部供应商，不具备相同的模型端 TEE 保证，不能静默替代隐私模型。按
官方验证流程及声明的策略核验新鲜的 gateway／model 证据、连接绑定和响应签名。只验证
gateway 不等于验证模型；没有签名时不能标注为响应已验证。

必需的发送前证据缺失、陈旧、无效或不匹配时，阻止传输。必需响应检查失败时，阻止使用该
响应。展示精确失败／恢复状态，不输出私有诊断内容。TEE 证据只证明实际检查的属性，
不证明 AI 正确，也不替代 Midnight 授权。

## 4 路线图与验收

M0–M10 保留已有协议／证据职责。M11 增加获准推理客户端和产品体验；M12 增加真实服务、
验证和浏览器证据。现有未完成里程碑保持未完成。文档与合成测试不能关闭实时门槛。

| ID | 必需的可观察验收 |
| --- | --- |
| NI-01 | 有效限定访问进入推理；错误上下文、接收方、用途、到期／撤销权限或陈旧授权，在未授权传输前被拒绝。 |
| NI-02 | 私下捕获测试出站请求，证明只发送获准输入。隔离账户、上下文、追加对话和检索；输入、输出和秘密不进入公开产物或日志。 |
| NI-03 | 真实调用使用已记录的 Confidential TEE 模型及受支持能力。模型不可用／不兼容时明确失败，不降低隐私等级。 |
| NI-04 | 实际必需的 gateway／model／连接／响应检查通过。陈旧证据、被篡改签名和错误绑定在正确阶段失败；UI 区分通过、失败、不支持和缺失的检查。 |
| NI-05 | 独立 Permio 检查约束 AI 建议操作，包括 prompt injection 访问／工具请求。不能仅因模型指令就激活模板、授予 capability 或产生副作用。 |
| NI-06 | 使用真实推理、浏览器交互及所有适用授权／执行边界复现获准旅程。每个必需情境族都有生成式正向／负向覆盖及真实推理旅程；任一情境族未实时运行时，NI-06 保持未完成。展示撤销后的后续拒绝，只发布脱敏证据。 |

记录源码 revision、生成输入来源、适用公开协议引用、模型／等级、验证策略／版本、时间戳、
结果和可复现命令。私有请求比较不进入公开证据。分别标注合成测试、历史回放、实时服务、
浏览器与链上结果。历史收据回放不能证明实时 NEAR AI。

## 5 参赛披露

展示完整产品，并单独说明新增 NEAR AI 工作。保留既有历史；开始实现时记录真实基线 revision
与可审核集成 diff。披露原有工作、合资格窗口内的修改和尚待验证部分。本文件是范围决策，
不是实现证据，也不代表已经提交参赛。

11 月 14 日核实的规则允许已有跨链产品参赛，评审新增 NEAR 集成并要求披露基线。合资格开发
从 10 月 19 日开始；提交截止为 2026 年 11 月 14 日 23:59 UTC，即北京时间 11 月 15 日
07:59。需要公开仓库及公开 X 演示帖子。提交前再次检查实时规则。

## 6 官方来源

- [NEAR AI 快速入门](https://docs.near.ai/cloud/quickstart)
- [模型能力与隐私等级](https://docs.near.ai/cloud/models)
- [验证指南](https://docs.near.ai/cloud/verification)
- [比赛规则 Q-001–Q-004 及提交](https://nearhackathon.com/HACKATHON.md)
