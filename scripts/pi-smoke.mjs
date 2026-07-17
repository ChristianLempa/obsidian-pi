import path from "node:path";
import { checkPiInstallation, MINIMUM_PI_VERSION, TESTED_PI_VERSION } from "../src/pi/health.mjs";
import { PiRpcClient } from "../src/pi/rpc-client.mjs";

const cwd = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
const health = checkPiInstallation();
if (!health.ok) {
  console.error(health.message);
  process.exit(1);
}

const client = new PiRpcClient({
  cwd,
  args: [
    "--mode",
    "rpc",
    "--no-session",
    "--no-tools",
    "--no-skills",
    "--no-prompt-templates",
    "--no-themes",
    "--no-context-files",
    "--no-approve",
    "--offline"
  ]
});
try {
  const [state, catalog, commands] = await Promise.all([
    client.requestCapability("get_state"),
    client.requestCapability("get_available_models"),
    client.requestCapability("get_commands")
  ]);
  console.log(
    `Pi: ${health.version} (minimum ${MINIMUM_PI_VERSION}; last tested ${TESTED_PI_VERSION})`
  );
  console.log(`Working directory: ${cwd}`);
  console.log(
    `Effective model: ${state.data.model?.provider ?? "none"}/${state.data.model?.id ?? "none"}`
  );
  console.log(`Thinking: ${state.data.thinkingLevel ?? "unknown"}`);
  console.log(`Available models: ${catalog.data.models?.length ?? 0}`);
  console.log(`Pi commands: ${commands.data.commands?.length ?? 0}`);
  console.log("RPC smoke test passed. Offline mode was used and no model prompt was sent.");
} finally {
  client.dispose();
}
