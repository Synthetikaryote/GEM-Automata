# Emberline: Foundry Wars (GEM-Automata)

The active repository is `Synthetikaryote/GEM-Automata`. This is distinct from
the older `gem-duel` repository and its `C:\Claude\dev\gem` checkout.

- Development: `C:\Claude\dev\emberline`. Use feature branches or isolated
  Git worktrees. Preserve the original import at `C:\Claude\GEM`.
- Release: `C:\Claude\runtime\gem-automata`. This is a read-only projection,
  never a place to develop. Only the tested local CI publisher updates it.
- Run `npm run ci:local` for the complete local gate. The authoritative GitHub
  status is `local/gem-automata`; CI runs on Halo, not GitHub-hosted Actions.
- The scheduled runner tests same-repository PR heads and main in detached
  worktrees, then publishes only tested `origin/main`. Fork PRs require review
  and an explicit trusted local test; never execute public fork code in the
  credentialed machine runner automatically.
- `npm run deploy:local` fetches, tests, and publishes main through the same
  serialized publisher. Do not copy source directly into the live folder.
- Serve only built public files. Public endpoint:
  `https://halo.tail34c017.ts.net:8443/gem-automata/emberline`.
  Riftward remains at `/gem-automata/`; both ship in this repo's shared runtime.
- Preserve the separate browser save keys `emberline-foundry-v1` and
  `riftward-match-v1`. Never clear localStorage or change install identities
  as part of a routine release. Different hosts do not share browser saves.
- All client assets and PWA registration URLs go through `app/paths.ts`.
  Hosted manifests/workers are scoped and release-versioned in build-host.mjs.
  Test both routes, dynamic artwork, and offline cache isolation.
- Read `docs/LOCAL_OPERATIONS.md` for hosting, recovery and rollback. Keep
  release backups and persistent data outside the served tree.
- Audio: MusicGen `facebook/musicgen-medium` for music and AudioGen
  `facebook/audiogen-medium` for effects, through the managed Echoing Vault
  queue. Read `C:\Claude\automations\echoing_vault\README.md` before any audio
  work. ACE-Step and procedural/MIDI music fallbacks are retired. Preserve
  approved assets and record actual engine, prompt, seed, hashes and processing.
