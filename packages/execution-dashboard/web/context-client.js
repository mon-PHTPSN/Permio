import { CONTEXT_PROFILES, policyFor, profileById } from "./context-profiles.js";

const clone = (value) => structuredClone(value);
const clean = (value, label, limit = 120) => {
  if (typeof value !== "string" || !value.trim() || value.length > limit) throw new Error(`Enter a valid ${label}.`);
  return value.trim().normalize("NFC");
};

export function permissionState(permission, now = Math.floor(Date.now()/1000)) {
  return permission.revokedAt !== null ? "revoked" : permission.expiresAt <= now ? "expired" : "consent_recorded";
}

export class LocalContextClient {
  constructor({ accountId, storage, now = () => Math.floor(Date.now()/1000), makeId = () => crypto.randomUUID() }) {
    this.accountId = clean(accountId, "account", 100);
    this.storage = storage;
    this.now = now;
    this.makeId = makeId;
    this.key = `permio:context-preview:v1:${accountId}`;
    this.previews = new Map();
    const saved = storage.getItem(this.key);
    if (saved) {
      try {
        this.state = JSON.parse(saved);
        if (this.state.schemaVersion !== 1 || this.state.accountId !== this.accountId ||
          !["cases","contexts","permissions","requests","history"].every((key) => Array.isArray(this.state[key]))) throw new Error();
      } catch { throw new Error("Saved context data cannot be opened in this browser."); }
    } else {
      this.state = { schemaVersion:1, accountId, revision:0, cases:[], contexts:[], permissions:[], requests:[], history:[] };
      for (const profile of CONTEXT_PROFILES) this.addCase(profile.id, profile.defaultTitle, false);
      for (const context of this.state.contexts.filter((item) => ["support","research"].includes(item.policyId))) {
        const policy = policyFor(context);
        this.state.requests.push({ id:this.makeId(), contextId:context.id, recipient:policy.recipient, purpose:policy.purpose,
          claims:policy.claims.map((item) => item.id), duration:86400, status:"pending", createdAt:this.now(), review:null });
      }
      const treatment = this.state.contexts.find((item) => item.policyId === "treatment");
      const policy = policyFor(treatment);
      this.state.permissions.push({ id:this.makeId(), contextId:treatment.id, authorizedParty:policy.recipient,
        recipient:policy.recipient, action:policy.action, purpose:policy.purpose, claims:["observations"],
        notBefore:this.now(), expiresAt:this.now()+86400, recordedAt:this.now(), revokedAt:null, delegationAllowed:false,
        authoritySource:"Your consent", proofStatus:"not_requested", proof:null, receipt:null, execution:null });
      this.save();
    }
  }
  save() {
    try { this.storage.setItem(this.key, JSON.stringify(this.state)); }
    catch { throw new Error("Changes could not be saved. Check this browser’s storage and try again."); }
  }
  synchronize(rejectChanges = false) {
    let latest;
    try {
      latest = JSON.parse(this.storage.getItem(this.key));
      if (!latest || latest.schemaVersion !== 1 || latest.accountId !== this.accountId || !Number.isSafeInteger(latest.revision) ||
        !["cases","contexts","permissions","requests","history"].every((key) => Array.isArray(latest[key]))) throw new Error();
    } catch { throw new Error("Saved context data cannot be opened in this browser."); }
    if (latest.revision !== this.state.revision) {
      this.state = latest; this.previews.clear();
      if (rejectChanges) throw new Error("This context changed in another tab. Review it again.");
    }
  }
  commit(operation) {
    this.synchronize(true);
    const previous = clone(this.state);
    try { const result = operation(); this.state.revision++; this.save(); return clone(result); }
    catch (error) { this.state = previous; throw error; }
  }
  context(id) {
    const result = this.state.contexts.find((item) => item.id === id);
    if (!result) throw new Error("Context not found.");
    return result;
  }
  permission(id) {
    const result = this.state.permissions.find((item) => item.id === id);
    if (!result) throw new Error("Permission not found.");
    return result;
  }
  log(label, contextId, kind = "consent") {
    this.state.history.unshift({ id:this.makeId(), contextId, label, kind, at:this.now() });
  }
  addCase(profileId, title, recordHistory = true) {
    const profile = profileById(profileId), caseId = this.makeId();
    const item = { id:caseId, profileId, title:clean(title,"context name",100), createdAt:this.now() };
    this.state.cases.push(item);
    const contexts = profile.contexts.map((policy) => ({ id:this.makeId(), caseId, profileId, policyId:policy.id, name:policy.name }));
    this.state.contexts.push(...contexts);
    if (recordHistory) this.log(`Created ${item.title}`,contexts[0].id,"context");
    return item;
  }
  async list() {
    this.synchronize();
    return clone({ ...this.state, permissions:this.state.permissions.map((item) => ({ ...item,status:permissionState(item,this.now()) })) });
  }
  async createContext(input) {
    return this.commit(() => this.addCase(input.profileId,input.title));
  }
  preview(input, kind, requestId = null) {
    const context = this.context(input.contextId), policy = policyFor(context);
    const recipient = clean(input.recipient,"recipient");
    const authorizedParty = clean(input.authorizedParty ?? (policy.public ? "You" : recipient),"authorized party");
    if (policy.public && recipient !== "Public") throw new Error("A product review is addressed to the public.");
    if (policy.public && authorizedParty !== "You") throw new Error("Only you can publish this review.");
    const duration = Number(input.duration);
    if (!Number.isInteger(duration) || duration < 300 || duration > policy.maxDuration) throw new Error("Choose a validity period within this context’s limit.");
    const allowed = policy.claims.map((item) => item.id);
    if (!Array.isArray(input.claims) || !input.claims.length || input.claims.some((id) => !allowed.includes(id)) || new Set(input.claims).size !== input.claims.length) throw new Error("Select only the information allowed in this context.");
    if (policy.requiredClaims.some((id) => !input.claims.includes(id))) throw new Error("Include all information required for this action.");
    if (input.purpose !== undefined && input.purpose !== policy.purpose) throw new Error("The purpose must match this context.");
    let review = null;
    if (context.policyId === "reputation" && kind === "disclosure") {
      if (!input.review || Object.keys(input.review).sort().join(",") !== "rating,review_text" ||
        !Number.isInteger(Number(input.review.rating)) || Number(input.review.rating) < 1 || Number(input.review.rating) > 5) throw new Error("Choose a rating from 1 to 5.");
      review = { rating:Number(input.review.rating), review_text:clean(input.review.review_text,"review text",4000) };
      if (!["rating","review_text","purchase_eligibility"].every((id) => input.claims.includes(id))) throw new Error("A review must include its rating, text, and purchase eligibility check.");
    }
    const result = {
      id:this.makeId(), revision:this.state.revision, kind, requestId, contextId:context.id, contextName:context.name,
      caseTitle:this.state.cases.find((item) => item.id === context.caseId).title, recipient, authorizedParty,
      action:policy.action, purpose:policy.purpose, claims:[...input.claims], review,
      visible:policy.claims.filter((item) => input.claims.includes(item.id)),
      hidden:[...policy.hidden,...policy.claims.filter((item) => !input.claims.includes(item.id)).map((item) => item.label)],
      checks:[...policy.checks], bridge:policy.bridge, delegationAllowed:false,
      notBefore:this.now(), expiresAt:this.now()+duration, confirmBefore:this.now()+300,
    };
    this.previews.set(result.id,clone(result));
    return clone(result);
  }
  async previewPermission(input) { return this.preview(input,"permission"); }
  async previewDisclosure(input) {
    const request = this.state.requests.find((item) => item.id === input.requestId);
    if (!request || request.status !== "pending") throw new Error("This request is no longer waiting for consent.");
    return this.preview({ ...request, ...input,contextId:request.contextId,recipient:request.recipient,purpose:request.purpose,claims:request.claims,review:request.review },"disclosure",request.id);
  }
  consumePreview(id, kind, bridgeConsent) {
    this.synchronize(true);
    const preview = this.previews.get(id);
    if (!preview || preview.kind !== kind || preview.revision !== this.state.revision || preview.confirmBefore <= this.now()) throw new Error("This preview has changed or expired. Open it again before confirming.");
    if (preview.bridge && bridgeConsent !== true) throw new Error("Confirm the new link between these selected records.");
    this.context(preview.contextId);
    return preview;
  }
  recordPermission(preview) {
    const result = { id:this.makeId(), contextId:preview.contextId, authorizedParty:preview.authorizedParty,
      recipient:preview.recipient, action:preview.action, purpose:preview.purpose, claims:[...preview.claims],
      notBefore:this.now(), expiresAt:preview.expiresAt, recordedAt:this.now(), revokedAt:null,
      delegationAllowed:false, authoritySource:"Your consent", proofStatus:"not_requested",proof:null,receipt:null,execution:null };
    this.state.permissions.unshift(result);
    return result;
  }
  async confirmPermission(previewId, bridgeConsent = false) {
    const preview = this.consumePreview(previewId,"permission",bridgeConsent);
    const result = this.commit(() => {
      const permission = this.recordPermission(preview);
      this.log(`Permission recorded for ${preview.authorizedParty}`,preview.contextId);
      return permission;
    });
    this.previews.delete(previewId);
    return result;
  }
  async createDisclosure(input) {
    const preview = this.preview(input,"disclosure");
    this.previews.delete(preview.id);
    return this.commit(() => {
      const result = { id:this.makeId(), contextId:preview.contextId,recipient:preview.recipient,purpose:preview.purpose,
        claims:preview.claims,duration:preview.expiresAt-preview.notBefore,status:"pending",createdAt:this.now(),review:preview.review };
      this.state.requests.unshift(result);
      this.log(`Disclosure prepared for ${preview.recipient}`,preview.contextId,"disclosure");
      return result;
    });
  }
  async approveDisclosure(previewId, bridgeConsent = false) {
    const preview = this.consumePreview(previewId,"disclosure",bridgeConsent);
    const request = this.state.requests.find((item) => item.id === preview.requestId);
    if (!request || request.status !== "pending") throw new Error("This request is no longer waiting for consent.");
    const result = this.commit(() => {
      const permission = this.recordPermission(preview);
      permission.proofStatus = "pending";
      request.status = "awaiting_verification";
      request.permissionId = permission.id;
      request.consentedAt = this.now();
      request.delivered = false;
      this.log(`Disclosure consent recorded for ${request.recipient}`,request.contextId,"disclosure");
      return request;
    });
    this.previews.delete(previewId);
    return result;
  }
  async declineDisclosure(id) {
    return this.commit(() => {
      const request = this.state.requests.find((item) => item.id === id);
      if (!request || request.status !== "pending") throw new Error("This request is no longer waiting for consent.");
      request.status = "declined";
      this.log(`Declined disclosure to ${request.recipient}`,request.contextId,"disclosure");
      return request;
    });
  }
  async revokePermission(id) {
    return this.commit(() => {
      const permission = this.permission(id);
      if (permissionState(permission,this.now()) !== "consent_recorded") throw new Error("This permission is no longer current.");
      permission.revokedAt = this.now();
      permission.proofStatus = "cancelled";
      for (const request of this.state.requests.filter((item) => item.permissionId === id && item.status === "awaiting_verification")) request.status = "cancelled";
      this.log(`Revoked permission for ${permission.authorizedParty}`,permission.contextId,"revocation");
      return permission;
    });
  }
  async requestVerification(id) {
    return this.commit(() => {
      const permission = this.permission(id);
      if (permissionState(permission,this.now()) !== "consent_recorded") throw new Error("This permission is no longer current.");
      if (permission.proofStatus !== "not_requested") throw new Error("Verification has already been requested.");
      permission.proofStatus = "pending";
      this.log(`Verification requested for ${permission.recipient}`,permission.contextId,"verification");
      return permission;
    });
  }
  dispose() { this.previews.clear(); }
}

export class HttpContextClient {
  constructor(request) { this.request = request; }
  list() { return this.request("/api/contexts/workspace"); }
  createContext(input) { return this.request("/api/contexts","POST",input); }
  previewPermission(input) { return this.request("/api/context-permissions/preview","POST",input); }
  confirmPermission(previewId,bridgeConsent) { return this.request("/api/context-permissions","POST",{previewId,bridgeConsent}); }
  revokePermission(id) { return this.request(`/api/context-permissions/${encodeURIComponent(id)}/revoke`,"POST",{}); }
  createDisclosure(input) { return this.request("/api/context-disclosures","POST",input); }
  previewDisclosure(input) { return this.request("/api/context-disclosures/preview","POST",input); }
  approveDisclosure(previewId,bridgeConsent) { return this.request("/api/context-disclosures/approve","POST",{previewId,bridgeConsent}); }
  declineDisclosure(id) { return this.request(`/api/context-disclosures/${encodeURIComponent(id)}/decline`,"POST",{}); }
  requestVerification(id) { return this.request(`/api/context-permissions/${encodeURIComponent(id)}/verification`,"POST",{}); }
  dispose() {}
}
