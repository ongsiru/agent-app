import type { WorkspaceFile } from "../types.js";

export function renderFiles(files: WorkspaceFile[]): string {
  if (files.length === 0) return "(no files included)";
  return files
    .map(
      (file) => [
        `===== FILE: ${file.path} =====`,
        file.content,
        `===== END FILE: ${file.path} =====`
      ].join("\n")
    )
    .join("\n\n");
}

export function systemJsonOnly(role: string): string {
  return [
    `You are ${role}.`,
    "Return strict JSON only.",
    "Do not wrap the answer in markdown fences.",
    "Prefer minimal changes and preserve existing logic unless the task explicitly requires wider refactoring."
  ].join(" ");
}
