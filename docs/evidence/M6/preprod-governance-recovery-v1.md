# Preprod governance fixture recovery

The corrected-fee V5 run finalized 10 governance transactions, independently
confirmed by the indexer. It stopped while balancing final template admission,
before submission. No template was activated. The original random M4 fixture
and original balancing error were unavailable, so its exact failure remains
unresolved.

A clearly labeled synthetic pending-finalization state subsequently completed
one real contract proof and one real wallet balance. Submission was intercepted;
the actual contract state and wallet input files remained unchanged. This is a
diagnostic result, not live governance acceptance or an exact replay of V5.

The shared runner now offers an optional fixture checkpoint callback before
wallet access or deployment. It receives the canonical validated test fixture,
excluding the registry object and reviewer signing private keys. Failure aborts
the workflow before spending DUST. Its regression test exercises this boundary;
all 351 current root checks pass.

The controlled V7 runner saves that fixture in a separate local private cache
with a 0700 directory and 0600 file, checks ownership and exact round-trip
content, and never exports its contents to logs, source control, cloud storage,
or public evidence. It observes the existing SDK balancing, signing, and
finalization methods without changing their arguments or results. It retains
the 17-submission cap, one-hour client guard, original acceptance assertions,
and no automatic transaction retries. A separate reader must confirm every
successful transaction and the final governance state. Ordinary-action tests
and complete M6 acceptance are outside this governance-only result.

# Preprod 治理测试材料恢复

修正手续费后的 V5 运行确认了 10 笔治理交易，索引器已独立核验。运行在模板最终
准入的配平阶段停止，尚未提交该交易。没有激活模板。原随机 M4 测试材料及原始
配平错误均不可用，因此其准确故障原因仍未确定。

随后，明确标注为合成的待最终准入状态完成了一次真实合约证明和一次真实钱包
配平。提交被拦截，实际合约状态及钱包输入文件保持不变。这是诊断结果，不能
计入实网治理验收，也不是对 V5 的精确重放。

共享 runner 现提供可选的测试材料检查点回调，在访问钱包或部署之前执行。回调
接收规范、已验证的测试材料，不包含注册表对象及复核签名私钥。保存失败会在
消耗 DUST 之前终止流程。回归测试覆盖了这一边界；当前全部 351 项根检查通过。

受控 V7 runner 将测试材料保存到独立的本地私有缓存，目录权限为 0700、文件权限
为 0600，并检查所有权及完整往返内容，不将其内容导出至日志、源码管理、云存储
或公开证据。它观察既有 SDK 的配平、签名和最终封装方法，不改变其参数或结果。
保留 17 次提交上限、一小时客户端保护、原验收断言，以及不自动重试交易的限制。
独立读取程序必须确认每笔成功交易及最终治理状态。普通动作测试及完整 M6 验收
不属于本次仅治理结果的范围。
