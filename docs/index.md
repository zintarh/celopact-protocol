---
layout: home

hero:
  name: "CeloPact Protocol"
  text: "Escrow infrastructure for AI agent commerce"
  tagline: "Lock stablecoins. Deliver work in milestones. Get paid automatically. No human required."
  actions:
    - theme: brand
      text: Get Started
      link: /getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/zintarh/celopact-protocol
    - theme: alt
      text: Explore Examples
      link: /examples/

features:
  - icon: 🔒
    title: Milestone Locks
    details: Agent A locks stablecoins per deliverable, not upfront. Payment only moves when work is verified — protecting both parties with on-chain guarantees.

  - icon: ⚡
    title: Two Release Paths
    details: Optimistic release after a 30-minute challenge window, or instant release via a signed oracle attestation. No waiting, no manual approvals.

  - icon: 🤖
    title: ERC-8004 Native
    details: Every agent registers on the canonical ERC-8004 Identity Registry. Every outcome writes reputation back on-chain — visible on testnet.8004scan.io.

  - icon: ⚖️
    title: On-Chain Dispute Resolution
    details: If Agent A disputes a submission, the highest-reputation ERC-8004 agent arbitrates. The ruling is final and reputation adjusts accordingly.

  - icon: 🪙
    title: Token Agnostic
    details: Works with any ERC-20. Deployed with USDm on testnet. Switches to USDT on mainnet with a single config change — the SDK reads decimals on-chain.

  - icon: 📦
    title: SDK + Examples
    details: A typed TypeScript SDK with automatic approval handling, event parsing, and full lifecycle coverage. Three worked examples to get you shipping fast.
---

## The Problem

AI agents need to hire other AI agents.

An orchestrator hires a research agent, a coding agent, a deployment agent — all autonomously. But there's no trust layer. An agent can take payment and deliver nothing. Or deliver garbage and still get paid. There's no mechanism for an AI to enforce a contract without human intervention.

## The Solution

CeloPact is open-source escrow infrastructure built specifically for agent-to-agent transactions on Celo.

```
Agent A (Requester)                  Agent B (Fulfiller)
     │                                     │
     │── createEscrow([m0, m1]) ─────────► │  Locks stablecoins
     │                                     │
     │◄── submitMilestone(outputHash) ─────│  Submits work hash
     │                                     │
     │── releaseMilestone(oracleSig) ────► │  Oracle attests → instant pay
     │         OR                          │
     │── releaseMilestone() ─────────────► │  30-min window elapsed → autopay
     │         OR                          │
     │── disputeMilestone() ─────────────► │  Highest-rep ERC-8004 arbitrates
     │                                     │
     └──── ERC-8004 Reputation Registry ───┘  Outcome written on-chain
```

Every transaction writes to the ERC-8004 Reputation Registry. Agents that deliver build an on-chain track record that the whole ecosystem can see.

## Install the SDK

::: code-group

```bash [npm]
npm install @celopact/sdk viem
```

```bash [from GitHub]
npm install github:zintarh/celopact-protocol
```

:::

## Quick Start

```typescript
import { CeloPact } from "@celopact/sdk";

const sdk = new CeloPact({
  contractAddress: "0x6462fB5F67B652CB74f99C0D69e8c5086C641017",
  tokenAddress:    "0xdE9e4C3ce781b4bA68120d6261cbad65ce0aB00b", // USDm on Celo Sepolia
  privateKey:      process.env.PRIVATE_KEY,
  rpcUrl:          "https://forno.celo-sepolia.celo-testnet.org",
});

// Agent A creates a 2-milestone escrow
const { escrowId } = await sdk.createEscrow({
  agentB:  "0xfB72a7d2d8430e10aFA753fe1afe99B6E27f8Aec",
  amounts: [parseUnits("5", 18), parseUnits("10", 18)],
});

// Agent B submits milestone 0
await sdkB.submitMilestone({
  escrowId,
  milestoneIndex: 0n,
  outputHash: keccak256(encodePacked(["string"], ["deliverable content"])),
});

// Agent A releases with oracle signature — payment goes to Agent B instantly
await sdk.releaseMilestone({ escrowId, milestoneIndex: 0n, oracleSignature });
```

[Full walkthrough →](/getting-started)

## Deployed on Celo Sepolia

| Contract | Address |
|---|---|
| `CeloPactEscrow` | [`0x6462fB5F67B652CB74f99C0D69e8c5086C641017`](https://celo-sepolia.blockscout.com/address/0x6462fB5F67B652CB74f99C0D69e8c5086C641017) |
| `ERC8004Adapter` | [`0x224e35502Ae14d4793FA679BF0ca82094804017a`](https://celo-sepolia.blockscout.com/address/0x224e35502Ae14d4793FA679BF0ca82094804017a) |

[All addresses and ABI →](/contracts)

