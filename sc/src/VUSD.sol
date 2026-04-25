// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IVaultReceiptSync} from "./interfaces/IVaultReceiptSync.sol";

contract VUSD is ERC20, Ownable {
    error UnauthorizedMinter();
    error InvalidVault();

    address public vault;

    constructor(address initialOwner) ERC20("Vaulted USD Receipt", "vUSD") Ownable(initialOwner) {}

    function setVault(address vault_) external onlyOwner {
        if (vault_ == address(0)) {
            revert InvalidVault();
        }

        vault = vault_;
    }

    function mint(address to, uint256 amount) external {
        if (msg.sender != vault) {
            revert UnauthorizedMinter();
        }

        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external {
        if (msg.sender != vault) {
            revert UnauthorizedMinter();
        }

        _burn(from, amount);
    }

    function _update(address from, address to, uint256 value) internal override {
        if (vault != address(0)) {
            IVaultReceiptSync(vault).beforeReceiptTransfer(from, to);
        }

        super._update(from, to, value);

        if (vault != address(0)) {
            IVaultReceiptSync(vault).afterReceiptTransfer(from, to);
        }
    }
}
