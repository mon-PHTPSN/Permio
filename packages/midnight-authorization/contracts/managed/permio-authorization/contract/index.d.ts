import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type RuntimeStatusMembership = { statusIndex: bigint; leaf: Uint8Array };

export type RuntimeStatusProofNode = { level: bigint;
                                       index: bigint;
                                       digest: { field: bigint }
                                     };

export type RuntimeStatusProofStep = { kind: bigint;
                                       leftFromStack: boolean;
                                       rightFromStack: boolean;
                                       left: RuntimeStatusProofNode;
                                       right: RuntimeStatusProofNode;
                                       parentIndex: bigint;
                                       stackTail: bigint
                                     };

export type RuntimeStatusMultiproof = { witnessVersion: bigint;
                                        rootSequence: bigint;
                                        leafCount: bigint;
                                        leaves: RuntimeStatusMembership[];
                                        steps: RuntimeStatusProofStep[]
                                      };

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

export type RuntimeScopeCounts = { actionsCount: bigint;
                                   resourceSelectorsCount: bigint;
                                   resourcesCount: bigint;
                                   purposesCount: bigint;
                                   recipientKindsCount: bigint;
                                   recipientsCount: bigint;
                                   disclosurePolicyIdsCount: bigint
                                 };

export type RuntimeScopeProgress = { roots: RuntimeScopeRoots;
                                     counts: RuntimeScopeCounts;
                                     lastDimension: bigint;
                                     lastOrderKey: Uint8Array
                                   };

export type RuntimeScopeElement = { elementVersion: bigint;
                                    dimension: bigint;
                                    valueHash: Uint8Array
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
                                            namespaceIssuerAuthorityCommitment: Uint8Array;
                                            scopeRoots: RuntimeScopeRoots;
                                            scopeCounts: RuntimeScopeCounts;
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
                                         scopeCounts: RuntimeScopeCounts;
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
                                               allocationCommitment: Uint8Array;
                                               instanceStateCommitment: Uint8Array;
                                               instanceStateSequence: bigint;
                                               nextInstanceStateCommitment: Uint8Array;
                                               credentialKind: bigint;
                                               credentialCommitment: Uint8Array;
                                               subjectAccountCredentialCommitment: Uint8Array;
                                               revocationAuthorityAccountCredentialCommitment: Uint8Array;
                                               statusIndex: bigint;
                                               expectedStatus: bigint;
                                               nextStatus: bigint;
                                               effectiveAt: bigint;
                                               stagingExpiresAt: bigint;
                                               commandNonce: Uint8Array
                                             };

export type CapabilityAttenuationCertification = { certificationVersion: bigint;
                                                   commandCommitment: Uint8Array;
                                                   capabilityCredentialCommitment: Uint8Array;
                                                   parentCapabilityCredentialCommitment: Uint8Array;
                                                   issuerAccountCredentialCommitment: Uint8Array;
                                                   totalScopeElementCount: bigint;
                                                   stagingExpiresAt: bigint
                                                 };

export type CapabilityAttenuationSession = { certificationCommitment: Uint8Array;
                                             progressCommitment: Uint8Array;
                                             nextElementIndex: bigint;
                                             totalScopeElementCount: bigint;
                                             expiresAt: bigint
                                           };

export type FinalizationResult = { activated: boolean; registryKey: Uint8Array
                                 };

export type RuntimeActiveAncestry = { witnessVersion: bigint;
                                      capabilityCount: bigint;
                                      capabilities: RuntimeCapabilityCredential[];
                                      accounts: RuntimeAccountCredential[];
                                      session: RuntimeSessionCredential;
                                      statusProof: RuntimeStatusMultiproof
                                    };

export type RuntimeActionScopePaths = { actions: { leaf: Uint8Array,
                                                   path: { sibling: { field: bigint
                                                                    },
                                                           goes_left: boolean
                                                         }[]
                                                 };
                                        resourceSelectors: { leaf: Uint8Array,
                                                             path: { sibling: { field: bigint
                                                                              },
                                                                     goes_left: boolean
                                                                   }[]
                                                           };
                                        resources: { leaf: Uint8Array,
                                                     path: { sibling: { field: bigint
                                                                      },
                                                             goes_left: boolean
                                                           }[]
                                                   };
                                        purposes: { leaf: Uint8Array,
                                                    path: { sibling: { field: bigint
                                                                     },
                                                            goes_left: boolean
                                                          }[]
                                                  };
                                        recipientKinds: { leaf: Uint8Array,
                                                          path: { sibling: { field: bigint
                                                                           },
                                                                  goes_left: boolean
                                                                }[]
                                                        };
                                        recipients: { leaf: Uint8Array,
                                                      path: { sibling: { field: bigint
                                                                       },
                                                              goes_left: boolean
                                                            }[]
                                                    };
                                        disclosurePolicyIds: { leaf: Uint8Array,
                                                               path: { sibling: { field: bigint
                                                                                },
                                                                       goes_left: boolean
                                                                     }[]
                                                             }
                                      };

export type RuntimeTemplateActionPolicy = { policyVersion: bigint;
                                            target: TemplateRegistryTarget;
                                            actionIndex: bigint;
                                            bindingActionIdHash: Uint8Array;
                                            actionIdHash: Uint8Array;
                                            proofProfileIdHash: Uint8Array;
                                            proofFamilyHash: Uint8Array;
                                            contextHash: Uint8Array;
                                            actorSlotIdHash: Uint8Array;
                                            slotAssignmentRulesRoot: { field: bigint
                                                                     };
                                            slotAssignmentRuleCount: bigint;
                                            initialStateIdHash: Uint8Array;
                                            resourceSelectorHash: Uint8Array;
                                            purposeHash: Uint8Array;
                                            recipientKindHash: Uint8Array;
                                            disclosurePolicyIdHash: Uint8Array;
                                            capabilityRuleIdHash: Uint8Array;
                                            maxCapabilityDuration: bigint;
                                            maxDelegationDepth: bigint;
                                            revocable: boolean;
                                            inputRecordTypesHash: Uint8Array;
                                            outputClaimTypesHash: Uint8Array;
                                            inputRecordTypesRoot: { field: bigint
                                                                  };
                                            inputRecordTypeCount: bigint;
                                            outputClaimTypesRoot: { field: bigint
                                                                  };
                                            outputClaimTypeCount: bigint;
                                            executionAdapterHash: Uint8Array;
                                            transitionRoot: { field: bigint };
                                            transitionCount: bigint
                                          };

export type RuntimeParticipantSlotRule = { ruleVersion: bigint;
                                           contextHash: Uint8Array;
                                           slotIdHash: Uint8Array;
                                           authorityKind: bigint;
                                           authoritySlotIdHash: Uint8Array
                                         };

export type RuntimeTemplateTransition = { transitionVersion: bigint;
                                          actionIdHash: Uint8Array;
                                          fromStateIdHash: Uint8Array;
                                          toStateIdHash: Uint8Array
                                        };

export type RuntimePrivateMapNode = { nodeVersion: bigint;
                                      key: Uint8Array;
                                      value: Uint8Array;
                                      nextKey: Uint8Array;
                                      nextIndex: bigint
                                    };

export type RuntimePrivateMapWitness = { node: RuntimePrivateMapNode;
                                         path: { leaf: Uint8Array,
                                                 path: { sibling: { field: bigint
                                                                  },
                                                         goes_left: boolean
                                                       }[]
                                               }
                                       };

export type RuntimeInstanceAllocation = { allocationVersion: bigint;
                                          target: TemplateRegistryTarget;
                                          instanceCommitment: Uint8Array;
                                          instanceIdHash: Uint8Array;
                                          allocationRequestIdHash: Uint8Array;
                                          m4AuthorizationCommitment: Uint8Array;
                                          allocatorAuthorityCommitment: Uint8Array;
                                          capabilityIssuersRoot: { field: bigint
                                                                 };
                                          capabilityIssuerCount: bigint;
                                          initialStateCommitment: Uint8Array;
                                          governancePolicyHash: Uint8Array;
                                          authorityRootVersion: bigint;
                                          authorityRootSequence: bigint;
                                          targetNetworkHash: Uint8Array;
                                          targetContractIdentity: Uint8Array;
                                          authorizedAt: bigint;
                                          createdAt: bigint;
                                          expiresAt: bigint;
                                          allocationValidBefore: bigint;
                                          allocationNonce: Uint8Array
                                        };

export type RuntimeInstanceRecord = { allocationCommitment: Uint8Array;
                                      currentStateCommitment: Uint8Array;
                                      transitionSequence: bigint;
                                      lifecycleStatus: bigint
                                    };

export type RuntimeCredentialInstanceBinding = { allocation: RuntimeInstanceAllocation;
                                                 issuerPath: { leaf: Uint8Array,
                                                               path: { sibling: { field: bigint
                                                                                },
                                                                       goes_left: boolean
                                                                     }[]
                                                             };
                                                 validBefore: bigint;
                                                 state: RuntimeStateOpening;
                                                 stateSequence: bigint;
                                                 nextStateNonce: Uint8Array
                                               };

export type RuntimeStateOpening = { stateVersion: bigint;
                                    instanceCommitment: Uint8Array;
                                    stateIdHash: Uint8Array;
                                    lastMutationAt: bigint;
                                    slotAssignmentsRoot: { field: bigint };
                                    slotAssignmentCount: bigint;
                                    slotBindingsRoot: { field: bigint };
                                    slotBindingCount: bigint;
                                    nonce: Uint8Array
                                  };

export type RuntimeAllocationPolicyWitness = { policy: RuntimeTemplateActionPolicy;
                                               binding: ProofModuleBinding;
                                               bindingPath: { leaf: Uint8Array,
                                                              path: { sibling: { field: bigint
                                                                               },
                                                                      goes_left: boolean
                                                                    }[]
                                                            };
                                               initialState: RuntimeStateOpening
                                             };

export type RuntimeSlotCommand = { commandVersion: bigint;
                                   kind: bigint;
                                   target: TemplateRegistryTarget;
                                   instanceCommitment: Uint8Array;
                                   allocationCommitment: Uint8Array;
                                   stateCommitment: Uint8Array;
                                   stateSequence: bigint;
                                   authorityRootVersion: bigint;
                                   authorityRootSequence: bigint;
                                   credentialStatusRootSequence: bigint;
                                   contextHash: Uint8Array;
                                   slotIdHash: Uint8Array;
                                   subjectAccountCredentialCommitment: Uint8Array;
                                   subjectAccountIdHash: Uint8Array;
                                   assignmentIdHash: Uint8Array;
                                   parentAssignmentIdHash: Uint8Array;
                                   assignerAccountCredentialCommitment: Uint8Array;
                                   authorityKind: bigint;
                                   namespaceAuthorityCommitment: Uint8Array;
                                   m5AssignmentCommitment: Uint8Array;
                                   effectiveAt: bigint;
                                   validBefore: bigint;
                                   commandNonce: Uint8Array
                                 };

export type RuntimeSlotAssignment = { assignmentVersion: bigint;
                                      target: TemplateRegistryTarget;
                                      instanceCommitment: Uint8Array;
                                      contextHash: Uint8Array;
                                      slotIdHash: Uint8Array;
                                      subjectAccountCredentialCommitment: Uint8Array;
                                      subjectAccountIdHash: Uint8Array;
                                      assignmentIdHash: Uint8Array;
                                      parentAssignmentIdHash: Uint8Array;
                                      assignerAccountCredentialCommitment: Uint8Array;
                                      authorityKind: bigint;
                                      namespaceAuthorityCommitment: Uint8Array;
                                      m5AssignmentCommitment: Uint8Array;
                                      assignedAt: bigint;
                                      issuedSequence: bigint
                                    };

export type RuntimeSlotRecord = { assignment: RuntimeSlotAssignment;
                                  status: bigint;
                                  revokedAt: bigint
                                };

export type RuntimeSlotPolicyWitness = { policy: RuntimeTemplateActionPolicy;
                                         binding: ProofModuleBinding;
                                         bindingPath: { leaf: Uint8Array,
                                                        path: { sibling: { field: bigint
                                                                         },
                                                                goes_left: boolean
                                                              }[]
                                                      };
                                         rule: RuntimeParticipantSlotRule;
                                         rulePath: { leaf: Uint8Array,
                                                     path: { sibling: { field: bigint
                                                                      },
                                                             goes_left: boolean
                                                           }[]
                                                   }
                                       };

export type RuntimeSlotAncestryStep = { record: RuntimeSlotRecord;
                                        opening: RuntimePrivateMapWitness;
                                        account: RuntimeAccountCredential;
                                        accountStatus: bigint;
                                        accountStatusPath: { leaf: Uint8Array,
                                                             path: { sibling: { field: bigint
                                                                              },
                                                                     goes_left: boolean
                                                                   }[]
                                                           }
                                      };

export type RuntimeSlotProgress = { phase: bigint;
                                    nextAssignmentIdHash: Uint8Array;
                                    expectedAccountCommitment: Uint8Array;
                                    childIssuedSequence: bigint;
                                    previousBindingAssignmentIdHash: Uint8Array;
                                    previousBindingAccountCommitment: Uint8Array;
                                    inactive: boolean;
                                    steps: bigint
                                  };

export type RuntimeSlotSession = { commandCommitment: Uint8Array;
                                   progressCommitment: Uint8Array;
                                   expiresAt: bigint
                                 };

export type RuntimeDecisionReceiptBody = { receiptVersion: bigint;
                                           moduleIdentity: ProofModuleIdentity;
                                           target: TemplateRegistryTarget;
                                           instanceCommitment: Uint8Array;
                                           transitioning: boolean;
                                           previousStateCommitment: Uint8Array;
                                           nextStateCommitment: Uint8Array;
                                           transitionSequence: bigint;
                                           contextHash: Uint8Array;
                                           actionSchemaId: Uint8Array;
                                           purposeHash: Uint8Array;
                                           recipient: Uint8Array;
                                           validAfter: bigint;
                                           validBefore: bigint;
                                           scopedNullifier: Uint8Array;
                                           outputCommitment: Uint8Array;
                                           sourceNetwork: Uint8Array;
                                           sourceContract: Uint8Array
                                         };

export type RuntimeActionCommand = { commandVersion: bigint;
                                     intentCommitment: Uint8Array;
                                     allocationCommitment: Uint8Array;
                                     stateCommitment: Uint8Array;
                                     stateSequence: bigint;
                                     authorityRootVersion: bigint;
                                     authorityRootSequence: bigint;
                                     statusRootSequence: bigint;
                                     policyCommitment: Uint8Array;
                                     bindingCommitment: Uint8Array;
                                     slotAssignmentIdHash: Uint8Array;
                                     selectedInputsCommitment: Uint8Array;
                                     selectedOutputsCommitment: Uint8Array;
                                     nextStateCommitment: Uint8Array;
                                     transitioning: boolean;
                                     effectiveAt: bigint;
                                     validBefore: bigint
                                   };

export type RuntimeSelectedActionValue = { valueVersion: bigint;
                                           typeHash: Uint8Array;
                                           contextHash: Uint8Array;
                                           resourceHash: Uint8Array;
                                           payloadCommitment: Uint8Array;
                                           nonce: Uint8Array
                                         };

export type RuntimeActionProgress = { slot: RuntimeSlotProgress;
                                      nextInputIndex: bigint;
                                      nextOutputIndex: bigint;
                                      inputsAccumulator: Uint8Array;
                                      outputsAccumulator: Uint8Array
                                    };

export type RuntimeActionSession = { progressCommitment: Uint8Array;
                                     expiresAt: bigint
                                   };

export type GovernanceDispatchInput = { operation: bigint;
                                        rootUpdate: AuthorityRootUpdateCommand;
                                        proposal: ProofModuleProposal;
                                        review: ProofModuleReview;
                                        lifecycle: ProofModuleLifecycleCommand;
                                        signature: { announcement: __compactRuntime.JubjubPoint,
                                                     response: bigint
                                                   };
                                        authority: GovernanceActivatorLeaf;
                                        authorityPath: { leaf: Uint8Array,
                                                         path: { sibling: { field: bigint
                                                                          },
                                                                 goes_left: boolean
                                                               }[]
                                                       }
                                      };

export type GovernanceDispatchResult = { moduleKey: Uint8Array;
                                         approvalCount: bigint
                                       };

export type Witnesses<PS> = {
  getSchnorrReduction(context: __compactRuntime.WitnessContext<Ledger, PS>,
                      challengeHash_0: bigint): [PS, [bigint, bigint]];
}

export type ImpureCircuits<PS> = {
  verifyRuntimeActionAuthorization(context: __compactRuntime.CircuitContext<PS>,
                                   ancestry_0: RuntimeActiveAncestry,
                                   intent_0: RuntimeActionIntent,
                                   sessionSignature_0: { announcement: __compactRuntime.JubjubPoint,
                                                         response: bigint
                                                       },
                                   intentSignature_0: { announcement: __compactRuntime.JubjubPoint,
                                                        response: bigint
                                                      },
                                   capabilityPaths_0: RuntimeActionScopePaths,
                                   sessionPaths_0: RuntimeActionScopePaths,
                                   expectedRoot_0: { field: bigint },
                                   expectedSequence_0: bigint,
                                   now_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  allocateRuntimeInstance(context: __compactRuntime.CircuitContext<PS>,
                          allocation_0: RuntimeInstanceAllocation,
                          signature_0: { announcement: __compactRuntime.JubjubPoint,
                                         response: bigint
                                       },
                          allocator_0: GovernanceActivatorLeaf,
                          allocatorPath_0: { leaf: Uint8Array,
                                             path: { sibling: { field: bigint },
                                                     goes_left: boolean
                                                   }[]
                                           },
                          policyWitness_0: RuntimeAllocationPolicyWitness): __compactRuntime.CircuitResults<PS, Uint8Array>;
  manageRuntimeParticipantSlots(context: __compactRuntime.CircuitContext<PS>,
                                operation_0: bigint,
                                command_0: RuntimeSlotCommand,
                                signature_0: { announcement: __compactRuntime.JubjubPoint,
                                               response: bigint
                                             },
                                allocation_0: RuntimeInstanceAllocation,
                                state_0: RuntimeStateOpening,
                                nextStateNonce_0: Uint8Array,
                                policyOpening_0: RuntimeSlotPolicyWitness,
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
                                subjectAccount_0: RuntimeAccountCredential,
                                subjectAccountStatusPath_0: { leaf: Uint8Array,
                                                              path: { sibling: { field: bigint
                                                                               },
                                                                      goes_left: boolean
                                                                    }[]
                                                            },
                                progress_0: RuntimeSlotProgress,
                                step_0: RuntimeSlotAncestryStep,
                                targetRecord_0: RuntimeSlotRecord,
                                assignmentOpening_0: RuntimePrivateMapWitness,
                                assignmentAppendPath_0: { leaf: Uint8Array,
                                                          path: { sibling: { field: bigint
                                                                           },
                                                                  goes_left: boolean
                                                                }[]
                                                        },
                                bindingOpening_0: RuntimePrivateMapWitness,
                                bindingAppendPath_0: { leaf: Uint8Array,
                                                       path: { sibling: { field: bigint
                                                                        },
                                                               goes_left: boolean
                                                             }[]
                                                     },
                                previousBindingOpening_0: RuntimePrivateMapWitness): __compactRuntime.CircuitResults<PS, bigint>;
  prepareRuntimeAction(context: __compactRuntime.CircuitContext<PS>,
                       operation_0: bigint,
                       command_0: RuntimeActionCommand,
                       signature_0: { announcement: __compactRuntime.JubjubPoint,
                                      response: bigint
                                    },
                       intent_0: RuntimeActionIntent,
                       session_0: RuntimeSessionCredential,
                       allocation_0: RuntimeInstanceAllocation,
                       state_0: RuntimeStateOpening,
                       policy_0: RuntimeTemplateActionPolicy,
                       binding_0: ProofModuleBinding,
                       bindingPath_0: { leaf: Uint8Array,
                                        path: { sibling: { field: bigint },
                                                goes_left: boolean
                                              }[]
                                      },
                       progress_0: RuntimeActionProgress,
                       slotStep_0: RuntimeSlotAncestryStep,
                       selected_0: RuntimeSelectedActionValue,
                       typePath_0: { leaf: Uint8Array,
                                     path: { sibling: { field: bigint },
                                             goes_left: boolean
                                           }[]
                                   }): __compactRuntime.CircuitResults<PS, []>;
  executeRuntimeAction(context: __compactRuntime.CircuitContext<PS>,
                       command_0: RuntimeActionCommand,
                       signature_0: { announcement: __compactRuntime.JubjubPoint,
                                      response: bigint
                                    },
                       intent_0: RuntimeActionIntent,
                       ancestry_0: RuntimeActiveAncestry,
                       sessionSignature_0: { announcement: __compactRuntime.JubjubPoint,
                                             response: bigint
                                           },
                       intentSignature_0: { announcement: __compactRuntime.JubjubPoint,
                                            response: bigint
                                          },
                       capabilityPaths_0: RuntimeActionScopePaths,
                       sessionPaths_0: RuntimeActionScopePaths,
                       allocation_0: RuntimeInstanceAllocation,
                       state_0: RuntimeStateOpening,
                       policy_0: RuntimeTemplateActionPolicy,
                       binding_0: ProofModuleBinding,
                       bindingPath_0: { leaf: Uint8Array,
                                        path: { sibling: { field: bigint },
                                                goes_left: boolean
                                              }[]
                                      },
                       progress_0: RuntimeActionProgress,
                       issuer_0: GovernanceActivatorLeaf,
                       instanceIssuerPath_0: { leaf: Uint8Array,
                                               path: { sibling: { field: bigint
                                                                },
                                                       goes_left: boolean
                                                     }[]
                                             },
                       namespaceIssuerPath_0: { leaf: Uint8Array,
                                                path: { sibling: { field: bigint
                                                                 },
                                                        goes_left: boolean
                                                      }[]
                                              },
                       transition_0: RuntimeTemplateTransition,
                       transitionPath_0: { leaf: Uint8Array,
                                           path: { sibling: { field: bigint },
                                                   goes_left: boolean
                                                 }[]
                                         },
                       nextStateIdHash_0: Uint8Array,
                       nextNonce_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  verifyGovernanceActivationSignature(context: __compactRuntime.CircuitContext<PS>,
                                      envelope_0: ActivationAdmissionEnvelope,
                                      signature_0: { announcement: __compactRuntime.JubjubPoint,
                                                     response: bigint
                                                   },
                                      publicKey_0: __compactRuntime.JubjubPoint): __compactRuntime.CircuitResults<PS, []>;
  governAuthorization(context: __compactRuntime.CircuitContext<PS>,
                      input_0: GovernanceDispatchInput): __compactRuntime.CircuitResults<PS, GovernanceDispatchResult>;
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
                                operation_0: bigint,
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
                                                     },
                                capability_0: RuntimeCapabilityCredential,
                                capabilitySignature_0: { announcement: __compactRuntime.JubjubPoint,
                                                         response: bigint
                                                       },
                                parentCapability_0: RuntimeCapabilityCredential,
                                parentCapabilityStatusPath_0: { leaf: Uint8Array,
                                                                path: { sibling: { field: bigint
                                                                                 },
                                                                        goes_left: boolean
                                                                      }[]
                                                              },
                                scopeProgress_0: RuntimeScopeProgress,
                                scopeElement_0: RuntimeScopeElement,
                                childScopePath_0: { leaf: Uint8Array,
                                                    path: { sibling: { field: bigint
                                                                     },
                                                            goes_left: boolean
                                                          }[]
                                                  },
                                parentScopePath_0: { leaf: Uint8Array,
                                                     path: { sibling: { field: bigint
                                                                      },
                                                             goes_left: boolean
                                                           }[]
                                                   },
                                sessionCredential_0: RuntimeSessionCredential,
                                instanceBinding_0: RuntimeCredentialInstanceBinding): __compactRuntime.CircuitResults<PS, bigint>;
}

export type ProvableCircuits<PS> = {
  allocateRuntimeInstance(context: __compactRuntime.CircuitContext<PS>,
                          allocation_0: RuntimeInstanceAllocation,
                          signature_0: { announcement: __compactRuntime.JubjubPoint,
                                         response: bigint
                                       },
                          allocator_0: GovernanceActivatorLeaf,
                          allocatorPath_0: { leaf: Uint8Array,
                                             path: { sibling: { field: bigint },
                                                     goes_left: boolean
                                                   }[]
                                           },
                          policyWitness_0: RuntimeAllocationPolicyWitness): __compactRuntime.CircuitResults<PS, Uint8Array>;
  manageRuntimeParticipantSlots(context: __compactRuntime.CircuitContext<PS>,
                                operation_0: bigint,
                                command_0: RuntimeSlotCommand,
                                signature_0: { announcement: __compactRuntime.JubjubPoint,
                                               response: bigint
                                             },
                                allocation_0: RuntimeInstanceAllocation,
                                state_0: RuntimeStateOpening,
                                nextStateNonce_0: Uint8Array,
                                policyOpening_0: RuntimeSlotPolicyWitness,
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
                                subjectAccount_0: RuntimeAccountCredential,
                                subjectAccountStatusPath_0: { leaf: Uint8Array,
                                                              path: { sibling: { field: bigint
                                                                               },
                                                                      goes_left: boolean
                                                                    }[]
                                                            },
                                progress_0: RuntimeSlotProgress,
                                step_0: RuntimeSlotAncestryStep,
                                targetRecord_0: RuntimeSlotRecord,
                                assignmentOpening_0: RuntimePrivateMapWitness,
                                assignmentAppendPath_0: { leaf: Uint8Array,
                                                          path: { sibling: { field: bigint
                                                                           },
                                                                  goes_left: boolean
                                                                }[]
                                                        },
                                bindingOpening_0: RuntimePrivateMapWitness,
                                bindingAppendPath_0: { leaf: Uint8Array,
                                                       path: { sibling: { field: bigint
                                                                        },
                                                               goes_left: boolean
                                                             }[]
                                                     },
                                previousBindingOpening_0: RuntimePrivateMapWitness): __compactRuntime.CircuitResults<PS, bigint>;
  prepareRuntimeAction(context: __compactRuntime.CircuitContext<PS>,
                       operation_0: bigint,
                       command_0: RuntimeActionCommand,
                       signature_0: { announcement: __compactRuntime.JubjubPoint,
                                      response: bigint
                                    },
                       intent_0: RuntimeActionIntent,
                       session_0: RuntimeSessionCredential,
                       allocation_0: RuntimeInstanceAllocation,
                       state_0: RuntimeStateOpening,
                       policy_0: RuntimeTemplateActionPolicy,
                       binding_0: ProofModuleBinding,
                       bindingPath_0: { leaf: Uint8Array,
                                        path: { sibling: { field: bigint },
                                                goes_left: boolean
                                              }[]
                                      },
                       progress_0: RuntimeActionProgress,
                       slotStep_0: RuntimeSlotAncestryStep,
                       selected_0: RuntimeSelectedActionValue,
                       typePath_0: { leaf: Uint8Array,
                                     path: { sibling: { field: bigint },
                                             goes_left: boolean
                                           }[]
                                   }): __compactRuntime.CircuitResults<PS, []>;
  executeRuntimeAction(context: __compactRuntime.CircuitContext<PS>,
                       command_0: RuntimeActionCommand,
                       signature_0: { announcement: __compactRuntime.JubjubPoint,
                                      response: bigint
                                    },
                       intent_0: RuntimeActionIntent,
                       ancestry_0: RuntimeActiveAncestry,
                       sessionSignature_0: { announcement: __compactRuntime.JubjubPoint,
                                             response: bigint
                                           },
                       intentSignature_0: { announcement: __compactRuntime.JubjubPoint,
                                            response: bigint
                                          },
                       capabilityPaths_0: RuntimeActionScopePaths,
                       sessionPaths_0: RuntimeActionScopePaths,
                       allocation_0: RuntimeInstanceAllocation,
                       state_0: RuntimeStateOpening,
                       policy_0: RuntimeTemplateActionPolicy,
                       binding_0: ProofModuleBinding,
                       bindingPath_0: { leaf: Uint8Array,
                                        path: { sibling: { field: bigint },
                                                goes_left: boolean
                                              }[]
                                      },
                       progress_0: RuntimeActionProgress,
                       issuer_0: GovernanceActivatorLeaf,
                       instanceIssuerPath_0: { leaf: Uint8Array,
                                               path: { sibling: { field: bigint
                                                                },
                                                       goes_left: boolean
                                                     }[]
                                             },
                       namespaceIssuerPath_0: { leaf: Uint8Array,
                                                path: { sibling: { field: bigint
                                                                 },
                                                        goes_left: boolean
                                                      }[]
                                              },
                       transition_0: RuntimeTemplateTransition,
                       transitionPath_0: { leaf: Uint8Array,
                                           path: { sibling: { field: bigint },
                                                   goes_left: boolean
                                                 }[]
                                         },
                       nextStateIdHash_0: Uint8Array,
                       nextNonce_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  governAuthorization(context: __compactRuntime.CircuitContext<PS>,
                      input_0: GovernanceDispatchInput): __compactRuntime.CircuitResults<PS, GovernanceDispatchResult>;
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
                                operation_0: bigint,
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
                                                     },
                                capability_0: RuntimeCapabilityCredential,
                                capabilitySignature_0: { announcement: __compactRuntime.JubjubPoint,
                                                         response: bigint
                                                       },
                                parentCapability_0: RuntimeCapabilityCredential,
                                parentCapabilityStatusPath_0: { leaf: Uint8Array,
                                                                path: { sibling: { field: bigint
                                                                                 },
                                                                        goes_left: boolean
                                                                      }[]
                                                              },
                                scopeProgress_0: RuntimeScopeProgress,
                                scopeElement_0: RuntimeScopeElement,
                                childScopePath_0: { leaf: Uint8Array,
                                                    path: { sibling: { field: bigint
                                                                     },
                                                            goes_left: boolean
                                                          }[]
                                                  },
                                parentScopePath_0: { leaf: Uint8Array,
                                                     path: { sibling: { field: bigint
                                                                      },
                                                             goes_left: boolean
                                                           }[]
                                                   },
                                sessionCredential_0: RuntimeSessionCredential,
                                instanceBinding_0: RuntimeCredentialInstanceBinding): __compactRuntime.CircuitResults<PS, bigint>;
}

export type PureCircuits = {
  runtimeStatusStackPush(previous_0: bigint, node_0: RuntimeStatusProofNode): bigint;
  runtimeStatusMembershipLeafDigest(leaf_0: Uint8Array): { field: bigint };
  runtimeStatusMultiproofRoot(proof_0: RuntimeStatusMultiproof): { field: bigint
                                                                 };
  assertRuntimeStatusMultiproof(proof_0: RuntimeStatusMultiproof,
                                expectedRoot_0: { field: bigint },
                                expectedSequence_0: bigint): [];
  assertRuntimeActiveAncestry(ancestry_0: RuntimeActiveAncestry,
                              expectedRoot_0: { field: bigint },
                              expectedSequence_0: bigint,
                              now_0: bigint): [];
  runtimeParticipantSlotRuleCommitment(rule_0: RuntimeParticipantSlotRule): Uint8Array;
  assertRuntimeParticipantSlotRule(policy_0: RuntimeTemplateActionPolicy,
                                   rule_0: RuntimeParticipantSlotRule,
                                   path_0: { leaf: Uint8Array,
                                             path: { sibling: { field: bigint },
                                                     goes_left: boolean
                                                   }[]
                                           },
                                   contextHash_0: Uint8Array,
                                   slotIdHash_0: Uint8Array): [];
  runtimeTemplateActionPolicyCommitment(policy_0: RuntimeTemplateActionPolicy): Uint8Array;
  runtimeTemplateTransitionCommitment(transition_0: RuntimeTemplateTransition): Uint8Array;
  assertRuntimeTemplatePolicyBinding(target_0: TemplateRegistryTarget,
                                     policy_0: RuntimeTemplateActionPolicy,
                                     binding_0: ProofModuleBinding,
                                     bindingPath_0: { leaf: Uint8Array,
                                                      path: { sibling: { field: bigint
                                                                       },
                                                              goes_left: boolean
                                                            }[]
                                                    },
                                     bindingRoot_0: { field: bigint },
                                     bindingCount_0: bigint): [];
  assertRuntimeTemplateActionIntent(policy_0: RuntimeTemplateActionPolicy,
                                    intent_0: RuntimeActionIntent): [];
  assertRuntimeTemplateTransition(policy_0: RuntimeTemplateActionPolicy,
                                  transition_0: RuntimeTemplateTransition,
                                  path_0: { leaf: Uint8Array,
                                            path: { sibling: { field: bigint },
                                                    goes_left: boolean
                                                  }[]
                                          },
                                  fromStateIdHash_0: Uint8Array,
                                  toStateIdHash_0: Uint8Array): [];
  runtimePrivateMapKeyLess(left_0: Uint8Array, right_0: Uint8Array): boolean;
  runtimePrivateMapNodeCommitment(node_0: RuntimePrivateMapNode): Uint8Array;
  runtimePrivateMapEmptyRoot(): { field: bigint };
  assertRuntimePrivateMapNode(root_0: { field: bigint },
                              count_0: bigint,
                              opening_0: RuntimePrivateMapWitness): [];
  assertRuntimePrivateMapAbsence(root_0: { field: bigint },
                                 count_0: bigint,
                                 key_0: Uint8Array,
                                 opening_0: RuntimePrivateMapWitness): [];
  runtimePrivateMapInsert(root_0: { field: bigint },
                          count_0: bigint,
                          key_0: Uint8Array,
                          value_0: Uint8Array,
                          predecessor_0: RuntimePrivateMapWitness,
                          appendPath_0: { leaf: Uint8Array,
                                          path: { sibling: { field: bigint },
                                                  goes_left: boolean
                                                }[]
                                        }): { field: bigint };
  runtimePrivateMapReplace(root_0: { field: bigint },
                           count_0: bigint,
                           key_0: Uint8Array,
                           oldValue_0: Uint8Array,
                           nextValue_0: Uint8Array,
                           opening_0: RuntimePrivateMapWitness): { field: bigint
                                                                 };
  runtimeInstanceAllocationCommitment(allocation_0: RuntimeInstanceAllocation): Uint8Array;
  runtimeInstanceAllocationSignatureChallenge(announcement_0: __compactRuntime.JubjubPoint,
                                              publicKey_0: __compactRuntime.JubjubPoint,
                                              allocation_0: RuntimeInstanceAllocation): bigint;
  runtimeAllocationRequestNullifier(allocation_0: RuntimeInstanceAllocation): Uint8Array;
  runtimeInstanceIdentityNullifier(allocation_0: RuntimeInstanceAllocation): Uint8Array;
  runtimeStateCommitment(opening_0: RuntimeStateOpening): Uint8Array;
  runtimeCredentialNextState(state_0: RuntimeStateOpening,
                             effectiveAt_0: bigint,
                             nextNonce_0: Uint8Array): RuntimeStateOpening;
  assertRuntimeInstanceIssuerMembership(allocation_0: RuntimeInstanceAllocation,
                                        issuer_0: GovernanceActivatorLeaf,
                                        instanceIssuerPath_0: { leaf: Uint8Array,
                                                                path: { sibling: { field: bigint
                                                                                 },
                                                                        goes_left: boolean
                                                                      }[]
                                                              },
                                        currentAuthorityRoot_0: AuthorityRootRecord,
                                        namespaceIssuerPath_0: { leaf: Uint8Array,
                                                                 path: { sibling: { field: bigint
                                                                                  },
                                                                         goes_left: boolean
                                                                       }[]
                                                               }): [];
  assertRuntimeInstanceIssuer(allocation_0: RuntimeInstanceAllocation,
                              issuer_0: GovernanceActivatorLeaf,
                              instanceIssuerPath_0: { leaf: Uint8Array,
                                                      path: { sibling: { field: bigint
                                                                       },
                                                              goes_left: boolean
                                                            }[]
                                                    },
                              currentAuthorityRoot_0: AuthorityRootRecord,
                              namespaceIssuerPath_0: { leaf: Uint8Array,
                                                       path: { sibling: { field: bigint
                                                                        },
                                                               goes_left: boolean
                                                             }[]
                                                     },
                              effectiveAt_0: bigint): [];
  runtimeSlotBindingKey(command_0: RuntimeSlotCommand): Uint8Array;
  runtimeSlotCommandCommitment(command_0: RuntimeSlotCommand): Uint8Array;
  runtimeSlotCommandSignatureChallenge(announcement_0: __compactRuntime.JubjubPoint,
                                       publicKey_0: __compactRuntime.JubjubPoint,
                                       command_0: RuntimeSlotCommand): bigint;
  runtimeSlotRecordCommitment(record_0: RuntimeSlotRecord): Uint8Array;
  runtimeSlotProgressCommitment(progress_0: RuntimeSlotProgress): Uint8Array;
  runtimeSlotInitialProgress(command_0: RuntimeSlotCommand,
                             previousBinding_0: Uint8Array,
                             previousAccount_0: Uint8Array): RuntimeSlotProgress;
  runtimeSlotAssignmentFromCommand(command_0: RuntimeSlotCommand): RuntimeSlotAssignment;
  assertRuntimeSlotRecord(record_0: RuntimeSlotRecord,
                          opening_0: RuntimePrivateMapWitness,
                          state_0: RuntimeStateOpening,
                          command_0: RuntimeSlotCommand): [];
  runtimeSlotAdvanceProgress(progress_0: RuntimeSlotProgress,
                             step_0: RuntimeSlotAncestryStep,
                             state_0: RuntimeStateOpening,
                             command_0: RuntimeSlotCommand,
                             statusRoot_0: { field: bigint }): RuntimeSlotProgress;
  runtimeScopedActionNullifier(allocation_0: RuntimeInstanceAllocation,
                               intent_0: RuntimeActionIntent): Uint8Array;
  runtimeActionNextState(state_0: RuntimeStateOpening,
                         nextStateIdHash_0: Uint8Array,
                         nextNonce_0: Uint8Array,
                         effectiveAt_0: bigint,
                         transitioning_0: boolean): RuntimeStateOpening;
  runtimeDecisionReceiptId(receipt_0: RuntimeDecisionReceiptBody): Uint8Array;
  runtimeActionCommandCommitment(command_0: RuntimeActionCommand): Uint8Array;
  runtimeActionCommandSignatureChallenge(announcement_0: __compactRuntime.JubjubPoint,
                                         publicKey_0: __compactRuntime.JubjubPoint,
                                         command_0: RuntimeActionCommand): bigint;
  runtimeActionProgressCommitment(progress_0: RuntimeActionProgress): Uint8Array;
  runtimeSelectedActionValueStep(previous_0: Uint8Array,
                                 index_0: bigint,
                                 selected_0: RuntimeSelectedActionValue,
                                 output_0: boolean): Uint8Array;
  runtimeActionImplementationReference(network_0: Uint8Array,
                                       deployment_0: Uint8Array,
                                       moduleIdHash_0: Uint8Array): Uint8Array;
  runtimeActionReceiptSchemaHash(): Uint8Array;
  runtimeDelegatedActionModuleId(): Uint8Array;
  runtimeStateTransitionModuleId(): Uint8Array;
  runtimeActionInputSchemaHash(): Uint8Array;
  runtimeActionConfigurationSchemaHash(): Uint8Array;
  runtimeActionCompilerProfileHash(): Uint8Array;
  runtimeActionCompatibilityPolicyHash(): Uint8Array;
  runtimeActionSlotContext(intent_0: RuntimeActionIntent,
                           command_0: RuntimeActionCommand): RuntimeSlotCommand;
  runtimeActionInitialProgress(command_0: RuntimeActionCommand,
                               session_0: RuntimeSessionCredential): RuntimeActionProgress;
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
  runtimeCredentialStatusPathIndex(path_0: { leaf: Uint8Array,
                                             path: { sibling: { field: bigint },
                                                     goes_left: boolean
                                                   }[]
                                           }): bigint;
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
  runtimeCredentialStatusCommandCommitment(command_0: RuntimeCredentialStatusCommand): Uint8Array;
  runtimeScopeProgressCommitment(progress_0: RuntimeScopeProgress): Uint8Array;
  runtimeScopeElementCommitment(element_0: RuntimeScopeElement): Uint8Array;
  capabilityAttenuationCertificationCommitment(certification_0: CapabilityAttenuationCertification): Uint8Array;
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
  emptyGovernanceDispatchInput(): GovernanceDispatchInput;
}

export type Circuits<PS> = {
  runtimeStatusStackPush(context: __compactRuntime.CircuitContext<PS>,
                         previous_0: bigint,
                         node_0: RuntimeStatusProofNode): __compactRuntime.CircuitResults<PS, bigint>;
  runtimeStatusMembershipLeafDigest(context: __compactRuntime.CircuitContext<PS>,
                                    leaf_0: Uint8Array): __compactRuntime.CircuitResults<PS, { field: bigint
                                                                                             }>;
  runtimeStatusMultiproofRoot(context: __compactRuntime.CircuitContext<PS>,
                              proof_0: RuntimeStatusMultiproof): __compactRuntime.CircuitResults<PS, { field: bigint
                                                                                                     }>;
  assertRuntimeStatusMultiproof(context: __compactRuntime.CircuitContext<PS>,
                                proof_0: RuntimeStatusMultiproof,
                                expectedRoot_0: { field: bigint },
                                expectedSequence_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  assertRuntimeActiveAncestry(context: __compactRuntime.CircuitContext<PS>,
                              ancestry_0: RuntimeActiveAncestry,
                              expectedRoot_0: { field: bigint },
                              expectedSequence_0: bigint,
                              now_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  verifyRuntimeActionAuthorization(context: __compactRuntime.CircuitContext<PS>,
                                   ancestry_0: RuntimeActiveAncestry,
                                   intent_0: RuntimeActionIntent,
                                   sessionSignature_0: { announcement: __compactRuntime.JubjubPoint,
                                                         response: bigint
                                                       },
                                   intentSignature_0: { announcement: __compactRuntime.JubjubPoint,
                                                        response: bigint
                                                      },
                                   capabilityPaths_0: RuntimeActionScopePaths,
                                   sessionPaths_0: RuntimeActionScopePaths,
                                   expectedRoot_0: { field: bigint },
                                   expectedSequence_0: bigint,
                                   now_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  runtimeParticipantSlotRuleCommitment(context: __compactRuntime.CircuitContext<PS>,
                                       rule_0: RuntimeParticipantSlotRule): __compactRuntime.CircuitResults<PS, Uint8Array>;
  assertRuntimeParticipantSlotRule(context: __compactRuntime.CircuitContext<PS>,
                                   policy_0: RuntimeTemplateActionPolicy,
                                   rule_0: RuntimeParticipantSlotRule,
                                   path_0: { leaf: Uint8Array,
                                             path: { sibling: { field: bigint },
                                                     goes_left: boolean
                                                   }[]
                                           },
                                   contextHash_0: Uint8Array,
                                   slotIdHash_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  runtimeTemplateActionPolicyCommitment(context: __compactRuntime.CircuitContext<PS>,
                                        policy_0: RuntimeTemplateActionPolicy): __compactRuntime.CircuitResults<PS, Uint8Array>;
  runtimeTemplateTransitionCommitment(context: __compactRuntime.CircuitContext<PS>,
                                      transition_0: RuntimeTemplateTransition): __compactRuntime.CircuitResults<PS, Uint8Array>;
  assertRuntimeTemplatePolicyBinding(context: __compactRuntime.CircuitContext<PS>,
                                     target_0: TemplateRegistryTarget,
                                     policy_0: RuntimeTemplateActionPolicy,
                                     binding_0: ProofModuleBinding,
                                     bindingPath_0: { leaf: Uint8Array,
                                                      path: { sibling: { field: bigint
                                                                       },
                                                              goes_left: boolean
                                                            }[]
                                                    },
                                     bindingRoot_0: { field: bigint },
                                     bindingCount_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  assertRuntimeTemplateActionIntent(context: __compactRuntime.CircuitContext<PS>,
                                    policy_0: RuntimeTemplateActionPolicy,
                                    intent_0: RuntimeActionIntent): __compactRuntime.CircuitResults<PS, []>;
  assertRuntimeTemplateTransition(context: __compactRuntime.CircuitContext<PS>,
                                  policy_0: RuntimeTemplateActionPolicy,
                                  transition_0: RuntimeTemplateTransition,
                                  path_0: { leaf: Uint8Array,
                                            path: { sibling: { field: bigint },
                                                    goes_left: boolean
                                                  }[]
                                          },
                                  fromStateIdHash_0: Uint8Array,
                                  toStateIdHash_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  runtimePrivateMapKeyLess(context: __compactRuntime.CircuitContext<PS>,
                           left_0: Uint8Array,
                           right_0: Uint8Array): __compactRuntime.CircuitResults<PS, boolean>;
  runtimePrivateMapNodeCommitment(context: __compactRuntime.CircuitContext<PS>,
                                  node_0: RuntimePrivateMapNode): __compactRuntime.CircuitResults<PS, Uint8Array>;
  runtimePrivateMapEmptyRoot(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, { field: bigint
                                                                                                                }>;
  assertRuntimePrivateMapNode(context: __compactRuntime.CircuitContext<PS>,
                              root_0: { field: bigint },
                              count_0: bigint,
                              opening_0: RuntimePrivateMapWitness): __compactRuntime.CircuitResults<PS, []>;
  assertRuntimePrivateMapAbsence(context: __compactRuntime.CircuitContext<PS>,
                                 root_0: { field: bigint },
                                 count_0: bigint,
                                 key_0: Uint8Array,
                                 opening_0: RuntimePrivateMapWitness): __compactRuntime.CircuitResults<PS, []>;
  runtimePrivateMapInsert(context: __compactRuntime.CircuitContext<PS>,
                          root_0: { field: bigint },
                          count_0: bigint,
                          key_0: Uint8Array,
                          value_0: Uint8Array,
                          predecessor_0: RuntimePrivateMapWitness,
                          appendPath_0: { leaf: Uint8Array,
                                          path: { sibling: { field: bigint },
                                                  goes_left: boolean
                                                }[]
                                        }): __compactRuntime.CircuitResults<PS, { field: bigint
                                                                                }>;
  runtimePrivateMapReplace(context: __compactRuntime.CircuitContext<PS>,
                           root_0: { field: bigint },
                           count_0: bigint,
                           key_0: Uint8Array,
                           oldValue_0: Uint8Array,
                           nextValue_0: Uint8Array,
                           opening_0: RuntimePrivateMapWitness): __compactRuntime.CircuitResults<PS, { field: bigint
                                                                                                     }>;
  runtimeInstanceAllocationCommitment(context: __compactRuntime.CircuitContext<PS>,
                                      allocation_0: RuntimeInstanceAllocation): __compactRuntime.CircuitResults<PS, Uint8Array>;
  runtimeInstanceAllocationSignatureChallenge(context: __compactRuntime.CircuitContext<PS>,
                                              announcement_0: __compactRuntime.JubjubPoint,
                                              publicKey_0: __compactRuntime.JubjubPoint,
                                              allocation_0: RuntimeInstanceAllocation): __compactRuntime.CircuitResults<PS, bigint>;
  runtimeAllocationRequestNullifier(context: __compactRuntime.CircuitContext<PS>,
                                    allocation_0: RuntimeInstanceAllocation): __compactRuntime.CircuitResults<PS, Uint8Array>;
  runtimeInstanceIdentityNullifier(context: __compactRuntime.CircuitContext<PS>,
                                   allocation_0: RuntimeInstanceAllocation): __compactRuntime.CircuitResults<PS, Uint8Array>;
  runtimeStateCommitment(context: __compactRuntime.CircuitContext<PS>,
                         opening_0: RuntimeStateOpening): __compactRuntime.CircuitResults<PS, Uint8Array>;
  runtimeCredentialNextState(context: __compactRuntime.CircuitContext<PS>,
                             state_0: RuntimeStateOpening,
                             effectiveAt_0: bigint,
                             nextNonce_0: Uint8Array): __compactRuntime.CircuitResults<PS, RuntimeStateOpening>;
  assertRuntimeInstanceIssuerMembership(context: __compactRuntime.CircuitContext<PS>,
                                        allocation_0: RuntimeInstanceAllocation,
                                        issuer_0: GovernanceActivatorLeaf,
                                        instanceIssuerPath_0: { leaf: Uint8Array,
                                                                path: { sibling: { field: bigint
                                                                                 },
                                                                        goes_left: boolean
                                                                      }[]
                                                              },
                                        currentAuthorityRoot_0: AuthorityRootRecord,
                                        namespaceIssuerPath_0: { leaf: Uint8Array,
                                                                 path: { sibling: { field: bigint
                                                                                  },
                                                                         goes_left: boolean
                                                                       }[]
                                                               }): __compactRuntime.CircuitResults<PS, []>;
  assertRuntimeInstanceIssuer(context: __compactRuntime.CircuitContext<PS>,
                              allocation_0: RuntimeInstanceAllocation,
                              issuer_0: GovernanceActivatorLeaf,
                              instanceIssuerPath_0: { leaf: Uint8Array,
                                                      path: { sibling: { field: bigint
                                                                       },
                                                              goes_left: boolean
                                                            }[]
                                                    },
                              currentAuthorityRoot_0: AuthorityRootRecord,
                              namespaceIssuerPath_0: { leaf: Uint8Array,
                                                       path: { sibling: { field: bigint
                                                                        },
                                                               goes_left: boolean
                                                             }[]
                                                     },
                              effectiveAt_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  allocateRuntimeInstance(context: __compactRuntime.CircuitContext<PS>,
                          allocation_0: RuntimeInstanceAllocation,
                          signature_0: { announcement: __compactRuntime.JubjubPoint,
                                         response: bigint
                                       },
                          allocator_0: GovernanceActivatorLeaf,
                          allocatorPath_0: { leaf: Uint8Array,
                                             path: { sibling: { field: bigint },
                                                     goes_left: boolean
                                                   }[]
                                           },
                          policyWitness_0: RuntimeAllocationPolicyWitness): __compactRuntime.CircuitResults<PS, Uint8Array>;
  runtimeSlotBindingKey(context: __compactRuntime.CircuitContext<PS>,
                        command_0: RuntimeSlotCommand): __compactRuntime.CircuitResults<PS, Uint8Array>;
  runtimeSlotCommandCommitment(context: __compactRuntime.CircuitContext<PS>,
                               command_0: RuntimeSlotCommand): __compactRuntime.CircuitResults<PS, Uint8Array>;
  runtimeSlotCommandSignatureChallenge(context: __compactRuntime.CircuitContext<PS>,
                                       announcement_0: __compactRuntime.JubjubPoint,
                                       publicKey_0: __compactRuntime.JubjubPoint,
                                       command_0: RuntimeSlotCommand): __compactRuntime.CircuitResults<PS, bigint>;
  runtimeSlotRecordCommitment(context: __compactRuntime.CircuitContext<PS>,
                              record_0: RuntimeSlotRecord): __compactRuntime.CircuitResults<PS, Uint8Array>;
  runtimeSlotProgressCommitment(context: __compactRuntime.CircuitContext<PS>,
                                progress_0: RuntimeSlotProgress): __compactRuntime.CircuitResults<PS, Uint8Array>;
  runtimeSlotInitialProgress(context: __compactRuntime.CircuitContext<PS>,
                             command_0: RuntimeSlotCommand,
                             previousBinding_0: Uint8Array,
                             previousAccount_0: Uint8Array): __compactRuntime.CircuitResults<PS, RuntimeSlotProgress>;
  runtimeSlotAssignmentFromCommand(context: __compactRuntime.CircuitContext<PS>,
                                   command_0: RuntimeSlotCommand): __compactRuntime.CircuitResults<PS, RuntimeSlotAssignment>;
  assertRuntimeSlotRecord(context: __compactRuntime.CircuitContext<PS>,
                          record_0: RuntimeSlotRecord,
                          opening_0: RuntimePrivateMapWitness,
                          state_0: RuntimeStateOpening,
                          command_0: RuntimeSlotCommand): __compactRuntime.CircuitResults<PS, []>;
  runtimeSlotAdvanceProgress(context: __compactRuntime.CircuitContext<PS>,
                             progress_0: RuntimeSlotProgress,
                             step_0: RuntimeSlotAncestryStep,
                             state_0: RuntimeStateOpening,
                             command_0: RuntimeSlotCommand,
                             statusRoot_0: { field: bigint }): __compactRuntime.CircuitResults<PS, RuntimeSlotProgress>;
  manageRuntimeParticipantSlots(context: __compactRuntime.CircuitContext<PS>,
                                operation_0: bigint,
                                command_0: RuntimeSlotCommand,
                                signature_0: { announcement: __compactRuntime.JubjubPoint,
                                               response: bigint
                                             },
                                allocation_0: RuntimeInstanceAllocation,
                                state_0: RuntimeStateOpening,
                                nextStateNonce_0: Uint8Array,
                                policyOpening_0: RuntimeSlotPolicyWitness,
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
                                subjectAccount_0: RuntimeAccountCredential,
                                subjectAccountStatusPath_0: { leaf: Uint8Array,
                                                              path: { sibling: { field: bigint
                                                                               },
                                                                      goes_left: boolean
                                                                    }[]
                                                            },
                                progress_0: RuntimeSlotProgress,
                                step_0: RuntimeSlotAncestryStep,
                                targetRecord_0: RuntimeSlotRecord,
                                assignmentOpening_0: RuntimePrivateMapWitness,
                                assignmentAppendPath_0: { leaf: Uint8Array,
                                                          path: { sibling: { field: bigint
                                                                           },
                                                                  goes_left: boolean
                                                                }[]
                                                        },
                                bindingOpening_0: RuntimePrivateMapWitness,
                                bindingAppendPath_0: { leaf: Uint8Array,
                                                       path: { sibling: { field: bigint
                                                                        },
                                                               goes_left: boolean
                                                             }[]
                                                     },
                                previousBindingOpening_0: RuntimePrivateMapWitness): __compactRuntime.CircuitResults<PS, bigint>;
  runtimeScopedActionNullifier(context: __compactRuntime.CircuitContext<PS>,
                               allocation_0: RuntimeInstanceAllocation,
                               intent_0: RuntimeActionIntent): __compactRuntime.CircuitResults<PS, Uint8Array>;
  runtimeActionNextState(context: __compactRuntime.CircuitContext<PS>,
                         state_0: RuntimeStateOpening,
                         nextStateIdHash_0: Uint8Array,
                         nextNonce_0: Uint8Array,
                         effectiveAt_0: bigint,
                         transitioning_0: boolean): __compactRuntime.CircuitResults<PS, RuntimeStateOpening>;
  runtimeDecisionReceiptId(context: __compactRuntime.CircuitContext<PS>,
                           receipt_0: RuntimeDecisionReceiptBody): __compactRuntime.CircuitResults<PS, Uint8Array>;
  runtimeActionCommandCommitment(context: __compactRuntime.CircuitContext<PS>,
                                 command_0: RuntimeActionCommand): __compactRuntime.CircuitResults<PS, Uint8Array>;
  runtimeActionCommandSignatureChallenge(context: __compactRuntime.CircuitContext<PS>,
                                         announcement_0: __compactRuntime.JubjubPoint,
                                         publicKey_0: __compactRuntime.JubjubPoint,
                                         command_0: RuntimeActionCommand): __compactRuntime.CircuitResults<PS, bigint>;
  runtimeActionProgressCommitment(context: __compactRuntime.CircuitContext<PS>,
                                  progress_0: RuntimeActionProgress): __compactRuntime.CircuitResults<PS, Uint8Array>;
  runtimeSelectedActionValueStep(context: __compactRuntime.CircuitContext<PS>,
                                 previous_0: Uint8Array,
                                 index_0: bigint,
                                 selected_0: RuntimeSelectedActionValue,
                                 output_0: boolean): __compactRuntime.CircuitResults<PS, Uint8Array>;
  runtimeActionImplementationReference(context: __compactRuntime.CircuitContext<PS>,
                                       network_0: Uint8Array,
                                       deployment_0: Uint8Array,
                                       moduleIdHash_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  runtimeActionReceiptSchemaHash(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, Uint8Array>;
  runtimeDelegatedActionModuleId(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, Uint8Array>;
  runtimeStateTransitionModuleId(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, Uint8Array>;
  runtimeActionInputSchemaHash(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, Uint8Array>;
  runtimeActionConfigurationSchemaHash(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, Uint8Array>;
  runtimeActionCompilerProfileHash(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, Uint8Array>;
  runtimeActionCompatibilityPolicyHash(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, Uint8Array>;
  runtimeActionSlotContext(context: __compactRuntime.CircuitContext<PS>,
                           intent_0: RuntimeActionIntent,
                           command_0: RuntimeActionCommand): __compactRuntime.CircuitResults<PS, RuntimeSlotCommand>;
  runtimeActionInitialProgress(context: __compactRuntime.CircuitContext<PS>,
                               command_0: RuntimeActionCommand,
                               session_0: RuntimeSessionCredential): __compactRuntime.CircuitResults<PS, RuntimeActionProgress>;
  prepareRuntimeAction(context: __compactRuntime.CircuitContext<PS>,
                       operation_0: bigint,
                       command_0: RuntimeActionCommand,
                       signature_0: { announcement: __compactRuntime.JubjubPoint,
                                      response: bigint
                                    },
                       intent_0: RuntimeActionIntent,
                       session_0: RuntimeSessionCredential,
                       allocation_0: RuntimeInstanceAllocation,
                       state_0: RuntimeStateOpening,
                       policy_0: RuntimeTemplateActionPolicy,
                       binding_0: ProofModuleBinding,
                       bindingPath_0: { leaf: Uint8Array,
                                        path: { sibling: { field: bigint },
                                                goes_left: boolean
                                              }[]
                                      },
                       progress_0: RuntimeActionProgress,
                       slotStep_0: RuntimeSlotAncestryStep,
                       selected_0: RuntimeSelectedActionValue,
                       typePath_0: { leaf: Uint8Array,
                                     path: { sibling: { field: bigint },
                                             goes_left: boolean
                                           }[]
                                   }): __compactRuntime.CircuitResults<PS, []>;
  executeRuntimeAction(context: __compactRuntime.CircuitContext<PS>,
                       command_0: RuntimeActionCommand,
                       signature_0: { announcement: __compactRuntime.JubjubPoint,
                                      response: bigint
                                    },
                       intent_0: RuntimeActionIntent,
                       ancestry_0: RuntimeActiveAncestry,
                       sessionSignature_0: { announcement: __compactRuntime.JubjubPoint,
                                             response: bigint
                                           },
                       intentSignature_0: { announcement: __compactRuntime.JubjubPoint,
                                            response: bigint
                                          },
                       capabilityPaths_0: RuntimeActionScopePaths,
                       sessionPaths_0: RuntimeActionScopePaths,
                       allocation_0: RuntimeInstanceAllocation,
                       state_0: RuntimeStateOpening,
                       policy_0: RuntimeTemplateActionPolicy,
                       binding_0: ProofModuleBinding,
                       bindingPath_0: { leaf: Uint8Array,
                                        path: { sibling: { field: bigint },
                                                goes_left: boolean
                                              }[]
                                      },
                       progress_0: RuntimeActionProgress,
                       issuer_0: GovernanceActivatorLeaf,
                       instanceIssuerPath_0: { leaf: Uint8Array,
                                               path: { sibling: { field: bigint
                                                                },
                                                       goes_left: boolean
                                                     }[]
                                             },
                       namespaceIssuerPath_0: { leaf: Uint8Array,
                                                path: { sibling: { field: bigint
                                                                 },
                                                        goes_left: boolean
                                                      }[]
                                              },
                       transition_0: RuntimeTemplateTransition,
                       transitionPath_0: { leaf: Uint8Array,
                                           path: { sibling: { field: bigint },
                                                   goes_left: boolean
                                                 }[]
                                         },
                       nextStateIdHash_0: Uint8Array,
                       nextNonce_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
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
  runtimeCredentialStatusPathIndex(context: __compactRuntime.CircuitContext<PS>,
                                   path_0: { leaf: Uint8Array,
                                             path: { sibling: { field: bigint },
                                                     goes_left: boolean
                                                   }[]
                                           }): __compactRuntime.CircuitResults<PS, bigint>;
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
  runtimeCredentialStatusCommandCommitment(context: __compactRuntime.CircuitContext<PS>,
                                           command_0: RuntimeCredentialStatusCommand): __compactRuntime.CircuitResults<PS, Uint8Array>;
  runtimeScopeProgressCommitment(context: __compactRuntime.CircuitContext<PS>,
                                 progress_0: RuntimeScopeProgress): __compactRuntime.CircuitResults<PS, Uint8Array>;
  runtimeScopeElementCommitment(context: __compactRuntime.CircuitContext<PS>,
                                element_0: RuntimeScopeElement): __compactRuntime.CircuitResults<PS, Uint8Array>;
  capabilityAttenuationCertificationCommitment(context: __compactRuntime.CircuitContext<PS>,
                                               certification_0: CapabilityAttenuationCertification): __compactRuntime.CircuitResults<PS, Uint8Array>;
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
  emptyGovernanceDispatchInput(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, GovernanceDispatchInput>;
  governAuthorization(context: __compactRuntime.CircuitContext<PS>,
                      input_0: GovernanceDispatchInput): __compactRuntime.CircuitResults<PS, GovernanceDispatchResult>;
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
                                operation_0: bigint,
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
                                                     },
                                capability_0: RuntimeCapabilityCredential,
                                capabilitySignature_0: { announcement: __compactRuntime.JubjubPoint,
                                                         response: bigint
                                                       },
                                parentCapability_0: RuntimeCapabilityCredential,
                                parentCapabilityStatusPath_0: { leaf: Uint8Array,
                                                                path: { sibling: { field: bigint
                                                                                 },
                                                                        goes_left: boolean
                                                                      }[]
                                                              },
                                scopeProgress_0: RuntimeScopeProgress,
                                scopeElement_0: RuntimeScopeElement,
                                childScopePath_0: { leaf: Uint8Array,
                                                    path: { sibling: { field: bigint
                                                                     },
                                                            goes_left: boolean
                                                          }[]
                                                  },
                                parentScopePath_0: { leaf: Uint8Array,
                                                     path: { sibling: { field: bigint
                                                                      },
                                                             goes_left: boolean
                                                           }[]
                                                   },
                                sessionCredential_0: RuntimeSessionCredential,
                                instanceBinding_0: RuntimeCredentialInstanceBinding): __compactRuntime.CircuitResults<PS, bigint>;
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
  capabilityAttenuationSessions: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): CapabilityAttenuationSession;
    [Symbol.iterator](): Iterator<[Uint8Array, CapabilityAttenuationSession]>
  };
  runtimeInstances: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): RuntimeInstanceRecord;
    [Symbol.iterator](): Iterator<[Uint8Array, RuntimeInstanceRecord]>
  };
  usedAllocationRequestNullifiers: {
    isEmpty(): boolean;
    size(): bigint;
    member(elem_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<Uint8Array>
  };
  usedInstanceIdentityNullifiers: {
    isEmpty(): boolean;
    size(): bigint;
    member(elem_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<Uint8Array>
  };
  runtimeSlotSessions: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): RuntimeSlotSession;
    [Symbol.iterator](): Iterator<[Uint8Array, RuntimeSlotSession]>
  };
  usedRuntimeSlotCommandNonces: {
    isEmpty(): boolean;
    size(): bigint;
    member(elem_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<Uint8Array>
  };
  usedRuntimeActionNullifiers: {
    isEmpty(): boolean;
    size(): bigint;
    member(elem_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<Uint8Array>
  };
  decisionReceipts: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): RuntimeDecisionReceiptBody;
    [Symbol.iterator](): Iterator<[Uint8Array, RuntimeDecisionReceiptBody]>
  };
  runtimeActionSessions: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): RuntimeActionSession;
    [Symbol.iterator](): Iterator<[Uint8Array, RuntimeActionSession]>
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
