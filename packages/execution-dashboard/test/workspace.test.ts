import assert from "node:assert/strict";
import { test } from "node:test";
import { filterWorkflows, summarizeWorkspace } from "../web/workspace.js";

const workflow = (id: string, state: string, myRole = "author", reviewed = false, approved = false) => ({
  id, state, myRole, reviewed, reviews: approved ? [{ decision: "approve" }] : [], owner: "alice",
  template: { displayName: id, description: "Scheduled visitor access", contexts: [{ description: "Site entrance" }] },
});

test("dashboard columns use only supplied account workflows and distinguish archived states", () => {
  const summary = summarizeWorkspace({ blueprints: [workflow("one","draft"), workflow("two","validated"), workflow("three","in_review"), workflow("four","active"), workflow("five","retired"), workflow("six","revoked")], instances: [] });
  assert.deepEqual(summary.drafts.map((item) => item.id), ["one","two"]);
  assert.deepEqual(summary.inReview.map((item) => item.id), ["three"]);
  assert.deepEqual(summary.active.map((item) => item.id), ["four"]);
  assert.equal(summary.workflows.length, 6);
});

test("attention counts only an outstanding reviewer action or approval ready for activation", () => {
  const summary = summarizeWorkspace({ blueprints: [workflow("review","in_review","reviewer"), workflow("done","in_review","reviewer",true), workflow("waiting","in_review","approver"), workflow("approve","in_review","approver",false,true), workflow("author","in_review"), workflow("manager","in_review","allocator")], instances: [] });
  assert.deepEqual(summary.attention.map((item) => item.id), ["review","approve"]);
});

test("open-run counts exclude expired, completed and revoked runs", () => {
  const summary = summarizeWorkspace({ blueprints: [], instances: [{state:"ready",expiresAt:101},{state:"ready",expiresAt:100},{state:"completed",expiresAt:200},{state:"revoked",expiresAt:200}] },100);
  assert.equal(summary.openRuns.length, 1);
});

test("workflow search and status filters combine without changing source data", () => {
  const items = [workflow("Delivery","active"),workflow("Visit","validated"),workflow("Other","revoked")];
  assert.equal(filterWorkflows(items,"DELIVERY","active").length,1);
  assert.equal(filterWorkflows(items,"site","draft")[0].id,"Visit");
  assert.equal(filterWorkflows(items,"alice","revoked")[0].id,"Other");
  assert.equal(filterWorkflows(items,"missing").length,0);
  assert.equal(items.length,3);
});
