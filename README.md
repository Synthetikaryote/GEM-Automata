# GEM: Automata Duel

GEM is a portrait-first, one-screen automation battler. Two autonomous duelists collect gems, refine them into charge, and spend that charge on machines, defenses, creatures, and production chains. You own the lower half of the arena; a rival AI controls the upper half.

## Play

1. Pick a build piece from the horizontal dock.
2. Tap an open blue pad in your half of the arena.
3. Let your runner gather gems—or automate the job with hauler bots, magnets, presses, and conveyors.
4. Use the **SLASH** button to destroy nearby bullets and wound invading creatures in a 270-degree arc.
5. Reduce the rival core from 100 HP to zero before it does the same to you.

The game is designed for a vertical phone screen, but centers itself inside a phone-sized arena on desktop.

## Build catalog

The core set includes a Bolt Shooter, Shield Emitter, Alloy Wall, Spider Hatchery, Hauler Bot, Conveyor Belt, Medbay, Razorling Den, and Orbit Wisp.

Twenty additional pieces expand the strategy:

- Gem Magnet — pulls distant gems into collection range.
- Prism Press — increases the value of delivered gems.
- Burst Turret — fires a three-shot spread.
- Prism Lance — fires slow, heavy piercing beams.
- Storm Fork — chains lightning through enemy creatures.
- Frost Lens — slows enemies inside friendly territory.
- Firefly Roost — launches flying attackers that bypass walls.
- Siege Beetle — produces slow armored assault creatures.
- Medic Drone — repairs the most damaged friendly structure.
- Guardian Golem — stays home and intercepts intruders.
- Star Mine — detonates when enemies cross the center line.
- Mirror Pylon — reflects some incoming shots.
- Mending Grove — repairs every friendly construction.
- Tempo Coil — accelerates production and weapon cycles.
- Siphon Bloom — steals unspent charge from the rival.
- Gem Vault — builds a protected passive reserve.
- Chance Engine — generates unpredictable jackpots.
- Rift Gate — deploys new attackers near the center line.
- Thorn Mesh — damages creatures that strike it.
- Decoy Idol — absorbs attacks meant for valuable machines.

## Run locally

Requires Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

Then open the local URL printed by the development server.

## Checks

```bash
npm test
```

## Tech

GEM is a single-route React game built with Next.js-compatible vinext and Vite. It uses no external art, game engine, database, login, or analytics. All simulation runs locally in the browser.
