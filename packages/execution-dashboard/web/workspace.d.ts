interface Workflow { id: string; state: string; myRole: string; reviewed: boolean; reviews: { decision: string }[]; owner: string; template: { displayName: string; description: string; contexts: { description: string }[] } }
interface Run { expiresAt: number; state: string }
export function summarizeWorkspace<T extends Workflow, R extends Run>(workspace: { blueprints: T[]; instances: R[] }, now?: number): { workflows: T[]; drafts: T[]; inReview: T[]; active: T[]; attention: T[]; openRuns: R[] };
export function filterWorkflows<T extends Workflow>(items: T[], query?: string, state?: string): T[];
