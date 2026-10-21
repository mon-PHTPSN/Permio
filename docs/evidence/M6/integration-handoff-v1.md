# M6 to M7/M8 integration handoff

## Current boundary

The user authorized publishing the current M6 pull request, creating a separate
integration session for M7 and M8, and deleting redundant branches only after
their work is safely integrated. Independent human security/privacy review is
deferred and remains OPEN. M6 is not formally complete or production-ready.

The authoritative acceptance record is [acceptance.json](acceptance.json), with
the evidence-tier explanation in
[the reconciliation](acceptance-reconciliation-20261021-v1.md). Generated-circuit
rejections, public-VM replay and native network outcomes are distinct evidence
tiers; do not describe all negative cases as native rejection transactions.

The final deployed source is contract v10, ordinary-action profile 9, receipt
version 1. The controlled Preprod contract is
`70c139af18859fc0074f015c8c88bd727dd2a4a63afa85dcc427d98e127bbd8c`.
Its generated JavaScript SHA-256 is
`21afd7ea01ad0727a5c8c8d865d7f557eebd4e276a10471ca3122fb14c751d53`.
The final tests used five application instances and 158 conservative attempts:
156 native submissions and two failures before sending. There were 152 successful
confirmations, four intended native negative outcomes and three actual SDK
receipts. The test modules and templates are now revoked.

Raw logs, wallets, private witnesses and local validation output are deliberately
excluded from Git. Public verification summaries and the tests are committed;
historical references into ignored `logs/` require the retained local evidence.
The existing evidence downloads must be preserved during branch/worktree cleanup.

## Integration order

1. Freeze the committed M6 public contract. Start from the published M6 commit,
   preserving the current default branch's CODEOWNERS and owner-approval rule.
2. Preserve all M7 and M8 uncommitted work before integrating their branches.
   The workspace's permanent milestone worktrees must not share a mutable
   checkout with a concurrently active milestone task.
3. Finish M7's real M6 receipt decoder, finalized-event observation, durable
   checkpoints/outbox, authenticated transport and recovery/delivery behavior.
   Its preparation checkpoint is not milestone acceptance.
4. Connect M8's execution registry, Envio projection and existing dashboard to
   the actual M6/M7 interfaces. Replace explicitly labeled fixtures only when
   the real upstream behavior is verified. Preserve receipt v1 and the single
   Midnight-contract trust model.
5. Run the combined local acceptance suite, including negative authorization,
   duplicate/replay handling, restart/recovery and downstream execution failure.
   Record which checks are local, fixture-based or live. Do not infer live
   end-to-end acceptance from a fixture passing.
6. Publish the integration result for owner review. Do not bypass branch
   protection, self-approve on another identity, or mark the human review passed.
7. Remove only branches whose commits or equivalent content are verifiably
   preserved in the accepted integration. Check worktree users, dirty files,
   open pull requests and unpushed commits first. Keep M9 and any unintegrated
   experiment work. Preserve ignored evidence and private instruction appendices
   before considering worktree removal; never use forced recursive cleanup.

M9 integration is not included in this handoff. Its existing scenario packs
remain preparation against versioned fixtures until their upstream dependencies
are integrated and tested.

## Infrastructure and transaction scope

The Singapore build instance was independently verified economically stopped
on 2026-10-21 at 09:26 Asia/Shanghai; its disks and configuration are preserved.
The finished-work monitor was retired. Local integration does not require
restarting it. If later authorized work needs it, follow the current private
workspace instructions and lifecycle helper before using it.

The previous authorization was bounded at 172 attempts and five instances.
Remaining reserve is restricted to the approved recovery purposes; it is not
permission for a new positive test instance, contract deployment or new live
integration scenario. Do not replay failed calls 55 or 157 or automatically
retry native submissions. A new live test scope needs a concrete plan within
the user's existing authorization or a separate decision if it exceeds it.

## 中文说明

用户已授权发布当前 M6 PR，新建独立会话集成 M7、M8，并在确认成果完整保留后
删除多余分支。人工安全／隐私审查暂缓但仍为 OPEN，M6 尚未正式完成，也不能
宣称可用于生产。验收状态以 acceptance.json 和验收对账文档为准；生成电路拒绝、
公共虚拟机重放和真实网络拒绝属于不同证据层级。

最终部署为 v10 合约、普通操作 profile 9、收据 v1。测试保守计数为 158 次尝试，
其中 156 次原生提交、2 次发送前失败；152 次成功确认、4 次预期原生负向结果，
生成了 3 份真实 SDK 收据。所有测试模块和模板已撤销。原始日志、钱包、私有
见证和本地验证输出不进入 Git；历史 logs 链接依赖保留的本地证据，清理时必须
保留这些下载成果。

先以已发布 M6 提交为基础，保留 CODEOWNERS 和所有者审批要求，保存 M7/M8
未提交成果，再完成 M7 的真实收据解码、最终确认监听、持久化及认证传输，接通
M8 执行注册表、Envio 和已有界面。不得用夹具测试冒充真实端到端验收，不得为适配
夹具另造收据格式。组合验证通过后发布集成结果供所有者审核，再逐个核验可删除
分支；保留 M9、未整合实验及本地证据，不绕过审查、不强制删除工作目录。

新加坡服务器已于北京时间 2026-10-21 09:26 核验完成节省停机，磁盘和配置保留，
监控已结束。纯本地集成无需启动服务器。此前最多 172 次、5 个应用实例的额度
仅适用于原批准恢复方案；剩余额度不能直接用于新的集成部署或测试实例，不重放
失败调用 55、157，不自动重试原生交易。新增真实测试若超出现有授权，需要先准备
具体方案并取得相应决定。
