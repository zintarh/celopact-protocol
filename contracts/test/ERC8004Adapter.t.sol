// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ERC8004Adapter} from "../src/ERC8004Adapter.sol";

/// @notice Tests access control on ERC8004Adapter.recordOutcome().
/// @dev Identity/Reputation registries are not exercised here — only caller gating.
contract ERC8004AdapterTest is Test {
    ERC8004Adapter public adapter;
    address public escrow = makeAddr("escrow");
    address public stranger = makeAddr("stranger");

    address public deployer = makeAddr("deployer");

    function setUp() public {
        vm.prank(deployer);
        adapter = new ERC8004Adapter(makeAddr("identity"), makeAddr("reputation"));
        vm.prank(deployer);
        adapter.setEscrowContract(escrow);
    }

    function test_setEscrowContract_revertsIfAlreadySet() public {
        vm.prank(deployer);
        vm.expectRevert(ERC8004Adapter.EscrowAlreadySet.selector);
        adapter.setEscrowContract(makeAddr("other"));
    }

    function test_setEscrowContract_revertsIfNotDeployer() public {
        ERC8004Adapter fresh;
        vm.prank(deployer);
        fresh = new ERC8004Adapter(makeAddr("identity2"), makeAddr("reputation2"));
        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(ERC8004Adapter.NotDeployer.selector, stranger));
        fresh.setEscrowContract(escrow);
    }

    function test_constructor_revertsOnZeroRegistry() public {
        vm.expectRevert(ERC8004Adapter.ZeroAddress.selector);
        new ERC8004Adapter(address(0), makeAddr("reputation"));
    }

    function test_recordOutcome_revertsIfNotEscrow() public {
        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(ERC8004Adapter.UnauthorizedCaller.selector, stranger));
        adapter.recordOutcome(stranger, true);
    }

    function test_recordOutcome_succeedsFromEscrow() public {
        vm.prank(escrow);
        adapter.recordOutcome(stranger, true);
    }
}
