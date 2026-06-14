/**
 * CeloPact — Post retroactive ERC-8004 feedback
 *
 * Agent A (Requester, agentId 9351) directly calls giveFeedback() on the
 * canonical ERC-8004 Reputation Registry for Agent B (Fulfiller, agentId 9352)
 * — once per completed escrow run.
 *
 * This is semantically correct: the requester rates the fulfiller after each
 * delivered job. It bypasses the adapter (which isn't registered as an ERC-8004
 * agent) and writes feedback straight to the registry, making it visible on
 * 8004scan.io.
 *
 * Usage: npm run postFeedback
 */

import "dotenv/config";
import {
  createPublicClient,
  createWalletClient,
  http,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { resolveChain, type CeloNetworkName } from "celopact-sdk";

const NETWORK = (process.env["NETWORK"] ?? "celo-mainnet") as CeloNetworkName;
const RPC_URL = process.env["RPC_URL"] ?? "https://forno.celo.org";

const IS_MAINNET = NETWORK === "celo-mainnet";

const REPUTATION_REGISTRY: Address = IS_MAINNET
  ? "0x8004BAa17C55a88189AE136b182e5fdA19dE9b63"
  : "0x8004B663056A597Dffe9eCcC1965A193B7388713";

// ABI confirmed from on-chain implementation at 0x16e0fa7f7c56b9a767e34b192b51f921be31da34
// tag1/tag2 are `string`, NOT bytes32 — wrong type caused silent reverts in the adapter
const REPUTATION_ABI = [
  {
    name: "giveFeedback",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "agentId",      type: "uint256" },
      { name: "value",        type: "int128"  },
      { name: "valueDecimals",type: "uint8"   },
      { name: "tag1",         type: "string"  },
      { name: "tag2",         type: "string"  },
      { name: "endpoint",     type: "string"  },
      { name: "feedbackURI",  type: "string"  },
      { name: "feedbackHash", type: "bytes32" },
    ],
    outputs: [],
  },
] as const;

async function main(): Promise<void> {
  const agentAKey      = process.env["AGENT_A_PRIVATE_KEY"] as Hex;
  const agentBIdStr    = process.env["AGENT_B_ID"] ?? "9352";
  const runsStr        = process.env["FEEDBACK_RUNS"] ?? "10";

  if (!agentAKey) {
    console.error("Missing AGENT_A_PRIVATE_KEY in .env");
    process.exit(1);
  }

  const agentBId = BigInt(agentBIdStr);
  const runs     = Number(runsStr);

  const account      = privateKeyToAccount(agentAKey);
  const chain        = resolveChain({ network: NETWORK, rpcUrl: RPC_URL });
  const publicClient = createPublicClient({ chain, transport: http(RPC_URL) });
  const walletClient = createWalletClient({ account, chain, transport: http(RPC_URL) });

  console.log("\n  CELOPACT — ERC-8004 FEEDBACK WRITER");
  console.log(`  Network:    ${NETWORK}`);
  console.log(`  Rater:      ${account.address}  (Agent A, agentId 9351)`);
  console.log(`  Recipient:  agentId ${agentBId}  (Agent B)`);
  console.log(`  Registry:   ${REPUTATION_REGISTRY}`);
  console.log(`  Posting ${runs} feedback entries (one per completed escrow run)\n`);

  const zero: `0x${string}` = `0x${"00".repeat(32)}`;

  for (let i = 1; i <= runs; i++) {
    process.stdout.write(`  [${i}/${runs}] Posting feedback... `);

    try {
      const hash = await walletClient.writeContract({
        address: REPUTATION_REGISTRY,
        abi: REPUTATION_ABI,
        functionName: "giveFeedback",
        args: [agentBId, 100 as unknown as bigint, 0, "successRate", "", "", "", zero],
        account,
      });

      await publicClient.waitForTransactionReceipt({ hash });
      const explorer = IS_MAINNET ? "https://celoscan.io" : "https://celo-sepolia.blockscout.com";
      console.log(`✓  ${explorer}/tx/${hash}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`✗  FAILED: ${msg.slice(0, 120)}`);
    }

    // small delay to avoid nonce issues
    await new Promise(r => setTimeout(r, 2000));
  }

  console.log("\n✓ Done. Check 8004scan.io for updated feedback on agentId 9352.\n");
}

main().catch((err: unknown) => {
  console.error("postFeedback failed:", err);
  process.exit(1);
});
