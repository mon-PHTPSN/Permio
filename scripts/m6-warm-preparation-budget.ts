import assert from "node:assert/strict";
import { freshInstanceEntry, FRESH_INSTANCE_CONTRACT } from "./m6-fresh-instance-budget.ts";

export const WARM_PREPARATION_ADDRESS = FRESH_INSTANCE_CONTRACT;
/** Additional test-harness bounds; the existing parent and native checks remain. */
export class WarmPreparationBudget {
  next: number;
  constructor(first=34){assert(first===34||first===56);this.next=first;}
  active?: { round: number; balancedHash?: string; submitted: boolean };
  begin(round: number, address: string, entry: string) {
    assert(!this.active && round === this.next && round >= 34 && round <= 58);
    assert(address === WARM_PREPARATION_ADDRESS && entry === freshInstanceEntry(round));
    this.active = { round, submitted: false };
  }
  balanced(round: number, hash: string) {
    assert(this.active?.round === round && !this.active.balancedHash && /^[a-f0-9]{64}$/.test(hash));
    this.active.balancedHash = hash;
  }
  submit(round: number, hash: string) {
    assert(this.active?.round === round && !this.active.submitted && this.active.balancedHash === hash);
    assert(this.active.balancedHash); this.active.submitted = true;
  }
  finalized(round: number) {
    assert(this.active?.round === round && this.active.submitted);
    this.active = undefined; this.next++;
  }
}
