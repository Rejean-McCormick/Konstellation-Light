// V19 – presentation-only helpers. All links are read from the supplied bundle.
// No generated assertions, inferred concepts or invented relationship labels.
const normalize = v => String(v ?? '').trim();

export function graphCaptionLines(label, maxChars = 25, maxLines = 3) {
  const words = normalize(label).split(/\s+/u).filter(Boolean);
  if (!words.length) return ['Sans intitulé'];
  const lines = [];
  for (const word of words) {
    const pieces = word.match(new RegExp(`.{1,${maxChars}}`, 'gu')) || [word];
    for (const piece of pieces) {
      const last = lines.at(-1);
      if (last && last.length + 1 + piece.length <= maxChars) lines[lines.length-1] = last + ' ' + piece;
      else lines.push(piece);
    }
  }
  if (lines.length <= maxLines) return lines;
  return [...lines.slice(0,maxLines-1), lines.slice(maxLines-1).join(' ').slice(0,maxChars-1).trimEnd() + '…'];
}

export function connectedEntryPoints(nodes, edges, eligible, name, limit = 6) {
  const usable = new Map(nodes.filter(n=>eligible(n)).map(n=>[n.id,n]));
  const adjacent = new Map([...usable.keys()].map(k=>[k,new Set()]));
  for (const edge of edges) {
    if (edge.from===edge.to || !usable.has(edge.from) || !usable.has(edge.to)) continue;
    adjacent.get(edge.from).add(edge.to);
    adjacent.get(edge.to).add(edge.from);
  }
  const sorted = [...usable.values()].filter(n=>adjacent.get(n.id).size)
    .sort((a,b)=>adjacent.get(b.id).size-adjacent.get(a.id).size ||
      name(a).localeCompare(name(b),'fr') || a.id.localeCompare(b.id));
  const covered = new Set(), picks = [];
  // Prefer genuinely different connected neighborhoods, then fill from highest degrees.
  for (const n of sorted) {
    if (picks.length>=limit) break;
    if (covered.has(n.id) && sorted.length>limit) continue;
    picks.push({node:n,degree:adjacent.get(n.id).size});
    covered.add(n.id);
    for (const other of adjacent.get(n.id)) covered.add(other);
  }
  for (const n of sorted) {
    if (picks.length>=limit) break;
    if (!picks.some(p=>p.node.id===n.id)) picks.push({node:n,degree:adjacent.get(n.id).size});
  }
  return picks;
}

export function directNeighborPages(nodes, edges, focus, eligible, name, page=0, pageSize=6, matched=null) {
  const byId = new Map(nodes.map(n=>[n.id,n]));
  const counts = new Map(), relations = new Map(), directions = new Map();
  for (const edge of edges) {
    if (edge.from!==focus && edge.to!==focus) continue;
    const id=edge.from===focus?edge.to:edge.from;
    const node=byId.get(id);
    if (!node || id===focus || !eligible(node) || (matched && !matched.has(id))) continue;
    counts.set(id,(counts.get(id)||0)+1);
    if(!relations.has(id))relations.set(id,edge.relation);
    const direction=edge.from===focus?'sortant':'entrant';
    const previous=directions.get(id);
    directions.set(id,previous && previous!==direction?'mixte':(previous||direction));
  }
  const ordered = [...counts.keys()].sort((a,b)=>counts.get(b)-counts.get(a)||name(byId.get(a)).localeCompare(name(byId.get(b)),'fr')||a.localeCompare(b));
  const size=Math.max(3,Math.min(8,Number(pageSize)||6));
  const pages=Math.max(1,Math.ceil(ordered.length/size));
  const index=Math.max(0,Math.min(pages-1,Math.trunc(Number(page)||0)));
  return {total:ordered.length,pages,page:index,size,items:ordered.slice(index*size,(index+1)*size).map(id=>({node:byId.get(id),relation:relations.get(id),direction:directions.get(id),count:counts.get(id)}))};
}

// A deterministic, non-overlapping two-column layout. Each label has its own
// rectangular area, separated vertically and horizontally from all others.
export function readableMapPositions(n, width=1000, height=720) {
  if(n<0 || n>8)throw Error('Budget lisible dépassé : 8 nœuds par page.');
  const left=Math.ceil(n/2),right=Math.floor(n/2);
  const yPositions=count=>Array.from({length:count},(_,i)=>{
    if(count===1)return height/2;
    if(count===2)return height*.32+i*height*.36;
    return 104+i*(height-208)/(count-1);
  });
  const l=yPositions(left),r=yPositions(right);
  return Array.from({length:n},(_,i)=>{
    const isLeft=i%2===0;
    const y=(isLeft?l:r)[Math.floor(i/2)];
    return {side:isLeft?'left':'right',x:isLeft?285:715,y,boxX:isLeft?12:748,boxY:y-53,boxW:240,boxH:106};
  });
}

export function mapGeometrySafe(positions,width=1000,height=720) {
  const boxes=positions.map(p=>({left:p.boxX,top:p.boxY,right:p.boxX+p.boxW,bottom:p.boxY+p.boxH}));
  for(const b of boxes)if(b.left<0||b.top<0||b.right>width||b.bottom>height)return false;
  for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){
    const a=boxes[i],b=boxes[j];
    if(a.left<b.right && a.right>b.left && a.top<b.bottom && a.bottom>b.top)return false;
  }
  return true;
}
