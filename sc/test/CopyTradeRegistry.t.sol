// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Test} from "forge-std/Test.sol";
import {CopyTradeRegistry} from "../src/CopyTradeRegistry.sol";

contract CopyTradeRegistryTest is Test {
    CopyTradeRegistry public registry;
    address public engine = makeAddr("engine");
    address public owner = makeAddr("owner");
    address public user = makeAddr("user");
    address public leader = makeAddr("leader");

    function setUp() public {
        registry = new CopyTradeRegistry(engine, owner);
    }

    function test_FollowUnfollow() public {
        vm.prank(user);
        registry.followLeader(leader, 100 * 1e6, 10, 500); // 500 bps stop loss
        
        (bool isActive, uint256 maxMargin, uint256 maxLeverage, uint256 stopLossBps) = registry.subscriptions(user, leader);
        assertTrue(isActive);
        assertEq(maxMargin, 100 * 1e6);
        assertEq(maxLeverage, 10);
        assertEq(stopLossBps, 500);

        vm.prank(user);
        registry.unfollowLeader(leader);

        (bool isStillActive,,,) = registry.subscriptions(user, leader);
        assertFalse(isStillActive);
    }
}
