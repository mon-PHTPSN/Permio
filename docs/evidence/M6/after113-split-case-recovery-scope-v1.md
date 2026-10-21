# M6 recovery after reservation 113 — approved bounded scope

Status: **APPROVED by the user on 2026-10-20: 172 total attempts and five
application instances.** The fifth instance has not started at this preparation
checkpoint. The authority-only phase is complete at 115 counted attempts,
112 successes and two native negative outcomes. The original planning baseline
and exact remaining 42-call allocation are preserved below.

The closed run has 112 conservatively counted attempts: 110 successful calls,
one verified native rejection, and the old local failure 55. Reservation 51 was
never submitted. The exact indexed bytes of transaction 113 and the complete
current contract state agree. Four application instances and two receipts exist.
The fourth instance's first action preparation is complete; no reservation 114
or authority-test submission exists.

The failure was a harness bug: its three-hour transaction deadline retained
milliseconds, but the ledger serializes time in whole seconds. The correction
rounds down before proof generation; it never extends signed validity or changes
proved or submitted bytes. Three real-ledger regression cases failed before the
fix; all seven focused time-window tests now pass. Source 10 and its failed run
are preserved. The read-only checkpoint recovery used the actual M4/M5 APIs,
verified the original signed action, and rejected a tampered slot nonce.

The remaining multi-case sequence no longer has a safe measured budget inside
the fourth instance's existing signed grant. A main proof previously took about
30 minutes; the combined cases require four such proofs plus staged preparation,
balancing, and confirmations. This is a disposable test-session limitation, not
an Alibaba Cloud transaction limit or a request for a larger server.

## Execution boundary

The authority case on instance four completed with reservations 114–116: its
saved action was proved and positively validated, two authority approvals
finalized, and that once-valid action was submitted once and rejected.
This completed phase used the prior 150-attempt/four-instance approval and is
not repeated. Its public evidence and local verification are preserved.

The approved extension uses **one fifth application instance inside the
same existing contract**, solely for the remaining non-transitioning action,
fresh-outer-identifier nullifier replay, and stale credential-status-root case.
The authority case is not repeated on that instance.

| Reservations | Operations | Maximum calls |
| --- | --- | ---: |
| 117–138 | Allocate instance five; certify account, capability, slot and session | 22 |
| 139–146 | Prepare the winner and status-root control | 8 |
| 147–150 | Winner, independent replay, third-instance capability revocation, stale-status rejection | 4 |
| 151–158 | Retire/revoke both existing templates and deprecate/revoke both existing modules | 8 |
| | Fifth-instance phase | **42** |

Approved ceiling: **172 total counted attempts and five application instances**:
112 already counted + three already-approved authority calls + 42 proposed calls
= 157 planned attempts, plus a 15-attempt reserve. The reserve remains limited to
manually reconciled, conclusive pre-native-send failures of these same operations;
it does not permit new cases, deployments, or further instances. No automatic
native resubmission is permitted. Failed call 55 remains unused.

Use the same test contract
`70c139af18859fc0074f015c8c88bd727dd2a4a63afa85dcc427d98e127bbd8c`
and the same 16 GiB Singapore server. Test DUST only. Preserve the six-hour test
instance lifetime, maximum four-hour grant duration, one-hour future grant start,
three-hour transaction ceiling, contract v10, ordinary-action profile 9, receipt
v1, and every authorization/signature/privacy check. No new contract, server,
RAM grant, public developer port, proof family, or production activation.

Expected completed boundary: 157 counted attempts, 152 successes, four native
negatives, the one old local failure, 158 reservations, 156 public bound
transactions, five instances, three receipts/nullifiers, four pending
preparations, authority sequence 2 and credential-status sequence 14. Receipts
come from reservations 50, 86 and 147; native negatives are 87, 116, 148 and 150.
All downloaded evidence must pass privacy scans, exact-byte verification and
actual receipt decoding. Restore the temporarily moved public files and original
swap state, then leave a verified final two-hour economical-stop deadline.
Independent human security/privacy review remains open.

## 中文翻译

状态：**用户已于2026-10-20批准总计172次尝试、五个应用实例。**
在本准备检查点，第五个实例尚未启动。仅权限根测试阶段已完成，累计115次尝试、
112次成功及两次原生负面结果。下文保留原计划基线和剩余42次调用的确切分配。

已关闭的运行保守计数为 112 次尝试：110 次成功、一次已核验的链上拒绝，
以及此前第 55 项本地失败。第 51 项从未提交。第 113 笔交易的索引原始字节与
本地记录一致，其完整合约状态也与当前状态一致。现有四个应用实例、两份收据。
第四个实例的第一项操作准备已完成；尚无第 114 项预留或权限根测试提交。

此次失败是测试程序错误：三小时交易截止时间保留了毫秒，而账本仅按整秒序列化。
修复在生成证明前向下取整，不延长签名有效期，不修改已证明或已提交的字节。
三项真实账本回归测试在修复前失败，修复后七项时间窗口测试全部通过。
源码第 10 版及其失败记录均已保留。只读恢复使用真实 M4/M5 API，核验原签名操作，
并拒绝篡改槽位 nonce 的检查点。

第四个实例现有签名授权剩余时间，已不足以安全容纳实测的整组测试。
此前一次主证明约需 30 分钟；整组测试需要四次此类证明，另有分阶段准备、
交易配平和确认耗时。这属于一次性测试会话的期限限制，不是阿里云交易数量限制，
也不需要升级服务器。

第四个实例的权限根测试已完成，对应第114–116项：保存的操作已生成证明并通过有效
对照验证，两次权限批准已确认，原本有效的操作仅提交一次并被拒绝。该阶段使用此前
150次、四个实例的授权，不会重复；公开证据及本地核验结果均已保留。

获批扩展仅在现有同一合约内创建第五个应用实例，补做不改变状态的操作、
带独立外层标识的 nullifier 重放，以及过期凭证状态根测试，不重复权限根测试。
第 117–138 项为实例分配及账户、能力、槽位、会话认证，共 22 次；第 139–146 项
准备成功操作与状态根对照，共八次；第 147–150 项执行成功操作、独立重放、
撤销第三实例能力及状态根拒绝，共四次；第 151–158 项退役／撤销两份原模板并
弃用／撤销两个原模块，共八次。第五实例阶段合计最多 42 次。

批准上限为**总计 172 次尝试、五个应用实例**：原基线112次，加已完成的三次权限根
调用，再加提议的 42 次调用，计划共 157 次，另留 15 次严格限定用途的预留。
预留只用于人工核对后明确未发送原生交易的同一操作失败，不允许新增案例、部署或
更多实例。禁止自动重发原生交易；第 55 项继续保持不使用。

继续使用上述同一测试合约和现有新加坡 16 GiB 服务器，仅使用测试 DUST。
保持六小时测试实例期限、最多四小时授权期限、一小时后生效的授权、三小时交易
上限、合约 v10、普通操作配置 9、收据 v1，以及全部权限、签名和隐私检查。
不新增合约、服务器、RAM 权限、公网开发端口、证明家族或生产激活。

预期完成边界为：157 次保守尝试、152 次成功、四次链上拒绝、一次此前本地失败、
158 项预留、156 份公开配平交易、五个实例、三份收据及 nullifier、四项待处理准备，
权限根序号 2、凭证状态根序号 14。收据来自第 50、86、147 项，链上拒绝为第 87、
116、148、150 项。下载证据必须通过隐私扫描、精确字节核验及真实收据解码；
恢复临时移出的公开文件和原交换空间状态，最后保留经核验的两小时节省停机期限。
独立人工安全／隐私审核继续保持开放。
