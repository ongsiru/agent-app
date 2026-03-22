import type { QAResult, WorkspaceContext } from "../types.js";
import { parseJsonObject } from "../utils/json.js";
import { systemJsonOnly } from "../utils/prompting.js";
import type { ModelRouter } from "../router/modelRouter.js";

type RawQaSummary = {
  passed: boolean;
  summary: string;
  issues: string[];
};

export async function summarizeQa(
  router: ModelRouter,
  context: WorkspaceContext,
  rawCommandResults: QAResult["commands"],
  round: number
): Promise<QAResult> {
  if (rawCommandResults.length === 0) {
    return {
      passed: true,
      summary: "No package scripts were available for lint/test/build. QA commands were skipped.",
      issues: [],
      commands: [],
      modelAliasUsed: "gpt",
      providerUsed: "openai",
      modelUsed: "local-skip"
    };
  }

  const response = await router.generateForRole({
    role: "qa",
    round,
    system: systemJsonOnly("QA Agent"),
    prompt: `
You are QA Agent.

Workspace package scripts:
${JSON.stringify(context.packageScripts, null, 2)}

Command results:
${JSON.stringify(rawCommandResults, null, 2)}

Return strict JSON with this exact shape:
{
  "passed": true,
  "summary": "string",
  "issues": ["string"]
}
`,
    maxOutputTokens: 2000
  });

  const parsed = parseJsonObject<RawQaSummary>(response.text);

  return {
    passed: parsed.passed,
    summary: parsed.summary,
    issues: parsed.issues ?? [],
    commands: rawCommandResults,
    modelAliasUsed: response.alias,
    providerUsed: response.provider,
    modelUsed: response.model
  };
}
