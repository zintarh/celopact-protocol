// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IAgentRegistry} from "./IAgentRegistry.sol";

/// @dev Minimal interface for the ERC-8004 Identity Registry (ERC-721 based).
///      Deployed on Celo Sepolia: 0x8004A818BFB912233c491871b3d84c89A494BD9e
interface IERC8004Identity {
    /// @notice Returns the owner of an agent NFT.
    function ownerOf(uint256 agentId) external view returns (address);
}

/// @dev Minimal interface for the ERC-8004 Reputation Registry.
///      Deployed on Celo Sepolia: 0x8004B663056A597Dffe9eCcC1965A193B7388713
interface IERC8004Reputation {
    /// @notice Records feedback for a registered agent.
    function giveFeedback(
        uint256 agentId,
        int128 value,
        uint8 valueDecimals,
        bytes32 tag1,
        bytes32 tag2,
        string calldata endpoint,
        string calldata feedbackURI,
        bytes32 feedbackHash
    ) external;
}

/// @title ERC8004Adapter
/// @author CeloPact Protocol
/// @notice Bridges the canonical ERC-8004 Identity and Reputation registries
///         (deployed on Celo Sepolia) to the IAgentRegistry interface used by
///         CeloPactEscrow. This ensures every escrow participant is genuinely
///         registered on ERC-8004 and that every outcome is written back to the
///         canonical reputation layer — visible on 8004scan.io.
/// @dev Workflow:
///      1. Agent calls `register(string agentURI)` on the real ERC-8004 Identity
///         Registry, receives an agentId NFT.
///      2. Agent calls `linkAgent(agentId)` on this adapter to link their wallet
///         address to their agentId. The adapter verifies NFT ownership.
///      3. CeloPactEscrow calls `isRegistered()` / `getReputationScore()` through
///         this adapter. After each resolution `recordOutcome()` posts feedback to
///         the ERC-8004 Reputation Registry.
contract ERC8004Adapter is IAgentRegistry {
    // ─────────────────────────────────────────────────────────────────────────
    // Immutables
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice The ERC-8004 Identity Registry (ERC-721).
    IERC8004Identity public immutable identityRegistry;

    /// @notice The ERC-8004 Reputation Registry.
    IERC8004Reputation public immutable reputationRegistry;

    // ─────────────────────────────────────────────────────────────────────────
    // State
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Maps agent wallet address → ERC-8004 agentId (NFT token ID).
    ///         Zero means not linked.
    mapping(address => uint256) public agentIds;

    /// @notice Internal reputation score maintained by CeloPact outcomes.
    ///         Starts at 500 when an agent links; updated by recordOutcome().
    ///         Range [0, 10000].
    mapping(address => uint256) private _score;

    // ─────────────────────────────────────────────────────────────────────────
    // Events
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Emitted when an agent links their wallet to an ERC-8004 agentId.
    event AgentLinked(address indexed agent, uint256 indexed agentId);

    // ─────────────────────────────────────────────────────────────────────────
    // Constructor
    // ─────────────────────────────────────────────────────────────────────────

    /// @param identityRegistry_   ERC-8004 Identity Registry address.
    /// @param reputationRegistry_ ERC-8004 Reputation Registry address.
    constructor(address identityRegistry_, address reputationRegistry_) {
        identityRegistry   = IERC8004Identity(identityRegistry_);
        reputationRegistry = IERC8004Reputation(reputationRegistry_);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Agent Linking
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Links an ERC-8004 agentId NFT to the caller's wallet address.
    /// @dev Must be called AFTER registering on the ERC-8004 Identity Registry
    ///      and receiving the agentId. The caller must own the agentId NFT.
    ///      Initial reputation score is set to 500 (above MIN_REPUTATION = 100).
    /// @param agentId The ERC-8004 token ID returned by `identityRegistry.register()`.
    function linkAgent(uint256 agentId) external {
        require(identityRegistry.ownerOf(agentId) == msg.sender, "ERC8004Adapter: not NFT owner");
        require(agentIds[msg.sender] == 0, "ERC8004Adapter: already linked");
        agentIds[msg.sender] = agentId;
        _score[msg.sender]   = 500;
        emit AgentLinked(msg.sender, agentId);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // IAgentRegistry
    // ─────────────────────────────────────────────────────────────────────────

    /// @inheritdoc IAgentRegistry
    /// @dev Returns true only if the agent has linked AND still owns the NFT.
    ///      Uses a try/catch so a burned or transferred NFT returns false rather
    ///      than reverting.
    function isRegistered(address agent) external view override returns (bool registered) {
        uint256 id = agentIds[agent];
        if (id == 0) return false;
        try identityRegistry.ownerOf(id) returns (address owner) {
            return owner == agent;
        } catch {
            return false;
        }
    }

    /// @inheritdoc IAgentRegistry
    function getReputationScore(address agent) external view override returns (uint256 score) {
        return _score[agent];
    }

    /// @inheritdoc IAgentRegistry
    /// @dev Updates the local score AND writes feedback to the canonical
    ///      ERC-8004 Reputation Registry so the outcome appears on 8004scan.io.
    ///      The giveFeedback call is wrapped in try/catch — CeloPact will still
    ///      release payment even if the reputation write fails.
    function recordOutcome(address agent, bool success) external override {
        uint256 id = agentIds[agent];
        if (id == 0) return;

        // Update local score
        if (success) {
            _score[agent] = _score[agent] + 100 > 10000 ? 10000 : _score[agent] + 100;
        } else {
            _score[agent] = _score[agent] < 200 ? 0 : _score[agent] - 200;
        }

        // Post to canonical ERC-8004 Reputation Registry (non-blocking)
        int128 feedbackValue = success ? int128(100) : int128(-100);
        try reputationRegistry.giveFeedback(
            id,
            feedbackValue,
            0,                      // valueDecimals: whole integer
            bytes32("successRate"), // tag1: standard ERC-8004 feedback tag
            bytes32(0),             // tag2: unused
            "",                     // endpoint: not needed for this feedback type
            "",                     // feedbackURI: no off-chain data
            bytes32(0)              // feedbackHash: no commitment
        ) {} catch {}
    }
}
