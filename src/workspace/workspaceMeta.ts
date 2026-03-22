import path from "node:path";
import { promises as fs } from "node:fs";
import type { WorkspaceContext } from "../types.js";
import { fileExists } from "../utils/fs.js";

export async function detectPackageManager(
  workspacePath: string
): Promise<WorkspaceContext["packageManager"]> {
  if (await fileExists(path.join(workspacePath, "pnpm-lock.yaml"))) return "pnpm";
  if (await fileExists(path.join(workspacePath, "yarn.lock"))) return "yarn";
  if (await fileExists(path.join(workspacePath, "bun.lockb"))) return "bun";
  if (await fileExists(path.join(workspacePath, "package-lock.json"))) return "npm";
  if (await fileExists(path.join(workspacePath, "package.json"))) return "npm";
  return "unknown";
}

export async function readPackageScripts(workspacePath: string): Promise<Record<string, string>> {
  const packageJsonPath = path.join(workspacePath, "package.json");
  if (!(await fileExists(packageJsonPath))) return {};
  try {
    const text = await fs.readFile(packageJsonPath, "utf8");
    const pkg = JSON.parse(text);
    return typeof pkg.scripts === "object" && pkg.scripts ? pkg.scripts : {};
  } catch {
    return {};
  }
}
