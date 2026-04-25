// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

interface IVaultReceiptSync {
    function beforeReceiptTransfer(address from, address to) external;

    function afterReceiptTransfer(address from, address to) external;
}
