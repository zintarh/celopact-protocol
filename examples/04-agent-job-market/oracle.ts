import { encodePacked, keccak256, toBytes } from "viem";
import { signMessage } from "viem/accounts";
import type { Hex } from "viem";
import type { AnalysisReport } from "./worker.js";

const REQUIRED_FIELDS: Array<keyof AnalysisReport> = [
  "jobId",
  "totalRevenueUsd",
  "topProduct",
  "recommendation",
];

/** Oracle quality gate — verifies deliverable content before signing. */
export function verifyDeliverable(deliverable: string, expectedJobId: string): AnalysisReport {
  let report: AnalysisReport;
  try {
    report = JSON.parse(deliverable) as AnalysisReport;
  } catch {
    throw new Error("Deliverable is not valid JSON");
  }

  for (const field of REQUIRED_FIELDS) {
    if (report[field] === undefined || report[field] === null || report[field] === "") {
      throw new Error(`Deliverable missing required field: ${field}`);
    }
  }

  if (report.jobId !== expectedJobId) {
    throw new Error(`jobId mismatch: expected ${expectedJobId}, got ${report.jobId}`);
  }

  if (report.totalRevenueUsd <= 0) {
    throw new Error("totalRevenueUsd must be positive");
  }

  return report;
}

export function hashDeliverable(deliverable: string): Hex {
  return keccak256(toBytes(deliverable));
}

export async function signAttestation(
  oraclePrivateKey: Hex,
  escrowId: bigint,
  milestoneIndex: bigint,
  outputHash: Hex
): Promise<Hex> {
  const messageHash = keccak256(
    encodePacked(["uint256", "uint256", "bytes32"], [escrowId, milestoneIndex, outputHash])
  );

  return signMessage({
    privateKey: oraclePrivateKey,
    message: { raw: toBytes(messageHash) },
  });
}
