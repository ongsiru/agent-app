import path from "node:path";
import { createTwoFilesPatch } from "diff";
import { readTextFileSafe, walkFiles } from "./fs.js";

export type Snapshot = Record<string, string>;

export async function captureSnapshot(root: string): Promise<Snapshot> {
  const files = await walkFiles(root);
  const snapshot: Snapshot = {};
  for (const relPath of files) {
    const textFile = await readTextFileSafe(root, relPath);
    if (textFile) snapshot[relPath] = textFile.content;
  }
  return snapshot;
}

export async function buildDiffFromSnapshots(root: string, before: Snapshot): Promise<string> {
  const afterFiles = await walkFiles(root);
  const seen = new Set([...Object.keys(before), ...afterFiles]);

  const patches: string[] = [];

  for (const relPath of [...seen].sort()) {
    const beforeContent = before[relPath] ?? "";
    const afterFile = await readTextFileSafe(root, relPath);
    const afterContent = afterFile?.content ?? "";

    if (beforeContent === afterContent) continue;

    patches.push(
      createTwoFilesPatch(
        path.join("before", relPath),
        path.join("after", relPath),
        beforeContent,
        afterContent,
        "",
        ""
      )
    );
  }

  return patches.join("\n");
}
