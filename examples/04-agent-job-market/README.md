# Example 04 — Agent Job Market

Real-world demo: Agent A posts a data-analysis job, Agent B delivers a JSON report, oracle verifies, USDT releases on Celo mainnet.

Uses **`celopact-sdk` from npm** (not a local file path).

## Demo UI (recommended for video)

```bash
cp .env.example .env          # add your wallet keys
npm install                   # installs celopact-sdk@^0.1.1 from npm
npm run dev                   # UI at http://localhost:5174 + API at :8787
```

Or production-style single port:

```bash
npm run demo                  # builds UI + opens http://localhost:8787
```

Click **Run full job on mainnet** — watch the 5-step flow, Celoscan links, and deliverable JSON.

## CLI (no browser)

```bash
npm run cli
```

## What integrators copy

This example shows the pattern production apps use:

1. **Backend** loads keys from `.env`, imports `celopact-sdk` from npm
2. **Your agent logic** performs the job off-chain
3. **Oracle service** verifies deliverable before signing
4. **Frontend** (optional) calls your API — never exposes private keys in the browser
