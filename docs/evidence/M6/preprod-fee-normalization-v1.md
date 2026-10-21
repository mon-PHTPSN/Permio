# Preprod fee normalization v1

Error 117 covers more than contract instruction normalization. The published
ledger 8.1.0 and 8.1.1 `DustActions::well_formed` implementations reject a
present fee section when both spends and registrations are empty. The pinned
wallet 4.2.0 can construct this shape when its fee calculation is zero. This
mechanism is documented in the [upstream wallet issue](https://github.com/midnightntwrk/midnight-wallet/issues/700)
and [merged Midnight guidance](https://github.com/midnightntwrk/midnight-expert/pull/197).
An instruction-only diagnostic cannot exclude it.

The explicit restored Preprod test-wallet configuration now adds
`1_000_000n` atomic fee units to the computed DUST fee. It does not mutate
global SDK defaults. After balancing, the provider rejects a present, empty
DUST section and emits only `wallet-balance-failed-empty-dust-actions`.
It allows absent sections and leaves signature/proof verification to the
existing acceptance path. A regression uses actual SDK transaction and
DustActions objects to verify this boundary before any submission.

The dust wallet reads live ledger parameters from indexer block data. An
estimate made with `LedgerParameters.initialParameters()` is not the actual
wallet fee and must be labeled separately. Synthetic local diagnostics and
the inspected live run are recorded in `preprod-governance-v2-verification.json`.
Earlier rejected transaction bytes were not retained, so later evidence must
not invent their exact DUST contents. The full check after this fix passes
349 tests; governance acceptance still requires independent indexed results.

# Preprod 手续费规范化 v1

错误 117 不仅涵盖合约指令规范化。已发布的账本 8.1.0 和 8.1.1 中，
`DustActions::well_formed` 会拒绝存在但支出和注册均为空的手续费段。固定版本的
钱包 4.2.0 在手续费计算为零时可能构造出这种结构。上游钱包问题及已合并的
Midnight 指导记录了该机制。仅检查合约指令不能排除这一问题。

明确恢复的 Preprod 测试钱包配置现在会在计算所得的 DUST 手续费上附加
`1_000_000n` 个最小手续费单位，不修改 SDK 的全局默认值。配平后，provider
拒绝存在但为空的 DUST 段，只发送固定的失败阶段标签。不存在 DUST 段时不会被
此检查拒绝，签名及证明仍由既有验收流程验证。回归测试使用实际 SDK 交易和
DustActions 对象，验证提交前的这道边界。

DUST 钱包从索引器的区块数据读取实时账本参数。使用
`LedgerParameters.initialParameters()` 作出的估算不是实际钱包手续费，必须
单独标注。本机合成诊断及带检查的实时运行记录在上述验证 JSON 中。之前被拒绝
的交易字节未予保留，不能根据后续证据编造其具体 DUST 内容。本修复后的完整
检查通过 349 项测试；治理验收仍须独立核对被索引的结果。
