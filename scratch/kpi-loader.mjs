import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// The loader lives in <project>/scratch/, so the project root is one level up.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function tryResolveFile(target) {
  const candidates = [
    target,
    target + ".js",
    target + ".jsx",
    target + ".mjs",
    target + ".cjs",
    path.join(target, "index.js"),
    path.join(target, "index.jsx"),
    path.join(target, "index.mjs"),
  ];
  for (const c of candidates) {
    if (existsSync(c) && statSync(c).isFile()) {
      return pathToFileURL(c).href;
    }
  }
  return null;
}

export async function resolve(specifier, context, nextResolve) {
  // Handle the "@/*" -> "src/*" alias
  if (specifier.startsWith("@/")) {
    const target = path.join(ROOT, "src", specifier.slice(2));
    const resolved = tryResolveFile(target);
    if (resolved) return { url: resolved, shortCircuit: true };
  }

  // Handle extensionless relative/absolute imports
  if (specifier.startsWith("./") || specifier.startsWith("../") || path.isAbsolute(specifier)) {
    const parentPath = context.parentURL
      ? fileURLToPath(context.parentURL)
      : path.join(ROOT, "index.js");
    const target = path.isAbsolute(specifier)
      ? specifier
      : path.resolve(path.dirname(parentPath), specifier);
    const resolved = tryResolveFile(target);
    if (resolved) return { url: resolved, shortCircuit: true };
  }

  return nextResolve(specifier, context);
}
