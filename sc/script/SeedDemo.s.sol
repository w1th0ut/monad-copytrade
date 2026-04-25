// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Script, console2} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {TradingEngine} from "../src/TradingEngine.sol";
import {CopyTradeRegistry} from "../src/CopyTradeRegistry.sol";
import {Vault} from "../src/Vault.sol";

contract SeedDemo is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);

        address usdc = vm.envAddress("USDC_ADDRESS");
        address vaultAddr = vm.envAddress("VAULT_ADDRESS");
        address engineAddr = vm.envAddress("TRADING_ENGINE_ADDRESS");
        address registryAddr = vm.envAddress("COPY_TRADE_REGISTRY_ADDRESS");

        TradingEngine engine = TradingEngine(engineAddr);
        CopyTradeRegistry registry = CopyTradeRegistry(registryAddr);
        Vault vault = Vault(vaultAddr);
        IERC20 token = IERC20(usdc);

        vm.startBroadcast(deployerKey);

        // 1. Approve USDC for vault and engine
        token.approve(vaultAddr, type(uint256).max);
        token.approve(engineAddr, type(uint256).max);

        // 2. Seed vault with initial liquidity (10,000 USDC)
        vault.depositLiquidity(10_000e6);
        console2.log("Vault seeded with 10,000 USDC");

        // 3. Deposit trading balance (1,000 USDC)
        engine.deposit(1_000e6);
        console2.log("Deposited 1,000 USDC to trading engine");

        // 4. Register deployer as a Leader
        registry.registerLeader("DemoLeader");
        console2.log("Registered as leader: DemoLeader");

        vm.stopBroadcast();

        console2.log("Demo seed complete for:", deployer);
    }
}
