# First Run Guide

This guide assumes you want to use the app in the recommended order:

1. Stabilize the CLI inside the VS Code integrated terminal.
2. Add a local UI only after the CLI feels reliable.
3. Connect the CLI to a VS Code custom agent or chat participant later.

## 1. Open The Project In VS Code

Open this folder in VS Code:

```text
C:\Users\gusdn\OneDrive\Desktop\agent-app
```

Then open the integrated terminal.

This guide now assumes you prefer Windows CMD.

## 2. Confirm Prerequisites

Run:

```powershell
node -v
git --version
```

This repository was verified with:

- Node `v24.14.0`
- Git `2.53.0.windows.2`

## 3. Create `.env`

From the project root:

```bat
copy .env.example .env
```

If you switch to PowerShell later, use `Copy-Item .env.example .env`.

Open `.env` and fill in at least one provider key:

- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `GEMINI_API_KEY`

You can leave unused providers blank.

Important runtime settings:

- `MAX_ITERATIONS=3`
- `COMMAND_TIMEOUT_MS=600000`
- `RUNS_DIR=./runs`
- `CLONES_DIR=./workspaces/cloned-repos`

For a safer first run, it is fine to keep the file as-is and use `--max-iterations 1` on the command line.

## 4. Install Dependencies

In CMD:

```bat
npm install
```

If you switch to PowerShell later, use:

```powershell
npm.cmd install
```

Why mention `npm.cmd` at all?

- Some PowerShell setups block `npm.ps1` because of execution policy.
- `npm.cmd` bypasses that issue.
- In CMD, plain `npm` is the normal command.

## 5. Smoke Test The CLI

Print the built-in help:

```bat
npm run dev -- --help
```

You should see:

- usage examples for `--workspace` and `--git`
- the note about CMD vs PowerShell usage
- the `--max-iterations` option

## 6. Do The First Real Run On A Local Workspace

Choose a project you are comfortable letting the agent modify.

Example:

```bat
npm run dev -- --workspace "C:\path\to\your-project" --task "Add a small feature and keep changes minimal" --max-iterations 1
```

Recommended first-run rules:

- Use a disposable Git branch.
- Keep the task narrow.
- Start with `--max-iterations 1`.
- Review the diff before trusting the result.

If you want to run the agent against this repository itself, you can do that too:

```bat
npm run dev -- --workspace "." --task "Improve setup documentation" --max-iterations 1
```

## 7. Understand What Happens During A Run

The pipeline currently works like this:

1. Prepare the workspace or clone the repo.
2. Manager agent creates a plan and splits the work.
3. Backend and frontend coding agents generate file operations.
4. Design system and UX agents generate styling and polish updates.
5. File operations are applied to the workspace.
6. QA commands run if the target project exposes `lint`, `test`, or `build` scripts.
7. Reviewer agent inspects QA output and the diff.
8. Manager either accepts the result or requests another iteration.

## 8. Read The Results

Each run writes artifacts into a timestamped directory under `runs/`.

Important files:

- `run.log`: high-level timeline
- `summary.json`: concise run summary
- `final-report.md`: manager/QA/review wrap-up
- `01-manager-plan.json`: initial plan
- `<round>-diff.patch`: patch produced since the run started

After the run:

1. Open the newest folder in `runs/`.
2. Read `final-report.md`.
3. Inspect the Git diff in the target workspace.
4. Decide whether to keep, refine, or discard the changes.

## 9. Run Against A Git Repository Instead Of A Local Folder

Use `--git` when you want the app to clone a repository into `workspaces/cloned-repos/` first:

```bat
npm run dev -- --git https://github.com/your-org/your-repo.git --branch feature/agent-run --task "Implement the signup flow" --max-iterations 1
```

Notes:

- `--branch` only works together with `--git`.
- The clone is created inside this repository's `workspaces/cloned-repos/` folder.
- The Git commands now run without shell string interpolation, so paths and branch names are safer to handle.

## 10. Troubleshooting

### `No provider API keys are configured`

You started the app before filling in `.env`.

Fix:

1. Open `.env`
2. Set at least one provider API key
3. Run the command again

### `npm` is blocked by PowerShell

If you are in PowerShell, use:

```powershell
npm.cmd run dev -- --help
```

If you are in CMD, the regular form is:

```bat
npm run dev -- --help
```

### The task text is cut off

Wrap it in quotes:

```bat
--task "Implement login and update the README"
```

### Git clone or checkout fails

Check:

```powershell
git --version
```

Then retry with a valid repo URL and branch name.

### The run changes too much

Start smaller:

- narrow the task
- run on a separate branch
- use `--max-iterations 1`

## 11. What To Build Next

Only after the CLI feels predictable:

### Next step 1: local UI

Build a small local UI that:

- selects a project
- accepts a task prompt
- streams or tails `run.log`
- shows the final report

Best approach:

- React or Next.js frontend
- launch the CLI as a child process
- keep the CLI as the execution layer

### Next step 2: VS Code custom agent

Once the CLI is stable:

- create a `.agent.md` wrapper
- call this CLI with the current workspace path
- summarize the result back into chat

### Final step: VS Code chat participant extension

Only do this after the wrapper flow is already proven. The extension should still delegate the actual orchestration to this CLI or to a thin local server built on top of it.
