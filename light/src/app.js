import {clampSatellites, graphNeighborhood, navigationPath, buildNeighborIndex, previewNeighbors, readableKnowledgeEdges, connectedEntry, secondaryRing} from './graph-core.mjs';
import {portraitFor, orbitPreview} from './profile.mjs';
import {directNeighborPages, connectedEntryPoints, graphCaptionLines, readableMapPositions, mapGeometrySafe} from './exploration-v19.mjs';
import {semanticLabel, readableNodeLabel, semanticQueryMatch, publicKristalTitle, isUnlabeledKnowledge, publicNodeKind, publicDescription, publicRelationLabel, isMachineRelationLabel, publicConceptLabel, publicReaderLabel, publicReaderDescription, isOpaqueReaderText, isNamedForReader, readerKnowledgeSummary, defaultReaderLens, readerPreferredFocus, readerDocumentGroups, readerDocumentMap, readerDocumentCategory, readerConnectedNamedFocus, readableDocumentTitle, readerMediaCategory, readerMediaGroups, isReaderMachineValue, isReaderPredicateCode} from './semantic-display.mjs';
import {validateLocalization, validateLocaleDescriptor, localizationMap, relationLocalizationMap, normalizeLocale, selectedSearchLocales, selectedDescriptors, searchMatches, loadSearchResources, MAX_SEARCH_LANGUAGES} from './multilingual-read.mjs';
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
const documentReading = n => state.bundle?.reading?.documents?.find(d=>n?.kind==='hosted_file' && d.path===n.label) || null;
const displayDocumentTitle = n => {
  const found=documentReading(n);if(found?.title)return found.title;
  if(n?.kind==='hosted_file' && /\.md$/i.test(n.label)){
    const filename=n.label.split('/').at(-1).replace(/\.md$/i,'');
    const label=filename.replace(/^\d+[_-]*/,'').replace(/[_-]+/g,' ').trim();
    if(label)return `Document : ${label}`;
  }
  return readableDocumentTitle(n,{ordinal:state.nodeOrdinal?.get(n.id)||1,groupLabel:readerDocumentGroups([n])[0]?.label||'Document'});
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
const state = { catalog: null, bundle: null, selection: null, query: '', lens: 'constellation', slug: null, revision: null, embed: false, page: 0, satellites:8, history: [], portraitId: null, showUnnamed:false, autoFocus:false, autoLens:true, docCategory:null, neighborPage:0, overviewOpen:true, readingId:null, locale:null, localized:null, localizedRelations:null, localeCache:new Map(), nodeOrdinal:new Map() };
// Search preferences are independent of the display localization.
const ML_PREF_KEY='konstellation-light-search-locales-v1';
const uiLocale=()=>normalizeLocale(document.documentElement.lang)||'fr';
let searchExtras=[];
try{const saved=JSON.parse(localStorage.getItem(ML_PREF_KEY)||'[]');if(Array.isArray(saved))searchExtras=selectedSearchLocales(uiLocale(),saved).filter(x=>![uiLocale(),'en'].includes(x));}catch{}
let originalSearchOverride=null, searchGeneration=0, searchController=null, choiceGeneration=0, displayGeneration=0;
let searchState={pending:false,results:[],failures:[]};
const localeName=tag=>{try{return new Intl.DisplayNames([tag],{type:'language'}).of(tag)||tag;}catch{return tag;}};
const searchTags=()=>selectedSearchLocales(uiLocale(),searchExtras);
const saveSearchExtras=()=>{try{localStorage.setItem(ML_PREF_KEY,JSON.stringify(searchExtras));}catch{}};
function cancelSearch(){searchGeneration++;searchController?.abort();searchController=null;searchState={pending:false,results:[],failures:[]};}
function currentDescriptors(){return state.bundle?lookup(state.slug,state.revision)?.localizations||{}:{};}
function sourceSearchEnabled(){return originalSearchOverride??Object.keys(currentDescriptors()).length===0;}
function renderSearchControls(){
  const desc=currentDescriptors(),active=searchTags(),available=Object.keys(desc).map(normalizeLocale).filter(Boolean);
  const missing=active.filter(tag=>!available.includes(tag));
  $('search-language-summary').textContent=`Langues de recherche · ${active.map(localeName).join(' + ')}${sourceSearchEnabled()?' + sources d’origine':''}`;
  $('search-language-defaults').textContent=`Par défaut : ${[...new Set([uiLocale(),'en'])].map(localeName).join(' + ')}.`;
  const add=$('search-language-add');
  fillSelect(add,[['','—'],...[...new Set(available)].filter(tag=>!active.includes(tag)).sort().map(tag=>[tag,`${localeName(tag)} (${tag})`])],'');
  add.disabled=active.length>=MAX_SEARCH_LANGUAGES||add.options.length===1;
  const chips=$('search-language-extras');chips.replaceChildren();
  for(const tag of searchExtras){const button=element('button','button ghost',`${localeName(tag)} (${tag}) ×`);button.type='button';button.setAttribute('aria-label',`Retirer ${localeName(tag)}`);button.addEventListener('click',()=>{searchExtras=searchExtras.filter(x=>x!==tag);saveSearchExtras();state.page=0;refreshSearch();});chips.append(button);}
  $('search-original').checked=sourceSearchEnabled();
  const failures=searchState.failures.map(x=>x.locale);
  $('search-language-status').textContent=[Object.keys(desc).length===0?'Aucune ressource linguistique révisée pour ce Kristal : le mode source est distinct de la recherche par langue.':'Seules les ressources des langues choisies sont interrogées.',missing.length?`Non disponibles : ${missing.join(', ')}.`:'',failures.length?`Ressources refusées ou indisponibles : ${failures.join(', ')}.`:'',active.length>=MAX_SEARCH_LANGUAGES?`Limite active : ${MAX_SEARCH_LANGUAGES} langues.`:''].filter(Boolean).join(' ');
}
function originalRows(bundle){
  return bundle.nodes.filter(n=>!n.technical_identifier&&!(isKnowledge()&&isReferenceOrMachineValue(n))&&n.kind!=='hosted_state').map(n=>{
    const doc=documentReading(n);
    const label=bundle.view_kind==='derived-hosting-navigation'?displayDocumentTitle(n):isNamedForReader(n)?publicReaderLabel(n,{viewKind:bundle.view_kind}):'';
    return {node_id:n.id,locale:null,label,definition:[publicReaderDescription(n.description),doc?.excerpt,doc?.sections?.map(s=>s.title).join(' '),bundle.view_kind==='derived-hosting-navigation'?readerDocumentCategory(n):'',bundle.view_kind==='derived-semantic-preview'?(n.aliases||[]).join(' '):''].filter(Boolean).join(' ')};
  });
}
async function refreshSearch(){
  cancelSearch();
  if(!state.bundle)return;
  const generation=searchGeneration,bundle=state.bundle,query=state.query.trim();
  renderSearchControls();
  if(!query){render();urlState();return;}
  const controller=new AbortController();searchController=controller;
  searchState.pending=true;render();urlState();
  const rows=sourceSearchEnabled()?originalRows(bundle):[];
  const allowed=new Set(bundle.nodes.filter(n=>!n.technical_identifier&&n.kind!=='hosted_state'&&!(isKnowledge()&&isReferenceOrMachineValue(n))).map(n=>n.id));
  let loaded;
  try{loaded=await loadSearchResources(searchTags(),currentDescriptors(),r=>fetchLocalization(r.tag,r.descriptor,bundle,controller.signal),{signal:controller.signal});}
  catch(e){if(generation!==searchGeneration||bundle!==state.bundle)return;searchState={pending:false,results:[],failures:[{locale:'catalogue',error:e.message}]};renderSearchControls();render();return;}
  if(generation!==searchGeneration||bundle!==state.bundle||loaded.aborted)return;
  for(const resource of loaded.resources)for(const entry of resource.doc.entries){
    if(allowed.has(entry.node_id)&&entry.provenance.review_status==='reviewed')rows.push({node_id:entry.node_id,locale:resource.locale,label:entry.label&&!isOpaqueReaderText(entry.label)?entry.label:'',definition:publicReaderDescription(entry.definition)});
  }
  searchState={pending:false,results:searchMatches(query,rows,{uiLocale:uiLocale()}),failures:loaded.failures};
  renderSearchControls();render();urlState();
}
function drawMultilingualResults(target){
  if(searchState.pending){target.append(element('p','loading','Recherche dans les langues sélectionnées…'));return;}
  const results=searchState.results;
  if(!results.length){target.append(element('p','empty','Aucun résultat dans le périmètre choisi. Vous pouvez ajouter une langue ou consulter les textes d’origine.'));return;}
  const byId=new Map(state.bundle.nodes.map(n=>[n.id,n]));
  const list=element('div','ml-search-results');
  for(const item of results.slice(0,(state.page+1)*60)){
    const node=byId.get(item.node_id);if(!node)continue;
    const best=item.matches[0],display=state.localized?.get(node.id)?.label;
    const title=display||best.label||displayNode(node);
    const btn=element('button','record',undefined);btn.type='button';
    const body=element('main');body.append(element('strong','',title));
    for(const m of item.matches){body.append(element('small','ml-result-match',`${m.locale?localeName(m.locale)+' ('+m.locale+')':'Source d’origine (langue non déclarée)'} · ${m.label||short(m.definition,140)}`));}
    btn.append(body);btn.addEventListener('click',()=>{state.query='';$('search').value='';cancelSearch();state.lens='constellation';state.autoLens=false;focusOn(node.id);});list.append(btn);
  }
  target.append(list);
  if(results.length>(state.page+1)*60){const more=element('button','button ghost','Afficher 60 résultats supplémentaires');more.type='button';more.addEventListener('click',()=>{state.page++;render();});target.append(more);}
}
let toastTimeout;
let portraitOpener = null;
function notify(message) { const t = $('toast'); t.textContent = message; t.hidden = false; clearTimeout(toastTimeout); toastTimeout = setTimeout(() => t.hidden = true, 3300); }
function urlState() {
  const p = new URLSearchParams(location.search);
  p.set('k', state.slug || ''); p.set('r', state.revision || ''); p.set('lens', state.lens); p.set('n', String(state.satellites));
  if (state.selection) p.set('focus', state.selection); else p.delete('focus');
  if (state.query) p.set('q', state.query); else p.delete('q');
  if (state.readingId) p.set('lecture',state.readingId); else p.delete('lecture');
  if (state.showUnnamed) p.set('ids','1'); else p.delete('ids');
  if (state.neighborPage) p.set('pg',String(state.neighborPage)); else p.delete('pg');
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
  if (obj.reading !== undefined) {
    const r=obj.reading;
    const safePath=p=>typeof p==='string' && p.length<=240 &&
      /^(?:README\.md|AI_START_HERE\.md|docs\/(?:[A-Za-z0-9_.-]+\/)?[A-Za-z0-9_.-]+\.md|ai\/(?:CONTEXT|QUESTIONS|GLOSSARY)\.md)$/.test(p);
    const safeString=(value,max)=>typeof value==='string'&&value.length<=max;
    const sourceDigest=s=>typeof s==='string'&&/^sha256:[a-f0-9]{64}$/.test(s);
    if (!r || r.format!=='konstellation.light-reading/1.0' ||
        r.status!=='source-public-documents-unqualified'||r.semantic_assertions_created!==0||
        !safeString(r.intro,420)||!Array.isArray(r.topics)||r.topics.length>10||
        !Array.isArray(r.documents)||r.documents.length>48||
        !Number.isSafeInteger(r.scanned_files)||r.scanned_files!==r.documents.length||
        !(r.overview_path===null||safePath(r.overview_path)) ||
        !r.documents.every(d=>safePath(d.path)&&sourceDigest(d.sha256)&&safeString(d.title,150)&&
          safeString(d.excerpt,320)&&Array.isArray(d.sections)&&d.sections.length<=8&&
          d.sections.every(s=>safeString(s.title,110)&&Number.isInteger(s.line)&&s.line>0)&&
          Array.isArray(d.topics)&&d.topics.length<=10&&
          d.topics.every(t=>safeString(t.title,95)&&safeString(t.detail,210)&&safeString(t.section,90)&&Number.isInteger(t.line)&&t.line>0))||
        !r.topics.every(t=>safeString(t.title,95)&&safeString(t.detail,210)&&safeString(t.section,90)&&Number.isInteger(t.line)&&t.line>0) ||
        (r.overview_path!==null&&!r.documents.some(d=>d.path===r.overview_path)))
      throw Error('Projection documentaire non conforme.');
  }
  if (obj.guided_reading !== undefined) {
    const g=obj.guided_reading;
    const docs=obj.reading?.documents||[];
    const sourceDoc=docs.find(d=>d.path==='README.md');
    if(!g || g.format!=='konstellation.light-guided-reading/1.0' ||
       g.status!=='verbatim-source-unqualified' || g.semantic_assertions_created!==0 ||
       g.source_commit!==obj.source?.commit || !Array.isArray(g.passages) ||
       g.passages.length<1 || g.passages.length>8 || !sourceDoc ||
       !g.passages.every(x=>/^lecture-scene-(?:0[1-9]|1[0-9]|20)$/.test(x.id) &&
         x.id===`lecture-scene-${String(x.scene).padStart(2,'0')}` &&
         Number.isInteger(x.scene) && x.scene>0 && x.scene<=20 &&
         typeof x.title==='string' && x.title.length>0 && x.title.length<=130 &&
         typeof x.text==='string' && x.text.length>0 && x.text.length<=500 &&
         (x.explanation===undefined || typeof x.explanation==='string' && x.explanation.length<=240) &&
         (x.related===undefined || Array.isArray(x.related) && x.related.length<=5 &&
           x.related.every(part=>Number.isInteger(part.line) && part.line>0 && part.line<2000 &&
             typeof part.text==='string' && part.text.length>0 && part.text.length<=240)) &&
         x.source_path==='README.md' && Number.isInteger(x.line) && x.line>0 && x.line<2000 &&
         x.sha256===sourceDoc.sha256) ||
       new Set(g.passages.map(x=>x.id)).size!==g.passages.length)
      throw Error('Citations guidées non conformes ou sources incohérentes.');
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
async function fetchLocalization(tag,desc,bundle,signal){
  if(!desc)throw Error('Traduction non disponible dans cette version.');
  validateLocaleDescriptor(tag,desc);
  const key=desc.sha256;
  let doc=state.localeCache.get(key);
  if(!doc){
    const res=await fetch(`./${desc.path}`,{cache:'no-store',signal});
    if(!res.ok)throw Error('Fichier de langue indisponible.');
    const bytes=await res.arrayBuffer();
    if(bytes.byteLength!==desc.bytes||`sha256:${await sha256(bytes)}`!==desc.sha256)throw Error('Intégrité du fichier de langue invalide.');
    doc=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
  }
  validateLocalization(doc,bundle);
  if(doc.locale!==tag)throw Error('Langue du fichier incompatible.');
  if(signal?.aborted)throw Error('Recherche annulée.');
  state.localeCache.delete(key);state.localeCache.set(key,doc);
  // Bound memory independently of the total number of catalog languages.
  while(state.localeCache.size>20)state.localeCache.delete(state.localeCache.keys().next().value);
  return doc;
}
async function loadLocalization(tag) {
  const generation=++displayGeneration,bundle=state.bundle;
  if(!tag){state.locale=null;state.localized=null;state.localizedRelations=null;return true;}
  const desc=lookup(state.slug,state.revision)?.localizations?.[tag];
  const doc=await fetchLocalization(tag,desc,bundle);
  if(generation!==displayGeneration||bundle!==state.bundle)return false;
  state.locale=tag;state.localized=localizationMap(doc);state.localizedRelations=relationLocalizationMap(doc);return true;
}
function renderLocalizationSelector(preferred){
  const row=lookup(state.slug,state.revision),tags=Object.keys(row?.localizations||{}).sort();
  $('localization-row').hidden=false;
  const options=[['','Mots d’origine (interface en français)'],...tags.map(x=>[x,`${localeName(x)} (${x})`])];
  fillSelect($('localization'),options,tags.includes(preferred)?preferred:'');
  $('localization-status').textContent=tags.length
    ? 'Seules les traductions révisées sont proposées. L’interface reste en français.'
    : 'Aucune traduction révisée n’est encore publiée pour ce Kristal. L’interface est en français ; les connaissances restent dans leur langue d’origine.';
  return tags.includes(preferred)?preferred:null;
}
async function setChoice(slug, revision, { keepFocus = false } = {}) {
  const row = lookup(slug, revision);
  if (!row) return;
  const generation=++choiceGeneration; ++displayGeneration; cancelSearch(); originalSearchOverride=null;
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
    if(generation!==choiceGeneration)return;
    cancelSearch();
    state.slug = slug; state.revision = revision; state.bundle = data; state.portraitId = null;
    if (!keepFocus){state.neighborPage=0;state.overviewOpen=true;}
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
      try{await loadLocalization(desiredLanguage);}
      catch(e){if(generation!==choiceGeneration)return;$('localization').value='';$('localization-status').textContent=`Traduction refusée ou indisponible : ${e.message}. Mots d’origine affichés.`;}
      if(generation!==choiceGeneration)return;
      if(state.locale)$('localization-status').textContent=`Texte révisé en ${localeName(desiredLanguage)} ; interface en français.`;
      if(!validFocus&&state.locale){
        const translatedFocus=readerPreferredFocus(data.nodes,activeEdges,{localized:state.localized,requireReviewed:true});
        if(translatedFocus){state.selection=translatedFocus;state.history=[translatedFocus];state.autoFocus=false;}
      }
    }
    if(state.autoLens)state.lens=(data.reading?.documents?.length && (hosting || namedEdges<2)) ? 'discover' : defaultReaderLens(data,{localized:state.localized,requireReviewed:Boolean(state.locale)});
    fillSelect($('collection'), [...new Set(state.catalog.entries.map(e => e.slug))].map(s => [s, publicKristalTitle(s,state.catalog.entries.find(e=>e.slug===s).title)]).sort((a,b)=>a[1].localeCompare(b[1],'fr')), slug);
    const versions=existingRevisions(slug);
    fillSelect($('revision'), versions.map((x,i) => [x.revision, `Version ${i+1}`]), revision);
    $('revision-row').hidden=versions.length<2;
    $('compare-tab').hidden=versions.length<2;
    if (versions.length<2 && state.lens==='compare') state.lens='constellation';
    const existsInGuide=Boolean(data.guided_reading?.passages?.some(x=>x.id===state.readingId));
    if(state.readingId && !existsInGuide && !(state.readingId==='lecture-scene-02' && data.slug==='biology'))
      state.readingId=null;
    if(state.readingId)state.lens='discover';
    renderSearchControls(); await refreshSearch();
    if(generation!==choiceGeneration)return;
    if(state.readingId)markGuidedReading(state.readingId,{scroll:true});
  } catch (e) { if(generation===choiceGeneration)showFailure(e); }
}
function showFailure(err) {
  state.bundle = null;
  $('visual').replaceChildren(element('div', 'empty', `Lecture interrompue : ${err.message}`));
  // The visitor layout does not confuse byte integrity with factual accuracy.
  notify(/(?:SHA-256|intégrité|invalide|non conforme|incorrect)/i.test(err.message) ? 'Intégrité ou format à vérifier.' : 'Lecture interrompue : voir le message ci-dessus.');
}
function filteredNodes() {
  const q = state.query.trim();
  if (!q) return isKnowledge() ? state.bundle.nodes.filter(n=>
    !n.technical_identifier && !isReferenceOrMachineValue(n) && (state.showUnnamed || isNamedForReader(n,{
      localizedLabel:state.localized?.get(n.id)?.label,requireReviewed:Boolean(state.locale)
    }))) : state.bundle.nodes.filter(n=>n.kind!=='hosted_state');
  const ids=new Set(searchState.results.map(r=>r.node_id));
  return state.bundle.nodes.filter(n=>ids.has(n.id));
}
function focusOn(id) {
  if (!state.bundle.nodes.some(n => n.id === id)) return;
  state.neighborPage=0; state.overviewOpen=false;
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
    discover: ['Découvrir ce Kristal', 'Présentation et documents tirés de la source publique; aucune relation ni qualification inventée.'],
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
  document.querySelector('[data-lens="discover"]').hidden = !Boolean(data.reading?.documents?.length);
  document.querySelector('[data-lens="constellation"]').hidden=false;
  document.querySelector('[data-lens="constellation"]').lastChild.textContent=isKnowledge()?' Constellation des connaissances':' Carte des documents';
  document.querySelector('.advanced-toggle').hidden=data.view_kind==='derived-hosting-navigation';
  document.querySelector('[data-lens="registry"]').lastChild.textContent=isKnowledge()?' Explorer les notions':' Parcourir les documents';
  document.querySelector('label[for="satellites"]').firstChild.textContent=isKnowledge()?'Notions autour du sujet ':'Documents visibles ';
  $('satellites').setAttribute('aria-label',isKnowledge()?'Nombre de bulles autour de la notion centrale':'Nombre maximal de documents affichés par catégorie');
  $('satellites').value = String(state.satellites); $('satellites-count').textContent = String(state.satellites);
  $('graph-back').disabled = state.history.length < 2 && !(data.view_kind==='derived-hosting-navigation' && state.docCategory);
  const [heading, hint] = lensMeta(); $('panel-title').textContent = heading; $('panel-hint').textContent = hint;
  $('view-tag').textContent = ({discover:'LECTURE SOURCÉE',constellation:isKnowledge()?'CARTE DES LIENS':'CARTE DOCUMENTAIRE',registry:isKnowledge()?'NOTIONS':'DOCUMENTS',trace:'VÉRIFICATION',compare:'VERSIONS'})[state.lens];
  if (state.lens==='trace' || state.lens==='compare') $('advanced-tools').open=true;
  document.querySelectorAll('[data-lens]').forEach(btn => { btn.classList.toggle('active', btn.dataset.lens === state.lens); btn.setAttribute('aria-pressed', String(btn.dataset.lens === state.lens)); });
  const visible = filteredNodes(); $('count').textContent = state.lens==='discover' ? `${data.reading?.documents?.length||0} document(s) publics présentés` : state.query.trim() ? `${visible.length.toLocaleString('fr-FR')} résultat(s)` : isKnowledge() ? `${visible.length.toLocaleString('fr-FR')} notions disponibles sur la carte` : `${visible.filter(n=>n.kind==='hosted_file').length.toLocaleString('fr-FR')} documents répertoriés`;
  const view = $('visual'); view.replaceChildren();
  updateReaderTrail();
  if(state.query.trim()){
    $('count').textContent=searchState.pending?'Recherche…':`${searchState.results.length.toLocaleString('fr-FR')} résultat(s)`;
    $('graph-controls').hidden=true;$('panel-title').textContent='Résultats de recherche';
    $('panel-hint').textContent='Une entrée par identité dans le Kristal, avec les langues correspondantes.';
    $('view-tag').textContent='RECHERCHE';$('truncation').textContent='Périmètre linguistique sélectionné';
    drawMultilingualResults(view);drawInspection();return;
  }
  if (state.lens === 'discover') drawDiscover(view);
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

// V21 — reading is deliberately selected from the pinned source, never guessed
// from the viewport text. Only the visible quoted span carries the stable ID.
function markGuidedReading(id,{scroll=false}={}){
  const quotes=[...document.querySelectorAll('[data-reading-id]')];
  for(const quote of quotes){
    const selected=quote.dataset.readingId===id;
    quote.classList.toggle('v21-reading-selected',selected);
    quote.setAttribute('aria-current',selected?'true':'false');
  }
  const target=quotes.find(node=>node.dataset.readingId===id);
  if(scroll && target)target.scrollIntoView({block:'center',behavior:'instant'});
  return Boolean(target);
}
function drawGuidedReading(target){
  const guides=state.bundle.guided_reading?.passages || [];
  if(!guides.length)return;
  const section=element('section','v21-guided');section.id='source-readings';
  section.append(element('p','v21-eyebrow','LECTURE SOURCÉE · VISITE LA FÊTE DES IDÉES'),
    element('h3','','Passages concrets à lire et à comprendre'),
    element('p','v21-guided-note','Chaque extrait provient du README épinglé. Son intégrité a été vérifiée pendant la construction; cela ne qualifie pas la vérité de l’affirmation. Les exemples de la vidéo restent fictifs.'));
  const cards=element('div','v21-reading-cards');
  for(const reading of guides){
    const card=element('article','v21-reading-card');
    const header=element('div','v21-reading-heading');
    header.append(element('span','v21-reading-scene',`SCÈNE ${String(reading.scene).padStart(2,'0')}`),
      element('h4','',reading.title));
    card.append(header);
    const quote=element('blockquote','v21-reading-quote',[reading.text,...(reading.related||[]).map(x=>x.text)].join('\n'));
    quote.id=reading.id;
    quote.dataset.readingId=reading.id;
    quote.dataset.sourceLine=String(reading.line);
    quote.tabIndex=0;
    quote.setAttribute('aria-label',`Passage source pour la scène ${reading.scene} : ${reading.text}`);
    card.append(quote);
    if(reading.explanation)card.append(element('p','v21-commentary',reading.explanation));
    const lineMark=reading.related?.length ? `lignes ${reading.line}–${reading.related.at(-1).line}` : `ligne ${reading.line}`;
    const meta=element('p','v21-reading-provenance',`Source épinglée : kristals/${state.bundle.slug}/README.md · ${lineMark} · SHA-256 ${reading.sha256.slice(7,19)}…`);
    card.append(meta);
    const actions=element('div','v21-reading-actions');
    const btn=element('button','button ghost',`Mettre en évidence la scène ${reading.scene}`);
    btn.type='button';
    btn.addEventListener('click',()=>{
      state.readingId=reading.id;
      urlState();
      markGuidedReading(reading.id,{scroll:true});
    });
    actions.append(btn,sourceAnchor('Voir la ligne d’origine',reading.source_path,reading.line));
    card.append(actions);cards.append(card);
  }
  section.append(cards);target.append(section);
  if(state.readingId)markGuidedReading(state.readingId);
}

// V20 — actual documented reading surface. Everything here is sourced from
// SHA-verified public Markdown; it is NOT a canonical graph transformation.
function publicDocLink(relative, line = null) {
  const source=state.bundle?.source;
  if(!source || !/^https:\/\/github\.com\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(source.repository) ||
     !/^[a-f0-9]{40}$/.test(source.commit) ||
     !/^(?:README\.md|AI_START_HERE\.md|docs\/(?:[A-Za-z0-9_.-]+\/)?[A-Za-z0-9_.-]+\.md|ai\/(?:CONTEXT|QUESTIONS|GLOSSARY)\.md)$/.test(relative))return null;
  const parts=[...('kristals/'+state.bundle.slug+'/'+relative).split('/')];
  if(parts.some(p=>p==='.'||p==='..'||!p))return null;
  const base=source.repository+'/blob/'+source.commit+'/'+parts.map(encodeURIComponent).join('/');
  return base+(Number.isInteger(line)&&line>0?'#L'+line:'');
}
function sourceAnchor(text,path,line=null){
  const url=publicDocLink(path,line);
  if(!url)return element('span','v20-source-local','Source contrôlée : '+path+' · lien GitHub disponible dans la bêta épinglée');
  const a=element('a','v20-source',text);a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;
}
function drawDiscover(target){
  const reading=state.bundle.reading;
  if(!reading || !reading.documents?.length){
    target.append(element('p','reader-muted','Aucune présentation documentaire exploitable dans cette surface publique. La carte reste disponible.'));
    return;
  }
  const intro=element('section','v20-intro');
  intro.append(element('span','v20-eyebrow','PRÉSENTATION ISSUE DES DOCUMENTS PUBLICS'),
    element('h3','',publicKristalTitle(state.bundle.slug,state.bundle.title)));
  intro.append(element('p','v20-intro-copy',reading.intro || 'Aucun paragraphe de présentation exploitable dans le document source.'));
  if(reading.overview_path)intro.append(sourceAnchor('Lire la présentation d’origine',reading.overview_path));
  const notice=element('p','v20-disclaimer','Extraits documentaires non qualifiés. Ces textes n’attribuent aucun nom ou sens aux identifiants du graphe.');
  if(state.bundle.slug==='biology'){
    notice.id='lecture-scene-02';notice.dataset.readingId='lecture-scene-02';notice.tabIndex=0;
  }
  intro.append(notice);
  target.append(intro);
  drawGuidedReading(target);
  if(state.readingId)markGuidedReading(state.readingId);
  if(reading.topics.length){
    const topics=element('section','v20-section');
    topics.append(element('h3','','Repères réellement cités dans la présentation'),
      element('p','v20-subtle','Éléments repris des rubriques du document source, sans liens sémantiques supposés.'));
    const grid=element('div','v20-topic-grid');
    const q=state.query.trim().toLocaleLowerCase('fr');
    for(const t of reading.topics.filter(t=>!q||`${t.title} ${t.detail} ${t.section}`.toLocaleLowerCase('fr').includes(q))){
      const card=element('article','v20-topic');
      card.append(element('strong','',t.title));
      if(t.detail && t.detail!==t.title)card.append(element('p','',t.detail));
      card.append(sourceAnchor('Lire le passage',reading.overview_path,t.line));
      grid.append(card);
    }
    topics.append(grid);target.append(topics);
  }
  const section=element('section','v20-section');
  section.append(element('h3','','Documents pour approfondir'),
    element('p','v20-subtle','Titres, extraits et rubriques présents dans les fichiers publics contrôlés.'));
  const q=state.query.trim().toLocaleLowerCase('fr');
  const docs=reading.documents.filter(d=>!q||`${d.title} ${d.excerpt} ${d.sections.map(s=>s.title).join(' ')}`.toLocaleLowerCase('fr').includes(q));
  const list=element('div','v20-doc-grid');
  for(const d of docs){
    const card=element('article','v20-document');
    card.append(element('h4','',d.title));
    if(d.excerpt)card.append(element('p','',d.excerpt));
    if(d.sections.length){
      const details=element('details','v20-outline');details.append(element('summary','',`Rubriques du document (${d.sections.length})`));
      const ul=element('ul');for(const s of d.sections){const li=element('li');li.append(sourceAnchor(s.title,d.path,s.line));ul.append(li);}details.append(ul);card.append(details);
    }
    const footer=element('div','v20-doc-footer');
    footer.append(sourceAnchor('Consulter la source',d.path,d.heading_line));
    const fileNode=state.bundle.nodes.find(n=>n.kind==='hosted_file'&&n.label===d.path);
    if(fileNode)footer.append(actionButton('Voir dans la carte',()=>{state.lens='constellation';state.autoLens=false;focusOn(fileNode.id);},'button ghost'));
    card.append(footer);list.append(card);
  }
  section.append(list);
  if(!docs.length)section.append(element('p','reader-muted','Aucun extrait documentaire correspondant à la recherche.'));
  target.append(section);
  const actions=element('section','v20-next');
  actions.append(element('strong','',isKnowledge()?'Explorer les connexions disponibles':'Explorer la structure des fichiers'),
    element('p','',isKnowledge()?'La carte représente les relations déclarées, y compris certaines notions encore anonymes.':'La carte classe les fichiers publics; ses traits ne sont pas des relations entre connaissances.'));
  actions.append(actionButton('Ouvrir la carte',()=>{state.lens='constellation';state.autoLens=false;render();urlState();},'button accent'));
  target.append(actions);
  $('truncation').textContent=`${docs.length}/${reading.documents.length} documents présentés · données publiées non qualifiées · ${reading.scanned_files} fichiers Markdown lus`;
}

function drawDocumentConstellation(target,visible){
  const data=state.bundle;
  const allowed=new Set(visible.map(n=>n.id));
  const plan=readerDocumentMap(data.nodes,{category:state.docCategory,allowedIds:allowed,limit:25});
  const selected=plan.selected;
  if(!selected)state.neighborPage=0;
  const groups=plan.groups;
  const pool=selected ? selected.nodes : groups;
  const size=Math.max(3,Math.min(8,state.satellites));
  const pages=Math.max(1,Math.ceil(pool.length/size));
  const page=Math.min(state.neighborPage,pages-1);state.neighborPage=page;
  const shown=pool.slice(page*size,(page+1)*size);
  const items=shown.map(entry=>{
    const isFile=Boolean(selected);
    const label=isFile?displayDocumentTitle(entry):entry.label;
    return {id:isFile?entry.id:entry.key,label,
      meta:isFile?(documentReading(entry)?.excerpt||'Fichier public répertorié'):`${entry.nodes.length} document(s)`,
      cssClass:isFile?'graph-doc-file':'graph-doc-category',
      open:()=>{
        if(isFile)focusOn(entry.id);
        else {state.docCategory=entry.key;state.selection=entry.nodes[0]?.id||null;state.neighborPage=0;
          state.history=state.selection?[state.selection]:[];render();urlState();}
      }};
  });
  drawReadableMap(target,selected?selected.label:publicKristalTitle(data.slug,data.title),items,{documentary:true});
  const focus=element('div','v19-mobile-focus');
  focus.append(element('small','','Structure documentaire · classement, pas liens sémantiques'),
    element('strong','',selected?selected.label:publicKristalTitle(data.slug,data.title)));
  target.append(focus);
  appendNeighborPager(target,page,pool.length,pages);
  const navigation=element('section','reader-doc-navigation');
  navigation.append(element('h3','',selected?`Documents : ${selected.label}`:'Choisir une catégorie documentaire'));
  navigation.append(element('p','reader-muted','Ces regroupements proviennent des fichiers publics. Ils ne représentent pas des relations entre connaissances.'));
  if(selected)navigation.append(actionButton('← Toutes les catégories',()=>{
    state.docCategory=null;state.neighborPage=0;
    state.selection=data.nodes.find(n=>n.kind==='hosted_state')?.id||null;
    state.history=state.selection?[state.selection]:[];render();urlState();},'button ghost'));
  const buttons=element('div','reader-doc-choices');
  for(const item of shown){
    const button=element('button','reader-doc-choice',selected?
      displayDocumentTitle(item):
      `${item.label} · ${item.nodes.length} document(s)`);
    button.type='button';if(selected){button.setAttribute('aria-pressed',String(state.selection===item.id));if(state.selection===item.id)button.classList.add('selected');}
    button.addEventListener('click',selected?()=>focusOn(item.id):()=>{
      state.docCategory=item.key;state.neighborPage=0;state.selection=item.nodes[0]?.id||null;
      state.history=state.selection?[state.selection]:[];render();urlState();});
    buttons.append(button);
  }
  navigation.append(buttons);target.append(navigation);
  $('truncation').textContent=`${pool.length} ${selected?'documents':'catégories'} disponibles · ${shown.length} sur la page · classement documenté`;
}
function updateReaderTrail() {
  const container=$('reader-trail');
  if(!container || !state.bundle || state.lens!=='constellation'){if(container)container.hidden=true;return;}
  container.replaceChildren();container.hidden=false;
  const home=actionButton('Vue d’ensemble',()=>{state.overviewOpen=true;state.neighborPage=0;render();urlState();},'v19-overview-toggle');
  container.append(home);
  if(!isKnowledge() && state.docCategory){container.append(element('span','v19-path-separator','›'),element('span','',readerDocumentGroups(state.bundle.nodes).find(g=>g.key===state.docCategory)?.label||'Documents'));return;}
  const previous=state.history.slice(-4);
  const byId=new Map(state.bundle.nodes.map(n=>[n.id,n]));
  for(const id of previous){const n=byId.get(id);if(!n)continue;
    container.append(element('span','v19-path-separator','›'));
    const b=actionButton(displayNode(n),()=>focusOn(n.id),'v19-trail-button');
    if(id===state.selection)b.setAttribute('aria-current','step');
    container.append(b);
  }
}

function makeCaption(svg,x,y,caption,max=3) {
  const t=svgElement('text',{x,y,class:'v19-caption graph-visible-caption'});
  const lines=graphCaptionLines(caption,22,max);
  for (let i=0;i<lines.length;i++) {
    const line=svgElement('tspan',{x,dy:i?19:0});line.textContent=lines[i];t.append(line);
  }
  svg.append(t);return t;
}

// V19.1 — On touch devices, keep a *real visual connection map* instead of
// hiding the diagram behind a plain relation list. Its branches come solely
// from the items already present in the V19 graph/document plan.
function drawMobileConnectionMap(target,centerLabel,items,{documentary=false}={}){
  const diagram=element('section','v191-mobile-diagram');
  diagram.setAttribute('aria-label',documentary?'Carte tactile de classement des documents':'Carte tactile des connexions déclarées');
  const intro=element('p','v191-mobile-map-caption',documentary?
    'CARTE DOCUMENTAIRE · lignes de classement, sans relation sémantique':
    'CARTE DES LIENS · connexions réellement déclarées');
  const hub=element('div','v191-mobile-hub');
  hub.append(element('span','v191-mobile-hub-mark',documentary?'▤':'✳'),element('strong','',centerLabel));
  diagram.append(intro,hub);
  const branches=element('div','v191-mobile-branches');
  if(!items.length)branches.append(element('p','v191-mobile-empty','Aucun voisin affichable pour cette sélection.'));
  for(const [index,item] of items.entries()){
    const button=element('button','v191-mobile-branch');button.type='button';
    button.setAttribute('data-v191-node-id',String(item.id||item.label));
    button.setAttribute('aria-label',`Explorer ${item.label}. ${item.meta||item.relationLabel||''}`);
    const title=element('strong','',item.label);
    const metadata=element('small','',item.meta||item.relationLabel||
      (documentary?'Document public répertorié':'Lien déclaré'));
    button.append(element('span','v191-mobile-index',String(index+1).padStart(2,'0')),title,metadata);
    button.addEventListener('click',item.open);
    branches.append(button);
  }
  diagram.append(branches);target.append(diagram);
  return diagram;
}

// Accessible, collision-free 2-column constellation, shared with documentary maps.
function drawReadableMap(target,centerLabel,items,{documentary=false}={}){
  if(items.length>8)throw Error('Carte V19 : trop de nœuds simultanément.');
  const positions=readableMapPositions(items.length);
  if(!mapGeometrySafe(positions))throw Error('Carte V19 : géométrie non lisible.');
  const stage=element('div','v19-map-stage');
  const svg=svgElement('svg',{viewBox:'0 0 1000 720',class:'reader-graph-svg v19-map-svg',role:'group',
    'data-map-mode':documentary?'documents':'knowledge',
    'aria-label':documentary?'Carte documentaire : les lignes indiquent uniquement le classement des fichiers.':'Carte de connexions réelles, chaque notion est sélectionnable au clic ou au clavier.'});
  // Render declared lines first, then cards so labels remain legible and on top.
  for (let i=0;i<items.length;i++) {
    const p=positions[i];
    const line=svgElement('path',{d:`M 500 335 Q ${p.side==='left'?420:580} ${p.y} ${p.x} ${p.y}`,class:documentary?'document-cluster-link':'graph-link v19-card-link'});
    const tip=svgElement('title');tip.textContent=documentary?'Lien de classement documentaire':items[i].relationLabel||'Lien déclaré';line.append(tip);svg.append(line);
  }
  const center=svgElement('g',{class:'v19-focus graph-node','data-selected':'true',role:'img','aria-label':`Centre : ${centerLabel}`});
  center.append(svgElement('circle',{cx:500,cy:335,r:61}));
  const sym=svgElement('text',{x:500,y:342});sym.textContent=documentary?'▤':'✳';center.append(sym);
  const centralTitle=svgElement('rect',{x:360,y:415,width:280,height:58,rx:13,class:'v19-center-title'});center.append(centralTitle);
  const title=svgElement('text',{x:500,y:439,class:'v19-title-text'});
  const lines=graphCaptionLines(centerLabel,28,2);
  for(let i=0;i<lines.length;i++){const tspan=svgElement('tspan',{x:500,dy:i?21:0});tspan.textContent=lines[i];title.append(tspan);}
  center.append(title);svg.append(center);
  for(let i=0;i<items.length;i++) {
    const item=items[i],p=positions[i];
    const g=svgElement('g',{class:`graph-node v19-node-card ${item.cssClass||''}`, 'data-selected':'false',
      'data-node-id':item.id || item.label,'data-v19-label':item.label,role:'button',tabindex:'0',
      'aria-label':`Explorer : ${item.label}. ${item.meta||item.relationLabel||''}`});
    g.append(svgElement('rect',{x:p.boxX,y:p.boxY,width:p.boxW,height:p.boxH,rx:13,class:'card-bg'}));
    g.append(svgElement('circle',{cx:p.x,cy:p.y,r:20}));
    const mark=svgElement('text',{x:p.x,y:p.y+6,class:'type-mark'});mark.textContent=documentary?'▤':'◇';g.append(mark);
    const cap=svgElement('g',{class:'v19-title-group'});
    makeCaption(cap,p.boxX+13,p.boxY+28,item.label,3);g.append(cap);
    const description=svgElement('text',{x:p.boxX+13,y:p.boxY+93,class:'v19-relation-caption'});
    description.textContent=String(item.meta||item.relationLabel||'').slice(0,34);g.append(description);
    const tip=svgElement('title');tip.textContent=`${item.label} — ${item.meta||item.relationLabel||''}`;g.append(tip);
    g.addEventListener('click',item.open);
    g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();item.open();}});
    svg.append(g);
  }
  stage.append(svg);target.append(stage);
  const mobileDiagram=drawMobileConnectionMap(target,centerLabel,items,{documentary});
  return {stage,svg,mobileDiagram};
}

function appendNeighborPager(target,current,total,pages){
  const controls=element('div','v19-graph-toolbar');
  controls.append(element('span','v19-page-state',`${total} voisin(s) réels · page ${current+1}/${pages}`));
  if(pages>1){
    const prev=actionButton('← Connexions précédentes',()=>{state.neighborPage=Math.max(0,state.neighborPage-1);render();urlState();});prev.disabled=current===0;
    const next=actionButton('Autres connexions →',()=>{state.neighborPage=Math.min(pages-1,state.neighborPage+1);render();urlState();});next.disabled=current>=pages-1;
    controls.append(prev,next);
  }
  controls.append(actionButton('Agrandir la carte',()=>{
    const map=target.querySelector('.v19-map-stage');if(!map)return;
    if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});
    else map.requestFullscreen?.().catch(()=>notify('Plein écran indisponible.'));
  }));
  target.append(controls);
}

function makeOverview(target,nodes,edges) {
  if(!isKnowledge())return;
  const eligible=n=>!n.technical_identifier && !isReferenceOrMachineValue(n) &&
    (!isUnnamedForVisitor(n) || state.showUnnamed);
  const entries=connectedEntryPoints(nodes,edges,eligible,displayNode,6);
  const section=element('section','v19-discovery');
  const header=element('div','v19-discovery-head');
  const title=element('div');title.append(element('h3','','Explorer ce Kristal'),element('p','',
    'Choisissez un point d’entrée réellement connecté. Le nombre de liens n’indique pas une importance scientifique.'));
  const toggle=actionButton(state.overviewOpen?'Masquer les parcours':'Voir les points d’entrée',()=>{state.overviewOpen=!state.overviewOpen;render();urlState();},'v19-overview-toggle');
  toggle.setAttribute('aria-expanded',String(state.overviewOpen));header.append(title,toggle);section.append(header);
  if(state.overviewOpen){
    const grid=element('div','v19-discovery-list');
    if(!entries.length)grid.append(element('p','v19-empty','Aucun point d’entrée connecté n’est disponible avec ces critères.'));
    for(const {node,degree} of entries){
      const button=element('button','v19-entry');button.type='button';
      button.append(element('strong','',displayNode(node)),element('small','',`${degree} connexion(s) déclarée(s)`));
      button.addEventListener('click',()=>focusOn(node.id));grid.append(button);
    }
    section.append(grid);
  }
  target.append(section);
}

function drawGraph(target, visible) {
  if(state.bundle.view_kind==='derived-hosting-navigation')return drawDocumentConstellation(target,visible);
  const data=state.bundle,all=data.nodes;
  const selected=all.find(n=>n.id===state.selection&&!isReferenceOrMachineValue(n)) ||
    all.find(n=>!isReferenceOrMachineValue(n)) || all[0];
  if(!selected){target.append(element('p','v19-empty','Aucune notion disponible.'));return;}
  const visibleIds=state.query.trim()?new Set(visible.map(n=>n.id)):null;
  const unnamedIds=!state.showUnnamed&&!state.query.trim()?new Set(all.filter(n=>isUnnamedForVisitor(n)&&n.id!==selected.id).map(n=>n.id)):null;
  const resourceIds=new Set(all.filter(isReferenceOrMachineValue).map(n=>n.id));
  const links=readableKnowledgeEdges(all,data.edges,selected.id).filter(e=>
    !resourceIds.has(e.from)&&!resourceIds.has(e.to)&&
    (!unnamedIds||(!unnamedIds.has(e.from)&&!unnamedIds.has(e.to))));
  makeOverview(target,all,links);
  const eligible=n=>!n.technical_identifier && !isReferenceOrMachineValue(n) &&
    (!unnamedIds||!unnamedIds.has(n.id));
  const paged=directNeighborPages(all,links,selected.id,eligible,displayNode,
    state.neighborPage,state.satellites,visibleIds);
  state.neighborPage=paged.page;
  const index=buildNeighborIndex(all,links);
  const entries=paged.items.map(({node,relation,direction})=>({id:node.id,label:displayNode(node),
    relationLabel:displayRelation(relation),cssClass:isUnnamedForVisitor(node)?'graph-node-unlabeled':'',
    meta:`${direction==='sortant'?'↗':direction==='entrant'?'↙':'↔'} ${displayRelation(relation)} · ${index.adjacent.get(node.id)?.size||0} voisin(s)`,
    open:()=>focusOn(node.id)}));
  drawReadableMap(target,displayNode(selected),entries);
  const focus=element('div','v19-mobile-focus');focus.append(element('small','','Notion actuelle'),element('strong','',displayNode(selected)));
  target.append(focus);
  appendNeighborPager(target,paged.page,paged.total,paged.pages);
  target.append(element('p','v19-label-note',
    'Chaque carte porte un intitulé. Les noms longs sont également accessibles entièrement dans la liste et la fiche. Sélectionnez un voisin pour avancer.'));
  const browser=element('section','reader-mobile-map reader-relations-browser');
  browser.append(element('h3','','Connexions autour de cette notion'),
    element('p','reader-muted','Sélectionnez une relation réelle pour approfondir. Les liens sans intitulé restent neutres.'));
  if(paged.total===0)browser.append(element('p','reader-muted',state.query?'Aucun voisin ne correspond à la recherche.':'Aucun lien direct visible pour cette notion.'));
  for(const {node,relation,direction} of paged.items){
    const button=element('button','reader-mobile-link');button.type='button';
    button.append(element('strong','',displayNode(node)),element('small','',`${direction==='sortant'?'↗ Sortant':direction==='entrant'?'↙ Entrant':'↔ Multiple'} · ${displayRelation(relation)}`));
    button.setAttribute('aria-label',`Explorer ${displayNode(node)} · ${displayRelation(relation)}`);
    button.addEventListener('click',()=>focusOn(node.id));browser.append(button);
  }
  if(isKnowledge()&&state.showUnnamed)browser.append(actionButton('Revenir aux notions nommées',returnToReadableWords,'button ghost'));
  else if(isKnowledge()){
    const id=new Set([selected.id]);
    const hidden=data.edges.filter(e=>(id.has(e.from)||id.has(e.to)) &&
      isUnnamedForVisitor(all.find(n=>n.id===(e.from===selected.id?e.to:e.from)))).length;
    if(hidden)browser.append(element('p','reader-muted',`${hidden} relation(s) vers des notions sans intitulé peuvent être explorées en mode avancé.`),
      actionButton('Explorer les connexions sans intitulé',activateRealConnections,'button ghost'));
  }
  target.append(browser);
  if(state.portraitId){const n=all.find(node=>node.id===state.portraitId);if(n)profileCard(target,n);}
  if(paged.total===0){
    const fallback=connectedEntry(all,links);
    if(fallback&&fallback!==selected.id)target.append(actionButton('Explorer une autre notion connectée',()=>focusOn(fallback),'button accent'));
  }
  $('truncation').textContent=`${paged.items.length}/${paged.total} voisins affichés · ${data.edges.length} liens déclarés dans la collection · aucune relation ajoutée`;
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
      const readable=displayDocumentTitle(n);
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
    ? displayDocumentTitle(n)
    : displayNode(n);
  const titleNode=element('h3','',inspectorTitle);titleNode.tabIndex=-1;
  target.append(element('span','kind',publicNodeKind(n.kind)),titleNode);
  const localizedDefinition=state.localized?.get(n.id)?.definition;
  const description=documentReading(n)?.excerpt || displayDescription(n);
  if(description)target.append(element('p',localizedDefinition?'node-definition':'node-description',description));
  const documented=documentReading(n);
  if(documented?.sections?.length){const p=element('p','v20-inspector-outline','Rubriques : '+documented.sections.slice(0,4).map(x=>x.title).join(' · '));target.append(p);}
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
  if(isKnowledge()){
    const outbound=sourceRelations.filter(e=>e.from===n.id).length;
    const inbound=sourceRelations.filter(e=>e.to===n.id).length;
    const stats=element('section','v19-inspector-facts');
    stats.append(element('h4','','Connexions déclarées'),
      element('p','',`${outbound} lien(s) sortant(s) · ${inbound} lien(s) entrant(s). Les directions reflètent uniquement les déclarations de la source.`));
    if(!description && !localizedDefinition)stats.append(element('p','reader-muted',
      'Aucune définition vérifiée n’est disponible pour cette notion dans le lecteur public.'));
    target.append(stats);
  }
  if(related.length){
    target.append(element('h4','relation-heading',`Liens avec d’autres notions (${related.length.toLocaleString('fr-FR')})`));
    const list=element('div','relation-list');
    const addRelation=(edge)=>{
      const other=nodeById.get(edge.from===n.id?edge.to:edge.from);
      if(!other)return;
      const button=element('button','relation-entry');button.type='button';
      button.append(element('strong','',displayNode(other)),
        element('small','',`${edge.from===n.id?'↗ Sortant':'↙ Entrant'} · ${displayRelation(edge.relation)}`));
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
          button.append(element('strong','',displayNode(other)),element('small','',`${edge.from===n.id?'↗ Sortant':'↙ Entrant'} · ${displayRelation(edge.relation)}`));
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
    const here=new URL(location.pathname,location.origin);
    here.searchParams.set('k',d.slug);here.searchParams.set('r',d.revision);here.searchParams.set('lens',state.lens);here.searchParams.set('n',String(state.satellites));here.searchParams.set('focus',n.id);
    if(state.showUnnamed)here.searchParams.set('ids','1');
    const body=`Révision: ${d.revision}\nState ref: ${d.state_ref}\nSurface digest: ${d.surface_digest}\nEntité: ${n.id}\nLien: ${here.href}\n\nObservation (à compléter) :`;
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
  const requestedReading=params.get('lecture')||'';
  state.readingId=/^lecture-scene-(?:0[1-9]|1[0-9]|20)$/.test(requestedReading)?requestedReading:null;
  state.autoLens=!params.has('lens');
  state.lens=['discover','constellation','registry','trace','compare'].includes(params.get('lens'))?params.get('lens'):'constellation';
  state.selection=params.get('focus'); state.satellites=Math.min(8,clampSatellites(params.get('n')||6));
  state.neighborPage=Math.max(0,Math.min(999,Number.parseInt(params.get('pg')||'0',10)||0));
  state.overviewOpen=!params.has('focus');
  state.showUnnamed=params.get('ids')==='1';$('show-unnamed').checked=state.showUnnamed;
  state.requestedLocale=params.get('lang')||null;
  try {
    const res=await fetch('./data/catalog.json',{cache:'no-cache'});if(!res.ok)throw Error('Catalogue indisponible');
    const catalog=await res.json();
    if(catalog.format!=='konstellation.light-catalog/1.0'||!Array.isArray(catalog.entries)||catalog.entries.length===0||catalog.entries.length>1000)throw Error('Catalogue invalide');
    state.catalog=catalog;
    const first=catalog.entries[0];const slug=catalog.entries.some(x=>x.slug===params.get('k'))?params.get('k'):first.slug;
    const revision=lookup(slug,params.get('r'))?params.get('r'):existingRevisions(slug).at(-1).revision;
    await setChoice(slug,revision,{keepFocus:true});
  }catch(e){showFailure(e);}
}
$('collection').addEventListener('change',()=>{const s=$('collection').value;state.readingId=null;state.page=0;state.docCategory=null;state.requestedCategory=null;state.autoLens=true;state.lens='constellation';state.query='';$('search').value='';setChoice(s,existingRevisions(s).at(-1).revision);});
$('revision').addEventListener('change',()=>{state.page=0;setChoice(state.slug,$('revision').value);});
$('localization').addEventListener('change',async()=>{
  const selected=$('localization').value;
  try{if(!await loadLocalization(selected||null))return;state.requestedLocale=state.locale;
    $('localization-status').textContent=state.locale?`Texte révisé en ${localeName(state.locale)} ; interface en français.`:'Mots d’origine ; interface en français.';
    state.page=0;state.neighborPage=0;render();urlState();
  }catch(e){$('localization-status').textContent=e.message;notify('Fichier de langue refusé : '+e.message);
    $('localization').value=state.locale||'';}
});
$('show-unnamed').addEventListener('change',()=>{
  state.showUnnamed=$('show-unnamed').checked;
  if(!state.showUnnamed && isKnowledge() && isUnnamedForVisitor(state.bundle?.nodes.find(n=>n.id===state.selection))){
    const named=state.bundle.nodes.find(n=>!n.technical_identifier&&!isUnnamedForVisitor(n));
    if(named){state.selection=named.id;state.history=[named.id];state.autoFocus=false;}
  }
  state.page=0;state.neighborPage=0;render();urlState();
});
for(const btn of document.querySelectorAll('[data-lens]'))btn.addEventListener('click',()=>{state.autoLens=false;state.lens=btn.dataset.lens;state.page=0;state.neighborPage=0;render();urlState();});
$('search').addEventListener('input',()=>{state.query=$('search').value.slice(0,250);state.page=0;state.neighborPage=0;refreshSearch();});
$('search-language-add').addEventListener('change',()=>{const tag=normalizeLocale($('search-language-add').value);if(tag&&searchTags().length<MAX_SEARCH_LANGUAGES&&!searchTags().includes(tag)){searchExtras.push(tag);saveSearchExtras();state.page=0;refreshSearch();}});
$('search-language-reset').addEventListener('click',()=>{searchExtras=[];originalSearchOverride=null;saveSearchExtras();state.page=0;refreshSearch();});
$('search-original').addEventListener('change',()=>{originalSearchOverride=$('search-original').checked;state.page=0;refreshSearch();});
document.addEventListener('keydown',e=>{if(e.key==='Escape' && state.portraitId){e.preventDefault();document.querySelector('.node-portrait-card .portrait-close')?.click();}});
$('satellites').addEventListener('input',()=>{state.satellites=Math.min(8,clampSatellites($('satellites').value));state.neighborPage=0;render();urlState();});
$('map-fullscreen')?.addEventListener('click',async()=>{
  const map=document.querySelector('#visual .v19-map-stage');if(!map)return;
  try{if(document.fullscreenElement)await document.exitFullscreen();else await map.requestFullscreen();}
  catch{notify('Plein écran indisponible dans ce navigateur.');}
});
$('graph-back').addEventListener('click',()=>{
  if(state.bundle?.view_kind==='derived-hosting-navigation' && state.docCategory){
    state.docCategory=null;state.selection=state.bundle.nodes.find(n=>n.kind==='hosted_state')?.id||null;
    state.history=state.selection?[state.selection]:[];state.neighborPage=0;render();urlState();return;
  }
  if(state.history.length<2)return;state.history.pop();state.selection=state.history.at(-1);state.neighborPage=0;render();urlState();
});
$('graph-home').addEventListener('click',()=>{
  state.overviewOpen=true;state.neighborPage=0;
  if(!state.bundle)return;
  if(state.bundle.view_kind==='derived-hosting-navigation'){
    state.docCategory=null;state.selection=state.bundle.nodes.find(n=>n.kind==='hosted_state')?.id||state.bundle.nodes[0]?.id;
    state.history=state.selection?[state.selection]:[];state.neighborPage=0;render();urlState();return;
  }
  const nodes=state.bundle.nodes;const edges=readableKnowledgeEdges(nodes,state.bundle.edges,'');
  const eligible=nodes.filter(n=>!n.technical_identifier&&!isReferenceOrMachineValue(n));
  const id=readerConnectedNamedFocus(eligible,edges,{localized:state.localized,requireReviewed:Boolean(state.locale)}) || connectedEntry(eligible,edges);
  const home=nodes.find(n=>n.id===id)||eligible[0]||nodes[0];if(home)focusOn(home.id);
});
$('reset').addEventListener('click',()=>{state.neighborPage=0;state.page=0;state.query='';$('search').value='';refreshSearch();});
$('share').addEventListener('click',async()=>{urlState();try{await navigator.clipboard.writeText(location.href);notify('Lien de navigation copié.');}catch{notify(`Copiez l’URL du navigateur pour partager la vue.`);}});
$('export')?.addEventListener('click',()=>{if(!state.bundle)return;const text=JSON.stringify(selectionDescriptor(),null,2)+'\n';
 const href=URL.createObjectURL(new Blob([text],{type:'application/json'}));const a=element('a');a.href=href;a.download='konstellation-light-selection.json';a.click();setTimeout(()=>URL.revokeObjectURL(href),3000);notify('Descripteur de sélection exporté.');});
$('offline').addEventListener('click',async()=>{
 if(['127.0.0.1','localhost'].includes(location.hostname)){notify('Mode hors ligne réservé au site hébergé. La prévisualisation locale lit toujours les fichiers à jour.');return;}
 if(!('serviceWorker' in navigator)){notify('Mode hors ligne indisponible dans ce navigateur.');return;}
 try{const reg=await navigator.serviceWorker.register('./sw.js',{scope:'./'});await navigator.serviceWorker.ready;
 const row=lookup(state.slug,state.revision);const worker=reg.active||reg.waiting||reg.installing;
 worker?.postMessage({type:'KEEP',urls:['./data/catalog.json',`./${row.path}`,...new Set([...(state.locale?[`./${row.localizations[state.locale].path}`]:[]),...selectedDescriptors(searchTags(),row.localizations||{}).map(x=>`./${x.descriptor.path}`)])]});notify('Cache local public activé. Revérifiez les versions après reconnexion.');}
 catch(e){notify(`Mode hors ligne non activé : ${e.message}`);}
});
const networkStatus = () => { $('mode-label').textContent = navigator.onLine ? 'Consultation en lecture seule' : 'Hors ligne · version enregistrée'; };
window.addEventListener('online',networkStatus);window.addEventListener('offline',networkStatus);networkStatus();
window.addEventListener('popstate',()=>location.reload());
main();
