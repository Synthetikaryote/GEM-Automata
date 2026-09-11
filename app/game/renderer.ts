import { W,H,DEFS,slotPoint,core,isBloom,canPlace,type State,type Kind,type Point,type Structure,type Unit } from './engine';
import { SPRITE_RECTS } from './assets';
export type Art = { terrain: HTMLImageElement; sprites: HTMLImageElement; enemy: HTMLCanvasElement | null };
export type Interaction = { blueprint: Kind | null; hover: number | null };
const MINT='#94e9bd', GOLD='#e1c283';
function rounded(c:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,r:number){c.beginPath();c.roundRect(x,y,w,h,r);}
function text(c:CanvasRenderingContext2D,t:string,x:number,y:number,size=11,color='#e8ecd8',align:CanvasTextAlign='center'){c.font=`${size<12?600:500} ${size}px ui-sans-serif, system-ui, sans-serif`;c.textAlign=align;c.fillStyle=color;c.fillText(t,x,y);}
function health(c:CanvasRenderingContext2D,p:Point,hp:number,max:number,side:string,width=31){const x=p.x-width/2,y=p.y+13;c.fillStyle='#071514';rounded(c,x,y,width,4,2);c.fill();c.fillStyle=side==='player'?'#8adaae':'#f08295';rounded(c,x,y,width*Math.max(0,hp/max),4,2);c.fill();}
export function sprite(c:CanvasRenderingContext2D,art:Art,index:number,x:number,y:number,size:number,enemy=false,alpha=1){
  const im=enemy&&art.enemy?art.enemy:art.sprites;if(!art.sprites.complete||!art.sprites.naturalWidth)return;
  const [sx,sy,sw,sh]=SPRITE_RECTS[index];const scale=size/Math.max(sw,sh),dw=sw*scale,dh=sh*scale;
  c.save();c.globalAlpha=alpha;c.drawImage(im,sx,sy,sw,sh,x-dw/2,y-dh/2,dw,dh);c.restore();
}
export function makeEnemyAtlas(im:HTMLImageElement){const c=document.createElement('canvas');c.width=im.naturalWidth;c.height=im.naturalHeight;const x=c.getContext('2d');if(x){x.filter='hue-rotate(165deg) saturate(1.05)';x.drawImage(im,0,0);}return c;}
export function render(c:CanvasRenderingContext2D,s:State,art:Art,input:Interaction,now:number){
  c.clearRect(0,0,W,H);c.fillStyle='#14221f';c.fillRect(0,0,W,H);
  if(art.terrain.complete&&art.terrain.naturalWidth)c.drawImage(art.terrain,0,0,W,H);
  const shade=c.createLinearGradient(0,0,0,H);shade.addColorStop(0,'#160d1e88');shade.addColorStop(.43,'#14272222');shade.addColorStop(.58,'#173b3022');shade.addColorStop(1,'#07171566');c.fillStyle=shade;c.fillRect(0,0,W,H);
  // The rune grid is a functional build surface and remains visible during combat.
  for(const side of ['enemy','player'] as const){for(let i=0;i<24;i++){const p=slotPoint(side,i),occupied=s.buildings.some(b=>b.side===side&&b.slot===i);const hover=side==='player'&&input.hover===i;const allowed=input.blueprint&&canPlace(s,input.blueprint,i);c.strokeStyle=hover?(allowed?'#c9f2af':'#ed8293'):side==='player'?(input.blueprint&&!occupied?'#9fcda44f':'#b1d2b51f'):'#dbaaac14';c.fillStyle=hover?(allowed?'#a2f2bb28':'#f9788928'):side==='player'?'#9adfb003':'#d7818803';c.lineWidth=hover?1.6:.65;rounded(c,p.x-29,p.y-24,58,48,5);c.fill();c.stroke();if(side==='player'&&!occupied&&input.blueprint){c.fillStyle='#c4e9c762';c.fillRect(p.x-3,p.y,6,.8);c.fillRect(p.x,p.y-3,.8,6);}}}
  // Shared field and bloom boundary.
  const bloom=isBloom(s);c.save();c.setLineDash([2,7]);c.strokeStyle=bloom?'#a3f4c080':'#d4d79b28';c.lineWidth=1;c.beginPath();c.moveTo(19,283);c.lineTo(401,283);c.moveTo(19,358);c.lineTo(401,358);c.stroke();c.restore();
  text(c,bloom?'R I F T  B L O O M':'T H E  W I L D  R I F T',210,294,9,bloom?'#c3fcd1':'#c6cdb18c');
  for(const n of s.nodes){const alive=n.amount>0,pulse=Math.sin(now*2+n.x)*.08;c.save();c.globalAlpha=alive?.22+pulse:.08;const g=c.createRadialGradient(n.x,n.y,1,n.x,n.y,35);g.addColorStop(0,bloom?'#d4ffe1':'#6ae3b3');g.addColorStop(1,'transparent');c.fillStyle=g;c.fillRect(n.x-35,n.y-35,70,70);c.restore();sprite(c,art,11,n.x,n.y,alive?48:29,false,alive?1:.3);if(!alive)text(c,`${Math.ceil(n.regen)}s`,n.x,n.y+12,9,'#b8bcaa');}
  const entities:(Structure|Unit)[]=[...s.buildings,...s.units];entities.sort((a,b)=>a.y-b.y);
  for(const e of entities){const building='progress'in e;
    if(building){const b=e as Structure;const d=b.kind==='core'?null:DEFS[b.kind];const selected=s.selected===b.id;
      if(selected){c.save();c.strokeStyle='#ecdb9b';c.lineWidth=1.3;c.beginPath();c.ellipse(b.x,b.y+8,31,16,0,0,Math.PI*2);c.stroke();if(b.kind==='spire'||b.kind==='grove'){c.setLineDash([4,6]);c.globalAlpha=.3;c.beginPath();c.arc(b.x,b.y, b.kind==='spire'?140:135,0,Math.PI*2);c.stroke();}c.restore();}
      c.save();c.fillStyle='#06150a50';c.beginPath();c.ellipse(b.x,b.y+12,b.kind==='core'?35:25,10,0,0,Math.PI*2);c.fill();c.restore();
      const size=b.kind==='core'?94:b.kind==='forge'?70:67;sprite(c,art,d?.sprite??0,b.x,b.y-7,size,b.side==='enemy',b.progress<1?.35+b.progress*.5:1);
      if(b.progress<1){c.strokeStyle='#f2d9a0';c.lineWidth=2;c.beginPath();c.arc(b.x,b.y-5,25,-Math.PI/2,-Math.PI/2+Math.max(.02,b.progress)*Math.PI*2);c.stroke();text(c,b.progress===0?'QUEUED':`${Math.round(b.progress*100)}%`,b.x,b.y+26,8,'#ecdab3');}
      else if(b.kind!=='core'){if(b.hp<b.maxHp||selected)health(c,{x:b.x,y:b.y+9},b.hp,b.maxHp,b.side,34);if(b.level>1)text(c,'✦'.repeat(b.level-1),b.x,b.y+28,10,GOLD);if(['portal','forge','roost'].includes(b.kind)){c.fillStyle=b.side==='player'?'#b8ddbc77':'#ee9aab66';c.fillRect(b.x-14,b.y+25,28*Math.min(1,Math.max(0,1-b.cooldown/(b.kind==='portal'?10:b.kind==='forge'?19:12))),2);}}
    }else{const u=e as Unit;const walking=u.action==='Advancing'||u.action==='Hauling'||u.action==='Gathering'||u.action==='Moving';const bob=walking?Math.sin(u.distance*.28)*1.2:Math.sin(now*4+u.id)*.7;const size=u.kind==='keeper'?36:u.kind==='titan'?62:u.kind==='wisp'?35:43;const index=u.kind==='keeper'?8:u.kind==='titan'?6:u.kind==='wisp'?10:9;c.fillStyle='#04110e66';c.beginPath();c.ellipse(u.x,u.y+8,size*.24,5,0,0,Math.PI*2);c.fill();sprite(c,art,index,u.x,u.y-5+bob,size,u.side==='enemy');if(u.hp<u.maxHp)health(c,{x:u.x,y:u.y+3},u.hp,u.maxHp,u.side,23);if(u.kind==='keeper'){c.strokeStyle=u.side==='player'?'#d5edbeaa':'#ee8eacaa';c.lineWidth=1;c.beginPath();c.ellipse(u.x,u.y+8,13,5,0,0,Math.PI*2);c.stroke();if(u.carry>0){c.fillStyle='#16332cdd';rounded(c,u.x+5,u.y-25,24,14,4);c.fill();text(c,String(u.carry),u.x+17,u.y-15,9,'#befbd1');}if(u.action==='Building'){text(c,'✦',u.x+15,u.y-9,15,'#ffe5a0');}}}
  }
  for(const e of s.effects){const a=Math.max(0,e.life/e.total);c.save();c.globalAlpha=a;c.strokeStyle=e.color;c.fillStyle=e.color;if(e.kind==='text'){text(c,e.text??'',e.x,e.y-(1-a)*21,12,e.color);}else if(e.kind==='bolt'&&e.to){c.lineWidth=2;c.shadowColor=e.color;c.shadowBlur=6;c.beginPath();c.moveTo(e.x,e.y);c.lineTo(e.to.x,e.to.y);c.stroke();}else if(e.kind==='ring'){c.lineWidth=2;c.beginPath();c.ellipse(e.x,e.y,(e.radius??38)*(1-a*.7), (e.radius??38)*(1-a*.7)*.65,0,0,Math.PI*2);c.stroke();}else if(e.kind==='hit'){c.fillRect(e.x-2,e.y-8,4,14);c.fillRect(e.x-7,e.y-3,14,4);}else{c.beginPath();c.arc(e.x,e.y,3+(1-a)*6,0,Math.PI*2);c.fill();}c.restore();}
  // Floating embers provide atmosphere without crowding unit silhouettes.
  for(let i=0;i<15;i++){const x=(i*67+now*(i%2?2:-2)+840)%420,y=(i*53-now*5+1280)%640;c.globalAlpha=.13+Math.sin(now+i)*.08;c.fillStyle='#d8edb9';c.fillRect(x,y,1.3,1.3);}c.globalAlpha=1;
  if(input.blueprint&&input.hover!==null){const p=slotPoint('player',input.hover);sprite(c,art,DEFS[input.blueprint].sprite,p.x,p.y-6,67,false,.55);}
  const enemy=core(s,'enemy'),player=core(s,'player');
  // Core health is readable without selecting the building.
  for(const [b,y] of [[enemy,78],[player,632]] as const){const width=90;c.fillStyle='#091c20bb';rounded(c,165,y-4,width,5,2);c.fill();c.fillStyle=b.side==='player'?MINT:'#ee829b';rounded(c,165,y-4,width*Math.max(0,b.hp/b.maxHp),5,2);c.fill();}
}
