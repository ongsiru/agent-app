import path from "node:path";
import { env, hasAtLeastOneProviderConfigured } from "../config/env.js";
import { ensureRoleHasAtLeastOneConfiguredModel, modelCatalog } from "../config/models.js";
import type {
  AgentWriteResult,
  ManagerPlan,
  RoleTask,
  RunOptions,
  RunSummary
} from "../types.js";
import { OpenAiProvider } from "../providers/openai.js";
import { AnthropicProvider } from "../providers/anthropic.js";
import { GoogleProvider } from "../providers/google.js";
import { ProviderHealthRegistry } from "../runtime/providerHealth.js";
import { ModelRouter } from "../router/modelRouter.js";
import { Logger } from "../utils/logger.js";
import { prepareWorkspace } from "../workspace/workspaceManager.js";
import { captureSnapshot, buildDiffFromSnapshots } from "../utils/snapshot.js";
import { createManagerDecision, createManagerPlan, mergeUpdatedTasks } from "../agents/manager.js";
import { selectContextFilesForTask } from "../utils/taskFiles.js";
import { renderFiles } from "../utils/prompting.js";
import { runWriterAgent } from "../agents/writer.js";
import { applyOperations } from "../tools/fileOps.js";
import { runQaCommands } from "../tools/qa.js";
import { summarizeQa } from "../agents/qa.js";
import { reviewImplementation } from "../agents/reviewer.js";

function buildWriterFeedback(task: RoleTask, resultFeedback?: string[]): RoleTask {
  return {
    ...task,
    feedback: resultFeedback ?? task.feedback ?? []
  };
}

function changedFilesFromResults(results: AgentWriteResult[]): string[] {
  return Array.from(
    new Set(results.flatMap((result) => result.operations.map((op) => op.path)))
  ).sort();
}

export async function runPipeline(options: RunOptions): Promise<RunSummary> {
  if (!hasAtLeastOneProviderConfigured()) {
    throw new Error(`No provider API keys are configured. Fill in .env before running.`);
  }

  for (const role of [
    "manager",
    "backendCoder",
    "frontendCoder",
    "designSystem",
    "designUx",
    "qa",
    "reviewer"
  ] as const) {
    ensureRoleHasAtLeastOneConfiguredModel(role);
  }

  const context = await prepareWorkspace(options);
  const logger = new Logger(context.runDir);
  await logger.init();

  logger.log(`Workspace ready: ${context.workspacePath}`);
  logger.log(`Source type: ${context.sourceType}`);
  logger.log(`Task: ${options.task}`);

  const providers = {
    openai: env.openAiApiKey ? new OpenAiProvider(env.openAiApiKey, env.openAiBaseUrl) : null,
    anthropic: env.anthropicApiKey ? new AnthropicProvider(env.anthropicApiKey) : null,
    google: env.geminiApiKey ? new GoogleProvider(env.geminiApiKey) : null
  };

  const health = new ProviderHealthRegistry(Object.keys(modelCatalog) as Array<keyof typeof modelCatalog>);
  const router = new ModelRouter(providers, health);

  const beforeSnapshot = await captureSnapshot(context.workspacePath);

  let plan: ManagerPlan = await createManagerPlan(router, context, options.task, 1);
  await logger.writeJson("01-manager-plan.json", plan);
  logger.log(`Manager plan created.`);

  let accepted = false;
  let diffText = "";
  let finalReport = "";
  let iterationsCompleted = 0;

  for (let round = 1; round <= options.maxIterations; round += 1) {
    iterationsCompleted = round;
    logger.log(`Starting iteration ${round}.`);

    const backendTask = buildWriterFeedback(
      plan.tasks.backendCoder,
      plan.tasks.backendCoder.feedback
    );
    const frontendTask = buildWriterFeedback(
      plan.tasks.frontendCoder,
      plan.tasks.frontendCoder.feedback
    );
    const designSystemTask = buildWriterFeedback(
      plan.tasks.designSystem,
      plan.tasks.designSystem.feedback
    );
    const designUxTask = buildWriterFeedback(
      plan.tasks.designUx,
      plan.tasks.designUx.feedback
    );

    const backendFiles = await selectContextFilesForTask(context, backendTask);
    const frontendFiles = await selectContextFilesForTask(context, frontendTask);
    const designSystemFiles = await selectContextFilesForTask(context, designSystemTask);
    const designUxFiles = await selectContextFilesForTask(context, designUxTask);

    const backendResult = await runWriterAgent(
      router,
      "backendCoder",
      "Backend Coder",
      backendTask,
      context,
      renderFiles(backendFiles),
      round
    );
    await logger.writeJson(`${String(round).padStart(2, "0")}-backend.json`, backendResult);

    const frontendResult = await runWriterAgent(
      router,
      "frontendCoder",
      "Frontend Coder",
      frontendTask,
      context,
      renderFiles(frontendFiles),
      round
    );
    await logger.writeJson(`${String(round).padStart(2, "0")}-frontend.json`, frontendResult);

    await applyOperations(context.workspacePath, backendResult);
    await applyOperations(context.workspacePath, frontendResult);

    const designSystemResult = await runWriterAgent(
      router,
      "designSystem",
      "Design System Agent",
      designSystemTask,
      context,
      renderFiles(designSystemFiles),
      round
    );
    await logger.writeJson(`${String(round).padStart(2, "0")}-design-system.json`, designSystemResult);

    const designUxResult = await runWriterAgent(
      router,
      "designUx",
      "UX Styling Agent",
      designUxTask,
      context,
      renderFiles(designUxFiles),
      round
    );
    await logger.writeJson(`${String(round).padStart(2, "0")}-design-ux.json`, designUxResult);

    await applyOperations(context.workspacePath, designSystemResult);
    await applyOperations(context.workspacePath, designUxResult);

    const allWriteResults = [
      backendResult,
      frontendResult,
      designSystemResult,
      designUxResult
    ];

    const changedFiles = changedFilesFromResults(allWriteResults);
    logger.log(`Iteration ${round} wrote ${changedFiles.length} files.`);

    const qaCommandResults = await runQaCommands(context);
    const qa = await summarizeQa(router, context, qaCommandResults, round);
    await logger.writeJson(`${String(round).padStart(2, "0")}-qa.json`, qa);

    diffText = await buildDiffFromSnapshots(context.workspacePath, beforeSnapshot);
    await logger.writeArtifact(`${String(round).padStart(2, "0")}-diff.patch`, diffText);

    const review = await reviewImplementation(router, plan, qa, diffText, round);
    await logger.writeJson(`${String(round).padStart(2, "0")}-review.json`, review);

    const decision = await createManagerDecision(
      router,
      context,
      options.task,
      plan,
      qa,
      review,
      changedFiles,
      round
    );
    await logger.writeJson(`${String(round).padStart(2, "0")}-manager-decision.json`, decision);

    if (decision.decision === "accept") {
      accepted = true;
      finalReport = [
        `# Final Report`,
        ``,
        `- accepted: true`,
        `- iteration: ${round}`,
        `- review score: ${review.score}`,
        `- changed files:`,
        ...changedFiles.map((file) => `  - ${file}`),
        ``,
        `## Manager Summary`,
        decision.summary,
        ``,
        `## QA`,
        qa.summary,
        ``,
        `## Review`,
        review.summary,
        ``,
        `## Risks`,
        ...(review.risks.length ? review.risks.map((risk) => `- ${risk}`) : ["- none reported"])
      ].join("\n");
      break;
    }

    plan = mergeUpdatedTasks(plan, decision.updatedTasks);
    logger.log(`Manager requested rework for next iteration.`);
  }

  if (!accepted) {
    finalReport = [
      `# Final Report`,
      ``,
      `- accepted: false`,
      `- iterations attempted: ${iterationsCompleted}`,
      ``,
      `The run ended without a clean acceptance signal. Review the last manager decision, QA result, and diff before continuing manually.`
    ].join("\n");
  }

  const finalReportPath = await logger.writeArtifact("final-report.md", finalReport);
  const summary = {
    task: options.task,
    workspacePath: context.workspacePath,
    sourceType: context.sourceType,
    accepted,
    iterationsCompleted,
    health: health.snapshot(),
    diffPath: path.join(context.runDir, `${String(iterationsCompleted).padStart(2, "0")}-diff.patch`)
  };
  const summaryJsonPath = await logger.writeJson("summary.json", summary);
  logger.log(`Run finished. Accepted=${accepted}.`);

  logger.close();

  return {
    task: options.task,
    workspacePath: context.workspacePath,
    sourceType: context.sourceType,
    accepted,
    iterationsCompleted,
    finalReportPath,
    summaryJsonPath
  };
}
