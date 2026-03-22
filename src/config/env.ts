import "dotenv/config";
import type { IterationMode } from "../types.js";

function readNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readIterationMode(name: string, fallback: IterationMode): IterationMode {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  if (raw.toLowerCase() === "auto") return "auto";

  const parsed = Number(raw);
  if (Number.isInteger(parsed) && parsed >= 1) {
    return parsed;
  }

  return fallback;
}

export const env = {
  openAiApiKey: process.env.OPENAI_API_KEY ?? "",
  openAiBaseUrl: process.env.OPENAI_BASE_URL ?? "",
  openAiGeneralModel: process.env.OPENAI_GENERAL_MODEL ?? "gpt-5.4",
  openAiCodexModel: process.env.OPENAI_CODEX_MODEL ?? "gpt-5.3-codex",
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
  anthropicClaudeModel: process.env.ANTHROPIC_CLAUDE_MODEL ?? "claude-sonnet-4-6",
  geminiApiKey: process.env.GEMINI_API_KEY ?? "",
  googleGeminiModel: process.env.GOOGLE_GEMINI_MODEL ?? "gemini-3.1-pro-preview",
  maxIterations: readIterationMode("MAX_ITERATIONS", 3),
  autoMaxIterationsSafetyCap: readNumber("AUTO_MAX_ITERATIONS_SAFETY_CAP", 12),
  commandTimeoutMs: readNumber("COMMAND_TIMEOUT_MS", 600000),
  runsDir: process.env.RUNS_DIR ?? "./runs",
  clonesDir: process.env.CLONES_DIR ?? "./workspaces/cloned-repos",
  qaCommandsRaw: process.env.QA_COMMANDS ?? ""
};

export function hasAtLeastOneProviderConfigured(): boolean {
  return Boolean(env.openAiApiKey || env.anthropicApiKey || env.geminiApiKey);
}
