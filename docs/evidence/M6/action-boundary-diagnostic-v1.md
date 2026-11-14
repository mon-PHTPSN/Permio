# M6 ledger-bound action diagnostic — 2026-10-17

This is a feasibility and recovery record. M6 remains incomplete. It adds no
production action entry, deployment, transaction, nullifier or DecisionReceipt.
The preceding explicitly approved 25-transaction Preprod sequence remains a
separate completed governance/account/slot result.

## Exact scope

`scripts/diagnose-m6-action-boundary.mjs` snapshots the current eleven-circuit
v8 source into an ignored, isolated directory and appends
`test/fixtures/compiler-bounds/ledger-bound-action.compact`. The production
Compact source, generated bindings, compiler metadata and key manifest are
hashed before and after. The resulting diagnostic has twelve proof entries;
none is deployed. Compiler/runtime pins remain 0.31.1/0.16.0.

The diagnostic checks the actual simulated ledger's allocation/deployment,
private state commitment/sequence/watermark, namespace root sequences, active
template/module and authenticated policy binding, current status root, complete
depth-16 capability ancestry, both signatures, both seven-dimensional scopes,
and proof-window deadlines. It returns constant true and preserves the entire
encoded ledger state. Fixtures seed synthetic genesis records; they do not
prove real M4 review, issuance or chain acceptance.

The active-only module/template checks are a diagnostic baseline, not a new
product deprecation/compatibility policy. Slot provenance, selected-record
evidence, issuer-policy revalidation, state transitions, nullifiers, common
receipts, privacy acceptance and ordinary-action chain verification remain
excluded. The existing approved staged slot design remains authoritative.

## Preserved compiler and harness outcomes

- `logs/m6-action-boundary-WjCHBu/`: original privacy-analysis failure; split
  network/self assertions correct the diagnostic without disclosing an extra
  allocation payload.
- `logs/m6-action-boundary-Hy1bki/`: compiler succeeded, but the harness wrongly
  expected binary ZKIR after `--skip-zk`; its missing final report and failure
  note are retained.
- `logs/m6-action-boundary-5POgvw/report.json`: fresh successful baseline compile,
  14.118 seconds, 6,382,487-byte text ZKIR, SHA-256
  `b11d57ae5b1f5c901f5df1b1bdf5390634e68b1cda9019c36f35085ad35f06f4`.
- `generated-tests-1792219475474.json` in that directory: seventeen passing
  generated-code cases, including full 35-leaf ancestry and a freshly proved
  revoked root ancestor. Original fixture/harness setup failures are retained.

The verifier was subsequently extended with exact missing-session-status and
terminal-account-substitution negatives. Later results identify their own
case list; the earlier seventeen-case result is not relabeled.

## Real key-generation experiments

All jobs use the exact authorized Singapore instance, pinned zkir 2.1.0,
one Rayon worker and a two-core quota. V1–V4 use no swap and a twelve-GiB
hard memory cap; the subsequent separate profiles are described below.
They load only public diagnostic programs, never wallets or private witnesses.
These are build measurements, not transaction-proving latency or qualification
of the five-GiB product target. Final outcomes and hashes are recorded in
`action-boundary-diagnostic-v1-verification.json` when the experiments close.

1. V1 reached `k=22`, 2,281,576 rows, then failed because its systemd child had
   no HOME/XDG_CACHE_HOME/MIDNIGHT_PP. No usable keys were generated. The exact
   report, compiler log, resource samples and controller are downloaded and
   byte-hash verified in `logs/m6-action-keygen-ecs-v1/`.
2. V2 supplied the existing root cache explicitly. The official k22 public
   parameter download completed and independently matched the pinned source's
   SHA-256. Its ten-GiB soft limit caused measured reclaim throttling: compiler
   threads waited in `__mem_cgroup_handle_over_high`, memory pressure exceeded
   eighty percent and CPU work largely stopped. No OOM was observed. The owned
   job was deliberately ended. Its controller then tried to stop the already
   unloaded transient unit again and failed before writing its final report.
   That report is explicitly missing; original logs, counters, external-stop
   observation and controller traceback are preserved and downloaded in
   `logs/m6-action-keygen-ecs-v2/`. No successful report was reconstructed.
3. V3 keeps the same hard cap and sets the soft cap to twelve GiB. Cleanup first
   checks whether the owned PID has already ended. It uses the same program,
   cached public parameter and other limits; it is a distinct resource profile.
   It ends with a real cgroup OOM kill: peak 12,884,901,888 bytes, one OOM and
   one OOM-kill counter, exit signal 9, empty key files. The counter is observed
   at 1199.638 seconds, before the twenty-minute watchdog; no bounded-duration
   stop reason is set. Full closure takes 1202.662 seconds. Its original
   report/logs/counters are downloaded and byte-hash verified in
   `logs/m6-action-keygen-ecs-v3/`. This does not prove every equivalent
   representation or Midnight itself infeasible.
4. V4 builds only the combined equivalent-factoring candidate, after the
   baseline's controller and compiler have both ended. Memory, CPU and swap
   caps stay the same. Before launch its diagnostic time allowance changes
   from twenty to sixty minutes, with the original unstarted controller
   retained as `controller-planned-1200s.py`. The amendment and source hashes
   are in `logs/m6-action-candidate-time-budget-v4.json`. This is not a change
   to a product acceptance gate or a funded-transaction limit.
   It also ends with an actual twelve-GiB cgroup OOM kill after 886.918
   seconds, well before its one-hour time allowance. Both key files are empty.
   Nine original public files, including its binary program, parameter-hash
   verification, original controller and time-budget amendment, are downloaded
   through the official Workbench file path and byte-hash verified in
   `logs/m6-action-keygen-ecs-v4/`.
5. V5 keeps the exact combined program, pinned tools, single worker and two-core
   quota, but is a separate fourteen-GiB RAM / two-GiB paging build experiment
   on the existing sixteen-GiB server. It uses no instance resize or new disk.
   A fresh owned root and file-only paging path are checked before use; global
   VM settings stay unchanged. Memory/disk reserves stop only the owned job.
   Cleanup must stop the job, disable that exact paging file and remove it,
   preserving any unrelated resources and the original failure evidence.
   Success in this profile would not qualify the five-GiB product target.
   It ends with OOM after 886.935 seconds and empty keys. The kernel's exact
   owned-PID message confirms `CONSTRAINT_MEMCG`; the last sampled cgroup
   counters missed the terminal OOM event. Host swappiness remains zero and
   actual sampled swap use is zero. Its paging file is disabled/removed and
   seven public files are downloaded and hash-verified. This run therefore
   does not establish a successful paging-enabled build.
6. V6 uses a thirteen-and-a-half-GiB soft limit, fourteen-GiB hard limit and a
   three-GiB owned paging file within the existing disk. A private checkpoint
   records the original swappiness before temporarily setting it to sixty.
   Before the main job, a constrained 384-MiB allocation under a 256-MiB RAM
   cap must demonstrate actual swap use. It passes with 268,431,360 bytes of
   swap use. Cleanup must stop the owned probe/job, remove the exact paging
   file and restore the original setting. This changes build resources, not
   the circuit, authority model, witness schema or product acceptance target.
   It ends with OOM after 993.098 seconds and empty keys, after sampled swap
   use reaches essentially the full three GiB. The probe and job end, paging
   is disabled/removed, swappiness is restored to zero, and all nine public
   result files are downloaded and byte-hash verified.
7. V7 is the final existing-server profile: same program, fourteen-GiB hard
   RAM, thirteen-and-a-half-GiB soft limit and four-and-a-half-GiB owned paging.
   The unused 805,306,756-byte public k22 parameter is first downloaded and
   SHA-256 verified locally, then temporarily removed to preserve the unchanged
   one-GiB disk reserve. The effective-paging probe passes again. The job ends
   with `Result=oom-kill`, signal 9 and empty keys, observed by 1007.992 seconds.
   Sampled RAM peak is 15,031,447,552 bytes and swap 4,831,682,560 bytes. The
   final sampling misses terminal OOM counters; the explicit unit outcome,
   rather than zero sampled counters, establishes the kill. Complete cleanup
   and cache restoration take 1080.206 seconds including the failed build.
   Public cache bytes/hash, mode and owner are independently checked; paging
   is disabled/removed and original swappiness zero restored. All twelve public
   result files are downloaded and hash-verified in `logs/m6-action-keygen-ecs-v7/`.
   No instance resize, new paid resource or RAM grant is applied.

The first stop helper itself had a locally reproduced quoting error and made
no remote change. Its correction validates the generated Python before use.
Workbench OSS uploads timed out; only public program/controller bytes used
the existing authenticated private exec channel as a fallback, with per-part
and final hashes and no overwrite of differing files.
The official Workbench download subsequently succeeds for the 950,213-byte
baseline binary program, SHA-256
`7d3aa3daacd045d1c06007373a8eca90d050d66dbf7ef72a42ce892370bd9b96`.
Independent remote metadata matches that hash for V1, V2 and V3. An attempted
large inline-result download fails; this does not prevent the supported file
download path. Original small-output records remain available.

## Isolated equivalent factoring candidates

`--factor-status-stack` moves selections before common stack hashes. When both
children come from the stack, opening is H(H(tail,left),right); with one stack
child it is H(tail,child). Every merge, canonical-padding, adjacency, stack-tail,
leaf-transcript and root assertion remains. Neither hash domains nor witness
schema changes. A no-stack merge still fails its original assertion.

`--factor-action-checks` additionally checks the session status once after the
ancestry loop. The existing count bounds guarantee exactly one terminal entry;
the loop still proves its account commitment equals the session subject. That
proven subject supplies the same status-leaf revocation authority formerly
read from the terminal array entry. All seventeen capability/account checks,
terminal equality and current-root checks remain. This changes calculation
placement, not who is trusted or what an active ancestor means.

Both candidates compile in isolated snapshots. Stack-only text ZKIR is
5,984,476 bytes (`logs/m6-action-boundary-WOssko/`); combined text ZKIR is
5,736,653 bytes (`logs/m6-action-boundary-xFPDIN/`). Text size alone establishes
neither constraint reduction nor lower proving memory. Generated-code and
real-key results must be read separately. Neither candidate is adopted in
production source or keys by this diagnostic.

The real combined-candidate compiler reports **k21, 1,713,336 rows**, down
568,240 rows (24.906%) from the original k22, 2,281,576 rows. This is an actual
constraint-model comparison, not an estimate from text size. Real-key completion
and measured build memory remain separate checks.

The stack-only generated contract passes seventeen cases in
`logs/m6-action-boundary-WOssko/generated-tests-1792220607722.json`. The combined
candidate passes nineteen cases in
`logs/m6-action-boundary-xFPDIN/generated-tests-1792220607923.json`, including
the two additional session negatives. Ten direct production/candidate status
checks pass in `status-factoring-tests-1792220755935.json` in the same directory:
one, seventeen and thirty-five scattered leaves yield identical roots; altered
stack tails, no-required-child merges, side-node positions, padding,
instructions, root sequences and leaf substitution are rejected by both.

The final expanded verifier passes twenty-four cases against each of the
baseline and combined programs, in `generated-tests-1792226506319.json` and
`generated-tests-1792226519978.json` respectively. It adds depth-16 / 35-leaf
root-account, middle-capability, terminal-account and session revocations,
each using a newly built proof against the current revoked root, plus a
maximum-chain terminal-account substitution. Both results record the exact
verifier script hash. Earlier seventeen/nineteen-case records are preserved.

## Approved local Docker recovery

The human approved `docker desktop restart --timeout 120`. Stop initially
timed out; subsequent reads confirmed Desktop and both WSL distributions had
stopped. `docker desktop start --timeout 120` then succeeded. Only the three
verified existing M6 containers were explicitly started; none was recreated.
All became healthy, with their original IDs/images and loopback bindings.
Envio services restarted through their existing policies; no separate Envio
mutation or policy change was performed. No factory reset, deletion, runtime
directory move, explicit WSL shutdown or forced process kill occurred.

A fresh wallet-free read verifies the historical Local Dev v8 contract
`29ffc721016f4811efd8ad35e3ad7c33c005840827bfdfa6d8a4674f65653a51` still
has its exact allocation, original private-state commitment/sequence zero,
authority version/sequence 2/2 and final revoked module/template state.
See `logs/m6-action-local-docker-recovery-verification-v1.json`.
This proves those historical fixture assertions survived this Desktop outage;
it is not ordinary-action restart, in-flight recovery, selective indexer outage
or replay acceptance.

## Remaining decision boundary

The current profiles produce no usable keys for this diagnostic. This is a
measured build-capacity blocker, not proof of a minimum server size or an
impossible architecture. Further work must preserve depth, current-root and
private-witness semantics. A possible same-family build configuration is
`ecs.g9i.2xlarge` (8 vCPU / 32 GiB), verified by the official type read; its
compatibility and actual price remain unverified because `ecs:DescribePrice`
and `ecs:DescribeResourcesModification` return `Forbidden.RAM`. No grant is
expanded to bypass that denial. The minimal proposed read-only policy stays
outside the repository at workspace `.tmp/m6-build-capacity-read-policy.json`.
It does not authorize resizing or any new deployment/transaction. Price uses
`Resource: "*"` because its official API has no instance-level authorization;
the compatibility read is scoped to the exact instance. A larger build does
not itself qualify the five-GiB product target or ordinary-action proving.

An independent final audit confirms every owned unit ended, no swap remains,
the original VM setting/public cache is restored, and no running container or
public application listener remains. Necessary outputs are local and verified.
The lifecycle closeout in the companion JSON records the actual final two-hour
graceful economical-stop timer. M6 remains open; production code/keys are
unchanged and this continuation submits zero transactions.

## 中文翻译

本记录是 2026-10-17 的 M6 账本绑定动作可行性和恢复诊断，不是 M6 验收。此前获批的
25 笔 Preprod 治理、账户和槽位交易仍是独立的已完成结果。本轮不增加生产动作入口、
部署、交易、nullifier 或通用收据。运行器把当前十一电路 v8 源码复制到忽略的独立目录，
追加只返回 true、保持整个编码账本状态不变的诊断入口，并核对生产源码、绑定、编译元数据
和密钥清单没有变化。固定编译器／运行时仍为 0.31.1／0.16.0。

诊断核对模拟账本中的精确分配与部署、私有状态承诺／序号／水位、当前权限和凭证根、活动
模板／模块与已认证配置、完整深度 16 能力祖先链、两个签名、两组七维范围和证明时限。
合成创世记录不能当作真实 M4 审核、凭证签发或链上验收。槽位来源、指定记录证据、签发者
策略复核、状态转换、nullifier、通用收据、隐私和普通动作链上验收仍未完成；只允许活动
模板／模块是诊断基线，不是新的产品退役兼容政策。

原隐私分析失败、错误预期 skip-zk 产生二进制文件而缺失的报告，以及模拟器材料配置失败
均已保留。新基线编译成功，文本程序为 6,382,487 字节；上述独立记录证明十七项生成代码
检查通过，包括 35 叶完整祖先和重新生成当前成员证明后的根祖先撤销。后续新增会话状态
缺失与末端账户替换负例，不能把旧十七项结果改称新增检查已经通过。

真实密钥构建只上传公开程序，在指定新加坡实例运行，固定 zkir 2.1.0、一个 Rayon
工作线程和两核配额。V1 至 V4 为零交换空间、十二 GiB 硬上限，后续配置单独记录。
V1 得到 k22、2,281,576 行后
因子进程缺少缓存环境失败；V2 下载并独立核验官方公共参数后，被十 GiB 软限制持续回收
节流，没有观察到 OOM。主动结束自有作业后，控制器再次停止已卸载的临时单元，导致
最终报告未写出；明确保留该缺失事实、原始日志、计数器、停止观察和异常记录，不补造
成功报告。V3 保持十二 GiB 硬限制，将软限制也设为十二 GiB，并修正已停止作业的清理。
V3 实际在二十分钟时限到达前发生 OOM：峰值精确达到十二 GiB，OOM 和 OOM-kill
各一次，信号 9，两份密钥为空；1199.638 秒时已观察到该计数，完整收尾为 1202.662 秒，
未记录超时时限停止原因。原报告、日志和计数已下载核对。这不能证明所有等价表示或
Midnight 整体不可行。V4 在旧作业结束后构建组合优化候选，内存／CPU／交换上限不变，
启动前将诊断时间预算从二十分钟改为六十分钟，并保留原未运行控制器和修订哈希；
这不是修改产品验收条件或测试交易额度。
V4 也在远早于一小时预算的 886.918 秒处发生十二 GiB cgroup OOM，两份密钥为空。
包括二进制程序、公共参数哈希核验、原控制器和时间修订在内的九个公开文件，均已通过
官方 Workbench 下载并核对字节哈希。V5 是单独的十四 GiB 内存／二 GiB 交换构建
实验，仍使用相同程序、固定工具、单线程和两核配额，只使用现有十六 GiB 实例与磁盘。
临时交换文件位于新自有目录，创建前核对路径，不改全局 VM 设置；保留内存／磁盘阈值，
结束后必须停用并移除准确的自有交换文件，保留无关资源和历史失败。即便成功，也不能
认定五 GiB 产品目标合格。
V5 于 886.935 秒 OOM、密钥为空；准确 PID 的内核日志确认 CONSTRAINT_MEMCG，
最后一次三秒采样未捕获终止时的 cgroup OOM 计数。主机交换倾向为零，实测交换用量
也为零；交换文件已停用／删除，七个公开文件已下载核验。因此它不能证明启用有效
交换后的构建结果。V6 保持同一程序，在现有磁盘中使用三 GiB 自有交换文件，软内存
限制为十三点五 GiB、硬限制十四 GiB；先保存原主机设置，再临时设交换倾向为六十。
正式构建前，384 MiB 分配／256 MiB 内存上限的探针必须实际使用交换；它已通过，
交换用量为 268,431,360 字节。结束必须停止自有探针／作业、删除准确的交换文件并
恢复原设置；不改变电路、权限模型、材料格式或产品验收目标。
V6 在实际交换用量接近三 GiB 全额后，于 993.098 秒 OOM，两份密钥为空。探针和作业
均已结束，交换文件已停用并移除，交换倾向恢复为零，九个公开结果文件已下载并核对哈希。
V7 是现有服务器上的最后配置：相同程序、十四 GiB 硬内存、十三点五 GiB 软限制和
四点五 GiB 自有交换空间。先把未使用的 805,306,756 字节公共 k22 参数下载并核对哈希，
再临时移出，保留原一 GiB 磁盘阈值；有效换页探针再次通过。到 1007.992 秒已观察到
明确的 oom-kill／信号 9，两份密钥为空；内存采样峰值 15,031,447,552 字节，交换峰值
4,831,682,560 字节。采样未捕获终止瞬间的 OOM 计数，不能把零采样计数解释为未 OOM；
准确单元终局确认了终止。包含失败构建及缓存恢复的完整收尾为 1080.206 秒。公共缓存
的字节、哈希、权限和属主已独立复核；交换文件停用／移除，原交换倾向零恢复，十二个
公开结果文件已下载核对哈希。未变配实例、新增付费资源或扩张 RAM 权限。
具体终局和哈希见配套核验 JSON。构建内存不是交易证明耗时，也不证明五 GiB 产品目标合格。

停止辅助脚本最初的引号错误已在本地复现，没有造成远程变更；修正后先检查生成代码语法。
OSS 上传超时后的私有 exec 备用传输仅包含公开程序／控制器，逐块及最终核对哈希，没有
传输凭据、私有指令或覆盖不同内容的文件。
官方 Workbench 文件下载随后成功取回 950,213 字节的基线二进制程序，其哈希与三次
基线尝试的独立远程元数据一致。一次较大内联结果下载失败，不影响受支持的文件下载；
原小体积结果已保留。

两个独立优化候选分别合并条件分支中的共同栈哈希，以及在证明末端账户一致后，将会话
当前状态检查移出十七项循环、只执行一次。哈希域、材料格式、合并／排序／填充／栈尾／
叶序列／根断言及全部能力和账户祖先检查均保留，没有改变信任对象或活动祖先含义。
两个候选编译通过，文本程序分别缩小到 5,984,476 和 5,736,653 字节；单凭文本大小不能
认定约束数或证明内存下降。生成代码与真实密钥结果单独记录，生产源码和密钥未采用候选。
组合候选的真实编译器随后给出 k21、1,713,336 行，相比原 k22、2,281,576 行减少
568,240 行（约 24.9%）。这是实际约束模型对比，不是由文本大小推算；密钥完成和
实测构建内存仍需单独核验。
栈优化候选通过十七项生成代码检查，组合候选通过包含两项新增会话负例的十九项检查。
另有十项生产／候选直接对比通过：一、十七和三十五个分散叶得到相同根，双方都拒绝
被改动的栈尾、没有必需子节点的合并、旁支位置、填充、指令、根序号和叶替换。
最终扩展验证器对基线和组合候选各通过二十四项，分别保存于上述新结果文件，并记录
验证器脚本哈希。新增深度 16／35 叶链上的根账户、中间能力、末端账户、会话撤销，
每项都重新生成针对当前已撤销状态根的证明；另检查最大链的末端账户替换。此前的
十七项／十九项原始结果保持不变。

用户已批准 Docker Desktop 重启。初次停止超时，随后确认 Desktop 和两个 WSL 发行版
已停止，再启动成功。只明确启动原有三个 M6 容器，原 ID、镜像和回环端口保持，健康
检查通过；Envio 按原策略重启，没有单独修改其服务或策略。没有重建容器、删除卷、
恢复出厂、移动运行目录、明确关闭全部 WSL 或强杀进程。无钱包读取确认上述历史本地
合约仍保留精确分配、原状态承诺与序号零、权限根 2／2 及最终模块／模板撤销状态。
这只证明这些历史材料断言经本次 Desktop 故障后仍成立，不代替普通动作重启、在途恢复、
定向索引器故障或重放验收。

当前配置没有为该诊断生成可用密钥，这是实测构建容量阻塞，不代表已确定最低服务器
规格或架构不可行。后续必须保留深度、当前根及私有材料语义。官方规格查询确认同系列
ecs.g9i.2xlarge 为八 vCPU／32 GiB，但兼容性与实际价格尚未核验：DescribePrice 和
DescribeResourcesModification 均返回 Forbidden.RAM，未扩权绕过。拟议最小只读策略
保存在仓库外的工作区上述文件；它不授权变配、新部署或新交易。官方价格 API 不支持
实例级授权，因此仅价格读取使用 Resource:*；兼容性读取限定准确实例。更大构建机
本身也不能证明五 GiB 产品目标或普通动作证明合格。

独立最终核验确认所有自有单元结束、交换空间为空、原主机设置和公共缓存恢复，无运行
容器或公网应用监听。必需输出已下载核对，配套 JSON 记录实际最后两小时正常节省停机
任务。M6 仍未完成；本轮生产代码／密钥未变，提交交易为零。
