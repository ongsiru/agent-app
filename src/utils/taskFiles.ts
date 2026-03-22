import path from "node:path";
import type { RoleTask, WorkspaceContext, WorkspaceFile } from "../types.js";
import { preferredRolePaths } from "../config/roleScopes.js";
import { readTextFileSafe, walkFiles } from "./fs.js";

const SEED_NAMES = [
  "package.json",
  "README.md",
  "tsconfig.json",
  "vite.config.ts",
  "vite.config.js",
  "next.config.js",
  "next.config.mjs",
  "tailwind.config.ts",
  "tailwind.config.js",
  "src/main.tsx",
  "src/main.ts",
  "src/App.tsx",
  "src/App.ts",
  "app/layout.tsx",
  "app/page.tsx"
];

function normalizePrefix(prefix: string): string {
  return prefix.replaceAll("\\", "/").replace(/^\.\/+/, "");
}

function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}

export async function selectContextFilesForTask(
  context: WorkspaceContext,
  task: RoleTask,
  maxFiles = 10
): Promise<WorkspaceFile[]> {
  const allFiles = await walkFiles(context.workspacePath);
  const preferred = preferredRolePaths[task.role].map(normalizePrefix);
  const requested = task.targetPaths.map(normalizePrefix);

  const prefixes = unique([...requested, ...preferred]).filter(Boolean);

  const selectedRelPaths: string[] = [];

  for (const seed of SEED_NAMES) {
    if (allFiles.includes(seed)) selectedRelPaths.push(seed);
  }

  for (const relPath of allFiles) {
    const normalized = normalizePrefix(relPath);
    if (selectedRelPaths.includes(normalized)) continue;
    if (prefixes.length === 0 || prefixes.some((prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`))) {
      selectedRelPaths.push(normalized);
    }
    if (selectedRelPaths.length >= maxFiles) break;
  }

  const files: WorkspaceFile[] = [];
  for (const relPath of selectedRelPaths.slice(0, maxFiles)) {
    const file = await readTextFileSafe(context.workspacePath, relPath);
    if (file) files.push(file);
  }

  return files;
}
