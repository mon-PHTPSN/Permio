# M6 disk and reusable paging audit — 2026-10-17

The user rejected a 32-GiB upgrade and requested a disk audit. This follow-up
keeps the existing instance and RAM budget, preserves all earlier failure
records, and changes no production code, key manifest or acceptance gate.

The audit found an operational oversight: `/var/lib/permio-m6/swapfile` already
occupies eight GiB of disk, but is inactive. The recent action-key trials
created additional swap files instead of first checking this retained file.
That needlessly constrained their new paging allocation to four-and-a-half
GiB. Their recorded OOM failures remain valid for their exact profiles; they
do not establish that the earlier eight-GiB paging strategy was exhausted.

| Storage | Observed amount |
| --- | ---: |
| Root filesystem | 24.25 GiB |
| Available space, excluding reserved blocks | 5.78 GiB |
| Existing inactive swap file, already allocated | 8.00 GiB |
| `/opt`, including historical tools and test builds | 4.75 GiB |
| Main public parameter cache | 1.31 GiB |
| Three pairs of byte-identical public files | 0.79 GiB per one copy of each pair |
| Preserved public-cache archive | 0.40 GiB |

The duplicate and archive figures are cleanup candidates, not reclaimed space.
No source, key or evidence files were deleted, hard-linked, moved or overwritten.
The swap file was not reformatted; the probe performs normal paging writes. No
Docker prune, filesystem-reserve reduction, RAM grant or resource resize was
performed. The immediate route needs no cleanup: reuse the eight-GiB swap
file that is already allocated, leaving the approximately 5.78 GiB available
for output and safety reserves.

## Verification

The file is root-owned, mode 0600, a regular file with one link and a valid
Linux swap header. Its logical pages have continuous allocation with no holes.
The filesystem is ext4. `filefrag` reports 57 physical extents but displays
58 rows because allocation flags split a contiguous range. Unwritten ranges
were recorded, not treated as evidence of kernel acceptance.

A bounded readiness test then enables only this exact file, verifies the
kernel accepts essentially eight GiB, and runs one synthetic 384-MiB allocation
under a 256-MiB RAM / 512-MiB swap limit. The probe actually uses
268,431,360 bytes of swap and ends normally. The file is then disabled again;
original swappiness zero, inactive swap state, and file size/inode/owner/mode
are restored or preserved. There is no persistent `fstab` or sysctl change,
new swap allocation, wallet, deployment or transaction.

The solution is verified at the swap-readiness level. No full action-key build
was rerun in this disk-inspection task, and no ordinary-action proof or
end-user RAM/latency qualification follows from the small probe. The existing
product resource gate remains in force; using a complete machine's RAM is
not adopted as an end-user requirement. A follow-up build can reuse this
file while separately enforcing its RAM cap, single-worker configuration,
output/free-disk reserves, bounded duration and original-setting restoration.
Further circuit or authority changes still require their normal review.

## Evidence and retained diagnostic failures

- `logs/m6-disk-audit-v1.json`: filesystem, directory, public-file and swap metadata.
- `logs/m6-reusable-swap-verification-v1.json`: file layout and duplicate hashes.
- `logs/m6-existing-swap-probe-v1.json`: actual paging and restoration checks.
- `disk-paging-audit-v1-verification.json`: final hashes and real lifecycle closeout.

Two initial read-only verification attempts stopped at an overly strict
57-row assertion; the physical-extent count differs from displayed rows.
One initial probe helper failed local syntax validation before remote
execution. The parsing/quoting assumptions were corrected; no destructive
repair was used. The final metadata check and readiness probe pass.

## 中文翻译

用户明确拒绝升级至 32 GiB，并要求先检查磁盘。本次保持现有实例和内存预算，保留
此前失败原始记录，不改生产代码、密钥清单或验收门槛。

检查发现一个操作疏漏：上述路径的八 GiB 交换文件一直占用磁盘，但未启用。近期动作
密钥试验另外创建交换文件，没有先核查这份保留文件，导致新分配的换页空间无谓地受限
于四点五 GiB。旧 OOM 对其准确配置仍然成立，但不能据此认为此前八 GiB 换页方案
已经用尽。

根文件系统约 24.25 GiB；扣除保留块后的可用空间约 5.78 GiB；现有闲置交换文件已
占用八 GiB。历史工具和构建所在的 /opt 约 4.75 GiB；主公共参数缓存约 1.31 GiB。
三组已核验字节相同的公开文件，各保留一份可作为约 0.79 GiB 的清理候选；另有约
0.40 GiB 的公共缓存归档。这些只是候选，没有实际释放空间。没有删除、硬链接、
移动或覆盖源码／密钥／证据文件；交换文件未格式化，探针产生正常换页写入。
没有清理 Docker、降低文件系统保留空间、扩 RAM 权限或
变配。直接复用已经分配的八 GiB 交换文件即可，仍留约 5.78 GiB 给输出和安全余量。

该文件是 root 所有、权限 0600、单链接的普通文件，交换文件头有效，逻辑页分配连续
且无空洞，文件系统为 ext4。filefrag 的物理连续区统计为 57，但因分配标记拆分显示
58 行；未写入区域标记已如实记录，没有仅凭元数据宣称内核能够使用。

随后的小型受限测试仅启用准确的现有文件，确认内核接受接近八 GiB 容量；在内存
256 MiB、交换空间 512 MiB 的限制下，分配 384 MiB 合成数据，实际使用
268,431,360 字节交换空间并正常结束。之后再次停用，恢复原交换倾向零和未启用状态，
保留文件大小、inode、属主和权限。没有持久 fstab／sysctl 修改、额外交换文件、
钱包、部署或交易。

因此已验证这条方案的交换空间可用性。本次磁盘检查没有重跑完整动作密钥构建，小型
探针也不证明普通动作或最终用户内存／时延合格。产品资源门槛保留，不把占用整台机器
内存当作最终用户要求。后续构建可复用此文件，同时单独执行 RAM 上限、单工作线程、
输出／磁盘保留、时限及原设置恢复；电路或权限架构变更仍须正常评审。

原始文件布局检查两次因把 57 个物理连续区等同于显示行数而停止；第一次探针辅助脚本
在本地语法校验失败，尚未远程执行。解析／引号假设已修正，没有破坏性修复，最终布局
检查和实际换页探针均通过。证据及最终生命周期记录见上述文件。
