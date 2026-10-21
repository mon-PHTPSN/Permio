import { LocalContextClient } from "./context-client.js";
import { CONTEXT_PROFILES, policyFor, profileById } from "./context-profiles.js";
import { formatUnix } from "./app.js";

const esc = (value) => String(value ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
const icon = (name) => {
  const paths = {
    purchase:'<path d="M5 7h14l-1 13H6L5 7Zm4 0V5a3 3 0 0 1 6 0v2"/>',
    health:'<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6V3Z"/>',
    shield:'<path d="M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6l-8-3Z"/><path d="m8 12 3 3 5-6"/>',
    lock:'<rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/>',
    person:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    clock:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
    arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>',
    close:'<path d="m6 6 12 12M6 18 18 6"/>',
  };
  return `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">${paths[name] ?? paths.shield}</svg>`;
};
const statusText = (value) => ({consent_recorded:"Consent recorded",revoked:"Revoked",expired:"Expired",pending:"Needs your consent",awaiting_verification:"Awaiting verification",declined:"Declined",cancelled:"Cancelled",not_requested:"Not requested"}[value] ?? value);
const pill = (status) => `<span class="context-status ${status}">${statusText(status)}</span>`;
const empty = (message) => `<div class="context-empty">${icon("shield")}<p>${message}</p></div>`;
const title = (heading,copy,actions="") => `<header class="context-page-title"><div><h1>${heading}</h1><p>${copy}</p></div><div class="context-page-actions">${actions}</div></header>`;
const field = (label,name,value,extra="") => `<label>${label}<input name="${name}" value="${esc(value)}" ${extra} required /></label>`;
const avatar = (name,color="blue") => `<span class="recipient-avatar ${color}" aria-hidden="true">${esc(name.slice(0,1).toUpperCase())}</span>`;

export class ContextInterface {
  constructor({account,root,openDialog,notify,run,client}) {
    this.account = account; this.root = root; this.dialog = openDialog; this.notify = notify; this.run = run;
    this.client = client ?? new LocalContextClient({accountId:account.id,storage:localStorage});
    this.permissionFilter = "current"; this.requestFilter = "pending"; this.query = ""; this.page = "overview";
    this.disposed = false; this.renderSequence = 0;
    this.onClick = (event) => {
      const button = event.target.closest("[data-ctx]");
      if (button) this.run(() => this.action(button.dataset.ctx,button.dataset.id,button));
    };
    this.onSubmit = (event) => {
      if (!event.target.id.startsWith("ctx-")) return;
      event.preventDefault(); this.run(() => this.submit(event.target));
    };
    this.onChange = (event) => {
      if (event.target.id === "ctx-permission-context") this.permissionForm(event.target.value);
      if (event.target.id === "ctx-permission-status") { this.permissionFilter = event.target.value; this.renderPermissionRows(); }
      if (event.target.id === "ctx-permission-search") { this.query = event.target.value; this.renderPermissionRows(); }
    };
    document.addEventListener("click",this.onClick);
    document.addEventListener("submit",this.onSubmit);
    document.addEventListener("change",this.onChange);
    document.addEventListener("input",this.onChange);
  }
  dispose() {
    this.disposed = true; this.renderSequence++;
    this.client.dispose(); this.state = null; this.lastInput = null;
    document.removeEventListener("click",this.onClick);
    document.removeEventListener("submit",this.onSubmit);
    document.removeEventListener("change",this.onChange);
    document.removeEventListener("input",this.onChange);
  }
  isPage(page) { return ["overview","permissions","disclosures","verification"].includes(page) || page.startsWith("context/"); }
  context(id) { const item = this.state.contexts.find((item) => item.id === id); if (!item) throw new Error("Context not found."); return item; }
  caseFor(context) { return this.state.cases.find((item) => item.id === context.caseId); }
  async render(page = this.page) {
    this.page = page;
    const sequence = ++this.renderSequence, state = await this.client.list();
    if (this.disposed || sequence !== this.renderSequence) return;
    this.state = state;
    const count = this.state.requests.filter((item) => item.status === "pending").length;
    document.getElementById("disclosure-count").textContent = count;
    document.getElementById("disclosure-count").hidden = count === 0;
    if (page.startsWith("context/")) this.renderContext(page.slice(8));
    else if (page === "permissions") this.renderPermissions();
    else if (page === "disclosures") this.renderDisclosures();
    else if (page === "verification") this.renderVerification();
    else this.renderOverview();
  }
  caseCard(item) {
    const profile = profileById(item.profileId), contexts = this.state.contexts.filter((context) => context.caseId === item.id);
    const permissions = this.state.permissions.filter((permission) => contexts.some((context) => context.id === permission.contextId) && permission.status === "consent_recorded");
    return `<article class="context-family ${profile.color}"><div class="family-heading"><span class="family-icon">${icon(profile.symbol)}</span><span>${esc(profile.name)}</span><span class="family-count">${contexts.length} contexts</span></div><h2>${esc(item.title)}</h2><p>${esc(profile.description)}</p><div class="context-orbits" aria-label="Separate contexts">${contexts.map((context,index) => `<a href="#context/${context.id}" class="context-orbit orbit-${index}"><span>${icon(context.policyId === "regulatory" ? "shield" : context.policyId === "research" ? "lock" : "person")}</span><strong>${esc(context.name)}</strong><small>Open context</small></a>`).join("")}</div><footer><span>${permissions.length} ${permissions.length === 1 ? "permission" : "permissions"} recorded</span><button type="button" data-ctx="case" data-id="${contexts[0].id}" class="family-open" aria-label="Open ${esc(item.title)}">${icon("arrow")}</button></footer></article>`;
  }
  requestCard(request) {
    const context = this.context(request.contextId), profile = profileById(context.profileId);
    return `<article class="consent-request"><div class="recipient-line">${avatar(request.recipient,profile.color)}<div><h3>${esc(request.recipient)}</h3><span>${esc(context.name)}</span></div></div><p>${esc(request.purpose)}</p><footer><span>${request.claims.length} ${request.claims.length === 1 ? "claim" : "claims"}</span><button type="button" class="button secondary" data-ctx="request" data-id="${request.id}">Review request</button></footer></article>`;
  }
  permissionRow(permission) {
    const context = this.context(permission.contextId), policy = policyFor(context), visible = policy.claims.filter((claim) => permission.claims.includes(claim.id));
    return `<button type="button" class="permission-row" data-ctx="permission" data-id="${permission.id}"><span class="recipient-line">${avatar(permission.authorizedParty,profileById(context.profileId).color)}<span><strong>${esc(permission.authorizedParty)}</strong><small>${esc(this.caseFor(context).title)}</small></span></span><span class="permission-scope"><strong>${esc(context.name)}</strong><small>${visible.map((item) => esc(item.label)).join(", ")}</small></span><span class="permission-expiry">${icon("clock")}${formatUnix(permission.expiresAt)}</span><span>${pill(permission.status)}</span><span class="row-chevron" aria-hidden="true">›</span></button>`;
  }
  permissionTable(items) {
    return items.length ? `<div class="permission-heading" aria-hidden="true"><span>Authorized party</span><span>Context & information</span><span>Until</span><span>Consent</span><span></span></div><div class="permission-list">${items.map((item) => this.permissionRow(item)).join("")}</div>` : empty("No permissions in this view.");
  }
  renderOverview() {
    const requests = this.state.requests.filter((item) => item.status === "pending");
    const current = this.state.permissions.filter((item) => item.status === "consent_recorded");
    this.root.innerHTML = title("Your contexts","Review access and disclosure requests.",'<button type="button" class="button primary" data-ctx="new-context"><span aria-hidden="true">＋</span> New context</button>') +
      `<div class="context-families">${this.state.cases.map((item) => this.caseCard(item)).join("")}</div>
      <div class="context-overview-grid"><section class="authority-panel"><header class="section-head"><div><h2>Who has permission</h2><p>Authority is limited to the context shown.</p></div><a href="#permissions" class="subtle-link">View all</a></header>${this.permissionTable(current.slice(0,4))}</section>
      <aside class="request-panel"><header class="section-head"><h2>Needs your consent</h2><span class="request-count">${requests.length}</span></header>${requests.slice(0,3).map((item) => this.requestCard(item)).join("") || empty("No requests need your consent.")}</aside></div>
      <section class="context-recent"><header class="section-head"><h2>Recent changes</h2><a href="#verification" class="subtle-link">Verification history</a></header>${this.historyRows(this.state.history.slice(0,4))}</section>`;
  }
  historyRows(events) {
    return events.length ? `<div class="context-history">${events.map((event) => `<article><span class="event-icon">${icon(event.kind === "revocation" ? "close" : event.kind === "verification" ? "shield" : "clock")}</span><div><strong>${esc(event.label)}</strong><small>${esc(this.context(event.contextId).name)}</small></div><time>${formatUnix(event.at)}</time></article>`).join("")}</div>` : '<p class="quiet-empty">Your consent and access changes will appear here.</p>';
  }
  renderContext(id) {
    const context = this.context(id), policy = policyFor(context), item = this.caseFor(context), profile = profileById(context.profileId);
    const permissions = this.state.permissions.filter((permission) => permission.contextId === id);
    const siblings = this.state.contexts.filter((sibling) => sibling.caseId === context.caseId);
    this.root.innerHTML = `<a href="#overview" class="context-back">Contexts / ${esc(item.title)}</a>` +
      title(esc(context.name),esc(policy.purpose),`<button type="button" class="button secondary" data-ctx="${context.policyId === "reputation" ? "review" : "compose"}" data-id="${id}">${context.policyId === "reputation" ? "Write review" : "Prepare disclosure"}</button><button type="button" class="button primary" data-ctx="grant" data-id="${id}">Grant permission</button>`) +
      `<nav class="context-tabs" aria-label="Contexts in ${esc(item.title)}">${siblings.map((sibling) => `<a href="#context/${sibling.id}" ${sibling.id === id ? 'aria-current="page" class="active"' : ""}>${esc(sibling.name)}</a>`).join("")}</nav>
      <div class="context-detail-grid"><div><section class="authority-panel"><header class="section-head"><h2>Permissions in this context</h2></header>${this.permissionTable(permissions)}</section><section class="context-records"><header class="section-head"><h2>Information used</h2></header><article>${icon("lock")}<div><strong>${esc(policy.record)}</strong><p>The recipient sees only the information listed in your disclosure.</p></div></article><h3>Conditions</h3><ul>${policy.conditions.map((condition) => `<li>${esc(condition)}</li>`).join("")}</ul></section></div>
      <aside class="disclosure-boundary ${profile.color}"><header><span>${icon("shield")}</span><h2>Disclosure boundary</h2></header><div class="boundary-relationship"><span class="boundary-you">You</span><span class="boundary-line" aria-hidden="true"></span>${avatar(policy.recipient,profile.color)}</div><p class="boundary-recipient">${esc(policy.recipient)}</p><section><h3>May receive</h3><ul class="claim-list">${policy.claims.map((claim) => `<li>${icon("arrow")}${esc(claim.label)}</li>`).join("")}</ul></section><section class="kept-private"><h3>${icon("lock")} Stays private</h3><ul>${policy.hidden.map((label) => `<li>${esc(label)}</li>`).join("")}</ul></section><section><h3>Verification required</h3><ul class="verification-checks">${policy.checks.map((label) => `<li><span class="pending-ring" aria-hidden="true"></span>${esc(label)}</li>`).join("")}</ul></section></aside></div>`;
  }
  renderPermissions() {
    this.root.innerHTML = title("Permissions","See who may act, what they may use, and when consent ends.",'<button type="button" class="button primary" data-ctx="grant">Grant permission</button>') +
      `<div class="filters"><label class="search-field"><span class="sr-only">Search permissions</span><input type="search" id="ctx-permission-search" placeholder="Search a party or context" value="${esc(this.query)}" /></label><label class="status-filter"><span class="sr-only">Permission status</span><select id="ctx-permission-status">${[["current","Current consent"],["all","All permissions"],["revoked","Revoked"],["expired","Expired"]].map(([value,label]) => `<option value="${value}" ${this.permissionFilter === value ? "selected" : ""}>${label}</option>`).join("")}</select></label></div><section class="authority-panel" id="ctx-permission-results" aria-live="polite"></section>`;
    this.renderPermissionRows();
  }
  renderPermissionRows() {
    const term = this.query.toLowerCase().trim();
    const items = this.state.permissions.filter((permission) => (this.permissionFilter === "all" || permission.status === (this.permissionFilter === "current" ? "consent_recorded" : this.permissionFilter)) &&
      (!term || [permission.recipient,permission.authorizedParty,this.context(permission.contextId).name,this.caseFor(this.context(permission.contextId)).title].join(" ").toLowerCase().includes(term)));
    document.getElementById("ctx-permission-results").innerHTML = this.permissionTable(items);
  }
  renderDisclosures() {
    const items = this.state.requests.filter((item) => this.requestFilter === "all" || item.status === this.requestFilter);
    this.root.innerHTML = title("Disclosures","Review the recipient, information, purpose, and any new links before consenting.") +
      `<div class="disclosure-tabs" aria-label="Disclosure status">${[["pending","Needs consent"],["awaiting_verification","Awaiting verification"],["all","All requests"]].map(([value,label]) => `<button type="button" data-ctx="filter-requests" data-id="${value}" class="${this.requestFilter === value ? "active" : ""}" aria-pressed="${this.requestFilter === value}">${label}</button>`).join("")}</div><div class="disclosure-request-grid">${items.map((request) => request.status === "pending" ? this.requestCard(request) : `<article class="consent-request"><div class="recipient-line">${avatar(request.recipient)}<div><h3>${esc(request.recipient)}</h3><span>${esc(this.context(request.contextId).name)}</span></div></div><p>${esc(request.purpose)}</p><footer>${pill(request.status)}<time>${formatUnix(request.createdAt)}</time></footer></article>`).join("") || empty("No disclosure requests in this view.")}</div>`;
  }
  renderVerification() {
    this.root.innerHTML = title("Verification","Consent, proof status, and delivery are separate.",'<a href="#activity" class="button secondary">On-chain history</a>') +
      `<section class="verification-list">${this.state.permissions.map((permission) => {
        const context = this.context(permission.contextId);
        return `<article class="verification-item"><span class="verification-icon">${icon("shield")}</span><div><h2>${esc(permission.recipient)}</h2><p>${esc(context.name)}</p><div class="verification-stages"><span><i class="${permission.status === "consent_recorded" ? "recorded" : ""}" aria-hidden="true"></i>${permission.status === "consent_recorded" ? "Consent recorded" : statusText(permission.status)}</span><span><i aria-hidden="true"></i>Proof: ${permission.proofStatus === "pending" ? "Awaiting verification" : permission.proofStatus === "cancelled" ? "Cancelled" : "Not requested"}</span><span><i aria-hidden="true"></i>Delivery: Not sent</span></div></div>${permission.status === "consent_recorded" && permission.proofStatus === "not_requested" ? `<button type="button" class="button secondary" data-ctx="verify" data-id="${permission.id}">Request verification</button>` : pill(permission.proofStatus === "pending" ? "awaiting_verification" : permission.status)}</article>`;
      }).join("") || empty("Record a permission to begin verification.")}</section><section class="context-recent"><header class="section-head"><h2>History</h2></header>${this.historyRows(this.state.history)}</section>`;
  }
  newContext(profileId) {
    if (!profileId) {
      this.dialog("New context",`<div class="context-type-picker">${CONTEXT_PROFILES.map((profile) => `<button type="button" data-ctx="choose-profile" data-id="${profile.id}" class="${profile.color}"><span class="family-icon">${icon(profile.symbol)}</span><h3>${profile.name}</h3><p>${profile.description}</p><span>${profile.contexts.map((context) => context.name).join(" / ")}</span></button>`).join("")}</div>`);
      return;
    }
    const profile = profileById(profileId);
    this.dialog("New context",`<form id="ctx-new-case" class="product-form"><input type="hidden" name="profileId" value="${profile.id}" />${field("Name","title",profile.defaultTitle,'maxlength="100"')}<div class="selected-contexts">${profile.contexts.map((context) => `<span>${icon("lock")}${context.name}</span>`).join("")}</div><div class="form-actions"><button class="button primary">Create context</button><button type="button" class="button secondary" data-close>Cancel</button></div></form>`);
  }
  permissionForm(id,previous = null,disclosure = false) {
    const context = this.context(id || this.state.contexts.find((item) => item.policyId === "support").id), policy = policyFor(context);
    this.dialog(disclosure ? "Prepare disclosure" : "Grant permission",`<form id="${disclosure ? "ctx-disclosure" : "ctx-permission"}" class="product-form"><label>Context<select name="contextId" id="${disclosure ? "ctx-disclosure-context" : "ctx-permission-context"}" ${disclosure ? "disabled" : ""}>${this.state.contexts.map((item) => `<option value="${item.id}" ${context.id === item.id ? "selected" : ""}>${esc(this.caseFor(item).title)} / ${esc(item.name)}</option>`).join("")}</select></label>${disclosure ? `<input type="hidden" name="contextId" value="${context.id}" />` : ""}
      ${!disclosure ? field("Authorized party","authorizedParty",previous?.authorizedParty ?? (policy.public ? "You" : policy.recipient),`maxlength="120" ${policy.public ? "readonly" : ""}`) : ""}
      ${field("Information recipient","recipient",previous?.recipient ?? policy.recipient,`maxlength="120" ${policy.public ? "readonly" : ""}`)}
      <div class="form-grid">${field("Purpose","purpose",policy.purpose,"readonly")}<label>Valid for<select name="duration">${[[3600,"1 hour"],[86400,"1 day"],[604800,"7 days"]].map(([value,label]) => `<option value="${value}" ${Number(previous?.duration ?? 86400) === value ? "selected" : ""}>${label}</option>`).join("")}</select></label></div>
      <fieldset class="information-options"><legend>Information the recipient may receive</legend>${policy.claims.map((claim) => `<label><input type="checkbox" name="claims" value="${claim.id}" ${!previous || previous.claims.includes(claim.id) ? "checked" : ""} ${policy.requiredClaims.includes(claim.id) ? "disabled" : ""} /><span>${claim.label}${policy.requiredClaims.includes(claim.id) ? '<small>Required for this action</small>' : ""}</span>${policy.requiredClaims.includes(claim.id) ? `<input type="hidden" name="claims" value="${claim.id}" />` : ""}</label>`).join("")}</fieldset>
      <p class="form-scope-note">${icon("lock")} No onward delegation</p><div class="form-actions"><button class="button primary">Preview ${disclosure ? "disclosure" : "permission"}</button><button type="button" class="button secondary" data-close>Cancel</button></div></form>`);
  }
  reviewForm(id) {
    const context = this.context(id);
    this.dialog("Write review",`<form id="ctx-review" class="product-form"><input type="hidden" name="contextId" value="${context.id}" /><label>Rating<select name="rating" required><option value="">Choose a rating</option>${[5,4,3,2,1].map((rating) => `<option value="${rating}">${rating} ${rating === 1 ? "star" : "stars"}</option>`).join("")}</select></label><label>Review<textarea name="review_text" rows="5" maxlength="4000" required></textarea></label><div class="form-actions"><button class="button primary">Preview review</button><button type="button" class="button secondary" data-close>Cancel</button></div></form>`);
  }
  previewDialog(preview) {
    this.activePreview = preview;
    this.dialog(preview.kind === "permission" ? "Permission preview" : "Disclosure preview",`<div class="preview-recipient">${avatar(preview.recipient)}<div><span>Information recipient</span><h3>${esc(preview.recipient)}</h3></div></div>
      <dl class="preview-bindings"><div><dt>Context</dt><dd>${esc(preview.caseTitle)} / ${esc(preview.contextName)}</dd></div><div><dt>Authorized party</dt><dd>${esc(preview.authorizedParty)}</dd></div><div><dt>Action</dt><dd>${esc(preview.action)}</dd></div><div><dt>Purpose</dt><dd>${esc(preview.purpose)}</dd></div><div><dt>Until</dt><dd>${formatUnix(preview.expiresAt)}</dd></div><div><dt>Delegation</dt><dd>Not permitted</dd></div></dl>
      <div class="preview-columns"><section><h3>Will be visible</h3><ul class="claim-list">${preview.visible.map((claim) => `<li>${icon("arrow")}${esc(claim.label)}</li>`).join("")}</ul>${preview.review ? `<div class="review-preview"><strong>${preview.review.rating} / 5</strong><p>${esc(preview.review.review_text)}</p></div>` : ""}</section><section class="kept-private"><h3>${icon("lock")} Stays private</h3><ul>${preview.hidden.map((label) => `<li>${esc(label)}</li>`).join("")}</ul></section></div>
      <form id="ctx-confirm" class="product-form"><input type="hidden" name="previewId" value="${preview.id}" /><input type="hidden" name="kind" value="${preview.kind}" />${preview.bridge ? `<div class="linkage-consent"><h3>This creates a new link</h3><p>The selected purchase, review, and support records will be linked only for ${esc(preview.recipient)}. The merchant and public do not receive this link.</p><label><input type="checkbox" name="bridgeConsent" required /><span>I authorize this recipient-specific link.</span></label></div>` : '<p class="form-scope-note">'+icon("lock")+' No cross-context link is created.</p>'}<div class="form-actions"><button class="button primary">Confirm consent</button><button type="button" class="button secondary" data-close>Cancel</button></div></form>`);
  }
  async permissionDetails(id) {
    this.state = await this.client.list();
    const permission = this.state.permissions.find((item) => item.id === id);
    if (!permission) throw new Error("Permission not found.");
    const context = this.context(permission.contextId), policy = policyFor(context);
    this.dialog("Permission details",`<div class="permission-person">${avatar(permission.authorizedParty)}<div><h3>${esc(permission.authorizedParty)}</h3><p>${esc(context.name)}</p></div>${pill(permission.status)}</div><dl class="preview-bindings"><div><dt>Authority source</dt><dd>${permission.authoritySource}</dd></div><div><dt>Authorized action</dt><dd>${esc(permission.action)}</dd></div><div><dt>Information recipient</dt><dd>${esc(permission.recipient)}</dd></div><div><dt>Purpose</dt><dd>${esc(permission.purpose)}</dd></div><div><dt>Until</dt><dd>${formatUnix(permission.expiresAt)}</dd></div><div><dt>Delegation</dt><dd>Not permitted</dd></div><div><dt>Proof</dt><dd>${permission.proofStatus === "pending" ? "Awaiting verification" : statusText(permission.proofStatus)}</dd></div></dl><h3 class="detail-heading">Permitted information</h3><ul class="claim-list">${policy.claims.filter((claim) => permission.claims.includes(claim.id)).map((claim) => `<li>${icon("arrow")}${claim.label}</li>`).join("")}</ul>${permission.status === "consent_recorded" ? `<div class="form-actions">${permission.proofStatus === "not_requested" ? `<button type="button" class="button secondary" data-ctx="verify" data-id="${id}">Request verification</button>` : ""}<button type="button" class="button danger" data-ctx="revoke-confirm" data-id="${id}">Revoke consent</button></div>` : ""}`);
  }
  async action(action,id,button) {
    if (action === "new-context") this.newContext();
    else if (action === "choose-profile") this.newContext(id);
    else if (action === "case") location.hash = `context/${id}`;
    else if (action === "grant") this.permissionForm(id);
    else if (action === "compose") this.permissionForm(id,null,true);
    else if (action === "review") this.reviewForm(id);
    else if (action === "permission") await this.permissionDetails(id);
    else if (action === "filter-requests") { this.requestFilter = id; this.renderDisclosures(); }
    else if (action === "request") {
      const preview = await this.client.previewDisclosure({requestId:id}); this.previewDialog(preview);
      document.getElementById("product-dialog-content").insertAdjacentHTML("beforeend",`<button type="button" class="text-link decline-request" data-ctx="decline" data-id="${id}">Decline request</button>`);
    } else if (action === "decline") {
      await this.client.declineDisclosure(id); this.closeDialog(); await this.render(); this.notify("Disclosure request declined.");
    } else if (action === "revoke-confirm") {
      const permission = this.state.permissions.find((item) => item.id === id);
      this.dialog("Revoke consent",`<div class="revoke-summary">${avatar(permission.authorizedParty)}<h3>${esc(permission.authorizedParty)}</h3><p>${esc(this.context(permission.contextId).name)}</p><p>Information recipient: ${esc(permission.recipient)}</p></div><p class="description">Stop future access under this permission. Information already received cannot be taken back.</p><div class="form-actions"><button type="button" class="button danger" data-ctx="revoke" data-id="${id}">Revoke consent</button><button type="button" class="button secondary" data-close>Keep consent</button></div>`);
    } else if (action === "revoke") {
      await this.client.revokePermission(id); this.closeDialog(); await this.render(); this.notify("Consent revoked.");
    } else if (action === "verify") {
      await this.client.requestVerification(id); this.closeDialog(); await this.render(); this.notify("Verification requested.");
    }
  }
  closeDialog() { document.getElementById("product-dialog").close(); this.activePreview = null; }
  async submit(form) {
    const data = new FormData(form), input = Object.fromEntries(data);
    if (form.id === "ctx-new-case") {
      const item = await this.client.createContext(input); this.state = await this.client.list();
      const context = this.state.contexts.find((context) => context.caseId === item.id);
      this.closeDialog(); location.hash = `context/${context.id}`; this.notify("Context created."); return;
    }
    if (["ctx-permission","ctx-disclosure"].includes(form.id)) {
      input.claims = data.getAll("claims"); this.lastInput = input;
      if (form.id === "ctx-permission") this.previewDialog(await this.client.previewPermission(input));
      else { const request = await this.client.createDisclosure(input); this.state = await this.client.list(); this.previewDialog(await this.client.previewDisclosure({requestId:request.id})); }
    }
    if (form.id === "ctx-review") {
      const request = await this.client.createDisclosure({contextId:input.contextId,recipient:"Public",claims:["rating","review_text","purchase_eligibility"],duration:86400,review:{rating:Number(input.rating),review_text:input.review_text}});
      this.state = await this.client.list(); this.previewDialog(await this.client.previewDisclosure({requestId:request.id}));
    }
    if (form.id === "ctx-confirm") {
      if (input.kind === "permission") await this.client.confirmPermission(input.previewId,data.has("bridgeConsent"));
      else await this.client.approveDisclosure(input.previewId,data.has("bridgeConsent"));
      this.closeDialog(); await this.render(); this.notify(input.kind === "permission" ? "Permission consent recorded." : "Disclosure consent recorded. Awaiting verification.");
    }
  }
}
