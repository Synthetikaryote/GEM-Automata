# Emberline: Halo development and release

Public Emberline: **https://halo.tail34c017.ts.net:8443/gem-automata/emberline**

Riftward is preserved at **https://halo.tail34c017.ts.net:8443/gem-automata/**.
Both games ship together from `Synthetikaryote/GEM-Automata`. Shared runtime,
CI context and task identifiers retain the repository name intentionally.

| Purpose | Location |
| --- | --- |
| Writable Git checkout | `C:\Claude\dev\emberline` |
| Immutable hosted release | `C:\Claude\runtime\gem-automata` |
| CI runner, worktrees, artifacts and receipts | `C:\Claude\automations\gem_automata_ci` |
| Server logs | `C:\Claude\logs\gem-automata` |
| Reserved persistent data | `C:\Claude\data\gem-automata` |
| Original source import, preserved | `C:\Claude\GEM` |

The server-side data directory is reserved. Each browser saves Emberline under
`emberline-foundry-v1` and Riftward under `riftward-match-v1`. Reloads resume
paused. Releases preserve these keys and never delete saves. Cache updates only
delete their own game's outdated asset cache, not saves or the other game's cache.
The old Sites URL is a different origin; its saves stay there, without automatic
transfer to Tailscale. There is no account, cloud sync, or public write API.
The older `gem-duel` game and the Notches/NecroFleet services are separate.

## Development and verification

Use Node 22.13+ (Halo uses Node 24), Python 3.12, Git and authenticated `gh`.

```powershell
cd C:\Claude\dev\emberline
npm ci
npm run dev -- --hostname 127.0.0.1 --port 8815
npm run ci:local
```

The complete gate installs the lockfile, typechecks the hosted React app, runs complete deterministic wins/losses in both engines, checks their original-host rendering, builds the hosted release, exercises its real HTTP server and every
public file including both games' dynamic artwork and hydration modules,
verifies install identities and offline navigation with simulated worker events, checks artifact hashes and path boundaries,
and tests publication rollback and freshness. These checks do not establish
visual quality or physical-phone performance.

`app/emberline/` contains Emberline; `app/Game.tsx` and `app/game/` contain Riftward.
The hosted build uses vinext's production bundles and explicitly renders both
`/gem-automata/` and `/gem-automata/emberline` with complete hydration payloads.
This works around vinext 0.0.50's static-export probe ignoring `basePath`.
`app/paths.ts` scopes client assets and worker registrations. Artifact-only
manifest/worker URL rewriting preserves the source Sites deployment; cache
names include the exact release commit so an update refreshes cached artwork.
The server serves both Emberline trailing-slash forms without an install-blocking
redirect. Workers stay within `/gem-automata/`, leaving other Halo apps untouched.
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
hosting setup need to incorporate main to gain its release scripts.

Main is protected by the required `local/gem-automata` status and PR workflow.
Develop on a feature branch, push a PR, and wait for its exact head to pass.
If testing manually, use `python scripts/local_ci.py --test-ref origin/<branch>`.
Merge the reviewed, passing head without bypassing protection; main's resulting
merge commit must pass the gate before publication. Do not deploy feature heads.
Package version `1.0.0` marks the first Emberline release; the full commit and
artifact hashes uniquely identify every later deployment. Bump package and
lockfile versions together for named releases. A GitHub tag/release is a label,
not permission to bypass the main gate.

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
