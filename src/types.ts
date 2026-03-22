export type ProviderName = "openai" | "anthropic" | "google";
export type ModelAlias = "gpt" | "codex" | "claude" | "gemini";
export type IterationMode = number | "auto";
export type AgentRole =
  | "manager"
  | "backendCoder"
  | "frontendCoder"
  | "designSystem"
  | "designUx"
  | "qa"
  | "reviewer";

export type ProviderStatus = "healthy" | "limited" | "down";

export interface ModelBinding {
  alias: ModelAlias;
  provider: ProviderName;
  model: string;
  enabled: boolean;
}

export interface RoleAssignment {
  primary: ModelAlias;
  secondary: ModelAlias;
  emergency: ModelAlias;
}

export interface RoleTask {
  role: AgentRole;
  goal: string;
  targetPaths: string[];
  constraints: string[];
  deliverables: string[];
  contextHints: string[];
  feedback?: string[];
}

export interface ManagerPlan {
  architectureSummary: string;
  managerNotes: string[];
  reviewCriteria: string[];
  qaDirectives: string[];
  tasks: Record<
    "backendCoder" | "frontendCoder" | "designSystem" | "designUx",
    RoleTask
  >;
}

export interface FileOperation {
  type: "writeFile";
  path: string;
  content: string;
  reason?: string;
}

export interface AgentWriteResult {
  role: AgentRole;
  summary: string;
  operations: FileOperation[];
  notes: string[];
  modelAliasUsed: ModelAlias;
  providerUsed: ProviderName;
  modelUsed: string;
}

export interface CommandResult {
  command: string;
  ok: boolean;
  skipped: boolean;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  durationMs: number;
}

export interface QAResult {
  passed: boolean;
  summary: string;
  issues: string[];
  commands: CommandResult[];
  modelAliasUsed: ModelAlias;
  providerUsed: ProviderName;
  modelUsed: string;
}

export interface ReviewResult {
  accepted: boolean;
  score: number;
  summary: string;
  feedback: string[];
  perRoleFeedback: Partial<Record<AgentRole, string[]>>;
  risks: string[];
  modelAliasUsed: ModelAlias;
  providerUsed: ProviderName;
  modelUsed: string;
}

export interface ManagerDecision {
  decision: "accept" | "rework";
  summary: string;
  updatedTasks?: Partial<
    Record<"backendCoder" | "frontendCoder" | "designSystem" | "designUx", Partial<RoleTask>>
  >;
  optimizationNotes: string[];
  modelAliasUsed: ModelAlias;
  providerUsed: ProviderName;
  modelUsed: string;
}

export interface WorkspaceContext {
  workspacePath: string;
  sourceType: "local" | "git";
  runDir: string;
  packageManager: "npm" | "pnpm" | "yarn" | "bun" | "unknown";
  packageScripts: Record<string, string>;
  fileTree: string;
  seedFiles: WorkspaceFile[];
}

export interface WorkspaceFile {
  path: string;
  content: string;
}

export interface RunOptions {
  workspacePath?: string;
  gitUrl?: string;
  branch?: string;
  task: string;
  maxIterations: IterationMode;
}

export interface ProviderRequest {
  model: string;
  system: string;
  prompt: string;
  maxOutputTokens?: number;
  temperature?: number;
}

export interface ProviderTextResponse {
  text: string;
  provider: ProviderName;
  model: string;
}

export interface RunSummary {
  task: string;
  workspacePath: string;
  sourceType: "local" | "git";
  accepted: boolean;
  iterationsCompleted: number;
  requestedMaxIterations: IterationMode;
  finalReportPath: string;
  summaryJsonPath: string;
}
