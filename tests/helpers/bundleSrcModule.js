// Node's test runner can't resolve the extensionless relative imports Vite
// allows across src/lib/core (e.g. `from "./kpiRegistry"`), so unit tests
// targeting that tree bundle the module with esbuild first, then import the
// resulting single-file ESM from a temp path. This runs the real source
// (no mocks) rather than skipping coverage for that tree.
import esbuild from "esbuild";
import { writeFile, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

export async function bundleSrcModule(entryPath) {
  const result = await esbuild.build({
    entryPoints: [entryPath],
    bundle: true,
    format: "esm",
    platform: "node",
    write: false,
  });
  const dir = await mkdtemp(path.join(tmpdir(), "gescop-bundle-"));
  const outFile = path.join(dir, "bundle.mjs");
  await writeFile(outFile, result.outputFiles[0].text);
  return import(outFile);
}
