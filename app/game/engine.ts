export type Side = 'player' | 'enemy';
export type Kind = 'portal' | 'spire' | 'study' | 'depot' | 'wall' | 'forge' | 'roost' | 'grove';
export type Difficulty = 'gentle' | 'standard' | 'fierce';
export type Point = { x: number; y: number };
export type Definition = { name: string; short: string; cost: number; hp: number; time: number; sprite: number; age: number; role: string; description: string };
export const W = 420, H = 640;
export const DEFS: Record<Kind, Definition> = {
  portal: { name: 'Moonwell', short: 'Summon', cost: 65, hp: 180, time: 5, sprite: 1, age: 1, role: 'ATTACK', description: 'Summons a spirit wolf every 10 seconds. Build more wells to grow your army.' },
  spire: { name: 'Thornspire', short: 'Defend', cost: 55, hp: 230, time: 4, sprite: 2, age: 1, role: 'DEFENSE', description: 'Fires piercing crystal bolts at nearby enemies. Covers a 140-step radius.' },
  study: { name: 'Star Archive', short: 'Research', cost: 70, hp: 155, time: 5, sprite: 3, age: 1, role: 'KNOWLEDGE', description: 'Generates 1 knowledge each second. Research changes your whole kingdom.' },
  depot: { name: 'Waystation', short: 'Gather', cost: 45, hp: 170, time: 3, sprite: 4, age: 1, role: 'ECONOMY', description: 'Keepers deliver to the nearest waystation. A forward depot makes every trip shorter.' },
  wall: { name: 'Runestone', short: 'Block', cost: 25, hp: 420, time: 2, sprite: 5, age: 1, role: 'DEFENSE', description: 'Draws nearby enemy attacks. Protect your fragile archives and summoners.' },
  forge: { name: 'Titan Forge', short: 'Titans', cost: 135, hp: 260, time: 7, sprite: 6, age: 2, role: 'SIEGE', description: 'Summons a stone titan every 19 seconds. Slow, armored, and devastating to buildings.' },
  roost: { name: 'Wisp Lantern', short: 'Wisps', cost: 95, hp: 160, time: 5, sprite: 10, age: 2, role: 'RANGED', description: 'Summons a ranged wisp every 12 seconds. Keep them behind your wolves.' },
  grove: { name: 'Mending Grove', short: 'Mend', cost: 90, hp: 190, time: 5, sprite: 7, age: 2, role: 'SUPPORT', description: 'Heals friendly creatures and completed buildings in a 135-step radius.' },
};
export const FOUNDATIONS: Kind[] = ['portal', 'spire', 'study', 'depot', 'wall'];
export const EVOLVED: Kind[] = ['forge', 'roost', 'grove'];
export const RESEARCH = {
  age: { name: 'Awaken the rift', cost: 45, description: 'Unlock titans, ranged wisps, and healing groves.', icon: '✧' },
  harvest: { name: 'Bottomless satchels', cost: 30, description: 'Keepers carry 40 crystals instead of 25.', icon: '◇' },
  fury: { name: 'Wild covenant', cost: 40, description: 'Your creatures and towers deal 30% more damage.', icon: '↟' },
  haste: { name: 'Quickened spirits', cost: 50, description: 'Summoners produce creatures 25% faster.', icon: '»' },
} as const;
export type Tech = keyof typeof RESEARCH;
export type Structure = Point & { id: number; side: Side; kind: Kind | 'core'; slot: number; hp: number; maxHp: number; progress: number; level: number; cooldown: number };
export type Unit = Point & { id: number; side: Side; kind: 'keeper' | 'wolf' | 'wisp' | 'titan'; hp: number; maxHp: number; damage: number; speed: number; cooldown: number; carry: number; work: number; target: number | null; action: string; slow: number; command: Point | null; commandTime: number; preferred: number | null; distance: number };
export type Node = Point & { id: number; amount: number; regen: number };
export type Effect = Point & { id: number; kind: 'hit' | 'text' | 'ring' | 'bolt' | 'spawn'; color: string; life: number; total: number; text?: string; to?: Point; radius?: number };
export type Kingdom = { crystals: number; knowledge: number; age: number; techs: Tech[]; respawns: number[]; hired: number; pulse: number; gathered: number; destroyed: number };
export type State = { version: 1; time: number; phase: 'ready' | 'playing' | 'paused' | 'won' | 'lost'; difficulty: Difficulty; sides: Record<Side, Kingdom>; buildings: Structure[]; units: Unit[]; nodes: Node[]; effects: Effect[]; nextId: number; aiTimer: number; aiStep: number; toast: string; toastTime: number; selected: number | null; seed: number; tutorial: number; soundEvent: number; bloomNotified: number };
const other = (s: Side): Side => s === 'player' ? 'enemy' : 'player';
export const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
export function slotPoint(side: Side, slot: number): Point { const y = 388 + Math.floor(slot / 6) * 55; return { x: 47.5 + slot % 6 * 65, y: side === 'player' ? y : H - y }; }
export function pointSlot(p: Point, side: Side = 'player'): number | null { let closest: number | null = null, d = 34; for (let i = 0; i < 24; i++) { const dd = distance(p, slotPoint(side, i)); if (dd < d) { closest = i; d = dd; } } return closest; }
export function core(s: State, side: Side) { return s.buildings.find(b => b.side === side && b.kind === 'core')!; }
export function random(s: State) { s.seed = (Math.imul(s.seed, 1664525) + 1013904223) >>> 0; return s.seed / 4294967296; }
function kingdom(): Kingdom { return { crystals: 145, knowledge: 0, age: 1, techs: [], respawns: [], hired: 1, pulse: 0, gathered: 0, destroyed: 0 }; }
export function createState(difficulty: Difficulty = 'standard', seed = 417): State {
  const s: State = { version: 1, time: 0, phase: 'ready', difficulty, sides: { player: kingdom(), enemy: kingdom() }, buildings: [], units: [], nodes: [], effects: [], nextId: 1, aiTimer: 5, aiStep: 0, toast: 'Drag a Moonwell onto your half to summon your first wolf.', toastTime: 7, selected: null, seed, tutorial: 0, soundEvent: 0, bloomNotified: 0 };
  for (const side of ['player','enemy'] as Side[]) {
    const b: Structure = { id: s.nextId++, side, kind: 'core', slot: -1, x: 210, y: side === 'player' ? 603 : 37, hp: 900, maxHp: 900, progress: 1, level: 1, cooldown: 0 };
    s.buildings.push(b); spawn(s, side, 'keeper', { x: 173, y: side === 'player' ? 570 : 70 });
  }
  [61, 135, 210, 285, 359].forEach((x,i) => s.nodes.push({ id: s.nextId++, x, y: 320 + (i % 2 ? -8 : 8), amount: 100, regen: 0 }));
  return s;
}
export function notify(s: State, text: string) { s.toast = text; s.toastTime = 4; }
export function fx(s: State, p: Point, kind: Effect['kind'], color: string, text?: string, to?: Point, radius?: number) { if (s.effects.length >= 110) s.effects.shift(); s.effects.push({ ...p, id: s.nextId++, kind, color, text, to: to && { ...to }, radius, life: kind === 'text' ? 1.25 : kind === 'ring' ? .7 : .32, total: kind === 'text' ? 1.25 : kind === 'ring' ? .7 : .32 }); }
export function canPlace(s: State, kind: Kind, slot: number, side: Side = 'player') { return slot >= 0 && slot < 24 && s.sides[side].age >= DEFS[kind].age && !s.buildings.some(b => b.side === side && b.slot === slot) && s.sides[side].crystals >= DEFS[kind].cost; }
export function place(s: State, kind: Kind, slot: number, side: Side = 'player'): boolean {
  if (s.phase !== 'playing' || !canPlace(s, kind, slot, side)) return false;
  const d = DEFS[kind]; s.sides[side].crystals -= d.cost;
  const b: Structure = { id: s.nextId++, side, kind, slot, ...slotPoint(side, slot), hp: d.hp, maxHp: d.hp, progress: 0, level: 1, cooldown: kind === 'forge' ? 8 : 4 };
  s.buildings.push(b); fx(s, b, 'ring', side === 'player' ? '#86ffcb' : '#ff7785');
  if (side === 'player') { notify(s, `${d.name} queued. Your keeper is on the way.`); s.soundEvent++; s.tutorial = Math.max(1, s.tutorial); }
  return true;
}
export function spawn(s: State, side: Side, kind: Unit['kind'], at: Point) {
  if (s.units.filter(u => u.side === side && u.kind !== 'keeper').length >= 28 && kind !== 'keeper') return;
  const stat = kind === 'keeper' ? [95, 0, 64] : kind === 'wolf' ? [82, 13, 43] : kind === 'wisp' ? [54, 12, 35] : [275, 30, 24];
  s.units.push({ id: s.nextId++, ...at, side, kind, hp: stat[0], maxHp: stat[0], damage: stat[1], speed: stat[2], cooldown: .4, carry: 0, work: 0, target: null, action: kind === 'keeper' ? 'Gathering' : 'Advancing', slow: 0, command: null, commandTime: 0, preferred: null, distance: 0 });
  fx(s, at, 'spawn', side === 'player' ? '#7fffc8' : '#ff6b89');
}
export function hire(s: State, side: Side = 'player'): boolean {
  const k = s.sides[side], cost = 60 + (k.hired - 1) * 25;
  if (s.phase !== 'playing' || k.hired >= 4 || k.crystals < cost) return false;
  k.crystals -= cost; k.hired++; spawn(s, side, 'keeper', { x: core(s,side).x + 35, y: core(s,side).y + (side === 'player' ? -27 : 27) });
  if (side === 'player') notify(s, 'A new keeper joins. More hands, more crystals.'); return true;
}
export function research(s: State, tech: Tech, side: Side = 'player'): boolean {
  const k = s.sides[side]; if (s.phase !== 'playing' || k.techs.includes(tech) || k.knowledge < RESEARCH[tech].cost) return false;
  k.knowledge -= RESEARCH[tech].cost; k.techs.push(tech); if (tech === 'age') k.age = 2;
  if (side === 'player') { notify(s, tech === 'age' ? 'THE RIFT AWAKENS. New blueprints unlocked.' : `${RESEARCH[tech].name} researched.`); s.soundEvent++; }
  fx(s, core(s, side), 'ring', '#c7a0ff', undefined, undefined, 140); return true;
}
export function upgrade(s: State, id: number): boolean {
  const b = s.buildings.find(b => b.id === id), k = s.sides.player;
  if (!b || s.phase !== 'playing' || b.side !== 'player' || b.kind === 'core' || b.progress < 1 || b.level >= 3) return false;
  const cost = Math.ceil(DEFS[b.kind].cost * .75 * b.level); if (k.crystals < cost) return false;
  k.crystals -= cost; b.level++; b.maxHp = Math.round(b.maxHp * 1.4); b.hp = b.maxHp; fx(s, b, 'ring', '#ffdc94'); notify(s, `Level ${b.level}. Stronger, faster, fully restored.`); return true;
}
export function salvage(s: State, id: number) { const b = s.buildings.find(b => b.id === id); if (!b || b.side !== 'player' || b.kind === 'core' || s.phase !== 'playing') return false; const refund = Math.floor(DEFS[b.kind].cost * (b.progress < 1 ? .85 : .5)); s.sides.player.crystals += refund; s.buildings = s.buildings.filter(x => x !== b); s.selected = null; notify(s, `Reclaimed ${refund} crystals.`); return true; }
export function pulse(s: State) {
  if (s.phase !== 'playing' || s.sides.player.pulse > 0) return false;
  const keepers = s.units.filter(u => u.side === 'player' && u.kind === 'keeper'); const c = keepers[0] ?? core(s,'player');
  s.sides.player.pulse = 25; fx(s,c,'ring','#adf9df',undefined,undefined,130);
  for (const u of s.units) if (distance(u,c) < 130) { if (u.side === 'enemy') { hit(s,u,42); u.slow = 5; } else u.hp = Math.min(u.maxHp,u.hp+40); }
  notify(s,'Rift pulse: enemies shattered, allies restored.'); s.soundEvent++; return true;
}
export function command(s: State, point: Point) {
  if (s.phase !== 'playing') return;
  const node = s.nodes.find(n=>distance(n,point)<35);
  const keeper = s.units.filter(u=>u.side==='player'&&u.kind==='keeper').sort((a,b)=>distance(a,point)-distance(b,point))[0];
  if (!keeper) { notify(s,'Your keeper is returning to the sanctum.'); return; }
  keeper.preferred=node?.id ?? null; keeper.command=node ? null : {x: Math.max(20,Math.min(400,point.x)),y:Math.max(280,Math.min(615,point.y))}; keeper.commandTime=4; keeper.target=null; keeper.work=0;
  fx(s, point, 'ring', '#e4d092'); notify(s,node?'Keeper assigned to this crystal seam.':'Keeper moving. Gathering resumes in a moment.');
}
function hit(s: State, target: Unit | Structure, amount: number) { target.hp -= amount; fx(s,target,'hit','#fff6d5'); if (amount >= 10) fx(s,{x:target.x,y:target.y-16},'text','#ff9ca4',String(Math.round(amount))); }
function move(s: State, u: Unit, p: Point, dt: number, ignore?: number) {
  const dx=p.x-u.x,dy=p.y-u.y,len=Math.hypot(dx,dy); if(len<1) return;
  let vx=dx/len,vy=dy/len;
  for(const b of s.buildings) { if(b.id===ignore || b.kind==='core') continue; const d=distance(u,b); if(d<35 && d>0.01) { const dot=(b.x-u.x)*vx+(b.y-u.y)*vy; if(dot>0) { const cross=vx*(b.y-u.y)-vy*(b.x-u.x); const sign=cross>=0?-1:1; vx+=(-dy/len)*sign*(35-d)/18; vy+=(dx/len)*sign*(35-d)/18; } } }
  for(const v of s.units) { if(v.id===u.id) continue; const d=distance(u,v); if(d<13 && d>.01) {vx+=(u.x-v.x)/d*(13-d)/20;vy+=(u.y-v.y)/d*(13-d)/20;} }
  const mag=Math.hypot(vx,vy)||1, step=Math.min(len,u.speed*(u.slow>0?.5:1)*dt); u.x=Math.max(15,Math.min(W-15,u.x+vx/mag*step));u.y=Math.max(22,Math.min(H-22,u.y+vy/mag*step));u.distance+=step;
}
function keeperStep(s: State, u: Unit, dt: number) {
  const k=s.sides[u.side];
  if(u.command && u.commandTime>0) {u.commandTime-=dt;u.action='Moving';move(s,u,u.command,dt);if(u.commandTime<=0)u.command=null;return;}
  const job=s.buildings.filter(b=>b.side===u.side&&b.progress<1).sort((a,b)=>a.id-b.id)[0];
  if(job) {u.action='Building';u.target=job.id;if(distance(u,job)>31)move(s,u,job,dt,job.id);else {job.progress=Math.min(1,job.progress+dt/DEFS[job.kind as Kind].time);if(job.progress>=1){fx(s,job,'ring','#d5edb1');if(u.side==='player'){notify(s,`${DEFS[job.kind as Kind].name} is ready.`);s.soundEvent++;}}}return;}
  const capacity=k.techs.includes('harvest')?40:25;
  if(u.carry>=capacity || (u.carry>0 && !s.nodes.some(n=>n.amount>0))) {
    const depot=s.buildings.filter(b=>b.side===u.side&&b.progress===1&&(b.kind==='core'||b.kind==='depot')).sort((a,b)=>distance(a,u)-distance(b,u))[0];
    u.action='Hauling';u.target=depot.id;if(distance(u,depot)>32)move(s,u,depot,dt,depot.id);else {k.crystals+=u.carry;k.gathered+=u.carry;fx(s,{x:depot.x,y:depot.y-23},'text','#a6ffd1',`+${u.carry}`);u.carry=0;u.target=null;}return;
  }
  let node=s.nodes.find(n=>n.id===u.target&&n.amount>0);
  if(!node) {const preferred=s.nodes.find(n=>n.id===u.preferred&&n.amount>0);node=preferred??s.nodes.filter(n=>n.amount>0).sort((a,b)=>distance(a,u)-distance(b,u))[0];u.target=node?.id??null;u.work=0;}
  u.action='Gathering';if(!node)return;if(distance(u,node)>22){move(s,u,node,dt);return;}
  u.work+=dt;if(u.work>=.45){u.work-=.45;const amount=Math.min(capacity-u.carry,node.amount,isBloom(s)?10:5);u.carry+=amount;node.amount-=amount;if(node.amount<=0)node.regen=6;fx(s,node,'spawn','#7cf5c5');if(u.carry>=capacity)u.target=null;}
}
function combatStep(s: State,u: Unit,dt: number) {
  const enemies=s.units.filter(v=>v.side!==u.side&&v.hp>0), near=enemies.filter(v=>v.kind!=='keeper'||distance(v,u)<70).sort((a,b)=>distance(a,u)-distance(b,u));
  const structures=s.buildings.filter(b=>b.side!==u.side&&b.hp>0).sort((a,b)=>distance(a,u)-distance(b,u));
  let target: Unit|Structure|undefined = near[0] && distance(near[0],u)<(u.kind==='wisp'?135:100)?near[0]:structures[0];
  const wall=structures.find(b=>b.kind==='wall'&&distance(b,u)<70);if(wall)target=wall;if(!target)return;
  const range=u.kind==='wisp'?98:('kind' in target&&target.kind==='core'?37:29);
  if(distance(u,target)>range){u.action='Advancing';move(s,u,target,dt,target.id);return;}
  u.action='Attacking';if(u.cooldown<=0){let dmg=u.damage*(s.sides[u.side].techs.includes('fury')?1.3:1);if(u.kind==='titan'&&'slot'in target)dmg*=2;hit(s,target,dmg);u.cooldown=u.kind==='titan'?1.5:u.kind==='wisp'?1.25:.95;if(u.kind==='wisp')fx(s,u,'bolt',u.side==='player'?'#a8ffe3':'#ff769f',undefined,target);}
}
function buildingStep(s:State,b:Structure,dt:number){
  if(b.progress<1)return;const k=s.sides[b.side];b.cooldown-=dt;
  if(b.kind==='study')k.knowledge+=dt*(1+(b.level-1)*.5);
  if(b.kind==='portal'||b.kind==='forge'||b.kind==='roost'){if(b.cooldown<=0){spawn(s,b.side,b.kind==='portal'?'wolf':b.kind==='forge'?'titan':'wisp',{x:b.x+(random(s)-.5)*16,y:b.y+(b.side==='player'?-25:25)});const base=b.kind==='portal'?10:b.kind==='forge'?19:12;b.cooldown=base/(1+(b.level-1)*.2)/(k.techs.includes('haste')?1.333:1);}}
  if(b.kind==='spire'||b.kind==='core'){const range=b.kind==='core'?115:140+(b.level-1)*12;const target=s.units.filter(u=>u.side!==b.side&&u.hp>0&&distance(u,b)<range).sort((a,c)=>distance(a,b)-distance(c,b))[0];if(target&&b.cooldown<=0){hit(s,target,(b.kind==='core'?11:20)*(1+(b.level-1)*.3)*(k.techs.includes('fury')?1.3:1));fx(s,{x:b.x,y:b.y-18},'bolt',b.side==='player'?'#a8ffe3':'#ff7893',undefined,target);b.cooldown=b.kind==='core'?1.2:1.1;}}
  if(b.kind==='grove'&&b.cooldown<=0){for(const target of [...s.units,...s.buildings])if(target.side===b.side&&target.hp>0&&distance(target,b)<135&&(!('progress'in target)||target.progress===1))target.hp=Math.min(target.maxHp,target.hp+6*b.level);b.cooldown=1;fx(s,b,'ring','#78dab1',undefined,undefined,100);}
}
const AI_PLAN:Kind[]=['portal','spire','study','portal','depot','portal','spire','study','portal','forge','grove','roost','spire','forge','portal','spire'];
function aiStep(s:State){
  const k=s.sides.enemy;const delay=s.difficulty==='gentle'?12:s.difficulty==='fierce'?5.5:8;s.aiTimer=delay;
  if(k.knowledge>=45&&!k.techs.includes('age'))research(s,'age','enemy');else if(k.age===2)for(const tech of ['fury','haste','harvest'] as Tech[]){if(research(s,tech,'enemy'))break;}
  if(s.time>45&&k.hired<2&&k.crystals>130)hire(s,'enemy');
  const planned=AI_PLAN[s.aiStep%AI_PLAN.length];const kind=DEFS[planned].age>k.age?'portal':planned;
  const order=kind==='depot'?[2,3,1,4]:kind==='spire'?[1,4,0,5,7,10]:kind==='study'?[19,22,20,21,18,23]:kind==='grove'?[8,9,7,10]:[7,10,6,11,13,16,12,17,8,9];
  const slot=[...order,...Array.from({length:24},(_,i)=>i)].find(n=>canPlace(s,kind,n,'enemy'));
  if(slot!==undefined&&place(s,kind,slot,'enemy'))s.aiStep++;
}
export function isBloom(s: State){return s.time>=45 && (s.time-45)%60<12;}
export function step(s:State,dt:number){
  if(s.phase!=='playing')return;dt=Math.min(dt,.1);s.time+=dt;s.toastTime=Math.max(0,s.toastTime-dt);s.aiTimer-=dt;
  const bloom=Math.floor((s.time+15)/60);if(isBloom(s)&&bloom>s.bloomNotified){s.bloomNotified=bloom;notify(s,'RIFT BLOOM · crystals gather twice as fast for 12 seconds.');fx(s,{x:210,y:320},'ring','#a8ffd6',undefined,undefined,230);}
  for(const side of ['player','enemy'] as Side[]){const k=s.sides[side];k.pulse=Math.max(0,k.pulse-dt);k.respawns=k.respawns.map(t=>t-dt);for(const t of k.respawns)if(t<=0)spawn(s,side,'keeper',{x:core(s,side).x+35,y:core(s,side).y+(side==='player'?-30:30)});k.respawns=k.respawns.filter(t=>t>0);}
  for(const n of s.nodes){if(n.amount<=0){n.regen-=dt;if(n.regen<=0)n.amount=100;}}
  for(const b of s.buildings)if(b.hp>0)buildingStep(s,b,dt);
  for(const u of s.units){if(u.hp<=0)continue;u.cooldown-=dt;u.slow=Math.max(0,u.slow-dt);if(u.kind==='keeper')keeperStep(s,u,dt);else combatStep(s,u,dt);}
  for(const u of s.units)if(u.hp<=0){fx(s,u,'ring',u.side==='player'?'#96eccb':'#ff6a82');if(u.kind==='keeper'){s.sides[u.side].respawns.push(9);if(u.side==='player')notify(s,'Keeper down. Returning from the sanctum in 9 seconds.');}else s.sides[other(u.side)].destroyed++;}
  s.units=s.units.filter(u=>u.hp>0);
  for(const b of s.buildings)if(b.hp<=0){fx(s,b,'ring','#ffc792');if(b.kind==='core'){s.phase=b.side==='player'?'lost':'won';s.selected=null;}else s.sides[other(b.side)].destroyed++;}
  s.buildings=s.buildings.filter(b=>b.hp>0||b.kind==='core');
  s.effects.forEach(e=>e.life-=dt);s.effects=s.effects.filter(e=>e.life>0);
  if(s.aiTimer<=0&&s.phase==='playing')aiStep(s);
  // End prolonged stalemates decisively while preserving a full strategy match.
  if(s.time>300){for(const side of ['player','enemy']as Side[])core(s,side).hp-=dt*(s.time>420?8:2);}
  if(core(s,'player').hp<=0)s.phase='lost';else if(core(s,'enemy').hp<=0)s.phase='won';
}
export function serialize(s: State){return JSON.stringify({...s,effects:[],phase:s.phase==='playing'?'paused':s.phase});}
export function restore(raw:string):State|null {try{const s=JSON.parse(raw) as State;if(s.version!==1||!['paused','playing'].includes(s.phase)||!Array.isArray(s.units)||!Array.isArray(s.buildings)||!s.sides?.player||!s.buildings.some(b=>b.kind==='core'&&b.side==='player')||!s.buildings.some(b=>b.kind==='core'&&b.side==='enemy'))return null;s.phase='paused';s.effects=[];s.selected=null;return s;}catch{return null;}}
