/**
 * CeloPact — Re-link existing ERC-8004 agentIds to a new adapter
 *
 * Used after redeploying ERC8004Adapter. Agents already own their agentId NFTs
 * (9351, 9352) on the canonical identity registry — we just need to call
 * linkAgent() on the NEW adapter to register the wallet → agentId mapping there.
 *
 * Does NOT call identityRegistry.register() — that would mint new NFTs.
 *
 * Usage: npm run relink
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

const NETWORK  = (process.env["NETWORK"]  ?? "celo-mainnet") as CeloNetworkName;
const RPC_URL  = process.env["RPC_URL"]   ?? "https://forno.celo.org";
const EXPLORER = NETWORK === "celo-mainnet" ? "https://celoscan.io" : "https://celo-sepolia.blockscout.com";

const ADAPTER_ABI = [
  {
    name: "linkAgent",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "agentId", type: "uint256" }],
    outputs: [],
  },
  {
    name: "isRegistered",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "agent", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "agentIds",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

async function relink(
  label: string,
  key: Hex,
  agentId: bigint,
  adapterAddress: Address,
): Promise<void> {
  const account      = privateKeyToAccount(key);
  const chain        = resolveChain({ network: NETWORK, rpcUrl: RPC_URL });
  const publicClient = createPublicClient({ chain, transport: http(RPC_URL) });
  const walletClient = createWalletClient({ account, chain, transport: http(RPC_URL) });

  console.log(`\n[Relink] ${label}`);
  console.log(`         Wallet:  ${account.address}`);
  console.log(`         agentId: ${agentId}`);

  const already = await publicClient.readContract({
    address: adapterAddress,
    abi: ADAPTER_ABI,
    functionName: "isRegistered",
    args: [account.address],
  });

  if (already) {
    const linked = await publicClient.readContract({
      address: adapterAddress,
      abi: ADAPTER_ABI,
      functionName: "agentIds",
      args: [account.address],
    });
    console.log(`         Already linked ✓  agentId: ${linked}`);
    return;
  }

  const hash = await walletClient.writeContract({
    address: adapterAddress,
    abi: ADAPTER_ABI,
    functionName: "linkAgent",
    args: [agentId],
    account,
  });
  await publicClient.waitForTransactionReceipt({ hash });
  console.log(`         Linked ✓  tx: ${EXPLORER}/tx/${hash}`);
}

async function main(): Promise<void> {
  const agentAKey      = process.env["AGENT_A_PRIVATE_KEY"] as Hex;
  const agentBKey      = process.env["AGENT_B_PRIVATE_KEY"] as Hex;
  const adapterAddress = process.env["REGISTRY_ADDRESS"]    as Address;

  // Known agentIds — minted during initial registration, permanent on ERC-8004
  const AGENT_A_ID = BigInt(process.env["AGENT_A_ID"] ?? "9351");
  const AGENT_B_ID = BigInt(process.env["AGENT_B_ID"] ?? "9352");

  if (!agentAKey || !agentBKey || !adapterAddress) {
    console.error("Missing AGENT_A_PRIVATE_KEY, AGENT_B_PRIVATE_KEY, or REGISTRY_ADDRESS in .env");
    process.exit(1);
  }

  console.log("\n  CELOPACT — RE-LINK AGENTS TO NEW ADAPTER");
  console.log(`  Network: ${NETWORK}`);
  console.log(`  Adapter: ${adapterAddress}`);

  await relink("CeloPact Requester", agentAKey, AGENT_A_ID, adapterAddress);
  await relink("CeloPact Fulfiller", agentBKey, AGENT_B_ID, adapterAddress);

  console.log("\n✓ Both agents re-linked. agentIds 9351 + 9352 preserved.\n");
}

main().catch((err: unknown) => {
  console.error("relink failed:", err);
  process.exit(1);
});
