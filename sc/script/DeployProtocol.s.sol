// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Script, console2} from "forge-std/Script.sol";
import {VUSD} from "../src/VUSD.sol";
import {Vault} from "../src/Vault.sol";
import {TradingEngine} from "../src/TradingEngine.sol";
import {CopyTradeRegistry} from "../src/CopyTradeRegistry.sol";
import {MockUSDC} from "../src/MockUSDC.sol";

contract DeployProtocol is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        // Parse optional address envs via string to tolerate empty values
        string memory usdcRaw = vm.envOr("USDC_ADDRESS", string(""));
        string memory keeperRaw = vm.envOr("KEEPER_ADDRESS", string(""));
        string memory treasuryRaw = vm.envOr("TREASURY_ADDRESS", string(""));

        address usdc = bytes(usdcRaw).length == 42 ? vm.parseAddress(usdcRaw) : address(0);
        address keeper = bytes(keeperRaw).length == 42 ? vm.parseAddress(keeperRaw) : deployer;
        address treasury =
            bytes(treasuryRaw).length == 42 ? vm.parseAddress(treasuryRaw) : deployer;

        vm.startBroadcast(deployerPrivateKey);

        // Auto-deploy MockUSDC when no canonical USDC address is provided
        if (usdc == address(0)) {
            MockUSDC mock = new MockUSDC();
            mock.mint(deployer, 1_000_000e6); // 1M USDC to deployer for demo
            usdc = address(mock);
            console2.log("MockUSDC deployed (1M minted to deployer):", usdc);
        } else {
            console2.log("Using existing USDC:", usdc);
        }

        VUSD receiptToken = new VUSD(deployer);
        Vault vault = new Vault(usdc, address(receiptToken), deployer);
        TradingEngine tradingEngine =
            new TradingEngine(usdc, address(vault), keeper, treasury, deployer);
        CopyTradeRegistry registry = new CopyTradeRegistry(address(tradingEngine), deployer);

        receiptToken.setVault(address(vault));
        receiptToken.transferOwnership(address(vault));
        vault.setTradingEngine(address(tradingEngine));
        vault.setTreasury(treasury);
        tradingEngine.setCopyTradeRegistry(address(registry));

        vm.stopBroadcast();

        console2.log("USDC:         ", usdc);
        console2.log("VUSD:         ", address(receiptToken));
        console2.log("Vault:        ", address(vault));
        console2.log("TradingEngine:", address(tradingEngine));
        console2.log("CopyTradeRegistry:", address(registry));
    }
}
