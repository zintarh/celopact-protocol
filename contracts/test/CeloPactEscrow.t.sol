// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {CeloPactEscrow} from "../src/CeloPactEscrow.sol";
import {MockAgentRegistry} from "../src/MockAgentRegistry.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @dev Minimal ERC-20 used as USDT stand-in during tests.
contract MockUSDT is ERC20 {
    constructor() ERC20("Mock USDT", "USDT") {}
    function mint(address to, uint256 amount) external { _mint(to, amount); }
    function decimals() public pure override returns (uint8) { return 6; }
}

/// @title CeloPactEscrowTest
/// @notice Full test suite for CeloPactEscrow covering the happy path,
///         oracle fast-release path, dispute resolution, and edge cases.
contract CeloPactEscrowTest is Test {
    CeloPactEscrow public escrow;
    MockAgentRegistry public registry;
    MockUSDT public usdt;

    address public agentA     = makeAddr("agentA");
    address public agentB     = makeAddr("agentB");
    address public arbiter    = makeAddr("arbiter");
    address public stranger   = makeAddr("stranger");

    uint256 internal oraclePrivateKey = 0xDEADBEEF;
    address public oracle;

    uint256 constant AGENT_A_INITIAL_USDT = 1_000e6;   // 1000 USDT
    uint256 constant MILESTONE_1_AMOUNT   = 300e6;      // 300 USDT
    uint256 constant MILESTONE_2_AMOUNT   = 200e6;      // 200 USDT

    function setUp() public {
        oracle = vm.addr(oraclePrivateKey);

        registry = new MockAgentRegistry();
        usdt     = new MockUSDT();
        escrow   = new CeloPactEscrow(address(registry), address(usdt), oracle);

        // Register all agents with sufficient reputation
        registry.register(agentA,   500);
        registry.register(agentB,   500);
        registry.register(arbiter, 800);

        // Fund Agent A with test USDT and approve escrow contract
        usdt.mint(agentA, AGENT_A_INITIAL_USDT);
        vm.prank(agentA);
        usdt.approve(address(escrow), type(uint256).max);
    }

    // ─────────────────────────────────────────────────────────
    // createEscrow
    // ─────────────────────────────────────────────────────────

    function test_createEscrow_success() public {
        uint256[] memory amounts = _twoMilestones();

        vm.prank(agentA);
        uint256 escrowId = escrow.createEscrow(agentB, amounts);

        assertEq(escrowId, 1);
        (address a, address b, uint256 total, bool active, uint256 count) = escrow.getEscrow(escrowId);
        assertEq(a, agentA);
        assertEq(b, agentB);
        assertEq(total, MILESTONE_1_AMOUNT + MILESTONE_2_AMOUNT);
        assertTrue(active);
        assertEq(count, 2);
        assertEq(usdt.balanceOf(address(escrow)), total);
    }

    function test_createEscrow_emitsEvent() public {
        uint256[] memory amounts = _twoMilestones();
        vm.expectEmit(true, true, true, true);
        emit CeloPactEscrow.EscrowCreated(1, agentA, agentB, 500e6, 2);
        vm.prank(agentA);
        escrow.createEscrow(agentB, amounts);
    }

    function test_createEscrow_revertsIfAgentANotRegistered() public {
        uint256[] memory amounts = _twoMilestones();
        vm.expectRevert(abi.encodeWithSelector(CeloPactEscrow.NotRegistered.selector, stranger));
        vm.prank(stranger);
        escrow.createEscrow(agentB, amounts);
    }

    function test_createEscrow_revertsIfAgentBNotRegistered() public {
        uint256[] memory amounts = _twoMilestones();
        vm.expectRevert(abi.encodeWithSelector(CeloPactEscrow.NotRegistered.selector, stranger));
        vm.prank(agentA);
        escrow.createEscrow(stranger, amounts);
    }

    function test_createEscrow_revertsIfReputationTooLow() public {
        address lowRepAgent = makeAddr("lowRep");
        registry.register(lowRepAgent, 50); // below MIN_REPUTATION of 100
        usdt.mint(lowRepAgent, 1_000e6);
        vm.prank(lowRepAgent);
        usdt.approve(address(escrow), type(uint256).max);

        uint256[] memory amounts = _twoMilestones();
        vm.expectRevert(
            abi.encodeWithSelector(CeloPactEscrow.ReputationTooLow.selector, lowRepAgent, 100, 50)
        );
        vm.prank(lowRepAgent);
        escrow.createEscrow(agentB, amounts);
    }

    // ─────────────────────────────────────────────────────────
    // submitMilestone
    // ─────────────────────────────────────────────────────────

    function test_submitMilestone_success() public {
        uint256 escrowId = _createEscrow();
        bytes32 hash = keccak256("deliverable_output_v1");

        vm.prank(agentB);
        escrow.submitMilestone(escrowId, 0, hash);

        (, bytes32 storedHash,, CeloPactEscrow.MilestoneState state,,,) = escrow.getMilestone(escrowId, 0);
        assertEq(storedHash, hash);
        assertEq(uint256(state), uint256(CeloPactEscrow.MilestoneState.SUBMITTED));
    }

    function test_submitMilestone_emitsEvent() public {
        uint256 escrowId = _createEscrow();
        bytes32 hash = keccak256("output");
        vm.expectEmit(true, true, false, false);
        emit CeloPactEscrow.MilestoneSubmitted(escrowId, 0, hash, 0);
        vm.prank(agentB);
        escrow.submitMilestone(escrowId, 0, hash);
    }

    function test_submitMilestone_revertsIfNotAgentB() public {
        uint256 escrowId = _createEscrow();
        vm.expectRevert(abi.encodeWithSelector(CeloPactEscrow.NotAgentB.selector, stranger, agentB));
        vm.prank(stranger);
        escrow.submitMilestone(escrowId, 0, bytes32(0));
    }

    function test_submitMilestone_revertsIfAlreadySubmitted() public {
        uint256 escrowId = _createEscrow();
        vm.prank(agentB);
        escrow.submitMilestone(escrowId, 0, keccak256("v1"));

        vm.expectRevert(
            abi.encodeWithSelector(
                CeloPactEscrow.MilestoneNotPending.selector,
                0,
                CeloPactEscrow.MilestoneState.SUBMITTED
            )
        );
        vm.prank(agentB);
        escrow.submitMilestone(escrowId, 0, keccak256("v2"));
    }

    // ─────────────────────────────────────────────────────────
    // releaseMilestone — optimistic path
    // ─────────────────────────────────────────────────────────

    function test_releaseMilestone_optimistic_afterWindow() public {
        uint256 escrowId = _createEscrow();
        vm.prank(agentB);
        escrow.submitMilestone(escrowId, 0, keccak256("output"));

        // Advance time past challenge window
        vm.warp(block.timestamp + escrow.CHALLENGE_WINDOW() + 1);

        uint256 agentBBalanceBefore = usdt.balanceOf(agentB);
        escrow.releaseMilestone(escrowId, 0, "");
        assertEq(usdt.balanceOf(agentB), agentBBalanceBefore + MILESTONE_1_AMOUNT);
    }

    function test_releaseMilestone_optimistic_revertsIfWindowOpen() public {
        uint256 escrowId = _createEscrow();
        vm.prank(agentB);
        escrow.submitMilestone(escrowId, 0, keccak256("output"));

        vm.expectRevert();
        escrow.releaseMilestone(escrowId, 0, "");
    }

    // ─────────────────────────────────────────────────────────
    // releaseMilestone — oracle fast path
    // ─────────────────────────────────────────────────────────

    function test_releaseMilestone_oracle_immediate() public {
        uint256 escrowId = _createEscrow();
        bytes32 outputHash = keccak256("verified_output");
        vm.prank(agentB);
        escrow.submitMilestone(escrowId, 0, outputHash);

        // Oracle signs attestation (challenge window NOT expired)
        bytes memory sig = _oracleSign(escrowId, 0, outputHash);

        uint256 agentBBalanceBefore = usdt.balanceOf(agentB);
        escrow.releaseMilestone(escrowId, 0, sig);
        assertEq(usdt.balanceOf(agentB), agentBBalanceBefore + MILESTONE_1_AMOUNT);
    }

    function test_releaseMilestone_oracle_revertsOnBadSignature() public {
        uint256 escrowId = _createEscrow();
        bytes32 outputHash = keccak256("output");
        vm.prank(agentB);
        escrow.submitMilestone(escrowId, 0, outputHash);

        bytes memory badSig = new bytes(65); // all zeros
        vm.expectRevert(CeloPactEscrow.InvalidOracleSignature.selector);
        escrow.releaseMilestone(escrowId, 0, badSig);
    }

    // ─────────────────────────────────────────────────────────
    // disputeMilestone + resolveDispute
    // ─────────────────────────────────────────────────────────

    function test_fullDisputePath_agentAWins() public {
        uint256 escrowId = _createEscrow();
        vm.prank(agentB);
        escrow.submitMilestone(escrowId, 0, keccak256("bad_output"));

        // Agent A disputes within window
        vm.prank(agentA);
        escrow.disputeMilestone(escrowId, 0, arbiter);

        // Arbiter accepts then rules in favour of Agent A (refund)
        uint256 agentABalanceBefore = usdt.balanceOf(agentA);
        vm.prank(arbiter);
        escrow.acceptDispute(escrowId, 0);
        vm.prank(arbiter);
        escrow.resolveDispute(escrowId, 0, agentA);

        assertEq(usdt.balanceOf(agentA), agentABalanceBefore + MILESTONE_1_AMOUNT);
        (,,,CeloPactEscrow.MilestoneState state,,,) = escrow.getMilestone(escrowId, 0);
        assertEq(uint256(state), uint256(CeloPactEscrow.MilestoneState.RESOLVED));
    }

    function test_fullDisputePath_agentBWins() public {
        uint256 escrowId = _createEscrow();
        vm.prank(agentB);
        escrow.submitMilestone(escrowId, 0, keccak256("good_output"));

        vm.prank(agentA);
        escrow.disputeMilestone(escrowId, 0, arbiter);

        uint256 agentBBalanceBefore = usdt.balanceOf(agentB);
        vm.prank(arbiter);
        escrow.acceptDispute(escrowId, 0);
        vm.prank(arbiter);
        escrow.resolveDispute(escrowId, 0, agentB);

        assertEq(usdt.balanceOf(agentB), agentBBalanceBefore + MILESTONE_1_AMOUNT);
    }

    function test_disputeMilestone_revertsAfterWindow() public {
        uint256 escrowId = _createEscrow();
        vm.prank(agentB);
        escrow.submitMilestone(escrowId, 0, keccak256("output"));

        vm.warp(block.timestamp + escrow.CHALLENGE_WINDOW() + 1);

        vm.expectRevert();
        vm.prank(agentA);
        escrow.disputeMilestone(escrowId, 0, arbiter);
    }

    function test_resolveDispute_revertsIfNotArbiter() public {
        uint256 escrowId = _createEscrow();
        vm.prank(agentB);
        escrow.submitMilestone(escrowId, 0, keccak256("output"));
        vm.prank(agentA);
        escrow.disputeMilestone(escrowId, 0, arbiter);
        vm.prank(arbiter);
        escrow.acceptDispute(escrowId, 0);

        vm.expectRevert(abi.encodeWithSelector(CeloPactEscrow.NotArbiter.selector, stranger, arbiter));
        vm.prank(stranger);
        escrow.resolveDispute(escrowId, 0, agentA);
    }

    function test_resolveDispute_revertsIfNotAccepted() public {
        uint256 escrowId = _createEscrow();
        vm.prank(agentB);
        escrow.submitMilestone(escrowId, 0, keccak256("output"));
        vm.prank(agentA);
        escrow.disputeMilestone(escrowId, 0, arbiter);

        vm.expectRevert(
            abi.encodeWithSelector(CeloPactEscrow.DisputeNotAccepted.selector, escrowId, 0)
        );
        vm.prank(arbiter);
        escrow.resolveDispute(escrowId, 0, agentA);
    }

    function test_acceptDispute_revertsIfNotNamedArbiter() public {
        uint256 escrowId = _createEscrow();
        vm.prank(agentB);
        escrow.submitMilestone(escrowId, 0, keccak256("output"));
        vm.prank(agentA);
        escrow.disputeMilestone(escrowId, 0, arbiter);

        vm.expectRevert(abi.encodeWithSelector(CeloPactEscrow.NotArbiter.selector, stranger, arbiter));
        vm.prank(stranger);
        escrow.acceptDispute(escrowId, 0);
    }

    function test_acceptDispute_success_emitsEvent() public {
        uint256 escrowId = _createEscrow();
        vm.prank(agentB);
        escrow.submitMilestone(escrowId, 0, keccak256("output"));
        vm.prank(agentA);
        escrow.disputeMilestone(escrowId, 0, arbiter);

        vm.expectEmit(true, true, true, false);
        emit CeloPactEscrow.DisputeAccepted(escrowId, 0, arbiter);
        vm.prank(arbiter);
        escrow.acceptDispute(escrowId, 0);

        (,,,, address storedArbiter, bool accepted, uint256 acceptedAt) = escrow.getMilestone(escrowId, 0);
        assertEq(storedArbiter, arbiter);
        assertTrue(accepted);
        assertGt(acceptedAt, 0);
    }

    function test_acceptDispute_revertsIfAlreadyAccepted() public {
        uint256 escrowId = _createEscrow();
        vm.prank(agentB);
        escrow.submitMilestone(escrowId, 0, keccak256("output"));
        vm.prank(agentA);
        escrow.disputeMilestone(escrowId, 0, arbiter);
        vm.prank(arbiter);
        escrow.acceptDispute(escrowId, 0);

        vm.expectRevert(abi.encodeWithSelector(CeloPactEscrow.DisputeAlreadyAccepted.selector, escrowId, 0));
        vm.prank(arbiter);
        escrow.acceptDispute(escrowId, 0);
    }

    function test_createEscrow_revertsOnNoMilestones() public {
        uint256[] memory empty = new uint256[](0);
        vm.expectRevert(CeloPactEscrow.NoMilestones.selector);
        vm.prank(agentA);
        escrow.createEscrow(agentB, empty);
    }

    // ─────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────

    function _twoMilestones() internal pure returns (uint256[] memory) {
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = MILESTONE_1_AMOUNT;
        amounts[1] = MILESTONE_2_AMOUNT;
        return amounts;
    }

    function _createEscrow() internal returns (uint256) {
        vm.prank(agentA);
        return escrow.createEscrow(agentB, _twoMilestones());
    }

    function _oracleSign(uint256 escrowId, uint256 milestoneIndex, bytes32 outputHash)
        internal
        view
        returns (bytes memory)
    {
        bytes32 messageHash = keccak256(abi.encodePacked(escrowId, milestoneIndex, outputHash));
        bytes32 ethSignedHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(oraclePrivateKey, ethSignedHash);
        return abi.encodePacked(r, s, v);
    }
}
