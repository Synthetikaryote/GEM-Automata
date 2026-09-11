import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { createServer } from "../scripts/server.mjs";

const root = new URL("../.release-build/", import.meta.url);
const prefix = "/gem-automata";
async function host(t) {
  const release = JSON.parse(await readFile(new URL(".release.json", root), "utf8"));
  const server = await createServer(fileURLToPath(root));
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  return { release, origin: `http://127.0.0.1:${server.address().port}` };
}

test("both hydrated games and every public file are served correctly under the release prefix", async t => {
  const { release, origin } = await host(t);
  assert.deepEqual(release.games, {emberline: prefix + "/emberline", riftward: prefix + "/"});
  for (const [route, label] of [["/", "Riftward strategy game"], ["/emberline", "Emberline factory strategy game"], ["/emberline/", "Emberline factory strategy game"]]) {
    const response = await fetch(origin + prefix + route);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    const html = await response.text();
    assert.ok(html.includes(label));
    assert.match(html, /__VINEXT_RSC_DONE__/);
    assert.match(html, /viewport-fit=cover/);
    assert.doesNotMatch(html, /localhost:|(?<![A-Za-z])[A-Z]:[/\\]/i);
    const links = [...html.matchAll(/(?:src|href)="(\/[^" ]+)"|url\(['"]?(\/[^)'" ]+)/g)].map(m => m[1] || m[2]);
    assert.ok(links.length > 4, "artwork, styles and hydration modules exist");
    for (const url of new Set(links)) {
      assert.ok(url.startsWith(prefix + "/"), url);
      assert.equal((await fetch(origin + url)).status, 200, url);
    }
  }
  // Includes dynamically loaded battlefield/sprite artwork, not just SSR references.
  for (const [relative, expected] of Object.entries(release.files)) {
    const actual = createHash("sha256").update(await readFile(new URL(relative, root))).digest("hex");
    assert.equal(actual, expected, relative);
    if (!relative.startsWith("web/")) continue;
    const response = await fetch(origin + prefix + "/" + relative.slice(4));
    assert.equal(response.status, 200, relative);
    assert.equal(createHash("sha256").update(Buffer.from(await response.arrayBuffer())).digest("hex"), expected, relative);
    if (relative.endsWith(".webp")) assert.equal(response.headers.get("content-type"), "image/webp");
    if (relative.endsWith(".webmanifest")) assert.equal(response.headers.get("content-type"), "application/manifest+json");
  }
  const health = await (await fetch(origin + prefix + "/healthz")).json();
  assert.equal(health.commit, release.commit);
  for (const route of ["/.release.json", "/server.mjs", "/.git/config", prefix + "/%2e%2e%2fserver.mjs", prefix + "/missing.js"]) {
    assert.equal((await fetch(origin + route)).status, 404, route);
  }
  assert.equal((await fetch(origin + prefix + "/", {method: "POST", body: "{}"})).status, 405);
  const head = await fetch(origin + prefix + "/emberline", {method: "HEAD"});
  assert.equal(head.status, 200);
  assert.equal(await head.text(), "");
});

test("install identities, caches and offline navigation stay isolated and release-versioned", async t => {
  const {release, origin} = await host(t);
  for (const [filename, route, name, cachePrefix] of [
    ["manifest.webmanifest", "/", "sw.js", "riftward-"],
    ["emberline.webmanifest", "/emberline", "emberline-sw.js", "emberline-"],
  ]) {
    const manifest = await (await fetch(origin + prefix + "/" + filename)).json();
    for (const key of ["id", "scope", "start_url"]) assert.equal(manifest[key], prefix + route);
    assert.equal((await fetch(origin + manifest.start_url, {redirect:"error"})).status, 200);
    for (const icon of manifest.icons) {
      assert.ok(icon.src.startsWith(prefix + "/"));
      assert.equal((await fetch(origin + icon.src)).status, 200);
    }
    const response = await fetch(origin + prefix + "/" + name);
    assert.equal(response.headers.get("cache-control"), "no-store");
    const source = await response.text();
    assert.ok(source.includes(release.commit), "cache changes on each release");
    const events = new Map(), stored = new Map(), removed = [], fetched = [];
    let offline = false, cacheName;
    const key = input => typeof input === "string" ? input : new URL(input.url).pathname;
    const cache = {
      async addAll(urls) { for (const url of urls) await this.add(url); },
      async add(url) {
        const res = await network(url);
        assert.equal(res.status, 200, url);
        stored.set(key(url), res);
      },
      async put(input, res) { stored.set(key(input), res); },
      async match(input) { return stored.get(key(input))?.clone(); },
    };
    async function network(input, options) {
      if (offline) throw new Error("Offline");
      const url = typeof input === "string" ? new URL(input, origin).href : input.url;
      fetched.push(url);
      assert.ok(new URL(url).pathname.startsWith(prefix + "/"), "no other app resources");
      return fetch(url, options);
    }
    vm.runInNewContext(source, {
      URL, Response, fetch:network,
      self: {
        location: new URL(origin + prefix + "/" + name),
        addEventListener: (name, handler) => events.set(name, handler),
        skipWaiting:async()=>{}, clients:{claim:async()=>{}},
      },
      caches: {
        async open(name) { cacheName = name; return cache; },
        async keys() { return [cacheName, cachePrefix + "old", "unrelated-app", "other-game"]; },
        async delete(name) { removed.push(name); },
      },
    });
    const pending = [];
    const waitUntil = promise => pending.push(promise);
    events.get("install")({waitUntil});
    await Promise.all(pending.splice(0));
    assert.ok(stored.has(prefix + route));
    assert.ok(fetched.some(url => url.endsWith("/battlefield.webp")));
    events.get("activate")({waitUntil});
    await Promise.all(pending.splice(0));
    assert.deepEqual(removed, [cachePrefix + "old"]);
    const count = fetched.length;
    events.get("message")({data:{type:"CACHE_RUNTIME",urls:[origin + "/necrofleet/unrelated.js", "https://example.org/game.js"]},waitUntil});
    await Promise.all(pending.splice(0));
    assert.equal(fetched.length, count);
    offline = true;
    for (const requested of route === "/" ? [route] : [route, route + "/"]) {
      let answer;
      events.get("fetch")({
        request:{url:origin + prefix + requested,method:"GET",mode:"navigate",destination:"document"},
        respondWith:promise=>{answer=promise;}, waitUntil,
      });
      assert.ok(answer, "offline route has a handler");
      assert.equal((await answer).status, 200);
    }
    for (const denied of ["/necrofleet/assets/foo.js", prefix + "/api/private.js", prefix + "/auth.js", prefix + "/assets/foo.js?_rsc=1"]) {
      let handled = false;
      events.get("fetch")({
        request:{url:origin + denied,method:"GET",mode:"cors",destination:"script"},
        respondWith:()=>{handled=true;},waitUntil,
      });
      assert.equal(handled, false, denied);
    }
  }
});

test("client save keys and service-worker registration scopes are preserved separately", async () => {
  const emberline = await readFile(new URL("../app/emberline/Emberline.tsx", import.meta.url), "utf8");
  const riftward = await readFile(new URL("../app/Game.tsx", import.meta.url), "utf8");
  assert.match(emberline, /const SAVE = 'emberline-foundry-v1'/);
  assert.match(riftward, /const SAVE='riftward-match-v1'/);
  assert.match(emberline, /scope:gamePath\('\/emberline'\)/);
  assert.match(riftward, /scope:gamePath\('\/'\)/);
  assert.doesNotMatch(emberline + riftward, /localStorage\.clear/);
});
