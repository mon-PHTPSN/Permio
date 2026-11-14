import { formatUnix } from "./app.js";

export const escapeText = (value) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
const esc = escapeText;
const names = (values) => values.map(esc).join(", ") || "None";
const stateName = (value) => ({ in_review: "In review", active: "Active", validated: "Validated", draft: "Draft", retired: "Retired", revoked: "Revoked" }[value] ?? esc(value));
const pair = (label, value) => `<dt>${label}</dt><dd>${esc(value)}</dd>`;
const instanceState = (instance) => instance.expiresAt <= Math.floor(Date.now() / 1000) ? "Expired" : esc(instance.state);

export function libraryCards(items, { selecting = false } = {}) {
  if (!items.length) return '<div class="empty"><p>No templates match this view.</p><button type="button" class="button secondary" id="create-first">Create a template</button></div>';
  return `<div class="workflow-grid library-grid">${items.map((item) => {
    const template = item.template, eligible = item.state === "active" && item.myRole === "allocator";
    return `<article class="workflow-card library-card"><div class="card-meta"><span class="workflow-icon" aria-hidden="true">↗</span><span class="pill ${item.state === "active" ? "success" : ""}">${stateName(item.state)}</span></div>
      <h3>${esc(template.displayName)}</h3><p>${esc(template.description)}</p>
      <p class="library-counts">${template.contexts.length} contexts · ${template.actions.length} actions · Version ${esc(template.version)}</p>
      <dl class="library-identity">${pair("Namespace", item.target.namespace)}${pair("Template", item.target.templateId)}${pair("Content hash", item.target.templateHash)}</dl>
      <div class="form-actions"><button type="button" class="button secondary" data-blueprint="${esc(item.id)}">View template</button>
      ${selecting && eligible ? `<button type="button" class="button primary" data-library-select="${esc(item.id)}">Create context</button>` : ""}</div>
      ${selecting && !eligible ? `<p class="muted">${item.state === "active" ? "The assigned run manager can create contexts from this template." : "An active template is required to create a context."}</p>` : ""}</article>`;
  }).join("")}</div>`;
}

export function templateDefinition(template) {
  return `<div class="template-definition"><p class="description">${esc(template.description)}</p>
    <section class="detail-section"><h3>Participant slots</h3><ul>${template.participantSlots.map((slot) => `<li><strong>${esc(slot.id)}</strong> — ${esc(slot.description)}<br><small>Assigned by: ${names(slot.assignableBy)}</small></li>`).join("")}</ul></section>
    ${template.contexts.map((context) => `<section class="detail-section definition-context"><h3>${esc(context.description)}</h3><span class="muted">${esc(context.id)}</span>
      <dl class="plain-details">${pair("Participants", context.allowedSlotIds.join(", "))}${pair("Records", context.recordTypes.join(", "))}${pair("Claims", context.claimTypes.join(", "))}${pair("Recipients", context.recipientKinds.join(", "))}${pair("Purposes", context.purposes.join(", "))}</dl>
      ${template.actions.filter((action) => action.contextId === context.id).map((action) => {
        const rule = template.capabilityRules.find((candidate) => candidate.id === action.capabilityRuleId);
        return `<article class="definition-action"><h4>${esc(action.description)}</h4><dl class="plain-details">${pair("Action", action.id)}${pair("Actor slot", action.actorSlotId)}${pair("Purpose", action.purpose)}${pair("Recipient", action.recipientKind)}${pair("Disclosed claims", action.outputClaimTypes.join(", "))}${pair("Proof profile", action.proofProfileId)}${pair("Adapter", action.executionAdapterId ?? "None")}
          ${rule ? pair("Resource scope", rule.resourceSelector) + pair("Disclosure rule", rule.disclosurePolicyId) + pair("Validity", `${rule.validForSeconds} seconds`) + pair("Delegation depth", rule.maxDelegationDepth) + pair("Revocable", rule.revocable ? "Yes" : "No") : ""}</dl></article>`;
      }).join("")}</section>`).join("")}
    <section class="detail-section"><h3>State transitions</h3><p>Initial state: ${esc(template.initialState)}</p><ul>${template.transitions.map((transition) => `<li>${esc(transition.fromState)} → ${esc(transition.toState)} · ${esc(transition.actionId)}</li>`).join("")}</ul></section>
    <section class="detail-section"><h3>Proof requirements</h3><ul>${template.proofProfiles.map((profile) => `<li>${esc(profile.id)} · ${esc(profile.circuitId)} · ${esc(profile.publicOutputSchemaId)}</li>`).join("")}</ul></section>
    <details class="detail-section"><summary>Complete template definition</summary><pre class="template-json">${esc(JSON.stringify(template, null, 2))}</pre></details></div>`;
}

export function instanceCards(instances) {
  if (!instances.length) return '<div class="empty"><p>No contexts created from your library yet.</p><a href="#library" class="button secondary">Explore context library</a></div>';
  return `<div class="workflow-grid">${instances.map((item) => `<article class="run-card"><div class="card-meta"><span class="pill">${instanceState(item)}</span><span>${formatUnix(item.expiresAt)}</span></div><h3>${esc(item.name)}</h3><p>${esc(item.blueprintName)}</p>
    <ul class="instance-contexts">${(item.template?.contexts ?? []).map((context) => `<li>${esc(context.description)}</li>`).join("")}</ul>
    <a href="#instance/${encodeURIComponent(item.id)}" class="button secondary">Open context</a></article>`).join("")}</div>`;
}

export function instanceDefinition(instance) {
  const identity = instance.target ? `<dl class="plain-details template-target">${pair("Namespace", instance.target.namespace)}${pair("Template", instance.target.templateId)}${pair("Version", instance.target.templateVersion)}${pair("Content hash", instance.target.templateHash)}</dl>` : "";
  return `<p class="description">${esc(instance.blueprintName)}</p><dl class="plain-details">${pair("Participants", instance.participants.join(", "))}${pair("Permission issuer", instance.issuer ?? "Unavailable")}${pair("State", instanceState(instance))}${pair("Expires", formatUnix(instance.expiresAt))}</dl>${identity}
    ${instance.template ? templateDefinition(instance.template) : '<p class="description">The template snapshot is unavailable for this older context.</p>'}`;
}

export function newTemplateDefinition() {
  return {
    schemaVersion: 1, namespace: "draft.local", templateId: "draft.local/definition", version: "1.0.0",
    displayName: "New context template", description: "Describe the reusable context and its boundaries.",
    participantSlots: [{ id: "actor", description: "The participant performing an action.", assignableBy: ["@instance-creator"] }],
    contexts: [{ id: "context", description: "Context", allowedSlotIds: ["actor"], recordTypes: ["supporting-record"], claimTypes: ["authorization"], recipientKinds: ["recipient"], purposes: ["requested-use"] }],
    states: ["ready", "completed"], initialState: "ready",
    actions: [{ id: "perform-action", description: "Perform the scoped action", contextId: "context", actorSlotId: "actor", inputRecordTypes: ["supporting-record"], outputClaimTypes: ["authorization"], purpose: "requested-use", recipientKind: "recipient", capabilityRuleId: "scoped-action", proofProfileId: "delegated-authorization", executionAdapterId: null }],
    transitions: [{ id: "complete", fromState: "ready", actionId: "perform-action", toState: "completed" }],
    capabilityRules: [{ id: "scoped-action", description: "Bounded, revocable authorization.", actionIds: ["perform-action"], resourceSelector: "selected-resource", purpose: "requested-use", recipientConstraint: "recipient", validForSeconds: 900, maxDelegationDepth: 0, disclosurePolicyId: "minimum-disclosure", revocable: true }],
    proofProfiles: [{ id: "delegated-authorization", circuitId: "delegated-capability-action-v1", publicOutputSchemaId: "decision-receipt-v1" }],
    executionAdapters: [], privacyInvariants: [{ id: "context-isolation", description: "Disclose only the selected claims to the scoped recipient." }],
  };
}
