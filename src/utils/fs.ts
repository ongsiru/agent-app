import { promises as fs } from "node:fs";
import path from "node:path";
import type { WorkspaceFile } from "../types.js";

const TEXT_EXTENSIONS = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
  ".json", ".md", ".css", ".scss", ".sass", ".less",
  ".html", ".txt", ".yml", ".yaml", ".env", ".sql",
  ".prisma", ".java", ".kt", ".go", ".py", ".rb", ".php",
  ".cs", ".xml", ".sh"
]);

const IGNORE_DIRS = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  ".next",
  ".turbo",
  ".cache",
  "coverage"
]);

export function isTextLike(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return TEXT_EXTENSIONS.has(ext) || path.basename(filePath).startsWith(".");
}

export async function walkFiles(root: string): Promise<string[]> {
  const result: string[] = [];

  async function visit(current: string): Promise<void> {
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      const rel = path.relative(root, fullPath);
      if (entry.isDirectory()) {
        if (IGNORE_DIRS.has(entry.name)) continue;
        await visit(fullPath);
      } else if (entry.isFile()) {
        result.push(rel.replaceAll("\\", "/"));
      }
    }
  }

  await visit(root);
  return result.sort();
}

export async function readTextFileSafe(root: string, relPath: string): Promise<WorkspaceFile | null> {
  const abs = path.join(root, relPath);
  if (!isTextLike(abs)) return null;
  try {
    const stat = await fs.stat(abs);
    if (stat.size > 200_000) return null;
    const content = await fs.readFile(abs, "utf8");
    return { path: relPath.replaceAll("\\", "/"), content };
  } catch {
    return null;
  }
}

export async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

export async function writeTextFile(root: string, relPath: string, content: string): Promise<void> {
  const normalized = relPath.replaceAll("\\", "/");
  const abs = path.join(root, normalized);
  const resolvedRoot = path.resolve(root);
  const resolvedFile = path.resolve(abs);
  const relative = path.relative(resolvedRoot, resolvedFile);

  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Refusing to write outside workspace: ${relPath}`);
  }

  await ensureDir(path.dirname(abs));
  await fs.writeFile(abs, content, "utf8");
}

export async function fileExists(absPath: string): Promise<boolean> {
  try {
    await fs.access(absPath);
    return true;
  } catch {
    return false;
  }
}
