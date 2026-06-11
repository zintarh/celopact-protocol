# CeloPact SDK — Examples

Runnable examples that demonstrate the full lifecycle of milestone-based escrow on Celo. Each example is a self-contained Node.js project.

---

## What the examples demonstrate

| Example | Description |
|---------|-------------|
| `01-create-and-release` | Happy path: Agent A creates a 2-milestone escrow, Agent B submits milestone 0, an oracle signs a quality attestation, and payment releases instantly. |
| `02-dispute-flow` | Dispute path: Agent A creates an escrow, Agent B submits a milestone, Agent A disputes it, an ERC-8004 registered arbiter resolves who wins. |
| `03-read-state` | Read-only monitoring: query escrow and milestone state from the chain with no private key, using both the SDK helpers and the raw ABI directly. |

---

## Prerequisites

- **Node.js 18+** — examples use top-level `await` (ES2022 feature, supported in Node 18+).
- **Two funded Celo Sepolia wallets** — Agent A needs token balance to lock in escrow; Agent B and the oracle/arbiter only need a small amount of CELO for gas.
- **USDm on Celo Sepolia** — get test tokens from the [Celo faucet](https://faucet.celo.org/alfajores). USDm address: `0xdE9e4C3ce781b4bA68120d6261cbad65ce0aB00b` (18 decimals).
- **Deployed CeloPactEscrow contract** — use `0x6462fB5F67B652CB74f99C0D69e8c5086C641017` on Celo Sepolia (from `deployments/`).

---

## Environment variables

Each example has a `.env.example` file. Copy it to `.env` and fill in your values:

```bash
cp .env.example .env
```

The common variables are:

| Variable | Description |
|----------|-------------|
| `CONTRACT_ADDRESS` | Deployed `CeloPactEscrow` address |
| `TOKEN_ADDRESS` | ERC-20 token address (USDm on testnet, USDT on mainnet) |
| `RPC_URL` | Celo Sepolia: `https://forno.celo-sepolia.celo-testnet.org` |
| `AGENT_A_PRIVATE_KEY` | Private key (hex, with `0x`) of the agent creating and funding the escrow |
| `AGENT_B_PRIVATE_KEY` | Private key of the agent completing milestones |
| `ORACLE_PRIVATE_KEY` | Private key of the oracle that signs quality attestations |
| `ARBITER_PRIVATE_KEY` | (Example 02 only) Private key of the ERC-8004 registered arbiter |

---

## How to install and run each example

Each example installs `@celopact/sdk` from the local monorepo via a `file:` path, so no publishing is needed.

```bash
# Example 01: Happy path
cd examples/01-create-and-release
npm install
cp .env.example .env   # fill in your keys
npm start

# Example 02: Dispute flow
cd examples/02-dispute-flow
npm install
cp .env.example .env   # fill in your keys (including ARBITER_PRIVATE_KEY)
npm start

# Example 03: Read-only monitoring
cd examples/03-read-state
npm install
cp .env.example .env   # set ESCROW_ID to an existing escrow
npm start
```

All examples run with `npx tsx index.ts` (the `start` script calls this).

---

## Installing the SDK in your own project

### From within this monorepo (file path reference)

If you are building inside this monorepo, reference the SDK by file path in your `package.json`:

```json
{
  "dependencies": {
    "@celopact/sdk": "file:../../sdk"
  }
}
```

Then `npm install` will link the local build.

### From GitHub (once the repo is public)

```bash
npm install github:zintarh/celopact-protocol
```

npm will clone the repo and run the `prepare` script (`npm run build`) automatically, producing the compiled `dist/` before linking it.

### From npm (once published)

```bash
npm install @celopact/sdk
```

---

## Quick-start code snippet

```typescript
import "dotenv/config";
import { createPublicClient, http, parseUnits, formatUnits, keccak256, encodePacked } from "viem";
import { signMessage } from "viem/accounts";
import { CeloPact, celoCeloSepolia, ERC20_ABI } from "@celopact/sdk";
import type { Address, Hex } from "viem";

const sdk = new CeloPact({
  contractAddress: "0x6462fB5F67B652CB74f99C0D69e8c5086C641017",
  tokenAddress: "0xdE9e4C3ce781b4bA68120d6261cbad65ce0aB00b", // USDm on Celo Sepolia
  privateKey: process.env["AGENT_A_PRIVATE_KEY"] as Hex,
  rpcUrl: "https://forno.celo-sepolia.celo-testnet.org",
});

// Read token decimals on-chain — never hardcode
const publicClient = createPublicClient({ chain: celoCeloSepolia, transport: http() });
const decimals = await publicClient.readContract({
  address: "0xdE9e4C3ce781b4bA68120d6261cbad65ce0aB00b",
  abi: ERC20_ABI,
  functionName: "decimals",
}) as number;

// Create a 2-milestone escrow
const { escrowId } = await sdk.createEscrow({
  agentB: "0xAgentBAddress" as Address,
  amounts: [parseUnits("10", decimals), parseUnits("20", decimals)],
});

console.log(`Escrow created: ID ${escrowId}`);
```

---

## Key concepts

### Token-agnostic amounts

Always compute amounts with `parseUnits` after reading decimals on-chain:

```typescript
// Read decimals first
const decimals = await publicClient.readContract({ ..., functionName: "decimals" });

// Then compute amounts
const amount = parseUnits("10", decimals); // works for 6-decimal USDT and 18-decimal USDm
```

Never hardcode `* 1_000_000n` or `* 10n**18n` — the SDK is token-agnostic.

### Oracle signature format

The contract verifies oracle signatures using `ecrecover` on a raw hash (no EIP-191 prefix):

```typescript
const messageHash = keccak256(
  encodePacked(["uint256", "uint256", "bytes32"], [escrowId, milestoneIndex, outputHash])
);

// IMPORTANT: use `message: { raw: ... }` — not the string form
const signature = await signMessage({
  privateKey: oraclePrivateKey,
  message: { raw: Buffer.from(messageHash.slice(2), "hex") },
});
```

Using the string form of `signMessage` adds an EIP-191 prefix that changes the recovered address, causing the contract to reject the signature.

### Two release paths

| Path | When to use | How |
|------|-------------|-----|
| Oracle (instant) | Oracle has attested to quality | Pass `oracleSignature` to `releaseMilestone` |
| Optimistic (after window) | Challenge window expired without dispute | Call `releaseMilestone` with no signature (or `"0x"`) |

---

## Contract addresses (Celo Sepolia)

| Contract | Address |
|----------|---------|
| `CeloPactEscrow` | `0x6462fB5F67B652CB74f99C0D69e8c5086C641017` |
| USDm (test token) | `0xdE9e4C3ce781b4bA68120d6261cbad65ce0aB00b` |

View on Blockscout: https://celo-sepolia.blockscout.com
