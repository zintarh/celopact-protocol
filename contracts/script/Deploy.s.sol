// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {CeloPactEscrow} from "../src/CeloPactEscrow.sol";
import {ERC8004Adapter} from "../src/ERC8004Adapter.sol";

/// @title Deploy
/// @notice Deploys ERC8004Adapter + CeloPactEscrow to Celo Sepolia or Celo mainnet.
/// @dev Required environment variables:
///      DEPLOYER_PRIVATE_KEY  — wallet that pays for deployment
///      ORACLE_ADDRESS        — oracle wallet address (signs quality attestations)
///      USDT_ADDRESS          — USDT token address on target chain
///
///      Celo Sepolia USDT:  0xd077A400968890Eacc75cdc901F0356c943e4fDb (6 decimals)
///      Celo Mainnet USDT:  0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e (6 decimals)
///
///      ERC-8004 Registries (Celo Sepolia):
///        Identity:   0x8004A818BFB912233c491871b3d84c89A494BD9e
///        Reputation: 0x8004B663056A597Dffe9eCcC1965A193B7388713
///
///      ERC-8004 Registries (Celo Mainnet):
///        Identity:   0x8004A169FB4a3325136EB29fA0ceB6D2e539a432
///        Reputation: 0x8004BAa17C55a88189AE136b182e5fdA19dE9b63
///
///      forge script script/Deploy.s.sol \
///        --rpc-url celosepolia \
///        --broadcast \
///        --verify \
///        --verifier blockscout \
///        --verifier-url https://celo-sepolia.blockscout.com/api
contract Deploy is Script {
    // ERC-8004 registry addresses by chain ID
    address constant IDENTITY_SEPOLIA    = 0x8004A818BFB912233c491871b3d84c89A494BD9e;
    address constant REPUTATION_SEPOLIA  = 0x8004B663056A597Dffe9eCcC1965A193B7388713;
    address constant IDENTITY_MAINNET    = 0x8004A169FB4a3325136EB29fA0ceB6D2e539a432;
    address constant REPUTATION_MAINNET  = 0x8004BAa17C55a88189AE136b182e5fdA19dE9b63;

    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address oracle      = vm.envAddress("ORACLE_ADDRESS");
        // TOKEN_ADDRESS takes precedence; fallback to USDT_ADDRESS for backwards compat
        address token;
        try vm.envAddress("TOKEN_ADDRESS") returns (address t) { token = t; }
        catch { token = vm.envAddress("USDT_ADDRESS"); }

        bool isSepolia = block.chainid == 11142220;

        address identityReg   = isSepolia ? IDENTITY_SEPOLIA   : IDENTITY_MAINNET;
        address reputationReg = isSepolia ? REPUTATION_SEPOLIA : REPUTATION_MAINNET;

        vm.startBroadcast(deployerKey);

        ERC8004Adapter adapter = new ERC8004Adapter(identityReg, reputationReg);
        console.log("ERC8004Adapter deployed at:    ", address(adapter));
        console.log("  Identity Registry:           ", identityReg);
        console.log("  Reputation Registry:         ", reputationReg);

        CeloPactEscrow escrow = new CeloPactEscrow(address(adapter), token, oracle);
        adapter.setEscrowContract(address(escrow));
        console.log("CeloPactEscrow deployed at:    ", address(escrow));
        console.log("  Adapter (registry):          ", address(adapter));
        console.log("  Token:                       ", token);
        console.log("  Oracle:                      ", oracle);
        console.log("  Network:                     ", isSepolia ? "Celo Sepolia" : "Celo Mainnet");

        vm.stopBroadcast();
    }
}
