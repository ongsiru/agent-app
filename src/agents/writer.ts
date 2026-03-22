import type {
  AgentRole,
  AgentWriteResult,
  FileOperation,
  RoleTask,
  WorkspaceContext
} from "../types.js";
import { parseJsonObject } from "../utils/json.js";
import { renderFiles, systemJsonOnly } from "../utils/prompting.js";
import type { ModelRouter } from "../router/modelRouter.js";

type RawWriterResponse = {
  summary: string;
  operations: FileOperation[];
  notes: string[];
};

function buildWriterPrompt(roleLabel: string, task: RoleTask, context: WorkspaceContext, filesBlock: string): string {
  return `
You are ${roleLabel} in a local coding multi-agent system.

Workspace tree:
${context.fileTree}

Task:
${JSON.stringify(task, null, 2)}

Relevant files:
${filesBlock}

Return strict JSON with this shape:
{
  "summary": "string",
  "operations": [
    {
      "type": "writeFile",
      "path": "relative/path/from/workspace",
      "content": "FULL FILE CONTENT",
      "reason": "short reason"
    }
  ],
  "notes": ["string"]
}

Rules:
- Return FULL file content for every writeFile operation.
- Prefer minimal changes.
- Never write files outside the workspace.
- Respect the task's targetPaths and constraints.
- If no change is needed, return "operations": [].
`;
}

export async function runWriterAgent(
  router: ModelRouter,
  role: AgentRole,
  roleLabel: string,
  task: RoleTask,
  context: WorkspaceContext,
  filesForContext: string,
  round: number
): Promise<AgentWriteResult> {
  const response = await router.generateForRole({
    role,
    round,
    system: systemJsonOnly(roleLabel),
    prompt: buildWriterPrompt(roleLabel, task, context, filesForContext),
    maxOutputTokens: 8000
  });

  const parsed = parseJsonObject<RawWriterResponse>(response.text);

  return {
    role,
    summary: parsed.summary,
    operations: parsed.operations ?? [],
    notes: parsed.notes ?? [],
    modelAliasUsed: response.alias,
    providerUsed: response.provider,
    modelUsed: response.model
  };
}
