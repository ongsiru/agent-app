import type {
  ManagerDecision,
  ManagerPlan,
  QAResult,
  ReviewResult,
  RoleTask,
  WorkspaceContext
} from "../types.js";
import { parseJsonObject } from "../utils/json.js";
import { renderFiles, systemJsonOnly } from "../utils/prompting.js";
import type { ModelRouter } from "../router/modelRouter.js";

function roleTaskTemplate(role: RoleTask["role"]): Omit<RoleTask, "role"> {
  return {
    goal: "",
    targetPaths: [],
    constraints: [],
    deliverables: [],
    contextHints: []
  };
}

export async function createManagerPlan(
  router: ModelRouter,
  context: WorkspaceContext,
  userTask: string,
  round: number
): Promise<ManagerPlan> {
  const system = systemJsonOnly("Manager Agent");
  const prompt = `
You are the manager/orchestrator for a local coding agent system.

User task:
${userTask}

Workspace file tree:
${context.fileTree}

Seed files:
${renderFiles(context.seedFiles)}

Create a JSON object with this exact shape:
{
  "architectureSummary": "string",
  "managerNotes": ["string"],
  "reviewCriteria": ["string"],
  "qaDirectives": ["string"],
  "tasks": {
    "backendCoder": {
      "role": "backendCoder",
      "goal": "string",
      "targetPaths": ["string"],
      "constraints": ["string"],
      "deliverables": ["string"],
      "contextHints": ["string"]
    },
    "frontendCoder": {
      "role": "frontendCoder",
      "goal": "string",
      "targetPaths": ["string"],
      "constraints": ["string"],
      "deliverables": ["string"],
      "contextHints": ["string"]
    },
    "designSystem": {
      "role": "designSystem",
      "goal": "string",
      "targetPaths": ["string"],
      "constraints": ["string"],
      "deliverables": ["string"],
      "contextHints": ["string"]
    },
    "designUx": {
      "role": "designUx",
      "goal": "string",
      "targetPaths": ["string"],
      "constraints": ["string"],
      "deliverables": ["string"],
      "contextHints": ["string"]
    }
  }
}

Rules:
- Split responsibilities clearly.
- backendCoder focuses API / server / DB / data flow.
- frontendCoder focuses UI logic / state / wiring.
- designSystem focuses shared styles, theme, tokens, ui primitives.
- designUx focuses page-level layout, responsiveness, polish, accessibility.
- Prefer small, concrete targetPaths.
- If a role has little to do, still return a valid task with a concise goal.
`;

  const response = await router.generateForRole({
    role: "manager",
    round,
    system,
    prompt,
    maxOutputTokens: 5000
  });

  const parsed = parseJsonObject<ManagerPlan>(response.text);
  return parsed;
}

export async function createManagerDecision(
  router: ModelRouter,
  context: WorkspaceContext,
  userTask: string,
  currentPlan: ManagerPlan,
  qa: QAResult,
  review: ReviewResult,
  changedFiles: string[],
  round: number
): Promise<ManagerDecision> {
  const system = systemJsonOnly("Manager Agent");
  const prompt = `
You are deciding whether the current implementation is good enough or needs another iteration.

User task:
${userTask}

Architecture summary:
${currentPlan.architectureSummary}

Changed files:
${changedFiles.join("\n")}

QA:
${JSON.stringify(qa, null, 2)}

Review:
${JSON.stringify(review, null, 2)}

Current per-role tasks:
${JSON.stringify(currentPlan.tasks, null, 2)}

Return JSON with this exact shape:
{
  "decision": "accept" | "rework",
  "summary": "string",
  "updatedTasks": {
    "backendCoder": {
      "goal": "string",
      "targetPaths": ["string"],
      "constraints": ["string"],
      "deliverables": ["string"],
      "contextHints": ["string"],
      "feedback": ["string"]
    },
    "frontendCoder": {
      "goal": "string",
      "targetPaths": ["string"],
      "constraints": ["string"],
      "deliverables": ["string"],
      "contextHints": ["string"],
      "feedback": ["string"]
    },
    "designSystem": {
      "goal": "string",
      "targetPaths": ["string"],
      "constraints": ["string"],
      "deliverables": ["string"],
      "contextHints": ["string"],
      "feedback": ["string"]
    },
    "designUx": {
      "goal": "string",
      "targetPaths": ["string"],
      "constraints": ["string"],
      "deliverables": ["string"],
      "contextHints": ["string"],
      "feedback": ["string"]
    }
  },
  "optimizationNotes": ["string"]
}

Rules:
- If tests fail or the review score is low, choose "rework".
- If the result is acceptable, choose "accept".
- When reworking, only update tasks that actually need more work.
- Keep feedback concrete and role-specific.
`;

  const response = await router.generateForRole({
    role: "manager",
    round,
    system,
    prompt,
    maxOutputTokens: 4000
  });

  const parsed = parseJsonObject<Omit<ManagerDecision, "modelAliasUsed" | "providerUsed" | "modelUsed">>(
    response.text
  );

  return {
    ...parsed,
    updatedTasks: parsed.updatedTasks,
    optimizationNotes: parsed.optimizationNotes ?? [],
    modelAliasUsed: response.alias,
    providerUsed: response.provider,
    modelUsed: response.model
  };
}

export function mergeUpdatedTasks(
  existing: ManagerPlan,
  updated: ManagerDecision["updatedTasks"]
): ManagerPlan {
  if (!updated) return existing;
  return {
    ...existing,
    tasks: {
      backendCoder: {
        ...existing.tasks.backendCoder,
        ...updated.backendCoder
      },
      frontendCoder: {
        ...existing.tasks.frontendCoder,
        ...updated.frontendCoder
      },
      designSystem: {
        ...existing.tasks.designSystem,
        ...updated.designSystem
      },
      designUx: {
        ...existing.tasks.designUx,
        ...updated.designUx
      }
    }
  };
}
