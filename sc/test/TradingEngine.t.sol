// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Test} from "forge-std/Test.sol";
import {MockUSDC} from "../src/MockUSDC.sol";
import {VUSD} from "../src/VUSD.sol";
import {Vault} from "../src/Vault.sol";
import {TradingEngine} from "../src/TradingEngine.sol";
import {CopyTradeRegistry} from "../src/CopyTradeRegistry.sol";

contract TradingEngineTest is Test {
    MockUSDC public usdc;
    VUSD public vusd;
    Vault public vault;
    TradingEngine public engine;
    CopyTradeRegistry public registry;

    address public owner = makeAddr("owner");
    address public keeper = makeAddr("keeper");
    address public treasury = makeAddr("treasury");
    address public leader = makeAddr("leader");
    address public user = makeAddr("user");

    function setUp() public {
        usdc = new MockUSDC();
        vusd = new VUSD(owner);
        vault = new Vault(address(usdc), address(vusd), owner);
        engine = new TradingEngine(address(usdc), address(vault), keeper, treasury, owner);
        registry = new CopyTradeRegistry(address(engine), owner);

        vm.startPrank(owner);
        vusd.setVault(address(vault));
        vusd.transferOwnership(address(vault));
        vault.setTradingEngine(address(engine));
        engine.setCopyTradeRegistry(address(registry));
        vm.stopPrank();

        usdc.mint(user, 10000 * 1e6);
        vm.prank(user);
        usdc.approve(address(engine), type(uint256).max);
    }

    function test_DepositAndOpenPosition() public {
        vm.startPrank(user);
        engine.deposit(1000 * 1e6);
        uint256 posId = engine.openPosition(
            leader,
            keccak256("ETH/USD"),
            true, // isLong
            100 * 1e6, // margin
            10, // leverage
            2000 * 1e18, // entryPrice
            1900 * 1e18 // stopLoss
        );
        vm.stopPrank();

        assertEq(engine.idleBalance(user), 900 * 1e6);
        (,,,,, uint256 margin,,,,) = engine.positions(posId);
        assertEq(margin, 100 * 1e6);
    }

    function test_KeeperCanMirrorFollowerTrade() public {
        vm.prank(user);
        engine.deposit(1000 * 1e6);

        vm.prank(leader);
        registry.registerLeader("leader");

        vm.prank(user);
        registry.followLeader(leader, 10 * 1e6, 5, 1000); // 10% max loss

        vm.prank(keeper);
        uint256 mirroredId =
            engine.mirrorTradeFor(user, leader, keccak256("ETH/USD"), true, 2000 * 1e18);

        assertEq(engine.idleBalance(user), 990 * 1e6);
        (
            address trader,
            address mirroredLeader,
            ,
            ,
            ,
            uint256 margin,
            uint256 lev,
            ,
            uint256 entryPrice,
            uint256 stopLossPrice
        ) = engine.positions(mirroredId);
        assertEq(trader, user);
        assertEq(mirroredLeader, leader);
        assertEq(margin, 10 * 1e6);
        assertEq(lev, 5);
        assertGt(entryPrice, stopLossPrice);
    }
}
