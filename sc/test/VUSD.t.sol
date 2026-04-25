// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Test} from "forge-std/Test.sol";
import {VUSD} from "../src/VUSD.sol";

contract MockVault {
    function beforeReceiptTransfer(address, address) external {}
    function afterReceiptTransfer(address, address) external {}
}

contract VUSDTest is Test {
    VUSD public vusd;
    MockVault public vault;
    address public user = makeAddr("user");

    function setUp() public {
        vault = new MockVault();
        vusd = new VUSD(address(this));
        vusd.setVault(address(vault));
        vusd.transferOwnership(address(vault));
    }

    function test_Mint() public {
        vm.prank(address(vault));
        vusd.mint(user, 1000);
        assertEq(vusd.balanceOf(user), 1000);
    }

    function test_Mint_RevertUnauthorized() public {
        vm.prank(user);
        vm.expectRevert();
        vusd.mint(user, 1000);
    }
}
