import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type SemanticVersion = { major: bigint; minor: bigint; patch: bigint };

export type ActivationAdmissionEnvelope = { envelopeVersion: bigint;
                                            namespaceHash: Uint8Array;
                                            templateIdHash: Uint8Array;
                                            semanticVersion: SemanticVersion;
                                            templateContentHash: Uint8Array;
                                            governancePolicyHash: Uint8Array;
                                            proofModuleBindingsHash: Uint8Array;
                                            proofModuleBindingRoot: { field: bigint
                                                                    };
                                            proofModuleBindingCount: bigint;
                                            proofModuleRegistrySequence: bigint;
                                            m4ActivationRecordHash: Uint8Array;
                                            approvalEvidenceCommitment: Uint8Array;
                                            authorityRootVersion: bigint;
                                            authorityRootSequence: bigint;
                                            targetNetworkHash: Uint8Array;
                                            targetContractIdentity: Uint8Array;
                                            registryProtocolVersion: bigint;
                                            admissionNonce: Uint8Array;
                                            activatedAt: bigint;
                                            stagingExpiresAt: bigint
                                          };

export type GovernanceActivatorLeaf = { leafVersion: bigint;
                                        namespaceHash: Uint8Array;
                                        governancePolicyHash: Uint8Array;
                                        authorityKind: bigint;
                                        publicKey: __compactRuntime.JubjubPoint;
                                        validAfter: bigint;
                                        validBefore: bigint
                                      };

export type AuthorityRootRecord = { governancePolicyHash: Uint8Array;
                                    root: { field: bigint };
                                    rootVersion: bigint;
                                    rootSequence: bigint;
                                    moduleReviewThreshold: bigint;
                                    moduleApprovalThreshold: bigint;
                                    authorityRootUpdateThreshold: bigint
                                  };

export type AuthorityRootUpdateCommand = { commandVersion: bigint;
                                           namespaceHash: Uint8Array;
                                           currentGovernancePolicyHash: Uint8Array;
                                           currentRoot: { field: bigint };
                                           currentRootVersion: bigint;
                                           currentRootSequence: bigint;
                                           nextGovernancePolicyHash: Uint8Array;
                                           nextRoot: { field: bigint };
                                           nextRootVersion: bigint;
                                           nextRootSequence: bigint;
                                           nextModuleReviewThreshold: bigint;
                                           nextModuleApprovalThreshold: bigint;
                                           nextAuthorityRootUpdateThreshold: bigint;
                                           effectiveAt: bigint;
                                           updateNonce: Uint8Array
                                         };

export type AuthorityRootUpdateProgress = { updateCommitment: Uint8Array;
                                            approvalThreshold: bigint;
                                            approvalCount: bigint;
                                            approvalEvidenceAccumulator: Uint8Array
                                          };

export type AuthorityRootUpdateApprovalKey = { updateCommitment: Uint8Array;
                                               approverAuthorityCommitment: Uint8Array
                                             };

export type AuthorityRootUpdateApprovalStep = { previous: Uint8Array;
                                                updateCommitment: Uint8Array;
                                                approverAuthorityCommitment: Uint8Array
                                              };

export type AuthorityRootUpdateApprovalRecord = { updateCommitment: Uint8Array;
                                                  approverAuthorityCommitment: Uint8Array;
                                                  approvedAt: bigint
                                                };

export type TemplateRegistryTarget = { namespaceHash: Uint8Array;
                                       templateIdHash: Uint8Array;
                                       semanticVersion: SemanticVersion;
                                       templateContentHash: Uint8Array
                                     };

export type ProofModuleIdentity = { moduleIdHash: Uint8Array;
                                    moduleVersion: SemanticVersion;
                                    implementationHash: Uint8Array
                                  };

export type ProofModuleRecord = { identity: ProofModuleIdentity;
                                  proposalCommitment: Uint8Array;
                                  governanceNamespaceHash: Uint8Array;
                                  governancePolicyHash: Uint8Array;
                                  authorityRootVersion: bigint;
                                  authorityRootSequence: bigint;
                                  implementationReferenceHash: Uint8Array;
                                  sourceHash: Uint8Array;
                                  inputSchemaHash: Uint8Array;
                                  configurationSchemaHash: Uint8Array;
                                  receiptSchemaHash: Uint8Array;
                                  compilerVersionHash: Uint8Array;
                                  compatibilityPolicyHash: Uint8Array;
                                  approvalEvidenceCommitment: Uint8Array;
                                  reviewThreshold: bigint;
                                  reviewCount: bigint;
                                  reviewEvidenceAccumulator: Uint8Array;
                                  approvalThreshold: bigint;
                                  approvalCount: bigint;
                                  approvalEvidenceAccumulator: Uint8Array;
                                  lifecycleStatus: bigint;
                                  activationSequence: bigint;
                                  proposedAt: bigint;
                                  reviewedAt: bigint;
                                  approvedAt: bigint;
                                  activatedAt: bigint;
                                  deprecatedAt: bigint;
                                  revokedAt: bigint
                                };

export type ProofModuleProposal = { proposalVersion: bigint;
                                    identity: ProofModuleIdentity;
                                    governanceNamespaceHash: Uint8Array;
                                    governancePolicyHash: Uint8Array;
                                    authorityRootVersion: bigint;
                                    authorityRootSequence: bigint;
                                    implementationReferenceHash: Uint8Array;
                                    sourceHash: Uint8Array;
                                    inputSchemaHash: Uint8Array;
                                    configurationSchemaHash: Uint8Array;
                                    receiptSchemaHash: Uint8Array;
                                    compilerVersionHash: Uint8Array;
                                    compatibilityPolicyHash: Uint8Array;
                                    proposedAt: bigint
                                  };

export type ProofModuleReview = { reviewVersion: bigint;
                                  moduleKey: Uint8Array;
                                  proposalCommitment: Uint8Array;
                                  governanceNamespaceHash: Uint8Array;
                                  governancePolicyHash: Uint8Array;
                                  authorityRootVersion: bigint;
                                  authorityRootSequence: bigint;
                                  reviewedAt: bigint;
                                  reviewNonce: Uint8Array
                                };

export type ProofModuleReviewAccumulatorStep = { previous: Uint8Array;
                                                 reviewCommitment: Uint8Array;
                                                 reviewerAuthorityCommitment: Uint8Array
                                               };

export type ProofModuleReviewKey = { moduleKey: Uint8Array;
                                     reviewerAuthorityCommitment: Uint8Array
                                   };

export type ProofModuleReviewRecord = { moduleKey: Uint8Array;
                                        reviewerAuthorityCommitment: Uint8Array;
                                        reviewCommitment: Uint8Array;
                                        reviewedAt: bigint
                                      };

export type ProofModuleApprovalAccumulatorStep = { previous: Uint8Array;
                                                   approvalCommitment: Uint8Array;
                                                   approverAuthorityCommitment: Uint8Array
                                                 };

export type ProofModuleApprovalKey = { moduleKey: Uint8Array;
                                       approverAuthorityCommitment: Uint8Array
                                     };

export type ProofModuleApprovalRecord = { moduleKey: Uint8Array;
                                          approverAuthorityCommitment: Uint8Array;
                                          approvalCommitment: Uint8Array;
                                          approvedAt: bigint
                                        };

export type ProofModuleLifecycleCommand = { commandVersion: bigint;
                                            moduleKey: Uint8Array;
                                            recordCommitment: Uint8Array;
                                            governanceNamespaceHash: Uint8Array;
                                            governancePolicyHash: Uint8Array;
                                            authorityRootVersion: bigint;
                                            authorityRootSequence: bigint;
                                            expectedLifecycleStatus: bigint;
                                            nextLifecycleStatus: bigint;
                                            effectiveAt: bigint;
                                            reasonHash: Uint8Array;
                                            commandNonce: Uint8Array
                                          };

export type ProofModuleBinding = { bindingVersion: bigint;
                                   actionIndex: bigint;
                                   actionIdHash: Uint8Array;
                                   proofProfileIdHash: Uint8Array;
                                   moduleIdHash: Uint8Array;
                                   moduleVersion: SemanticVersion;
                                   implementationHash: Uint8Array;
                                   configurationHash: Uint8Array;
                                   receiptSchemaHash: Uint8Array
                                 };

export type BindingAccumulatorStep = { previous: Uint8Array;
                                       bindingCommitment: Uint8Array;
                                       actionIndex: bigint
                                     };

export type ActivationStagingRecord = { envelopeCommitment: Uint8Array;
                                        namespaceHash: Uint8Array;
                                        governancePolicyHash: Uint8Array;
                                        authorityRootVersion: bigint;
                                        authorityRootSequence: bigint;
                                        proofModuleBindingsHash: Uint8Array;
                                        proofModuleBindingRoot: { field: bigint
                                                                };
                                        proofModuleBindingCount: bigint;
                                        proofModuleRegistrySequence: bigint;
                                        nextBindingIndex: bigint;
                                        stagedBindingsAccumulator: Uint8Array;
                                        admissionNonce: Uint8Array;
                                        expiresAt: bigint
                                      };

export type ActiveTemplateRecord = { target: TemplateRegistryTarget;
                                     governancePolicyHash: Uint8Array;
                                     proofModuleBindingsHash: Uint8Array;
                                     proofModuleBindingRoot: { field: bigint };
                                     proofModuleBindingCount: bigint;
                                     proofModuleRegistrySequence: bigint;
                                     stagedBindingsAccumulator: Uint8Array;
                                     m4ActivationRecordHash: Uint8Array;
                                     approvalEvidenceCommitment: Uint8Array;
                                     authorityRootVersion: bigint;
                                     authorityRootSequence: bigint;
                                     lifecycleStatus: bigint;
                                     activationSequence: bigint;
                                     activatedAt: bigint;
                                     terminationEffectiveSequence: bigint;
                                     terminationReasonHash: Uint8Array;
                                     retiredAt: bigint;
                                     revokedAt: bigint
                                   };

export type TemplateLifecycleCommand = { commandVersion: bigint;
                                         registryKey: Uint8Array;
                                         recordCommitment: Uint8Array;
                                         namespaceHash: Uint8Array;
                                         governancePolicyHash: Uint8Array;
                                         authorityRootVersion: bigint;
                                         authorityRootSequence: bigint;
                                         expectedLifecycleStatus: bigint;
                                         nextLifecycleStatus: bigint;
                                         effectiveAt: bigint;
                                         effectiveSequence: bigint;
                                         reasonHash: Uint8Array;
                                         commandNonce: Uint8Array
                                       };

export type RuntimeScopeRoots = { actionsRoot: { field: bigint };
                                  resourceSelectorsRoot: { field: bigint };
                                  resourcesRoot: { field: bigint };
                                  purposesRoot: { field: bigint };
                                  recipientKindsRoot: { field: bigint };
                                  recipientsRoot: { field: bigint };
                                  disclosurePolicyIdsRoot: { field: bigint }
                                };

export type RuntimeAccountCredential = { credentialVersion: bigint;
                                         target: TemplateRegistryTarget;
                                         instanceCommitment: Uint8Array;
                                         contextHash: Uint8Array;
                                         accountIdHash: Uint8Array;
                                         principalKind: bigint;
                                         m5AccountCommitment: Uint8Array;
                                         runtimePublicKey: __compactRuntime.JubjubPoint;
                                         statusIndex: bigint;
                                         issuedAt: bigint;
                                         validBefore: bigint
                                       };

export type RuntimeCapabilityCredential = { credentialVersion: bigint;
                                            target: TemplateRegistryTarget;
                                            instanceCommitment: Uint8Array;
                                            contextHash: Uint8Array;
                                            grantIdHash: Uint8Array;
                                            m5GrantCommitment: Uint8Array;
                                            subjectAccountCredentialCommitment: Uint8Array;
                                            parentCapabilityCredentialCommitment: Uint8Array;
                                            issuerAccountCredentialCommitment: Uint8Array;
                                            scopeRoots: RuntimeScopeRoots;
                                            notBefore: bigint;
                                            expiresAt: bigint;
                                            delegationDepth: bigint;
                                            maxDelegationDepth: bigint;
                                            statusIndex: bigint;
                                            issuedAt: bigint
                                          };

export type RuntimeSessionCredential = { credentialVersion: bigint;
                                         target: TemplateRegistryTarget;
                                         instanceCommitment: Uint8Array;
                                         contextHash: Uint8Array;
                                         sessionIdHash: Uint8Array;
                                         m5SessionCommitment: Uint8Array;
                                         subjectAccountCredentialCommitment: Uint8Array;
                                         capabilityCredentialCommitment: Uint8Array;
                                         scopeRoots: RuntimeScopeRoots;
                                         runtimePublicKey: __compactRuntime.JubjubPoint;
                                         notBefore: bigint;
                                         expiresAt: bigint;
                                         statusIndex: bigint;
                                         issuedAt: bigint
                                       };

export type RuntimeActionIntent = { intentVersion: bigint;
                                    target: TemplateRegistryTarget;
                                    instanceCommitment: Uint8Array;
                                    contextHash: Uint8Array;
                                    sessionCredentialCommitment: Uint8Array;
                                    actionIdHash: Uint8Array;
                                    resourceSelectorHash: Uint8Array;
                                    resourceHash: Uint8Array;
                                    purposeHash: Uint8Array;
                                    recipientKindHash: Uint8Array;
                                    recipientHash: Uint8Array;
                                    disclosurePolicyIdHash: Uint8Array;
                                    m5IntentCommitment: Uint8Array;
                                    issuedAt: bigint;
                                    nonceHash: Uint8Array
                                  };

export type CredentialStatusRootRecord = { root: { field: bigint };
                                           rootSequence: bigint
                                         };

export type RuntimeCredentialStatusLeaf = { leafVersion: bigint;
                                            namespaceHash: Uint8Array;
                                            credentialKind: bigint;
                                            credentialCommitment: Uint8Array;
                                            revocationAuthorityAccountCredentialCommitment: Uint8Array;
                                            statusIndex: bigint;
                                            status: bigint
                                          };

export type RuntimeCredentialStatusCommand = { commandVersion: bigint;
                                               namespaceHash: Uint8Array;
                                               governancePolicyHash: Uint8Array;
                                               authorityRootVersion: bigint;
                                               authorityRootSequence: bigint;
                                               credentialStatusRootSequence: bigint;
                                               credentialKind: bigint;
                                               credentialCommitment: Uint8Array;
                                               subjectAccountCredentialCommitment: Uint8Array;
                                               revocationAuthorityAccountCredentialCommitment: Uint8Array;
                                               statusIndex: bigint;
                                               expectedStatus: bigint;
                                               nextStatus: bigint;
                                               effectiveAt: bigint;
                                               commandNonce: Uint8Array
                                             };

export type FinalizationResult = { activated: boolean; registryKey: Uint8Array
                                 };

export type Witnesses<PS> = {
  getSchnorrReduction(context: __compactRuntime.WitnessContext<Ledger, PS>,
                      challengeHash_0: bigint): [PS, [bigint, bigint]];
}

export type ImpureCircuits<PS> = {
  verifyGovernanceActivationSignature(context: __compactRuntime.CircuitContext<PS>,
                                      envelope_0: ActivationAdmissionEnvelope,
                                      signature_0: { announcement: __compactRuntime.JubjubPoint,
                                                     response: bigint
                                                   },
                                      publicKey_0: __compactRuntime.JubjubPoint): __compactRuntime.CircuitResults<PS, []>;
  submitAuthorityRootApproval(context: __compactRuntime.CircuitContext<PS>,
                              command_0: AuthorityRootUpdateCommand,
                              signature_0: { announcement: __compactRuntime.JubjubPoint,
                                             response: bigint
                                           },
                              governor_0: GovernanceActivatorLeaf,
                              authorityPath_0: { leaf: Uint8Array,
                                                 path: { sibling: { field: bigint
                                                                  },
                                                         goes_left: boolean
                                                       }[]
                                               }): __compactRuntime.CircuitResults<PS, bigint>;
  proposeProofModule(context: __compactRuntime.CircuitContext<PS>,
                     proposal_0: ProofModuleProposal): __compactRuntime.CircuitResults<PS, Uint8Array>;
  reviewProofModule(context: __compactRuntime.CircuitContext<PS>,
                    review_0: ProofModuleReview,
                    signature_0: { announcement: __compactRuntime.JubjubPoint,
                                   response: bigint
                                 },
                    reviewer_0: GovernanceActivatorLeaf,
                    authorityPath_0: { leaf: Uint8Array,
                                       path: { sibling: { field: bigint },
                                               goes_left: boolean
                                             }[]
                                     }): __compactRuntime.CircuitResults<PS, bigint>;
  governProofModule(context: __compactRuntime.CircuitContext<PS>,
                    command_0: ProofModuleLifecycleCommand,
                    signature_0: { announcement: __compactRuntime.JubjubPoint,
                                   response: bigint
                                 },
                    authority_0: GovernanceActivatorLeaf,
                    authorityPath_0: { leaf: Uint8Array,
                                       path: { sibling: { field: bigint },
                                               goes_left: boolean
                                             }[]
                                     }): __compactRuntime.CircuitResults<PS, bigint>;
  terminateTemplate(context: __compactRuntime.CircuitContext<PS>,
                    command_0: TemplateLifecycleCommand,
                    signature_0: { announcement: __compactRuntime.JubjubPoint,
                                   response: bigint
                                 },
                    authority_0: GovernanceActivatorLeaf,
                    authorityPath_0: { leaf: Uint8Array,
                                       path: { sibling: { field: bigint },
                                               goes_left: boolean
                                             }[]
                                     }): __compactRuntime.CircuitResults<PS, boolean>;
  beginM4Activation(context: __compactRuntime.CircuitContext<PS>,
                    envelope_0: ActivationAdmissionEnvelope,
                    signature_0: { announcement: __compactRuntime.JubjubPoint,
                                   response: bigint
                                 },
                    activator_0: GovernanceActivatorLeaf,
                    authorityPath_0: { leaf: Uint8Array,
                                       path: { sibling: { field: bigint },
                                               goes_left: boolean
                                             }[]
                                     }): __compactRuntime.CircuitResults<PS, Uint8Array>;
  stageM4ActivationBinding(context: __compactRuntime.CircuitContext<PS>,
                           registryKey_0: Uint8Array,
                           binding_0: ProofModuleBinding,
                           bindingPath_0: { leaf: Uint8Array,
                                            path: { sibling: { field: bigint },
                                                    goes_left: boolean
                                                  }[]
                                          }): __compactRuntime.CircuitResults<PS, boolean>;
  finalizeM4Activation(context: __compactRuntime.CircuitContext<PS>,
                       envelope_0: ActivationAdmissionEnvelope,
                       signature_0: { announcement: __compactRuntime.JubjubPoint,
                                      response: bigint
                                    },
                       activator_0: GovernanceActivatorLeaf,
                       authorityPath_0: { leaf: Uint8Array,
                                          path: { sibling: { field: bigint },
                                                  goes_left: boolean
                                                }[]
                                        }): __compactRuntime.CircuitResults<PS, FinalizationResult>;
  updateRuntimeCredentialStatus(context: __compactRuntime.CircuitContext<PS>,
                                command_0: RuntimeCredentialStatusCommand,
                                signature_0: { announcement: __compactRuntime.JubjubPoint,
                                               response: bigint
                                             },
                                namespaceAuthority_0: GovernanceActivatorLeaf,
                                namespaceAuthorityPath_0: { leaf: Uint8Array,
                                                            path: { sibling: { field: bigint
                                                                             },
                                                                    goes_left: boolean
                                                                  }[]
                                                          },
                                accountAuthority_0: RuntimeAccountCredential,
                                accountAuthorityStatusPath_0: { leaf: Uint8Array,
                                                                path: { sibling: { field: bigint
                                                                                 },
                                                                        goes_left: boolean
                                                                      }[]
                                                              },
                                currentStatusPath_0: { leaf: Uint8Array,
                                                       path: { sibling: { field: bigint
                                                                        },
                                                               goes_left: boolean
                                                             }[]
                                                     }): __compactRuntime.CircuitResults<PS, bigint>;
}

export type ProvableCircuits<PS> = {
  submitAuthorityRootApproval(context: __compactRuntime.CircuitContext<PS>,
                              command_0: AuthorityRootUpdateCommand,
                              signature_0: { announcement: __compactRuntime.JubjubPoint,
                                             response: bigint
                                           },
                              governor_0: GovernanceActivatorLeaf,
                              authorityPath_0: { leaf: Uint8Array,
                                                 path: { sibling: { field: bigint
                                                                  },
                                                         goes_left: boolean
                                                       }[]
                                               }): __compactRuntime.CircuitResults<PS, bigint>;
  proposeProofModule(context: __compactRuntime.CircuitContext<PS>,
                     proposal_0: ProofModuleProposal): __compactRuntime.CircuitResults<PS, Uint8Array>;
  reviewProofModule(context: __compactRuntime.CircuitContext<PS>,
                    review_0: ProofModuleReview,
                    signature_0: { announcement: __compactRuntime.JubjubPoint,
                                   response: bigint
                                 },
                    reviewer_0: GovernanceActivatorLeaf,
                    authorityPath_0: { leaf: Uint8Array,
                                       path: { sibling: { field: bigint },
                                               goes_left: boolean
                                             }[]
                                     }): __compactRuntime.CircuitResults<PS, bigint>;
  governProofModule(context: __compactRuntime.CircuitContext<PS>,
                    command_0: ProofModuleLifecycleCommand,
                    signature_0: { announcement: __compactRuntime.JubjubPoint,
                                   response: bigint
                                 },
                    authority_0: GovernanceActivatorLeaf,
                    authorityPath_0: { leaf: Uint8Array,
                                       path: { sibling: { field: bigint },
                                               goes_left: boolean
                                             }[]
                                     }): __compactRuntime.CircuitResults<PS, bigint>;
  terminateTemplate(context: __compactRuntime.CircuitContext<PS>,
                    command_0: TemplateLifecycleCommand,
                    signature_0: { announcement: __compactRuntime.JubjubPoint,
                                   response: bigint
                                 },
                    authority_0: GovernanceActivatorLeaf,
                    authorityPath_0: { leaf: Uint8Array,
                                       path: { sibling: { field: bigint },
                                               goes_left: boolean
                                             }[]
                                     }): __compactRuntime.CircuitResults<PS, boolean>;
  beginM4Activation(context: __compactRuntime.CircuitContext<PS>,
                    envelope_0: ActivationAdmissionEnvelope,
                    signature_0: { announcement: __compactRuntime.JubjubPoint,
                                   response: bigint
                                 },
                    activator_0: GovernanceActivatorLeaf,
                    authorityPath_0: { leaf: Uint8Array,
                                       path: { sibling: { field: bigint },
                                               goes_left: boolean
                                             }[]
                                     }): __compactRuntime.CircuitResults<PS, Uint8Array>;
  stageM4ActivationBinding(context: __compactRuntime.CircuitContext<PS>,
                           registryKey_0: Uint8Array,
                           binding_0: ProofModuleBinding,
                           bindingPath_0: { leaf: Uint8Array,
                                            path: { sibling: { field: bigint },
                                                    goes_left: boolean
                                                  }[]
                                          }): __compactRuntime.CircuitResults<PS, boolean>;
  finalizeM4Activation(context: __compactRuntime.CircuitContext<PS>,
                       envelope_0: ActivationAdmissionEnvelope,
                       signature_0: { announcement: __compactRuntime.JubjubPoint,
                                      response: bigint
                                    },
                       activator_0: GovernanceActivatorLeaf,
                       authorityPath_0: { leaf: Uint8Array,
                                          path: { sibling: { field: bigint },
                                                  goes_left: boolean
                                                }[]
                                        }): __compactRuntime.CircuitResults<PS, FinalizationResult>;
  updateRuntimeCredentialStatus(context: __compactRuntime.CircuitContext<PS>,
                                command_0: RuntimeCredentialStatusCommand,
                                signature_0: { announcement: __compactRuntime.JubjubPoint,
                                               response: bigint
                                             },
                                namespaceAuthority_0: GovernanceActivatorLeaf,
                                namespaceAuthorityPath_0: { leaf: Uint8Array,
                                                            path: { sibling: { field: bigint
                                                                             },
                                                                    goes_left: boolean
                                                                  }[]
                                                          },
                                accountAuthority_0: RuntimeAccountCredential,
                                accountAuthorityStatusPath_0: { leaf: Uint8Array,
                                                                path: { sibling: { field: bigint
                                                                                 },
                                                                        goes_left: boolean
                                                                      }[]
                                                              },
                                currentStatusPath_0: { leaf: Uint8Array,
                                                       path: { sibling: { field: bigint
                                                                        },
                                                               goes_left: boolean
                                                             }[]
                                                     }): __compactRuntime.CircuitResults<PS, bigint>;
}

export type PureCircuits = {
  activationAdmissionMessage(envelope_0: ActivationAdmissionEnvelope): bigint[];
  activationAdmissionEnvelopeCommitment(envelope_0: ActivationAdmissionEnvelope): Uint8Array;
  governanceActivatorLeafCommitment(leaf_0: GovernanceActivatorLeaf): Uint8Array;
  authorityRootUpdateCommandCommitment(command_0: AuthorityRootUpdateCommand): Uint8Array;
  authorityRootUpdateCommandMessage(command_0: AuthorityRootUpdateCommand): bigint[];
  templateLifecycleCommandMessage(command_0: TemplateLifecycleCommand): bigint[];
  runtimeAccountCredentialCommitment(credential_0: RuntimeAccountCredential): Uint8Array;
  runtimeScopeValueCommitment(valueHash_0: Uint8Array): Uint8Array;
  runtimeCredentialStatusLeafCommitment(leaf_0: RuntimeCredentialStatusLeaf): Uint8Array;
  runtimeCredentialStatusPathRoot(path_0: { leaf: Uint8Array,
                                            path: { sibling: { field: bigint },
                                                    goes_left: boolean
                                                  }[]
                                          }): { field: bigint };
  runtimeCredentialStatusLeafParent(path_0: { leaf: Uint8Array,
                                              path: { sibling: { field: bigint },
                                                      goes_left: boolean
                                                    }[]
                                            }): { field: bigint };
  runtimeCredentialStatusNodeParent(path_0: { leaf: { field: bigint },
                                              path: { sibling: { field: bigint },
                                                      goes_left: boolean
                                                    }[]
                                            }): { field: bigint };
  runtimeCredentialStatusCommandMessage(command_0: RuntimeCredentialStatusCommand): bigint[];
  runtimeCapabilityCredentialCommitment(credential_0: RuntimeCapabilityCredential): Uint8Array;
  runtimeSessionCredentialCommitment(credential_0: RuntimeSessionCredential): Uint8Array;
  runtimeActionIntentCommitment(intent_0: RuntimeActionIntent): Uint8Array;
  runtimeAccountCredentialMessage(credential_0: RuntimeAccountCredential): bigint[];
  runtimeCapabilityCredentialMessage(credential_0: RuntimeCapabilityCredential): bigint[];
  runtimeSessionCredentialMessage(credential_0: RuntimeSessionCredential): bigint[];
  runtimeActionIntentMessage(intent_0: RuntimeActionIntent): bigint[];
  activeTemplateRecordCommitment(record_0: ActiveTemplateRecord): Uint8Array;
  proofModuleBindingCommitment(binding_0: ProofModuleBinding): Uint8Array;
  proofModuleProposalCommitment(proposal_0: ProofModuleProposal): Uint8Array;
  proofModuleRecordCommitment(record_0: ProofModuleRecord): Uint8Array;
  proofModuleReviewCommitment(review_0: ProofModuleReview): Uint8Array;
  proofModuleReviewMessage(review_0: ProofModuleReview): bigint[];
  proofModuleLifecycleCommandMessage(command_0: ProofModuleLifecycleCommand): bigint[];
  proofModuleReviewSignatureChallenge(announcement_0: __compactRuntime.JubjubPoint,
                                      publicKey_0: __compactRuntime.JubjubPoint,
                                      review_0: ProofModuleReview): bigint;
  proofModuleLifecycleSignatureChallenge(announcement_0: __compactRuntime.JubjubPoint,
                                         publicKey_0: __compactRuntime.JubjubPoint,
                                         command_0: ProofModuleLifecycleCommand): bigint;
  governanceActivationSignatureChallenge(announcement_0: __compactRuntime.JubjubPoint,
                                         publicKey_0: __compactRuntime.JubjubPoint,
                                         envelope_0: ActivationAdmissionEnvelope): bigint;
  authorityRootUpdateSignatureChallenge(announcement_0: __compactRuntime.JubjubPoint,
                                        publicKey_0: __compactRuntime.JubjubPoint,
                                        command_0: AuthorityRootUpdateCommand): bigint;
  templateLifecycleSignatureChallenge(announcement_0: __compactRuntime.JubjubPoint,
                                      publicKey_0: __compactRuntime.JubjubPoint,
                                      command_0: TemplateLifecycleCommand): bigint;
  runtimeAccountCredentialSignatureChallenge(announcement_0: __compactRuntime.JubjubPoint,
                                             publicKey_0: __compactRuntime.JubjubPoint,
                                             credential_0: RuntimeAccountCredential): bigint;
  runtimeCapabilityCredentialSignatureChallenge(announcement_0: __compactRuntime.JubjubPoint,
                                                publicKey_0: __compactRuntime.JubjubPoint,
                                                credential_0: RuntimeCapabilityCredential): bigint;
  runtimeSessionCredentialSignatureChallenge(announcement_0: __compactRuntime.JubjubPoint,
                                             publicKey_0: __compactRuntime.JubjubPoint,
                                             credential_0: RuntimeSessionCredential): bigint;
  runtimeActionIntentSignatureChallenge(announcement_0: __compactRuntime.JubjubPoint,
                                        publicKey_0: __compactRuntime.JubjubPoint,
                                        intent_0: RuntimeActionIntent): bigint;
  runtimeCredentialStatusSignatureChallenge(announcement_0: __compactRuntime.JubjubPoint,
                                            publicKey_0: __compactRuntime.JubjubPoint,
                                            command_0: RuntimeCredentialStatusCommand): bigint;
  proofModuleRegistryKeyFromIdentity(identity_0: ProofModuleIdentity): Uint8Array;
}

export type Circuits<PS> = {
  activationAdmissionMessage(context: __compactRuntime.CircuitContext<PS>,
                             envelope_0: ActivationAdmissionEnvelope): __compactRuntime.CircuitResults<PS, bigint[]>;
  activationAdmissionEnvelopeCommitment(context: __compactRuntime.CircuitContext<PS>,
                                        envelope_0: ActivationAdmissionEnvelope): __compactRuntime.CircuitResults<PS, Uint8Array>;
  governanceActivatorLeafCommitment(context: __compactRuntime.CircuitContext<PS>,
                                    leaf_0: GovernanceActivatorLeaf): __compactRuntime.CircuitResults<PS, Uint8Array>;
  authorityRootUpdateCommandCommitment(context: __compactRuntime.CircuitContext<PS>,
                                       command_0: AuthorityRootUpdateCommand): __compactRuntime.CircuitResults<PS, Uint8Array>;
  authorityRootUpdateCommandMessage(context: __compactRuntime.CircuitContext<PS>,
                                    command_0: AuthorityRootUpdateCommand): __compactRuntime.CircuitResults<PS, bigint[]>;
  templateLifecycleCommandMessage(context: __compactRuntime.CircuitContext<PS>,
                                  command_0: TemplateLifecycleCommand): __compactRuntime.CircuitResults<PS, bigint[]>;
  runtimeAccountCredentialCommitment(context: __compactRuntime.CircuitContext<PS>,
                                     credential_0: RuntimeAccountCredential): __compactRuntime.CircuitResults<PS, Uint8Array>;
  runtimeScopeValueCommitment(context: __compactRuntime.CircuitContext<PS>,
                              valueHash_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  runtimeCredentialStatusLeafCommitment(context: __compactRuntime.CircuitContext<PS>,
                                        leaf_0: RuntimeCredentialStatusLeaf): __compactRuntime.CircuitResults<PS, Uint8Array>;
  runtimeCredentialStatusPathRoot(context: __compactRuntime.CircuitContext<PS>,
                                  path_0: { leaf: Uint8Array,
                                            path: { sibling: { field: bigint },
                                                    goes_left: boolean
                                                  }[]
                                          }): __compactRuntime.CircuitResults<PS, { field: bigint
                                                                                  }>;
  runtimeCredentialStatusLeafParent(context: __compactRuntime.CircuitContext<PS>,
                                    path_0: { leaf: Uint8Array,
                                              path: { sibling: { field: bigint },
                                                      goes_left: boolean
                                                    }[]
                                            }): __compactRuntime.CircuitResults<PS, { field: bigint
                                                                                    }>;
  runtimeCredentialStatusNodeParent(context: __compactRuntime.CircuitContext<PS>,
                                    path_0: { leaf: { field: bigint },
                                              path: { sibling: { field: bigint },
                                                      goes_left: boolean
                                                    }[]
                                            }): __compactRuntime.CircuitResults<PS, { field: bigint
                                                                                    }>;
  runtimeCredentialStatusCommandMessage(context: __compactRuntime.CircuitContext<PS>,
                                        command_0: RuntimeCredentialStatusCommand): __compactRuntime.CircuitResults<PS, bigint[]>;
  runtimeCapabilityCredentialCommitment(context: __compactRuntime.CircuitContext<PS>,
                                        credential_0: RuntimeCapabilityCredential): __compactRuntime.CircuitResults<PS, Uint8Array>;
  runtimeSessionCredentialCommitment(context: __compactRuntime.CircuitContext<PS>,
                                     credential_0: RuntimeSessionCredential): __compactRuntime.CircuitResults<PS, Uint8Array>;
  runtimeActionIntentCommitment(context: __compactRuntime.CircuitContext<PS>,
                                intent_0: RuntimeActionIntent): __compactRuntime.CircuitResults<PS, Uint8Array>;
  runtimeAccountCredentialMessage(context: __compactRuntime.CircuitContext<PS>,
                                  credential_0: RuntimeAccountCredential): __compactRuntime.CircuitResults<PS, bigint[]>;
  runtimeCapabilityCredentialMessage(context: __compactRuntime.CircuitContext<PS>,
                                     credential_0: RuntimeCapabilityCredential): __compactRuntime.CircuitResults<PS, bigint[]>;
  runtimeSessionCredentialMessage(context: __compactRuntime.CircuitContext<PS>,
                                  credential_0: RuntimeSessionCredential): __compactRuntime.CircuitResults<PS, bigint[]>;
  runtimeActionIntentMessage(context: __compactRuntime.CircuitContext<PS>,
                             intent_0: RuntimeActionIntent): __compactRuntime.CircuitResults<PS, bigint[]>;
  activeTemplateRecordCommitment(context: __compactRuntime.CircuitContext<PS>,
                                 record_0: ActiveTemplateRecord): __compactRuntime.CircuitResults<PS, Uint8Array>;
  proofModuleBindingCommitment(context: __compactRuntime.CircuitContext<PS>,
                               binding_0: ProofModuleBinding): __compactRuntime.CircuitResults<PS, Uint8Array>;
  proofModuleProposalCommitment(context: __compactRuntime.CircuitContext<PS>,
                                proposal_0: ProofModuleProposal): __compactRuntime.CircuitResults<PS, Uint8Array>;
  proofModuleRecordCommitment(context: __compactRuntime.CircuitContext<PS>,
                              record_0: ProofModuleRecord): __compactRuntime.CircuitResults<PS, Uint8Array>;
  proofModuleReviewCommitment(context: __compactRuntime.CircuitContext<PS>,
                              review_0: ProofModuleReview): __compactRuntime.CircuitResults<PS, Uint8Array>;
  proofModuleReviewMessage(context: __compactRuntime.CircuitContext<PS>,
                           review_0: ProofModuleReview): __compactRuntime.CircuitResults<PS, bigint[]>;
  proofModuleLifecycleCommandMessage(context: __compactRuntime.CircuitContext<PS>,
                                     command_0: ProofModuleLifecycleCommand): __compactRuntime.CircuitResults<PS, bigint[]>;
  proofModuleReviewSignatureChallenge(context: __compactRuntime.CircuitContext<PS>,
                                      announcement_0: __compactRuntime.JubjubPoint,
                                      publicKey_0: __compactRuntime.JubjubPoint,
                                      review_0: ProofModuleReview): __compactRuntime.CircuitResults<PS, bigint>;
  proofModuleLifecycleSignatureChallenge(context: __compactRuntime.CircuitContext<PS>,
                                         announcement_0: __compactRuntime.JubjubPoint,
                                         publicKey_0: __compactRuntime.JubjubPoint,
                                         command_0: ProofModuleLifecycleCommand): __compactRuntime.CircuitResults<PS, bigint>;
  governanceActivationSignatureChallenge(context: __compactRuntime.CircuitContext<PS>,
                                         announcement_0: __compactRuntime.JubjubPoint,
                                         publicKey_0: __compactRuntime.JubjubPoint,
                                         envelope_0: ActivationAdmissionEnvelope): __compactRuntime.CircuitResults<PS, bigint>;
  authorityRootUpdateSignatureChallenge(context: __compactRuntime.CircuitContext<PS>,
                                        announcement_0: __compactRuntime.JubjubPoint,
                                        publicKey_0: __compactRuntime.JubjubPoint,
                                        command_0: AuthorityRootUpdateCommand): __compactRuntime.CircuitResults<PS, bigint>;
  templateLifecycleSignatureChallenge(context: __compactRuntime.CircuitContext<PS>,
                                      announcement_0: __compactRuntime.JubjubPoint,
                                      publicKey_0: __compactRuntime.JubjubPoint,
                                      command_0: TemplateLifecycleCommand): __compactRuntime.CircuitResults<PS, bigint>;
  runtimeAccountCredentialSignatureChallenge(context: __compactRuntime.CircuitContext<PS>,
                                             announcement_0: __compactRuntime.JubjubPoint,
                                             publicKey_0: __compactRuntime.JubjubPoint,
                                             credential_0: RuntimeAccountCredential): __compactRuntime.CircuitResults<PS, bigint>;
  runtimeCapabilityCredentialSignatureChallenge(context: __compactRuntime.CircuitContext<PS>,
                                                announcement_0: __compactRuntime.JubjubPoint,
                                                publicKey_0: __compactRuntime.JubjubPoint,
                                                credential_0: RuntimeCapabilityCredential): __compactRuntime.CircuitResults<PS, bigint>;
  runtimeSessionCredentialSignatureChallenge(context: __compactRuntime.CircuitContext<PS>,
                                             announcement_0: __compactRuntime.JubjubPoint,
                                             publicKey_0: __compactRuntime.JubjubPoint,
                                             credential_0: RuntimeSessionCredential): __compactRuntime.CircuitResults<PS, bigint>;
  runtimeActionIntentSignatureChallenge(context: __compactRuntime.CircuitContext<PS>,
                                        announcement_0: __compactRuntime.JubjubPoint,
                                        publicKey_0: __compactRuntime.JubjubPoint,
                                        intent_0: RuntimeActionIntent): __compactRuntime.CircuitResults<PS, bigint>;
  runtimeCredentialStatusSignatureChallenge(context: __compactRuntime.CircuitContext<PS>,
                                            announcement_0: __compactRuntime.JubjubPoint,
                                            publicKey_0: __compactRuntime.JubjubPoint,
                                            command_0: RuntimeCredentialStatusCommand): __compactRuntime.CircuitResults<PS, bigint>;
  verifyGovernanceActivationSignature(context: __compactRuntime.CircuitContext<PS>,
                                      envelope_0: ActivationAdmissionEnvelope,
                                      signature_0: { announcement: __compactRuntime.JubjubPoint,
                                                     response: bigint
                                                   },
                                      publicKey_0: __compactRuntime.JubjubPoint): __compactRuntime.CircuitResults<PS, []>;
  proofModuleRegistryKeyFromIdentity(context: __compactRuntime.CircuitContext<PS>,
                                     identity_0: ProofModuleIdentity): __compactRuntime.CircuitResults<PS, Uint8Array>;
  submitAuthorityRootApproval(context: __compactRuntime.CircuitContext<PS>,
                              command_0: AuthorityRootUpdateCommand,
                              signature_0: { announcement: __compactRuntime.JubjubPoint,
                                             response: bigint
                                           },
                              governor_0: GovernanceActivatorLeaf,
                              authorityPath_0: { leaf: Uint8Array,
                                                 path: { sibling: { field: bigint
                                                                  },
                                                         goes_left: boolean
                                                       }[]
                                               }): __compactRuntime.CircuitResults<PS, bigint>;
  proposeProofModule(context: __compactRuntime.CircuitContext<PS>,
                     proposal_0: ProofModuleProposal): __compactRuntime.CircuitResults<PS, Uint8Array>;
  reviewProofModule(context: __compactRuntime.CircuitContext<PS>,
                    review_0: ProofModuleReview,
                    signature_0: { announcement: __compactRuntime.JubjubPoint,
                                   response: bigint
                                 },
                    reviewer_0: GovernanceActivatorLeaf,
                    authorityPath_0: { leaf: Uint8Array,
                                       path: { sibling: { field: bigint },
                                               goes_left: boolean
                                             }[]
                                     }): __compactRuntime.CircuitResults<PS, bigint>;
  governProofModule(context: __compactRuntime.CircuitContext<PS>,
                    command_0: ProofModuleLifecycleCommand,
                    signature_0: { announcement: __compactRuntime.JubjubPoint,
                                   response: bigint
                                 },
                    authority_0: GovernanceActivatorLeaf,
                    authorityPath_0: { leaf: Uint8Array,
                                       path: { sibling: { field: bigint },
                                               goes_left: boolean
                                             }[]
                                     }): __compactRuntime.CircuitResults<PS, bigint>;
  terminateTemplate(context: __compactRuntime.CircuitContext<PS>,
                    command_0: TemplateLifecycleCommand,
                    signature_0: { announcement: __compactRuntime.JubjubPoint,
                                   response: bigint
                                 },
                    authority_0: GovernanceActivatorLeaf,
                    authorityPath_0: { leaf: Uint8Array,
                                       path: { sibling: { field: bigint },
                                               goes_left: boolean
                                             }[]
                                     }): __compactRuntime.CircuitResults<PS, boolean>;
  beginM4Activation(context: __compactRuntime.CircuitContext<PS>,
                    envelope_0: ActivationAdmissionEnvelope,
                    signature_0: { announcement: __compactRuntime.JubjubPoint,
                                   response: bigint
                                 },
                    activator_0: GovernanceActivatorLeaf,
                    authorityPath_0: { leaf: Uint8Array,
                                       path: { sibling: { field: bigint },
                                               goes_left: boolean
                                             }[]
                                     }): __compactRuntime.CircuitResults<PS, Uint8Array>;
  stageM4ActivationBinding(context: __compactRuntime.CircuitContext<PS>,
                           registryKey_0: Uint8Array,
                           binding_0: ProofModuleBinding,
                           bindingPath_0: { leaf: Uint8Array,
                                            path: { sibling: { field: bigint },
                                                    goes_left: boolean
                                                  }[]
                                          }): __compactRuntime.CircuitResults<PS, boolean>;
  finalizeM4Activation(context: __compactRuntime.CircuitContext<PS>,
                       envelope_0: ActivationAdmissionEnvelope,
                       signature_0: { announcement: __compactRuntime.JubjubPoint,
                                      response: bigint
                                    },
                       activator_0: GovernanceActivatorLeaf,
                       authorityPath_0: { leaf: Uint8Array,
                                          path: { sibling: { field: bigint },
                                                  goes_left: boolean
                                                }[]
                                        }): __compactRuntime.CircuitResults<PS, FinalizationResult>;
  updateRuntimeCredentialStatus(context: __compactRuntime.CircuitContext<PS>,
                                command_0: RuntimeCredentialStatusCommand,
                                signature_0: { announcement: __compactRuntime.JubjubPoint,
                                               response: bigint
                                             },
                                namespaceAuthority_0: GovernanceActivatorLeaf,
                                namespaceAuthorityPath_0: { leaf: Uint8Array,
                                                            path: { sibling: { field: bigint
                                                                             },
                                                                    goes_left: boolean
                                                                  }[]
                                                          },
                                accountAuthority_0: RuntimeAccountCredential,
                                accountAuthorityStatusPath_0: { leaf: Uint8Array,
                                                                path: { sibling: { field: bigint
                                                                                 },
                                                                        goes_left: boolean
                                                                      }[]
                                                              },
                                currentStatusPath_0: { leaf: Uint8Array,
                                                       path: { sibling: { field: bigint
                                                                        },
                                                               goes_left: boolean
                                                             }[]
                                                     }): __compactRuntime.CircuitResults<PS, bigint>;
}

export type Ledger = {
  readonly targetNetworkHash: Uint8Array;
  authorityRoots: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): AuthorityRootRecord;
    [Symbol.iterator](): Iterator<[Uint8Array, AuthorityRootRecord]>
  };
  authorityRootUpdateProgress: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): AuthorityRootUpdateProgress;
    [Symbol.iterator](): Iterator<[Uint8Array, AuthorityRootUpdateProgress]>
  };
  authorityRootUpdateApprovals: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): AuthorityRootUpdateApprovalRecord;
    [Symbol.iterator](): Iterator<[Uint8Array, AuthorityRootUpdateApprovalRecord]>
  };
  proofModules: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): ProofModuleRecord;
    [Symbol.iterator](): Iterator<[Uint8Array, ProofModuleRecord]>
  };
  readonly proofModuleRegistrySequence: bigint;
  proofModuleReviews: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): ProofModuleReviewRecord;
    [Symbol.iterator](): Iterator<[Uint8Array, ProofModuleReviewRecord]>
  };
  proofModuleApprovals: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): ProofModuleApprovalRecord;
    [Symbol.iterator](): Iterator<[Uint8Array, ProofModuleApprovalRecord]>
  };
  usedProofModuleCommandNonces: {
    isEmpty(): boolean;
    size(): bigint;
    member(elem_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<Uint8Array>
  };
  activationSessions: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): ActivationStagingRecord;
    [Symbol.iterator](): Iterator<[Uint8Array, ActivationStagingRecord]>
  };
  reservedAdmissionNonces: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): Uint8Array;
    [Symbol.iterator](): Iterator<[Uint8Array, Uint8Array]>
  };
  activeTemplates: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): ActiveTemplateRecord;
    [Symbol.iterator](): Iterator<[Uint8Array, ActiveTemplateRecord]>
  };
  usedAdmissionNonces: {
    isEmpty(): boolean;
    size(): bigint;
    member(elem_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<Uint8Array>
  };
  readonly templateActivationSequence: bigint;
  readonly templateLifecycleSequence: bigint;
  usedTemplateLifecycleCommandNonces: {
    isEmpty(): boolean;
    size(): bigint;
    member(elem_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<Uint8Array>
  };
  credentialStatusRoots: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): CredentialStatusRootRecord;
    [Symbol.iterator](): Iterator<[Uint8Array, CredentialStatusRootRecord]>
  };
  usedCredentialStatusCommandNonces: {
    isEmpty(): boolean;
    size(): bigint;
    member(elem_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<Uint8Array>
  };
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  provableCircuits: ProvableCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>,
               networkHash_0: Uint8Array,
               initialNamespaceHash_0: Uint8Array,
               initialGovernancePolicyHash_0: Uint8Array,
               initialAuthorityRoot_0: { field: bigint },
               initialRootVersion_0: bigint,
               initialRootSequence_0: bigint,
               initialCredentialStatusRoot_0: { field: bigint },
               moduleReviewThreshold_0: bigint,
               moduleApprovalThreshold_0: bigint,
               authorityRootUpdateThreshold_0: bigint): __compactRuntime.ConstructorResult<PS>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
