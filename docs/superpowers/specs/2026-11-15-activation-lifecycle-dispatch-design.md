# Versioned activation lifecycle dispatch

The user approved combining activation begin/finalize on 2026-11-15 after the
eleven-entry v11 constructor exceeded the real node's weight limit. Implement
v12 separately; preserve v10/v11 source, generated assets, keys and evidence.
This authorizes implementation and measurement, not human/protocol approval,
activation or transaction submission.

## Contract

Use one exported `manageM4Activation(operation: Uint<8>, envelope, signature,
activator, authorityPath): FinalizationResult`. Operation 1 begins a session,
returning `{activated:false, registryKey}`; operation 2 finalizes it with the
existing result. Reject every other selector before state access. Keep
`stageM4ActivationBinding` separate. Make the old begin/finalize bodies private
helpers without changing their statements or ordering.

Begin verifies authority before stale-session cleanup. Finalize cleans an
expired/stale session and returns false before authority verification. Preserve
nonce reservation/consumption, signed envelope commitment, complete canonical
bindings, registry/root freshness, counters, cleanup and atomic record writes.
Leave both preparation entries, predicate enforcement, final action execution,
policy v4 and DecisionReceipt v1 unchanged. Selector disclosure follows existing
public-operation dispatch conventions; it changes no signature domain.

## SDK and evidence

Provide explicit v12 contract/assets and circuit/connected-call adapters.
Logical begin returns a registry key; logical finalize returns the existing
result. Preserve transaction metadata and optional logical-operation scope for
checkpoint/budget tracking. Existing v10/v11 entry points remain unchanged.
No checkpoint may be silently upgraded to another deployment or ABI.

Compile with Compact 0.31.1/runtime 0.16.0 and the existing Node 22 environment.
Reuse keys only for byte-identical compiled programs after real SDK integrity
verification. Generate changed keys under the unchanged bounded resource limits.
Run generated-circuit positive/negative tests and full repository checks. Measure
the real ten-entry constructor with all genuine verifiers against the pinned
local genesis/node. Require at least 5% headroom after the historical 18-billion
balancing reserve; exact balanced-byte validation remains a later submission gate.
If this candidate fails, report the measurement before any further architecture
change. Human security/privacy review and protocol governance remain mandatory.

## 中文翻译

```text
# 新版本激活生命周期分发

v11 的十一个入口使真实节点构造交易超过权重上限后，用户于 2026-11-15 批准合并激活 begin/finalize。单独实现 v12，保留 v10/v11 源码、生成资产、密钥及证据。此授权覆盖实现和测量，不代表人工／协议批准、激活或提交交易。

合约：使用一个导出入口 manageM4Activation(operation: Uint<8>, envelope, signature, activator, authorityPath): FinalizationResult。操作 1 开始会话并返回 {activated:false, registryKey}；操作 2 完成激活并返回现有结果。其他选择值均在访问状态之前拒绝。stageM4ActivationBinding 保持独立。原 begin/finalize 函数体变为私有辅助函数，不改变语句或顺序。

begin 先验证权限再清理失效会话。finalize 先清理过期／失效会话并返回 false，然后才验证权限。保留随机数预留／消费、签名信封承诺、完整规范绑定、注册表／根的新鲜度、计数器、清理和原子记录写入。两个准备入口、谓词执行、最终动作执行、策略 v4 及 DecisionReceipt v1 均保持不变。操作选择值按现有公开操作分发约定披露，不改变签名域。

SDK 和证据：提供明确的 v12 合约／资产及电路／已连接交易适配器。逻辑 begin 返回注册表键；逻辑 finalize 返回现有结果。保留交易元数据及可选逻辑操作作用域，以用于检查点／预算跟踪。现有 v10/v11 入口保持不变，不得将检查点静默升级到其他部署或 ABI。

使用 Compact 0.31.1／运行时 0.16.0 及现有 Node 22 环境编译。只有编译程序字节完全相同且通过真实 SDK 完整性验证，才允许复用密钥。在不变的受限资源配置下生成变化的密钥。运行生成电路的正负向测试及全仓检查。使用全部真实验证密钥，在固定本地创世／节点上测量真实十入口构造交易。计入历史 180 亿平衡预留后至少保留 5% 余量；精确平衡字节验证仍是之后的提交关卡。若此候选失败，应先报告测量结果，再讨论其他架构变更。仍须人工安全／隐私审查及协议治理批准。
```
