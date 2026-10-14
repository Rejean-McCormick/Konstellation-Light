// Dependency-free, deterministic graph neighborhood selection. Both edge orientations
// are navigable; edge direction is preserved for inspectors and future lenses.
export function clampSatellites(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(3, Math.min(25, Math.round(n))) : 8;
}
export function graphNeighborhood(nodes, edges, focus, budget = 8, queryIds = null) {
  if (!Array.isArray(nodes) || !Array.isArray(edges)) throw Error('Graphe invalide.');
  const byId = new Map(nodes.map(n => [n.id, n]));
  const center = byId.get(focus) || nodes[0];
  if (!center) return { center:null, nodes:[], edges:[], degree:0 };
  const allowed = queryIds instanceof Set ? queryIds : null;
  const candidates = new Map();
  for (const edge of edges) {
    if (edge.from !== center.id && edge.to !== center.id) continue;
    const other = edge.from === center.id ? edge.to : edge.from;
    if (!byId.has(other) || other === center.id || (allowed && !allowed.has(other))) continue;
    candidates.set(other, (candidates.get(other) || 0) + 1);
  }
  const sorted = [...candidates].sort((a,b) => b[1]-a[1] || String(byId.get(a[0]).label).localeCompare(String(byId.get(b[0]).label), 'fr') || a[0].localeCompare(b[0]));
  const picked = sorted.slice(0,clampSatellites(budget)).map(([id])=>byId.get(id));
  const idSet = new Set([center.id, ...picked.map(n=>n.id)]);
  return { center, nodes:[center,...picked], edges:edges.filter(e=>idSet.has(e.from)&&idSet.has(e.to)), degree:sorted.length };
}
export function navigationPath(path, next, limit = 30) {
  if (!next || typeof next !== 'string') return [...path];
  if (path.at(-1)===next) return [...path];
  return [...path.slice(-(limit-1)),next];
}


// Build once per render rather than scanning the entire edge list for each hover.
export function buildNeighborIndex(nodes, edges) {
  const byId = new Map(nodes.map(n => [n.id, n]));
  const adjacent = new Map([...byId.keys()].map(id => [id, new Map()]));
  for (const e of edges) {
    if (!byId.has(e.from) || !byId.has(e.to) || e.from === e.to) continue;
    adjacent.get(e.from).set(e.to, (adjacent.get(e.from).get(e.to) || 0) + 1);
    adjacent.get(e.to).set(e.from, (adjacent.get(e.to).get(e.from) || 0) + 1);
  }
  return { byId, adjacent };
}
export function previewNeighbors(index, focus, excludedIds = [], limit = 6) {
  const excluded = new Set([focus, ...excludedIds]);
  return [...(index.adjacent.get(focus) || [])]
    .filter(([id]) => !excluded.has(id))
    .sort((a, b) => b[1] - a[1] ||
      String(index.byId.get(a[0]).label).localeCompare(String(index.byId.get(b[0]).label), 'fr') ||
      a[0].localeCompare(b[0]))
    .slice(0, Math.max(0, Math.min(6, limit)))
    .map(([id]) => index.byId.get(id));
}
