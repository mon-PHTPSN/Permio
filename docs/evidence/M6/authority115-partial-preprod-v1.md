# M6 partial Preprod verification at 115 attempts

Verified on 2026-10-20. **M6 remains IN_PROGRESS; productionReady=false.**
The independent human security/privacy review remains open.

The existing test contract is
`70c139af18859fc0074f015c8c88bd727dd2a4a63afa85dcc427d98e127bbd8c`.
The authorization remains 150 conservatively counted attempts and four application
instances. The proposed fifth instance and 172-attempt ceiling remain unapproved.

- 115 counted attempts: 112 successful calls, two definite native failures and
  the earlier local pre-send failure55. Reservation51 was abandoned without send.
- The three-call authority phase completed successfully: two approvals followed
  by one rejection of the previously valid action. Neither earlier negative87
  nor unused55 was resubmitted.
- Exact public bytes were reconciled for 114 bound transactions. Both real
  historical receipt reads used the indexed SDK adapter and receiptv1 decoder.
  The current ledger contains four instances, two receipts/nullifiers and three
  pending preparations; authority sequence2 and credential-status sequence10.
- Both conflict and authority rejection cases passed the public execution replay
  under each historical parameter set. In every comparison the transaction,
  original attempt clock and parameter set were held fixed. Restoring only the
  selected public row made the same program pass again. This checks execution
  causality; it is not a replacement for native proof/fee validation.
- At the preliminary checkpoint, 279 public artifacts passed scanning against
  143 actual private sentinels with zero findings. That archive contained
  280 hash-verified files including the scan.
  Unsubmitted positive controls and unused55 bytes are excluded.
- The independent offline verifier passed all114 transaction comparisons,
  two native failure classifications, two actual receipt decodes and both
  causal replays. It performs no network validation or native submission.
- Historical runtime3 left no controller report. The package explicitly records
  that absence and preserves the existing failure reports for runtimes5 and6.

The first audit assumed identical ledger parameters across different blocks.
That assumption failed; the revised audit runs both parameter sets independently.
HTTP failures during export are preserved. Exact historical-response caching and
bounded retries apply only to reads. The native execution snapshot remains
version11 with216 files and manifest SHA-256
`34c8373fd6bed6ed3e9dcf3b5c52255583a41deda35925a9a5fc9be0fe14c121`.
The finalizer typecheck passed; the earlier complete root check passed443 tests.

Final restoration and local verification passed. All 16 offloaded public paths,
23 temporarily deduplicated pairs and 52,411 dependency files match their recorded
contents and metadata. The original 8 GiB swap file is preserved and inactive;
the temporary swap is absent and swappiness is back to zero. All native jobs
are closed. The complete scan covered 284 artifacts against 143 private
sentinels with zero findings; the final download contains 285 hash-verified files.
The offline verifier again passed all 114 transaction comparisons, two actual
receipt decodes and both causal checks. No new native transaction was submitted.

An earlier bounded deadline monitor ended while downloads were still pending,
and the scheduled economical stop executed after the native jobs had finished.
The same instance was restarted to finish restoration. The replacement monitor
renews until explicit owner completion, rather than ending after three hours.
The original preliminary checkpoint and its pending-restoration summary remain
unchanged; the final package adds a separate final summary and rendered state.

Restoration completed before the wrapper stopped on 12 private diagnostic logs
with mode 0644 inside the protected 0700 private directory. Those exact logs were
restricted to 0600 without changing contents, and restoration was independently
reverified. The version6 final export then passed scanning but failed to save
because its parent directory was absent (ENOENT). Version7 creates that directory;
its actual scan and the final offline verifier passed. The failures are retained.

The server owner explicitly finished after verified downloads. The final one-time
economical-stop deadline is **2026-10-20 19:19:52 Asia/Shanghai**, independently
read back as Waiting, StopCharging and ForceStop=false. The previous pending
timer is cancelled, automatic deletion is empty, and the instance and disks are
preserved. Deadline refreshing has stopped.

Evidence: [offline verification](../../../logs/m6-remaining-preprod-20261019/authority115-download-protocol-verification-v1.json),
[download integrity](../../../logs/m6-remaining-preprod-20261019/authority115-download-integrity-v1.json),
[final rendered public state](../../../logs/m6-remaining-preprod-20261019/downloaded-authority115-public-evidence-v1/public-evidence/render/final-public-state.html),
[remaining scope proposal](after113-split-case-recovery-scope-v1.md).

## 中文翻译

于2026-10-20完成核验。**M6仍在进行中，productionReady=false。**
独立人工安全／隐私审核仍未完成。

继续使用上述同一测试合约，现有授权仍为保守计数150次尝试、四个应用实例。
第五个应用实例及172次上限的提案尚未获批。

- 已计数115次：112次成功、两次明确的原生交易失败，以及此前第55项本地发送前失败。
  第51项已放弃，从未发送。
- 三次调用的权限根阶段成功完成：两次批准后，原本有效的操作被拒绝。
  没有重发此前第87项拒绝交易，也没有复用第55项。
- 已逐字节核对114笔配平交易，两份真实历史收据均通过索引器SDK适配器和v1解码器读取。
  当前账本有四个实例、两份收据及nullifier、三项待处理准备；权限根序号2、状态根序号10。
- 状态冲突和权限根拒绝均分别在两组历史参数下通过公开执行重放。每组比较均固定交易、
  原尝试时间及参数，只恢复所选公开记录即可让相同程序重新通过。这核验因果关系，
  不替代原生证明／费用验证。
- 初步检查点有279份公开产物针对143个真实私密哨兵值扫描，零发现；该初步归档包含扫描报告，共280份文件，
  均已下载并核验哈希。未发送的有效对照和第55项字节未包含在归档中。
- 独立离线核验已通过114组交易比较、两次原生失败分类、两份真实收据解码和两组因果重放。
  该核验不会进行网络验证或提交原生交易。
- 历史第三次运行未留下控制器报告。归档如实记录这一缺失，并保留第五、六次运行已有的失败报告。

首次审核假定不同区块的账本参数相同，该假设核验失败；修订后的审核分别使用两组参数。
导出期间的HTTP失败已保留。精确历史响应缓存和有限重试仅用于读取。原生执行源码仍为
第11版、216个文件，清单哈希见上文。最终处理工具已通过类型检查；此前完整根检查通过443项测试。

最终恢复和本地核验已通过。16 个移出的公共路径、23 对临时去重文件及 52,411 个依赖文件
均与记录的内容和元数据一致。原 8 GiB 交换文件保持保留且未启用，临时交换文件已移除，
swappiness 已恢复为零；所有原生任务均已关闭。完整扫描针对 143 个私密哨兵值检查了
284 份产物，零发现；最终下载的 285 份文件均已核验哈希。
离线核验再次通过全部 114 组交易比较、两份真实收据解码及两项因果检查。未新增原生交易。

此前一个有运行时限的停机监控进程在下载完成前退出，定时节省停机在原生任务已结束后执行。
同一实例随后重新启动以完成恢复。替换后的监控持续续期，直至任务所有者明确完成，
不再因运行满三小时而退出。原初步检查点及其“恢复待完成”摘要保持原样，
最终证据包另行增加了完成摘要及可视化状态文件。

恢复完成后，包装程序因受 0700 私密目录保护的 12 个诊断日志使用 0644 权限而停止。
这些确切日志已收紧为 0600，内容未变，恢复结果也已独立复核。第 6 版最终导出随后
通过了扫描，但因上级目录缺失（ENOENT）而无法保存。第 7 版补建该目录后，实际扫描及
最终离线核验均通过。此前失败记录均已保留。

下载核验完成后，服务器任务所有者已明确完成。最后一次性节省停机期限为
**2026-10-20 19:19:52（北京时间）**，独立读回确认为 Waiting、StopCharging、
ForceStop=false。此前待执行计时器已取消，自动删除期限为空，实例及磁盘保留，
不再续期。
