# Riftward: Keepers of the Wild

Riftward is the new playable direction for **GEM-Automata**: a single-screen, portrait real-time strategy game for a phone browser. The original GEM implementation remains in Git history.

## Play

The lower realm belongs to you; the Hollow builds in the upper realm. Both keepers mine the same regenerating crystal seams in the wild rift.

1. Drag a blueprint from the bottom dock onto an empty lower tile. Tapping a blueprint and then a tile also works.
2. Your keeper walks to each blueprint and constructs it. Between jobs, they mine crystals and physically deliver them to the nearest sanctum or waystation.
3. Moonwells automatically summon wolves. Thornspires defend and Runestones draw attacks.
4. Star Archives create knowledge. Research Awakening to unlock Titan Forges, Wisp Lanterns, and Mending Groves.
5. Destroy the rival sanctum to win. After five minutes, both cores begin to decay to resolve stalemates.

Tap a crystal to focus a keeper on it, or tap open ground in your realm to send a keeper there briefly. Tap your buildings to inspect, upgrade, or salvage them. Hire up to four keepers. Rift Pulse heals friendly units and damages/slows enemies near your first keeper, with a 25-second cooldown. A 12-second Rift Bloom doubles mining every minute, starting at 45 seconds.

Wanderer, Warden, and Oracle change the rival's build decision cadence. The rival pays real crystal costs and uses the same construction and hauling rules.

## Phone installation

Open the game in Chrome on iPhone, then **Share → Add to Home Screen → Add**. A dedicated icon, web manifest, portrait orientation preference, safe-area layout, standalone display, and service worker are included. The field guide contains these directions too.

Battles automatically save to this device every three seconds and when the page becomes hidden. Returning resumes from a paused state. This is local state, not cross-device cloud synchronization. The service worker caches artwork and loaded game resources for repeat/offline visits after a successful online load. Hosted sign-in and browser storage policies can still require a connection. Physical iPhone installation has not been tested in this environment.

Desktop keys: **1–5** select foundations, **Space** pauses/resumes, **Q** casts Rift Pulse, and **Escape** cancels placement.

## Development

Retains the repository's React 19, TypeScript, Vite, vinext, and Cloudflare Worker architecture. No new production dependencies, backend records, or external runtime asset services were added.

```sh
npm install
npm run dev
npm test
```

Use Node.js 22.13+ (24 recommended). Gameplay tests import the pure TypeScript simulation and run deterministic complete battles; server tests exercise the compiled Worker and check PWA assets.

- `app/game/engine.ts`: deterministic simulation, worker orders, economy, research, enemy AI, combat, and save format.
- `app/game/renderer.ts`: canvas rendering of the real simulation, original sprites, effects, and build grid.
- `app/game/assets.ts`: explicit source rectangles for the generated sprite atlas.
- `app/Game.tsx`: touch and keyboard input, HUD, game screens, installation, audio cues, and local saves.
- `public/art/`: original generated terrain, twelve sprites, and app icons. Only resizing, format conversion, and icon padding were used in asset preparation.

Canvas rendering is independent of the React HUD. Simulation runs at 30 updates/second with a bounded timestep, while visuals use requestAnimationFrame. Each army is capped at 28 combat units plus four keepers, and effects are capped at 110. Existing social preview art remains unchanged.

## Art direction

Original artwork was created with built-in image generation for this game: a moonlit moss-and-stone arena with jade and burgundy realms, a transparent twelve-object fantasy RTS sprite atlas, and a luminous emerald crystal within a broken antique gold ring. Asset briefs specified clear silhouettes, no text, and a consistent elevated RTS viewpoint. The atlas is cropped at render time rather than repainted or replaced with geometry.
