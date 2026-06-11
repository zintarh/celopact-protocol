import { keccak256, encodePacked, toBytes } from "viem";
import { privateKeyToAccount, signMessage } from "viem/accounts";
import type { Hex } from "viem";

/**
 * Demo oracle that signs quality attestations for milestone releases.
 *
 * In production this logic runs inside a Phala TEE enclave:
 * - The TEE receives Agent B's output
 * - Runs a deterministic quality check
 * - Signs the attestation using a hardware-sealed key
 * - The contract verifies via ecrecover against the registered oracle address
 *
 * For the hackathon demo, the oracle is a regular wallet we control.
 * The signing interface is identical to what the TEE produces.
 */
export class DemoOracle {
  private readonly privateKey: Hex;
  private readonly account: ReturnType<typeof privateKeyToAccount>;

  constructor(oraclePrivateKey: Hex) {
    this.privateKey = oraclePrivateKey;
    this.account = privateKeyToAccount(oraclePrivateKey);
  }

  /** The oracle's public address — must match the `oracle` variable in the contract. */
  get address(): `0x${string}` {
    return this.account.address;
  }

  /**
   * Signs a quality attestation for a completed milestone.
   * The signature format matches what the smart contract verifies via ecrecover.
   *
   * @param escrowId - The escrow identifier.
   * @param milestoneIndex - The milestone being attested.
   * @param outputHash - keccak256 of Agent B's deliverable.
   * @returns 65-byte signature (r + s + v).
   */
  async signAttestation(
    escrowId: bigint,
    milestoneIndex: bigint,
    outputHash: Hex
  ): Promise<Hex> {
    // Reproduce the exact message hash the contract uses for ecrecover
    const messageHash = keccak256(
      encodePacked(
        ["uint256", "uint256", "bytes32"],
        [escrowId, milestoneIndex, outputHash]
      )
    );

    // signMessage applies the "\x19Ethereum Signed Message:\n32" prefix,
    // matching the contract's ethSignedHash computation.
    const signature = await signMessage({
      privateKey: this.privateKey,
      message: { raw: toBytes(messageHash) },
    });

    return signature;
  }
}
