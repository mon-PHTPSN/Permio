// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.28;

import {IExecutionAdapter} from "../interfaces/IExecutionAdapter.sol";
import {IReceiptVerifier} from "../interfaces/IReceiptVerifier.sol";

/**
 * @title RecordingExecutionAdapter
 * @notice TEST FIXTURE ONLY. Records one exact public execution request.
 */
contract RecordingExecutionAdapter is IExecutionAdapter {
    bool public constant FIXTURE_ONLY = true;

    address public immutable registry;
    bool public returnFailure;
    bool public revertExecution;
    bytes32 public lastReceiptId;
    bytes32 public lastParametersHash;

    error OnlyRegistry(address caller);
    error ExecutionRevertedForTest();

    constructor(address registryAddress) {
        registry = registryAddress;
    }

    function setFailureMode(bool shouldReturnFailure, bool shouldRevert) external {
        returnFailure = shouldReturnFailure;
        revertExecution = shouldRevert;
    }

    function execute(
        IReceiptVerifier.VerifiedReceipt calldata receipt,
        bytes calldata executionParameters
    ) external returns (bool success, bytes32 resultCommitment) {
        if (msg.sender != registry) revert OnlyRegistry(msg.sender);
        if (revertExecution) revert ExecutionRevertedForTest();

        lastReceiptId = receipt.receiptId;
        lastParametersHash = keccak256(executionParameters);
        resultCommitment = keccak256(
            abi.encode(receipt.receiptId, lastParametersHash)
        );
        success = !returnFailure;
    }
}
