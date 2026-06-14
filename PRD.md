# CeloPact Protocol — Product Requirements Document
### The Trust Infrastructure for Agent-to-Agent Commerce on Celo

> **Status (June 2026):** Shipped on **Celo Mainnet** · `celopact-sdk` on npm · 40+ demo txs · See [`README.md`](README.md) for judge checklist.

**Version:** 2.0 (Compressed — One Day Build)
**Date:** June 11, 2026
**Deadline:** June 15, 2026 — Celo On-Chain Agents Hackathon
**Build Window:** June 11 (today) — everything ships today
**June 12:** Demo video + submission write-up only
**Status:** 🔴 ACTIVE BUILD — CLOCK IS RUNNING

---

## 1. THE PROBLEM

AI agents are moving hundreds of millions of dollars between each other right now.
Every single payment is instant and irreversible. No escrow. No milestones. No
quality check. No dispute resolution. Agent A pays Agent B, Agent B returns garbage,
money is gone.

x402 handles payment initiation. ERC-8004 handles identity. Nobody has built
the trust enforcement layer that sits between them.

Kustodia shipped a closed enterprise version of this in June 2026.
That proves the market. We are building the open-source version.

---

## 2. THE SOLUTION — CeloPact Protocol

A milestone-based escrow smart contract system for AI agents on Celo.

Agent A locks USDT. Agent B completes milestones. An optimistic release window
enforces delivery. Disputes go to a Requester-proposed ERC-8004 arbiter (min reputation 100).
Every outcome writes back to the ERC-8004 Reputation Registry.

**Name:** CeloPact Protocol
**Why this name:**
- "Celo" = instant ecosystem signal to both human and AI judges
- "Pact" = binding agreement with consequences for breaking it
- Works cross-culturally (English, French, Spanish, Portuguese)
- npm: celopact-sdk — clean, installable, professional

---

## 3. HACKATHON TARGET

**Event:** Celo On-Chain Agents Hackathon
**Deadline:** June 15, 2026
**Prize Pool:** $5,000 USDT
**Tracks:**
1. Best Agent on Celo
2. Most On-chain Transactions
3. Highest 8004scan Rank

**Multi-track strategy:**
- Register the CeloPact Agent on ERC-8004 today → starts accumulating 8004scan rank
- Every demo run generates real on-chain transactions → Track 2
- The concept + integration depth → Track 1

---

## 4. CRITICAL: WE ARE BUILDING FOR AN AI JUDGE

Celo's judging process uses trained AI agents that evaluate every submission
across 18 data points. This is not a human looking at a demo video.
This is a machine reading our code, querying the blockchain, checking our
GitHub repo, and scoring 18 measurable signals.

This means:
- Code that is unclear = points lost. No exceptions.
- A function with no NatSpec = the AI cannot understand its purpose.
- A TODO comment = the AI scores it as incomplete work.
- An event not emitted = the AI cannot verify the system works.
- A missing test = the AI cannot confirm correctness.
- A README that buries the architecture = the AI misses context.

We do not write code for humans first and document later.
We write code that is simultaneously documentation.

---

## 5. THE 18 AI EVALUATION POINTS

Every build decision must be checked against this list before shipping.
Before submission, run through every row. Every row must be satisfiable.

| #  | Signal                                     | How We Satisfy It                                       |
|----|--------------------------------------------|---------------------------------------------------------|
| 1  | ERC-8004 agent registration exists         | Run register.ts today, confirm on 8004scan.io           |
| 2  | ERC-8004 reputation score / 8004scan rank  | Register early, run demo transactions to build score    |
| 3  | Number of on-chain transactions            | Run demo script 10x — each run = 3-5 transactions       |
| 4  | Contract deployed on Celo network          | Deploy to Alfajores today, save address in deployments/ |
| 5  | Contract source is readable / verified     | Verify on Celoscan after deploy                         |
| 6  | Test suite exists and passes               | Foundry: happy path + dispute + edge cases, all green   |
| 7  | README completeness                        | Diagram + instructions + deployed address at the top    |
| 8  | NatSpec documentation on all functions     | Every public function has @notice @param @return        |
| 9  | Events emitted on every state change       | 5 events: Created, Submitted, Released, Disputed, Resolved |
| 10 | No obvious security vulnerabilities        | CEI pattern, custom errors, ReentrancyGuard             |
| 11 | Real-world utility is substantiated        | README names AgentHands + Toppa integrations explicitly |
| 12 | Integration with Celo-native features      | USDT payment token, ERC-8004 identity checks on create  |
| 13 | Innovation — solves an unsolved problem    | First open-source agent escrow SDK on Celo              |
| 14 | GitHub repo has meaningful commit history  | Commit each block as it is completed, descriptive msgs  |
| 15 | SDK installable by other developers     | celopact-sdk on npm with package.json exports field           |
| 16 | Demo evidence — tx hashes in README        | Paste real Alfajores tx hashes into README after demo   |
| 17 | Functional agent that completes tasks      | demo.ts runs end-to-end without errors                  |
| 18 | Ecosystem contribution                     | README section: How CeloPact makes other Celo agents better |

---

## 6. ORACLE STRATEGY — NO TEE TODAY

Phala TEE is the production vision. It is not today's build.

**What we ship: Optimistic Release + Signed Demo Oracle**

Optimistic Release (primary path):
- Agent B submits milestone completion
- A challenge window opens (30 minutes demo / 24 hours production)
- If Agent A does not dispute within the window, payment auto-releases
- This is the same pattern Optimism uses. Battle-tested. Zero dependencies.

Signed Oracle (demo fast path):
- A designated oracle wallet signs a quality attestation off-chain
- Contract verifies signature via ecrecover
- If valid, releases immediately without waiting for window
- Documented in contract:

  /// @dev Demo oracle address. Production: replace with Phala TEE attestation verifier
  /// or zkML proof verifier. Interface is identical — only the signer changes.
  address public oracle;

The AI judge reading this understands: correct interface, honest demo scope,
clear production upgrade path. This scores higher than a fake TEE integration.

---

## 7. MVP SCOPE — TODAY ONLY

### IN SCOPE

contracts/
  CeloPactEscrow.sol        Core contract (~150 lines)
  IAgentRegistry.sol        ERC-8004 minimal interface (~20 lines)
  MockAgentRegistry.sol     For tests only (~30 lines)
  CeloPactEscrow.t.sol      Foundry test suite (~120 lines)
  Deploy.s.sol              Deployment script

sdk/
  src/types.ts              TypeScript interfaces
  src/client.ts             Viem Celo client
  src/escrow.ts             4 core SDK functions
  src/index.ts              Barrel exports
  package.json              @celopact/sdk

agent/
  src/register.ts           ERC-8004 registration
  src/demo.ts               Full lifecycle demo
  src/oracle.ts             Demo oracle signer
  src/index.ts              Entry point
  .env.example

README.md                   Primary submission document
deployments/alfajores.json  Contract addresses after deploy

### OUT OF SCOPE — DO NOT TOUCH TODAY

Phala TEE integration            (2+ days minimum)
Base / cross-chain deployment    (Celo only, stay focused)
Frontend dashboard               (no infra track in June hackathon)
Full MCP server                  (document as Phase 2)
Multi-arbiter voting             (single arbiter, upgrade later)
x402 HTTP integration            (document as Phase 2)
Token staking / slashing         (post-hackathon)

---

## 8. COMPRESSED ONE-DAY SPRINT

Everything done by end of June 11.
June 12: demo video + submission write-up only.

BLOCK 1 — 90 min — Smart Contracts
  forge init contracts/
  Write IAgentRegistry.sol
  Write MockAgentRegistry.sol
  Write CeloPactEscrow.sol
  Write CeloPactEscrow.t.sol
  forge test — all green
  forge script Deploy — live on Alfajores
  Save address to deployments/alfajores.json
  Verify source on Celoscan

BLOCK 2 — 90 min — SDK
  npm init sdk/
  Write types.ts
  Write client.ts (viem + Celo chain config)
  Write escrow.ts (createEscrow, submitMilestone, release, dispute)
  Write index.ts (barrel exports)
  tsc — no errors

BLOCK 3 — 60 min — Agent + ERC-8004 Registration
  npm init agent/
  Write register.ts
  Run registration on Alfajores → confirm on 8004scan.io
  Write oracle.ts (demo signer)
  Write demo.ts (full lifecycle: create → submit → oracle sign → release)
  Run demo once end-to-end — must complete without errors

BLOCK 4 — 60 min — Transactions + Evidence
  Run demo.ts 10 times
  Copy all transaction hashes
  Paste real tx hashes into README
  Verify 8004scan rank has updated

BLOCK 5 — 60 min — README + Code Polish
  Write README.md (primary AI judge document)
  ASCII architecture diagram at the top
  Deployed contract address prominent
  Real tx hashes listed
  Integration section naming AgentHands + Toppa
  18-point checklist section
  Remove every TODO from every file
  NatSpec on every public contract function
  Final forge test — all green

BLOCK 6 — 30 min — Git + Publish
  git init, initial commit
  Push to GitHub (public)
  Confirm repo is publicly readable
  Run 18-point checklist manually

JUNE 12:
  Record demo video (screen share of demo.ts running live)
  Write 500-word submission description
  Submit to hackathon

---

## 9. FILE STRUCTURE

celopact-protocol/
  PRD.md
  README.md                         Primary submission document
  deployments/
    alfajores.json                  { "CeloPactEscrow": "0x..." }
  contracts/
    foundry.toml
    script/
      Deploy.s.sol
    src/
      CeloPactEscrow.sol            THE core contract
      IAgentRegistry.sol            ERC-8004 interface
      MockAgentRegistry.sol         Test mock
    test/
      CeloPactEscrow.t.sol          Full test suite
  sdk/
    package.json                    name: "@celopact/sdk"
    tsconfig.json
    src/
      index.ts
      types.ts
      client.ts
      escrow.ts
  agent/
    package.json
    tsconfig.json
    .env.example
    src/
      index.ts
      register.ts
      oracle.ts
      demo.ts

---

## 10. ARCHITECTURE DIAGRAM

+----------------------------------------------------------+
|                   CELOPACT PROTOCOL                      |
|                                                          |
|  Agent A (Orchestrator)      Agent B (Specialist)        |
|        |                             |                   |
|        |-- createEscrow() ---------> |                   |
|        |   [USDT locked]             |                   |
|        |                             |                   |
|        |            submitMilestone()|                   |
|        |<--------------------------- |                   |
|        |                             |                   |
|   +----+-----------------------------+----------------+  |
|   |              CeloPactEscrow.sol                   |  |
|   |                                                   |  |
|   |  Milestone States:                                |  |
|   |  PENDING -> SUBMITTED -> RELEASED                 |  |
|   |                       -> DISPUTED -> RESOLVED     |  |
|   |                                                   |  |
|   |  Release Paths:                                   |  |
|   |  1. Optimistic: auto after challenge window       |  |
|   |  2. Oracle: ecrecover signed attestation          |  |
|   |  3. Arbiter: highest ERC-8004 reputation agent    |  |
|   |                                                   |  |
|   |  +-------------------------------------------+   |  |
|   |  |        IAgentRegistry (ERC-8004)          |   |  |
|   |  |  isRegistered() | getScore() | record()   |   |  |
|   |  +-------------------------------------------+   |  |
|   +---------------------------------------------------+  |
|                                                          |
|  +----------------------------------------------------+  |
|  |                  @celopact/sdk                     |  |
|  |  createEscrow | submitMilestone | release | dispute |  |
|  +----------------------------------------------------+  |
|                                                          |
|  +----------------------------------------------------+  |
|  |               CeloPact Agent                       |  |
|  |  ERC-8004 registered | Runs demo | Logs tx hashes  |  |
|  +----------------------------------------------------+  |
+----------------------------------------------------------+

---

## 11. CODE QUALITY STANDARDS — NON-NEGOTIABLE

The AI judge deducts points for each violation. No exceptions.

Solidity:
  - NatSpec on EVERY public/external function
  - Custom errors: error NotRegistered(address agent) — not require strings
  - Events on every state change — minimum 5 events
  - CEI pattern on every function that transfers tokens
  - Named constants: CHALLENGE_WINDOW, not magic numbers
  - Explicit visibility on every variable and function
  - No TODO comments in any file that gets committed

TypeScript:
  - No `any` types
  - Explicit return type on every function
  - Descriptive names: escrowId not id, agentAddress not addr
  - Try/catch on every blockchain call
  - Export types from index.ts

README:
  - Architecture diagram within first 20 lines
  - Deployed contract address is prominent
  - Real Alfajores tx hashes listed
  - npm install @celopact/sdk is the first code block
  - Section: Integration with AgentHands, Toppa, Agentopolis
  - Section: 18-Point Submission Checklist (filled in)

---

## 12. INTEGRATION NARRATIVE

AgentHands (Celo V2 winner): built agents that hire humans. No escrow exists.
CeloPact is the missing trust layer: lock payment at job creation, release on
verified completion, dispute if quality fails. AgentHands + CeloPact = a real
marketplace, not just a vending machine.

Toppa (Celo V2 winner): telecom payments in 170 countries. As Toppa scales,
it will hire specialist agents. CeloPact lets Toppa commission safely.

Agentopolis (Celo V2 winner, $3K): A2A communication bridge. When agents
discover each other through Agentopolis and agree to transact, CeloPact
enforces the agreement. Discovery + Trust = a complete stack.

One sentence for judges:
CeloPact is the trust layer that makes every other Celo agent project safe
to use with real money.

---

## 13. POST-HACKATHON ROADMAP

Phase 2: Phala TEE oracle — zero contract changes, only oracle address changes.
Phase 3: Multi-arbiter 3-of-5 + temporal reputation decay.
Phase 4: Base deployment + Chainlink CCIP cross-chain identity.
Phase 5: x402 native — auto-open escrow on HTTP 402 payment initiation.

---

## 14. COMPETITIVE POSITION

vs. Kustodia:    Open-source. On Celo. Free for every builder.
vs. SEIpients:   Deployed and working. They have TODOs in their README.
vs. AgentFund:   Agent-to-agent. They do crowdfunding.
vs. x402Resolve: Multi-framework + ERC-8004. They are Solana-only.
vs. Celo itself: First open trust layer for agent commerce on this chain.

---

Last updated: June 11, 2026 — Compressed single-day build
