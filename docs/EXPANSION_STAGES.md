# Expansion Stages

Build outward from the CLI. Do not start with the VS Code extension layer.

Recommended order:

1. CLI inside the VS Code integrated terminal
2. Small local UI
3. VS Code custom agent / `.agent.md`
4. VS Code chat participant extension
5. MCP and external system integrations

## Stage 1. Stabilize The CLI In VS Code

This is the most important stage.

### Goal

Make sure a developer can reliably:

- open `agent-app` in VS Code
- configure `.env`
- run the CLI from the integrated terminal
- point it at a local workspace or Git repo
- inspect `runs/` and the target Git diff

### Definition Of Done

- `npm run dev -- --help` works in CMD
- `npm.cmd run dev -- --help` works in PowerShell
- a local workspace run succeeds end-to-end
- a Git clone run succeeds end-to-end
- logs and artifacts are easy to find
- common failures have clear troubleshooting notes

### Recommended Commands

Local workspace:

```bat
npm run dev -- --workspace "C:\path\to\project" --task "Implement login" --max-iterations 1
```

Manager-driven auto loop:

```bat
npm run dev -- --workspace "C:\path\to\project" --task "Implement login and keep refining until accepted" --max-iterations auto
```

Git repo:

```bat
npm run dev -- --git https://github.com/your-org/your-repo.git --branch feature/agent-run --task "Implement login" --max-iterations 1
```

`auto` mode still respects the runtime safety cap from `AUTO_MAX_ITERATIONS_SAFETY_CAP`.

## Stage 2. Add A Small Local UI

Only start here once the CLI feels predictable.

### Goal

Wrap the CLI with a simple local interface for non-terminal users.

### Recommended Architecture

- frontend: React, Next.js, or Vite
- execution: spawn the CLI as a child process
- data source: read `run.log`, `summary.json`, and `final-report.md`

### Good Features For The First UI

- project picker
- task input box
- start button
- live log panel
- final report panel
- quick links to changed files and artifacts

### Avoid

- reimplementing orchestration logic in the UI
- moving model routing out of the CLI too early
- building remote infrastructure before local flow is solid

## Stage 3. Connect A VS Code Custom Agent

Once Stage 1 is stable, you can expose the CLI inside VS Code chat with a thin wrapper.

### Goal

Let a user ask for work in chat while the wrapper still delegates to the local CLI.

### Recommended Pattern

- keep the app itself outside the target workspace
- call it with the current `${workspaceFolder}`
- summarize the run result back into chat

### Important Detail

If the target workspace is not the `agent-app` repository itself, do not assume `npm run dev` will work from the current folder. Use an absolute app path or `npm.cmd --prefix`.

Example:

```powershell
npm.cmd --prefix "C:\absolute\path\to\agent-app" run dev -- --workspace "${workspaceFolder}" --task "<user task>"
```

See `examples/vscode/orchestrator.agent.md`.

## Stage 4. Build A VS Code Chat Participant Extension

Do this only after the custom agent wrapper proves useful.

### Goal

Expose commands like:

```text
@orchestrator implement signup flow
```

### Extension Responsibilities

- collect user prompt
- identify workspace path
- invoke local CLI or a thin local server
- stream progress
- show result summary and diff links

### Nice-To-Have Features

- current iteration indicator
- cancel button
- open diff command
- clickable changed-file list
- final report preview

## Stage 5. Add MCP And External Integrations

This comes last.

Potential additions:

- GitHub issues and PRs
- Jira tickets
- Figma tokens or design data
- internal docs
- database schema lookup

Recommended order:

1. CLI
2. VS Code wrapper
3. UI or chat participant
4. MCP and external systems
