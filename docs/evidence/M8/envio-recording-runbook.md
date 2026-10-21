# Envio Recording Runbook — Local M8 Fixture

Date: 2026-10-13
Target length: 90–110 seconds; confirm the current portal limit before upload.

This runbook records fixture-only local evidence. It must not be described as
an authoritative M6 receipt, authenticated M7 transport, public Monad
deployment, or completed M8 milestone.

## Prepared state

- Ubuntu WSL: Node.js 22.23.2, npm 10.9.8.
- Hardhat 3.14.0, chain ID 31337, JSON-RPC `http://127.0.0.1:8545`.
- Registry `0x5FbDB2315678afecb367f032d93F642f64180aa3`.
- Envio 3.14.0, PostgreSQL 18.3, Hasura GraphQL Engine 2.43.0.
- GraphQL `http://127.0.0.1:8080/v1/graphql`.
- Dashboard `http://127.0.0.1:4178`.

Start the three long-running processes in separate terminals:

```bash
# Ubuntu WSL terminal 1
cd /path/to/Permio
npm run node
```

```bash
# Ubuntu WSL terminal 2, after the JSON-RPC listener is ready
cd /path/to/Permio
npx hardhat ignition deploy ignition/modules/ExecutionRegistryLocalFixture.ts --network localhost --reset
npm run seed:m8:fixture:local
npm run indexer:backfill
```

```powershell
# Windows PowerShell terminal 3, after Envio reports Ready
cd C:\path\to\Permio
npm run dashboard:start
```

If Envio's existing containers are stopped and its WSL process cannot see the
Docker socket, the narrow local recovery is:

```bash
docker start envio-postgres envio-hasura
```

Do not restart Docker Desktop or the shared Midnight Local Dev containers for
this recording.

## Recording sequence

Prepare the additional seed command before recording: startup on `/mnt/c` can
take around a minute. Capture the resulting update when Envio catches up; do
not spend the clip waiting on process startup.

1. **0:00–0:15 — Context.** Open Activity. In narration identify this as local
   Hardhat fixture evidence and state the M6/M7 integration limitation.
2. **0:15–0:35 — History.** Show the receipt and execution counts, then search
   or filter the history by status.
3. **0:35–0:60 — Details.** Open one receipt and show its result, recipient,
   validity window, source transaction, and corresponding execution transaction.
4. **0:60–0:85 — Reports.** Open Reports and show the actual hourly receipt,
   execution, success, and failure counts returned through GraphQL.
5. **0:85–0:105 — Update.** Return to Activity and click **Refresh** after the
   prepared seed is indexed. Show the new receipt and updated counts.

The current interface intentionally keeps milestone, fixture, deployment, and
developer notes out of product copy at the user's request. State those limits
in narration and submission evidence. The API retains boundary metadata.

The 2026-10-13 browser drill observed the first receipt/execution at blocks 8–9
and a second pair at blocks 10–11. The dashboard updated from 1 receipt and 1
execution to 2 and 2, retained a 100% fixture success rate, and reported zero
block lag. Stopping only `envio-hasura` changed every metric to an unavailable
state, removed all rows, and displayed “Execution authority is unchanged.”
Restarting Hasura and refreshing restored the same indexed rows.

---

# Envio 录制流程——本地 M8 Fixture

日期：2026-10-13
目标时长：90–110 秒；上传前确认当前门户限制。

本流程只记录本地 fixture 证据。不得把它描述为权威 M6 收据、已认证 M7 传输、公开 Monad 部署或
已完成的 M8 里程碑。

准备环境为：Ubuntu WSL Node.js 22.23.2、npm 10.9.8；Hardhat 3.14.0、链 ID 31337、JSON-RPC
`http://127.0.0.1:8545`；注册表 `0x5FbDB2315678afecb367f032d93F642f64180aa3`；
Envio 3.14.0、PostgreSQL 18.3、Hasura GraphQL Engine 2.43.0；GraphQL
`http://127.0.0.1:8080/v1/graphql`；仪表板 `http://127.0.0.1:4178`。

分别在三个终端中按上方命令启动 Hardhat、部署／填充／Envio，以及仪表板。如果已有 Envio 容器已
停止且 WSL 进程看不到 Docker socket，只需运行 `docker start envio-postgres envio-hasura`。录制时
不要重启 Docker Desktop 或共享 Midnight Local Dev 容器。

录制前先准备额外的填充命令：在 `/mnt/c` 上启动可能需要约一分钟。录制 Envio 追上后的更新过程，
不要把片段用在等待进程启动上。录制顺序：0:00–0:15 打开 Activity，用旁白说明本地 Hardhat fixture
证据及 M6/M7 集成限制；0:15–0:35 展示收据与执行数量，演示搜索／状态筛选；0:35–0:60 打开收据，
展示结果、接收方、有效期、来源交易和执行交易；0:60–0:85 打开 Reports，展示通过 GraphQL 返回的
真实小时统计；0:85–0:105 在准备的填充数据被索引后回到 Activity，点击 **Refresh** 展示新收据和计数。

按用户要求，当前产品文案不包含里程碑、fixture、部署和开发说明。请在旁白及提交证据中说明限制；
API 保留边界元数据。

2026-10-13 的浏览器演练观察到第一组收据／执行位于区块 8–9，第二组位于区块 10–11。仪表板从
1 条收据和 1 次执行更新为 2 和 2，fixture 成功率保持 100%，并报告零区块延迟。仅停止
`envio-hasura` 后，所有指标进入不可用状态，全部数据行消失，并显示“Execution authority is
unchanged.”；重启 Hasura 并刷新后，相同索引数据恢复。
