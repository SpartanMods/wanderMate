// Native Node ESM resolver hook: maps "@/..." aliases to the repo root and
// lets extensionless source imports resolve to ".ts" files. No dependencies.
import { fileURLToPath, pathToFileURL } from "node:url";
import { statSync } from "node:fs";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function firstFile(base) {
  const candidates = [base + ".ts", path.join(base, "index.ts"), base];
  for (const c of candidates) {
    try {
      if (statSync(c).isFile()) return c;
    } catch {}
  }
  return null;
}

export async function resolve(specifier, context, nextResolve) {
  let base = null;
  if (specifier.startsWith("@/")) {
    base = path.join(root, specifier.slice(2));
  } else if (
    (specifier.startsWith("./") || specifier.startsWith("../")) &&
    context.parentURL
  ) {
    base = path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier);
  }
  if (base) {
    const file = firstFile(base);
    if (file) return nextResolve(pathToFileURL(file).href, context);
  }
  return nextResolve(specifier, context);
}
