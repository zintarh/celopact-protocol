// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IAgentRegistry
/// @notice Minimal interface for the ERC-8004 on-chain agent identity and reputation registry.
/// @dev Full ERC-8004 spec: https://ethereum-magicians.org/t/erc-8004-trustless-agents/25098
///      CeloPact reads registration status and reputation scores before allowing escrow creation,
///      and writes outcomes back after every resolved escrow to keep reputation current.
interface IAgentRegistry {
    /// @notice Returns true if the given address has a registered ERC-8004 agent identity.
    /// @param agent The wallet address of the agent to check.
    /// @return registered Whether this address has an active ERC-8004 registration.
    function isRegistered(address agent) external view returns (bool registered);

    /// @notice Returns the current reputation score for a registered agent.
    /// @dev Score is in the range [0, 10000]. Unregistered agents return 0.
    ///      Higher scores indicate more successful completed tasks and fewer disputes lost.
    /// @param agent The wallet address of the agent.
    /// @return score The agent's current reputation score.
    function getReputationScore(address agent) external view returns (uint256 score);

    /// @notice Records the outcome of a completed or disputed task for reputation tracking.
    /// @dev Called by CeloPactEscrow after every milestone release or dispute resolution.
    ///      Successful outcomes increase score; failed outcomes decrease it.
    /// @param agent The agent whose reputation should be updated.
    /// @param success True if the agent performed well; false if they lost a dispute.
    function recordOutcome(address agent, bool success) external;
}
