// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.28;

/**
 * @title IReceiptVerifier
 * @notice Version-specific boundary between the execution registry and an
 *         exact M7 transport envelope.
 * @dev Implementations decode one receipt version and recover its gateway
 *      signer. The registry independently enforces source, key-epoch,
 *      validity, replay, recipient, and adapter policy.
 */
interface IReceiptVerifier {
    struct VerifiedReceipt {
        bytes32 receiptId;
        bytes32 receiptVersion;
        bytes32 proofModuleId;
        string proofModuleVersion;
        bytes32 proofModuleImplementationHash;
        bytes32 namespaceHash;
        bytes32 templateIdHash;
        string templateVersion;
        bytes32 templateContentHash;
        bytes32 instanceCommitment;
        bytes32 previousStateCommitment;
        bytes32 nextStateCommitment;
        uint64 transitionSequence;
        bytes32 contextHash;
        bytes32 actionSchemaId;
        bytes32 purposeHash;
        bytes32 recipient;
        uint64 validAfter;
        uint64 validBefore;
        bytes32 scopedNullifier;
        bytes32 outputCommitment;
        bytes32 sourceNetwork;
        string sourceNetworkName;
        bytes32 sourceContract;
        bytes sourceTransaction;
        uint64 sourceLedgerSequence;
        bytes32 gatewayKeyId;
        uint64 gatewaySignedAt;
        address gatewaySigner;
    }

    function verify(
        bytes calldata encodedReceipt,
        bytes calldata gatewaySignature
    ) external view returns (VerifiedReceipt memory receipt);
}
