# GEM-Automata: two playable strategy games

## Emberline: Foundry Wars

**New separate game at `/emberline`.** Original Riftward remains at `/` with its own save and installation identity.

Emberline is a portrait factory RTS with brass machinery, glowing ore, mechanical wolves, siege rams, and shield drones. Your infinite mine sits at the bottom-left rear corner; keepers carry ore to the receiving depot at bottom right. The rival uses the same layout rotated 180 degrees. There are no neutral resource deposits.

Start with the Belt tool: connect the mine's orange output to the depot's cyan input. Drag between ports or tap them in sequence. Ore and alloy visibly travel through conveyors; connected outputs split supply fairly, and full buffers apply backpressure. Mining capacity is shared across outputs. Machines do not produce without their input material.

- Ore delivered to the depot earns 2 credits. Keepers continue hauling between construction jobs.
- Ore supplied to a Skitterworks produces mechanical wolves; ore supplied to a Signal Lab generates research.
- A Crucible smelts ore into alloy. Deliver alloy to the depot for 6 credits and 1 stored alloy, or route it directly to a heavy factory.
- Heavy Industry unlocks Ram Foundries and Aegis Bays. Siege rams outrange flak and pierce core armor. Shield drones heal nearby allies and reduce incoming damage. Wolves can intercept siege; flak counters packs.
- Logistics research increases throughput, belt speed and keeper capacity. Expanded Command increases army capacity to 18. Reinforced Foundations improves survivability.

The rear economy is protected: enemies cannot kill keepers, mines, depots, or conveyors. Destroyed forward factories retain their connections and rebuild for 40% of their original credit cost. Emergency Grid repairs the base, heals nearby defenders, and slows invaders. Command limits curb runaway armies. After eight minutes both cores overheat to resolve stalemates.

Tap machines to inspect their buffers and connections, upgrade, salvage, or rebuild. Drag blueprints onto the lower grid or tap a blueprint and then a tile. Keyboard: B for Belt, Q for Emergency Grid, Space to pause, Escape to cancel.

Emberline has a separate icon, manifest, service worker, and local save (`emberline-foundry-v1`). Install its `/emberline` page using the browser's Add to Home Screen action. Battles resume paused; saves remain local to the browser or installed app. Original Riftward saves are not migrated or overwritten.

Implementation: `app/emberline/engine.ts`, `renderer.ts`, `Emberline.tsx`, `emberline.css`; independent generated terrain, transparent sprite atlas and icons in `public/emberline-art/`. No new dependencies. Tests cover physical delivery and production, rotational layout, material rejection, research, protected income, rebuilding, counters, healing, full wins/losses and PWA metadata. The combined 18-test suite passes. Browser interaction and physical iPhone installation have not been tested in this environment.

---

## Riftward: Keepers of the Wild

Riftward is the original fantasy strategy game in **GEM-Automata**: a single-screen, portrait real-time strategy game for a phone browser. The original GEM implementation remains in Git history.

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
