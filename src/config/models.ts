import { env } from "./env.js";
import type { ModelBinding, ModelAlias, RoleAssignment, AgentRole } from "../types.js";

export const modelCatalog: Record<ModelAlias, ModelBinding> = {
  gpt: {
    alias: "gpt",
    provider: "openai",
    model: env.openAiGeneralModel,
    enabled: Boolean(env.openAiApiKey)
  },
  codex: {
    alias: "codex",
    provider: "openai",
    model: env.openAiCodexModel,
    enabled: Boolean(env.openAiApiKey)
  },
  claude: {
    alias: "claude",
    provider: "anthropic",
    model: env.anthropicClaudeModel,
    enabled: Boolean(env.anthropicApiKey)
  },
  gemini: {
    alias: "gemini",
    provider: "google",
    model: env.googleGeminiModel,
    enabled: Boolean(env.geminiApiKey)
  }
};

export const roleAssignments: Record<AgentRole, RoleAssignment> = {
  manager: { primary: "gpt", secondary: "claude", emergency: "gpt" },
  backendCoder: { primary: "codex", secondary: "claude", emergency: "codex" },
  frontendCoder: { primary: "claude", secondary: "codex", emergency: "codex" },
  designSystem: { primary: "gemini", secondary: "gpt", emergency: "gpt" },
  designUx: { primary: "gpt", secondary: "gemini", emergency: "gpt" },
  qa: { primary: "gpt", secondary: "claude", emergency: "gpt" },
  reviewer: { primary: "codex", secondary: "gpt", emergency: "codex" }
};

export function ensureRoleHasAtLeastOneConfiguredModel(role: AgentRole): void {
  const assignment = roleAssignments[role];
  const aliases = [assignment.primary, assignment.secondary, assignment.emergency];
  const hasOne = aliases.some((alias) => modelCatalog[alias].enabled);
  if (!hasOne) {
    throw new Error(
      `No configured model is available for role "${role}". Check your .env provider keys and model IDs.`
    );
  }
}
