// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Test} from "forge-std/Test.sol";
import {MockUSDC} from "../src/MockUSDC.sol";
import {VUSD} from "../src/VUSD.sol";
import {Vault} from "../src/Vault.sol";

contract VaultTest is Test {
    MockUSDC public usdc;
    VUSD public vusd;
    Vault public vault;

    address public owner = makeAddr("owner");
    address public tradingEngine = makeAddr("tradingEngine");
    address public user = makeAddr("user");

    function setUp() public {
        usdc = new MockUSDC();
        vusd = new VUSD(owner);
        vault = new Vault(address(usdc), address(vusd), owner);

        vm.startPrank(owner);
        vusd.setVault(address(vault));
        vusd.transferOwnership(address(vault));
        vault.setTradingEngine(tradingEngine);
        vm.stopPrank();

        usdc.mint(user, 10000 * 1e6);
        vm.prank(user);
        usdc.approve(address(vault), type(uint256).max);
    }

    function test_DepositLiquidity() public {
        vm.prank(user);
        vault.depositLiquidity(1000 * 1e6);
        assertEq(vault.totalManualLiquidity(), 1000 * 1e6);
        assertEq(usdc.balanceOf(address(vault)), 1000 * 1e6);
    }

    function test_LockLossToLP() public {
        uint256 lossAmount = 500 * 1e6;
        usdc.mint(tradingEngine, lossAmount);
        
        vm.startPrank(tradingEngine);
        usdc.approve(address(vault), type(uint256).max);
        vault.lockLossToLP(user, lossAmount);
        vm.stopPrank();

        assertEq(vault.totalLockedLossLiquidity(), lossAmount);
        assertEq(vusd.balanceOf(user), lossAmount);
    }

    function test_NotifyFeeIncomeAndClaimYield() public {
        // First, lock some loss so user has vUSD
        uint256 lossAmount = 500 * 1e6;
        usdc.mint(tradingEngine, lossAmount);
        
        vm.startPrank(tradingEngine);
        usdc.approve(address(vault), type(uint256).max);
        vault.lockLossToLP(user, lossAmount);
        vm.stopPrank();

        // Now, notify fee income (simulate yield)
        uint256 feeIncome = 100 * 1e6;
        usdc.mint(tradingEngine, feeIncome);

        vm.startPrank(tradingEngine);
        usdc.approve(address(vault), feeIncome);
        vault.notifyFeeIncome(feeIncome);
        vm.stopPrank();

        // Check claimable yield
        uint256 claimable = vault.previewClaimableYield(user);
        assertEq(claimable, feeIncome); // User owns 100% of vUSD supply

        // Claim yield
        uint256 balanceBefore = usdc.balanceOf(user);
        vm.prank(user);
        uint256 claimed = vault.claimYield();
        
        assertEq(claimed, feeIncome);
        assertEq(usdc.balanceOf(user) - balanceBefore, feeIncome);
    }
}
