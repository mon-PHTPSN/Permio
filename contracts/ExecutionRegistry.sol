// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.28;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import {IExecutionAdapter} from "./interfaces/IExecutionAdapter.sol";
import {IReceiptVerifier} from "./interfaces/IReceiptVerifier.sol";

/**
 * @title ExecutionRegistry
 * @notice Registers narrow public authorization receipts and routes each one
 *         once to the exact approved execution adapter.
 * @dev This contract never receives private M5/M6 material and never decides
 *      whether a private proof was sufficient. A version-specific verifier
 *      decodes the M7 envelope; this registry enforces public execution policy.
 */
contract ExecutionRegistry is AccessControl, Pausable, ReentrancyGuard {
    bytes32 public constant RECEIPT_SCHEMA_ADMIN_ROLE =
        keccak256("RECEIPT_SCHEMA_ADMIN_ROLE");
    bytes32 public constant SOURCE_ADMIN_ROLE = keccak256("SOURCE_ADMIN_ROLE");
    bytes32 public constant GATEWAY_KEY_MANAGER_ROLE =
        keccak256("GATEWAY_KEY_MANAGER_ROLE");
    bytes32 public constant ADAPTER_REGISTRAR_ROLE =
        keccak256("ADAPTER_REGISTRAR_ROLE");
    bytes32 public constant EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");

    struct GatewayKeyEpoch {
        address signer;
        uint64 validAfter;
        uint64 validBefore;
        bool disabled;
    }

    struct AdapterRegistration {
        address adapter;
        bool enabled;
    }

    struct ReceiptRecord {
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
        address gatewaySigner;
        uint64 registeredAt;
        bool revoked;
        bool consumed;
    }

    struct ExecutionRecord {
        bytes32 receiptId;
        address adapter;
        address relayer;
        bool success;
        bytes32 resultCommitment;
        bytes32 errorHash;
        uint64 executedAt;
    }

    mapping(bytes32 receiptVersion => address verifier) public receiptVerifiers;
    mapping(bytes32 sourceKey => bool authorized) public authorizedSources;
    mapping(bytes32 gatewayKeyId => GatewayKeyEpoch epoch) public gatewayKeyEpochs;
    mapping(bytes32 adapterKey => AdapterRegistration registration) public adapters;
    mapping(bytes32 receiptId => ReceiptRecord record) private receiptRecords;
    mapping(bytes32 receiptId => bool exists) private receiptExists;
    mapping(bytes32 scopedUseKey => bool used) public usedScopedNullifiers;
    mapping(bytes32 executionId => ExecutionRecord record) private executionRecords;
    mapping(bytes32 executionId => bool exists) private executionExists;

    uint256 public executionSequence;

    error DuplicateInitialAuthority(address authority);
    error ZeroAddress();
    error AddressHasNoCode(address account);
    error InvalidTimeWindow(uint64 validAfter, uint64 validBefore);
    error ReceiptVerifierNotConfigured(bytes32 receiptVersion);
    error ReceiptVersionMismatch(bytes32 expected, bytes32 actual);
    error InvalidReceiptField();
    error ReceiptNotYetValid(uint64 validAfter);
    error ReceiptExpired(uint64 validBefore);
    error UnauthorizedSource(bytes32 sourceKey);
    error GatewayKeyNotFound(bytes32 gatewayKeyId);
    error GatewayKeyDisabled(bytes32 gatewayKeyId);
    error GatewaySignerMismatch(address expected, address actual);
    error GatewaySignatureOutsideEpoch(bytes32 gatewayKeyId, uint64 signedAt);
    error GatewaySignatureFromFuture(uint64 signedAt);
    error ReceiptAlreadyRegistered(bytes32 receiptId);
    error ScopedNullifierAlreadyUsed(bytes32 scopedUseKey);
    error ReceiptNotFound(bytes32 receiptId);
    error ExecutionNotFound(bytes32 executionId);
    error ReceiptAlreadyRevoked(bytes32 receiptId);
    error ReceiptAlreadyConsumed(bytes32 receiptId);
    error AdapterNotConfigured(bytes32 adapterKey);
    error RecipientAdapterMismatch(address recipient, address adapter);
    error GatewayKeyAlreadyRegistered(bytes32 gatewayKeyId);
    error ReceiptVersionAlreadyConfigured(bytes32 receiptVersion);
    error AdapterAlreadyRegistered(bytes32 adapterKey);

    event ReceiptVerifierConfigured(
        bytes32 indexed receiptVersion,
        address indexed verifier
    );
    event SourceAuthorizationChanged(
        bytes32 indexed sourceKey,
        bytes32 indexed sourceNetwork,
        bytes32 indexed sourceContract,
        bool authorized
    );
    event GatewayKeyEpochRegistered(
        bytes32 indexed gatewayKeyId,
        address indexed signer,
        uint64 validAfter,
        uint64 validBefore
    );
    event GatewayKeyEpochDisabled(
        bytes32 indexed gatewayKeyId,
        address indexed signer
    );
    event AdapterRegistered(
        bytes32 indexed adapterKey,
        bytes32 indexed receiptVersion,
        bytes32 indexed actionSchemaId,
        address adapter
    );
    event AdapterDisabled(
        bytes32 indexed adapterKey,
        bytes32 indexed receiptVersion,
        bytes32 indexed actionSchemaId,
        address adapter
    );
    event ReceiptRegistered(
        bytes32 indexed receiptId,
        bytes32 indexed receiptVersion,
        address indexed recipient,
        bytes32 actionSchemaId,
        bytes32 purposeHash,
        uint64 validAfter,
        uint64 validBefore,
        bytes32 scopedNullifier,
        bytes32 outputCommitment,
        bytes32 gatewayKeyId,
        address gatewaySigner,
        uint64 registeredAt
    );
    event ReceiptSourceBound(
        bytes32 indexed receiptId,
        bytes32 sourceNetwork,
        bytes32 sourceContract,
        bytes32 sourceTransaction,
        uint64 sourceLedgerSequence,
        uint64 gatewaySignedAt
    );
    event ReceiptImplementationBound(
        bytes32 indexed receiptId,
        bytes32 namespaceHash,
        bytes32 templateIdHash,
        bytes32 templateVersion,
        bytes32 templateContentHash,
        bytes32 proofModuleId,
        bytes32 proofModuleVersion,
        bytes32 proofModuleImplementationHash
    );
    event ReceiptStateBound(
        bytes32 indexed receiptId,
        bytes32 instanceCommitment,
        bytes32 previousStateCommitment,
        bytes32 nextStateCommitment,
        uint64 transitionSequence,
        bytes32 contextHash
    );
    event ReceiptRevoked(bytes32 indexed receiptId, address indexed revokedBy);
    event ExecutionRecorded(
        bytes32 indexed executionId,
        bytes32 indexed receiptId,
        address indexed adapter,
        bytes32 actionSchemaId,
        address relayer,
        address recipient,
        bool success,
        bytes32 resultCommitment,
        bytes32 errorHash,
        uint64 executedAt
    );

    constructor(
        address initialAdmin,
        address initialReceiptSchemaAdmin,
        address initialSourceAdmin,
        address initialGatewayKeyManager,
        address initialAdapterRegistrar,
        address initialEmergencyAuthority
    ) {
        address[6] memory authorities = [
            initialAdmin,
            initialReceiptSchemaAdmin,
            initialSourceAdmin,
            initialGatewayKeyManager,
            initialAdapterRegistrar,
            initialEmergencyAuthority
        ];

        for (uint256 i = 0; i < authorities.length; i++) {
            if (authorities[i] == address(0)) revert ZeroAddress();
            for (uint256 j = 0; j < i; j++) {
                if (authorities[i] == authorities[j]) {
                    revert DuplicateInitialAuthority(authorities[i]);
                }
            }
        }

        _grantRole(DEFAULT_ADMIN_ROLE, initialAdmin);
        _grantRole(RECEIPT_SCHEMA_ADMIN_ROLE, initialReceiptSchemaAdmin);
        _grantRole(SOURCE_ADMIN_ROLE, initialSourceAdmin);
        _grantRole(GATEWAY_KEY_MANAGER_ROLE, initialGatewayKeyManager);
        _grantRole(ADAPTER_REGISTRAR_ROLE, initialAdapterRegistrar);
        _grantRole(EMERGENCY_ROLE, initialEmergencyAuthority);
    }

    function configureReceiptVerifier(
        bytes32 receiptVersion,
        address verifier
    ) external onlyRole(RECEIPT_SCHEMA_ADMIN_ROLE) {
        if (receiptVersion == bytes32(0)) revert InvalidReceiptField();
        if (verifier == address(0)) revert ZeroAddress();
        if (verifier.code.length == 0) revert AddressHasNoCode(verifier);
        if (receiptVerifiers[receiptVersion] != address(0)) {
            revert ReceiptVersionAlreadyConfigured(receiptVersion);
        }
        receiptVerifiers[receiptVersion] = verifier;
        emit ReceiptVerifierConfigured(receiptVersion, verifier);
    }

    function setSource(
        bytes32 sourceNetwork,
        bytes32 sourceContract,
        bool authorized
    ) external onlyRole(SOURCE_ADMIN_ROLE) {
        if (sourceNetwork == bytes32(0) || sourceContract == bytes32(0)) {
            revert InvalidReceiptField();
        }
        bytes32 key = sourceKey(sourceNetwork, sourceContract);
        authorizedSources[key] = authorized;
        emit SourceAuthorizationChanged(
            key,
            sourceNetwork,
            sourceContract,
            authorized
        );
    }

    function registerGatewayKeyEpoch(
        bytes32 gatewayKeyId,
        address signer,
        uint64 validAfter,
        uint64 validBefore
    ) external onlyRole(GATEWAY_KEY_MANAGER_ROLE) {
        if (gatewayKeyId == bytes32(0)) revert InvalidReceiptField();
        if (signer == address(0)) revert ZeroAddress();
        if (validBefore <= validAfter) {
            revert InvalidTimeWindow(validAfter, validBefore);
        }
        if (gatewayKeyEpochs[gatewayKeyId].signer != address(0)) {
            revert GatewayKeyAlreadyRegistered(gatewayKeyId);
        }

        gatewayKeyEpochs[gatewayKeyId] = GatewayKeyEpoch({
            signer: signer,
            validAfter: validAfter,
            validBefore: validBefore,
            disabled: false
        });
        emit GatewayKeyEpochRegistered(
            gatewayKeyId,
            signer,
            validAfter,
            validBefore
        );
    }

    function disableGatewayKeyEpoch(
        bytes32 gatewayKeyId
    ) external onlyRole(GATEWAY_KEY_MANAGER_ROLE) {
        GatewayKeyEpoch storage epoch = gatewayKeyEpochs[gatewayKeyId];
        if (epoch.signer == address(0)) revert GatewayKeyNotFound(gatewayKeyId);
        epoch.disabled = true;
        emit GatewayKeyEpochDisabled(gatewayKeyId, epoch.signer);
    }

    function registerAdapter(
        bytes32 receiptVersion,
        bytes32 actionSchemaId,
        address adapter
    ) external onlyRole(ADAPTER_REGISTRAR_ROLE) {
        if (receiptVersion == bytes32(0) || actionSchemaId == bytes32(0)) {
            revert InvalidReceiptField();
        }
        if (adapter == address(0)) revert ZeroAddress();
        if (adapter.code.length == 0) revert AddressHasNoCode(adapter);
        bytes32 key = adapterKey(receiptVersion, actionSchemaId);
        if (adapters[key].adapter != address(0)) {
            revert AdapterAlreadyRegistered(key);
        }
        adapters[key] = AdapterRegistration({adapter: adapter, enabled: true});
        emit AdapterRegistered(key, receiptVersion, actionSchemaId, adapter);
    }

    function disableAdapter(
        bytes32 receiptVersion,
        bytes32 actionSchemaId
    ) external onlyRole(ADAPTER_REGISTRAR_ROLE) {
        bytes32 key = adapterKey(receiptVersion, actionSchemaId);
        AdapterRegistration storage registration = adapters[key];
        if (registration.adapter == address(0) || !registration.enabled) {
            revert AdapterNotConfigured(key);
        }
        registration.enabled = false;
        emit AdapterDisabled(
            key,
            receiptVersion,
            actionSchemaId,
            registration.adapter
        );
    }

    function pause() external onlyRole(EMERGENCY_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(EMERGENCY_ROLE) {
        _unpause();
    }

    function registerReceipt(
        bytes32 receiptVersion,
        bytes calldata encodedReceipt,
        bytes calldata gatewaySignature
    ) external whenNotPaused returns (bytes32 receiptId) {
        address verifier = receiptVerifiers[receiptVersion];
        if (verifier == address(0)) {
            revert ReceiptVerifierNotConfigured(receiptVersion);
        }

        IReceiptVerifier.VerifiedReceipt memory receipt = IReceiptVerifier(verifier)
            .verify(encodedReceipt, gatewaySignature);
        if (receipt.receiptVersion != receiptVersion) {
            revert ReceiptVersionMismatch(
                receiptVersion,
                receipt.receiptVersion
            );
        }
        _validateReceipt(receipt);

        receiptId = receipt.receiptId;
        if (receiptExists[receiptId]) {
            revert ReceiptAlreadyRegistered(receiptId);
        }

        bytes32 scopedUse = scopedUseKey(receipt);
        if (usedScopedNullifiers[scopedUse]) {
            revert ScopedNullifierAlreadyUsed(scopedUse);
        }
        usedScopedNullifiers[scopedUse] = true;

        uint64 registeredAt = uint64(block.timestamp);
        receiptRecords[receiptId] = ReceiptRecord({
            receiptVersion: receipt.receiptVersion,
            proofModuleId: receipt.proofModuleId,
            proofModuleVersion: receipt.proofModuleVersion,
            proofModuleImplementationHash: receipt.proofModuleImplementationHash,
            namespaceHash: receipt.namespaceHash,
            templateIdHash: receipt.templateIdHash,
            templateVersion: receipt.templateVersion,
            templateContentHash: receipt.templateContentHash,
            instanceCommitment: receipt.instanceCommitment,
            previousStateCommitment: receipt.previousStateCommitment,
            nextStateCommitment: receipt.nextStateCommitment,
            transitionSequence: receipt.transitionSequence,
            contextHash: receipt.contextHash,
            actionSchemaId: receipt.actionSchemaId,
            purposeHash: receipt.purposeHash,
            recipient: receipt.recipient,
            validAfter: receipt.validAfter,
            validBefore: receipt.validBefore,
            scopedNullifier: receipt.scopedNullifier,
            outputCommitment: receipt.outputCommitment,
            sourceNetwork: receipt.sourceNetwork,
            sourceContract: receipt.sourceContract,
            sourceTransaction: receipt.sourceTransaction,
            sourceLedgerSequence: receipt.sourceLedgerSequence,
            gatewayKeyId: receipt.gatewayKeyId,
            gatewaySignedAt: receipt.gatewaySignedAt,
            gatewaySigner: receipt.gatewaySigner,
            registeredAt: registeredAt,
            revoked: false,
            consumed: false
        });
        receiptExists[receiptId] = true;

        emit ReceiptRegistered(
            receiptId,
            receipt.receiptVersion,
            receipt.recipient,
            receipt.actionSchemaId,
            receipt.purposeHash,
            receipt.validAfter,
            receipt.validBefore,
            receipt.scopedNullifier,
            receipt.outputCommitment,
            receipt.gatewayKeyId,
            receipt.gatewaySigner,
            registeredAt
        );
        emit ReceiptSourceBound(
            receiptId,
            receipt.sourceNetwork,
            receipt.sourceContract,
            receipt.sourceTransaction,
            receipt.sourceLedgerSequence,
            receipt.gatewaySignedAt
        );
        emit ReceiptImplementationBound(
            receiptId,
            receipt.namespaceHash,
            receipt.templateIdHash,
            receipt.templateVersion,
            receipt.templateContentHash,
            receipt.proofModuleId,
            receipt.proofModuleVersion,
            receipt.proofModuleImplementationHash
        );
        emit ReceiptStateBound(
            receiptId,
            receipt.instanceCommitment,
            receipt.previousStateCommitment,
            receipt.nextStateCommitment,
            receipt.transitionSequence,
            receipt.contextHash
        );
    }

    function executeReceipt(
        bytes32 receiptId,
        bytes calldata executionParameters
    ) external whenNotPaused nonReentrant returns (bytes32 executionId) {
        ReceiptRecord storage record = receiptRecords[receiptId];
        if (!receiptExists[receiptId]) revert ReceiptNotFound(receiptId);
        if (record.revoked) revert ReceiptAlreadyRevoked(receiptId);
        if (record.consumed) revert ReceiptAlreadyConsumed(receiptId);
        if (block.timestamp < record.validAfter) {
            revert ReceiptNotYetValid(record.validAfter);
        }
        if (block.timestamp >= record.validBefore) {
            revert ReceiptExpired(record.validBefore);
        }

        bytes32 key = adapterKey(
            record.receiptVersion,
            record.actionSchemaId
        );
        AdapterRegistration memory registration = adapters[key];
        if (registration.adapter == address(0) || !registration.enabled) {
            revert AdapterNotConfigured(key);
        }
        if (record.recipient != registration.adapter) {
            revert RecipientAdapterMismatch(
                record.recipient,
                registration.adapter
            );
        }

        record.consumed = true;
        uint256 sequence = executionSequence++;
        executionId = keccak256(
            abi.encode(block.chainid, address(this), receiptId, sequence)
        );

        IReceiptVerifier.VerifiedReceipt memory receipt = _verifiedReceipt(
            receiptId,
            record
        );
        bool success;
        bytes32 resultCommitment;
        bytes32 errorHash;

        try
            IExecutionAdapter(registration.adapter).execute(
                receipt,
                executionParameters
            )
        returns (bool adapterSuccess, bytes32 adapterResultCommitment) {
            success = adapterSuccess;
            resultCommitment = adapterResultCommitment;
        } catch (bytes memory reason) {
            success = false;
            errorHash = keccak256(reason);
        }

        uint64 executedAt = uint64(block.timestamp);
        executionRecords[executionId] = ExecutionRecord({
            receiptId: receiptId,
            adapter: registration.adapter,
            relayer: msg.sender,
            success: success,
            resultCommitment: resultCommitment,
            errorHash: errorHash,
            executedAt: executedAt
        });
        executionExists[executionId] = true;

        emit ExecutionRecorded(
            executionId,
            receiptId,
            registration.adapter,
            record.actionSchemaId,
            msg.sender,
            record.recipient,
            success,
            resultCommitment,
            errorHash,
            executedAt
        );
    }

    function revokeReceipt(
        bytes32 receiptId
    ) external onlyRole(EMERGENCY_ROLE) {
        ReceiptRecord storage record = receiptRecords[receiptId];
        if (!receiptExists[receiptId]) revert ReceiptNotFound(receiptId);
        if (record.revoked) revert ReceiptAlreadyRevoked(receiptId);
        record.revoked = true;
        emit ReceiptRevoked(receiptId, msg.sender);
    }

    function getReceipt(
        bytes32 receiptId
    ) external view returns (ReceiptRecord memory record) {
        record = receiptRecords[receiptId];
        if (!receiptExists[receiptId]) revert ReceiptNotFound(receiptId);
    }

    function getExecution(
        bytes32 executionId
    ) external view returns (ExecutionRecord memory record) {
        record = executionRecords[executionId];
        if (!executionExists[executionId]) {
            revert ExecutionNotFound(executionId);
        }
    }

    function sourceKey(
        bytes32 sourceNetwork,
        bytes32 sourceContract
    ) public pure returns (bytes32) {
        return keccak256(abi.encode(sourceNetwork, sourceContract));
    }

    function adapterKey(
        bytes32 receiptVersion,
        bytes32 actionSchemaId
    ) public pure returns (bytes32) {
        return keccak256(abi.encode(receiptVersion, actionSchemaId));
    }

    function scopedUseKey(
        IReceiptVerifier.VerifiedReceipt memory receipt
    ) public pure returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    receipt.receiptVersion,
                    receipt.sourceNetwork,
                    receipt.sourceContract,
                    receipt.scopedNullifier
                )
            );
    }

    function _validateReceipt(
        IReceiptVerifier.VerifiedReceipt memory receipt
    ) private view {
        if (
            receipt.receiptId == bytes32(0) ||
            receipt.receiptVersion == bytes32(0) ||
            receipt.proofModuleId == bytes32(0) ||
            receipt.proofModuleVersion == bytes32(0) ||
            receipt.proofModuleImplementationHash == bytes32(0) ||
            receipt.namespaceHash == bytes32(0) ||
            receipt.templateIdHash == bytes32(0) ||
            receipt.templateVersion == bytes32(0) ||
            receipt.templateContentHash == bytes32(0) ||
            receipt.instanceCommitment == bytes32(0) ||
            receipt.contextHash == bytes32(0) ||
            receipt.actionSchemaId == bytes32(0) ||
            receipt.purposeHash == bytes32(0) ||
            receipt.recipient == address(0) ||
            receipt.scopedNullifier == bytes32(0) ||
            receipt.outputCommitment == bytes32(0) ||
            receipt.sourceNetwork == bytes32(0) ||
            receipt.sourceContract == bytes32(0) ||
            receipt.sourceTransaction == bytes32(0) ||
            receipt.gatewayKeyId == bytes32(0) ||
            receipt.gatewaySigner == address(0)
        ) {
            revert InvalidReceiptField();
        }
        if (receipt.validBefore <= receipt.validAfter) {
            revert InvalidTimeWindow(receipt.validAfter, receipt.validBefore);
        }
        if (block.timestamp < receipt.validAfter) {
            revert ReceiptNotYetValid(receipt.validAfter);
        }
        if (block.timestamp >= receipt.validBefore) {
            revert ReceiptExpired(receipt.validBefore);
        }

        bytes32 source = sourceKey(
            receipt.sourceNetwork,
            receipt.sourceContract
        );
        if (!authorizedSources[source]) revert UnauthorizedSource(source);

        GatewayKeyEpoch memory epoch = gatewayKeyEpochs[receipt.gatewayKeyId];
        if (epoch.signer == address(0)) {
            revert GatewayKeyNotFound(receipt.gatewayKeyId);
        }
        if (epoch.disabled) revert GatewayKeyDisabled(receipt.gatewayKeyId);
        if (epoch.signer != receipt.gatewaySigner) {
            revert GatewaySignerMismatch(epoch.signer, receipt.gatewaySigner);
        }
        if (
            receipt.gatewaySignedAt < epoch.validAfter ||
            receipt.gatewaySignedAt >= epoch.validBefore
        ) {
            revert GatewaySignatureOutsideEpoch(
                receipt.gatewayKeyId,
                receipt.gatewaySignedAt
            );
        }
        if (receipt.gatewaySignedAt > block.timestamp) {
            revert GatewaySignatureFromFuture(receipt.gatewaySignedAt);
        }
    }

    function _verifiedReceipt(
        bytes32 receiptId,
        ReceiptRecord storage record
    ) private view returns (IReceiptVerifier.VerifiedReceipt memory) {
        return
            IReceiptVerifier.VerifiedReceipt({
                receiptId: receiptId,
                receiptVersion: record.receiptVersion,
                proofModuleId: record.proofModuleId,
                proofModuleVersion: record.proofModuleVersion,
                proofModuleImplementationHash: record
                    .proofModuleImplementationHash,
                namespaceHash: record.namespaceHash,
                templateIdHash: record.templateIdHash,
                templateVersion: record.templateVersion,
                templateContentHash: record.templateContentHash,
                instanceCommitment: record.instanceCommitment,
                previousStateCommitment: record.previousStateCommitment,
                nextStateCommitment: record.nextStateCommitment,
                transitionSequence: record.transitionSequence,
                contextHash: record.contextHash,
                actionSchemaId: record.actionSchemaId,
                purposeHash: record.purposeHash,
                recipient: record.recipient,
                validAfter: record.validAfter,
                validBefore: record.validBefore,
                scopedNullifier: record.scopedNullifier,
                outputCommitment: record.outputCommitment,
                sourceNetwork: record.sourceNetwork,
                sourceContract: record.sourceContract,
                sourceTransaction: record.sourceTransaction,
                sourceLedgerSequence: record.sourceLedgerSequence,
                gatewayKeyId: record.gatewayKeyId,
                gatewaySignedAt: record.gatewaySignedAt,
                gatewaySigner: record.gatewaySigner
            });
    }
}
