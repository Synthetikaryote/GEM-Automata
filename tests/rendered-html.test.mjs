import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html", host: "localhost" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the GEM game shell and metadata", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>GEM — Automata Duel<\/title>/i);
  assert.match(html, /GEM automation duel/i);
  assert.match(html, /AUTOMATA DUEL/i);
  assert.match(html, /Bolt Shooter/i);
  assert.match(html, /og\.png/i);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|Your site is taking shape/i);
});

test("ships the requested automation and combat catalog", async () => {
  const game = await readFile(new URL("../app/Game.tsx", import.meta.url), "utf8");
  const packageJson = await readFile(new URL("../package.json", import.meta.url), "utf8");

  for (const requestedPiece of ["Bolt Shooter", "Shield Emitter", "Alloy Wall", "Spider Hatchery", "Hauler Bot", "Conveyor Belt", "Medbay", "Orbit Wisp"]) {
    assert.match(game, new RegExp(requestedPiece));
  }
  assert.equal((game.match(/surprise: true/g) ?? []).length, 20);
  assert.match(game, /270° GEMSLASH/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
});
