import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const publicRoot = path.join(here, "public");
const excludedDirectories = new Set([".git", ".github", "node_modules", "worker"]);

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!excludedDirectories.has(entry.name) && !entry.name.startsWith(".")) {
        files.push(...await walk(absolute));
      }
    } else if (entry.isFile() && entry.name.endsWith(".js") && !entry.name.includes("bookmarklet")) {
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

const scriptFiles = (await walk(repoRoot)).sort();
const scripts = [];
for (const absolute of scriptFiles) {
  const relativePath = path.relative(repoRoot, absolute).split(path.sep).join("/");
  const destination = path.join(publicRoot, relativePath);
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, await readFile(absolute));

  const source = await readFile(absolute, "utf8");
  const version = source.match(/Version:\s*([^\r\n*]+)/i)?.[1]?.trim() ?? null;
  const segments = relativePath.split("/");
  scripts.push({
    path: relativePath,
    title: titleFromSource(source, relativePath),
    category: segments.length > 1 ? segments.slice(0, -1).join(" / ") : "General",
    version
  });
}

await mkdir(publicRoot, { recursive: true });
await writeFile(path.join(publicRoot, "launcher.js"), await readFile(path.join(here, "launcher.js")));
await writeFile(
  path.join(publicRoot, "scripts-manifest.json"),
  JSON.stringify({ generatedAt: new Date().toISOString(), scripts }, null, 2) + "\n"
);
console.log(`Built ${scripts.length} Zxtract script(s).`);
