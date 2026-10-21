// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.28;

import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

import {IReceiptVerifier} from "../interfaces/IReceiptVerifier.sol";

/**
 * @title ExpectedM6M7ReceiptVerifier
 * @notice TEST FIXTURE ONLY. Models the documented expected M6 public fields
 *         and an expected M7 transport signature so M8 can be developed before
 *         the authoritative upstream contracts are integrated.
 * @dev This is not the final M6 receipt codec, not the final M7 transport
 *      contract, and not evidence of live receipt or transport authenticity.
 *      Production deployment is forbidden. Replace it with the verifier for
 *      the reviewed, versioned M6/M7 public contract.
 */
contract ExpectedM6M7ReceiptVerifier is EIP712, IReceiptVerifier {
    uint256 public constant FIXTURE_CHAIN_ID = 31337;
    bool public constant FIXTURE_ONLY = true;
    string public constant FIXTURE_STATUS =
        "EXPECTED_UPSTREAM_CONTRACT_FIXTURE_NOT_ACCEPTANCE_EVIDENCE";
    bytes32 public constant EXPECTED_FIXTURE_RECEIPT_VERSION =
        keccak256("permio.fixture.expected-m6-decision-receipt.v0");

    string public constant SIGNING_DOMAIN = "Permio Expected M7 Fixture";
    string public constant SIGNATURE_VERSION = "0";

    bytes32 public constant EXPECTED_RECEIPT_TYPEHASH = keccak256(
        "ExpectedReceipt(bytes32 receiptVersion,bytes32 proofModuleId,bytes32 proofModuleVersion,bytes32 proofModuleImplementationHash,bytes32 namespaceHash,bytes32 templateIdHash,bytes32 templateVersion,bytes32 templateContentHash,bytes32 instanceCommitment,bytes32 previousStateCommitment,bytes32 nextStateCommitment,uint64 transitionSequence,bytes32 contextHash,bytes32 actionSchemaId,bytes32 purposeHash,address recipient,uint64 validAfter,uint64 validBefore,bytes32 scopedNullifier,bytes32 outputCommitment,bytes32 sourceNetwork,bytes32 sourceContract,bytes32 sourceTransaction,uint64 sourceLedgerSequence,bytes32 gatewayKeyId,uint64 gatewaySignedAt,uint256 targetChainId,address targetRegistry)"
    );

    struct ExpectedReceipt {
        bytes32 receiptVersion;
        bytes32 proofModuleId;
        bytes32 proofModuleVersion;
        bytes32 proofModuleImplementationHash;
        bytes32 namespaceHash;
        bytes32 templateIdHash;
        bytes32 templateVersion;
        bytes32 templateContentHash;
        bytes32 instanceCommitment;
        bytes32 previousStateCommitment;
        bytes32 nextStateCommitment;
        uint64 transitionSequence;
        bytes32 contextHash;
        bytes32 actionSchemaId;
        bytes32 purposeHash;
        address recipient;
        uint64 validAfter;
        uint64 validBefore;
        bytes32 scopedNullifier;
        bytes32 outputCommitment;
        bytes32 sourceNetwork;
        bytes32 sourceContract;
        bytes32 sourceTransaction;
        uint64 sourceLedgerSequence;
        bytes32 gatewayKeyId;
        uint64 gatewaySignedAt;
        uint256 targetChainId;
        address targetRegistry;
    }

    address public immutable targetRegistry;

    error NonCanonicalFixtureEncoding();
    error FixtureChainOnly(uint256 expected, uint256 actual);
    error WrongFixtureVersion(bytes32 actual);
    error WrongTargetChain(uint256 expected, uint256 actual);
    error WrongTargetRegistry(address expected, address actual);

    constructor(address registry)
        EIP712(SIGNING_DOMAIN, SIGNATURE_VERSION)
    {
        if (block.chainid != FIXTURE_CHAIN_ID) {
            revert FixtureChainOnly(FIXTURE_CHAIN_ID, block.chainid);
        }
        if (registry == address(0)) {
            revert WrongTargetRegistry(address(0), registry);
        }
        targetRegistry = registry;
    }

    function verify(
        bytes calldata encodedReceipt,
        bytes calldata gatewaySignature
    ) external view returns (VerifiedReceipt memory receipt) {
        ExpectedReceipt memory expected = abi.decode(
            encodedReceipt,
            (ExpectedReceipt)
        );
        if (keccak256(encodedReceipt) != keccak256(abi.encode(expected))) {
            revert NonCanonicalFixtureEncoding();
        }
        if (expected.receiptVersion != EXPECTED_FIXTURE_RECEIPT_VERSION) {
            revert WrongFixtureVersion(expected.receiptVersion);
        }
        if (expected.targetChainId != block.chainid) {
            revert WrongTargetChain(block.chainid, expected.targetChainId);
        }
        if (expected.targetRegistry != targetRegistry) {
            revert WrongTargetRegistry(targetRegistry, expected.targetRegistry);
        }

        bytes32 digest = _hashTypedDataV4(_structHash(expected));
        address signer = ECDSA.recover(digest, gatewaySignature);

        receipt = VerifiedReceipt({
            receiptId: keccak256(encodedReceipt),
            receiptVersion: expected.receiptVersion,
            proofModuleId: expected.proofModuleId,
            proofModuleVersion: expected.proofModuleVersion,
            proofModuleImplementationHash: expected
                .proofModuleImplementationHash,
            namespaceHash: expected.namespaceHash,
            templateIdHash: expected.templateIdHash,
            templateVersion: expected.templateVersion,
            templateContentHash: expected.templateContentHash,
            instanceCommitment: expected.instanceCommitment,
            previousStateCommitment: expected.previousStateCommitment,
            nextStateCommitment: expected.nextStateCommitment,
            transitionSequence: expected.transitionSequence,
            contextHash: expected.contextHash,
            actionSchemaId: expected.actionSchemaId,
            purposeHash: expected.purposeHash,
            recipient: expected.recipient,
            validAfter: expected.validAfter,
            validBefore: expected.validBefore,
            scopedNullifier: expected.scopedNullifier,
            outputCommitment: expected.outputCommitment,
            sourceNetwork: expected.sourceNetwork,
            sourceContract: expected.sourceContract,
            sourceTransaction: expected.sourceTransaction,
            sourceLedgerSequence: expected.sourceLedgerSequence,
            gatewayKeyId: expected.gatewayKeyId,
            gatewaySignedAt: expected.gatewaySignedAt,
            gatewaySigner: signer
        });
    }

    function fixtureDigest(
        ExpectedReceipt calldata expected
    ) external view returns (bytes32) {
        return _hashTypedDataV4(_structHash(expected));
    }

    function _structHash(
        ExpectedReceipt memory expected
    ) private pure returns (bytes32) {
        bytes memory first = abi.encode(
            EXPECTED_RECEIPT_TYPEHASH,
            expected.receiptVersion,
            expected.proofModuleId,
            expected.proofModuleVersion,
            expected.proofModuleImplementationHash,
            expected.namespaceHash,
            expected.templateIdHash,
            expected.templateVersion,
            expected.templateContentHash,
            expected.instanceCommitment
        );
        bytes memory second = abi.encode(
            expected.previousStateCommitment,
            expected.nextStateCommitment,
            expected.transitionSequence,
            expected.contextHash,
            expected.actionSchemaId,
            expected.purposeHash,
            expected.recipient,
            expected.validAfter,
            expected.validBefore,
            expected.scopedNullifier
        );
        bytes memory third = abi.encode(
            expected.outputCommitment,
            expected.sourceNetwork,
            expected.sourceContract,
            expected.sourceTransaction,
            expected.sourceLedgerSequence,
            expected.gatewayKeyId,
            expected.gatewaySignedAt,
            expected.targetChainId,
            expected.targetRegistry
        );
        return keccak256(bytes.concat(first, second, third));
    }
}
