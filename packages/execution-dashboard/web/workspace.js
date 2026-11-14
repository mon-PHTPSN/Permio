export function summarizeWorkspace(workspace, now = Math.floor(Date.now() / 1000)) {
  const workflows = workspace.blueprints;
  const drafts = workflows.filter((item) => ["draft", "validated"].includes(item.state));
  const inReview = workflows.filter((item) => item.state === "in_review");
  const active = workflows.filter((item) => item.state === "active");
  const attention = inReview.filter((item) => item.myRole === "reviewer" ? !item.reviewed : item.myRole === "approver" && item.reviews.some((review) => review.decision === "approve"));
  const openRuns = workspace.instances.filter((item) => item.expiresAt > now && !["completed", "revoked"].includes(item.state));
  return { workflows, drafts, inReview, active, attention, openRuns };
}

export function filterWorkflows(items, query = "", state = "all") {
  const search = query.trim().toLocaleLowerCase();
  return items.filter((item) => (state === "all" || item.state === state || (state === "draft" && item.state === "validated")) &&
    (!search || [item.template.displayName, item.template.description, item.owner,
      ...item.template.contexts.flatMap((context) => [context.id, context.description]),
      ...(item.template.actions ?? []).flatMap((action) => [action.id, action.description]),
      item.template.namespace, item.template.version].join(" ").toLocaleLowerCase().includes(search)));
}
