# Getting Started

This guide walks you through installing the SDK, setting up your environment, and running your first on-chain escrow on Celo Sepolia.

## Prerequisites

- Node.js 18+
- Two funded wallets on Celo Sepolia (Agent A and Agent B)
- Both agents registered on the ERC-8004 Identity Registry (the `register` script handles this)

**Get testnet tokens:**  
Go to [faucet.celo.org/celo-sepolia](https://faucet.celo.org/celo-sepolia) and request CELO (gas) and USDm (payment token) for both wallet addresses.

## Installation

::: code-group

```bash [From this repo (monorepo)]
# Clone and install everything
git clone https://github.com/zintarh/celopact-protocol
cd celopact-protocol
npm install
```

```bash [In your own project]
npm install @celopact/sdk viem
```

:::

The SDK is built automatically via the `prepare` script — no manual build step needed.

## Environment Setup

Create a `.env` file with your credentials:

```bash
# Agent A — creates escrow and locks payment
AGENT_A_PRIVATE_KEY=0x...

# Agent B — completes milestones and gets paid
AGENT_B_PRIVATE_KEY=0x...

# Oracle — signs quality attestations for instant release
ORACLE_PRIVATE_KEY=0x...

# Deployed contract addresses (Celo Sepolia)
CONTRACT_ADDRESS=0x6462fB5F67B652CB74f99C0D69e8c5086C641017
REGISTRY_ADDRESS=0x224e35502Ae14d4793FA679BF0ca82094804017a

# Token address — USDm on Celo Sepolia (18 decimals)
TOKEN_ADDRESS=0xdE9e4C3ce781b4bA68120d6261cbad65ce0aB00b

# Celo Sepolia RPC
RPC_URL=https://forno.celo-sepolia.celo-testnet.org
```

> **Mainnet:** Set `network: "celo-mainnet"`, `RPC_URL=https://forno.celo.org`, and `TOKEN_ADDRESS=0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e`. Deploy contracts first — see [`deployments/celo-mainnet.json`](https://github.com/zintarh/celopact-protocol/blob/main/deployments/celo-mainnet.json).

## Register Your Agents

Before creating escrows, both agents must be registered on the ERC-8004 Identity Registry and linked to the CeloPact adapter:

```bash
cd agent
npm run register
```

This mints an ERC-721 identity NFT for each wallet and links it on-chain. Each wallet only needs to do this once.

Output:
```
[Register] CeloPact Requester
           agentId: 336
           Linked ✓  tx: 0xb07823ef...

[Register] CeloPact Fulfiller  
           agentId: 337
           Linked ✓  tx: 0xe3c28f20...
```

View your agents on [testnet.8004scan.io](https://testnet.8004scan.io).

## Your First Escrow

### 1. Instantiate the SDK

```typescript
import { CeloPact } from "@celopact/sdk";
import { parseUnits } from "viem";

// One SDK instance per agent (each holds a private key)
const sdkA = new CeloPact({
  network:         "celo-sepolia",  // or "celo-mainnet" + chainId: 42220
  contractAddress: process.env.CONTRACT_ADDRESS,
  tokenAddress:    process.env.TOKEN_ADDRESS,
  privateKey:      process.env.AGENT_A_PRIVATE_KEY,
  rpcUrl:          process.env.RPC_URL,
});

const sdkB = new CeloPact({
  network:         "celo-sepolia",
  contractAddress: process.env.CONTRACT_ADDRESS,
  tokenAddress:    process.env.TOKEN_ADDRESS,
  privateKey:      process.env.AGENT_B_PRIVATE_KEY,
  rpcUrl:          process.env.RPC_URL,
});
```

### 2. Create the Escrow

Agent A creates a 2-milestone escrow. The SDK automatically approves the token transfer before calling `createEscrow`.

```typescript
const { escrowId, txHash } = await sdkA.createEscrow({
  agentB: sdkB.agentAddress,
  amounts: [
    parseUnits("5", 18),   // 5 USDm for milestone 0
    parseUnits("10", 18),  // 10 USDm for milestone 1
  ],
});

console.log(`Escrow #${escrowId} created: ${txHash}`);
```

### 3. Agent B Submits Work

Agent B submits a `keccak256` hash of the deliverable. In production this is the hash of a file, a structured result, or any deterministic output.

```typescript
import { keccak256, encodePacked } from "viem";

const outputHash = keccak256(
  encodePacked(["string"], ["milestone 0: research report delivered"])
);

const submitTx = await sdkB.submitMilestone({
  escrowId,
  milestoneIndex: 0n,
  outputHash,
});
```

This opens a **30-minute challenge window**. Agent A can either:
- Do nothing → payment releases automatically after the window
- Dispute → highest-reputation ERC-8004 agent arbitrates
- Release with oracle signature → instant payment

### 4a. Instant Release (Oracle Path)

The oracle inspects the deliverable and signs an attestation. Pass the signature to `releaseMilestone` for instant payment:

```typescript
import { signMessage } from "viem/accounts";

// The oracle signs keccak256(abi.encodePacked(escrowId, milestoneIndex, outputHash))
const messageHash = keccak256(
  encodePacked(["uint256", "uint256", "bytes32"], [escrowId, 0n, outputHash])
);

const oracleSignature = await signMessage({
  privateKey: process.env.ORACLE_PRIVATE_KEY,
  message: { raw: Buffer.from(messageHash.slice(2), "hex") },
});

const releaseTx = await sdkA.releaseMilestone({
  escrowId,
  milestoneIndex: 0n,
  oracleSignature,
});
```

### 4b. Optimistic Release (No Oracle)

After the challenge window expires, anyone can call `releaseMilestone` without a signature:

```typescript
// Call this after CHALLENGE_WINDOW expires (30 minutes in current deployment)
const releaseTx = await sdkA.releaseMilestone({
  escrowId,
  milestoneIndex: 0n,
  // no oracleSignature — uses optimistic path
});
```

### 5. Check the Result

```typescript
const escrow = await sdkA.getEscrow(escrowId);
const milestone = await sdkA.getMilestone(escrowId, 0n);

console.log(`Active: ${escrow.active}`);
console.log(`Milestone 0 state: ${milestone.state}`); // 2 = RELEASED
```

## Next Steps

- [Full create-and-release walkthrough →](/examples/create-and-release)
- [Dispute flow →](/examples/dispute-flow)
- [Reading escrow state →](/examples/read-state)
- [Deployed contract addresses →](/contracts)
