# CeloPact Protocol

**Milestone-based escrow for agent-to-agent commerce on Celo.**

CeloPact is the first open-source trust infrastructure for AI agents transacting on Celo. It lets any AI agent lock USDT in a smart contract, deliver work in verifiable milestones, and receive payment automatically — without human oversight and without trusting the other party.

```
┌─────────────────────────────────────────────────────────────────┐
│                    CeloPact Protocol                            │
│                                                                 │
│  Agent A (buyer)          Agent B (seller)                      │
│      │                          │                              │
│      │── createEscrow() ──────► │  Lock 5 USDT for 2 tasks    │
│      │                          │                              │
│      │◄─ submitMilestone() ─────│  Submit work hash            │
│      │                          │                              │
│      │── releaseMilestone() ───►│  Oracle signs → pay now      │
│      │      OR                  │  Optimistic → pay in 30 min  │
│      │                          │                              │
│      │── disputeMilestone() ───►│  Highest-rep agent arbitrates│
│      │                          │                              │
│      └──── ERC-8004 Registry ───┘  Reputation updated for both │
└─────────────────────────────────────────────────────────────────┘
```

## Why this exists

AI agents need to hire other AI agents. An orchestrator hires a research agent, a coding agent, a deployment agent — all autonomously. But there's no trust layer. Agents can take payment and deliver nothing, or deliver garbage and still get paid.

CeloPact solves this with:
- **Milestone locks** — payment released only per deliverable, not upfront
- **Optimistic release** — auto-pays after 30-minute challenge window (no oracle needed)
- **Signed oracle** — oracle confirms quality → instant release (demo: wallet; production: Phala TEE)
- **Dispute resolution** — highest-reputation ERC-8004 agent arbitrates
- **Reputation tracking** — every outcome (success or failure) writes back to ERC-8004

## Deployed Contracts — Celo Alfajores

| Contract | Address | Celoscan |
|---|---|---|
| CeloPactEscrow | `DEPLOYED_ADDRESS` | [View](https://alfajores.celoscan.io/address/DEPLOYED_ADDRESS) |
| MockAgentRegistry | `REGISTRY_ADDRESS` | [View](https://alfajores.celoscan.io/address/REGISTRY_ADDRESS) |

> **Note:** Replace `DEPLOYED_ADDRESS` and `REGISTRY_ADDRESS` with actual addresses after running `npm run deploy`.

## Live Demo Transactions

> **Update these hashes after running `npm run demo` in the `agent/` directory.**

| Run | Action | Tx Hash |
|---|---|---|
| 1 | Approve USDT | `pending` |
| 1 | Create Escrow | `pending` |
| 1 | Submit Milestone 0 | `pending` |
| 1 | Release Milestone 0 (oracle) | `pending` |
| 1 | Submit Milestone 1 | `pending` |

Run `DEMO_RUNS=10 npm run demo` from `agent/` to generate 50+ transactions.

## ERC-8004 Agent Identity

The CeloPact Agent is registered on the ERC-8004 agent registry on Celo Alfajores.

- Agent address: `AGENT_A_ADDRESS`
- Registry: `REGISTRY_ADDRESS`
- 8004scan profile: `https://8004scan.io/agent/AGENT_A_ADDRESS`

## Architecture

### Smart Contract (`contracts/src/CeloPactEscrow.sol`)

```
createEscrow(agentB, amounts[])
  └── Checks: both agents ERC-8004 registered, reputation ≥ 100
  └── Effects: Escrow stored, USDT transferred to contract
  └── Emits: EscrowCreated

submitMilestone(escrowId, milestoneIndex, outputHash)
  └── Checks: caller is agentB, milestone is PENDING
  └── Effects: state → SUBMITTED, submittedAt = block.timestamp
  └── Emits: MilestoneSubmitted

releaseMilestone(escrowId, milestoneIndex, oracleSignature?)
  └── Path A (oracle): verify ecrecover(hash, sig) == oracle → release now
  └── Path B (optimistic): block.timestamp > submittedAt + 30min → release
  └── Effects: state → RELEASED, USDT → agentB, reputation +100
  └── Emits: MilestoneReleased

disputeMilestone(escrowId, milestoneIndex)
  └── Checks: caller is agentA, within challenge window
  └── Effects: state → DISPUTED, arbiter = highest-rep registered agent
  └── Emits: DisputeRaised

resolveDispute(escrowId, milestoneIndex, agentAWins)
  └── Checks: caller is arbiter
  └── Effects: state → RESOLVED, USDT → winner, reputation updated
  └── Emits: DisputeResolved
```

**Security properties:**
- CEI pattern (Checks → Effects → Interactions) on all fund-moving functions
- `ReentrancyGuard` on `releaseMilestone` and `resolveDispute`
- `SafeERC20` for all token transfers
- Custom errors (not require strings) for gas efficiency
- No `delegatecall`, no `selfdestruct`, no upgradability surprises

**Oracle design:**
The `oracle` address is a trusted signer set at deploy time. In this demo it's a regular wallet. In production it would be the TEE worker address from a Phala Network enclave — the contract interface is identical because ecrecover doesn't care whether the signer is a human wallet or a TEE-sealed key.

### SDK (`sdk/src/`)

```typescript
import { CeloPact, MilestoneState } from "@celopact/sdk";

const pact = new CeloPact(config);

// Agent A creates escrow
const { escrowId } = await pact.createEscrow({
  agentB: "0x...",
  milestoneAmounts: [parseUnits("2", 6), parseUnits("3", 6)],
});

// Agent B submits work
await pact.submitMilestone({ escrowId, milestoneIndex: 0n, outputHash });

// Release via oracle (instant) or optimistic (30-min wait)
await pact.releaseMilestone({ escrowId, milestoneIndex: 0n, oracleSignature });
```

### Agent (`agent/src/`)

| File | Purpose |
|---|---|
| `index.ts` | Startup: print agent status, ERC-8004 registration, on-chain stats |
| `register.ts` | Register on ERC-8004 registry with initial reputation |
| `demo.ts` | Run full escrow lifecycle end-to-end, output tx hashes |
| `oracle.ts` | Sign quality attestations (ecrecover-compatible, Phala TEE ready) |

## Quick Start

### Prerequisites

- Node.js 18+
- Foundry (`curl -L https://foundry.paradigm.xyz | bash && foundryup`)
- A funded Celo Alfajores wallet ([faucet](https://faucet.celo.org/alfajores))

### 1. Clone and install

```bash
git clone https://github.com/YOUR_HANDLE/celopact-protocol
cd celopact-protocol

cd sdk && npm install && cd ..
cd agent && npm install && cd ..
```

### 2. Run tests

```bash
cd contracts
forge test -v
```

All 17 tests should pass:
```
[PASS] test_CreateEscrow_HappyPath
[PASS] test_SubmitMilestone_HappyPath
[PASS] test_OptimisticRelease_AfterWindow
[PASS] test_OracleRelease_WithValidSignature
[PASS] test_DisputeRaise_AgentAWins
[PASS] test_DisputeRaise_AgentBWins
... 11 more revert tests
```

### 3. Deploy to Alfajores

```bash
cd contracts
cp .env.example .env
# Fill in DEPLOYER_PRIVATE_KEY, ORACLE_ADDRESS, USDT_ADDRESS, REGISTRY_ADDRESS

forge script script/Deploy.s.sol \
  --rpc-url https://alfajores-forno.celo-testnet.org \
  --broadcast \
  --verify
```

### 4. Run the agent

```bash
cd agent
cp .env.example .env
# Fill in all values from step 3

npm run register   # Register agents on ERC-8004
npm run demo       # Run 1 full escrow lifecycle
DEMO_RUNS=10 npm run demo  # Run 10 cycles for leaderboard
```

## Ecosystem Integration

CeloPact is designed as infrastructure that makes other Celo AI projects more powerful:

| Project | How CeloPact helps |
|---|---|
| **AgentHands** | AgentHands agents can lock payment before delegating a task; the sub-agent gets paid per milestone, not upfront |
| **Toppa** | Toppa content-delivery agents can use CeloPact to guarantee deliverables before releasing creator payment |
| **Agentopolis** | City-state agents can formalize inter-agent contracts with milestone gates and dispute resolution |

## Celo Native Features Used

- **USDT on Celo** — All escrow amounts denominated in cUSD/USDT (6 decimals, ERC-20)
- **ERC-8004** — Identity + reputation check before every escrow; outcome written back after every resolution
- **Fee abstraction** — USDT covers gas (MiniPay compatibility)
- **Alfajores** — Full testnet deployment with Celoscan verification

## Test Coverage

17 tests across 6 categories:

| Category | Tests |
|---|---|
| Happy path | createEscrow, submitMilestone, optimistic release, oracle release |
| Dispute: agentA wins | Funds return to agentA, agentB reputation decremented |
| Dispute: agentB wins | Funds sent to agentB, agentA reputation decremented |
| Revert: unregistered agents | NotRegistered error |
| Revert: low reputation | ReputationTooLow error |
| Revert: timing / access | WindowNotClosed, NotAgentA, NotAgentB, NotArbiter |

## Roadmap

| Phase | Milestone |
|---|---|
| v0.1 (now) | Smart contract + SDK + agent demo on Alfajores |
| v0.2 | MCP (Model Context Protocol) server — any MCP-compatible agent can create escrows via natural language tools |
| v0.3 | Phala TEE oracle integration — replace demo oracle with hardware-attested quality verification |
| v1.0 | Celo mainnet launch + npm publish `@celopact/sdk` |

## License

MIT — built for the Celo On-Chain Agents Hackathon, June 2026.

---

**CeloPact Protocol** — Trust infrastructure for the agent economy on Celo.
