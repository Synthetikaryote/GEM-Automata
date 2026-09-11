import { spawnSync, execFileSync } from "node:child_process";
import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { pathToFileURL } from "node:url";

process.env.GEM_HOSTED = "1";
const result = spawnSync(process.execPath, ["node_modules/vinext/dist/cli.js", "build"], {
  stdio: "inherit", env: process.env,
});
if (result.status !== 0) process.exit(result.status ?? 1);

const BASE = "/gem-automata";
const ORIGIN = "https://halo.tail34c017.ts.net:8443";
const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();
const commit = git("rev-parse", "HEAD");
// vinext 0.0.50's exporter probes / without basePath. Render both games explicitly.
const { default: render } = await import(pathToFileURL(path.resolve("dist/server/index.js")).href);
const pages = { "/": ["index.html", "Riftward strategy game"], "/emberline": ["emberline/index.html", "Emberline factory strategy game"] };
const rendered = {};
for (const [route, [filename, label]] of Object.entries(pages)) {
  const response = await render(new Request(ORIGIN + BASE + (route === "/" ? "" : route), {
    headers: { accept: "text/html", host: new URL(ORIGIN).host },
  }));
  if (response.status !== 200) throw new Error(`Static render ${route} failed: ${response.status}`);
  const html = (await response.text()).replace(
    /<meta name="viewport" content="[^"]*"\s*\/?\s*>/,
    '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"/>',
  );
  if (!html.includes(label) || !html.includes("__VINEXT_RSC_DONE__")) throw new Error("Game markup or hydration missing: " + route);
  if (/(?<![A-Za-z])[A-Z]:[/\\]/i.test(html) || html.includes("localhost:")) throw new Error("Local path leaked into hosted HTML");
  rendered[filename] = html;
}

const output = path.resolve(".release-build");
await rm(output, { recursive: true, force: true }); // fixed generated output, never a supplied path
await mkdir(path.join(output, "web"), { recursive: true });
await cp("dist/client", path.join(output, "web"), {
  recursive: true,
  filter: source => !path.relative("dist/client", source).split(path.sep).some(part => part.startsWith(".")),
});
for (const [filename, html] of Object.entries(rendered)) {
  await mkdir(path.dirname(path.join(output, "web", filename)), { recursive: true });
  await writeFile(path.join(output, "web", filename), html);
}
// Public files bypass Vite, so scope PWA URLs in the built artifact only.
// The source manifests keep their original Sites identities and saves.
for (const name of ["manifest.webmanifest", "emberline.webmanifest"]) {
  const file = path.join(output, "web", name);
  const manifest = JSON.parse(await readFile(file, "utf8"));
  for (const key of ["id", "start_url", "scope"]) manifest[key] = BASE + manifest[key];
  for (const icon of manifest.icons) icon.src = BASE + icon.src;
  await writeFile(file, JSON.stringify(manifest, null, 2));
}
for (const name of ["sw.js", "emberline-sw.js"]) {
  const file = path.join(output, "web", name);
  let worker = await readFile(file, "utf8");
  worker = worker.replace(/(['"])\/(?!\/)([^'"]*)\1/g, (_, quote, rest) => quote + BASE + "/" + rest + quote);
  worker = worker.replace(/(const CACHE\s*=\s*')([^']+)(')/, (_, start, name, end) => start + name + "-" + commit + end);
  await writeFile(file, worker);
}
await cp("scripts/server.mjs", path.join(output, "server.mjs"));
const files = {};
async function inventory(directory) {
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const filename = path.join(directory, item.name);
    if (item.isDirectory()) await inventory(filename);
    else files[path.relative(output, filename).replaceAll("\\", "/")] = createHash("sha256").update(await readFile(filename)).digest("hex");
  }
}
await inventory(output);
await writeFile(path.join(output, ".release.json"), JSON.stringify({
  app: "gem-automata", version: JSON.parse(await readFile("package.json", "utf8")).version,
  commit, games: { emberline: BASE + "/emberline", riftward: BASE + "/" }, tree: git("rev-parse", "HEAD^{tree}"),
  clean: git("status", "--porcelain", "--untracked-files=all") === "",
  built_at: new Date().toISOString(), base_path: "/gem-automata", files,
}, null, 2));
console.log(`Hosted release built: ${Object.keys(files).length} files in .release-build`);
