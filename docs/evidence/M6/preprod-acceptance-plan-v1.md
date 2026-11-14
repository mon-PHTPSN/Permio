# M6 Preprod-primary acceptance plan v1

Approved by the user on 2026-10-15. Implementation and final acceptance remain
incomplete. This changes the acceptance environment, not the contract's trust,
private-witness boundary, authority separation, or runtime proof semantics.

用户于2026-10-15批准。实现及最终验收仍未完成。此决策改变验收环境，不改变合约信任、
私密见证边界、权限分离或运行时证明语义。

Latest16October implementation evidence is in
`preprod-wallet-readiness-verification.json`: authenticated Windows/WSL RPC and
subscriptions pass, and fixture-1's exact saved wallet restores and catches up.
The stricter positive-DUST guard has its own live verification result there.
This does not complete deployment, proof, transaction/finality or privacy gates.
The connectivity, tool-installation and wallet observations further below are
dated historical snapshots, not current blockers or results for every fixture.

10月16日最新实现证据见上述JSON：Windows／WSL认证RPC及订阅均通过，fixture-1原保存
钱包已恢复并追上当前状态。更严格的DUST余额为正检查有其单独真实结果。部署、证明、
交易／最终性和隐私门槛仍未完成。下文连接、工具安装及钱包观察是带日期的历史快照，
不是当前阻塞，也不代表全部fixture的结果。

## Evidence allocation

| Required result | Environment |
| --- | --- |
| Actual deployment, M4 admission and lifecycle, root/credential authorization | Preprod |
| Runtime account/slot/action proofs, state transition ordering and conflicts | Preprod |
| Replay/nullifier rejection, receipt correctness and public-artifact privacy scans | Preprod |
| Indexed state, application/client restart and reconnect to the exact deployment | Preprod |
| Controlled owned-node/indexer interruption, recovery and state persistence | Local Dev |
| Fresh-chain reproduction and infrastructure fault injection | Local Dev |

证明成功必须对应正确网络的真实链结果；不能用预检失败、旧Local Dev交易或网络连通性
替代Preprod验收。表中Preprod负责真实部署、治理／运行时授权、状态排序冲突、重放／
nullifier、收据隐私及应用重连；Local Dev负责可控自有节点／索引器故障恢复和新链复现。

Do not repeat the entire expensive suite on both networks without identifying
the additional property being tested. Retain all earlier Local Dev evidence
with its original network, contract and version labels. Required negative tests,
state integrity, privacy scans and independent public-state checks remain gates.
An unreachable provider is a blocker, never a successful negative transaction.

无明确新增待验性质，不在两种网络重复完整昂贵套件。历史Local Dev证据保留原网络、
合约及版本标签。必需负向测试、状态完整性、隐私扫描及独立公开状态读取仍是门槛。
服务不可达属于阻塞，不能作为负向交易成功。

## Compatibility findings, not deployment claims

Official documentation inspected on 2026-10-15:
[support matrix](https://docs.midnight.network/relnotes/support-matrix),
[network endpoints](https://docs.midnight.network/relnotes/network), and
[release overview](https://docs.midnight.network/relnotes/overview).
The compiler 0.31.1, runtime 0.16.0, Midnight.js/testkit 4.1.1 and Wallet SDK
1.2.0 agree with the project's pinned core versions. The matrix lists newer
node/indexer services and proof server 8.1.3; the existing tested weak-cache
prover is 8.1.0. This is NOT proof that the older prover works on current Preprod.
No dependency upgrade, proof-key rebuild, prover replacement or patch port is
performed by this documentation amendment.

2026-10-15检查上述官方来源，核心编译器及runtime／SDK版本与项目固定版本一致，
但矩阵所列节点／indexer服务更新、证明器为8.1.3，既有实测weak-cache证明器为8.1.0。
这不证明旧证明器兼容当前Preprod。本次文档修订未升级依赖、重建密钥、更换证明器或
移植补丁。

Read-only authenticated local RPC calls return HTTP 200, ledger `8.1.1`, runtime
spec `1000300`, transaction version `3`, and system-version string
`2.1.0-00000000000`. The latter is an endpoint response, not an independently
verified node binary identity. GraphQL returns block height `2991973` with no
errors. The official overview says ledger 8.1.2; preserve this discrepancy
rather than replacing observations with the documentation. HTTP/RPC success
does not establish proof verification, contract deployment or wallet restoration.

本地只读认证RPC返回HTTP200、ledger8.1.1、runtime spec1000300、交易版本3及上述
system版本字符串；后者不是独立核实的节点二进制身份。GraphQL返回2991973块且无错误。
官方概述列ledger8.1.2，保留此差异，不用文档值替换实测。HTTP/RPC成功不代表证明、
部署或钱包恢复通过。

## Connectivity and next execution boundary

Singapore retry, 2026-10-15 23:08:16 Asia/Shanghai: the newly authorized
Singapore host reaches both current Blockfrost endpoints in approximately one
second. HTTPS and unauthenticated WebSocket-upgrade probes return 403, and a
separate response classification confirms an authentication-related marker.
GitHub/npm return 200 and Docker Hub /v2 returns 401. These establish basic
reachability, not authenticated RPC, a WS subscription, package/image downloads
or proof compatibility. No token, wallet or checkpoint is transferred. Node,
npm and Docker are absent on the new host. The Hangzhou findings below are
historical only; the old host is not contacted or changed. Region and public
egress both changed, so the old timeout's geographic cause is not established.

上海2026-10-15 23:08:16新加坡重试：新授权主机约一秒可达两个当前Blockfrost端点。
HTTPS及未认证WebSocket-upgrade返回403，独立分类确认认证相关标记。GitHub/npm200，
Docker Hub/v2为401。这只说明基础可达，不代表认证RPC、WS订阅、依赖下载或证明兼容。
未传token、钱包或检查点；新主机尚无Node/npm/Docker。下方杭州结论仅为历史，未操作
旧主机。区域及公网出站同时改变，不能据此认定旧超时由地域过滤导致。

At 2026-10-15 13:06:49 UTC, ECS DNS resolves both Blockfrost Preprod hosts,
but unauthenticated HTTPS probes return HTTP 000/curl exit 28 within five
seconds. Legacy endpoints are also probed only diagnostically; official docs
retire them and they are not a fallback. Credentials are not sent to ECS.
Configure authorized outbound connectivity before a remote Preprod run; do not
automatically add public bandwidth, NAT resources, proxies, security rules or
paid services. Retry the same probes after a user-approved network change.

UTC13:06:49（上海21:06:49）ECS能解析两个Blockfrost Preprod主机，但五秒内HTTPS
返回HTTP000/curl28。旧端点只用于诊断，官方已退役，不能作为回退。未传凭据到ECS。
远程Preprod运行前须配置经授权的出站连通性，不自动购买公网带宽／NAT或配置代理、
安全规则及付费服务；用户批准网络修复后原样重测。

Use an explicit Preprod adapter and network/account/provider-matched restored
checkpoints. Alice, Bob and Clara's three-component snapshots were last marked
complete on 11 October Shanghai time; current restore and catch-up are unverified.
Do not copy secrets into tracked source or upload existing wallet/provider
credentials under this approval. Any required secret transfer needs explicit
payload/destination authorization and the project's privacy rules.

使用显式Preprod适配器，匹配网络／账户／服务商恢复检查点。Alice、Bob、Clara三组件
快照最后在上海10月11日记录完成，当前恢复及追赶未验证。不得把秘密写入已跟踪源码，
本次批准不授权上传已有钱包／服务凭据；确需传输必须明确批准载荷和目标并遵守隐私规则。

Before acceptance, verify WS subscriptions, restored wallet readiness, exact
prover/ledger transaction compatibility, network-bound signatures, real proof
submission/finality, indexed state and receipt/privacy gates. Proof-memory costs
are a separate measurement: moving from Local Dev to Preprod does not remove
local/cloud cryptographic computation. The server's automatic release remains
disabled at the user's explicit preservation request; billing continues.

验收前须核验WS订阅、恢复钱包就绪、精确证明器／ledger交易兼容性、网络绑定签名、
真实证明提交最终性、索引状态及收据隐私门槛。证明内存成本独立测量，换网络不会消除
本地／云端密码计算。依用户明确保留要求，服务器自动释放仍关闭，继续计费。
