import * as __compactRuntime from '@midnight-ntwrk/compact-runtime';
__compactRuntime.checkRuntimeVersion('0.16.0');

const _descriptor_0 = new __compactRuntime.CompactTypeBytes(32);

const _descriptor_1 = __compactRuntime.CompactTypeField;

class _MerkleTreeDigest_0 {
  alignment() {
    return _descriptor_1.alignment();
  }
  fromValue(value_0) {
    return {
      field: _descriptor_1.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_1.toValue(value_0.field);
  }
}

const _descriptor_2 = new _MerkleTreeDigest_0();

const _descriptor_3 = new __compactRuntime.CompactTypeUnsignedInteger(18446744073709551615n, 8);

const _descriptor_4 = new __compactRuntime.CompactTypeUnsignedInteger(65535n, 2);

class _AuthorityRootRecord_0 {
  alignment() {
    return _descriptor_0.alignment().concat(_descriptor_2.alignment().concat(_descriptor_3.alignment().concat(_descriptor_3.alignment().concat(_descriptor_4.alignment().concat(_descriptor_4.alignment().concat(_descriptor_4.alignment()))))));
  }
  fromValue(value_0) {
    return {
      governancePolicyHash: _descriptor_0.fromValue(value_0),
      root: _descriptor_2.fromValue(value_0),
      rootVersion: _descriptor_3.fromValue(value_0),
      rootSequence: _descriptor_3.fromValue(value_0),
      moduleReviewThreshold: _descriptor_4.fromValue(value_0),
      moduleApprovalThreshold: _descriptor_4.fromValue(value_0),
      authorityRootUpdateThreshold: _descriptor_4.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_0.toValue(value_0.governancePolicyHash).concat(_descriptor_2.toValue(value_0.root).concat(_descriptor_3.toValue(value_0.rootVersion).concat(_descriptor_3.toValue(value_0.rootSequence).concat(_descriptor_4.toValue(value_0.moduleReviewThreshold).concat(_descriptor_4.toValue(value_0.moduleApprovalThreshold).concat(_descriptor_4.toValue(value_0.authorityRootUpdateThreshold)))))));
  }
}

const _descriptor_5 = new _AuthorityRootRecord_0();

const _descriptor_6 = __compactRuntime.CompactTypeBoolean;

class _CredentialStatusRootRecord_0 {
  alignment() {
    return _descriptor_2.alignment().concat(_descriptor_3.alignment());
  }
  fromValue(value_0) {
    return {
      root: _descriptor_2.fromValue(value_0),
      rootSequence: _descriptor_3.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_2.toValue(value_0.root).concat(_descriptor_3.toValue(value_0.rootSequence));
  }
}

const _descriptor_7 = new _CredentialStatusRootRecord_0();

const _descriptor_8 = new __compactRuntime.CompactTypeUnsignedInteger(255n, 1);

class _RuntimeCredentialStatusCommand_0 {
  alignment() {
    return _descriptor_4.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_3.alignment().concat(_descriptor_3.alignment().concat(_descriptor_3.alignment().concat(_descriptor_4.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_3.alignment().concat(_descriptor_8.alignment().concat(_descriptor_8.alignment().concat(_descriptor_3.alignment().concat(_descriptor_0.alignment()))))))))))))));
  }
  fromValue(value_0) {
    return {
      commandVersion: _descriptor_4.fromValue(value_0),
      namespaceHash: _descriptor_0.fromValue(value_0),
      governancePolicyHash: _descriptor_0.fromValue(value_0),
      authorityRootVersion: _descriptor_3.fromValue(value_0),
      authorityRootSequence: _descriptor_3.fromValue(value_0),
      credentialStatusRootSequence: _descriptor_3.fromValue(value_0),
      credentialKind: _descriptor_4.fromValue(value_0),
      credentialCommitment: _descriptor_0.fromValue(value_0),
      subjectAccountCredentialCommitment: _descriptor_0.fromValue(value_0),
      revocationAuthorityAccountCredentialCommitment: _descriptor_0.fromValue(value_0),
      statusIndex: _descriptor_3.fromValue(value_0),
      expectedStatus: _descriptor_8.fromValue(value_0),
      nextStatus: _descriptor_8.fromValue(value_0),
      effectiveAt: _descriptor_3.fromValue(value_0),
      commandNonce: _descriptor_0.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_4.toValue(value_0.commandVersion).concat(_descriptor_0.toValue(value_0.namespaceHash).concat(_descriptor_0.toValue(value_0.governancePolicyHash).concat(_descriptor_3.toValue(value_0.authorityRootVersion).concat(_descriptor_3.toValue(value_0.authorityRootSequence).concat(_descriptor_3.toValue(value_0.credentialStatusRootSequence).concat(_descriptor_4.toValue(value_0.credentialKind).concat(_descriptor_0.toValue(value_0.credentialCommitment).concat(_descriptor_0.toValue(value_0.subjectAccountCredentialCommitment).concat(_descriptor_0.toValue(value_0.revocationAuthorityAccountCredentialCommitment).concat(_descriptor_3.toValue(value_0.statusIndex).concat(_descriptor_8.toValue(value_0.expectedStatus).concat(_descriptor_8.toValue(value_0.nextStatus).concat(_descriptor_3.toValue(value_0.effectiveAt).concat(_descriptor_0.toValue(value_0.commandNonce)))))))))))))));
  }
}

const _descriptor_9 = new _RuntimeCredentialStatusCommand_0();

const _descriptor_10 = __compactRuntime.CompactTypeJubjubPoint;

class _SchnorrSignature_0 {
  alignment() {
    return _descriptor_10.alignment().concat(_descriptor_1.alignment());
  }
  fromValue(value_0) {
    return {
      announcement: _descriptor_10.fromValue(value_0),
      response: _descriptor_1.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_10.toValue(value_0.announcement).concat(_descriptor_1.toValue(value_0.response));
  }
}

const _descriptor_11 = new _SchnorrSignature_0();

class _GovernanceActivatorLeaf_0 {
  alignment() {
    return _descriptor_4.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_4.alignment().concat(_descriptor_10.alignment().concat(_descriptor_3.alignment().concat(_descriptor_3.alignment()))))));
  }
  fromValue(value_0) {
    return {
      leafVersion: _descriptor_4.fromValue(value_0),
      namespaceHash: _descriptor_0.fromValue(value_0),
      governancePolicyHash: _descriptor_0.fromValue(value_0),
      authorityKind: _descriptor_4.fromValue(value_0),
      publicKey: _descriptor_10.fromValue(value_0),
      validAfter: _descriptor_3.fromValue(value_0),
      validBefore: _descriptor_3.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_4.toValue(value_0.leafVersion).concat(_descriptor_0.toValue(value_0.namespaceHash).concat(_descriptor_0.toValue(value_0.governancePolicyHash).concat(_descriptor_4.toValue(value_0.authorityKind).concat(_descriptor_10.toValue(value_0.publicKey).concat(_descriptor_3.toValue(value_0.validAfter).concat(_descriptor_3.toValue(value_0.validBefore)))))));
  }
}

const _descriptor_12 = new _GovernanceActivatorLeaf_0();

class _MerkleTreePathEntry_0 {
  alignment() {
    return _descriptor_2.alignment().concat(_descriptor_6.alignment());
  }
  fromValue(value_0) {
    return {
      sibling: _descriptor_2.fromValue(value_0),
      goes_left: _descriptor_6.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_2.toValue(value_0.sibling).concat(_descriptor_6.toValue(value_0.goes_left));
  }
}

const _descriptor_13 = new _MerkleTreePathEntry_0();

const _descriptor_14 = new __compactRuntime.CompactTypeVector(20, _descriptor_13);

class _MerkleTreePath_0 {
  alignment() {
    return _descriptor_0.alignment().concat(_descriptor_14.alignment());
  }
  fromValue(value_0) {
    return {
      leaf: _descriptor_0.fromValue(value_0),
      path: _descriptor_14.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_0.toValue(value_0.leaf).concat(_descriptor_14.toValue(value_0.path));
  }
}

const _descriptor_15 = new _MerkleTreePath_0();

class _SemanticVersion_0 {
  alignment() {
    return _descriptor_3.alignment().concat(_descriptor_3.alignment().concat(_descriptor_3.alignment()));
  }
  fromValue(value_0) {
    return {
      major: _descriptor_3.fromValue(value_0),
      minor: _descriptor_3.fromValue(value_0),
      patch: _descriptor_3.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_3.toValue(value_0.major).concat(_descriptor_3.toValue(value_0.minor).concat(_descriptor_3.toValue(value_0.patch)));
  }
}

const _descriptor_16 = new _SemanticVersion_0();

class _TemplateRegistryTarget_0 {
  alignment() {
    return _descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_16.alignment().concat(_descriptor_0.alignment())));
  }
  fromValue(value_0) {
    return {
      namespaceHash: _descriptor_0.fromValue(value_0),
      templateIdHash: _descriptor_0.fromValue(value_0),
      semanticVersion: _descriptor_16.fromValue(value_0),
      templateContentHash: _descriptor_0.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_0.toValue(value_0.namespaceHash).concat(_descriptor_0.toValue(value_0.templateIdHash).concat(_descriptor_16.toValue(value_0.semanticVersion).concat(_descriptor_0.toValue(value_0.templateContentHash))));
  }
}

const _descriptor_17 = new _TemplateRegistryTarget_0();

class _RuntimeAccountCredential_0 {
  alignment() {
    return _descriptor_4.alignment().concat(_descriptor_17.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_4.alignment().concat(_descriptor_0.alignment().concat(_descriptor_10.alignment().concat(_descriptor_3.alignment().concat(_descriptor_3.alignment().concat(_descriptor_3.alignment()))))))))));
  }
  fromValue(value_0) {
    return {
      credentialVersion: _descriptor_4.fromValue(value_0),
      target: _descriptor_17.fromValue(value_0),
      instanceCommitment: _descriptor_0.fromValue(value_0),
      contextHash: _descriptor_0.fromValue(value_0),
      accountIdHash: _descriptor_0.fromValue(value_0),
      principalKind: _descriptor_4.fromValue(value_0),
      m5AccountCommitment: _descriptor_0.fromValue(value_0),
      runtimePublicKey: _descriptor_10.fromValue(value_0),
      statusIndex: _descriptor_3.fromValue(value_0),
      issuedAt: _descriptor_3.fromValue(value_0),
      validBefore: _descriptor_3.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_4.toValue(value_0.credentialVersion).concat(_descriptor_17.toValue(value_0.target).concat(_descriptor_0.toValue(value_0.instanceCommitment).concat(_descriptor_0.toValue(value_0.contextHash).concat(_descriptor_0.toValue(value_0.accountIdHash).concat(_descriptor_4.toValue(value_0.principalKind).concat(_descriptor_0.toValue(value_0.m5AccountCommitment).concat(_descriptor_10.toValue(value_0.runtimePublicKey).concat(_descriptor_3.toValue(value_0.statusIndex).concat(_descriptor_3.toValue(value_0.issuedAt).concat(_descriptor_3.toValue(value_0.validBefore)))))))))));
  }
}

const _descriptor_18 = new _RuntimeAccountCredential_0();

const _descriptor_19 = new __compactRuntime.CompactTypeUnsignedInteger(4294967295n, 4);

class _ActivationStagingRecord_0 {
  alignment() {
    return _descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_3.alignment().concat(_descriptor_3.alignment().concat(_descriptor_0.alignment().concat(_descriptor_2.alignment().concat(_descriptor_19.alignment().concat(_descriptor_3.alignment().concat(_descriptor_19.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_3.alignment()))))))))))));
  }
  fromValue(value_0) {
    return {
      envelopeCommitment: _descriptor_0.fromValue(value_0),
      namespaceHash: _descriptor_0.fromValue(value_0),
      governancePolicyHash: _descriptor_0.fromValue(value_0),
      authorityRootVersion: _descriptor_3.fromValue(value_0),
      authorityRootSequence: _descriptor_3.fromValue(value_0),
      proofModuleBindingsHash: _descriptor_0.fromValue(value_0),
      proofModuleBindingRoot: _descriptor_2.fromValue(value_0),
      proofModuleBindingCount: _descriptor_19.fromValue(value_0),
      proofModuleRegistrySequence: _descriptor_3.fromValue(value_0),
      nextBindingIndex: _descriptor_19.fromValue(value_0),
      stagedBindingsAccumulator: _descriptor_0.fromValue(value_0),
      admissionNonce: _descriptor_0.fromValue(value_0),
      expiresAt: _descriptor_3.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_0.toValue(value_0.envelopeCommitment).concat(_descriptor_0.toValue(value_0.namespaceHash).concat(_descriptor_0.toValue(value_0.governancePolicyHash).concat(_descriptor_3.toValue(value_0.authorityRootVersion).concat(_descriptor_3.toValue(value_0.authorityRootSequence).concat(_descriptor_0.toValue(value_0.proofModuleBindingsHash).concat(_descriptor_2.toValue(value_0.proofModuleBindingRoot).concat(_descriptor_19.toValue(value_0.proofModuleBindingCount).concat(_descriptor_3.toValue(value_0.proofModuleRegistrySequence).concat(_descriptor_19.toValue(value_0.nextBindingIndex).concat(_descriptor_0.toValue(value_0.stagedBindingsAccumulator).concat(_descriptor_0.toValue(value_0.admissionNonce).concat(_descriptor_3.toValue(value_0.expiresAt)))))))))))));
  }
}

const _descriptor_20 = new _ActivationStagingRecord_0();

class _ProofModuleIdentity_0 {
  alignment() {
    return _descriptor_0.alignment().concat(_descriptor_16.alignment().concat(_descriptor_0.alignment()));
  }
  fromValue(value_0) {
    return {
      moduleIdHash: _descriptor_0.fromValue(value_0),
      moduleVersion: _descriptor_16.fromValue(value_0),
      implementationHash: _descriptor_0.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_0.toValue(value_0.moduleIdHash).concat(_descriptor_16.toValue(value_0.moduleVersion).concat(_descriptor_0.toValue(value_0.implementationHash)));
  }
}

const _descriptor_21 = new _ProofModuleIdentity_0();

class _ProofModuleRecord_0 {
  alignment() {
    return _descriptor_21.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_3.alignment().concat(_descriptor_3.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_4.alignment().concat(_descriptor_4.alignment().concat(_descriptor_0.alignment().concat(_descriptor_4.alignment().concat(_descriptor_4.alignment().concat(_descriptor_0.alignment().concat(_descriptor_8.alignment().concat(_descriptor_3.alignment().concat(_descriptor_3.alignment().concat(_descriptor_3.alignment().concat(_descriptor_3.alignment().concat(_descriptor_3.alignment().concat(_descriptor_3.alignment().concat(_descriptor_3.alignment())))))))))))))))))))))))))));
  }
  fromValue(value_0) {
    return {
      identity: _descriptor_21.fromValue(value_0),
      proposalCommitment: _descriptor_0.fromValue(value_0),
      governanceNamespaceHash: _descriptor_0.fromValue(value_0),
      governancePolicyHash: _descriptor_0.fromValue(value_0),
      authorityRootVersion: _descriptor_3.fromValue(value_0),
      authorityRootSequence: _descriptor_3.fromValue(value_0),
      implementationReferenceHash: _descriptor_0.fromValue(value_0),
      sourceHash: _descriptor_0.fromValue(value_0),
      inputSchemaHash: _descriptor_0.fromValue(value_0),
      configurationSchemaHash: _descriptor_0.fromValue(value_0),
      receiptSchemaHash: _descriptor_0.fromValue(value_0),
      compilerVersionHash: _descriptor_0.fromValue(value_0),
      compatibilityPolicyHash: _descriptor_0.fromValue(value_0),
      approvalEvidenceCommitment: _descriptor_0.fromValue(value_0),
      reviewThreshold: _descriptor_4.fromValue(value_0),
      reviewCount: _descriptor_4.fromValue(value_0),
      reviewEvidenceAccumulator: _descriptor_0.fromValue(value_0),
      approvalThreshold: _descriptor_4.fromValue(value_0),
      approvalCount: _descriptor_4.fromValue(value_0),
      approvalEvidenceAccumulator: _descriptor_0.fromValue(value_0),
      lifecycleStatus: _descriptor_8.fromValue(value_0),
      activationSequence: _descriptor_3.fromValue(value_0),
      proposedAt: _descriptor_3.fromValue(value_0),
      reviewedAt: _descriptor_3.fromValue(value_0),
      approvedAt: _descriptor_3.fromValue(value_0),
      activatedAt: _descriptor_3.fromValue(value_0),
      deprecatedAt: _descriptor_3.fromValue(value_0),
      revokedAt: _descriptor_3.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_21.toValue(value_0.identity).concat(_descriptor_0.toValue(value_0.proposalCommitment).concat(_descriptor_0.toValue(value_0.governanceNamespaceHash).concat(_descriptor_0.toValue(value_0.governancePolicyHash).concat(_descriptor_3.toValue(value_0.authorityRootVersion).concat(_descriptor_3.toValue(value_0.authorityRootSequence).concat(_descriptor_0.toValue(value_0.implementationReferenceHash).concat(_descriptor_0.toValue(value_0.sourceHash).concat(_descriptor_0.toValue(value_0.inputSchemaHash).concat(_descriptor_0.toValue(value_0.configurationSchemaHash).concat(_descriptor_0.toValue(value_0.receiptSchemaHash).concat(_descriptor_0.toValue(value_0.compilerVersionHash).concat(_descriptor_0.toValue(value_0.compatibilityPolicyHash).concat(_descriptor_0.toValue(value_0.approvalEvidenceCommitment).concat(_descriptor_4.toValue(value_0.reviewThreshold).concat(_descriptor_4.toValue(value_0.reviewCount).concat(_descriptor_0.toValue(value_0.reviewEvidenceAccumulator).concat(_descriptor_4.toValue(value_0.approvalThreshold).concat(_descriptor_4.toValue(value_0.approvalCount).concat(_descriptor_0.toValue(value_0.approvalEvidenceAccumulator).concat(_descriptor_8.toValue(value_0.lifecycleStatus).concat(_descriptor_3.toValue(value_0.activationSequence).concat(_descriptor_3.toValue(value_0.proposedAt).concat(_descriptor_3.toValue(value_0.reviewedAt).concat(_descriptor_3.toValue(value_0.approvedAt).concat(_descriptor_3.toValue(value_0.activatedAt).concat(_descriptor_3.toValue(value_0.deprecatedAt).concat(_descriptor_3.toValue(value_0.revokedAt))))))))))))))))))))))))))));
  }
}

const _descriptor_22 = new _ProofModuleRecord_0();

class _ProofModuleBinding_0 {
  alignment() {
    return _descriptor_4.alignment().concat(_descriptor_19.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_16.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment()))))))));
  }
  fromValue(value_0) {
    return {
      bindingVersion: _descriptor_4.fromValue(value_0),
      actionIndex: _descriptor_19.fromValue(value_0),
      actionIdHash: _descriptor_0.fromValue(value_0),
      proofProfileIdHash: _descriptor_0.fromValue(value_0),
      moduleIdHash: _descriptor_0.fromValue(value_0),
      moduleVersion: _descriptor_16.fromValue(value_0),
      implementationHash: _descriptor_0.fromValue(value_0),
      configurationHash: _descriptor_0.fromValue(value_0),
      receiptSchemaHash: _descriptor_0.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_4.toValue(value_0.bindingVersion).concat(_descriptor_19.toValue(value_0.actionIndex).concat(_descriptor_0.toValue(value_0.actionIdHash).concat(_descriptor_0.toValue(value_0.proofProfileIdHash).concat(_descriptor_0.toValue(value_0.moduleIdHash).concat(_descriptor_16.toValue(value_0.moduleVersion).concat(_descriptor_0.toValue(value_0.implementationHash).concat(_descriptor_0.toValue(value_0.configurationHash).concat(_descriptor_0.toValue(value_0.receiptSchemaHash)))))))));
  }
}

const _descriptor_23 = new _ProofModuleBinding_0();

class _ActiveTemplateRecord_0 {
  alignment() {
    return _descriptor_17.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_2.alignment().concat(_descriptor_19.alignment().concat(_descriptor_3.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_3.alignment().concat(_descriptor_3.alignment().concat(_descriptor_8.alignment().concat(_descriptor_3.alignment().concat(_descriptor_3.alignment().concat(_descriptor_3.alignment().concat(_descriptor_0.alignment().concat(_descriptor_3.alignment().concat(_descriptor_3.alignment())))))))))))))))));
  }
  fromValue(value_0) {
    return {
      target: _descriptor_17.fromValue(value_0),
      governancePolicyHash: _descriptor_0.fromValue(value_0),
      proofModuleBindingsHash: _descriptor_0.fromValue(value_0),
      proofModuleBindingRoot: _descriptor_2.fromValue(value_0),
      proofModuleBindingCount: _descriptor_19.fromValue(value_0),
      proofModuleRegistrySequence: _descriptor_3.fromValue(value_0),
      stagedBindingsAccumulator: _descriptor_0.fromValue(value_0),
      m4ActivationRecordHash: _descriptor_0.fromValue(value_0),
      approvalEvidenceCommitment: _descriptor_0.fromValue(value_0),
      authorityRootVersion: _descriptor_3.fromValue(value_0),
      authorityRootSequence: _descriptor_3.fromValue(value_0),
      lifecycleStatus: _descriptor_8.fromValue(value_0),
      activationSequence: _descriptor_3.fromValue(value_0),
      activatedAt: _descriptor_3.fromValue(value_0),
      terminationEffectiveSequence: _descriptor_3.fromValue(value_0),
      terminationReasonHash: _descriptor_0.fromValue(value_0),
      retiredAt: _descriptor_3.fromValue(value_0),
      revokedAt: _descriptor_3.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_17.toValue(value_0.target).concat(_descriptor_0.toValue(value_0.governancePolicyHash).concat(_descriptor_0.toValue(value_0.proofModuleBindingsHash).concat(_descriptor_2.toValue(value_0.proofModuleBindingRoot).concat(_descriptor_19.toValue(value_0.proofModuleBindingCount).concat(_descriptor_3.toValue(value_0.proofModuleRegistrySequence).concat(_descriptor_0.toValue(value_0.stagedBindingsAccumulator).concat(_descriptor_0.toValue(value_0.m4ActivationRecordHash).concat(_descriptor_0.toValue(value_0.approvalEvidenceCommitment).concat(_descriptor_3.toValue(value_0.authorityRootVersion).concat(_descriptor_3.toValue(value_0.authorityRootSequence).concat(_descriptor_8.toValue(value_0.lifecycleStatus).concat(_descriptor_3.toValue(value_0.activationSequence).concat(_descriptor_3.toValue(value_0.activatedAt).concat(_descriptor_3.toValue(value_0.terminationEffectiveSequence).concat(_descriptor_0.toValue(value_0.terminationReasonHash).concat(_descriptor_3.toValue(value_0.retiredAt).concat(_descriptor_3.toValue(value_0.revokedAt))))))))))))))))));
  }
}

const _descriptor_24 = new _ActiveTemplateRecord_0();

class _ActivationAdmissionEnvelope_0 {
  alignment() {
    return _descriptor_4.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_16.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_2.alignment().concat(_descriptor_19.alignment().concat(_descriptor_3.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_3.alignment().concat(_descriptor_3.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_4.alignment().concat(_descriptor_0.alignment().concat(_descriptor_3.alignment().concat(_descriptor_3.alignment())))))))))))))))))));
  }
  fromValue(value_0) {
    return {
      envelopeVersion: _descriptor_4.fromValue(value_0),
      namespaceHash: _descriptor_0.fromValue(value_0),
      templateIdHash: _descriptor_0.fromValue(value_0),
      semanticVersion: _descriptor_16.fromValue(value_0),
      templateContentHash: _descriptor_0.fromValue(value_0),
      governancePolicyHash: _descriptor_0.fromValue(value_0),
      proofModuleBindingsHash: _descriptor_0.fromValue(value_0),
      proofModuleBindingRoot: _descriptor_2.fromValue(value_0),
      proofModuleBindingCount: _descriptor_19.fromValue(value_0),
      proofModuleRegistrySequence: _descriptor_3.fromValue(value_0),
      m4ActivationRecordHash: _descriptor_0.fromValue(value_0),
      approvalEvidenceCommitment: _descriptor_0.fromValue(value_0),
      authorityRootVersion: _descriptor_3.fromValue(value_0),
      authorityRootSequence: _descriptor_3.fromValue(value_0),
      targetNetworkHash: _descriptor_0.fromValue(value_0),
      targetContractIdentity: _descriptor_0.fromValue(value_0),
      registryProtocolVersion: _descriptor_4.fromValue(value_0),
      admissionNonce: _descriptor_0.fromValue(value_0),
      activatedAt: _descriptor_3.fromValue(value_0),
      stagingExpiresAt: _descriptor_3.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_4.toValue(value_0.envelopeVersion).concat(_descriptor_0.toValue(value_0.namespaceHash).concat(_descriptor_0.toValue(value_0.templateIdHash).concat(_descriptor_16.toValue(value_0.semanticVersion).concat(_descriptor_0.toValue(value_0.templateContentHash).concat(_descriptor_0.toValue(value_0.governancePolicyHash).concat(_descriptor_0.toValue(value_0.proofModuleBindingsHash).concat(_descriptor_2.toValue(value_0.proofModuleBindingRoot).concat(_descriptor_19.toValue(value_0.proofModuleBindingCount).concat(_descriptor_3.toValue(value_0.proofModuleRegistrySequence).concat(_descriptor_0.toValue(value_0.m4ActivationRecordHash).concat(_descriptor_0.toValue(value_0.approvalEvidenceCommitment).concat(_descriptor_3.toValue(value_0.authorityRootVersion).concat(_descriptor_3.toValue(value_0.authorityRootSequence).concat(_descriptor_0.toValue(value_0.targetNetworkHash).concat(_descriptor_0.toValue(value_0.targetContractIdentity).concat(_descriptor_4.toValue(value_0.registryProtocolVersion).concat(_descriptor_0.toValue(value_0.admissionNonce).concat(_descriptor_3.toValue(value_0.activatedAt).concat(_descriptor_3.toValue(value_0.stagingExpiresAt))))))))))))))))))));
  }
}

const _descriptor_25 = new _ActivationAdmissionEnvelope_0();

class _FinalizationResult_0 {
  alignment() {
    return _descriptor_6.alignment().concat(_descriptor_0.alignment());
  }
  fromValue(value_0) {
    return {
      activated: _descriptor_6.fromValue(value_0),
      registryKey: _descriptor_0.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_6.toValue(value_0.activated).concat(_descriptor_0.toValue(value_0.registryKey));
  }
}

const _descriptor_26 = new _FinalizationResult_0();

class _TemplateLifecycleCommand_0 {
  alignment() {
    return _descriptor_4.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_3.alignment().concat(_descriptor_3.alignment().concat(_descriptor_8.alignment().concat(_descriptor_8.alignment().concat(_descriptor_3.alignment().concat(_descriptor_3.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment()))))))))))));
  }
  fromValue(value_0) {
    return {
      commandVersion: _descriptor_4.fromValue(value_0),
      registryKey: _descriptor_0.fromValue(value_0),
      recordCommitment: _descriptor_0.fromValue(value_0),
      namespaceHash: _descriptor_0.fromValue(value_0),
      governancePolicyHash: _descriptor_0.fromValue(value_0),
      authorityRootVersion: _descriptor_3.fromValue(value_0),
      authorityRootSequence: _descriptor_3.fromValue(value_0),
      expectedLifecycleStatus: _descriptor_8.fromValue(value_0),
      nextLifecycleStatus: _descriptor_8.fromValue(value_0),
      effectiveAt: _descriptor_3.fromValue(value_0),
      effectiveSequence: _descriptor_3.fromValue(value_0),
      reasonHash: _descriptor_0.fromValue(value_0),
      commandNonce: _descriptor_0.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_4.toValue(value_0.commandVersion).concat(_descriptor_0.toValue(value_0.registryKey).concat(_descriptor_0.toValue(value_0.recordCommitment).concat(_descriptor_0.toValue(value_0.namespaceHash).concat(_descriptor_0.toValue(value_0.governancePolicyHash).concat(_descriptor_3.toValue(value_0.authorityRootVersion).concat(_descriptor_3.toValue(value_0.authorityRootSequence).concat(_descriptor_8.toValue(value_0.expectedLifecycleStatus).concat(_descriptor_8.toValue(value_0.nextLifecycleStatus).concat(_descriptor_3.toValue(value_0.effectiveAt).concat(_descriptor_3.toValue(value_0.effectiveSequence).concat(_descriptor_0.toValue(value_0.reasonHash).concat(_descriptor_0.toValue(value_0.commandNonce)))))))))))));
  }
}

const _descriptor_27 = new _TemplateLifecycleCommand_0();

class _ProofModuleApprovalRecord_0 {
  alignment() {
    return _descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_3.alignment())));
  }
  fromValue(value_0) {
    return {
      moduleKey: _descriptor_0.fromValue(value_0),
      approverAuthorityCommitment: _descriptor_0.fromValue(value_0),
      approvalCommitment: _descriptor_0.fromValue(value_0),
      approvedAt: _descriptor_3.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_0.toValue(value_0.moduleKey).concat(_descriptor_0.toValue(value_0.approverAuthorityCommitment).concat(_descriptor_0.toValue(value_0.approvalCommitment).concat(_descriptor_3.toValue(value_0.approvedAt))));
  }
}

const _descriptor_28 = new _ProofModuleApprovalRecord_0();

class _ProofModuleLifecycleCommand_0 {
  alignment() {
    return _descriptor_4.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_3.alignment().concat(_descriptor_3.alignment().concat(_descriptor_8.alignment().concat(_descriptor_8.alignment().concat(_descriptor_3.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment())))))))))));
  }
  fromValue(value_0) {
    return {
      commandVersion: _descriptor_4.fromValue(value_0),
      moduleKey: _descriptor_0.fromValue(value_0),
      recordCommitment: _descriptor_0.fromValue(value_0),
      governanceNamespaceHash: _descriptor_0.fromValue(value_0),
      governancePolicyHash: _descriptor_0.fromValue(value_0),
      authorityRootVersion: _descriptor_3.fromValue(value_0),
      authorityRootSequence: _descriptor_3.fromValue(value_0),
      expectedLifecycleStatus: _descriptor_8.fromValue(value_0),
      nextLifecycleStatus: _descriptor_8.fromValue(value_0),
      effectiveAt: _descriptor_3.fromValue(value_0),
      reasonHash: _descriptor_0.fromValue(value_0),
      commandNonce: _descriptor_0.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_4.toValue(value_0.commandVersion).concat(_descriptor_0.toValue(value_0.moduleKey).concat(_descriptor_0.toValue(value_0.recordCommitment).concat(_descriptor_0.toValue(value_0.governanceNamespaceHash).concat(_descriptor_0.toValue(value_0.governancePolicyHash).concat(_descriptor_3.toValue(value_0.authorityRootVersion).concat(_descriptor_3.toValue(value_0.authorityRootSequence).concat(_descriptor_8.toValue(value_0.expectedLifecycleStatus).concat(_descriptor_8.toValue(value_0.nextLifecycleStatus).concat(_descriptor_3.toValue(value_0.effectiveAt).concat(_descriptor_0.toValue(value_0.reasonHash).concat(_descriptor_0.toValue(value_0.commandNonce))))))))))));
  }
}

const _descriptor_29 = new _ProofModuleLifecycleCommand_0();

class _ProofModuleProposal_0 {
  alignment() {
    return _descriptor_4.alignment().concat(_descriptor_21.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_3.alignment().concat(_descriptor_3.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_3.alignment())))))))))))));
  }
  fromValue(value_0) {
    return {
      proposalVersion: _descriptor_4.fromValue(value_0),
      identity: _descriptor_21.fromValue(value_0),
      governanceNamespaceHash: _descriptor_0.fromValue(value_0),
      governancePolicyHash: _descriptor_0.fromValue(value_0),
      authorityRootVersion: _descriptor_3.fromValue(value_0),
      authorityRootSequence: _descriptor_3.fromValue(value_0),
      implementationReferenceHash: _descriptor_0.fromValue(value_0),
      sourceHash: _descriptor_0.fromValue(value_0),
      inputSchemaHash: _descriptor_0.fromValue(value_0),
      configurationSchemaHash: _descriptor_0.fromValue(value_0),
      receiptSchemaHash: _descriptor_0.fromValue(value_0),
      compilerVersionHash: _descriptor_0.fromValue(value_0),
      compatibilityPolicyHash: _descriptor_0.fromValue(value_0),
      proposedAt: _descriptor_3.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_4.toValue(value_0.proposalVersion).concat(_descriptor_21.toValue(value_0.identity).concat(_descriptor_0.toValue(value_0.governanceNamespaceHash).concat(_descriptor_0.toValue(value_0.governancePolicyHash).concat(_descriptor_3.toValue(value_0.authorityRootVersion).concat(_descriptor_3.toValue(value_0.authorityRootSequence).concat(_descriptor_0.toValue(value_0.implementationReferenceHash).concat(_descriptor_0.toValue(value_0.sourceHash).concat(_descriptor_0.toValue(value_0.inputSchemaHash).concat(_descriptor_0.toValue(value_0.configurationSchemaHash).concat(_descriptor_0.toValue(value_0.receiptSchemaHash).concat(_descriptor_0.toValue(value_0.compilerVersionHash).concat(_descriptor_0.toValue(value_0.compatibilityPolicyHash).concat(_descriptor_3.toValue(value_0.proposedAt))))))))))))));
  }
}

const _descriptor_30 = new _ProofModuleProposal_0();

class _ProofModuleReviewRecord_0 {
  alignment() {
    return _descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_3.alignment())));
  }
  fromValue(value_0) {
    return {
      moduleKey: _descriptor_0.fromValue(value_0),
      reviewerAuthorityCommitment: _descriptor_0.fromValue(value_0),
      reviewCommitment: _descriptor_0.fromValue(value_0),
      reviewedAt: _descriptor_3.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_0.toValue(value_0.moduleKey).concat(_descriptor_0.toValue(value_0.reviewerAuthorityCommitment).concat(_descriptor_0.toValue(value_0.reviewCommitment).concat(_descriptor_3.toValue(value_0.reviewedAt))));
  }
}

const _descriptor_31 = new _ProofModuleReviewRecord_0();

class _ProofModuleReview_0 {
  alignment() {
    return _descriptor_4.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_3.alignment().concat(_descriptor_3.alignment().concat(_descriptor_3.alignment().concat(_descriptor_0.alignment()))))))));
  }
  fromValue(value_0) {
    return {
      reviewVersion: _descriptor_4.fromValue(value_0),
      moduleKey: _descriptor_0.fromValue(value_0),
      proposalCommitment: _descriptor_0.fromValue(value_0),
      governanceNamespaceHash: _descriptor_0.fromValue(value_0),
      governancePolicyHash: _descriptor_0.fromValue(value_0),
      authorityRootVersion: _descriptor_3.fromValue(value_0),
      authorityRootSequence: _descriptor_3.fromValue(value_0),
      reviewedAt: _descriptor_3.fromValue(value_0),
      reviewNonce: _descriptor_0.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_4.toValue(value_0.reviewVersion).concat(_descriptor_0.toValue(value_0.moduleKey).concat(_descriptor_0.toValue(value_0.proposalCommitment).concat(_descriptor_0.toValue(value_0.governanceNamespaceHash).concat(_descriptor_0.toValue(value_0.governancePolicyHash).concat(_descriptor_3.toValue(value_0.authorityRootVersion).concat(_descriptor_3.toValue(value_0.authorityRootSequence).concat(_descriptor_3.toValue(value_0.reviewedAt).concat(_descriptor_0.toValue(value_0.reviewNonce)))))))));
  }
}

const _descriptor_32 = new _ProofModuleReview_0();

class _AuthorityRootUpdateApprovalRecord_0 {
  alignment() {
    return _descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_3.alignment()));
  }
  fromValue(value_0) {
    return {
      updateCommitment: _descriptor_0.fromValue(value_0),
      approverAuthorityCommitment: _descriptor_0.fromValue(value_0),
      approvedAt: _descriptor_3.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_0.toValue(value_0.updateCommitment).concat(_descriptor_0.toValue(value_0.approverAuthorityCommitment).concat(_descriptor_3.toValue(value_0.approvedAt)));
  }
}

const _descriptor_33 = new _AuthorityRootUpdateApprovalRecord_0();

class _AuthorityRootUpdateProgress_0 {
  alignment() {
    return _descriptor_0.alignment().concat(_descriptor_4.alignment().concat(_descriptor_4.alignment().concat(_descriptor_0.alignment())));
  }
  fromValue(value_0) {
    return {
      updateCommitment: _descriptor_0.fromValue(value_0),
      approvalThreshold: _descriptor_4.fromValue(value_0),
      approvalCount: _descriptor_4.fromValue(value_0),
      approvalEvidenceAccumulator: _descriptor_0.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_0.toValue(value_0.updateCommitment).concat(_descriptor_4.toValue(value_0.approvalThreshold).concat(_descriptor_4.toValue(value_0.approvalCount).concat(_descriptor_0.toValue(value_0.approvalEvidenceAccumulator))));
  }
}

const _descriptor_34 = new _AuthorityRootUpdateProgress_0();

class _AuthorityRootUpdateCommand_0 {
  alignment() {
    return _descriptor_4.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_2.alignment().concat(_descriptor_3.alignment().concat(_descriptor_3.alignment().concat(_descriptor_0.alignment().concat(_descriptor_2.alignment().concat(_descriptor_3.alignment().concat(_descriptor_3.alignment().concat(_descriptor_4.alignment().concat(_descriptor_4.alignment().concat(_descriptor_4.alignment().concat(_descriptor_3.alignment().concat(_descriptor_0.alignment()))))))))))))));
  }
  fromValue(value_0) {
    return {
      commandVersion: _descriptor_4.fromValue(value_0),
      namespaceHash: _descriptor_0.fromValue(value_0),
      currentGovernancePolicyHash: _descriptor_0.fromValue(value_0),
      currentRoot: _descriptor_2.fromValue(value_0),
      currentRootVersion: _descriptor_3.fromValue(value_0),
      currentRootSequence: _descriptor_3.fromValue(value_0),
      nextGovernancePolicyHash: _descriptor_0.fromValue(value_0),
      nextRoot: _descriptor_2.fromValue(value_0),
      nextRootVersion: _descriptor_3.fromValue(value_0),
      nextRootSequence: _descriptor_3.fromValue(value_0),
      nextModuleReviewThreshold: _descriptor_4.fromValue(value_0),
      nextModuleApprovalThreshold: _descriptor_4.fromValue(value_0),
      nextAuthorityRootUpdateThreshold: _descriptor_4.fromValue(value_0),
      effectiveAt: _descriptor_3.fromValue(value_0),
      updateNonce: _descriptor_0.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_4.toValue(value_0.commandVersion).concat(_descriptor_0.toValue(value_0.namespaceHash).concat(_descriptor_0.toValue(value_0.currentGovernancePolicyHash).concat(_descriptor_2.toValue(value_0.currentRoot).concat(_descriptor_3.toValue(value_0.currentRootVersion).concat(_descriptor_3.toValue(value_0.currentRootSequence).concat(_descriptor_0.toValue(value_0.nextGovernancePolicyHash).concat(_descriptor_2.toValue(value_0.nextRoot).concat(_descriptor_3.toValue(value_0.nextRootVersion).concat(_descriptor_3.toValue(value_0.nextRootSequence).concat(_descriptor_4.toValue(value_0.nextModuleReviewThreshold).concat(_descriptor_4.toValue(value_0.nextModuleApprovalThreshold).concat(_descriptor_4.toValue(value_0.nextAuthorityRootUpdateThreshold).concat(_descriptor_3.toValue(value_0.effectiveAt).concat(_descriptor_0.toValue(value_0.updateNonce)))))))))))))));
  }
}

const _descriptor_35 = new _AuthorityRootUpdateCommand_0();

class _ContractAddress_0 {
  alignment() {
    return _descriptor_0.alignment();
  }
  fromValue(value_0) {
    return {
      bytes: _descriptor_0.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_0.toValue(value_0.bytes);
  }
}

const _descriptor_36 = new _ContractAddress_0();

class _RuntimeScopeRoots_0 {
  alignment() {
    return _descriptor_2.alignment().concat(_descriptor_2.alignment().concat(_descriptor_2.alignment().concat(_descriptor_2.alignment().concat(_descriptor_2.alignment().concat(_descriptor_2.alignment().concat(_descriptor_2.alignment()))))));
  }
  fromValue(value_0) {
    return {
      actionsRoot: _descriptor_2.fromValue(value_0),
      resourceSelectorsRoot: _descriptor_2.fromValue(value_0),
      resourcesRoot: _descriptor_2.fromValue(value_0),
      purposesRoot: _descriptor_2.fromValue(value_0),
      recipientKindsRoot: _descriptor_2.fromValue(value_0),
      recipientsRoot: _descriptor_2.fromValue(value_0),
      disclosurePolicyIdsRoot: _descriptor_2.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_2.toValue(value_0.actionsRoot).concat(_descriptor_2.toValue(value_0.resourceSelectorsRoot).concat(_descriptor_2.toValue(value_0.resourcesRoot).concat(_descriptor_2.toValue(value_0.purposesRoot).concat(_descriptor_2.toValue(value_0.recipientKindsRoot).concat(_descriptor_2.toValue(value_0.recipientsRoot).concat(_descriptor_2.toValue(value_0.disclosurePolicyIdsRoot)))))));
  }
}

const _descriptor_37 = new _RuntimeScopeRoots_0();

class _RuntimeSessionCredential_0 {
  alignment() {
    return _descriptor_4.alignment().concat(_descriptor_17.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_37.alignment().concat(_descriptor_10.alignment().concat(_descriptor_3.alignment().concat(_descriptor_3.alignment().concat(_descriptor_3.alignment().concat(_descriptor_3.alignment())))))))))))));
  }
  fromValue(value_0) {
    return {
      credentialVersion: _descriptor_4.fromValue(value_0),
      target: _descriptor_17.fromValue(value_0),
      instanceCommitment: _descriptor_0.fromValue(value_0),
      contextHash: _descriptor_0.fromValue(value_0),
      sessionIdHash: _descriptor_0.fromValue(value_0),
      m5SessionCommitment: _descriptor_0.fromValue(value_0),
      subjectAccountCredentialCommitment: _descriptor_0.fromValue(value_0),
      capabilityCredentialCommitment: _descriptor_0.fromValue(value_0),
      scopeRoots: _descriptor_37.fromValue(value_0),
      runtimePublicKey: _descriptor_10.fromValue(value_0),
      notBefore: _descriptor_3.fromValue(value_0),
      expiresAt: _descriptor_3.fromValue(value_0),
      statusIndex: _descriptor_3.fromValue(value_0),
      issuedAt: _descriptor_3.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_4.toValue(value_0.credentialVersion).concat(_descriptor_17.toValue(value_0.target).concat(_descriptor_0.toValue(value_0.instanceCommitment).concat(_descriptor_0.toValue(value_0.contextHash).concat(_descriptor_0.toValue(value_0.sessionIdHash).concat(_descriptor_0.toValue(value_0.m5SessionCommitment).concat(_descriptor_0.toValue(value_0.subjectAccountCredentialCommitment).concat(_descriptor_0.toValue(value_0.capabilityCredentialCommitment).concat(_descriptor_37.toValue(value_0.scopeRoots).concat(_descriptor_10.toValue(value_0.runtimePublicKey).concat(_descriptor_3.toValue(value_0.notBefore).concat(_descriptor_3.toValue(value_0.expiresAt).concat(_descriptor_3.toValue(value_0.statusIndex).concat(_descriptor_3.toValue(value_0.issuedAt))))))))))))));
  }
}

const _descriptor_38 = new _RuntimeSessionCredential_0();

class _RuntimeActionIntent_0 {
  alignment() {
    return _descriptor_4.alignment().concat(_descriptor_17.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_3.alignment().concat(_descriptor_0.alignment()))))))))))))));
  }
  fromValue(value_0) {
    return {
      intentVersion: _descriptor_4.fromValue(value_0),
      target: _descriptor_17.fromValue(value_0),
      instanceCommitment: _descriptor_0.fromValue(value_0),
      contextHash: _descriptor_0.fromValue(value_0),
      sessionCredentialCommitment: _descriptor_0.fromValue(value_0),
      actionIdHash: _descriptor_0.fromValue(value_0),
      resourceSelectorHash: _descriptor_0.fromValue(value_0),
      resourceHash: _descriptor_0.fromValue(value_0),
      purposeHash: _descriptor_0.fromValue(value_0),
      recipientKindHash: _descriptor_0.fromValue(value_0),
      recipientHash: _descriptor_0.fromValue(value_0),
      disclosurePolicyIdHash: _descriptor_0.fromValue(value_0),
      m5IntentCommitment: _descriptor_0.fromValue(value_0),
      issuedAt: _descriptor_3.fromValue(value_0),
      nonceHash: _descriptor_0.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_4.toValue(value_0.intentVersion).concat(_descriptor_17.toValue(value_0.target).concat(_descriptor_0.toValue(value_0.instanceCommitment).concat(_descriptor_0.toValue(value_0.contextHash).concat(_descriptor_0.toValue(value_0.sessionCredentialCommitment).concat(_descriptor_0.toValue(value_0.actionIdHash).concat(_descriptor_0.toValue(value_0.resourceSelectorHash).concat(_descriptor_0.toValue(value_0.resourceHash).concat(_descriptor_0.toValue(value_0.purposeHash).concat(_descriptor_0.toValue(value_0.recipientKindHash).concat(_descriptor_0.toValue(value_0.recipientHash).concat(_descriptor_0.toValue(value_0.disclosurePolicyIdHash).concat(_descriptor_0.toValue(value_0.m5IntentCommitment).concat(_descriptor_3.toValue(value_0.issuedAt).concat(_descriptor_0.toValue(value_0.nonceHash)))))))))))))));
  }
}

const _descriptor_39 = new _RuntimeActionIntent_0();

class _RuntimeCapabilityCredential_0 {
  alignment() {
    return _descriptor_4.alignment().concat(_descriptor_17.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_37.alignment().concat(_descriptor_3.alignment().concat(_descriptor_3.alignment().concat(_descriptor_4.alignment().concat(_descriptor_4.alignment().concat(_descriptor_3.alignment().concat(_descriptor_3.alignment())))))))))))))));
  }
  fromValue(value_0) {
    return {
      credentialVersion: _descriptor_4.fromValue(value_0),
      target: _descriptor_17.fromValue(value_0),
      instanceCommitment: _descriptor_0.fromValue(value_0),
      contextHash: _descriptor_0.fromValue(value_0),
      grantIdHash: _descriptor_0.fromValue(value_0),
      m5GrantCommitment: _descriptor_0.fromValue(value_0),
      subjectAccountCredentialCommitment: _descriptor_0.fromValue(value_0),
      parentCapabilityCredentialCommitment: _descriptor_0.fromValue(value_0),
      issuerAccountCredentialCommitment: _descriptor_0.fromValue(value_0),
      scopeRoots: _descriptor_37.fromValue(value_0),
      notBefore: _descriptor_3.fromValue(value_0),
      expiresAt: _descriptor_3.fromValue(value_0),
      delegationDepth: _descriptor_4.fromValue(value_0),
      maxDelegationDepth: _descriptor_4.fromValue(value_0),
      statusIndex: _descriptor_3.fromValue(value_0),
      issuedAt: _descriptor_3.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_4.toValue(value_0.credentialVersion).concat(_descriptor_17.toValue(value_0.target).concat(_descriptor_0.toValue(value_0.instanceCommitment).concat(_descriptor_0.toValue(value_0.contextHash).concat(_descriptor_0.toValue(value_0.grantIdHash).concat(_descriptor_0.toValue(value_0.m5GrantCommitment).concat(_descriptor_0.toValue(value_0.subjectAccountCredentialCommitment).concat(_descriptor_0.toValue(value_0.parentCapabilityCredentialCommitment).concat(_descriptor_0.toValue(value_0.issuerAccountCredentialCommitment).concat(_descriptor_37.toValue(value_0.scopeRoots).concat(_descriptor_3.toValue(value_0.notBefore).concat(_descriptor_3.toValue(value_0.expiresAt).concat(_descriptor_4.toValue(value_0.delegationDepth).concat(_descriptor_4.toValue(value_0.maxDelegationDepth).concat(_descriptor_3.toValue(value_0.statusIndex).concat(_descriptor_3.toValue(value_0.issuedAt))))))))))))))));
  }
}

const _descriptor_40 = new _RuntimeCapabilityCredential_0();

const _descriptor_41 = new __compactRuntime.CompactTypeVector(1, _descriptor_1);

const _descriptor_42 = new __compactRuntime.CompactTypeVector(1, _descriptor_13);

class _MerkleTreePath_1 {
  alignment() {
    return _descriptor_0.alignment().concat(_descriptor_42.alignment());
  }
  fromValue(value_0) {
    return {
      leaf: _descriptor_0.fromValue(value_0),
      path: _descriptor_42.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_0.toValue(value_0.leaf).concat(_descriptor_42.toValue(value_0.path));
  }
}

const _descriptor_43 = new _MerkleTreePath_1();

class _MerkleTreePath_2 {
  alignment() {
    return _descriptor_2.alignment().concat(_descriptor_42.alignment());
  }
  fromValue(value_0) {
    return {
      leaf: _descriptor_2.fromValue(value_0),
      path: _descriptor_42.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_2.toValue(value_0.leaf).concat(_descriptor_42.toValue(value_0.path));
  }
}

const _descriptor_44 = new _MerkleTreePath_2();

class _RuntimeCredentialStatusLeaf_0 {
  alignment() {
    return _descriptor_4.alignment().concat(_descriptor_0.alignment().concat(_descriptor_4.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_3.alignment().concat(_descriptor_8.alignment()))))));
  }
  fromValue(value_0) {
    return {
      leafVersion: _descriptor_4.fromValue(value_0),
      namespaceHash: _descriptor_0.fromValue(value_0),
      credentialKind: _descriptor_4.fromValue(value_0),
      credentialCommitment: _descriptor_0.fromValue(value_0),
      revocationAuthorityAccountCredentialCommitment: _descriptor_0.fromValue(value_0),
      statusIndex: _descriptor_3.fromValue(value_0),
      status: _descriptor_8.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_4.toValue(value_0.leafVersion).concat(_descriptor_0.toValue(value_0.namespaceHash).concat(_descriptor_4.toValue(value_0.credentialKind).concat(_descriptor_0.toValue(value_0.credentialCommitment).concat(_descriptor_0.toValue(value_0.revocationAuthorityAccountCredentialCommitment).concat(_descriptor_3.toValue(value_0.statusIndex).concat(_descriptor_8.toValue(value_0.status)))))));
  }
}

const _descriptor_45 = new _RuntimeCredentialStatusLeaf_0();

const _descriptor_46 = new __compactRuntime.CompactTypeUnsignedInteger(127n, 1);

const _descriptor_47 = new __compactRuntime.CompactTypeUnsignedInteger(452312848583266388373324160190187140051835877600158453279131187530910662655n, 31);

class _tuple_0 {
  alignment() {
    return _descriptor_46.alignment().concat(_descriptor_47.alignment());
  }
  fromValue(value_0) {
    return [
      _descriptor_46.fromValue(value_0),
      _descriptor_47.fromValue(value_0)
    ]
  }
  toValue(value_0) {
    return _descriptor_46.toValue(value_0[0]).concat(_descriptor_47.toValue(value_0[1]));
  }
}

const _descriptor_48 = new _tuple_0();

const _descriptor_49 = new __compactRuntime.CompactTypeBytes(6);

class _LeafPreimage_0 {
  alignment() {
    return _descriptor_49.alignment().concat(_descriptor_0.alignment());
  }
  fromValue(value_0) {
    return {
      domain_sep: _descriptor_49.fromValue(value_0),
      data: _descriptor_0.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_49.toValue(value_0.domain_sep).concat(_descriptor_0.toValue(value_0.data));
  }
}

const _descriptor_50 = new _LeafPreimage_0();

class _BindingAccumulatorStep_0 {
  alignment() {
    return _descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_19.alignment()));
  }
  fromValue(value_0) {
    return {
      previous: _descriptor_0.fromValue(value_0),
      bindingCommitment: _descriptor_0.fromValue(value_0),
      actionIndex: _descriptor_19.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_0.toValue(value_0.previous).concat(_descriptor_0.toValue(value_0.bindingCommitment).concat(_descriptor_19.toValue(value_0.actionIndex)));
  }
}

const _descriptor_51 = new _BindingAccumulatorStep_0();

class _ProofModuleApprovalAccumulatorStep_0 {
  alignment() {
    return _descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment()));
  }
  fromValue(value_0) {
    return {
      previous: _descriptor_0.fromValue(value_0),
      approvalCommitment: _descriptor_0.fromValue(value_0),
      approverAuthorityCommitment: _descriptor_0.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_0.toValue(value_0.previous).concat(_descriptor_0.toValue(value_0.approvalCommitment).concat(_descriptor_0.toValue(value_0.approverAuthorityCommitment)));
  }
}

const _descriptor_52 = new _ProofModuleApprovalAccumulatorStep_0();

class _ProofModuleApprovalKey_0 {
  alignment() {
    return _descriptor_0.alignment().concat(_descriptor_0.alignment());
  }
  fromValue(value_0) {
    return {
      moduleKey: _descriptor_0.fromValue(value_0),
      approverAuthorityCommitment: _descriptor_0.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_0.toValue(value_0.moduleKey).concat(_descriptor_0.toValue(value_0.approverAuthorityCommitment));
  }
}

const _descriptor_53 = new _ProofModuleApprovalKey_0();

class _ProofModuleReviewKey_0 {
  alignment() {
    return _descriptor_0.alignment().concat(_descriptor_0.alignment());
  }
  fromValue(value_0) {
    return {
      moduleKey: _descriptor_0.fromValue(value_0),
      reviewerAuthorityCommitment: _descriptor_0.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_0.toValue(value_0.moduleKey).concat(_descriptor_0.toValue(value_0.reviewerAuthorityCommitment));
  }
}

const _descriptor_54 = new _ProofModuleReviewKey_0();

class _ProofModuleReviewAccumulatorStep_0 {
  alignment() {
    return _descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment()));
  }
  fromValue(value_0) {
    return {
      previous: _descriptor_0.fromValue(value_0),
      reviewCommitment: _descriptor_0.fromValue(value_0),
      reviewerAuthorityCommitment: _descriptor_0.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_0.toValue(value_0.previous).concat(_descriptor_0.toValue(value_0.reviewCommitment).concat(_descriptor_0.toValue(value_0.reviewerAuthorityCommitment)));
  }
}

const _descriptor_55 = new _ProofModuleReviewAccumulatorStep_0();

class _AuthorityRootUpdateApprovalKey_0 {
  alignment() {
    return _descriptor_0.alignment().concat(_descriptor_0.alignment());
  }
  fromValue(value_0) {
    return {
      updateCommitment: _descriptor_0.fromValue(value_0),
      approverAuthorityCommitment: _descriptor_0.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_0.toValue(value_0.updateCommitment).concat(_descriptor_0.toValue(value_0.approverAuthorityCommitment));
  }
}

const _descriptor_56 = new _AuthorityRootUpdateApprovalKey_0();

class _AuthorityRootUpdateApprovalStep_0 {
  alignment() {
    return _descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment()));
  }
  fromValue(value_0) {
    return {
      previous: _descriptor_0.fromValue(value_0),
      updateCommitment: _descriptor_0.fromValue(value_0),
      approverAuthorityCommitment: _descriptor_0.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_0.toValue(value_0.previous).concat(_descriptor_0.toValue(value_0.updateCommitment).concat(_descriptor_0.toValue(value_0.approverAuthorityCommitment)));
  }
}

const _descriptor_57 = new _AuthorityRootUpdateApprovalStep_0();

class _LeafPreimage_1 {
  alignment() {
    return _descriptor_49.alignment().concat(_descriptor_2.alignment());
  }
  fromValue(value_0) {
    return {
      domain_sep: _descriptor_49.fromValue(value_0),
      data: _descriptor_2.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_49.toValue(value_0.domain_sep).concat(_descriptor_2.toValue(value_0.data));
  }
}

const _descriptor_58 = new _LeafPreimage_1();

class _SchnorrHashInput_0 {
  alignment() {
    return _descriptor_1.alignment().concat(_descriptor_1.alignment().concat(_descriptor_1.alignment().concat(_descriptor_1.alignment().concat(_descriptor_41.alignment()))));
  }
  fromValue(value_0) {
    return {
      ann_x: _descriptor_1.fromValue(value_0),
      ann_y: _descriptor_1.fromValue(value_0),
      pk_x: _descriptor_1.fromValue(value_0),
      pk_y: _descriptor_1.fromValue(value_0),
      msg: _descriptor_41.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_1.toValue(value_0.ann_x).concat(_descriptor_1.toValue(value_0.ann_y).concat(_descriptor_1.toValue(value_0.pk_x).concat(_descriptor_1.toValue(value_0.pk_y).concat(_descriptor_41.toValue(value_0.msg)))));
  }
}

const _descriptor_59 = new _SchnorrHashInput_0();

const _descriptor_60 = new __compactRuntime.CompactTypeVector(2, _descriptor_1);

class _Either_0 {
  alignment() {
    return _descriptor_6.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment()));
  }
  fromValue(value_0) {
    return {
      is_left: _descriptor_6.fromValue(value_0),
      left: _descriptor_0.fromValue(value_0),
      right: _descriptor_0.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_6.toValue(value_0.is_left).concat(_descriptor_0.toValue(value_0.left).concat(_descriptor_0.toValue(value_0.right)));
  }
}

const _descriptor_61 = new _Either_0();

const _descriptor_62 = new __compactRuntime.CompactTypeUnsignedInteger(340282366920938463463374607431768211455n, 16);

export class Contract {
  witnesses;
  constructor(...args_0) {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`Contract constructor: expected 1 argument, received ${args_0.length}`);
    }
    const witnesses_0 = args_0[0];
    if (typeof(witnesses_0) !== 'object') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor is not an object');
    }
    if (typeof(witnesses_0.getSchnorrReduction) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named getSchnorrReduction');
    }
    this.witnesses = witnesses_0;
    this.circuits = {
      activationAdmissionMessage(context, ...args_1) {
        return { result: pureCircuits.activationAdmissionMessage(...args_1), context };
      },
      activationAdmissionEnvelopeCommitment(context, ...args_1) {
        return { result: pureCircuits.activationAdmissionEnvelopeCommitment(...args_1), context };
      },
      governanceActivatorLeafCommitment(context, ...args_1) {
        return { result: pureCircuits.governanceActivatorLeafCommitment(...args_1), context };
      },
      authorityRootUpdateCommandCommitment(context, ...args_1) {
        return { result: pureCircuits.authorityRootUpdateCommandCommitment(...args_1), context };
      },
      authorityRootUpdateCommandMessage(context, ...args_1) {
        return { result: pureCircuits.authorityRootUpdateCommandMessage(...args_1), context };
      },
      templateLifecycleCommandMessage(context, ...args_1) {
        return { result: pureCircuits.templateLifecycleCommandMessage(...args_1), context };
      },
      runtimeAccountCredentialCommitment(context, ...args_1) {
        return { result: pureCircuits.runtimeAccountCredentialCommitment(...args_1), context };
      },
      runtimeScopeValueCommitment(context, ...args_1) {
        return { result: pureCircuits.runtimeScopeValueCommitment(...args_1), context };
      },
      runtimeCredentialStatusLeafCommitment(context, ...args_1) {
        return { result: pureCircuits.runtimeCredentialStatusLeafCommitment(...args_1), context };
      },
      runtimeCredentialStatusPathRoot(context, ...args_1) {
        return { result: pureCircuits.runtimeCredentialStatusPathRoot(...args_1), context };
      },
      runtimeCredentialStatusLeafParent(context, ...args_1) {
        return { result: pureCircuits.runtimeCredentialStatusLeafParent(...args_1), context };
      },
      runtimeCredentialStatusNodeParent(context, ...args_1) {
        return { result: pureCircuits.runtimeCredentialStatusNodeParent(...args_1), context };
      },
      runtimeCredentialStatusCommandMessage(context, ...args_1) {
        return { result: pureCircuits.runtimeCredentialStatusCommandMessage(...args_1), context };
      },
      runtimeCapabilityCredentialCommitment(context, ...args_1) {
        return { result: pureCircuits.runtimeCapabilityCredentialCommitment(...args_1), context };
      },
      runtimeSessionCredentialCommitment(context, ...args_1) {
        return { result: pureCircuits.runtimeSessionCredentialCommitment(...args_1), context };
      },
      runtimeActionIntentCommitment(context, ...args_1) {
        return { result: pureCircuits.runtimeActionIntentCommitment(...args_1), context };
      },
      runtimeAccountCredentialMessage(context, ...args_1) {
        return { result: pureCircuits.runtimeAccountCredentialMessage(...args_1), context };
      },
      runtimeCapabilityCredentialMessage(context, ...args_1) {
        return { result: pureCircuits.runtimeCapabilityCredentialMessage(...args_1), context };
      },
      runtimeSessionCredentialMessage(context, ...args_1) {
        return { result: pureCircuits.runtimeSessionCredentialMessage(...args_1), context };
      },
      runtimeActionIntentMessage(context, ...args_1) {
        return { result: pureCircuits.runtimeActionIntentMessage(...args_1), context };
      },
      activeTemplateRecordCommitment(context, ...args_1) {
        return { result: pureCircuits.activeTemplateRecordCommitment(...args_1), context };
      },
      proofModuleBindingCommitment(context, ...args_1) {
        return { result: pureCircuits.proofModuleBindingCommitment(...args_1), context };
      },
      proofModuleProposalCommitment(context, ...args_1) {
        return { result: pureCircuits.proofModuleProposalCommitment(...args_1), context };
      },
      proofModuleRecordCommitment(context, ...args_1) {
        return { result: pureCircuits.proofModuleRecordCommitment(...args_1), context };
      },
      proofModuleReviewCommitment(context, ...args_1) {
        return { result: pureCircuits.proofModuleReviewCommitment(...args_1), context };
      },
      proofModuleReviewMessage(context, ...args_1) {
        return { result: pureCircuits.proofModuleReviewMessage(...args_1), context };
      },
      proofModuleLifecycleCommandMessage(context, ...args_1) {
        return { result: pureCircuits.proofModuleLifecycleCommandMessage(...args_1), context };
      },
      proofModuleReviewSignatureChallenge(context, ...args_1) {
        return { result: pureCircuits.proofModuleReviewSignatureChallenge(...args_1), context };
      },
      proofModuleLifecycleSignatureChallenge(context, ...args_1) {
        return { result: pureCircuits.proofModuleLifecycleSignatureChallenge(...args_1), context };
      },
      governanceActivationSignatureChallenge(context, ...args_1) {
        return { result: pureCircuits.governanceActivationSignatureChallenge(...args_1), context };
      },
      authorityRootUpdateSignatureChallenge(context, ...args_1) {
        return { result: pureCircuits.authorityRootUpdateSignatureChallenge(...args_1), context };
      },
      templateLifecycleSignatureChallenge(context, ...args_1) {
        return { result: pureCircuits.templateLifecycleSignatureChallenge(...args_1), context };
      },
      runtimeAccountCredentialSignatureChallenge(context, ...args_1) {
        return { result: pureCircuits.runtimeAccountCredentialSignatureChallenge(...args_1), context };
      },
      runtimeCapabilityCredentialSignatureChallenge(context, ...args_1) {
        return { result: pureCircuits.runtimeCapabilityCredentialSignatureChallenge(...args_1), context };
      },
      runtimeSessionCredentialSignatureChallenge(context, ...args_1) {
        return { result: pureCircuits.runtimeSessionCredentialSignatureChallenge(...args_1), context };
      },
      runtimeActionIntentSignatureChallenge(context, ...args_1) {
        return { result: pureCircuits.runtimeActionIntentSignatureChallenge(...args_1), context };
      },
      runtimeCredentialStatusSignatureChallenge(context, ...args_1) {
        return { result: pureCircuits.runtimeCredentialStatusSignatureChallenge(...args_1), context };
      },
      verifyGovernanceActivationSignature: (...args_1) => {
        if (args_1.length !== 4) {
          throw new __compactRuntime.CompactError(`verifyGovernanceActivationSignature: expected 4 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const envelope_0 = args_1[1];
        const signature_0 = args_1[2];
        const publicKey_0 = args_1[3];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('verifyGovernanceActivationSignature',
                                     'argument 1 (as invoked from Typescript)',
                                     'permio-authorization.compact line 777 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(typeof(envelope_0) === 'object' && typeof(envelope_0.envelopeVersion) === 'bigint' && envelope_0.envelopeVersion >= 0n && envelope_0.envelopeVersion <= 65535n && envelope_0.namespaceHash.buffer instanceof ArrayBuffer && envelope_0.namespaceHash.BYTES_PER_ELEMENT === 1 && envelope_0.namespaceHash.length === 32 && envelope_0.templateIdHash.buffer instanceof ArrayBuffer && envelope_0.templateIdHash.BYTES_PER_ELEMENT === 1 && envelope_0.templateIdHash.length === 32 && typeof(envelope_0.semanticVersion) === 'object' && typeof(envelope_0.semanticVersion.major) === 'bigint' && envelope_0.semanticVersion.major >= 0n && envelope_0.semanticVersion.major <= 18446744073709551615n && typeof(envelope_0.semanticVersion.minor) === 'bigint' && envelope_0.semanticVersion.minor >= 0n && envelope_0.semanticVersion.minor <= 18446744073709551615n && typeof(envelope_0.semanticVersion.patch) === 'bigint' && envelope_0.semanticVersion.patch >= 0n && envelope_0.semanticVersion.patch <= 18446744073709551615n && envelope_0.templateContentHash.buffer instanceof ArrayBuffer && envelope_0.templateContentHash.BYTES_PER_ELEMENT === 1 && envelope_0.templateContentHash.length === 32 && envelope_0.governancePolicyHash.buffer instanceof ArrayBuffer && envelope_0.governancePolicyHash.BYTES_PER_ELEMENT === 1 && envelope_0.governancePolicyHash.length === 32 && envelope_0.proofModuleBindingsHash.buffer instanceof ArrayBuffer && envelope_0.proofModuleBindingsHash.BYTES_PER_ELEMENT === 1 && envelope_0.proofModuleBindingsHash.length === 32 && typeof(envelope_0.proofModuleBindingRoot) === 'object' && typeof(envelope_0.proofModuleBindingRoot.field) === 'bigint' && envelope_0.proofModuleBindingRoot.field >= 0 && envelope_0.proofModuleBindingRoot.field <= __compactRuntime.MAX_FIELD && typeof(envelope_0.proofModuleBindingCount) === 'bigint' && envelope_0.proofModuleBindingCount >= 0n && envelope_0.proofModuleBindingCount <= 4294967295n && typeof(envelope_0.proofModuleRegistrySequence) === 'bigint' && envelope_0.proofModuleRegistrySequence >= 0n && envelope_0.proofModuleRegistrySequence <= 18446744073709551615n && envelope_0.m4ActivationRecordHash.buffer instanceof ArrayBuffer && envelope_0.m4ActivationRecordHash.BYTES_PER_ELEMENT === 1 && envelope_0.m4ActivationRecordHash.length === 32 && envelope_0.approvalEvidenceCommitment.buffer instanceof ArrayBuffer && envelope_0.approvalEvidenceCommitment.BYTES_PER_ELEMENT === 1 && envelope_0.approvalEvidenceCommitment.length === 32 && typeof(envelope_0.authorityRootVersion) === 'bigint' && envelope_0.authorityRootVersion >= 0n && envelope_0.authorityRootVersion <= 18446744073709551615n && typeof(envelope_0.authorityRootSequence) === 'bigint' && envelope_0.authorityRootSequence >= 0n && envelope_0.authorityRootSequence <= 18446744073709551615n && envelope_0.targetNetworkHash.buffer instanceof ArrayBuffer && envelope_0.targetNetworkHash.BYTES_PER_ELEMENT === 1 && envelope_0.targetNetworkHash.length === 32 && envelope_0.targetContractIdentity.buffer instanceof ArrayBuffer && envelope_0.targetContractIdentity.BYTES_PER_ELEMENT === 1 && envelope_0.targetContractIdentity.length === 32 && typeof(envelope_0.registryProtocolVersion) === 'bigint' && envelope_0.registryProtocolVersion >= 0n && envelope_0.registryProtocolVersion <= 65535n && envelope_0.admissionNonce.buffer instanceof ArrayBuffer && envelope_0.admissionNonce.BYTES_PER_ELEMENT === 1 && envelope_0.admissionNonce.length === 32 && typeof(envelope_0.activatedAt) === 'bigint' && envelope_0.activatedAt >= 0n && envelope_0.activatedAt <= 18446744073709551615n && typeof(envelope_0.stagingExpiresAt) === 'bigint' && envelope_0.stagingExpiresAt >= 0n && envelope_0.stagingExpiresAt <= 18446744073709551615n)) {
          __compactRuntime.typeError('verifyGovernanceActivationSignature',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'permio-authorization.compact line 777 char 1',
                                     'struct ActivationAdmissionEnvelope<envelopeVersion: Uint<0..65536>, namespaceHash: Bytes<32>, templateIdHash: Bytes<32>, semanticVersion: struct SemanticVersion<major: Uint<0..18446744073709551616>, minor: Uint<0..18446744073709551616>, patch: Uint<0..18446744073709551616>>, templateContentHash: Bytes<32>, governancePolicyHash: Bytes<32>, proofModuleBindingsHash: Bytes<32>, proofModuleBindingRoot: struct MerkleTreeDigest<field: Field>, proofModuleBindingCount: Uint<0..4294967296>, proofModuleRegistrySequence: Uint<0..18446744073709551616>, m4ActivationRecordHash: Bytes<32>, approvalEvidenceCommitment: Bytes<32>, authorityRootVersion: Uint<0..18446744073709551616>, authorityRootSequence: Uint<0..18446744073709551616>, targetNetworkHash: Bytes<32>, targetContractIdentity: Bytes<32>, registryProtocolVersion: Uint<0..65536>, admissionNonce: Bytes<32>, activatedAt: Uint<0..18446744073709551616>, stagingExpiresAt: Uint<0..18446744073709551616>>',
                                     envelope_0)
        }
        if (!(typeof(signature_0) === 'object' && true && typeof(signature_0.response) === 'bigint' && signature_0.response >= 0 && signature_0.response <= __compactRuntime.MAX_FIELD)) {
          __compactRuntime.typeError('verifyGovernanceActivationSignature',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'permio-authorization.compact line 777 char 1',
                                     'struct SchnorrSignature<announcement: Opaque<"JubjubPoint">, response: Field>',
                                     signature_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_25.toValue(envelope_0).concat(_descriptor_11.toValue(signature_0).concat(_descriptor_10.toValue(publicKey_0))),
            alignment: _descriptor_25.alignment().concat(_descriptor_11.alignment().concat(_descriptor_10.alignment()))
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._verifyGovernanceActivationSignature_0(context,
                                                                     partialProofData,
                                                                     envelope_0,
                                                                     signature_0,
                                                                     publicKey_0);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      proofModuleRegistryKeyFromIdentity(context, ...args_1) {
        return { result: pureCircuits.proofModuleRegistryKeyFromIdentity(...args_1), context };
      },
      submitAuthorityRootApproval: (...args_1) => {
        if (args_1.length !== 5) {
          throw new __compactRuntime.CompactError(`submitAuthorityRootApproval: expected 5 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const command_0 = args_1[1];
        const signature_0 = args_1[2];
        const governor_0 = args_1[3];
        const authorityPath_0 = args_1[4];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('submitAuthorityRootApproval',
                                     'argument 1 (as invoked from Typescript)',
                                     'permio-authorization.compact line 1050 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(typeof(command_0) === 'object' && typeof(command_0.commandVersion) === 'bigint' && command_0.commandVersion >= 0n && command_0.commandVersion <= 65535n && command_0.namespaceHash.buffer instanceof ArrayBuffer && command_0.namespaceHash.BYTES_PER_ELEMENT === 1 && command_0.namespaceHash.length === 32 && command_0.currentGovernancePolicyHash.buffer instanceof ArrayBuffer && command_0.currentGovernancePolicyHash.BYTES_PER_ELEMENT === 1 && command_0.currentGovernancePolicyHash.length === 32 && typeof(command_0.currentRoot) === 'object' && typeof(command_0.currentRoot.field) === 'bigint' && command_0.currentRoot.field >= 0 && command_0.currentRoot.field <= __compactRuntime.MAX_FIELD && typeof(command_0.currentRootVersion) === 'bigint' && command_0.currentRootVersion >= 0n && command_0.currentRootVersion <= 18446744073709551615n && typeof(command_0.currentRootSequence) === 'bigint' && command_0.currentRootSequence >= 0n && command_0.currentRootSequence <= 18446744073709551615n && command_0.nextGovernancePolicyHash.buffer instanceof ArrayBuffer && command_0.nextGovernancePolicyHash.BYTES_PER_ELEMENT === 1 && command_0.nextGovernancePolicyHash.length === 32 && typeof(command_0.nextRoot) === 'object' && typeof(command_0.nextRoot.field) === 'bigint' && command_0.nextRoot.field >= 0 && command_0.nextRoot.field <= __compactRuntime.MAX_FIELD && typeof(command_0.nextRootVersion) === 'bigint' && command_0.nextRootVersion >= 0n && command_0.nextRootVersion <= 18446744073709551615n && typeof(command_0.nextRootSequence) === 'bigint' && command_0.nextRootSequence >= 0n && command_0.nextRootSequence <= 18446744073709551615n && typeof(command_0.nextModuleReviewThreshold) === 'bigint' && command_0.nextModuleReviewThreshold >= 0n && command_0.nextModuleReviewThreshold <= 65535n && typeof(command_0.nextModuleApprovalThreshold) === 'bigint' && command_0.nextModuleApprovalThreshold >= 0n && command_0.nextModuleApprovalThreshold <= 65535n && typeof(command_0.nextAuthorityRootUpdateThreshold) === 'bigint' && command_0.nextAuthorityRootUpdateThreshold >= 0n && command_0.nextAuthorityRootUpdateThreshold <= 65535n && typeof(command_0.effectiveAt) === 'bigint' && command_0.effectiveAt >= 0n && command_0.effectiveAt <= 18446744073709551615n && command_0.updateNonce.buffer instanceof ArrayBuffer && command_0.updateNonce.BYTES_PER_ELEMENT === 1 && command_0.updateNonce.length === 32)) {
          __compactRuntime.typeError('submitAuthorityRootApproval',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'permio-authorization.compact line 1050 char 1',
                                     'struct AuthorityRootUpdateCommand<commandVersion: Uint<0..65536>, namespaceHash: Bytes<32>, currentGovernancePolicyHash: Bytes<32>, currentRoot: struct MerkleTreeDigest<field: Field>, currentRootVersion: Uint<0..18446744073709551616>, currentRootSequence: Uint<0..18446744073709551616>, nextGovernancePolicyHash: Bytes<32>, nextRoot: struct MerkleTreeDigest<field: Field>, nextRootVersion: Uint<0..18446744073709551616>, nextRootSequence: Uint<0..18446744073709551616>, nextModuleReviewThreshold: Uint<0..65536>, nextModuleApprovalThreshold: Uint<0..65536>, nextAuthorityRootUpdateThreshold: Uint<0..65536>, effectiveAt: Uint<0..18446744073709551616>, updateNonce: Bytes<32>>',
                                     command_0)
        }
        if (!(typeof(signature_0) === 'object' && true && typeof(signature_0.response) === 'bigint' && signature_0.response >= 0 && signature_0.response <= __compactRuntime.MAX_FIELD)) {
          __compactRuntime.typeError('submitAuthorityRootApproval',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'permio-authorization.compact line 1050 char 1',
                                     'struct SchnorrSignature<announcement: Opaque<"JubjubPoint">, response: Field>',
                                     signature_0)
        }
        if (!(typeof(governor_0) === 'object' && typeof(governor_0.leafVersion) === 'bigint' && governor_0.leafVersion >= 0n && governor_0.leafVersion <= 65535n && governor_0.namespaceHash.buffer instanceof ArrayBuffer && governor_0.namespaceHash.BYTES_PER_ELEMENT === 1 && governor_0.namespaceHash.length === 32 && governor_0.governancePolicyHash.buffer instanceof ArrayBuffer && governor_0.governancePolicyHash.BYTES_PER_ELEMENT === 1 && governor_0.governancePolicyHash.length === 32 && typeof(governor_0.authorityKind) === 'bigint' && governor_0.authorityKind >= 0n && governor_0.authorityKind <= 65535n && true && typeof(governor_0.validAfter) === 'bigint' && governor_0.validAfter >= 0n && governor_0.validAfter <= 18446744073709551615n && typeof(governor_0.validBefore) === 'bigint' && governor_0.validBefore >= 0n && governor_0.validBefore <= 18446744073709551615n)) {
          __compactRuntime.typeError('submitAuthorityRootApproval',
                                     'argument 3 (argument 4 as invoked from Typescript)',
                                     'permio-authorization.compact line 1050 char 1',
                                     'struct GovernanceActivatorLeaf<leafVersion: Uint<0..65536>, namespaceHash: Bytes<32>, governancePolicyHash: Bytes<32>, authorityKind: Uint<0..65536>, publicKey: Opaque<"JubjubPoint">, validAfter: Uint<0..18446744073709551616>, validBefore: Uint<0..18446744073709551616>>',
                                     governor_0)
        }
        if (!(typeof(authorityPath_0) === 'object' && authorityPath_0.leaf.buffer instanceof ArrayBuffer && authorityPath_0.leaf.BYTES_PER_ELEMENT === 1 && authorityPath_0.leaf.length === 32 && Array.isArray(authorityPath_0.path) && authorityPath_0.path.length === 20 && authorityPath_0.path.every((t) => typeof(t) === 'object' && typeof(t.sibling) === 'object' && typeof(t.sibling.field) === 'bigint' && t.sibling.field >= 0 && t.sibling.field <= __compactRuntime.MAX_FIELD && typeof(t.goes_left) === 'boolean'))) {
          __compactRuntime.typeError('submitAuthorityRootApproval',
                                     'argument 4 (argument 5 as invoked from Typescript)',
                                     'permio-authorization.compact line 1050 char 1',
                                     'struct MerkleTreePath<leaf: Bytes<32>, path: Vector<20, struct MerkleTreePathEntry<sibling: struct MerkleTreeDigest<field: Field>, goes_left: Boolean>>>',
                                     authorityPath_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_35.toValue(command_0).concat(_descriptor_11.toValue(signature_0).concat(_descriptor_12.toValue(governor_0).concat(_descriptor_15.toValue(authorityPath_0)))),
            alignment: _descriptor_35.alignment().concat(_descriptor_11.alignment().concat(_descriptor_12.alignment().concat(_descriptor_15.alignment())))
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._submitAuthorityRootApproval_0(context,
                                                             partialProofData,
                                                             command_0,
                                                             signature_0,
                                                             governor_0,
                                                             authorityPath_0);
        partialProofData.output = { value: _descriptor_4.toValue(result_0), alignment: _descriptor_4.alignment() };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      proposeProofModule: (...args_1) => {
        if (args_1.length !== 2) {
          throw new __compactRuntime.CompactError(`proposeProofModule: expected 2 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const proposal_0 = args_1[1];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('proposeProofModule',
                                     'argument 1 (as invoked from Typescript)',
                                     'permio-authorization.compact line 1148 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(typeof(proposal_0) === 'object' && typeof(proposal_0.proposalVersion) === 'bigint' && proposal_0.proposalVersion >= 0n && proposal_0.proposalVersion <= 65535n && typeof(proposal_0.identity) === 'object' && proposal_0.identity.moduleIdHash.buffer instanceof ArrayBuffer && proposal_0.identity.moduleIdHash.BYTES_PER_ELEMENT === 1 && proposal_0.identity.moduleIdHash.length === 32 && typeof(proposal_0.identity.moduleVersion) === 'object' && typeof(proposal_0.identity.moduleVersion.major) === 'bigint' && proposal_0.identity.moduleVersion.major >= 0n && proposal_0.identity.moduleVersion.major <= 18446744073709551615n && typeof(proposal_0.identity.moduleVersion.minor) === 'bigint' && proposal_0.identity.moduleVersion.minor >= 0n && proposal_0.identity.moduleVersion.minor <= 18446744073709551615n && typeof(proposal_0.identity.moduleVersion.patch) === 'bigint' && proposal_0.identity.moduleVersion.patch >= 0n && proposal_0.identity.moduleVersion.patch <= 18446744073709551615n && proposal_0.identity.implementationHash.buffer instanceof ArrayBuffer && proposal_0.identity.implementationHash.BYTES_PER_ELEMENT === 1 && proposal_0.identity.implementationHash.length === 32 && proposal_0.governanceNamespaceHash.buffer instanceof ArrayBuffer && proposal_0.governanceNamespaceHash.BYTES_PER_ELEMENT === 1 && proposal_0.governanceNamespaceHash.length === 32 && proposal_0.governancePolicyHash.buffer instanceof ArrayBuffer && proposal_0.governancePolicyHash.BYTES_PER_ELEMENT === 1 && proposal_0.governancePolicyHash.length === 32 && typeof(proposal_0.authorityRootVersion) === 'bigint' && proposal_0.authorityRootVersion >= 0n && proposal_0.authorityRootVersion <= 18446744073709551615n && typeof(proposal_0.authorityRootSequence) === 'bigint' && proposal_0.authorityRootSequence >= 0n && proposal_0.authorityRootSequence <= 18446744073709551615n && proposal_0.implementationReferenceHash.buffer instanceof ArrayBuffer && proposal_0.implementationReferenceHash.BYTES_PER_ELEMENT === 1 && proposal_0.implementationReferenceHash.length === 32 && proposal_0.sourceHash.buffer instanceof ArrayBuffer && proposal_0.sourceHash.BYTES_PER_ELEMENT === 1 && proposal_0.sourceHash.length === 32 && proposal_0.inputSchemaHash.buffer instanceof ArrayBuffer && proposal_0.inputSchemaHash.BYTES_PER_ELEMENT === 1 && proposal_0.inputSchemaHash.length === 32 && proposal_0.configurationSchemaHash.buffer instanceof ArrayBuffer && proposal_0.configurationSchemaHash.BYTES_PER_ELEMENT === 1 && proposal_0.configurationSchemaHash.length === 32 && proposal_0.receiptSchemaHash.buffer instanceof ArrayBuffer && proposal_0.receiptSchemaHash.BYTES_PER_ELEMENT === 1 && proposal_0.receiptSchemaHash.length === 32 && proposal_0.compilerVersionHash.buffer instanceof ArrayBuffer && proposal_0.compilerVersionHash.BYTES_PER_ELEMENT === 1 && proposal_0.compilerVersionHash.length === 32 && proposal_0.compatibilityPolicyHash.buffer instanceof ArrayBuffer && proposal_0.compatibilityPolicyHash.BYTES_PER_ELEMENT === 1 && proposal_0.compatibilityPolicyHash.length === 32 && typeof(proposal_0.proposedAt) === 'bigint' && proposal_0.proposedAt >= 0n && proposal_0.proposedAt <= 18446744073709551615n)) {
          __compactRuntime.typeError('proposeProofModule',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'permio-authorization.compact line 1148 char 1',
                                     'struct ProofModuleProposal<proposalVersion: Uint<0..65536>, identity: struct ProofModuleIdentity<moduleIdHash: Bytes<32>, moduleVersion: struct SemanticVersion<major: Uint<0..18446744073709551616>, minor: Uint<0..18446744073709551616>, patch: Uint<0..18446744073709551616>>, implementationHash: Bytes<32>>, governanceNamespaceHash: Bytes<32>, governancePolicyHash: Bytes<32>, authorityRootVersion: Uint<0..18446744073709551616>, authorityRootSequence: Uint<0..18446744073709551616>, implementationReferenceHash: Bytes<32>, sourceHash: Bytes<32>, inputSchemaHash: Bytes<32>, configurationSchemaHash: Bytes<32>, receiptSchemaHash: Bytes<32>, compilerVersionHash: Bytes<32>, compatibilityPolicyHash: Bytes<32>, proposedAt: Uint<0..18446744073709551616>>',
                                     proposal_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_30.toValue(proposal_0),
            alignment: _descriptor_30.alignment()
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._proposeProofModule_0(context,
                                                    partialProofData,
                                                    proposal_0);
        partialProofData.output = { value: _descriptor_0.toValue(result_0), alignment: _descriptor_0.alignment() };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      reviewProofModule: (...args_1) => {
        if (args_1.length !== 5) {
          throw new __compactRuntime.CompactError(`reviewProofModule: expected 5 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const review_0 = args_1[1];
        const signature_0 = args_1[2];
        const reviewer_0 = args_1[3];
        const authorityPath_0 = args_1[4];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('reviewProofModule',
                                     'argument 1 (as invoked from Typescript)',
                                     'permio-authorization.compact line 1207 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(typeof(review_0) === 'object' && typeof(review_0.reviewVersion) === 'bigint' && review_0.reviewVersion >= 0n && review_0.reviewVersion <= 65535n && review_0.moduleKey.buffer instanceof ArrayBuffer && review_0.moduleKey.BYTES_PER_ELEMENT === 1 && review_0.moduleKey.length === 32 && review_0.proposalCommitment.buffer instanceof ArrayBuffer && review_0.proposalCommitment.BYTES_PER_ELEMENT === 1 && review_0.proposalCommitment.length === 32 && review_0.governanceNamespaceHash.buffer instanceof ArrayBuffer && review_0.governanceNamespaceHash.BYTES_PER_ELEMENT === 1 && review_0.governanceNamespaceHash.length === 32 && review_0.governancePolicyHash.buffer instanceof ArrayBuffer && review_0.governancePolicyHash.BYTES_PER_ELEMENT === 1 && review_0.governancePolicyHash.length === 32 && typeof(review_0.authorityRootVersion) === 'bigint' && review_0.authorityRootVersion >= 0n && review_0.authorityRootVersion <= 18446744073709551615n && typeof(review_0.authorityRootSequence) === 'bigint' && review_0.authorityRootSequence >= 0n && review_0.authorityRootSequence <= 18446744073709551615n && typeof(review_0.reviewedAt) === 'bigint' && review_0.reviewedAt >= 0n && review_0.reviewedAt <= 18446744073709551615n && review_0.reviewNonce.buffer instanceof ArrayBuffer && review_0.reviewNonce.BYTES_PER_ELEMENT === 1 && review_0.reviewNonce.length === 32)) {
          __compactRuntime.typeError('reviewProofModule',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'permio-authorization.compact line 1207 char 1',
                                     'struct ProofModuleReview<reviewVersion: Uint<0..65536>, moduleKey: Bytes<32>, proposalCommitment: Bytes<32>, governanceNamespaceHash: Bytes<32>, governancePolicyHash: Bytes<32>, authorityRootVersion: Uint<0..18446744073709551616>, authorityRootSequence: Uint<0..18446744073709551616>, reviewedAt: Uint<0..18446744073709551616>, reviewNonce: Bytes<32>>',
                                     review_0)
        }
        if (!(typeof(signature_0) === 'object' && true && typeof(signature_0.response) === 'bigint' && signature_0.response >= 0 && signature_0.response <= __compactRuntime.MAX_FIELD)) {
          __compactRuntime.typeError('reviewProofModule',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'permio-authorization.compact line 1207 char 1',
                                     'struct SchnorrSignature<announcement: Opaque<"JubjubPoint">, response: Field>',
                                     signature_0)
        }
        if (!(typeof(reviewer_0) === 'object' && typeof(reviewer_0.leafVersion) === 'bigint' && reviewer_0.leafVersion >= 0n && reviewer_0.leafVersion <= 65535n && reviewer_0.namespaceHash.buffer instanceof ArrayBuffer && reviewer_0.namespaceHash.BYTES_PER_ELEMENT === 1 && reviewer_0.namespaceHash.length === 32 && reviewer_0.governancePolicyHash.buffer instanceof ArrayBuffer && reviewer_0.governancePolicyHash.BYTES_PER_ELEMENT === 1 && reviewer_0.governancePolicyHash.length === 32 && typeof(reviewer_0.authorityKind) === 'bigint' && reviewer_0.authorityKind >= 0n && reviewer_0.authorityKind <= 65535n && true && typeof(reviewer_0.validAfter) === 'bigint' && reviewer_0.validAfter >= 0n && reviewer_0.validAfter <= 18446744073709551615n && typeof(reviewer_0.validBefore) === 'bigint' && reviewer_0.validBefore >= 0n && reviewer_0.validBefore <= 18446744073709551615n)) {
          __compactRuntime.typeError('reviewProofModule',
                                     'argument 3 (argument 4 as invoked from Typescript)',
                                     'permio-authorization.compact line 1207 char 1',
                                     'struct GovernanceActivatorLeaf<leafVersion: Uint<0..65536>, namespaceHash: Bytes<32>, governancePolicyHash: Bytes<32>, authorityKind: Uint<0..65536>, publicKey: Opaque<"JubjubPoint">, validAfter: Uint<0..18446744073709551616>, validBefore: Uint<0..18446744073709551616>>',
                                     reviewer_0)
        }
        if (!(typeof(authorityPath_0) === 'object' && authorityPath_0.leaf.buffer instanceof ArrayBuffer && authorityPath_0.leaf.BYTES_PER_ELEMENT === 1 && authorityPath_0.leaf.length === 32 && Array.isArray(authorityPath_0.path) && authorityPath_0.path.length === 20 && authorityPath_0.path.every((t) => typeof(t) === 'object' && typeof(t.sibling) === 'object' && typeof(t.sibling.field) === 'bigint' && t.sibling.field >= 0 && t.sibling.field <= __compactRuntime.MAX_FIELD && typeof(t.goes_left) === 'boolean'))) {
          __compactRuntime.typeError('reviewProofModule',
                                     'argument 4 (argument 5 as invoked from Typescript)',
                                     'permio-authorization.compact line 1207 char 1',
                                     'struct MerkleTreePath<leaf: Bytes<32>, path: Vector<20, struct MerkleTreePathEntry<sibling: struct MerkleTreeDigest<field: Field>, goes_left: Boolean>>>',
                                     authorityPath_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_32.toValue(review_0).concat(_descriptor_11.toValue(signature_0).concat(_descriptor_12.toValue(reviewer_0).concat(_descriptor_15.toValue(authorityPath_0)))),
            alignment: _descriptor_32.alignment().concat(_descriptor_11.alignment().concat(_descriptor_12.alignment().concat(_descriptor_15.alignment())))
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._reviewProofModule_0(context,
                                                   partialProofData,
                                                   review_0,
                                                   signature_0,
                                                   reviewer_0,
                                                   authorityPath_0);
        partialProofData.output = { value: _descriptor_4.toValue(result_0), alignment: _descriptor_4.alignment() };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      governProofModule: (...args_1) => {
        if (args_1.length !== 5) {
          throw new __compactRuntime.CompactError(`governProofModule: expected 5 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const command_0 = args_1[1];
        const signature_0 = args_1[2];
        const authority_0 = args_1[3];
        const authorityPath_0 = args_1[4];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('governProofModule',
                                     'argument 1 (as invoked from Typescript)',
                                     'permio-authorization.compact line 1381 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(typeof(command_0) === 'object' && typeof(command_0.commandVersion) === 'bigint' && command_0.commandVersion >= 0n && command_0.commandVersion <= 65535n && command_0.moduleKey.buffer instanceof ArrayBuffer && command_0.moduleKey.BYTES_PER_ELEMENT === 1 && command_0.moduleKey.length === 32 && command_0.recordCommitment.buffer instanceof ArrayBuffer && command_0.recordCommitment.BYTES_PER_ELEMENT === 1 && command_0.recordCommitment.length === 32 && command_0.governanceNamespaceHash.buffer instanceof ArrayBuffer && command_0.governanceNamespaceHash.BYTES_PER_ELEMENT === 1 && command_0.governanceNamespaceHash.length === 32 && command_0.governancePolicyHash.buffer instanceof ArrayBuffer && command_0.governancePolicyHash.BYTES_PER_ELEMENT === 1 && command_0.governancePolicyHash.length === 32 && typeof(command_0.authorityRootVersion) === 'bigint' && command_0.authorityRootVersion >= 0n && command_0.authorityRootVersion <= 18446744073709551615n && typeof(command_0.authorityRootSequence) === 'bigint' && command_0.authorityRootSequence >= 0n && command_0.authorityRootSequence <= 18446744073709551615n && typeof(command_0.expectedLifecycleStatus) === 'bigint' && command_0.expectedLifecycleStatus >= 0n && command_0.expectedLifecycleStatus <= 255n && typeof(command_0.nextLifecycleStatus) === 'bigint' && command_0.nextLifecycleStatus >= 0n && command_0.nextLifecycleStatus <= 255n && typeof(command_0.effectiveAt) === 'bigint' && command_0.effectiveAt >= 0n && command_0.effectiveAt <= 18446744073709551615n && command_0.reasonHash.buffer instanceof ArrayBuffer && command_0.reasonHash.BYTES_PER_ELEMENT === 1 && command_0.reasonHash.length === 32 && command_0.commandNonce.buffer instanceof ArrayBuffer && command_0.commandNonce.BYTES_PER_ELEMENT === 1 && command_0.commandNonce.length === 32)) {
          __compactRuntime.typeError('governProofModule',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'permio-authorization.compact line 1381 char 1',
                                     'struct ProofModuleLifecycleCommand<commandVersion: Uint<0..65536>, moduleKey: Bytes<32>, recordCommitment: Bytes<32>, governanceNamespaceHash: Bytes<32>, governancePolicyHash: Bytes<32>, authorityRootVersion: Uint<0..18446744073709551616>, authorityRootSequence: Uint<0..18446744073709551616>, expectedLifecycleStatus: Uint<0..256>, nextLifecycleStatus: Uint<0..256>, effectiveAt: Uint<0..18446744073709551616>, reasonHash: Bytes<32>, commandNonce: Bytes<32>>',
                                     command_0)
        }
        if (!(typeof(signature_0) === 'object' && true && typeof(signature_0.response) === 'bigint' && signature_0.response >= 0 && signature_0.response <= __compactRuntime.MAX_FIELD)) {
          __compactRuntime.typeError('governProofModule',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'permio-authorization.compact line 1381 char 1',
                                     'struct SchnorrSignature<announcement: Opaque<"JubjubPoint">, response: Field>',
                                     signature_0)
        }
        if (!(typeof(authority_0) === 'object' && typeof(authority_0.leafVersion) === 'bigint' && authority_0.leafVersion >= 0n && authority_0.leafVersion <= 65535n && authority_0.namespaceHash.buffer instanceof ArrayBuffer && authority_0.namespaceHash.BYTES_PER_ELEMENT === 1 && authority_0.namespaceHash.length === 32 && authority_0.governancePolicyHash.buffer instanceof ArrayBuffer && authority_0.governancePolicyHash.BYTES_PER_ELEMENT === 1 && authority_0.governancePolicyHash.length === 32 && typeof(authority_0.authorityKind) === 'bigint' && authority_0.authorityKind >= 0n && authority_0.authorityKind <= 65535n && true && typeof(authority_0.validAfter) === 'bigint' && authority_0.validAfter >= 0n && authority_0.validAfter <= 18446744073709551615n && typeof(authority_0.validBefore) === 'bigint' && authority_0.validBefore >= 0n && authority_0.validBefore <= 18446744073709551615n)) {
          __compactRuntime.typeError('governProofModule',
                                     'argument 3 (argument 4 as invoked from Typescript)',
                                     'permio-authorization.compact line 1381 char 1',
                                     'struct GovernanceActivatorLeaf<leafVersion: Uint<0..65536>, namespaceHash: Bytes<32>, governancePolicyHash: Bytes<32>, authorityKind: Uint<0..65536>, publicKey: Opaque<"JubjubPoint">, validAfter: Uint<0..18446744073709551616>, validBefore: Uint<0..18446744073709551616>>',
                                     authority_0)
        }
        if (!(typeof(authorityPath_0) === 'object' && authorityPath_0.leaf.buffer instanceof ArrayBuffer && authorityPath_0.leaf.BYTES_PER_ELEMENT === 1 && authorityPath_0.leaf.length === 32 && Array.isArray(authorityPath_0.path) && authorityPath_0.path.length === 20 && authorityPath_0.path.every((t) => typeof(t) === 'object' && typeof(t.sibling) === 'object' && typeof(t.sibling.field) === 'bigint' && t.sibling.field >= 0 && t.sibling.field <= __compactRuntime.MAX_FIELD && typeof(t.goes_left) === 'boolean'))) {
          __compactRuntime.typeError('governProofModule',
                                     'argument 4 (argument 5 as invoked from Typescript)',
                                     'permio-authorization.compact line 1381 char 1',
                                     'struct MerkleTreePath<leaf: Bytes<32>, path: Vector<20, struct MerkleTreePathEntry<sibling: struct MerkleTreeDigest<field: Field>, goes_left: Boolean>>>',
                                     authorityPath_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_29.toValue(command_0).concat(_descriptor_11.toValue(signature_0).concat(_descriptor_12.toValue(authority_0).concat(_descriptor_15.toValue(authorityPath_0)))),
            alignment: _descriptor_29.alignment().concat(_descriptor_11.alignment().concat(_descriptor_12.alignment().concat(_descriptor_15.alignment())))
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._governProofModule_0(context,
                                                   partialProofData,
                                                   command_0,
                                                   signature_0,
                                                   authority_0,
                                                   authorityPath_0);
        partialProofData.output = { value: _descriptor_4.toValue(result_0), alignment: _descriptor_4.alignment() };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      terminateTemplate: (...args_1) => {
        if (args_1.length !== 5) {
          throw new __compactRuntime.CompactError(`terminateTemplate: expected 5 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const command_0 = args_1[1];
        const signature_0 = args_1[2];
        const authority_0 = args_1[3];
        const authorityPath_0 = args_1[4];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('terminateTemplate',
                                     'argument 1 (as invoked from Typescript)',
                                     'permio-authorization.compact line 1675 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(typeof(command_0) === 'object' && typeof(command_0.commandVersion) === 'bigint' && command_0.commandVersion >= 0n && command_0.commandVersion <= 65535n && command_0.registryKey.buffer instanceof ArrayBuffer && command_0.registryKey.BYTES_PER_ELEMENT === 1 && command_0.registryKey.length === 32 && command_0.recordCommitment.buffer instanceof ArrayBuffer && command_0.recordCommitment.BYTES_PER_ELEMENT === 1 && command_0.recordCommitment.length === 32 && command_0.namespaceHash.buffer instanceof ArrayBuffer && command_0.namespaceHash.BYTES_PER_ELEMENT === 1 && command_0.namespaceHash.length === 32 && command_0.governancePolicyHash.buffer instanceof ArrayBuffer && command_0.governancePolicyHash.BYTES_PER_ELEMENT === 1 && command_0.governancePolicyHash.length === 32 && typeof(command_0.authorityRootVersion) === 'bigint' && command_0.authorityRootVersion >= 0n && command_0.authorityRootVersion <= 18446744073709551615n && typeof(command_0.authorityRootSequence) === 'bigint' && command_0.authorityRootSequence >= 0n && command_0.authorityRootSequence <= 18446744073709551615n && typeof(command_0.expectedLifecycleStatus) === 'bigint' && command_0.expectedLifecycleStatus >= 0n && command_0.expectedLifecycleStatus <= 255n && typeof(command_0.nextLifecycleStatus) === 'bigint' && command_0.nextLifecycleStatus >= 0n && command_0.nextLifecycleStatus <= 255n && typeof(command_0.effectiveAt) === 'bigint' && command_0.effectiveAt >= 0n && command_0.effectiveAt <= 18446744073709551615n && typeof(command_0.effectiveSequence) === 'bigint' && command_0.effectiveSequence >= 0n && command_0.effectiveSequence <= 18446744073709551615n && command_0.reasonHash.buffer instanceof ArrayBuffer && command_0.reasonHash.BYTES_PER_ELEMENT === 1 && command_0.reasonHash.length === 32 && command_0.commandNonce.buffer instanceof ArrayBuffer && command_0.commandNonce.BYTES_PER_ELEMENT === 1 && command_0.commandNonce.length === 32)) {
          __compactRuntime.typeError('terminateTemplate',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'permio-authorization.compact line 1675 char 1',
                                     'struct TemplateLifecycleCommand<commandVersion: Uint<0..65536>, registryKey: Bytes<32>, recordCommitment: Bytes<32>, namespaceHash: Bytes<32>, governancePolicyHash: Bytes<32>, authorityRootVersion: Uint<0..18446744073709551616>, authorityRootSequence: Uint<0..18446744073709551616>, expectedLifecycleStatus: Uint<0..256>, nextLifecycleStatus: Uint<0..256>, effectiveAt: Uint<0..18446744073709551616>, effectiveSequence: Uint<0..18446744073709551616>, reasonHash: Bytes<32>, commandNonce: Bytes<32>>',
                                     command_0)
        }
        if (!(typeof(signature_0) === 'object' && true && typeof(signature_0.response) === 'bigint' && signature_0.response >= 0 && signature_0.response <= __compactRuntime.MAX_FIELD)) {
          __compactRuntime.typeError('terminateTemplate',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'permio-authorization.compact line 1675 char 1',
                                     'struct SchnorrSignature<announcement: Opaque<"JubjubPoint">, response: Field>',
                                     signature_0)
        }
        if (!(typeof(authority_0) === 'object' && typeof(authority_0.leafVersion) === 'bigint' && authority_0.leafVersion >= 0n && authority_0.leafVersion <= 65535n && authority_0.namespaceHash.buffer instanceof ArrayBuffer && authority_0.namespaceHash.BYTES_PER_ELEMENT === 1 && authority_0.namespaceHash.length === 32 && authority_0.governancePolicyHash.buffer instanceof ArrayBuffer && authority_0.governancePolicyHash.BYTES_PER_ELEMENT === 1 && authority_0.governancePolicyHash.length === 32 && typeof(authority_0.authorityKind) === 'bigint' && authority_0.authorityKind >= 0n && authority_0.authorityKind <= 65535n && true && typeof(authority_0.validAfter) === 'bigint' && authority_0.validAfter >= 0n && authority_0.validAfter <= 18446744073709551615n && typeof(authority_0.validBefore) === 'bigint' && authority_0.validBefore >= 0n && authority_0.validBefore <= 18446744073709551615n)) {
          __compactRuntime.typeError('terminateTemplate',
                                     'argument 3 (argument 4 as invoked from Typescript)',
                                     'permio-authorization.compact line 1675 char 1',
                                     'struct GovernanceActivatorLeaf<leafVersion: Uint<0..65536>, namespaceHash: Bytes<32>, governancePolicyHash: Bytes<32>, authorityKind: Uint<0..65536>, publicKey: Opaque<"JubjubPoint">, validAfter: Uint<0..18446744073709551616>, validBefore: Uint<0..18446744073709551616>>',
                                     authority_0)
        }
        if (!(typeof(authorityPath_0) === 'object' && authorityPath_0.leaf.buffer instanceof ArrayBuffer && authorityPath_0.leaf.BYTES_PER_ELEMENT === 1 && authorityPath_0.leaf.length === 32 && Array.isArray(authorityPath_0.path) && authorityPath_0.path.length === 20 && authorityPath_0.path.every((t) => typeof(t) === 'object' && typeof(t.sibling) === 'object' && typeof(t.sibling.field) === 'bigint' && t.sibling.field >= 0 && t.sibling.field <= __compactRuntime.MAX_FIELD && typeof(t.goes_left) === 'boolean'))) {
          __compactRuntime.typeError('terminateTemplate',
                                     'argument 4 (argument 5 as invoked from Typescript)',
                                     'permio-authorization.compact line 1675 char 1',
                                     'struct MerkleTreePath<leaf: Bytes<32>, path: Vector<20, struct MerkleTreePathEntry<sibling: struct MerkleTreeDigest<field: Field>, goes_left: Boolean>>>',
                                     authorityPath_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_27.toValue(command_0).concat(_descriptor_11.toValue(signature_0).concat(_descriptor_12.toValue(authority_0).concat(_descriptor_15.toValue(authorityPath_0)))),
            alignment: _descriptor_27.alignment().concat(_descriptor_11.alignment().concat(_descriptor_12.alignment().concat(_descriptor_15.alignment())))
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._terminateTemplate_0(context,
                                                   partialProofData,
                                                   command_0,
                                                   signature_0,
                                                   authority_0,
                                                   authorityPath_0);
        partialProofData.output = { value: _descriptor_6.toValue(result_0), alignment: _descriptor_6.alignment() };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      beginM4Activation: (...args_1) => {
        if (args_1.length !== 5) {
          throw new __compactRuntime.CompactError(`beginM4Activation: expected 5 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const envelope_0 = args_1[1];
        const signature_0 = args_1[2];
        const activator_0 = args_1[3];
        const authorityPath_0 = args_1[4];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('beginM4Activation',
                                     'argument 1 (as invoked from Typescript)',
                                     'permio-authorization.compact line 1756 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(typeof(envelope_0) === 'object' && typeof(envelope_0.envelopeVersion) === 'bigint' && envelope_0.envelopeVersion >= 0n && envelope_0.envelopeVersion <= 65535n && envelope_0.namespaceHash.buffer instanceof ArrayBuffer && envelope_0.namespaceHash.BYTES_PER_ELEMENT === 1 && envelope_0.namespaceHash.length === 32 && envelope_0.templateIdHash.buffer instanceof ArrayBuffer && envelope_0.templateIdHash.BYTES_PER_ELEMENT === 1 && envelope_0.templateIdHash.length === 32 && typeof(envelope_0.semanticVersion) === 'object' && typeof(envelope_0.semanticVersion.major) === 'bigint' && envelope_0.semanticVersion.major >= 0n && envelope_0.semanticVersion.major <= 18446744073709551615n && typeof(envelope_0.semanticVersion.minor) === 'bigint' && envelope_0.semanticVersion.minor >= 0n && envelope_0.semanticVersion.minor <= 18446744073709551615n && typeof(envelope_0.semanticVersion.patch) === 'bigint' && envelope_0.semanticVersion.patch >= 0n && envelope_0.semanticVersion.patch <= 18446744073709551615n && envelope_0.templateContentHash.buffer instanceof ArrayBuffer && envelope_0.templateContentHash.BYTES_PER_ELEMENT === 1 && envelope_0.templateContentHash.length === 32 && envelope_0.governancePolicyHash.buffer instanceof ArrayBuffer && envelope_0.governancePolicyHash.BYTES_PER_ELEMENT === 1 && envelope_0.governancePolicyHash.length === 32 && envelope_0.proofModuleBindingsHash.buffer instanceof ArrayBuffer && envelope_0.proofModuleBindingsHash.BYTES_PER_ELEMENT === 1 && envelope_0.proofModuleBindingsHash.length === 32 && typeof(envelope_0.proofModuleBindingRoot) === 'object' && typeof(envelope_0.proofModuleBindingRoot.field) === 'bigint' && envelope_0.proofModuleBindingRoot.field >= 0 && envelope_0.proofModuleBindingRoot.field <= __compactRuntime.MAX_FIELD && typeof(envelope_0.proofModuleBindingCount) === 'bigint' && envelope_0.proofModuleBindingCount >= 0n && envelope_0.proofModuleBindingCount <= 4294967295n && typeof(envelope_0.proofModuleRegistrySequence) === 'bigint' && envelope_0.proofModuleRegistrySequence >= 0n && envelope_0.proofModuleRegistrySequence <= 18446744073709551615n && envelope_0.m4ActivationRecordHash.buffer instanceof ArrayBuffer && envelope_0.m4ActivationRecordHash.BYTES_PER_ELEMENT === 1 && envelope_0.m4ActivationRecordHash.length === 32 && envelope_0.approvalEvidenceCommitment.buffer instanceof ArrayBuffer && envelope_0.approvalEvidenceCommitment.BYTES_PER_ELEMENT === 1 && envelope_0.approvalEvidenceCommitment.length === 32 && typeof(envelope_0.authorityRootVersion) === 'bigint' && envelope_0.authorityRootVersion >= 0n && envelope_0.authorityRootVersion <= 18446744073709551615n && typeof(envelope_0.authorityRootSequence) === 'bigint' && envelope_0.authorityRootSequence >= 0n && envelope_0.authorityRootSequence <= 18446744073709551615n && envelope_0.targetNetworkHash.buffer instanceof ArrayBuffer && envelope_0.targetNetworkHash.BYTES_PER_ELEMENT === 1 && envelope_0.targetNetworkHash.length === 32 && envelope_0.targetContractIdentity.buffer instanceof ArrayBuffer && envelope_0.targetContractIdentity.BYTES_PER_ELEMENT === 1 && envelope_0.targetContractIdentity.length === 32 && typeof(envelope_0.registryProtocolVersion) === 'bigint' && envelope_0.registryProtocolVersion >= 0n && envelope_0.registryProtocolVersion <= 65535n && envelope_0.admissionNonce.buffer instanceof ArrayBuffer && envelope_0.admissionNonce.BYTES_PER_ELEMENT === 1 && envelope_0.admissionNonce.length === 32 && typeof(envelope_0.activatedAt) === 'bigint' && envelope_0.activatedAt >= 0n && envelope_0.activatedAt <= 18446744073709551615n && typeof(envelope_0.stagingExpiresAt) === 'bigint' && envelope_0.stagingExpiresAt >= 0n && envelope_0.stagingExpiresAt <= 18446744073709551615n)) {
          __compactRuntime.typeError('beginM4Activation',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'permio-authorization.compact line 1756 char 1',
                                     'struct ActivationAdmissionEnvelope<envelopeVersion: Uint<0..65536>, namespaceHash: Bytes<32>, templateIdHash: Bytes<32>, semanticVersion: struct SemanticVersion<major: Uint<0..18446744073709551616>, minor: Uint<0..18446744073709551616>, patch: Uint<0..18446744073709551616>>, templateContentHash: Bytes<32>, governancePolicyHash: Bytes<32>, proofModuleBindingsHash: Bytes<32>, proofModuleBindingRoot: struct MerkleTreeDigest<field: Field>, proofModuleBindingCount: Uint<0..4294967296>, proofModuleRegistrySequence: Uint<0..18446744073709551616>, m4ActivationRecordHash: Bytes<32>, approvalEvidenceCommitment: Bytes<32>, authorityRootVersion: Uint<0..18446744073709551616>, authorityRootSequence: Uint<0..18446744073709551616>, targetNetworkHash: Bytes<32>, targetContractIdentity: Bytes<32>, registryProtocolVersion: Uint<0..65536>, admissionNonce: Bytes<32>, activatedAt: Uint<0..18446744073709551616>, stagingExpiresAt: Uint<0..18446744073709551616>>',
                                     envelope_0)
        }
        if (!(typeof(signature_0) === 'object' && true && typeof(signature_0.response) === 'bigint' && signature_0.response >= 0 && signature_0.response <= __compactRuntime.MAX_FIELD)) {
          __compactRuntime.typeError('beginM4Activation',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'permio-authorization.compact line 1756 char 1',
                                     'struct SchnorrSignature<announcement: Opaque<"JubjubPoint">, response: Field>',
                                     signature_0)
        }
        if (!(typeof(activator_0) === 'object' && typeof(activator_0.leafVersion) === 'bigint' && activator_0.leafVersion >= 0n && activator_0.leafVersion <= 65535n && activator_0.namespaceHash.buffer instanceof ArrayBuffer && activator_0.namespaceHash.BYTES_PER_ELEMENT === 1 && activator_0.namespaceHash.length === 32 && activator_0.governancePolicyHash.buffer instanceof ArrayBuffer && activator_0.governancePolicyHash.BYTES_PER_ELEMENT === 1 && activator_0.governancePolicyHash.length === 32 && typeof(activator_0.authorityKind) === 'bigint' && activator_0.authorityKind >= 0n && activator_0.authorityKind <= 65535n && true && typeof(activator_0.validAfter) === 'bigint' && activator_0.validAfter >= 0n && activator_0.validAfter <= 18446744073709551615n && typeof(activator_0.validBefore) === 'bigint' && activator_0.validBefore >= 0n && activator_0.validBefore <= 18446744073709551615n)) {
          __compactRuntime.typeError('beginM4Activation',
                                     'argument 3 (argument 4 as invoked from Typescript)',
                                     'permio-authorization.compact line 1756 char 1',
                                     'struct GovernanceActivatorLeaf<leafVersion: Uint<0..65536>, namespaceHash: Bytes<32>, governancePolicyHash: Bytes<32>, authorityKind: Uint<0..65536>, publicKey: Opaque<"JubjubPoint">, validAfter: Uint<0..18446744073709551616>, validBefore: Uint<0..18446744073709551616>>',
                                     activator_0)
        }
        if (!(typeof(authorityPath_0) === 'object' && authorityPath_0.leaf.buffer instanceof ArrayBuffer && authorityPath_0.leaf.BYTES_PER_ELEMENT === 1 && authorityPath_0.leaf.length === 32 && Array.isArray(authorityPath_0.path) && authorityPath_0.path.length === 20 && authorityPath_0.path.every((t) => typeof(t) === 'object' && typeof(t.sibling) === 'object' && typeof(t.sibling.field) === 'bigint' && t.sibling.field >= 0 && t.sibling.field <= __compactRuntime.MAX_FIELD && typeof(t.goes_left) === 'boolean'))) {
          __compactRuntime.typeError('beginM4Activation',
                                     'argument 4 (argument 5 as invoked from Typescript)',
                                     'permio-authorization.compact line 1756 char 1',
                                     'struct MerkleTreePath<leaf: Bytes<32>, path: Vector<20, struct MerkleTreePathEntry<sibling: struct MerkleTreeDigest<field: Field>, goes_left: Boolean>>>',
                                     authorityPath_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_25.toValue(envelope_0).concat(_descriptor_11.toValue(signature_0).concat(_descriptor_12.toValue(activator_0).concat(_descriptor_15.toValue(authorityPath_0)))),
            alignment: _descriptor_25.alignment().concat(_descriptor_11.alignment().concat(_descriptor_12.alignment().concat(_descriptor_15.alignment())))
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._beginM4Activation_0(context,
                                                   partialProofData,
                                                   envelope_0,
                                                   signature_0,
                                                   activator_0,
                                                   authorityPath_0);
        partialProofData.output = { value: _descriptor_0.toValue(result_0), alignment: _descriptor_0.alignment() };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      stageM4ActivationBinding: (...args_1) => {
        if (args_1.length !== 4) {
          throw new __compactRuntime.CompactError(`stageM4ActivationBinding: expected 4 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const registryKey_0 = args_1[1];
        const binding_0 = args_1[2];
        const bindingPath_0 = args_1[3];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('stageM4ActivationBinding',
                                     'argument 1 (as invoked from Typescript)',
                                     'permio-authorization.compact line 1817 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(registryKey_0.buffer instanceof ArrayBuffer && registryKey_0.BYTES_PER_ELEMENT === 1 && registryKey_0.length === 32)) {
          __compactRuntime.typeError('stageM4ActivationBinding',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'permio-authorization.compact line 1817 char 1',
                                     'Bytes<32>',
                                     registryKey_0)
        }
        if (!(typeof(binding_0) === 'object' && typeof(binding_0.bindingVersion) === 'bigint' && binding_0.bindingVersion >= 0n && binding_0.bindingVersion <= 65535n && typeof(binding_0.actionIndex) === 'bigint' && binding_0.actionIndex >= 0n && binding_0.actionIndex <= 4294967295n && binding_0.actionIdHash.buffer instanceof ArrayBuffer && binding_0.actionIdHash.BYTES_PER_ELEMENT === 1 && binding_0.actionIdHash.length === 32 && binding_0.proofProfileIdHash.buffer instanceof ArrayBuffer && binding_0.proofProfileIdHash.BYTES_PER_ELEMENT === 1 && binding_0.proofProfileIdHash.length === 32 && binding_0.moduleIdHash.buffer instanceof ArrayBuffer && binding_0.moduleIdHash.BYTES_PER_ELEMENT === 1 && binding_0.moduleIdHash.length === 32 && typeof(binding_0.moduleVersion) === 'object' && typeof(binding_0.moduleVersion.major) === 'bigint' && binding_0.moduleVersion.major >= 0n && binding_0.moduleVersion.major <= 18446744073709551615n && typeof(binding_0.moduleVersion.minor) === 'bigint' && binding_0.moduleVersion.minor >= 0n && binding_0.moduleVersion.minor <= 18446744073709551615n && typeof(binding_0.moduleVersion.patch) === 'bigint' && binding_0.moduleVersion.patch >= 0n && binding_0.moduleVersion.patch <= 18446744073709551615n && binding_0.implementationHash.buffer instanceof ArrayBuffer && binding_0.implementationHash.BYTES_PER_ELEMENT === 1 && binding_0.implementationHash.length === 32 && binding_0.configurationHash.buffer instanceof ArrayBuffer && binding_0.configurationHash.BYTES_PER_ELEMENT === 1 && binding_0.configurationHash.length === 32 && binding_0.receiptSchemaHash.buffer instanceof ArrayBuffer && binding_0.receiptSchemaHash.BYTES_PER_ELEMENT === 1 && binding_0.receiptSchemaHash.length === 32)) {
          __compactRuntime.typeError('stageM4ActivationBinding',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'permio-authorization.compact line 1817 char 1',
                                     'struct ProofModuleBinding<bindingVersion: Uint<0..65536>, actionIndex: Uint<0..4294967296>, actionIdHash: Bytes<32>, proofProfileIdHash: Bytes<32>, moduleIdHash: Bytes<32>, moduleVersion: struct SemanticVersion<major: Uint<0..18446744073709551616>, minor: Uint<0..18446744073709551616>, patch: Uint<0..18446744073709551616>>, implementationHash: Bytes<32>, configurationHash: Bytes<32>, receiptSchemaHash: Bytes<32>>',
                                     binding_0)
        }
        if (!(typeof(bindingPath_0) === 'object' && bindingPath_0.leaf.buffer instanceof ArrayBuffer && bindingPath_0.leaf.BYTES_PER_ELEMENT === 1 && bindingPath_0.leaf.length === 32 && Array.isArray(bindingPath_0.path) && bindingPath_0.path.length === 20 && bindingPath_0.path.every((t) => typeof(t) === 'object' && typeof(t.sibling) === 'object' && typeof(t.sibling.field) === 'bigint' && t.sibling.field >= 0 && t.sibling.field <= __compactRuntime.MAX_FIELD && typeof(t.goes_left) === 'boolean'))) {
          __compactRuntime.typeError('stageM4ActivationBinding',
                                     'argument 3 (argument 4 as invoked from Typescript)',
                                     'permio-authorization.compact line 1817 char 1',
                                     'struct MerkleTreePath<leaf: Bytes<32>, path: Vector<20, struct MerkleTreePathEntry<sibling: struct MerkleTreeDigest<field: Field>, goes_left: Boolean>>>',
                                     bindingPath_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_0.toValue(registryKey_0).concat(_descriptor_23.toValue(binding_0).concat(_descriptor_15.toValue(bindingPath_0))),
            alignment: _descriptor_0.alignment().concat(_descriptor_23.alignment().concat(_descriptor_15.alignment()))
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._stageM4ActivationBinding_0(context,
                                                          partialProofData,
                                                          registryKey_0,
                                                          binding_0,
                                                          bindingPath_0);
        partialProofData.output = { value: _descriptor_6.toValue(result_0), alignment: _descriptor_6.alignment() };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      finalizeM4Activation: (...args_1) => {
        if (args_1.length !== 5) {
          throw new __compactRuntime.CompactError(`finalizeM4Activation: expected 5 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const envelope_0 = args_1[1];
        const signature_0 = args_1[2];
        const activator_0 = args_1[3];
        const authorityPath_0 = args_1[4];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('finalizeM4Activation',
                                     'argument 1 (as invoked from Typescript)',
                                     'permio-authorization.compact line 1891 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(typeof(envelope_0) === 'object' && typeof(envelope_0.envelopeVersion) === 'bigint' && envelope_0.envelopeVersion >= 0n && envelope_0.envelopeVersion <= 65535n && envelope_0.namespaceHash.buffer instanceof ArrayBuffer && envelope_0.namespaceHash.BYTES_PER_ELEMENT === 1 && envelope_0.namespaceHash.length === 32 && envelope_0.templateIdHash.buffer instanceof ArrayBuffer && envelope_0.templateIdHash.BYTES_PER_ELEMENT === 1 && envelope_0.templateIdHash.length === 32 && typeof(envelope_0.semanticVersion) === 'object' && typeof(envelope_0.semanticVersion.major) === 'bigint' && envelope_0.semanticVersion.major >= 0n && envelope_0.semanticVersion.major <= 18446744073709551615n && typeof(envelope_0.semanticVersion.minor) === 'bigint' && envelope_0.semanticVersion.minor >= 0n && envelope_0.semanticVersion.minor <= 18446744073709551615n && typeof(envelope_0.semanticVersion.patch) === 'bigint' && envelope_0.semanticVersion.patch >= 0n && envelope_0.semanticVersion.patch <= 18446744073709551615n && envelope_0.templateContentHash.buffer instanceof ArrayBuffer && envelope_0.templateContentHash.BYTES_PER_ELEMENT === 1 && envelope_0.templateContentHash.length === 32 && envelope_0.governancePolicyHash.buffer instanceof ArrayBuffer && envelope_0.governancePolicyHash.BYTES_PER_ELEMENT === 1 && envelope_0.governancePolicyHash.length === 32 && envelope_0.proofModuleBindingsHash.buffer instanceof ArrayBuffer && envelope_0.proofModuleBindingsHash.BYTES_PER_ELEMENT === 1 && envelope_0.proofModuleBindingsHash.length === 32 && typeof(envelope_0.proofModuleBindingRoot) === 'object' && typeof(envelope_0.proofModuleBindingRoot.field) === 'bigint' && envelope_0.proofModuleBindingRoot.field >= 0 && envelope_0.proofModuleBindingRoot.field <= __compactRuntime.MAX_FIELD && typeof(envelope_0.proofModuleBindingCount) === 'bigint' && envelope_0.proofModuleBindingCount >= 0n && envelope_0.proofModuleBindingCount <= 4294967295n && typeof(envelope_0.proofModuleRegistrySequence) === 'bigint' && envelope_0.proofModuleRegistrySequence >= 0n && envelope_0.proofModuleRegistrySequence <= 18446744073709551615n && envelope_0.m4ActivationRecordHash.buffer instanceof ArrayBuffer && envelope_0.m4ActivationRecordHash.BYTES_PER_ELEMENT === 1 && envelope_0.m4ActivationRecordHash.length === 32 && envelope_0.approvalEvidenceCommitment.buffer instanceof ArrayBuffer && envelope_0.approvalEvidenceCommitment.BYTES_PER_ELEMENT === 1 && envelope_0.approvalEvidenceCommitment.length === 32 && typeof(envelope_0.authorityRootVersion) === 'bigint' && envelope_0.authorityRootVersion >= 0n && envelope_0.authorityRootVersion <= 18446744073709551615n && typeof(envelope_0.authorityRootSequence) === 'bigint' && envelope_0.authorityRootSequence >= 0n && envelope_0.authorityRootSequence <= 18446744073709551615n && envelope_0.targetNetworkHash.buffer instanceof ArrayBuffer && envelope_0.targetNetworkHash.BYTES_PER_ELEMENT === 1 && envelope_0.targetNetworkHash.length === 32 && envelope_0.targetContractIdentity.buffer instanceof ArrayBuffer && envelope_0.targetContractIdentity.BYTES_PER_ELEMENT === 1 && envelope_0.targetContractIdentity.length === 32 && typeof(envelope_0.registryProtocolVersion) === 'bigint' && envelope_0.registryProtocolVersion >= 0n && envelope_0.registryProtocolVersion <= 65535n && envelope_0.admissionNonce.buffer instanceof ArrayBuffer && envelope_0.admissionNonce.BYTES_PER_ELEMENT === 1 && envelope_0.admissionNonce.length === 32 && typeof(envelope_0.activatedAt) === 'bigint' && envelope_0.activatedAt >= 0n && envelope_0.activatedAt <= 18446744073709551615n && typeof(envelope_0.stagingExpiresAt) === 'bigint' && envelope_0.stagingExpiresAt >= 0n && envelope_0.stagingExpiresAt <= 18446744073709551615n)) {
          __compactRuntime.typeError('finalizeM4Activation',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'permio-authorization.compact line 1891 char 1',
                                     'struct ActivationAdmissionEnvelope<envelopeVersion: Uint<0..65536>, namespaceHash: Bytes<32>, templateIdHash: Bytes<32>, semanticVersion: struct SemanticVersion<major: Uint<0..18446744073709551616>, minor: Uint<0..18446744073709551616>, patch: Uint<0..18446744073709551616>>, templateContentHash: Bytes<32>, governancePolicyHash: Bytes<32>, proofModuleBindingsHash: Bytes<32>, proofModuleBindingRoot: struct MerkleTreeDigest<field: Field>, proofModuleBindingCount: Uint<0..4294967296>, proofModuleRegistrySequence: Uint<0..18446744073709551616>, m4ActivationRecordHash: Bytes<32>, approvalEvidenceCommitment: Bytes<32>, authorityRootVersion: Uint<0..18446744073709551616>, authorityRootSequence: Uint<0..18446744073709551616>, targetNetworkHash: Bytes<32>, targetContractIdentity: Bytes<32>, registryProtocolVersion: Uint<0..65536>, admissionNonce: Bytes<32>, activatedAt: Uint<0..18446744073709551616>, stagingExpiresAt: Uint<0..18446744073709551616>>',
                                     envelope_0)
        }
        if (!(typeof(signature_0) === 'object' && true && typeof(signature_0.response) === 'bigint' && signature_0.response >= 0 && signature_0.response <= __compactRuntime.MAX_FIELD)) {
          __compactRuntime.typeError('finalizeM4Activation',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'permio-authorization.compact line 1891 char 1',
                                     'struct SchnorrSignature<announcement: Opaque<"JubjubPoint">, response: Field>',
                                     signature_0)
        }
        if (!(typeof(activator_0) === 'object' && typeof(activator_0.leafVersion) === 'bigint' && activator_0.leafVersion >= 0n && activator_0.leafVersion <= 65535n && activator_0.namespaceHash.buffer instanceof ArrayBuffer && activator_0.namespaceHash.BYTES_PER_ELEMENT === 1 && activator_0.namespaceHash.length === 32 && activator_0.governancePolicyHash.buffer instanceof ArrayBuffer && activator_0.governancePolicyHash.BYTES_PER_ELEMENT === 1 && activator_0.governancePolicyHash.length === 32 && typeof(activator_0.authorityKind) === 'bigint' && activator_0.authorityKind >= 0n && activator_0.authorityKind <= 65535n && true && typeof(activator_0.validAfter) === 'bigint' && activator_0.validAfter >= 0n && activator_0.validAfter <= 18446744073709551615n && typeof(activator_0.validBefore) === 'bigint' && activator_0.validBefore >= 0n && activator_0.validBefore <= 18446744073709551615n)) {
          __compactRuntime.typeError('finalizeM4Activation',
                                     'argument 3 (argument 4 as invoked from Typescript)',
                                     'permio-authorization.compact line 1891 char 1',
                                     'struct GovernanceActivatorLeaf<leafVersion: Uint<0..65536>, namespaceHash: Bytes<32>, governancePolicyHash: Bytes<32>, authorityKind: Uint<0..65536>, publicKey: Opaque<"JubjubPoint">, validAfter: Uint<0..18446744073709551616>, validBefore: Uint<0..18446744073709551616>>',
                                     activator_0)
        }
        if (!(typeof(authorityPath_0) === 'object' && authorityPath_0.leaf.buffer instanceof ArrayBuffer && authorityPath_0.leaf.BYTES_PER_ELEMENT === 1 && authorityPath_0.leaf.length === 32 && Array.isArray(authorityPath_0.path) && authorityPath_0.path.length === 20 && authorityPath_0.path.every((t) => typeof(t) === 'object' && typeof(t.sibling) === 'object' && typeof(t.sibling.field) === 'bigint' && t.sibling.field >= 0 && t.sibling.field <= __compactRuntime.MAX_FIELD && typeof(t.goes_left) === 'boolean'))) {
          __compactRuntime.typeError('finalizeM4Activation',
                                     'argument 4 (argument 5 as invoked from Typescript)',
                                     'permio-authorization.compact line 1891 char 1',
                                     'struct MerkleTreePath<leaf: Bytes<32>, path: Vector<20, struct MerkleTreePathEntry<sibling: struct MerkleTreeDigest<field: Field>, goes_left: Boolean>>>',
                                     authorityPath_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_25.toValue(envelope_0).concat(_descriptor_11.toValue(signature_0).concat(_descriptor_12.toValue(activator_0).concat(_descriptor_15.toValue(authorityPath_0)))),
            alignment: _descriptor_25.alignment().concat(_descriptor_11.alignment().concat(_descriptor_12.alignment().concat(_descriptor_15.alignment())))
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._finalizeM4Activation_0(context,
                                                      partialProofData,
                                                      envelope_0,
                                                      signature_0,
                                                      activator_0,
                                                      authorityPath_0);
        partialProofData.output = { value: _descriptor_26.toValue(result_0), alignment: _descriptor_26.alignment() };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      updateRuntimeCredentialStatus: (...args_1) => {
        if (args_1.length !== 8) {
          throw new __compactRuntime.CompactError(`updateRuntimeCredentialStatus: expected 8 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const command_0 = args_1[1];
        const signature_0 = args_1[2];
        const namespaceAuthority_0 = args_1[3];
        const namespaceAuthorityPath_0 = args_1[4];
        const accountAuthority_0 = args_1[5];
        const accountAuthorityStatusPath_0 = args_1[6];
        const currentStatusPath_0 = args_1[7];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('updateRuntimeCredentialStatus',
                                     'argument 1 (as invoked from Typescript)',
                                     'permio-authorization.compact line 1967 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(typeof(command_0) === 'object' && typeof(command_0.commandVersion) === 'bigint' && command_0.commandVersion >= 0n && command_0.commandVersion <= 65535n && command_0.namespaceHash.buffer instanceof ArrayBuffer && command_0.namespaceHash.BYTES_PER_ELEMENT === 1 && command_0.namespaceHash.length === 32 && command_0.governancePolicyHash.buffer instanceof ArrayBuffer && command_0.governancePolicyHash.BYTES_PER_ELEMENT === 1 && command_0.governancePolicyHash.length === 32 && typeof(command_0.authorityRootVersion) === 'bigint' && command_0.authorityRootVersion >= 0n && command_0.authorityRootVersion <= 18446744073709551615n && typeof(command_0.authorityRootSequence) === 'bigint' && command_0.authorityRootSequence >= 0n && command_0.authorityRootSequence <= 18446744073709551615n && typeof(command_0.credentialStatusRootSequence) === 'bigint' && command_0.credentialStatusRootSequence >= 0n && command_0.credentialStatusRootSequence <= 18446744073709551615n && typeof(command_0.credentialKind) === 'bigint' && command_0.credentialKind >= 0n && command_0.credentialKind <= 65535n && command_0.credentialCommitment.buffer instanceof ArrayBuffer && command_0.credentialCommitment.BYTES_PER_ELEMENT === 1 && command_0.credentialCommitment.length === 32 && command_0.subjectAccountCredentialCommitment.buffer instanceof ArrayBuffer && command_0.subjectAccountCredentialCommitment.BYTES_PER_ELEMENT === 1 && command_0.subjectAccountCredentialCommitment.length === 32 && command_0.revocationAuthorityAccountCredentialCommitment.buffer instanceof ArrayBuffer && command_0.revocationAuthorityAccountCredentialCommitment.BYTES_PER_ELEMENT === 1 && command_0.revocationAuthorityAccountCredentialCommitment.length === 32 && typeof(command_0.statusIndex) === 'bigint' && command_0.statusIndex >= 0n && command_0.statusIndex <= 18446744073709551615n && typeof(command_0.expectedStatus) === 'bigint' && command_0.expectedStatus >= 0n && command_0.expectedStatus <= 255n && typeof(command_0.nextStatus) === 'bigint' && command_0.nextStatus >= 0n && command_0.nextStatus <= 255n && typeof(command_0.effectiveAt) === 'bigint' && command_0.effectiveAt >= 0n && command_0.effectiveAt <= 18446744073709551615n && command_0.commandNonce.buffer instanceof ArrayBuffer && command_0.commandNonce.BYTES_PER_ELEMENT === 1 && command_0.commandNonce.length === 32)) {
          __compactRuntime.typeError('updateRuntimeCredentialStatus',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'permio-authorization.compact line 1967 char 1',
                                     'struct RuntimeCredentialStatusCommand<commandVersion: Uint<0..65536>, namespaceHash: Bytes<32>, governancePolicyHash: Bytes<32>, authorityRootVersion: Uint<0..18446744073709551616>, authorityRootSequence: Uint<0..18446744073709551616>, credentialStatusRootSequence: Uint<0..18446744073709551616>, credentialKind: Uint<0..65536>, credentialCommitment: Bytes<32>, subjectAccountCredentialCommitment: Bytes<32>, revocationAuthorityAccountCredentialCommitment: Bytes<32>, statusIndex: Uint<0..18446744073709551616>, expectedStatus: Uint<0..256>, nextStatus: Uint<0..256>, effectiveAt: Uint<0..18446744073709551616>, commandNonce: Bytes<32>>',
                                     command_0)
        }
        if (!(typeof(signature_0) === 'object' && true && typeof(signature_0.response) === 'bigint' && signature_0.response >= 0 && signature_0.response <= __compactRuntime.MAX_FIELD)) {
          __compactRuntime.typeError('updateRuntimeCredentialStatus',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'permio-authorization.compact line 1967 char 1',
                                     'struct SchnorrSignature<announcement: Opaque<"JubjubPoint">, response: Field>',
                                     signature_0)
        }
        if (!(typeof(namespaceAuthority_0) === 'object' && typeof(namespaceAuthority_0.leafVersion) === 'bigint' && namespaceAuthority_0.leafVersion >= 0n && namespaceAuthority_0.leafVersion <= 65535n && namespaceAuthority_0.namespaceHash.buffer instanceof ArrayBuffer && namespaceAuthority_0.namespaceHash.BYTES_PER_ELEMENT === 1 && namespaceAuthority_0.namespaceHash.length === 32 && namespaceAuthority_0.governancePolicyHash.buffer instanceof ArrayBuffer && namespaceAuthority_0.governancePolicyHash.BYTES_PER_ELEMENT === 1 && namespaceAuthority_0.governancePolicyHash.length === 32 && typeof(namespaceAuthority_0.authorityKind) === 'bigint' && namespaceAuthority_0.authorityKind >= 0n && namespaceAuthority_0.authorityKind <= 65535n && true && typeof(namespaceAuthority_0.validAfter) === 'bigint' && namespaceAuthority_0.validAfter >= 0n && namespaceAuthority_0.validAfter <= 18446744073709551615n && typeof(namespaceAuthority_0.validBefore) === 'bigint' && namespaceAuthority_0.validBefore >= 0n && namespaceAuthority_0.validBefore <= 18446744073709551615n)) {
          __compactRuntime.typeError('updateRuntimeCredentialStatus',
                                     'argument 3 (argument 4 as invoked from Typescript)',
                                     'permio-authorization.compact line 1967 char 1',
                                     'struct GovernanceActivatorLeaf<leafVersion: Uint<0..65536>, namespaceHash: Bytes<32>, governancePolicyHash: Bytes<32>, authorityKind: Uint<0..65536>, publicKey: Opaque<"JubjubPoint">, validAfter: Uint<0..18446744073709551616>, validBefore: Uint<0..18446744073709551616>>',
                                     namespaceAuthority_0)
        }
        if (!(typeof(namespaceAuthorityPath_0) === 'object' && namespaceAuthorityPath_0.leaf.buffer instanceof ArrayBuffer && namespaceAuthorityPath_0.leaf.BYTES_PER_ELEMENT === 1 && namespaceAuthorityPath_0.leaf.length === 32 && Array.isArray(namespaceAuthorityPath_0.path) && namespaceAuthorityPath_0.path.length === 20 && namespaceAuthorityPath_0.path.every((t) => typeof(t) === 'object' && typeof(t.sibling) === 'object' && typeof(t.sibling.field) === 'bigint' && t.sibling.field >= 0 && t.sibling.field <= __compactRuntime.MAX_FIELD && typeof(t.goes_left) === 'boolean'))) {
          __compactRuntime.typeError('updateRuntimeCredentialStatus',
                                     'argument 4 (argument 5 as invoked from Typescript)',
                                     'permio-authorization.compact line 1967 char 1',
                                     'struct MerkleTreePath<leaf: Bytes<32>, path: Vector<20, struct MerkleTreePathEntry<sibling: struct MerkleTreeDigest<field: Field>, goes_left: Boolean>>>',
                                     namespaceAuthorityPath_0)
        }
        if (!(typeof(accountAuthority_0) === 'object' && typeof(accountAuthority_0.credentialVersion) === 'bigint' && accountAuthority_0.credentialVersion >= 0n && accountAuthority_0.credentialVersion <= 65535n && typeof(accountAuthority_0.target) === 'object' && accountAuthority_0.target.namespaceHash.buffer instanceof ArrayBuffer && accountAuthority_0.target.namespaceHash.BYTES_PER_ELEMENT === 1 && accountAuthority_0.target.namespaceHash.length === 32 && accountAuthority_0.target.templateIdHash.buffer instanceof ArrayBuffer && accountAuthority_0.target.templateIdHash.BYTES_PER_ELEMENT === 1 && accountAuthority_0.target.templateIdHash.length === 32 && typeof(accountAuthority_0.target.semanticVersion) === 'object' && typeof(accountAuthority_0.target.semanticVersion.major) === 'bigint' && accountAuthority_0.target.semanticVersion.major >= 0n && accountAuthority_0.target.semanticVersion.major <= 18446744073709551615n && typeof(accountAuthority_0.target.semanticVersion.minor) === 'bigint' && accountAuthority_0.target.semanticVersion.minor >= 0n && accountAuthority_0.target.semanticVersion.minor <= 18446744073709551615n && typeof(accountAuthority_0.target.semanticVersion.patch) === 'bigint' && accountAuthority_0.target.semanticVersion.patch >= 0n && accountAuthority_0.target.semanticVersion.patch <= 18446744073709551615n && accountAuthority_0.target.templateContentHash.buffer instanceof ArrayBuffer && accountAuthority_0.target.templateContentHash.BYTES_PER_ELEMENT === 1 && accountAuthority_0.target.templateContentHash.length === 32 && accountAuthority_0.instanceCommitment.buffer instanceof ArrayBuffer && accountAuthority_0.instanceCommitment.BYTES_PER_ELEMENT === 1 && accountAuthority_0.instanceCommitment.length === 32 && accountAuthority_0.contextHash.buffer instanceof ArrayBuffer && accountAuthority_0.contextHash.BYTES_PER_ELEMENT === 1 && accountAuthority_0.contextHash.length === 32 && accountAuthority_0.accountIdHash.buffer instanceof ArrayBuffer && accountAuthority_0.accountIdHash.BYTES_PER_ELEMENT === 1 && accountAuthority_0.accountIdHash.length === 32 && typeof(accountAuthority_0.principalKind) === 'bigint' && accountAuthority_0.principalKind >= 0n && accountAuthority_0.principalKind <= 65535n && accountAuthority_0.m5AccountCommitment.buffer instanceof ArrayBuffer && accountAuthority_0.m5AccountCommitment.BYTES_PER_ELEMENT === 1 && accountAuthority_0.m5AccountCommitment.length === 32 && true && typeof(accountAuthority_0.statusIndex) === 'bigint' && accountAuthority_0.statusIndex >= 0n && accountAuthority_0.statusIndex <= 18446744073709551615n && typeof(accountAuthority_0.issuedAt) === 'bigint' && accountAuthority_0.issuedAt >= 0n && accountAuthority_0.issuedAt <= 18446744073709551615n && typeof(accountAuthority_0.validBefore) === 'bigint' && accountAuthority_0.validBefore >= 0n && accountAuthority_0.validBefore <= 18446744073709551615n)) {
          __compactRuntime.typeError('updateRuntimeCredentialStatus',
                                     'argument 5 (argument 6 as invoked from Typescript)',
                                     'permio-authorization.compact line 1967 char 1',
                                     'struct RuntimeAccountCredential<credentialVersion: Uint<0..65536>, target: struct TemplateRegistryTarget<namespaceHash: Bytes<32>, templateIdHash: Bytes<32>, semanticVersion: struct SemanticVersion<major: Uint<0..18446744073709551616>, minor: Uint<0..18446744073709551616>, patch: Uint<0..18446744073709551616>>, templateContentHash: Bytes<32>>, instanceCommitment: Bytes<32>, contextHash: Bytes<32>, accountIdHash: Bytes<32>, principalKind: Uint<0..65536>, m5AccountCommitment: Bytes<32>, runtimePublicKey: Opaque<"JubjubPoint">, statusIndex: Uint<0..18446744073709551616>, issuedAt: Uint<0..18446744073709551616>, validBefore: Uint<0..18446744073709551616>>',
                                     accountAuthority_0)
        }
        if (!(typeof(accountAuthorityStatusPath_0) === 'object' && accountAuthorityStatusPath_0.leaf.buffer instanceof ArrayBuffer && accountAuthorityStatusPath_0.leaf.BYTES_PER_ELEMENT === 1 && accountAuthorityStatusPath_0.leaf.length === 32 && Array.isArray(accountAuthorityStatusPath_0.path) && accountAuthorityStatusPath_0.path.length === 20 && accountAuthorityStatusPath_0.path.every((t) => typeof(t) === 'object' && typeof(t.sibling) === 'object' && typeof(t.sibling.field) === 'bigint' && t.sibling.field >= 0 && t.sibling.field <= __compactRuntime.MAX_FIELD && typeof(t.goes_left) === 'boolean'))) {
          __compactRuntime.typeError('updateRuntimeCredentialStatus',
                                     'argument 6 (argument 7 as invoked from Typescript)',
                                     'permio-authorization.compact line 1967 char 1',
                                     'struct MerkleTreePath<leaf: Bytes<32>, path: Vector<20, struct MerkleTreePathEntry<sibling: struct MerkleTreeDigest<field: Field>, goes_left: Boolean>>>',
                                     accountAuthorityStatusPath_0)
        }
        if (!(typeof(currentStatusPath_0) === 'object' && currentStatusPath_0.leaf.buffer instanceof ArrayBuffer && currentStatusPath_0.leaf.BYTES_PER_ELEMENT === 1 && currentStatusPath_0.leaf.length === 32 && Array.isArray(currentStatusPath_0.path) && currentStatusPath_0.path.length === 20 && currentStatusPath_0.path.every((t) => typeof(t) === 'object' && typeof(t.sibling) === 'object' && typeof(t.sibling.field) === 'bigint' && t.sibling.field >= 0 && t.sibling.field <= __compactRuntime.MAX_FIELD && typeof(t.goes_left) === 'boolean'))) {
          __compactRuntime.typeError('updateRuntimeCredentialStatus',
                                     'argument 7 (argument 8 as invoked from Typescript)',
                                     'permio-authorization.compact line 1967 char 1',
                                     'struct MerkleTreePath<leaf: Bytes<32>, path: Vector<20, struct MerkleTreePathEntry<sibling: struct MerkleTreeDigest<field: Field>, goes_left: Boolean>>>',
                                     currentStatusPath_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_9.toValue(command_0).concat(_descriptor_11.toValue(signature_0).concat(_descriptor_12.toValue(namespaceAuthority_0).concat(_descriptor_15.toValue(namespaceAuthorityPath_0).concat(_descriptor_18.toValue(accountAuthority_0).concat(_descriptor_15.toValue(accountAuthorityStatusPath_0).concat(_descriptor_15.toValue(currentStatusPath_0))))))),
            alignment: _descriptor_9.alignment().concat(_descriptor_11.alignment().concat(_descriptor_12.alignment().concat(_descriptor_15.alignment().concat(_descriptor_18.alignment().concat(_descriptor_15.alignment().concat(_descriptor_15.alignment()))))))
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._updateRuntimeCredentialStatus_0(context,
                                                               partialProofData,
                                                               command_0,
                                                               signature_0,
                                                               namespaceAuthority_0,
                                                               namespaceAuthorityPath_0,
                                                               accountAuthority_0,
                                                               accountAuthorityStatusPath_0,
                                                               currentStatusPath_0);
        partialProofData.output = { value: _descriptor_3.toValue(result_0), alignment: _descriptor_3.alignment() };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      }
    };
    this.impureCircuits = {
      verifyGovernanceActivationSignature: this.circuits.verifyGovernanceActivationSignature,
      submitAuthorityRootApproval: this.circuits.submitAuthorityRootApproval,
      proposeProofModule: this.circuits.proposeProofModule,
      reviewProofModule: this.circuits.reviewProofModule,
      governProofModule: this.circuits.governProofModule,
      terminateTemplate: this.circuits.terminateTemplate,
      beginM4Activation: this.circuits.beginM4Activation,
      stageM4ActivationBinding: this.circuits.stageM4ActivationBinding,
      finalizeM4Activation: this.circuits.finalizeM4Activation,
      updateRuntimeCredentialStatus: this.circuits.updateRuntimeCredentialStatus
    };
    this.provableCircuits = {
      submitAuthorityRootApproval: this.circuits.submitAuthorityRootApproval,
      proposeProofModule: this.circuits.proposeProofModule,
      reviewProofModule: this.circuits.reviewProofModule,
      governProofModule: this.circuits.governProofModule,
      terminateTemplate: this.circuits.terminateTemplate,
      beginM4Activation: this.circuits.beginM4Activation,
      stageM4ActivationBinding: this.circuits.stageM4ActivationBinding,
      finalizeM4Activation: this.circuits.finalizeM4Activation,
      updateRuntimeCredentialStatus: this.circuits.updateRuntimeCredentialStatus
    };
  }
  initialState(...args_0) {
    if (args_0.length !== 11) {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 11 arguments (as invoked from Typescript), received ${args_0.length}`);
    }
    const constructorContext_0 = args_0[0];
    const networkHash_0 = args_0[1];
    const initialNamespaceHash_0 = args_0[2];
    const initialGovernancePolicyHash_0 = args_0[3];
    const initialAuthorityRoot_0 = args_0[4];
    const initialRootVersion_0 = args_0[5];
    const initialRootSequence_0 = args_0[6];
    const initialCredentialStatusRoot_0 = args_0[7];
    const moduleReviewThreshold_0 = args_0[8];
    const moduleApprovalThreshold_0 = args_0[9];
    const authorityRootUpdateThreshold_0 = args_0[10];
    if (typeof(constructorContext_0) !== 'object') {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 'constructorContext' in argument 1 (as invoked from Typescript) to be an object`);
    }
    if (!('initialPrivateState' in constructorContext_0)) {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 'initialPrivateState' in argument 1 (as invoked from Typescript)`);
    }
    if (!('initialZswapLocalState' in constructorContext_0)) {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 'initialZswapLocalState' in argument 1 (as invoked from Typescript)`);
    }
    if (typeof(constructorContext_0.initialZswapLocalState) !== 'object') {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 'initialZswapLocalState' in argument 1 (as invoked from Typescript) to be an object`);
    }
    if (!(networkHash_0.buffer instanceof ArrayBuffer && networkHash_0.BYTES_PER_ELEMENT === 1 && networkHash_0.length === 32)) {
      __compactRuntime.typeError('Contract state constructor',
                                 'argument 1 (argument 2 as invoked from Typescript)',
                                 'permio-authorization.compact line 431 char 1',
                                 'Bytes<32>',
                                 networkHash_0)
    }
    if (!(initialNamespaceHash_0.buffer instanceof ArrayBuffer && initialNamespaceHash_0.BYTES_PER_ELEMENT === 1 && initialNamespaceHash_0.length === 32)) {
      __compactRuntime.typeError('Contract state constructor',
                                 'argument 2 (argument 3 as invoked from Typescript)',
                                 'permio-authorization.compact line 431 char 1',
                                 'Bytes<32>',
                                 initialNamespaceHash_0)
    }
    if (!(initialGovernancePolicyHash_0.buffer instanceof ArrayBuffer && initialGovernancePolicyHash_0.BYTES_PER_ELEMENT === 1 && initialGovernancePolicyHash_0.length === 32)) {
      __compactRuntime.typeError('Contract state constructor',
                                 'argument 3 (argument 4 as invoked from Typescript)',
                                 'permio-authorization.compact line 431 char 1',
                                 'Bytes<32>',
                                 initialGovernancePolicyHash_0)
    }
    if (!(typeof(initialAuthorityRoot_0) === 'object' && typeof(initialAuthorityRoot_0.field) === 'bigint' && initialAuthorityRoot_0.field >= 0 && initialAuthorityRoot_0.field <= __compactRuntime.MAX_FIELD)) {
      __compactRuntime.typeError('Contract state constructor',
                                 'argument 4 (argument 5 as invoked from Typescript)',
                                 'permio-authorization.compact line 431 char 1',
                                 'struct MerkleTreeDigest<field: Field>',
                                 initialAuthorityRoot_0)
    }
    if (!(typeof(initialRootVersion_0) === 'bigint' && initialRootVersion_0 >= 0n && initialRootVersion_0 <= 18446744073709551615n)) {
      __compactRuntime.typeError('Contract state constructor',
                                 'argument 5 (argument 6 as invoked from Typescript)',
                                 'permio-authorization.compact line 431 char 1',
                                 'Uint<0..18446744073709551616>',
                                 initialRootVersion_0)
    }
    if (!(typeof(initialRootSequence_0) === 'bigint' && initialRootSequence_0 >= 0n && initialRootSequence_0 <= 18446744073709551615n)) {
      __compactRuntime.typeError('Contract state constructor',
                                 'argument 6 (argument 7 as invoked from Typescript)',
                                 'permio-authorization.compact line 431 char 1',
                                 'Uint<0..18446744073709551616>',
                                 initialRootSequence_0)
    }
    if (!(typeof(initialCredentialStatusRoot_0) === 'object' && typeof(initialCredentialStatusRoot_0.field) === 'bigint' && initialCredentialStatusRoot_0.field >= 0 && initialCredentialStatusRoot_0.field <= __compactRuntime.MAX_FIELD)) {
      __compactRuntime.typeError('Contract state constructor',
                                 'argument 7 (argument 8 as invoked from Typescript)',
                                 'permio-authorization.compact line 431 char 1',
                                 'struct MerkleTreeDigest<field: Field>',
                                 initialCredentialStatusRoot_0)
    }
    if (!(typeof(moduleReviewThreshold_0) === 'bigint' && moduleReviewThreshold_0 >= 0n && moduleReviewThreshold_0 <= 65535n)) {
      __compactRuntime.typeError('Contract state constructor',
                                 'argument 8 (argument 9 as invoked from Typescript)',
                                 'permio-authorization.compact line 431 char 1',
                                 'Uint<0..65536>',
                                 moduleReviewThreshold_0)
    }
    if (!(typeof(moduleApprovalThreshold_0) === 'bigint' && moduleApprovalThreshold_0 >= 0n && moduleApprovalThreshold_0 <= 65535n)) {
      __compactRuntime.typeError('Contract state constructor',
                                 'argument 9 (argument 10 as invoked from Typescript)',
                                 'permio-authorization.compact line 431 char 1',
                                 'Uint<0..65536>',
                                 moduleApprovalThreshold_0)
    }
    if (!(typeof(authorityRootUpdateThreshold_0) === 'bigint' && authorityRootUpdateThreshold_0 >= 0n && authorityRootUpdateThreshold_0 <= 65535n)) {
      __compactRuntime.typeError('Contract state constructor',
                                 'argument 10 (argument 11 as invoked from Typescript)',
                                 'permio-authorization.compact line 431 char 1',
                                 'Uint<0..65536>',
                                 authorityRootUpdateThreshold_0)
    }
    const state_0 = new __compactRuntime.ContractState();
    let stateValue_0 = __compactRuntime.StateValue.newArray();
    let stateValue_2 = __compactRuntime.StateValue.newArray();
    stateValue_2 = stateValue_2.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_2 = stateValue_2.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_2 = stateValue_2.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(stateValue_2);
    let stateValue_1 = __compactRuntime.StateValue.newArray();
    stateValue_1 = stateValue_1.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_1 = stateValue_1.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_1 = stateValue_1.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_1 = stateValue_1.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_1 = stateValue_1.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_1 = stateValue_1.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_1 = stateValue_1.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_1 = stateValue_1.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_1 = stateValue_1.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_1 = stateValue_1.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_1 = stateValue_1.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_1 = stateValue_1.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_1 = stateValue_1.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_1 = stateValue_1.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_1 = stateValue_1.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(stateValue_1);
    state_0.data = new __compactRuntime.ChargedState(stateValue_0);
    state_0.setOperation('submitAuthorityRootApproval', new __compactRuntime.ContractOperation());
    state_0.setOperation('proposeProofModule', new __compactRuntime.ContractOperation());
    state_0.setOperation('reviewProofModule', new __compactRuntime.ContractOperation());
    state_0.setOperation('governProofModule', new __compactRuntime.ContractOperation());
    state_0.setOperation('terminateTemplate', new __compactRuntime.ContractOperation());
    state_0.setOperation('beginM4Activation', new __compactRuntime.ContractOperation());
    state_0.setOperation('stageM4ActivationBinding', new __compactRuntime.ContractOperation());
    state_0.setOperation('finalizeM4Activation', new __compactRuntime.ContractOperation());
    state_0.setOperation('updateRuntimeCredentialStatus', new __compactRuntime.ContractOperation());
    const context = __compactRuntime.createCircuitContext(__compactRuntime.dummyContractAddress(), constructorContext_0.initialZswapLocalState.coinPublicKey, state_0.data, constructorContext_0.initialPrivateState);
    const partialProofData = {
      input: { value: [], alignment: [] },
      output: undefined,
      publicTranscript: [],
      privateTranscriptOutputs: []
    };
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_8.toValue(0n),
                                                                  alignment: _descriptor_8.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_8.toValue(0n),
                                                                                              alignment: _descriptor_8.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(new Uint8Array(32)),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_8.toValue(0n),
                                                                  alignment: _descriptor_8.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_8.toValue(1n),
                                                                                              alignment: _descriptor_8.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newMap(
                                                          new __compactRuntime.StateMap()
                                                        ).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_8.toValue(0n),
                                                                  alignment: _descriptor_8.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_8.toValue(2n),
                                                                                              alignment: _descriptor_8.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newMap(
                                                          new __compactRuntime.StateMap()
                                                        ).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_8.toValue(1n),
                                                                  alignment: _descriptor_8.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_8.toValue(0n),
                                                                                              alignment: _descriptor_8.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newMap(
                                                          new __compactRuntime.StateMap()
                                                        ).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_8.toValue(1n),
                                                                  alignment: _descriptor_8.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_8.toValue(1n),
                                                                                              alignment: _descriptor_8.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newMap(
                                                          new __compactRuntime.StateMap()
                                                        ).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_8.toValue(1n),
                                                                  alignment: _descriptor_8.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_8.toValue(2n),
                                                                                              alignment: _descriptor_8.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_3.toValue(0n),
                                                                                              alignment: _descriptor_3.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_8.toValue(1n),
                                                                  alignment: _descriptor_8.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_8.toValue(3n),
                                                                                              alignment: _descriptor_8.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newMap(
                                                          new __compactRuntime.StateMap()
                                                        ).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_8.toValue(1n),
                                                                  alignment: _descriptor_8.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_8.toValue(4n),
                                                                                              alignment: _descriptor_8.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newMap(
                                                          new __compactRuntime.StateMap()
                                                        ).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_8.toValue(1n),
                                                                  alignment: _descriptor_8.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_8.toValue(5n),
                                                                                              alignment: _descriptor_8.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newMap(
                                                          new __compactRuntime.StateMap()
                                                        ).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_8.toValue(1n),
                                                                  alignment: _descriptor_8.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_8.toValue(6n),
                                                                                              alignment: _descriptor_8.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newMap(
                                                          new __compactRuntime.StateMap()
                                                        ).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_8.toValue(1n),
                                                                  alignment: _descriptor_8.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_8.toValue(7n),
                                                                                              alignment: _descriptor_8.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newMap(
                                                          new __compactRuntime.StateMap()
                                                        ).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_8.toValue(1n),
                                                                  alignment: _descriptor_8.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_8.toValue(8n),
                                                                                              alignment: _descriptor_8.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newMap(
                                                          new __compactRuntime.StateMap()
                                                        ).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_8.toValue(1n),
                                                                  alignment: _descriptor_8.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_8.toValue(9n),
                                                                                              alignment: _descriptor_8.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newMap(
                                                          new __compactRuntime.StateMap()
                                                        ).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_8.toValue(1n),
                                                                  alignment: _descriptor_8.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_8.toValue(10n),
                                                                                              alignment: _descriptor_8.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_3.toValue(0n),
                                                                                              alignment: _descriptor_3.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_8.toValue(1n),
                                                                  alignment: _descriptor_8.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_8.toValue(11n),
                                                                                              alignment: _descriptor_8.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_3.toValue(0n),
                                                                                              alignment: _descriptor_3.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_8.toValue(1n),
                                                                  alignment: _descriptor_8.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_8.toValue(12n),
                                                                                              alignment: _descriptor_8.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newMap(
                                                          new __compactRuntime.StateMap()
                                                        ).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_8.toValue(1n),
                                                                  alignment: _descriptor_8.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_8.toValue(13n),
                                                                                              alignment: _descriptor_8.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newMap(
                                                          new __compactRuntime.StateMap()
                                                        ).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_8.toValue(1n),
                                                                  alignment: _descriptor_8.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_8.toValue(14n),
                                                                                              alignment: _descriptor_8.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newMap(
                                                          new __compactRuntime.StateMap()
                                                        ).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_8.toValue(0n),
                                                                  alignment: _descriptor_8.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_8.toValue(0n),
                                                                                              alignment: _descriptor_8.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(networkHash_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    const tmp_0 = { governancePolicyHash: initialGovernancePolicyHash_0,
                    root: initialAuthorityRoot_0,
                    rootVersion: initialRootVersion_0,
                    rootSequence: initialRootSequence_0,
                    moduleReviewThreshold: moduleReviewThreshold_0,
                    moduleApprovalThreshold: moduleApprovalThreshold_0,
                    authorityRootUpdateThreshold: authorityRootUpdateThreshold_0 };
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_8.toValue(0n),
                                                                  alignment: _descriptor_8.alignment() } },
                                                       { tag: 'value',
                                                         value: { value: _descriptor_8.toValue(1n),
                                                                  alignment: _descriptor_8.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(initialNamespaceHash_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_5.toValue(tmp_0),
                                                                                              alignment: _descriptor_5.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 2 } }]);
    const tmp_1 = { root: initialCredentialStatusRoot_0, rootSequence: 0n };
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_8.toValue(1n),
                                                                  alignment: _descriptor_8.alignment() } },
                                                       { tag: 'value',
                                                         value: { value: _descriptor_8.toValue(13n),
                                                                  alignment: _descriptor_8.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(initialNamespaceHash_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_7.toValue(tmp_1),
                                                                                              alignment: _descriptor_7.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 2 } }]);
    __compactRuntime.assert(moduleReviewThreshold_0 >= 2n,
                            'Module review threshold must be at least two');
    __compactRuntime.assert(moduleApprovalThreshold_0 >= 2n,
                            'Module approval threshold must be at least two');
    __compactRuntime.assert(authorityRootUpdateThreshold_0 >= 2n,
                            'Authority-root update threshold must be at least two');
    state_0.data = new __compactRuntime.ChargedState(context.currentQueryContext.state.state);
    return {
      currentContractState: state_0,
      currentPrivateState: context.currentPrivateState,
      currentZswapLocalState: context.currentZswapLocalState
    }
  }
  _merkleTreePathRoot_0(path_0) {
    return { field:
               this._folder_0((...args_0) =>
                                this._merkleTreePathEntryRoot_0(...args_0),
                              this._degradeToTransient_0(this._persistentHash_25({ domain_sep:
                                                                                     new Uint8Array([109, 100, 110, 58, 108, 104]),
                                                                                   data:
                                                                                     path_0.leaf })),
                              path_0.path) };
  }
  _merkleTreePathRoot_1(path_0) {
    return { field:
               this._folder_1((...args_0) =>
                                this._merkleTreePathEntryRoot_0(...args_0),
                              this._degradeToTransient_0(this._persistentHash_6({ domain_sep:
                                                                                    new Uint8Array([109, 100, 110, 58, 108, 104]),
                                                                                  data:
                                                                                    path_0.leaf })),
                              path_0.path) };
  }
  _merkleTreePathRoot_2(path_0) {
    return { field:
               this._folder_2((...args_0) =>
                                this._merkleTreePathEntryRoot_0(...args_0),
                              this._degradeToTransient_0(this._persistentHash_25({ domain_sep:
                                                                                     new Uint8Array([109, 100, 110, 58, 108, 104]),
                                                                                   data:
                                                                                     path_0.leaf })),
                              path_0.path) };
  }
  _merkleTreePathEntryRoot_0(recursiveDigest_0, entry_0) {
    const left_0 = entry_0.goes_left ? recursiveDigest_0 : entry_0.sibling.field;
    const right_0 = entry_0.goes_left ?
                    entry_0.sibling.field :
                    recursiveDigest_0;
    return this._transientHash_10([left_0, right_0]);
  }
  _blockTimeLt_0(context, partialProofData, time_0) {
    return _descriptor_6.fromValue(__compactRuntime.queryLedgerState(context,
                                                                     partialProofData,
                                                                     [
                                                                      { dup: { n: 2 } },
                                                                      { idx: { cached: true,
                                                                               pushPath: false,
                                                                               path: [
                                                                                      { tag: 'value',
                                                                                        value: { value: _descriptor_8.toValue(2n),
                                                                                                 alignment: _descriptor_8.alignment() } }] } },
                                                                      { push: { storage: false,
                                                                                value: __compactRuntime.StateValue.newCell({ value: _descriptor_3.toValue(time_0),
                                                                                                                             alignment: _descriptor_3.alignment() }).encode() } },
                                                                      'lt',
                                                                      { popeq: { cached: true,
                                                                                 result: undefined } }]).value);
  }
  _blockTimeGte_0(context, partialProofData, time_0) {
    return !this._blockTimeLt_0(context, partialProofData, time_0);
  }
  _transientHash_0(value_0) {
    const result_0 = __compactRuntime.transientHash(_descriptor_25, value_0);
    return result_0;
  }
  _transientHash_1(value_0) {
    const result_0 = __compactRuntime.transientHash(_descriptor_35, value_0);
    return result_0;
  }
  _transientHash_2(value_0) {
    const result_0 = __compactRuntime.transientHash(_descriptor_27, value_0);
    return result_0;
  }
  _transientHash_3(value_0) {
    const result_0 = __compactRuntime.transientHash(_descriptor_9, value_0);
    return result_0;
  }
  _transientHash_4(value_0) {
    const result_0 = __compactRuntime.transientHash(_descriptor_18, value_0);
    return result_0;
  }
  _transientHash_5(value_0) {
    const result_0 = __compactRuntime.transientHash(_descriptor_40, value_0);
    return result_0;
  }
  _transientHash_6(value_0) {
    const result_0 = __compactRuntime.transientHash(_descriptor_38, value_0);
    return result_0;
  }
  _transientHash_7(value_0) {
    const result_0 = __compactRuntime.transientHash(_descriptor_39, value_0);
    return result_0;
  }
  _transientHash_8(value_0) {
    const result_0 = __compactRuntime.transientHash(_descriptor_32, value_0);
    return result_0;
  }
  _transientHash_9(value_0) {
    const result_0 = __compactRuntime.transientHash(_descriptor_29, value_0);
    return result_0;
  }
  _transientHash_10(value_0) {
    const result_0 = __compactRuntime.transientHash(_descriptor_60, value_0);
    return result_0;
  }
  _transientHash_11(value_0) {
    const result_0 = __compactRuntime.transientHash(_descriptor_59, value_0);
    return result_0;
  }
  _persistentHash_0(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_25, value_0);
    return result_0;
  }
  _persistentHash_1(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_12, value_0);
    return result_0;
  }
  _persistentHash_2(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_35, value_0);
    return result_0;
  }
  _persistentHash_3(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_18, value_0);
    return result_0;
  }
  _persistentHash_4(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_0, value_0);
    return result_0;
  }
  _persistentHash_5(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_45, value_0);
    return result_0;
  }
  _persistentHash_6(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_58, value_0);
    return result_0;
  }
  _persistentHash_7(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_40, value_0);
    return result_0;
  }
  _persistentHash_8(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_38, value_0);
    return result_0;
  }
  _persistentHash_9(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_39, value_0);
    return result_0;
  }
  _persistentHash_10(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_24, value_0);
    return result_0;
  }
  _persistentHash_11(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_23, value_0);
    return result_0;
  }
  _persistentHash_12(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_30, value_0);
    return result_0;
  }
  _persistentHash_13(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_32, value_0);
    return result_0;
  }
  _persistentHash_14(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_21, value_0);
    return result_0;
  }
  _persistentHash_15(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_56, value_0);
    return result_0;
  }
  _persistentHash_16(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_57, value_0);
    return result_0;
  }
  _persistentHash_17(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_54, value_0);
    return result_0;
  }
  _persistentHash_18(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_55, value_0);
    return result_0;
  }
  _persistentHash_19(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_22, value_0);
    return result_0;
  }
  _persistentHash_20(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_53, value_0);
    return result_0;
  }
  _persistentHash_21(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_29, value_0);
    return result_0;
  }
  _persistentHash_22(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_52, value_0);
    return result_0;
  }
  _persistentHash_23(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_51, value_0);
    return result_0;
  }
  _persistentHash_24(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_17, value_0);
    return result_0;
  }
  _persistentHash_25(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_50, value_0);
    return result_0;
  }
  _degradeToTransient_0(x_0) {
    const result_0 = __compactRuntime.degradeToTransient(x_0);
    return result_0;
  }
  _jubjubPointX_0(np_0) {
    const result_0 = __compactRuntime.jubjubPointX(np_0);
    return result_0;
  }
  _jubjubPointY_0(np_0) {
    const result_0 = __compactRuntime.jubjubPointY(np_0);
    return result_0;
  }
  _ecAdd_0(a_0, b_0) {
    const result_0 = __compactRuntime.ecAdd(a_0, b_0);
    return result_0;
  }
  _ecMul_0(a_0, b_0) {
    const result_0 = __compactRuntime.ecMul(a_0, b_0);
    return result_0;
  }
  _ecMulGenerator_0(b_0) {
    const result_0 = __compactRuntime.ecMulGenerator(b_0);
    return result_0;
  }
  _getSchnorrReduction_0(context, partialProofData, challengeHash_0) {
    const witnessContext_0 = __compactRuntime.createWitnessContext(ledger(context.currentQueryContext.state), context.currentPrivateState, context.currentQueryContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.getSchnorrReduction(witnessContext_0,
                                                                              challengeHash_0);
    context.currentPrivateState = nextPrivateState_0;
    if (!(Array.isArray(result_0) && result_0.length === 2  && typeof(result_0[0]) === 'bigint' && result_0[0] >= 0n && result_0[0] <= 127n && typeof(result_0[1]) === 'bigint' && result_0[1] >= 0n && result_0[1] <= 452312848583266388373324160190187140051835877600158453279131187530910662655n)) {
      __compactRuntime.typeError('getSchnorrReduction',
                                 'return value',
                                 'schnorr.compact line 19 char 5',
                                 '[Uint<0..128>, Uint<0..452312848583266388373324160190187140051835877600158453279131187530910662656>]',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_48.toValue(result_0),
      alignment: _descriptor_48.alignment()
    });
    return result_0;
  }
  _schnorrVerify_0(context, partialProofData, msg_0, signature_0, publicKey_0) {
    const __compact_pattern_tmp2_0 = signature_0;
    const announcement_0 = __compact_pattern_tmp2_0.announcement;
    const response_0 = __compact_pattern_tmp2_0.response;
    __compactRuntime.assert(!(this._jubjubPointX_0(publicKey_0) === 0n
                              &&
                              this._jubjubPointY_0(publicKey_0) === 1n),
                            'Governance activation public key must not be the identity point');
    const fullChallenge_0 = this._transientHash_11({ ann_x:
                                                       this._jubjubPointX_0(announcement_0),
                                                     ann_y:
                                                       this._jubjubPointY_0(announcement_0),
                                                     pk_x:
                                                       this._jubjubPointX_0(publicKey_0),
                                                     pk_y:
                                                       this._jubjubPointY_0(publicKey_0),
                                                     msg: msg_0 });
    const TWO_248_0 = 452312848583266388373324160190187140051835877600158453279131187530910662656n;
    const __compact_pattern_tmp1_0 = this._getSchnorrReduction_0(context,
                                                                 partialProofData,
                                                                 fullChallenge_0);
    const quotient_0 = __compact_pattern_tmp1_0[0];
    const truncatedChallenge_0 = __compact_pattern_tmp1_0[1];
    let t_0;
    __compactRuntime.assert((t_0 = quotient_0, t_0 < 116n),
                            'Schnorr quotient out of range');
    __compactRuntime.assert(__compactRuntime.addField(__compactRuntime.mulField(quotient_0,
                                                                                TWO_248_0),
                                                      truncatedChallenge_0)
                            ===
                            fullChallenge_0,
                            'Invalid Schnorr challenge reduction');
    const challenge_0 = truncatedChallenge_0;
    const expected_0 = this._ecAdd_0(announcement_0,
                                     this._ecMul_0(publicKey_0, challenge_0));
    const actual_0 = this._ecMulGenerator_0(response_0);
    __compactRuntime.assert(this._jubjubPointX_0(actual_0)
                            ===
                            this._jubjubPointX_0(expected_0)
                            &&
                            this._jubjubPointY_0(actual_0)
                            ===
                            this._jubjubPointY_0(expected_0),
                            'Invalid governance activation signature');
    return [];
  }
  _schnorrChallenge_0(ann_x_0, ann_y_0, pk_x_0, pk_y_0, msg_0) {
    return this._transientHash_11({ ann_x: ann_x_0,
                                    ann_y: ann_y_0,
                                    pk_x: pk_x_0,
                                    pk_y: pk_y_0,
                                    msg: msg_0 });
  }
  _activationAdmissionMessage_0(envelope_0) {
    return [this._transientHash_0(envelope_0)];
  }
  _activationAdmissionEnvelopeCommitment_0(envelope_0) {
    return this._persistentHash_0(envelope_0);
  }
  _governanceActivatorLeafCommitment_0(leaf_0) {
    return this._persistentHash_1(leaf_0);
  }
  _authorityRootUpdateCommandCommitment_0(command_0) {
    return this._persistentHash_2(command_0);
  }
  _authorityRootUpdateCommandMessage_0(command_0) {
    return [this._transientHash_1(command_0)];
  }
  _templateLifecycleCommandMessage_0(command_0) {
    return [this._transientHash_2(command_0)];
  }
  _runtimeAccountCredentialCommitment_0(credential_0) {
    return this._persistentHash_3(credential_0);
  }
  _runtimeScopeValueCommitment_0(valueHash_0) {
    return this._persistentHash_4(valueHash_0);
  }
  _runtimeCredentialStatusLeafCommitment_0(leaf_0) {
    return this._persistentHash_5(leaf_0);
  }
  _runtimeCredentialStatusPathRoot_0(path_0) {
    return this._merkleTreePathRoot_2(path_0);
  }
  _runtimeCredentialStatusLeafParent_0(path_0) {
    return this._merkleTreePathRoot_0(path_0);
  }
  _runtimeCredentialStatusNodeParent_0(path_0) {
    return this._merkleTreePathRoot_1(path_0);
  }
  _runtimeCredentialStatusCommandMessage_0(command_0) {
    return [this._transientHash_3(command_0)];
  }
  _runtimeCapabilityCredentialCommitment_0(credential_0) {
    return this._persistentHash_7(credential_0);
  }
  _runtimeSessionCredentialCommitment_0(credential_0) {
    return this._persistentHash_8(credential_0);
  }
  _runtimeActionIntentCommitment_0(intent_0) {
    return this._persistentHash_9(intent_0);
  }
  _runtimeAccountCredentialMessage_0(credential_0) {
    return [this._transientHash_4(credential_0)];
  }
  _runtimeCapabilityCredentialMessage_0(credential_0) {
    return [this._transientHash_5(credential_0)];
  }
  _runtimeSessionCredentialMessage_0(credential_0) {
    return [this._transientHash_6(credential_0)];
  }
  _runtimeActionIntentMessage_0(intent_0) {
    return [this._transientHash_7(intent_0)];
  }
  _activeTemplateRecordCommitment_0(record_0) {
    return this._persistentHash_10(record_0);
  }
  _proofModuleBindingCommitment_0(binding_0) {
    return this._persistentHash_11(binding_0);
  }
  _proofModuleProposalCommitment_0(proposal_0) {
    return this._persistentHash_12(proposal_0);
  }
  _proofModuleRecordCommitment_0(record_0) {
    return this._persistentHash_19(record_0);
  }
  _proofModuleReviewCommitment_0(review_0) {
    return this._persistentHash_13(review_0);
  }
  _proofModuleReviewMessage_0(review_0) {
    return [this._transientHash_8(review_0)];
  }
  _proofModuleLifecycleCommandMessage_0(command_0) {
    return [this._transientHash_9(command_0)];
  }
  _proofModuleReviewSignatureChallenge_0(announcement_0, publicKey_0, review_0)
  {
    return this._schnorrChallenge_0(this._jubjubPointX_0(announcement_0),
                                    this._jubjubPointY_0(announcement_0),
                                    this._jubjubPointX_0(publicKey_0),
                                    this._jubjubPointY_0(publicKey_0),
                                    this._proofModuleReviewMessage_0(review_0));
  }
  _proofModuleLifecycleSignatureChallenge_0(announcement_0,
                                            publicKey_0,
                                            command_0)
  {
    return this._schnorrChallenge_0(this._jubjubPointX_0(announcement_0),
                                    this._jubjubPointY_0(announcement_0),
                                    this._jubjubPointX_0(publicKey_0),
                                    this._jubjubPointY_0(publicKey_0),
                                    this._proofModuleLifecycleCommandMessage_0(command_0));
  }
  _governanceActivationSignatureChallenge_0(announcement_0,
                                            publicKey_0,
                                            envelope_0)
  {
    return this._schnorrChallenge_0(this._jubjubPointX_0(announcement_0),
                                    this._jubjubPointY_0(announcement_0),
                                    this._jubjubPointX_0(publicKey_0),
                                    this._jubjubPointY_0(publicKey_0),
                                    this._activationAdmissionMessage_0(envelope_0));
  }
  _authorityRootUpdateSignatureChallenge_0(announcement_0,
                                           publicKey_0,
                                           command_0)
  {
    return this._schnorrChallenge_0(this._jubjubPointX_0(announcement_0),
                                    this._jubjubPointY_0(announcement_0),
                                    this._jubjubPointX_0(publicKey_0),
                                    this._jubjubPointY_0(publicKey_0),
                                    this._authorityRootUpdateCommandMessage_0(command_0));
  }
  _templateLifecycleSignatureChallenge_0(announcement_0, publicKey_0, command_0)
  {
    return this._schnorrChallenge_0(this._jubjubPointX_0(announcement_0),
                                    this._jubjubPointY_0(announcement_0),
                                    this._jubjubPointX_0(publicKey_0),
                                    this._jubjubPointY_0(publicKey_0),
                                    this._templateLifecycleCommandMessage_0(command_0));
  }
  _runtimeAccountCredentialSignatureChallenge_0(announcement_0,
                                                publicKey_0,
                                                credential_0)
  {
    return this._schnorrChallenge_0(this._jubjubPointX_0(announcement_0),
                                    this._jubjubPointY_0(announcement_0),
                                    this._jubjubPointX_0(publicKey_0),
                                    this._jubjubPointY_0(publicKey_0),
                                    this._runtimeAccountCredentialMessage_0(credential_0));
  }
  _runtimeCapabilityCredentialSignatureChallenge_0(announcement_0,
                                                   publicKey_0,
                                                   credential_0)
  {
    return this._schnorrChallenge_0(this._jubjubPointX_0(announcement_0),
                                    this._jubjubPointY_0(announcement_0),
                                    this._jubjubPointX_0(publicKey_0),
                                    this._jubjubPointY_0(publicKey_0),
                                    this._runtimeCapabilityCredentialMessage_0(credential_0));
  }
  _runtimeSessionCredentialSignatureChallenge_0(announcement_0,
                                                publicKey_0,
                                                credential_0)
  {
    return this._schnorrChallenge_0(this._jubjubPointX_0(announcement_0),
                                    this._jubjubPointY_0(announcement_0),
                                    this._jubjubPointX_0(publicKey_0),
                                    this._jubjubPointY_0(publicKey_0),
                                    this._runtimeSessionCredentialMessage_0(credential_0));
  }
  _runtimeActionIntentSignatureChallenge_0(announcement_0, publicKey_0, intent_0)
  {
    return this._schnorrChallenge_0(this._jubjubPointX_0(announcement_0),
                                    this._jubjubPointY_0(announcement_0),
                                    this._jubjubPointX_0(publicKey_0),
                                    this._jubjubPointY_0(publicKey_0),
                                    this._runtimeActionIntentMessage_0(intent_0));
  }
  _runtimeCredentialStatusSignatureChallenge_0(announcement_0,
                                               publicKey_0,
                                               command_0)
  {
    return this._schnorrChallenge_0(this._jubjubPointX_0(announcement_0),
                                    this._jubjubPointY_0(announcement_0),
                                    this._jubjubPointX_0(publicKey_0),
                                    this._jubjubPointY_0(publicKey_0),
                                    this._runtimeCredentialStatusCommandMessage_0(command_0));
  }
  _verifyGovernanceActivationSignature_0(context,
                                         partialProofData,
                                         envelope_0,
                                         signature_0,
                                         publicKey_0)
  {
    __compactRuntime.assert(this._equal_0(envelope_0.envelopeVersion, 1n),
                            'Unsupported admission envelope version');
    __compactRuntime.assert(this._equal_1(envelope_0.registryProtocolVersion, 1n),
                            'Unsupported registry protocol version');
    this._schnorrVerify_0(context,
                          partialProofData,
                          this._activationAdmissionMessage_0(envelope_0),
                          signature_0,
                          publicKey_0);
    return [];
  }
  _templateRegistryKey_0(envelope_0) {
    return this._persistentHash_24({ namespaceHash: envelope_0.namespaceHash,
                                     templateIdHash: envelope_0.templateIdHash,
                                     semanticVersion: envelope_0.semanticVersion,
                                     templateContentHash:
                                       envelope_0.templateContentHash });
  }
  _proofModuleRegistryKeyFromIdentity_0(identity_0) {
    return this._persistentHash_14(identity_0);
  }
  _proofModuleRegistryKeyFromBinding_0(binding_0) {
    return this._proofModuleRegistryKeyFromIdentity_0({ moduleIdHash:
                                                          binding_0.moduleIdHash,
                                                        moduleVersion:
                                                          binding_0.moduleVersion,
                                                        implementationHash:
                                                          binding_0.implementationHash });
  }
  _verifyAdmissionAuthority_0(context,
                              partialProofData,
                              envelope_0,
                              signature_0,
                              activator_0,
                              authorityPath_0)
  {
    __compactRuntime.assert(this._equal_2(envelope_0.envelopeVersion, 1n),
                            'Unsupported admission envelope version');
    __compactRuntime.assert(this._equal_3(envelope_0.registryProtocolVersion, 1n),
                            'Unsupported registry protocol version');
    __compactRuntime.assert(this._equal_4(envelope_0.targetNetworkHash,
                                          _descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                    partialProofData,
                                                                                                    [
                                                                                                     { dup: { n: 0 } },
                                                                                                     { idx: { cached: false,
                                                                                                              pushPath: false,
                                                                                                              path: [
                                                                                                                     { tag: 'value',
                                                                                                                       value: { value: _descriptor_8.toValue(0n),
                                                                                                                                alignment: _descriptor_8.alignment() } },
                                                                                                                     { tag: 'value',
                                                                                                                       value: { value: _descriptor_8.toValue(0n),
                                                                                                                                alignment: _descriptor_8.alignment() } }] } },
                                                                                                     { popeq: { cached: false,
                                                                                                                result: undefined } }]).value)),
                            'Admission targets another Midnight network');
    __compactRuntime.assert(this._equal_5(envelope_0.targetContractIdentity,
                                          _descriptor_36.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                     partialProofData,
                                                                                                     [
                                                                                                      { dup: { n: 2 } },
                                                                                                      { idx: { cached: true,
                                                                                                               pushPath: false,
                                                                                                               path: [
                                                                                                                      { tag: 'value',
                                                                                                                        value: { value: _descriptor_8.toValue(0n),
                                                                                                                                 alignment: _descriptor_8.alignment() } }] } },
                                                                                                      { popeq: { cached: true,
                                                                                                                 result: undefined } }]).value).bytes),
                            'Admission targets another contract deployment');
    let tmp_0;
    __compactRuntime.assert((tmp_0 = envelope_0.namespaceHash,
                             _descriptor_6.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                       partialProofData,
                                                                                       [
                                                                                        { dup: { n: 0 } },
                                                                                        { idx: { cached: false,
                                                                                                 pushPath: false,
                                                                                                 path: [
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_8.toValue(0n),
                                                                                                                   alignment: _descriptor_8.alignment() } },
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_8.toValue(1n),
                                                                                                                   alignment: _descriptor_8.alignment() } }] } },
                                                                                        { push: { storage: false,
                                                                                                  value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(tmp_0),
                                                                                                                                               alignment: _descriptor_0.alignment() }).encode() } },
                                                                                        'member',
                                                                                        { popeq: { cached: true,
                                                                                                   result: undefined } }]).value)),
                            'No authority root is registered for the namespace');
    let tmp_1;
    const currentRoot_0 = (tmp_1 = envelope_0.namespaceHash,
                           _descriptor_5.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                     partialProofData,
                                                                                     [
                                                                                      { dup: { n: 0 } },
                                                                                      { idx: { cached: false,
                                                                                               pushPath: false,
                                                                                               path: [
                                                                                                      { tag: 'value',
                                                                                                        value: { value: _descriptor_8.toValue(0n),
                                                                                                                 alignment: _descriptor_8.alignment() } },
                                                                                                      { tag: 'value',
                                                                                                        value: { value: _descriptor_8.toValue(1n),
                                                                                                                 alignment: _descriptor_8.alignment() } }] } },
                                                                                      { idx: { cached: false,
                                                                                               pushPath: false,
                                                                                               path: [
                                                                                                      { tag: 'value',
                                                                                                        value: { value: _descriptor_0.toValue(tmp_1),
                                                                                                                 alignment: _descriptor_0.alignment() } }] } },
                                                                                      { popeq: { cached: false,
                                                                                                 result: undefined } }]).value));
    __compactRuntime.assert(this._equal_6(envelope_0.governancePolicyHash,
                                          currentRoot_0.governancePolicyHash)
                            &&
                            this._equal_7(envelope_0.authorityRootVersion,
                                          currentRoot_0.rootVersion)
                            &&
                            this._equal_8(envelope_0.authorityRootSequence,
                                          currentRoot_0.rootSequence),
                            'Admission authority root reference is stale or mismatched');
    __compactRuntime.assert(this._equal_9(activator_0.leafVersion, 1n)
                            &&
                            this._equal_10(activator_0.authorityKind, 3n)
                            &&
                            this._equal_11(activator_0.namespaceHash,
                                           envelope_0.namespaceHash)
                            &&
                            this._equal_12(activator_0.governancePolicyHash,
                                           envelope_0.governancePolicyHash),
                            'Governance activator leaf is outside the admission scope');
    let t_0, t_1;
    __compactRuntime.assert((t_1 = envelope_0.activatedAt,
                             t_1 >= activator_0.validAfter)
                            &&
                            (t_0 = envelope_0.activatedAt,
                             t_0 < activator_0.validBefore),
                            'Governance activator is outside its validity window');
    const activatorCommitment_0 = this._governanceActivatorLeafCommitment_0(activator_0);
    __compactRuntime.assert(this._equal_13(authorityPath_0.leaf,
                                           activatorCommitment_0)
                            &&
                            this._equal_14(this._merkleTreePathRoot_2(authorityPath_0),
                                           currentRoot_0.root),
                            'Governance activator is not eligible under the current authority root');
    this._schnorrVerify_0(context,
                          partialProofData,
                          this._activationAdmissionMessage_0(envelope_0),
                          signature_0,
                          activator_0.publicKey);
    return [];
  }
  _verifyModuleAuthority_0(context,
                           partialProofData,
                           namespaceHash_0,
                           governancePolicyHash_0,
                           authorityRootVersion_0,
                           authorityRootSequence_0,
                           effectiveAt_0,
                           requiredAuthorityKind_0,
                           authority_0,
                           authorityPath_0)
  {
    __compactRuntime.assert(_descriptor_6.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                      partialProofData,
                                                                                      [
                                                                                       { dup: { n: 0 } },
                                                                                       { idx: { cached: false,
                                                                                                pushPath: false,
                                                                                                path: [
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_8.toValue(0n),
                                                                                                                  alignment: _descriptor_8.alignment() } },
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_8.toValue(1n),
                                                                                                                  alignment: _descriptor_8.alignment() } }] } },
                                                                                       { push: { storage: false,
                                                                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(namespaceHash_0),
                                                                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                                                                       'member',
                                                                                       { popeq: { cached: true,
                                                                                                  result: undefined } }]).value),
                            'No authority root is registered for proof-module governance');
    const currentRoot_0 = _descriptor_5.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                    partialProofData,
                                                                                    [
                                                                                     { dup: { n: 0 } },
                                                                                     { idx: { cached: false,
                                                                                              pushPath: false,
                                                                                              path: [
                                                                                                     { tag: 'value',
                                                                                                       value: { value: _descriptor_8.toValue(0n),
                                                                                                                alignment: _descriptor_8.alignment() } },
                                                                                                     { tag: 'value',
                                                                                                       value: { value: _descriptor_8.toValue(1n),
                                                                                                                alignment: _descriptor_8.alignment() } }] } },
                                                                                     { idx: { cached: false,
                                                                                              pushPath: false,
                                                                                              path: [
                                                                                                     { tag: 'value',
                                                                                                       value: { value: _descriptor_0.toValue(namespaceHash_0),
                                                                                                                alignment: _descriptor_0.alignment() } }] } },
                                                                                     { popeq: { cached: false,
                                                                                                result: undefined } }]).value);
    __compactRuntime.assert(this._equal_15(governancePolicyHash_0,
                                           currentRoot_0.governancePolicyHash)
                            &&
                            this._equal_16(authorityRootVersion_0,
                                           currentRoot_0.rootVersion)
                            &&
                            this._equal_17(authorityRootSequence_0,
                                           currentRoot_0.rootSequence),
                            'Proof-module authority root reference is stale or mismatched');
    __compactRuntime.assert(this._equal_18(authority_0.leafVersion, 1n)
                            &&
                            this._equal_19(authority_0.authorityKind,
                                           requiredAuthorityKind_0)
                            &&
                            this._equal_20(authority_0.namespaceHash,
                                           namespaceHash_0)
                            &&
                            this._equal_21(authority_0.governancePolicyHash,
                                           governancePolicyHash_0),
                            'Proof-module authority leaf is outside the required scope');
    __compactRuntime.assert(effectiveAt_0 >= authority_0.validAfter
                            &&
                            effectiveAt_0 < authority_0.validBefore,
                            'Proof-module authority is outside its validity window');
    const authorityCommitment_0 = this._governanceActivatorLeafCommitment_0(authority_0);
    __compactRuntime.assert(this._equal_22(authorityPath_0.leaf,
                                           authorityCommitment_0)
                            &&
                            this._equal_23(this._merkleTreePathRoot_2(authorityPath_0),
                                           currentRoot_0.root),
                            'Proof-module authority is not eligible under the current root');
    return currentRoot_0;
  }
  _verifyAuthorityRootUpdate_0(context,
                               partialProofData,
                               command_0,
                               signature_0,
                               governor_0,
                               authorityPath_0)
  {
    __compactRuntime.assert(this._equal_24(command_0.commandVersion, 1n),
                            'Unsupported authority-root update version');
    let tmp_0;
    __compactRuntime.assert((tmp_0 = command_0.namespaceHash,
                             _descriptor_6.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                       partialProofData,
                                                                                       [
                                                                                        { dup: { n: 0 } },
                                                                                        { idx: { cached: false,
                                                                                                 pushPath: false,
                                                                                                 path: [
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_8.toValue(0n),
                                                                                                                   alignment: _descriptor_8.alignment() } },
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_8.toValue(1n),
                                                                                                                   alignment: _descriptor_8.alignment() } }] } },
                                                                                        { push: { storage: false,
                                                                                                  value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(tmp_0),
                                                                                                                                               alignment: _descriptor_0.alignment() }).encode() } },
                                                                                        'member',
                                                                                        { popeq: { cached: true,
                                                                                                   result: undefined } }]).value)),
                            'No authority root is registered for the namespace');
    let tmp_1;
    const currentRoot_0 = (tmp_1 = command_0.namespaceHash,
                           _descriptor_5.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                     partialProofData,
                                                                                     [
                                                                                      { dup: { n: 0 } },
                                                                                      { idx: { cached: false,
                                                                                               pushPath: false,
                                                                                               path: [
                                                                                                      { tag: 'value',
                                                                                                        value: { value: _descriptor_8.toValue(0n),
                                                                                                                 alignment: _descriptor_8.alignment() } },
                                                                                                      { tag: 'value',
                                                                                                        value: { value: _descriptor_8.toValue(1n),
                                                                                                                 alignment: _descriptor_8.alignment() } }] } },
                                                                                      { idx: { cached: false,
                                                                                               pushPath: false,
                                                                                               path: [
                                                                                                      { tag: 'value',
                                                                                                        value: { value: _descriptor_0.toValue(tmp_1),
                                                                                                                 alignment: _descriptor_0.alignment() } }] } },
                                                                                      { popeq: { cached: false,
                                                                                                 result: undefined } }]).value));
    __compactRuntime.assert(this._equal_25(command_0.currentGovernancePolicyHash,
                                           currentRoot_0.governancePolicyHash)
                            &&
                            this._equal_26(command_0.currentRoot,
                                           currentRoot_0.root)
                            &&
                            this._equal_27(command_0.currentRootVersion,
                                           currentRoot_0.rootVersion)
                            &&
                            this._equal_28(command_0.currentRootSequence,
                                           currentRoot_0.rootSequence),
                            'Authority-root update does not bind the exact current root');
    __compactRuntime.assert(this._equal_29(command_0.nextRootVersion,
                                           currentRoot_0.rootVersion + 1n)
                            &&
                            this._equal_30(command_0.nextRootSequence,
                                           currentRoot_0.rootSequence + 1n),
                            'Authority-root version and sequence must advance exactly once');
    let t_1, t_2, t_0;
    __compactRuntime.assert((t_0 = command_0.nextModuleReviewThreshold,
                             t_0 >= 2n)
                            &&
                            (t_2 = command_0.nextModuleApprovalThreshold,
                             t_2 >= 2n)
                            &&
                            (t_1 = command_0.nextAuthorityRootUpdateThreshold,
                             t_1 >= 2n),
                            'Authority-root update thresholds must be at least two');
    __compactRuntime.assert(this._equal_31(governor_0.leafVersion, 1n)
                            &&
                            this._equal_32(governor_0.authorityKind, 11n)
                            &&
                            this._equal_33(governor_0.namespaceHash,
                                           command_0.namespaceHash)
                            &&
                            this._equal_34(governor_0.governancePolicyHash,
                                           command_0.currentGovernancePolicyHash),
                            'Authority-root governor leaf is outside the update scope');
    let t_3, t_4;
    __compactRuntime.assert((t_4 = command_0.effectiveAt,
                             t_4 >= governor_0.validAfter)
                            &&
                            (t_3 = command_0.effectiveAt,
                             t_3 < governor_0.validBefore),
                            'Authority-root governor is outside its validity window');
    const governorCommitment_0 = this._governanceActivatorLeafCommitment_0(governor_0);
    __compactRuntime.assert(this._equal_35(authorityPath_0.leaf,
                                           governorCommitment_0)
                            &&
                            this._equal_36(this._merkleTreePathRoot_2(authorityPath_0),
                                           currentRoot_0.root),
                            'Authority-root governor is not eligible under the current root');
    __compactRuntime.assert(this._blockTimeGte_0(context,
                                                 partialProofData,
                                                 command_0.effectiveAt),
                            'Authority-root update is not yet effective');
    this._schnorrVerify_0(context,
                          partialProofData,
                          this._authorityRootUpdateCommandMessage_0(command_0),
                          signature_0,
                          governor_0.publicKey);
    return currentRoot_0;
  }
  _commitAuthorityRootUpdateApproval_0(context,
                                       partialProofData,
                                       command_0,
                                       currentRoot_0,
                                       governor_0,
                                       previousAccumulator_0,
                                       nextCount_0)
  {
    const updateCommitment_0 = this._authorityRootUpdateCommandCommitment_0(command_0);
    const governorCommitment_0 = this._governanceActivatorLeafCommitment_0(governor_0);
    const approvalKey_0 = this._persistentHash_15({ updateCommitment:
                                                      updateCommitment_0,
                                                    approverAuthorityCommitment:
                                                      governorCommitment_0 });
    __compactRuntime.assert(!_descriptor_6.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                       partialProofData,
                                                                                       [
                                                                                        { dup: { n: 0 } },
                                                                                        { idx: { cached: false,
                                                                                                 pushPath: false,
                                                                                                 path: [
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_8.toValue(1n),
                                                                                                                   alignment: _descriptor_8.alignment() } },
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_8.toValue(0n),
                                                                                                                   alignment: _descriptor_8.alignment() } }] } },
                                                                                        { push: { storage: false,
                                                                                                  value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(approvalKey_0),
                                                                                                                                               alignment: _descriptor_0.alignment() }).encode() } },
                                                                                        'member',
                                                                                        { popeq: { cached: true,
                                                                                                   result: undefined } }]).value),
                            'Duplicate authority-root governor approval');
    const nextAccumulator_0 = this._persistentHash_16({ previous:
                                                          previousAccumulator_0,
                                                        updateCommitment:
                                                          updateCommitment_0,
                                                        approverAuthorityCommitment:
                                                          governorCommitment_0 });
    const tmp_0 = { updateCommitment: updateCommitment_0,
                    approverAuthorityCommitment: governorCommitment_0,
                    approvedAt: command_0.effectiveAt };
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_8.toValue(1n),
                                                                  alignment: _descriptor_8.alignment() } },
                                                       { tag: 'value',
                                                         value: { value: _descriptor_8.toValue(0n),
                                                                  alignment: _descriptor_8.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(approvalKey_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_33.toValue(tmp_0),
                                                                                              alignment: _descriptor_33.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 2 } }]);
    if (nextCount_0 >= currentRoot_0.authorityRootUpdateThreshold) {
      const tmp_1 = command_0.namespaceHash;
      const tmp_2 = { governancePolicyHash: command_0.nextGovernancePolicyHash,
                      root: command_0.nextRoot,
                      rootVersion: command_0.nextRootVersion,
                      rootSequence: command_0.nextRootSequence,
                      moduleReviewThreshold: command_0.nextModuleReviewThreshold,
                      moduleApprovalThreshold:
                        command_0.nextModuleApprovalThreshold,
                      authorityRootUpdateThreshold:
                        command_0.nextAuthorityRootUpdateThreshold };
      __compactRuntime.queryLedgerState(context,
                                        partialProofData,
                                        [
                                         { idx: { cached: false,
                                                  pushPath: true,
                                                  path: [
                                                         { tag: 'value',
                                                           value: { value: _descriptor_8.toValue(0n),
                                                                    alignment: _descriptor_8.alignment() } },
                                                         { tag: 'value',
                                                           value: { value: _descriptor_8.toValue(1n),
                                                                    alignment: _descriptor_8.alignment() } }] } },
                                         { push: { storage: false,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(tmp_1),
                                                                                                alignment: _descriptor_0.alignment() }).encode() } },
                                         { push: { storage: true,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_5.toValue(tmp_2),
                                                                                                alignment: _descriptor_5.alignment() }).encode() } },
                                         { ins: { cached: false, n: 1 } },
                                         { ins: { cached: true, n: 2 } }]);
      __compactRuntime.queryLedgerState(context,
                                        partialProofData,
                                        [
                                         { idx: { cached: false,
                                                  pushPath: true,
                                                  path: [
                                                         { tag: 'value',
                                                           value: { value: _descriptor_8.toValue(0n),
                                                                    alignment: _descriptor_8.alignment() } },
                                                         { tag: 'value',
                                                           value: { value: _descriptor_8.toValue(2n),
                                                                    alignment: _descriptor_8.alignment() } }] } },
                                         { push: { storage: false,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(updateCommitment_0),
                                                                                                alignment: _descriptor_0.alignment() }).encode() } },
                                         { rem: { cached: false } },
                                         { ins: { cached: true, n: 2 } }]);
    } else {
      const tmp_3 = { updateCommitment: updateCommitment_0,
                      approvalThreshold:
                        currentRoot_0.authorityRootUpdateThreshold,
                      approvalCount: nextCount_0,
                      approvalEvidenceAccumulator: nextAccumulator_0 };
      __compactRuntime.queryLedgerState(context,
                                        partialProofData,
                                        [
                                         { idx: { cached: false,
                                                  pushPath: true,
                                                  path: [
                                                         { tag: 'value',
                                                           value: { value: _descriptor_8.toValue(0n),
                                                                    alignment: _descriptor_8.alignment() } },
                                                         { tag: 'value',
                                                           value: { value: _descriptor_8.toValue(2n),
                                                                    alignment: _descriptor_8.alignment() } }] } },
                                         { push: { storage: false,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(updateCommitment_0),
                                                                                                alignment: _descriptor_0.alignment() }).encode() } },
                                         { push: { storage: true,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_34.toValue(tmp_3),
                                                                                                alignment: _descriptor_34.alignment() }).encode() } },
                                         { ins: { cached: false, n: 1 } },
                                         { ins: { cached: true, n: 2 } }]);
    }
    return nextCount_0;
  }
  _submitAuthorityRootApproval_0(context,
                                 partialProofData,
                                 command_0,
                                 signature_0,
                                 governor_0,
                                 authorityPath_0)
  {
    const currentRoot_0 = this._verifyAuthorityRootUpdate_0(context,
                                                            partialProofData,
                                                            command_0,
                                                            signature_0,
                                                            governor_0,
                                                            authorityPath_0);
    const updateCommitment_0 = this._authorityRootUpdateCommandCommitment_0(command_0);
    if (_descriptor_6.fromValue(__compactRuntime.queryLedgerState(context,
                                                                  partialProofData,
                                                                  [
                                                                   { dup: { n: 0 } },
                                                                   { idx: { cached: false,
                                                                            pushPath: false,
                                                                            path: [
                                                                                   { tag: 'value',
                                                                                     value: { value: _descriptor_8.toValue(0n),
                                                                                              alignment: _descriptor_8.alignment() } },
                                                                                   { tag: 'value',
                                                                                     value: { value: _descriptor_8.toValue(2n),
                                                                                              alignment: _descriptor_8.alignment() } }] } },
                                                                   { push: { storage: false,
                                                                             value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(updateCommitment_0),
                                                                                                                          alignment: _descriptor_0.alignment() }).encode() } },
                                                                   'member',
                                                                   { popeq: { cached: true,
                                                                              result: undefined } }]).value))
    {
      const progress_0 = _descriptor_34.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                    partialProofData,
                                                                                    [
                                                                                     { dup: { n: 0 } },
                                                                                     { idx: { cached: false,
                                                                                              pushPath: false,
                                                                                              path: [
                                                                                                     { tag: 'value',
                                                                                                       value: { value: _descriptor_8.toValue(0n),
                                                                                                                alignment: _descriptor_8.alignment() } },
                                                                                                     { tag: 'value',
                                                                                                       value: { value: _descriptor_8.toValue(2n),
                                                                                                                alignment: _descriptor_8.alignment() } }] } },
                                                                                     { idx: { cached: false,
                                                                                              pushPath: false,
                                                                                              path: [
                                                                                                     { tag: 'value',
                                                                                                       value: { value: _descriptor_0.toValue(updateCommitment_0),
                                                                                                                alignment: _descriptor_0.alignment() } }] } },
                                                                                     { popeq: { cached: false,
                                                                                                result: undefined } }]).value);
      __compactRuntime.assert(this._equal_37(progress_0.updateCommitment,
                                             updateCommitment_0)
                              &&
                              this._equal_38(progress_0.approvalThreshold,
                                             currentRoot_0.authorityRootUpdateThreshold),
                              'Authority-root approval progress is stale or mismatched');
      return this._commitAuthorityRootUpdateApproval_0(context,
                                                       partialProofData,
                                                       command_0,
                                                       currentRoot_0,
                                                       governor_0,
                                                       progress_0.approvalEvidenceAccumulator,
                                                       ((t1) => {
                                                         if (t1 > 65535n) {
                                                           throw new __compactRuntime.CompactError('permio-authorization.compact line 1075 char 13: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 65535');
                                                         }
                                                         return t1;
                                                       })(progress_0.approvalCount
                                                          +
                                                          1n));
    } else {
      return this._commitAuthorityRootUpdateApproval_0(context,
                                                       partialProofData,
                                                       command_0,
                                                       currentRoot_0,
                                                       governor_0,
                                                       new Uint8Array(32),
                                                       1n);
    }
  }
  _assertModuleCommandTarget_0(context, partialProofData, command_0, record_0) {
    __compactRuntime.assert(this._equal_39(command_0.commandVersion, 1n)
                            &&
                            this._equal_40(command_0.recordCommitment,
                                           this._persistentHash_19(record_0))
                            &&
                            this._equal_41(command_0.governanceNamespaceHash,
                                           record_0.governanceNamespaceHash)
                            &&
                            this._equal_42(command_0.expectedLifecycleStatus,
                                           record_0.lifecycleStatus),
                            'Proof-module command does not bind the exact current record');
    let tmp_0;
    __compactRuntime.assert(!(tmp_0 = command_0.commandNonce,
                              _descriptor_6.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                        partialProofData,
                                                                                        [
                                                                                         { dup: { n: 0 } },
                                                                                         { idx: { cached: false,
                                                                                                  pushPath: false,
                                                                                                  path: [
                                                                                                         { tag: 'value',
                                                                                                           value: { value: _descriptor_8.toValue(1n),
                                                                                                                    alignment: _descriptor_8.alignment() } },
                                                                                                         { tag: 'value',
                                                                                                           value: { value: _descriptor_8.toValue(5n),
                                                                                                                    alignment: _descriptor_8.alignment() } }] } },
                                                                                         { push: { storage: false,
                                                                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(tmp_0),
                                                                                                                                                alignment: _descriptor_0.alignment() }).encode() } },
                                                                                         'member',
                                                                                         { popeq: { cached: true,
                                                                                                    result: undefined } }]).value)),
                            'Proof-module command nonce already used');
    return [];
  }
  _updatedProofModuleRecord_0(record_0,
                              nextStatus_0,
                              approvalEvidenceCommitment_0,
                              activationSequence_0,
                              reviewedAt_0,
                              approvedAt_0,
                              activatedAt_0,
                              deprecatedAt_0,
                              revokedAt_0)
  {
    return { identity: record_0.identity,
             proposalCommitment: record_0.proposalCommitment,
             governanceNamespaceHash: record_0.governanceNamespaceHash,
             governancePolicyHash: record_0.governancePolicyHash,
             authorityRootVersion: record_0.authorityRootVersion,
             authorityRootSequence: record_0.authorityRootSequence,
             implementationReferenceHash: record_0.implementationReferenceHash,
             sourceHash: record_0.sourceHash,
             inputSchemaHash: record_0.inputSchemaHash,
             configurationSchemaHash: record_0.configurationSchemaHash,
             receiptSchemaHash: record_0.receiptSchemaHash,
             compilerVersionHash: record_0.compilerVersionHash,
             compatibilityPolicyHash: record_0.compatibilityPolicyHash,
             approvalEvidenceCommitment: approvalEvidenceCommitment_0,
             reviewThreshold: record_0.reviewThreshold,
             reviewCount: record_0.reviewCount,
             reviewEvidenceAccumulator: record_0.reviewEvidenceAccumulator,
             approvalThreshold: record_0.approvalThreshold,
             approvalCount: record_0.approvalCount,
             approvalEvidenceAccumulator: record_0.approvalEvidenceAccumulator,
             lifecycleStatus: nextStatus_0,
             activationSequence: activationSequence_0,
             proposedAt: record_0.proposedAt,
             reviewedAt: reviewedAt_0,
             approvedAt: approvedAt_0,
             activatedAt: activatedAt_0,
             deprecatedAt: deprecatedAt_0,
             revokedAt: revokedAt_0 };
  }
  _proposeProofModule_0(context, partialProofData, proposal_0) {
    __compactRuntime.assert(this._equal_43(proposal_0.proposalVersion, 1n),
                            'Unsupported proof-module proposal version');
    let tmp_0;
    __compactRuntime.assert((tmp_0 = proposal_0.governanceNamespaceHash,
                             _descriptor_6.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                       partialProofData,
                                                                                       [
                                                                                        { dup: { n: 0 } },
                                                                                        { idx: { cached: false,
                                                                                                 pushPath: false,
                                                                                                 path: [
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_8.toValue(0n),
                                                                                                                   alignment: _descriptor_8.alignment() } },
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_8.toValue(1n),
                                                                                                                   alignment: _descriptor_8.alignment() } }] } },
                                                                                        { push: { storage: false,
                                                                                                  value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(tmp_0),
                                                                                                                                               alignment: _descriptor_0.alignment() }).encode() } },
                                                                                        'member',
                                                                                        { popeq: { cached: true,
                                                                                                   result: undefined } }]).value)),
                            'No authority root is registered for proof-module governance');
    let tmp_1;
    const currentRoot_0 = (tmp_1 = proposal_0.governanceNamespaceHash,
                           _descriptor_5.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                     partialProofData,
                                                                                     [
                                                                                      { dup: { n: 0 } },
                                                                                      { idx: { cached: false,
                                                                                               pushPath: false,
                                                                                               path: [
                                                                                                      { tag: 'value',
                                                                                                        value: { value: _descriptor_8.toValue(0n),
                                                                                                                 alignment: _descriptor_8.alignment() } },
                                                                                                      { tag: 'value',
                                                                                                        value: { value: _descriptor_8.toValue(1n),
                                                                                                                 alignment: _descriptor_8.alignment() } }] } },
                                                                                      { idx: { cached: false,
                                                                                               pushPath: false,
                                                                                               path: [
                                                                                                      { tag: 'value',
                                                                                                        value: { value: _descriptor_0.toValue(tmp_1),
                                                                                                                 alignment: _descriptor_0.alignment() } }] } },
                                                                                      { popeq: { cached: false,
                                                                                                 result: undefined } }]).value));
    __compactRuntime.assert(this._equal_44(proposal_0.governancePolicyHash,
                                           currentRoot_0.governancePolicyHash)
                            &&
                            this._equal_45(proposal_0.authorityRootVersion,
                                           currentRoot_0.rootVersion)
                            &&
                            this._equal_46(proposal_0.authorityRootSequence,
                                           currentRoot_0.rootSequence),
                            'Proof-module proposal authority root reference is stale or mismatched');
    const moduleKey_0 = this._proofModuleRegistryKeyFromIdentity_0(proposal_0.identity);
    __compactRuntime.assert(!_descriptor_6.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                       partialProofData,
                                                                                       [
                                                                                        { dup: { n: 0 } },
                                                                                        { idx: { cached: false,
                                                                                                 pushPath: false,
                                                                                                 path: [
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_8.toValue(1n),
                                                                                                                   alignment: _descriptor_8.alignment() } },
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_8.toValue(1n),
                                                                                                                   alignment: _descriptor_8.alignment() } }] } },
                                                                                        { push: { storage: false,
                                                                                                  value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(moduleKey_0),
                                                                                                                                               alignment: _descriptor_0.alignment() }).encode() } },
                                                                                        'member',
                                                                                        { popeq: { cached: true,
                                                                                                   result: undefined } }]).value),
                            'Exact proof-module implementation is already registered');
    const tmp_2 = { identity: proposal_0.identity,
                    proposalCommitment:
                      this._proofModuleProposalCommitment_0(proposal_0),
                    governanceNamespaceHash: proposal_0.governanceNamespaceHash,
                    governancePolicyHash: proposal_0.governancePolicyHash,
                    authorityRootVersion: proposal_0.authorityRootVersion,
                    authorityRootSequence: proposal_0.authorityRootSequence,
                    implementationReferenceHash:
                      proposal_0.implementationReferenceHash,
                    sourceHash: proposal_0.sourceHash,
                    inputSchemaHash: proposal_0.inputSchemaHash,
                    configurationSchemaHash: proposal_0.configurationSchemaHash,
                    receiptSchemaHash: proposal_0.receiptSchemaHash,
                    compilerVersionHash: proposal_0.compilerVersionHash,
                    compatibilityPolicyHash: proposal_0.compatibilityPolicyHash,
                    approvalEvidenceCommitment: new Uint8Array(32),
                    reviewThreshold: currentRoot_0.moduleReviewThreshold,
                    reviewCount: 0n,
                    reviewEvidenceAccumulator: new Uint8Array(32),
                    approvalThreshold: currentRoot_0.moduleApprovalThreshold,
                    approvalCount: 0n,
                    approvalEvidenceAccumulator: new Uint8Array(32),
                    lifecycleStatus: 1n,
                    activationSequence: 0n,
                    proposedAt: proposal_0.proposedAt,
                    reviewedAt: 0n,
                    approvedAt: 0n,
                    activatedAt: 0n,
                    deprecatedAt: 0n,
                    revokedAt: 0n };
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_8.toValue(1n),
                                                                  alignment: _descriptor_8.alignment() } },
                                                       { tag: 'value',
                                                         value: { value: _descriptor_8.toValue(1n),
                                                                  alignment: _descriptor_8.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(moduleKey_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_22.toValue(tmp_2),
                                                                                              alignment: _descriptor_22.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 2 } }]);
    const tmp_3 = 1n;
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_8.toValue(1n),
                                                                  alignment: _descriptor_8.alignment() } },
                                                       { tag: 'value',
                                                         value: { value: _descriptor_8.toValue(2n),
                                                                  alignment: _descriptor_8.alignment() } }] } },
                                       { addi: { immediate: parseInt(__compactRuntime.valueToBigInt(
                                                              { value: _descriptor_4.toValue(tmp_3),
                                                                alignment: _descriptor_4.alignment() }
                                                                .value
                                                            )) } },
                                       { ins: { cached: true, n: 2 } }]);
    return moduleKey_0;
  }
  _reviewProofModule_0(context,
                       partialProofData,
                       review_0,
                       signature_0,
                       reviewer_0,
                       authorityPath_0)
  {
    __compactRuntime.assert(this._equal_47(review_0.reviewVersion, 1n),
                            'Unsupported proof-module review version');
    let tmp_0;
    __compactRuntime.assert((tmp_0 = review_0.moduleKey,
                             _descriptor_6.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                       partialProofData,
                                                                                       [
                                                                                        { dup: { n: 0 } },
                                                                                        { idx: { cached: false,
                                                                                                 pushPath: false,
                                                                                                 path: [
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_8.toValue(1n),
                                                                                                                   alignment: _descriptor_8.alignment() } },
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_8.toValue(1n),
                                                                                                                   alignment: _descriptor_8.alignment() } }] } },
                                                                                        { push: { storage: false,
                                                                                                  value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(tmp_0),
                                                                                                                                               alignment: _descriptor_0.alignment() }).encode() } },
                                                                                        'member',
                                                                                        { popeq: { cached: true,
                                                                                                   result: undefined } }]).value)),
                            'Proof module is not registered');
    let tmp_1;
    const record_0 = (tmp_1 = review_0.moduleKey,
                      _descriptor_22.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                 partialProofData,
                                                                                 [
                                                                                  { dup: { n: 0 } },
                                                                                  { idx: { cached: false,
                                                                                           pushPath: false,
                                                                                           path: [
                                                                                                  { tag: 'value',
                                                                                                    value: { value: _descriptor_8.toValue(1n),
                                                                                                             alignment: _descriptor_8.alignment() } },
                                                                                                  { tag: 'value',
                                                                                                    value: { value: _descriptor_8.toValue(1n),
                                                                                                             alignment: _descriptor_8.alignment() } }] } },
                                                                                  { idx: { cached: false,
                                                                                           pushPath: false,
                                                                                           path: [
                                                                                                  { tag: 'value',
                                                                                                    value: { value: _descriptor_0.toValue(tmp_1),
                                                                                                             alignment: _descriptor_0.alignment() } }] } },
                                                                                  { popeq: { cached: false,
                                                                                             result: undefined } }]).value));
    __compactRuntime.assert(this._equal_48(record_0.lifecycleStatus, 1n),
                            'Proof module no longer accepts reviews');
    __compactRuntime.assert(this._equal_49(review_0.proposalCommitment,
                                           record_0.proposalCommitment)
                            &&
                            this._equal_50(review_0.governanceNamespaceHash,
                                           record_0.governanceNamespaceHash)
                            &&
                            this._equal_51(review_0.governancePolicyHash,
                                           record_0.governancePolicyHash)
                            &&
                            this._equal_52(review_0.authorityRootVersion,
                                           record_0.authorityRootVersion)
                            &&
                            this._equal_53(review_0.authorityRootSequence,
                                           record_0.authorityRootSequence),
                            'Proof-module review does not bind the exact proposal');
    this._verifyModuleAuthority_0(context,
                                  partialProofData,
                                  review_0.governanceNamespaceHash,
                                  review_0.governancePolicyHash,
                                  review_0.authorityRootVersion,
                                  review_0.authorityRootSequence,
                                  review_0.reviewedAt,
                                  7n,
                                  reviewer_0,
                                  authorityPath_0);
    let tmp_2;
    __compactRuntime.assert(!(tmp_2 = review_0.reviewNonce,
                              _descriptor_6.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                        partialProofData,
                                                                                        [
                                                                                         { dup: { n: 0 } },
                                                                                         { idx: { cached: false,
                                                                                                  pushPath: false,
                                                                                                  path: [
                                                                                                         { tag: 'value',
                                                                                                           value: { value: _descriptor_8.toValue(1n),
                                                                                                                    alignment: _descriptor_8.alignment() } },
                                                                                                         { tag: 'value',
                                                                                                           value: { value: _descriptor_8.toValue(5n),
                                                                                                                    alignment: _descriptor_8.alignment() } }] } },
                                                                                         { push: { storage: false,
                                                                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(tmp_2),
                                                                                                                                                alignment: _descriptor_0.alignment() }).encode() } },
                                                                                         'member',
                                                                                         { popeq: { cached: true,
                                                                                                    result: undefined } }]).value)),
                            'Proof-module review nonce already used');
    this._schnorrVerify_0(context,
                          partialProofData,
                          this._proofModuleReviewMessage_0(review_0),
                          signature_0,
                          reviewer_0.publicKey);
    const reviewerCommitment_0 = this._governanceActivatorLeafCommitment_0(reviewer_0);
    const reviewKey_0 = this._persistentHash_17({ moduleKey: review_0.moduleKey,
                                                  reviewerAuthorityCommitment:
                                                    reviewerCommitment_0 });
    __compactRuntime.assert(!_descriptor_6.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                       partialProofData,
                                                                                       [
                                                                                        { dup: { n: 0 } },
                                                                                        { idx: { cached: false,
                                                                                                 pushPath: false,
                                                                                                 path: [
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_8.toValue(1n),
                                                                                                                   alignment: _descriptor_8.alignment() } },
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_8.toValue(3n),
                                                                                                                   alignment: _descriptor_8.alignment() } }] } },
                                                                                        { push: { storage: false,
                                                                                                  value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(reviewKey_0),
                                                                                                                                               alignment: _descriptor_0.alignment() }).encode() } },
                                                                                        'member',
                                                                                        { popeq: { cached: true,
                                                                                                   result: undefined } }]).value),
                            'Duplicate proof-module reviewer approval');
    const reviewCommitment_0 = this._proofModuleReviewCommitment_0(review_0);
    const nextAccumulator_0 = this._persistentHash_18({ previous:
                                                          record_0.reviewEvidenceAccumulator,
                                                        reviewCommitment:
                                                          reviewCommitment_0,
                                                        reviewerAuthorityCommitment:
                                                          reviewerCommitment_0 });
    const nextCount_0 = ((t1) => {
                          if (t1 > 65535n) {
                            throw new __compactRuntime.CompactError('permio-authorization.compact line 1269 char 23: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 65535');
                          }
                          return t1;
                        })(record_0.reviewCount + 1n);
    const thresholdReached_0 = nextCount_0 >= record_0.reviewThreshold;
    const reviewedRecord_0 = { identity: record_0.identity,
                               proposalCommitment: record_0.proposalCommitment,
                               governanceNamespaceHash:
                                 record_0.governanceNamespaceHash,
                               governancePolicyHash:
                                 record_0.governancePolicyHash,
                               authorityRootVersion:
                                 record_0.authorityRootVersion,
                               authorityRootSequence:
                                 record_0.authorityRootSequence,
                               implementationReferenceHash:
                                 record_0.implementationReferenceHash,
                               sourceHash: record_0.sourceHash,
                               inputSchemaHash: record_0.inputSchemaHash,
                               configurationSchemaHash:
                                 record_0.configurationSchemaHash,
                               receiptSchemaHash: record_0.receiptSchemaHash,
                               compilerVersionHash: record_0.compilerVersionHash,
                               compatibilityPolicyHash:
                                 record_0.compatibilityPolicyHash,
                               approvalEvidenceCommitment:
                                 record_0.approvalEvidenceCommitment,
                               reviewThreshold: record_0.reviewThreshold,
                               reviewCount: nextCount_0,
                               reviewEvidenceAccumulator: nextAccumulator_0,
                               approvalThreshold: record_0.approvalThreshold,
                               approvalCount: record_0.approvalCount,
                               approvalEvidenceAccumulator:
                                 record_0.approvalEvidenceAccumulator,
                               lifecycleStatus: record_0.lifecycleStatus,
                               activationSequence: record_0.activationSequence,
                               proposedAt: record_0.proposedAt,
                               reviewedAt: record_0.reviewedAt,
                               approvedAt: record_0.approvedAt,
                               activatedAt: record_0.activatedAt,
                               deprecatedAt: record_0.deprecatedAt,
                               revokedAt: record_0.revokedAt };
    const tmp_3 = review_0.reviewNonce;
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_8.toValue(1n),
                                                                  alignment: _descriptor_8.alignment() } },
                                                       { tag: 'value',
                                                         value: { value: _descriptor_8.toValue(5n),
                                                                  alignment: _descriptor_8.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(tmp_3),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newNull().encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 2 } }]);
    const tmp_4 = { moduleKey: review_0.moduleKey,
                    reviewerAuthorityCommitment: reviewerCommitment_0,
                    reviewCommitment: reviewCommitment_0,
                    reviewedAt: review_0.reviewedAt };
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_8.toValue(1n),
                                                                  alignment: _descriptor_8.alignment() } },
                                                       { tag: 'value',
                                                         value: { value: _descriptor_8.toValue(3n),
                                                                  alignment: _descriptor_8.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(reviewKey_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_31.toValue(tmp_4),
                                                                                              alignment: _descriptor_31.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 2 } }]);
    if (thresholdReached_0) {
      const tmp_5 = review_0.moduleKey;
      const tmp_6 = this._updatedProofModuleRecord_0(reviewedRecord_0,
                                                     2n,
                                                     record_0.approvalEvidenceCommitment,
                                                     record_0.activationSequence,
                                                     review_0.reviewedAt,
                                                     record_0.approvedAt,
                                                     record_0.activatedAt,
                                                     record_0.deprecatedAt,
                                                     record_0.revokedAt);
      __compactRuntime.queryLedgerState(context,
                                        partialProofData,
                                        [
                                         { idx: { cached: false,
                                                  pushPath: true,
                                                  path: [
                                                         { tag: 'value',
                                                           value: { value: _descriptor_8.toValue(1n),
                                                                    alignment: _descriptor_8.alignment() } },
                                                         { tag: 'value',
                                                           value: { value: _descriptor_8.toValue(1n),
                                                                    alignment: _descriptor_8.alignment() } }] } },
                                         { push: { storage: false,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(tmp_5),
                                                                                                alignment: _descriptor_0.alignment() }).encode() } },
                                         { push: { storage: true,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_22.toValue(tmp_6),
                                                                                                alignment: _descriptor_22.alignment() }).encode() } },
                                         { ins: { cached: false, n: 1 } },
                                         { ins: { cached: true, n: 2 } }]);
    } else {
      const tmp_7 = review_0.moduleKey;
      __compactRuntime.queryLedgerState(context,
                                        partialProofData,
                                        [
                                         { idx: { cached: false,
                                                  pushPath: true,
                                                  path: [
                                                         { tag: 'value',
                                                           value: { value: _descriptor_8.toValue(1n),
                                                                    alignment: _descriptor_8.alignment() } },
                                                         { tag: 'value',
                                                           value: { value: _descriptor_8.toValue(1n),
                                                                    alignment: _descriptor_8.alignment() } }] } },
                                         { push: { storage: false,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(tmp_7),
                                                                                                alignment: _descriptor_0.alignment() }).encode() } },
                                         { push: { storage: true,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_22.toValue(reviewedRecord_0),
                                                                                                alignment: _descriptor_22.alignment() }).encode() } },
                                         { ins: { cached: false, n: 1 } },
                                         { ins: { cached: true, n: 2 } }]);
    }
    const tmp_8 = 1n;
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_8.toValue(1n),
                                                                  alignment: _descriptor_8.alignment() } },
                                                       { tag: 'value',
                                                         value: { value: _descriptor_8.toValue(2n),
                                                                  alignment: _descriptor_8.alignment() } }] } },
                                       { addi: { immediate: parseInt(__compactRuntime.valueToBigInt(
                                                              { value: _descriptor_4.toValue(tmp_8),
                                                                alignment: _descriptor_4.alignment() }
                                                                .value
                                                            )) } },
                                       { ins: { cached: true, n: 2 } }]);
    return nextCount_0;
  }
  _verifyProofModuleLifecycleCommand_0(context,
                                       partialProofData,
                                       command_0,
                                       signature_0,
                                       authority_0,
                                       authorityPath_0,
                                       requiredAuthorityKind_0)
  {
    let tmp_0;
    __compactRuntime.assert((tmp_0 = command_0.moduleKey,
                             _descriptor_6.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                       partialProofData,
                                                                                       [
                                                                                        { dup: { n: 0 } },
                                                                                        { idx: { cached: false,
                                                                                                 pushPath: false,
                                                                                                 path: [
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_8.toValue(1n),
                                                                                                                   alignment: _descriptor_8.alignment() } },
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_8.toValue(1n),
                                                                                                                   alignment: _descriptor_8.alignment() } }] } },
                                                                                        { push: { storage: false,
                                                                                                  value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(tmp_0),
                                                                                                                                               alignment: _descriptor_0.alignment() }).encode() } },
                                                                                        'member',
                                                                                        { popeq: { cached: true,
                                                                                                   result: undefined } }]).value)),
                            'Proof module is not registered');
    let tmp_1;
    const record_0 = (tmp_1 = command_0.moduleKey,
                      _descriptor_22.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                 partialProofData,
                                                                                 [
                                                                                  { dup: { n: 0 } },
                                                                                  { idx: { cached: false,
                                                                                           pushPath: false,
                                                                                           path: [
                                                                                                  { tag: 'value',
                                                                                                    value: { value: _descriptor_8.toValue(1n),
                                                                                                             alignment: _descriptor_8.alignment() } },
                                                                                                  { tag: 'value',
                                                                                                    value: { value: _descriptor_8.toValue(1n),
                                                                                                             alignment: _descriptor_8.alignment() } }] } },
                                                                                  { idx: { cached: false,
                                                                                           pushPath: false,
                                                                                           path: [
                                                                                                  { tag: 'value',
                                                                                                    value: { value: _descriptor_0.toValue(tmp_1),
                                                                                                             alignment: _descriptor_0.alignment() } }] } },
                                                                                  { popeq: { cached: false,
                                                                                             result: undefined } }]).value));
    this._assertModuleCommandTarget_0(context,
                                      partialProofData,
                                      command_0,
                                      record_0);
    this._verifyModuleAuthority_0(context,
                                  partialProofData,
                                  command_0.governanceNamespaceHash,
                                  command_0.governancePolicyHash,
                                  command_0.authorityRootVersion,
                                  command_0.authorityRootSequence,
                                  command_0.effectiveAt,
                                  requiredAuthorityKind_0,
                                  authority_0,
                                  authorityPath_0);
    __compactRuntime.assert(this._blockTimeGte_0(context,
                                                 partialProofData,
                                                 command_0.effectiveAt),
                            'Proof-module lifecycle command is not yet effective');
    this._schnorrVerify_0(context,
                          partialProofData,
                          this._proofModuleLifecycleCommandMessage_0(command_0),
                          signature_0,
                          authority_0.publicKey);
    return record_0;
  }
  _commitProofModuleLifecycle_0(context, partialProofData, command_0, record_0)
  {
    const tmp_0 = command_0.commandNonce;
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_8.toValue(1n),
                                                                  alignment: _descriptor_8.alignment() } },
                                                       { tag: 'value',
                                                         value: { value: _descriptor_8.toValue(5n),
                                                                  alignment: _descriptor_8.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(tmp_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newNull().encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 2 } }]);
    const tmp_1 = command_0.moduleKey;
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_8.toValue(1n),
                                                                  alignment: _descriptor_8.alignment() } },
                                                       { tag: 'value',
                                                         value: { value: _descriptor_8.toValue(1n),
                                                                  alignment: _descriptor_8.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(tmp_1),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_22.toValue(record_0),
                                                                                              alignment: _descriptor_22.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 2 } }]);
    const tmp_2 = 1n;
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_8.toValue(1n),
                                                                  alignment: _descriptor_8.alignment() } },
                                                       { tag: 'value',
                                                         value: { value: _descriptor_8.toValue(2n),
                                                                  alignment: _descriptor_8.alignment() } }] } },
                                       { addi: { immediate: parseInt(__compactRuntime.valueToBigInt(
                                                              { value: _descriptor_4.toValue(tmp_2),
                                                                alignment: _descriptor_4.alignment() }
                                                                .value
                                                            )) } },
                                       { ins: { cached: true, n: 2 } }]);
    return [];
  }
  _governProofModule_0(context,
                       partialProofData,
                       command_0,
                       signature_0,
                       authority_0,
                       authorityPath_0)
  {
    if (this._equal_54(command_0.nextLifecycleStatus, 3n)) {
      const record_0 = this._verifyProofModuleLifecycleCommand_0(context,
                                                                 partialProofData,
                                                                 command_0,
                                                                 signature_0,
                                                                 authority_0,
                                                                 authorityPath_0,
                                                                 8n);
      let t_0;
      __compactRuntime.assert(this._equal_55(command_0.expectedLifecycleStatus,
                                             2n)
                              &&
                              this._equal_56(command_0.nextLifecycleStatus, 3n)
                              &&
                              (t_0 = record_0.reviewCount,
                               t_0 >= record_0.reviewThreshold),
                              'Proof module has not completed the required independent review');
      const approverCommitment_0 = this._governanceActivatorLeafCommitment_0(authority_0);
      const approvalKey_0 = this._persistentHash_20({ moduleKey:
                                                        command_0.moduleKey,
                                                      approverAuthorityCommitment:
                                                        approverCommitment_0 });
      __compactRuntime.assert(!_descriptor_6.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                         partialProofData,
                                                                                         [
                                                                                          { dup: { n: 0 } },
                                                                                          { idx: { cached: false,
                                                                                                   pushPath: false,
                                                                                                   path: [
                                                                                                          { tag: 'value',
                                                                                                            value: { value: _descriptor_8.toValue(1n),
                                                                                                                     alignment: _descriptor_8.alignment() } },
                                                                                                          { tag: 'value',
                                                                                                            value: { value: _descriptor_8.toValue(4n),
                                                                                                                     alignment: _descriptor_8.alignment() } }] } },
                                                                                          { push: { storage: false,
                                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(approvalKey_0),
                                                                                                                                                 alignment: _descriptor_0.alignment() }).encode() } },
                                                                                          'member',
                                                                                          { popeq: { cached: true,
                                                                                                     result: undefined } }]).value),
                              'Duplicate proof-module approver approval');
      const approvalCommitment_0 = this._persistentHash_21(command_0);
      const nextAccumulator_0 = this._persistentHash_22({ previous:
                                                            record_0.approvalEvidenceAccumulator,
                                                          approvalCommitment:
                                                            approvalCommitment_0,
                                                          approverAuthorityCommitment:
                                                            approverCommitment_0 });
      const nextCount_0 = ((t1) => {
                            if (t1 > 65535n) {
                              throw new __compactRuntime.CompactError('permio-authorization.compact line 1420 char 27: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 65535');
                            }
                            return t1;
                          })(record_0.approvalCount + 1n);
      const thresholdReached_0 = nextCount_0 >= record_0.approvalThreshold;
      const approvedRecord_0 = { identity: record_0.identity,
                                 proposalCommitment: record_0.proposalCommitment,
                                 governanceNamespaceHash:
                                   record_0.governanceNamespaceHash,
                                 governancePolicyHash:
                                   record_0.governancePolicyHash,
                                 authorityRootVersion:
                                   record_0.authorityRootVersion,
                                 authorityRootSequence:
                                   record_0.authorityRootSequence,
                                 implementationReferenceHash:
                                   record_0.implementationReferenceHash,
                                 sourceHash: record_0.sourceHash,
                                 inputSchemaHash: record_0.inputSchemaHash,
                                 configurationSchemaHash:
                                   record_0.configurationSchemaHash,
                                 receiptSchemaHash: record_0.receiptSchemaHash,
                                 compilerVersionHash:
                                   record_0.compilerVersionHash,
                                 compatibilityPolicyHash:
                                   record_0.compatibilityPolicyHash,
                                 approvalEvidenceCommitment:
                                   record_0.approvalEvidenceCommitment,
                                 reviewThreshold: record_0.reviewThreshold,
                                 reviewCount: record_0.reviewCount,
                                 reviewEvidenceAccumulator:
                                   record_0.reviewEvidenceAccumulator,
                                 approvalThreshold: record_0.approvalThreshold,
                                 approvalCount: nextCount_0,
                                 approvalEvidenceAccumulator: nextAccumulator_0,
                                 lifecycleStatus: record_0.lifecycleStatus,
                                 activationSequence: record_0.activationSequence,
                                 proposedAt: record_0.proposedAt,
                                 reviewedAt: record_0.reviewedAt,
                                 approvedAt: record_0.approvedAt,
                                 activatedAt: record_0.activatedAt,
                                 deprecatedAt: record_0.deprecatedAt,
                                 revokedAt: record_0.revokedAt };
      const tmp_0 = command_0.commandNonce;
      __compactRuntime.queryLedgerState(context,
                                        partialProofData,
                                        [
                                         { idx: { cached: false,
                                                  pushPath: true,
                                                  path: [
                                                         { tag: 'value',
                                                           value: { value: _descriptor_8.toValue(1n),
                                                                    alignment: _descriptor_8.alignment() } },
                                                         { tag: 'value',
                                                           value: { value: _descriptor_8.toValue(5n),
                                                                    alignment: _descriptor_8.alignment() } }] } },
                                         { push: { storage: false,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(tmp_0),
                                                                                                alignment: _descriptor_0.alignment() }).encode() } },
                                         { push: { storage: true,
                                                   value: __compactRuntime.StateValue.newNull().encode() } },
                                         { ins: { cached: false, n: 1 } },
                                         { ins: { cached: true, n: 2 } }]);
      const tmp_1 = { moduleKey: command_0.moduleKey,
                      approverAuthorityCommitment: approverCommitment_0,
                      approvalCommitment: approvalCommitment_0,
                      approvedAt: command_0.effectiveAt };
      __compactRuntime.queryLedgerState(context,
                                        partialProofData,
                                        [
                                         { idx: { cached: false,
                                                  pushPath: true,
                                                  path: [
                                                         { tag: 'value',
                                                           value: { value: _descriptor_8.toValue(1n),
                                                                    alignment: _descriptor_8.alignment() } },
                                                         { tag: 'value',
                                                           value: { value: _descriptor_8.toValue(4n),
                                                                    alignment: _descriptor_8.alignment() } }] } },
                                         { push: { storage: false,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(approvalKey_0),
                                                                                                alignment: _descriptor_0.alignment() }).encode() } },
                                         { push: { storage: true,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_28.toValue(tmp_1),
                                                                                                alignment: _descriptor_28.alignment() }).encode() } },
                                         { ins: { cached: false, n: 1 } },
                                         { ins: { cached: true, n: 2 } }]);
      if (thresholdReached_0) {
        const tmp_2 = command_0.moduleKey;
        const tmp_3 = this._updatedProofModuleRecord_0(approvedRecord_0,
                                                       3n,
                                                       nextAccumulator_0,
                                                       record_0.activationSequence,
                                                       record_0.reviewedAt,
                                                       command_0.effectiveAt,
                                                       record_0.activatedAt,
                                                       record_0.deprecatedAt,
                                                       record_0.revokedAt);
        __compactRuntime.queryLedgerState(context,
                                          partialProofData,
                                          [
                                           { idx: { cached: false,
                                                    pushPath: true,
                                                    path: [
                                                           { tag: 'value',
                                                             value: { value: _descriptor_8.toValue(1n),
                                                                      alignment: _descriptor_8.alignment() } },
                                                           { tag: 'value',
                                                             value: { value: _descriptor_8.toValue(1n),
                                                                      alignment: _descriptor_8.alignment() } }] } },
                                           { push: { storage: false,
                                                     value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(tmp_2),
                                                                                                  alignment: _descriptor_0.alignment() }).encode() } },
                                           { push: { storage: true,
                                                     value: __compactRuntime.StateValue.newCell({ value: _descriptor_22.toValue(tmp_3),
                                                                                                  alignment: _descriptor_22.alignment() }).encode() } },
                                           { ins: { cached: false, n: 1 } },
                                           { ins: { cached: true, n: 2 } }]);
      } else {
        const tmp_4 = command_0.moduleKey;
        __compactRuntime.queryLedgerState(context,
                                          partialProofData,
                                          [
                                           { idx: { cached: false,
                                                    pushPath: true,
                                                    path: [
                                                           { tag: 'value',
                                                             value: { value: _descriptor_8.toValue(1n),
                                                                      alignment: _descriptor_8.alignment() } },
                                                           { tag: 'value',
                                                             value: { value: _descriptor_8.toValue(1n),
                                                                      alignment: _descriptor_8.alignment() } }] } },
                                           { push: { storage: false,
                                                     value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(tmp_4),
                                                                                                  alignment: _descriptor_0.alignment() }).encode() } },
                                           { push: { storage: true,
                                                     value: __compactRuntime.StateValue.newCell({ value: _descriptor_22.toValue(approvedRecord_0),
                                                                                                  alignment: _descriptor_22.alignment() }).encode() } },
                                           { ins: { cached: false, n: 1 } },
                                           { ins: { cached: true, n: 2 } }]);
      }
      const tmp_5 = 1n;
      __compactRuntime.queryLedgerState(context,
                                        partialProofData,
                                        [
                                         { idx: { cached: false,
                                                  pushPath: true,
                                                  path: [
                                                         { tag: 'value',
                                                           value: { value: _descriptor_8.toValue(1n),
                                                                    alignment: _descriptor_8.alignment() } },
                                                         { tag: 'value',
                                                           value: { value: _descriptor_8.toValue(2n),
                                                                    alignment: _descriptor_8.alignment() } }] } },
                                         { addi: { immediate: parseInt(__compactRuntime.valueToBigInt(
                                                                { value: _descriptor_4.toValue(tmp_5),
                                                                  alignment: _descriptor_4.alignment() }
                                                                  .value
                                                              )) } },
                                         { ins: { cached: true, n: 2 } }]);
      return nextCount_0;
    } else {
      if (this._equal_57(command_0.nextLifecycleStatus, 4n)) {
        const record_1 = this._verifyProofModuleLifecycleCommand_0(context,
                                                                   partialProofData,
                                                                   command_0,
                                                                   signature_0,
                                                                   authority_0,
                                                                   authorityPath_0,
                                                                   9n);
        __compactRuntime.assert(this._equal_58(command_0.expectedLifecycleStatus,
                                               3n)
                                &&
                                this._equal_59(command_0.nextLifecycleStatus, 4n),
                                'Invalid proof-module activation transition');
        const updated_0 = this._updatedProofModuleRecord_0(record_1,
                                                           4n,
                                                           record_1.approvalEvidenceCommitment,
                                                           _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                                     partialProofData,
                                                                                                                     [
                                                                                                                      { dup: { n: 0 } },
                                                                                                                      { idx: { cached: false,
                                                                                                                               pushPath: false,
                                                                                                                               path: [
                                                                                                                                      { tag: 'value',
                                                                                                                                        value: { value: _descriptor_8.toValue(1n),
                                                                                                                                                 alignment: _descriptor_8.alignment() } },
                                                                                                                                      { tag: 'value',
                                                                                                                                        value: { value: _descriptor_8.toValue(2n),
                                                                                                                                                 alignment: _descriptor_8.alignment() } }] } },
                                                                                                                      { popeq: { cached: true,
                                                                                                                                 result: undefined } }]).value),
                                                           record_1.reviewedAt,
                                                           record_1.approvedAt,
                                                           command_0.effectiveAt,
                                                           record_1.deprecatedAt,
                                                           record_1.revokedAt);
        this._commitProofModuleLifecycle_0(context,
                                           partialProofData,
                                           command_0,
                                           updated_0);
        return record_1.approvalCount;
      } else {
        if (this._equal_60(command_0.nextLifecycleStatus, 5n)) {
          const record_2 = this._verifyProofModuleLifecycleCommand_0(context,
                                                                     partialProofData,
                                                                     command_0,
                                                                     signature_0,
                                                                     authority_0,
                                                                     authorityPath_0,
                                                                     8n);
          __compactRuntime.assert(this._equal_61(command_0.expectedLifecycleStatus,
                                                 4n)
                                  &&
                                  this._equal_62(command_0.nextLifecycleStatus,
                                                 5n),
                                  'Invalid proof-module deprecation transition');
          const updated_1 = this._updatedProofModuleRecord_0(record_2,
                                                             5n,
                                                             record_2.approvalEvidenceCommitment,
                                                             record_2.activationSequence,
                                                             record_2.reviewedAt,
                                                             record_2.approvedAt,
                                                             record_2.activatedAt,
                                                             command_0.effectiveAt,
                                                             record_2.revokedAt);
          this._commitProofModuleLifecycle_0(context,
                                             partialProofData,
                                             command_0,
                                             updated_1);
          return record_2.approvalCount;
        } else {
          const record_3 = this._verifyProofModuleLifecycleCommand_0(context,
                                                                     partialProofData,
                                                                     command_0,
                                                                     signature_0,
                                                                     authority_0,
                                                                     authorityPath_0,
                                                                     10n);
          __compactRuntime.assert((this._equal_63(command_0.expectedLifecycleStatus,
                                                  4n)
                                   ||
                                   this._equal_64(command_0.expectedLifecycleStatus,
                                                  5n))
                                  &&
                                  this._equal_65(command_0.nextLifecycleStatus,
                                                 6n),
                                  'Invalid proof-module revocation transition');
          const updated_2 = this._updatedProofModuleRecord_0(record_3,
                                                             6n,
                                                             record_3.approvalEvidenceCommitment,
                                                             record_3.activationSequence,
                                                             record_3.reviewedAt,
                                                             record_3.approvedAt,
                                                             record_3.activatedAt,
                                                             record_3.deprecatedAt,
                                                             command_0.effectiveAt);
          this._commitProofModuleLifecycle_0(context,
                                             partialProofData,
                                             command_0,
                                             updated_2);
          return record_3.approvalCount;
        }
      }
    }
  }
  _verifyTemplateLifecycleCommand_0(context,
                                    partialProofData,
                                    command_0,
                                    signature_0,
                                    authority_0,
                                    authorityPath_0,
                                    requiredAuthorityKind_0)
  {
    __compactRuntime.assert(this._equal_66(command_0.commandVersion, 1n),
                            'Unsupported template lifecycle command version');
    let tmp_0;
    __compactRuntime.assert((tmp_0 = command_0.registryKey,
                             _descriptor_6.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                       partialProofData,
                                                                                       [
                                                                                        { dup: { n: 0 } },
                                                                                        { idx: { cached: false,
                                                                                                 pushPath: false,
                                                                                                 path: [
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_8.toValue(1n),
                                                                                                                   alignment: _descriptor_8.alignment() } },
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_8.toValue(8n),
                                                                                                                   alignment: _descriptor_8.alignment() } }] } },
                                                                                        { push: { storage: false,
                                                                                                  value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(tmp_0),
                                                                                                                                               alignment: _descriptor_0.alignment() }).encode() } },
                                                                                        'member',
                                                                                        { popeq: { cached: true,
                                                                                                   result: undefined } }]).value)),
                            'Exact template version is not registered');
    let tmp_1;
    const record_0 = (tmp_1 = command_0.registryKey,
                      _descriptor_24.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                 partialProofData,
                                                                                 [
                                                                                  { dup: { n: 0 } },
                                                                                  { idx: { cached: false,
                                                                                           pushPath: false,
                                                                                           path: [
                                                                                                  { tag: 'value',
                                                                                                    value: { value: _descriptor_8.toValue(1n),
                                                                                                             alignment: _descriptor_8.alignment() } },
                                                                                                  { tag: 'value',
                                                                                                    value: { value: _descriptor_8.toValue(8n),
                                                                                                             alignment: _descriptor_8.alignment() } }] } },
                                                                                  { idx: { cached: false,
                                                                                           pushPath: false,
                                                                                           path: [
                                                                                                  { tag: 'value',
                                                                                                    value: { value: _descriptor_0.toValue(tmp_1),
                                                                                                             alignment: _descriptor_0.alignment() } }] } },
                                                                                  { popeq: { cached: false,
                                                                                             result: undefined } }]).value));
    __compactRuntime.assert(this._equal_67(command_0.recordCommitment,
                                           this._activeTemplateRecordCommitment_0(record_0))
                            &&
                            this._equal_68(command_0.namespaceHash,
                                           record_0.target.namespaceHash)
                            &&
                            this._equal_69(command_0.expectedLifecycleStatus,
                                           record_0.lifecycleStatus),
                            'Template lifecycle command does not bind the exact current record');
    let tmp_2;
    __compactRuntime.assert(!(tmp_2 = command_0.commandNonce,
                              _descriptor_6.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                        partialProofData,
                                                                                        [
                                                                                         { dup: { n: 0 } },
                                                                                         { idx: { cached: false,
                                                                                                  pushPath: false,
                                                                                                  path: [
                                                                                                         { tag: 'value',
                                                                                                           value: { value: _descriptor_8.toValue(1n),
                                                                                                                    alignment: _descriptor_8.alignment() } },
                                                                                                         { tag: 'value',
                                                                                                           value: { value: _descriptor_8.toValue(12n),
                                                                                                                    alignment: _descriptor_8.alignment() } }] } },
                                                                                         { push: { storage: false,
                                                                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(tmp_2),
                                                                                                                                                alignment: _descriptor_0.alignment() }).encode() } },
                                                                                         'member',
                                                                                         { popeq: { cached: true,
                                                                                                    result: undefined } }]).value)),
                            'Template lifecycle command nonce already used');
    let tmp_3;
    __compactRuntime.assert((tmp_3 = command_0.namespaceHash,
                             _descriptor_6.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                       partialProofData,
                                                                                       [
                                                                                        { dup: { n: 0 } },
                                                                                        { idx: { cached: false,
                                                                                                 pushPath: false,
                                                                                                 path: [
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_8.toValue(0n),
                                                                                                                   alignment: _descriptor_8.alignment() } },
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_8.toValue(1n),
                                                                                                                   alignment: _descriptor_8.alignment() } }] } },
                                                                                        { push: { storage: false,
                                                                                                  value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(tmp_3),
                                                                                                                                               alignment: _descriptor_0.alignment() }).encode() } },
                                                                                        'member',
                                                                                        { popeq: { cached: true,
                                                                                                   result: undefined } }]).value)),
                            'No authority root is registered for the template namespace');
    let tmp_4;
    const currentRoot_0 = (tmp_4 = command_0.namespaceHash,
                           _descriptor_5.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                     partialProofData,
                                                                                     [
                                                                                      { dup: { n: 0 } },
                                                                                      { idx: { cached: false,
                                                                                               pushPath: false,
                                                                                               path: [
                                                                                                      { tag: 'value',
                                                                                                        value: { value: _descriptor_8.toValue(0n),
                                                                                                                 alignment: _descriptor_8.alignment() } },
                                                                                                      { tag: 'value',
                                                                                                        value: { value: _descriptor_8.toValue(1n),
                                                                                                                 alignment: _descriptor_8.alignment() } }] } },
                                                                                      { idx: { cached: false,
                                                                                               pushPath: false,
                                                                                               path: [
                                                                                                      { tag: 'value',
                                                                                                        value: { value: _descriptor_0.toValue(tmp_4),
                                                                                                                 alignment: _descriptor_0.alignment() } }] } },
                                                                                      { popeq: { cached: false,
                                                                                                 result: undefined } }]).value));
    __compactRuntime.assert(this._equal_70(command_0.governancePolicyHash,
                                           currentRoot_0.governancePolicyHash)
                            &&
                            this._equal_71(command_0.authorityRootVersion,
                                           currentRoot_0.rootVersion)
                            &&
                            this._equal_72(command_0.authorityRootSequence,
                                           currentRoot_0.rootSequence),
                            'Template lifecycle authority root reference is stale or mismatched');
    __compactRuntime.assert(this._equal_73(authority_0.leafVersion, 1n)
                            &&
                            this._equal_74(authority_0.authorityKind,
                                           requiredAuthorityKind_0)
                            &&
                            this._equal_75(authority_0.namespaceHash,
                                           command_0.namespaceHash)
                            &&
                            this._equal_76(authority_0.governancePolicyHash,
                                           command_0.governancePolicyHash),
                            'Template lifecycle authority leaf is outside the required scope');
    let t_0, t_1;
    __compactRuntime.assert((t_1 = command_0.effectiveAt,
                             t_1 >= authority_0.validAfter)
                            &&
                            (t_0 = command_0.effectiveAt,
                             t_0 < authority_0.validBefore),
                            'Template lifecycle authority is outside its validity window');
    const authorityCommitment_0 = this._governanceActivatorLeafCommitment_0(authority_0);
    __compactRuntime.assert(this._equal_77(authorityPath_0.leaf,
                                           authorityCommitment_0)
                            &&
                            this._equal_78(this._merkleTreePathRoot_2(authorityPath_0),
                                           currentRoot_0.root),
                            'Template lifecycle authority is not eligible under the current root');
    __compactRuntime.assert(this._equal_79(command_0.effectiveSequence,
                                           _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                     partialProofData,
                                                                                                     [
                                                                                                      { dup: { n: 0 } },
                                                                                                      { idx: { cached: false,
                                                                                                               pushPath: false,
                                                                                                               path: [
                                                                                                                      { tag: 'value',
                                                                                                                        value: { value: _descriptor_8.toValue(1n),
                                                                                                                                 alignment: _descriptor_8.alignment() } },
                                                                                                                      { tag: 'value',
                                                                                                                        value: { value: _descriptor_8.toValue(11n),
                                                                                                                                 alignment: _descriptor_8.alignment() } }] } },
                                                                                                      { popeq: { cached: true,
                                                                                                                 result: undefined } }]).value)
                                           +
                                           1n),
                            'Template lifecycle sequence is stale or skips history');
    __compactRuntime.assert(this._blockTimeGte_0(context,
                                                 partialProofData,
                                                 command_0.effectiveAt),
                            'Template lifecycle command is not yet effective');
    this._schnorrVerify_0(context,
                          partialProofData,
                          this._templateLifecycleCommandMessage_0(command_0),
                          signature_0,
                          authority_0.publicKey);
    return record_0;
  }
  _updatedActiveTemplateRecord_0(record_0,
                                 lifecycleStatus_0,
                                 terminationEffectiveSequence_0,
                                 terminationReasonHash_0,
                                 retiredAt_0,
                                 revokedAt_0)
  {
    return { target: record_0.target,
             governancePolicyHash: record_0.governancePolicyHash,
             proofModuleBindingsHash: record_0.proofModuleBindingsHash,
             proofModuleBindingRoot: record_0.proofModuleBindingRoot,
             proofModuleBindingCount: record_0.proofModuleBindingCount,
             proofModuleRegistrySequence: record_0.proofModuleRegistrySequence,
             stagedBindingsAccumulator: record_0.stagedBindingsAccumulator,
             m4ActivationRecordHash: record_0.m4ActivationRecordHash,
             approvalEvidenceCommitment: record_0.approvalEvidenceCommitment,
             authorityRootVersion: record_0.authorityRootVersion,
             authorityRootSequence: record_0.authorityRootSequence,
             lifecycleStatus: lifecycleStatus_0,
             activationSequence: record_0.activationSequence,
             activatedAt: record_0.activatedAt,
             terminationEffectiveSequence: terminationEffectiveSequence_0,
             terminationReasonHash: terminationReasonHash_0,
             retiredAt: retiredAt_0,
             revokedAt: revokedAt_0 };
  }
  _commitTemplateLifecycle_0(context, partialProofData, command_0, record_0) {
    const tmp_0 = command_0.commandNonce;
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_8.toValue(1n),
                                                                  alignment: _descriptor_8.alignment() } },
                                                       { tag: 'value',
                                                         value: { value: _descriptor_8.toValue(12n),
                                                                  alignment: _descriptor_8.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(tmp_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newNull().encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 2 } }]);
    const tmp_1 = command_0.registryKey;
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_8.toValue(1n),
                                                                  alignment: _descriptor_8.alignment() } },
                                                       { tag: 'value',
                                                         value: { value: _descriptor_8.toValue(8n),
                                                                  alignment: _descriptor_8.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(tmp_1),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_24.toValue(record_0),
                                                                                              alignment: _descriptor_24.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 2 } }]);
    const tmp_2 = 1n;
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_8.toValue(1n),
                                                                  alignment: _descriptor_8.alignment() } },
                                                       { tag: 'value',
                                                         value: { value: _descriptor_8.toValue(11n),
                                                                  alignment: _descriptor_8.alignment() } }] } },
                                       { addi: { immediate: parseInt(__compactRuntime.valueToBigInt(
                                                              { value: _descriptor_4.toValue(tmp_2),
                                                                alignment: _descriptor_4.alignment() }
                                                                .value
                                                            )) } },
                                       { ins: { cached: true, n: 2 } }]);
    return [];
  }
  _terminateTemplate_0(context,
                       partialProofData,
                       command_0,
                       signature_0,
                       authority_0,
                       authorityPath_0)
  {
    if (this._equal_80(command_0.nextLifecycleStatus, 2n)) {
      const record_0 = this._verifyTemplateLifecycleCommand_0(context,
                                                              partialProofData,
                                                              command_0,
                                                              signature_0,
                                                              authority_0,
                                                              authorityPath_0,
                                                              12n);
      __compactRuntime.assert(this._equal_81(command_0.expectedLifecycleStatus,
                                             1n)
                              &&
                              this._equal_82(command_0.nextLifecycleStatus, 2n),
                              'Invalid template retirement transition');
      this._commitTemplateLifecycle_0(context,
                                      partialProofData,
                                      command_0,
                                      this._updatedActiveTemplateRecord_0(record_0,
                                                                          2n,
                                                                          command_0.effectiveSequence,
                                                                          command_0.reasonHash,
                                                                          command_0.effectiveAt,
                                                                          record_0.revokedAt));
      return true;
    } else {
      const record_1 = this._verifyTemplateLifecycleCommand_0(context,
                                                              partialProofData,
                                                              command_0,
                                                              signature_0,
                                                              authority_0,
                                                              authorityPath_0,
                                                              5n);
      __compactRuntime.assert((this._equal_83(command_0.expectedLifecycleStatus,
                                              1n)
                               ||
                               this._equal_84(command_0.expectedLifecycleStatus,
                                              2n))
                              &&
                              this._equal_85(command_0.nextLifecycleStatus, 3n),
                              'Invalid template revocation transition');
      this._commitTemplateLifecycle_0(context,
                                      partialProofData,
                                      command_0,
                                      this._updatedActiveTemplateRecord_0(record_1,
                                                                          3n,
                                                                          command_0.effectiveSequence,
                                                                          command_0.reasonHash,
                                                                          record_1.retiredAt,
                                                                          command_0.effectiveAt));
      return true;
    }
  }
  _removeActivationSession_0(context, partialProofData, registryKey_0, session_0)
  {
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_8.toValue(1n),
                                                                  alignment: _descriptor_8.alignment() } },
                                                       { tag: 'value',
                                                         value: { value: _descriptor_8.toValue(6n),
                                                                  alignment: _descriptor_8.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(registryKey_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { rem: { cached: false } },
                                       { ins: { cached: true, n: 2 } }]);
    const tmp_0 = session_0.admissionNonce;
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_8.toValue(1n),
                                                                  alignment: _descriptor_8.alignment() } },
                                                       { tag: 'value',
                                                         value: { value: _descriptor_8.toValue(7n),
                                                                  alignment: _descriptor_8.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(tmp_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { rem: { cached: false } },
                                       { ins: { cached: true, n: 2 } }]);
    return [];
  }
  _activationSessionStale_0(context, partialProofData, session_0) {
    let tmp_0;
    if (!(tmp_0 = session_0.namespaceHash,
          _descriptor_6.fromValue(__compactRuntime.queryLedgerState(context,
                                                                    partialProofData,
                                                                    [
                                                                     { dup: { n: 0 } },
                                                                     { idx: { cached: false,
                                                                              pushPath: false,
                                                                              path: [
                                                                                     { tag: 'value',
                                                                                       value: { value: _descriptor_8.toValue(0n),
                                                                                                alignment: _descriptor_8.alignment() } },
                                                                                     { tag: 'value',
                                                                                       value: { value: _descriptor_8.toValue(1n),
                                                                                                alignment: _descriptor_8.alignment() } }] } },
                                                                     { push: { storage: false,
                                                                               value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(tmp_0),
                                                                                                                            alignment: _descriptor_0.alignment() }).encode() } },
                                                                     'member',
                                                                     { popeq: { cached: true,
                                                                                result: undefined } }]).value)))
    {
      return true;
    } else {
      let tmp_1;
      const currentRoot_0 = (tmp_1 = session_0.namespaceHash,
                             _descriptor_5.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                       partialProofData,
                                                                                       [
                                                                                        { dup: { n: 0 } },
                                                                                        { idx: { cached: false,
                                                                                                 pushPath: false,
                                                                                                 path: [
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_8.toValue(0n),
                                                                                                                   alignment: _descriptor_8.alignment() } },
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_8.toValue(1n),
                                                                                                                   alignment: _descriptor_8.alignment() } }] } },
                                                                                        { idx: { cached: false,
                                                                                                 pushPath: false,
                                                                                                 path: [
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_0.toValue(tmp_1),
                                                                                                                   alignment: _descriptor_0.alignment() } }] } },
                                                                                        { popeq: { cached: false,
                                                                                                   result: undefined } }]).value));
      return !this._equal_86(session_0.proofModuleRegistrySequence,
                             _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                       partialProofData,
                                                                                       [
                                                                                        { dup: { n: 0 } },
                                                                                        { idx: { cached: false,
                                                                                                 pushPath: false,
                                                                                                 path: [
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_8.toValue(1n),
                                                                                                                   alignment: _descriptor_8.alignment() } },
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_8.toValue(2n),
                                                                                                                   alignment: _descriptor_8.alignment() } }] } },
                                                                                        { popeq: { cached: true,
                                                                                                   result: undefined } }]).value))
             ||
             !this._equal_87(session_0.governancePolicyHash,
                             currentRoot_0.governancePolicyHash)
             ||
             !this._equal_88(session_0.authorityRootVersion,
                             currentRoot_0.rootVersion)
             ||
             !this._equal_89(session_0.authorityRootSequence,
                             currentRoot_0.rootSequence);
    }
  }
  _beginM4Activation_0(context,
                       partialProofData,
                       envelope_0,
                       signature_0,
                       activator_0,
                       authorityPath_0)
  {
    this._verifyAdmissionAuthority_0(context,
                                     partialProofData,
                                     envelope_0,
                                     signature_0,
                                     activator_0,
                                     authorityPath_0);
    let t_0;
    __compactRuntime.assert((t_0 = envelope_0.proofModuleBindingCount, t_0 > 0n),
                            'Binding manifest cannot be empty');
    __compactRuntime.assert(this._equal_90(envelope_0.proofModuleRegistrySequence,
                                           _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                     partialProofData,
                                                                                                     [
                                                                                                      { dup: { n: 0 } },
                                                                                                      { idx: { cached: false,
                                                                                                               pushPath: false,
                                                                                                               path: [
                                                                                                                      { tag: 'value',
                                                                                                                        value: { value: _descriptor_8.toValue(1n),
                                                                                                                                 alignment: _descriptor_8.alignment() } },
                                                                                                                      { tag: 'value',
                                                                                                                        value: { value: _descriptor_8.toValue(2n),
                                                                                                                                 alignment: _descriptor_8.alignment() } }] } },
                                                                                                      { popeq: { cached: true,
                                                                                                                 result: undefined } }]).value)),
                            'Proof-module registry sequence is stale');
    __compactRuntime.assert(this._blockTimeLt_0(context,
                                                partialProofData,
                                                envelope_0.stagingExpiresAt),
                            'Activation staging deadline has passed');
    let tmp_0;
    __compactRuntime.assert(!(tmp_0 = envelope_0.admissionNonce,
                              _descriptor_6.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                        partialProofData,
                                                                                        [
                                                                                         { dup: { n: 0 } },
                                                                                         { idx: { cached: false,
                                                                                                  pushPath: false,
                                                                                                  path: [
                                                                                                         { tag: 'value',
                                                                                                           value: { value: _descriptor_8.toValue(1n),
                                                                                                                    alignment: _descriptor_8.alignment() } },
                                                                                                         { tag: 'value',
                                                                                                           value: { value: _descriptor_8.toValue(9n),
                                                                                                                    alignment: _descriptor_8.alignment() } }] } },
                                                                                         { push: { storage: false,
                                                                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(tmp_0),
                                                                                                                                                alignment: _descriptor_0.alignment() }).encode() } },
                                                                                         'member',
                                                                                         { popeq: { cached: true,
                                                                                                    result: undefined } }]).value)),
                            'Admission nonce already used');
    const registryKey_0 = this._templateRegistryKey_0(envelope_0);
    __compactRuntime.assert(!_descriptor_6.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                       partialProofData,
                                                                                       [
                                                                                        { dup: { n: 0 } },
                                                                                        { idx: { cached: false,
                                                                                                 pushPath: false,
                                                                                                 path: [
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_8.toValue(1n),
                                                                                                                   alignment: _descriptor_8.alignment() } },
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_8.toValue(8n),
                                                                                                                   alignment: _descriptor_8.alignment() } }] } },
                                                                                        { push: { storage: false,
                                                                                                  value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(registryKey_0),
                                                                                                                                               alignment: _descriptor_0.alignment() }).encode() } },
                                                                                        'member',
                                                                                        { popeq: { cached: true,
                                                                                                   result: undefined } }]).value),
                            'Exact template version is already registered');
    if (_descriptor_6.fromValue(__compactRuntime.queryLedgerState(context,
                                                                  partialProofData,
                                                                  [
                                                                   { dup: { n: 0 } },
                                                                   { idx: { cached: false,
                                                                            pushPath: false,
                                                                            path: [
                                                                                   { tag: 'value',
                                                                                     value: { value: _descriptor_8.toValue(1n),
                                                                                              alignment: _descriptor_8.alignment() } },
                                                                                   { tag: 'value',
                                                                                     value: { value: _descriptor_8.toValue(6n),
                                                                                              alignment: _descriptor_8.alignment() } }] } },
                                                                   { push: { storage: false,
                                                                             value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(registryKey_0),
                                                                                                                          alignment: _descriptor_0.alignment() }).encode() } },
                                                                   'member',
                                                                   { popeq: { cached: true,
                                                                              result: undefined } }]).value))
    {
      const previous_0 = _descriptor_20.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                    partialProofData,
                                                                                    [
                                                                                     { dup: { n: 0 } },
                                                                                     { idx: { cached: false,
                                                                                              pushPath: false,
                                                                                              path: [
                                                                                                     { tag: 'value',
                                                                                                       value: { value: _descriptor_8.toValue(1n),
                                                                                                                alignment: _descriptor_8.alignment() } },
                                                                                                     { tag: 'value',
                                                                                                       value: { value: _descriptor_8.toValue(6n),
                                                                                                                alignment: _descriptor_8.alignment() } }] } },
                                                                                     { idx: { cached: false,
                                                                                              pushPath: false,
                                                                                              path: [
                                                                                                     { tag: 'value',
                                                                                                       value: { value: _descriptor_0.toValue(registryKey_0),
                                                                                                                alignment: _descriptor_0.alignment() } }] } },
                                                                                     { popeq: { cached: false,
                                                                                                result: undefined } }]).value);
      if (this._blockTimeGte_0(context, partialProofData, previous_0.expiresAt)
          ||
          this._activationSessionStale_0(context, partialProofData, previous_0))
      {
        this._removeActivationSession_0(context,
                                        partialProofData,
                                        registryKey_0,
                                        previous_0);
      } else {
        __compactRuntime.assert(false,
                                'An activation session already exists for this template version');
      }
    }
    let tmp_1;
    __compactRuntime.assert(!(tmp_1 = envelope_0.admissionNonce,
                              _descriptor_6.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                        partialProofData,
                                                                                        [
                                                                                         { dup: { n: 0 } },
                                                                                         { idx: { cached: false,
                                                                                                  pushPath: false,
                                                                                                  path: [
                                                                                                         { tag: 'value',
                                                                                                           value: { value: _descriptor_8.toValue(1n),
                                                                                                                    alignment: _descriptor_8.alignment() } },
                                                                                                         { tag: 'value',
                                                                                                           value: { value: _descriptor_8.toValue(7n),
                                                                                                                    alignment: _descriptor_8.alignment() } }] } },
                                                                                         { push: { storage: false,
                                                                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(tmp_1),
                                                                                                                                                alignment: _descriptor_0.alignment() }).encode() } },
                                                                                         'member',
                                                                                         { popeq: { cached: true,
                                                                                                    result: undefined } }]).value)),
                            'Admission nonce is reserved by another activation session');
    const session_0 = { envelopeCommitment:
                          this._activationAdmissionEnvelopeCommitment_0(envelope_0),
                        namespaceHash: envelope_0.namespaceHash,
                        governancePolicyHash: envelope_0.governancePolicyHash,
                        authorityRootVersion: envelope_0.authorityRootVersion,
                        authorityRootSequence: envelope_0.authorityRootSequence,
                        proofModuleBindingsHash:
                          envelope_0.proofModuleBindingsHash,
                        proofModuleBindingRoot:
                          envelope_0.proofModuleBindingRoot,
                        proofModuleBindingCount:
                          envelope_0.proofModuleBindingCount,
                        proofModuleRegistrySequence:
                          envelope_0.proofModuleRegistrySequence,
                        nextBindingIndex: 0n,
                        stagedBindingsAccumulator: new Uint8Array(32),
                        admissionNonce: envelope_0.admissionNonce,
                        expiresAt: envelope_0.stagingExpiresAt };
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_8.toValue(1n),
                                                                  alignment: _descriptor_8.alignment() } },
                                                       { tag: 'value',
                                                         value: { value: _descriptor_8.toValue(6n),
                                                                  alignment: _descriptor_8.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(registryKey_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_20.toValue(session_0),
                                                                                              alignment: _descriptor_20.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 2 } }]);
    const tmp_2 = envelope_0.admissionNonce;
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_8.toValue(1n),
                                                                  alignment: _descriptor_8.alignment() } },
                                                       { tag: 'value',
                                                         value: { value: _descriptor_8.toValue(7n),
                                                                  alignment: _descriptor_8.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(tmp_2),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(registryKey_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 2 } }]);
    return registryKey_0;
  }
  _stageM4ActivationBinding_0(context,
                              partialProofData,
                              registryKey_0,
                              binding_0,
                              bindingPath_0)
  {
    __compactRuntime.assert(_descriptor_6.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                      partialProofData,
                                                                                      [
                                                                                       { dup: { n: 0 } },
                                                                                       { idx: { cached: false,
                                                                                                pushPath: false,
                                                                                                path: [
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_8.toValue(1n),
                                                                                                                  alignment: _descriptor_8.alignment() } },
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_8.toValue(6n),
                                                                                                                  alignment: _descriptor_8.alignment() } }] } },
                                                                                       { push: { storage: false,
                                                                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(registryKey_0),
                                                                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                                                                       'member',
                                                                                       { popeq: { cached: true,
                                                                                                  result: undefined } }]).value),
                            'Activation session does not exist');
    const session_0 = _descriptor_20.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                 partialProofData,
                                                                                 [
                                                                                  { dup: { n: 0 } },
                                                                                  { idx: { cached: false,
                                                                                           pushPath: false,
                                                                                           path: [
                                                                                                  { tag: 'value',
                                                                                                    value: { value: _descriptor_8.toValue(1n),
                                                                                                             alignment: _descriptor_8.alignment() } },
                                                                                                  { tag: 'value',
                                                                                                    value: { value: _descriptor_8.toValue(6n),
                                                                                                             alignment: _descriptor_8.alignment() } }] } },
                                                                                  { idx: { cached: false,
                                                                                           pushPath: false,
                                                                                           path: [
                                                                                                  { tag: 'value',
                                                                                                    value: { value: _descriptor_0.toValue(registryKey_0),
                                                                                                             alignment: _descriptor_0.alignment() } }] } },
                                                                                  { popeq: { cached: false,
                                                                                             result: undefined } }]).value);
    if (this._blockTimeGte_0(context, partialProofData, session_0.expiresAt)
        ||
        this._activationSessionStale_0(context, partialProofData, session_0))
    {
      this._removeActivationSession_0(context,
                                      partialProofData,
                                      registryKey_0,
                                      session_0);
      return false;
    } else {
      __compactRuntime.assert(this._equal_91(session_0.proofModuleRegistrySequence,
                                             _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                       partialProofData,
                                                                                                       [
                                                                                                        { dup: { n: 0 } },
                                                                                                        { idx: { cached: false,
                                                                                                                 pushPath: false,
                                                                                                                 path: [
                                                                                                                        { tag: 'value',
                                                                                                                          value: { value: _descriptor_8.toValue(1n),
                                                                                                                                   alignment: _descriptor_8.alignment() } },
                                                                                                                        { tag: 'value',
                                                                                                                          value: { value: _descriptor_8.toValue(2n),
                                                                                                                                   alignment: _descriptor_8.alignment() } }] } },
                                                                                                        { popeq: { cached: true,
                                                                                                                   result: undefined } }]).value)),
                              'Proof-module registry changed during activation staging');
      let t_0;
      __compactRuntime.assert(this._equal_92(binding_0.bindingVersion, 1n)
                              &&
                              this._equal_93(binding_0.actionIndex,
                                             session_0.nextBindingIndex)
                              &&
                              (t_0 = binding_0.actionIndex,
                               t_0 < session_0.proofModuleBindingCount),
                              'Binding index is duplicate, missing, or out of canonical order');
      const bindingCommitment_0 = this._proofModuleBindingCommitment_0(binding_0);
      __compactRuntime.assert(this._equal_94(bindingPath_0.leaf,
                                             bindingCommitment_0)
                              &&
                              this._equal_95(this._merkleTreePathRoot_2(bindingPath_0),
                                             session_0.proofModuleBindingRoot),
                              'Binding is not part of the signed manifest');
      const moduleKey_0 = this._proofModuleRegistryKeyFromBinding_0(binding_0);
      __compactRuntime.assert(_descriptor_6.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                        partialProofData,
                                                                                        [
                                                                                         { dup: { n: 0 } },
                                                                                         { idx: { cached: false,
                                                                                                  pushPath: false,
                                                                                                  path: [
                                                                                                         { tag: 'value',
                                                                                                           value: { value: _descriptor_8.toValue(1n),
                                                                                                                    alignment: _descriptor_8.alignment() } },
                                                                                                         { tag: 'value',
                                                                                                           value: { value: _descriptor_8.toValue(1n),
                                                                                                                    alignment: _descriptor_8.alignment() } }] } },
                                                                                         { push: { storage: false,
                                                                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(moduleKey_0),
                                                                                                                                                alignment: _descriptor_0.alignment() }).encode() } },
                                                                                         'member',
                                                                                         { popeq: { cached: true,
                                                                                                    result: undefined } }]).value),
                              'Proof module is not registered');
      const moduleRecord_0 = _descriptor_22.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                        partialProofData,
                                                                                        [
                                                                                         { dup: { n: 0 } },
                                                                                         { idx: { cached: false,
                                                                                                  pushPath: false,
                                                                                                  path: [
                                                                                                         { tag: 'value',
                                                                                                           value: { value: _descriptor_8.toValue(1n),
                                                                                                                    alignment: _descriptor_8.alignment() } },
                                                                                                         { tag: 'value',
                                                                                                           value: { value: _descriptor_8.toValue(1n),
                                                                                                                    alignment: _descriptor_8.alignment() } }] } },
                                                                                         { idx: { cached: false,
                                                                                                  pushPath: false,
                                                                                                  path: [
                                                                                                         { tag: 'value',
                                                                                                           value: { value: _descriptor_0.toValue(moduleKey_0),
                                                                                                                    alignment: _descriptor_0.alignment() } }] } },
                                                                                         { popeq: { cached: false,
                                                                                                    result: undefined } }]).value);
      __compactRuntime.assert(this._equal_96(moduleRecord_0.lifecycleStatus, 4n),
                              'Proof module is not active for new template activation');
      __compactRuntime.assert(this._equal_97(moduleRecord_0.receiptSchemaHash,
                                             binding_0.receiptSchemaHash),
                              'Binding receipt schema does not match the registered proof module');
      const nextAccumulator_0 = this._persistentHash_23({ previous:
                                                            session_0.stagedBindingsAccumulator,
                                                          bindingCommitment:
                                                            bindingCommitment_0,
                                                          actionIndex:
                                                            binding_0.actionIndex });
      const tmp_0 = { envelopeCommitment: session_0.envelopeCommitment,
                      namespaceHash: session_0.namespaceHash,
                      governancePolicyHash: session_0.governancePolicyHash,
                      authorityRootVersion: session_0.authorityRootVersion,
                      authorityRootSequence: session_0.authorityRootSequence,
                      proofModuleBindingsHash: session_0.proofModuleBindingsHash,
                      proofModuleBindingRoot: session_0.proofModuleBindingRoot,
                      proofModuleBindingCount: session_0.proofModuleBindingCount,
                      proofModuleRegistrySequence:
                        session_0.proofModuleRegistrySequence,
                      nextBindingIndex:
                        ((t1) => {
                          if (t1 > 4294967295n) {
                            throw new __compactRuntime.CompactError('permio-authorization.compact line 1881 char 35: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 4294967295');
                          }
                          return t1;
                        })(session_0.nextBindingIndex + 1n),
                      stagedBindingsAccumulator: nextAccumulator_0,
                      admissionNonce: session_0.admissionNonce,
                      expiresAt: session_0.expiresAt };
      __compactRuntime.queryLedgerState(context,
                                        partialProofData,
                                        [
                                         { idx: { cached: false,
                                                  pushPath: true,
                                                  path: [
                                                         { tag: 'value',
                                                           value: { value: _descriptor_8.toValue(1n),
                                                                    alignment: _descriptor_8.alignment() } },
                                                         { tag: 'value',
                                                           value: { value: _descriptor_8.toValue(6n),
                                                                    alignment: _descriptor_8.alignment() } }] } },
                                         { push: { storage: false,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(registryKey_0),
                                                                                                alignment: _descriptor_0.alignment() }).encode() } },
                                         { push: { storage: true,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_20.toValue(tmp_0),
                                                                                                alignment: _descriptor_20.alignment() }).encode() } },
                                         { ins: { cached: false, n: 1 } },
                                         { ins: { cached: true, n: 2 } }]);
      return true;
    }
  }
  _finalizeM4Activation_0(context,
                          partialProofData,
                          envelope_0,
                          signature_0,
                          activator_0,
                          authorityPath_0)
  {
    const registryKey_0 = this._templateRegistryKey_0(envelope_0);
    __compactRuntime.assert(_descriptor_6.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                      partialProofData,
                                                                                      [
                                                                                       { dup: { n: 0 } },
                                                                                       { idx: { cached: false,
                                                                                                pushPath: false,
                                                                                                path: [
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_8.toValue(1n),
                                                                                                                  alignment: _descriptor_8.alignment() } },
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_8.toValue(6n),
                                                                                                                  alignment: _descriptor_8.alignment() } }] } },
                                                                                       { push: { storage: false,
                                                                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(registryKey_0),
                                                                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                                                                       'member',
                                                                                       { popeq: { cached: true,
                                                                                                  result: undefined } }]).value),
                            'Activation session does not exist');
    const session_0 = _descriptor_20.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                 partialProofData,
                                                                                 [
                                                                                  { dup: { n: 0 } },
                                                                                  { idx: { cached: false,
                                                                                           pushPath: false,
                                                                                           path: [
                                                                                                  { tag: 'value',
                                                                                                    value: { value: _descriptor_8.toValue(1n),
                                                                                                             alignment: _descriptor_8.alignment() } },
                                                                                                  { tag: 'value',
                                                                                                    value: { value: _descriptor_8.toValue(6n),
                                                                                                             alignment: _descriptor_8.alignment() } }] } },
                                                                                  { idx: { cached: false,
                                                                                           pushPath: false,
                                                                                           path: [
                                                                                                  { tag: 'value',
                                                                                                    value: { value: _descriptor_0.toValue(registryKey_0),
                                                                                                             alignment: _descriptor_0.alignment() } }] } },
                                                                                  { popeq: { cached: false,
                                                                                             result: undefined } }]).value);
    if (this._blockTimeGte_0(context, partialProofData, session_0.expiresAt)
        ||
        this._activationSessionStale_0(context, partialProofData, session_0))
    {
      this._removeActivationSession_0(context,
                                      partialProofData,
                                      registryKey_0,
                                      session_0);
      return { activated: false, registryKey: registryKey_0 };
    } else {
      this._verifyAdmissionAuthority_0(context,
                                       partialProofData,
                                       envelope_0,
                                       signature_0,
                                       activator_0,
                                       authorityPath_0);
      __compactRuntime.assert(this._equal_98(this._activationAdmissionEnvelopeCommitment_0(envelope_0),
                                             session_0.envelopeCommitment),
                              'Activation envelope does not match the staged session');
      __compactRuntime.assert(this._equal_99(session_0.proofModuleRegistrySequence,
                                             _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                       partialProofData,
                                                                                                       [
                                                                                                        { dup: { n: 0 } },
                                                                                                        { idx: { cached: false,
                                                                                                                 pushPath: false,
                                                                                                                 path: [
                                                                                                                        { tag: 'value',
                                                                                                                          value: { value: _descriptor_8.toValue(1n),
                                                                                                                                   alignment: _descriptor_8.alignment() } },
                                                                                                                        { tag: 'value',
                                                                                                                          value: { value: _descriptor_8.toValue(2n),
                                                                                                                                   alignment: _descriptor_8.alignment() } }] } },
                                                                                                        { popeq: { cached: true,
                                                                                                                   result: undefined } }]).value)),
                              'Proof-module registry changed during activation staging');
      __compactRuntime.assert(this._equal_100(session_0.nextBindingIndex,
                                              session_0.proofModuleBindingCount),
                              'Not every action binding has been staged');
      let tmp_0;
      __compactRuntime.assert(!(tmp_0 = envelope_0.admissionNonce,
                                _descriptor_6.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                          partialProofData,
                                                                                          [
                                                                                           { dup: { n: 0 } },
                                                                                           { idx: { cached: false,
                                                                                                    pushPath: false,
                                                                                                    path: [
                                                                                                           { tag: 'value',
                                                                                                             value: { value: _descriptor_8.toValue(1n),
                                                                                                                      alignment: _descriptor_8.alignment() } },
                                                                                                           { tag: 'value',
                                                                                                             value: { value: _descriptor_8.toValue(9n),
                                                                                                                      alignment: _descriptor_8.alignment() } }] } },
                                                                                           { push: { storage: false,
                                                                                                     value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(tmp_0),
                                                                                                                                                  alignment: _descriptor_0.alignment() }).encode() } },
                                                                                           'member',
                                                                                           { popeq: { cached: true,
                                                                                                      result: undefined } }]).value)),
                              'Admission nonce already used');
      __compactRuntime.assert(!_descriptor_6.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                         partialProofData,
                                                                                         [
                                                                                          { dup: { n: 0 } },
                                                                                          { idx: { cached: false,
                                                                                                   pushPath: false,
                                                                                                   path: [
                                                                                                          { tag: 'value',
                                                                                                            value: { value: _descriptor_8.toValue(1n),
                                                                                                                     alignment: _descriptor_8.alignment() } },
                                                                                                          { tag: 'value',
                                                                                                            value: { value: _descriptor_8.toValue(8n),
                                                                                                                     alignment: _descriptor_8.alignment() } }] } },
                                                                                          { push: { storage: false,
                                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(registryKey_0),
                                                                                                                                                 alignment: _descriptor_0.alignment() }).encode() } },
                                                                                          'member',
                                                                                          { popeq: { cached: true,
                                                                                                     result: undefined } }]).value),
                              'Exact template version is already registered');
      const tmp_1 = 1n;
      __compactRuntime.queryLedgerState(context,
                                        partialProofData,
                                        [
                                         { idx: { cached: false,
                                                  pushPath: true,
                                                  path: [
                                                         { tag: 'value',
                                                           value: { value: _descriptor_8.toValue(1n),
                                                                    alignment: _descriptor_8.alignment() } },
                                                         { tag: 'value',
                                                           value: { value: _descriptor_8.toValue(11n),
                                                                    alignment: _descriptor_8.alignment() } }] } },
                                         { addi: { immediate: parseInt(__compactRuntime.valueToBigInt(
                                                                { value: _descriptor_4.toValue(tmp_1),
                                                                  alignment: _descriptor_4.alignment() }
                                                                  .value
                                                              )) } },
                                         { ins: { cached: true, n: 2 } }]);
      const sequence_0 = _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                   partialProofData,
                                                                                   [
                                                                                    { dup: { n: 0 } },
                                                                                    { idx: { cached: false,
                                                                                             pushPath: false,
                                                                                             path: [
                                                                                                    { tag: 'value',
                                                                                                      value: { value: _descriptor_8.toValue(1n),
                                                                                                               alignment: _descriptor_8.alignment() } },
                                                                                                    { tag: 'value',
                                                                                                      value: { value: _descriptor_8.toValue(11n),
                                                                                                               alignment: _descriptor_8.alignment() } }] } },
                                                                                    { popeq: { cached: true,
                                                                                               result: undefined } }]).value);
      const tmp_2 = envelope_0.admissionNonce;
      __compactRuntime.queryLedgerState(context,
                                        partialProofData,
                                        [
                                         { idx: { cached: false,
                                                  pushPath: true,
                                                  path: [
                                                         { tag: 'value',
                                                           value: { value: _descriptor_8.toValue(1n),
                                                                    alignment: _descriptor_8.alignment() } },
                                                         { tag: 'value',
                                                           value: { value: _descriptor_8.toValue(9n),
                                                                    alignment: _descriptor_8.alignment() } }] } },
                                         { push: { storage: false,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(tmp_2),
                                                                                                alignment: _descriptor_0.alignment() }).encode() } },
                                         { push: { storage: true,
                                                   value: __compactRuntime.StateValue.newNull().encode() } },
                                         { ins: { cached: false, n: 1 } },
                                         { ins: { cached: true, n: 2 } }]);
      const tmp_3 = { target:
                        { namespaceHash: envelope_0.namespaceHash,
                          templateIdHash: envelope_0.templateIdHash,
                          semanticVersion: envelope_0.semanticVersion,
                          templateContentHash: envelope_0.templateContentHash },
                      governancePolicyHash: envelope_0.governancePolicyHash,
                      proofModuleBindingsHash:
                        envelope_0.proofModuleBindingsHash,
                      proofModuleBindingRoot: envelope_0.proofModuleBindingRoot,
                      proofModuleBindingCount:
                        envelope_0.proofModuleBindingCount,
                      proofModuleRegistrySequence:
                        envelope_0.proofModuleRegistrySequence,
                      stagedBindingsAccumulator:
                        session_0.stagedBindingsAccumulator,
                      m4ActivationRecordHash: envelope_0.m4ActivationRecordHash,
                      approvalEvidenceCommitment:
                        envelope_0.approvalEvidenceCommitment,
                      authorityRootVersion: envelope_0.authorityRootVersion,
                      authorityRootSequence: envelope_0.authorityRootSequence,
                      lifecycleStatus: 1n,
                      activationSequence: sequence_0,
                      activatedAt: envelope_0.activatedAt,
                      terminationEffectiveSequence: 0n,
                      terminationReasonHash: new Uint8Array(32),
                      retiredAt: 0n,
                      revokedAt: 0n };
      __compactRuntime.queryLedgerState(context,
                                        partialProofData,
                                        [
                                         { idx: { cached: false,
                                                  pushPath: true,
                                                  path: [
                                                         { tag: 'value',
                                                           value: { value: _descriptor_8.toValue(1n),
                                                                    alignment: _descriptor_8.alignment() } },
                                                         { tag: 'value',
                                                           value: { value: _descriptor_8.toValue(8n),
                                                                    alignment: _descriptor_8.alignment() } }] } },
                                         { push: { storage: false,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(registryKey_0),
                                                                                                alignment: _descriptor_0.alignment() }).encode() } },
                                         { push: { storage: true,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_24.toValue(tmp_3),
                                                                                                alignment: _descriptor_24.alignment() }).encode() } },
                                         { ins: { cached: false, n: 1 } },
                                         { ins: { cached: true, n: 2 } }]);
      this._removeActivationSession_0(context,
                                      partialProofData,
                                      registryKey_0,
                                      session_0);
      const tmp_4 = 1n;
      __compactRuntime.queryLedgerState(context,
                                        partialProofData,
                                        [
                                         { idx: { cached: false,
                                                  pushPath: true,
                                                  path: [
                                                         { tag: 'value',
                                                           value: { value: _descriptor_8.toValue(1n),
                                                                    alignment: _descriptor_8.alignment() } },
                                                         { tag: 'value',
                                                           value: { value: _descriptor_8.toValue(10n),
                                                                    alignment: _descriptor_8.alignment() } }] } },
                                         { addi: { immediate: parseInt(__compactRuntime.valueToBigInt(
                                                                { value: _descriptor_4.toValue(tmp_4),
                                                                  alignment: _descriptor_4.alignment() }
                                                                  .value
                                                              )) } },
                                         { ins: { cached: true, n: 2 } }]);
      return { activated: true, registryKey: registryKey_0 };
    }
  }
  _updateRuntimeCredentialStatus_0(context,
                                   partialProofData,
                                   command_0,
                                   signature_0,
                                   namespaceAuthority_0,
                                   namespaceAuthorityPath_0,
                                   accountAuthority_0,
                                   accountAuthorityStatusPath_0,
                                   currentStatusPath_0)
  {
    __compactRuntime.assert(this._equal_101(command_0.commandVersion, 1n),
                            'Unsupported credential-status command version');
    let t_0, t_1;
    __compactRuntime.assert((t_1 = command_0.credentialKind, t_1 >= 1n)
                            &&
                            (t_0 = command_0.credentialKind, t_0 <= 3n),
                            'Credential kind must be account, capability, or session');
    __compactRuntime.assert(this._equal_102(command_0.expectedStatus, 0n)
                            &&
                            this._equal_103(command_0.nextStatus, 1n)
                            ||
                            this._equal_104(command_0.expectedStatus, 1n)
                            &&
                            this._equal_105(command_0.nextStatus, 2n),
                            'Credential status transition must be empty-to-active or active-to-revoked');
    let tmp_0;
    __compactRuntime.assert(!(tmp_0 = command_0.commandNonce,
                              _descriptor_6.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                        partialProofData,
                                                                                        [
                                                                                         { dup: { n: 0 } },
                                                                                         { idx: { cached: false,
                                                                                                  pushPath: false,
                                                                                                  path: [
                                                                                                         { tag: 'value',
                                                                                                           value: { value: _descriptor_8.toValue(1n),
                                                                                                                    alignment: _descriptor_8.alignment() } },
                                                                                                         { tag: 'value',
                                                                                                           value: { value: _descriptor_8.toValue(14n),
                                                                                                                    alignment: _descriptor_8.alignment() } }] } },
                                                                                         { push: { storage: false,
                                                                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(tmp_0),
                                                                                                                                                alignment: _descriptor_0.alignment() }).encode() } },
                                                                                         'member',
                                                                                         { popeq: { cached: true,
                                                                                                    result: undefined } }]).value)),
                            'Credential-status command nonce already used');
    let tmp_1, tmp_2;
    __compactRuntime.assert((tmp_2 = command_0.namespaceHash,
                             _descriptor_6.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                       partialProofData,
                                                                                       [
                                                                                        { dup: { n: 0 } },
                                                                                        { idx: { cached: false,
                                                                                                 pushPath: false,
                                                                                                 path: [
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_8.toValue(0n),
                                                                                                                   alignment: _descriptor_8.alignment() } },
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_8.toValue(1n),
                                                                                                                   alignment: _descriptor_8.alignment() } }] } },
                                                                                        { push: { storage: false,
                                                                                                  value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(tmp_2),
                                                                                                                                               alignment: _descriptor_0.alignment() }).encode() } },
                                                                                        'member',
                                                                                        { popeq: { cached: true,
                                                                                                   result: undefined } }]).value))
                            &&
                            (tmp_1 = command_0.namespaceHash,
                             _descriptor_6.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                       partialProofData,
                                                                                       [
                                                                                        { dup: { n: 0 } },
                                                                                        { idx: { cached: false,
                                                                                                 pushPath: false,
                                                                                                 path: [
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_8.toValue(1n),
                                                                                                                   alignment: _descriptor_8.alignment() } },
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_8.toValue(13n),
                                                                                                                   alignment: _descriptor_8.alignment() } }] } },
                                                                                        { push: { storage: false,
                                                                                                  value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(tmp_1),
                                                                                                                                               alignment: _descriptor_0.alignment() }).encode() } },
                                                                                        'member',
                                                                                        { popeq: { cached: true,
                                                                                                   result: undefined } }]).value)),
                            'Namespace root records are not registered');
    let tmp_3;
    const authorityRoot_0 = (tmp_3 = command_0.namespaceHash,
                             _descriptor_5.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                       partialProofData,
                                                                                       [
                                                                                        { dup: { n: 0 } },
                                                                                        { idx: { cached: false,
                                                                                                 pushPath: false,
                                                                                                 path: [
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_8.toValue(0n),
                                                                                                                   alignment: _descriptor_8.alignment() } },
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_8.toValue(1n),
                                                                                                                   alignment: _descriptor_8.alignment() } }] } },
                                                                                        { idx: { cached: false,
                                                                                                 pushPath: false,
                                                                                                 path: [
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_0.toValue(tmp_3),
                                                                                                                   alignment: _descriptor_0.alignment() } }] } },
                                                                                        { popeq: { cached: false,
                                                                                                   result: undefined } }]).value));
    let tmp_4;
    const statusRoot_0 = (tmp_4 = command_0.namespaceHash,
                          _descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                    partialProofData,
                                                                                    [
                                                                                     { dup: { n: 0 } },
                                                                                     { idx: { cached: false,
                                                                                              pushPath: false,
                                                                                              path: [
                                                                                                     { tag: 'value',
                                                                                                       value: { value: _descriptor_8.toValue(1n),
                                                                                                                alignment: _descriptor_8.alignment() } },
                                                                                                     { tag: 'value',
                                                                                                       value: { value: _descriptor_8.toValue(13n),
                                                                                                                alignment: _descriptor_8.alignment() } }] } },
                                                                                     { idx: { cached: false,
                                                                                              pushPath: false,
                                                                                              path: [
                                                                                                     { tag: 'value',
                                                                                                       value: { value: _descriptor_0.toValue(tmp_4),
                                                                                                                alignment: _descriptor_0.alignment() } }] } },
                                                                                     { popeq: { cached: false,
                                                                                                result: undefined } }]).value));
    __compactRuntime.assert(this._equal_106(command_0.governancePolicyHash,
                                            authorityRoot_0.governancePolicyHash)
                            &&
                            this._equal_107(command_0.authorityRootVersion,
                                            authorityRoot_0.rootVersion)
                            &&
                            this._equal_108(command_0.authorityRootSequence,
                                            authorityRoot_0.rootSequence),
                            'Credential-status command authority root is stale or mismatched');
    __compactRuntime.assert(this._equal_109(command_0.credentialStatusRootSequence,
                                            statusRoot_0.rootSequence),
                            'Credential-status command root sequence is stale');
    __compactRuntime.assert(this._blockTimeGte_0(context,
                                                 partialProofData,
                                                 command_0.effectiveAt),
                            'Credential-status command is not yet effective');
    const namespaceSigned_0 = this._equal_110(command_0.revocationAuthorityAccountCredentialCommitment,
                                              new Uint8Array(32))
                              ||
                              this._equal_111(command_0.credentialKind, 1n)
                              &&
                              this._equal_112(command_0.expectedStatus, 0n);
    if (namespaceSigned_0) {
      __compactRuntime.assert(this._equal_113(namespaceAuthority_0.leafVersion,
                                              1n)
                              &&
                              this._equal_114(namespaceAuthority_0.authorityKind,
                                              6n)
                              &&
                              this._equal_115(namespaceAuthority_0.namespaceHash,
                                              command_0.namespaceHash)
                              &&
                              this._equal_116(namespaceAuthority_0.governancePolicyHash,
                                              command_0.governancePolicyHash),
                              'Credential issuer is outside the namespace capability-issuer scope');
      let t_2, t_3;
      __compactRuntime.assert((t_3 = command_0.effectiveAt,
                               t_3 >= namespaceAuthority_0.validAfter)
                              &&
                              (t_2 = command_0.effectiveAt,
                               t_2 < namespaceAuthority_0.validBefore),
                              'Namespace capability issuer is outside its validity window');
      const authorityCommitment_0 = this._governanceActivatorLeafCommitment_0(namespaceAuthority_0);
      __compactRuntime.assert(this._equal_117(namespaceAuthorityPath_0.leaf,
                                              authorityCommitment_0)
                              &&
                              this._equal_118(this._merkleTreePathRoot_2(namespaceAuthorityPath_0),
                                              authorityRoot_0.root),
                              'Namespace capability issuer is not eligible under the current authority root');
      if (this._equal_119(command_0.credentialKind, 1n)) {
        __compactRuntime.assert(this._equal_120(command_0.expectedStatus, 0n)
                                &&
                                this._equal_121(command_0.revocationAuthorityAccountCredentialCommitment,
                                                command_0.credentialCommitment),
                                'Account issuance must bind self-revocation authority');
      }
      this._schnorrVerify_0(context,
                            partialProofData,
                            this._runtimeCredentialStatusCommandMessage_0(command_0),
                            signature_0,
                            namespaceAuthority_0.publicKey);
    } else {
      const accountCommitment_0 = this._runtimeAccountCredentialCommitment_0(accountAuthority_0);
      __compactRuntime.assert(this._equal_122(accountCommitment_0,
                                              command_0.revocationAuthorityAccountCredentialCommitment)
                              &&
                              this._equal_123(accountAuthority_0.credentialVersion,
                                              1n)
                              &&
                              this._equal_124(accountAuthority_0.target.namespaceHash,
                                              command_0.namespaceHash),
                              'Runtime account authority does not match the status command');
      let t_4, t_5;
      __compactRuntime.assert((t_5 = command_0.effectiveAt,
                               t_5 >= accountAuthority_0.issuedAt)
                              &&
                              (t_4 = command_0.effectiveAt,
                               t_4 < accountAuthority_0.validBefore),
                              'Runtime account authority is outside its validity window');
      const activeAccountLeaf_0 = this._runtimeCredentialStatusLeafCommitment_0({ leafVersion:
                                                                                    1n,
                                                                                  namespaceHash:
                                                                                    command_0.namespaceHash,
                                                                                  credentialKind:
                                                                                    1n,
                                                                                  credentialCommitment:
                                                                                    accountCommitment_0,
                                                                                  revocationAuthorityAccountCredentialCommitment:
                                                                                    accountCommitment_0,
                                                                                  statusIndex:
                                                                                    accountAuthority_0.statusIndex,
                                                                                  status:
                                                                                    1n });
      __compactRuntime.assert(this._equal_125(accountAuthorityStatusPath_0.leaf,
                                              activeAccountLeaf_0)
                              &&
                              this._equal_126(this._merkleTreePathRoot_2(accountAuthorityStatusPath_0),
                                              statusRoot_0.root),
                              'Runtime account authority is not active under the current status root');
      this._schnorrVerify_0(context,
                            partialProofData,
                            this._runtimeCredentialStatusCommandMessage_0(command_0),
                            signature_0,
                            accountAuthority_0.runtimePublicKey);
    }
    const currentLeaf_0 = { leafVersion: 1n,
                            namespaceHash: command_0.namespaceHash,
                            credentialKind: command_0.credentialKind,
                            credentialCommitment: command_0.credentialCommitment,
                            revocationAuthorityAccountCredentialCommitment:
                              command_0.revocationAuthorityAccountCredentialCommitment,
                            statusIndex: command_0.statusIndex,
                            status: command_0.expectedStatus };
    if (this._equal_127(command_0.expectedStatus, 0n)) {
      __compactRuntime.assert(this._equal_128(currentStatusPath_0.leaf,
                                              new Uint8Array(32)),
                              'Credential issuance requires the exact empty status leaf');
    } else {
      __compactRuntime.assert(this._equal_129(currentStatusPath_0.leaf,
                                              this._runtimeCredentialStatusLeafCommitment_0(currentLeaf_0)),
                              'Credential revocation requires the exact active status leaf');
    }
    __compactRuntime.assert(this._equal_130(this._merkleTreePathRoot_2(currentStatusPath_0),
                                            statusRoot_0.root),
                            'Credential status path does not match the exact current leaf and root');
    const nextLeafCommitment_0 = this._runtimeCredentialStatusLeafCommitment_0({ leafVersion:
                                                                                   1n,
                                                                                 namespaceHash:
                                                                                   command_0.namespaceHash,
                                                                                 credentialKind:
                                                                                   command_0.credentialKind,
                                                                                 credentialCommitment:
                                                                                   command_0.credentialCommitment,
                                                                                 revocationAuthorityAccountCredentialCommitment:
                                                                                   command_0.revocationAuthorityAccountCredentialCommitment,
                                                                                 statusIndex:
                                                                                   command_0.statusIndex,
                                                                                 status:
                                                                                   command_0.nextStatus });
    const nextStatusPath_0 = { leaf: nextLeafCommitment_0,
                               path: currentStatusPath_0.path };
    const nextSequence_0 = ((t1) => {
                             if (t1 > 18446744073709551615n) {
                               throw new __compactRuntime.CompactError('permio-authorization.compact line 2123 char 26: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 18446744073709551615');
                             }
                             return t1;
                           })(statusRoot_0.rootSequence + 1n);
    const tmp_5 = command_0.namespaceHash;
    const tmp_6 = { root: this._merkleTreePathRoot_2(nextStatusPath_0),
                    rootSequence: nextSequence_0 };
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_8.toValue(1n),
                                                                  alignment: _descriptor_8.alignment() } },
                                                       { tag: 'value',
                                                         value: { value: _descriptor_8.toValue(13n),
                                                                  alignment: _descriptor_8.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(tmp_5),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_7.toValue(tmp_6),
                                                                                              alignment: _descriptor_7.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 2 } }]);
    const tmp_7 = command_0.commandNonce;
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_8.toValue(1n),
                                                                  alignment: _descriptor_8.alignment() } },
                                                       { tag: 'value',
                                                         value: { value: _descriptor_8.toValue(14n),
                                                                  alignment: _descriptor_8.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(tmp_7),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newNull().encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 2 } }]);
    return nextSequence_0;
  }
  _folder_0(f, x, a0) {
    for (let i = 0; i < 1; i++) { x = f(x, a0[i]); }
    return x;
  }
  _folder_1(f, x, a0) {
    for (let i = 0; i < 1; i++) { x = f(x, a0[i]); }
    return x;
  }
  _folder_2(f, x, a0) {
    for (let i = 0; i < 20; i++) { x = f(x, a0[i]); }
    return x;
  }
  _equal_0(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_1(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_2(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_3(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_4(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_5(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_6(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_7(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_8(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_9(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_10(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_11(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_12(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_13(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_14(x0, y0) {
    {
      let x1 = x0.field;
      let y1 = y0.field;
      if (x1 !== y1) { return false; }
    }
    return true;
  }
  _equal_15(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_16(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_17(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_18(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_19(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_20(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_21(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_22(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_23(x0, y0) {
    {
      let x1 = x0.field;
      let y1 = y0.field;
      if (x1 !== y1) { return false; }
    }
    return true;
  }
  _equal_24(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_25(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_26(x0, y0) {
    {
      let x1 = x0.field;
      let y1 = y0.field;
      if (x1 !== y1) { return false; }
    }
    return true;
  }
  _equal_27(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_28(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_29(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_30(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_31(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_32(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_33(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_34(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_35(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_36(x0, y0) {
    {
      let x1 = x0.field;
      let y1 = y0.field;
      if (x1 !== y1) { return false; }
    }
    return true;
  }
  _equal_37(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_38(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_39(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_40(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_41(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_42(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_43(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_44(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_45(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_46(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_47(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_48(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_49(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_50(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_51(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_52(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_53(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_54(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_55(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_56(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_57(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_58(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_59(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_60(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_61(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_62(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_63(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_64(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_65(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_66(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_67(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_68(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_69(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_70(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_71(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_72(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_73(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_74(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_75(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_76(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_77(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_78(x0, y0) {
    {
      let x1 = x0.field;
      let y1 = y0.field;
      if (x1 !== y1) { return false; }
    }
    return true;
  }
  _equal_79(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_80(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_81(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_82(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_83(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_84(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_85(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_86(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_87(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_88(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_89(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_90(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_91(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_92(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_93(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_94(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_95(x0, y0) {
    {
      let x1 = x0.field;
      let y1 = y0.field;
      if (x1 !== y1) { return false; }
    }
    return true;
  }
  _equal_96(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_97(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_98(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_99(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_100(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_101(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_102(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_103(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_104(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_105(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_106(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_107(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_108(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_109(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_110(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_111(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_112(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_113(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_114(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_115(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_116(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_117(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_118(x0, y0) {
    {
      let x1 = x0.field;
      let y1 = y0.field;
      if (x1 !== y1) { return false; }
    }
    return true;
  }
  _equal_119(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_120(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_121(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_122(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_123(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_124(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_125(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_126(x0, y0) {
    {
      let x1 = x0.field;
      let y1 = y0.field;
      if (x1 !== y1) { return false; }
    }
    return true;
  }
  _equal_127(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_128(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_129(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_130(x0, y0) {
    {
      let x1 = x0.field;
      let y1 = y0.field;
      if (x1 !== y1) { return false; }
    }
    return true;
  }
}
export function ledger(stateOrChargedState) {
  const state = stateOrChargedState instanceof __compactRuntime.StateValue ? stateOrChargedState : stateOrChargedState.state;
  const chargedState = stateOrChargedState instanceof __compactRuntime.StateValue ? new __compactRuntime.ChargedState(stateOrChargedState) : stateOrChargedState;
  const context = {
    currentQueryContext: new __compactRuntime.QueryContext(chargedState, __compactRuntime.dummyContractAddress()),
    costModel: __compactRuntime.CostModel.initialCostModel()
  };
  const partialProofData = {
    input: { value: [], alignment: [] },
    output: undefined,
    publicTranscript: [],
    privateTranscriptOutputs: []
  };
  return {
    get targetNetworkHash() {
      return _descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_8.toValue(0n),
                                                                                                   alignment: _descriptor_8.alignment() } },
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_8.toValue(0n),
                                                                                                   alignment: _descriptor_8.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    },
    authorityRoots: {
      isEmpty(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`isEmpty: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_6.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_8.toValue(0n),
                                                                                                     alignment: _descriptor_8.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_8.toValue(1n),
                                                                                                     alignment: _descriptor_8.alignment() } }] } },
                                                                          'size',
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_3.toValue(0n),
                                                                                                                                 alignment: _descriptor_3.alignment() }).encode() } },
                                                                          'eq',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      size(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`size: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_8.toValue(0n),
                                                                                                     alignment: _descriptor_8.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_8.toValue(1n),
                                                                                                     alignment: _descriptor_8.alignment() } }] } },
                                                                          'size',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      member(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`member: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(key_0.buffer instanceof ArrayBuffer && key_0.BYTES_PER_ELEMENT === 1 && key_0.length === 32)) {
          __compactRuntime.typeError('member',
                                     'argument 1',
                                     'permio-authorization.compact line 413 char 1',
                                     'Bytes<32>',
                                     key_0)
        }
        return _descriptor_6.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_8.toValue(0n),
                                                                                                     alignment: _descriptor_8.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_8.toValue(1n),
                                                                                                     alignment: _descriptor_8.alignment() } }] } },
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(key_0),
                                                                                                                                 alignment: _descriptor_0.alignment() }).encode() } },
                                                                          'member',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      lookup(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`lookup: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(key_0.buffer instanceof ArrayBuffer && key_0.BYTES_PER_ELEMENT === 1 && key_0.length === 32)) {
          __compactRuntime.typeError('lookup',
                                     'argument 1',
                                     'permio-authorization.compact line 413 char 1',
                                     'Bytes<32>',
                                     key_0)
        }
        return _descriptor_5.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_8.toValue(0n),
                                                                                                     alignment: _descriptor_8.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_8.toValue(1n),
                                                                                                     alignment: _descriptor_8.alignment() } }] } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_0.toValue(key_0),
                                                                                                     alignment: _descriptor_0.alignment() } }] } },
                                                                          { popeq: { cached: false,
                                                                                     result: undefined } }]).value);
      },
      [Symbol.iterator](...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`iter: expected 0 arguments, received ${args_0.length}`);
        }
        const self_0 = state.asArray()[0].asArray()[1];
        return self_0.asMap().keys().map(  (key) => {    const value = self_0.asMap().get(key).asCell();    return [      _descriptor_0.fromValue(key.value),      _descriptor_5.fromValue(value.value)    ];  })[Symbol.iterator]();
      }
    },
    authorityRootUpdateProgress: {
      isEmpty(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`isEmpty: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_6.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_8.toValue(0n),
                                                                                                     alignment: _descriptor_8.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_8.toValue(2n),
                                                                                                     alignment: _descriptor_8.alignment() } }] } },
                                                                          'size',
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_3.toValue(0n),
                                                                                                                                 alignment: _descriptor_3.alignment() }).encode() } },
                                                                          'eq',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      size(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`size: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_8.toValue(0n),
                                                                                                     alignment: _descriptor_8.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_8.toValue(2n),
                                                                                                     alignment: _descriptor_8.alignment() } }] } },
                                                                          'size',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      member(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`member: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(key_0.buffer instanceof ArrayBuffer && key_0.BYTES_PER_ELEMENT === 1 && key_0.length === 32)) {
          __compactRuntime.typeError('member',
                                     'argument 1',
                                     'permio-authorization.compact line 414 char 1',
                                     'Bytes<32>',
                                     key_0)
        }
        return _descriptor_6.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_8.toValue(0n),
                                                                                                     alignment: _descriptor_8.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_8.toValue(2n),
                                                                                                     alignment: _descriptor_8.alignment() } }] } },
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(key_0),
                                                                                                                                 alignment: _descriptor_0.alignment() }).encode() } },
                                                                          'member',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      lookup(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`lookup: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(key_0.buffer instanceof ArrayBuffer && key_0.BYTES_PER_ELEMENT === 1 && key_0.length === 32)) {
          __compactRuntime.typeError('lookup',
                                     'argument 1',
                                     'permio-authorization.compact line 414 char 1',
                                     'Bytes<32>',
                                     key_0)
        }
        return _descriptor_34.fromValue(__compactRuntime.queryLedgerState(context,
                                                                          partialProofData,
                                                                          [
                                                                           { dup: { n: 0 } },
                                                                           { idx: { cached: false,
                                                                                    pushPath: false,
                                                                                    path: [
                                                                                           { tag: 'value',
                                                                                             value: { value: _descriptor_8.toValue(0n),
                                                                                                      alignment: _descriptor_8.alignment() } },
                                                                                           { tag: 'value',
                                                                                             value: { value: _descriptor_8.toValue(2n),
                                                                                                      alignment: _descriptor_8.alignment() } }] } },
                                                                           { idx: { cached: false,
                                                                                    pushPath: false,
                                                                                    path: [
                                                                                           { tag: 'value',
                                                                                             value: { value: _descriptor_0.toValue(key_0),
                                                                                                      alignment: _descriptor_0.alignment() } }] } },
                                                                           { popeq: { cached: false,
                                                                                      result: undefined } }]).value);
      },
      [Symbol.iterator](...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`iter: expected 0 arguments, received ${args_0.length}`);
        }
        const self_0 = state.asArray()[0].asArray()[2];
        return self_0.asMap().keys().map(  (key) => {    const value = self_0.asMap().get(key).asCell();    return [      _descriptor_0.fromValue(key.value),      _descriptor_34.fromValue(value.value)    ];  })[Symbol.iterator]();
      }
    },
    authorityRootUpdateApprovals: {
      isEmpty(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`isEmpty: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_6.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_8.toValue(1n),
                                                                                                     alignment: _descriptor_8.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_8.toValue(0n),
                                                                                                     alignment: _descriptor_8.alignment() } }] } },
                                                                          'size',
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_3.toValue(0n),
                                                                                                                                 alignment: _descriptor_3.alignment() }).encode() } },
                                                                          'eq',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      size(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`size: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_8.toValue(1n),
                                                                                                     alignment: _descriptor_8.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_8.toValue(0n),
                                                                                                     alignment: _descriptor_8.alignment() } }] } },
                                                                          'size',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      member(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`member: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(key_0.buffer instanceof ArrayBuffer && key_0.BYTES_PER_ELEMENT === 1 && key_0.length === 32)) {
          __compactRuntime.typeError('member',
                                     'argument 1',
                                     'permio-authorization.compact line 415 char 1',
                                     'Bytes<32>',
                                     key_0)
        }
        return _descriptor_6.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_8.toValue(1n),
                                                                                                     alignment: _descriptor_8.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_8.toValue(0n),
                                                                                                     alignment: _descriptor_8.alignment() } }] } },
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(key_0),
                                                                                                                                 alignment: _descriptor_0.alignment() }).encode() } },
                                                                          'member',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      lookup(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`lookup: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(key_0.buffer instanceof ArrayBuffer && key_0.BYTES_PER_ELEMENT === 1 && key_0.length === 32)) {
          __compactRuntime.typeError('lookup',
                                     'argument 1',
                                     'permio-authorization.compact line 415 char 1',
                                     'Bytes<32>',
                                     key_0)
        }
        return _descriptor_33.fromValue(__compactRuntime.queryLedgerState(context,
                                                                          partialProofData,
                                                                          [
                                                                           { dup: { n: 0 } },
                                                                           { idx: { cached: false,
                                                                                    pushPath: false,
                                                                                    path: [
                                                                                           { tag: 'value',
                                                                                             value: { value: _descriptor_8.toValue(1n),
                                                                                                      alignment: _descriptor_8.alignment() } },
                                                                                           { tag: 'value',
                                                                                             value: { value: _descriptor_8.toValue(0n),
                                                                                                      alignment: _descriptor_8.alignment() } }] } },
                                                                           { idx: { cached: false,
                                                                                    pushPath: false,
                                                                                    path: [
                                                                                           { tag: 'value',
                                                                                             value: { value: _descriptor_0.toValue(key_0),
                                                                                                      alignment: _descriptor_0.alignment() } }] } },
                                                                           { popeq: { cached: false,
                                                                                      result: undefined } }]).value);
      },
      [Symbol.iterator](...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`iter: expected 0 arguments, received ${args_0.length}`);
        }
        const self_0 = state.asArray()[1].asArray()[0];
        return self_0.asMap().keys().map(  (key) => {    const value = self_0.asMap().get(key).asCell();    return [      _descriptor_0.fromValue(key.value),      _descriptor_33.fromValue(value.value)    ];  })[Symbol.iterator]();
      }
    },
    proofModules: {
      isEmpty(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`isEmpty: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_6.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_8.toValue(1n),
                                                                                                     alignment: _descriptor_8.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_8.toValue(1n),
                                                                                                     alignment: _descriptor_8.alignment() } }] } },
                                                                          'size',
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_3.toValue(0n),
                                                                                                                                 alignment: _descriptor_3.alignment() }).encode() } },
                                                                          'eq',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      size(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`size: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_8.toValue(1n),
                                                                                                     alignment: _descriptor_8.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_8.toValue(1n),
                                                                                                     alignment: _descriptor_8.alignment() } }] } },
                                                                          'size',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      member(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`member: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(key_0.buffer instanceof ArrayBuffer && key_0.BYTES_PER_ELEMENT === 1 && key_0.length === 32)) {
          __compactRuntime.typeError('member',
                                     'argument 1',
                                     'permio-authorization.compact line 416 char 1',
                                     'Bytes<32>',
                                     key_0)
        }
        return _descriptor_6.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_8.toValue(1n),
                                                                                                     alignment: _descriptor_8.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_8.toValue(1n),
                                                                                                     alignment: _descriptor_8.alignment() } }] } },
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(key_0),
                                                                                                                                 alignment: _descriptor_0.alignment() }).encode() } },
                                                                          'member',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      lookup(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`lookup: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(key_0.buffer instanceof ArrayBuffer && key_0.BYTES_PER_ELEMENT === 1 && key_0.length === 32)) {
          __compactRuntime.typeError('lookup',
                                     'argument 1',
                                     'permio-authorization.compact line 416 char 1',
                                     'Bytes<32>',
                                     key_0)
        }
        return _descriptor_22.fromValue(__compactRuntime.queryLedgerState(context,
                                                                          partialProofData,
                                                                          [
                                                                           { dup: { n: 0 } },
                                                                           { idx: { cached: false,
                                                                                    pushPath: false,
                                                                                    path: [
                                                                                           { tag: 'value',
                                                                                             value: { value: _descriptor_8.toValue(1n),
                                                                                                      alignment: _descriptor_8.alignment() } },
                                                                                           { tag: 'value',
                                                                                             value: { value: _descriptor_8.toValue(1n),
                                                                                                      alignment: _descriptor_8.alignment() } }] } },
                                                                           { idx: { cached: false,
                                                                                    pushPath: false,
                                                                                    path: [
                                                                                           { tag: 'value',
                                                                                             value: { value: _descriptor_0.toValue(key_0),
                                                                                                      alignment: _descriptor_0.alignment() } }] } },
                                                                           { popeq: { cached: false,
                                                                                      result: undefined } }]).value);
      },
      [Symbol.iterator](...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`iter: expected 0 arguments, received ${args_0.length}`);
        }
        const self_0 = state.asArray()[1].asArray()[1];
        return self_0.asMap().keys().map(  (key) => {    const value = self_0.asMap().get(key).asCell();    return [      _descriptor_0.fromValue(key.value),      _descriptor_22.fromValue(value.value)    ];  })[Symbol.iterator]();
      }
    },
    get proofModuleRegistrySequence() {
      return _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_8.toValue(1n),
                                                                                                   alignment: _descriptor_8.alignment() } },
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_8.toValue(2n),
                                                                                                   alignment: _descriptor_8.alignment() } }] } },
                                                                        { popeq: { cached: true,
                                                                                   result: undefined } }]).value);
    },
    proofModuleReviews: {
      isEmpty(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`isEmpty: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_6.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_8.toValue(1n),
                                                                                                     alignment: _descriptor_8.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_8.toValue(3n),
                                                                                                     alignment: _descriptor_8.alignment() } }] } },
                                                                          'size',
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_3.toValue(0n),
                                                                                                                                 alignment: _descriptor_3.alignment() }).encode() } },
                                                                          'eq',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      size(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`size: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_8.toValue(1n),
                                                                                                     alignment: _descriptor_8.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_8.toValue(3n),
                                                                                                     alignment: _descriptor_8.alignment() } }] } },
                                                                          'size',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      member(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`member: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(key_0.buffer instanceof ArrayBuffer && key_0.BYTES_PER_ELEMENT === 1 && key_0.length === 32)) {
          __compactRuntime.typeError('member',
                                     'argument 1',
                                     'permio-authorization.compact line 418 char 1',
                                     'Bytes<32>',
                                     key_0)
        }
        return _descriptor_6.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_8.toValue(1n),
                                                                                                     alignment: _descriptor_8.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_8.toValue(3n),
                                                                                                     alignment: _descriptor_8.alignment() } }] } },
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(key_0),
                                                                                                                                 alignment: _descriptor_0.alignment() }).encode() } },
                                                                          'member',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      lookup(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`lookup: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(key_0.buffer instanceof ArrayBuffer && key_0.BYTES_PER_ELEMENT === 1 && key_0.length === 32)) {
          __compactRuntime.typeError('lookup',
                                     'argument 1',
                                     'permio-authorization.compact line 418 char 1',
                                     'Bytes<32>',
                                     key_0)
        }
        return _descriptor_31.fromValue(__compactRuntime.queryLedgerState(context,
                                                                          partialProofData,
                                                                          [
                                                                           { dup: { n: 0 } },
                                                                           { idx: { cached: false,
                                                                                    pushPath: false,
                                                                                    path: [
                                                                                           { tag: 'value',
                                                                                             value: { value: _descriptor_8.toValue(1n),
                                                                                                      alignment: _descriptor_8.alignment() } },
                                                                                           { tag: 'value',
                                                                                             value: { value: _descriptor_8.toValue(3n),
                                                                                                      alignment: _descriptor_8.alignment() } }] } },
                                                                           { idx: { cached: false,
                                                                                    pushPath: false,
                                                                                    path: [
                                                                                           { tag: 'value',
                                                                                             value: { value: _descriptor_0.toValue(key_0),
                                                                                                      alignment: _descriptor_0.alignment() } }] } },
                                                                           { popeq: { cached: false,
                                                                                      result: undefined } }]).value);
      },
      [Symbol.iterator](...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`iter: expected 0 arguments, received ${args_0.length}`);
        }
        const self_0 = state.asArray()[1].asArray()[3];
        return self_0.asMap().keys().map(  (key) => {    const value = self_0.asMap().get(key).asCell();    return [      _descriptor_0.fromValue(key.value),      _descriptor_31.fromValue(value.value)    ];  })[Symbol.iterator]();
      }
    },
    proofModuleApprovals: {
      isEmpty(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`isEmpty: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_6.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_8.toValue(1n),
                                                                                                     alignment: _descriptor_8.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_8.toValue(4n),
                                                                                                     alignment: _descriptor_8.alignment() } }] } },
                                                                          'size',
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_3.toValue(0n),
                                                                                                                                 alignment: _descriptor_3.alignment() }).encode() } },
                                                                          'eq',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      size(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`size: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_8.toValue(1n),
                                                                                                     alignment: _descriptor_8.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_8.toValue(4n),
                                                                                                     alignment: _descriptor_8.alignment() } }] } },
                                                                          'size',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      member(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`member: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(key_0.buffer instanceof ArrayBuffer && key_0.BYTES_PER_ELEMENT === 1 && key_0.length === 32)) {
          __compactRuntime.typeError('member',
                                     'argument 1',
                                     'permio-authorization.compact line 419 char 1',
                                     'Bytes<32>',
                                     key_0)
        }
        return _descriptor_6.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_8.toValue(1n),
                                                                                                     alignment: _descriptor_8.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_8.toValue(4n),
                                                                                                     alignment: _descriptor_8.alignment() } }] } },
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(key_0),
                                                                                                                                 alignment: _descriptor_0.alignment() }).encode() } },
                                                                          'member',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      lookup(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`lookup: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(key_0.buffer instanceof ArrayBuffer && key_0.BYTES_PER_ELEMENT === 1 && key_0.length === 32)) {
          __compactRuntime.typeError('lookup',
                                     'argument 1',
                                     'permio-authorization.compact line 419 char 1',
                                     'Bytes<32>',
                                     key_0)
        }
        return _descriptor_28.fromValue(__compactRuntime.queryLedgerState(context,
                                                                          partialProofData,
                                                                          [
                                                                           { dup: { n: 0 } },
                                                                           { idx: { cached: false,
                                                                                    pushPath: false,
                                                                                    path: [
                                                                                           { tag: 'value',
                                                                                             value: { value: _descriptor_8.toValue(1n),
                                                                                                      alignment: _descriptor_8.alignment() } },
                                                                                           { tag: 'value',
                                                                                             value: { value: _descriptor_8.toValue(4n),
                                                                                                      alignment: _descriptor_8.alignment() } }] } },
                                                                           { idx: { cached: false,
                                                                                    pushPath: false,
                                                                                    path: [
                                                                                           { tag: 'value',
                                                                                             value: { value: _descriptor_0.toValue(key_0),
                                                                                                      alignment: _descriptor_0.alignment() } }] } },
                                                                           { popeq: { cached: false,
                                                                                      result: undefined } }]).value);
      },
      [Symbol.iterator](...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`iter: expected 0 arguments, received ${args_0.length}`);
        }
        const self_0 = state.asArray()[1].asArray()[4];
        return self_0.asMap().keys().map(  (key) => {    const value = self_0.asMap().get(key).asCell();    return [      _descriptor_0.fromValue(key.value),      _descriptor_28.fromValue(value.value)    ];  })[Symbol.iterator]();
      }
    },
    usedProofModuleCommandNonces: {
      isEmpty(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`isEmpty: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_6.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_8.toValue(1n),
                                                                                                     alignment: _descriptor_8.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_8.toValue(5n),
                                                                                                     alignment: _descriptor_8.alignment() } }] } },
                                                                          'size',
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_3.toValue(0n),
                                                                                                                                 alignment: _descriptor_3.alignment() }).encode() } },
                                                                          'eq',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      size(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`size: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_8.toValue(1n),
                                                                                                     alignment: _descriptor_8.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_8.toValue(5n),
                                                                                                     alignment: _descriptor_8.alignment() } }] } },
                                                                          'size',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      member(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`member: expected 1 argument, received ${args_0.length}`);
        }
        const elem_0 = args_0[0];
        if (!(elem_0.buffer instanceof ArrayBuffer && elem_0.BYTES_PER_ELEMENT === 1 && elem_0.length === 32)) {
          __compactRuntime.typeError('member',
                                     'argument 1',
                                     'permio-authorization.compact line 420 char 1',
                                     'Bytes<32>',
                                     elem_0)
        }
        return _descriptor_6.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_8.toValue(1n),
                                                                                                     alignment: _descriptor_8.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_8.toValue(5n),
                                                                                                     alignment: _descriptor_8.alignment() } }] } },
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(elem_0),
                                                                                                                                 alignment: _descriptor_0.alignment() }).encode() } },
                                                                          'member',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      [Symbol.iterator](...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`iter: expected 0 arguments, received ${args_0.length}`);
        }
        const self_0 = state.asArray()[1].asArray()[5];
        return self_0.asMap().keys().map((elem) => _descriptor_0.fromValue(elem.value))[Symbol.iterator]();
      }
    },
    activationSessions: {
      isEmpty(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`isEmpty: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_6.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_8.toValue(1n),
                                                                                                     alignment: _descriptor_8.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_8.toValue(6n),
                                                                                                     alignment: _descriptor_8.alignment() } }] } },
                                                                          'size',
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_3.toValue(0n),
                                                                                                                                 alignment: _descriptor_3.alignment() }).encode() } },
                                                                          'eq',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      size(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`size: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_8.toValue(1n),
                                                                                                     alignment: _descriptor_8.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_8.toValue(6n),
                                                                                                     alignment: _descriptor_8.alignment() } }] } },
                                                                          'size',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      member(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`member: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(key_0.buffer instanceof ArrayBuffer && key_0.BYTES_PER_ELEMENT === 1 && key_0.length === 32)) {
          __compactRuntime.typeError('member',
                                     'argument 1',
                                     'permio-authorization.compact line 421 char 1',
                                     'Bytes<32>',
                                     key_0)
        }
        return _descriptor_6.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_8.toValue(1n),
                                                                                                     alignment: _descriptor_8.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_8.toValue(6n),
                                                                                                     alignment: _descriptor_8.alignment() } }] } },
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(key_0),
                                                                                                                                 alignment: _descriptor_0.alignment() }).encode() } },
                                                                          'member',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      lookup(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`lookup: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(key_0.buffer instanceof ArrayBuffer && key_0.BYTES_PER_ELEMENT === 1 && key_0.length === 32)) {
          __compactRuntime.typeError('lookup',
                                     'argument 1',
                                     'permio-authorization.compact line 421 char 1',
                                     'Bytes<32>',
                                     key_0)
        }
        return _descriptor_20.fromValue(__compactRuntime.queryLedgerState(context,
                                                                          partialProofData,
                                                                          [
                                                                           { dup: { n: 0 } },
                                                                           { idx: { cached: false,
                                                                                    pushPath: false,
                                                                                    path: [
                                                                                           { tag: 'value',
                                                                                             value: { value: _descriptor_8.toValue(1n),
                                                                                                      alignment: _descriptor_8.alignment() } },
                                                                                           { tag: 'value',
                                                                                             value: { value: _descriptor_8.toValue(6n),
                                                                                                      alignment: _descriptor_8.alignment() } }] } },
                                                                           { idx: { cached: false,
                                                                                    pushPath: false,
                                                                                    path: [
                                                                                           { tag: 'value',
                                                                                             value: { value: _descriptor_0.toValue(key_0),
                                                                                                      alignment: _descriptor_0.alignment() } }] } },
                                                                           { popeq: { cached: false,
                                                                                      result: undefined } }]).value);
      },
      [Symbol.iterator](...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`iter: expected 0 arguments, received ${args_0.length}`);
        }
        const self_0 = state.asArray()[1].asArray()[6];
        return self_0.asMap().keys().map(  (key) => {    const value = self_0.asMap().get(key).asCell();    return [      _descriptor_0.fromValue(key.value),      _descriptor_20.fromValue(value.value)    ];  })[Symbol.iterator]();
      }
    },
    reservedAdmissionNonces: {
      isEmpty(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`isEmpty: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_6.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_8.toValue(1n),
                                                                                                     alignment: _descriptor_8.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_8.toValue(7n),
                                                                                                     alignment: _descriptor_8.alignment() } }] } },
                                                                          'size',
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_3.toValue(0n),
                                                                                                                                 alignment: _descriptor_3.alignment() }).encode() } },
                                                                          'eq',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      size(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`size: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_8.toValue(1n),
                                                                                                     alignment: _descriptor_8.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_8.toValue(7n),
                                                                                                     alignment: _descriptor_8.alignment() } }] } },
                                                                          'size',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      member(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`member: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(key_0.buffer instanceof ArrayBuffer && key_0.BYTES_PER_ELEMENT === 1 && key_0.length === 32)) {
          __compactRuntime.typeError('member',
                                     'argument 1',
                                     'permio-authorization.compact line 422 char 1',
                                     'Bytes<32>',
                                     key_0)
        }
        return _descriptor_6.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_8.toValue(1n),
                                                                                                     alignment: _descriptor_8.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_8.toValue(7n),
                                                                                                     alignment: _descriptor_8.alignment() } }] } },
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(key_0),
                                                                                                                                 alignment: _descriptor_0.alignment() }).encode() } },
                                                                          'member',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      lookup(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`lookup: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(key_0.buffer instanceof ArrayBuffer && key_0.BYTES_PER_ELEMENT === 1 && key_0.length === 32)) {
          __compactRuntime.typeError('lookup',
                                     'argument 1',
                                     'permio-authorization.compact line 422 char 1',
                                     'Bytes<32>',
                                     key_0)
        }
        return _descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_8.toValue(1n),
                                                                                                     alignment: _descriptor_8.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_8.toValue(7n),
                                                                                                     alignment: _descriptor_8.alignment() } }] } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_0.toValue(key_0),
                                                                                                     alignment: _descriptor_0.alignment() } }] } },
                                                                          { popeq: { cached: false,
                                                                                     result: undefined } }]).value);
      },
      [Symbol.iterator](...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`iter: expected 0 arguments, received ${args_0.length}`);
        }
        const self_0 = state.asArray()[1].asArray()[7];
        return self_0.asMap().keys().map(  (key) => {    const value = self_0.asMap().get(key).asCell();    return [      _descriptor_0.fromValue(key.value),      _descriptor_0.fromValue(value.value)    ];  })[Symbol.iterator]();
      }
    },
    activeTemplates: {
      isEmpty(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`isEmpty: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_6.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_8.toValue(1n),
                                                                                                     alignment: _descriptor_8.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_8.toValue(8n),
                                                                                                     alignment: _descriptor_8.alignment() } }] } },
                                                                          'size',
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_3.toValue(0n),
                                                                                                                                 alignment: _descriptor_3.alignment() }).encode() } },
                                                                          'eq',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      size(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`size: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_8.toValue(1n),
                                                                                                     alignment: _descriptor_8.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_8.toValue(8n),
                                                                                                     alignment: _descriptor_8.alignment() } }] } },
                                                                          'size',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      member(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`member: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(key_0.buffer instanceof ArrayBuffer && key_0.BYTES_PER_ELEMENT === 1 && key_0.length === 32)) {
          __compactRuntime.typeError('member',
                                     'argument 1',
                                     'permio-authorization.compact line 423 char 1',
                                     'Bytes<32>',
                                     key_0)
        }
        return _descriptor_6.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_8.toValue(1n),
                                                                                                     alignment: _descriptor_8.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_8.toValue(8n),
                                                                                                     alignment: _descriptor_8.alignment() } }] } },
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(key_0),
                                                                                                                                 alignment: _descriptor_0.alignment() }).encode() } },
                                                                          'member',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      lookup(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`lookup: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(key_0.buffer instanceof ArrayBuffer && key_0.BYTES_PER_ELEMENT === 1 && key_0.length === 32)) {
          __compactRuntime.typeError('lookup',
                                     'argument 1',
                                     'permio-authorization.compact line 423 char 1',
                                     'Bytes<32>',
                                     key_0)
        }
        return _descriptor_24.fromValue(__compactRuntime.queryLedgerState(context,
                                                                          partialProofData,
                                                                          [
                                                                           { dup: { n: 0 } },
                                                                           { idx: { cached: false,
                                                                                    pushPath: false,
                                                                                    path: [
                                                                                           { tag: 'value',
                                                                                             value: { value: _descriptor_8.toValue(1n),
                                                                                                      alignment: _descriptor_8.alignment() } },
                                                                                           { tag: 'value',
                                                                                             value: { value: _descriptor_8.toValue(8n),
                                                                                                      alignment: _descriptor_8.alignment() } }] } },
                                                                           { idx: { cached: false,
                                                                                    pushPath: false,
                                                                                    path: [
                                                                                           { tag: 'value',
                                                                                             value: { value: _descriptor_0.toValue(key_0),
                                                                                                      alignment: _descriptor_0.alignment() } }] } },
                                                                           { popeq: { cached: false,
                                                                                      result: undefined } }]).value);
      },
      [Symbol.iterator](...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`iter: expected 0 arguments, received ${args_0.length}`);
        }
        const self_0 = state.asArray()[1].asArray()[8];
        return self_0.asMap().keys().map(  (key) => {    const value = self_0.asMap().get(key).asCell();    return [      _descriptor_0.fromValue(key.value),      _descriptor_24.fromValue(value.value)    ];  })[Symbol.iterator]();
      }
    },
    usedAdmissionNonces: {
      isEmpty(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`isEmpty: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_6.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_8.toValue(1n),
                                                                                                     alignment: _descriptor_8.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_8.toValue(9n),
                                                                                                     alignment: _descriptor_8.alignment() } }] } },
                                                                          'size',
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_3.toValue(0n),
                                                                                                                                 alignment: _descriptor_3.alignment() }).encode() } },
                                                                          'eq',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      size(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`size: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_8.toValue(1n),
                                                                                                     alignment: _descriptor_8.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_8.toValue(9n),
                                                                                                     alignment: _descriptor_8.alignment() } }] } },
                                                                          'size',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      member(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`member: expected 1 argument, received ${args_0.length}`);
        }
        const elem_0 = args_0[0];
        if (!(elem_0.buffer instanceof ArrayBuffer && elem_0.BYTES_PER_ELEMENT === 1 && elem_0.length === 32)) {
          __compactRuntime.typeError('member',
                                     'argument 1',
                                     'permio-authorization.compact line 424 char 1',
                                     'Bytes<32>',
                                     elem_0)
        }
        return _descriptor_6.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_8.toValue(1n),
                                                                                                     alignment: _descriptor_8.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_8.toValue(9n),
                                                                                                     alignment: _descriptor_8.alignment() } }] } },
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(elem_0),
                                                                                                                                 alignment: _descriptor_0.alignment() }).encode() } },
                                                                          'member',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      [Symbol.iterator](...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`iter: expected 0 arguments, received ${args_0.length}`);
        }
        const self_0 = state.asArray()[1].asArray()[9];
        return self_0.asMap().keys().map((elem) => _descriptor_0.fromValue(elem.value))[Symbol.iterator]();
      }
    },
    get templateActivationSequence() {
      return _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_8.toValue(1n),
                                                                                                   alignment: _descriptor_8.alignment() } },
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_8.toValue(10n),
                                                                                                   alignment: _descriptor_8.alignment() } }] } },
                                                                        { popeq: { cached: true,
                                                                                   result: undefined } }]).value);
    },
    get templateLifecycleSequence() {
      return _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_8.toValue(1n),
                                                                                                   alignment: _descriptor_8.alignment() } },
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_8.toValue(11n),
                                                                                                   alignment: _descriptor_8.alignment() } }] } },
                                                                        { popeq: { cached: true,
                                                                                   result: undefined } }]).value);
    },
    usedTemplateLifecycleCommandNonces: {
      isEmpty(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`isEmpty: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_6.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_8.toValue(1n),
                                                                                                     alignment: _descriptor_8.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_8.toValue(12n),
                                                                                                     alignment: _descriptor_8.alignment() } }] } },
                                                                          'size',
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_3.toValue(0n),
                                                                                                                                 alignment: _descriptor_3.alignment() }).encode() } },
                                                                          'eq',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      size(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`size: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_8.toValue(1n),
                                                                                                     alignment: _descriptor_8.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_8.toValue(12n),
                                                                                                     alignment: _descriptor_8.alignment() } }] } },
                                                                          'size',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      member(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`member: expected 1 argument, received ${args_0.length}`);
        }
        const elem_0 = args_0[0];
        if (!(elem_0.buffer instanceof ArrayBuffer && elem_0.BYTES_PER_ELEMENT === 1 && elem_0.length === 32)) {
          __compactRuntime.typeError('member',
                                     'argument 1',
                                     'permio-authorization.compact line 427 char 1',
                                     'Bytes<32>',
                                     elem_0)
        }
        return _descriptor_6.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_8.toValue(1n),
                                                                                                     alignment: _descriptor_8.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_8.toValue(12n),
                                                                                                     alignment: _descriptor_8.alignment() } }] } },
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(elem_0),
                                                                                                                                 alignment: _descriptor_0.alignment() }).encode() } },
                                                                          'member',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      [Symbol.iterator](...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`iter: expected 0 arguments, received ${args_0.length}`);
        }
        const self_0 = state.asArray()[1].asArray()[12];
        return self_0.asMap().keys().map((elem) => _descriptor_0.fromValue(elem.value))[Symbol.iterator]();
      }
    },
    credentialStatusRoots: {
      isEmpty(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`isEmpty: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_6.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_8.toValue(1n),
                                                                                                     alignment: _descriptor_8.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_8.toValue(13n),
                                                                                                     alignment: _descriptor_8.alignment() } }] } },
                                                                          'size',
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_3.toValue(0n),
                                                                                                                                 alignment: _descriptor_3.alignment() }).encode() } },
                                                                          'eq',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      size(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`size: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_8.toValue(1n),
                                                                                                     alignment: _descriptor_8.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_8.toValue(13n),
                                                                                                     alignment: _descriptor_8.alignment() } }] } },
                                                                          'size',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      member(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`member: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(key_0.buffer instanceof ArrayBuffer && key_0.BYTES_PER_ELEMENT === 1 && key_0.length === 32)) {
          __compactRuntime.typeError('member',
                                     'argument 1',
                                     'permio-authorization.compact line 428 char 1',
                                     'Bytes<32>',
                                     key_0)
        }
        return _descriptor_6.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_8.toValue(1n),
                                                                                                     alignment: _descriptor_8.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_8.toValue(13n),
                                                                                                     alignment: _descriptor_8.alignment() } }] } },
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(key_0),
                                                                                                                                 alignment: _descriptor_0.alignment() }).encode() } },
                                                                          'member',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      lookup(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`lookup: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(key_0.buffer instanceof ArrayBuffer && key_0.BYTES_PER_ELEMENT === 1 && key_0.length === 32)) {
          __compactRuntime.typeError('lookup',
                                     'argument 1',
                                     'permio-authorization.compact line 428 char 1',
                                     'Bytes<32>',
                                     key_0)
        }
        return _descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_8.toValue(1n),
                                                                                                     alignment: _descriptor_8.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_8.toValue(13n),
                                                                                                     alignment: _descriptor_8.alignment() } }] } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_0.toValue(key_0),
                                                                                                     alignment: _descriptor_0.alignment() } }] } },
                                                                          { popeq: { cached: false,
                                                                                     result: undefined } }]).value);
      },
      [Symbol.iterator](...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`iter: expected 0 arguments, received ${args_0.length}`);
        }
        const self_0 = state.asArray()[1].asArray()[13];
        return self_0.asMap().keys().map(  (key) => {    const value = self_0.asMap().get(key).asCell();    return [      _descriptor_0.fromValue(key.value),      _descriptor_7.fromValue(value.value)    ];  })[Symbol.iterator]();
      }
    },
    usedCredentialStatusCommandNonces: {
      isEmpty(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`isEmpty: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_6.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_8.toValue(1n),
                                                                                                     alignment: _descriptor_8.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_8.toValue(14n),
                                                                                                     alignment: _descriptor_8.alignment() } }] } },
                                                                          'size',
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_3.toValue(0n),
                                                                                                                                 alignment: _descriptor_3.alignment() }).encode() } },
                                                                          'eq',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      size(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`size: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_8.toValue(1n),
                                                                                                     alignment: _descriptor_8.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_8.toValue(14n),
                                                                                                     alignment: _descriptor_8.alignment() } }] } },
                                                                          'size',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      member(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`member: expected 1 argument, received ${args_0.length}`);
        }
        const elem_0 = args_0[0];
        if (!(elem_0.buffer instanceof ArrayBuffer && elem_0.BYTES_PER_ELEMENT === 1 && elem_0.length === 32)) {
          __compactRuntime.typeError('member',
                                     'argument 1',
                                     'permio-authorization.compact line 429 char 1',
                                     'Bytes<32>',
                                     elem_0)
        }
        return _descriptor_6.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_8.toValue(1n),
                                                                                                     alignment: _descriptor_8.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_8.toValue(14n),
                                                                                                     alignment: _descriptor_8.alignment() } }] } },
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(elem_0),
                                                                                                                                 alignment: _descriptor_0.alignment() }).encode() } },
                                                                          'member',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      [Symbol.iterator](...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`iter: expected 0 arguments, received ${args_0.length}`);
        }
        const self_0 = state.asArray()[1].asArray()[14];
        return self_0.asMap().keys().map((elem) => _descriptor_0.fromValue(elem.value))[Symbol.iterator]();
      }
    }
  };
}
const _emptyContext = {
  currentQueryContext: new __compactRuntime.QueryContext(new __compactRuntime.ContractState().data, __compactRuntime.dummyContractAddress())
};
const _dummyContract = new Contract({
  getSchnorrReduction: (...args) => undefined
});
export const pureCircuits = {
  activationAdmissionMessage: (...args_0) => {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`activationAdmissionMessage: expected 1 argument (as invoked from Typescript), received ${args_0.length}`);
    }
    const envelope_0 = args_0[0];
    if (!(typeof(envelope_0) === 'object' && typeof(envelope_0.envelopeVersion) === 'bigint' && envelope_0.envelopeVersion >= 0n && envelope_0.envelopeVersion <= 65535n && envelope_0.namespaceHash.buffer instanceof ArrayBuffer && envelope_0.namespaceHash.BYTES_PER_ELEMENT === 1 && envelope_0.namespaceHash.length === 32 && envelope_0.templateIdHash.buffer instanceof ArrayBuffer && envelope_0.templateIdHash.BYTES_PER_ELEMENT === 1 && envelope_0.templateIdHash.length === 32 && typeof(envelope_0.semanticVersion) === 'object' && typeof(envelope_0.semanticVersion.major) === 'bigint' && envelope_0.semanticVersion.major >= 0n && envelope_0.semanticVersion.major <= 18446744073709551615n && typeof(envelope_0.semanticVersion.minor) === 'bigint' && envelope_0.semanticVersion.minor >= 0n && envelope_0.semanticVersion.minor <= 18446744073709551615n && typeof(envelope_0.semanticVersion.patch) === 'bigint' && envelope_0.semanticVersion.patch >= 0n && envelope_0.semanticVersion.patch <= 18446744073709551615n && envelope_0.templateContentHash.buffer instanceof ArrayBuffer && envelope_0.templateContentHash.BYTES_PER_ELEMENT === 1 && envelope_0.templateContentHash.length === 32 && envelope_0.governancePolicyHash.buffer instanceof ArrayBuffer && envelope_0.governancePolicyHash.BYTES_PER_ELEMENT === 1 && envelope_0.governancePolicyHash.length === 32 && envelope_0.proofModuleBindingsHash.buffer instanceof ArrayBuffer && envelope_0.proofModuleBindingsHash.BYTES_PER_ELEMENT === 1 && envelope_0.proofModuleBindingsHash.length === 32 && typeof(envelope_0.proofModuleBindingRoot) === 'object' && typeof(envelope_0.proofModuleBindingRoot.field) === 'bigint' && envelope_0.proofModuleBindingRoot.field >= 0 && envelope_0.proofModuleBindingRoot.field <= __compactRuntime.MAX_FIELD && typeof(envelope_0.proofModuleBindingCount) === 'bigint' && envelope_0.proofModuleBindingCount >= 0n && envelope_0.proofModuleBindingCount <= 4294967295n && typeof(envelope_0.proofModuleRegistrySequence) === 'bigint' && envelope_0.proofModuleRegistrySequence >= 0n && envelope_0.proofModuleRegistrySequence <= 18446744073709551615n && envelope_0.m4ActivationRecordHash.buffer instanceof ArrayBuffer && envelope_0.m4ActivationRecordHash.BYTES_PER_ELEMENT === 1 && envelope_0.m4ActivationRecordHash.length === 32 && envelope_0.approvalEvidenceCommitment.buffer instanceof ArrayBuffer && envelope_0.approvalEvidenceCommitment.BYTES_PER_ELEMENT === 1 && envelope_0.approvalEvidenceCommitment.length === 32 && typeof(envelope_0.authorityRootVersion) === 'bigint' && envelope_0.authorityRootVersion >= 0n && envelope_0.authorityRootVersion <= 18446744073709551615n && typeof(envelope_0.authorityRootSequence) === 'bigint' && envelope_0.authorityRootSequence >= 0n && envelope_0.authorityRootSequence <= 18446744073709551615n && envelope_0.targetNetworkHash.buffer instanceof ArrayBuffer && envelope_0.targetNetworkHash.BYTES_PER_ELEMENT === 1 && envelope_0.targetNetworkHash.length === 32 && envelope_0.targetContractIdentity.buffer instanceof ArrayBuffer && envelope_0.targetContractIdentity.BYTES_PER_ELEMENT === 1 && envelope_0.targetContractIdentity.length === 32 && typeof(envelope_0.registryProtocolVersion) === 'bigint' && envelope_0.registryProtocolVersion >= 0n && envelope_0.registryProtocolVersion <= 65535n && envelope_0.admissionNonce.buffer instanceof ArrayBuffer && envelope_0.admissionNonce.BYTES_PER_ELEMENT === 1 && envelope_0.admissionNonce.length === 32 && typeof(envelope_0.activatedAt) === 'bigint' && envelope_0.activatedAt >= 0n && envelope_0.activatedAt <= 18446744073709551615n && typeof(envelope_0.stagingExpiresAt) === 'bigint' && envelope_0.stagingExpiresAt >= 0n && envelope_0.stagingExpiresAt <= 18446744073709551615n)) {
      __compactRuntime.typeError('activationAdmissionMessage',
                                 'argument 1',
                                 'permio-authorization.compact line 475 char 1',
                                 'struct ActivationAdmissionEnvelope<envelopeVersion: Uint<0..65536>, namespaceHash: Bytes<32>, templateIdHash: Bytes<32>, semanticVersion: struct SemanticVersion<major: Uint<0..18446744073709551616>, minor: Uint<0..18446744073709551616>, patch: Uint<0..18446744073709551616>>, templateContentHash: Bytes<32>, governancePolicyHash: Bytes<32>, proofModuleBindingsHash: Bytes<32>, proofModuleBindingRoot: struct MerkleTreeDigest<field: Field>, proofModuleBindingCount: Uint<0..4294967296>, proofModuleRegistrySequence: Uint<0..18446744073709551616>, m4ActivationRecordHash: Bytes<32>, approvalEvidenceCommitment: Bytes<32>, authorityRootVersion: Uint<0..18446744073709551616>, authorityRootSequence: Uint<0..18446744073709551616>, targetNetworkHash: Bytes<32>, targetContractIdentity: Bytes<32>, registryProtocolVersion: Uint<0..65536>, admissionNonce: Bytes<32>, activatedAt: Uint<0..18446744073709551616>, stagingExpiresAt: Uint<0..18446744073709551616>>',
                                 envelope_0)
    }
    return _dummyContract._activationAdmissionMessage_0(envelope_0);
  },
  activationAdmissionEnvelopeCommitment: (...args_0) => {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`activationAdmissionEnvelopeCommitment: expected 1 argument (as invoked from Typescript), received ${args_0.length}`);
    }
    const envelope_0 = args_0[0];
    if (!(typeof(envelope_0) === 'object' && typeof(envelope_0.envelopeVersion) === 'bigint' && envelope_0.envelopeVersion >= 0n && envelope_0.envelopeVersion <= 65535n && envelope_0.namespaceHash.buffer instanceof ArrayBuffer && envelope_0.namespaceHash.BYTES_PER_ELEMENT === 1 && envelope_0.namespaceHash.length === 32 && envelope_0.templateIdHash.buffer instanceof ArrayBuffer && envelope_0.templateIdHash.BYTES_PER_ELEMENT === 1 && envelope_0.templateIdHash.length === 32 && typeof(envelope_0.semanticVersion) === 'object' && typeof(envelope_0.semanticVersion.major) === 'bigint' && envelope_0.semanticVersion.major >= 0n && envelope_0.semanticVersion.major <= 18446744073709551615n && typeof(envelope_0.semanticVersion.minor) === 'bigint' && envelope_0.semanticVersion.minor >= 0n && envelope_0.semanticVersion.minor <= 18446744073709551615n && typeof(envelope_0.semanticVersion.patch) === 'bigint' && envelope_0.semanticVersion.patch >= 0n && envelope_0.semanticVersion.patch <= 18446744073709551615n && envelope_0.templateContentHash.buffer instanceof ArrayBuffer && envelope_0.templateContentHash.BYTES_PER_ELEMENT === 1 && envelope_0.templateContentHash.length === 32 && envelope_0.governancePolicyHash.buffer instanceof ArrayBuffer && envelope_0.governancePolicyHash.BYTES_PER_ELEMENT === 1 && envelope_0.governancePolicyHash.length === 32 && envelope_0.proofModuleBindingsHash.buffer instanceof ArrayBuffer && envelope_0.proofModuleBindingsHash.BYTES_PER_ELEMENT === 1 && envelope_0.proofModuleBindingsHash.length === 32 && typeof(envelope_0.proofModuleBindingRoot) === 'object' && typeof(envelope_0.proofModuleBindingRoot.field) === 'bigint' && envelope_0.proofModuleBindingRoot.field >= 0 && envelope_0.proofModuleBindingRoot.field <= __compactRuntime.MAX_FIELD && typeof(envelope_0.proofModuleBindingCount) === 'bigint' && envelope_0.proofModuleBindingCount >= 0n && envelope_0.proofModuleBindingCount <= 4294967295n && typeof(envelope_0.proofModuleRegistrySequence) === 'bigint' && envelope_0.proofModuleRegistrySequence >= 0n && envelope_0.proofModuleRegistrySequence <= 18446744073709551615n && envelope_0.m4ActivationRecordHash.buffer instanceof ArrayBuffer && envelope_0.m4ActivationRecordHash.BYTES_PER_ELEMENT === 1 && envelope_0.m4ActivationRecordHash.length === 32 && envelope_0.approvalEvidenceCommitment.buffer instanceof ArrayBuffer && envelope_0.approvalEvidenceCommitment.BYTES_PER_ELEMENT === 1 && envelope_0.approvalEvidenceCommitment.length === 32 && typeof(envelope_0.authorityRootVersion) === 'bigint' && envelope_0.authorityRootVersion >= 0n && envelope_0.authorityRootVersion <= 18446744073709551615n && typeof(envelope_0.authorityRootSequence) === 'bigint' && envelope_0.authorityRootSequence >= 0n && envelope_0.authorityRootSequence <= 18446744073709551615n && envelope_0.targetNetworkHash.buffer instanceof ArrayBuffer && envelope_0.targetNetworkHash.BYTES_PER_ELEMENT === 1 && envelope_0.targetNetworkHash.length === 32 && envelope_0.targetContractIdentity.buffer instanceof ArrayBuffer && envelope_0.targetContractIdentity.BYTES_PER_ELEMENT === 1 && envelope_0.targetContractIdentity.length === 32 && typeof(envelope_0.registryProtocolVersion) === 'bigint' && envelope_0.registryProtocolVersion >= 0n && envelope_0.registryProtocolVersion <= 65535n && envelope_0.admissionNonce.buffer instanceof ArrayBuffer && envelope_0.admissionNonce.BYTES_PER_ELEMENT === 1 && envelope_0.admissionNonce.length === 32 && typeof(envelope_0.activatedAt) === 'bigint' && envelope_0.activatedAt >= 0n && envelope_0.activatedAt <= 18446744073709551615n && typeof(envelope_0.stagingExpiresAt) === 'bigint' && envelope_0.stagingExpiresAt >= 0n && envelope_0.stagingExpiresAt <= 18446744073709551615n)) {
      __compactRuntime.typeError('activationAdmissionEnvelopeCommitment',
                                 'argument 1',
                                 'permio-authorization.compact line 481 char 1',
                                 'struct ActivationAdmissionEnvelope<envelopeVersion: Uint<0..65536>, namespaceHash: Bytes<32>, templateIdHash: Bytes<32>, semanticVersion: struct SemanticVersion<major: Uint<0..18446744073709551616>, minor: Uint<0..18446744073709551616>, patch: Uint<0..18446744073709551616>>, templateContentHash: Bytes<32>, governancePolicyHash: Bytes<32>, proofModuleBindingsHash: Bytes<32>, proofModuleBindingRoot: struct MerkleTreeDigest<field: Field>, proofModuleBindingCount: Uint<0..4294967296>, proofModuleRegistrySequence: Uint<0..18446744073709551616>, m4ActivationRecordHash: Bytes<32>, approvalEvidenceCommitment: Bytes<32>, authorityRootVersion: Uint<0..18446744073709551616>, authorityRootSequence: Uint<0..18446744073709551616>, targetNetworkHash: Bytes<32>, targetContractIdentity: Bytes<32>, registryProtocolVersion: Uint<0..65536>, admissionNonce: Bytes<32>, activatedAt: Uint<0..18446744073709551616>, stagingExpiresAt: Uint<0..18446744073709551616>>',
                                 envelope_0)
    }
    return _dummyContract._activationAdmissionEnvelopeCommitment_0(envelope_0);
  },
  governanceActivatorLeafCommitment: (...args_0) => {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`governanceActivatorLeafCommitment: expected 1 argument (as invoked from Typescript), received ${args_0.length}`);
    }
    const leaf_0 = args_0[0];
    if (!(typeof(leaf_0) === 'object' && typeof(leaf_0.leafVersion) === 'bigint' && leaf_0.leafVersion >= 0n && leaf_0.leafVersion <= 65535n && leaf_0.namespaceHash.buffer instanceof ArrayBuffer && leaf_0.namespaceHash.BYTES_PER_ELEMENT === 1 && leaf_0.namespaceHash.length === 32 && leaf_0.governancePolicyHash.buffer instanceof ArrayBuffer && leaf_0.governancePolicyHash.BYTES_PER_ELEMENT === 1 && leaf_0.governancePolicyHash.length === 32 && typeof(leaf_0.authorityKind) === 'bigint' && leaf_0.authorityKind >= 0n && leaf_0.authorityKind <= 65535n && true && typeof(leaf_0.validAfter) === 'bigint' && leaf_0.validAfter >= 0n && leaf_0.validAfter <= 18446744073709551615n && typeof(leaf_0.validBefore) === 'bigint' && leaf_0.validBefore >= 0n && leaf_0.validBefore <= 18446744073709551615n)) {
      __compactRuntime.typeError('governanceActivatorLeafCommitment',
                                 'argument 1',
                                 'permio-authorization.compact line 487 char 1',
                                 'struct GovernanceActivatorLeaf<leafVersion: Uint<0..65536>, namespaceHash: Bytes<32>, governancePolicyHash: Bytes<32>, authorityKind: Uint<0..65536>, publicKey: Opaque<"JubjubPoint">, validAfter: Uint<0..18446744073709551616>, validBefore: Uint<0..18446744073709551616>>',
                                 leaf_0)
    }
    return _dummyContract._governanceActivatorLeafCommitment_0(leaf_0);
  },
  authorityRootUpdateCommandCommitment: (...args_0) => {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`authorityRootUpdateCommandCommitment: expected 1 argument (as invoked from Typescript), received ${args_0.length}`);
    }
    const command_0 = args_0[0];
    if (!(typeof(command_0) === 'object' && typeof(command_0.commandVersion) === 'bigint' && command_0.commandVersion >= 0n && command_0.commandVersion <= 65535n && command_0.namespaceHash.buffer instanceof ArrayBuffer && command_0.namespaceHash.BYTES_PER_ELEMENT === 1 && command_0.namespaceHash.length === 32 && command_0.currentGovernancePolicyHash.buffer instanceof ArrayBuffer && command_0.currentGovernancePolicyHash.BYTES_PER_ELEMENT === 1 && command_0.currentGovernancePolicyHash.length === 32 && typeof(command_0.currentRoot) === 'object' && typeof(command_0.currentRoot.field) === 'bigint' && command_0.currentRoot.field >= 0 && command_0.currentRoot.field <= __compactRuntime.MAX_FIELD && typeof(command_0.currentRootVersion) === 'bigint' && command_0.currentRootVersion >= 0n && command_0.currentRootVersion <= 18446744073709551615n && typeof(command_0.currentRootSequence) === 'bigint' && command_0.currentRootSequence >= 0n && command_0.currentRootSequence <= 18446744073709551615n && command_0.nextGovernancePolicyHash.buffer instanceof ArrayBuffer && command_0.nextGovernancePolicyHash.BYTES_PER_ELEMENT === 1 && command_0.nextGovernancePolicyHash.length === 32 && typeof(command_0.nextRoot) === 'object' && typeof(command_0.nextRoot.field) === 'bigint' && command_0.nextRoot.field >= 0 && command_0.nextRoot.field <= __compactRuntime.MAX_FIELD && typeof(command_0.nextRootVersion) === 'bigint' && command_0.nextRootVersion >= 0n && command_0.nextRootVersion <= 18446744073709551615n && typeof(command_0.nextRootSequence) === 'bigint' && command_0.nextRootSequence >= 0n && command_0.nextRootSequence <= 18446744073709551615n && typeof(command_0.nextModuleReviewThreshold) === 'bigint' && command_0.nextModuleReviewThreshold >= 0n && command_0.nextModuleReviewThreshold <= 65535n && typeof(command_0.nextModuleApprovalThreshold) === 'bigint' && command_0.nextModuleApprovalThreshold >= 0n && command_0.nextModuleApprovalThreshold <= 65535n && typeof(command_0.nextAuthorityRootUpdateThreshold) === 'bigint' && command_0.nextAuthorityRootUpdateThreshold >= 0n && command_0.nextAuthorityRootUpdateThreshold <= 65535n && typeof(command_0.effectiveAt) === 'bigint' && command_0.effectiveAt >= 0n && command_0.effectiveAt <= 18446744073709551615n && command_0.updateNonce.buffer instanceof ArrayBuffer && command_0.updateNonce.BYTES_PER_ELEMENT === 1 && command_0.updateNonce.length === 32)) {
      __compactRuntime.typeError('authorityRootUpdateCommandCommitment',
                                 'argument 1',
                                 'permio-authorization.compact line 493 char 1',
                                 'struct AuthorityRootUpdateCommand<commandVersion: Uint<0..65536>, namespaceHash: Bytes<32>, currentGovernancePolicyHash: Bytes<32>, currentRoot: struct MerkleTreeDigest<field: Field>, currentRootVersion: Uint<0..18446744073709551616>, currentRootSequence: Uint<0..18446744073709551616>, nextGovernancePolicyHash: Bytes<32>, nextRoot: struct MerkleTreeDigest<field: Field>, nextRootVersion: Uint<0..18446744073709551616>, nextRootSequence: Uint<0..18446744073709551616>, nextModuleReviewThreshold: Uint<0..65536>, nextModuleApprovalThreshold: Uint<0..65536>, nextAuthorityRootUpdateThreshold: Uint<0..65536>, effectiveAt: Uint<0..18446744073709551616>, updateNonce: Bytes<32>>',
                                 command_0)
    }
    return _dummyContract._authorityRootUpdateCommandCommitment_0(command_0);
  },
  authorityRootUpdateCommandMessage: (...args_0) => {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`authorityRootUpdateCommandMessage: expected 1 argument (as invoked from Typescript), received ${args_0.length}`);
    }
    const command_0 = args_0[0];
    if (!(typeof(command_0) === 'object' && typeof(command_0.commandVersion) === 'bigint' && command_0.commandVersion >= 0n && command_0.commandVersion <= 65535n && command_0.namespaceHash.buffer instanceof ArrayBuffer && command_0.namespaceHash.BYTES_PER_ELEMENT === 1 && command_0.namespaceHash.length === 32 && command_0.currentGovernancePolicyHash.buffer instanceof ArrayBuffer && command_0.currentGovernancePolicyHash.BYTES_PER_ELEMENT === 1 && command_0.currentGovernancePolicyHash.length === 32 && typeof(command_0.currentRoot) === 'object' && typeof(command_0.currentRoot.field) === 'bigint' && command_0.currentRoot.field >= 0 && command_0.currentRoot.field <= __compactRuntime.MAX_FIELD && typeof(command_0.currentRootVersion) === 'bigint' && command_0.currentRootVersion >= 0n && command_0.currentRootVersion <= 18446744073709551615n && typeof(command_0.currentRootSequence) === 'bigint' && command_0.currentRootSequence >= 0n && command_0.currentRootSequence <= 18446744073709551615n && command_0.nextGovernancePolicyHash.buffer instanceof ArrayBuffer && command_0.nextGovernancePolicyHash.BYTES_PER_ELEMENT === 1 && command_0.nextGovernancePolicyHash.length === 32 && typeof(command_0.nextRoot) === 'object' && typeof(command_0.nextRoot.field) === 'bigint' && command_0.nextRoot.field >= 0 && command_0.nextRoot.field <= __compactRuntime.MAX_FIELD && typeof(command_0.nextRootVersion) === 'bigint' && command_0.nextRootVersion >= 0n && command_0.nextRootVersion <= 18446744073709551615n && typeof(command_0.nextRootSequence) === 'bigint' && command_0.nextRootSequence >= 0n && command_0.nextRootSequence <= 18446744073709551615n && typeof(command_0.nextModuleReviewThreshold) === 'bigint' && command_0.nextModuleReviewThreshold >= 0n && command_0.nextModuleReviewThreshold <= 65535n && typeof(command_0.nextModuleApprovalThreshold) === 'bigint' && command_0.nextModuleApprovalThreshold >= 0n && command_0.nextModuleApprovalThreshold <= 65535n && typeof(command_0.nextAuthorityRootUpdateThreshold) === 'bigint' && command_0.nextAuthorityRootUpdateThreshold >= 0n && command_0.nextAuthorityRootUpdateThreshold <= 65535n && typeof(command_0.effectiveAt) === 'bigint' && command_0.effectiveAt >= 0n && command_0.effectiveAt <= 18446744073709551615n && command_0.updateNonce.buffer instanceof ArrayBuffer && command_0.updateNonce.BYTES_PER_ELEMENT === 1 && command_0.updateNonce.length === 32)) {
      __compactRuntime.typeError('authorityRootUpdateCommandMessage',
                                 'argument 1',
                                 'permio-authorization.compact line 499 char 1',
                                 'struct AuthorityRootUpdateCommand<commandVersion: Uint<0..65536>, namespaceHash: Bytes<32>, currentGovernancePolicyHash: Bytes<32>, currentRoot: struct MerkleTreeDigest<field: Field>, currentRootVersion: Uint<0..18446744073709551616>, currentRootSequence: Uint<0..18446744073709551616>, nextGovernancePolicyHash: Bytes<32>, nextRoot: struct MerkleTreeDigest<field: Field>, nextRootVersion: Uint<0..18446744073709551616>, nextRootSequence: Uint<0..18446744073709551616>, nextModuleReviewThreshold: Uint<0..65536>, nextModuleApprovalThreshold: Uint<0..65536>, nextAuthorityRootUpdateThreshold: Uint<0..65536>, effectiveAt: Uint<0..18446744073709551616>, updateNonce: Bytes<32>>',
                                 command_0)
    }
    return _dummyContract._authorityRootUpdateCommandMessage_0(command_0);
  },
  templateLifecycleCommandMessage: (...args_0) => {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`templateLifecycleCommandMessage: expected 1 argument (as invoked from Typescript), received ${args_0.length}`);
    }
    const command_0 = args_0[0];
    if (!(typeof(command_0) === 'object' && typeof(command_0.commandVersion) === 'bigint' && command_0.commandVersion >= 0n && command_0.commandVersion <= 65535n && command_0.registryKey.buffer instanceof ArrayBuffer && command_0.registryKey.BYTES_PER_ELEMENT === 1 && command_0.registryKey.length === 32 && command_0.recordCommitment.buffer instanceof ArrayBuffer && command_0.recordCommitment.BYTES_PER_ELEMENT === 1 && command_0.recordCommitment.length === 32 && command_0.namespaceHash.buffer instanceof ArrayBuffer && command_0.namespaceHash.BYTES_PER_ELEMENT === 1 && command_0.namespaceHash.length === 32 && command_0.governancePolicyHash.buffer instanceof ArrayBuffer && command_0.governancePolicyHash.BYTES_PER_ELEMENT === 1 && command_0.governancePolicyHash.length === 32 && typeof(command_0.authorityRootVersion) === 'bigint' && command_0.authorityRootVersion >= 0n && command_0.authorityRootVersion <= 18446744073709551615n && typeof(command_0.authorityRootSequence) === 'bigint' && command_0.authorityRootSequence >= 0n && command_0.authorityRootSequence <= 18446744073709551615n && typeof(command_0.expectedLifecycleStatus) === 'bigint' && command_0.expectedLifecycleStatus >= 0n && command_0.expectedLifecycleStatus <= 255n && typeof(command_0.nextLifecycleStatus) === 'bigint' && command_0.nextLifecycleStatus >= 0n && command_0.nextLifecycleStatus <= 255n && typeof(command_0.effectiveAt) === 'bigint' && command_0.effectiveAt >= 0n && command_0.effectiveAt <= 18446744073709551615n && typeof(command_0.effectiveSequence) === 'bigint' && command_0.effectiveSequence >= 0n && command_0.effectiveSequence <= 18446744073709551615n && command_0.reasonHash.buffer instanceof ArrayBuffer && command_0.reasonHash.BYTES_PER_ELEMENT === 1 && command_0.reasonHash.length === 32 && command_0.commandNonce.buffer instanceof ArrayBuffer && command_0.commandNonce.BYTES_PER_ELEMENT === 1 && command_0.commandNonce.length === 32)) {
      __compactRuntime.typeError('templateLifecycleCommandMessage',
                                 'argument 1',
                                 'permio-authorization.compact line 505 char 1',
                                 'struct TemplateLifecycleCommand<commandVersion: Uint<0..65536>, registryKey: Bytes<32>, recordCommitment: Bytes<32>, namespaceHash: Bytes<32>, governancePolicyHash: Bytes<32>, authorityRootVersion: Uint<0..18446744073709551616>, authorityRootSequence: Uint<0..18446744073709551616>, expectedLifecycleStatus: Uint<0..256>, nextLifecycleStatus: Uint<0..256>, effectiveAt: Uint<0..18446744073709551616>, effectiveSequence: Uint<0..18446744073709551616>, reasonHash: Bytes<32>, commandNonce: Bytes<32>>',
                                 command_0)
    }
    return _dummyContract._templateLifecycleCommandMessage_0(command_0);
  },
  runtimeAccountCredentialCommitment: (...args_0) => {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`runtimeAccountCredentialCommitment: expected 1 argument (as invoked from Typescript), received ${args_0.length}`);
    }
    const credential_0 = args_0[0];
    if (!(typeof(credential_0) === 'object' && typeof(credential_0.credentialVersion) === 'bigint' && credential_0.credentialVersion >= 0n && credential_0.credentialVersion <= 65535n && typeof(credential_0.target) === 'object' && credential_0.target.namespaceHash.buffer instanceof ArrayBuffer && credential_0.target.namespaceHash.BYTES_PER_ELEMENT === 1 && credential_0.target.namespaceHash.length === 32 && credential_0.target.templateIdHash.buffer instanceof ArrayBuffer && credential_0.target.templateIdHash.BYTES_PER_ELEMENT === 1 && credential_0.target.templateIdHash.length === 32 && typeof(credential_0.target.semanticVersion) === 'object' && typeof(credential_0.target.semanticVersion.major) === 'bigint' && credential_0.target.semanticVersion.major >= 0n && credential_0.target.semanticVersion.major <= 18446744073709551615n && typeof(credential_0.target.semanticVersion.minor) === 'bigint' && credential_0.target.semanticVersion.minor >= 0n && credential_0.target.semanticVersion.minor <= 18446744073709551615n && typeof(credential_0.target.semanticVersion.patch) === 'bigint' && credential_0.target.semanticVersion.patch >= 0n && credential_0.target.semanticVersion.patch <= 18446744073709551615n && credential_0.target.templateContentHash.buffer instanceof ArrayBuffer && credential_0.target.templateContentHash.BYTES_PER_ELEMENT === 1 && credential_0.target.templateContentHash.length === 32 && credential_0.instanceCommitment.buffer instanceof ArrayBuffer && credential_0.instanceCommitment.BYTES_PER_ELEMENT === 1 && credential_0.instanceCommitment.length === 32 && credential_0.contextHash.buffer instanceof ArrayBuffer && credential_0.contextHash.BYTES_PER_ELEMENT === 1 && credential_0.contextHash.length === 32 && credential_0.accountIdHash.buffer instanceof ArrayBuffer && credential_0.accountIdHash.BYTES_PER_ELEMENT === 1 && credential_0.accountIdHash.length === 32 && typeof(credential_0.principalKind) === 'bigint' && credential_0.principalKind >= 0n && credential_0.principalKind <= 65535n && credential_0.m5AccountCommitment.buffer instanceof ArrayBuffer && credential_0.m5AccountCommitment.BYTES_PER_ELEMENT === 1 && credential_0.m5AccountCommitment.length === 32 && true && typeof(credential_0.statusIndex) === 'bigint' && credential_0.statusIndex >= 0n && credential_0.statusIndex <= 18446744073709551615n && typeof(credential_0.issuedAt) === 'bigint' && credential_0.issuedAt >= 0n && credential_0.issuedAt <= 18446744073709551615n && typeof(credential_0.validBefore) === 'bigint' && credential_0.validBefore >= 0n && credential_0.validBefore <= 18446744073709551615n)) {
      __compactRuntime.typeError('runtimeAccountCredentialCommitment',
                                 'argument 1',
                                 'permio-authorization.compact line 511 char 1',
                                 'struct RuntimeAccountCredential<credentialVersion: Uint<0..65536>, target: struct TemplateRegistryTarget<namespaceHash: Bytes<32>, templateIdHash: Bytes<32>, semanticVersion: struct SemanticVersion<major: Uint<0..18446744073709551616>, minor: Uint<0..18446744073709551616>, patch: Uint<0..18446744073709551616>>, templateContentHash: Bytes<32>>, instanceCommitment: Bytes<32>, contextHash: Bytes<32>, accountIdHash: Bytes<32>, principalKind: Uint<0..65536>, m5AccountCommitment: Bytes<32>, runtimePublicKey: Opaque<"JubjubPoint">, statusIndex: Uint<0..18446744073709551616>, issuedAt: Uint<0..18446744073709551616>, validBefore: Uint<0..18446744073709551616>>',
                                 credential_0)
    }
    return _dummyContract._runtimeAccountCredentialCommitment_0(credential_0);
  },
  runtimeScopeValueCommitment: (...args_0) => {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`runtimeScopeValueCommitment: expected 1 argument (as invoked from Typescript), received ${args_0.length}`);
    }
    const valueHash_0 = args_0[0];
    if (!(valueHash_0.buffer instanceof ArrayBuffer && valueHash_0.BYTES_PER_ELEMENT === 1 && valueHash_0.length === 32)) {
      __compactRuntime.typeError('runtimeScopeValueCommitment',
                                 'argument 1',
                                 'permio-authorization.compact line 517 char 1',
                                 'Bytes<32>',
                                 valueHash_0)
    }
    return _dummyContract._runtimeScopeValueCommitment_0(valueHash_0);
  },
  runtimeCredentialStatusLeafCommitment: (...args_0) => {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`runtimeCredentialStatusLeafCommitment: expected 1 argument (as invoked from Typescript), received ${args_0.length}`);
    }
    const leaf_0 = args_0[0];
    if (!(typeof(leaf_0) === 'object' && typeof(leaf_0.leafVersion) === 'bigint' && leaf_0.leafVersion >= 0n && leaf_0.leafVersion <= 65535n && leaf_0.namespaceHash.buffer instanceof ArrayBuffer && leaf_0.namespaceHash.BYTES_PER_ELEMENT === 1 && leaf_0.namespaceHash.length === 32 && typeof(leaf_0.credentialKind) === 'bigint' && leaf_0.credentialKind >= 0n && leaf_0.credentialKind <= 65535n && leaf_0.credentialCommitment.buffer instanceof ArrayBuffer && leaf_0.credentialCommitment.BYTES_PER_ELEMENT === 1 && leaf_0.credentialCommitment.length === 32 && leaf_0.revocationAuthorityAccountCredentialCommitment.buffer instanceof ArrayBuffer && leaf_0.revocationAuthorityAccountCredentialCommitment.BYTES_PER_ELEMENT === 1 && leaf_0.revocationAuthorityAccountCredentialCommitment.length === 32 && typeof(leaf_0.statusIndex) === 'bigint' && leaf_0.statusIndex >= 0n && leaf_0.statusIndex <= 18446744073709551615n && typeof(leaf_0.status) === 'bigint' && leaf_0.status >= 0n && leaf_0.status <= 255n)) {
      __compactRuntime.typeError('runtimeCredentialStatusLeafCommitment',
                                 'argument 1',
                                 'permio-authorization.compact line 523 char 1',
                                 'struct RuntimeCredentialStatusLeaf<leafVersion: Uint<0..65536>, namespaceHash: Bytes<32>, credentialKind: Uint<0..65536>, credentialCommitment: Bytes<32>, revocationAuthorityAccountCredentialCommitment: Bytes<32>, statusIndex: Uint<0..18446744073709551616>, status: Uint<0..256>>',
                                 leaf_0)
    }
    return _dummyContract._runtimeCredentialStatusLeafCommitment_0(leaf_0);
  },
  runtimeCredentialStatusPathRoot: (...args_0) => {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`runtimeCredentialStatusPathRoot: expected 1 argument (as invoked from Typescript), received ${args_0.length}`);
    }
    const path_0 = args_0[0];
    if (!(typeof(path_0) === 'object' && path_0.leaf.buffer instanceof ArrayBuffer && path_0.leaf.BYTES_PER_ELEMENT === 1 && path_0.leaf.length === 32 && Array.isArray(path_0.path) && path_0.path.length === 20 && path_0.path.every((t) => typeof(t) === 'object' && typeof(t.sibling) === 'object' && typeof(t.sibling.field) === 'bigint' && t.sibling.field >= 0 && t.sibling.field <= __compactRuntime.MAX_FIELD && typeof(t.goes_left) === 'boolean'))) {
      __compactRuntime.typeError('runtimeCredentialStatusPathRoot',
                                 'argument 1',
                                 'permio-authorization.compact line 529 char 1',
                                 'struct MerkleTreePath<leaf: Bytes<32>, path: Vector<20, struct MerkleTreePathEntry<sibling: struct MerkleTreeDigest<field: Field>, goes_left: Boolean>>>',
                                 path_0)
    }
    return _dummyContract._runtimeCredentialStatusPathRoot_0(path_0);
  },
  runtimeCredentialStatusLeafParent: (...args_0) => {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`runtimeCredentialStatusLeafParent: expected 1 argument (as invoked from Typescript), received ${args_0.length}`);
    }
    const path_0 = args_0[0];
    if (!(typeof(path_0) === 'object' && path_0.leaf.buffer instanceof ArrayBuffer && path_0.leaf.BYTES_PER_ELEMENT === 1 && path_0.leaf.length === 32 && Array.isArray(path_0.path) && path_0.path.length === 1 && path_0.path.every((t) => typeof(t) === 'object' && typeof(t.sibling) === 'object' && typeof(t.sibling.field) === 'bigint' && t.sibling.field >= 0 && t.sibling.field <= __compactRuntime.MAX_FIELD && typeof(t.goes_left) === 'boolean'))) {
      __compactRuntime.typeError('runtimeCredentialStatusLeafParent',
                                 'argument 1',
                                 'permio-authorization.compact line 535 char 1',
                                 'struct MerkleTreePath<leaf: Bytes<32>, path: Vector<1, struct MerkleTreePathEntry<sibling: struct MerkleTreeDigest<field: Field>, goes_left: Boolean>>>',
                                 path_0)
    }
    return _dummyContract._runtimeCredentialStatusLeafParent_0(path_0);
  },
  runtimeCredentialStatusNodeParent: (...args_0) => {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`runtimeCredentialStatusNodeParent: expected 1 argument (as invoked from Typescript), received ${args_0.length}`);
    }
    const path_0 = args_0[0];
    if (!(typeof(path_0) === 'object' && typeof(path_0.leaf) === 'object' && typeof(path_0.leaf.field) === 'bigint' && path_0.leaf.field >= 0 && path_0.leaf.field <= __compactRuntime.MAX_FIELD && Array.isArray(path_0.path) && path_0.path.length === 1 && path_0.path.every((t) => typeof(t) === 'object' && typeof(t.sibling) === 'object' && typeof(t.sibling.field) === 'bigint' && t.sibling.field >= 0 && t.sibling.field <= __compactRuntime.MAX_FIELD && typeof(t.goes_left) === 'boolean'))) {
      __compactRuntime.typeError('runtimeCredentialStatusNodeParent',
                                 'argument 1',
                                 'permio-authorization.compact line 541 char 1',
                                 'struct MerkleTreePath<leaf: struct MerkleTreeDigest<field: Field>, path: Vector<1, struct MerkleTreePathEntry<sibling: struct MerkleTreeDigest<field: Field>, goes_left: Boolean>>>',
                                 path_0)
    }
    return _dummyContract._runtimeCredentialStatusNodeParent_0(path_0);
  },
  runtimeCredentialStatusCommandMessage: (...args_0) => {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`runtimeCredentialStatusCommandMessage: expected 1 argument (as invoked from Typescript), received ${args_0.length}`);
    }
    const command_0 = args_0[0];
    if (!(typeof(command_0) === 'object' && typeof(command_0.commandVersion) === 'bigint' && command_0.commandVersion >= 0n && command_0.commandVersion <= 65535n && command_0.namespaceHash.buffer instanceof ArrayBuffer && command_0.namespaceHash.BYTES_PER_ELEMENT === 1 && command_0.namespaceHash.length === 32 && command_0.governancePolicyHash.buffer instanceof ArrayBuffer && command_0.governancePolicyHash.BYTES_PER_ELEMENT === 1 && command_0.governancePolicyHash.length === 32 && typeof(command_0.authorityRootVersion) === 'bigint' && command_0.authorityRootVersion >= 0n && command_0.authorityRootVersion <= 18446744073709551615n && typeof(command_0.authorityRootSequence) === 'bigint' && command_0.authorityRootSequence >= 0n && command_0.authorityRootSequence <= 18446744073709551615n && typeof(command_0.credentialStatusRootSequence) === 'bigint' && command_0.credentialStatusRootSequence >= 0n && command_0.credentialStatusRootSequence <= 18446744073709551615n && typeof(command_0.credentialKind) === 'bigint' && command_0.credentialKind >= 0n && command_0.credentialKind <= 65535n && command_0.credentialCommitment.buffer instanceof ArrayBuffer && command_0.credentialCommitment.BYTES_PER_ELEMENT === 1 && command_0.credentialCommitment.length === 32 && command_0.subjectAccountCredentialCommitment.buffer instanceof ArrayBuffer && command_0.subjectAccountCredentialCommitment.BYTES_PER_ELEMENT === 1 && command_0.subjectAccountCredentialCommitment.length === 32 && command_0.revocationAuthorityAccountCredentialCommitment.buffer instanceof ArrayBuffer && command_0.revocationAuthorityAccountCredentialCommitment.BYTES_PER_ELEMENT === 1 && command_0.revocationAuthorityAccountCredentialCommitment.length === 32 && typeof(command_0.statusIndex) === 'bigint' && command_0.statusIndex >= 0n && command_0.statusIndex <= 18446744073709551615n && typeof(command_0.expectedStatus) === 'bigint' && command_0.expectedStatus >= 0n && command_0.expectedStatus <= 255n && typeof(command_0.nextStatus) === 'bigint' && command_0.nextStatus >= 0n && command_0.nextStatus <= 255n && typeof(command_0.effectiveAt) === 'bigint' && command_0.effectiveAt >= 0n && command_0.effectiveAt <= 18446744073709551615n && command_0.commandNonce.buffer instanceof ArrayBuffer && command_0.commandNonce.BYTES_PER_ELEMENT === 1 && command_0.commandNonce.length === 32)) {
      __compactRuntime.typeError('runtimeCredentialStatusCommandMessage',
                                 'argument 1',
                                 'permio-authorization.compact line 547 char 1',
                                 'struct RuntimeCredentialStatusCommand<commandVersion: Uint<0..65536>, namespaceHash: Bytes<32>, governancePolicyHash: Bytes<32>, authorityRootVersion: Uint<0..18446744073709551616>, authorityRootSequence: Uint<0..18446744073709551616>, credentialStatusRootSequence: Uint<0..18446744073709551616>, credentialKind: Uint<0..65536>, credentialCommitment: Bytes<32>, subjectAccountCredentialCommitment: Bytes<32>, revocationAuthorityAccountCredentialCommitment: Bytes<32>, statusIndex: Uint<0..18446744073709551616>, expectedStatus: Uint<0..256>, nextStatus: Uint<0..256>, effectiveAt: Uint<0..18446744073709551616>, commandNonce: Bytes<32>>',
                                 command_0)
    }
    return _dummyContract._runtimeCredentialStatusCommandMessage_0(command_0);
  },
  runtimeCapabilityCredentialCommitment: (...args_0) => {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`runtimeCapabilityCredentialCommitment: expected 1 argument (as invoked from Typescript), received ${args_0.length}`);
    }
    const credential_0 = args_0[0];
    if (!(typeof(credential_0) === 'object' && typeof(credential_0.credentialVersion) === 'bigint' && credential_0.credentialVersion >= 0n && credential_0.credentialVersion <= 65535n && typeof(credential_0.target) === 'object' && credential_0.target.namespaceHash.buffer instanceof ArrayBuffer && credential_0.target.namespaceHash.BYTES_PER_ELEMENT === 1 && credential_0.target.namespaceHash.length === 32 && credential_0.target.templateIdHash.buffer instanceof ArrayBuffer && credential_0.target.templateIdHash.BYTES_PER_ELEMENT === 1 && credential_0.target.templateIdHash.length === 32 && typeof(credential_0.target.semanticVersion) === 'object' && typeof(credential_0.target.semanticVersion.major) === 'bigint' && credential_0.target.semanticVersion.major >= 0n && credential_0.target.semanticVersion.major <= 18446744073709551615n && typeof(credential_0.target.semanticVersion.minor) === 'bigint' && credential_0.target.semanticVersion.minor >= 0n && credential_0.target.semanticVersion.minor <= 18446744073709551615n && typeof(credential_0.target.semanticVersion.patch) === 'bigint' && credential_0.target.semanticVersion.patch >= 0n && credential_0.target.semanticVersion.patch <= 18446744073709551615n && credential_0.target.templateContentHash.buffer instanceof ArrayBuffer && credential_0.target.templateContentHash.BYTES_PER_ELEMENT === 1 && credential_0.target.templateContentHash.length === 32 && credential_0.instanceCommitment.buffer instanceof ArrayBuffer && credential_0.instanceCommitment.BYTES_PER_ELEMENT === 1 && credential_0.instanceCommitment.length === 32 && credential_0.contextHash.buffer instanceof ArrayBuffer && credential_0.contextHash.BYTES_PER_ELEMENT === 1 && credential_0.contextHash.length === 32 && credential_0.grantIdHash.buffer instanceof ArrayBuffer && credential_0.grantIdHash.BYTES_PER_ELEMENT === 1 && credential_0.grantIdHash.length === 32 && credential_0.m5GrantCommitment.buffer instanceof ArrayBuffer && credential_0.m5GrantCommitment.BYTES_PER_ELEMENT === 1 && credential_0.m5GrantCommitment.length === 32 && credential_0.subjectAccountCredentialCommitment.buffer instanceof ArrayBuffer && credential_0.subjectAccountCredentialCommitment.BYTES_PER_ELEMENT === 1 && credential_0.subjectAccountCredentialCommitment.length === 32 && credential_0.parentCapabilityCredentialCommitment.buffer instanceof ArrayBuffer && credential_0.parentCapabilityCredentialCommitment.BYTES_PER_ELEMENT === 1 && credential_0.parentCapabilityCredentialCommitment.length === 32 && credential_0.issuerAccountCredentialCommitment.buffer instanceof ArrayBuffer && credential_0.issuerAccountCredentialCommitment.BYTES_PER_ELEMENT === 1 && credential_0.issuerAccountCredentialCommitment.length === 32 && typeof(credential_0.scopeRoots) === 'object' && typeof(credential_0.scopeRoots.actionsRoot) === 'object' && typeof(credential_0.scopeRoots.actionsRoot.field) === 'bigint' && credential_0.scopeRoots.actionsRoot.field >= 0 && credential_0.scopeRoots.actionsRoot.field <= __compactRuntime.MAX_FIELD && typeof(credential_0.scopeRoots.resourceSelectorsRoot) === 'object' && typeof(credential_0.scopeRoots.resourceSelectorsRoot.field) === 'bigint' && credential_0.scopeRoots.resourceSelectorsRoot.field >= 0 && credential_0.scopeRoots.resourceSelectorsRoot.field <= __compactRuntime.MAX_FIELD && typeof(credential_0.scopeRoots.resourcesRoot) === 'object' && typeof(credential_0.scopeRoots.resourcesRoot.field) === 'bigint' && credential_0.scopeRoots.resourcesRoot.field >= 0 && credential_0.scopeRoots.resourcesRoot.field <= __compactRuntime.MAX_FIELD && typeof(credential_0.scopeRoots.purposesRoot) === 'object' && typeof(credential_0.scopeRoots.purposesRoot.field) === 'bigint' && credential_0.scopeRoots.purposesRoot.field >= 0 && credential_0.scopeRoots.purposesRoot.field <= __compactRuntime.MAX_FIELD && typeof(credential_0.scopeRoots.recipientKindsRoot) === 'object' && typeof(credential_0.scopeRoots.recipientKindsRoot.field) === 'bigint' && credential_0.scopeRoots.recipientKindsRoot.field >= 0 && credential_0.scopeRoots.recipientKindsRoot.field <= __compactRuntime.MAX_FIELD && typeof(credential_0.scopeRoots.recipientsRoot) === 'object' && typeof(credential_0.scopeRoots.recipientsRoot.field) === 'bigint' && credential_0.scopeRoots.recipientsRoot.field >= 0 && credential_0.scopeRoots.recipientsRoot.field <= __compactRuntime.MAX_FIELD && typeof(credential_0.scopeRoots.disclosurePolicyIdsRoot) === 'object' && typeof(credential_0.scopeRoots.disclosurePolicyIdsRoot.field) === 'bigint' && credential_0.scopeRoots.disclosurePolicyIdsRoot.field >= 0 && credential_0.scopeRoots.disclosurePolicyIdsRoot.field <= __compactRuntime.MAX_FIELD && typeof(credential_0.notBefore) === 'bigint' && credential_0.notBefore >= 0n && credential_0.notBefore <= 18446744073709551615n && typeof(credential_0.expiresAt) === 'bigint' && credential_0.expiresAt >= 0n && credential_0.expiresAt <= 18446744073709551615n && typeof(credential_0.delegationDepth) === 'bigint' && credential_0.delegationDepth >= 0n && credential_0.delegationDepth <= 65535n && typeof(credential_0.maxDelegationDepth) === 'bigint' && credential_0.maxDelegationDepth >= 0n && credential_0.maxDelegationDepth <= 65535n && typeof(credential_0.statusIndex) === 'bigint' && credential_0.statusIndex >= 0n && credential_0.statusIndex <= 18446744073709551615n && typeof(credential_0.issuedAt) === 'bigint' && credential_0.issuedAt >= 0n && credential_0.issuedAt <= 18446744073709551615n)) {
      __compactRuntime.typeError('runtimeCapabilityCredentialCommitment',
                                 'argument 1',
                                 'permio-authorization.compact line 553 char 1',
                                 'struct RuntimeCapabilityCredential<credentialVersion: Uint<0..65536>, target: struct TemplateRegistryTarget<namespaceHash: Bytes<32>, templateIdHash: Bytes<32>, semanticVersion: struct SemanticVersion<major: Uint<0..18446744073709551616>, minor: Uint<0..18446744073709551616>, patch: Uint<0..18446744073709551616>>, templateContentHash: Bytes<32>>, instanceCommitment: Bytes<32>, contextHash: Bytes<32>, grantIdHash: Bytes<32>, m5GrantCommitment: Bytes<32>, subjectAccountCredentialCommitment: Bytes<32>, parentCapabilityCredentialCommitment: Bytes<32>, issuerAccountCredentialCommitment: Bytes<32>, scopeRoots: struct RuntimeScopeRoots<actionsRoot: struct MerkleTreeDigest<field: Field>, resourceSelectorsRoot: struct MerkleTreeDigest<field: Field>, resourcesRoot: struct MerkleTreeDigest<field: Field>, purposesRoot: struct MerkleTreeDigest<field: Field>, recipientKindsRoot: struct MerkleTreeDigest<field: Field>, recipientsRoot: struct MerkleTreeDigest<field: Field>, disclosurePolicyIdsRoot: struct MerkleTreeDigest<field: Field>>, notBefore: Uint<0..18446744073709551616>, expiresAt: Uint<0..18446744073709551616>, delegationDepth: Uint<0..65536>, maxDelegationDepth: Uint<0..65536>, statusIndex: Uint<0..18446744073709551616>, issuedAt: Uint<0..18446744073709551616>>',
                                 credential_0)
    }
    return _dummyContract._runtimeCapabilityCredentialCommitment_0(credential_0);
  },
  runtimeSessionCredentialCommitment: (...args_0) => {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`runtimeSessionCredentialCommitment: expected 1 argument (as invoked from Typescript), received ${args_0.length}`);
    }
    const credential_0 = args_0[0];
    if (!(typeof(credential_0) === 'object' && typeof(credential_0.credentialVersion) === 'bigint' && credential_0.credentialVersion >= 0n && credential_0.credentialVersion <= 65535n && typeof(credential_0.target) === 'object' && credential_0.target.namespaceHash.buffer instanceof ArrayBuffer && credential_0.target.namespaceHash.BYTES_PER_ELEMENT === 1 && credential_0.target.namespaceHash.length === 32 && credential_0.target.templateIdHash.buffer instanceof ArrayBuffer && credential_0.target.templateIdHash.BYTES_PER_ELEMENT === 1 && credential_0.target.templateIdHash.length === 32 && typeof(credential_0.target.semanticVersion) === 'object' && typeof(credential_0.target.semanticVersion.major) === 'bigint' && credential_0.target.semanticVersion.major >= 0n && credential_0.target.semanticVersion.major <= 18446744073709551615n && typeof(credential_0.target.semanticVersion.minor) === 'bigint' && credential_0.target.semanticVersion.minor >= 0n && credential_0.target.semanticVersion.minor <= 18446744073709551615n && typeof(credential_0.target.semanticVersion.patch) === 'bigint' && credential_0.target.semanticVersion.patch >= 0n && credential_0.target.semanticVersion.patch <= 18446744073709551615n && credential_0.target.templateContentHash.buffer instanceof ArrayBuffer && credential_0.target.templateContentHash.BYTES_PER_ELEMENT === 1 && credential_0.target.templateContentHash.length === 32 && credential_0.instanceCommitment.buffer instanceof ArrayBuffer && credential_0.instanceCommitment.BYTES_PER_ELEMENT === 1 && credential_0.instanceCommitment.length === 32 && credential_0.contextHash.buffer instanceof ArrayBuffer && credential_0.contextHash.BYTES_PER_ELEMENT === 1 && credential_0.contextHash.length === 32 && credential_0.sessionIdHash.buffer instanceof ArrayBuffer && credential_0.sessionIdHash.BYTES_PER_ELEMENT === 1 && credential_0.sessionIdHash.length === 32 && credential_0.m5SessionCommitment.buffer instanceof ArrayBuffer && credential_0.m5SessionCommitment.BYTES_PER_ELEMENT === 1 && credential_0.m5SessionCommitment.length === 32 && credential_0.subjectAccountCredentialCommitment.buffer instanceof ArrayBuffer && credential_0.subjectAccountCredentialCommitment.BYTES_PER_ELEMENT === 1 && credential_0.subjectAccountCredentialCommitment.length === 32 && credential_0.capabilityCredentialCommitment.buffer instanceof ArrayBuffer && credential_0.capabilityCredentialCommitment.BYTES_PER_ELEMENT === 1 && credential_0.capabilityCredentialCommitment.length === 32 && typeof(credential_0.scopeRoots) === 'object' && typeof(credential_0.scopeRoots.actionsRoot) === 'object' && typeof(credential_0.scopeRoots.actionsRoot.field) === 'bigint' && credential_0.scopeRoots.actionsRoot.field >= 0 && credential_0.scopeRoots.actionsRoot.field <= __compactRuntime.MAX_FIELD && typeof(credential_0.scopeRoots.resourceSelectorsRoot) === 'object' && typeof(credential_0.scopeRoots.resourceSelectorsRoot.field) === 'bigint' && credential_0.scopeRoots.resourceSelectorsRoot.field >= 0 && credential_0.scopeRoots.resourceSelectorsRoot.field <= __compactRuntime.MAX_FIELD && typeof(credential_0.scopeRoots.resourcesRoot) === 'object' && typeof(credential_0.scopeRoots.resourcesRoot.field) === 'bigint' && credential_0.scopeRoots.resourcesRoot.field >= 0 && credential_0.scopeRoots.resourcesRoot.field <= __compactRuntime.MAX_FIELD && typeof(credential_0.scopeRoots.purposesRoot) === 'object' && typeof(credential_0.scopeRoots.purposesRoot.field) === 'bigint' && credential_0.scopeRoots.purposesRoot.field >= 0 && credential_0.scopeRoots.purposesRoot.field <= __compactRuntime.MAX_FIELD && typeof(credential_0.scopeRoots.recipientKindsRoot) === 'object' && typeof(credential_0.scopeRoots.recipientKindsRoot.field) === 'bigint' && credential_0.scopeRoots.recipientKindsRoot.field >= 0 && credential_0.scopeRoots.recipientKindsRoot.field <= __compactRuntime.MAX_FIELD && typeof(credential_0.scopeRoots.recipientsRoot) === 'object' && typeof(credential_0.scopeRoots.recipientsRoot.field) === 'bigint' && credential_0.scopeRoots.recipientsRoot.field >= 0 && credential_0.scopeRoots.recipientsRoot.field <= __compactRuntime.MAX_FIELD && typeof(credential_0.scopeRoots.disclosurePolicyIdsRoot) === 'object' && typeof(credential_0.scopeRoots.disclosurePolicyIdsRoot.field) === 'bigint' && credential_0.scopeRoots.disclosurePolicyIdsRoot.field >= 0 && credential_0.scopeRoots.disclosurePolicyIdsRoot.field <= __compactRuntime.MAX_FIELD && true && typeof(credential_0.notBefore) === 'bigint' && credential_0.notBefore >= 0n && credential_0.notBefore <= 18446744073709551615n && typeof(credential_0.expiresAt) === 'bigint' && credential_0.expiresAt >= 0n && credential_0.expiresAt <= 18446744073709551615n && typeof(credential_0.statusIndex) === 'bigint' && credential_0.statusIndex >= 0n && credential_0.statusIndex <= 18446744073709551615n && typeof(credential_0.issuedAt) === 'bigint' && credential_0.issuedAt >= 0n && credential_0.issuedAt <= 18446744073709551615n)) {
      __compactRuntime.typeError('runtimeSessionCredentialCommitment',
                                 'argument 1',
                                 'permio-authorization.compact line 559 char 1',
                                 'struct RuntimeSessionCredential<credentialVersion: Uint<0..65536>, target: struct TemplateRegistryTarget<namespaceHash: Bytes<32>, templateIdHash: Bytes<32>, semanticVersion: struct SemanticVersion<major: Uint<0..18446744073709551616>, minor: Uint<0..18446744073709551616>, patch: Uint<0..18446744073709551616>>, templateContentHash: Bytes<32>>, instanceCommitment: Bytes<32>, contextHash: Bytes<32>, sessionIdHash: Bytes<32>, m5SessionCommitment: Bytes<32>, subjectAccountCredentialCommitment: Bytes<32>, capabilityCredentialCommitment: Bytes<32>, scopeRoots: struct RuntimeScopeRoots<actionsRoot: struct MerkleTreeDigest<field: Field>, resourceSelectorsRoot: struct MerkleTreeDigest<field: Field>, resourcesRoot: struct MerkleTreeDigest<field: Field>, purposesRoot: struct MerkleTreeDigest<field: Field>, recipientKindsRoot: struct MerkleTreeDigest<field: Field>, recipientsRoot: struct MerkleTreeDigest<field: Field>, disclosurePolicyIdsRoot: struct MerkleTreeDigest<field: Field>>, runtimePublicKey: Opaque<"JubjubPoint">, notBefore: Uint<0..18446744073709551616>, expiresAt: Uint<0..18446744073709551616>, statusIndex: Uint<0..18446744073709551616>, issuedAt: Uint<0..18446744073709551616>>',
                                 credential_0)
    }
    return _dummyContract._runtimeSessionCredentialCommitment_0(credential_0);
  },
  runtimeActionIntentCommitment: (...args_0) => {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`runtimeActionIntentCommitment: expected 1 argument (as invoked from Typescript), received ${args_0.length}`);
    }
    const intent_0 = args_0[0];
    if (!(typeof(intent_0) === 'object' && typeof(intent_0.intentVersion) === 'bigint' && intent_0.intentVersion >= 0n && intent_0.intentVersion <= 65535n && typeof(intent_0.target) === 'object' && intent_0.target.namespaceHash.buffer instanceof ArrayBuffer && intent_0.target.namespaceHash.BYTES_PER_ELEMENT === 1 && intent_0.target.namespaceHash.length === 32 && intent_0.target.templateIdHash.buffer instanceof ArrayBuffer && intent_0.target.templateIdHash.BYTES_PER_ELEMENT === 1 && intent_0.target.templateIdHash.length === 32 && typeof(intent_0.target.semanticVersion) === 'object' && typeof(intent_0.target.semanticVersion.major) === 'bigint' && intent_0.target.semanticVersion.major >= 0n && intent_0.target.semanticVersion.major <= 18446744073709551615n && typeof(intent_0.target.semanticVersion.minor) === 'bigint' && intent_0.target.semanticVersion.minor >= 0n && intent_0.target.semanticVersion.minor <= 18446744073709551615n && typeof(intent_0.target.semanticVersion.patch) === 'bigint' && intent_0.target.semanticVersion.patch >= 0n && intent_0.target.semanticVersion.patch <= 18446744073709551615n && intent_0.target.templateContentHash.buffer instanceof ArrayBuffer && intent_0.target.templateContentHash.BYTES_PER_ELEMENT === 1 && intent_0.target.templateContentHash.length === 32 && intent_0.instanceCommitment.buffer instanceof ArrayBuffer && intent_0.instanceCommitment.BYTES_PER_ELEMENT === 1 && intent_0.instanceCommitment.length === 32 && intent_0.contextHash.buffer instanceof ArrayBuffer && intent_0.contextHash.BYTES_PER_ELEMENT === 1 && intent_0.contextHash.length === 32 && intent_0.sessionCredentialCommitment.buffer instanceof ArrayBuffer && intent_0.sessionCredentialCommitment.BYTES_PER_ELEMENT === 1 && intent_0.sessionCredentialCommitment.length === 32 && intent_0.actionIdHash.buffer instanceof ArrayBuffer && intent_0.actionIdHash.BYTES_PER_ELEMENT === 1 && intent_0.actionIdHash.length === 32 && intent_0.resourceSelectorHash.buffer instanceof ArrayBuffer && intent_0.resourceSelectorHash.BYTES_PER_ELEMENT === 1 && intent_0.resourceSelectorHash.length === 32 && intent_0.resourceHash.buffer instanceof ArrayBuffer && intent_0.resourceHash.BYTES_PER_ELEMENT === 1 && intent_0.resourceHash.length === 32 && intent_0.purposeHash.buffer instanceof ArrayBuffer && intent_0.purposeHash.BYTES_PER_ELEMENT === 1 && intent_0.purposeHash.length === 32 && intent_0.recipientKindHash.buffer instanceof ArrayBuffer && intent_0.recipientKindHash.BYTES_PER_ELEMENT === 1 && intent_0.recipientKindHash.length === 32 && intent_0.recipientHash.buffer instanceof ArrayBuffer && intent_0.recipientHash.BYTES_PER_ELEMENT === 1 && intent_0.recipientHash.length === 32 && intent_0.disclosurePolicyIdHash.buffer instanceof ArrayBuffer && intent_0.disclosurePolicyIdHash.BYTES_PER_ELEMENT === 1 && intent_0.disclosurePolicyIdHash.length === 32 && intent_0.m5IntentCommitment.buffer instanceof ArrayBuffer && intent_0.m5IntentCommitment.BYTES_PER_ELEMENT === 1 && intent_0.m5IntentCommitment.length === 32 && typeof(intent_0.issuedAt) === 'bigint' && intent_0.issuedAt >= 0n && intent_0.issuedAt <= 18446744073709551615n && intent_0.nonceHash.buffer instanceof ArrayBuffer && intent_0.nonceHash.BYTES_PER_ELEMENT === 1 && intent_0.nonceHash.length === 32)) {
      __compactRuntime.typeError('runtimeActionIntentCommitment',
                                 'argument 1',
                                 'permio-authorization.compact line 565 char 1',
                                 'struct RuntimeActionIntent<intentVersion: Uint<0..65536>, target: struct TemplateRegistryTarget<namespaceHash: Bytes<32>, templateIdHash: Bytes<32>, semanticVersion: struct SemanticVersion<major: Uint<0..18446744073709551616>, minor: Uint<0..18446744073709551616>, patch: Uint<0..18446744073709551616>>, templateContentHash: Bytes<32>>, instanceCommitment: Bytes<32>, contextHash: Bytes<32>, sessionCredentialCommitment: Bytes<32>, actionIdHash: Bytes<32>, resourceSelectorHash: Bytes<32>, resourceHash: Bytes<32>, purposeHash: Bytes<32>, recipientKindHash: Bytes<32>, recipientHash: Bytes<32>, disclosurePolicyIdHash: Bytes<32>, m5IntentCommitment: Bytes<32>, issuedAt: Uint<0..18446744073709551616>, nonceHash: Bytes<32>>',
                                 intent_0)
    }
    return _dummyContract._runtimeActionIntentCommitment_0(intent_0);
  },
  runtimeAccountCredentialMessage: (...args_0) => {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`runtimeAccountCredentialMessage: expected 1 argument (as invoked from Typescript), received ${args_0.length}`);
    }
    const credential_0 = args_0[0];
    if (!(typeof(credential_0) === 'object' && typeof(credential_0.credentialVersion) === 'bigint' && credential_0.credentialVersion >= 0n && credential_0.credentialVersion <= 65535n && typeof(credential_0.target) === 'object' && credential_0.target.namespaceHash.buffer instanceof ArrayBuffer && credential_0.target.namespaceHash.BYTES_PER_ELEMENT === 1 && credential_0.target.namespaceHash.length === 32 && credential_0.target.templateIdHash.buffer instanceof ArrayBuffer && credential_0.target.templateIdHash.BYTES_PER_ELEMENT === 1 && credential_0.target.templateIdHash.length === 32 && typeof(credential_0.target.semanticVersion) === 'object' && typeof(credential_0.target.semanticVersion.major) === 'bigint' && credential_0.target.semanticVersion.major >= 0n && credential_0.target.semanticVersion.major <= 18446744073709551615n && typeof(credential_0.target.semanticVersion.minor) === 'bigint' && credential_0.target.semanticVersion.minor >= 0n && credential_0.target.semanticVersion.minor <= 18446744073709551615n && typeof(credential_0.target.semanticVersion.patch) === 'bigint' && credential_0.target.semanticVersion.patch >= 0n && credential_0.target.semanticVersion.patch <= 18446744073709551615n && credential_0.target.templateContentHash.buffer instanceof ArrayBuffer && credential_0.target.templateContentHash.BYTES_PER_ELEMENT === 1 && credential_0.target.templateContentHash.length === 32 && credential_0.instanceCommitment.buffer instanceof ArrayBuffer && credential_0.instanceCommitment.BYTES_PER_ELEMENT === 1 && credential_0.instanceCommitment.length === 32 && credential_0.contextHash.buffer instanceof ArrayBuffer && credential_0.contextHash.BYTES_PER_ELEMENT === 1 && credential_0.contextHash.length === 32 && credential_0.accountIdHash.buffer instanceof ArrayBuffer && credential_0.accountIdHash.BYTES_PER_ELEMENT === 1 && credential_0.accountIdHash.length === 32 && typeof(credential_0.principalKind) === 'bigint' && credential_0.principalKind >= 0n && credential_0.principalKind <= 65535n && credential_0.m5AccountCommitment.buffer instanceof ArrayBuffer && credential_0.m5AccountCommitment.BYTES_PER_ELEMENT === 1 && credential_0.m5AccountCommitment.length === 32 && true && typeof(credential_0.statusIndex) === 'bigint' && credential_0.statusIndex >= 0n && credential_0.statusIndex <= 18446744073709551615n && typeof(credential_0.issuedAt) === 'bigint' && credential_0.issuedAt >= 0n && credential_0.issuedAt <= 18446744073709551615n && typeof(credential_0.validBefore) === 'bigint' && credential_0.validBefore >= 0n && credential_0.validBefore <= 18446744073709551615n)) {
      __compactRuntime.typeError('runtimeAccountCredentialMessage',
                                 'argument 1',
                                 'permio-authorization.compact line 571 char 1',
                                 'struct RuntimeAccountCredential<credentialVersion: Uint<0..65536>, target: struct TemplateRegistryTarget<namespaceHash: Bytes<32>, templateIdHash: Bytes<32>, semanticVersion: struct SemanticVersion<major: Uint<0..18446744073709551616>, minor: Uint<0..18446744073709551616>, patch: Uint<0..18446744073709551616>>, templateContentHash: Bytes<32>>, instanceCommitment: Bytes<32>, contextHash: Bytes<32>, accountIdHash: Bytes<32>, principalKind: Uint<0..65536>, m5AccountCommitment: Bytes<32>, runtimePublicKey: Opaque<"JubjubPoint">, statusIndex: Uint<0..18446744073709551616>, issuedAt: Uint<0..18446744073709551616>, validBefore: Uint<0..18446744073709551616>>',
                                 credential_0)
    }
    return _dummyContract._runtimeAccountCredentialMessage_0(credential_0);
  },
  runtimeCapabilityCredentialMessage: (...args_0) => {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`runtimeCapabilityCredentialMessage: expected 1 argument (as invoked from Typescript), received ${args_0.length}`);
    }
    const credential_0 = args_0[0];
    if (!(typeof(credential_0) === 'object' && typeof(credential_0.credentialVersion) === 'bigint' && credential_0.credentialVersion >= 0n && credential_0.credentialVersion <= 65535n && typeof(credential_0.target) === 'object' && credential_0.target.namespaceHash.buffer instanceof ArrayBuffer && credential_0.target.namespaceHash.BYTES_PER_ELEMENT === 1 && credential_0.target.namespaceHash.length === 32 && credential_0.target.templateIdHash.buffer instanceof ArrayBuffer && credential_0.target.templateIdHash.BYTES_PER_ELEMENT === 1 && credential_0.target.templateIdHash.length === 32 && typeof(credential_0.target.semanticVersion) === 'object' && typeof(credential_0.target.semanticVersion.major) === 'bigint' && credential_0.target.semanticVersion.major >= 0n && credential_0.target.semanticVersion.major <= 18446744073709551615n && typeof(credential_0.target.semanticVersion.minor) === 'bigint' && credential_0.target.semanticVersion.minor >= 0n && credential_0.target.semanticVersion.minor <= 18446744073709551615n && typeof(credential_0.target.semanticVersion.patch) === 'bigint' && credential_0.target.semanticVersion.patch >= 0n && credential_0.target.semanticVersion.patch <= 18446744073709551615n && credential_0.target.templateContentHash.buffer instanceof ArrayBuffer && credential_0.target.templateContentHash.BYTES_PER_ELEMENT === 1 && credential_0.target.templateContentHash.length === 32 && credential_0.instanceCommitment.buffer instanceof ArrayBuffer && credential_0.instanceCommitment.BYTES_PER_ELEMENT === 1 && credential_0.instanceCommitment.length === 32 && credential_0.contextHash.buffer instanceof ArrayBuffer && credential_0.contextHash.BYTES_PER_ELEMENT === 1 && credential_0.contextHash.length === 32 && credential_0.grantIdHash.buffer instanceof ArrayBuffer && credential_0.grantIdHash.BYTES_PER_ELEMENT === 1 && credential_0.grantIdHash.length === 32 && credential_0.m5GrantCommitment.buffer instanceof ArrayBuffer && credential_0.m5GrantCommitment.BYTES_PER_ELEMENT === 1 && credential_0.m5GrantCommitment.length === 32 && credential_0.subjectAccountCredentialCommitment.buffer instanceof ArrayBuffer && credential_0.subjectAccountCredentialCommitment.BYTES_PER_ELEMENT === 1 && credential_0.subjectAccountCredentialCommitment.length === 32 && credential_0.parentCapabilityCredentialCommitment.buffer instanceof ArrayBuffer && credential_0.parentCapabilityCredentialCommitment.BYTES_PER_ELEMENT === 1 && credential_0.parentCapabilityCredentialCommitment.length === 32 && credential_0.issuerAccountCredentialCommitment.buffer instanceof ArrayBuffer && credential_0.issuerAccountCredentialCommitment.BYTES_PER_ELEMENT === 1 && credential_0.issuerAccountCredentialCommitment.length === 32 && typeof(credential_0.scopeRoots) === 'object' && typeof(credential_0.scopeRoots.actionsRoot) === 'object' && typeof(credential_0.scopeRoots.actionsRoot.field) === 'bigint' && credential_0.scopeRoots.actionsRoot.field >= 0 && credential_0.scopeRoots.actionsRoot.field <= __compactRuntime.MAX_FIELD && typeof(credential_0.scopeRoots.resourceSelectorsRoot) === 'object' && typeof(credential_0.scopeRoots.resourceSelectorsRoot.field) === 'bigint' && credential_0.scopeRoots.resourceSelectorsRoot.field >= 0 && credential_0.scopeRoots.resourceSelectorsRoot.field <= __compactRuntime.MAX_FIELD && typeof(credential_0.scopeRoots.resourcesRoot) === 'object' && typeof(credential_0.scopeRoots.resourcesRoot.field) === 'bigint' && credential_0.scopeRoots.resourcesRoot.field >= 0 && credential_0.scopeRoots.resourcesRoot.field <= __compactRuntime.MAX_FIELD && typeof(credential_0.scopeRoots.purposesRoot) === 'object' && typeof(credential_0.scopeRoots.purposesRoot.field) === 'bigint' && credential_0.scopeRoots.purposesRoot.field >= 0 && credential_0.scopeRoots.purposesRoot.field <= __compactRuntime.MAX_FIELD && typeof(credential_0.scopeRoots.recipientKindsRoot) === 'object' && typeof(credential_0.scopeRoots.recipientKindsRoot.field) === 'bigint' && credential_0.scopeRoots.recipientKindsRoot.field >= 0 && credential_0.scopeRoots.recipientKindsRoot.field <= __compactRuntime.MAX_FIELD && typeof(credential_0.scopeRoots.recipientsRoot) === 'object' && typeof(credential_0.scopeRoots.recipientsRoot.field) === 'bigint' && credential_0.scopeRoots.recipientsRoot.field >= 0 && credential_0.scopeRoots.recipientsRoot.field <= __compactRuntime.MAX_FIELD && typeof(credential_0.scopeRoots.disclosurePolicyIdsRoot) === 'object' && typeof(credential_0.scopeRoots.disclosurePolicyIdsRoot.field) === 'bigint' && credential_0.scopeRoots.disclosurePolicyIdsRoot.field >= 0 && credential_0.scopeRoots.disclosurePolicyIdsRoot.field <= __compactRuntime.MAX_FIELD && typeof(credential_0.notBefore) === 'bigint' && credential_0.notBefore >= 0n && credential_0.notBefore <= 18446744073709551615n && typeof(credential_0.expiresAt) === 'bigint' && credential_0.expiresAt >= 0n && credential_0.expiresAt <= 18446744073709551615n && typeof(credential_0.delegationDepth) === 'bigint' && credential_0.delegationDepth >= 0n && credential_0.delegationDepth <= 65535n && typeof(credential_0.maxDelegationDepth) === 'bigint' && credential_0.maxDelegationDepth >= 0n && credential_0.maxDelegationDepth <= 65535n && typeof(credential_0.statusIndex) === 'bigint' && credential_0.statusIndex >= 0n && credential_0.statusIndex <= 18446744073709551615n && typeof(credential_0.issuedAt) === 'bigint' && credential_0.issuedAt >= 0n && credential_0.issuedAt <= 18446744073709551615n)) {
      __compactRuntime.typeError('runtimeCapabilityCredentialMessage',
                                 'argument 1',
                                 'permio-authorization.compact line 577 char 1',
                                 'struct RuntimeCapabilityCredential<credentialVersion: Uint<0..65536>, target: struct TemplateRegistryTarget<namespaceHash: Bytes<32>, templateIdHash: Bytes<32>, semanticVersion: struct SemanticVersion<major: Uint<0..18446744073709551616>, minor: Uint<0..18446744073709551616>, patch: Uint<0..18446744073709551616>>, templateContentHash: Bytes<32>>, instanceCommitment: Bytes<32>, contextHash: Bytes<32>, grantIdHash: Bytes<32>, m5GrantCommitment: Bytes<32>, subjectAccountCredentialCommitment: Bytes<32>, parentCapabilityCredentialCommitment: Bytes<32>, issuerAccountCredentialCommitment: Bytes<32>, scopeRoots: struct RuntimeScopeRoots<actionsRoot: struct MerkleTreeDigest<field: Field>, resourceSelectorsRoot: struct MerkleTreeDigest<field: Field>, resourcesRoot: struct MerkleTreeDigest<field: Field>, purposesRoot: struct MerkleTreeDigest<field: Field>, recipientKindsRoot: struct MerkleTreeDigest<field: Field>, recipientsRoot: struct MerkleTreeDigest<field: Field>, disclosurePolicyIdsRoot: struct MerkleTreeDigest<field: Field>>, notBefore: Uint<0..18446744073709551616>, expiresAt: Uint<0..18446744073709551616>, delegationDepth: Uint<0..65536>, maxDelegationDepth: Uint<0..65536>, statusIndex: Uint<0..18446744073709551616>, issuedAt: Uint<0..18446744073709551616>>',
                                 credential_0)
    }
    return _dummyContract._runtimeCapabilityCredentialMessage_0(credential_0);
  },
  runtimeSessionCredentialMessage: (...args_0) => {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`runtimeSessionCredentialMessage: expected 1 argument (as invoked from Typescript), received ${args_0.length}`);
    }
    const credential_0 = args_0[0];
    if (!(typeof(credential_0) === 'object' && typeof(credential_0.credentialVersion) === 'bigint' && credential_0.credentialVersion >= 0n && credential_0.credentialVersion <= 65535n && typeof(credential_0.target) === 'object' && credential_0.target.namespaceHash.buffer instanceof ArrayBuffer && credential_0.target.namespaceHash.BYTES_PER_ELEMENT === 1 && credential_0.target.namespaceHash.length === 32 && credential_0.target.templateIdHash.buffer instanceof ArrayBuffer && credential_0.target.templateIdHash.BYTES_PER_ELEMENT === 1 && credential_0.target.templateIdHash.length === 32 && typeof(credential_0.target.semanticVersion) === 'object' && typeof(credential_0.target.semanticVersion.major) === 'bigint' && credential_0.target.semanticVersion.major >= 0n && credential_0.target.semanticVersion.major <= 18446744073709551615n && typeof(credential_0.target.semanticVersion.minor) === 'bigint' && credential_0.target.semanticVersion.minor >= 0n && credential_0.target.semanticVersion.minor <= 18446744073709551615n && typeof(credential_0.target.semanticVersion.patch) === 'bigint' && credential_0.target.semanticVersion.patch >= 0n && credential_0.target.semanticVersion.patch <= 18446744073709551615n && credential_0.target.templateContentHash.buffer instanceof ArrayBuffer && credential_0.target.templateContentHash.BYTES_PER_ELEMENT === 1 && credential_0.target.templateContentHash.length === 32 && credential_0.instanceCommitment.buffer instanceof ArrayBuffer && credential_0.instanceCommitment.BYTES_PER_ELEMENT === 1 && credential_0.instanceCommitment.length === 32 && credential_0.contextHash.buffer instanceof ArrayBuffer && credential_0.contextHash.BYTES_PER_ELEMENT === 1 && credential_0.contextHash.length === 32 && credential_0.sessionIdHash.buffer instanceof ArrayBuffer && credential_0.sessionIdHash.BYTES_PER_ELEMENT === 1 && credential_0.sessionIdHash.length === 32 && credential_0.m5SessionCommitment.buffer instanceof ArrayBuffer && credential_0.m5SessionCommitment.BYTES_PER_ELEMENT === 1 && credential_0.m5SessionCommitment.length === 32 && credential_0.subjectAccountCredentialCommitment.buffer instanceof ArrayBuffer && credential_0.subjectAccountCredentialCommitment.BYTES_PER_ELEMENT === 1 && credential_0.subjectAccountCredentialCommitment.length === 32 && credential_0.capabilityCredentialCommitment.buffer instanceof ArrayBuffer && credential_0.capabilityCredentialCommitment.BYTES_PER_ELEMENT === 1 && credential_0.capabilityCredentialCommitment.length === 32 && typeof(credential_0.scopeRoots) === 'object' && typeof(credential_0.scopeRoots.actionsRoot) === 'object' && typeof(credential_0.scopeRoots.actionsRoot.field) === 'bigint' && credential_0.scopeRoots.actionsRoot.field >= 0 && credential_0.scopeRoots.actionsRoot.field <= __compactRuntime.MAX_FIELD && typeof(credential_0.scopeRoots.resourceSelectorsRoot) === 'object' && typeof(credential_0.scopeRoots.resourceSelectorsRoot.field) === 'bigint' && credential_0.scopeRoots.resourceSelectorsRoot.field >= 0 && credential_0.scopeRoots.resourceSelectorsRoot.field <= __compactRuntime.MAX_FIELD && typeof(credential_0.scopeRoots.resourcesRoot) === 'object' && typeof(credential_0.scopeRoots.resourcesRoot.field) === 'bigint' && credential_0.scopeRoots.resourcesRoot.field >= 0 && credential_0.scopeRoots.resourcesRoot.field <= __compactRuntime.MAX_FIELD && typeof(credential_0.scopeRoots.purposesRoot) === 'object' && typeof(credential_0.scopeRoots.purposesRoot.field) === 'bigint' && credential_0.scopeRoots.purposesRoot.field >= 0 && credential_0.scopeRoots.purposesRoot.field <= __compactRuntime.MAX_FIELD && typeof(credential_0.scopeRoots.recipientKindsRoot) === 'object' && typeof(credential_0.scopeRoots.recipientKindsRoot.field) === 'bigint' && credential_0.scopeRoots.recipientKindsRoot.field >= 0 && credential_0.scopeRoots.recipientKindsRoot.field <= __compactRuntime.MAX_FIELD && typeof(credential_0.scopeRoots.recipientsRoot) === 'object' && typeof(credential_0.scopeRoots.recipientsRoot.field) === 'bigint' && credential_0.scopeRoots.recipientsRoot.field >= 0 && credential_0.scopeRoots.recipientsRoot.field <= __compactRuntime.MAX_FIELD && typeof(credential_0.scopeRoots.disclosurePolicyIdsRoot) === 'object' && typeof(credential_0.scopeRoots.disclosurePolicyIdsRoot.field) === 'bigint' && credential_0.scopeRoots.disclosurePolicyIdsRoot.field >= 0 && credential_0.scopeRoots.disclosurePolicyIdsRoot.field <= __compactRuntime.MAX_FIELD && true && typeof(credential_0.notBefore) === 'bigint' && credential_0.notBefore >= 0n && credential_0.notBefore <= 18446744073709551615n && typeof(credential_0.expiresAt) === 'bigint' && credential_0.expiresAt >= 0n && credential_0.expiresAt <= 18446744073709551615n && typeof(credential_0.statusIndex) === 'bigint' && credential_0.statusIndex >= 0n && credential_0.statusIndex <= 18446744073709551615n && typeof(credential_0.issuedAt) === 'bigint' && credential_0.issuedAt >= 0n && credential_0.issuedAt <= 18446744073709551615n)) {
      __compactRuntime.typeError('runtimeSessionCredentialMessage',
                                 'argument 1',
                                 'permio-authorization.compact line 583 char 1',
                                 'struct RuntimeSessionCredential<credentialVersion: Uint<0..65536>, target: struct TemplateRegistryTarget<namespaceHash: Bytes<32>, templateIdHash: Bytes<32>, semanticVersion: struct SemanticVersion<major: Uint<0..18446744073709551616>, minor: Uint<0..18446744073709551616>, patch: Uint<0..18446744073709551616>>, templateContentHash: Bytes<32>>, instanceCommitment: Bytes<32>, contextHash: Bytes<32>, sessionIdHash: Bytes<32>, m5SessionCommitment: Bytes<32>, subjectAccountCredentialCommitment: Bytes<32>, capabilityCredentialCommitment: Bytes<32>, scopeRoots: struct RuntimeScopeRoots<actionsRoot: struct MerkleTreeDigest<field: Field>, resourceSelectorsRoot: struct MerkleTreeDigest<field: Field>, resourcesRoot: struct MerkleTreeDigest<field: Field>, purposesRoot: struct MerkleTreeDigest<field: Field>, recipientKindsRoot: struct MerkleTreeDigest<field: Field>, recipientsRoot: struct MerkleTreeDigest<field: Field>, disclosurePolicyIdsRoot: struct MerkleTreeDigest<field: Field>>, runtimePublicKey: Opaque<"JubjubPoint">, notBefore: Uint<0..18446744073709551616>, expiresAt: Uint<0..18446744073709551616>, statusIndex: Uint<0..18446744073709551616>, issuedAt: Uint<0..18446744073709551616>>',
                                 credential_0)
    }
    return _dummyContract._runtimeSessionCredentialMessage_0(credential_0);
  },
  runtimeActionIntentMessage: (...args_0) => {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`runtimeActionIntentMessage: expected 1 argument (as invoked from Typescript), received ${args_0.length}`);
    }
    const intent_0 = args_0[0];
    if (!(typeof(intent_0) === 'object' && typeof(intent_0.intentVersion) === 'bigint' && intent_0.intentVersion >= 0n && intent_0.intentVersion <= 65535n && typeof(intent_0.target) === 'object' && intent_0.target.namespaceHash.buffer instanceof ArrayBuffer && intent_0.target.namespaceHash.BYTES_PER_ELEMENT === 1 && intent_0.target.namespaceHash.length === 32 && intent_0.target.templateIdHash.buffer instanceof ArrayBuffer && intent_0.target.templateIdHash.BYTES_PER_ELEMENT === 1 && intent_0.target.templateIdHash.length === 32 && typeof(intent_0.target.semanticVersion) === 'object' && typeof(intent_0.target.semanticVersion.major) === 'bigint' && intent_0.target.semanticVersion.major >= 0n && intent_0.target.semanticVersion.major <= 18446744073709551615n && typeof(intent_0.target.semanticVersion.minor) === 'bigint' && intent_0.target.semanticVersion.minor >= 0n && intent_0.target.semanticVersion.minor <= 18446744073709551615n && typeof(intent_0.target.semanticVersion.patch) === 'bigint' && intent_0.target.semanticVersion.patch >= 0n && intent_0.target.semanticVersion.patch <= 18446744073709551615n && intent_0.target.templateContentHash.buffer instanceof ArrayBuffer && intent_0.target.templateContentHash.BYTES_PER_ELEMENT === 1 && intent_0.target.templateContentHash.length === 32 && intent_0.instanceCommitment.buffer instanceof ArrayBuffer && intent_0.instanceCommitment.BYTES_PER_ELEMENT === 1 && intent_0.instanceCommitment.length === 32 && intent_0.contextHash.buffer instanceof ArrayBuffer && intent_0.contextHash.BYTES_PER_ELEMENT === 1 && intent_0.contextHash.length === 32 && intent_0.sessionCredentialCommitment.buffer instanceof ArrayBuffer && intent_0.sessionCredentialCommitment.BYTES_PER_ELEMENT === 1 && intent_0.sessionCredentialCommitment.length === 32 && intent_0.actionIdHash.buffer instanceof ArrayBuffer && intent_0.actionIdHash.BYTES_PER_ELEMENT === 1 && intent_0.actionIdHash.length === 32 && intent_0.resourceSelectorHash.buffer instanceof ArrayBuffer && intent_0.resourceSelectorHash.BYTES_PER_ELEMENT === 1 && intent_0.resourceSelectorHash.length === 32 && intent_0.resourceHash.buffer instanceof ArrayBuffer && intent_0.resourceHash.BYTES_PER_ELEMENT === 1 && intent_0.resourceHash.length === 32 && intent_0.purposeHash.buffer instanceof ArrayBuffer && intent_0.purposeHash.BYTES_PER_ELEMENT === 1 && intent_0.purposeHash.length === 32 && intent_0.recipientKindHash.buffer instanceof ArrayBuffer && intent_0.recipientKindHash.BYTES_PER_ELEMENT === 1 && intent_0.recipientKindHash.length === 32 && intent_0.recipientHash.buffer instanceof ArrayBuffer && intent_0.recipientHash.BYTES_PER_ELEMENT === 1 && intent_0.recipientHash.length === 32 && intent_0.disclosurePolicyIdHash.buffer instanceof ArrayBuffer && intent_0.disclosurePolicyIdHash.BYTES_PER_ELEMENT === 1 && intent_0.disclosurePolicyIdHash.length === 32 && intent_0.m5IntentCommitment.buffer instanceof ArrayBuffer && intent_0.m5IntentCommitment.BYTES_PER_ELEMENT === 1 && intent_0.m5IntentCommitment.length === 32 && typeof(intent_0.issuedAt) === 'bigint' && intent_0.issuedAt >= 0n && intent_0.issuedAt <= 18446744073709551615n && intent_0.nonceHash.buffer instanceof ArrayBuffer && intent_0.nonceHash.BYTES_PER_ELEMENT === 1 && intent_0.nonceHash.length === 32)) {
      __compactRuntime.typeError('runtimeActionIntentMessage',
                                 'argument 1',
                                 'permio-authorization.compact line 589 char 1',
                                 'struct RuntimeActionIntent<intentVersion: Uint<0..65536>, target: struct TemplateRegistryTarget<namespaceHash: Bytes<32>, templateIdHash: Bytes<32>, semanticVersion: struct SemanticVersion<major: Uint<0..18446744073709551616>, minor: Uint<0..18446744073709551616>, patch: Uint<0..18446744073709551616>>, templateContentHash: Bytes<32>>, instanceCommitment: Bytes<32>, contextHash: Bytes<32>, sessionCredentialCommitment: Bytes<32>, actionIdHash: Bytes<32>, resourceSelectorHash: Bytes<32>, resourceHash: Bytes<32>, purposeHash: Bytes<32>, recipientKindHash: Bytes<32>, recipientHash: Bytes<32>, disclosurePolicyIdHash: Bytes<32>, m5IntentCommitment: Bytes<32>, issuedAt: Uint<0..18446744073709551616>, nonceHash: Bytes<32>>',
                                 intent_0)
    }
    return _dummyContract._runtimeActionIntentMessage_0(intent_0);
  },
  activeTemplateRecordCommitment: (...args_0) => {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`activeTemplateRecordCommitment: expected 1 argument (as invoked from Typescript), received ${args_0.length}`);
    }
    const record_0 = args_0[0];
    if (!(typeof(record_0) === 'object' && typeof(record_0.target) === 'object' && record_0.target.namespaceHash.buffer instanceof ArrayBuffer && record_0.target.namespaceHash.BYTES_PER_ELEMENT === 1 && record_0.target.namespaceHash.length === 32 && record_0.target.templateIdHash.buffer instanceof ArrayBuffer && record_0.target.templateIdHash.BYTES_PER_ELEMENT === 1 && record_0.target.templateIdHash.length === 32 && typeof(record_0.target.semanticVersion) === 'object' && typeof(record_0.target.semanticVersion.major) === 'bigint' && record_0.target.semanticVersion.major >= 0n && record_0.target.semanticVersion.major <= 18446744073709551615n && typeof(record_0.target.semanticVersion.minor) === 'bigint' && record_0.target.semanticVersion.minor >= 0n && record_0.target.semanticVersion.minor <= 18446744073709551615n && typeof(record_0.target.semanticVersion.patch) === 'bigint' && record_0.target.semanticVersion.patch >= 0n && record_0.target.semanticVersion.patch <= 18446744073709551615n && record_0.target.templateContentHash.buffer instanceof ArrayBuffer && record_0.target.templateContentHash.BYTES_PER_ELEMENT === 1 && record_0.target.templateContentHash.length === 32 && record_0.governancePolicyHash.buffer instanceof ArrayBuffer && record_0.governancePolicyHash.BYTES_PER_ELEMENT === 1 && record_0.governancePolicyHash.length === 32 && record_0.proofModuleBindingsHash.buffer instanceof ArrayBuffer && record_0.proofModuleBindingsHash.BYTES_PER_ELEMENT === 1 && record_0.proofModuleBindingsHash.length === 32 && typeof(record_0.proofModuleBindingRoot) === 'object' && typeof(record_0.proofModuleBindingRoot.field) === 'bigint' && record_0.proofModuleBindingRoot.field >= 0 && record_0.proofModuleBindingRoot.field <= __compactRuntime.MAX_FIELD && typeof(record_0.proofModuleBindingCount) === 'bigint' && record_0.proofModuleBindingCount >= 0n && record_0.proofModuleBindingCount <= 4294967295n && typeof(record_0.proofModuleRegistrySequence) === 'bigint' && record_0.proofModuleRegistrySequence >= 0n && record_0.proofModuleRegistrySequence <= 18446744073709551615n && record_0.stagedBindingsAccumulator.buffer instanceof ArrayBuffer && record_0.stagedBindingsAccumulator.BYTES_PER_ELEMENT === 1 && record_0.stagedBindingsAccumulator.length === 32 && record_0.m4ActivationRecordHash.buffer instanceof ArrayBuffer && record_0.m4ActivationRecordHash.BYTES_PER_ELEMENT === 1 && record_0.m4ActivationRecordHash.length === 32 && record_0.approvalEvidenceCommitment.buffer instanceof ArrayBuffer && record_0.approvalEvidenceCommitment.BYTES_PER_ELEMENT === 1 && record_0.approvalEvidenceCommitment.length === 32 && typeof(record_0.authorityRootVersion) === 'bigint' && record_0.authorityRootVersion >= 0n && record_0.authorityRootVersion <= 18446744073709551615n && typeof(record_0.authorityRootSequence) === 'bigint' && record_0.authorityRootSequence >= 0n && record_0.authorityRootSequence <= 18446744073709551615n && typeof(record_0.lifecycleStatus) === 'bigint' && record_0.lifecycleStatus >= 0n && record_0.lifecycleStatus <= 255n && typeof(record_0.activationSequence) === 'bigint' && record_0.activationSequence >= 0n && record_0.activationSequence <= 18446744073709551615n && typeof(record_0.activatedAt) === 'bigint' && record_0.activatedAt >= 0n && record_0.activatedAt <= 18446744073709551615n && typeof(record_0.terminationEffectiveSequence) === 'bigint' && record_0.terminationEffectiveSequence >= 0n && record_0.terminationEffectiveSequence <= 18446744073709551615n && record_0.terminationReasonHash.buffer instanceof ArrayBuffer && record_0.terminationReasonHash.BYTES_PER_ELEMENT === 1 && record_0.terminationReasonHash.length === 32 && typeof(record_0.retiredAt) === 'bigint' && record_0.retiredAt >= 0n && record_0.retiredAt <= 18446744073709551615n && typeof(record_0.revokedAt) === 'bigint' && record_0.revokedAt >= 0n && record_0.revokedAt <= 18446744073709551615n)) {
      __compactRuntime.typeError('activeTemplateRecordCommitment',
                                 'argument 1',
                                 'permio-authorization.compact line 595 char 1',
                                 'struct ActiveTemplateRecord<target: struct TemplateRegistryTarget<namespaceHash: Bytes<32>, templateIdHash: Bytes<32>, semanticVersion: struct SemanticVersion<major: Uint<0..18446744073709551616>, minor: Uint<0..18446744073709551616>, patch: Uint<0..18446744073709551616>>, templateContentHash: Bytes<32>>, governancePolicyHash: Bytes<32>, proofModuleBindingsHash: Bytes<32>, proofModuleBindingRoot: struct MerkleTreeDigest<field: Field>, proofModuleBindingCount: Uint<0..4294967296>, proofModuleRegistrySequence: Uint<0..18446744073709551616>, stagedBindingsAccumulator: Bytes<32>, m4ActivationRecordHash: Bytes<32>, approvalEvidenceCommitment: Bytes<32>, authorityRootVersion: Uint<0..18446744073709551616>, authorityRootSequence: Uint<0..18446744073709551616>, lifecycleStatus: Uint<0..256>, activationSequence: Uint<0..18446744073709551616>, activatedAt: Uint<0..18446744073709551616>, terminationEffectiveSequence: Uint<0..18446744073709551616>, terminationReasonHash: Bytes<32>, retiredAt: Uint<0..18446744073709551616>, revokedAt: Uint<0..18446744073709551616>>',
                                 record_0)
    }
    return _dummyContract._activeTemplateRecordCommitment_0(record_0);
  },
  proofModuleBindingCommitment: (...args_0) => {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`proofModuleBindingCommitment: expected 1 argument (as invoked from Typescript), received ${args_0.length}`);
    }
    const binding_0 = args_0[0];
    if (!(typeof(binding_0) === 'object' && typeof(binding_0.bindingVersion) === 'bigint' && binding_0.bindingVersion >= 0n && binding_0.bindingVersion <= 65535n && typeof(binding_0.actionIndex) === 'bigint' && binding_0.actionIndex >= 0n && binding_0.actionIndex <= 4294967295n && binding_0.actionIdHash.buffer instanceof ArrayBuffer && binding_0.actionIdHash.BYTES_PER_ELEMENT === 1 && binding_0.actionIdHash.length === 32 && binding_0.proofProfileIdHash.buffer instanceof ArrayBuffer && binding_0.proofProfileIdHash.BYTES_PER_ELEMENT === 1 && binding_0.proofProfileIdHash.length === 32 && binding_0.moduleIdHash.buffer instanceof ArrayBuffer && binding_0.moduleIdHash.BYTES_PER_ELEMENT === 1 && binding_0.moduleIdHash.length === 32 && typeof(binding_0.moduleVersion) === 'object' && typeof(binding_0.moduleVersion.major) === 'bigint' && binding_0.moduleVersion.major >= 0n && binding_0.moduleVersion.major <= 18446744073709551615n && typeof(binding_0.moduleVersion.minor) === 'bigint' && binding_0.moduleVersion.minor >= 0n && binding_0.moduleVersion.minor <= 18446744073709551615n && typeof(binding_0.moduleVersion.patch) === 'bigint' && binding_0.moduleVersion.patch >= 0n && binding_0.moduleVersion.patch <= 18446744073709551615n && binding_0.implementationHash.buffer instanceof ArrayBuffer && binding_0.implementationHash.BYTES_PER_ELEMENT === 1 && binding_0.implementationHash.length === 32 && binding_0.configurationHash.buffer instanceof ArrayBuffer && binding_0.configurationHash.BYTES_PER_ELEMENT === 1 && binding_0.configurationHash.length === 32 && binding_0.receiptSchemaHash.buffer instanceof ArrayBuffer && binding_0.receiptSchemaHash.BYTES_PER_ELEMENT === 1 && binding_0.receiptSchemaHash.length === 32)) {
      __compactRuntime.typeError('proofModuleBindingCommitment',
                                 'argument 1',
                                 'permio-authorization.compact line 601 char 1',
                                 'struct ProofModuleBinding<bindingVersion: Uint<0..65536>, actionIndex: Uint<0..4294967296>, actionIdHash: Bytes<32>, proofProfileIdHash: Bytes<32>, moduleIdHash: Bytes<32>, moduleVersion: struct SemanticVersion<major: Uint<0..18446744073709551616>, minor: Uint<0..18446744073709551616>, patch: Uint<0..18446744073709551616>>, implementationHash: Bytes<32>, configurationHash: Bytes<32>, receiptSchemaHash: Bytes<32>>',
                                 binding_0)
    }
    return _dummyContract._proofModuleBindingCommitment_0(binding_0);
  },
  proofModuleProposalCommitment: (...args_0) => {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`proofModuleProposalCommitment: expected 1 argument (as invoked from Typescript), received ${args_0.length}`);
    }
    const proposal_0 = args_0[0];
    if (!(typeof(proposal_0) === 'object' && typeof(proposal_0.proposalVersion) === 'bigint' && proposal_0.proposalVersion >= 0n && proposal_0.proposalVersion <= 65535n && typeof(proposal_0.identity) === 'object' && proposal_0.identity.moduleIdHash.buffer instanceof ArrayBuffer && proposal_0.identity.moduleIdHash.BYTES_PER_ELEMENT === 1 && proposal_0.identity.moduleIdHash.length === 32 && typeof(proposal_0.identity.moduleVersion) === 'object' && typeof(proposal_0.identity.moduleVersion.major) === 'bigint' && proposal_0.identity.moduleVersion.major >= 0n && proposal_0.identity.moduleVersion.major <= 18446744073709551615n && typeof(proposal_0.identity.moduleVersion.minor) === 'bigint' && proposal_0.identity.moduleVersion.minor >= 0n && proposal_0.identity.moduleVersion.minor <= 18446744073709551615n && typeof(proposal_0.identity.moduleVersion.patch) === 'bigint' && proposal_0.identity.moduleVersion.patch >= 0n && proposal_0.identity.moduleVersion.patch <= 18446744073709551615n && proposal_0.identity.implementationHash.buffer instanceof ArrayBuffer && proposal_0.identity.implementationHash.BYTES_PER_ELEMENT === 1 && proposal_0.identity.implementationHash.length === 32 && proposal_0.governanceNamespaceHash.buffer instanceof ArrayBuffer && proposal_0.governanceNamespaceHash.BYTES_PER_ELEMENT === 1 && proposal_0.governanceNamespaceHash.length === 32 && proposal_0.governancePolicyHash.buffer instanceof ArrayBuffer && proposal_0.governancePolicyHash.BYTES_PER_ELEMENT === 1 && proposal_0.governancePolicyHash.length === 32 && typeof(proposal_0.authorityRootVersion) === 'bigint' && proposal_0.authorityRootVersion >= 0n && proposal_0.authorityRootVersion <= 18446744073709551615n && typeof(proposal_0.authorityRootSequence) === 'bigint' && proposal_0.authorityRootSequence >= 0n && proposal_0.authorityRootSequence <= 18446744073709551615n && proposal_0.implementationReferenceHash.buffer instanceof ArrayBuffer && proposal_0.implementationReferenceHash.BYTES_PER_ELEMENT === 1 && proposal_0.implementationReferenceHash.length === 32 && proposal_0.sourceHash.buffer instanceof ArrayBuffer && proposal_0.sourceHash.BYTES_PER_ELEMENT === 1 && proposal_0.sourceHash.length === 32 && proposal_0.inputSchemaHash.buffer instanceof ArrayBuffer && proposal_0.inputSchemaHash.BYTES_PER_ELEMENT === 1 && proposal_0.inputSchemaHash.length === 32 && proposal_0.configurationSchemaHash.buffer instanceof ArrayBuffer && proposal_0.configurationSchemaHash.BYTES_PER_ELEMENT === 1 && proposal_0.configurationSchemaHash.length === 32 && proposal_0.receiptSchemaHash.buffer instanceof ArrayBuffer && proposal_0.receiptSchemaHash.BYTES_PER_ELEMENT === 1 && proposal_0.receiptSchemaHash.length === 32 && proposal_0.compilerVersionHash.buffer instanceof ArrayBuffer && proposal_0.compilerVersionHash.BYTES_PER_ELEMENT === 1 && proposal_0.compilerVersionHash.length === 32 && proposal_0.compatibilityPolicyHash.buffer instanceof ArrayBuffer && proposal_0.compatibilityPolicyHash.BYTES_PER_ELEMENT === 1 && proposal_0.compatibilityPolicyHash.length === 32 && typeof(proposal_0.proposedAt) === 'bigint' && proposal_0.proposedAt >= 0n && proposal_0.proposedAt <= 18446744073709551615n)) {
      __compactRuntime.typeError('proofModuleProposalCommitment',
                                 'argument 1',
                                 'permio-authorization.compact line 607 char 1',
                                 'struct ProofModuleProposal<proposalVersion: Uint<0..65536>, identity: struct ProofModuleIdentity<moduleIdHash: Bytes<32>, moduleVersion: struct SemanticVersion<major: Uint<0..18446744073709551616>, minor: Uint<0..18446744073709551616>, patch: Uint<0..18446744073709551616>>, implementationHash: Bytes<32>>, governanceNamespaceHash: Bytes<32>, governancePolicyHash: Bytes<32>, authorityRootVersion: Uint<0..18446744073709551616>, authorityRootSequence: Uint<0..18446744073709551616>, implementationReferenceHash: Bytes<32>, sourceHash: Bytes<32>, inputSchemaHash: Bytes<32>, configurationSchemaHash: Bytes<32>, receiptSchemaHash: Bytes<32>, compilerVersionHash: Bytes<32>, compatibilityPolicyHash: Bytes<32>, proposedAt: Uint<0..18446744073709551616>>',
                                 proposal_0)
    }
    return _dummyContract._proofModuleProposalCommitment_0(proposal_0);
  },
  proofModuleRecordCommitment: (...args_0) => {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`proofModuleRecordCommitment: expected 1 argument (as invoked from Typescript), received ${args_0.length}`);
    }
    const record_0 = args_0[0];
    if (!(typeof(record_0) === 'object' && typeof(record_0.identity) === 'object' && record_0.identity.moduleIdHash.buffer instanceof ArrayBuffer && record_0.identity.moduleIdHash.BYTES_PER_ELEMENT === 1 && record_0.identity.moduleIdHash.length === 32 && typeof(record_0.identity.moduleVersion) === 'object' && typeof(record_0.identity.moduleVersion.major) === 'bigint' && record_0.identity.moduleVersion.major >= 0n && record_0.identity.moduleVersion.major <= 18446744073709551615n && typeof(record_0.identity.moduleVersion.minor) === 'bigint' && record_0.identity.moduleVersion.minor >= 0n && record_0.identity.moduleVersion.minor <= 18446744073709551615n && typeof(record_0.identity.moduleVersion.patch) === 'bigint' && record_0.identity.moduleVersion.patch >= 0n && record_0.identity.moduleVersion.patch <= 18446744073709551615n && record_0.identity.implementationHash.buffer instanceof ArrayBuffer && record_0.identity.implementationHash.BYTES_PER_ELEMENT === 1 && record_0.identity.implementationHash.length === 32 && record_0.proposalCommitment.buffer instanceof ArrayBuffer && record_0.proposalCommitment.BYTES_PER_ELEMENT === 1 && record_0.proposalCommitment.length === 32 && record_0.governanceNamespaceHash.buffer instanceof ArrayBuffer && record_0.governanceNamespaceHash.BYTES_PER_ELEMENT === 1 && record_0.governanceNamespaceHash.length === 32 && record_0.governancePolicyHash.buffer instanceof ArrayBuffer && record_0.governancePolicyHash.BYTES_PER_ELEMENT === 1 && record_0.governancePolicyHash.length === 32 && typeof(record_0.authorityRootVersion) === 'bigint' && record_0.authorityRootVersion >= 0n && record_0.authorityRootVersion <= 18446744073709551615n && typeof(record_0.authorityRootSequence) === 'bigint' && record_0.authorityRootSequence >= 0n && record_0.authorityRootSequence <= 18446744073709551615n && record_0.implementationReferenceHash.buffer instanceof ArrayBuffer && record_0.implementationReferenceHash.BYTES_PER_ELEMENT === 1 && record_0.implementationReferenceHash.length === 32 && record_0.sourceHash.buffer instanceof ArrayBuffer && record_0.sourceHash.BYTES_PER_ELEMENT === 1 && record_0.sourceHash.length === 32 && record_0.inputSchemaHash.buffer instanceof ArrayBuffer && record_0.inputSchemaHash.BYTES_PER_ELEMENT === 1 && record_0.inputSchemaHash.length === 32 && record_0.configurationSchemaHash.buffer instanceof ArrayBuffer && record_0.configurationSchemaHash.BYTES_PER_ELEMENT === 1 && record_0.configurationSchemaHash.length === 32 && record_0.receiptSchemaHash.buffer instanceof ArrayBuffer && record_0.receiptSchemaHash.BYTES_PER_ELEMENT === 1 && record_0.receiptSchemaHash.length === 32 && record_0.compilerVersionHash.buffer instanceof ArrayBuffer && record_0.compilerVersionHash.BYTES_PER_ELEMENT === 1 && record_0.compilerVersionHash.length === 32 && record_0.compatibilityPolicyHash.buffer instanceof ArrayBuffer && record_0.compatibilityPolicyHash.BYTES_PER_ELEMENT === 1 && record_0.compatibilityPolicyHash.length === 32 && record_0.approvalEvidenceCommitment.buffer instanceof ArrayBuffer && record_0.approvalEvidenceCommitment.BYTES_PER_ELEMENT === 1 && record_0.approvalEvidenceCommitment.length === 32 && typeof(record_0.reviewThreshold) === 'bigint' && record_0.reviewThreshold >= 0n && record_0.reviewThreshold <= 65535n && typeof(record_0.reviewCount) === 'bigint' && record_0.reviewCount >= 0n && record_0.reviewCount <= 65535n && record_0.reviewEvidenceAccumulator.buffer instanceof ArrayBuffer && record_0.reviewEvidenceAccumulator.BYTES_PER_ELEMENT === 1 && record_0.reviewEvidenceAccumulator.length === 32 && typeof(record_0.approvalThreshold) === 'bigint' && record_0.approvalThreshold >= 0n && record_0.approvalThreshold <= 65535n && typeof(record_0.approvalCount) === 'bigint' && record_0.approvalCount >= 0n && record_0.approvalCount <= 65535n && record_0.approvalEvidenceAccumulator.buffer instanceof ArrayBuffer && record_0.approvalEvidenceAccumulator.BYTES_PER_ELEMENT === 1 && record_0.approvalEvidenceAccumulator.length === 32 && typeof(record_0.lifecycleStatus) === 'bigint' && record_0.lifecycleStatus >= 0n && record_0.lifecycleStatus <= 255n && typeof(record_0.activationSequence) === 'bigint' && record_0.activationSequence >= 0n && record_0.activationSequence <= 18446744073709551615n && typeof(record_0.proposedAt) === 'bigint' && record_0.proposedAt >= 0n && record_0.proposedAt <= 18446744073709551615n && typeof(record_0.reviewedAt) === 'bigint' && record_0.reviewedAt >= 0n && record_0.reviewedAt <= 18446744073709551615n && typeof(record_0.approvedAt) === 'bigint' && record_0.approvedAt >= 0n && record_0.approvedAt <= 18446744073709551615n && typeof(record_0.activatedAt) === 'bigint' && record_0.activatedAt >= 0n && record_0.activatedAt <= 18446744073709551615n && typeof(record_0.deprecatedAt) === 'bigint' && record_0.deprecatedAt >= 0n && record_0.deprecatedAt <= 18446744073709551615n && typeof(record_0.revokedAt) === 'bigint' && record_0.revokedAt >= 0n && record_0.revokedAt <= 18446744073709551615n)) {
      __compactRuntime.typeError('proofModuleRecordCommitment',
                                 'argument 1',
                                 'permio-authorization.compact line 613 char 1',
                                 'struct ProofModuleRecord<identity: struct ProofModuleIdentity<moduleIdHash: Bytes<32>, moduleVersion: struct SemanticVersion<major: Uint<0..18446744073709551616>, minor: Uint<0..18446744073709551616>, patch: Uint<0..18446744073709551616>>, implementationHash: Bytes<32>>, proposalCommitment: Bytes<32>, governanceNamespaceHash: Bytes<32>, governancePolicyHash: Bytes<32>, authorityRootVersion: Uint<0..18446744073709551616>, authorityRootSequence: Uint<0..18446744073709551616>, implementationReferenceHash: Bytes<32>, sourceHash: Bytes<32>, inputSchemaHash: Bytes<32>, configurationSchemaHash: Bytes<32>, receiptSchemaHash: Bytes<32>, compilerVersionHash: Bytes<32>, compatibilityPolicyHash: Bytes<32>, approvalEvidenceCommitment: Bytes<32>, reviewThreshold: Uint<0..65536>, reviewCount: Uint<0..65536>, reviewEvidenceAccumulator: Bytes<32>, approvalThreshold: Uint<0..65536>, approvalCount: Uint<0..65536>, approvalEvidenceAccumulator: Bytes<32>, lifecycleStatus: Uint<0..256>, activationSequence: Uint<0..18446744073709551616>, proposedAt: Uint<0..18446744073709551616>, reviewedAt: Uint<0..18446744073709551616>, approvedAt: Uint<0..18446744073709551616>, activatedAt: Uint<0..18446744073709551616>, deprecatedAt: Uint<0..18446744073709551616>, revokedAt: Uint<0..18446744073709551616>>',
                                 record_0)
    }
    return _dummyContract._proofModuleRecordCommitment_0(record_0);
  },
  proofModuleReviewCommitment: (...args_0) => {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`proofModuleReviewCommitment: expected 1 argument (as invoked from Typescript), received ${args_0.length}`);
    }
    const review_0 = args_0[0];
    if (!(typeof(review_0) === 'object' && typeof(review_0.reviewVersion) === 'bigint' && review_0.reviewVersion >= 0n && review_0.reviewVersion <= 65535n && review_0.moduleKey.buffer instanceof ArrayBuffer && review_0.moduleKey.BYTES_PER_ELEMENT === 1 && review_0.moduleKey.length === 32 && review_0.proposalCommitment.buffer instanceof ArrayBuffer && review_0.proposalCommitment.BYTES_PER_ELEMENT === 1 && review_0.proposalCommitment.length === 32 && review_0.governanceNamespaceHash.buffer instanceof ArrayBuffer && review_0.governanceNamespaceHash.BYTES_PER_ELEMENT === 1 && review_0.governanceNamespaceHash.length === 32 && review_0.governancePolicyHash.buffer instanceof ArrayBuffer && review_0.governancePolicyHash.BYTES_PER_ELEMENT === 1 && review_0.governancePolicyHash.length === 32 && typeof(review_0.authorityRootVersion) === 'bigint' && review_0.authorityRootVersion >= 0n && review_0.authorityRootVersion <= 18446744073709551615n && typeof(review_0.authorityRootSequence) === 'bigint' && review_0.authorityRootSequence >= 0n && review_0.authorityRootSequence <= 18446744073709551615n && typeof(review_0.reviewedAt) === 'bigint' && review_0.reviewedAt >= 0n && review_0.reviewedAt <= 18446744073709551615n && review_0.reviewNonce.buffer instanceof ArrayBuffer && review_0.reviewNonce.BYTES_PER_ELEMENT === 1 && review_0.reviewNonce.length === 32)) {
      __compactRuntime.typeError('proofModuleReviewCommitment',
                                 'argument 1',
                                 'permio-authorization.compact line 619 char 1',
                                 'struct ProofModuleReview<reviewVersion: Uint<0..65536>, moduleKey: Bytes<32>, proposalCommitment: Bytes<32>, governanceNamespaceHash: Bytes<32>, governancePolicyHash: Bytes<32>, authorityRootVersion: Uint<0..18446744073709551616>, authorityRootSequence: Uint<0..18446744073709551616>, reviewedAt: Uint<0..18446744073709551616>, reviewNonce: Bytes<32>>',
                                 review_0)
    }
    return _dummyContract._proofModuleReviewCommitment_0(review_0);
  },
  proofModuleReviewMessage: (...args_0) => {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`proofModuleReviewMessage: expected 1 argument (as invoked from Typescript), received ${args_0.length}`);
    }
    const review_0 = args_0[0];
    if (!(typeof(review_0) === 'object' && typeof(review_0.reviewVersion) === 'bigint' && review_0.reviewVersion >= 0n && review_0.reviewVersion <= 65535n && review_0.moduleKey.buffer instanceof ArrayBuffer && review_0.moduleKey.BYTES_PER_ELEMENT === 1 && review_0.moduleKey.length === 32 && review_0.proposalCommitment.buffer instanceof ArrayBuffer && review_0.proposalCommitment.BYTES_PER_ELEMENT === 1 && review_0.proposalCommitment.length === 32 && review_0.governanceNamespaceHash.buffer instanceof ArrayBuffer && review_0.governanceNamespaceHash.BYTES_PER_ELEMENT === 1 && review_0.governanceNamespaceHash.length === 32 && review_0.governancePolicyHash.buffer instanceof ArrayBuffer && review_0.governancePolicyHash.BYTES_PER_ELEMENT === 1 && review_0.governancePolicyHash.length === 32 && typeof(review_0.authorityRootVersion) === 'bigint' && review_0.authorityRootVersion >= 0n && review_0.authorityRootVersion <= 18446744073709551615n && typeof(review_0.authorityRootSequence) === 'bigint' && review_0.authorityRootSequence >= 0n && review_0.authorityRootSequence <= 18446744073709551615n && typeof(review_0.reviewedAt) === 'bigint' && review_0.reviewedAt >= 0n && review_0.reviewedAt <= 18446744073709551615n && review_0.reviewNonce.buffer instanceof ArrayBuffer && review_0.reviewNonce.BYTES_PER_ELEMENT === 1 && review_0.reviewNonce.length === 32)) {
      __compactRuntime.typeError('proofModuleReviewMessage',
                                 'argument 1',
                                 'permio-authorization.compact line 625 char 1',
                                 'struct ProofModuleReview<reviewVersion: Uint<0..65536>, moduleKey: Bytes<32>, proposalCommitment: Bytes<32>, governanceNamespaceHash: Bytes<32>, governancePolicyHash: Bytes<32>, authorityRootVersion: Uint<0..18446744073709551616>, authorityRootSequence: Uint<0..18446744073709551616>, reviewedAt: Uint<0..18446744073709551616>, reviewNonce: Bytes<32>>',
                                 review_0)
    }
    return _dummyContract._proofModuleReviewMessage_0(review_0);
  },
  proofModuleLifecycleCommandMessage: (...args_0) => {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`proofModuleLifecycleCommandMessage: expected 1 argument (as invoked from Typescript), received ${args_0.length}`);
    }
    const command_0 = args_0[0];
    if (!(typeof(command_0) === 'object' && typeof(command_0.commandVersion) === 'bigint' && command_0.commandVersion >= 0n && command_0.commandVersion <= 65535n && command_0.moduleKey.buffer instanceof ArrayBuffer && command_0.moduleKey.BYTES_PER_ELEMENT === 1 && command_0.moduleKey.length === 32 && command_0.recordCommitment.buffer instanceof ArrayBuffer && command_0.recordCommitment.BYTES_PER_ELEMENT === 1 && command_0.recordCommitment.length === 32 && command_0.governanceNamespaceHash.buffer instanceof ArrayBuffer && command_0.governanceNamespaceHash.BYTES_PER_ELEMENT === 1 && command_0.governanceNamespaceHash.length === 32 && command_0.governancePolicyHash.buffer instanceof ArrayBuffer && command_0.governancePolicyHash.BYTES_PER_ELEMENT === 1 && command_0.governancePolicyHash.length === 32 && typeof(command_0.authorityRootVersion) === 'bigint' && command_0.authorityRootVersion >= 0n && command_0.authorityRootVersion <= 18446744073709551615n && typeof(command_0.authorityRootSequence) === 'bigint' && command_0.authorityRootSequence >= 0n && command_0.authorityRootSequence <= 18446744073709551615n && typeof(command_0.expectedLifecycleStatus) === 'bigint' && command_0.expectedLifecycleStatus >= 0n && command_0.expectedLifecycleStatus <= 255n && typeof(command_0.nextLifecycleStatus) === 'bigint' && command_0.nextLifecycleStatus >= 0n && command_0.nextLifecycleStatus <= 255n && typeof(command_0.effectiveAt) === 'bigint' && command_0.effectiveAt >= 0n && command_0.effectiveAt <= 18446744073709551615n && command_0.reasonHash.buffer instanceof ArrayBuffer && command_0.reasonHash.BYTES_PER_ELEMENT === 1 && command_0.reasonHash.length === 32 && command_0.commandNonce.buffer instanceof ArrayBuffer && command_0.commandNonce.BYTES_PER_ELEMENT === 1 && command_0.commandNonce.length === 32)) {
      __compactRuntime.typeError('proofModuleLifecycleCommandMessage',
                                 'argument 1',
                                 'permio-authorization.compact line 631 char 1',
                                 'struct ProofModuleLifecycleCommand<commandVersion: Uint<0..65536>, moduleKey: Bytes<32>, recordCommitment: Bytes<32>, governanceNamespaceHash: Bytes<32>, governancePolicyHash: Bytes<32>, authorityRootVersion: Uint<0..18446744073709551616>, authorityRootSequence: Uint<0..18446744073709551616>, expectedLifecycleStatus: Uint<0..256>, nextLifecycleStatus: Uint<0..256>, effectiveAt: Uint<0..18446744073709551616>, reasonHash: Bytes<32>, commandNonce: Bytes<32>>',
                                 command_0)
    }
    return _dummyContract._proofModuleLifecycleCommandMessage_0(command_0);
  },
  proofModuleReviewSignatureChallenge: (...args_0) => {
    if (args_0.length !== 3) {
      throw new __compactRuntime.CompactError(`proofModuleReviewSignatureChallenge: expected 3 arguments (as invoked from Typescript), received ${args_0.length}`);
    }
    const announcement_0 = args_0[0];
    const publicKey_0 = args_0[1];
    const review_0 = args_0[2];
    if (!(typeof(review_0) === 'object' && typeof(review_0.reviewVersion) === 'bigint' && review_0.reviewVersion >= 0n && review_0.reviewVersion <= 65535n && review_0.moduleKey.buffer instanceof ArrayBuffer && review_0.moduleKey.BYTES_PER_ELEMENT === 1 && review_0.moduleKey.length === 32 && review_0.proposalCommitment.buffer instanceof ArrayBuffer && review_0.proposalCommitment.BYTES_PER_ELEMENT === 1 && review_0.proposalCommitment.length === 32 && review_0.governanceNamespaceHash.buffer instanceof ArrayBuffer && review_0.governanceNamespaceHash.BYTES_PER_ELEMENT === 1 && review_0.governanceNamespaceHash.length === 32 && review_0.governancePolicyHash.buffer instanceof ArrayBuffer && review_0.governancePolicyHash.BYTES_PER_ELEMENT === 1 && review_0.governancePolicyHash.length === 32 && typeof(review_0.authorityRootVersion) === 'bigint' && review_0.authorityRootVersion >= 0n && review_0.authorityRootVersion <= 18446744073709551615n && typeof(review_0.authorityRootSequence) === 'bigint' && review_0.authorityRootSequence >= 0n && review_0.authorityRootSequence <= 18446744073709551615n && typeof(review_0.reviewedAt) === 'bigint' && review_0.reviewedAt >= 0n && review_0.reviewedAt <= 18446744073709551615n && review_0.reviewNonce.buffer instanceof ArrayBuffer && review_0.reviewNonce.BYTES_PER_ELEMENT === 1 && review_0.reviewNonce.length === 32)) {
      __compactRuntime.typeError('proofModuleReviewSignatureChallenge',
                                 'argument 3',
                                 'permio-authorization.compact line 637 char 1',
                                 'struct ProofModuleReview<reviewVersion: Uint<0..65536>, moduleKey: Bytes<32>, proposalCommitment: Bytes<32>, governanceNamespaceHash: Bytes<32>, governancePolicyHash: Bytes<32>, authorityRootVersion: Uint<0..18446744073709551616>, authorityRootSequence: Uint<0..18446744073709551616>, reviewedAt: Uint<0..18446744073709551616>, reviewNonce: Bytes<32>>',
                                 review_0)
    }
    return _dummyContract._proofModuleReviewSignatureChallenge_0(announcement_0,
                                                                 publicKey_0,
                                                                 review_0);
  },
  proofModuleLifecycleSignatureChallenge: (...args_0) => {
    if (args_0.length !== 3) {
      throw new __compactRuntime.CompactError(`proofModuleLifecycleSignatureChallenge: expected 3 arguments (as invoked from Typescript), received ${args_0.length}`);
    }
    const announcement_0 = args_0[0];
    const publicKey_0 = args_0[1];
    const command_0 = args_0[2];
    if (!(typeof(command_0) === 'object' && typeof(command_0.commandVersion) === 'bigint' && command_0.commandVersion >= 0n && command_0.commandVersion <= 65535n && command_0.moduleKey.buffer instanceof ArrayBuffer && command_0.moduleKey.BYTES_PER_ELEMENT === 1 && command_0.moduleKey.length === 32 && command_0.recordCommitment.buffer instanceof ArrayBuffer && command_0.recordCommitment.BYTES_PER_ELEMENT === 1 && command_0.recordCommitment.length === 32 && command_0.governanceNamespaceHash.buffer instanceof ArrayBuffer && command_0.governanceNamespaceHash.BYTES_PER_ELEMENT === 1 && command_0.governanceNamespaceHash.length === 32 && command_0.governancePolicyHash.buffer instanceof ArrayBuffer && command_0.governancePolicyHash.BYTES_PER_ELEMENT === 1 && command_0.governancePolicyHash.length === 32 && typeof(command_0.authorityRootVersion) === 'bigint' && command_0.authorityRootVersion >= 0n && command_0.authorityRootVersion <= 18446744073709551615n && typeof(command_0.authorityRootSequence) === 'bigint' && command_0.authorityRootSequence >= 0n && command_0.authorityRootSequence <= 18446744073709551615n && typeof(command_0.expectedLifecycleStatus) === 'bigint' && command_0.expectedLifecycleStatus >= 0n && command_0.expectedLifecycleStatus <= 255n && typeof(command_0.nextLifecycleStatus) === 'bigint' && command_0.nextLifecycleStatus >= 0n && command_0.nextLifecycleStatus <= 255n && typeof(command_0.effectiveAt) === 'bigint' && command_0.effectiveAt >= 0n && command_0.effectiveAt <= 18446744073709551615n && command_0.reasonHash.buffer instanceof ArrayBuffer && command_0.reasonHash.BYTES_PER_ELEMENT === 1 && command_0.reasonHash.length === 32 && command_0.commandNonce.buffer instanceof ArrayBuffer && command_0.commandNonce.BYTES_PER_ELEMENT === 1 && command_0.commandNonce.length === 32)) {
      __compactRuntime.typeError('proofModuleLifecycleSignatureChallenge',
                                 'argument 3',
                                 'permio-authorization.compact line 651 char 1',
                                 'struct ProofModuleLifecycleCommand<commandVersion: Uint<0..65536>, moduleKey: Bytes<32>, recordCommitment: Bytes<32>, governanceNamespaceHash: Bytes<32>, governancePolicyHash: Bytes<32>, authorityRootVersion: Uint<0..18446744073709551616>, authorityRootSequence: Uint<0..18446744073709551616>, expectedLifecycleStatus: Uint<0..256>, nextLifecycleStatus: Uint<0..256>, effectiveAt: Uint<0..18446744073709551616>, reasonHash: Bytes<32>, commandNonce: Bytes<32>>',
                                 command_0)
    }
    return _dummyContract._proofModuleLifecycleSignatureChallenge_0(announcement_0,
                                                                    publicKey_0,
                                                                    command_0);
  },
  governanceActivationSignatureChallenge: (...args_0) => {
    if (args_0.length !== 3) {
      throw new __compactRuntime.CompactError(`governanceActivationSignatureChallenge: expected 3 arguments (as invoked from Typescript), received ${args_0.length}`);
    }
    const announcement_0 = args_0[0];
    const publicKey_0 = args_0[1];
    const envelope_0 = args_0[2];
    if (!(typeof(envelope_0) === 'object' && typeof(envelope_0.envelopeVersion) === 'bigint' && envelope_0.envelopeVersion >= 0n && envelope_0.envelopeVersion <= 65535n && envelope_0.namespaceHash.buffer instanceof ArrayBuffer && envelope_0.namespaceHash.BYTES_PER_ELEMENT === 1 && envelope_0.namespaceHash.length === 32 && envelope_0.templateIdHash.buffer instanceof ArrayBuffer && envelope_0.templateIdHash.BYTES_PER_ELEMENT === 1 && envelope_0.templateIdHash.length === 32 && typeof(envelope_0.semanticVersion) === 'object' && typeof(envelope_0.semanticVersion.major) === 'bigint' && envelope_0.semanticVersion.major >= 0n && envelope_0.semanticVersion.major <= 18446744073709551615n && typeof(envelope_0.semanticVersion.minor) === 'bigint' && envelope_0.semanticVersion.minor >= 0n && envelope_0.semanticVersion.minor <= 18446744073709551615n && typeof(envelope_0.semanticVersion.patch) === 'bigint' && envelope_0.semanticVersion.patch >= 0n && envelope_0.semanticVersion.patch <= 18446744073709551615n && envelope_0.templateContentHash.buffer instanceof ArrayBuffer && envelope_0.templateContentHash.BYTES_PER_ELEMENT === 1 && envelope_0.templateContentHash.length === 32 && envelope_0.governancePolicyHash.buffer instanceof ArrayBuffer && envelope_0.governancePolicyHash.BYTES_PER_ELEMENT === 1 && envelope_0.governancePolicyHash.length === 32 && envelope_0.proofModuleBindingsHash.buffer instanceof ArrayBuffer && envelope_0.proofModuleBindingsHash.BYTES_PER_ELEMENT === 1 && envelope_0.proofModuleBindingsHash.length === 32 && typeof(envelope_0.proofModuleBindingRoot) === 'object' && typeof(envelope_0.proofModuleBindingRoot.field) === 'bigint' && envelope_0.proofModuleBindingRoot.field >= 0 && envelope_0.proofModuleBindingRoot.field <= __compactRuntime.MAX_FIELD && typeof(envelope_0.proofModuleBindingCount) === 'bigint' && envelope_0.proofModuleBindingCount >= 0n && envelope_0.proofModuleBindingCount <= 4294967295n && typeof(envelope_0.proofModuleRegistrySequence) === 'bigint' && envelope_0.proofModuleRegistrySequence >= 0n && envelope_0.proofModuleRegistrySequence <= 18446744073709551615n && envelope_0.m4ActivationRecordHash.buffer instanceof ArrayBuffer && envelope_0.m4ActivationRecordHash.BYTES_PER_ELEMENT === 1 && envelope_0.m4ActivationRecordHash.length === 32 && envelope_0.approvalEvidenceCommitment.buffer instanceof ArrayBuffer && envelope_0.approvalEvidenceCommitment.BYTES_PER_ELEMENT === 1 && envelope_0.approvalEvidenceCommitment.length === 32 && typeof(envelope_0.authorityRootVersion) === 'bigint' && envelope_0.authorityRootVersion >= 0n && envelope_0.authorityRootVersion <= 18446744073709551615n && typeof(envelope_0.authorityRootSequence) === 'bigint' && envelope_0.authorityRootSequence >= 0n && envelope_0.authorityRootSequence <= 18446744073709551615n && envelope_0.targetNetworkHash.buffer instanceof ArrayBuffer && envelope_0.targetNetworkHash.BYTES_PER_ELEMENT === 1 && envelope_0.targetNetworkHash.length === 32 && envelope_0.targetContractIdentity.buffer instanceof ArrayBuffer && envelope_0.targetContractIdentity.BYTES_PER_ELEMENT === 1 && envelope_0.targetContractIdentity.length === 32 && typeof(envelope_0.registryProtocolVersion) === 'bigint' && envelope_0.registryProtocolVersion >= 0n && envelope_0.registryProtocolVersion <= 65535n && envelope_0.admissionNonce.buffer instanceof ArrayBuffer && envelope_0.admissionNonce.BYTES_PER_ELEMENT === 1 && envelope_0.admissionNonce.length === 32 && typeof(envelope_0.activatedAt) === 'bigint' && envelope_0.activatedAt >= 0n && envelope_0.activatedAt <= 18446744073709551615n && typeof(envelope_0.stagingExpiresAt) === 'bigint' && envelope_0.stagingExpiresAt >= 0n && envelope_0.stagingExpiresAt <= 18446744073709551615n)) {
      __compactRuntime.typeError('governanceActivationSignatureChallenge',
                                 'argument 3',
                                 'permio-authorization.compact line 665 char 1',
                                 'struct ActivationAdmissionEnvelope<envelopeVersion: Uint<0..65536>, namespaceHash: Bytes<32>, templateIdHash: Bytes<32>, semanticVersion: struct SemanticVersion<major: Uint<0..18446744073709551616>, minor: Uint<0..18446744073709551616>, patch: Uint<0..18446744073709551616>>, templateContentHash: Bytes<32>, governancePolicyHash: Bytes<32>, proofModuleBindingsHash: Bytes<32>, proofModuleBindingRoot: struct MerkleTreeDigest<field: Field>, proofModuleBindingCount: Uint<0..4294967296>, proofModuleRegistrySequence: Uint<0..18446744073709551616>, m4ActivationRecordHash: Bytes<32>, approvalEvidenceCommitment: Bytes<32>, authorityRootVersion: Uint<0..18446744073709551616>, authorityRootSequence: Uint<0..18446744073709551616>, targetNetworkHash: Bytes<32>, targetContractIdentity: Bytes<32>, registryProtocolVersion: Uint<0..65536>, admissionNonce: Bytes<32>, activatedAt: Uint<0..18446744073709551616>, stagingExpiresAt: Uint<0..18446744073709551616>>',
                                 envelope_0)
    }
    return _dummyContract._governanceActivationSignatureChallenge_0(announcement_0,
                                                                    publicKey_0,
                                                                    envelope_0);
  },
  authorityRootUpdateSignatureChallenge: (...args_0) => {
    if (args_0.length !== 3) {
      throw new __compactRuntime.CompactError(`authorityRootUpdateSignatureChallenge: expected 3 arguments (as invoked from Typescript), received ${args_0.length}`);
    }
    const announcement_0 = args_0[0];
    const publicKey_0 = args_0[1];
    const command_0 = args_0[2];
    if (!(typeof(command_0) === 'object' && typeof(command_0.commandVersion) === 'bigint' && command_0.commandVersion >= 0n && command_0.commandVersion <= 65535n && command_0.namespaceHash.buffer instanceof ArrayBuffer && command_0.namespaceHash.BYTES_PER_ELEMENT === 1 && command_0.namespaceHash.length === 32 && command_0.currentGovernancePolicyHash.buffer instanceof ArrayBuffer && command_0.currentGovernancePolicyHash.BYTES_PER_ELEMENT === 1 && command_0.currentGovernancePolicyHash.length === 32 && typeof(command_0.currentRoot) === 'object' && typeof(command_0.currentRoot.field) === 'bigint' && command_0.currentRoot.field >= 0 && command_0.currentRoot.field <= __compactRuntime.MAX_FIELD && typeof(command_0.currentRootVersion) === 'bigint' && command_0.currentRootVersion >= 0n && command_0.currentRootVersion <= 18446744073709551615n && typeof(command_0.currentRootSequence) === 'bigint' && command_0.currentRootSequence >= 0n && command_0.currentRootSequence <= 18446744073709551615n && command_0.nextGovernancePolicyHash.buffer instanceof ArrayBuffer && command_0.nextGovernancePolicyHash.BYTES_PER_ELEMENT === 1 && command_0.nextGovernancePolicyHash.length === 32 && typeof(command_0.nextRoot) === 'object' && typeof(command_0.nextRoot.field) === 'bigint' && command_0.nextRoot.field >= 0 && command_0.nextRoot.field <= __compactRuntime.MAX_FIELD && typeof(command_0.nextRootVersion) === 'bigint' && command_0.nextRootVersion >= 0n && command_0.nextRootVersion <= 18446744073709551615n && typeof(command_0.nextRootSequence) === 'bigint' && command_0.nextRootSequence >= 0n && command_0.nextRootSequence <= 18446744073709551615n && typeof(command_0.nextModuleReviewThreshold) === 'bigint' && command_0.nextModuleReviewThreshold >= 0n && command_0.nextModuleReviewThreshold <= 65535n && typeof(command_0.nextModuleApprovalThreshold) === 'bigint' && command_0.nextModuleApprovalThreshold >= 0n && command_0.nextModuleApprovalThreshold <= 65535n && typeof(command_0.nextAuthorityRootUpdateThreshold) === 'bigint' && command_0.nextAuthorityRootUpdateThreshold >= 0n && command_0.nextAuthorityRootUpdateThreshold <= 65535n && typeof(command_0.effectiveAt) === 'bigint' && command_0.effectiveAt >= 0n && command_0.effectiveAt <= 18446744073709551615n && command_0.updateNonce.buffer instanceof ArrayBuffer && command_0.updateNonce.BYTES_PER_ELEMENT === 1 && command_0.updateNonce.length === 32)) {
      __compactRuntime.typeError('authorityRootUpdateSignatureChallenge',
                                 'argument 3',
                                 'permio-authorization.compact line 679 char 1',
                                 'struct AuthorityRootUpdateCommand<commandVersion: Uint<0..65536>, namespaceHash: Bytes<32>, currentGovernancePolicyHash: Bytes<32>, currentRoot: struct MerkleTreeDigest<field: Field>, currentRootVersion: Uint<0..18446744073709551616>, currentRootSequence: Uint<0..18446744073709551616>, nextGovernancePolicyHash: Bytes<32>, nextRoot: struct MerkleTreeDigest<field: Field>, nextRootVersion: Uint<0..18446744073709551616>, nextRootSequence: Uint<0..18446744073709551616>, nextModuleReviewThreshold: Uint<0..65536>, nextModuleApprovalThreshold: Uint<0..65536>, nextAuthorityRootUpdateThreshold: Uint<0..65536>, effectiveAt: Uint<0..18446744073709551616>, updateNonce: Bytes<32>>',
                                 command_0)
    }
    return _dummyContract._authorityRootUpdateSignatureChallenge_0(announcement_0,
                                                                   publicKey_0,
                                                                   command_0);
  },
  templateLifecycleSignatureChallenge: (...args_0) => {
    if (args_0.length !== 3) {
      throw new __compactRuntime.CompactError(`templateLifecycleSignatureChallenge: expected 3 arguments (as invoked from Typescript), received ${args_0.length}`);
    }
    const announcement_0 = args_0[0];
    const publicKey_0 = args_0[1];
    const command_0 = args_0[2];
    if (!(typeof(command_0) === 'object' && typeof(command_0.commandVersion) === 'bigint' && command_0.commandVersion >= 0n && command_0.commandVersion <= 65535n && command_0.registryKey.buffer instanceof ArrayBuffer && command_0.registryKey.BYTES_PER_ELEMENT === 1 && command_0.registryKey.length === 32 && command_0.recordCommitment.buffer instanceof ArrayBuffer && command_0.recordCommitment.BYTES_PER_ELEMENT === 1 && command_0.recordCommitment.length === 32 && command_0.namespaceHash.buffer instanceof ArrayBuffer && command_0.namespaceHash.BYTES_PER_ELEMENT === 1 && command_0.namespaceHash.length === 32 && command_0.governancePolicyHash.buffer instanceof ArrayBuffer && command_0.governancePolicyHash.BYTES_PER_ELEMENT === 1 && command_0.governancePolicyHash.length === 32 && typeof(command_0.authorityRootVersion) === 'bigint' && command_0.authorityRootVersion >= 0n && command_0.authorityRootVersion <= 18446744073709551615n && typeof(command_0.authorityRootSequence) === 'bigint' && command_0.authorityRootSequence >= 0n && command_0.authorityRootSequence <= 18446744073709551615n && typeof(command_0.expectedLifecycleStatus) === 'bigint' && command_0.expectedLifecycleStatus >= 0n && command_0.expectedLifecycleStatus <= 255n && typeof(command_0.nextLifecycleStatus) === 'bigint' && command_0.nextLifecycleStatus >= 0n && command_0.nextLifecycleStatus <= 255n && typeof(command_0.effectiveAt) === 'bigint' && command_0.effectiveAt >= 0n && command_0.effectiveAt <= 18446744073709551615n && typeof(command_0.effectiveSequence) === 'bigint' && command_0.effectiveSequence >= 0n && command_0.effectiveSequence <= 18446744073709551615n && command_0.reasonHash.buffer instanceof ArrayBuffer && command_0.reasonHash.BYTES_PER_ELEMENT === 1 && command_0.reasonHash.length === 32 && command_0.commandNonce.buffer instanceof ArrayBuffer && command_0.commandNonce.BYTES_PER_ELEMENT === 1 && command_0.commandNonce.length === 32)) {
      __compactRuntime.typeError('templateLifecycleSignatureChallenge',
                                 'argument 3',
                                 'permio-authorization.compact line 693 char 1',
                                 'struct TemplateLifecycleCommand<commandVersion: Uint<0..65536>, registryKey: Bytes<32>, recordCommitment: Bytes<32>, namespaceHash: Bytes<32>, governancePolicyHash: Bytes<32>, authorityRootVersion: Uint<0..18446744073709551616>, authorityRootSequence: Uint<0..18446744073709551616>, expectedLifecycleStatus: Uint<0..256>, nextLifecycleStatus: Uint<0..256>, effectiveAt: Uint<0..18446744073709551616>, effectiveSequence: Uint<0..18446744073709551616>, reasonHash: Bytes<32>, commandNonce: Bytes<32>>',
                                 command_0)
    }
    return _dummyContract._templateLifecycleSignatureChallenge_0(announcement_0,
                                                                 publicKey_0,
                                                                 command_0);
  },
  runtimeAccountCredentialSignatureChallenge: (...args_0) => {
    if (args_0.length !== 3) {
      throw new __compactRuntime.CompactError(`runtimeAccountCredentialSignatureChallenge: expected 3 arguments (as invoked from Typescript), received ${args_0.length}`);
    }
    const announcement_0 = args_0[0];
    const publicKey_0 = args_0[1];
    const credential_0 = args_0[2];
    if (!(typeof(credential_0) === 'object' && typeof(credential_0.credentialVersion) === 'bigint' && credential_0.credentialVersion >= 0n && credential_0.credentialVersion <= 65535n && typeof(credential_0.target) === 'object' && credential_0.target.namespaceHash.buffer instanceof ArrayBuffer && credential_0.target.namespaceHash.BYTES_PER_ELEMENT === 1 && credential_0.target.namespaceHash.length === 32 && credential_0.target.templateIdHash.buffer instanceof ArrayBuffer && credential_0.target.templateIdHash.BYTES_PER_ELEMENT === 1 && credential_0.target.templateIdHash.length === 32 && typeof(credential_0.target.semanticVersion) === 'object' && typeof(credential_0.target.semanticVersion.major) === 'bigint' && credential_0.target.semanticVersion.major >= 0n && credential_0.target.semanticVersion.major <= 18446744073709551615n && typeof(credential_0.target.semanticVersion.minor) === 'bigint' && credential_0.target.semanticVersion.minor >= 0n && credential_0.target.semanticVersion.minor <= 18446744073709551615n && typeof(credential_0.target.semanticVersion.patch) === 'bigint' && credential_0.target.semanticVersion.patch >= 0n && credential_0.target.semanticVersion.patch <= 18446744073709551615n && credential_0.target.templateContentHash.buffer instanceof ArrayBuffer && credential_0.target.templateContentHash.BYTES_PER_ELEMENT === 1 && credential_0.target.templateContentHash.length === 32 && credential_0.instanceCommitment.buffer instanceof ArrayBuffer && credential_0.instanceCommitment.BYTES_PER_ELEMENT === 1 && credential_0.instanceCommitment.length === 32 && credential_0.contextHash.buffer instanceof ArrayBuffer && credential_0.contextHash.BYTES_PER_ELEMENT === 1 && credential_0.contextHash.length === 32 && credential_0.accountIdHash.buffer instanceof ArrayBuffer && credential_0.accountIdHash.BYTES_PER_ELEMENT === 1 && credential_0.accountIdHash.length === 32 && typeof(credential_0.principalKind) === 'bigint' && credential_0.principalKind >= 0n && credential_0.principalKind <= 65535n && credential_0.m5AccountCommitment.buffer instanceof ArrayBuffer && credential_0.m5AccountCommitment.BYTES_PER_ELEMENT === 1 && credential_0.m5AccountCommitment.length === 32 && true && typeof(credential_0.statusIndex) === 'bigint' && credential_0.statusIndex >= 0n && credential_0.statusIndex <= 18446744073709551615n && typeof(credential_0.issuedAt) === 'bigint' && credential_0.issuedAt >= 0n && credential_0.issuedAt <= 18446744073709551615n && typeof(credential_0.validBefore) === 'bigint' && credential_0.validBefore >= 0n && credential_0.validBefore <= 18446744073709551615n)) {
      __compactRuntime.typeError('runtimeAccountCredentialSignatureChallenge',
                                 'argument 3',
                                 'permio-authorization.compact line 707 char 1',
                                 'struct RuntimeAccountCredential<credentialVersion: Uint<0..65536>, target: struct TemplateRegistryTarget<namespaceHash: Bytes<32>, templateIdHash: Bytes<32>, semanticVersion: struct SemanticVersion<major: Uint<0..18446744073709551616>, minor: Uint<0..18446744073709551616>, patch: Uint<0..18446744073709551616>>, templateContentHash: Bytes<32>>, instanceCommitment: Bytes<32>, contextHash: Bytes<32>, accountIdHash: Bytes<32>, principalKind: Uint<0..65536>, m5AccountCommitment: Bytes<32>, runtimePublicKey: Opaque<"JubjubPoint">, statusIndex: Uint<0..18446744073709551616>, issuedAt: Uint<0..18446744073709551616>, validBefore: Uint<0..18446744073709551616>>',
                                 credential_0)
    }
    return _dummyContract._runtimeAccountCredentialSignatureChallenge_0(announcement_0,
                                                                        publicKey_0,
                                                                        credential_0);
  },
  runtimeCapabilityCredentialSignatureChallenge: (...args_0) => {
    if (args_0.length !== 3) {
      throw new __compactRuntime.CompactError(`runtimeCapabilityCredentialSignatureChallenge: expected 3 arguments (as invoked from Typescript), received ${args_0.length}`);
    }
    const announcement_0 = args_0[0];
    const publicKey_0 = args_0[1];
    const credential_0 = args_0[2];
    if (!(typeof(credential_0) === 'object' && typeof(credential_0.credentialVersion) === 'bigint' && credential_0.credentialVersion >= 0n && credential_0.credentialVersion <= 65535n && typeof(credential_0.target) === 'object' && credential_0.target.namespaceHash.buffer instanceof ArrayBuffer && credential_0.target.namespaceHash.BYTES_PER_ELEMENT === 1 && credential_0.target.namespaceHash.length === 32 && credential_0.target.templateIdHash.buffer instanceof ArrayBuffer && credential_0.target.templateIdHash.BYTES_PER_ELEMENT === 1 && credential_0.target.templateIdHash.length === 32 && typeof(credential_0.target.semanticVersion) === 'object' && typeof(credential_0.target.semanticVersion.major) === 'bigint' && credential_0.target.semanticVersion.major >= 0n && credential_0.target.semanticVersion.major <= 18446744073709551615n && typeof(credential_0.target.semanticVersion.minor) === 'bigint' && credential_0.target.semanticVersion.minor >= 0n && credential_0.target.semanticVersion.minor <= 18446744073709551615n && typeof(credential_0.target.semanticVersion.patch) === 'bigint' && credential_0.target.semanticVersion.patch >= 0n && credential_0.target.semanticVersion.patch <= 18446744073709551615n && credential_0.target.templateContentHash.buffer instanceof ArrayBuffer && credential_0.target.templateContentHash.BYTES_PER_ELEMENT === 1 && credential_0.target.templateContentHash.length === 32 && credential_0.instanceCommitment.buffer instanceof ArrayBuffer && credential_0.instanceCommitment.BYTES_PER_ELEMENT === 1 && credential_0.instanceCommitment.length === 32 && credential_0.contextHash.buffer instanceof ArrayBuffer && credential_0.contextHash.BYTES_PER_ELEMENT === 1 && credential_0.contextHash.length === 32 && credential_0.grantIdHash.buffer instanceof ArrayBuffer && credential_0.grantIdHash.BYTES_PER_ELEMENT === 1 && credential_0.grantIdHash.length === 32 && credential_0.m5GrantCommitment.buffer instanceof ArrayBuffer && credential_0.m5GrantCommitment.BYTES_PER_ELEMENT === 1 && credential_0.m5GrantCommitment.length === 32 && credential_0.subjectAccountCredentialCommitment.buffer instanceof ArrayBuffer && credential_0.subjectAccountCredentialCommitment.BYTES_PER_ELEMENT === 1 && credential_0.subjectAccountCredentialCommitment.length === 32 && credential_0.parentCapabilityCredentialCommitment.buffer instanceof ArrayBuffer && credential_0.parentCapabilityCredentialCommitment.BYTES_PER_ELEMENT === 1 && credential_0.parentCapabilityCredentialCommitment.length === 32 && credential_0.issuerAccountCredentialCommitment.buffer instanceof ArrayBuffer && credential_0.issuerAccountCredentialCommitment.BYTES_PER_ELEMENT === 1 && credential_0.issuerAccountCredentialCommitment.length === 32 && typeof(credential_0.scopeRoots) === 'object' && typeof(credential_0.scopeRoots.actionsRoot) === 'object' && typeof(credential_0.scopeRoots.actionsRoot.field) === 'bigint' && credential_0.scopeRoots.actionsRoot.field >= 0 && credential_0.scopeRoots.actionsRoot.field <= __compactRuntime.MAX_FIELD && typeof(credential_0.scopeRoots.resourceSelectorsRoot) === 'object' && typeof(credential_0.scopeRoots.resourceSelectorsRoot.field) === 'bigint' && credential_0.scopeRoots.resourceSelectorsRoot.field >= 0 && credential_0.scopeRoots.resourceSelectorsRoot.field <= __compactRuntime.MAX_FIELD && typeof(credential_0.scopeRoots.resourcesRoot) === 'object' && typeof(credential_0.scopeRoots.resourcesRoot.field) === 'bigint' && credential_0.scopeRoots.resourcesRoot.field >= 0 && credential_0.scopeRoots.resourcesRoot.field <= __compactRuntime.MAX_FIELD && typeof(credential_0.scopeRoots.purposesRoot) === 'object' && typeof(credential_0.scopeRoots.purposesRoot.field) === 'bigint' && credential_0.scopeRoots.purposesRoot.field >= 0 && credential_0.scopeRoots.purposesRoot.field <= __compactRuntime.MAX_FIELD && typeof(credential_0.scopeRoots.recipientKindsRoot) === 'object' && typeof(credential_0.scopeRoots.recipientKindsRoot.field) === 'bigint' && credential_0.scopeRoots.recipientKindsRoot.field >= 0 && credential_0.scopeRoots.recipientKindsRoot.field <= __compactRuntime.MAX_FIELD && typeof(credential_0.scopeRoots.recipientsRoot) === 'object' && typeof(credential_0.scopeRoots.recipientsRoot.field) === 'bigint' && credential_0.scopeRoots.recipientsRoot.field >= 0 && credential_0.scopeRoots.recipientsRoot.field <= __compactRuntime.MAX_FIELD && typeof(credential_0.scopeRoots.disclosurePolicyIdsRoot) === 'object' && typeof(credential_0.scopeRoots.disclosurePolicyIdsRoot.field) === 'bigint' && credential_0.scopeRoots.disclosurePolicyIdsRoot.field >= 0 && credential_0.scopeRoots.disclosurePolicyIdsRoot.field <= __compactRuntime.MAX_FIELD && typeof(credential_0.notBefore) === 'bigint' && credential_0.notBefore >= 0n && credential_0.notBefore <= 18446744073709551615n && typeof(credential_0.expiresAt) === 'bigint' && credential_0.expiresAt >= 0n && credential_0.expiresAt <= 18446744073709551615n && typeof(credential_0.delegationDepth) === 'bigint' && credential_0.delegationDepth >= 0n && credential_0.delegationDepth <= 65535n && typeof(credential_0.maxDelegationDepth) === 'bigint' && credential_0.maxDelegationDepth >= 0n && credential_0.maxDelegationDepth <= 65535n && typeof(credential_0.statusIndex) === 'bigint' && credential_0.statusIndex >= 0n && credential_0.statusIndex <= 18446744073709551615n && typeof(credential_0.issuedAt) === 'bigint' && credential_0.issuedAt >= 0n && credential_0.issuedAt <= 18446744073709551615n)) {
      __compactRuntime.typeError('runtimeCapabilityCredentialSignatureChallenge',
                                 'argument 3',
                                 'permio-authorization.compact line 721 char 1',
                                 'struct RuntimeCapabilityCredential<credentialVersion: Uint<0..65536>, target: struct TemplateRegistryTarget<namespaceHash: Bytes<32>, templateIdHash: Bytes<32>, semanticVersion: struct SemanticVersion<major: Uint<0..18446744073709551616>, minor: Uint<0..18446744073709551616>, patch: Uint<0..18446744073709551616>>, templateContentHash: Bytes<32>>, instanceCommitment: Bytes<32>, contextHash: Bytes<32>, grantIdHash: Bytes<32>, m5GrantCommitment: Bytes<32>, subjectAccountCredentialCommitment: Bytes<32>, parentCapabilityCredentialCommitment: Bytes<32>, issuerAccountCredentialCommitment: Bytes<32>, scopeRoots: struct RuntimeScopeRoots<actionsRoot: struct MerkleTreeDigest<field: Field>, resourceSelectorsRoot: struct MerkleTreeDigest<field: Field>, resourcesRoot: struct MerkleTreeDigest<field: Field>, purposesRoot: struct MerkleTreeDigest<field: Field>, recipientKindsRoot: struct MerkleTreeDigest<field: Field>, recipientsRoot: struct MerkleTreeDigest<field: Field>, disclosurePolicyIdsRoot: struct MerkleTreeDigest<field: Field>>, notBefore: Uint<0..18446744073709551616>, expiresAt: Uint<0..18446744073709551616>, delegationDepth: Uint<0..65536>, maxDelegationDepth: Uint<0..65536>, statusIndex: Uint<0..18446744073709551616>, issuedAt: Uint<0..18446744073709551616>>',
                                 credential_0)
    }
    return _dummyContract._runtimeCapabilityCredentialSignatureChallenge_0(announcement_0,
                                                                           publicKey_0,
                                                                           credential_0);
  },
  runtimeSessionCredentialSignatureChallenge: (...args_0) => {
    if (args_0.length !== 3) {
      throw new __compactRuntime.CompactError(`runtimeSessionCredentialSignatureChallenge: expected 3 arguments (as invoked from Typescript), received ${args_0.length}`);
    }
    const announcement_0 = args_0[0];
    const publicKey_0 = args_0[1];
    const credential_0 = args_0[2];
    if (!(typeof(credential_0) === 'object' && typeof(credential_0.credentialVersion) === 'bigint' && credential_0.credentialVersion >= 0n && credential_0.credentialVersion <= 65535n && typeof(credential_0.target) === 'object' && credential_0.target.namespaceHash.buffer instanceof ArrayBuffer && credential_0.target.namespaceHash.BYTES_PER_ELEMENT === 1 && credential_0.target.namespaceHash.length === 32 && credential_0.target.templateIdHash.buffer instanceof ArrayBuffer && credential_0.target.templateIdHash.BYTES_PER_ELEMENT === 1 && credential_0.target.templateIdHash.length === 32 && typeof(credential_0.target.semanticVersion) === 'object' && typeof(credential_0.target.semanticVersion.major) === 'bigint' && credential_0.target.semanticVersion.major >= 0n && credential_0.target.semanticVersion.major <= 18446744073709551615n && typeof(credential_0.target.semanticVersion.minor) === 'bigint' && credential_0.target.semanticVersion.minor >= 0n && credential_0.target.semanticVersion.minor <= 18446744073709551615n && typeof(credential_0.target.semanticVersion.patch) === 'bigint' && credential_0.target.semanticVersion.patch >= 0n && credential_0.target.semanticVersion.patch <= 18446744073709551615n && credential_0.target.templateContentHash.buffer instanceof ArrayBuffer && credential_0.target.templateContentHash.BYTES_PER_ELEMENT === 1 && credential_0.target.templateContentHash.length === 32 && credential_0.instanceCommitment.buffer instanceof ArrayBuffer && credential_0.instanceCommitment.BYTES_PER_ELEMENT === 1 && credential_0.instanceCommitment.length === 32 && credential_0.contextHash.buffer instanceof ArrayBuffer && credential_0.contextHash.BYTES_PER_ELEMENT === 1 && credential_0.contextHash.length === 32 && credential_0.sessionIdHash.buffer instanceof ArrayBuffer && credential_0.sessionIdHash.BYTES_PER_ELEMENT === 1 && credential_0.sessionIdHash.length === 32 && credential_0.m5SessionCommitment.buffer instanceof ArrayBuffer && credential_0.m5SessionCommitment.BYTES_PER_ELEMENT === 1 && credential_0.m5SessionCommitment.length === 32 && credential_0.subjectAccountCredentialCommitment.buffer instanceof ArrayBuffer && credential_0.subjectAccountCredentialCommitment.BYTES_PER_ELEMENT === 1 && credential_0.subjectAccountCredentialCommitment.length === 32 && credential_0.capabilityCredentialCommitment.buffer instanceof ArrayBuffer && credential_0.capabilityCredentialCommitment.BYTES_PER_ELEMENT === 1 && credential_0.capabilityCredentialCommitment.length === 32 && typeof(credential_0.scopeRoots) === 'object' && typeof(credential_0.scopeRoots.actionsRoot) === 'object' && typeof(credential_0.scopeRoots.actionsRoot.field) === 'bigint' && credential_0.scopeRoots.actionsRoot.field >= 0 && credential_0.scopeRoots.actionsRoot.field <= __compactRuntime.MAX_FIELD && typeof(credential_0.scopeRoots.resourceSelectorsRoot) === 'object' && typeof(credential_0.scopeRoots.resourceSelectorsRoot.field) === 'bigint' && credential_0.scopeRoots.resourceSelectorsRoot.field >= 0 && credential_0.scopeRoots.resourceSelectorsRoot.field <= __compactRuntime.MAX_FIELD && typeof(credential_0.scopeRoots.resourcesRoot) === 'object' && typeof(credential_0.scopeRoots.resourcesRoot.field) === 'bigint' && credential_0.scopeRoots.resourcesRoot.field >= 0 && credential_0.scopeRoots.resourcesRoot.field <= __compactRuntime.MAX_FIELD && typeof(credential_0.scopeRoots.purposesRoot) === 'object' && typeof(credential_0.scopeRoots.purposesRoot.field) === 'bigint' && credential_0.scopeRoots.purposesRoot.field >= 0 && credential_0.scopeRoots.purposesRoot.field <= __compactRuntime.MAX_FIELD && typeof(credential_0.scopeRoots.recipientKindsRoot) === 'object' && typeof(credential_0.scopeRoots.recipientKindsRoot.field) === 'bigint' && credential_0.scopeRoots.recipientKindsRoot.field >= 0 && credential_0.scopeRoots.recipientKindsRoot.field <= __compactRuntime.MAX_FIELD && typeof(credential_0.scopeRoots.recipientsRoot) === 'object' && typeof(credential_0.scopeRoots.recipientsRoot.field) === 'bigint' && credential_0.scopeRoots.recipientsRoot.field >= 0 && credential_0.scopeRoots.recipientsRoot.field <= __compactRuntime.MAX_FIELD && typeof(credential_0.scopeRoots.disclosurePolicyIdsRoot) === 'object' && typeof(credential_0.scopeRoots.disclosurePolicyIdsRoot.field) === 'bigint' && credential_0.scopeRoots.disclosurePolicyIdsRoot.field >= 0 && credential_0.scopeRoots.disclosurePolicyIdsRoot.field <= __compactRuntime.MAX_FIELD && true && typeof(credential_0.notBefore) === 'bigint' && credential_0.notBefore >= 0n && credential_0.notBefore <= 18446744073709551615n && typeof(credential_0.expiresAt) === 'bigint' && credential_0.expiresAt >= 0n && credential_0.expiresAt <= 18446744073709551615n && typeof(credential_0.statusIndex) === 'bigint' && credential_0.statusIndex >= 0n && credential_0.statusIndex <= 18446744073709551615n && typeof(credential_0.issuedAt) === 'bigint' && credential_0.issuedAt >= 0n && credential_0.issuedAt <= 18446744073709551615n)) {
      __compactRuntime.typeError('runtimeSessionCredentialSignatureChallenge',
                                 'argument 3',
                                 'permio-authorization.compact line 735 char 1',
                                 'struct RuntimeSessionCredential<credentialVersion: Uint<0..65536>, target: struct TemplateRegistryTarget<namespaceHash: Bytes<32>, templateIdHash: Bytes<32>, semanticVersion: struct SemanticVersion<major: Uint<0..18446744073709551616>, minor: Uint<0..18446744073709551616>, patch: Uint<0..18446744073709551616>>, templateContentHash: Bytes<32>>, instanceCommitment: Bytes<32>, contextHash: Bytes<32>, sessionIdHash: Bytes<32>, m5SessionCommitment: Bytes<32>, subjectAccountCredentialCommitment: Bytes<32>, capabilityCredentialCommitment: Bytes<32>, scopeRoots: struct RuntimeScopeRoots<actionsRoot: struct MerkleTreeDigest<field: Field>, resourceSelectorsRoot: struct MerkleTreeDigest<field: Field>, resourcesRoot: struct MerkleTreeDigest<field: Field>, purposesRoot: struct MerkleTreeDigest<field: Field>, recipientKindsRoot: struct MerkleTreeDigest<field: Field>, recipientsRoot: struct MerkleTreeDigest<field: Field>, disclosurePolicyIdsRoot: struct MerkleTreeDigest<field: Field>>, runtimePublicKey: Opaque<"JubjubPoint">, notBefore: Uint<0..18446744073709551616>, expiresAt: Uint<0..18446744073709551616>, statusIndex: Uint<0..18446744073709551616>, issuedAt: Uint<0..18446744073709551616>>',
                                 credential_0)
    }
    return _dummyContract._runtimeSessionCredentialSignatureChallenge_0(announcement_0,
                                                                        publicKey_0,
                                                                        credential_0);
  },
  runtimeActionIntentSignatureChallenge: (...args_0) => {
    if (args_0.length !== 3) {
      throw new __compactRuntime.CompactError(`runtimeActionIntentSignatureChallenge: expected 3 arguments (as invoked from Typescript), received ${args_0.length}`);
    }
    const announcement_0 = args_0[0];
    const publicKey_0 = args_0[1];
    const intent_0 = args_0[2];
    if (!(typeof(intent_0) === 'object' && typeof(intent_0.intentVersion) === 'bigint' && intent_0.intentVersion >= 0n && intent_0.intentVersion <= 65535n && typeof(intent_0.target) === 'object' && intent_0.target.namespaceHash.buffer instanceof ArrayBuffer && intent_0.target.namespaceHash.BYTES_PER_ELEMENT === 1 && intent_0.target.namespaceHash.length === 32 && intent_0.target.templateIdHash.buffer instanceof ArrayBuffer && intent_0.target.templateIdHash.BYTES_PER_ELEMENT === 1 && intent_0.target.templateIdHash.length === 32 && typeof(intent_0.target.semanticVersion) === 'object' && typeof(intent_0.target.semanticVersion.major) === 'bigint' && intent_0.target.semanticVersion.major >= 0n && intent_0.target.semanticVersion.major <= 18446744073709551615n && typeof(intent_0.target.semanticVersion.minor) === 'bigint' && intent_0.target.semanticVersion.minor >= 0n && intent_0.target.semanticVersion.minor <= 18446744073709551615n && typeof(intent_0.target.semanticVersion.patch) === 'bigint' && intent_0.target.semanticVersion.patch >= 0n && intent_0.target.semanticVersion.patch <= 18446744073709551615n && intent_0.target.templateContentHash.buffer instanceof ArrayBuffer && intent_0.target.templateContentHash.BYTES_PER_ELEMENT === 1 && intent_0.target.templateContentHash.length === 32 && intent_0.instanceCommitment.buffer instanceof ArrayBuffer && intent_0.instanceCommitment.BYTES_PER_ELEMENT === 1 && intent_0.instanceCommitment.length === 32 && intent_0.contextHash.buffer instanceof ArrayBuffer && intent_0.contextHash.BYTES_PER_ELEMENT === 1 && intent_0.contextHash.length === 32 && intent_0.sessionCredentialCommitment.buffer instanceof ArrayBuffer && intent_0.sessionCredentialCommitment.BYTES_PER_ELEMENT === 1 && intent_0.sessionCredentialCommitment.length === 32 && intent_0.actionIdHash.buffer instanceof ArrayBuffer && intent_0.actionIdHash.BYTES_PER_ELEMENT === 1 && intent_0.actionIdHash.length === 32 && intent_0.resourceSelectorHash.buffer instanceof ArrayBuffer && intent_0.resourceSelectorHash.BYTES_PER_ELEMENT === 1 && intent_0.resourceSelectorHash.length === 32 && intent_0.resourceHash.buffer instanceof ArrayBuffer && intent_0.resourceHash.BYTES_PER_ELEMENT === 1 && intent_0.resourceHash.length === 32 && intent_0.purposeHash.buffer instanceof ArrayBuffer && intent_0.purposeHash.BYTES_PER_ELEMENT === 1 && intent_0.purposeHash.length === 32 && intent_0.recipientKindHash.buffer instanceof ArrayBuffer && intent_0.recipientKindHash.BYTES_PER_ELEMENT === 1 && intent_0.recipientKindHash.length === 32 && intent_0.recipientHash.buffer instanceof ArrayBuffer && intent_0.recipientHash.BYTES_PER_ELEMENT === 1 && intent_0.recipientHash.length === 32 && intent_0.disclosurePolicyIdHash.buffer instanceof ArrayBuffer && intent_0.disclosurePolicyIdHash.BYTES_PER_ELEMENT === 1 && intent_0.disclosurePolicyIdHash.length === 32 && intent_0.m5IntentCommitment.buffer instanceof ArrayBuffer && intent_0.m5IntentCommitment.BYTES_PER_ELEMENT === 1 && intent_0.m5IntentCommitment.length === 32 && typeof(intent_0.issuedAt) === 'bigint' && intent_0.issuedAt >= 0n && intent_0.issuedAt <= 18446744073709551615n && intent_0.nonceHash.buffer instanceof ArrayBuffer && intent_0.nonceHash.BYTES_PER_ELEMENT === 1 && intent_0.nonceHash.length === 32)) {
      __compactRuntime.typeError('runtimeActionIntentSignatureChallenge',
                                 'argument 3',
                                 'permio-authorization.compact line 749 char 1',
                                 'struct RuntimeActionIntent<intentVersion: Uint<0..65536>, target: struct TemplateRegistryTarget<namespaceHash: Bytes<32>, templateIdHash: Bytes<32>, semanticVersion: struct SemanticVersion<major: Uint<0..18446744073709551616>, minor: Uint<0..18446744073709551616>, patch: Uint<0..18446744073709551616>>, templateContentHash: Bytes<32>>, instanceCommitment: Bytes<32>, contextHash: Bytes<32>, sessionCredentialCommitment: Bytes<32>, actionIdHash: Bytes<32>, resourceSelectorHash: Bytes<32>, resourceHash: Bytes<32>, purposeHash: Bytes<32>, recipientKindHash: Bytes<32>, recipientHash: Bytes<32>, disclosurePolicyIdHash: Bytes<32>, m5IntentCommitment: Bytes<32>, issuedAt: Uint<0..18446744073709551616>, nonceHash: Bytes<32>>',
                                 intent_0)
    }
    return _dummyContract._runtimeActionIntentSignatureChallenge_0(announcement_0,
                                                                   publicKey_0,
                                                                   intent_0);
  },
  runtimeCredentialStatusSignatureChallenge: (...args_0) => {
    if (args_0.length !== 3) {
      throw new __compactRuntime.CompactError(`runtimeCredentialStatusSignatureChallenge: expected 3 arguments (as invoked from Typescript), received ${args_0.length}`);
    }
    const announcement_0 = args_0[0];
    const publicKey_0 = args_0[1];
    const command_0 = args_0[2];
    if (!(typeof(command_0) === 'object' && typeof(command_0.commandVersion) === 'bigint' && command_0.commandVersion >= 0n && command_0.commandVersion <= 65535n && command_0.namespaceHash.buffer instanceof ArrayBuffer && command_0.namespaceHash.BYTES_PER_ELEMENT === 1 && command_0.namespaceHash.length === 32 && command_0.governancePolicyHash.buffer instanceof ArrayBuffer && command_0.governancePolicyHash.BYTES_PER_ELEMENT === 1 && command_0.governancePolicyHash.length === 32 && typeof(command_0.authorityRootVersion) === 'bigint' && command_0.authorityRootVersion >= 0n && command_0.authorityRootVersion <= 18446744073709551615n && typeof(command_0.authorityRootSequence) === 'bigint' && command_0.authorityRootSequence >= 0n && command_0.authorityRootSequence <= 18446744073709551615n && typeof(command_0.credentialStatusRootSequence) === 'bigint' && command_0.credentialStatusRootSequence >= 0n && command_0.credentialStatusRootSequence <= 18446744073709551615n && typeof(command_0.credentialKind) === 'bigint' && command_0.credentialKind >= 0n && command_0.credentialKind <= 65535n && command_0.credentialCommitment.buffer instanceof ArrayBuffer && command_0.credentialCommitment.BYTES_PER_ELEMENT === 1 && command_0.credentialCommitment.length === 32 && command_0.subjectAccountCredentialCommitment.buffer instanceof ArrayBuffer && command_0.subjectAccountCredentialCommitment.BYTES_PER_ELEMENT === 1 && command_0.subjectAccountCredentialCommitment.length === 32 && command_0.revocationAuthorityAccountCredentialCommitment.buffer instanceof ArrayBuffer && command_0.revocationAuthorityAccountCredentialCommitment.BYTES_PER_ELEMENT === 1 && command_0.revocationAuthorityAccountCredentialCommitment.length === 32 && typeof(command_0.statusIndex) === 'bigint' && command_0.statusIndex >= 0n && command_0.statusIndex <= 18446744073709551615n && typeof(command_0.expectedStatus) === 'bigint' && command_0.expectedStatus >= 0n && command_0.expectedStatus <= 255n && typeof(command_0.nextStatus) === 'bigint' && command_0.nextStatus >= 0n && command_0.nextStatus <= 255n && typeof(command_0.effectiveAt) === 'bigint' && command_0.effectiveAt >= 0n && command_0.effectiveAt <= 18446744073709551615n && command_0.commandNonce.buffer instanceof ArrayBuffer && command_0.commandNonce.BYTES_PER_ELEMENT === 1 && command_0.commandNonce.length === 32)) {
      __compactRuntime.typeError('runtimeCredentialStatusSignatureChallenge',
                                 'argument 3',
                                 'permio-authorization.compact line 763 char 1',
                                 'struct RuntimeCredentialStatusCommand<commandVersion: Uint<0..65536>, namespaceHash: Bytes<32>, governancePolicyHash: Bytes<32>, authorityRootVersion: Uint<0..18446744073709551616>, authorityRootSequence: Uint<0..18446744073709551616>, credentialStatusRootSequence: Uint<0..18446744073709551616>, credentialKind: Uint<0..65536>, credentialCommitment: Bytes<32>, subjectAccountCredentialCommitment: Bytes<32>, revocationAuthorityAccountCredentialCommitment: Bytes<32>, statusIndex: Uint<0..18446744073709551616>, expectedStatus: Uint<0..256>, nextStatus: Uint<0..256>, effectiveAt: Uint<0..18446744073709551616>, commandNonce: Bytes<32>>',
                                 command_0)
    }
    return _dummyContract._runtimeCredentialStatusSignatureChallenge_0(announcement_0,
                                                                       publicKey_0,
                                                                       command_0);
  },
  proofModuleRegistryKeyFromIdentity: (...args_0) => {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`proofModuleRegistryKeyFromIdentity: expected 1 argument (as invoked from Typescript), received ${args_0.length}`);
    }
    const identity_0 = args_0[0];
    if (!(typeof(identity_0) === 'object' && identity_0.moduleIdHash.buffer instanceof ArrayBuffer && identity_0.moduleIdHash.BYTES_PER_ELEMENT === 1 && identity_0.moduleIdHash.length === 32 && typeof(identity_0.moduleVersion) === 'object' && typeof(identity_0.moduleVersion.major) === 'bigint' && identity_0.moduleVersion.major >= 0n && identity_0.moduleVersion.major <= 18446744073709551615n && typeof(identity_0.moduleVersion.minor) === 'bigint' && identity_0.moduleVersion.minor >= 0n && identity_0.moduleVersion.minor <= 18446744073709551615n && typeof(identity_0.moduleVersion.patch) === 'bigint' && identity_0.moduleVersion.patch >= 0n && identity_0.moduleVersion.patch <= 18446744073709551615n && identity_0.implementationHash.buffer instanceof ArrayBuffer && identity_0.implementationHash.BYTES_PER_ELEMENT === 1 && identity_0.implementationHash.length === 32)) {
      __compactRuntime.typeError('proofModuleRegistryKeyFromIdentity',
                                 'argument 1',
                                 'permio-authorization.compact line 807 char 1',
                                 'struct ProofModuleIdentity<moduleIdHash: Bytes<32>, moduleVersion: struct SemanticVersion<major: Uint<0..18446744073709551616>, minor: Uint<0..18446744073709551616>, patch: Uint<0..18446744073709551616>>, implementationHash: Bytes<32>>',
                                 identity_0)
    }
    return _dummyContract._proofModuleRegistryKeyFromIdentity_0(identity_0);
  }
};
export const contractReferenceLocations =
  { tag: 'publicLedgerArray', indices: { } };
//# sourceMappingURL=index.js.map
