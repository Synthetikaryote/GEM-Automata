# GEM Automata: Halo development and release

Public game: **https://halo.tail34c017.ts.net:8443/gem-automata/**

| Purpose | Location |
| --- | --- |
| Writable Git checkout | `C:\Claude\dev\gem-automata` |
| Immutable hosted release | `C:\Claude\runtime\gem-automata` |
| CI runner, worktrees, artifacts and receipts | `C:\Claude\automations\gem_automata_ci` |
| Server logs | `C:\Claude\logs\gem-automata` |
| Reserved persistent data | `C:\Claude\data\gem-automata` |
| Original source import, preserved | `C:\Claude\GEM` |

The data directory is reserved; this version has no persistent save system.
Each visitor has an independent browser-local match. Reloading starts a new
duel. There is no account, shared profile, or write API exposed publicly.
The older `gem-duel` game and the Notches/NecroFleet services are separate.

## Development and verification

Use Node 22.13+ (Halo uses Node 24), Python 3.12, Git and authenticated `gh`.

```powershell
cd C:\Claude\dev\gem-automata
npm ci
npm run dev -- --hostname 127.0.0.1 --port 8815
npm run ci:local
```

The complete gate installs the lockfile, typechecks the hosted React app, tests the original server-rendered
game, builds the hosted release, exercises its real HTTP server and every
HTML-referenced module/style/font, checks artifact hashes and path boundaries,
and tests publication rollback and freshness. These checks do not establish
visual quality or physical-phone performance.

`app/Game.tsx` is the existing React game, reused without gameplay changes.
The hosted build uses vinext's production bundle and renders `/gem-automata`
to HTML with its complete hydration payload. Explicit rendering works around
vinext 0.0.50's export probe ignoring `basePath`; its copied font files replace
Windows source paths in the inline stylesheet. The same assets and fonts ship.
The original Sites build remains available via `npm run build`; its historical
`.openai/hosting.json` is retained. Halo does not deploy through Sites.

## CI and publication

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\install-tasks.ps1
npm run deploy:local
python scripts\local_ci.py --verify
```

`ClaudeGemAutomataCI` runs every five minutes as the signed-in user (so it can
use the existing GitHub authorization). It tests exact main and trusted
same-repository PR commits in isolated worktrees. Public fork PRs are skipped.
The status context is `local/gem-automata`; no GitHub-hosted Actions minutes
are used. Main alone is published. A changed main is tested again; a failed
gate cannot replace the last good release. Completed artifacts have SHA-256
inventories and separate CI receipts, and are reused without rebuilding.
Unchanged failed commits are also cached to avoid repeated installs and status
spam. After correcting a transient environment failure, retry explicitly with
`python scripts/local_ci.py --test-ref <commit-or-ref>`. PRs opened before this
hosting setup need to rebase onto main to gain its release scripts.

Publication acquires an exclusive file lock, rechecks main, stages the verified
artifact next to the runtime, stops only its own Node process, moves the old
release into a retained backup, and switches the new release into place.
It checks the running commit and every file before recording success. A startup
failure restores the previous release and retains the failed one for inspection.
Never delete a backup without inspecting the exact path and confirming it is
no longer needed. No publication step touches persistent data.

The installed runner is a stable copy, independent of developer branch
checkouts. After intentionally changing CI/watchdog code, reinstall it from a
reviewed main checkout. Logs are `gem_automata_ci\gem-ci.log`; `passed/`,
`deployed.json` and `artifacts/` record test and publication provenance.

## Server and public Tailscale route

`ClaudeGemAutomataServer` checks the listener each minute. When installed from
an elevated shell it runs as SYSTEM at boot, including before user login;
otherwise it uses a logon trigger. Both scheduled tasks use a hidden launcher.
The server listens only at `127.0.0.1:8814`, reads a read-only release and exposes
only its `web/` inventory plus `/healthz`. Source, CI files, release manifests,
secrets and arbitrary filesystem paths cannot be requested through the server.

The existing public Funnel on HTTPS 8443 gets this one additional route:

```powershell
tailscale funnel --bg --yes --https=8443 --set-path=/gem-automata http://127.0.0.1:8814
```

Do not reset Funnel or replace its root handler. Port 443 and Notches on 10002
remain tailnet-only. Verify with `tailscale funnel status`, the public game
page, and `https://halo.tail34c017.ts.net:8443/gem-automata/healthz`.
To remove just this route, use the same Funnel command followed by `off`.

For rollback, first disable `ClaudeGemAutomataCI` and stop the managed game
server using `ensure-server.ps1 -StopOnly -Deployment`. Preserve the current
runtime by renaming it to a new `.gem-automata.failed-...` sibling, move the
chosen verified backup to `gem-automata`, and run the watchdog. Revert main
through Git before re-enabling CI or the current main will be republished.
