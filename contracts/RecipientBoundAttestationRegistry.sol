// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

/**
 * @title RecipientBoundAttestationRegistry
 * @notice Publishes short-lived, purpose-bound receipts derived from a private
 *         proof system without publishing the private subject or source data.
 * @dev The registry trusts explicitly authorized verifier keys. It does not
 *      verify a Midnight proof directly in this first implementation.
 */
contract RecipientBoundAttestationRegistry is EIP712, Ownable {
    string public constant SIGNING_DOMAIN = "Permio Recipient-Bound Attestation Registry";
    string public constant SIGNATURE_VERSION = "1";

    bytes32 public constant ATTESTATION_TYPEHASH = keccak256(
        "Attestation(bytes32 schemaId,bytes32 midnightNetworkIdHash,bytes32 midnightContractIdHash,bytes32 midnightTransactionIdHash,bytes32 actionCommitment,bytes32 scopedNullifier,bytes32 purposeHash,address recipient,uint64 issuedAt,uint64 expiresAt)"
    );

    struct Attestation {
        bytes32 schemaId;
        bytes32 midnightNetworkIdHash;
        bytes32 midnightContractIdHash;
        bytes32 midnightTransactionIdHash;
        bytes32 actionCommitment;
        bytes32 scopedNullifier;
        bytes32 purposeHash;
        address recipient;
        uint64 issuedAt;
        uint64 expiresAt;
    }

    struct AttestationRecord {
        bytes32 schemaId;
        bytes32 purposeHash;
        address recipient;
        address verifier;
        uint64 issuedAt;
        uint64 expiresAt;
        bool revoked;
    }

    mapping(address verifier => bool authorized) public authorizedVerifiers;
    mapping(bytes32 attestationId => AttestationRecord record) private records;
    mapping(bytes32 scopeKey => bool used) public usedScopes;

    error AttestationAlreadyRegistered(bytes32 attestationId);
    error AttestationNotFound(bytes32 attestationId);
    error AttestationAlreadyRevoked(bytes32 attestationId);
    error InvalidAttestationField();
    error InvalidAttestationTime(uint64 issuedAt, uint64 expiresAt);
    error InvalidVerifier(address verifier);
    error ScopeAlreadyUsed(bytes32 scopeKey);
    error UnauthorizedRevocation(address caller);
    error ZeroAddress();

    event VerifierAuthorizationChanged(address indexed verifier, bool authorized);
    event AttestationRegistered(
        bytes32 indexed attestationId,
        bytes32 indexed schemaId,
        address indexed recipient,
        bytes32 purposeHash,
        bytes32 actionCommitment,
        bytes32 midnightTransactionIdHash,
        uint64 expiresAt,
        address verifier
    );
    event AttestationRevoked(bytes32 indexed attestationId, address indexed revokedBy);

    constructor(address initialOwner, address initialVerifier)
        EIP712(SIGNING_DOMAIN, SIGNATURE_VERSION)
        Ownable(initialOwner)
    {
        if (initialOwner == address(0) || initialVerifier == address(0)) {
            revert ZeroAddress();
        }
        authorizedVerifiers[initialVerifier] = true;
        emit VerifierAuthorizationChanged(initialVerifier, true);
    }

    function setVerifier(address verifier, bool authorized) external onlyOwner {
        if (verifier == address(0)) revert ZeroAddress();
        authorizedVerifiers[verifier] = authorized;
        emit VerifierAuthorizationChanged(verifier, authorized);
    }

    function attestationDigest(Attestation calldata attestation) public view returns (bytes32) {
        return _hashTypedDataV4(_attestationStructHash(attestation));
    }

    function scopeKey(Attestation calldata attestation) public pure returns (bytes32) {
        return keccak256(
            abi.encode(
                attestation.schemaId,
                attestation.scopedNullifier,
                attestation.purposeHash,
                attestation.recipient
            )
        );
    }

    function registerAttestation(
        Attestation calldata attestation,
        bytes calldata verifierSignature
    ) external returns (bytes32 attestationId) {
        _validate(attestation);

        attestationId = attestationDigest(attestation);
        if (records[attestationId].recipient != address(0)) {
            revert AttestationAlreadyRegistered(attestationId);
        }

        bytes32 scopedUse = scopeKey(attestation);
        if (usedScopes[scopedUse]) revert ScopeAlreadyUsed(scopedUse);

        address verifier = ECDSA.recover(attestationId, verifierSignature);
        if (!authorizedVerifiers[verifier]) revert InvalidVerifier(verifier);

        usedScopes[scopedUse] = true;
        records[attestationId] = AttestationRecord({
            schemaId: attestation.schemaId,
            purposeHash: attestation.purposeHash,
            recipient: attestation.recipient,
            verifier: verifier,
            issuedAt: attestation.issuedAt,
            expiresAt: attestation.expiresAt,
            revoked: false
        });

        emit AttestationRegistered(
            attestationId,
            attestation.schemaId,
            attestation.recipient,
            attestation.purposeHash,
            attestation.actionCommitment,
            attestation.midnightTransactionIdHash,
            attestation.expiresAt,
            verifier
        );
    }

    function revoke(bytes32 attestationId) external {
        AttestationRecord storage record = records[attestationId];
        if (record.recipient == address(0)) revert AttestationNotFound(attestationId);
        if (record.revoked) revert AttestationAlreadyRevoked(attestationId);
        if (msg.sender != owner() && msg.sender != record.verifier) {
            revert UnauthorizedRevocation(msg.sender);
        }

        record.revoked = true;
        emit AttestationRevoked(attestationId, msg.sender);
    }

    function getRecord(bytes32 attestationId) external view returns (AttestationRecord memory) {
        AttestationRecord memory record = records[attestationId];
        if (record.recipient == address(0)) revert AttestationNotFound(attestationId);
        return record;
    }

    function isValid(bytes32 attestationId) public view returns (bool) {
        AttestationRecord memory record = records[attestationId];
        return
            record.recipient != address(0) &&
            !record.revoked &&
            record.issuedAt <= block.timestamp &&
            block.timestamp < record.expiresAt;
    }

    function isValidFor(
        bytes32 attestationId,
        bytes32 schemaId,
        bytes32 purposeHash,
        address recipient
    ) external view returns (bool) {
        AttestationRecord memory record = records[attestationId];
        return
            isValid(attestationId) &&
            record.schemaId == schemaId &&
            record.purposeHash == purposeHash &&
            record.recipient == recipient;
    }

    function _attestationStructHash(Attestation calldata attestation) private pure returns (bytes32) {
        return keccak256(
            abi.encode(
                ATTESTATION_TYPEHASH,
                attestation.schemaId,
                attestation.midnightNetworkIdHash,
                attestation.midnightContractIdHash,
                attestation.midnightTransactionIdHash,
                attestation.actionCommitment,
                attestation.scopedNullifier,
                attestation.purposeHash,
                attestation.recipient,
                attestation.issuedAt,
                attestation.expiresAt
            )
        );
    }

    function _validate(Attestation calldata attestation) private view {
        if (
            attestation.schemaId == bytes32(0) ||
            attestation.midnightNetworkIdHash == bytes32(0) ||
            attestation.midnightContractIdHash == bytes32(0) ||
            attestation.midnightTransactionIdHash == bytes32(0) ||
            attestation.actionCommitment == bytes32(0) ||
            attestation.scopedNullifier == bytes32(0) ||
            attestation.purposeHash == bytes32(0) ||
            attestation.recipient == address(0)
        ) {
            revert InvalidAttestationField();
        }

        if (
            attestation.issuedAt > block.timestamp ||
            attestation.expiresAt <= block.timestamp ||
            attestation.expiresAt <= attestation.issuedAt
        ) {
            revert InvalidAttestationTime(attestation.issuedAt, attestation.expiresAt);
        }
    }
}
