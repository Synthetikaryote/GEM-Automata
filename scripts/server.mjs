// Dependency-free release server. It exposes web/ and health metadata only.
import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import { createReadStream } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export async function createServer(root) {
  root = path.resolve(root);
  const release = JSON.parse(await readFile(path.join(root, ".release.json"), "utf8"));
  if (release.app !== "gem-automata") throw new Error("Not a GEM Automata release");
  const web = path.join(root, "web");
  const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".png": "image/png", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".json": "application/json", ".rsc": "text/x-component" };
  return http.createServer(async (request, response) => {
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    response.setHeader("Cache-Control", "no-store");
    const send = (status, body, type = "text/plain; charset=utf-8") => {
      response.writeHead(status, { "Content-Type": type });
      response.end(request.method === "HEAD" ? undefined : body);
    };
    if (!["GET", "HEAD"].includes(request.method)) { response.setHeader("Allow", "GET, HEAD"); send(405, "Method not allowed"); return; }
    try {
      const raw = decodeURIComponent((request.url || "/").split("?")[0]);
      if (raw.includes("\\") || raw.includes("\0") || raw.split("/").some(part => part === ".." || part.startsWith("."))) { send(404, "Not found"); return; }
      let pathname = raw;
      if (pathname === "/gem-automata") {
        response.writeHead(308, { Location: "/gem-automata/" }); response.end(); return;
      }
      if (pathname.startsWith("/gem-automata/")) pathname = pathname.slice("/gem-automata".length);
      if (pathname === "/healthz") {
        send(200, JSON.stringify({ status: "ok", app: release.app, commit: release.commit, version: release.version }), "application/json"); return;
      }
      const relative = pathname === "/" ? "index.html" : pathname.replace(/^\//, "");
      if (!Object.hasOwn(release.files, `web/${relative}`)) { send(404, "Not found"); return; }
      const filename = path.resolve(web, relative);
      if (!filename.startsWith(web + path.sep)) { send(404, "Not found"); return; }
      const info = await stat(filename);
      if (!info.isFile()) { send(404, "Not found"); return; }
      const type = types[path.extname(filename)];
      if (!type) { send(404, "Not found"); return; }
      response.setHeader("Content-Type", type);
      response.setHeader("Content-Length", info.size);
      if (relative.startsWith("assets/")) response.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      response.writeHead(200);
      if (request.method === "HEAD") response.end();
      else createReadStream(filename).on("error", () => response.destroy()).pipe(response);
    } catch { if (!response.headersSent) send(400, "Bad request"); else response.destroy(); }
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const option = (key, fallback) => args.includes(key) ? args[args.indexOf(key) + 1] : fallback;
  const root = option("--root", path.dirname(fileURLToPath(import.meta.url)));
  const port = Number(option("--port", "8814"));
  const server = await createServer(root);
  server.listen(port, "127.0.0.1", () => console.log(`GEM Automata listening at http://127.0.0.1:${server.address().port}/gem-automata/`));
}
