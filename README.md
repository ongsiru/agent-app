# Agent App

Local multi-agent coding orchestrator for running planning, implementation, QA, and review loops against a local project or a freshly cloned Git repository.

Recommended rollout order:

1. Stabilize the CLI flow inside the VS Code integrated terminal.
2. Add a small local UI on top of the CLI.
3. Connect the app to a VS Code custom agent or chat participant.

The CLI is the source of truth right now. Everything else should wrap it, not replace it.

## What It Does

- Prepares a local workspace or clones a Git repository.
- Lets a manager agent split work across backend, frontend, design system, and UX roles.
- Applies file writes returned by the coding agents.
- Runs local QA commands when package scripts are available.
- Runs a review pass and either accepts the result or requests another iteration.
- Writes logs and artifacts into `runs/<timestamp>/`.

## Prerequisites

- Node.js 22+ recommended
- Git installed and available on `PATH`
- At least one provider API key configured in `.env`

## Quick Start

### Windows CMD / VS Code integrated terminal

```bat
cd /d C:\Users\gusdn\OneDrive\Desktop\agent-app
copy .env.example .env
npm install
npm run dev -- --help
```

If your VS Code integrated terminal uses PowerShell instead of CMD:

- use `Copy-Item .env.example .env`
- use `npm.cmd install`
- use `npm.cmd run dev -- --help`

### macOS / Linux

```bash
cp .env.example .env
npm install
npm run dev -- --help
```

## Configure `.env`

Fill in at least one provider key before running the pipeline:

- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `GEMINI_API_KEY`

Project defaults from `.env.example`:

- OpenAI general model: `gpt-5.4`
- OpenAI coding model: `gpt-5.2-codex`
- Anthropic model: `claude-sonnet-4-6`
- Gemini model: `gemini-3.1-pro-preview`

You do not need every provider enabled on day one. The router will use whichever configured models are available for each role.

## Run Against A Local Project

```bat
npm run dev -- --workspace "C:\path\to\your-project" --task "Implement login and update the README"
```

Useful first-run variant:

```bat
npm run dev -- --workspace "C:\path\to\your-project" --task "Add a small feature and keep changes minimal" --max-iterations 1
```

## Run Against A Git Repository

```bat
npm run dev -- --git https://github.com/your-org/your-repo.git --branch feature/agent-run --task "Implement signup flow"
```

This clones into `workspaces/cloned-repos/` and writes run artifacts into `runs/`.

## CLI Options

- `--workspace <path>`: run against an existing local directory
- `--git <url>`: clone a repository first
- `--branch <name>`: create and checkout a new branch after cloning
- `--task <text>`: task instruction for the agent system
- `--max-iterations <n>`: override `MAX_ITERATIONS` for one run
- `--help`: print usage

Rules:

- Use either `--workspace` or `--git`, not both.
- `--branch` only works with `--git`.
- Quote the task text if it contains spaces.

## Output Files

Each run creates `runs/<timestamp>/` with artifacts such as:

- `run.log`
- `summary.json`
- `final-report.md`
- `01-manager-plan.json`
- `02-...` per-step JSON artifacts
- `<round>-diff.patch`

## Recommended Expansion Path

- Stage 1: keep the CLI stable in the VS Code terminal
- Stage 2: build a local UI that launches the CLI as a child process
- Stage 3: connect the CLI to a VS Code custom agent
- Stage 4: later, add a full VS Code chat participant extension if needed

See:

- [Detailed First Run Guide](./docs/FIRST_RUN.md)
- [Expansion Stages](./docs/EXPANSION_STAGES.md)
- [VS Code Agent Example](./examples/vscode/orchestrator.agent.md)

## Troubleshooting

- `No provider API keys are configured`: fill in `.env` first.
- `npm` fails in PowerShell: use `npm.cmd`.
- You use CMD: `npm install` and `npm run dev` are the normal commands.
- Git clone fails: confirm `git --version` works in the same terminal.
- The task text is split incorrectly: wrap it in quotes.
- You want safer first runs: start with `--max-iterations 1` on a disposable branch.
