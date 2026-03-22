import { exec } from "node:child_process";
import { promisify } from "node:util";
import type { CommandResult } from "../types.js";

const execAsync = promisify(exec);

export async function runCommand(
  command: string,
  cwd: string,
  timeoutMs: number
): Promise<CommandResult> {
  const started = Date.now();
  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd,
      timeout: timeoutMs,
      windowsHide: true,
      maxBuffer: 10 * 1024 * 1024
    });
    return {
      command,
      ok: true,
      skipped: false,
      exitCode: 0,
      stdout,
      stderr,
      durationMs: Date.now() - started
    };
  } catch (error: any) {
    return {
      command,
      ok: false,
      skipped: false,
      exitCode: Number.isFinite(error?.code) ? Number(error.code) : null,
      stdout: String(error?.stdout ?? ""),
      stderr: String(error?.stderr ?? error?.message ?? ""),
      durationMs: Date.now() - started
    };
  }
}
