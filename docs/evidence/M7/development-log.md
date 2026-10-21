# M7 preparation checkpoint — 2026-10-14

The user requested local checkpoint commits of the current M6 and M7 changes,
leaving the existing separate M5 patch alone, then a new memory-experiment
worktree for preparation only. The existing M7 thread was inactive; its
worktree is feat/m7-preparation from committed c50959c. No new M7 source
implementation, branch integration or memory experiment was started here.

The checkpoint preserves the existing gateway foundation: public source
identity/opaque receipt-byte validation, exact source allowlist, exact-byte
Keccak receipt hash, six-dimension versioned outbox key, and signing-key epoch
selection/cutoffs. The opaque fixture bytes are not a finalized M6 receipt
format. No observer, durable checkpoint/outbox, wire decoder, signature worker,
retry transport or live M6-to-M7 acceptance is claimed. Existing README,
milestone Markdown/HTML and package/lockfile integration changes belong to
that preparation slice and are committed unchanged, not re-authored here.

Fresh approved native npm run check exits 0: protocol 6, M2 15, M3 14, M4 16,
M5 baseline 13, gateway 7 and Hardhat 6, total 77, zero failures/skips;
docs/typecheck/Solidity build pass. Hardhat reports 21800 ms, not Midnight
proof time. This older independent branch does not yet contain M5-P1 or the
current M6 package, so these 77 checks cannot stand in for M6's 255-case suite.
No M5 changes are introduced, and the already separate M5-P1 commit is not
cherry-picked, amended or duplicated. No source files were changed to pass
verification. The attempted package README read found no existing README;
the actual source/test files were inspected instead, without adding one.

The scoped checkpoint excludes ignored private agent instructions, node
dependencies, logs, private wallet/witness data and build caches. Filename-only
checks found no literal private-key PEM or mnemonic/seed-phrase values in the
gateway package. No push, merge or rebase is performed. M7 remains incomplete;
checkpoint.json records the exact test scope and integration gates.

---

# 中文翻译

用户要求把当前 M6、M7 修改分别本地提交，已独立提交的 M5 补丁不动，再创建只准备、不
运行的内存实验 worktree。M7 原线程未运行，其独立分支 feat/m7-preparation 从 c50959c
开始。本轮不新增 M7 源码、不合并分支、不开始实验。

保存的是既有网关基础：公开来源／不透明收据字节验证、精确来源 allowlist、逐字节
Keccak 哈希、六维版本化 outbox 键及签名密钥 epoch／截止时间选择。fixture 字节不是
最终 M6 收据格式；观察器、持久 checkpoint/outbox、解码、签名 worker、重试传输及
真实 M6→M7 验收仍未完成。既有 README、milestone／HTML 和 package／锁文件修改
仅原样提交，本轮没有重新编辑。

新跑的完整原生检查 exit 0：协议 6、M2 15、M3 14、M4 16、旧 M5 13、网关 7、
Hardhat 6，共 77，零失败／跳过，文档／类型／Solidity 通过。Hardhat 的 21800 毫秒
不是 Midnight 证明耗时。独立旧基线没有 M5-P1 和当前 M6，不能替代 M6 的 255 项。
没有修改／重复／amend／cherry-pick M5 补丁，没有为通过检查改源码。尝试读取软件包
README 时发现不存在，随后核对实际源码／测试，未新增 README。

提交不含私有 Agent 指令、依赖、logs、钱包／见证／签名密钥和缓存；仅文件名形式的扫描
没有发现网关包中私钥 PEM 或助记词／seed phrase 字面量。未 push、merge 或 rebase，
M7 仍未完成，独立 JSON 保留真实检查范围及集成门槛。
