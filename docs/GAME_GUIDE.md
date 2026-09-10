# Game map

GEM: Automata Duel is a portrait React/DOM automation battler. The player owns
the lower half; the rival AI owns the upper half. Autonomous runners collect
gems from right-edge machines and deliver them to left-edge refineries for
charge. Select a dock piece and tap one of 15 pads. Slash around the player
runner to damage nearby attackers and clear bullets. The first core reduced
from 100 HP to zero loses. Pause and rematch are in the existing interface.

`app/Game.tsx` contains the 29-piece catalog, state types, `startingState`,
`step`, movement/economy/combat, AI, build/slash/reset handlers, and rendering.
Its five filters are All, Automation, Defense, Attack and Support. Nine core
pieces plus 20 additional pieces cover production, transport, shields/walls,
turrets, creature spawners, healing and unusual economy/support effects.
The simulation updates every 50 ms, clamps long frames to 150 ms, and caps
attacking creatures at 32 per side. `?perf=1` enables the opt-in diagnostics.

`app/globals.css` provides the phone arena and responsive neon cyan/red/gold
interface. `app/page.tsx` and `app/layout.tsx` own the route and metadata.
There is no server simulation, multiplayer, database dependency, login,
persistent match save, or audio engine in the current game.

The release task changes hosting and operations, not gameplay or balance.
