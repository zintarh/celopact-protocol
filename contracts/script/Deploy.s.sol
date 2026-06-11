// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {CeloPactEscrow} from "../src/CeloPactEscrow.sol";
import {MockAgentRegistry} from "../src/MockAgentRegistry.sol";

/// @title Deploy
/// @notice Deploys MockAgentRegistry + CeloPactEscrow to Celo Alfajores or Celo mainnet.
/// @dev Required environment variables:
///      DEPLOYER_PRIVATE_KEY  — wallet that pays for deployment
///      ORACLE_ADDRESS        — oracle wallet address (signs quality attestations)
///      USDT_ADDRESS          — USDT token address on target chain
///
///      Optional:
///      REGISTRY_ADDRESS      — skip registry deployment if already live
///
///      Alfajores USDT (cUSD proxy): 0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1
///
///      forge script script/Deploy.s.sol \
///        --rpc-url alfajores \
///        --broadcast \
///        --verify
contract Deploy is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address oracle      = vm.envAddress("ORACLE_ADDRESS");
        address usdt        = vm.envAddress("USDT_ADDRESS");

        // Use existing registry if provided; otherwise deploy MockAgentRegistry
        address registry;
        try vm.envAddress("REGISTRY_ADDRESS") returns (address r) {
            registry = r;
        } catch {
            registry = address(0);
        }

        vm.startBroadcast(deployerKey);

        if (registry == address(0)) {
            MockAgentRegistry reg = new MockAgentRegistry();
            registry = address(reg);
            console.log("MockAgentRegistry deployed at:", registry);
        } else {
            console.log("Using existing registry:      ", registry);
        }

        CeloPactEscrow escrow = new CeloPactEscrow(registry, usdt, oracle);

        console.log("CeloPactEscrow deployed at:   ", address(escrow));
        console.log("  Registry:                   ", registry);
        console.log("  USDT:                       ", usdt);
        console.log("  Oracle:                     ", oracle);
        console.log("  Network:                    ", block.chainid == 44787 ? "Alfajores" : "Celo Mainnet");

        vm.stopBroadcast();
    }
}
