const $ = (id) => document.getElementById(id);
const routerCountInput = $("routerCount");
let routerCount = Number(routerCountInput.value);
let edges = [];
let positions = [];
let result = null;
let packetTimer = null;
let packetIndex = 0;
let packetRunning = false;
let packetPaused = false;
let dijkstraSteps = [];
let stepIndex = 0;
let currentSource = 0;
let currentDestination = 5;
let packetProgress = 0;

const svgNS = "http://www.w3.org/2000/svg";
const sampleEdges = [
  [0,1,4],[0,2,2],[1,2,1],[1,3,5],[2,3,8],[2,4,10],[3,4,2],[3,5,6],[4,5,3]
];

function routerName(i){ return String.fromCharCode(65+i); }
function log(message, type="normal"){
  const row = document.createElement("div");
  row.className = "log-entry" + (type === "muted" ? " muted" : "");
  const dot = document.createElement("span"); dot.className = "log-bullet";
  const p = document.createElement("p"); p.textContent = message;
  const time = document.createElement("time"); time.textContent = new Date().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit",second:"2-digit"});
  row.append(dot,p,time); $("activityLog").prepend(row);
}
function makeSvg(tag, attrs={}){
  const el = document.createElementNS(svgNS, tag);
  Object.entries(attrs).forEach(([k,v])=>el.setAttribute(k,v));
  return el;
}
function getEdge(a,b){ return edges.find(e=>(e.a===a&&e.b===b)||(e.a===b&&e.b===a)); }
function calculatePositions(){
  positions = [];
  const cx=400, cy=220, rx=300, ry=155;
  for(let i=0;i<routerCount;i++){
    const angle=(-Math.PI/2)+(2*Math.PI*i/routerCount);
    positions.push({x:cx+Math.cos(angle)*rx,y:cy+Math.sin(angle)*ry});
  }
}
function renderGraph(){
  calculatePositions();
  const svg=$("networkSvg"); svg.replaceChildren();
  const pathEdges = new Set();
  if(result && result.path){
    for(let i=0;i<result.path.length-1;i++) pathEdges.add([result.path[i],result.path[i+1]].sort((a,b)=>a-b).join("-"));
  }
  edges.forEach(edge=>{
    const p1=positions[edge.a], p2=positions[edge.b];
    const key=[edge.a,edge.b].sort((a,b)=>a-b).join("-");
    const line=makeSvg("line",{x1:p1.x,y1:p1.y,x2:p2.x,y2:p2.y,class:"edge-line"+(pathEdges.has(key)?" path":"")});
    svg.appendChild(line);
    const mx=(p1.x+p2.x)/2, my=(p1.y+p2.y)/2;
    const label=makeSvg("text",{x:mx,y:my-8,"text-anchor":"middle",class:"edge-cost-label"});
    label.textContent=edge.cost; svg.appendChild(label);
  });
  for(let i=0;i<routerCount;i++){
    const p=positions[i];
    const group=makeSvg("g",{class:"router-node"+(result?.visited?.includes(i)?" visited":"")+(i===currentSource?" source":"")+(i===currentDestination?" destination":"")+(result?.active===i?" active":"")+(result?.packetAt===i?" packet-here":"")});
    const circle=makeSvg("circle",{cx:p.x,cy:p.y,r:22,class:"router-circle"});
    const letter=makeSvg("text",{x:p.x,y:p.y,class:"router-letter"});letter.textContent=routerName(i);
    const caption=makeSvg("text",{x:p.x,y:p.y+37,class:"router-caption"});caption.textContent=i===currentSource?"SOURCE":i===currentDestination?"DESTINATION":"ROUTER";
    group.append(circle,letter,caption);
    group.addEventListener("click",()=>{
      if(!window.confirm(`Set Router ${routerName(i)} as the source? Press Cancel to keep current source.`)) {
        currentDestination=i; $("destinationSelect").value=String(i);
        resetSimulation(false); renderGraph(); return;
      }
      currentSource=i; $("sourceSelect").value=String(i); resetSimulation(false); renderGraph();
    });
    svg.appendChild(group);
  }
  if(packetRunning && result?.path && result.path.length>1){
    const from=positions[result.path[Math.max(0,packetIndex-1)]], to=positions[result.path[packetIndex]];
    if(from&&to){
      const t=packetProgress;
      const dot=makeSvg("circle",{cx:from.x+(to.x-from.x)*t,cy:from.y+(to.y-from.y)*t,r:7,class:"packet-dot"});
      svg.appendChild(dot);
    }
  }
  $("routerStat").textContent=routerCount;
  $("connectionStat").textContent=edges.length;
  $("edgeCount").textContent=edges.length;
  $("hopsStat").textContent=result?.path?Math.max(0,result.path.length-1):"—";
}
function populateSelect(select, selected=0){
  const previous=Number(select.value);
  select.replaceChildren();
  for(let i=0;i<routerCount;i++){
    const option=document.createElement("option");option.value=i;option.textContent=`Router ${routerName(i)}`;select.appendChild(option);
  }
  select.value=String(Math.min(Number.isFinite(previous)?previous:selected,routerCount-1));
}
function refreshSelects(){
  [ $("sourceSelect"),$("destinationSelect"),$("edgeFrom"),$("edgeTo") ].forEach((s,i)=>populateSelect(s,[currentSource,currentDestination,0,1][i]));
  $("sourceSelect").value=String(currentSource);$("destinationSelect").value=String(currentDestination);
}
function renderEdges(){
  const list=$("edgeList");list.replaceChildren();
  if(!edges.length){const empty=document.createElement("div");empty.className="empty-edges";empty.textContent="No connections yet. Add one above.";list.appendChild(empty);return;}
  edges.forEach((edge,index)=>{
    const row=document.createElement("div");row.className="edge-row";
    const pair=document.createElement("span");pair.className="edge-pair";pair.textContent=`${routerName(edge.a)} ↔ ${routerName(edge.b)}`;
    const cost=document.createElement("span");cost.className="edge-cost";cost.textContent=`cost ${edge.cost}`;
    const remove=document.createElement("button");remove.className="remove-edge";remove.title="Remove connection";remove.textContent="×";
    remove.addEventListener("click",()=>{edges.splice(index,1);resetSimulation(false);renderEdges();renderGraph();log(`Removed connection ${routerName(edge.a)} ↔ ${routerName(edge.b)}.`);});
    row.append(pair,cost,remove);list.appendChild(row);
  });
}
function setGraphMessage(message){$("graphMessage").textContent=message;}
function runDijkstra(source,destination){
  const dist=Array(routerCount).fill(Infinity),prev=Array(routerCount).fill(-1),visited=Array(routerCount).fill(false);
  const steps=[];
  dist[source]=0;
  // Small binary heap implementation, sorted by distance for clarity.
  const pq=[[0,source]];
  while(pq.length){
    pq.sort((a,b)=>a[0]-b[0]);
    const [cost,current]=pq.shift();
    steps.push({type:"process",router:current,cost,dist:[...dist],visited:[...visited]});
    if(visited[current]) continue;
    visited[current]=true;
    for(let next=0;next<routerCount;next++){
      const edge=getEdge(current,next);
      if(!edge) continue;
      const candidate=dist[current]+edge.cost;
      if(candidate<dist[next]){
        dist[next]=candidate;prev[next]=current;
        pq.push([candidate,next]);
        steps.push({type:"update",router:next,from:current,cost:candidate,dist:[...dist],visited:[...visited]});
      }
    }
  }
  if(!Number.isFinite(dist[destination])) return {path:null,dist,prev,visited:visited.map((v,i)=>v?i:-1).filter(i=>i>=0),steps};
  const path=[];for(let cur=destination;cur!==-1;cur=prev[cur])path.push(cur);path.reverse();
  return {path,cost:dist[destination],dist,prev,visited:visited.map((v,i)=>v?i:-1).filter(i=>i>=0),steps};
}
function showRoute(){
  const display=$("routeDisplay");display.replaceChildren();
  if(!result?.path){display.className="route-display empty-state";display.textContent="No route exists between these routers.";return;}
  display.className="route-display";
  result.path.forEach((router,i)=>{
    if(i){const arrow=document.createElement("span");arrow.className="route-arrow";arrow.textContent="→";display.appendChild(arrow);}
    const node=document.createElement("span");node.className="route-node";node.textContent=routerName(router);node.title=`Router ${routerName(router)}`;display.appendChild(node);
  });
}
function calculate(){
  stopPacket();
  currentSource=Number($("sourceSelect").value);currentDestination=Number($("destinationSelect").value);
  result=runDijkstra(currentSource,currentDestination);dijkstraSteps=result.steps;stepIndex=0;
  $("sendBtn").disabled=!result.path;
  $("stepBtn").disabled=!result.path;
  $("totalCost").textContent=result.path?result.cost:"∞";
  $("visitedCount").textContent=result.visited.length;
  $("packetStatus").textContent="Route ready";
  $("algorithmState").textContent="CALCULATED";
  $("progressBar").style.width="0%";$("progressPercent").textContent="0%";$("progressText").textContent="Route calculated; packet not sent.";
  showRoute();renderGraph();
  if(result.path){
    setGraphMessage(`Shortest route: ${result.path.map(routerName).join(" → ")} | Total cost: ${result.cost}`);
    log(`Shortest path found: ${result.path.map(routerName).join(" → ")}. Total cost ${result.cost}.`);
    log(`Dijkstra processed ${result.visited.length} reachable router(s).`,"muted");
  }else{
    setGraphMessage(`No route from ${routerName(currentSource)} to ${routerName(currentDestination)}.`);
    log(`No route available between ${routerName(currentSource)} and ${routerName(currentDestination)}.`); 
  }
}
function resetSimulation(writeLog=true){
  stopPacket();result=null;dijkstraSteps=[];stepIndex=0;packetIndex=0;packetProgress=0;
  $("sendBtn").disabled=true;$("stepBtn").disabled=true;$("totalCost").textContent="—";$("visitedCount").textContent="—";$("hopsStat").textContent="—";
  $("packetStatus").textContent="Ready";$("algorithmState").textContent="READY";$("progressBar").style.width="0%";$("progressPercent").textContent="0%";$("progressText").textContent="No packet in transit";
  $("routeDisplay").className="route-display empty-state";$("routeDisplay").textContent="Calculate a route to see the result.";
  setGraphMessage("Choose a source and destination, then calculate the route.");renderGraph();
  if(writeLog)log("Simulation reset.","muted");
}
function stopPacket(){if(packetTimer){clearInterval(packetTimer);packetTimer=null;}packetRunning=false;packetPaused=false;}
function sendPacket(){
  if(!result?.path)return;
  stopPacket();packetIndex=0;packetProgress=0;packetRunning=true;
  result.packetAt=result.path[0];$("packetStatus").textContent="In transit";$("algorithmState").textContent="TRANSMITTING";
  $("progressText").textContent=`Packet at Router ${routerName(result.path[0])}`;$("progressBar").style.width="0%";$("progressPercent").textContent="0%";
  log(`Packet created at source Router ${routerName(result.path[0])}.`);
  renderGraph();
  if(result.path.length===1){completePacket();return;}
  packetTimer=setInterval(()=>{
    if(!packetRunning||!result)return;
    packetProgress+=0.04;
    if(packetProgress>=1){
      packetProgress=0;packetIndex++;
      result.packetAt=result.path[packetIndex];
      const percent=Math.round(packetIndex/(result.path.length-1)*100);
      $("progressBar").style.width=percent+"%";$("progressPercent").textContent=percent+"%";
      $("progressText").textContent=`Packet reached Router ${routerName(result.packetAt)}`;
      log(`Packet reached Router ${routerName(result.packetAt)}.`);
      if(packetIndex>=result.path.length-1){renderGraph();completePacket();return;}
    }
    renderGraph();
  },45);
}
function completePacket(){
  stopPacket();
  if(result)result.packetAt=result.path[result.path.length-1];
  $("packetStatus").textContent="Delivered";$("algorithmState").textContent="DELIVERED";$("progressBar").style.width="100%";$("progressPercent").textContent="100%";$("progressText").textContent="Packet delivered successfully!";
  renderGraph();log("Packet delivered successfully!","normal");
}
function stepPacket(){
  if(!result?.path)return;
  if(!packetRunning){packetRunning=true;packetIndex=0;result.packetAt=result.path[0];$("packetStatus").textContent="Stepping";$("algorithmState").textContent="STEPPING";log(`Packet positioned at Router ${routerName(result.path[0])}.`);}
  else if(packetIndex<result.path.length-1){packetIndex++;result.packetAt=result.path[packetIndex];log(`Packet stepped to Router ${routerName(result.packetAt)}.`);}
  const percent=result.path.length===1?100:Math.round(packetIndex/(result.path.length-1)*100);
  $("progressBar").style.width=percent+"%";$("progressPercent").textContent=percent+"%";$("progressText").textContent=packetIndex===result.path.length-1?"Packet delivered successfully!":`Packet at Router ${routerName(result.packetAt)}`;renderGraph();
  if(packetIndex>=result.path.length-1)completePacket();
}
function loadSample(){
  routerCount=6;routerCountInput.value=6;$("routerCountLabel").textContent="6";
  edges=sampleEdges.map(([a,b,cost])=>({a,b,cost}));
  currentSource=0;currentDestination=5;refreshSelects();resetSimulation(false);renderEdges();renderGraph();
  log("Sample network loaded with six routers.","muted");
}
$("routerCount").addEventListener("input",()=>{
  routerCount=Number(routerCountInput.value);$("routerCountLabel").textContent=routerCount;
  edges=edges.filter(e=>e.a<routerCount&&e.b<routerCount);
  currentSource=Math.min(currentSource,routerCount-1);currentDestination=Math.min(currentDestination,routerCount-1);
  if(currentSource===currentDestination)currentDestination=(currentSource+1)%routerCount;
  refreshSelects();resetSimulation(false);renderEdges();renderGraph();
});
$("sourceSelect").addEventListener("change",()=>{currentSource=Number($("sourceSelect").value);resetSimulation(false);});
$("destinationSelect").addEventListener("change",()=>{currentDestination=Number($("destinationSelect").value);resetSimulation(false);});
$("addEdgeBtn").addEventListener("click",()=>{
  const a=Number($("edgeFrom").value),b=Number($("edgeTo").value),cost=Number($("edgeCost").value);
  if(a===b){alert("Choose two different routers.");return;}
  if(!Number.isInteger(cost)||cost<0||cost>999){alert("Enter a whole-number cost from 0 to 999.");return;}
  if(getEdge(a,b)){alert("That connection already exists. Remove it first if you want to change its cost.");return;}
  edges.push({a,b,cost});resetSimulation(false);renderEdges();renderGraph();log(`Added connection ${routerName(a)} ↔ ${routerName(b)} with cost ${cost}.`);
});
$("calculateBtn").addEventListener("click",calculate);
$("sendBtn").addEventListener("click",sendPacket);
$("stepBtn").addEventListener("click",stepPacket);
$("resetBtn").addEventListener("click",()=>resetSimulation());
$("sampleBtn").addEventListener("click",loadSample);
$("clearBtn").addEventListener("click",()=>{edges=[];resetSimulation(false);renderEdges();renderGraph();log("All connections cleared.","muted");});
$("clearLogBtn").addEventListener("click",()=>{$("activityLog").replaceChildren();log("Activity log cleared.","muted");});

// Start with a ready-to-use sample topology.
loadSample();
