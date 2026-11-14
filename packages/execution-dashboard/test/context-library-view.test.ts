import assert from "node:assert/strict";
import { test } from "node:test";
import * as view from "../web/context-library.js";
import { filterWorkflows } from "../web/workspace.js";
import { libraryTemplate } from "./fixtures/context-library.ts";
import type { TemplateTarget } from "@permio/scenario-governance";

const target: TemplateTarget = { namespace: "fixture.library", templateId: "fixture.library/access", templateVersion: "2.1.0", templateHash: `0x${"12".repeat(32)}` };
const definition = (state = "active", myRole = "allocator") => ({ id: "template-one", state, myRole,
  owner: "author", template: libraryTemplate(), target, reviewed:false, reviews:[] });

test("library selection exposes exact identity and only offers allocation to an active allocator", () => {
  assert.equal(typeof view.libraryCards, "function");
  const ready = view.libraryCards([definition()], { selecting: true });
  assert.match(ready, /2 contexts/); assert.match(ready, /2 actions/);
  assert.ok(ready.includes(target.templateHash)); assert.ok(ready.includes("2.1.0"));
  assert.match(ready, /data-library-select/);
  for (const item of [definition("draft"), definition("retired"), definition("revoked"), definition("active", "author")]) {
    assert.doesNotMatch(view.libraryCards([item], { selecting: true }), /data-library-select/);
  }
});

test("full definition rendering includes all contexts/actions and escapes imported text", () => {
  const template = libraryTemplate();
  const rendered = view.templateDefinition({ ...template, description: '<img src=x onerror="alert(1)">' });
  for (const value of ["entrance context", "renewal context", "Request entrance", "Request renewal", "minimum-renewal", "delegated-capability-action-v1", "visitor"]) assert.ok(rendered.includes(value), value);
  assert.doesNotMatch(rendered, /<img/); assert.match(rendered, /&lt;img/);
  const cards = view.libraryCards([{ ...definition(), template: { ...template, displayName: '<script>alert(1)</script>' } }]);
  assert.doesNotMatch(cards, /<script/);
});

test("instance views use the stored definition and identify legacy instances without fabricating a snapshot", () => {
  const instance = { id: "instance-one", name: "Scoped visit", blueprintName: "Access", state: "ready",
    createdAt: 100, expiresAt: 200, participants: ["participant"], issuer: "issuer", template: libraryTemplate(), target };
  assert.match(view.instanceCards([instance]), /renewal context/);
  assert.match(view.instanceCards([instance]), /Expired/);
  const detail = view.instanceDefinition(instance);
  assert.ok(detail.includes(target.templateHash)); assert.match(detail, /Request renewal/);
  assert.doesNotMatch(detail, /Grant permission|Verified|proof verified/);
  const { template, target: ignored, ...legacy } = instance;
  assert.match(view.instanceDefinition(legacy), /snapshot.*unavailable/i);
  assert.match(view.instanceCards([legacy]), /Scoped visit/);
});

test("library search finds later contexts and actions without changing the definition", () => {
  const item = definition();
  assert.equal(filterWorkflows([item], "renewal context").length, 1);
  assert.equal(filterWorkflows([item], "request-renewal").length, 1);
  assert.equal(item.template.contexts.length, 2);
});
