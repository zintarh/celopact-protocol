#!/usr/bin/env bash
# deploy-mainnet.sh — Full mainnet deployment + agent registration
#
# Run this ONCE after funding:
#   Agent A (0xE55D1f443338A94c83d57821C96dAF9C7060150C): 1 CELO + 2 USDT
#   Agent B (0xfB72a7d2d8430e10aFA753fe1afe99B6E27f8Aec): 0.2 CELO
#
# Usage: bash deploy-mainnet.sh [celo-mainnet|celo-sepolia]
# Default: celo-mainnet

set -euo pipefail

NETWORK="${1:-celo-mainnet}"

if [ "$NETWORK" = "celo-mainnet" ]; then
  RPC_URL="https://forno.celo.org"
  TOKEN="0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e"   # USDT (6 decimals)
  CHAIN_FLAG="--rpc-url https://forno.celo.org"
  VERIFIER_FLAGS="--verify --verifier etherscan --verifier-url https://api.celoscan.io/api --etherscan-api-key ${CELOSCAN_API_KEY:-}"
else
  RPC_URL="https://forno.celo-sepolia.celo-testnet.org"
  TOKEN="0xdE9e4C3ce781b4bA68120d6261cbad65ce0aB00b"   # USDm Sepolia
  CHAIN_FLAG="--rpc-url https://forno.celo-sepolia.celo-testnet.org"
  VERIFIER_FLAGS="--verify --verifier blockscout --verifier-url https://celo-sepolia.blockscout.com/api"
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  CELOPACT MAINNET DEPLOY"
echo "  Network: $NETWORK"
echo "  RPC:     $RPC_URL"
echo "  Token:   $TOKEN"
echo "═══════════════════════════════════════════════════════════"
echo ""

# ── Step 1: Deploy contracts ──────────────────────────────────────────────────
echo "▶ Step 1: Deploying ERC8004Adapter + CeloPactEscrow..."
cd contracts

# Load DEPLOYER_PRIVATE_KEY and ORACLE_ADDRESS from contracts/.env
source .env

TOKEN_ADDRESS="$TOKEN" \
forge script script/Deploy.s.sol \
  $CHAIN_FLAG \
  --broadcast \
  --gas-price 5000000000 \
  $VERIFIER_FLAGS \
  2>&1 | tee /tmp/celopact-deploy.log

# Extract deployed addresses from forge output
ADAPTER_ADDR=$(grep "ERC8004Adapter deployed at:" /tmp/celopact-deploy.log | awk '{print $NF}')
ESCROW_ADDR=$(grep "CeloPactEscrow deployed at:" /tmp/celopact-deploy.log | awk '{print $NF}')

echo ""
echo "  ERC8004Adapter: $ADAPTER_ADDR"
echo "  CeloPactEscrow: $ESCROW_ADDR"
echo ""

# ── Step 2: Write deployment manifest ────────────────────────────────────────
cd ..
echo "▶ Step 2: Writing deployments/$NETWORK.json..."

if [ "$NETWORK" = "celo-mainnet" ]; then
  EXPLORER_BASE="https://celoscan.io"
  cat > deployments/celo-mainnet.json << EOF
{
  "network": "Celo Mainnet",
  "chainId": 42220,
  "deployedAt": "$(date +%Y-%m-%d)",
  "rpc": "https://forno.celo.org",
  "explorer": "https://celoscan.io",
  "erc8004": {
    "identityRegistry": "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432",
    "reputationRegistry": "0x8004BAa17C55a88189AE136b182e5fdA19dE9b63"
  },
  "contracts": {
    "ERC8004Adapter": {
      "address": "$ADAPTER_ADDR",
      "verified": true,
      "explorer": "$EXPLORER_BASE/address/$ADAPTER_ADDR"
    },
    "CeloPactEscrow": {
      "address": "$ESCROW_ADDR",
      "verified": true,
      "explorer": "$EXPLORER_BASE/address/$ESCROW_ADDR",
      "constructorArgs": {
        "registry": "$ADAPTER_ADDR",
        "token": "$TOKEN",
        "oracle": "$ORACLE_ADDRESS"
      }
    }
  },
  "tokens": {
    "USDT": {
      "address": "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e",
      "symbol": "USDT",
      "decimals": 6
    }
  }
}
EOF
fi

echo "  Written deployments/$NETWORK.json"

# ── Step 3: Update agent .env for mainnet ────────────────────────────────────
echo "▶ Step 3: Updating agent/.env for $NETWORK..."
cd agent

# Patch agent .env
sed -i.bak \
  -e "s|CONTRACT_ADDRESS=.*|CONTRACT_ADDRESS=$ESCROW_ADDR|" \
  -e "s|REGISTRY_ADDRESS=.*|REGISTRY_ADDRESS=$ADAPTER_ADDR|" \
  -e "s|TOKEN_ADDRESS=.*|TOKEN_ADDRESS=$TOKEN|" \
  -e "s|RPC_URL=.*|RPC_URL=$RPC_URL|" \
  .env

# Add or update NETWORK line
if grep -q "^NETWORK=" .env; then
  sed -i.bak "s|^NETWORK=.*|NETWORK=$NETWORK|" .env
else
  echo "NETWORK=$NETWORK" >> .env
fi

rm -f .env.bak

echo "  agent/.env updated"
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  DEPLOY COMPLETE"
echo "  ERC8004Adapter: $ADAPTER_ADDR"
echo "  CeloPactEscrow: $ESCROW_ADDR"
echo ""
echo "  Next steps:"
echo "    cd agent && npm run register    # register both agents on ERC-8004"
echo "    npm run demo                    # one full lifecycle (shows tx hashes)"
echo "    npm run commerce               # start autonomous commerce loop"
echo "═══════════════════════════════════════════════════════════"
