"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Side = "player" | "enemy";
type Category = "all" | "automation" | "defense" | "attack" | "support";
type MatchState = "playing" | "won" | "lost";

type Piece = {
  id: string;
  name: string;
  icon: string;
  cost: number;
  category: Exclude<Category, "all">;
  description: string;
  surprise?: boolean;
};

type Structure = {
  uid: number;
  pieceId: string;
  side: Side;
  slot: number;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  cooldown: number;
};

type Gem = { id: number; side: Side; x: number; y: number; pulse: number };
type Runner = { x: number; y: number; carrying: boolean; targetId: number | null };
type Unit = {
  id: number;
  side: Side;
  kind: string;
  icon: string;
  x: number;
  y: number;
  hp: number;
  damage: number;
  speed: number;
  role: "attacker" | "defender";
  flying?: boolean;
};
type Shot = { id: number; side: Side; kind: string; x: number; y: number; damage: number; speed: number };
type Spark = { id: number; x: number; y: number; text: string; life: number; tone: "good" | "bad" | "gem" };

type GameState = {
  hp: Record<Side, number>;
  energy: Record<Side, number>;
  runners: Record<Side, Runner>;
  gems: Gem[];
  structures: Structure[];
  units: Unit[];
  shots: Shot[];
  sparks: Spark[];
  elapsed: number;
  gemTimer: number;
  aiTimer: number;
  slashCooldown: number;
  slashFlash: number;
  match: MatchState;
  nextId: number;
  toast: string;
  toastTimer: number;
};

const PIECES: Piece[] = [
  { id: "shooter", name: "Bolt Shooter", icon: "▲", cost: 16, category: "attack", description: "Fires straight across the divide at enemy units and structures." },
  { id: "shield", name: "Shield Emitter", icon: "◒", cost: 18, category: "defense", description: "A durable energy screen that absorbs incoming fire." },
  { id: "wall", name: "Alloy Wall", icon: "▥", cost: 12, category: "defense", description: "Cheap, sturdy cover that blocks a lane." },
  { id: "spider", name: "Spider Hatchery", icon: "✣", cost: 22, category: "attack", description: "Spawns tiny, fast spiders that skitter toward the rival." },
  { id: "porter", name: "Hauler Bot", icon: "▣", cost: 20, category: "automation", description: "A slow robot that gathers loose gems for you." },
  { id: "conveyor", name: "Conveyor Belt", icon: "»", cost: 28, category: "automation", description: "Routes gems into the refinery without a carrier." },
  { id: "medbay", name: "Medbay", icon: "+", cost: 24, category: "support", description: "Restores your duelist's hit points over time." },
  { id: "wolf", name: "Razorling Den", icon: "◆", cost: 26, category: "attack", description: "Breeds hard-hitting razor beasts for lane pressure." },
  { id: "wisp", name: "Orbit Wisp", icon: "●", cost: 20, category: "defense", description: "Summons a guardian that circles home and intercepts attackers." },

  { id: "magnet", name: "Gem Magnet", icon: "∩", cost: 18, category: "automation", description: "Pulls distant gems into collection range.", surprise: true },
  { id: "press", name: "Prism Press", icon: "◇", cost: 32, category: "automation", description: "Cuts every delivered gem more efficiently for bonus charge.", surprise: true },
  { id: "burst", name: "Burst Turret", icon: "⁝", cost: 30, category: "attack", description: "Unleashes tight three-shot bursts down a lane.", surprise: true },
  { id: "laser", name: "Prism Lance", icon: "│", cost: 38, category: "attack", description: "A slow-firing beam that pierces with heavy damage.", surprise: true },
  { id: "tesla", name: "Storm Fork", icon: "ϟ", cost: 34, category: "attack", description: "Chains lightning between nearby enemy creatures.", surprise: true },
  { id: "frost", name: "Frost Lens", icon: "✦", cost: 26, category: "defense", description: "Chills enemies in your territory, slowing their advance.", surprise: true },
  { id: "firefly", name: "Firefly Roost", icon: "✧", cost: 24, category: "attack", description: "Launches flying attackers that ignore walls.", surprise: true },
  { id: "beetle", name: "Siege Beetle", icon: "⬟", cost: 36, category: "attack", description: "Produces slow armored beetles built to crush defenses.", surprise: true },
  { id: "medic", name: "Medic Drone", icon: "✚", cost: 28, category: "support", description: "Repairs the most damaged friendly structure.", surprise: true },
  { id: "golem", name: "Guardian Golem", icon: "⬢", cost: 34, category: "defense", description: "A heavy protector that stays home and swats intruders.", surprise: true },
  { id: "mine", name: "Star Mine", icon: "✹", cost: 16, category: "defense", description: "Detonates when an enemy crosses into your territory.", surprise: true },
  { id: "reflector", name: "Mirror Pylon", icon: "◩", cost: 30, category: "defense", description: "Occasionally turns an incoming shot back on its owner.", surprise: true },
  { id: "repair", name: "Mending Grove", icon: "♣", cost: 24, category: "support", description: "Slowly repairs every friendly construction.", surprise: true },
  { id: "timecoil", name: "Tempo Coil", icon: "◴", cost: 40, category: "support", description: "Accelerates friendly production and weapon cycles.", surprise: true },
  { id: "sap", name: "Siphon Bloom", icon: "♠", cost: 30, category: "support", description: "Steals a trickle of unspent charge from the rival.", surprise: true },
  { id: "vault", name: "Gem Vault", icon: "▰", cost: 22, category: "automation", description: "Banks a steady reserve of protected charge.", surprise: true },
  { id: "jackpot", name: "Chance Engine", icon: "?", cost: 26, category: "automation", description: "Rattles out unpredictable resource jackpots.", surprise: true },
  { id: "portal", name: "Rift Gate", icon: "◎", cost: 42, category: "support", description: "New attackers enter battle closer to the dividing line.", surprise: true },
  { id: "thorn", name: "Thorn Mesh", icon: "×", cost: 20, category: "defense", description: "Damages creatures each time they strike it.", surprise: true },
  { id: "decoy", name: "Decoy Idol", icon: "♙", cost: 14, category: "defense", description: "Taunts attackers away from more valuable targets.", surprise: true },
];

const PIECE_BY_ID = Object.fromEntries(PIECES.map((piece) => [piece.id, piece])) as Record<string, Piece>;
const FILTERS: { id: Category; label: string }[] = [
  { id: "all", label: "ALL" },
  { id: "automation", label: "AUTO" },
  { id: "defense", label: "DEF" },
  { id: "attack", label: "ATK" },
  { id: "support", label: "AID" },
];

function sideY(side: Side, playerY: number, enemyY: number) {
  return side === "player" ? playerY : enemyY;
}

function startingState(): GameState {
  return {
    hp: { player: 100, enemy: 100 },
    energy: { player: 42, enemy: 42 },
    runners: {
      player: { x: 12, y: 77, carrying: false, targetId: null },
      enemy: { x: 12, y: 23, carrying: false, targetId: null },
    },
    gems: [
      { id: 1, side: "player", x: 72, y: 72, pulse: 0 },
      { id: 2, side: "enemy", x: 70, y: 27, pulse: 1 },
    ],
    structures: [],
    units: [],
    shots: [],
    sparks: [],
    elapsed: 0,
    gemTimer: 1.5,
    aiTimer: 2.8,
    slashCooldown: 0,
    slashFlash: 0,
    match: "playing",
    nextId: 10,
    toast: "Tap a piece, then tap a blue build pad.",
    toastTimer: 4,
  };
}

function countPiece(state: GameState, side: Side, id: string) {
  return state.structures.filter((structure) => structure.side === side && structure.pieceId === id).length;
}

function addSpark(state: GameState, x: number, y: number, text: string, tone: Spark["tone"]) {
  state.sparks.push({ id: state.nextId++, x, y, text, life: 1.1, tone });
}

function addUnit(state: GameState, structure: Structure, kind: string, icon: string, hp: number, damage: number, speed: number, flying = false, role: Unit["role"] = "attacker") {
  const hasPortal = countPiece(state, structure.side, "portal") > 0;
  const normalY = structure.side === "player" ? structure.y - 2 : structure.y + 2;
  const portalY = structure.side === "player" ? 58 : 42;
  state.units.push({
    id: state.nextId++, side: structure.side, kind, icon, x: structure.x,
    y: hasPortal && role === "attacker" ? portalY : normalY,
    hp, damage, speed, flying, role,
  });
}

function collectGem(state: GameState, side: Side, gemId: number, x: number, y: number, automated = false) {
  const gemIndex = state.gems.findIndex((gem) => gem.id === gemId);
  if (gemIndex < 0) return false;
  state.gems.splice(gemIndex, 1);
  const value = 5 + countPiece(state, side, "press") * 2 + (automated ? countPiece(state, side, "conveyor") : 0);
  state.energy[side] = Math.min(999, state.energy[side] + value);
  addSpark(state, x, y, `+${value}`, "gem");
  return true;
}

function damageStructure(state: GameState, target: Structure, amount: number) {
  target.hp -= amount;
  addSpark(state, target.x, target.y, `-${Math.round(amount)}`, "bad");
  if (target.pieceId === "thorn") return amount * 0.35;
  return 0;
}

function nearestStructure(state: GameState, side: Side, x: number, y: number, range = 8) {
  let best: Structure | undefined;
  let bestDistance = range;
  for (const structure of state.structures) {
    if (structure.side !== side) continue;
    const distance = Math.hypot(structure.x - x, structure.y - y);
    if (distance < bestDistance) {
      best = structure;
      bestDistance = distance;
    }
  }
  return best;
}

function runRunner(state: GameState, side: Side, dt: number) {
  const runner = state.runners[side];
  const homeX = 8;
  const homeY = sideY(side, 77, 23);
  const magnetBonus = countPiece(state, side, "magnet") * 3;
  const moveSpeed = 13 + magnetBonus;

  if (runner.carrying) {
    const distance = Math.hypot(homeX - runner.x, homeY - runner.y);
    if (distance < 2.2) {
      runner.carrying = false;
      runner.targetId = null;
      const value = 5 + countPiece(state, side, "press") * 2;
      state.energy[side] = Math.min(999, state.energy[side] + value);
      addSpark(state, homeX + 3, homeY, `+${value}`, "gem");
      return;
    }
    runner.x += ((homeX - runner.x) / distance) * moveSpeed * dt;
    runner.y += ((homeY - runner.y) / distance) * moveSpeed * dt;
    return;
  }

  let target = state.gems.find((gem) => gem.id === runner.targetId && gem.side === side);
  if (!target) {
    target = state.gems
      .filter((gem) => gem.side === side)
      .sort((a, b) => Math.hypot(a.x - runner.x, a.y - runner.y) - Math.hypot(b.x - runner.x, b.y - runner.y))[0];
    runner.targetId = target?.id ?? null;
  }
  if (!target) return;
  const distance = Math.hypot(target.x - runner.x, target.y - runner.y);
  if (distance < 2.5 + magnetBonus * 0.2) {
    state.gems = state.gems.filter((gem) => gem.id !== target!.id);
    runner.carrying = true;
    runner.targetId = null;
    addSpark(state, runner.x, runner.y, "GOT IT", "gem");
    return;
  }
  runner.x += ((target.x - runner.x) / distance) * moveSpeed * dt;
  runner.y += ((target.y - runner.y) / distance) * moveSpeed * dt;
}

function fireShot(state: GameState, structure: Structure, kind: string, damage: number, speed = 32, spread = 0) {
  state.shots.push({
    id: state.nextId++, side: structure.side, kind,
    x: structure.x + spread,
    y: structure.y + (structure.side === "player" ? -2 : 2),
    damage, speed,
  });
}

function tickStructures(state: GameState, dt: number) {
  const tempo: Record<Side, number> = {
    player: 1 + countPiece(state, "player", "timecoil") * 0.18,
    enemy: 1 + countPiece(state, "enemy", "timecoil") * 0.18,
  };

  for (const structure of state.structures) {
    structure.cooldown -= dt * tempo[structure.side];
    if (structure.cooldown > 0) continue;
    const foe: Side = structure.side === "player" ? "enemy" : "player";

    switch (structure.pieceId) {
      case "shooter": fireShot(state, structure, "bolt", 8); structure.cooldown = 1.45; break;
      case "burst":
        fireShot(state, structure, "burst", 5, 30, -1.5);
        fireShot(state, structure, "burst", 5, 30, 0);
        fireShot(state, structure, "burst", 5, 30, 1.5);
        structure.cooldown = 2.25;
        break;
      case "laser": fireShot(state, structure, "laser", 20, 42); structure.cooldown = 3.2; break;
      case "spider": addUnit(state, structure, "Spider", "✣", 9, 5, 9.5); structure.cooldown = 3.4; break;
      case "wolf": addUnit(state, structure, "Razorling", "◆", 18, 9, 7.4); structure.cooldown = 5.2; break;
      case "firefly": addUnit(state, structure, "Firefly", "✧", 8, 6, 11, true); structure.cooldown = 3.8; break;
      case "beetle": addUnit(state, structure, "Siege Beetle", "⬟", 38, 13, 4.5); structure.cooldown = 7; break;
      case "wisp":
      case "golem": {
        const already = state.units.some((unit) => unit.side === structure.side && unit.role === "defender" && unit.kind === structure.pieceId);
        if (!already) addUnit(state, structure, structure.pieceId, structure.pieceId === "wisp" ? "●" : "⬢", structure.pieceId === "wisp" ? 18 : 42, structure.pieceId === "wisp" ? 6 : 11, 0, false, "defender");
        structure.cooldown = 3;
        break;
      }
      case "porter": {
        const gem = state.gems.find((candidate) => candidate.side === structure.side);
        if (gem) collectGem(state, structure.side, gem.id, structure.x, structure.y, true);
        structure.cooldown = 4.6;
        break;
      }
      case "conveyor": {
        const gem = state.gems.find((candidate) => candidate.side === structure.side);
        if (gem) collectGem(state, structure.side, gem.id, 10, sideY(structure.side, 77, 23), true);
        structure.cooldown = 3.1;
        break;
      }
      case "medbay": state.hp[structure.side] = Math.min(100, state.hp[structure.side] + 2); structure.cooldown = 1.5; break;
      case "medic": {
        const wounded = state.structures.filter((item) => item.side === structure.side && item.hp < item.maxHp).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
        if (wounded) { wounded.hp = Math.min(wounded.maxHp, wounded.hp + 7); addSpark(state, wounded.x, wounded.y, "+7", "good"); }
        structure.cooldown = 2.4;
        break;
      }
      case "repair":
        state.structures.filter((item) => item.side === structure.side).forEach((item) => { item.hp = Math.min(item.maxHp, item.hp + 1.5); });
        structure.cooldown = 1.8;
        break;
      case "tesla": {
        const targets = state.units.filter((unit) => unit.side === foe && unit.role === "attacker").slice(0, 2);
        targets.forEach((unit) => { unit.hp -= 8; addSpark(state, unit.x, unit.y, "ϟ", "bad"); });
        if (!targets.length) state.hp[foe] -= 1.5;
        structure.cooldown = 2.2;
        break;
      }
      case "sap": {
        const stolen = Math.min(2, state.energy[foe]);
        state.energy[foe] -= stolen;
        state.energy[structure.side] += stolen;
        structure.cooldown = 3.2;
        break;
      }
      case "vault": state.energy[structure.side] += 1; structure.cooldown = 3; break;
      case "jackpot": {
        const prize = Math.random() < 0.18 ? 14 : Math.random() < 0.5 ? 3 : 1;
        state.energy[structure.side] += prize;
        addSpark(state, structure.x, structure.y, `+${prize}`, "gem");
        structure.cooldown = 4.4;
        break;
      }
      default: structure.cooldown = 1;
    }
  }
}

function tickUnits(state: GameState, dt: number) {
  const survivors: Unit[] = [];
  for (const unit of state.units) {
    if (unit.hp <= 0) continue;
    const foe: Side = unit.side === "player" ? "enemy" : "player";
    if (unit.role === "defender") {
      const homeY = sideY(unit.side, 74, 26);
      const homeX = state.runners[unit.side].x + (unit.kind === "wisp" ? 5 : -4);
      unit.x += (homeX - unit.x) * Math.min(1, dt * 2);
      unit.y += (homeY - unit.y) * Math.min(1, dt * 2);
      const intruder = state.units.find((candidate) => candidate.side === foe && candidate.role === "attacker" && Math.hypot(candidate.x - unit.x, candidate.y - unit.y) < 10);
      if (intruder) { intruder.hp -= unit.damage * dt * 2; }
      survivors.push(unit);
      continue;
    }

    const inFoeTerritory = unit.side === "player" ? unit.y < 48 : unit.y > 52;
    const slowed = inFoeTerritory && countPiece(state, foe, "frost") > 0;
    const direction = unit.side === "player" ? -1 : 1;
    const target = unit.flying ? undefined : nearestStructure(state, foe, unit.x, unit.y + direction * 3, 7);
    if (target) {
      const reflected = damageStructure(state, target, unit.damage * dt * 1.3);
      unit.hp -= reflected;
    } else {
      unit.y += direction * unit.speed * (slowed ? 0.58 : 1) * dt;
    }

    const mine = inFoeTerritory && state.structures.find((structure) => structure.side === foe && structure.pieceId === "mine" && structure.cooldown <= 0 && Math.abs(structure.x - unit.x) < 15);
    if (mine) {
      unit.hp -= 24;
      mine.cooldown = 6;
      addSpark(state, unit.x, unit.y, "BOOM", "bad");
    }

    if ((unit.side === "player" && unit.y <= 2) || (unit.side === "enemy" && unit.y >= 98)) {
      state.hp[foe] -= unit.damage;
      addSpark(state, unit.x, unit.y, `-${unit.damage}`, "bad");
      continue;
    }
    if (unit.hp > 0) survivors.push(unit);
  }
  state.units = survivors;
}

function tickShots(state: GameState, dt: number) {
  const survivors: Shot[] = [];
  for (const shot of state.shots) {
    const foe: Side = shot.side === "player" ? "enemy" : "player";
    shot.y += (shot.side === "player" ? -1 : 1) * shot.speed * dt;
    const unit = state.units.find((candidate) => candidate.side === foe && Math.hypot(candidate.x - shot.x, candidate.y - shot.y) < 3.4);
    if (unit) { unit.hp -= shot.damage; addSpark(state, shot.x, shot.y, "HIT", "bad"); continue; }
    const structure = nearestStructure(state, foe, shot.x, shot.y, 4.2);
    if (structure) {
      if (structure.pieceId === "reflector" && Math.random() < 0.35) {
        shot.side = foe;
        shot.damage *= 1.2;
        addSpark(state, shot.x, shot.y, "PING", "good");
        survivors.push(shot);
      } else {
        damageStructure(state, structure, shot.damage);
      }
      continue;
    }
    if ((shot.side === "player" && shot.y <= 1) || (shot.side === "enemy" && shot.y >= 99)) {
      state.hp[foe] -= shot.damage;
      addSpark(state, shot.x, shot.y, `-${shot.damage}`, "bad");
      continue;
    }
    survivors.push(shot);
  }
  state.shots = survivors;
}

function aiBuild(state: GameState) {
  const open = Array.from({ length: 15 }, (_, slot) => slot).filter((slot) => !state.structures.some((structure) => structure.side === "enemy" && structure.slot === slot));
  if (!open.length) return;
  const priorities = ["spider", "shooter", "wall", "porter", "medbay", "burst", "wolf", "shield", "tesla", "beetle", "repair", "firefly", "frost", "golem", "laser"];
  const affordable = priorities.map((id) => PIECE_BY_ID[id]).filter((piece) => piece.cost <= state.energy.enemy);
  if (!affordable.length) return;
  const piece = affordable[Math.floor(Math.random() * Math.min(affordable.length, 7))];
  const slot = open[Math.floor(Math.random() * open.length)];
  const col = slot % 5;
  const row = Math.floor(slot / 5);
  const hp = hpForPiece(piece.id);
  state.structures.push({ uid: state.nextId++, pieceId: piece.id, side: "enemy", slot, x: 16 + col * 16.8, y: 10 + row * 10.8, hp, maxHp: hp, cooldown: 0.6 });
  state.energy.enemy -= piece.cost;
  state.toast = `Rival built ${piece.name}`;
  state.toastTimer = 1.8;
}

function step(previous: GameState, dt: number): GameState {
  if (previous.match !== "playing") return previous;
  const state: GameState = {
    ...previous,
    hp: { ...previous.hp }, energy: { ...previous.energy },
    runners: { player: { ...previous.runners.player }, enemy: { ...previous.runners.enemy } },
    gems: previous.gems.map((gem) => ({ ...gem, pulse: gem.pulse + dt })),
    structures: previous.structures.map((structure) => ({ ...structure })),
    units: previous.units.map((unit) => ({ ...unit })),
    shots: previous.shots.map((shot) => ({ ...shot })),
    sparks: previous.sparks.map((spark) => ({ ...spark, life: spark.life - dt, y: spark.y - dt * 2 })).filter((spark) => spark.life > 0),
    elapsed: previous.elapsed + dt,
    gemTimer: previous.gemTimer - dt,
    aiTimer: previous.aiTimer - dt,
    slashCooldown: Math.max(0, previous.slashCooldown - dt),
    slashFlash: Math.max(0, previous.slashFlash - dt),
    toastTimer: Math.max(0, previous.toastTimer - dt),
  };

  if (state.gemTimer <= 0) {
    for (const side of ["player", "enemy"] as Side[]) {
      const sideGemCount = state.gems.filter((gem) => gem.side === side).length;
      if (sideGemCount < 7) state.gems.push({ id: state.nextId++, side, x: 88 + Math.random() * 5, y: sideY(side, 63 + Math.random() * 24, 13 + Math.random() * 24), pulse: Math.random() * 2 });
    }
    state.gemTimer = 2.2;
  }
  if (state.aiTimer <= 0) { aiBuild(state); state.aiTimer = 2.7 + Math.random() * 1.8; }

  runRunner(state, "player", dt);
  runRunner(state, "enemy", dt);
  tickStructures(state, dt);
  tickUnits(state, dt);
  tickShots(state, dt);
  state.structures = state.structures.filter((structure) => structure.hp > 0);

  if (state.hp.enemy <= 0) { state.hp.enemy = 0; state.match = "won"; state.toast = "RIVAL CORE SHATTERED"; state.toastTimer = 99; }
  if (state.hp.player <= 0) { state.hp.player = 0; state.match = "lost"; state.toast = "YOUR CORE SHATTERED"; state.toastTimer = 99; }
  return state;
}

function hpForPiece(id: string) {
  if (id === "wall") return 90;
  if (id === "shield") return 78;
  if (id === "decoy") return 66;
  if (id === "thorn") return 58;
  if (id === "golem") return 62;
  return 44;
}

export default function Game() {
  const [game, setGame] = useState<GameState>(() => startingState());
  const [selectedPiece, setSelectedPiece] = useState("shooter");
  const [filter, setFilter] = useState<Category>("all");
  const [paused, setPaused] = useState(false);
  const lastTime = useRef(0);

  useEffect(() => {
    let frame = 0;
    const loop = (time: number) => {
      if (!lastTime.current) lastTime.current = time;
      const dt = Math.min(0.05, (time - lastTime.current) / 1000);
      lastTime.current = time;
      if (!paused) setGame((current) => step(current, dt));
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [paused]);

  const visiblePieces = useMemo(() => filter === "all" ? PIECES : PIECES.filter((piece) => piece.category === filter), [filter]);
  const selected = PIECE_BY_ID[selectedPiece];

  function build(slot: number) {
    setGame((current) => {
      if (current.match !== "playing") return current;
      if (current.structures.some((structure) => structure.side === "player" && structure.slot === slot)) return { ...current, toast: "That pad is occupied.", toastTimer: 1.6 };
      if (current.energy.player < selected.cost) return { ...current, toast: `Need ${selected.cost - Math.floor(current.energy.player)} more charge.`, toastTimer: 1.8 };
      const col = slot % 5;
      const row = Math.floor(slot / 5);
      return {
        ...current,
        energy: { ...current.energy, player: current.energy.player - selected.cost },
        structures: [...current.structures, { uid: current.nextId, pieceId: selected.id, side: "player", slot, x: 16 + col * 16.8, y: 61 + row * 10.8, hp: hpForPiece(selected.id), maxHp: hpForPiece(selected.id), cooldown: 0.4 }],
        nextId: current.nextId + 1,
        toast: `${selected.name} online`, toastTimer: 1.5,
      };
    });
  }

  function slash() {
    setGame((current) => {
      if (current.slashCooldown > 0 || current.match !== "playing") return current;
      const runner = current.runners.player;
      const units = current.units.map((unit) => unit.side === "enemy" && Math.hypot(unit.x - runner.x, unit.y - runner.y) < 23 ? { ...unit, hp: unit.hp - 18 } : unit);
      const shots = current.shots.filter((shot) => !(shot.side === "enemy" && Math.hypot(shot.x - runner.x, shot.y - runner.y) < 25));
      return { ...current, units, shots, slashCooldown: 2.5, slashFlash: 0.38, toast: "270° GEMSLASH!", toastTimer: 0.8 };
    });
  }

  function reset() {
    lastTime.current = 0;
    setPaused(false);
    setGame(startingState());
  }

  const time = `${String(Math.floor(game.elapsed / 60)).padStart(2, "0")}:${String(Math.floor(game.elapsed % 60)).padStart(2, "0")}`;
  const cooldownPercent = Math.max(0, Math.min(100, (1 - game.slashCooldown / 2.5) * 100));

  return (
    <main className="game-shell">
      <section className="game-phone" aria-label="GEM automation duel">
        <header className="topbar">
          <div className="brand-lockup"><span className="brand-gem">◆</span><strong>GEM</strong><span className="mode">AUTOMATA DUEL</span></div>
          <div className="round-clock" aria-label={`Duel time ${time}`}>{time}</div>
          <button className="pause-button" onClick={() => setPaused((value) => !value)} aria-label={paused ? "Resume duel" : "Pause duel"}>{paused ? "▶" : "Ⅱ"}</button>
        </header>

        <div className="arena">
          <div className="territory enemy-territory" aria-label="Rival territory">
            <div className="side-hud enemy-hud">
              <span className="side-name"><i className="status-dot enemy-dot" /> RIVAL AI</span>
              <div className="hp-track"><span style={{ width: `${game.hp.enemy}%` }} /></div>
              <b>{Math.ceil(game.hp.enemy)}</b>
              <div className="charge-pill"><span>◆</span>{Math.floor(game.energy.enemy)}</div>
            </div>
          </div>
          <div className="territory player-territory" aria-label="Your territory">
            <div className="side-hud player-hud">
              <span className="side-name"><i className="status-dot player-dot" /> YOU</span>
              <div className="hp-track"><span style={{ width: `${game.hp.player}%` }} /></div>
              <b>{Math.ceil(game.hp.player)}</b>
              <div className="charge-pill"><span>◆</span>{Math.floor(game.energy.player)}</div>
            </div>
          </div>

          <div className="midline"><span>CONTESTED</span></div>

          {(["enemy", "player"] as Side[]).map((side) => (
            <div key={`${side}-machine`} className={`machine ${side}`} style={{ top: `${sideY(side, 67, 17)}%` }} aria-label={`${side} gem dispenser`}>
              <span className="machine-core">◆</span><i /><i /><i />
            </div>
          ))}
          {(["enemy", "player"] as Side[]).map((side) => (
            <div key={`${side}-refinery`} className={`refinery ${side}`} style={{ top: `${sideY(side, 77, 23)}%` }} aria-label={`${side} gem refinery`}>
              <span>◆</span><small>REFINE</small>
            </div>
          ))}

          <div className="build-grid enemy-grid" aria-hidden="true">
            {Array.from({ length: 15 }, (_, slot) => <span key={slot} />)}
          </div>
          <div className="build-grid player-grid">
            {Array.from({ length: 15 }, (_, slot) => {
              const occupied = game.structures.some((structure) => structure.side === "player" && structure.slot === slot);
              return <button key={slot} className={occupied ? "occupied" : ""} onClick={() => build(slot)} aria-label={occupied ? `Build pad ${slot + 1} occupied` : `Build ${selected.name} on pad ${slot + 1}`} disabled={occupied || game.match !== "playing"}><span>+</span></button>;
            })}
          </div>

          {game.gems.map((gem) => <div key={gem.id} className={`loose-gem ${gem.side}`} style={{ left: `${gem.x}%`, top: `${gem.y}%`, transform: `translate(-50%, -50%) rotate(${gem.pulse * 80}deg)` }}>◆</div>)}

          {(["enemy", "player"] as Side[]).map((side) => {
            const runner = game.runners[side];
            return <div key={side} className={`runner ${side} ${runner.carrying ? "carrying" : ""}`} style={{ left: `${runner.x}%`, top: `${runner.y}%` }}>
              {runner.carrying && <span className="carried-gem">◆</span>}
              <span className="runner-head" /><span className="runner-body" /><i className="runner-leg one" /><i className="runner-leg two" />
            </div>;
          })}

          {game.structures.map((structure) => {
            const piece = PIECE_BY_ID[structure.pieceId];
            return <div key={structure.uid} className={`structure ${structure.side} type-${structure.pieceId}`} style={{ left: `${structure.x}%`, top: `${structure.y}%` }} title={piece.name}>
              <span>{piece.icon}</span><small>{piece.name.split(" ")[0]}</small>
              <i className="structure-hp"><b style={{ width: `${Math.max(0, structure.hp / structure.maxHp) * 100}%` }} /></i>
            </div>;
          })}

          {game.units.map((unit) => <div key={unit.id} className={`unit ${unit.side} ${unit.role} ${unit.flying ? "flying" : ""}`} style={{ left: `${unit.x}%`, top: `${unit.y}%` }}><span>{unit.icon}</span><i style={{ width: `${Math.min(100, unit.hp * 4)}%` }} /></div>)}
          {game.shots.map((shot) => <div key={shot.id} className={`shot ${shot.side} ${shot.kind}`} style={{ left: `${shot.x}%`, top: `${shot.y}%` }} />)}
          {game.sparks.map((spark) => <div key={spark.id} className={`spark ${spark.tone}`} style={{ left: `${spark.x}%`, top: `${spark.y}%`, opacity: spark.life }}>{spark.text}</div>)}

          <button className={`slash-button ${game.slashCooldown > 0 ? "cooling" : "ready"}`} onClick={slash} aria-label={game.slashCooldown > 0 ? `Sword slash recharging, ${game.slashCooldown.toFixed(1)} seconds` : "Use 270 degree sword slash"}>
            <span className="slash-icon">╱</span><b>SLASH</b><i style={{ clipPath: `inset(${100 - cooldownPercent}% 0 0 0)` }} />
          </button>
          {game.slashFlash > 0 && <div className="slash-arc" style={{ left: `${game.runners.player.x}%`, top: `${game.runners.player.y}%` }} />}

          {game.toastTimer > 0 && <div className="toast">{game.toast}</div>}
          {(paused || game.match !== "playing") && <div className="match-overlay">
            <span className="overlay-gem">◆</span>
            <h1>{paused ? "DUEL PAUSED" : game.match === "won" ? "VICTORY" : "CORE SHATTERED"}</h1>
            <p>{paused ? "Your automata are holding position." : game.match === "won" ? "The rival automata have gone dark." : "Rebuild smarter. Automate faster."}</p>
            {paused ? <button onClick={() => setPaused(false)}>RESUME</button> : <button onClick={reset}>NEW DUEL</button>}
          </div>}
        </div>

        <section className="build-dock" aria-label="Build menu">
          <div className="dock-head">
            <nav aria-label="Piece categories">
              {FILTERS.map((item) => <button key={item.id} className={filter === item.id ? "active" : ""} onClick={() => setFilter(item.id)}>{item.label}</button>)}
            </nav>
            <div className="selected-readout"><span>{selected.icon}</span><strong>{selected.name}</strong><small>{selected.description}</small></div>
          </div>
          <div className="piece-rail">
            {visiblePieces.map((piece) => {
              const affordable = game.energy.player >= piece.cost;
              return <button key={piece.id} className={`${selectedPiece === piece.id ? "selected" : ""} ${affordable ? "" : "locked"}`} onClick={() => setSelectedPiece(piece.id)} aria-label={`Select ${piece.name}, costs ${piece.cost}. ${piece.description}`}>
                {piece.surprise && <em>NEW</em>}
                <span>{piece.icon}</span><b>{piece.name}</b><small><i>◆</i>{piece.cost}</small>
              </button>;
            })}
          </div>
        </section>
      </section>
    </main>
  );
}
