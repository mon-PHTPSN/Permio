export const CONTEXT_PROFILES = [
  {
    id: "purchase", name: "Purchase & support", color: "blue", symbol: "purchase",
    description: "Keep a product review, a support case, and an investigation separate.",
    defaultTitle: "Headphone purchase", recordNames: ["Purchase credential", "Product review", "Support decision"],
    contexts: [
      {
        id: "reputation", name: "Product review", recipient: "Public", recipientKind: "public",
        purpose: "Product reputation", action: "Publish a product review", record: "Purchase credential",
        claims: [{id:"rating",label:"Rating"},{id:"review_text",label:"Review text"},{id:"purchase_eligibility",label:"Purchase eligibility"}],
        hidden: ["Your identity", "Order reference", "Exact purchase date", "Credential and holder secret", "Support history"],
        checks: ["Valid purchase credential", "Credential control", "One review per purchase", "Review integrity"],
        conditions: ["Only the rating and review text are written by you.", "A purchase check does not verify that an opinion is true."],
        requiredClaims:["rating","review_text","purchase_eligibility"], maxDuration: 604800, bridge: false, public: true,
      },
      {
        id: "support", name: "Customer support", recipient: "Acme Audio support", recipientKind: "merchant",
        purpose: "Replacement eligibility", action: "Check replacement eligibility", record: "Purchase credential",
        claims: [{id:"merchant_issued",label:"Credential issued by this merchant"},{id:"product_matches",label:"Product matches"},{id:"within_support_period",label:"Purchase within 30 days"},{id:"unused_entitlement",label:"Replacement entitlement unused"}],
        hidden: ["Your public review identity", "Review text and history", "Order reference", "Exact purchase date", "Shipping details"],
        checks: ["Issuer signature", "Credential control", "Support time window", "Unused entitlement"],
        conditions: ["The recipient receives eligibility results, not the purchase record.", "Fulfillment details need a separate disclosure."],
        requiredClaims:["merchant_issued","product_matches","within_support_period","unused_entitlement"], maxDuration: 604800, bridge: false,
      },
      {
        id: "regulatory", name: "Regulatory escalation", recipient: "Consumer protection office", recipientKind: "regulator",
        purpose: "Investigate this purchase dispute", action: "Receive selected dispute evidence", record: "Selected purchase, review, and support records",
        claims: [{id:"purchase_details",label:"Selected purchase details"},{id:"review_snapshot",label:"Selected review snapshot"},{id:"support_decision",label:"Signed support decision"},{id:"selected_linkage",label:"Link between these selected records"}],
        hidden: ["Unrelated purchases", "Other reviews", "Unselected records", "Credential secrets"],
        checks: ["Purchase provenance", "Record integrity", "Support decision signature", "Recipient-bound linkage"],
        conditions: ["Only the named investigator receives the selected evidence.", "The merchant and public do not receive the new linkage."],
        requiredClaims:["purchase_details","review_snapshot","support_decision","selected_linkage"], maxDuration: 604800, bridge: true,
      },
    ],
  },
  {
    id: "healthcare", name: "Healthcare", color: "violet", symbol: "health",
    description: "Separate treatment access from research consent.",
    defaultTitle: "Specialist referral", recordNames: ["Selected observations", "Referral summary"],
    contexts: [
      {
        id: "treatment", name: "Specialist treatment", recipient: "Dr. Chen", recipientKind: "specialist",
        purpose: "Specialist treatment", action: "Read selected observations", record: "Selected observations",
        claims: [{id:"observations",label:"Selected observations"},{id:"referral_summary",label:"Referral summary"}],
        hidden: ["Complete medical history", "Unrelated test results", "Research participation", "Other care relationships"],
        checks: ["Record provenance", "Named recipient", "Current consent", "Authorized period"],
        conditions: ["Access is limited to the selected records and treatment purpose.", "Treatment consent does not authorize research use."],
        requiredClaims:["observations"], maxDuration: 604800, bridge: false,
      },
      {
        id: "research", name: "Research eligibility", recipient: "Research team", recipientKind: "research-service",
        purpose: "Study eligibility", action: "Receive an eligibility result", record: "Selected observations",
        claims: [{id:"eligibility_result",label:"Study eligibility result"}],
        hidden: ["Treatment records", "Test values", "Specialist relationship", "Complete medical history", "Unrelated study participation"],
        checks: ["Approved eligibility criterion", "Record provenance", "Separate research consent", "Named recipient"],
        conditions: ["Only an eligibility result may be disclosed.", "This consent is separate from treatment access."],
        requiredClaims:["eligibility_result"], maxDuration: 604800, bridge: false,
      },
    ],
  },
];

export function profileById(id) {
  const profile = CONTEXT_PROFILES.find((item) => item.id === id);
  if (!profile) throw new Error("Choose a context type.");
  return profile;
}

export function policyFor(context) {
  const policy = profileById(context.profileId).contexts.find((item) => item.id === context.policyId);
  if (!policy) throw new Error("This context is unavailable.");
  return policy;
}
