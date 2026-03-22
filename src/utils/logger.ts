import { createWriteStream, promises as fs } from "node:fs";
import path from "node:path";
import { ensureDir } from "./fs.js";

export class Logger {
  private stream!: ReturnType<typeof createWriteStream>;

  constructor(private readonly runDir: string) {}

  async init(): Promise<void> {
    await ensureDir(this.runDir);
    this.stream = createWriteStream(path.join(this.runDir, "run.log"), { flags: "a" });
  }

  log(message: string): void {
    const line = `[${new Date().toISOString()}] ${message}`;
    console.log(line);
    this.stream.write(`${line}\n`);
  }

  async writeArtifact(name: string, content: string): Promise<string> {
    const target = path.join(this.runDir, name);
    await fs.writeFile(target, content, "utf8");
    return target;
  }

  async writeJson(name: string, payload: unknown): Promise<string> {
    return this.writeArtifact(name, JSON.stringify(payload, null, 2));
  }

  close(): void {
    this.stream?.end();
  }
}
