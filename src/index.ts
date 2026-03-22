import { parseCliArgs } from "./cli.js";
import { runPipeline } from "./orchestrator/runPipeline.js";

async function main(): Promise<void> {
  const options = parseCliArgs(process.argv.slice(2));
  const result = await runPipeline(options);
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
