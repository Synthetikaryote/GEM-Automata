import assert from 'node:assert/strict';
import test from 'node:test';
import * as e from '../app/emberline/engine.ts';
const run=(s,t)=>{for(let i=0;i<t*30;i++)e.tick(s,1/30);};
const quiet=()=>{const s=e.makeState();s.phase='playing';s.aiTimer=1e6;return s;};
const own=(s,kind)=>s.buildings.find(b=>b.side==='you'&&b.kind===kind);
test('rear mines and depots are rotationally symmetric; keepers deposit only after crossing the base',()=>{
 const s=quiet();for(const kind of ['mine','depot','core']){const a=e[kind](s,'you'),b=e[kind](s,'rival');assert.deepEqual(e.rotate(a),{x:b.x,y:b.y});}
 assert.ok(e.mine(s,'you').x<e.depot(s,'you').x);run(s,1.3);assert.ok(s.keepers[0].cargo>0);assert.equal(s.sides.you.earned,0);run(s,6);assert.ok(s.sides.you.earned>=16);assert.ok(s.keepers.every(k=>k.side==='you'?k.y>610:k.y<70));
});
test('conveyors physically deliver, reject incompatible materials, split outputs, and respect buffer capacity',()=>{
 const s=quiet(),m=e.mine(s,'you'),d=e.depot(s,'you');s.keepers=[];assert.ok(e.connect(s,m.id,d.id));run(s,.5);assert.ok(s.packets.length);assert.equal(s.sides.you.earned,0);run(s,3);assert.ok(s.sides.you.earned>0);
 assert.ok(e.build(s,'lab',19));const lab=own(s,'lab');lab.progress=1;assert.ok(e.connect(s,m.id,lab.id));assert.equal(e.connect(s,m.id,lab.id),false);assert.equal(e.connect(s,d.id,m.id),false);assert.equal(e.connect(s,m.id,e.depot(s,'rival').id),false);
 run(s,40);assert.ok(lab.input<=20);assert.ok(s.sides.you.research>0);assert.ok(s.belts.every(b=>b.sent>0));
 s.sides.you.credits=500;assert.ok(e.build(s,'smelter',18));const sm=own(s,'smelter');assert.match(e.connectionError(s,sm.id,lab.id),/needs ore/);
});
test('unsupplied machines stay idle; ore processing and delivered alloy unlock supplied siege production',()=>{
 const s=quiet();s.sides.you.credits=1000;e.build(s,'lab',19);e.build(s,'smelter',18);run(s,35);const lab=own(s,'lab'),sm=own(s,'smelter');assert.equal(s.sides.you.research,0);assert.equal(sm.output,0);assert.equal(e.build(s,'foundry',7),false);
 e.connect(s,e.mine(s,'you').id,lab.id);e.connect(s,e.mine(s,'you').id,sm.id);e.connect(s,sm.id,e.depot(s,'you').id);run(s,60);assert.ok(s.sides.you.research>=18);assert.ok(s.sides.you.alloy>=6);assert.ok(e.research(s,'industry'));assert.equal(e.research(s,'industry'),false);assert.equal(e.capacity(s,'you'),12);assert.ok(e.build(s,'foundry',7));const f=own(s,'foundry');run(s,35);assert.equal(s.units.some(u=>u.kind==='ram'),false);e.connect(s,sm.id,f.id);run(s,40);assert.ok(s.units.some(u=>u.kind==='ram'));
});
test('rear income survives factory destruction; discounted rebuild retains connections',()=>{
 const s=quiet();e.connect(s,e.mine(s,'you').id,e.depot(s,'you').id);e.build(s,'kennel',7);const b=own(s,'kennel');e.connect(s,e.mine(s,'you').id,b.id);run(s,15);b.hp=0;run(s,1);assert.ok(b.wreck);const earned=s.sides.you.earned;run(s,20);assert.ok(s.sides.you.earned>earned);assert.equal(s.keepers.length,2);const credits=s.sides.you.credits;assert.ok(e.rebuild(s,b.id));assert.equal(credits-s.sides.you.credits,26);assert.ok(s.belts.some(l=>l.to===b.id));run(s,25);assert.equal(b.progress,1);assert.equal(b.wreck,false);assert.ok(s.units.some(u=>u.kind==='wolf'&&u.side==='you'));
});
test('flak counters wolves, siege outranges defenses, and shield healing works while advancing',()=>{
 const s=quiet();e.build(s,'flak',1);const flak=own(s,'flak');flak.progress=1;for(let i=0;i<6;i++)e.spawn(s,'rival','wolf',{x:flak.x+i,y:flak.y-70});run(s,10);assert.equal(s.units.filter(u=>u.side==='rival').length,0);assert.ok(flak.hp>0);
 const siege=quiet();e.spawn(siege,'you','ram',{x:210,y:200});run(siege,40);assert.ok(e.core(siege,'rival').hp<e.core(siege,'rival').maxHp);assert.ok(siege.units[0].hp>0);
 const heal=quiet();e.spawn(heal,'you','ram',{x:200,y:550});e.spawn(heal,'you','shield',{x:220,y:550});heal.units[0].hp=100;run(heal,2);assert.ok(heal.units[0].hp>100);
});
test('emergency grid, bounded recruitment, and independent save/resume work',()=>{
 const s=quiet();e.core(s,'you').hp=600;e.spawn(s,'rival','wolf',{x:200,y:500});assert.ok(e.emergency(s));assert.equal(e.emergency(s),false);assert.equal(e.core(s,'you').hp,695);assert.equal(s.units[0].slow,6);s.sides.you.credits=1000;assert.ok(e.hire(s));assert.ok(e.hire(s));assert.equal(e.hire(s),false);
 const saved=e.restore(e.serialize(s));assert.equal(saved.phase,'paused');run(saved,30);assert.equal(saved.elapsed,s.elapsed);assert.equal(e.restore('{}'),null);assert.equal(e.restore('invalid'),null);
});
function factoryPolicy(s,progress){
 const bs=s.buildings.filter(b=>b.side==='you'),m=e.mine(s,'you'),d=e.depot(s,'you');if(!s.belts.some(b=>b.from===m.id&&b.to===d.id))e.connect(s,m.id,d.id);
 for(const b of bs){if(b.wreck)e.rebuild(s,b.id);if(e.DEFS[b.kind].input&&b.kind!=='depot'&&!s.belts.some(l=>l.to===b.id)){const src=e.DEFS[b.kind].input==='ore'?m:bs.find(a=>a.kind==='smelter'&&!a.wreck);if(src)e.connect(s,src.id,b.id);}if(b.kind==='smelter'&&!s.belts.some(l=>l.from===b.id&&l.to===d.id))e.connect(s,b.id,d.id);}
 const tech=['industry','logistics','command','resilience'].find(t=>!s.sides.you.tech.includes(t));if(tech)e.research(s,tech);
 const plan=['flak','lab','smelter','kennel','foundry','smelter','aegis','foundry','flak','lab','foundry','flak','foundry'],kind=plan[progress.stage];
 const slots=kind==='flak'?[1,4,0,5]:kind==='lab'?[19,22]:kind==='smelter'?[18,23]:[7,10,13,16,6,11,8,9];if(kind)for(const slot of slots)if(e.build(s,kind,slot)){progress.stage++;break;}
 if(progress.stage>3&&s.sides.you.credits>180)e.hire(s);if(s.units.some(u=>u.side==='rival'&&u.y>400))e.emergency(s);if(progress.stage>7&&s.sides.you.credits>150)for(const b of bs)if(['flak','foundry','lab'].includes(b.kind)&&e.upgrade(s,b.id))break;
}
test('full matches can be won through industry and lost by idling; state stays bounded',()=>{
 for(const active of [false,true]){const s=e.makeState('standard');s.phase='playing';const progress={stage:0};let last=-1;for(let n=0;n<27000&&s.phase==='playing';n++){const sec=Math.floor(s.elapsed);if(active&&sec!==last){last=sec;factoryPolicy(s,progress);}e.tick(s,1/30);assert.ok(e.used(s,'you')<=e.capacity(s,'you'));assert.ok(e.used(s,'rival')<=e.capacity(s,'rival'));assert.ok(s.packets.length<=180);assert.ok(s.units.every(u=>Number.isFinite(u.x)&&Number.isFinite(u.y)));}assert.equal(s.phase,active?'won':'lost');if(active)assert.ok(s.sides.you.tech.includes('command'));}
});
