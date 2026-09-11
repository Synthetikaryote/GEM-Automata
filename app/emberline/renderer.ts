import { WIDTH, HEIGHT, DEFS, slotPoint, beltPath, pathPoint, port, canBuild, type State, type Point, type BuildKind } from './engine';
export const RECTS = [[6,18,318,394],[333,52,297,343],[644,78,320,319],[977,18,271,374],[4,479,337,318],[352,520,278,284],[636,430,316,386],[962,452,289,337],[20,876,243,321],[327,913,293,265],[653,849,293,351],[971,900,259,278]] as const;
export type Art = { terrain: HTMLImageElement; sprites: HTMLImageElement };
export type Cursor = { tool: BuildKind | 'belt' | null; hover: number | null; source: number | null; point: Point | null; selected: number | null; showBelts: boolean };
const cyan = '#83e0e0', amber = '#ffc073';
function label(c: CanvasRenderingContext2D, t: string, x: number, y: number, size = 10, color = '#e8d8c0', align: CanvasTextAlign = 'center') { c.font = `600 ${size}px Arial,sans-serif`; c.textAlign = align; c.fillStyle = color; c.fillText(t, x, y); }
function bar(c: CanvasRenderingContext2D, x: number, y: number, width: number, value: number, color: string) { c.fillStyle = '#070f13cf'; c.fillRect(x - width / 2, y, width, 4); c.fillStyle = color; c.fillRect(x - width / 2, y, width * Math.max(0, Math.min(1, value)), 4); }
export function sprite(c: CanvasRenderingContext2D, art: Art, index: number, p: Point, size: number, opacity = 1) { if (!art.sprites.complete || !art.sprites.naturalWidth) return; const [x,y,w,h] = RECTS[index], k = size / Math.max(w,h); c.save(); c.globalAlpha = opacity; c.drawImage(art.sprites, x,y,w,h, p.x-w*k/2,p.y-h*k/2,w*k,h*k); c.restore(); }
function strokePath(c: CanvasRenderingContext2D, points: Point[]) { c.beginPath(); points.forEach((p,i) => i ? c.lineTo(p.x,p.y) : c.moveTo(p.x,p.y)); c.stroke(); }
export function render(c: CanvasRenderingContext2D, s: State, art: Art, cursor: Cursor, time: number) {
  c.clearRect(0,0,WIDTH,HEIGHT); c.fillStyle = '#17252a'; c.fillRect(0,0,WIDTH,HEIGHT);
  if (art.terrain.complete && art.terrain.naturalWidth) c.drawImage(art.terrain,0,0,WIDTH,HEIGHT);
  c.fillStyle = '#06111823'; c.fillRect(0,0,WIDTH,HEIGHT);
  for (const side of ['you','rival'] as const) for(let i=0;i<24;i++) { const p=slotPoint(i,side), hover=side==='you'&&cursor.hover===i, valid=cursor.tool&&cursor.tool!=='belt'&&canBuild(s,cursor.tool,i); c.lineWidth=hover?1.5:.6; c.strokeStyle=hover?(valid?'#ffd590':'#fa8786'):side==='you'?'#8faeb82d':'#bc8d8a22'; c.fillStyle=hover?'#fac87814':'transparent'; c.beginPath();c.roundRect(p.x-28,p.y-23,56,46,3);c.fill();c.stroke(); if(side==='you'&&cursor.tool&&cursor.tool!=='belt'&&!s.buildings.some(b=>b.side===side&&b.slot===i)){label(c,'+',p.x,p.y+4,11,'#b4c8bb55');} }
  // Rear factories are a protected logistics lane. Only the center command core is a combat target.
  for(const y of [101,579]) { c.save(); c.setLineDash([3,7]); c.strokeStyle='#7faebd55';c.lineWidth=1;strokePath(c,[{x:18,y},{x:402,y}]);c.restore(); }
  label(c,'PROTECTED LOGISTICS',210,575,8,'#b5c9c597');
  label(c,'THE CAUSEWAY',210,341,10,'#c7b195a0');
  if(cursor.showBelts||cursor.tool==='belt') {
    for(const b of s.belts){const path=beltPath(s,b), product=b.product==='alloy'?'#7abfd2':'#ad8656';c.lineJoin='round';c.lineCap='round';c.lineWidth=10;c.strokeStyle='#071218e8';strokePath(c,path);c.lineWidth=7;c.strokeStyle=b.side==='you'?'#425058':'#594248';strokePath(c,path);c.lineWidth=4;c.strokeStyle=b.blocked?'#8d6a4a':product;c.save();c.setLineDash([2,8]);c.lineDashOffset=-time*(b.blocked?0:15);strokePath(c,path);c.restore();const m=pathPoint(path,.6),m2=pathPoint(path,.61),angle=Math.atan2(m2.y-m.y,m2.x-m.x);c.save();c.translate(m.x,m.y);c.rotate(angle);c.strokeStyle=b.blocked?'#b29b77':'#edcf94';c.lineWidth=1.3;strokePath(c,[{x:-3,y:-3},{x:1,y:0},{x:-3,y:3}]);c.restore();}
    for(const p of s.packets){const b=s.belts.find(l=>l.id===p.belt);if(!b)continue;const pos=pathPoint(beltPath(s,b),p.progress);c.save();c.translate(pos.x,pos.y);c.rotate(Math.PI/4);c.fillStyle=p.product==='alloy'?'#8ee4f0':'#ffd087';c.fillRect(-2.6,-2.6,5.2,5.2);c.restore();}
  }
  const entities=[...s.buildings.map(b=>({y:b.y,b})),...s.keepers.map(k=>({y:k.y,k})),...s.units.map(u=>({y:u.y,u}))].sort((a,b)=>a.y-b.y);
  for(const item of entities){
    if('b'in item){const b=item.b,d=DEFS[b.kind],size=b.kind==='core'?86:b.slot<0?68:65;
      c.fillStyle=b.side==='you'?'#67cad729':'#ed727530';c.beginPath();c.ellipse(b.x,b.y+13,b.kind==='core'?35:26,9,0,0,Math.PI*2);c.fill();
      if(cursor.selected===b.id||cursor.source===b.id){c.strokeStyle=cursor.source===b.id?amber:cyan;c.lineWidth=1.5;c.beginPath();c.ellipse(b.x,b.y+12,30,14,0,0,Math.PI*2);c.stroke();if(b.kind==='flak'){c.save();c.setLineDash([4,7]);c.globalAlpha=.35;c.beginPath();c.arc(b.x,b.y,115,0,Math.PI*2);c.stroke();c.restore();}}
      sprite(c,art,d.sprite,{x:b.x,y:b.y-9},size,b.wreck?.25:b.progress<1?.35+.55*b.progress:1);
      if(b.kind==='aegis')sprite(c,art,11,{x:b.x+15,y:b.y-22},26);
      if(b.wreck)label(c,'REBUILD',b.x,b.y+28,9,'#f0ae8b');
      else if(b.progress<1){bar(c,b.x,b.y+21,37,b.progress,'#edc88c');label(c,b.progress===0?'QUEUED':`${Math.round(b.progress*100)}%`,b.x,b.y+35,8,'#eed5b1');}
      else if(b.slot>=0){if(b.hp<b.maxHp||cursor.selected===b.id)bar(c,b.x,b.y+22,34,b.hp/b.maxHp,b.side==='you'?cyan:'#ef8b89');else if(d.input)bar(c,b.x,b.y+22,28,b.input/20,d.input==='ore'?amber:cyan);
        if(d.input){if(b.input===0)label(c,'!',b.x+23,b.y-26,13,'#ffc28c');if(cursor.selected===b.id)label(c,b.status,b.x,b.y+35,8,'#f5c78e');}
        if(b.level>1)label(c,'•'.repeat(b.level-1),b.x,b.y-38,12,amber);
      }
    } else if('k'in item){const k=item.k,bob=Math.sin(k.distance*.22)*1.1;sprite(c,art,8,{x:k.x,y:k.y-5+bob},34);if(k.cargo){c.fillStyle='#16242f';c.fillRect(k.x+6,k.y-24,19,12);label(c,String(k.cargo),k.x+15,k.y-14,9,amber);}if(k.task==='build')label(c,'⚙',k.x+15,k.y-6,13,'#ffdc9b');}
    else if('u'in item){const u=item.u,size=u.kind==='wolf'?39:u.kind==='ram'?57:36;c.fillStyle=u.side==='you'?'#65cce255':'#ec6b8e66';c.beginPath();c.ellipse(u.x,u.y+9,size*.23,5,0,0,Math.PI*2);c.fill();sprite(c,art,u.kind==='wolf'?9:u.kind==='ram'?10:11,{x:u.x,y:u.y-5+Math.sin(u.distance*.22)},size);if(u.hp<u.maxHp)bar(c,u.x,u.y+17,24,u.hp/u.maxHp,u.side==='you'?cyan:'#f59193');if(u.slow>0){c.strokeStyle=cyan;c.lineWidth=1;c.beginPath();c.arc(u.x,u.y,19,0,Math.PI*2);c.stroke();}}
  }
  // Ports are explicit functional controls: amber emits, cyan receives.
  for(const b of s.buildings.filter(b=>b.side==='you'))for(const output of [false,true]){if(output?!DEFS[b.kind].output:!DEFS[b.kind].input)continue;const p=port(b,output),active=cursor.tool==='belt'||cursor.selected===b.id;c.fillStyle=output?'#dba456':'#6cbfce';c.strokeStyle='#08141c';c.lineWidth=2;c.beginPath();c.arc(p.x,p.y,active?8:4.5,0,Math.PI*2);c.fill();c.stroke();if(active)label(c,output?'›':'‹',p.x,p.y+4,13,'#07131c');}
  label(c,'∞ ORE',42,661,10,amber);label(c,'RECEIVE',378,661,10,cyan);label(c,'∞ ORE',378,25,9,'#eeb798');label(c,'RECEIVE',42,25,9,'#c5999a');
  if(cursor.tool==='belt'&&cursor.source!==null&&cursor.point){const from=s.buildings.find(b=>b.id===cursor.source);if(from){c.save();c.strokeStyle=amber;c.setLineDash([5,5]);c.lineWidth=2;strokePath(c,[port(from,true),cursor.point]);c.restore();}}
  if(cursor.tool&&cursor.tool!=='belt'&&cursor.hover!==null)sprite(c,art,DEFS[cursor.tool].sprite,{x:slotPoint(cursor.hover).x,y:slotPoint(cursor.hover).y-9},65,.5);
  for(const e of s.effects){const alpha=e.life/e.total;c.save();c.globalAlpha=alpha;c.strokeStyle=e.color;c.lineWidth=2;if(e.type==='text')label(c,e.text??'',e.x,e.y-(1-alpha)*21,11,e.color);else if(e.type==='shot'&&e.target)strokePath(c,[e,e.target]);else{c.beginPath();c.ellipse(e.x,e.y,e.radius*(1-alpha*.7),e.radius*(1-alpha*.7)*.55,0,0,Math.PI*2);c.stroke();}c.restore();}
}
