// Presentation-only compatibility layer, based on Konstellation full 2026-10-17.
// Non-authoritative French presentation dictionary. The original predicates,
// identifiers, provenance, and assertion statuses remain unchanged.
// Unknown Wikidata properties are NOT assigned guessed meanings.
const WIKIDATA_FR = Object.freeze({
  P50: 'Auteur', P921: 'Sujet principal', P1433: 'Publié dans',
  P629: 'Édition ou traduction de', P747: 'Éditions ou traductions',
  P800: 'Œuvre notable', P361: 'Fait partie de', P527: 'Comprend',
  P155: 'Précédé par', P156: 'Suivi par', P1889: 'À distinguer de',
  P170: 'Créateur', P737: 'Influencé par', P144: 'Inspiré de',
  P98: 'Éditeur scientifique', P138: 'Nommé d’après',
  P184: 'Directeur de thèse', P185: 'Étudiant en doctorat',
  P1066: 'A étudié auprès de', P710: 'Participant', P674: 'Personnages',
});
const RELATIONS_FR = Object.freeze({
  decrit:'Décrit',analyse:'Analyse',contextualise:'Met en contexte',
  academicien_sur_liste_publiee: 'Source attestant une inscription sur une liste d’académiciens',
  membre_liste_historique: 'Mention dans une liste historique',
  membre_quinquennat: 'Membre pendant un quinquennat',
  pontificat_recense: 'Pontificat recensé',
  prix_attribue: 'Prix attribué',
  prix_annonce: 'Prix annoncé',
  titre_ecclesial_reconnu: 'Source relative au titre ecclésiastique',
  saintete_reconnue: 'Source relative à la sainteté reconnue',
  historic_author_reference: 'Référence d’auteur historique',
  source_url_recorded: 'Adresse de source répertoriée',
  documented_by: 'Documenté par',
  historic_theme: 'Thème historique',
  has_documented_position: 'Position documentée',
  has_open_research_claim: 'Hypothèse de recherche ouverte',
  candidate_correspondence_from_skope: 'Correspondance proposée (non vérifiée)',
  hypothesized_candidate_qid: 'Identifiant Wikidata proposé (non vérifié)',
  v9_node_kind: 'Type d’élément dans la projection',
});

export function readableCode(text) {
  const raw = String(text ?? '');
  if (/^P[1-9]\d{0,8}$/i.test(raw)) return `Propriété Wikidata ${raw.toUpperCase()} (libellé indisponible)`;
  if (/^Q[1-9]\d{0,12}$/i.test(raw)) return `Élément Wikidata ${raw.toUpperCase()} (libellé indisponible)`;
  return raw.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_:./-]+/g, ' ').replace(/\s+/g, ' ').trim()
    .replace(/^./, c => c.toUpperCase());
}
export function semanticLabel(predicate, { configured = null, rangeKind = '' } = {}) {
  const raw = String(predicate || '');
  // A locally supplied, explicit mapping takes precedence (never reinterpret IDs).
  if (typeof configured === 'string' && configured.trim() && configured !== raw) {
    const value=configured.trim();
    // Old viewer profiles duplicated the opaque property ID in the human label.
    // Do not overwrite an intentional, independently meaningful custom label.
    if (!(WIKIDATA_FR[raw] && value.toUpperCase().endsWith(`(${raw.toUpperCase()})`))) return value;
  }
  if (WIKIDATA_FR[raw]) return WIKIDATA_FR[raw];
  if (RELATIONS_FR[raw]) return RELATIONS_FR[raw];
  return readableCode(raw) || 'Relation sans libellé';
}
// Only normalize known diagnostic prefixes of noncanonical hypothesis titles.
// This is text presentation, not a change of epistemic status or identity.
const HYPOTHESIS_PREFIX = Object.freeze({
  wikidata_identity: 'Identité Wikidata proposée',
  recognition_roster_reference: 'Référence de liste de reconnaissance à vérifier',
  recognition_roster_reference_candidate: 'Référence de liste à vérifier',
  historical_roster_reference: 'Référence historique à vérifier',
});
export function readableNodeLabel(raw, kind='') {
  const label=String(raw ?? '');
  if (/^[PQ][1-9]\d+$/i.test(label)) return readableCode(label);
  if (!['unconfirmed_research_claim','unconfirmed_research_candidate'].includes(kind)) return label;
  const match=/^([a-z][a-z0-9_]+)\s*[·:—]\s*(.+)$/.exec(label);
  const presented = match && HYPOTHESIS_PREFIX[match[1]] ? `${HYPOTHESIS_PREFIX[match[1]]} · ${match[2]}` : label;
  return presented.length <= 300 ? presented : label;
}
export const WIKIDATA_PRESENTATION = WIKIDATA_FR;
export const KNOWN_RELATION_PRESENTATION = RELATIONS_FR;

const STATES_FR = Object.freeze({
  unspecified:'Non précisé', not_evaluated:'Non évalué',
  read_only_local_projection:'Projection locale en lecture seule',
  sourced:'Sourcé', validated:'Validé', disputed:'Contesté',
  hypothesis:'Hypothèse', claimed:'Déclaré', reviewed:'Révisé',
  rejected:'Rejeté', retracted:'Rétracté', superseded:'Remplacé',
  candidate:'Candidat', unverified:'Non vérifié',
});
export function readableStatus(value) {
  const raw=String(value ?? '');
  return STATES_FR[raw] || readableCode(raw) || 'Non précisé';
}

export function normalizeTerm(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[’']/g, ' ').replace(/[_–—-]+/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}
const words = value => normalizeTerm(value).split(' ').filter(Boolean);

// Word-boundary matching prevents `aquin` from matching the suffix of `Joaquín`.
// Spelling tolerance is only used if no stronger matches exist for the query.
export function orientationScore(entity, rawQuery) {
  const q=normalizeTerm(rawQuery);
  if (!q) return 0;
  const label=normalizeTerm(entity?.label);
  const aliases=(entity?.aliases || []).map(normalizeTerm);
  if(label===q) return 180;
  if(aliases.includes(q)) return 170;
  if(label.startsWith(q+' ')) return 155;
  if(words(label).includes(q)) return 150;
  if(aliases.some(a=>words(a).includes(q))) return 145;
  if(q.length>=3 && words(label).some(w=>w.startsWith(q))) return 130;
  if(q.length>=3 && aliases.some(a=>words(a).some(w=>w.startsWith(q)))) return 120;
  if(q.includes(' ') && label.includes(q)) return 115;
  if(q.length>=4 && words(entity?.description).includes(q)) return 45;
  return 0;
}
export function rankOrientation(entities, term, limit=16, preferredType='') {
  const matches=entities.map(entity=>({entity,score:orientationScore(entity,term)})).filter(x=>x.score>0);
  const hasStrong=matches.some(x=>x.score>=115);
  const ordered = matches.filter(x=>!hasStrong || x.score>=115)
    .sort((a,b)=>b.score-a.score ||
      Number(b.entity.type===preferredType)-Number(a.entity.type===preferredType) ||
      a.entity.label.localeCompare(b.entity.label,'fr') || a.entity.id.localeCompare(b.entity.id));
  // Diversify the first page by *visible label*, not by identity. Nothing is
  // merged in the graph or treated as the same person: duplicates remain as
  // distinct results and are considered after the diverse first pass.
  const seen = new Set(), diverse=[], duplicates=[];
  for (const item of ordered) {
    const name=normalizeTerm(item.entity.label);
    if(seen.has(name)) duplicates.push(item);
    else {seen.add(name);diverse.push(item);}
  }
  return diverse.concat(duplicates).slice(0,limit);
}

// Light's local curation search is word-aware; it never joins, changes or merges IDs.
// The canonical assertion list and source labels remain untouched.
export function semanticQueryMatch(entity, rawQuery) {
  const query = normalizeTerm(rawQuery).slice(0, 250);
  if (!query) return true;
  if (orientationScore(entity, query) > 0) return true;
  const aliases = Array.isArray(entity?.aliases) ? entity.aliases.filter(x=>typeof x==='string') : [];
  const corpus = [entity?.label || '', ...aliases, entity?.description || '', entity?.kind || ''];
  const tokens = corpus.flatMap(value => normalizeTerm(value).split(' ').filter(Boolean));
  return query.split(' ').every(term => tokens.some(token =>
    token === term || (term.length >= 3 && token.startsWith(term))));
}

// Public-facing labels. Pure presentation: original titles, IDs, paths and graph
// relations stay byte-for-byte unchanged in the verified static bundle.
const PUBLIC_KRISTALS_FR = Object.freeze({
  accounting:'Comptabilité',aerospace:'Aérospatiale',aging:'Vieillissement',
  ai:'Intelligence artificielle',anthropology:'Anthropologie',astronomy:'Astronomie',
  atmosphere:'Atmosphère',biodiversity:'Biodiversité',biology:'Biologie',botany:'Botanique',
  cartography:'Cartographie',chemistry:'Chimie',civilengineering:'Génie civil',
  climate:'Climat',computing:'Informatique',controlsystems:'Systèmes de contrôle',
  cosmology:'Cosmologie',craft:'Artisanat',cybersecurity:'Cybersécurité',
  data:'Données',demography:'Démographie',development:'Développement',
  disasters:'Catastrophes',earth:'Terre',ecology:'Écologie',economics:'Économie',
  education:'Éducation',electricalengineering:'Génie électrique',
  electronics:'Électronique',energy:'Énergie',engineeringconstraints:'Contraintes d’ingénierie',
  epistemology:'Épistémologie',ethics:'Éthique',evolution:'Évolution',
  foodscience:'Sciences alimentaires',forensics:'Sciences judiciaires',forestry:'Foresterie',
  fungi:'Champignons',genetics:'Génétique',geology:'Géologie',governance:'Gouvernance',
  history:'Histoire',historytech:'Histoire des technologies',homecare:'Soins à domicile',
  humanbody:'Corps humain',hydrology:'Hydrologie',infrastructure:'Infrastructures',
  law:'Droit',linguistics:'Linguistique',literature:'Littérature',logic:'Logique',
  logistics:'Logistique',manufacturing:'Fabrication',materials:'Matériaux',
  mechanicalengineering:'Génie mécanique',media:'Médias',medicine:'Médecine',
  metrology:'Métrologie',microbiology:'Microbiologie',mineralogy:'Minéralogie',
  mythology:'Mythologie',naturalhazards:'Risques naturels',neuroscience:'Neurosciences',
  nutrition:'Nutrition',ocean:'Océans',organizations:'Organisations',
  paleontology:'Paléontologie',pharmacology:'Pharmacologie',philosophy:'Philosophie',
  physics:'Physique',policeops:'Opérations policières','prime-numbers':'Nombres premiers',
  publichealth:'Santé publique',recipes:'Recettes',robotics:'Robotique',
  sociology:'Sociologie',software:'Logiciels',soil:'Sols',solarsystem:'Système solaire',
  standards:'Normes',technology:'Technologies',telecommunications:'Télécommunications',
  theatre:'Théâtre',time:'Temps',transportation:'Transport',urbanism:'Urbanisme',
  veterinary:'Médecine vétérinaire',virology:'Virologie',visualarts:'Arts visuels',
  weather:'Météo',work:'Travail',zoology:'Zoologie',
});
export function publicKristalTitle(slug, originalTitle) {
  return PUBLIC_KRISTALS_FR[String(slug || '').toLowerCase()] || String(originalTitle ?? slug ?? 'Kristal');
}
export function isUnlabeledKnowledge(node) {
  return Boolean(node && node.kind === 'notion' && /^(?:Q[1-9]\d{0,12}|KQ[1-9]\d{0,35})$/i.test(String(node.label || '').trim()));
}
export function publicNodeKind(kind) {
  return ({notion:'Notion',valeur:'Valeur',hosted_state:'Collection',logical_artifact:'Élément',hosted_file:'Fichier',
    person:'Personne',personne:'Personne',lieu:'Lieu',territoire:'Lieu',source:'Source'})[kind] || readableCode(kind || 'Élément');
}
export function publicDescription(raw) {
  const s = String(raw || '').trim();
  if (/^(?:Notion|Valeur|Élément|Fichier) déclaré(?:e)? dans (?:canon|\.kristal)\//i.test(s) ||
      /^canon\/(?:[A-Za-z0-9._-]+\/)*[A-Za-z0-9._-]+\.(?:json|jsonl)$/i.test(s)) return '';
  return s;
}
export function publicRelationLabel(id, configured) {
  const raw=String(id || '');const label=String(configured || '').trim();
  if (label && label !== raw && !/sans libellé/i.test(label) && !/^K[PQAS]\d+\b/i.test(label)) return label;
  if (/^K[PQAS]\d+$/i.test(raw)) return 'Lien déclaré';
  if (/^P[1-9]\d+$/i.test(raw) && !WIKIDATA_FR[raw]) return 'Lien déclaré';
  return semanticLabel(raw) || 'Lien déclaré';
}

// Only a few unambiguous everyday scientific terms are translated. Unknown
// canonical labels remain unchanged; no automatic factual interpretation.
const CONCEPT_FR = Object.freeze({
  Earth:'Terre',Moon:'Lune',Sun:'Soleil',
  'Solar System':'Système solaire','Black hole':'Trou noir',
  Galaxy:'Galaxie',Universe:'Univers',
});
export function publicConceptLabel(label) {
  const original=String(label ?? '');
  return Object.prototype.hasOwnProperty.call(CONCEPT_FR,original) ? CONCEPT_FR[original] : original;
}
