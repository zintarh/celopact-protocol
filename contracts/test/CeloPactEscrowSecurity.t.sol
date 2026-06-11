// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {CeloPactEscrow} from "../src/CeloPactEscrow.sol";
import {MockAgentRegistry} from "../src/MockAgentRegistry.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockUSDT is ERC20 {
    constructor() ERC20("Mock USDT", "USDT") {}
    function mint(address to, uint256 amount) external { _mint(to, amount); }
    function decimals() public pure override returns (uint8) { return 6; }
}

/// @title CeloPactEscrowSecurityTest
/// @notice Adversarial and liveness tests for fund safety and access control.
contract CeloPactEscrowSecurityTest is Test {
    CeloPactEscrow public escrow;
    MockAgentRegistry public registry;
    MockUSDT public usdt;

    address public agentA = makeAddr("agentA");
    address public agentB = makeAddr("agentB");
    address public arbiter = makeAddr("arbiter");
    address public stranger = makeAddr("stranger");

    uint256 internal oraclePrivateKey = 0xDEADBEEF;
    address public oracle;

    uint256 constant M1 = 300e6;
    uint256 constant M2 = 200e6;

    function setUp() public {
        oracle = vm.addr(oraclePrivateKey);
        registry = new MockAgentRegistry();
        usdt = new MockUSDT();
        escrow = new CeloPactEscrow(address(registry), address(usdt), oracle);

        registry.register(agentA, 500);
        registry.register(agentB, 500);
        registry.register(arbiter, 800);

        usdt.mint(agentA, 1_000e6);
        vm.prank(agentA);
        usdt.approve(address(escrow), type(uint256).max);
    }

    // ── Input validation ─────────────────────────────────────────────────────

    function test_createEscrow_revertsOnSameAgent() public {
        uint256[] memory amounts = _amounts();
        vm.expectRevert(CeloPactEscrow.SameAgent.selector);
        vm.prank(agentA);
        escrow.createEscrow(agentA, amounts);
    }

    function test_createEscrow_revertsOnZeroMilestoneAmount() public {
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 0;
        amounts[1] = M2;
        vm.expectRevert(abi.encodeWithSelector(CeloPactEscrow.ZeroMilestoneAmount.selector, 0));
        vm.prank(agentA);
        escrow.createEscrow(agentB, amounts);
    }

    function test_createEscrow_revertsIfAgentBReputationTooLow() public {
        address lowRep = makeAddr("lowRepB");
        registry.register(lowRep, 50);
        vm.expectRevert(abi.encodeWithSelector(CeloPactEscrow.ReputationTooLow.selector, lowRep, 100, 50));
        vm.prank(agentA);
        escrow.createEscrow(lowRep, _amounts());
    }

    function test_constructor_revertsOnZeroOracle() public {
        vm.expectRevert(CeloPactEscrow.ZeroAddress.selector);
        new CeloPactEscrow(address(registry), address(usdt), address(0));
    }

    // ── Milestone ordering ───────────────────────────────────────────────────

    function test_submitMilestone_revertsIfPreviousIncomplete() public {
        uint256 id = _create();
        vm.expectRevert(abi.encodeWithSelector(CeloPactEscrow.PreviousMilestoneIncomplete.selector, 1));
        vm.prank(agentB);
        escrow.submitMilestone(id, 1, keccak256("skip"));
    }

    // ── Arbiter hardening ────────────────────────────────────────────────────

    function test_disputeMilestone_revertsIfArbiterIsParty() public {
        uint256 id = _createAndSubmit(0);
        vm.expectRevert(
            abi.encodeWithSelector(CeloPactEscrow.InvalidArbiter.selector, agentA, agentA, agentB)
        );
        vm.prank(agentA);
        escrow.disputeMilestone(id, 0, agentA);
    }

    function test_disputeMilestone_revertsIfArbiterLowReputation() public {
        address lowArbiter = makeAddr("lowArbiter");
        registry.register(lowArbiter, 50);
        uint256 id = _createAndSubmit(0);
        vm.expectRevert(
            abi.encodeWithSelector(CeloPactEscrow.ReputationTooLow.selector, lowArbiter, 100, 50)
        );
        vm.prank(agentA);
        escrow.disputeMilestone(id, 0, lowArbiter);
    }

    // ── Fund liveness: stale pending refund ──────────────────────────────────

    function test_refundStaleMilestone_returnsFundsToAgentA() public {
        uint256 id = _create();
        vm.warp(block.timestamp + escrow.MILESTONE_SUBMISSION_DEADLINE() + 1);

        uint256 before = usdt.balanceOf(agentA);
        vm.prank(agentA);
        escrow.refundStaleMilestone(id, 0);

        assertEq(usdt.balanceOf(agentA), before + M1);
        (,,, CeloPactEscrow.MilestoneState state,) = escrow.getMilestone(id, 0);
        assertEq(uint256(state), uint256(CeloPactEscrow.MilestoneState.CANCELLED));
    }

    function test_refundStaleMilestone_revertsBeforeDeadline() public {
        uint256 id = _create();
        vm.expectRevert();
        vm.prank(agentA);
        escrow.refundStaleMilestone(id, 0);
    }

    function test_refundStaleMilestone_revertsIfNotAgentA() public {
        uint256 id = _create();
        vm.warp(block.timestamp + escrow.MILESTONE_SUBMISSION_DEADLINE() + 1);
        vm.expectRevert(abi.encodeWithSelector(CeloPactEscrow.NotAgentA.selector, stranger, agentA));
        vm.prank(stranger);
        escrow.refundStaleMilestone(id, 0);
    }

    // ── Fund liveness: dispute timeout ───────────────────────────────────────

    function test_defaultDisputeToAgentA_refundsRequester() public {
        uint256 id = _createAndSubmit(0);
        vm.prank(agentA);
        escrow.disputeMilestone(id, 0, arbiter);

        vm.warp(block.timestamp + escrow.DISPUTE_RESOLUTION_DEADLINE() + 1);

        uint256 before = usdt.balanceOf(agentA);
        escrow.defaultDisputeToAgentA(id, 0);
        assertEq(usdt.balanceOf(agentA), before + M1);
    }

    function test_defaultDisputeToAgentA_revertsBeforeDeadline() public {
        uint256 id = _createAndSubmit(0);
        vm.prank(agentA);
        escrow.disputeMilestone(id, 0, arbiter);

        vm.expectRevert();
        escrow.defaultDisputeToAgentA(id, 0);
    }

    // ── Double-spend prevention ──────────────────────────────────────────────

    function test_releaseMilestone_cannotReleaseTwice() public {
        bytes32 hash = keccak256("output");
        uint256 id = _create();
        vm.prank(agentB);
        escrow.submitMilestone(id, 0, hash);
        bytes memory sig = _sign(id, 0, hash);
        escrow.releaseMilestone(id, 0, sig);

        vm.expectRevert(
            abi.encodeWithSelector(
                CeloPactEscrow.MilestoneNotSubmitted.selector,
                0,
                CeloPactEscrow.MilestoneState.RELEASED
            )
        );
        escrow.releaseMilestone(id, 0, sig);
    }

    function test_escrowDeactivatesWhenAllMilestonesFinal() public {
        uint256 id = _create();
        vm.prank(agentB);
        escrow.submitMilestone(id, 0, keccak256("m0"));
        escrow.releaseMilestone(id, 0, _sign(id, 0, keccak256("m0")));

        vm.prank(agentB);
        escrow.submitMilestone(id, 1, keccak256("m1"));
        vm.warp(block.timestamp + escrow.CHALLENGE_WINDOW() + 1);
        escrow.releaseMilestone(id, 1, "");

        (,,, bool active,) = escrow.getEscrow(id);
        assertFalse(active);
    }

    // ── Oracle signature hardening ───────────────────────────────────────────

    function test_releaseMilestone_revertsOnZeroSigner() public {
        uint256 id = _createAndSubmit(0);
        bytes memory badSig = new bytes(65);
        badSig[64] = bytes1(uint8(27));
        vm.expectRevert(CeloPactEscrow.InvalidOracleSignature.selector);
        escrow.releaseMilestone(id, 0, badSig);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    function _amounts() internal pure returns (uint256[] memory a) {
        a = new uint256[](2);
        a[0] = M1;
        a[1] = M2;
    }

    function _create() internal returns (uint256) {
        vm.prank(agentA);
        return escrow.createEscrow(agentB, _amounts());
    }

    function _createAndSubmit(uint256 idx) internal returns (uint256 id) {
        id = _create();
        bytes32 hash = keccak256("output");
        vm.prank(agentB);
        escrow.submitMilestone(id, idx, hash);
    }

    function _sign(uint256 id, uint256 idx, bytes32 hash) internal view returns (bytes memory) {
        bytes32 msgHash = keccak256(abi.encodePacked(id, idx, hash));
        bytes32 ethHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", msgHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(oraclePrivateKey, ethHash);
        return abi.encodePacked(r, s, v);
    }
}
