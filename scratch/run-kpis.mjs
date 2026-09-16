import { register } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

// Register the resolver hook (handles extensionless + "@/..." imports)
register("./kpi-loader.mjs", import.meta.url);

// Then load and execute the verification test from the project root
const here = path.dirname(fileURLToPath(import.meta.url));
const testUrl = pathToFileURL(path.join(here, "..", "test_all_kpis.mjs")).href;
await import(testUrl);