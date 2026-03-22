import path from "node:path";
import { execFile as execFileCb } from "node:child_process";
import { promisify } from "node:util";
import { env } from "../config/env.js";
import type { RunOptions, WorkspaceContext, WorkspaceFile } from "../types.js";
import { ensureDir, fileExists, readTextFileSafe, walkFiles } from "../utils/fs.js";
import { detectPackageManager, readPackageScripts } from "./workspaceMeta.js";

const execFile = promisify(execFileCb);

function nowStamp(): string {
  return new Date().toISOString().replaceAll(":", "-");
}

function repoNameFromGitUrl(gitUrl: string): string {
  const withoutGit = gitUrl.replace(/\.git$/, "");
  const parts = withoutGit.split("/");
  return parts[parts.length - 1] || "repo";
}

async function buildSeedFiles(workspacePath: string): Promise<WorkspaceFile[]> {
  const candidates = [
    "package.json",
    "README.md",
    "tsconfig.json",
    "vite.config.ts",
    "vite.config.js",
    "next.config.js",
    "next.config.mjs",
    "src/main.tsx",
    "src/App.tsx",
    "app/layout.tsx",
    "app/page.tsx"
  ];

  const files: WorkspaceFile[] = [];
  for (const relPath of candidates) {
    const file = await readTextFileSafe(workspacePath, relPath);
    if (file) files.push(file);
  }
  return files;
}

function buildFileTree(files: string[]): string {
  return files.join("\n");
}

async function runGit(args: string[]): Promise<void> {
  try {
    await execFile("git", args, {
      windowsHide: true,
      maxBuffer: 10 * 1024 * 1024
    });
  } catch (error: any) {
    const details = [error?.stderr, error?.stdout, error?.message]
      .filter((value) => typeof value === "string" && value.trim())
      .join("\n")
      .trim();

    if (details) {
      throw new Error(`Git command failed: git ${args.join(" ")}\n${details}`);
    }

    throw new Error(`Git command failed: git ${args.join(" ")}`);
  }
}

export async function prepareWorkspace(options: RunOptions): Promise<WorkspaceContext> {
  const runDir = path.resolve(env.runsDir, nowStamp());
  await ensureDir(runDir);

  if (options.gitUrl) {
    await ensureDir(path.resolve(env.clonesDir));
    const repoName = repoNameFromGitUrl(options.gitUrl);
    const target = path.resolve(env.clonesDir, `${repoName}-${Date.now()}`);

    await runGit(["clone", options.gitUrl, target]);
    if (options.branch) {
      await runGit(["-C", target, "checkout", "-b", options.branch]);
    }

    const files = await walkFiles(target);
    return {
      workspacePath: target,
      sourceType: "git",
      runDir,
      packageManager: await detectPackageManager(target),
      packageScripts: await readPackageScripts(target),
      fileTree: buildFileTree(files),
      seedFiles: await buildSeedFiles(target)
    };
  }

  if (!options.workspacePath) {
    throw new Error(`Either --workspace or --git must be provided.`);
  }

  const workspacePath = path.resolve(options.workspacePath);
  if (!(await fileExists(workspacePath))) {
    throw new Error(`Workspace does not exist: ${workspacePath}`);
  }

  const files = await walkFiles(workspacePath);
  return {
    workspacePath,
    sourceType: "local",
    runDir,
    packageManager: await detectPackageManager(workspacePath),
    packageScripts: await readPackageScripts(workspacePath),
    fileTree: buildFileTree(files),
    seedFiles: await buildSeedFiles(workspacePath)
  };
}
