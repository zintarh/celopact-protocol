# Examples

Three runnable examples covering the full CeloPact lifecycle. Each is a self-contained TypeScript project you can clone, configure, and run.

## Prerequisites

All examples need:
1. Two wallets funded with CELO (gas) + USDm (payment) on Celo Sepolia
2. Both agents registered via `npm run register` in the `agent/` package
3. A `.env` file — copy `.env.example` and fill in your keys

## Example Overview

| # | Name | What it demonstrates |
|---|------|---------------------|
| [01](/examples/create-and-release) | Create & Release | Full happy path: create escrow → submit milestone → oracle signs → payment released |
| [02](/examples/dispute-flow) | Dispute Flow | Agent A disputes a submission → highest-rep ERC-8004 agent resolves it |
| [03](/examples/read-state) | Read State | Read-only monitoring: fetch escrow details, milestone state, agent info |

## Running an Example

```bash
# From the repo root
npm install   # installs everything (workspaces)

cd examples/01-create-and-release
cp .env.example .env
# edit .env with your keys

npx tsx index.ts
```

All examples use `tsx` for zero-config TypeScript execution. The binary is available from the root `node_modules/.bin/tsx` via workspace hoisting.

## Source Files

The examples live in `examples/` at the repo root:

```
examples/
├── 01-create-and-release/
│   ├── index.ts          ← the code
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
├── 02-dispute-flow/
│   └── ...
└── 03-read-state/
    └── ...
```

Each `package.json` references the SDK via `"@celopact/sdk": "file:../../sdk"` so examples always run against your local SDK build.
