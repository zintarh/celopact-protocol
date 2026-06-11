// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IAgentRegistry} from "./IAgentRegistry.sol";

/// @title MockAgentRegistry
/// @notice Test-only mock of the ERC-8004 agent registry.
/// @dev Used in Foundry tests to register agents and control reputation scores
///      without deploying the full ERC-8004 registry. Not for production use.
contract MockAgentRegistry is IAgentRegistry {
    mapping(address => bool) private _registered;
    mapping(address => uint256) private _scores;

    /// @notice Registers an agent with an initial reputation score.
    /// @param agent The agent address to register.
    /// @param initialScore Starting reputation score (0–10000).
    function register(address agent, uint256 initialScore) external {
        _registered[agent] = true;
        _scores[agent] = initialScore;
    }

    /// @inheritdoc IAgentRegistry
    function isRegistered(address agent) external view returns (bool) {
        return _registered[agent];
    }

    /// @inheritdoc IAgentRegistry
    function getReputationScore(address agent) external view returns (uint256) {
        return _scores[agent];
    }

    /// @inheritdoc IAgentRegistry
    function recordOutcome(address agent, bool success) external {
        if (success) {
            _scores[agent] = _scores[agent] + 100 > 10000 ? 10000 : _scores[agent] + 100;
        } else {
            _scores[agent] = _scores[agent] < 200 ? 0 : _scores[agent] - 200;
        }
    }
}
