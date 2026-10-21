# M6 controlled Preprod runtime continuation, 17 October 2026

M6 remains incomplete. The earlier 17-transaction governance sequence is
independently finalized, but its template and module are revoked. This
continuation prepares a fresh synthetic fixture for allocation, account
credential issuance and participant-slot management. These operations do not
establish ordinary-action acceptance or emit the common action receipt.

The source baseline is `f2d8689f95d9294a92f6b2e2b8718d31121dde81`, with the
existing uncommitted M6 work recorded separately. The target is only Singapore
ECS `i-t4ni11rkjyzgi0vlb68d`, region `ap-southeast-1`. The official Alibaba CLI
verified every attached security group and its membership: the sole group has
only this instance and permits SSH only from Workbench's private management
range. The isolated client uses the exact existing dependency lock, Node
22.23.2, compiler 0.31.1, Compact runtime 0.16.0, ledger SDK 8.1.0 and the cached
official prover 8.1.3 image identified by its full digest.

The shared private agent instructions now require active tasks to refresh a
real one-time graceful economical-stop deadline two hours ahead at least every
30 minutes. All seven workspace instruction copies retain their exact shared
prefix and any local appendix, and remain ignored and untracked. A thread
heartbeat is a backup; the active owner also refreshes the CLI-managed timer.
One observed API timeout triggered verified cancellation of the earlier stop;
a later refresh restored and independently verified the two-hour timer. No
automatic deletion deadline or RAM grant is introduced.

The runner has an optional private allocation-checkpoint hook, awaited before
the allocation can reach submission. It retains the original M5 instance,
allocation and private state opening for recovery without adding them to
public evidence. The existing full root check passes all 356 tests: 350 Node
tests and six Hardhat tests. The captured check output is
`logs/m6-runtime-checkpoint-root-check-20261017.txt`, SHA-256
`53fb7138b58945c64a63eb720cda98ee6152e5cba56c765c58512ee78e238d9a`.

Workbench's large public-asset transfers returned intermittent local-to-OSS
timeouts. Verified partial transfers and failed attempts are preserved; an
uncertain CLI exit is never treated as proof of transfer failure or success.
The alternative uses the already installed, hash-matched `midnight-zkir 2.1.0`
and the exact public programs and parameters to regenerate keys on the server.
Every prover and verifier key must match the existing local manifest byte for
byte before installation. The first pair matches. Full reproduction remains
in progress when this preparation note is written. The original manifest,
toolchain, proof programs and acceptance requirements remain unchanged.

The dedicated Preprod test wallet and replaceable test provider credential
were selected from the explicitly disposable test setup, rather than inferred
from filenames. Only the allowlisted test inputs and three wallet snapshots
were encrypted in memory with AES-256-GCM and a server-held RSA-OAEP-SHA256
key. The OSS intermediary received ciphertext only. No Alibaba credential,
production data, local-network example mnemonic, private agent instructions
or existing private flow payload was transferred. Plaintext provisioning is
deferred until the dedicated prover's private access boundary passes.

The controlled run must use a dedicated internal container network and an
explicit `127.0.0.1` publication, verify loopback health and nonloopback denial,
keep raw SDK/prover output private, preserve submission identifiers before
sending, reconcile uncertain outcomes before any retry, scan exported public
traces, and remove temporary test credentials after the owned client stops.
Its resource profile is a measured Singapore diagnostic profile, not proof
that ordinary actions satisfy a smaller product memory budget. Real runtime,
receipt, privacy and restart acceptance remain open until their actual evidence
passes. The local Docker Desktop API also returned HTTP 500 during a read-only
inspection; no local node/indexer restart acceptance is claimed.

---

M6 仍未完成。之前的 17 笔治理交易已通过独立最终确认，但对应模板和模块已撤销。
本次续做为实例分配、账户凭证签发和参与者槽位管理准备新的合成测试材料。这些操作
不构成普通操作验收，也不会生成通用操作收据。

源码基线为上述提交，现有未提交 M6 工作另外记录。唯一目标是新加坡实例及区域。
官方阿里云 CLI 已核验所有绑定安全组及成员：唯一安全组仅有这一台实例，SSH 仅向
Workbench 私有管理网段开放。隔离客户端复用完全一致的依赖锁文件、Node 22.23.2、
编译器 0.31.1、Compact runtime 0.16.0、ledger SDK 8.1.0，以及按完整摘要固定的官方
证明器 8.1.3 镜像。

共享私有代理指令现要求活动任务至少每 30 分钟刷新一次真实的一次性平稳节省停机
任务，期限保持在两小时后。工作区七份指令副本均保留准确共享前缀及各自附录，并
保持忽略、未跟踪。线程心跳作为备用，活动任务自身也通过 CLI 刷新。一次 API 超时
触发了旧停机任务的取消及回读核验，随后刷新已恢复并独立核验两小时定时任务。
没有设置自动删除期限，也没有新增 RAM 授权。

运行器新增可选的私有实例分配检查点接口，并在分配到达提交边界之前等待保存完成。
它为恢复保留原始 M5 实例、分配及私有状态原始数据，不加入公开证据。现有完整检查
通过全部 356 项测试：350 项 Node 测试和六项 Hardhat 测试。检查记录及 SHA-256 如上。

Workbench 大文件公开资产上传间歇性遇到本机至 OSS 超时。已验证的分块及失败尝试
均被保留；CLI 返回不确定时，不直接认定传输成功或失败。替代方法使用服务器已有、
哈希一致的 midnight-zkir 2.1.0，以及完全相同的公开程序和参数重新生成密钥。每组
证明密钥和验证密钥必须与现有本地清单逐字节一致才会安装。第一组已一致；记录这份
准备说明时，完整复现仍在进行。原清单、工具链、证明程序和验收要求均保持一致。

专用 Preprod 测试钱包及可替换的测试服务商凭据来自明确标注的一次性测试配置，
并非根据文件名推断。仅白名单测试输入和三份钱包快照在内存中使用 AES-256-GCM、
服务器持有的 RSA-OAEP-SHA256 密钥加密；OSS 中转仅接收密文。未传输阿里云凭据、
生产数据、本地网络示例助记词、私有代理指令或已有私有信息流载荷。明文配置将在
专用证明器的私有访问边界验证通过后才进行。

受控测试必须使用专用内部容器网络和明确的 127.0.0.1 端口映射，核验回环健康检查
及非回环拒绝，将原始 SDK／证明器输出保持私有，在发送前记录公开交易标识符，
重试前核对结果不确定的交易，扫描导出的公开记录，并在自有客户端停止后删除临时
测试凭据。资源配置属于新加坡诊断测量，不能证明普通操作满足更小的产品内存预算。
真实运行时、收据、隐私及重启验收仍须实际证据通过。对本地 Docker Desktop 的只读
检查还返回了 HTTP 500，因此不宣称本地节点／索引器重启验收已完成。
