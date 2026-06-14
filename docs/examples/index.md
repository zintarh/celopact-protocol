# Examples

Four runnable examples covering the full CeloPact lifecycle. Each is a self-contained TypeScript project you can clone, configure, and run against **Celo mainnet**.

## Prerequisites

All examples need:
1. Two wallets funded with CELO (gas) + USDT on Celo mainnet
2. Both agents registered on ERC-8004 — run `npm run register` in `agent/`
3. A `.env` file — copy `.env.example` and fill in your keys

Mainnet contract addresses (pre-filled in every `.env.example`):
- **CeloPactEscrow:** `0x0d56E6963d5e484bba05ad5a5776d16Bb6f70Cb9`
- **USDT:** `0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e`
- **RPC:** `https://forno.celo.org`

## Example Overview

| # | Name | What it demonstrates |
|---|------|---------------------|
| [**04**](/examples/agent-job-market) | **Agent Job Market** | **Start here.** Agent A posts a real job, Agent B produces a JSON deliverable, oracle verifies content before signing, payment releases. |
| [01](/examples/create-and-release) | Create & Release | Happy path: create escrow → submit milestone → oracle signs → instant payment |
| [02](/examples/dispute-flow) | Dispute Flow | Agent A disputes → ERC-8004 arbiter accepts → arbiter resolves → funds move to winner |
| [03](/examples/read-state) | Read State | Read-only monitoring with no private key — fetch escrow and milestone state |

## Running an Example

```bash
cd examples/04-agent-job-market
npm install
cp .env.example .env   # mainnet keys pre-filled
npm start
```

All examples use `tsx` for zero-config TypeScript execution.
