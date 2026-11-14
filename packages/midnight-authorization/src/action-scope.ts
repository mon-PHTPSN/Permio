import type {
  RuntimeActionIntent,
  RuntimeActionScopePaths,
} from "../contracts/managed/permio-authorization/contract/index.js";
import type { RuntimeScopeTrees } from "./runtime-credentials.ts";

/** Private paths for the exact seven intent fields, not an authorization. */
export function buildRuntimeActionScopePaths(
  intent: RuntimeActionIntent,
  scope: RuntimeScopeTrees,
): RuntimeActionScopePaths {
  return {
    actions: scope.actions.pathForHash(intent.actionIdHash),
    resourceSelectors: scope.resourceSelectors.pathForHash(intent.resourceSelectorHash),
    resources: scope.resources.pathForHash(intent.resourceHash),
    purposes: scope.purposes.pathForHash(intent.purposeHash),
    recipientKinds: scope.recipientKinds.pathForHash(intent.recipientKindHash),
    recipients: scope.recipients.pathForHash(intent.recipientHash),
    disclosurePolicyIds: scope.disclosurePolicyIds.pathForHash(intent.disclosurePolicyIdHash),
  };
}
