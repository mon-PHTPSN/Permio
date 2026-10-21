// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.28;

import {IReceiptVerifier} from "./IReceiptVerifier.sol";

/**
 * @title IExecutionAdapter
 * @notice Executes one exact public action selected by registry governance.
 * @dev The adapter receives only public receipt fields and public execution
 *      parameters. It must not treat outputCommitment as additional authority.
 */
interface IExecutionAdapter {
    function execute(
        IReceiptVerifier.VerifiedReceipt calldata receipt,
        bytes calldata executionParameters
    ) external returns (bool success, bytes32 resultCommitment);
}
