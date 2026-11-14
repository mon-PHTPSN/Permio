import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { test } from "node:test";

const source = readFileSync(new URL("../web/site.js", import.meta.url), "utf8");
// Run the actual controller/listeners with a minimal browser host and deferred transport.
const bootstrap = source.indexOf("\ninitializeActivity();");
assert.ok(bootstrap > 0);
const controller = source.slice(0, bootstrap).replace(/^import .+\r?\n/gm, "");

function browserHost() {
  const elements = new Map<string, any>(), listeners = new Map<string, () => void>();
  const element = (id: string) => {
    if (!elements.has(id)) elements.set(id, {
      open: false, hidden: false, innerHTML: "", textContent: "",
      addEventListener() {}, setAttribute() {}, removeAttribute() {},
      classList: { toggle() {} }, close() { this.open = false; }, showModal() { this.open = true; },
    });
    return elements.get(id);
  };
  const data = { account: { id: "author", username: "author", displayName: "Author" }, blueprints: [], instances: [], activity: [] };
  let finishFirst!: (value: typeof data) => void;
  const delayed = new Promise<typeof data>((resolve) => { finishFirst = resolve; });
  let calls = 0;
  const location = { hash: "#overview" };
  const context = vm.createContext({
    document: { getElementById: element, addEventListener() {}, querySelectorAll: () => [] },
    window: { addEventListener: (name: string, callback: () => void) => listeners.set(name, callback) }, location,
    fetch: async (path: string) => {
      assert.equal(path, "/api/workspace");
      return { ok: true, json: async () => ++calls === 1 ? delayed : data };
    },
    enableActivity() {}, setInterval() {}, clearTimeout() {}, setTimeout() {},
    html: (value: unknown) => String(value ?? ""), filterWorkflows: (items: unknown) => items,
    libraryCards: () => "<p>Library</p>", testWorkspace: data,
  });
  vm.runInContext(controller, context);
  vm.runInContext("session={account:{id:'author'},csrf:'synthetic'}; workspace=testWorkspace; renderPage();", context);
  return {
    element, start: () => vm.runInContext("perform(()=>chooseContextTemplate())", context) as Promise<void>,
    navigate(hash: string) { location.hash = hash; listeners.get("hashchange")!(); },
    finish: () => finishFirst(data), currentTitle: () => context.document.title,
  };
}

test("current-view context selection opens after workspace loading", async () => {
  const host = browserHost(), pending = host.start(); host.finish(); await pending;
  assert.equal(host.element("product-dialog").open, true);
  assert.equal(host.element("product-dialog-title").textContent, "New context");
});

for (const returnToOrigin of [false, true]) test(`late context picker is discarded after navigation${returnToOrigin ? " away and back" : ""}`, async () => {
  const host = browserHost(), pending = host.start();
  host.navigate("#account"); await new Promise(setImmediate);
  if (returnToOrigin) { host.navigate("#overview"); await new Promise(setImmediate); }
  host.finish(); await pending;
  assert.equal(host.element("product-dialog").open, false, "A stale picker must not reopen over the current page");
  assert.equal(host.currentTitle(), returnToOrigin ? "Contexts · Permio" : "Account · Permio");
});
