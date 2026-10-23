const elements = typeof document === "undefined" ? {} : Object.fromEntries([
  "main-content", "section-name", "page-title", "observed-at", "freshness-label", "update-status",
  "refresh-button", "retry-button", "loading-panel", "error-panel", "content", "receipt-count",
  "execution-count", "success-count", "failure-count", "activity-page", "reports-page",
  "receipt-range", "receipts", "history-empty", "search-empty", "search-input", "status-filter",
  "clear-filters", "aggregate-report", "aggregate-empty", "receipt-dialog", "receipt-detail", "close-dialog",
].map((id) => [id, document.getElementById(id)]));

let currentReadModel = null;
let loading = false;
let selectedReceiptId = null;
let detailTrigger = null;
let requestGeneration = 0;

export function shortHex(value, start = 8, end = 6) {
  if (!value || typeof value !== "string") return "—";
  const hash = value.includes(":") ? value.slice(value.lastIndexOf(":") + 1) : value;
  return hash.length <= start + end + 1 ? hash : `${hash.slice(0, start)}…${hash.slice(-end)}`;
}

export function formatUnix(value) {
  if (value === null || value === undefined) return "—";
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "—";
  const date = new Date(numeric > 10_000_000_000 ? numeric : numeric * 1_000);
  if (Number.isNaN(date.valueOf())) return "—";
  return new Intl.DateTimeFormat("en", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Shanghai",
  }).format(date);
}

export function summarize(readModel) {
  const successes = readModel.executions.filter((execution) => execution.success === true).length;
  const failures = readModel.executions.filter((execution) => execution.success === false).length;
  const attempts = readModel.executions.length;
  return {
    receipts: readModel.receipts.length, attempts, successes, failures,
    successRate: attempts === 0 ? null : Math.round((successes / attempts) * 100),
    latestBlock: Math.max(0,
      ...readModel.receipts.map((item) => Number(item.registeredBlock ?? 0)),
      ...readModel.executions.map((item) => Number(item.blockNumber ?? 0)),
      ...readModel.aggregates.map((item) => Number(item.updatedBlock ?? 0))),
  };
}

export function receiptStatus(receipt, executions) {
  if (receipt.revoked) return { key: "revoked", label: "Revoked" };
  const result = executions.find((item) => item.id === receipt.executionId || item.receiptId === receipt.id);
  if (result?.success === true) return { key: "success", label: "Successful" };
  if (result?.success === false) return { key: "failed", label: "Failed" };
  return receipt.consumed
    ? { key: "unknown", label: "Result pending" }
    : { key: "pending", label: "Not executed" };
}

export function filterReceipts(receipts, executions, query, status) {
  const term = query.trim().toLowerCase();
  return receipts.filter((receipt) => {
    const matchesStatus = status === "all" || receiptStatus(receipt, executions).key === status;
    const searchable = [receipt.id, receipt.recipient, receipt.registeredTransaction, receipt.sourceTransaction];
    return matchesStatus && (!term || searchable.some((value) => String(value ?? "").toLowerCase().includes(term)));
  });
}

function escapeHtml(value) {
  return String(value ?? "—").replaceAll("&", "&amp;").replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function renderHistory() {
  if (!currentReadModel) return;
  const { receipts, executions } = currentReadModel;
  const filtered = filterReceipts(receipts, executions, elements["search-input"].value, elements["status-filter"].value);
  elements["receipt-range"].textContent = `${filtered.length} of ${receipts.length} recent receipts`;
  elements["history-empty"].hidden = receipts.length !== 0;
  elements["search-empty"].hidden = receipts.length === 0 || filtered.length !== 0;
  document.querySelector(".history-heading").hidden = filtered.length === 0;
  const historyHtml = filtered.map((receipt) => {
    const status = receiptStatus(receipt, executions);
    const executedAt = executions.find((item) => item.receiptId === receipt.id)?.executedAt;
    const date = formatUnix(executedAt ?? receipt.registeredAt);
    return `<button type="button" class="history-row" data-receipt-id="${escapeHtml(receipt.id)}" aria-label="View receipt ${escapeHtml(shortHex(receipt.id))}, ${status.label}">
      <span><strong>${escapeHtml(shortHex(receipt.id, 10, 6))}</strong><small>${escapeHtml(date)}</small></span>
      <span class="recipient">${escapeHtml(shortHex(receipt.recipient))}</span>
      <time>${escapeHtml(date)}</time>
      <span class="pill ${status.key}">${status.label}</span>
      <span class="row-arrow" aria-hidden="true">›</span>
    </button>`;
  }).join("");
  if (elements.receipts.innerHTML !== historyHtml) {
    const activeId = document.activeElement?.dataset?.receiptId;
    elements.receipts.innerHTML = historyHtml;
    if (activeId) {
      [...elements.receipts.querySelectorAll("[data-receipt-id]")]
        .find((button) => button.dataset.receiptId === activeId)?.focus();
    }
  }
}

function detailRows(rows) {
  return `<dl class="receipt">${rows.map(([label, value]) => `<dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd>`).join("")}</dl>`;
}

export function stateReferenceRows(receipt) {
  if (receipt.instanceCommitment != null && receipt.contextHash != null &&
      receipt.previousStateCommitment === null && receipt.nextStateCommitment === null && receipt.transitionSequence === null) {
    return [["State transition", "No state transition"]];
  }
  return [
    ["Previous state", receipt.previousStateCommitment],
    ["Next state", receipt.nextStateCommitment],
    ["Transition sequence", receipt.transitionSequence],
  ];
}

function renderReceiptDetails(id) {
  if (!currentReadModel) return;
  const receipt = currentReadModel.receipts.find((item) => item.id === id);
  if (!receipt) {
    elements["receipt-dialog"].close();
    return;
  }
  const execution = currentReadModel.executions.find((item) => item.id === receipt.executionId || item.receiptId === id);
  const status = receiptStatus(receipt, currentReadModel.executions);
  elements["receipt-detail"].innerHTML = `<div class="detail-status"><span class="pill ${status.key}">${status.label}</span><span>${escapeHtml(formatUnix(receipt.registeredAt))}</span></div>
    ${detailRows([
      ["Receipt ID", receipt.id.slice(receipt.id.lastIndexOf(":") + 1)],
      ["Recipient", receipt.recipient], ["Registered", formatUnix(receipt.registeredAt)],
      ["Valid from", formatUnix(receipt.validAfter)], ["Valid until", formatUnix(receipt.validBefore)],
    ])}
    <section class="detail-section"><h3>Transactions</h3>${detailRows([
      ["Source network", receipt.sourceNetworkName], ["Source contract", receipt.sourceContract],
      ["Source ledger sequence", receipt.sourceLedgerSequence], ["Source transaction", receipt.sourceTransaction], ["Registration", receipt.registeredTransaction],
      ...(execution ? [["Execution", execution.transactionHash], ["Execution adapter", execution.adapter], ["Executed", formatUnix(execution.executedAt)]] : []),
    ])}</section>
    <details class="detail-section"><summary>Additional references</summary>${detailRows([
      ["Purpose", receipt.purposeHash], ["Action", receipt.actionSchemaId], ["Template", receipt.templateIdHash],
      ["Template version", receipt.templateVersion], ["Proof module", receipt.proofModuleId],
      ["Module version", receipt.proofModuleVersion], ["Namespace", receipt.namespaceHash],
      ["Template commitment", receipt.templateContentHash], ["Module implementation", receipt.proofModuleImplementationHash],
      ["Instance", receipt.instanceCommitment], ...stateReferenceRows(receipt),
      ["Context", receipt.contextHash], ["Scoped nullifier", receipt.scopedNullifier], ["Output commitment", receipt.outputCommitment],
      ...(execution?.success === false ? [["Error reference", execution.errorHash]] : []),
    ])}</details>`;
}

function renderReports() {
  const aggregates = currentReadModel?.aggregates ?? [];
  elements["aggregate-empty"].hidden = aggregates.length !== 0;
  if (!aggregates.length) {
    elements["aggregate-report"].replaceChildren();
    return;
  }
  const rows = aggregates.map((item) => `<tr><td>${escapeHtml(formatUnix(item.bucketStart))}</td><td>${escapeHtml(item.receiptsRegistered)}</td><td>${escapeHtml(item.executionAttempts)}</td><td class="success-value">${escapeHtml(item.executionSuccesses)}</td><td class="failure-value">${escapeHtml(item.executionFailures)}</td></tr>`).join("");
  elements["aggregate-report"].innerHTML = `<div class="table-scroll"><table class="report-table"><caption class="sr-only">Hourly receipt and execution totals</caption><thead><tr><th scope="col">Period</th><th scope="col">Receipts</th><th scope="col">Executions</th><th scope="col">Successful</th><th scope="col">Failed</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

export function setActivityPage() {
  const page = location.hash === "#reports" ? "reports" : "activity";
  const label = page === "reports" ? "Reports" : "Activity";
  elements["page-title"].textContent = label;
  elements["section-name"].textContent = label;
  document.title = `${label} · Permio`;
  elements["activity-page"].hidden = page !== "activity";
  elements["reports-page"].hidden = page !== "reports";
}

function setStatus(state, label) {
  elements["update-status"].querySelector(".status-dot").className = `status-dot ${state}`;
  elements["freshness-label"].textContent = label;
}

function renderAvailable(readModel) {
  currentReadModel = readModel;
  const summary = summarize(readModel);
  elements["error-panel"].hidden = true;
  elements.content.hidden = false;
  elements["receipt-count"].textContent = summary.receipts;
  elements["execution-count"].textContent = summary.attempts;
  elements["success-count"].textContent = summary.successes;
  elements["failure-count"].textContent = summary.failures;
  elements["observed-at"].textContent = `Last updated ${new Date(readModel.observedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  const state = readModel.freshness.state;
  const age = readModel.freshness.ageSeconds;
  const label = state === "aging" ? "Updates delayed"
    : state === "unknown" || (age !== null && age > readModel.freshness.thresholdSeconds) ? "Last update may be delayed"
      : "Up to date";
  setStatus(label === "Up to date" ? "fresh" : "aging", label);
  renderHistory();
  renderReports();
  if (selectedReceiptId && elements["receipt-dialog"].open) renderReceiptDetails(selectedReceiptId);
}

function renderUnavailable() {
  currentReadModel = null;
  elements.content.hidden = true;
  elements["error-panel"].hidden = false;
  elements.receipts.replaceChildren();
  elements["aggregate-report"].replaceChildren();
  elements["receipt-detail"].replaceChildren();
  if (elements["receipt-dialog"].open) elements["receipt-dialog"].close();
  ["receipt-count", "execution-count", "success-count", "failure-count"].forEach((id) => { elements[id].textContent = "—"; });
  elements["observed-at"].textContent = "Unable to update activity.";
  setStatus("unavailable", "Updates unavailable");
}

export async function loadDashboard(fetchImplementation = fetch) {
  if (loading) return;
  loading = true;
  const generation = requestGeneration;
  elements["refresh-button"].disabled = true;
  elements["refresh-button"].textContent = "Refreshing…";
  elements["retry-button"].disabled = true;
  elements["main-content"].setAttribute("aria-busy", "true");
  try {
    const response = await fetchImplementation("/api/m8/read-model", { cache: "no-store", signal: AbortSignal.timeout(8_000) });
    const payload = await response.json();
    if (generation !== requestGeneration || !activityEnabled) return;
    if (!response.ok || payload.status !== "available") {
      renderUnavailable();
      return payload;
    }
    renderAvailable(payload);
    return payload;
  } catch {
    if (generation === requestGeneration && activityEnabled) renderUnavailable();
    return { status: "unavailable" };
  } finally {
    if (generation !== requestGeneration) return;
    loading = false;
    elements["loading-panel"].hidden = true;
    elements["refresh-button"].disabled = false;
    elements["refresh-button"].textContent = "Refresh";
    elements["retry-button"].disabled = false;
    elements["main-content"].setAttribute("aria-busy", "false");
  }
}

let activityEnabled = false;
export function enableActivity(value) {
  if (value !== activityEnabled) { requestGeneration++; loading = false; }
  activityEnabled = value;
  if (!value) { renderUnavailable(); elements["error-panel"].hidden = true; }
}
export function initializeActivity() {
  document.querySelector(".skip-link").addEventListener("click", (event) => {
    event.preventDefault();
    elements["main-content"].focus();
  });
  elements["refresh-button"].addEventListener("click", () => loadDashboard());
  elements["retry-button"].addEventListener("click", () => loadDashboard());
  elements["search-input"].addEventListener("input", renderHistory);
  elements["status-filter"].addEventListener("change", renderHistory);
  elements["clear-filters"].addEventListener("click", () => {
    elements["search-input"].value = "";
    elements["status-filter"].value = "all";
    renderHistory();
    elements["search-input"].focus();
  });
  elements.receipts.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-receipt-id]");
    if (!trigger) return;
    selectedReceiptId = trigger.dataset.receiptId;
    detailTrigger = trigger;
    renderReceiptDetails(selectedReceiptId);
    elements["receipt-dialog"].showModal();
  });
  elements["close-dialog"].addEventListener("click", () => elements["receipt-dialog"].close());
  elements["receipt-dialog"].addEventListener("close", () => {
    selectedReceiptId = null;
    if (detailTrigger?.isConnected) detailTrigger.focus();
  });
  document.addEventListener("visibilitychange", () => {
    if (activityEnabled && !document.hidden) loadDashboard();
  });
  setInterval(() => { if (activityEnabled && !document.hidden && !elements["receipt-dialog"].open) loadDashboard(); }, 15_000);
}
