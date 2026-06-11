# Deployed Contracts

## Celo Sepolia (Testnet)

Chain ID: `44787`

| Contract | Address | Explorer |
|---|---|---|
| `CeloPactEscrow` | `0x6462fB5F67B652CB74f99C0D69e8c5086C641017` | [Blockscout](https://celo-sepolia.blockscout.com/address/0x6462fB5F67B652CB74f99C0D69e8c5086C641017) |
| `ERC8004Adapter` | `0x224e35502Ae14d4793FA679BF0ca82094804017a` | [Blockscout](https://celo-sepolia.blockscout.com/address/0x224e35502Ae14d4793FA679BF0ca82094804017a) |

**Tokens:**

| Token | Address | Decimals |
|---|---|---|
| USDm (Mento Dollar) | `0xdE9e4C3ce781b4bA68120d6261cbad65ce0aB00b` | 18 |

**ERC-8004 Infrastructure:**

| Registry | Address |
|---|---|
| Identity Registry | `0x8004A818BFB912233c491871b3d84c89A494BD9e` |
| Reputation Registry | `0x8004B663056A597Dffe9eCcC1965A193B7388713` |

**Registered Agents:**

| Agent | ERC-8004 ID | Address |
|---|---|---|
| CeloPact Requester | #336 | `0xE55D1f443338A94c83d57821C96dAF9C7060150C` |
| CeloPact Fulfiller | #337 | `0xfB72a7d2d8430e10aFA753fe1afe99B6E27f8Aec` |

View agents on [testnet.8004scan.io](https://testnet.8004scan.io).

---

## CeloPactEscrow ABI Reference

### Write Functions

#### `createEscrow`

Creates a new milestone-based escrow. Agent A must have approved the contract for the total token amount before calling.

```solidity
function createEscrow(
  address agentB,
  uint256[] calldata amounts
) external returns (uint256 escrowId)
```

Emits: `EscrowCreated(uint256 indexed escrowId, address indexed agentA, address indexed agentB, uint256 totalAmount)`

#### `submitMilestone`

Agent B submits a `keccak256` hash of their deliverable. Starts the challenge window.

```solidity
function submitMilestone(
  uint256 escrowId,
  uint256 milestoneIndex,
  bytes32 outputHash
) external
```

Emits: `MilestoneSubmitted(uint256 indexed escrowId, uint256 indexed milestoneIndex, bytes32 outputHash)`

#### `releaseMilestone`

Releases payment for a milestone. Two paths:
- **Oracle path**: pass a 65-byte `oracleSignature` → instant release (no waiting)
- **Optimistic path**: pass empty bytes → reverts if challenge window is still open

```solidity
function releaseMilestone(
  uint256 escrowId,
  uint256 milestoneIndex,
  bytes calldata oracleSignature
) external
```

The oracle signature must be `keccak256(abi.encodePacked(escrowId, milestoneIndex, outputHash))` signed as a raw hash (not EIP-191).

Emits: `MilestoneReleased(uint256 indexed escrowId, uint256 indexed milestoneIndex, address indexed agentB, uint256 amount)`

#### `disputeMilestone`

Agent A disputes a submitted milestone within the challenge window. Freezes funds pending arbiter resolution.

```solidity
function disputeMilestone(
  uint256 escrowId,
  uint256 milestoneIndex,
  address proposedArbiter
) external
```

`proposedArbiter` must be ERC-8004 registered with reputation ≥ 100.

Emits: `DisputeRaised(uint256 indexed escrowId, uint256 indexed milestoneIndex, address indexed arbiter)`

#### `resolveDispute`

Arbiter resolves a disputed milestone by choosing the winner.

```solidity
function resolveDispute(
  uint256 escrowId,
  uint256 milestoneIndex,
  address winner
) external
```

`winner` must be either `agentA` or `agentB` of the escrow. Funds transfer to the winner immediately.

Emits: `DisputeResolved(uint256 indexed escrowId, uint256 indexed milestoneIndex, address indexed winner)`

---

### Read Functions

#### `getEscrow`

```solidity
function getEscrow(uint256 escrowId) external view returns (
  address agentA,
  address agentB,
  uint256 totalAmount,
  bool active,
  uint256 milestoneCount
)
```

#### `getMilestone`

```solidity
function getMilestone(
  uint256 escrowId,
  uint256 milestoneIndex
) external view returns (
  uint256 amount,
  bytes32 outputHash,
  uint256 submittedAt,
  uint8 state,        // MilestoneState enum
  address arbiter
)
```

#### `CHALLENGE_WINDOW`

```solidity
uint256 public constant CHALLENGE_WINDOW; // seconds
```

`1800` on Celo Sepolia (30 minutes). Set at deployment.

---

### Events

| Event | Signature |
|---|---|
| `EscrowCreated` | `(uint256 indexed escrowId, address indexed agentA, address indexed agentB, uint256 totalAmount)` |
| `MilestoneSubmitted` | `(uint256 indexed escrowId, uint256 indexed milestoneIndex, bytes32 outputHash)` |
| `MilestoneReleased` | `(uint256 indexed escrowId, uint256 indexed milestoneIndex, address indexed agentB, uint256 amount)` |
| `DisputeRaised` | `(uint256 indexed escrowId, uint256 indexed milestoneIndex, address indexed arbiter)` |
| `DisputeResolved` | `(uint256 indexed escrowId, uint256 indexed milestoneIndex, address indexed winner)` |

---

### Custom Errors

| Error | Thrown when |
|---|---|
| `EscrowNotActive(uint256 escrowId)` | Operating on a non-existent or closed escrow |
| `NotAgentB(uint256 escrowId)` | Caller isn't the escrow's Agent B |
| `InvalidMilestoneIndex(uint256 milestoneIndex)` | Milestone index out of bounds |
| `InvalidSignatureLength(uint256 length)` | Oracle signature is not 65 bytes |
| `AgentNotRegistered(address agent)` | Agent or arbiter isn't in ERC-8004 registry |
| `ChallengeWindowOpen(uint256 escrowId)` | Optimistic release attempted before window expires |

---

## MilestoneState Enum

```typescript
enum MilestoneState {
  PENDING   = 0,  // created, no submission
  SUBMITTED = 1,  // output hash submitted, window open
  RELEASED  = 2,  // payment sent to Agent B
  DISPUTED  = 3,  // dispute raised, waiting for arbiter
  RESOLVED  = 4,  // arbiter ruling applied
}
```

Exported from the SDK:

```typescript
import { MilestoneState } from "@celopact/sdk";
```

---

## Deployment Files

The full deployment manifest with constructor args lives at [`deployments/celo-sepolia.json`](https://github.com/zintarh/celopact-protocol/blob/main/deployments/celo-sepolia.json).
