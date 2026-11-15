const esc = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
const date = (seconds) => new Date(seconds * 1000).toLocaleString();

export async function mountInference(root, api, active) {
  root.innerHTML =
    '<header class="product-title"><div><h1>Private inference</h1><p>Loading current service and authorization status…</p></div></header>';
  let status;
  try {
    status = await api("/api/inference");
  } catch (error) {
    if (active()) root.textContent = error.message;
    return;
  }
  if (!active()) return;
  root.innerHTML = `<header class="product-title"><div><h1>Private inference</h1><p>Choose a run, review the exact permitted inputs, then consent to one advisory answer.</p></div></header>
    <section class="authority-panel inference-status"><h2>NEAR AI Cloud</h2><p role="status">${esc(status.provider.message)}</p><dl class="plain-details"><dt>Model</dt><dd>${esc(status.provider.model ?? "Not selected")}</dd><dt>Privacy tier</dt><dd>${esc(status.provider.privacyTier)}</dd><dt>Gateway, model, connection, response</dt><dd>Absent · no verified inference yet</dd><dt>Current Midnight authorization</dt><dd>${status.authorization.state === "unconfigured" ? "Pending integration · transmission blocked" : "Checked again for each disclosure"}</dd><dt>Product sign-in</dt><dd>Local demo account · Dynamic sandbox pending</dd><dt>Midnight wallet</dt><dd>1AM binding pending</dd><dt>Monad wallet</dt><dd>Separate EVM binding pending</dd><dt>Encrypted evidence</dt><dd>Delivery integration pending</dd></dl></section>
    <section class="authority-panel inference-selection"><h2>Authorized view</h2><p>Clinical referral and research, professional qualification and site access, and delegated finance and purchasing all use this same boundary. Browser context previews do not grant inference access.</p>
    ${status.instances.length ? `<form class="product-form" id="inference-scope-form"><label>Run<select name="instanceId">${status.instances.map((item) => `<option value="${esc(item.id)}">${esc(item.name)}</option>`).join("")}</select></label><label>Context<select name="contextId"></select></label><button class="button secondary" ${status.authorization.state === "unconfigured" ? "disabled" : ""}>Load permitted inputs</button></form>` : '<p>No allocated runs are available for your account.</p><a class="button secondary" href="#policies">View policies</a>'}
    <div id="inference-inputs"></div><div id="inference-preview"></div><p id="inference-error" class="notice" role="alert" hidden></p><div id="inference-answer" aria-live="polite"></div></section>`;
  const errorBox = root.querySelector("#inference-error");
  let selectionRevision = 0;
  let previewRevision = 0;
  const execute = async (operation) => {
    const operationRevision = selectionRevision;
    const disclosureRevision = previewRevision;
    errorBox.hidden = true;
    try {
      await operation();
    } catch (error) {
      if (active() && operationRevision === selectionRevision && disclosureRevision === previewRevision) {
        errorBox.textContent = error.message;
        errorBox.hidden = false;
      }
    }
  };
  const form = root.querySelector("#inference-scope-form");
  if (!form) return;
  const updateContexts = () => {
    selectionRevision++;
    const instance = status.instances.find(
      (item) => item.id === form.elements.instanceId.value,
    );
    form.elements.contextId.innerHTML = instance.contexts
      .map(
        (item) =>
          `<option value="${esc(item.id)}">${esc(item.description)}</option>`,
      )
      .join("");
    root.querySelector("#inference-inputs").replaceChildren();
    root.querySelector("#inference-preview").replaceChildren();
    root.querySelector("#inference-answer").replaceChildren();
  };
  form.elements.instanceId.addEventListener("change", updateContexts);
  form.elements.contextId.addEventListener("change", () => {
    selectionRevision++;
    root.querySelector("#inference-inputs").replaceChildren();
    root.querySelector("#inference-preview").replaceChildren();
    root.querySelector("#inference-answer").replaceChildren();
  });
  updateContexts();
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const revision = ++selectionRevision;
    const selection = {
      instanceId: form.elements.instanceId.value,
      contextId: form.elements.contextId.value,
    };
    execute(async () => {
      const scope = await api("/api/inference/scope", "POST", selection);
      if (!active() || revision !== selectionRevision) return;
      const container = root.querySelector("#inference-inputs");
      container.innerHTML = `<form id="inference-input-form" class="product-form"><p>Recipient: <strong>${esc(scope.recipient)}</strong><br/>Purpose: ${esc(scope.purpose)}<br/>Expires: ${esc(date(scope.validUntil))}</p><fieldset class="information-options"><legend>Select permitted inputs</legend>${scope.inputs.map((input) => `<label><input type="checkbox" name="inputIds" value="${esc(input.id)}"/><span>${esc(input.label)}</span></label>`).join("")}</fieldset><button class="button secondary">Preview disclosure</button></form>`;
      const inputForm = container.querySelector("form");
      const clearDisclosure = () => {
        previewRevision++;
        root.querySelector("#inference-preview").replaceChildren();
        root.querySelector("#inference-answer").replaceChildren();
      };
      inputForm.addEventListener("change", clearDisclosure);
      inputForm.addEventListener("submit", (event) => {
        event.preventDefault();
        clearDisclosure();
        const disclosureRevision = previewRevision;
        const current = () => active() && revision === selectionRevision && disclosureRevision === previewRevision;
        const inputIds = new FormData(event.currentTarget).getAll("inputIds");
        execute(async () => {
          const preview = await api("/api/inference/preview", "POST", {
            ...selection,
            inputIds,
          });
          if (!current()) return;
          const panel = root.querySelector("#inference-preview");
          panel.innerHTML = `<h2>Confirm this disclosure</h2><dl class="plain-details"><dt>Run</dt><dd>${esc(status.instances.find((item) => item.id === preview.instanceId)?.name)}</dd><dt>Context</dt><dd>${esc(status.instances.find((item) => item.id === preview.instanceId)?.contexts.find((item) => item.id === preview.contextId)?.description)}</dd><dt>Recipient</dt><dd>${esc(preview.recipient)}</dd><dt>Purpose</dt><dd>${esc(preview.purpose)}</dd><dt>Model</dt><dd>${esc(preview.model)}</dd><dt>Consent expires</dt><dd>${esc(date(preview.expiresAt))}</dd><dt>New linkage</dt><dd>${esc(preview.newLinkage)}</dd></dl>${preview.inputs.map((input) => `<section><h3>${esc(input.label)}</h3><p class="inference-value">${esc(input.value)}</p></section>`).join("")}<p>${esc(preview.plaintextPath)}</p><p>${esc(preview.retention)}</p><button class="button secondary" id="inference-consent">Consent to these inputs</button> <button class="button primary" id="inference-send" disabled>Request verified answer</button> <button class="button secondary" id="inference-revoke">Withdraw consent</button>`;
          panel
            .querySelector("#inference-consent")
            .addEventListener("click", () =>
              execute(async () => {
                await api(`/api/inference/${preview.id}/consent`, "POST", {});
                if (current()) {
                  panel.querySelector("#inference-consent").disabled = true;
                  panel.querySelector("#inference-send").disabled = false;
                }
              }),
            );
          panel
            .querySelector("#inference-revoke")
            .addEventListener("click", () =>
              execute(async () => {
                await api(`/api/inference/${preview.id}/revoke`, "POST", {});
                if (current())
                  panel.textContent =
                    "Consent withdrawn. Review a new preview before sending.";
              }),
            );
          panel
            .querySelector("#inference-send")
            .addEventListener("click", (event) => {
              event.currentTarget.disabled = true;
              execute(async () => {
                const result = await api(
                  `/api/inference/${preview.id}/run`,
                  "POST",
                  {},
                );
                if (!current()) return;
                root.querySelector("#inference-answer").innerHTML =
                  `<h2>Verified response</h2><p>Gateway, model deployment, connection and response checks passed. Response signature: ${result.responseSigner === "provider_tee" ? "model TEE" : "gateway (not a model-response signature)"}. This does not establish factual correctness.</p><p class="inference-value">${esc(result.answer)}</p><p>${esc(result.message)}</p>`;
                panel.replaceChildren();
              });
            });
        });
      });
    });
  });
}
