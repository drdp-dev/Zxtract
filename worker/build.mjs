import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const allotmentsRoot = path.join(repoRoot, "allotments");
const publicRoot = path.join(here, "public");

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(absolute));
    else if (entry.isFile() && entry.name.endsWith(".js") && !entry.name.includes("bookmarklet")) {
      files.push(absolute);
    }
  }
  return files;
}

function titleFromSource(source, relativePath) {
  const header = source.slice(0, 1800);
  const match = header.match(/Zxtract\s*[—–-]\s*([^\r\n*]+)/i);
  if (match) return match[1].trim();
  return path.basename(relativePath, ".js")
    .split("-")
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

await rm(publicRoot, { recursive: true, force: true });
await mkdir(publicRoot, { recursive: true });
await cp(allotmentsRoot, path.join(publicRoot, "allotments"), { recursive: true });
await cp(path.join(here, "launcher.js"), path.join(publicRoot, "launcher.js"));

const scriptFiles = (await walk(allotmentsRoot)).sort();
const scripts = [];
for (const absolute of scriptFiles) {
  const relativePath = path.relative(repoRoot, absolute).split(path.sep).join("/");
  const source = await readFile(absolute, "utf8");
  const version = source.match(/Version:\s*([^\r\n*]+)/i)?.[1]?.trim() ?? null;
  const segments = relativePath.split("/");
  scripts.push({
    path: relativePath,
    title: titleFromSource(source, relativePath),
    category: segments.length > 2 ? segments.slice(1, -1).join(" / ") : "General",
    version
  });
}

await writeFile(
  path.join(publicRoot, "scripts-manifest.json"),
  JSON.stringify({ generatedAt: new Date().toISOString(), scripts }, null, 2) + "\n"
);
console.log(`Built ${scripts.length} Zxtract script(s).`);
