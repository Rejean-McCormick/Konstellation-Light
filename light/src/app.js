import {clampSatellites, graphNeighborhood, navigationPath, buildNeighborIndex, previewNeighbors, readableKnowledgeEdges, connectedEntry, secondaryRing} from './graph-core.mjs';
import {portraitFor, orbitPreview} from './profile.mjs';
import {semanticLabel, readableNodeLabel, semanticQueryMatch, publicKristalTitle, isUnlabeledKnowledge, publicNodeKind, publicDescription, publicRelationLabel, isMachineRelationLabel, publicConceptLabel, publicReaderLabel, publicReaderDescription, isOpaqueReaderText, isNamedForReader, readerKnowledgeSummary, defaultReaderLens, readerPreferredFocus, readerDocumentGroups, readerDocumentMap, readerDocumentCategory, readerConnectedNamedFocus, readableDocumentTitle, readerMediaCategory, readerMediaGroups, isReaderMachineValue, isReaderPredicateCode} from './semantic-display.mjs';
import {validateLocalization, validateLocaleDescriptor, localizationMap, relationLocalizationMap} from './multilingual-read.mjs';
// Konstellation Light: same-origin, dependency-free reader of build-verified derived bundles.
// All untrusted labels are inserted with textContent; no semantic authority is inferred.
const $ = (id) => document.getElementById(id);
const element = (tag, className, content) => {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (content !== undefined) e.textContent = String(content);
  return e;
};
const svgElement = (tag, attributes = {}) => {
  const e = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [name, value] of Object.entries(attributes)) e.setAttribute(name, String(value));
  return e;
};
const short = (s, n = 34) => String(s).length > n ? `${String(s).slice(0, n - 1)}…` : String(s);
// Human-readable labels are ONLY a rendering function; node IDs and predicates are unchanged.
const isKnowledge = () => state.bundle?.view_kind === 'derived-public-knowledge';
const isReferenceOrMachineValue=n=>Boolean(readerMediaCategory(n)||isReaderMachineValue(n));
const displayNode = n => {
  if(isKnowledge() && isReferenceOrMachineValue(n)) return publicReaderLabel(n,{viewKind:state.bundle?.view_kind});
  const ordinal=state.nodeOrdinal?.get(n.id) || 0;
  const localizedLabel=state.localized?.get(n.id)?.label;
  if (state.bundle?.view_kind==='derived-public-knowledge' &&
      (n.technical_identifier || isUnlabeledKnowledge(n) || isOpaqueReaderText(n.label) ||
        (state.locale && !localizedLabel))) {
    const noun=n.kind==='valeur'?'Valeur':'Notion';
    return `${noun} ${state.locale?'non traduite':'sans intitulé'} · n° ${ordinal}`;
  }
  return publicReaderLabel(n, {localizedLabel,viewKind:state.bundle?.view_kind,
    ordinal,requireReviewed:Boolean(state.locale)});
};
const displayDescription = n => state.locale && !state.localized?.get(n.id)?.definition ? '' : publicReaderDescription(state.localized?.get(n.id)?.definition || n.description);
const isUnnamedForVisitor=n=>Boolean(n && !n.technical_identifier && ((isUnlabeledKnowledge(n)||isOpaqueReaderText(n.label))&&!state.localized?.get(n.id)?.label || (state.locale&&!state.localized?.get(n.id)?.label)));
const displayRelation = relation => {
  const localized=state.localizedRelations?.get(relation)?.label;
  if(localized && !isMachineRelationLabel(localized) && !isReaderPredicateCode(localized))return localized;
  if(state.locale)return 'Relation non traduite';
  if(state.bundle?.view_kind==='derived-hosting-navigation')return ({has_member:'Comprend',lists_file:'Contient'})[relation]||'Lien de collection';
  const readable=publicRelationLabel(relation,isKnowledge()?state.bundle.relation_labels?.[relation]:null);
  return isReaderPredicateCode(readable)?'Lien déclaré':readable;
};
const state = { catalog: null, bundle: null, selection: null, query: '', lens: 'constellation', slug: null, revision: null, embed: false, page: 0, satellites:8, history: [], portraitId: null, showUnnamed:false, autoFocus:false, autoLens:true, docCategory:null, locale:null, localized:null, localizedRelations:null, localeCache:new Map(), nodeOrdinal:new Map() };
let toastTimeout;
let portraitOpener = null;
function notify(message) { const t = $('toast'); t.textContent = message; t.hidden = false; clearTimeout(toastTimeout); toastTimeout = setTimeout(() => t.hidden = true, 3300); }
function urlState() {
  const p = new URLSearchParams(location.search);
  p.set('k', state.slug || ''); p.set('r', state.revision || ''); p.set('lens', state.lens); p.set('n', String(state.satellites));
  if (state.selection) p.set('focus', state.selection); else p.delete('focus');
  if (state.query) p.set('q', state.query); else p.delete('q');
  if (state.showUnnamed) p.set('ids','1'); else p.delete('ids');
  if(state.bundle?.view_kind==='derived-hosting-navigation' && state.docCategory)p.set('cat',state.docCategory);
  else p.delete('cat');
  if(state.locale)p.set('lang',state.locale);else p.delete('lang');
  if (state.embed) p.set('embed', '1'); else p.delete('embed');
  history.replaceState(null, '', `${location.pathname}?${p.toString()}${location.hash}`);
  const full = new URL(location.href); full.searchParams.delete('embed');
  $('open-full').href = full.toString();
}
function existingRevisions(slug) { return state.catalog.entries.filter(x => x.slug === slug); }
function lookup(slug, rev) { return state.catalog.entries.find(x => x.slug === slug && x.revision === rev); }
async function sha256(bytes) {
  if (!globalThis.crypto?.subtle) throw Error('WebCrypto requis (HTTPS ou localhost).');
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(x => x.toString(16).padStart(2, '0')).join('');
}
async function loadPack(entry) {
  if (!/^data\/pack-[a-f0-9]{64}\.json$/.test(entry.path) || !/^sha256:[a-f0-9]{64}$/.test(entry.sha256)) throw Error('Chemin ou empreinte de bundle invalide.');
  let response;
  // Read on localhost without relying on previous offline service-worker caches.
  // Retry only transport failures, never integrity/format failures.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      response = await fetch(`./${entry.path}${attempt ? '?retry=1' : ''}`, { cache: 'no-store' });
      break;
    } catch (error) {
      if (attempt === 1) throw Error('Connexion au serveur local interrompue. Relancer Konstellation Light et actualiser la page (Ctrl + Maj + R).');
      await new Promise(resolve => setTimeout(resolve, 250));
    }
  }
  if (!response.ok) throw Error(`Bundle indisponible : HTTP ${response.status}. Relancer « Explorer mes Kristals publics » pour reconstruire le site local.`);
  const bytes = await response.arrayBuffer();
  if (bytes.byteLength > 8 * 1024 * 1024 || bytes.byteLength !== entry.bytes) throw Error('Taille du bundle incorrecte.');
  if (`sha256:${await sha256(bytes)}` !== entry.sha256) throw Error('Échec de contrôle SHA-256 du bundle.');
  const obj = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  if (obj.format !== 'konstellation.light-navigation/1.0' || obj.semantic_authority !== false ||
      !['derived-hosting-navigation','derived-semantic-preview','derived-public-knowledge'].includes(obj.view_kind) || obj.slug !== entry.slug || obj.revision !== entry.revision ||
      obj.surface_digest !== entry.surface_digest || !Array.isArray(obj.nodes) || !Array.isArray(obj.edges) ||
      obj.nodes.length > 12000 || obj.edges.length > 12000) throw Error('Format ou identité du bundle non conforme.');
  const semantic = obj.view_kind === 'derived-semantic-preview';
  const knowledge = obj.view_kind === 'derived-public-knowledge';
  if (semantic && (entry.mode !== 'semantic_preview' || obj.revision !== 'candidate-local' || obj.state_ref !== 'local-curated-not-a-v10-publication')) throw Error('Prévisualisation non autorisée.');
  if (!semantic && entry.mode === 'semantic_preview') throw Error('Mode du catalogue incohérent.');
  const semanticKinds = new Set(['notion','societe','role','tache','ressource','territoire','periode','evenement','source','cours','competence','pratique','institution','person','personne','human','place','location','lieu','city','country','region']);
  const ids = new Set();
  for (const n of obj.nodes) {
    if (typeof n.id !== 'string' || n.id.length > 300 || ids.has(n.id) || typeof n.label !== 'string' ||
        n.label.length > 600 || !(semantic ? semanticKinds.has(n.kind) : knowledge ? ['notion','valeur'].includes(n.kind) : ['hosted_state','logical_artifact','hosted_file'].includes(n.kind))) throw Error('Nœud du bundle invalide.');
    if (semantic && n.portrait !== undefined && !/^\.\/images\/[a-f0-9]{64}\.(?:png|jpe?g|webp|gif)$/.test(n.portrait)) throw Error('Image de fiche non conforme.');
    if (knowledge && (n.technical_identifier !== undefined && n.technical_identifier !== true ||
        n.property_code !== undefined && (!n.technical_identifier || !/^P[1-9]\d{0,8}$/.test(n.property_code))))
      throw Error('Marquage d’identifiant externe invalide.');
    ids.add(n.id);
  }
  for (const e of obj.edges) {
    if (!ids.has(e.from) || !ids.has(e.to) || !(semantic || knowledge ? /^[a-z0-9][a-z0-9._:-]{0,179}$/i.test(e.relation) : ['lists_file','has_member'].includes(e.relation))) throw Error('Relation dérivée invalide.');
  }
  if (knowledge) {
    const k=obj.knowledge, labels=obj.relation_labels;
    if (!k || typeof k!=='object' || !/^canon\/(?:[A-Za-z0-9_.-]+\/)*[A-Za-z0-9_.-]+\.json$/.test(k.graph_path) ||
        !Number.isSafeInteger(k.declared_assertions) || k.declared_assertions<obj.edges.length ||
        k.displayed_assertions!==obj.edges.length || !Number.isSafeInteger(k.omitted_assertions) ||
        k.omitted_assertions+k.displayed_assertions!==k.declared_assertions ||
        !Array.isArray(k.dictionaries) || k.dictionaries.length>250 ||
        !k.dictionaries.every(x=>/^canon\/(?:[A-Za-z0-9_.-]+\/)*[A-Za-z0-9_.-]+\.(?:json|jsonl)$/.test(x)) ||
        !labels || typeof labels!=='object' || Array.isArray(labels) ||
        Object.entries(labels).length>5000 || !Object.entries(labels).every(([id,label])=>/^[a-z0-9][a-z0-9._:-]{0,179}$/i.test(id)&&typeof label==='string'&&label.length<=600))
      throw Error('Projection canonique v11 invalide.');
    for (const e of obj.edges) if (typeof e.assertion_id!=='string'||e.assertion_id.length>180||
        !Array.isArray(e.source_refs)||e.source_refs.length>80||
        !e.source_refs.every(x=>typeof x==='string'&&x.length>0&&x.length<=180))
      throw Error('Provenance de la relation invalide.');
  }
  if (obj.discovery !== undefined) {
    const d=obj.discovery;
    const own=(x,k)=>Object.prototype.hasOwnProperty.call(x,k);
    const allowed=new Set(['format','authority','provenance','freshness','classification','organization','native_kind','reader_profile','access_pattern','size_class','tracked_local_bytes','measurement_completeness']);
    const text=x=>typeof x==='string'&&x.length>0&&x.length<=120&&!/[\x00-\x1f\x7f]/.test(x);
    if (!d || typeof d!=='object' || Array.isArray(d) || !Object.keys(d).every(k=>allowed.has(k)) ||
        d.format!=='konstellation.light-discovery-projection/1.0'||d.authority!=='noncanonical_advisory_only'||
        d.provenance!=='verified_v10_transport'||d.freshness!=='not_independently_verified'||
        !d.classification||typeof d.classification!=='object'||Array.isArray(d.classification)||
        !text(d.organization)||!(d.native_kind===null||text(d.native_kind))||!text(d.reader_profile)||!text(d.access_pattern)||
        !['tiny','small','medium','large','massive'].includes(d.size_class)||
        !Number.isSafeInteger(d.tracked_local_bytes)||d.tracked_local_bytes<0||
        !['partial','measured_referenced_local_files'].includes(d.measurement_completeness)||
        !Object.entries(d.classification).every(([k,v])=>['arketype_version','primary_archetype','supporting_archetypes','primary_usage','usage_slug','usage_family','domain'].includes(k)&&
          (k==='supporting_archetypes'?Array.isArray(v)&&v.length<=20&&v.every(x=>text(x)&&/^ARK-[0-9]{2,}$/.test(x)):
           text(v) && (k==='primary_archetype'?/^ARK-[0-9]{2,}$/.test(v):k==='primary_usage'?/^PRF-[0-9]{2,}$/.test(v):true))))
      throw Error('Métadonnées Discovery invalides.');
    if (!/^kristal\.reader\/[a-z0-9][a-z0-9-]{0,100}$/.test(d.reader_profile)||!own(d,'classification')) throw Error('Profil Discovery invalide.');
  }
  return obj;
}
function fillSelect(select, options, selected) {
  select.replaceChildren();
  for (const [value, label] of options) { const opt = element('option', '', label); opt.value = value; select.append(opt); }
  select.value = selected;
}
async function loadLocalization(tag) {
  if(!tag){state.locale=null;state.localized=null;state.localizedRelations=null;return;}
  const desc=lookup(state.slug,state.revision)?.localizations?.[tag];
  if(!desc) throw Error('Traduction non disponible dans cette version.');
  validateLocaleDescriptor(tag,desc);
  const key=desc.sha256;
  let doc=state.localeCache.get(key);
  if(!doc){
    const res=await fetch(`./${desc.path}`,{cache:'no-store'});
    if(!res.ok)throw Error('Fichier de langue indisponible.');
    const bytes=await res.arrayBuffer();
    if(bytes.byteLength!==desc.bytes||`sha256:${await sha256(bytes)}`!==desc.sha256)
      throw Error('Intégrité du fichier de langue invalide.');
    doc=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
    validateLocalization(doc,state.bundle);
    state.localeCache.set(key,doc);
  }
  validateLocalization(doc,state.bundle);
  state.locale=tag;state.localized=localizationMap(doc);state.localizedRelations=relationLocalizationMap(doc);
}
function renderLocalizationSelector(preferred){
  const row=lookup(state.slug,state.revision),tags=Object.keys(row?.localizations||{}).sort();
  $('localization-row').hidden=false;
  const options=[['','Mots d’origine (interface en français)'],...tags.map(x=>[x,new Intl.DisplayNames(['fr'],{type:'language'}).of(x)||x])];
  fillSelect($('localization'),options,tags.includes(preferred)?preferred:'');
  $('localization-status').textContent=tags.length
    ? 'Seules les traductions révisées sont proposées. L’interface reste en français.'
    : 'Aucune traduction révisée n’est encore publiée pour ce Kristal. L’interface est en français ; les connaissances restent dans leur langue d’origine.';
  return tags.includes(preferred)?preferred:null;
}
async function setChoice(slug, revision, { keepFocus = false } = {}) {
  const row = lookup(slug, revision);
  if (!row) return;
  // An opt-in anonymous exploration of one Kristal must not silently leak
  // into a different collection selected through the sidebar.
  if(state.slug && state.slug!==slug){
    state.showUnnamed=false;
    $('show-unnamed').checked=false;
    state.docCategory=null;
  }
  $('visual').replaceChildren(element('div', 'loading', 'Vérification de l’intégrité du bundle…'));
  try {
    const data = await loadPack(row);
    state.slug = slug; state.revision = revision; state.bundle = data; state.portraitId = null;
    state.nodeOrdinal = new Map(data.nodes.map((node,i)=>[node.id,i+1]));
    const validFocus = keepFocus && data.nodes.some(n => n.id === state.selection);
    const hosting=data.view_kind==='derived-hosting-navigation';
    const byId=new Map(data.nodes.map(n=>[n.id,n]));
    const activeEdges = data.view_kind === 'derived-public-knowledge'
      ? readableKnowledgeEdges(data.nodes, data.edges, '').filter(e=>
        !isReferenceOrMachineValue(byId.get(e.from)) && !isReferenceOrMachineValue(byId.get(e.to))) : data.edges;
    const eligible=data.nodes.filter(n=>!n.technical_identifier&&!isReferenceOrMachineValue(n));
    const namedFocus=data.view_kind==='derived-public-knowledge'
      ? readerConnectedNamedFocus(eligible,activeEdges) : null;
    const connected=data.view_kind==='derived-public-knowledge'
      ? connectedEntry(eligible,activeEdges) : null;
    const namedOnly=data.view_kind==='derived-public-knowledge'
      ? new Set(eligible.filter(n=>isNamedForReader(n)).map(n=>n.id)) : new Set();
    const namedEdges=activeEdges.filter(e=>namedOnly.has(e.from)&&namedOnly.has(e.to)).length;
    // The 51 real-but-unnamed knowledge registries open as maps automatically.
    // This is a visual choice, not a translation of unknown identifiers.
    if(state.autoLens&&!validFocus&&data.view_kind==='derived-public-knowledge'){
      state.showUnnamed=namedEdges<2 && Boolean(connected);
      $('show-unnamed').checked=state.showUnnamed;
    }
    state.docCategory=hosting && keepFocus && readerDocumentGroups(data.nodes).some(g=>g.key===state.requestedCategory)
      ? state.requestedCategory : null;
    state.autoFocus = !validFocus && Boolean(connected) && !namedFocus;
    if (!validFocus) state.selection = hosting
      ? (state.docCategory ? readerDocumentGroups(data.nodes).find(g=>g.key===state.docCategory)?.nodes[0]?.id : null) ||
        (data.nodes.find(n=>n.kind==='hosted_state')||data.nodes[0])?.id||null
      : (state.showUnnamed ? (namedFocus||connected) : (namedFocus||readerPreferredFocus(eligible,activeEdges)||connected)) ||
        (eligible[0]||data.nodes[0])?.id || null;
    state.history = state.selection ? [state.selection] : [];
    state.localized=null;state.localizedRelations=null;state.locale=null;
    const desiredLanguage=renderLocalizationSelector(state.requestedLocale);
    if(desiredLanguage){
      await loadLocalization(desiredLanguage);
      $('localization-status').textContent=`Texte révisé en ${new Intl.DisplayNames(['fr'],{type:'language'}).of(desiredLanguage)} ; interface en français.`;
      if(!validFocus){
        const translatedFocus=readerPreferredFocus(data.nodes,activeEdges,{localized:state.localized,requireReviewed:true});
        if(translatedFocus){state.selection=translatedFocus;state.history=[translatedFocus];state.autoFocus=false;}
      }
    }
    if(state.autoLens)state.lens=defaultReaderLens(data,{localized:state.localized,requireReviewed:Boolean(state.locale)});
    fillSelect($('collection'), [...new Set(state.catalog.entries.map(e => e.slug))].map(s => [s, publicKristalTitle(s,state.catalog.entries.find(e=>e.slug===s).title)]).sort((a,b)=>a[1].localeCompare(b[1],'fr')), slug);
    const versions=existingRevisions(slug);
    fillSelect($('revision'), versions.map((x,i) => [x.revision, `Version ${i+1}`]), revision);
    $('revision-row').hidden=versions.length<2;
    $('compare-tab').hidden=versions.length<2;
    if (versions.length<2 && state.lens==='compare') state.lens='constellation';
    render(); urlState();
  } catch (e) { showFailure(e); }
}
function showFailure(err) {
  state.bundle = null;
  $('visual').replaceChildren(element('div', 'empty', `Lecture interrompue : ${err.message}`));
  // The visitor layout does not confuse byte integrity with factual accuracy.
  notify(/(?:SHA-256|intégrité|invalide|non conforme|incorrect)/i.test(err.message) ? 'Intégrité ou format à vérifier.' : 'Lecture interrompue : voir le message ci-dessus.');
}
function filteredNodes() {
  const q = state.query.toLocaleLowerCase(state.locale||'fr').trim();
  if (!q) return isKnowledge() ? state.bundle.nodes.filter(n=>
    !n.technical_identifier && !isReferenceOrMachineValue(n) && (state.showUnnamed || isNamedForReader(n,{
      localizedLabel:state.localized?.get(n.id)?.label,requireReviewed:Boolean(state.locale)
    }))) : state.bundle.nodes.filter(n=>n.kind!=='hosted_state');
  const terms = q.split(/\s+/).filter(Boolean);
  if (state.bundle.view_kind === 'derived-semantic-preview') return state.bundle.nodes.filter(n => semanticQueryMatch(n, q));
  return state.bundle.nodes.filter(n => {
    if(n.technical_identifier || (isKnowledge()&&isReferenceOrMachineValue(n)) || (isKnowledge()&&!state.showUnnamed&&!isNamedForReader(n,{
      localizedLabel:state.localized?.get(n.id)?.label, requireReviewed:Boolean(state.locale)
    }))) return false;
    const category=state.bundle.view_kind==='derived-hosting-navigation'?readerDocumentCategory(n):'';
    const docTitle=state.bundle.view_kind==='derived-hosting-navigation'
      ?readableDocumentTitle(n,{ordinal:state.nodeOrdinal.get(n.id)||1,
        groupLabel:readerDocumentGroups([n])[0]?.label||'Document'}):'';
    const words=`${displayNode(n)} ${docTitle} ${displayDescription(n)} ${state.localized?.get(n.id)?.definition||''} ${category}`.toLocaleLowerCase(state.locale||'fr');
    return terms.every(t=>words.includes(t));
  });
}
function focusOn(id) {
  if (!state.bundle.nodes.some(n => n.id === id)) return;
  state.portraitId = null; state.autoFocus = false;
  if(state.bundle.view_kind==='derived-hosting-navigation'){
    const node=state.bundle.nodes.find(n=>n.id===id);
    state.docCategory=node?.kind==='hosted_state'?null:readerDocumentCategory(node);
  }
  state.selection = id; state.history = navigationPath(state.history, id); render(); urlState();
}
// The explorer is opt-in: anonymous endpoints are numbered for navigation only.
// This never assigns identities or modifies source relations.
function activateRealConnections() {
  if(!isKnowledge())return;
  const data=state.bundle;
  const edges=readableKnowledgeEdges(data.nodes,data.edges,'');
  const eligible=data.nodes.filter(n=>!n.technical_identifier && !isReferenceOrMachineValue(n));
  const visibleIds=new Set(eligible.map(n=>n.id));
  const visibleEdges=edges.filter(e=>visibleIds.has(e.from)&&visibleIds.has(e.to));
  // When a registry has no named, connected node, permit exploration of a
  // genuinely connected anonymous node; displayNode assigns a neutral number.
  const preferred=readerConnectedNamedFocus(eligible,visibleEdges,{
    localized:state.localized,requireReviewed:Boolean(state.locale)})||connectedEntry(eligible,visibleEdges);
  if(!preferred){notify('Aucune connexion affichable dans cette collection.');return;}
  state.showUnnamed=true;
  $('show-unnamed').checked=true;
  state.autoFocus=false;state.autoLens=false;state.lens='constellation';state.page=0;
  if(preferred && preferred!==state.selection){state.selection=preferred;state.history=[preferred];}
  render();urlState();
}
function returnToReadableWords() {
  if(!isKnowledge())return;
  state.showUnnamed=false;$('show-unnamed').checked=false;
  state.autoLens=false;state.lens='registry';state.page=0;
  const focus=readerPreferredFocus(state.bundle.nodes,
    readableKnowledgeEdges(state.bundle.nodes,state.bundle.edges,''),{
      localized:state.localized,requireReviewed:Boolean(state.locale)});
  if(focus){state.selection=focus;state.history=[focus];}
  render();urlState();
}
function actionButton(label,handler,style='button ghost'){
  const btn=element('button',style,label);btn.type='button';btn.addEventListener('click',handler);
  return btn;
}
function lensMeta() {
  return {
    constellation: [isKnowledge() ? 'Constellation des connaissances' : 'Carte visuelle des documents',
      isKnowledge() ? 'Connexions réellement présentes. Les notions sans nom restent neutres et numérotées.' :
      'Classement visuel de fichiers publics, sans relations sémantiques supposées. Sélectionnez une catégorie pour découvrir les documents.'],
    registry: [isKnowledge()?'Notions disponibles':'Documents de la collection', isKnowledge() ? 'Parcourez les notions qui possèdent un vrai libellé. Les notions anonymes restent regroupées.' : 'Parcourez les documents répertoriés, classés par type.'],
    trace: ['Vérification des données', 'Ce qui a été vérifié, et ce qui ne l’a pas été.'],
    compare: ['Comparer les versions', 'Éléments ajoutés, retirés ou modifiés entre deux versions.'],
  }[state.lens];
}

function render() {
  const data = state.bundle; if (!data) return;
  $('title').textContent = publicKristalTitle(data.slug,data.title);
  const semantic = data.view_kind === 'derived-semantic-preview';
  $('subtitle').textContent = isKnowledge() ? 'Explorez visuellement les liens déclarés. Les notions sans intitulé portent une désignation neutre.' : semantic ? 'Aperçu local de connaissances en cours de préparation (non publié).' : 'Explorez visuellement la structure documentaire publique. Aucun graphe sémantique n’est revendiqué.';
  $('metric-members').textContent = Number(isKnowledge() ? readerKnowledgeSummary(data.nodes,data.edges,{localized:state.localized,requireReviewed:Boolean(state.locale)}).named : data.nodes.filter(n=>n.kind==='hosted_file').length).toLocaleString('fr-FR');
  $('metric-relations').textContent = Number(data.edges.length).toLocaleString('fr-FR');
  $('metric-members-label').textContent = isKnowledge() ? 'NOTIONS NOMMÉES' : 'DOCUMENTS RÉPERTORIÉS';
  $('metric-relations-label').textContent = isKnowledge() ? 'LIENS DÉCLARÉS (NON VALIDÉS)' : 'LIENS D’INVENTAIRE';
  $('graph-controls').hidden = state.lens !== 'constellation';
  document.querySelector('[data-lens="constellation"]').hidden=false;
  document.querySelector('[data-lens="constellation"]').lastChild.textContent=isKnowledge()?' Constellation des connaissances':' Carte des documents';
  document.querySelector('.advanced-toggle').hidden=data.view_kind==='derived-hosting-navigation';
  document.querySelector('[data-lens="registry"]').lastChild.textContent=isKnowledge()?' Explorer les notions':' Parcourir les documents';
  document.querySelector('label[for="satellites"]').firstChild.textContent=isKnowledge()?'Notions autour du sujet ':'Documents visibles ';
  $('satellites').setAttribute('aria-label',isKnowledge()?'Nombre de bulles autour de la notion centrale':'Nombre maximal de documents affichés par catégorie');
  $('satellites').value = String(state.satellites); $('satellites-count').textContent = String(state.satellites);
  $('graph-back').disabled = state.history.length < 2 && !(data.view_kind==='derived-hosting-navigation' && state.docCategory);
  const [heading, hint] = lensMeta(); $('panel-title').textContent = heading; $('panel-hint').textContent = hint;
  $('view-tag').textContent = ({constellation:isKnowledge()?'CARTE DES LIENS':'CARTE DOCUMENTAIRE',registry:isKnowledge()?'NOTIONS':'DOCUMENTS',trace:'VÉRIFICATION',compare:'VERSIONS'})[state.lens];
  if (state.lens==='trace' || state.lens==='compare') $('advanced-tools').open=true;
  document.querySelectorAll('[data-lens]').forEach(btn => { btn.classList.toggle('active', btn.dataset.lens === state.lens); btn.setAttribute('aria-pressed', String(btn.dataset.lens === state.lens)); });
  const visible = filteredNodes(); $('count').textContent = state.query.trim() ? `${visible.length.toLocaleString('fr-FR')} résultat(s)` : isKnowledge() ? `${visible.length.toLocaleString('fr-FR')} notions disponibles sur la carte` : `${visible.filter(n=>n.kind==='hosted_file').length.toLocaleString('fr-FR')} documents répertoriés`;
  const view = $('visual'); view.replaceChildren();
  if (state.lens === 'constellation') drawGraph(view, visible);
  if (state.lens === 'registry') drawRegistry(view, visible);
  if (state.lens === 'trace') drawTrace(view);
  if (state.lens === 'compare') drawCompare(view);
  drawInspection();
}
function profileCard(target, node, opener = null) {
  target.querySelector('.node-portrait-card')?.remove();
  const profile=portraitFor(node,displayNode(node));
  if (!profile) return;
  const card=element('section','node-portrait-card');
  card.setAttribute('role','dialog');card.setAttribute('aria-label',`Fiche de ${profile.title}`);
  card.setAttribute('aria-modal','false');
  const close=element('button','portrait-close','×');close.type='button';close.setAttribute('aria-label','Fermer la fiche');
  close.addEventListener('click',()=>{state.portraitId=null;card.remove();const toFocus=opener || portraitOpener;if(toFocus?.isConnected)toFocus.focus();portraitOpener=null;});
  const kind=element('div','portrait-kind',`FICHE · ${profile.typeLabel}`);
  const visual=element('div','portrait-visual');
  if(profile.image){const img=element('img');img.loading='lazy';img.decoding='async';img.src=profile.image;img.alt=`Illustration de ${profile.title}`;img.addEventListener('error',()=>visual.replaceChildren(element('span','',profile.symbol)));visual.append(img);}
  else visual.append(element('span','',profile.symbol));
  card.append(close,kind,visual,element('h3','',profile.title));
  if(profile.description)card.append(element('p','',profile.description));
  for(const field of profile.fields){const row=element('div','portrait-field');row.append(element('strong','',field.name),element('span','',field.value));card.append(row);}
  card.append(element('p','portrait-note','Données déclarées dans cette projection.'));target.append(card);
  if(opener){portraitOpener=opener;close.focus();}
}
// VISUAL-V17: a map of document *categories*. Categories are derived from
// actual public filenames; drawn connectors are graphic grouping guides, never
// graph assertions. Individual document selection opens the existing inspector.
function drawDocumentConstellation(target,visible){
  const d=state.bundle;
  const allowed=new Set(visible.map(n=>n.id));
  const plan=readerDocumentMap(d.nodes,{category:state.docCategory,allowedIds:allowed,limit:state.satellites});
  if(state.docCategory && !plan.selected)state.docCategory=null;
  const group=plan.selected;
  const centralName=group?group.label:publicKristalTitle(d.slug,d.title);
  const svg=svgElement('svg',{viewBox:'0 0 760 470',role:'group',class:'reader-graph-svg reader-doc-svg',
    'data-map-mode':'documents','aria-label':group ?
    `Carte documentaire : ${group.label}. Sélectionnez un document pour afficher sa fiche.` :
    `Carte documentaire de ${centralName}. Sélectionnez une catégorie pour explorer ses fichiers.`});
  const center={x:380,y:218},items=group?plan.visible:plan.groups;
  const N=items.length;
  const positions=items.map((_,i)=>{
    const angle=2*Math.PI*i/Math.max(1,N)-Math.PI/2;
    const distanceX=N>12?260:225;
    const distanceY=N>12?176:155;
    return {x:center.x+distanceX*Math.cos(angle),y:center.y+distanceY*Math.sin(angle)};
  });
  const guide=svgElement('g',{class:'document-cluster-guides','aria-hidden':'true'});
  for(const p of positions)guide.append(svgElement('path',{
    d:`M ${center.x} ${center.y} Q ${Math.round((center.x+p.x)/2)} ${Math.round((center.y+p.y)/2-10)} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`,
    class:'document-cluster-link'}));
  svg.append(guide);
  const centerNode=svgElement('g',{class:'graph-node graph-doc-hub','data-selected':'true',role:'button',tabindex:'0',
    'aria-label':group?'Retour à la carte des catégories':'Collection documentaire'});
  centerNode.append(svgElement('circle',{cx:center.x,cy:center.y,r:52}));
  const mark=svgElement('text',{x:center.x,y:center.y-4,class:'type-mark'});mark.textContent=group?'▤':'✳';centerNode.append(mark);
  const title=svgElement('text',{x:center.x,y:center.y+77,class:'graph-doc-center-label'});
  title.textContent=short(centralName,33);centerNode.append(title);
  if(group){const back=()=>{state.docCategory=null;state.selection=d.nodes.find(n=>n.kind==='hosted_state')?.id||null;state.history=state.selection?[state.selection]:[];render();urlState();};
    centerNode.addEventListener('click',back);
    centerNode.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();back();}});
  } else {centerNode.setAttribute('role','img');centerNode.removeAttribute('tabindex');}
  svg.append(centerNode);
  for(const [i,item] of items.entries()){
    const p=positions[i];
    const isFile=Boolean(group);
    const node=isFile?item:null;
    const label=isFile ? readableDocumentTitle(node,{ordinal:state.nodeOrdinal.get(node.id)||1,groupLabel:group.label}) : item.label;
    const active=Boolean(isFile&&state.selection===node.id);
    const bubble=svgElement('g',{class:`graph-node ${isFile?'graph-doc-file':'graph-doc-category'} doc-category-${isFile?group.key:item.key}`,
      'data-selected':String(active),role:'button',tabindex:'0',
      'aria-label':isFile?`Consulter : ${label}`:`Explorer ${label}, ${item.nodes.length} documents`});
    bubble.append(svgElement('circle',{cx:p.x,cy:p.y,r:isFile?24:38}));
    const type=svgElement('text',{x:p.x,y:p.y+4,class:'type-mark'});type.textContent=isFile?'▤':'◆';bubble.append(type);
    const name=svgElement('text',{x:p.x,y:p.y+(isFile?39:54),class:'graph-doc-node-label'});
    name.textContent=short(label,isFile?23:27);bubble.append(name);
    if(!isFile){const count=svgElement('text',{x:p.x,y:p.y+68,class:'graph-doc-count'});count.textContent=`${item.nodes.length} document(s)`;bubble.append(count);}
    const tip=svgElement('title');tip.textContent=label;bubble.append(tip);
    const open=()=>{
      if(isFile)focusOn(node.id);
      else {state.docCategory=item.key;state.selection=item.nodes[0]?.id||state.selection;state.history=state.selection?[state.selection]:[];render();urlState();}
    };
    bubble.addEventListener('click',open);
    bubble.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open();}});
    svg.append(bubble);
  }
  target.append(svg);
  const note=element('p','reader-document-disclaimer',
    'Carte de classement des fichiers publics. Les traits représentent uniquement des regroupements visuels, pas des relations de connaissances.');
  target.append(note);
  const trail=element('section','reader-doc-navigation');
  trail.append(element('h3','',group?`Documents · ${group.label}`:'Explorer les familles de documents'));
  if(group){
    const back=actionButton('← Toutes les catégories',()=>{state.docCategory=null;state.selection=d.nodes.find(n=>n.kind==='hosted_state')?.id||null;state.history=state.selection?[state.selection]:[];render();urlState();},'button ghost');
    trail.append(back);
    const links=element('div','reader-doc-choices');
    for(const node of plan.visible){
      const label=readableDocumentTitle(node,{ordinal:state.nodeOrdinal.get(node.id)||1,groupLabel:group.label});
      const button=element('button','reader-doc-choice',label);
      button.type='button';button.setAttribute('aria-pressed',String(node.id===state.selection));
      button.addEventListener('click',()=>focusOn(node.id));
      links.append(button);
    }
    trail.append(links);
    if(plan.total>plan.visible.length){
      trail.append(element('p','reader-muted',`${plan.total-plan.visible.length} document(s) supplémentaires dans cette catégorie.`),
        actionButton('Voir tous les documents',()=>{state.lens='registry';state.autoLens=false;state.page=0;render();urlState();},'button ghost'));
    }
    $('truncation').textContent=`${plan.visible.length}/${plan.total} documents affichés · classement visuel sans assertions nouvelles`;
  }else{
    const groups=element('div','reader-doc-choices');
    for(const g of plan.groups){const b=element('button','reader-doc-choice',`${g.label} · ${g.nodes.length}`);b.type='button';
      b.addEventListener('click',()=>{state.docCategory=g.key;state.selection=g.nodes[0].id;state.history=[state.selection];render();urlState();});groups.append(b);}
    trail.append(groups);
    $('truncation').textContent=`${plan.groups.length} catégories · ${plan.groups.reduce((n,g)=>n+g.nodes.length,0)} documents publics · aucune relation sémantique inventée`;
  }
  if(!plan.groups.length)trail.append(element('p','reader-muted','Aucun document ne correspond à cette recherche.'));
  target.append(trail);
}

function drawGraph(target, visible) {
  if(state.bundle.view_kind==='derived-hosting-navigation')return drawDocumentConstellation(target,visible);
  const all=state.bundle.nodes;
  if(isKnowledge() && !state.showUnnamed && !state.query.trim()){
    const info=readerKnowledgeSummary(all,state.bundle.edges,{localized:state.localized,requireReviewed:Boolean(state.locale)});
    if(info.namedEdges===0 && !info.navigable){
      const box=element('section','reader-overview');
      box.append(element('h3','','Les relations nécessitent encore des intitulés'),
        element('p','',`${info.named.toLocaleString('fr-FR')} notion(s) disposent d’un nom. ${info.unnamed.toLocaleString('fr-FR')} autre(s) n’en ont pas encore. Aucun lien direct entre notions nommées n’est disponible dans cette collection.`),
        element('p','','Le nombre de liens déclarés ne constitue ni une traduction ni une relation intelligible pour le lecteur.'));
      const actions=element('div','reader-actions');
      actions.append(actionButton('Lire les notions nommées',()=>{state.lens='registry';state.page=0;render();urlState();},'button ghost'));
      if(info.navigable)actions.append(actionButton('Explorer les relations existantes',activateRealConnections,'button accent'));
      box.append(actions,element('p','reader-muted','Les éléments sans intitulé sont numérotés pour la navigation seulement. Leur identité n’est pas déduite.'));
      target.append(box);$('graph-controls').hidden=true;
      $('truncation').textContent=`${info.navigable.toLocaleString('fr-FR')} lien(s) navigables · ${info.declared.toLocaleString('fr-FR')} déclarés dans la collection`;return;
    }
  }
  const selected=all.find(n=>n.id===state.selection && !isReferenceOrMachineValue(n))||all.find(n=>!isReferenceOrMachineValue(n))||all[0];
  if (!selected) { target.append(element('div','empty','Aucun nœud disponible.'));return; }
  const matched=state.query.trim() ? new Set(visible.map(n=>n.id)) : null;
  const unnamedIds=isKnowledge() && !state.showUnnamed && !state.query.trim() ? new Set(all.filter(n=>isUnnamedForVisitor(n)&&n.id!==selected.id).map(n=>n.id)) : null;
  const resourceIds=new Set(isKnowledge()?all.filter(isReferenceOrMachineValue).map(n=>n.id):[]);
  const displayEdges=isKnowledge() ? readableKnowledgeEdges(all,state.bundle.edges,selected.id).filter(e=>
    !resourceIds.has(e.from) && !resourceIds.has(e.to) && (!unnamedIds || (!unnamedIds.has(e.from) && !unnamedIds.has(e.to)))) : state.bundle.edges;
  const view=graphNeighborhood(all,displayEdges,selected.id,state.satellites,matched);
  const neighborIndex=buildNeighborIndex(all,displayEdges);
  const shown=view.nodes;
  const secondaries = !state.query.trim() && isKnowledge() && shown.length > 1
    ? secondaryRing(all, displayEdges, shown.slice(1), selected.id, 6) : [];
  const secondaryIds = new Set(secondaries.map(item => item.node.id));
  const svg=svgElement('svg',{viewBox:'0 0 760 470',role:'group','aria-label':'Graphe navigable : Entrée ou clic pour recentrer sur une bulle. Survolez pour voir les satellites secondaires.'});
  const xy=new Map([[selected.id,{x:380,y:226}]]);
  const count=shown.length-1;
  shown.slice(1).forEach((n,i)=>{const angle=2*Math.PI*i/Math.max(1,count)-Math.PI/2;
    const radius=count>13 ? 151+(i%2)*9 : 150;
    xy.set(n.id,{x:380+Math.cos(angle)*radius*1.52,y:226+Math.sin(angle)*radius});
  });
  // Second-ring satellites appear without hovering, attached to actual
  // first-ring edges; the labels cannot be confused with qualified semantics.
  for (const {node, parentId} of secondaries) {
    const parent = xy.get(parentId); if (!parent) continue;
    const angle = Math.atan2((parent.y-226)/162, (parent.x-380)/(162*1.65));
    xy.set(node.id,{x:380+Math.cos(angle)*312,y:226+Math.sin(angle)*194});
  }
  for(const edge of view.edges){const a=xy.get(edge.from),b=xy.get(edge.to);
    if(!a||!b)continue;
    const line=svgElement('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,class:'graph-link'});
    const tooltip=svgElement('title');tooltip.textContent=displayRelation(edge.relation);line.append(tooltip);svg.append(line);
  }
  for (const {node, parentId} of secondaries) {
    const a=xy.get(parentId),b=xy.get(node.id);
    if(!a||!b)continue;
    const line=svgElement('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,class:'graph-link graph-link-secondary'});
    const source=displayEdges.find(e => (e.from===parentId&&e.to===node.id)||(e.to===parentId&&e.from===node.id));
    const tooltip=svgElement('title');tooltip.textContent=source?displayRelation(source.relation):'Lien déclaré';line.append(tooltip);
    svg.append(line);
  }
  let previewGroup=null;
  const clearPreview=()=>{previewGroup?.remove();previewGroup=null;};
  const showPreview=(node)=>{
    clearPreview();
    if(node.id===selected.id)return;
    // The center is already visible: exclude it from the preview satellites.
    const secondary=previewNeighbors(neighborIndex,node.id,[selected.id,...secondaryIds],6);
    if(!secondary.length)return;
    const anchor=xy.get(node.id);
    const obstacles=[...xy].map(([id,p])=>({...p,r:id===selected.id?43:25}));
    const positions=orbitPreview(secondary,anchor,760,470,6,obstacles);
    previewGroup=svgElement('g',{class:'graph-secondary-preview','aria-hidden':'true'});
    previewGroup.append(svgElement('circle',{cx:anchor.x,cy:anchor.y,r:38,class:'preview-halo'}));
    for(const child of positions){
      previewGroup.append(svgElement('line',{x1:anchor.x,y1:anchor.y,x2:child.x,y2:child.y}));
      previewGroup.append(svgElement('circle',{cx:child.x,cy:child.y,r:18}));
      const name=svgElement('text',{x:child.x,y:child.y+31,class:'preview-label'});
      name.textContent=short(displayNode(child),19);previewGroup.append(name);
    }
    svg.append(previewGroup);
  };
  for(const n of shown){const p=xy.get(n.id),central=n.id===selected.id;
    const group=svgElement('g',{class: isUnnamedForVisitor(n) ? 'graph-node graph-node-unlabeled' : 'graph-node','data-kind':n.kind,'data-selected':String(central),role:'button',tabindex:'0','aria-label':`${central?'Notion centrale':'Explorer'} : ${displayNode(n)}`});
    group.append(svgElement('circle',{cx:p.x,cy:p.y,r:central?43:23}));
    const sym=svgElement('text',{x:p.x,y:p.y+5,class:'type-mark'});sym.textContent=central?'✳':'◇';group.append(sym);
    // Full titles live in the accompanying accessible list. Orbital text is
    // deliberately limited to avoid unreadable overlaps and clipped captions.
    if(central || (count<=10 && shown.indexOf(n)<=10)){
      const label=svgElement('text',{x:p.x,y:p.y+(central?58:36)});
      const graphName=isUnnamedForVisitor(n)?`Notion n° ${state.nodeOrdinal.get(n.id)||1}`:displayNode(n);
      label.textContent=short(graphName,central?27:17);group.append(label);
    }
    const tip=svgElement('title');tip.textContent=displayDescription(n)||displayNode(n);group.append(tip);
    group.addEventListener('click',()=>focusOn(n.id));
    group.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();focusOn(n.id);}});
    if(!central){group.addEventListener('mouseenter',()=>showPreview(n));group.addEventListener('mouseleave',clearPreview);
      group.addEventListener('focus',()=>showPreview(n));group.addEventListener('blur',clearPreview);}
    svg.append(group);
  }
  for (const {node} of secondaries) {
    const p=xy.get(node.id);if(!p)continue;
    const group=svgElement('g',{class: isUnnamedForVisitor(node) ? 'graph-node graph-node-secondary graph-node-unlabeled' : 'graph-node graph-node-secondary', 'data-layer':'secondary',
      'data-kind':node.kind,role:'button',tabindex:'0',
      'aria-label':`Connexion de deuxième niveau : ${displayNode(node)}`});
    group.append(svgElement('circle',{cx:p.x,cy:p.y,r:17}));
    const mark=svgElement('text',{x:p.x,y:p.y+5,class:'type-mark'});mark.textContent='·';group.append(mark);
    // Second-ring names remain available via title, aria-label and the link list.
    const tip=svgElement('title');tip.textContent=displayDescription(node)||displayNode(node);group.append(tip);
    group.addEventListener('click',()=>focusOn(node.id));
    group.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();focusOn(node.id);}});
    svg.append(group);
  }
  // Separate buttons, not nested inside the navigation buttons.
  for(const n of shown){const profile=portraitFor(n);if(!profile)continue;
    const p=xy.get(n.id),central=n.id===selected.id;
    const badge=svgElement('g',{class:'graph-portrait-indicator',role:'button',tabindex:'0',
      'aria-label':`Ouvrir la fiche de ${displayNode(n)}`});
    const x=p.x+(central?33:19),y=p.y-(central?31:18);
    badge.append(svgElement('circle',{cx:x,cy:y,r:central?12:10}));
    const mark=svgElement('text',{x,y:y+4});mark.textContent='i';badge.append(mark);
    const open=(e)=>{e.stopPropagation();clearPreview();state.portraitId=n.id;profileCard(target,n,badge);};
    badge.addEventListener('click',open);
    badge.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open(e);}});
    svg.append(badge);
  }
  svg.classList.add('reader-graph-svg');
  target.append(svg);
  // A real-edge, fully labelled companion list: available on desktop and
  // primary on mobile, where tiny SVG text is deliberately hidden.
  const browser=element('section','reader-mobile-map reader-relations-browser');
  browser.append(element('h3','','Parcourir les connexions de cette notion'));
  browser.append(element('p','reader-muted','Chaque entrée correspond à un lien existant dans les données. Les noms manquants ne sont pas devinés.'));
  const byId=new Map(all.map(n=>[n.id,n]));
  const links=displayEdges.filter(e=>e.from===selected.id||e.to===selected.id);
  const unique=new Map();
  for(const e of links){
    const other=byId.get(e.from===selected.id?e.to:e.from);if(!other||other.id===selected.id)continue;
    if(!state.showUnnamed && isUnnamedForVisitor(other))continue;
    if(!unique.has(other.id))unique.set(other.id,{node:other,relation:e.relation});
  }
  const allLinks=[...unique.values()].sort((a,b)=>
    Number(isUnnamedForVisitor(a.node))-Number(isUnnamedForVisitor(b.node))||
    displayNode(a.node).localeCompare(displayNode(b.node),'fr'));
  const makeLink=({node,relation})=>{
    const button=element('button','reader-mobile-link');button.type='button';
    button.append(element('strong','',displayNode(node)),element('small','',displayRelation(relation)));
    button.setAttribute('aria-label',`Explorer ${displayNode(node)} · ${displayRelation(relation)}`);
    button.addEventListener('click',()=>focusOn(node.id));return button;
  };
  for(const item of allLinks.slice(0,12))browser.append(makeLink(item));
  if(allLinks.length>12){
    const more=element('details','reader-relations-extra');
    more.append(element('summary','',`Afficher ${allLinks.length-12} autre(s) connexion(s)`));
    const extra=element('div','reader-extra-list');
    for(const item of allLinks.slice(12,80))extra.append(makeLink(item));
    if(allLinks.length>80)extra.append(element('p','reader-muted',
      `${allLinks.length-80} autre(s) connexion(s) non affichée(s) ici ; sélectionnez un autre point pour poursuivre.`));
    more.append(extra);browser.append(more);
  }
  if(!allLinks.length)browser.append(element('p','reader-muted',
    state.query?'Aucun voisin correspondant à la recherche.':'Aucun lien direct disponible pour cette notion.'));
  if(isKnowledge() && state.showUnnamed){
    browser.append(actionButton('Revenir aux notions nommées',returnToReadableWords,'button ghost'));
  }else if(isKnowledge()){
    const opaque=links.filter(e=>{
      const other=byId.get(e.from===selected.id?e.to:e.from);
      return other && isUnnamedForVisitor(other);
    });
    if(opaque.length)browser.append(element('p','reader-muted',
      `${opaque.length} lien(s) supplémentaires vers des notions sans intitulé sont regroupés.`),
      actionButton('Explorer également ces connexions',activateRealConnections,'button ghost'));
  }
  target.append(browser);
  if (secondaries.length) {
    const legend=element('p','graph-layers-legend');
    legend.append(element('span','graph-legend-direct','● Liens directs'),
      element('span','graph-legend-secondary',`◌ ${secondaries.length} connexion(s) de deuxième niveau — liens réellement déclarés`));
    target.append(legend);
  }
  target.append(element('p','graph-hint',state.autoFocus
    ? 'Point de départ : notion existante la plus connectée. Le titre du Kristal peut désigner une notion sans lien direct.'
    : 'Cliquez sur une bulle pour explorer ses liens. Survolez-la pour découvrir d’autres notions.'));
  if(state.portraitId){const node=all.find(n=>n.id===state.portraitId);if(node)profileCard(target,node);}
  if(isKnowledge() && !selected.technical_identifier) {
    const hidden=state.bundle.edges.filter(e=>e.from===selected.id && all.some(n=>n.id===e.to&&n.technical_identifier)).length;
    if(hidden) target.append(element('p','graph-hint','Certaines références internes sont volontairement masquées pour faciliter la lecture.'));
  }
  if(view.degree===0) {
    target.append(element('p','graph-empty',state.query
      ? 'Aucun voisin correspondant à la recherche. Effacer la recherche pour voir les relations.'
      : 'Cette notion n’a aucun lien directement visible dans les relations déclarées.'));
    if (!state.query.trim()) {
      const connected=connectedEntry(all,displayEdges);
      if (connected && connected!==selected.id) {
        const browse=element('button','graph-browse-connected','Explorer une notion réellement connectée');browse.type='button';
        browse.addEventListener('click',()=>focusOn(connected));target.append(browse);
      }
    }
  }
  $('truncation').textContent=`${shown.length-1} voisin(s) affiché(s) · ${secondaries.length} connexion(s) secondaires · ${links.length.toLocaleString('fr-FR')} lien(s) directs répertoriés · ${state.bundle.edges.length.toLocaleString('fr-FR')} liens déclarés dans la collection`;
}
function drawDocumentRegistry(target,nodes){
  const intro=element('section','reader-overview');
  intro.append(element('h3','','Inventaire des documents publics'),
    element('p','','Ces documents sont répertoriés dans la collection. Leur présence ne signifie pas que leur contenu a été vérifié ou qu’un graphe de connaissances existe.'));
  target.append(intro);
  const groups=readerDocumentGroups(nodes);
  if(!groups.length)target.append(element('p','reader-muted','Aucun document correspondant à la recherche.'));
  for(const group of groups){
    const section=element('details','reader-doc-group');
    section.open=group.key==='presentation'||groups.length===1;
    section.append(element('summary','',`${group.label} · ${group.nodes.length} élément(s)`));
    const list=element('div','reader-doc-list');
    for(const [i,n] of group.nodes.entries()){
      const row=element('div','reader-doc-row');
      const readable=readableDocumentTitle(n,{ordinal:state.nodeOrdinal.get(n.id)||i+1,groupLabel:group.label});
      const select=element('button','reader-doc-title',readable);select.type='button';
      select.setAttribute('aria-pressed',String(state.selection===n.id));
      if(state.selection===n.id)row.classList.add('selected');
      select.addEventListener('click',()=>{
        state.selection=n.id;state.history=navigationPath(state.history,n.id);
        for(const other of target.querySelectorAll('.reader-doc-title')){
          other.setAttribute('aria-pressed',String(other===select));
          other.closest('.reader-doc-row')?.classList.toggle('selected',other===select);
        }
        drawInspection();urlState();
        if(window.matchMedia('(max-width:720px)').matches)
          $('inspection').scrollIntoView({block:'start',behavior:'instant'});
      });
      row.append(select);
      const link=gitFileLink(state.bundle,n);
      if(link){const a=element('a','reader-doc-source','Consulter le document original');
        a.href=link;a.target='_blank';a.rel='noopener noreferrer';row.append(a);}
      list.append(row);
    }
    section.append(list);target.append(section);
  }
  $('truncation').textContent='Inventaire de documents · pas de relations sémantiques supposées';
}
function drawRegistry(target, nodes) {
  if(state.bundle.view_kind==='derived-hosting-navigation'){
    drawDocumentRegistry(target,nodes);return;
  }
  const info=isKnowledge()?readerKnowledgeSummary(state.bundle.nodes,state.bundle.edges,{
    localized:state.localized,requireReviewed:Boolean(state.locale)}):null;
  if(info){
    const summary=element('section','reader-overview');
    summary.append(element('h3','','Notions ayant un nom lisible'),
      element('p','',`${info.named.toLocaleString('fr-FR')} notion(s) nommée(s) · ${state.bundle.nodes.filter(n=>!n.technical_identifier && !isReferenceOrMachineValue(n) && !isNamedForReader(n,{localizedLabel:state.localized?.get(n.id)?.label,requireReviewed:Boolean(state.locale)})).length.toLocaleString('fr-FR')} notion(s) sans intitulé regroupée(s) · ${readerMediaGroups(state.bundle.nodes).reduce((sum,g)=>sum+g.count,0).toLocaleString('fr-FR')} référence(s) de médias séparée(s).`));
    if(info.unnamed)summary.append(element('p','reader-muted','Les notions sans intitulé ne sont pas des traductions manquantes à deviner. Elles restent dans les données et peuvent être explorées séparément.'));
    if(info.navigable){
      summary.append(element('p','reader-muted',`${info.navigable.toLocaleString('fr-FR')} lien(s) entre notions consultables, sur ${info.declared.toLocaleString('fr-FR')} relations déclarées. Tous les liens ne disposent pas d’un intitulé compréhensible.`));
      summary.append(actionButton('Explorer les relations existantes',activateRealConnections,'button accent'));
    }
    target.append(summary);
  }
  const container=element('div','record-list reader-named-list');
  const sorted=[...nodes].sort((a,b)=>{
    const namedA=isNamedForReader(a,{localizedLabel:state.localized?.get(a.id)?.label,requireReviewed:Boolean(state.locale)});
    const namedB=isNamedForReader(b,{localizedLabel:state.localized?.get(b.id)?.label,requireReviewed:Boolean(state.locale)});
    return Number(namedB)-Number(namedA)||displayNode(a).localeCompare(displayNode(b),'fr')||a.id.localeCompare(b.id);
  });
  const named=sorted.filter(n=>isNamedForReader(n,{localizedLabel:state.localized?.get(n.id)?.label,requireReviewed:Boolean(state.locale)}));
  const anonymous=sorted.filter(n=>!named.includes(n) && !isReferenceOrMachineValue(n));
  const mediaGroups=isKnowledge()?readerMediaGroups(state.bundle.nodes):[];
  const mediaCount=mediaGroups.reduce((sum,group)=>sum+group.count,0);
  const pageItems=named.slice(0,(state.page+1)*60);
  if(!pageItems.length)target.append(element('div','empty','Aucune notion ayant un intitulé révisé ou lisible dans cette sélection.'));
  for(const n of pageItems){
    const btn=element('button',`record ${state.selection===n.id?'selected':''}`);btn.type='button';
    const content=element('main');content.append(element('strong','',displayNode(n)));
    const description=displayDescription(n);if(description)content.append(element('small','',short(description,140)));
    btn.append(content,element('em','',publicNodeKind(n.kind)));btn.addEventListener('click',()=>focusOn(n.id));container.append(btn);
  }
  target.append(container);
  if((state.page+1)*60<named.length){
    const more=element('button','button ghost','Afficher 60 notions supplémentaires');more.type='button';
    more.addEventListener('click',()=>{state.page++;render();});target.append(more);
  }
  if(anonymous.length){
    const details=element('details','reader-unnamed-group');
    details.append(element('summary','',`${anonymous.length} notion(s) sans intitulé regroupée(s) — exploration avancée`));
    const p=element('p','reader-muted','Aucun sens n’est attribué à ces notions. Les numéros servent uniquement à distinguer les éléments pendant la navigation.');details.append(p);
    const list=element('div','reader-unnamed-list');
    for(const [index,n] of anonymous.slice(0,30).entries()){
      const btn=element('button','reader-unnamed-link',displayNode(n));btn.type='button';
      btn.addEventListener('click',()=>focusOn(n.id));list.append(btn);
    }
    details.append(list);
    if(anonymous.length>30)details.append(element('p','reader-muted',`Les ${anonymous.length-30} autres restent accessibles par leurs relations dans la vue avancée.`));
    target.append(details);
  }
  if(mediaCount){
    const section=element('section','reader-media-summary');
    section.append(element('h3','','Ressources citées dans la collection'),
      element('p','reader-muted','Les noms de fichiers ne sont pas des notions. Cet inventaire compte les références déclarées, sans garantir leur contenu ni leur disponibilité.'));
    const list=element('ul','reader-media-groups');
    for(const group of mediaGroups)list.append(element('li','',`${group.label} : ${group.count.toLocaleString('fr-FR')}`));
    section.append(list);target.append(section);
  }
  $('truncation').textContent=`${Math.min((state.page+1)*60,named.length).toLocaleString('fr-FR')} notions nommées affichées · ${anonymous.length} à documenter · ${mediaCount} médias référencés`;
}
function evidence(label,value,good=false) {
  const div=element('div','evidence-item');div.append(element('small','',label),element('strong',good?'ok':'',value));return div;
}
function drawTrace(target){
  const d=state.bundle,holder=element('div','evidence');
  holder.append(evidence('Intégrité des fichiers',d.verification.byteDigestsVerified?
      'Fichiers conformes aux empreintes déclarées':'Contrôle non établi',d.verification.byteDigestsVerified),
    evidence('Exactitude des informations','Non vérifiée indépendamment'),
    evidence('Autorisation et validation de publication','Non attestées par cet explorateur'));
  holder.append(element('p','subtle-hint','L’intégrité du fichier n’établit pas l’exactitude des informations.'));
  target.append(holder);
  $('truncation').textContent='Contrôle d’intégrité ≠ validation des faits';
}

async function drawCompare(target){
  const versions=existingRevisions(state.slug).filter(x=>x.revision!==state.revision);
  if(!versions.length){target.append(element('div','empty','Une deuxième révision contrôlée du même Kristal est nécessaire pour comparer.'));$('truncation').textContent='Aucune comparaison artificielle';return;}
  const old=versions[versions.length-1];const heading=element('p','',`Comparaison entre deux versions de ce Kristal`);target.append(heading);
  try {const other=await loadPack(old); if(state.lens!=='compare')return;
    const identity=(n)=>n.kind+'\u0000'+n.label;
    const a=new Map(state.bundle.nodes.map(n=>[identity(n),n]));const b=new Map(other.nodes.map(n=>[identity(n),n]));
    const added=[...a.keys()].filter(k=>!b.has(k));const removed=[...b.keys()].filter(k=>!a.has(k));
    const changes=[...a.keys()].filter(k=>b.has(k)&&a.get(k).description!==b.get(k).description);
    const diff=element('div','diff-list');
    for(const [label,list,source] of [['Ajoutés',added,a],['Retirés',removed,b],['Métadonnées modifiées',changes,a]]){
      const card=evidence(`${label} (${list.length})`,list.length ? 'Différences visibles dans la projection' : 'Aucune différence détectée');
      for(const k of list.slice(0,24))card.append(element('span','diff-item',short(publicReaderLabel(source.get(k),{viewKind:state.bundle.view_kind}),150)));
      if(list.length>24)card.append(element('span','diff-item',`… ${list.length-24} autres`));
      diff.append(card);
    }target.append(diff);$('truncation').textContent='Comparaison de projections techniques, pas de sens ni de vérité';
  }catch(e){target.append(element('div','empty',`Ancienne version inaccessible : ${e.message}`));}
}
function addDefinition(dl,label,value){ dl.append(element('dt','',label),element('dd','',value)); }
function gitFileLink(bundle,n) {
  const source=bundle.source;
  if(!source||!/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+$/.test(source.repository)||!/^[a-f\d]{40}$/.test(source.commit)||n.kind!=='hosted_file')return null;
  const relative=`kristals/${bundle.slug}/${n.label}`;
  if(!relative.split('/').every(p=>p!=='.'&&p!=='..'&&p.length))return null;
  return `${source.repository}/blob/${source.commit}/${relative.split('/').map(encodeURIComponent).join('/')}`;
}
function drawInspection(){
  const target=$('inspection');target.replaceChildren();const d=state.bundle;
  const n=d.nodes.find(x=>x.id===state.selection);
  if (!n){target.append(element('p','','Choisissez une notion sur la carte.'));return;}
  const inspectorTitle=d.view_kind==='derived-hosting-navigation'
    ? readableDocumentTitle(n,{ordinal:state.nodeOrdinal.get(n.id)||1,groupLabel:readerDocumentGroups([n])[0]?.label||'Document'})
    : displayNode(n);
  const titleNode=element('h3','',inspectorTitle);titleNode.tabIndex=-1;
  target.append(element('span','kind',publicNodeKind(n.kind)),titleNode);
  const localizedDefinition=state.localized?.get(n.id)?.definition;
  const description=displayDescription(n);
  if(description)target.append(element('p',localizedDefinition?'node-definition':'node-description',description));
  if(d.view_kind==='derived-hosting-navigation')target.append(element('p','subtle-hint',
    'Ce document est répertorié dans la collection publique. Son contenu n’a pas été vérifié indépendamment.'));

  if(isKnowledge() && isUnnamedForVisitor(n))target.append(element('p','subtle-hint','Cette notion ne possède pas encore d’intitulé vérifié. Ses liens ne suffisent pas à lui attribuer un nom.'));
  if(state.locale && !state.localized?.has(n.id)) target.append(element('p','subtle-hint','Traduction révisée indisponible pour cette notion. Les mots d’origine sont conservés lorsqu’ils existent.'));
  if(n.period||n.source){const info=element('dl','public-node-facts');
    if(n.period&&!isOpaqueReaderText(n.period))addDefinition(info,/^\d{4}$/.test(String(n.period))?'Année mentionnée':'Date ou période déclarée',n.period);
    if(n.source&&!isOpaqueReaderText(n.source))addDefinition(info,'Source mentionnée',n.source);
    target.append(info);
  }
  const nodeById=new Map(d.nodes.map(x=>[x.id,x]));
  const sourceRelations=(d.view_kind==='derived-semantic-preview'||isKnowledge() ? d.edges : [])
    .filter(e=>e.from===n.id||e.to===n.id);
  const related=sourceRelations.filter(e=>{
    const other=nodeById.get(e.from===n.id?e.to:e.from);
    return other && !other.technical_identifier && !isReferenceOrMachineValue(other) &&
      (state.showUnnamed || !isKnowledge() || isNamedForReader(other,{
        localizedLabel:state.localized?.get(other.id)?.label,requireReviewed:Boolean(state.locale)
      }));
  });
  const grouped=sourceRelations.filter(e=>{
    const other=nodeById.get(e.from===n.id?e.to:e.from);
    return other && !other.technical_identifier && !related.includes(e);
  });
  if(related.length){
    target.append(element('h4','relation-heading',`Liens avec d’autres notions (${related.length.toLocaleString('fr-FR')})`));
    const list=element('div','relation-list');
    const addRelation=(edge)=>{
      const other=nodeById.get(edge.from===n.id?edge.to:edge.from);
      if(!other)return;
      const button=element('button','relation-entry');button.type='button';
      button.append(element('strong','',displayNode(other)),
        element('small','',displayRelation(edge.relation)));
      button.addEventListener('click',()=>focusOn(other.id));list.append(button);
    };
    for(const edge of related.slice(0,8))addRelation(edge);
    target.append(list);
    if(related.length>8){
      const more=element('details','more-relations');more.append(element('summary','',`Voir les ${related.length-8} autres liens`));
      const holder=element('div','relation-list');const load=element('button','link-button','Afficher 40 liens de plus');load.type='button';
      let offset=8;
      const append=()=>{
        const limit=Math.min(related.length,offset+40);
        // The same relation entries, built only when the visitor requests them.
        for(const edge of related.slice(offset,limit)){
          const other=nodeById.get(edge.from===n.id?edge.to:edge.from);
          if(!other)continue;
          const button=element('button','relation-entry');button.type='button';
          button.append(element('strong','',displayNode(other)),element('small','',displayRelation(edge.relation)));
          button.addEventListener('click',()=>focusOn(other.id));holder.append(button);
        }
        offset=limit;load.hidden=offset>=related.length;
      };
      more.addEventListener('toggle',()=>{if(more.open&&!more.dataset.loaded){more.dataset.loaded='1';append();}});
      load.addEventListener('click',append);more.append(holder,load);target.append(more);
    }
  } else if(isKnowledge()) target.append(element('p','subtle-hint','Aucun lien direct vers une notion nommée n’est disponible dans cette sélection.'));
  if(isKnowledge() && grouped.length){
    const mediaLinks=grouped.filter(e=>isReferenceOrMachineValue(nodeById.get(e.from===n.id?e.to:e.from))).length;
    if(grouped.length>mediaLinks)target.append(element('p','reader-grouped-hint',
      `${grouped.length-mediaLinks} lien(s) vers des notions sans intitulé sont regroupés, sans changer les relations d’origine.`));
    if(mediaLinks)target.append(element('p','reader-grouped-hint',
      `${mediaLinks} lien(s) vers des ressources ou informations techniques ne sont pas présentés comme des connaissances.`));
  }
  if(d.view_kind==='derived-hosting-navigation'){
    const link=gitFileLink(d,n);
    if(link){const a=element('a','inspector-action','Consulter ce document public');
      a.href=link;a.target='_blank';a.rel='noopener noreferrer';target.append(a);}
  }
  if(d.source?.repository){const issue=element('a','inspector-action','Signaler un problème');
    const title=`Konstellation Light · ${publicKristalTitle(d.slug,d.title)} · ${short(displayNode(n),70)}`;
    const body=`Révision: ${d.revision}\nState ref: ${d.state_ref}\nSurface digest: ${d.surface_digest}\nEntité: ${n.id}\nLien: ${location.href}\n\nObservation (à compléter) :`;
    issue.href=`${d.source.repository}/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
    issue.target='_blank';issue.rel='noopener noreferrer';target.append(issue);
  }
}

function selectionDescriptor() {
 const d=state.bundle;
 return { format:'konstellation.light-selection/1.0', note:'Sélection de navigation dérivée, sans engagement sémantique',slug:d.slug,revision:d.revision,
  state_ref:d.state_ref,surface_digest:d.surface_digest,lens:state.lens,focus:state.selection,query:state.query,satellites:state.satellites };
}
async function main(){
  // Local preview is a live view of a rebuilt folder, not a PWA deployment.
  // A service worker registered by an older Light version can answer a missing
  // bundle with a network error. Unregister only for the loopback preview.
  if (['127.0.0.1', 'localhost'].includes(location.hostname) && 'serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.getRegistration('./');
      if (registration) await registration.unregister();
      if (navigator.serviceWorker.controller && sessionStorage.getItem('konstellation-light-sw-reset') !== '1') {
        sessionStorage.setItem('konstellation-light-sw-reset', '1');
        location.reload();
        return;
      }
      if (!navigator.serviceWorker.controller) sessionStorage.removeItem('konstellation-light-sw-reset');
    } catch { /* The local reader must still work if service workers are unavailable. */ }
  }
  const params=new URLSearchParams(location.search);
  state.requestedCategory=(params.get('cat')||'').slice(0,40);
  state.embed=params.get('embed')==='1';document.documentElement.classList.toggle('embed',state.embed);
  const back=params.get('retour');
  if(back && /^\/eleve\/(?:[a-z0-9._~!$&'()*+,;=:@%\/?-]*)$/i.test(back) && !back.includes('//')){ $('back-ekole').href=back; $('back-ekole').hidden=false; }
  else if(location.pathname.includes('/eleve/konstellation/')){ $('back-ekole').href='../'; $('back-ekole').hidden=false; }
  state.query=(params.get('q')||'').slice(0,250);$('search').value=state.query;
  state.autoLens=!params.has('lens');
  state.lens=['constellation','registry','trace','compare'].includes(params.get('lens'))?params.get('lens'):'constellation';
  state.selection=params.get('focus'); state.satellites=clampSatellites(params.get('n')||8);
  state.showUnnamed=params.get('ids')==='1';$('show-unnamed').checked=state.showUnnamed;
  state.requestedLocale=params.get('lang')||null;
  try {
    const res=await fetch('./data/catalog.json',{cache:'no-cache'});if(!res.ok)throw Error('Catalogue indisponible');
    const catalog=await res.json();
    if(catalog.format!=='konstellation.light-catalog/1.0'||!Array.isArray(catalog.entries)||catalog.entries.length===0||catalog.entries.length>1000)throw Error('Catalogue invalide');
    state.catalog=catalog;
    const first=catalog.entries[0];const slug=catalog.entries.some(x=>x.slug===params.get('k'))?params.get('k'):first.slug;
    const revision=lookup(slug,params.get('r'))?params.get('r'):existingRevisions(slug).at(-1).revision;
    if(!params.has('lens')) state.lens='constellation';
    await setChoice(slug,revision,{keepFocus:true});
  }catch(e){showFailure(e);}
}
$('collection').addEventListener('change',()=>{const s=$('collection').value;state.page=0;state.docCategory=null;state.requestedCategory=null;state.autoLens=true;state.lens='constellation';state.query='';$('search').value='';setChoice(s,existingRevisions(s).at(-1).revision);});
$('revision').addEventListener('change',()=>{state.page=0;setChoice(state.slug,$('revision').value);});
$('localization').addEventListener('change',async()=>{
  const selected=$('localization').value;
  try{await loadLocalization(selected||null);state.requestedLocale=state.locale;
    $('localization-status').textContent=state.locale?`Texte révisé en ${new Intl.DisplayNames(['fr'],{type:'language'}).of(state.locale)} ; interface en français.`:'Mots d’origine ; interface en français.';
    state.page=0;render();urlState();
  }catch(e){$('localization-status').textContent=e.message;notify('Fichier de langue refusé : '+e.message);
    $('localization').value=state.locale||'';}
});
$('show-unnamed').addEventListener('change',()=>{
  state.showUnnamed=$('show-unnamed').checked;
  if(!state.showUnnamed && isKnowledge() && isUnnamedForVisitor(state.bundle?.nodes.find(n=>n.id===state.selection))){
    const named=state.bundle.nodes.find(n=>!n.technical_identifier&&!isUnnamedForVisitor(n));
    if(named){state.selection=named.id;state.history=[named.id];state.autoFocus=false;}
  }
  state.page=0;render();urlState();
});
for(const btn of document.querySelectorAll('[data-lens]'))btn.addEventListener('click',()=>{state.autoLens=false;state.lens=btn.dataset.lens;state.page=0;render();urlState();});
$('search').addEventListener('input',()=>{state.query=$('search').value.slice(0,250);state.page=0;render();urlState();});
document.addEventListener('keydown',e=>{if(e.key==='Escape' && state.portraitId){e.preventDefault();document.querySelector('.node-portrait-card .portrait-close')?.click();}});
$('satellites').addEventListener('input',()=>{state.satellites=clampSatellites($('satellites').value);render();urlState();});
$('graph-back').addEventListener('click',()=>{
  if(state.bundle?.view_kind==='derived-hosting-navigation' && state.docCategory){
    state.docCategory=null;state.selection=state.bundle.nodes.find(n=>n.kind==='hosted_state')?.id||null;
    state.history=state.selection?[state.selection]:[];render();urlState();return;
  }
  if(state.history.length<2)return;state.history.pop();state.selection=state.history.at(-1);render();urlState();
});
$('graph-home').addEventListener('click',()=>{
  if(!state.bundle)return;
  if(state.bundle.view_kind==='derived-hosting-navigation'){
    state.docCategory=null;state.selection=state.bundle.nodes.find(n=>n.kind==='hosted_state')?.id||state.bundle.nodes[0]?.id;
    state.history=state.selection?[state.selection]:[];render();urlState();return;
  }
  const nodes=state.bundle.nodes;const edges=readableKnowledgeEdges(nodes,state.bundle.edges,'');
  const eligible=nodes.filter(n=>!n.technical_identifier&&!isReferenceOrMachineValue(n));
  const id=readerConnectedNamedFocus(eligible,edges,{localized:state.localized,requireReviewed:Boolean(state.locale)}) || connectedEntry(eligible,edges);
  const home=nodes.find(n=>n.id===id)||eligible[0]||nodes[0];if(home)focusOn(home.id);
});
$('reset').addEventListener('click',()=>{state.page=0;state.query='';$('search').value='';render();urlState();});
$('share').addEventListener('click',async()=>{urlState();try{await navigator.clipboard.writeText(location.href);notify('Lien de navigation copié.');}catch{notify(`Copiez l’URL du navigateur pour partager la vue.`);}});
$('export')?.addEventListener('click',()=>{if(!state.bundle)return;const text=JSON.stringify(selectionDescriptor(),null,2)+'\n';
 const href=URL.createObjectURL(new Blob([text],{type:'application/json'}));const a=element('a');a.href=href;a.download='konstellation-light-selection.json';a.click();setTimeout(()=>URL.revokeObjectURL(href),3000);notify('Descripteur de sélection exporté.');});
$('offline').addEventListener('click',async()=>{
 if(['127.0.0.1','localhost'].includes(location.hostname)){notify('Mode hors ligne réservé au site hébergé. La prévisualisation locale lit toujours les fichiers à jour.');return;}
 if(!('serviceWorker' in navigator)){notify('Mode hors ligne indisponible dans ce navigateur.');return;}
 try{const reg=await navigator.serviceWorker.register('./sw.js',{scope:'./'});await navigator.serviceWorker.ready;
 const row=lookup(state.slug,state.revision);const worker=reg.active||reg.waiting||reg.installing;
 worker?.postMessage({type:'KEEP',urls:['./data/catalog.json',`./${row.path}`,...(state.locale?[`./${row.localizations[state.locale].path}`]:[])]});notify('Cache local public activé. Revérifiez les versions après reconnexion.');}
 catch(e){notify(`Mode hors ligne non activé : ${e.message}`);}
});
const networkStatus = () => { $('mode-label').textContent = navigator.onLine ? 'Consultation en lecture seule' : 'Hors ligne · version enregistrée'; };
window.addEventListener('online',networkStatus);window.addEventListener('offline',networkStatus);networkStatus();
window.addEventListener('popstate',()=>location.reload());
main();
