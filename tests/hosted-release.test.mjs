import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { createServer } from "../scripts/server.mjs";

test("public release serves the hydrated game and every referenced asset under its prefix", async t => {
  const root = new URL("../.release-build/", import.meta.url);
  const release = JSON.parse(await readFile(new URL(".release.json", root), "utf8"));
  const server = await createServer(root.pathname.replace(/^\/(?=[A-Z]:)/i, ""));
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const response = await fetch(`${origin}/gem-automata/`);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  const html = await response.text();
  assert.match(html, /GEM automation duel/);
  assert.match(html, /Bolt Shooter/);
  assert.match(html, /__VINEXT_RSC_DONE__/);
  assert.match(html, /https:\/\/halo.tail34c017.ts.net:8443\/gem-automata\/og.png/);
  assert.doesNotMatch(html, /localhost:|(?<![A-Za-z])[A-Z]:[/\\]/i);
  const links = [...html.matchAll(/(?:src|href)="(\/[^" ]+)"|url\(['"]?(\/[^)'" ]+)/g)].map(match => match[1] || match[2]);
  assert.ok(links.length > 10, "styles, modules, and font assets exist");
  for (const url of new Set(links)) {
    assert.ok(url.startsWith("/gem-automata/"), url);
    assert.equal((await fetch(origin + url)).status, 200, url);
  }
  for (const [relative, expected] of Object.entries(release.files)) {
    const actual = createHash("sha256").update(await readFile(new URL(relative, root))).digest("hex");
    assert.equal(actual, expected, relative);
  }
  const health = await (await fetch(`${origin}/gem-automata/healthz`)).json();
  assert.equal(health.commit, release.commit);
  for (const route of ["/.release.json", "/server.mjs", "/.git/config", "/gem-automata/%2e%2e%2fserver.mjs", "/gem-automata/missing.js"]) {
    assert.equal((await fetch(origin + route)).status, 404, route);
  }
  assert.equal((await fetch(`${origin}/gem-automata/`, { method: "POST", body: "{}" })).status, 405);
  const head = await fetch(`${origin}/gem-automata/`, { method: "HEAD" });
  assert.equal(head.status, 200);
  assert.equal(await head.text(), "");
});
