# Bounded real-key build for the current M6 profile

Date: 2026-10-14. This is an opt-in operational build profile, not a change
to Compact, cryptography, authority, privacy or milestone acceptance.

## Why it is being used

The separate low-memory session completed one real k20/818608 slot key pair
in 1153.098 monotonic seconds (19.22 minutes), including setup and cleanup.
Actual cgroup memory peaked at 5368971264 bytes (about 5.00 GiB); swap peaked
at 5156528128 bytes (4.80 GiB), with zero OOM events. These peaks are separate;
the report also records simultaneous samples. This establishes a finite build
under a paging profile, not a 5 GiB total-memory requirement or ordinary-user
proof latency. The experiment's exact report and both key hashes were checked
independently before adapting its controls here.

The active v8 worktree had no keys directory. Its slot ZKIR is byte-identical
to the experiment, but its credential ZKIR and generated bindings differ.
Consequently one exact slot pair may be reused; the other ten pairs still
require real generation and a new complete current-build manifest.

## Exact execution and safety boundaries

Run in the configured Ubuntu WSL environment, from the M6 delivery worktree:

```bash
npm run compile:compact:bounded -- --run \
  --reuse-slot=../Permio-m6-low-memory-experiment/logs/m6-low-memory-mTVaHY
```

The reuse directory above identifies the actual recorded experiment. Another
directory is accepted only inside the same sibling experiment logs, with a
successful pinned real-build report, exact program/compiler/public-parameter
fingerprints and exact nonempty key sizes/hashes. The old SDK tag is not used
as proof of compatibility; the exact slot program is. Reuse copies only public
proving/verifying artifacts into ignored generated assets, not signing keys,
wallet state, witnesses, private instructions or experiment source files.

The runner regenerates public bindings with Compact 0.31.1 --skip-zk, then
fingerprints all current proof programs, generated JS/info and Compact sources.
Key generation is real, never mock. The changed credential circuit is first,
then the remaining circuits are built serially. Eleven pairs must complete and
all fingerprints must remain unchanged before the inventory is installed.

Each owned systemd unit enforces memory.high=5 GiB, memory.max=6 GiB and
memory.swap.max=8 GiB, CPUQuota=100%, TasksMax=64, one Rayon thread and one
Tokio worker. Applied limits and ancestor ceilings are checked before the
compiler receives permission to start. The unit explicitly receives the
existing public-parameter cache location; parameters are not replaced.

Only `/var/tmp/permio-m6-bounded-key-build/paging.swap` may be created, on
validated native ext4, under a root-owned 0700 directory with 0600 file mode.
Exclusive creation preserves stale resources rather than taking them over.
Its extra 6 GiB combines with the existing 2 GiB swap; no `.wslconfig`, Docker
memory allowance, service image or global restart is changed. Existing shared
containers remain running. The runner does not overwrite existing keys or a
manifest. Partial successful pairs remain in ignored logs if the batch fails.

The whole batch has a 3600-second controller budget. A measured k above 20
stops that owned compiler as a local guard, not a protocol rejection. Shared
available memory below 384 MiB, an OOM kill, or simultaneous low available
memory/swap triggers a stop. Numeric resource observations are not algorithmic
progress. No automatic RAM increase, additional job, global process kill or
architecture workaround follows a failure.

Cleanup stops only the exact owned unit before swap removal. Swap is disabled
and unlinked only with safe headroom and verified inactivity. Failed/unsafe
cleanup retains the file and reports it; a file not created by this run is
never cleaned automatically. Lock/resource takeover requires explicit review.

## Readiness and verification

The complete manifest uses mode `real-bounded-keys`; the asset guard accepts
it alongside the historical `real-sequential-keys` mode. Both modes require
the exact compiler/runtime, generated bindings, complete unique circuit list,
current program hashes, key lengths and key hashes. Unknown/mock modes remain
rejected. This is local artifact integrity, not governance trust or proof
verification; actual deployment/transactions still have to pass.

Six policy tests cover opt-in controls, numeric parsing, applied/ancestor
limits, normal paging versus emergency stops, exact reuse fingerprints and
failed/mock/legacy/malformed reports. The existing asset test checks the new
mode and rejects unverified modes. Policy tests and syntax/typecheck pass
before the real attempt. The first typecheck exposed a missing declaration
for the JavaScript policy module; a matching .d.mts declaration fixed it
without relaxing strict TypeScript configuration.

Actual build results and later node attempts are recorded separately in
`bounded-key-build-verification.json` and `development-log.md`. A successful
build removes the missing-assets blocker only; ordinary actions, common
receipts, complete privacy, recovery and M6 acceptance remain open.

Later SDK correction (2026-10-15): v1's text-program/key checks omitted the
SDK's required `.bzkir`. The reused slot pair skipped the compiler invocation
that normally writes that public binary beside its text IR. The binary from
the same successful exact-program/compiler experiment is now copied with
exclusive creation and recorded hashes; no keys are regenerated or mocked.
Both real builders now write manifest v2 with binary size/hash for every entry,
and the guard rejects legacy, absent and altered binary inventories before
wallet startup. The original successful key-build report is preserved, not
retrospectively asserted to have checked complete SDK readiness. Detailed
runtime result, recoverable original manifest and corrected inventory are in
`capped-runtime-verification.json`.

---

# 中文翻译

本项日期为 2026-10-14，是显式启用的运维构建配置，不改变 Compact、密码、权限、
隐私或 milestone 验收。独立实验真实完成 k20／818608 槽位密钥，单调计时共
1153.098 秒（19.22 分钟），含设置／清理；cgroup 内存峰值约 5.00 GiB，swap
峰值 4.80 GiB，无 OOM，另有同时采样，不把独立峰值相加。这证明有限时间的换页
构建，不是总内存只需 5 GiB 或普通用户证明耗时。复用前独立核验实际报告和密钥哈希。

v8 工作树没有 keys 目录；槽位程序与实验逐字节一致，但凭证程序及生成绑定不同。
只复用精确槽位对，其余十组真实生成，再形成完整当前清单。上方命令须在配置的
Ubuntu WSL／M6 工作树执行。复用路径只能在独立实验 logs 中，验证成功的固定版本
真实报告、程序／编译器／公开参数指纹、非空密钥长度及哈希；不依据旧 SDK tag 推断
兼容性。只复制公开证明／验证资产进忽略目录，不复制签名密钥、钱包、witness、
私有指令或实验源码。先固定 --skip-zk 重新生成绑定，固定全部程序／JS／info／
Compact 源码指纹；凭证电路优先，其余串行，十一组和全部指纹都成功才安装清单。

每个自有 systemd 单元实际限制 5 GiB 软阈值、6 GiB 硬上限、8 GiB swap、单 CPU
配额、64 tasks、一个 Rayon／Tokio worker，启动编译器前核验实际限制及上级上限。
显式传入已有公开参数缓存，不替换参数。只能在验证的 native ext4、root 0700 目录
创建精确 paging.swap（0600），独占创建，不接管旧资源；额外 6 GiB 加原 2 GiB，
不改 .wslconfig、Docker 内存、镜像，不全局重启，共享容器保留，不覆盖已有密钥／
manifest。失败保留部分成功资产于忽略 logs。

整个批次控制预算 3600 秒；测得 k>20 属本地保护、非协议拒绝。可用内存低于
384 MiB、OOM kill、或内存／swap 同时不足时停止自有任务，不把资源活动当算法
进度，不自动加 RAM、并发、全局杀进程或替换架构。清理先停精确自有单元，仅在
安全余量及 swap 已停用核验后删除自己创建的文件；不安全／失败则保留，不清理
非本次创建的旧文件，旧锁／资源需明确审查。

新清单模式 real-bounded-keys 与历史 real-sequential-keys 都要求固定版本、精确
生成绑定、完整唯一电路、程序及密钥哈希／长度；未知或 mock 模式拒绝。这只是本地
资产完整性，不授予治理信任、不替代部署／交易验证。六项策略测试覆盖启用、计数、
实际／上级限制、正常换页／紧急停止、复用指纹及失败／mock／旧版／畸形报告，
已有资产测试覆盖新模式／拒绝未知模式。首次类型检查发现 .mjs 缺声明，添加 .d.mts，
不放松严格配置。实际构建和链结果另存 JSON／日志；构建成功仅解除缺资产阻碍，
普通动作、通用收据、完整隐私／恢复及 M6 验收仍待完成。

2026-10-15 后续 SDK 修正：原 v1 只查文本程序和密钥，漏掉 SDK 必需的 .bzkir。
槽位复用跳过了正常生成此二进制的编译调用；现从成功的同程序／同编译器实验独占
复制公开二进制并记录哈希，没有重新生成或 mock 密钥。两个真实构建路径现写清单
v2，每项含二进制长度／哈希；钱包前拒绝旧版／缺失／篡改。原成功密钥报告保留，
不事后冒称曾检查完整 SDK 就绪；运行结果、可恢复旧清单及新清单见独立运行证据。
