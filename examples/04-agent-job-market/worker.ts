import type { JobPosting } from "./job.js";

export interface AnalysisReport {
  jobId: string;
  title: string;
  dataset: string;
  rowCount: number;
  totalRevenueUsd: number;
  topProduct: string;
  topProductRevenueUsd: number;
  recommendation: string;
  generatedBy: "llm" | "deterministic-worker";
  generatedAt: string;
}

function parseSalesCsv(csv: string): Array<{ product: string; units: number; revenue: number }> {
  const lines = csv.trim().split("\n").slice(1);
  return lines.map((line) => {
    const [product, units, revenue] = line.split(",");
    return {
      product: product ?? "",
      units: Number(units),
      revenue: Number(revenue),
    };
  });
}

/** Deterministic analysis — always produces a real JSON deliverable (no fake hash). */
function analyzeDeterministic(job: JobPosting, csv: string): AnalysisReport {
  const rows = parseSalesCsv(csv);
  const totalRevenueUsd = rows.reduce((sum, row) => sum + row.revenue, 0);
  const top = rows.reduce((best, row) => (row.revenue > best.revenue ? row : best), rows[0]!);

  return {
    jobId: job.id,
    title: job.title,
    dataset: job.dataset,
    rowCount: rows.length,
    totalRevenueUsd,
    topProduct: top.product,
    topProductRevenueUsd: top.revenue,
    recommendation: `Increase inventory for ${top.product} — highest Q1 revenue at $${top.revenue.toLocaleString()}.`,
    generatedBy: "deterministic-worker",
    generatedAt: new Date().toISOString(),
  };
}

/** Optional OpenAI path when OPENAI_API_KEY is set. Falls back on any error. */
async function analyzeWithLlm(job: JobPosting, csv: string): Promise<AnalysisReport | null> {
  const apiKey = process.env["OPENAI_API_KEY"];
  if (!apiKey) return null;

  const model = process.env["OPENAI_MODEL"] ?? "gpt-4o-mini";
  const prompt =
    `You are Agent B, a data analyst hired via CeloPact escrow.\n` +
    `Job: ${job.title}\n${job.description}\n\nDataset (CSV):\n${csv}\n\n` +
    `Respond with ONLY valid JSON matching keys: jobId, title, dataset, rowCount, ` +
    `totalRevenueUsd, topProduct, topProductRevenueUsd, recommendation, generatedAt. ` +
    `Set jobId to "${job.id}" and dataset to "${job.dataset}".`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
      }),
    });

    if (!response.ok) return null;

    const body = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = body.choices?.[0]?.message?.content?.trim();
    if (!content) return null;

    const parsed = JSON.parse(content) as AnalysisReport;
    return { ...parsed, generatedBy: "llm" };
  } catch {
    return null;
  }
}

/** Agent B performs the hired work and returns a deliverable string (JSON). */
export async function performJob(job: JobPosting, datasetCsv: string): Promise<string> {
  const llmReport = await analyzeWithLlm(job, datasetCsv);
  const report = llmReport ?? analyzeDeterministic(job, datasetCsv);
  return JSON.stringify(report, null, 2);
}
