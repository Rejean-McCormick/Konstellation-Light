/* Aperçu local seulement : définitions candidates, jamais promues au rang de textes révisés. */
const SHA = /^sha256:[0-9a-f]{64}$/;
const PATH = /^data\/candidate-[0-9a-f]{64}\.json$/;
const TEXT = x => typeof x === 'string' && x.trim().length && x.length <= 4000 && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(x);
const HEX = bytes => Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('');
async function fingerprint(bytes) {
  if (!globalThis.crypto?.subtle) throw Error('Contrôle SHA-256 indisponible sur cette adresse.');
  return 'sha256:' + HEX(await crypto.subtle.digest('SHA-256', bytes));
}
export function validateCandidateOverlay(document, base, descriptor) {
  if (!document || document.format !== 'konstellation.candidate-visual/1.0' ||
      document.authority !== 'candidate_unreviewed_non_authoritative' ||
      document.slug !== base.slug || document.state_ref !== base.state_ref ||
      document.surface_digest !== base.surface_digest || !Array.isArray(document.entries) ||
      document.entries.length > 12000) throw Error('Données candidates liées à un autre graphe.');
  if (descriptor && (descriptor.state_ref !== base.state_ref || descriptor.surface_digest !== base.surface_digest))
    throw Error('Identité du catalogue des candidats incohérente.');
  const nodes = new Set(base.nodes.map(n=>n.id));
  const edges = new Map((base.edges || []).map(e=>[e.assertion_id,e]));
  const out = new Map();
  const assertions = new Set();
  for (const c of document.entries) {
    if (!c || !nodes.has(c.node_id) || !TEXT(c.text) || c.text.length > 4000 ||
        typeof c.assertion_id !== 'string' || assertions.has(c.assertion_id) ||
        !['candidate_for_display','priority_review'].includes(c.editorial_status) ||
        c.locale !== 'und' || c.reviewed !== false ||
        !Array.isArray(c.source_refs) || !c.source_refs.length || c.source_refs.length > 80 ||
        !c.source_refs.every(s=>typeof s === 'string' && s.length > 0 && s.length < 300) ||
        !Array.isArray(c.quality_flags) || c.quality_flags.length > 30 ||
        !c.quality_flags.every(s=>typeof s === 'string' && s.length < 180))
      throw Error('Définition candidate invalide ou doublon.');
    const edge = edges.get(c.assertion_id);
    if (!edge || edge.from !== c.node_id || edge.relation !== c.predicate_id ||
        edge.to !== c.value_id || JSON.stringify(edge.source_refs) !== JSON.stringify(c.source_refs))
      throw Error('Définition candidate non reliée à une assertion du graphe.');
    assertions.add(c.assertion_id);
    const previous = out.get(c.node_id);
    // Plusieurs assertions possibles pour une notion : privilégier le texte sans alerte.
    if (!previous || (previous.editorial_status === 'priority_review' && c.editorial_status === 'candidate_for_display')) out.set(c.node_id,c);
  }
  return out;
}
let cachedCatalog = null;
async function candidateCatalog() {
  if (cachedCatalog) return cachedCatalog;
  const response = await fetch('./data/candidates-catalog.json', {cache: 'no-store'});
  if (!response.ok) throw Error('Catalogue de l’aperçu des candidats indisponible.');
  const obj = await response.json();
  if (obj.format !== 'konstellation.candidate-catalog/1.0' || obj.publication !== false || !obj.entries || typeof obj.entries !== 'object')
    throw Error('Catalogue de candidats non conforme.');
  cachedCatalog = obj;
  return obj;
}
const cachedPacks = new Map();
export async function loadCandidatePreview(entry, bundle) {
  const catalog = await candidateCatalog();
  const d = catalog.entries[entry.slug];
  if (!d) return {entries:new Map(), error:null};
  if (!d || !PATH.test(d.path) || !SHA.test(d.sha256) ||
      d.path.slice('data/candidate-'.length,-5) !== d.sha256.slice(7) ||
      !Number.isSafeInteger(d.bytes) || d.bytes < 1 || d.bytes > 4*1024*1024)
    throw Error('Chemin ou empreinte des candidats invalide.');
  if (d.state_ref !== bundle.state_ref || d.surface_digest !== bundle.surface_digest)
    throw Error('Candidats rattachés à une autre version du Kristal.');
  if (cachedPacks.has(d.sha256)) return {entries:validateCandidateOverlay(cachedPacks.get(d.sha256),bundle,d),error:null};
  const response = await fetch('./'+d.path,{cache:'no-store'});
  if (!response.ok) throw Error('Fichier de candidats introuvable.');
  const bytes = await response.arrayBuffer();
  if (bytes.byteLength !== d.bytes || await fingerprint(bytes) !== d.sha256)
    throw Error('Empreinte SHA-256 du fichier candidat invalide.');
  const doc = JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
  const entries = validateCandidateOverlay(doc,bundle,d);
  cachedPacks.set(d.sha256,doc);
  return {entries,error:null};
}
const flagLabels = {
  definition_potentiellement_circulaire: 'Définition possiblement circulaire',
  definition_trop_courte: 'Définition très courte',
  definition_generic: 'Définition trop générale',
  definition_repeated: 'Texte répété entre plusieurs notions',
  reused_text_for_distinct_notions: 'Texte identique pour différentes notions'
};
export function appendCandidateView(target, c) {
  if (!c) return;
  const section = document.createElement('section');section.className='candidate-definition';
  const label = document.createElement('strong');label.className='candidate-status';
  label.textContent = c.editorial_status === 'priority_review' ? 'Définition candidate · à revoir en priorité' : 'Définition candidate · non vérifiée';
  const body = document.createElement('p');body.className='candidate-text';body.textContent=c.text;
  const disclaimer = document.createElement('small');disclaimer.className='candidate-disclaimer';
  disclaimer.textContent='Texte extrait du Kristal. Exactitude, langue et validation éditoriale non confirmées.';
  section.append(label,body,disclaimer);
  if (c.quality_flags.length) {
    const flags = document.createElement('ul');flags.className='candidate-flags';
    for (const flag of c.quality_flags.slice(0,8)) {
      const li=document.createElement('li');li.textContent=flagLabels[flag] || flag.replaceAll('_',' ');flags.append(li);
    }
    section.append(flags);
  }
  const technical=document.createElement('details');technical.className='candidate-sources';
  const summary=document.createElement('summary');summary.textContent=`Références de provenance (${c.source_refs.length})`;
  const line=document.createElement('p');line.textContent=c.source_refs.join(' · ');
  technical.append(summary,line);section.append(technical);
  target.append(section);
}
