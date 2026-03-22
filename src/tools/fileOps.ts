import type { AgentWriteResult, FileOperation } from "../types.js";
import { writeTextFile } from "../utils/fs.js";

export async function applyOperations(
  workspacePath: string,
  result: AgentWriteResult
): Promise<{ applied: FileOperation[]; skipped: FileOperation[] }> {
  const applied: FileOperation[] = [];
  const skipped: FileOperation[] = [];

  for (const operation of result.operations) {
    if (operation.type !== "writeFile") {
      skipped.push(operation);
      continue;
    }

    if (
      typeof operation.path !== "string" ||
      !operation.path.trim() ||
      typeof operation.content !== "string"
    ) {
      skipped.push(operation);
      continue;
    }

    await writeTextFile(workspacePath, operation.path, operation.content);
    applied.push(operation);
  }

  return { applied, skipped };
}
