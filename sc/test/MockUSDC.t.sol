// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Test} from "forge-std/Test.sol";
import {MockUSDC} from "../src/MockUSDC.sol";

contract MockUSDCTest is Test {
    MockUSDC public usdc;

    function setUp() public {
        usdc = new MockUSDC();
    }

    function test_Decimals() public {
        assertEq(usdc.decimals(), 6);
    }

    function test_Mint() public {
        address user = address(1);
        uint256 amount = 1000 * 10 ** 6;
        usdc.mint(user, amount);
        assertEq(usdc.balanceOf(user), amount);
    }
}
