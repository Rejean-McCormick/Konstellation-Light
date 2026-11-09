// Read-only semantic navigation projected from *verified* canonical v11 artifacts.
// No inferred edges, no automatic provenance approval, no claim of C1/C2 qualification.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const digest = s => createHash('sha256').update(s).digest('hex');
const relOk = x => typeof x === 'string' && x.startsWith('canon/') &&
  !x.includes('\\') && !x.includes(':') && x.split('/').every(p => p !== '' && p !== '.' && p !== '..');
const isObject = x => x && typeof x === 'object' && !Array.isArray(x);
const inText = (x, max = 600) => typeof x === 'string' && x.length > 0 && x.length <= max && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(x);
const LIMIT = 14 * 1024 * 1024; // A published Zoology v11 graph is slightly over 8 MiB.

export function projectPublicKnowledge(checked, collection) {
  const listed = new Set(checked.files.map(f => f.path));
  const base = path.join(path.resolve(collection), 'kristals', checked.slug);
  function read(rel, max = LIMIT) {
    if (!relOk(rel) || !listed.has(rel)) return null;
    const file = path.join(base, rel);
    const size = fs.statSync(file).size;
    if (size > max) throw Error(`Artefact canonique trop volumineux pour la projection : ${rel}`);
    return fs.readFileSync(file);
  }
  function readJson(rel, max = LIMIT) {
    const b = read(rel, max); return b ? JSON.parse(b.toString('utf8')) : null;
  }
  const stateIndex = readJson('canon/state.index.json', 2 * 1024 * 1024);
  if (!stateIndex || !Array.isArray(stateIndex.canonical_artifacts)) return null;
  const artifacts = stateIndex.canonical_artifacts.filter(x => isObject(x) && relOk(x.path) && listed.has(x.path));
  const graphs = artifacts.filter(x => x.logical_contract?.id === 'kristal.v11.semantic-graph');
  if (!graphs.length) return null; // Native contracts are NOT assumed to be semantic graphs.
  // The state index declares historical and current graph revisions in order;
  // render only the last declared, available graph, never merge incompatible versions.
  const graphPath = graphs.at(-1).path;
  const graph = readJson(graphPath);
  if (!isObject(graph) || graph.artifact_type !== 'kristal_semantic_graph' ||
      !Array.isArray(graph.entities) || !Array.isArray(graph.properties) ||
      !Array.isArray(graph.assertions) || !Array.isArray(graph.sources))
    throw Error(`Contrat du graphe canonique non reconnu : ${graphPath}`);
  // The verified graph bytes are bounded above; apply the navigation budget to
  // the projected nodes/edges instead of raw canonical assertion counts.
  // A graph may declare >10,000 assertions while still projecting within the
  // reader's validated 12,000-node / 12,000-edge limits.
  const dictionaries = artifacts.filter(x => x.logical_contract?.id === 'kristal.v11.dictionary-catalog');
  const labels = new Map(), labelPaths = [];
  // Latest declared dictionary wins. Within a catalogue, a localized label wins
  // over undetermined language. No language translation is invented.
  for (const catArt of dictionaries.toReversed()) {
    const cat = readJson(catArt.path, 1024 * 1024);
    if (!cat || !Array.isArray(cat.languages)) continue;
    const dir = path.posix.dirname(catArt.path);
    const langs = [...cat.languages].sort((a,b) =>
      ({'fr-CA':0,fr:1,en:2,und:3}[a.tag] ?? 4)-({'fr-CA':0,fr:1,en:2,und:3}[b.tag] ?? 4));
    for (const lang of langs) for (const layer of [...(lang.layers || [])].sort((a,b)=>(b.priority||0)-(a.priority||0))) {
      if (typeof layer.path !== 'string' || layer.path.includes('/') || layer.path.includes('\\') || layer.path.startsWith('.')) continue;
      const layerRel = `${dir}/${layer.path}`;
      const raw = read(layerRel, 3 * 1024 * 1024);
      if (!raw) continue;
      // The catalogue's declared digest is independently checked too, when available.
      if (typeof layer.sha256 === 'string' && layer.sha256.replace(/^sha256:/,'') !== digest(raw))
        throw Error(`Dictionnaire différent de son catalogue canonique : ${layerRel}`);
      labelPaths.push(layerRel);
      let rows;
      if (layer.path.endsWith('.jsonl')) rows=raw.toString('utf8').split(/\r?\n/).filter(Boolean).map(line=>JSON.parse(line));
      else if (layer.path.endsWith('.json')) rows=JSON.parse(raw.toString('utf8')).entries;
      else continue;
      if (!Array.isArray(rows)) continue;
      for (const row of rows) {
        if (inText(row?.semantic_id, 180) && inText(row?.preferred_term) && !labels.has(row.semantic_id)) labels.set(row.semantic_id,row.preferred_term);
      }
    }
  }
  const entities = [...new Set(graph.entities.filter(x=>inText(x,180)))];
  const known = new Set(entities);
  const nodes = entities.map(id=>({id,kind:'notion',label:labels.get(id)||id,
    description: labels.has(id) ? `Notion déclarée dans ${graphPath}.` : 'Notion canonique sans libellé disponible dans la surface publiée.'}));
  const relationLabels = {};
  for (const id of graph.properties.filter(x=>inText(x,180))) if(labels.has(id)) relationLabels[id]=labels.get(id);
  const edges = [];
  const sourceSet = new Set(graph.sources.filter(x=>inText(x,180)));
  const referenced = new Set();
  let omitted = 0;
  for (const a of graph.assertions) {
    if (!isObject(a) || !inText(a.id,180) || !inText(a.subject,180) || !inText(a.predicate,180) ||
        !known.has(a.subject) || !isObject(a.object)) { omitted++; continue; }
    let to;
    if (a.object.kind === 'entity' && inText(a.object.id,180) && known.has(a.object.id)) to=a.object.id;
    else if (a.object.kind === 'literal' && (typeof a.object.value === 'string' || typeof a.object.value === 'number' || typeof a.object.value === 'boolean')) {
      const literal=String(a.object.value);
      if (!literal || literal.length > 600 || !inText(literal)) {omitted++;continue;}
      to=`value:${a.id}`;
      if (known.has(to)) {omitted++;continue;}
      known.add(to);
      // Distinguish declared external identifiers from substantive literals.
      // Do not infer a meaning from the identifier's shape or overwrite the actual value.
      const technicalIdentifier = Array.isArray(a.qualifiers) && a.qualifiers.some(q =>
        q?.object?.kind === 'literal' && q.object.value === 'external-id');
      const propertyTerm = labels.get(a.predicate);
      const propertyCode = technicalIdentifier && /^P[1-9]\d{0,8}$/.test(propertyTerm || '') ? propertyTerm : null;
      nodes.push({id:to,kind:'valeur',label:literal,
        ...(technicalIdentifier ? {technical_identifier:true, ...(propertyCode ? {property_code:propertyCode} : {})} : {}),
        description:technicalIdentifier ? 'Identifiant externe déclaré dans une assertion canonique ; valeur exacte dans l’inspecteur.' :
          `Valeur littérale déclarée${inText(a.object.language,20)?' ('+a.object.language+')':''}; type : ${inText(a.object.datatype,70)?a.object.datatype:'non précisé'}.`});
    } else {omitted++;continue;}
    const sources=Array.isArray(a.sources) ? [...new Set(a.sources.filter(x=>inText(x,180)))].slice(0,80) : [];
    sources.forEach(s=>referenced.add(s));
    edges.push({from:a.subject,to,relation:a.predicate,assertion_id:a.id,source_refs:sources});
  }
  if(nodes.length>12000 || edges.length>12000) throw Error('Projection v11 trop importante pour la navigation statique.');
  // Start with human-labeled concepts, then other IDs, then literal values.
  nodes.sort((a,b)=>((a.kind==='valeur')-(b.kind==='valeur')) || ((a.label===a.id)-(b.label===b.id)) || (a.label < b.label ? -1 : a.label > b.label ? 1 : (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)));
  return {nodes,edges,relation_labels:relationLabels,
    knowledge:{graph_path:graphPath,dictionaries:[...new Set(labelPaths)].sort(),
      declared_assertions:graph.assertions.length,displayed_assertions:edges.length,omitted_assertions:omitted,
      declared_sources:sourceSet.size,referenced_sources:referenced.size,
      unlisted_source_references:[...referenced].filter(s=>!sourceSet.has(s)).length,
      graph_versions_omitted:graphs.length-1,
      note:'Projection d’un seul graphe canonique v11. Sources référencées = identifiants déclarés, non sources indépendamment authentifiées.'},
  };
}
