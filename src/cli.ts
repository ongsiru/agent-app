import { env } from "./config/env.js";
import type { IterationMode, RunOptions } from "./types.js";

function readArg(argv: string[], name: string): string | undefined {
  const inlineArg = argv.find((arg) => arg.startsWith(`${name}=`));
  if (inlineArg) {
    const value = inlineArg.slice(name.length + 1).trim();
    if (!value) {
      throw new Error(`Missing value for ${name}.`);
    }
    return value;
  }

  const index = argv.indexOf(name);
  if (index === -1) return undefined;

  const value = argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`Missing value for ${name}.`);
  }

  return value;
}

function hasFlag(argv: string[], name: string): boolean {
  return argv.includes(name) || argv.some((arg) => arg.startsWith(`${name}=`));
}

function readIterationModeArg(argv: string[], name: string): IterationMode | undefined {
  const value = readArg(argv, name);
  if (value === undefined) return undefined;

  if (value.toLowerCase() === "auto") {
    return "auto";
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${name} must be a positive integer or "auto".`);
  }

  return parsed;
}

export function parseCliArgs(argv: string[]): RunOptions {
  if (hasFlag(argv, "--help") || hasFlag(argv, "-h")) {
    printHelpAndExit();
  }

  const task = readArg(argv, "--task");
  const workspacePath = readArg(argv, "--workspace");
  const gitUrl = readArg(argv, "--git");
  const branch = readArg(argv, "--branch");
  const maxIterations = readIterationModeArg(argv, "--max-iterations");

  if (!task) {
    throw new Error(`Missing required --task argument.`);
  }

  if (workspacePath && gitUrl) {
    throw new Error(`Use either --workspace <path> or --git <url>, not both.`);
  }

  if (!workspacePath && !gitUrl) {
    throw new Error(`Provide either --workspace <path> or --git <url>.`);
  }

  if (branch && !gitUrl) {
    throw new Error(`--branch can only be used together with --git <url>.`);
  }

  return {
    task,
    workspacePath,
    gitUrl,
    branch,
    maxIterations: maxIterations ?? env.maxIterations
  };
}

export function printHelpAndExit(): never {
  console.log(`
Usage:
  npm run dev -- --workspace <path> --task "your instruction"
  npm run dev -- --git <repo-url> --branch <new-branch> --task "your instruction"
  node --import tsx src/index.ts --workspace <path> --task "your instruction"

Options:
  --workspace <path>        Use an existing local project directory
  --git <url>               Clone a git repository into workspaces/cloned-repos
  --branch <name>           Create and checkout a new branch after cloning
  --task <text>             The feature request or task for the multi-agent system
  --max-iterations <n|auto> Override MAX_ITERATIONS for a single run
  --help                    Show help

Examples:
  npm run dev -- --workspace ../my-app --task "로그인 기능 구현"
  npm run dev -- --git https://github.com/me/app.git --branch feature/ai-login --task "로그인 기능 구현"
  npm run dev -- --workspace ../my-app --task "게시판 CRUD 구현" --max-iterations 1
  npm run dev -- --workspace ../my-app --task "게시판 CRUD 구현" --max-iterations auto

Notes:
  - In Windows CMD, npm run dev works normally.
  - In Windows PowerShell, use npm.cmd instead of npm if script execution is blocked.
  - auto repeats until the manager accepts, with a built-in safety cap.
  - Quote task text when it contains spaces.
`);
  process.exit(0);
}
