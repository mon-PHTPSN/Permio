# Preprod submission diagnostics v1

The 17 October continuation preserves public submission failure categories,
bounded numeric RPC/HTTP codes, and Substrate custom error codes. The pinned
wallet submission service uses Effect runtime causes; inspecting only an
outer Error message loses the typed node failure. The classifier follows
bounded own data properties and the Effect runtime cause symbol, without
serializing SDK errors or accessing transaction bytes, response bodies, URLs,
stacks, credentials, or private witness data. The
[Effect error documentation](https://effect.website/docs/v3/data-types/data)
describes the runtime cause wrapper used here.

10 月 17 日的续作保留公开提交失败类别、范围受限的 RPC／HTTP 数字错误码，以及
Substrate 自定义错误码。固定版本的钱包提交服务使用 Effect 运行时原因对象；仅检查
外层 Error 消息会丢失带类型的节点错误。分类器有限遍历自有数据属性和 Effect 运行时
原因符号，不序列化 SDK 错误，也不读取交易字节、响应正文、URL、堆栈、凭据或私有
见证数据。上述 Effect 错误文档说明了这里使用的运行时原因封装。

The provider emits this sanitized diagnostic before throwing, because the
existing checkpoint resource boundary deliberately replaces workflow errors.
The supervisor independently validates and copies only allowed diagnostic
fields. It retains the last allowed workflow phase, permits wallet disposal,
and fails the run even if an inconsistent worker later claims success.
Submission remains one attempt per call, with reconciliation required before
retrying. A failure category or RPC code alone does not establish final chain
rejection or authorize retrying an unresolved transaction.

Provider 在抛出错误前发送已脱敏诊断，因为现有检查点资源边界会主动替换工作流错误。
监督进程独立校验并仅复制允许的诊断字段，保留最后一个获准的工作流阶段，允许钱包
完成释放；即使不一致的 worker 随后声称成功，也将本次运行判为失败。每次调用仍只
尝试提交一次，重试前必须核对链上结果。失败类别或 RPC 错误码本身不能证明链上最终
拒绝，也不授权重复提交结果未知的交易。

Tests exercise actual installed SDK/Effect wrappers, numeric code preservation,
phase reporting, checkpoint redaction, unknown and malformed IPC fields,
cycles, traversal limits, accessors, proxies, and exclusion of private payloads.
This changes diagnostics, without changing contracts, proof keys, validity
windows, governance thresholds, credentials, or automatic retry behavior.
Governance acceptance and full M6 completion require separate live evidence.

测试涵盖实际安装的 SDK／Effect 封装、数字错误码保留、阶段报告、检查点错误替换、
未知及畸形 IPC 字段、循环、遍历上限、访问器、代理以及私有载荷排除。本次只改变
错误诊断，不改变合约、证明密钥、有效期窗口、治理阈值、凭据或自动重试行为。
治理验收及完整 M6 完成仍需要独立的实时证据。
