import { build as viteBuild } from "vite";
import { rm } from "fs/promises";

async function buildAll() {
  await rm("dist", { recursive: true, force: true }).catch(() => {});
  console.log("Building client...");
  await viteBuild();
  console.log("Done.");
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
