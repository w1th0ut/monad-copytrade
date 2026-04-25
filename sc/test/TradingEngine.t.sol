// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Test} from "forge-std/Test.sol";
import {MockUSDC} from "../src/MockUSDC.sol";
import {VUSD} from "../src/VUSD.sol";
import {Vault} from "../src/Vault.sol";
import {TradingEngine} from "../src/TradingEngine.sol";

contract TradingEngineTest is Test {
    MockUSDC public usdc;
    VUSD public vusd;
    Vault public vault;
    TradingEngine public engine;

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

        vm.startPrank(owner);
        vusd.setVault(address(vault));
        vusd.transferOwnership(address(vault));
        vault.setTradingEngine(address(engine));
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
}
