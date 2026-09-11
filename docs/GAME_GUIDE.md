# Emberline and Riftward code map

Emberline: Foundry Wars is the new factory RTS at `/emberline`.
Build conveyors from orange outputs to cyan inputs: rear mine → depot pays
credits, mine → Crucible makes alloy, and supplied factories make units.
Keepers also haul physically and construct blueprints. Research unlocks heavy
industry, logistics, command and resilience. Rival economy is rotationally
symmetric; rear infrastructure is protected while forward factories can be
destroyed and rebuilt. Wolves, siege rams, shield drones and flak form the
combat counter system. Emergency Grid provides a defensive recovery tool.

- `app/emberline/engine.ts`: pure deterministic economy, material routing,
  keeper jobs, research, AI, combat and save/restore.
- `app/emberline/renderer.ts`: canvas terrain, machines, units, belts and cargo.
- `app/emberline/Emberline.tsx`: pointer/keyboard input, HUD, panels, lifecycle,
  artwork loading and the `emberline-foundry-v1` device-local save.
- `public/emberline-art/`: original terrain, atlas and install icons.
- `public/emberline.webmanifest`, `emberline-sw.js`: separate install/offline identity.

Riftward: Keepers of the Wild remains at `/`. Keepers mine shared crystal
seams and physically deliver their cargo. Build Moonwells, defenses and
research buildings, then unlock advanced units and support structures.
Its engine and renderer live in `app/game/`; `app/Game.tsx` owns the interface
and the separate `riftward-match-v1` save. Its original art and PWA files are
under `public/art/`, `manifest.webmanifest` and `sw.js`.

Both games run entirely in the visitor's browser. There is no server simulation,
multiplayer, account or cloud save. Existing sound cues are preserved; future
audio work must follow AGENTS.md's managed MusicGen/AudioGen direction.

Hosting adds `/gem-automata` through `app/paths.ts`. The public Emberline URL
ends in `/gem-automata/emberline`; do not hard-code root asset URLs in components.
The release build renders both games and scopes/version-stamps PWA artifacts,
without changing the original Sites build or local save keys.

Tests cover deterministic full battles, delivery-based income/production,
saves, original-host rendering, both public routes and every artifact,
PWA/offline isolation, exact-commit receipts, stale main and failed-publication
rollback. This is automated code/HTTP verification, not visual or physical
phone playtesting. Release work preserves the source games' balance and art.
