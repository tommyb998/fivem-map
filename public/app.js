// GTA V community-hosted tiles. Map artwork belongs to Rockstar Games.
// To use your own licensed map, set MAP_IMAGE_URL to '/map.jpg'.
const MAP_IMAGE_URL=null;
const TILE_BASE='https://viruxe.github.io/gtav-map-tiles/atlas/3/';
const W=2048, H=2048, $=id=>document.getElementById(id), svgNS='http://www.w3.org/2000/svg';
const socket=io(),viewport=$('viewport'),world=$('world'),overlay=$('overlay');
let planId=null,items=[],tool='pan',scale=.34,offsetX=0,offsetY=0,gesture=null,undoStack=[],remote=false,saveTimer=null;
const bg=$('mapBackground');
if(MAP_IMAGE_URL){const img=new Image();img.onload=()=>{bg.style.backgroundImage=`url("${MAP_IMAGE_URL}")`;bg.style.backgroundSize='100% 100%';bg.querySelector('.placeholder')?.remove();};img.src=MAP_IMAGE_URL;}
else {
  bg.querySelector('.placeholder')?.remove();
  // Zoom 3 is an 8 x 8 tile grid: 8 * 256 = 2048px.
  for(let y=0;y<8;y++)for(let x=0;x<8;x++){
    const tile=document.createElement('img');tile.src=`${TILE_BASE}${x}-${y}.webp`;
    tile.alt='';tile.draggable=false;tile.loading='eager';
    Object.assign(tile.style,{position:'absolute',left:`${x*256}px`,top:`${y*256}px`,width:'256px',height:'256px',pointerEvents:'none'});
    bg.append(tile);
  }
}
function transform(){world.style.transform=`translate(${offsetX}px,${offsetY}px) scale(${scale})`;}
function reset(){scale=Math.min(viewport.clientWidth/W,viewport.clientHeight/H)*.96;offsetX=-W*scale/2;offsetY=-H*scale/2;transform();}
function point(e){const r=viewport.getBoundingClientRect();return {x:Math.max(0,Math.min(W,(e.clientX-r.left-r.width/2-offsetX)/scale)),y:Math.max(0,Math.min(H,(e.clientY-r.top-r.height/2-offsetY)/scale))};}
function node(tag,attrs={}){const el=document.createElementNS(svgNS,tag);Object.entries(attrs).forEach(([k,v])=>el.setAttribute(k,v));return el;}
function draw(){overlay.replaceChildren();items.forEach((it,index)=>{let el;if(it.type==='marker'){const g=node('g');g.append(node('circle',{cx:it.x,cy:it.y,r:13,fill:it.color,stroke:'#06151c','stroke-width':3}),node('text',{x:it.x+20,y:it.y+5,fill:'#fff','font-size':23,'font-weight':'bold',stroke:'#10202a','stroke-width':3,'paint-order':'stroke'}));g.lastChild.textContent=it.label||'Marker';el=g;}else if(it.type==='pen'||it.type==='line'){el=node('polyline',{points:it.points.map(p=>`${p.x},${p.y}`).join(' '),fill:'none',stroke:it.color,'stroke-width':it.width,'stroke-linecap':'round','stroke-linejoin':'round'});}else if(it.type==='circle'){el=node('ellipse',{cx:(it.x+it.x2)/2,cy:(it.y+it.y2)/2,rx:Math.abs(it.x2-it.x)/2,ry:Math.abs(it.y2-it.y)/2,fill:it.color,'fill-opacity':'.13',stroke:it.color,'stroke-width':it.width});}if(el){el.dataset.index=index;overlay.append(el);}});}
function snapshot(){undoStack.push(JSON.stringify(items));if(undoStack.length>50)undoStack.shift();}
function changed(){draw();if(!planId)return;socket.emit('plan:live',{id:planId,name:$('planName').value,content:{items}});$('saveStatus').textContent='Unsaved changes';clearTimeout(saveTimer);saveTimer=setTimeout(save,800);}
async function save(){if(!planId)return;const id=planId;try{const res=await fetch('/api/plans/'+id,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:$('planName').value||'Untitled operation',content:{items}})});if(!res.ok)throw Error('Save failed');if(planId===id)$('saveStatus').textContent='Saved ✓';await listPlans();}catch(e){$('saveStatus').textContent='Save failed — retry';}}
async function listPlans(){try{const res=await fetch('/api/plans');if(!res.ok)throw Error();const plans=await res.json();$('plans').replaceChildren();for(const p of plans){const b=document.createElement('button');b.className='plan'+(p.id===planId?' active':'');b.textContent=p.name;b.onclick=()=>load(p.id);$('plans').append(b);}}catch(e){$('saveStatus').textContent='Server unavailable';}}
async function load(id){clearTimeout(saveTimer);try{const res=await fetch('/api/plans/'+id);if(!res.ok)throw Error();const p=await res.json();planId=id;items=p.content.items;$('planName').value=p.name;$('current').textContent=p.name;$('saveStatus').textContent='Loaded';undoStack=[];socket.emit('join',id);draw();await listPlans();}catch(e){alert('Could not load plan');}}
function makeId(){return (crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2)).replace(/-/g,'').slice(0,48);}
$('newPlan').onclick=async()=>{const name=prompt('Operation name','New operation');if(name===null)return;const id=makeId();const res=await fetch('/api/plans/'+id,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:name.trim()||'New operation',content:{items:[]}})});if(res.ok)await load(id);};
$('save').onclick=save;$('delete').onclick=async()=>{if(!planId||!confirm('Delete this operation for EVERYONE?'))return;await fetch('/api/plans/'+planId,{method:'DELETE'});planId=null;items=[];$('current').textContent='No operation selected';$('planName').value='';draw();await listPlans();};
$('undo').onclick=()=>{if(!undoStack.length)return;items=JSON.parse(undoStack.pop());changed();};$('planName').onchange=changed;
document.querySelectorAll('[data-tool]').forEach(b=>b.onclick=()=>{tool=b.dataset.tool;document.querySelectorAll('[data-tool]').forEach(x=>x.classList.toggle('selected',x===b));});
viewport.addEventListener('pointerdown',e=>{if(!planId)return;viewport.setPointerCapture(e.pointerId);const p=point(e);gesture={start:p,last:p,startX:e.clientX,startY:e.clientY,oldX:offsetX,oldY:offsetY};if(tool==='pan')return;if(tool==='erase'){const target=e.target.closest('[data-index]');if(target){snapshot();items.splice(+target.dataset.index,1);changed();}return;}snapshot();const color=$('color').value,width=+$('width').value;if(tool==='marker'){items.push({type:'marker',...p,color,label:$('markerLabel').value});changed();gesture=null;}else if(tool==='pen'||tool==='line'){items.push({type:tool,points:[p,p],color,width});changed();}else if(tool==='circle'){items.push({type:'circle',x:p.x,y:p.y,x2:p.x,y2:p.y,color,width});changed();}});
viewport.addEventListener('pointermove',e=>{if(!gesture)return;const p=point(e);if(tool==='pan'){offsetX=gesture.oldX+(e.clientX-gesture.startX);offsetY=gesture.oldY+(e.clientY-gesture.startY);transform();return;}const it=items.at(-1);if(!it)return;if(tool==='pen')it.points.push(p);if(tool==='line')it.points[it.points.length-1]=p;if(tool==='circle'){it.x2=p.x;it.y2=p.y;}draw();});
viewport.addEventListener('pointerup',()=>{if(gesture&&tool!=='pan'&&tool!=='erase'&&tool!=='marker')changed();gesture=null;});
viewport.addEventListener('wheel',e=>{e.preventDefault();const before=point(e),factor=e.deltaY<0?1.12:1/1.12;scale=Math.max(.1,Math.min(5,scale*factor));const r=viewport.getBoundingClientRect();offsetX=e.clientX-r.left-r.width/2-before.x*scale;offsetY=e.clientY-r.top-r.height/2-before.y*scale;transform();},{passive:false});
$('zoomIn').onclick=()=>{scale=Math.min(5,scale*1.25);transform();};$('zoomOut').onclick=()=>{scale=Math.max(.1,scale/1.25);transform();};$('reset').onclick=reset;
socket.on('connect',()=>{$('status').textContent='● Connected';if(planId)socket.emit('join',planId);});socket.on('disconnect',()=>{$('status').textContent='● Offline';});socket.on('plans:changed',()=>listPlans());socket.on('plan:live',data=>{if(data.id!==planId)return;items=data.content.items;draw();$('saveStatus').textContent='Live update received';});
window.addEventListener('resize',()=>{if(!planId)reset();});reset();listPlans();
