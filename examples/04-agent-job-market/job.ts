/** Structured job Agent A posts when hiring Agent B on-chain. */
export interface JobPosting {
  id: string;
  title: string;
  description: string;
  dataset: string;
  deliverable: string;
  /** USDT amounts per milestone (base units, 6 decimals on mainnet). */
  milestoneAmounts: bigint[];
}

/** Sample job judges can follow: data analysis with a concrete deliverable. */
export const SAMPLE_DATA_ANALYSIS_JOB: JobPosting = {
  id: "job-q1-sales-analysis",
  title: "Q1 Sales Data Analysis",
  description:
    "Analyze the attached Q1 sales dataset. Return a JSON report with summary stats, " +
    "top product, and one actionable recommendation for Agent A.",
  dataset: "q1_sales.csv",
  deliverable: "analysis-report.json",
  milestoneAmounts: [500_000n], // 0.5 USDT — one milestone, one deliverable
};

/** Embedded dataset Agent B analyzes (no external file fetch needed for demo). */
export const Q1_SALES_CSV = `product,units,revenue_usd
Widget A,120,4800
Widget B,85,3400
Widget C,200,6000
Widget D,45,2250
Widget E,310,9300`;
