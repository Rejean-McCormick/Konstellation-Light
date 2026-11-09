// Filter a Québec course pack and its reader graph into the existing Light preview contract.
import { readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';

const { values } = parseArgs({options: {
  pack: {type: 'string'}, graph: {type: 'string'}, out: {type: 'string'}, local: {type: 'string'}
}});
const {pack, graph, out, local} = values;
if (!pack || !graph || !out || local !== 'YES') {
  throw new Error('Prévisualisation locale : --pack FICHIER --graph FICHIER --out FICHIER --local YES.');
}
const load = name => JSON.parse(readFileSync(name, 'utf8').replace(/^\uFEFF/, ''));
const courses = load(pack);
const relations = load(graph);
if (courses.format !== 'ekole.content-pack/0.1' || relations.format !== 'ekole.graph-preview/1') {
  throw new Error('Contrats du pack et du graphe Ekole incompatibles.');
}
const nodes = courses.cours.map(course => ({
  id: course.id, label: course.titre, kind: 'cours',
  description: course.objectif || course.discipline
}));
const ids = new Set(nodes.map(node => node.id));
const edges = relations.relations.map(edge => {
  if (!ids.has(edge.from) || !ids.has(edge.to)) throw new Error('Cours référencé absent du pack.');
  return {from: edge.from, to: edge.to, relation: edge.type};
});
const candidate = {format: 'konstellation.semantic-curation/1.0', visibility: 'local-preview',
                   title: 'Ekole Québec · carte des cours', slug: 'ekole-quebec-cours', nodes, edges};
writeFileSync(out, JSON.stringify(candidate, null, 2) + '\n', {flag: 'wx'});
console.log(nodes.length + ' cours et ' + edges.length + ' relations candidates');
