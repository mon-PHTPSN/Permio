import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { test } from "node:test";

const source = readFileSync(new URL("../web/inference-ui.js", import.meta.url), "utf8");
const settle = async () => { await new Promise(setImmediate); };

// A minimal DOM/transport boundary: execute the actual UI listeners and deferred responses.
async function browserHost() {
  const nodes = new Map<string, Element>();
  class Element {
    html = ""; textContent = ""; hidden = false; disabled = false;
    elements = { instanceId: { value: "run", addEventListener() {} }, contextId: { value: "context", innerHTML: "", addEventListener() {} } };
    children: string[] = [];
    listeners = new Map<string, (event: any) => void>();
    set innerHTML(value: string) {
      this.children.forEach(id => nodes.delete(id)); this.children = []; this.html = value;
      for (const match of value.matchAll(/<(?:form|button|div|p)\b([^>]*\bid="([^"]+)"[^>]*)>/g)) {
        const child = new Element(); child.disabled = /\bdisabled\b/.test(match[1]);
        nodes.set(match[2], child); this.children.push(match[2]);
      }
    }
    get innerHTML() { return this.html; }
    querySelector(selector: string): Element {
      return nodes.get(selector === "form" ? "inference-input-form" : selector.slice(1))!;
    }
    replaceChildren() { this.innerHTML = ""; }
    addEventListener(name: string, callback: (event: any) => void) { this.listeners.set(name, callback); }
    fire(name: string) { this.listeners.get(name)?.({ preventDefault() {}, currentTarget: this }); }
  }
  const requests: { path: string; resolve(value: unknown): void }[] = [];
  const api = (path: string) => new Promise(resolve => { requests.push({ path, resolve }); });
  const root = new Element();
  const context = vm.createContext({ FormData: class { getAll() { return ["record"]; } } });
  vm.runInContext(source.replace("export async function", "async function"), context);
  const mounting = context.mountInference(root, api, () => true);
  const finish = async (path: string, value: unknown, newest = false) => {
    const index = newest ? requests.findLastIndex(item => item.path === path) : requests.findIndex(item => item.path === path);
    assert.ok(index >= 0, `Expected pending request ${path}`);
    requests.splice(index, 1)[0].resolve(value); await settle();
  };
  await finish("/api/inference", {
    provider: { message: "Synthetic browser transport", privacyTier: "confidential" },
    authorization: { state: "configured" },
    instances: [{ id: "run", name: "Run", contexts: [{ id: "context", description: "Context" }] }],
  });
  await mounting;
  nodes.get("inference-scope-form")!.fire("submit");
  await finish("/api/inference/scope", { recipient: "recipient", purpose: "review", validUntil: 2000,
    inputs: [{ id: "record", label: "Record" }] });
  const preview = (id: string) => ({ id, instanceId: "run", contextId: "context", recipient: "recipient",
    purpose: id, model: "model", expiresAt: 2000, newLinkage: "none", inputs: [], plaintextPath: "test", retention: "none" });
  return {
    node: (id: string) => nodes.get(id)!, finish, preview,
    submit() { nodes.get("inference-input-form")!.fire("submit"); },
  };
}

test("a delayed consent cannot enable sending a newer unconsented preview", async () => {
  const host = await browserHost();
  host.submit(); await host.finish("/api/inference/preview", host.preview("older"));
  host.node("inference-consent").fire("click");
  host.submit(); await host.finish("/api/inference/preview", host.preview("newer"));
  await host.finish("/api/inference/older/consent", {});
  assert.equal(host.node("inference-send").disabled, true);
  assert.equal(host.node("inference-consent").disabled, false);
});

test("out-of-order disclosure previews retain the latest selection", async () => {
  const host = await browserHost();
  host.submit(); host.submit();
  await host.finish("/api/inference/preview", host.preview("newer"), true);
  await host.finish("/api/inference/preview", host.preview("older"));
  assert.ok(host.node("inference-preview").innerHTML.includes("newer"));
});

test("changing selected inputs invalidates the previous disclosure preview", async () => {
  const host = await browserHost();
  host.submit(); await host.finish("/api/inference/preview", host.preview("older"));
  host.node("inference-input-form").fire("change");
  assert.equal(host.node("inference-preview").innerHTML, "");
});

test("a late run response cannot clear a newer disclosure preview", async () => {
  const host = await browserHost();
  host.submit(); await host.finish("/api/inference/preview", host.preview("older"));
  host.node("inference-consent").fire("click"); await host.finish("/api/inference/older/consent", {});
  host.node("inference-send").fire("click");
  host.submit(); await host.finish("/api/inference/preview", host.preview("newer"));
  await host.finish("/api/inference/older/run", { answer: "Old answer", responseSigner: "provider_tee", message: "test" });
  assert.ok(host.node("inference-preview").innerHTML.includes("newer"));
  assert.equal(host.node("inference-answer").innerHTML, "");
});
