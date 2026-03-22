import path from "node:path";
import { env } from "../config/env.js";
import type { CommandResult, WorkspaceContext } from "../types.js";
import { fileExists } from "../utils/fs.js";
import { runCommand } from "./shell.js";

function pickRunner(context: WorkspaceContext): string {
  switch (context.packageManager) {
    case "pnpm":
      return "pnpm";
    case "yarn":
      return "yarn";
    case "bun":
      return "bun";
    case "npm":
    default:
      return "npm";
  }
}

function defaultCommands(context: WorkspaceContext): string[] {
  if (env.qaCommandsRaw.trim()) {
    return env.qaCommandsRaw
      .split("|")
      .map((part: string) => part.trim())
      .filter(Boolean);
  }

  const runner = pickRunner(context);
  const scripts = context.packageScripts;

  const commands: string[] = [];
  if (scripts["lint"]) commands.push(`${runner} run lint`);
  if (scripts["test"]) commands.push(`${runner} run test`);
  if (scripts["build"]) commands.push(`${runner} run build`);

  return commands;
}

export async function runQaCommands(context: WorkspaceContext): Promise<CommandResult[]> {
  const packageJsonPath = path.join(context.workspacePath, "package.json");
  if (!(await fileExists(packageJsonPath))) {
    return [];
  }

  const commands = defaultCommands(context);
  const results = [];
  for (const command of commands) {
    results.push(await runCommand(command, context.workspacePath, env.commandTimeoutMs));
  }
  return results;
}
