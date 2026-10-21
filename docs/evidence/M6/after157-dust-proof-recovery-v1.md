# M6 call157 DUST-proof recovery

On 2026-10-21 (Asia/Shanghai), the preserved balanced candidate for reservation157
reproduced node validation `Custom(170)` without a wallet, proof request or native
submission. Its SHA-256 is
`d789b184cf8d5910698fd06a6033b87359643d6d1d17eb34be41aacb393f4030`.
No `wallet-157-submission.json` exists. The original runtime9 failure and candidate
remain preserved; the failure is conservatively counted.

The current [official DUST guide](https://docs.midnight.network/guides/manage-dust)
identifies this variant as `InvalidDustSpendProof`. This is a fee-proof failure.
The guide describes incomplete synchronization after restoration as one reproduced
cause; it does not establish that cause for this specific original candidate.
The original wallet state/preimage at balancing was not captured. A separate
wallet-free checkpoint-state inspection exceeded its bounded diagnostic timeout;
it produced no original-time root reconciliation.

The user's approved172-attempt/five-instance scope includes15 narrowly limited
reserves for conclusively pre-native-send failures. The subsequent explicit
instruction to diagnose170 and finish the remaining calls directs a manual
recovery using one reserve. No additional contract, server or instance is created.
Reservation158 replaces only the never-submitted157 operation;159 performs the
previously planned final revocation. There is no native retry loop.

The recovery restores the dedicated test wallet, waits for strict synchronization
and a DUST tree time at least as recent as a newly queried indexed block, then
balances the unchanged157 unbound transaction. At balancing, the observed tree
time and fee-proof creation time both equal `2026-10-20T20:51:00.000Z`; strict
synchronization is true and DUST parameters match the supplied block parameters.
The exact replacement passes read-only node validation before its one submission.
Reservation158 finalized at ledger sequence3066343, transaction
`00d553c08f49c7a04c0268678b91b68b3aed94de7a2d8b53370bb3319271bcb596`.
The same contract proof therefore works with a rebuilt fee payment. The precise
original DUST synchronization/time/proving cause remains unresolved.

The final revocation (reservation159) finalized at ledger sequence3066383,
transaction `009b3736a344437a71ddb49ee2ebd11d884d34b3f774d779fe2366d80df42d3f11`.
The final state has both module rows at6 and both template rows at3. The five
application instances, three receipts, three nullifiers and four remaining
preparation records are unchanged by these two governance operations. The tail
closed successfully, disposed its wallet and prover, returned the original8GiB
swap file to its inactive state, and restored swappiness. Runtime9's original
failure remains preserved. Complete evidence export, local protocol verification
and public file restoration remain pending at this observation. The finalizers
expect159 reservation files,157 submission journals,158 conservative attempts,
152 successes,4 native negative outcomes and2 local pre-send failures. They exclude
unsubmitted157 bytes, preserve runtime9's failure and require the successful tail
runtime separately. M6 completion and independent human review remain open.

## 中文

北京时间2026年10月21日，保存的第157项交易在不恢复钱包、不请求证明、不提交交易的只读
检查中复现了节点验证错误`Custom(170)`。其SHA-256见上文；不存在第157项提交记录。
原runtime9失败记录及候选交易均保留，并保守计入尝试数。

Midnight官方DUST指南将该变体解释为`InvalidDustSpendProof`，属于手续费证明故障。
指南复现过“恢复后同步未完成”这一原因，但这不能证明本次原始故障的具体原因。
本次原始余额处理时的钱包状态及私有证明前像没有捕获；另一次只读检查在限定时间内超时，
没有得出原始时刻的根一致性核验结果。

此前批准的172次尝试、五个应用实例方案包含15次严格限定于“确定未发送”的恢复预留。
用户随后明确要求排查170并完成剩余调用，本次人工选择使用其中一次预留：158替代未提交的
157操作，159完成原计划最后一次撤销。不新增合约、服务器或应用实例，不自动重发原生交易。

恢复流程先恢复专用测试钱包，要求严格同步，并等待DUST树时间追上新读取的索引器区块，
然后为相同的未绑定合约交易重新构建手续费支付。新余额处理时，树同步时间与证明创建时间
均为UTC2026年10月20日20:51:00，严格同步成立，DUST参数与传入区块参数一致。
替代交易经过准确的节点只读验证后只提交一次，第158项已在账本序号3066343确认。
这证明相同合约证明配合重建的手续费支付能够通过，但原始DUST故障的具体原因仍未确定。

最后撤销（预留159）已在账本序号3066383确认。最终两个模块的状态均为6，两个模板状态均为3。
两次治理操作没有改变五个应用实例、三份收据、三个nullifier及四份剩余准备记录。
恢复任务成功退出，释放钱包和证明服务，将原8GiB交换文件恢复为未启用状态，并还原swappiness。
原runtime9失败记录继续保留。此观察时点的完整证据导出、本地协议核验及公开文件恢复仍待完成。
校验程序要求159份预留记录、157份提交日志、158次保守计数、152次成功、4次原生负向结果
及2次本地提交前失败；不导出未提交的157交易字节，保留runtime9失败，并单独核验恢复任务。
M6完成及独立人工审查仍未关闭。

## Later evidence verification — 2026-10-21 05:10 Asia/Shanghai

The first read-only export matched all156 exact transaction pairs, then stopped
at the receipt reader's indexer-response stage. Fresh probes of receipt rounds50,
86 and147 returned HTTP200 and matched protocol, successful finality, transaction
hash, block hash, height and exact ordinary-action entry. The original transient
response was not retained, so its precise HTTP/network cause is unproven.
The SDK receipt reader now retries the same immutable query at most3 times for
transient429/502/503/504 or transport/timeouts. Terminal HTTP responses, malformed
JSON, GraphQL errors and all receipt/provenance checks still fail closed. Four
targeted tests and typecheck pass; the integration regression fails against the
prior one-shot read and passes with the fix. A Windows command-line size limit
during read-only source staging was resolved with two verified12KB public chunks;
the failed stage created no remote files or native operations.

The isolated14-file read-only source completed the export. The scan checked412
artifacts against183 actual private values with zero findings. The downloaded
package's413 files and archive hash verify locally. Independent offline verification
passes:156 public bound transactions,152 successful exact-byte records,4 native
negative outcomes,3 actual SDK receipt decodes,4 public-VM causal replays,
2 deprecation-admission replays and public provenance for4 generated-circuit
lifecycle checks. Private-witness circuit checks are not claimed as replayed
offline. Public-file restoration remains active in the finite coordinator;
final restoration evidence/download and independent human review remain pending.

### 中文补充

首轮只读导出核对完全部156份交易字节后，在收据索引器响应检查处停止。随后对50、86、147
三笔收据来源的重新探测均返回HTTP200，协议、成功最终确认、交易及区块哈希、区块高度和
准确操作入口均匹配。原临时响应未保留，无法证明具体HTTP／网络原因。SDK现针对临时
429／502／503／504及传输／超时，对同一个不可变查询最多尝试三次；终止性HTTP错误、
非法JSON、GraphQL错误以及所有收据／来源检查继续严格拒绝。四项针对性测试和类型检查
通过；集成回归在原单次读取实现上失败、在修复后通过。只读源码分发遇到的Windows命令行
长度限制已通过两份经校验的12KB公开分块解决，失败分发未创建远程文件或原生操作。

独立的14文件只读源码已完成导出。412份材料针对183个实际私有值扫描，未发现泄露；下载包
413份文件及归档哈希在本地核验一致。离线独立检查通过156份公开绑定交易、152份成功字节、
4次原生负向结果、3份实际SDK收据解码、4次公开虚拟机原因重放、2次弃用准入重放，以及4项
生成电路生命周期检查的公开来源证明。不将私有见证电路检查称为离线重放。
公开文件恢复正在有限协调程序中持续运行；最终恢复证据下载及独立人工审查仍待完成。
