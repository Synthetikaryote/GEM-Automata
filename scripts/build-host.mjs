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

// Render the one route explicitly: vinext 0.0.50's static exporter probes /
// instead of the configured basePath and silently skips this page.
const { default: render } = await import(pathToFileURL(path.resolve("dist/server/index.js")).href);
const response = await render(new Request("https://halo.tail34c017.ts.net:8443/gem-automata", {
  headers: { accept: "text/html", host: "halo.tail34c017.ts.net:8443" },
}));
if (response.status !== 200) throw new Error(`Static render failed: ${response.status}`);
let html = await response.text();
// vinext emits local font-source URLs in its inline SSR stylesheet on Windows.
// Its build already copies these exact files into assets/_vinext_fonts.
html = html.replaceAll(path.resolve(".vinext/fonts").replaceAll("\\", "/") + "/", "/gem-automata/assets/_vinext_fonts/");
if (!html.includes("GEM automation duel") || !html.includes("__VINEXT_RSC_DONE__")) {
  throw new Error("Game markup or hydration payload missing");
}
if (/(?<![A-Za-z])[A-Z]:[/\\]/i.test(html) || html.includes("localhost:")) throw new Error("Local path leaked into hosted HTML");

const output = path.resolve(".release-build");
await rm(output, { recursive: true, force: true }); // fixed generated output, never a supplied path
await mkdir(path.join(output, "web"), { recursive: true });
await cp("dist/client", path.join(output, "web"), {
  recursive: true,
  filter: source => !path.relative("dist/client", source).split(path.sep).some(part => part.startsWith(".")),
});
await writeFile(path.join(output, "web/index.html"), html);
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
const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();
await writeFile(path.join(output, ".release.json"), JSON.stringify({
  app: "gem-automata", version: JSON.parse(await readFile("package.json", "utf8")).version,
  commit: git("rev-parse", "HEAD"), tree: git("rev-parse", "HEAD^{tree}"),
  clean: git("status", "--porcelain", "--untracked-files=all") === "",
  built_at: new Date().toISOString(), base_path: "/gem-automata", files,
}, null, 2));
console.log(`Hosted release built: ${Object.keys(files).length} files in .release-build`);
