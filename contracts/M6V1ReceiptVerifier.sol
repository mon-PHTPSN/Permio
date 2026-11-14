// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.28;

import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import {IReceiptVerifier} from "./interfaces/IReceiptVerifier.sol";

/**
 * Authenticates the versioned M7 transport of an unchanged M6 v1 receipt.
 * The gateway must establish M6 authorization, its Compact commitment and
 * exact finalized provenance. This contract does not verify a Midnight proof
 * or recompute Compact persistentHash. The registry checks the recovered key,
 * source authorization, expiry, replay and explicit recipient/adapter binding.
 */
contract M6V1ReceiptVerifier is IReceiptVerifier {
    bytes32 public constant RECEIPT_VERSION = bytes32(uint256(1));
    bytes32 private constant PREPROD = 0xa124031379c05df6c1eee3d208855b7dfdc747fef10404d8dbb7d5be56da8522;
    bytes32 private constant UNDEPLOYED = 0xa0a0add8bb8b55d7d41456a2c64252846172812ce0e1c30dea26d674d629af9d;
    bytes32 private constant DOMAIN_TYPEHASH = keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");
    bytes32 private constant TRANSPORT_TYPEHASH = keccak256("GatewayTransport(bytes32 outboxKey,bytes32 sourceIdentityHash,bytes32 receiptHash,string keyId,uint64 signedAt,uint256 targetChainId,address targetRegistry)");

    struct WireReceipt {
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
    }
    address public immutable targetRegistry;
    error InvalidM6Receipt();
    error NonCanonicalM6Encoding();

    constructor(address registry) {
        if (registry == address(0)) revert InvalidM6Receipt();
        targetRegistry = registry;
    }

    function verify(bytes calldata encodedReceipt, bytes calldata gatewaySignature)
        external view returns (VerifiedReceipt memory receipt)
    {
        WireReceipt memory wire = abi.decode(encodedReceipt, (WireReceipt));
        if (keccak256(encodedReceipt) != keccak256(abi.encode(wire))) revert NonCanonicalM6Encoding();
        (bytes32 outboxKey, bytes32 sourceIdentityHash, string memory keyId, uint64 signedAt, bytes memory signature) =
            abi.decode(gatewaySignature, (bytes32, bytes32, string, uint64, bytes));
        if (keccak256(gatewaySignature) != keccak256(abi.encode(outboxKey, sourceIdentityHash, keyId, signedAt, signature))) {
            revert NonCanonicalM6Encoding();
        }
        _validate(wire);
        if (outboxKey == bytes32(0) || bytes(keyId).length == 0 || bytes(keyId).length > 256 ||
            sourceIdentityHash != keccak256(abi.encode(wire.sourceNetworkName, wire.sourceContract, wire.sourceTransaction, uint32(0), wire.sourceLedgerSequence))) {
            revert InvalidM6Receipt();
        }
        bytes32 structHash = keccak256(abi.encode(TRANSPORT_TYPEHASH, outboxKey, sourceIdentityHash,
            keccak256(encodedReceipt), keccak256(bytes(keyId)), signedAt, block.chainid, targetRegistry));
        bytes32 domain = keccak256(abi.encode(DOMAIN_TYPEHASH, keccak256("Permio Gateway Transport"),
            keccak256("1"), block.chainid, targetRegistry));
        address signer = ECDSA.recover(MessageHashUtils.toTypedDataHash(domain, structHash), signature);
        receipt = _receipt(wire, keccak256(bytes(keyId)), signedAt, signer);
    }

    function _validate(WireReceipt memory wire) private pure {
        if (wire.receiptVersion != RECEIPT_VERSION || wire.sourceTransaction.length != 33 ||
            wire.sourceLedgerSequence == 0 || !_version(wire.proofModuleVersion) || !_version(wire.templateVersion)) {
            revert InvalidM6Receipt();
        }
        bytes32 nameHash = keccak256(bytes(wire.sourceNetworkName));
        if (!((nameHash == keccak256("preprod") && wire.sourceNetwork == PREPROD) ||
            (nameHash == keccak256("undeployed") && wire.sourceNetwork == UNDEPLOYED))) revert InvalidM6Receipt();
        if (wire.transitionSequence == 0) {
            if (wire.previousStateCommitment != bytes32(0) || wire.nextStateCommitment != bytes32(0)) revert InvalidM6Receipt();
        } else if (wire.previousStateCommitment == bytes32(0) || wire.nextStateCommitment == bytes32(0) ||
            wire.previousStateCommitment == wire.nextStateCommitment) revert InvalidM6Receipt();
    }

    // M6 versions are three canonical unsigned uint64 decimal components.
    function _version(string memory version) private pure returns (bool) {
        bytes memory value = bytes(version);
        if (value.length < 5 || value.length > 62) return false;
        uint256 components;
        uint256 component;
        uint256 digits;
        bool leadingZero;
        for (uint256 i; i <= value.length; i++) {
            if (i == value.length || value[i] == bytes1(".")) {
                if (digits == 0) return false;
                components++;
                component = 0;
                digits = 0;
                leadingZero = false;
            } else {
                uint8 digit = uint8(value[i]);
                if (digit < 48 || digit > 57 || (digits > 0 && leadingZero)) return false;
                if (digits == 0) leadingZero = digit == 48;
                component = component * 10 + digit - 48;
                if (component > type(uint64).max) return false;
                digits++;
            }
        }
        return components == 3;
    }

    function _receipt(WireReceipt memory wire, bytes32 keyId, uint64 signedAt, address signer)
        private pure returns (VerifiedReceipt memory)
    {
        return VerifiedReceipt({
            receiptId:wire.receiptId, receiptVersion:wire.receiptVersion, proofModuleId:wire.proofModuleId,
            proofModuleVersion:wire.proofModuleVersion, proofModuleImplementationHash:wire.proofModuleImplementationHash,
            namespaceHash:wire.namespaceHash, templateIdHash:wire.templateIdHash, templateVersion:wire.templateVersion,
            templateContentHash:wire.templateContentHash, instanceCommitment:wire.instanceCommitment,
            previousStateCommitment:wire.previousStateCommitment, nextStateCommitment:wire.nextStateCommitment,
            transitionSequence:wire.transitionSequence, contextHash:wire.contextHash, actionSchemaId:wire.actionSchemaId,
            purposeHash:wire.purposeHash, recipient:wire.recipient, validAfter:wire.validAfter, validBefore:wire.validBefore,
            scopedNullifier:wire.scopedNullifier, outputCommitment:wire.outputCommitment,
            sourceNetwork:wire.sourceNetwork, sourceNetworkName:wire.sourceNetworkName, sourceContract:wire.sourceContract,
            sourceTransaction:wire.sourceTransaction, sourceLedgerSequence:wire.sourceLedgerSequence,
            gatewayKeyId:keyId, gatewaySignedAt:signedAt, gatewaySigner:signer
        });
    }
}
