import type { ManagerPlan, QAResult, ReviewResult } from "../types.js";
import { parseJsonObject } from "../utils/json.js";
import { systemJsonOnly } from "../utils/prompting.js";
import type { ModelRouter } from "../router/modelRouter.js";

type RawReview = {
  accepted: boolean;
  score: number;
  summary: string;
  feedback: string[];
  perRoleFeedback: Partial<Record<"backendCoder" | "frontendCoder" | "designSystem" | "designUx", string[]>>;
  risks: string[];
};

export async function reviewImplementation(
  router: ModelRouter,
  plan: ManagerPlan,
  qa: QAResult,
  diffText: string,
  round: number
): Promise<ReviewResult> {
  const response = await router.generateForRole({
    role: "reviewer",
    round,
    system: systemJsonOnly("Review Agent"),
    prompt: `
You are the final reviewer.

Review criteria:
${JSON.stringify(plan.reviewCriteria, null, 2)}

QA:
${JSON.stringify(qa, null, 2)}

Unified diff:
${diffText.slice(0, 50000)}

Return strict JSON with this shape:
{
  "accepted": true,
  "score": 0,
  "summary": "string",
  "feedback": ["string"],
  "perRoleFeedback": {
    "backendCoder": ["string"],
    "frontendCoder": ["string"],
    "designSystem": ["string"],
    "designUx": ["string"]
  },
  "risks": ["string"]
}

Scoring rules:
- 85+ usually means acceptable unless QA clearly failed.
- If QA failed, accepted should normally be false.
- Feedback must be concrete and actionable.
`,
    maxOutputTokens: 4000
  });

  const parsed = parseJsonObject<RawReview>(response.text);

  return {
    accepted: parsed.accepted,
    score: parsed.score,
    summary: parsed.summary,
    feedback: parsed.feedback ?? [],
    perRoleFeedback: parsed.perRoleFeedback ?? {},
    risks: parsed.risks ?? [],
    modelAliasUsed: response.alias,
    providerUsed: response.provider,
    modelUsed: response.model
  };
}
