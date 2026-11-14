# Historical membership paging diagnostic v1

This is an isolated retry of the historical 35-leaf, k20 status-membership
circuit, not acceptance of the current staged M6 contract, an ordinary user
action, an independently verified proof, or a ledger transaction. It never
loads a wallet. A policy-test pass is not a successful real proof.

本实验仅重试历史35叶、k20状态成员关系电路，不代表当前分阶段M6合约、普通用户动作、
独立证明验证或账本交易验收；不加载钱包。策略自测通过不等于真实证明成功。

## Fixed experiment

Keep the earlier failed stock-server comparison's physical RAM budget:
11.5 GiB prover plus 2.5 GiB client. Add at most 8 GiB disk-backed swap to
the prover only; set its actual cgroup memory.high to 10 GiB to initiate
reclamation before its unchanged hard cap. The separate controller has a
512 MiB/no-swap ceiling. One Rayon thread, server worker and job are allowed.
The exact image digest and all historical program/key hashes remain pinned.
This is not yet evidence that the current application works within 6 GiB.

保留此前失败的原版服务对照所用物理内存预算：证明器11.5GiB、客户端2.5GiB。
仅给证明器最多8GiB磁盘swap，并将实际cgroup memory.high设为10GiB，在未提高的硬上限
之前开始回收。独立控制器上限512MiB、无swap；Rayon线程、服务工作线程、任务均为一个。
镜像摘要及历史程序／密钥摘要固定。该实验尚不能证明当前应用可在6GiB内运行。

The existing private 8 GiB swap file is reused, not recreated. The dedicated
host must have no other active swap or running containers. Original
vm.swappiness=0 is checked; during the experiment only, use 60 and restore 0.
No fstab or persistent sysctl change is made. Two-second numeric samples retain
RAM, swap, paging counters and cgroup events; nonzero swap use is not a failure.
Stop guards are 2,000 seconds, 384 MiB host available reserve, 128 MiB free
swap reserve, container exit/OOM, or interruption. The proof job and HTTP wait
are bounded at 1,800 seconds. No protocol deadline is extended.

复用既有私有8GiB swap文件，不重建。专用主机不能有其他启用的swap或运行容器。
核实原始vm.swappiness=0；仅实验期间改为60，结束恢复0。不改fstab或持久sysctl。
每两秒采集数值化的内存、swap、换页及cgroup事件；正常使用swap不算失败。
停止条件为2000秒、主机可用内存低于384MiB、空闲swap低于128MiB、容器退出／OOM或中断。
证明任务和HTTP等待各限1800秒，不延长协议时限。

## Prerequisites and invocation

Before running, verify the exact authorized instance, its empty deletion
deadline, no pending stop targeting an active job, the approved OOS role,
and a working schedule/cancellation path. The controller does not contain
cloud credentials or implement lifecycle fallback. After the user fixes the
initial missing OOSServiceRole, a four-hour-future probe reaches Waiting and
its cancellation is confirmed before proof work. A separate fixed-template
role test passes DescribeInstances and reaches the expected DryRunOperation
for exact-instance StopCharging. OOS labels that dry-run execution Failed
because the ECS dry-run success signal is an error response; no actual stop
occurs. Final one-hour stopping is scheduled only after the active work ends.

运行前核对精确授权实例、删除期限为空、没有会中断任务的待执行停机任务、已批准OOS角色，
以及可用的定时／取消路径。控制器不包含云凭据，也不实现生命周期替代方案。
用户修复最初缺少的OOSServiceRole后，四小时后单次探测到达Waiting，并在证明工作前
确认取消。另一个固定模板的角色测试通过DescribeInstances，并从精确实例StopCharging
预演取得预期DryRunOperation。因ECS以错误响应表示预演成功，OOS将该执行标为Failed，
并未实际停机。最终一小时后停机任务须在当前工作完成后才安排。

`scripts/cloud-m6-membership-paging.py --self-test` passes seven local policy
tests when run from the checkout, using its ignored logs directory for temporary
synthetic artifacts. On ECS, run self-tests from ROOT/client with the script's
absolute path. The uploaded script hash is
355fc19c4d2fdf98e3e21dda8085e69ec4a0c82d38ffe452a669b3e8d876022d;
all seven Linux self-tests and prepare-only pass. Inspect the pinned image's
actual CLI using its binary through an explicit shell entrypoint before the
first real run. This inspection now passes. A previous bare `IMAGE --help` invocation
reached bash rather than the proof server; it did not inspect the server's CLI
or start a proof. Confirm that the command and read-only cache path below work
on the current image, not a moving tag. Do not silently substitute a new image.

在源码根目录运行上述脚本的--self-test通过七项策略测试，临时合成文件放在忽略的logs内；
ECS上应从ROOT/client目录用脚本绝对路径运行自测。已上传并核对上列脚本摘要，Linux
七项自测及prepare-only均通过。首次真实运行前应显式调用镜像真实二进制检查CLI，
此检查现已通过。此前直接IMAGE --help
进入的是bash，不是证明器，未检查服务CLI，也未启动证明。必须在当前固定摘要镜像上核对
命令及只读缓存路径有效，不依赖浮动标签，不自行替换镜像。

After successful current-host real key generation and public-input staging,
the executed invocation is:

在当前主机真实密钥构建成功、公开输入就绪后，实际执行：

```bash
cd /opt/permio-m6-membership-20261015
systemd-run --unit=permio-m6-membership-paging.service \
  --property=MemoryHigh=536870912 --property=MemoryMax=536870912 \
  --property=MemorySwapMax=0 --property=CPUQuota=50% \
  --property=TasksMax=128 --property=RuntimeMaxSec=2100 \
  --property=TimeoutStopSec=300 --property=Restart=no \
  --property=StandardOutput=append:/opt/permio-m6-membership-20261015/paging-unit.log \
  --property=StandardError=append:/opt/permio-m6-membership-20261015/paging-unit.log \
  /usr/bin/python3 /opt/permio-m6-membership-20261015/cloud-m6-membership-paging.py --run
```

The controller requires a new exclusive paging-output directory, real key
build report and matching keys, exact updated client, private swap ownership,
and actual cgroup/ancestor limits. It creates only its named prover and sibling
client unit. Cleanup stops only those owned jobs, restores swappiness and
disables only the exact swap file when sufficient RAM is available. Unsafe
swapoff is reported, not forced. The file, stopped container, keys, source and
disks remain intact. Arbitrary raw prover logs are not exported.

控制器要求新建排他的paging-output目录、真实构建报告及匹配密钥、精确新版客户端、
私有swap所有权，以及实际cgroup／父级上限；只创建指定证明器及同级客户端服务。
清理只停止自有任务，恢复swappiness，并仅在内存余量安全时停用精确swap文件。
不安全时报告而不强制swapoff。保留文件、已停止容器、密钥、源码及磁盘，不导出任意
原始证明器日志。

## Evidence and interpretation

Download and hash-check the current key-build report/resource log/verifying
key and paging-output report/numeric samples/redacted client log. On actual
success, also preserve isolated-proof.bin and its matching report, verifying
both length and SHA-256. Deserialization validates its format only; independent
cryptographic verification and real-contract/node acceptance remain separate
unfinished work. Schedule graceful StopCharging one hour after all jobs finish
and the required results are downloaded and verified. Do not schedule deletion.

下载并核对当前密钥构建报告／资源日志／验证密钥、paging-output报告／数值采样／脱敏
客户端日志。若实际成功，还须保存isolated-proof.bin及对应报告，核对长度与SHA-256。
反序列化仅验证格式，独立密码学验证及真实合约／节点验收仍是后续未完成工作。
全部任务结束且必要结果下载验证后，安排一小时后优雅StopCharging停机，不安排删除。

## Observed result and cleanup correction

The first real run returns a 4,508-byte proof in 469.670 seconds of provider
time (494.115 seconds for the controller). Peak prover RAM is 10.00024 GiB,
peak swap 4.68654 GiB; no hard-limit or OOM events occur. The client separately
peaks at a sampled 2.17260 GiB. These are one-worker, historical-circuit
measurements, not the current ordinary-action latency or a 6 GiB qualification.
The old no-swap failure was on another instance, so no strict same-host slowdown
ratio can be calculated. Exact values and hashes are in
cloud-membership-paging-verification.json.

首轮真实运行生成4508字节证明，provider耗时469.670秒，控制器总耗时494.115秒。
证明器峰值RAM10.00024GiB、swap4.68654GiB，无硬上限或OOM事件；客户端另有采样峰值
2.17260GiB。这是单线程历史电路测量，不是当前普通动作耗时或6GiB资格。旧无swap失败
发生在另一实例，不能据此计算严格同机减速比例。精确数值及摘要见对应验证JSON。

The proof client exits0 and saves a hash-checked artifact, but the original
controller exits1 during cleanup: systemd has already collected the transient
client, and stopping that missing unit is incorrectly treated as a failure.
The safety guard therefore leaves temporary swap enabled. Preserve that
original report. Independently verify the client inactive/group absent and
prover stopped, then safely disable the exact swap; a separate recovery report
records success. Swappiness is restored to0 and the swap file is preserved.

证明客户端exit0并保存摘要匹配的文件，但原控制器在清理阶段exit1：systemd已回收临时
客户端，停止不存在的服务被误判为失败，安全保护因此保留了启用的临时swap。原报告
不覆盖；独立核实客户端inactive／cgroup不存在、证明器已停后，安全停用精确swap，另写
恢复成功报告。swappiness恢复0，保留swap文件。

The revised controller treats a proven inactive, collected unit as already
cleaned, while rejecting a missing unit with a live group. Nine self-tests
pass locally and on Linux, including the real collected-client state. The
revised file is uploaded under a separate v1.1 filename; the original executed
controller and original failure are included in the downloaded evidence.
The expensive proof is not rerun for this cleanup-only change. Independent
cryptographic/node verification and M6 completion remain unclaimed.

修订控制器把已证实inactive且已回收的服务视为已清理，但拒绝“服务不存在却有活跃组”的
状态。本地及Linux九项自测通过，并核对真实已回收客户端。修订文件以独立v1.1文件名
上传，原执行脚本及失败报告均保存在下载证据中；未为仅清理逻辑的改动重跑昂贵证明。
仍不声称独立密码学／节点验证或M6完成。
