import { initializeActivity, enableActivity, setActivityPage, loadDashboard, formatUnix } from "./app.js";
import { summarizeWorkspace, filterWorkflows } from "./workspace.js";
import { ContextInterface } from "./context-ui.js";
import { escapeText as html, libraryCards, templateDefinition, instanceCards, instanceDefinition, newTemplateDefinition } from "./context-library.js";
const $ = (id) => document.getElementById(id);
const values = (form) => Object.fromEntries(new FormData(form));
let session = null, workspace = null, registerMode = false, busy = false, selected = null, noticeTimer, minimumPasswordLength = 4;
let workflowQuery = "", workflowState = "all";
let contextView = null;
let librarySelectionQuery = "";
let navigationRevision = 0;
async function api(path, method = "GET", body) {
  let response;
  try { response = await fetch(path, { method, cache: "no-store", headers: { ...(body ? { "content-type": "application/json" } : {}), ...(session ? { "x-csrf-token": session.csrf } : {}) }, body: body ? JSON.stringify(body) : undefined }); }
  catch { throw new Error("Unable to connect. Please try again in a moment."); }
  let result;
  try { result = await response.json(); }
  catch { throw new Error("Unable to complete this request. Please try again."); }
  if (!response.ok) { if (response.status === 401 && session && path !== "/api/account/password") showAuth(); throw new Error(result.error ?? result.message ?? "Unable to complete this request."); }
  return result;
}
function notify(message) { $("toast").textContent = message; $("toast").hidden = false; clearTimeout(noticeTimer); noticeTimer = setTimeout(() => { $("toast").hidden = true; }, 4500); }
function setAuthMode(register) {
  registerMode = register; $("auth-title").textContent = register ? "Create your account" : "Welcome back";
  $("auth-submit").textContent = register ? "Create account" : "Log in";
  $("display-name-field").hidden = !register;
  $("auth-form").elements.password.minLength = register ? minimumPasswordLength : 1;
  $("auth-form").elements.password.autocomplete = register ? "new-password" : "current-password";
  for (const [id, active] of [["login-tab", !register], ["register-tab", register]]) { $(id).classList.toggle("active", active); $(id).setAttribute("aria-selected", String(active)); }
  $("auth-error").hidden = true;
}
function showAuth() {
  contextView?.dispose(); contextView = null;
  session = null; workspace = null; selected = null; workflowQuery = ""; workflowState = "all"; enableActivity(false);
  $("application").hidden = true; $("auth-page").hidden = false; $("boot-panel").hidden = true;
  $("product-page").replaceChildren(); $("account-display").textContent = ""; $("account-username").textContent = "";
  if ($("product-dialog").open) $("product-dialog").close();
  clearTimeout(noticeTimer); $("toast").hidden = true; $("toast").textContent = "";
  $("auth-form").reset(); setAuthMode(false);
  document.title = "Log in · Permio";
}
async function enter(next) {
  session = next; minimumPasswordLength = next.minimumPasswordLength ?? minimumPasswordLength; $("auth-page").hidden = true; $("boot-panel").hidden = true; $("application").hidden = false;
  $("auth-form").reset(); await refresh();
  contextView?.dispose();
  contextView = new ContextInterface({account:session.account,root:$("product-page"),openDialog,notify,run:perform,
    onCreateContext:chooseContextTemplate,getInstances:() => workspace.instances});
  if (["#blueprints","#workflows"].includes(location.hash)) history.replaceState(null, "", "#library");
  if (!["#overview", "#library", "#workspace", "#permissions", "#disclosures", "#verification", "#policies", "#reviews", "#activity", "#reports", "#account"].includes(location.hash) && !location.hash.startsWith("#context/") && !location.hash.startsWith("#instance/")) history.replaceState(null, "", "#overview");
  renderPage();
}
async function refresh() {
  workspace = await api("/api/workspace"); session.account = workspace.account;
  $("account-display").textContent = workspace.account.displayName; $("account-username").textContent = `@${workspace.account.username}`;
  $("account-avatar").textContent = workspace.account.displayName.slice(0, 1).toUpperCase();
}
const stateLabel = (state) => ({ in_review: "In review", active: "Active", validated: "Validated", draft: "Draft", retired: "Retired", revoked: "Revoked" }[state] ?? state);
function title(name, description, action = "") { return `<header class="product-title"><div><h1>${name}</h1><p>${description}</p></div>${action}</header>`; }
function empty(message, action = "") { return `<div class="empty"><p>${message}</p>${action}</div>`; }
function recentActivity() {
  return `<div class="recent-list">${workspace.activity.slice(0, 6).map((event) => `<article><span class="timeline-dot" aria-hidden="true"></span><span>${html(event.label)}</span><time>${formatUnix(event.at)}</time></article>`).join("") || empty("No recent changes.")}</div>`;
}
function renderWorkflowResults() {
  const items = filterWorkflows(workspace.blueprints, workflowQuery, workflowState);
  $("workflow-results").innerHTML = libraryCards(items);
}
function renderPage() {
  if (!session || !workspace) return;
  const page = location.hash.slice(1) || "overview";
  const activity = ["activity", "reports"].includes(page);
  $("product-page").hidden = activity; $("activity-shell").hidden = !activity;
  $("update-status").hidden = !activity; $("refresh-button").hidden = !activity;
  enableActivity(activity);
  document.querySelectorAll("[data-page]").forEach((link) => { const active = link.dataset.page === page || ((page.startsWith("context/") || page.startsWith("instance/") || page === "workspace") && link.dataset.page === "overview") || (["policies","workflows"].includes(page) && link.dataset.page === "library") || (page === "reports" && link.dataset.page === "activity"); link.classList.toggle("active", active); if (active) link.setAttribute("aria-current", "page"); else link.removeAttribute("aria-current"); });
  const label = { overview: "Contexts", library:"Context library", permissions:"Permissions",disclosures:"Disclosures",verification:"Verification",policies:"Context library",workspace:"Contexts",reviews:"Policy reviews",account:"Account",activity:"On-chain history",reports:"Reports" }[page] ?? "Context";
  $("section-name").textContent = label; document.title = `${label} · Permio`;
  $("main-content").setAttribute("aria-busy", "false");
  if (activity) { setActivityPage(); loadDashboard(); return; }
  if (page === "account") { renderAccount(); return; }
  if (page.startsWith("instance/")) {
    const item = workspace.instances.find((candidate) => candidate.id === page.slice(9));
    $("product-page").innerHTML = '<a class="context-back" href="#overview">Contexts</a>' + (item ? title(html(item.name), "Created from a reusable context template.") + instanceDefinition(item) : empty("Context not found in your workspace."));
    return;
  }
  if (contextView?.isPage(page)) { contextView.render(page).catch((error) => notify(error.message)); return; }
  if (page === "workspace") {
    $("product-page").innerHTML = title("Runs", "Access and activities shared with you.") +
      `<section>${instanceCards(workspace.instances)}</section>`;
    return;
  }
  const reviews = page === "reviews";
  const items = reviews ? workspace.blueprints.filter((item) => item.myRole !== "author" && ["in_review", "active"].includes(item.state)) : workspace.blueprints;
  const button = `<button type="button" class="button primary" id="new-blueprint"><span aria-hidden="true">＋</span> New template</button>`;
  $("product-page").innerHTML = title(reviews ? "Policy reviews" : "Context library", reviews ? "Templates shared with you for review and approval." : "Define reusable contexts, review their boundaries, and create configured instances.", reviews ? "" : button) +
    (reviews ? libraryCards(items) : `<div class="filters workflow-filters"><label class="search-field"><span class="sr-only">Search templates</span><input id="workflow-search" type="search" value="${html(workflowQuery)}" placeholder="Search templates, contexts or actions" /></label><label class="status-filter"><span class="sr-only">Template status</span><select id="workflow-status">${[["all","All statuses"],["draft","Drafts"],["in_review","In review"],["active","Active"],["retired","Retired"],["revoked","Revoked"]].map(([value, label]) => `<option value="${value}" ${value === workflowState ? "selected" : ""}>${label}</option>`).join("")}</select></label></div><div id="workflow-results" aria-live="polite"></div>`);
  if (!reviews) renderWorkflowResults();
}
function openDialog(name, content) {
  $("product-dialog-title").textContent = name; $("product-dialog-content").innerHTML = content; $("dialog-error").hidden = true;
  if (!$("product-dialog").open) $("product-dialog").showModal();
}
function field(label, name, value = "", extra = "") { return `<label>${label}<input name="${name}" value="${html(value)}" ${extra} required /></label>`; }
async function chooseContextTemplate() {
  const revision = navigationRevision;
  await refresh();
  if (revision !== navigationRevision) { renderPage(); return; }
  librarySelectionQuery = "";
  openDialog("New context", '<p class="description">Choose an active template from your library. Its assigned run manager can configure a new context.</p><label class="product-form">Search templates<input type="search" id="library-select-search" placeholder="Name, context or action" /></label><div id="library-selection-results"></div><div class="form-actions"><button type="button" class="button secondary" id="new-blueprint">Create a new template</button></div>');
  renderLibrarySelection();
}
function renderLibrarySelection() { $("library-selection-results").innerHTML = libraryCards(filterWorkflows(workspace.blueprints, librarySelectionQuery), { selecting:true }); }
function newBlueprint() {
  selected = null;
  openDialog("New template", '<p class="description">Define a reusable context with its participants, actions, recipients and disclosure rules.</p><div class="template-start-options"><button type="button" class="button secondary" data-template-mode="guided">Guided single-action template</button><button type="button" class="button primary" data-template-mode="definition">Edit or import a full definition</button></div>');
}
function definitionForm(item = null) {
  selected = item;
  openDialog(item ? "Edit template definition" : "New template definition", `<form id="definition-form" class="product-form"><p class="description">Define participant slots, contexts, actions, transitions and disclosure rules using the template format. ${item ? "Keep this draft’s namespace and template identity unchanged." : "Imported definitions become new drafts in your own namespace."}</p><label>Import JSON file<input type="file" id="template-import" accept=".json,application/json" /></label><label>Template definition (JSON)<textarea class="definition-editor" name="definition" rows="20" spellcheck="false" required>${html(JSON.stringify(item?.template ?? newTemplateDefinition(), null, 2))}</textarea></label><div class="form-actions"><button class="button primary">Save template draft</button><button type="button" class="button secondary" data-close>Cancel</button></div></form>`);
}
function blueprintForm() {
  selected = null;
  openDialog("New guided template", `<form id="blueprint-form" class="product-form">
    ${field("Name", "name", "", 'maxlength="100"')}
    <label>Description<textarea name="description" rows="3" maxlength="1000" required></textarea></label>
    <div class="form-grid">${field("Context", "context", "", 'placeholder="For example, temporary site access" maxlength="100"')}${field("Action", "action", "", 'placeholder="For example, enter the site" maxlength="100"')}${field("Purpose", "purpose", "", 'maxlength="160"')}${field("Recipient type", "recipientKind", "", 'placeholder="For example, site operator" maxlength="100"')}${field("Resource type", "resource", "", 'placeholder="For example, site entrance" maxlength="100"')}
    <label>Authorization valid for<select name="duration">${[[300,"5 minutes"],[900,"15 minutes"],[3600,"1 hour"],[86400,"1 day"]].map(([value,label]) => `<option value="${value}" ${value === 900 ? "selected" : ""}>${label}</option>`).join("")}</select></label></div>
    <div class="form-actions"><button class="button primary">Save template draft</button><button type="button" class="button secondary" data-close>Cancel</button></div></form>`);
}
async function details(blueprintId) {
  const item = await api(`/api/blueprints/${blueprintId}`); selected = item;
  const template = item.template, role = item.myRole;
  const author = role === "author", draft = ["draft", "validated"].includes(item.state);
  let controls = "";
  if (author && draft) controls = `<button type="button" class="button secondary" data-edit>Edit</button><button type="button" class="button primary" data-submit-review>Submit for review</button>`;
  if (role === "reviewer" && item.state === "in_review" && !item.reviewed) controls = `<button type="button" class="button primary" data-review="approve">Approve</button><button type="button" class="button secondary" data-review="reject">Reject</button>`;
  if (role === "approver" && item.state === "in_review") controls = `<button type="button" class="button primary" data-operation="activate">Activate workflow</button>`;
  if (role === "approver" && item.state === "active") controls = `<button type="button" class="button secondary" data-operation="retire">Retire workflow</button>`;
  if (role === "revoker" && ["active", "retired"].includes(item.state)) controls = `<button type="button" class="button secondary" data-revoke>Revoke workflow</button>`;
  if (role === "allocator" && item.state === "active") controls = `<button type="button" class="button primary" data-instance>Create context</button>`;
  openDialog(template.displayName, `<div class="detail-status"><span class="pill ${item.state === "active" ? "success" : ""}">${stateLabel(item.state)}</span><span>Version ${template.version} · ${html(item.owner)}</span></div><p class="description">${html(template.description)}</p>
    <dl class="plain-details template-target"><dt>Namespace</dt><dd>${html(item.target.namespace)}</dd><dt>Template</dt><dd>${html(item.target.templateId)}</dd><dt>Content hash</dt><dd>${html(item.target.templateHash)}</dd></dl>${templateDefinition(template)}
    <section class="detail-section"><h3>Review & access</h3>${Object.keys(item.roles).length ? `<dl class="plain-details">${Object.entries(item.roles).map(([role, user]) => `<dt>${html({ reviewer:"Reviewer",approver:"Approver",allocator:"Run manager",revoker:"Emergency contact" }[role])}</dt><dd>${html(user)}</dd>`).join("")}</dl>` : `<p class="muted">Assign reviewers and approval responsibilities when you submit.</p>`}${item.reviews.map((review) => `<p class="review-result">${html(review.reviewer)} · ${review.decision === "approve" ? "Approved review" : "Rejected review"} · ${formatUnix(review.at)}</p>`).join("")}</section>

    <div class="form-actions">${controls}</div>`);
}
function submitReviewForm() {
  openDialog("Submit for review", `<form id="review-assignment-form" class="product-form"><p class="description">Assign four different registered accounts. These responsibilities are limited to this workflow.</p>${field("Reviewer username", "reviewer")}${field("Approver username", "approver")}${field("Run manager username", "allocator")}${field("Emergency contact username", "revoker")}<div class="form-actions"><button class="button primary">Submit for review</button><button type="button" class="button secondary" data-back>Back</button></div></form>`);
}
function instanceForm() {
  openDialog("Create context", `<form id="instance-form" class="product-form"><p class="description">${html(selected.template.displayName)} · Version ${html(selected.target.templateVersion)}</p><p class="template-target">${html(selected.target.templateHash)}</p>${field("Context name", "name", "", 'maxlength="100"')}${field("Participant usernames", "participants", "", 'placeholder="Separate usernames with commas" maxlength="500"')}${field("Permission issuer username", "issuer", "", 'maxlength="32"')}<label>Context valid for<select name="duration"><option value="3600">1 hour</option><option value="86400">1 day</option><option value="604800">7 days</option></select></label><div class="form-actions"><button class="button primary">Create context</button><button type="button" class="button secondary" data-back>Back</button></div></form>`);
}
function renderAccount() {
  const account = session.account;
  $("product-page").innerHTML = title("Account", "Manage your profile and account security.") + `<div class="settings-grid"><section class="settings-panel"><h2>Profile</h2><form id="profile-form" class="product-form"><label>Username<input value="${html(account.username)}" disabled /></label>${field("Display name", "displayName", account.displayName, 'maxlength="80"')}<button class="button primary">Save profile</button></form></section><section class="settings-panel"><h2>Password</h2><form id="password-form" class="product-form">${field("Current password", "currentPassword", "", 'type="password" autocomplete="current-password"')}${field("New password", "newPassword", "", `type="password" minlength="${minimumPasswordLength}" maxlength="128" autocomplete="new-password"`)}<p class="muted">Changing your password signs out all devices.</p><button class="button secondary">Change password</button></form></section><section class="settings-panel"><h2>Policy management</h2><div class="account-policy-links"><a href="#policies" class="button secondary">Policies</a><a href="#reviews" class="button secondary">Policy reviews</a></div><h3>Review signing</h3><p class="description">Set up this device to approve reviews.</p><button type="button" id="enable-signing" class="button secondary">${account.reviewKey ? "Check signing on this device" : "Enable review signing"}</button></section></div>`;
}
async function signingKey(create = true) {
  const db = await new Promise((resolve,reject) => { const request = indexedDB.open("permio-device-keys",1); request.onupgradeneeded = () => request.result.createObjectStore("keys"); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(new Error("Device signing storage is unavailable.")); });
  try {
    const existing = await new Promise((resolve,reject) => { const request = db.transaction("keys").objectStore("keys").get(session.account.id); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
    if (existing) return existing;
    if (!create || session.account.reviewKey) throw new Error("Use the device where you first enabled review signing.");
    const key = await crypto.subtle.generateKey({ name:"Ed25519" },false,["sign","verify"]);
    await new Promise((resolve,reject) => { const tx = db.transaction("keys","readwrite"); tx.objectStore("keys").put(key,session.account.id); tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); });
    return key;
  } finally { db.close(); }
}
async function enableSigning() {
  const key = await signingKey(); const bytes = new Uint8Array(await crypto.subtle.exportKey("spki",key.publicKey));
  const encoded = btoa(String.fromCharCode(...bytes));
  const publicKey = `-----BEGIN PUBLIC KEY-----\n${encoded.match(/.{1,64}/g).join("\n")}\n-----END PUBLIC KEY-----`;
  await api("/api/account/review-key","POST",{ publicKey }); await refresh(); renderPage(); notify("Review signing is ready on this device.");
}
async function signReview(decision) {
  const key = await signingKey(false);
  const payload = { attestationVersion:1, ...selected.target, reviewerId:session.account.id, decision, reviewedAt:Math.floor(Date.now()/1000) };
  const canonical = JSON.stringify({ attestationVersion:1, decision, namespace:payload.namespace.normalize("NFC"), reviewedAt:payload.reviewedAt, reviewerId:payload.reviewerId.normalize("NFC"), templateHash:payload.templateHash, templateId:payload.templateId.normalize("NFC"), templateVersion:payload.templateVersion });
  const encoder = new TextEncoder(), domain = encoder.encode("permio:reviewer-attestation:v1"), body = encoder.encode(canonical);
  const message = new Uint8Array(8+domain.length+body.length), view = new DataView(message.buffer);
  view.setUint32(0,domain.length); message.set(domain,4); view.setUint32(4+domain.length,body.length); message.set(body,8+domain.length);
  const signature = btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.sign("Ed25519",key.privateKey,message)))).replaceAll("+","-").replaceAll("/","_").replaceAll("=","");
  return { domain:"permio:reviewer-attestation:v1", algorithm:"ed25519", payload, signature };
}
async function perform(operation) {
  if (busy) return; busy = true;
  const buttons = [...document.querySelectorAll("button")].filter((button) => !button.disabled); buttons.forEach((button) => { button.disabled = true; });
  try { await operation(); } catch (error) { const panel = $("product-dialog").open ? $("dialog-error") : $("auth-page").hidden ? $("toast") : $("auth-error"); panel.textContent = error.message; panel.hidden = false; }
  finally { busy = false; buttons.forEach((button) => { if (button.isConnected) button.disabled = false; }); }
}
$("login-tab").addEventListener("click", () => setAuthMode(false)); $("register-tab").addEventListener("click", () => setAuthMode(true));
$("auth-form").addEventListener("submit", (event) => { event.preventDefault(); perform(async () => { $("auth-error").hidden = true; const next = await api(registerMode ? "/api/register" : "/api/login","POST",values(event.target)); history.replaceState(null, "", "#overview"); await enter(next); }); });
$("logout-button").addEventListener("click", () => perform(async () => { await api("/api/logout","POST",{}); showAuth(); }));
$("close-product-dialog").addEventListener("click", () => $("product-dialog").close());
document.addEventListener("click", (event) => {
  const filterLink = event.target.closest("[data-workflow-filter]");
  if (filterLink) { workflowQuery = ""; workflowState = filterLink.dataset.workflowFilter; if (location.hash === "#workflows") renderPage(); }
  const button = event.target.closest("button"); if (!button) return;
  if (["new-blueprint","create-first"].includes(button.id)) newBlueprint();
  if (button.dataset.templateMode === "guided") blueprintForm();
  if (button.dataset.templateMode === "definition") definitionForm();
  if (button.dataset.librarySelect) perform(async () => {
    const item = await api(`/api/blueprints/${encodeURIComponent(button.dataset.librarySelect)}`);
    if (item.state !== "active" || item.myRole !== "allocator") throw new Error("Refresh the library and choose a template you can instantiate.");
    selected = item; instanceForm();
  });
  if (button.dataset.blueprint) perform(() => details(button.dataset.blueprint));
  if (button.hasAttribute("data-close")) $("product-dialog").close();
  if (button.hasAttribute("data-edit")) definitionForm(selected);
  if (button.hasAttribute("data-submit-review")) submitReviewForm();
  if (button.hasAttribute("data-instance")) instanceForm();
  if (button.hasAttribute("data-back")) perform(() => details(selected.id));
  if (button.id === "enable-signing") perform(enableSigning);
  if (button.hasAttribute("data-revoke")) openDialog("Revoke workflow", `<form id="revoke-form" class="product-form">${field("Reason", "reason", "", 'maxlength="500"')}<p class="description">Revocation prevents new use. Existing history is retained.</p><button class="button primary">Confirm revocation</button></form>`);
  if (button.dataset.operation || button.dataset.review) perform(async () => { const id = selected.id; const body = button.dataset.review ? { attestation:await signReview(button.dataset.review) } : {}; await api(`/api/blueprints/${id}/${button.dataset.review ? "review" : button.dataset.operation}`,"POST",body); await refresh(); renderPage(); await details(id); notify("Workflow updated."); });
});
document.addEventListener("submit", (event) => {
  const form = event.target; if (form.id === "auth-form") return;
  if (!["blueprint-form","definition-form","review-assignment-form","instance-form","profile-form","password-form","revoke-form"].includes(form.id)) return;
  event.preventDefault(); perform(async () => {
    let body = values(form); const id = selected?.id;
    if (form.id === "password-form") { await api("/api/account/password","POST",body); showAuth(); notify("Password changed. Please log in again."); return; }
    if (form.id === "profile-form") { await api("/api/account/profile","POST",body); await refresh(); renderPage(); notify("Profile saved."); return; }
    if (["blueprint-form","definition-form"].includes(form.id)) {
      if (form.id === "definition-form") {
        try { body = { template:JSON.parse(body.definition) }; }
        catch { throw new Error("Enter a valid JSON template definition."); }
      }
      const item = await api(id ? `/api/blueprints/${id}` : "/api/blueprints", id ? "PUT" : "POST", body);
      await refresh(); renderPage(); await details(item.id); notify(id ? "Template draft saved." : "Template draft created."); return;
    }
    const operation = { "review-assignment-form":"submit", "instance-form":"instances", "revoke-form":"revoke" }[form.id];
    if (operation === "instances") body.target = selected.target;
    const result = await api(`/api/blueprints/${id}/${operation}`,"POST",body);
    await refresh(); $("product-dialog").close();
    if (operation === "instances") location.hash = `instance/${result.id}`;
    else renderPage();
    notify(operation === "instances" ? "Context created." : "Workflow updated.");
  });
});
window.addEventListener("hashchange", () => { navigationRevision += 1; if ($("product-dialog").open) $("product-dialog").close(); if (session) perform(async () => { await refresh(); renderPage(); }); });
setInterval(() => { if (session && !busy && !document.hidden && !document.activeElement?.matches("input,textarea,select,[contenteditable]") && !$("product-dialog").open && ["#overview","#library","#permissions","#disclosures","#verification","#policies","#reviews"].includes(location.hash)) perform(async () => { await refresh(); renderPage(); }); }, 30_000);
document.addEventListener("input", (event) => {
  if (event.target.id === "workflow-search") { workflowQuery = event.target.value; renderWorkflowResults(); }
  if (event.target.id === "library-select-search") { librarySelectionQuery = event.target.value; renderLibrarySelection(); }
});
document.addEventListener("change", (event) => { if (event.target.id === "workflow-status") { workflowState = event.target.value; renderWorkflowResults(); } });
document.addEventListener("change", (event) => {
  if (event.target.id !== "template-import" || !event.target.files[0]) return;
  const file = event.target.files[0];
  perform(async () => {
    if (file.size > 32_768) throw new Error("Choose a template file smaller than 32,768 bytes.");
    let template;
    try { template = JSON.parse(await file.text()); }
    catch { throw new Error("The selected file must contain a JSON template definition."); }
    $("definition-form").elements.definition.value = JSON.stringify(template, null, 2);
  });
});
initializeActivity();
try { const current = await api("/api/session"); minimumPasswordLength = current.minimumPasswordLength ?? 4; if (current.authenticated) await enter(current); else showAuth(); }
catch { showAuth(); $("auth-error").textContent = "Unable to connect. Please reload the page."; $("auth-error").hidden = false; }
