export const WIDTH = 420, HEIGHT = 680;
export type Side = 'you' | 'rival';
export type Point = { x: number; y: number };
export type Kind = 'mine' | 'depot' | 'core' | 'kennel' | 'flak' | 'lab' | 'smelter' | 'foundry' | 'aegis';
export type Product = 'ore' | 'alloy';
export type BuildKind = Exclude<Kind, 'mine' | 'depot' | 'core'>;
export type Tech = 'industry' | 'logistics' | 'command' | 'resilience';
export type UnitKind = 'wolf' | 'ram' | 'shield';
export type Definition = { name: string; label: string; cost: number; metal: number; tier: number; hp: number; armor: number; sprite: number; time: number; input?: Product; output?: Product; description: string };
export const DEFS: Record<Kind, Definition> = {
  mine: { name: 'Ember Vein', label: 'Infinite ore', cost: 0, metal: 0, tier: 1, hp: 1, armor: 0, sprite: 1, time: 0, output: 'ore', description: 'An inexhaustible ore source. Its conveyor output is shared fairly between connected machines.' },
  depot: { name: 'Receiving Depot', label: 'Deposit', cost: 0, metal: 0, tier: 1, hp: 1, armor: 0, sprite: 2, time: 0, input: 'ore', description: 'Accepts ore and alloy. Ore earns 2 credits; alloy earns 6 credits and 1 stored alloy.' },
  core: { name: 'Command Core', label: 'Core', cost: 0, metal: 0, tier: 1, hp: 1100, armor: 12, sprite: 0, time: 0, description: 'Armored against light units. Siege rams are the answer. Regenerates slowly after 8 seconds without damage.' },
  kennel: { name: 'Skitterworks', label: 'Wolves', cost: 65, metal: 0, tier: 1, hp: 200, armor: 2, sprite: 4, time: 4, input: 'ore', description: '4 ore → 1 mechanical wolf every 14 seconds. Fast pressure units, weak against armor. Uses 1 command capacity.' },
  flak: { name: 'Flak Nest', label: 'Flak', cost: 60, metal: 0, tier: 1, hp: 310, armor: 5, sprite: 5, time: 4, description: 'Area damage shreds wolf packs. No conveyor required. Vulnerable to long-range siege rams.' },
  lab: { name: 'Signal Lab', label: 'Lab', cost: 75, metal: 0, tier: 1, hp: 195, armor: 2, sprite: 6, time: 5, input: 'ore', description: '1 ore → 1 research every 2.5 seconds. Requires an ore input. Unlock heavy industry for siege and shield units.' },
  smelter: { name: 'Crucible', label: 'Smelter', cost: 70, metal: 0, tier: 1, hp: 240, armor: 4, sprite: 3, time: 5, input: 'ore', output: 'alloy', description: '1 ore → 1 alloy each second. Send alloy to the depot for credits and stored metal, or directly to advanced factories.' },
  foundry: { name: 'Ram Foundry', label: 'Siege', cost: 110, metal: 6, tier: 2, hp: 310, armor: 7, sprite: 7, time: 6, input: 'alloy', description: '3 alloy → 1 siege ram every 23 seconds. Armor-piercing artillery outranges flak. Uses 3 command capacity.' },
  aegis: { name: 'Aegis Bay', label: 'Shields', cost: 85, metal: 4, tier: 2, hp: 260, armor: 5, sprite: 6, time: 5, input: 'alloy', description: '2 alloy → 1 shield drone every 21 seconds. Heals nearby allies and reduces incoming damage. Uses 2 command capacity.' },
};
export const BASIC: BuildKind[] = ['kennel', 'flak', 'lab', 'smelter'];
export const ADVANCED: BuildKind[] = ['foundry', 'aegis'];
export const TECHS: Record<Tech, { name: string; cost: number; description: string }> = {
  industry: { name: 'Heavy industry', cost: 18, description: 'Unlock siege rams and shield drones. Command capacity rises from 8 to 12.' },
  logistics: { name: 'High-speed logistics', cost: 22, description: 'Mine belt throughput rises from 3 to 5 ore/sec. Belts run 50% faster; keepers carry 12 ore.' },
  command: { name: 'Expanded command', cost: 34, description: 'Requires Heavy Industry. Raise command capacity to 18 for combined armies.' },
  resilience: { name: 'Reinforced foundations', cost: 25, description: 'Factories and core gain 25% maximum health. Repairs restore them to full strength.' },
};
export type Building = Point & { id: number; side: Side; kind: Kind; slot: number; hp: number; maxHp: number; progress: number; level: number; timer: number; input: number; output: number; cycle: number; lastHit: number; wreck: boolean; status: string; cursor: number };
export type Belt = { id: number; side: Side; from: number; to: number; product: Product; cost: number; sent: number; blocked: boolean };
export type Packet = { id: number; belt: number; progress: number; product: Product };
export type Keeper = Point & { id: number; side: Side; cargo: number; task: 'collect' | 'deliver' | 'build'; work: number; distance: number; target: number | null };
export type Unit = Point & { id: number; side: Side; kind: UnitKind; hp: number; maxHp: number; armor: number; cooldown: number; healTimer: number; slow: number; distance: number };
export type Effect = Point & { id: number; type: 'text' | 'ring' | 'shot'; color: string; text?: string; target?: Point; radius: number; life: number; total: number };
export type Economy = { credits: number; alloy: number; research: number; tech: Tech[]; keepers: number; pulse: number; deposited: number; earned: number; destroyed: number; recent: { time: number; amount: number }[] };
export type State = { version: 1; phase: 'ready' | 'playing' | 'paused' | 'won' | 'lost' | 'draw'; elapsed: number; difficulty: 'calm' | 'standard' | 'expert'; sides: Record<Side, Economy>; buildings: Building[]; belts: Belt[]; packets: Packet[]; keepers: Keeper[]; units: Unit[]; effects: Effect[]; nextId: number; aiTimer: number; aiStage: number; toast: string; toastTime: number; sound: number; seed: number };
export const opposite = (side: Side): Side => side === 'you' ? 'rival' : 'you';
export const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
export const rotate = (p: Point): Point => ({ x: WIDTH - p.x, y: HEIGHT - p.y });
export const mine = (s: State, side: Side) => s.buildings.find(b => b.side === side && b.kind === 'mine')!;
export const depot = (s: State, side: Side) => s.buildings.find(b => b.side === side && b.kind === 'depot')!;
export const core = (s: State, side: Side) => s.buildings.find(b => b.side === side && b.kind === 'core')!;
export function slotPoint(slot: number, side: Side = 'you'): Point { const p = { x: 47.5 + slot % 6 * 65, y: 389 + Math.floor(slot / 6) * 53 }; return side === 'you' ? p : rotate(p); }
export function pointSlot(p: Point) { let best: number | null = null, d = 31; for (let i = 0; i < 24; i++) { const n = dist(p, slotPoint(i)); if (n < d) { best = i; d = n; } } return best; }
export function port(b: Building, output: boolean): Point { const sign = b.side === 'you' ? 1 : -1; return { x: b.x + (output ? 21 : -21) * sign, y: b.y + 12 * sign }; }
export function beltPath(s: State, belt: Pick<Belt, 'from' | 'to'>): Point[] {
  const a = s.buildings.find(b => b.id === belt.from)!, b = s.buildings.find(b => b.id === belt.to)!;
  const start = port(a, true), end = port(b, false), sign = a.side === 'you' ? 1 : -1;
  if (a.kind === 'mine' && b.kind === 'depot') { const rear = a.side === 'you' ? 660 : 20; return [start, { x: start.x, y: rear }, { x: end.x, y: rear }, end]; }
  if (Math.abs(start.y - end.y) < 5 && (end.x - start.x) * sign > 0) return [start, end];
  const mid = (start.x + end.x) / 2;
  return [start, { x: mid, y: start.y }, { x: mid, y: end.y }, end];
}
export function pathLength(points: Point[]) { return points.slice(1).reduce((sum, p, i) => sum + dist(points[i], p), 0); }
export function pathPoint(points: Point[], t: number): Point { let left = t * pathLength(points); for (let i = 1; i < points.length; i++) { const length = dist(points[i - 1], points[i]); if (left <= length || i === points.length - 1) { const f = length ? Math.min(1, left / length) : 0; return { x: points[i - 1].x + (points[i].x - points[i - 1].x) * f, y: points[i - 1].y + (points[i].y - points[i - 1].y) * f }; } left -= length; } return points[0]; }
const economy = (): Economy => ({ credits: 250, alloy: 0, research: 0, tech: [], keepers: 1, pulse: 0, deposited: 0, earned: 0, destroyed: 0, recent: [] });
export function makeState(difficulty: State['difficulty'] = 'standard'): State {
  const s: State = { version: 1, phase: 'ready', elapsed: 0, difficulty, sides: { you: economy(), rival: economy() }, buildings: [], belts: [], packets: [], keepers: [], units: [], effects: [], nextId: 1, aiTimer: 7, aiStage: 0, toast: 'Start with a belt: orange output on your mine → blue input on your depot.', toastTime: 10, sound: 0, seed: 144 };
  for (const side of ['you', 'rival'] as Side[]) {
    for (const [kind, p] of [['mine', { x: 42, y: 614 }], ['depot', { x: 378, y: 614 }], ['core', { x: 210, y: 623 }]] as [Kind, Point][]) {
      const d = DEFS[kind]; s.buildings.push({ id: s.nextId++, side, kind, ...(side === 'you' ? p : rotate(p)), slot: -1, hp: d.hp, maxHp: d.hp, progress: 1, level: 1, timer: 0, input: 0, output: 0, cycle: 0, lastHit: -99, wreck: false, status: kind === 'mine' ? '∞ ORE' : kind === 'depot' ? 'RECEIVING' : 'ARMORED', cursor: 0 });
    }
    s.keepers.push({ id: s.nextId++, side, ...(side === 'you' ? { x: 92, y: 647 } : rotate({ x: 92, y: 647 })), cargo: 0, task: 'collect', work: 0, distance: 0, target: null });
  }
  return s;
}
export function notify(s: State, message: string) { s.toast = message; s.toastTime = 5; }
export function effect(s: State, p: Point, type: Effect['type'], color: string, text?: string, target?: Point, radius = 40) { if (s.effects.length > 95) s.effects.shift(); const life = type === 'text' ? 1.25 : .55; s.effects.push({ ...p, id: s.nextId++, type, color, text, target: target && { ...target }, radius, life, total: life }); }
export function capacity(s: State, side: Side) { const tech = s.sides[side].tech; return tech.includes('command') ? 18 : tech.includes('industry') ? 12 : 8; }
export const unitCost = (kind: UnitKind) => kind === 'wolf' ? 1 : kind === 'ram' ? 3 : 2;
export function used(s: State, side: Side) { return s.units.filter(u => u.side === side && u.hp > 0).reduce((n, u) => n + unitCost(u.kind), 0); }
export function income(s: State, side: Side) { return s.sides[side].recent.reduce((n, t) => n + t.amount, 0) / Math.min(15, Math.max(1, s.elapsed)); }
export function canBuild(s: State, kind: BuildKind, slot: number, side: Side = 'you') { const k = s.sides[side], d = DEFS[kind]; return slot >= 0 && slot < 24 && !s.buildings.some(b => b.side === side && b.slot === slot) && k.credits >= d.cost && k.alloy >= d.metal && (d.tier === 1 || k.tech.includes('industry')); }
export function build(s: State, kind: BuildKind, slot: number, side: Side = 'you') {
  if (s.phase !== 'playing' || !canBuild(s, kind, slot, side)) return false;
  const d = DEFS[kind], k = s.sides[side]; k.credits -= d.cost; k.alloy -= d.metal;
  const hp = d.hp * (k.tech.includes('resilience') ? 1.25 : 1);
  s.buildings.push({ id: s.nextId++, side, kind, slot, ...slotPoint(slot, side), hp, maxHp: hp, progress: 0, level: 1, timer: 0, input: 0, output: 0, cycle: 0, lastHit: -99, wreck: false, status: 'QUEUED', cursor: 0 });
  if (side === 'you') { notify(s, `${d.name} queued. Your keeper will build it.`); s.sound++; } return true;
}
export function connectionError(s: State, from: number, to: number, side: Side = 'you'): string | null {
  const a = s.buildings.find(b => b.id === from), b = s.buildings.find(b => b.id === to);
  if (!a || !b || a.side !== side || b.side !== side || from === to) return 'Connect two different machines in your own realm.';
  const product = DEFS[a.kind].output;
  if (!product) return 'Start at an orange output port.';
  if (!DEFS[b.kind].input) return 'That machine has no conveyor input.';
  if (b.kind !== 'depot' && DEFS[b.kind].input !== product) return `This machine needs ${DEFS[b.kind].input}, not ${product}.`;
  if (s.belts.some(l => l.from === from && l.to === to)) return 'Those ports are already connected.';
  return null;
}
export function beltCost(s: State, from: number, to: number) { return 12 + Math.ceil(pathLength(beltPath(s, { from, to })) / 45) * 2; }
export function connect(s: State, from: number, to: number, side: Side = 'you') {
  if (s.phase !== 'playing' || connectionError(s, from, to, side)) return false;
  const cost = beltCost(s, from, to), k = s.sides[side]; if (k.credits < cost) return false;
  k.credits -= cost; const a = s.buildings.find(b => b.id === from)!;
  s.belts.push({ id: s.nextId++, side, from, to, cost, product: DEFS[a.kind].output!, sent: 0, blocked: false });
  if (side === 'you') { notify(s, 'Conveyor online. Shared outputs split their flow automatically.'); s.sound++; } return true;
}
export function disconnect(s: State, id: number, side: Side = 'you') { const l = s.belts.find(l => l.id === id && l.side === side); if (!l || s.phase !== 'playing') return false; s.sides[side].credits += Math.floor(l.cost * .75); s.belts = s.belts.filter(b => b !== l); s.packets = s.packets.filter(p => p.belt !== id); if (side === 'you') notify(s, 'Conveyor reclaimed. 75% of its cost returned.'); return true; }
export function hire(s: State, side: Side = 'you') { const k = s.sides[side], cost = 55 + (k.keepers - 1) * 30; if (s.phase !== 'playing' || k.keepers >= 3 || k.credits < cost) return false; k.credits -= cost; k.keepers++; const p = side === 'you' ? { x: 345, y: 650 } : rotate({ x: 345, y: 650 }); s.keepers.push({ id: s.nextId++, side, ...p, cargo: 0, work: 0, distance: 0, task: 'collect', target: null }); return true; }
export function research(s: State, tech: Tech, side: Side = 'you') { const k = s.sides[side]; if (s.phase !== 'playing' || k.tech.includes(tech) || k.research < TECHS[tech].cost || (tech === 'command' && !k.tech.includes('industry'))) return false; k.research -= TECHS[tech].cost; k.tech.push(tech); if (tech === 'resilience') for (const b of s.buildings.filter(b => b.side === side && !['mine', 'depot'].includes(b.kind))) { const delta = b.maxHp * .25; b.maxHp += delta; if (!b.wreck) b.hp += delta; } if (side === 'you') { notify(s, `${TECHS[tech].name} online.`); s.sound++; } return true; }
export function rebuild(s: State, id: number, side: Side = 'you') { const b = s.buildings.find(b => b.id === id && b.side === side); if (s.phase !== 'playing' || !b?.wreck) return false; const cost = Math.ceil(DEFS[b.kind].cost * .4); if (s.sides[side].credits < cost) return false; s.sides[side].credits -= cost; b.wreck = false; b.hp = b.maxHp; b.progress = 0; b.timer = 0; b.input = 0; b.output = 0; if (side === 'you') notify(s, 'Rebuild queued at 40% cost. Conveyor connections retained.'); return true; }
export function upgrade(s: State, id: number) { const b = s.buildings.find(b => b.id === id && b.side === 'you'); if (s.phase !== 'playing' || !b || b.wreck || b.progress < 1 || b.slot < 0 || b.level >= 3) return false; const cost = Math.ceil(DEFS[b.kind].cost * .65 * b.level); if (s.sides.you.credits < cost) return false; s.sides.you.credits -= cost; b.level++; b.maxHp *= 1.25; b.hp = b.maxHp; notify(s, 'Machine upgraded. +25% health and faster operation.'); return true; }
export function salvage(s: State, id: number) { const b = s.buildings.find(b => b.id === id && b.side === 'you'); if (s.phase !== 'playing' || !b || b.slot < 0) return false; for (const l of s.belts.filter(l => l.from === id || l.to === id)) disconnect(s, l.id); s.sides.you.credits += Math.floor(DEFS[b.kind].cost * (b.progress < 1 ? .85 : b.wreck ? .15 : .5)); s.buildings = s.buildings.filter(a => a !== b); return true; }
function deposit(s: State, side: Side, product: Product, amount: number) { const k = s.sides[side], value = amount * (product === 'ore' ? 2 : 6); k.credits += value; k.earned += value; k.deposited += amount; if (product === 'alloy') k.alloy += amount; k.recent.push({ time: s.elapsed, amount: value }); }
export function spawn(s: State, side: Side, kind: UnitKind, p: Point) { if (used(s, side) + unitCost(kind) > capacity(s, side)) return false; const hp = kind === 'wolf' ? 74 : kind === 'ram' ? 360 : 200; s.units.push({ id: s.nextId++, side, kind, ...p, hp, maxHp: hp, armor: kind === 'wolf' ? 1 : kind === 'ram' ? 10 : 6, cooldown: .7, healTimer: 0, slow: 0, distance: 0 }); effect(s, p, 'ring', side === 'you' ? '#ffce7c' : '#f77f8d'); return true; }
function move(u: Point & { distance: number }, target: Point, speed: number, dt: number) { const d = dist(u, target); if (d < .01) return; const n = Math.min(d, speed * dt); u.x += (target.x - u.x) / d * n; u.y += (target.y - u.y) / d * n; u.distance += n; }
function keeperStep(s: State, u: Keeper, dt: number) {
  const job = s.buildings.filter(b => b.side === u.side && !b.wreck && b.progress < 1).sort((a, b) => a.id - b.id)[0];
  if (job) { u.task = 'build'; u.target = job.id; if (dist(u, job) > 30) move(u, job, 100, dt); else { job.progress = Math.min(1, job.progress + dt / DEFS[job.kind].time); job.status = 'BUILDING'; if (job.progress === 1) { effect(s, job, 'ring', '#ffc681'); if (u.side === 'you') notify(s, `${DEFS[job.kind].name} ready.${DEFS[job.kind].input ? ' Connect its input to feed it.' : ''}`); } } return; }
  const k = s.sides[u.side], cap = k.tech.includes('logistics') ? 12 : 8;
  const delivering = u.cargo >= cap, target = delivering ? depot(s, u.side) : mine(s, u.side);
  u.task = delivering ? 'deliver' : 'collect'; u.target = target.id;
  const offset = u.side === 'you' ? 29 : -29, p = { x: target.x, y: target.y + offset };
  if (dist(u, p) > 12) { move(u, p, 100, dt); u.work = 0; return; }
  u.work += dt; if (u.work >= .65) { u.work = 0; if (delivering) { deposit(s, u.side, 'ore', u.cargo); effect(s, target, 'text', '#ffd699', `+${u.cargo * 2}`); u.cargo = 0; } else u.cargo = cap; }
}
function machineStep(s: State, b: Building, dt: number) {
  if (b.wreck || b.progress < 1) return;
  const speed = 1 + (b.level - 1) * .25;
  if (b.kind === 'mine' || b.kind === 'depot') return;
  if (b.kind === 'flak' || b.kind === 'core') {
    b.timer -= dt; const range = b.kind === 'flak' ? 115 : 130;
    const enemies = s.units.filter(u => u.side !== b.side && u.hp > 0 && dist(b, u) < range).sort((a, c) => dist(a, b) - dist(c, b));
    if (enemies[0] && b.timer <= 0) { const p = enemies[0]; for (const u of enemies) if (dist(u, p) < (b.kind === 'flak' ? 44 : 27)) damage(s, u, (b.kind === 'flak' ? 32 : 28) * speed, false); effect(s, b, 'shot', '#ffd398', undefined, p); effect(s, p, 'ring', '#ffbd71', undefined, undefined, 30); b.timer = b.kind === 'flak' ? 1.5 : 1.3; }
    if (b.kind === 'core' && s.elapsed - b.lastHit > 8 && s.elapsed < 480) b.hp = Math.min(b.maxHp, b.hp + dt * 3);
    return;
  }
  const recipe = b.kind === 'lab' ? [1, 2.5] : b.kind === 'smelter' ? [1, 1.1] : b.kind === 'kennel' ? [4, 14] : b.kind === 'foundry' ? [3, 23] : [2, 21];
  const unit: UnitKind | null = b.kind === 'kennel' ? 'wolf' : b.kind === 'foundry' ? 'ram' : b.kind === 'aegis' ? 'shield' : null;
  if (b.kind === 'smelter' && b.output >= 16) { b.status = 'OUTPUT FULL'; return; }
  if (unit && used(s, b.side) + unitCost(unit) > capacity(s, b.side)) { b.status = 'ARMY FULL'; return; }
  if (b.input < recipe[0]) { b.status = 'NEEDS ' + DEFS[b.kind].input!.toUpperCase(); return; }
  b.timer += dt * speed; b.cycle = Math.min(1, b.timer / recipe[1]); b.status = 'WORKING';
  if (b.timer >= recipe[1]) { b.timer -= recipe[1]; b.input -= recipe[0]; if (b.kind === 'smelter') b.output++; else if (b.kind === 'lab') s.sides[b.side].research++; else if (unit) spawn(s, b.side, unit, { x: b.x, y: b.y + (b.side === 'you' ? -25 : 25) }); }
}
function logisticsStep(s: State, dt: number) {
  for (const b of s.buildings) {
    if (!DEFS[b.kind].output || b.wreck || b.progress < 1) continue;
    const links = s.belts.filter(l => l.from === b.id); if (!links.length) continue;
    b.cursor = Math.floor(b.cursor); b.output = Math.max(0, b.output);
    const rate = b.kind === 'mine' ? (s.sides[b.side].tech.includes('logistics') ? 5 : 3) : 4;
    // Dispatch clock is separate from processing: smelters can refine and ship concurrently.
    b.cycle = b.kind === 'mine' ? b.cycle + dt * rate : b.cycle;
    const budget = b.kind === 'mine' ? Math.floor(b.cycle) : Math.min(b.output, 1);
    for (let n = 0; n < Math.min(budget, 4); n++) {
      let chosen: Belt | undefined;
      for (let i = 0; i < links.length; i++) { const l = links[(b.cursor + i) % links.length], target = s.buildings.find(t => t.id === l.to)!; const inbound = s.packets.filter(p => s.belts.find(a => a.id === p.belt)?.to === target.id).length; l.blocked = target.wreck || target.progress < 1 || (target.kind !== 'depot' && target.input + inbound >= 20); if (!l.blocked) { chosen = l; b.cursor = (b.cursor + i + 1) % links.length; break; } }
      if (!chosen || s.packets.length >= 180) break;
      s.packets.push({ id: s.nextId++, belt: chosen.id, product: chosen.product, progress: 0 }); chosen.sent++;
      if (b.kind === 'mine') b.cycle--; else b.output--;
    }
    if (b.kind === 'mine') b.cycle = Math.min(b.cycle, 3);
  }
  for (const p of s.packets) { const l = s.belts.find(l => l.id === p.belt); if (!l) { p.progress = 2; continue; } const target = s.buildings.find(b => b.id === l.to)!; const speed = s.sides[l.side].tech.includes('logistics') ? 245 : 165; p.progress = Math.min(1, p.progress + dt * speed / Math.max(1, pathLength(beltPath(s, l)))); if (p.progress >= 1 && !target.wreck && target.progress === 1 && (target.kind === 'depot' || target.input < 20)) { if (target.kind === 'depot') deposit(s, l.side, p.product, 1); else target.input++; p.progress = 2; } }
  s.packets = s.packets.filter(p => p.progress <= 1);
}
function damage(s: State, target: Unit | Building, raw: number, piercing: boolean) {
  const building = 'slot' in target;
  const armor = building ? DEFS[target.kind].armor + (target.level - 1) : target.armor;
  let amount = Math.max(1, raw - (piercing ? armor * .2 : armor));
  if (!building && s.units.some(u => u.side === target.side && u.kind === 'shield' && u.id !== target.id && u.hp > 0 && dist(u, target) < 85)) amount *= .7;
  target.hp -= amount; if (building) target.lastHit = s.elapsed;
  if (amount >= 5) effect(s, { x: target.x, y: target.y - 17 }, 'text', '#ff9c8e', String(Math.round(amount)));
}
function unitStep(s: State, u: Unit, dt: number) {
  if (u.kind === 'shield') { u.healTimer = (u.healTimer ?? 0) - dt; if (u.healTimer <= 0) { u.healTimer = 2; let healed = false; for (const ally of s.units) if (ally.side === u.side && ally.hp > 0 && ally.hp < ally.maxHp && dist(u, ally) < 85) { ally.hp = Math.min(ally.maxHp, ally.hp + 12); healed = true; } if (healed) effect(s, u, 'ring', '#7ce9eb', undefined, undefined, 70); } }
  u.cooldown -= dt; u.slow = Math.max(0, u.slow - dt);
  const enemy = opposite(u.side);
  const enemies = s.units.filter(v => v.side === enemy && v.hp > 0).sort((a, b) => dist(a, u) - dist(b, u));
  const structures = s.buildings.filter(b => b.side === enemy && !b.wreck && b.hp > 0 && !['mine', 'depot'].includes(b.kind)).sort((a, b) => dist(a, u) - dist(b, u));
  if (!structures.length && !enemies.length) return;
  let target: Unit | Building = structures[0] ?? enemies[0];
  if (enemies[0] && dist(enemies[0], u) < (u.kind === 'ram' ? 75 : 105)) target = enemies[0];
  const range = u.kind === 'ram' ? 142 : u.kind === 'shield' ? 78 : ('slot' in target ? 31 : 24);
  if (dist(u, target) > range) {
    let p: Point = target;
    // Units enter the causeway in one of three clear lanes, preventing a single clump.
    if ((u.side === 'you' && u.y > 368 && target.y < 325) || (u.side === 'rival' && u.y < 312 && target.y > 355)) p = { x: 95 + u.id % 3 * 115, y: 340 };
    move(u, p, (u.kind === 'wolf' ? 47 : u.kind === 'ram' ? 23 : 32) * (u.slow > 0 ? .4 : 1), dt);
  } else if (u.cooldown <= 0) {
    const heavy = u.kind === 'ram', raw = heavy ? ('slot' in target ? 92 : 28) : u.kind === 'wolf' ? 11 : 7;
    damage(s, target, raw * (s.elapsed >= 480 ? 1.5 : 1), heavy);
    if (u.kind !== 'wolf') effect(s, u, 'shot', heavy ? '#ffd895' : '#97e9ec', undefined, target);
    u.cooldown = heavy ? 3 : u.kind === 'wolf' ? 1.05 : 1.6;
  }
  // Mild separation preserves readable troops without per-frame pathfinding.
  for (const v of s.units) if (v.id !== u.id && v.hp > 0) { const d = dist(u, v); if (d > .01 && d < 15) { u.x += (u.x - v.x) / d * dt * 10; u.y += (u.y - v.y) / d * dt * 10; } }
  u.x = Math.max(18, Math.min(402, u.x)); u.y = Math.max(30, Math.min(650, u.y));
}
export function emergency(s: State) { if (s.phase !== 'playing' || s.sides.you.pulse > 0) return false; s.sides.you.pulse = 38; for (const b of s.buildings) if (b.side === 'you' && !b.wreck && b.kind !== 'mine' && b.kind !== 'depot') b.hp = Math.min(b.maxHp, b.hp + 95); for (const u of s.units) if (u.y > 350) { if (u.side === 'rival') { damage(s, u, 38, true); u.slow = 6; } else u.hp = Math.min(u.maxHp, u.hp + 55); } effect(s, { x: 210, y: 500 }, 'ring', '#8de9ee', undefined, undefined, 220); notify(s, 'Emergency grid: repairs, healing, and 6 seconds of enemy slowdown.'); s.sound++; return true; }
function ai(s: State) {
  s.aiTimer = s.difficulty === 'calm' ? 8 : s.difficulty === 'expert' ? 2.8 : 4.5;
  const side: Side = 'rival', k = s.sides.rival;
  for (const tech of ['industry', 'logistics', 'command', 'resilience'] as Tech[]) if (research(s, tech, side)) break;
  const wreck = s.buildings.find(b => b.side === side && b.wreck); if (wreck && rebuild(s, wreck.id, side)) return;
  if (!s.belts.some(l => l.side === side && l.to === depot(s, side).id)) { connect(s, mine(s, side).id, depot(s, side).id, side); return; }
  // Complete all viable feeds before adding another factory.
  for (const b of s.buildings.filter(b => b.side === side && b.slot >= 0 && !b.wreck)) {
    if (DEFS[b.kind].input && !s.belts.some(l => l.to === b.id)) { const src = DEFS[b.kind].input === 'ore' ? mine(s, side) : s.buildings.find(a => a.side === side && a.kind === 'smelter' && !a.wreck); if (src && connect(s, src.id, b.id, side)) return; }
    if (b.kind === 'smelter' && !s.belts.some(l => l.from === b.id && l.to === depot(s, side).id)) { if (connect(s, b.id, depot(s, side).id, side)) return; }
  }
  const plan: BuildKind[] = ['flak', 'kennel', 'lab', 'smelter', 'foundry', 'flak', 'smelter', 'aegis', 'foundry', 'lab', 'flak', 'foundry'];
  const kind = plan[Math.min(s.aiStage, plan.length - 1)];
  const slots = kind === 'flak' ? [1, 4, 0, 5, 7, 10] : kind === 'lab' ? [19, 22, 20, 21] : kind === 'smelter' ? [18, 23, 12, 17] : [7, 10, 13, 16, 6, 11, 8, 9, 14, 15];
  for (const slot of slots) if (build(s, kind, slot, side)) { s.aiStage++; return; }
  if (s.aiStage > 4 && k.keepers < 2 && k.credits > 180) hire(s, side);
}
export function tick(s: State, dt: number) {
  if (s.phase !== 'playing') return; dt = Math.min(.1, dt); s.elapsed += dt; s.aiTimer -= dt; s.toastTime = Math.max(0, s.toastTime - dt);
  for (const side of ['you', 'rival'] as Side[]) { s.sides[side].pulse = Math.max(0, s.sides[side].pulse - dt); s.sides[side].recent = s.sides[side].recent.filter(t => s.elapsed - t.time < 15); }
  for (const u of s.keepers) keeperStep(s, u, dt);
  logisticsStep(s, dt);
  for (const b of s.buildings) machineStep(s, b, dt);
  for (const u of s.units) if (u.hp > 0) unitStep(s, u, dt);
  for (const u of s.units) if (u.hp <= 0) { s.sides[opposite(u.side)].destroyed++; effect(s, u, 'ring', '#eeb17c'); }
  s.units = s.units.filter(u => u.hp > 0);
  for (const b of s.buildings) if (b.hp <= 0 && b.slot >= 0 && !b.wreck) { b.wreck = true; b.status = 'REBUILD'; b.input = 0; b.output = 0; s.sides[opposite(b.side)].destroyed++; effect(s, b, 'ring', '#ee886c', undefined, undefined, 65); if (b.side === 'you') notify(s, 'Factory damaged. Your rear economy is safe. Tap the wreck to rebuild for 40%.'); }
  if (s.elapsed >= 480) { core(s, 'you').hp -= dt * 4; core(s, 'rival').hp -= dt * 4; }
  const a = core(s, 'you').hp <= 0, b = core(s, 'rival').hp <= 0;
  if (a && b) s.phase = 'draw'; else if (a) s.phase = 'lost'; else if (b) s.phase = 'won';
  if (s.aiTimer <= 0 && s.phase === 'playing') ai(s);
  s.effects.forEach(e => e.life -= dt); s.effects = s.effects.filter(e => e.life > 0);
}
export function serialize(s: State) { return JSON.stringify({ ...s, phase: s.phase === 'playing' ? 'paused' : s.phase, effects: [] }); }
export function restore(raw: string): State | null { try { const s = JSON.parse(raw) as State; if (s.version !== 1 || !['playing', 'paused'].includes(s.phase) || !Array.isArray(s.belts) || !Array.isArray(s.keepers) || !s.sides?.you || !s.buildings?.some(b => b.kind === 'core' && b.side === 'you') || !s.buildings?.some(b => b.kind === 'core' && b.side === 'rival')) return null; s.phase = 'paused'; s.effects = []; return s; } catch { return null; } }
