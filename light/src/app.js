import {clampSatellites, graphNeighborhood, navigationPath, buildNeighborIndex, previewNeighbors, readableKnowledgeEdges} from './graph-core.mjs';
import {portraitFor, orbitPreview} from './profile.mjs';
import {semanticLabel, readableNodeLabel, semanticQueryMatch, publicKristalTitle, isUnlabeledKnowledge, publicNodeKind, publicDescription, publicRelationLabel, publicConceptLabel} from './semantic-display.mjs';
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
const displayNode = n => (state.localized?.get(n.id)?.label || (isKnowledge() && n.technical_identifier ? `Identifiant externe${n.property_code ? ` (${n.property_code})` : ''}` : isKnowledge() && isUnnamedForVisitor(n) ? 'Notion sans nom' : state.bundle?.view_kind === 'derived-semantic-preview' ? readableNodeLabel(n.label, n.kind) : isKnowledge() ? publicConceptLabel(n.label) : n.label));
const isUnnamedForVisitor=n=>isUnlabeledKnowledge(n)&&!state.localized?.get(n.id)?.label;
const displayRelation = relation => (state.localizedRelations?.get(relation)?.label || (isKnowledge() ? publicRelationLabel(relation, state.bundle.relation_labels?.[relation]) : state.bundle?.view_kind === 'derived-semantic-preview' ? semanticLabel(relation) : relation.replaceAll('_', ' ')));
const state = { catalog: null, bundle: null, selection: null, query: '', lens: 'constellation', slug: null, revision: null, embed: false, page: 0, satellites:8, history: [], portraitId: null, showUnnamed:false, locale:null, localized:null, localizedRelations:null, localeCache:new Map() };
let toastTimeout;
let portraitOpener = null;
function notify(message) { const t = $('toast'); t.textContent = message; t.hidden = false; clearTimeout(toastTimeout); toastTimeout = setTimeout(() => t.hidden = true, 3300); }
function urlState() {
  const p = new URLSearchParams(location.search);
  p.set('k', state.slug || ''); p.set('r', state.revision || ''); p.set('lens', state.lens); p.set('n', String(state.satellites));
  if (state.selection) p.set('focus', state.selection); else p.delete('focus');
  if (state.query) p.set('q', state.query); else p.delete('q');
  if (state.showUnnamed) p.set('ids','1'); else p.delete('ids');
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
  $('localization-row').hidden=tags.length===0;
  const options=[['','Texte original'],...tags.map(x=>[x,x])];
  fillSelect($('localization'),options,tags.includes(preferred)?preferred:'');
  $('localization-status').textContent=tags.length?'Les textes révisés disponibles sont chargés à la demande.':'Aucune traduction ajoutée.';
  return tags.includes(preferred)?preferred:null;
}
async function setChoice(slug, revision, { keepFocus = false } = {}) {
  const row = lookup(slug, revision);
  if (!row) return;
  $('visual').replaceChildren(element('div', 'loading', 'Vérification de l’intégrité du bundle…'));
  try {
    const data = await loadPack(row);
    state.slug = slug; state.revision = revision; state.bundle = data; state.portraitId = null;
    const validFocus = keepFocus && data.nodes.some(n => n.id === state.selection);
    if (!validFocus) state.selection = (data.nodes.find(n => !n.technical_identifier && !isUnnamedForVisitor(n)) || data.nodes[0])?.id || null;
    state.history = state.selection ? [state.selection] : [];
    state.localized=null;state.localizedRelations=null;state.locale=null;
    const desiredLanguage=renderLocalizationSelector(state.requestedLocale);
    if(desiredLanguage){await loadLocalization(desiredLanguage);$('localization-status').textContent=`${desiredLanguage} · contenu révisé`;}
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
  if (!q) return isKnowledge() ? state.bundle.nodes.filter(n=>!n.technical_identifier && (state.showUnnamed || !isUnnamedForVisitor(n))) : state.bundle.nodes;
  const terms = q.split(/\s+/).filter(Boolean);
  if (state.bundle.view_kind === 'derived-semantic-preview') return state.bundle.nodes.filter(n => semanticQueryMatch(n, q));
  return state.bundle.nodes.filter(n => terms.every(t => `${n.label} ${displayNode(n)} ${n.id} ${n.description || ''} ${state.localized?.get(n.id)?.definition||''} ${n.kind}`.toLocaleLowerCase(state.locale||'fr').includes(t)));
}
function focusOn(id) {
  if (!state.bundle.nodes.some(n => n.id === id)) return;
  state.portraitId = null; state.selection = id; state.history = navigationPath(state.history, id); render(); urlState();
}
function lensMeta() {
  return {
    constellation: ['Carte des connaissances', isKnowledge() ? 'Sélectionnez une notion pour découvrir ses liens avec les autres.' : 'Cliquez sur un élément pour explorer ses liens.'],
    registry: ['Explorer les notions', isKnowledge() ? 'Les éléments sans nom sont masqués par défaut. Vous pouvez les afficher dans Options avancées.' : 'Parcourez les éléments de ce Kristal.'],
    trace: ['Vérification des données', 'Ce qui a été vérifié, et ce qui ne l’a pas été.'],
    compare: ['Comparer les versions', 'Éléments ajoutés, retirés ou modifiés entre deux versions.'],
  }[state.lens];
}

function render() {
  const data = state.bundle; if (!data) return;
  $('title').textContent = publicKristalTitle(data.slug,data.title);
  const semantic = data.view_kind === 'derived-semantic-preview';
  $('subtitle').textContent = isKnowledge() ? 'Explorez les notions, les valeurs et leurs liens dans ce Kristal.' : semantic ? 'Aperçu local de connaissances en cours de préparation (non publié).' : 'Explorez les fichiers et les liens disponibles dans ce Kristal.';
  $('metric-members').textContent = Number(isKnowledge() ? data.nodes.filter(n=>!n.technical_identifier && (state.showUnnamed || !isUnnamedForVisitor(n))).length : data.nodes.length).toLocaleString('fr-FR');
  $('metric-relations').textContent = Number(data.edges.length).toLocaleString('fr-FR');
  $('metric-members-label').textContent = isKnowledge() ? (state.showUnnamed ? 'NOTIONS ET VALEURS' : 'ÉLÉMENTS NOMMÉS') : 'ÉLÉMENTS À EXPLORER';
  $('metric-relations-label').textContent = isKnowledge() ? 'LIENS DÉCLARÉS' : 'LIENS DISPONIBLES';
  $('graph-controls').hidden = state.lens !== 'constellation';
  $('satellites').value = String(state.satellites); $('satellites-count').textContent = String(state.satellites);
  $('graph-back').disabled = state.history.length < 2;
  const [heading, hint] = lensMeta(); $('panel-title').textContent = heading; $('panel-hint').textContent = hint;
  $('view-tag').textContent = ({constellation:'CARTE',registry:'NOTIONS',trace:'VÉRIFICATION',compare:'VERSIONS'})[state.lens];
  if (state.lens==='trace' || state.lens==='compare') $('advanced-tools').open=true;
  document.querySelectorAll('[data-lens]').forEach(btn => { btn.classList.toggle('active', btn.dataset.lens === state.lens); btn.setAttribute('aria-pressed', String(btn.dataset.lens === state.lens)); });
  const visible = filteredNodes(); $('count').textContent = state.query.trim() ? `${visible.length.toLocaleString('fr-FR')} résultat(s)` : isKnowledge() ? `${visible.length.toLocaleString('fr-FR')} éléments nommés` : `${visible.length.toLocaleString('fr-FR')} éléments`;
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
function drawGraph(target, visible) {
  const all=state.bundle.nodes;
  const selected=all.find(n=>n.id===state.selection)||all[0];
  if (!selected) { target.append(element('div','empty','Aucun nœud disponible.'));return; }
  const matched=state.query.trim() ? new Set(visible.map(n=>n.id)) : null;
  const unnamedIds=isKnowledge() && !state.showUnnamed && !state.query.trim() && !isUnnamedForVisitor(selected) ? new Set(all.filter(isUnnamedForVisitor).map(n=>n.id)) : null;
  const displayEdges=isKnowledge() ? readableKnowledgeEdges(all,state.bundle.edges,selected.id).filter(e=>!unnamedIds || (!unnamedIds.has(e.from) && !unnamedIds.has(e.to))) : state.bundle.edges;
  const view=graphNeighborhood(all,displayEdges,selected.id,state.satellites,matched);
  const neighborIndex=buildNeighborIndex(all,displayEdges);
  const shown=view.nodes;
  const svg=svgElement('svg',{viewBox:'0 0 760 470',role:'group','aria-label':'Graphe navigable : Entrée ou clic pour recentrer sur une bulle. Survolez pour voir les satellites secondaires.'});
  const xy=new Map([[selected.id,{x:380,y:226}]]);
  const count=shown.length-1;
  shown.slice(1).forEach((n,i)=>{const angle=2*Math.PI*i/Math.max(1,count)-Math.PI/2;
    const radius=count>13 ? 174+(i%2)*24 : 162;
    xy.set(n.id,{x:380+Math.cos(angle)*radius*1.65,y:226+Math.sin(angle)*radius});
  });
  for(const edge of view.edges){const a=xy.get(edge.from),b=xy.get(edge.to);
    if(!a||!b)continue;
    const line=svgElement('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,class:'graph-link'});
    const tooltip=svgElement('title');tooltip.textContent=displayRelation(edge.relation);line.append(tooltip);svg.append(line);
  }
  let previewGroup=null;
  const clearPreview=()=>{previewGroup?.remove();previewGroup=null;};
  const showPreview=(node)=>{
    clearPreview();
    if(node.id===selected.id)return;
    // The center is already visible: exclude it from the preview satellites.
    const secondary=previewNeighbors(neighborIndex,node.id,[selected.id],6);
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
    const group=svgElement('g',{class:'graph-node','data-kind':n.kind,'data-selected':String(central),role:'button',tabindex:'0','aria-label':`${central?'Notion centrale':'Explorer'} : ${displayNode(n)}`});
    group.append(svgElement('circle',{cx:p.x,cy:p.y,r:central?43:23}));
    const sym=svgElement('text',{x:p.x,y:p.y+5,class:'type-mark'});sym.textContent=central?'✳':'◇';group.append(sym);
    const label=svgElement('text',{x:p.x,y:p.y+(central?59:38)});label.textContent=short(displayNode(n),central?32:24);group.append(label);
    const tip=svgElement('title');tip.textContent=state.localized?.get(n.id)?.definition||publicDescription(n.description)||displayNode(n);group.append(tip);
    group.addEventListener('click',()=>focusOn(n.id));
    group.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();focusOn(n.id);}});
    if(!central){group.addEventListener('mouseenter',()=>showPreview(n));group.addEventListener('mouseleave',clearPreview);
      group.addEventListener('focus',()=>showPreview(n));group.addEventListener('blur',clearPreview);}
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
  target.append(svg);
  target.append(element('p','graph-hint','Cliquez sur une bulle pour explorer ses liens. Survolez-la pour découvrir d’autres notions.'));
  if(state.portraitId){const node=all.find(n=>n.id===state.portraitId);if(node)profileCard(target,node);}
  if(isKnowledge() && !selected.technical_identifier) {
    const hidden=state.bundle.edges.filter(e=>e.from===selected.id && all.some(n=>n.id===e.to&&n.technical_identifier)).length;
    if(hidden) target.append(element('p','graph-hint',`${hidden} identifiant(s) de référence masqué(s) sur la carte; disponibles dans les détails techniques de la fiche.`));
  }
  if(view.degree===0) target.append(element('p','graph-empty',state.query?'Aucun voisin correspondant à la recherche. Effacer la recherche pour voir les relations.':'Aucun autre lien nommé à afficher pour cette notion. Vous pouvez inclure les notions sans nom dans Options avancées.'));
  $('truncation').textContent=`${shown.length-1} notion(s) autour du sujet · ${state.satellites} maximum à l’écran`;
}
function drawRegistry(target, nodes) {
  const container=element('div','record-list');
  const pageItems=nodes.slice(0,(state.page+1)*60);
  if (!pageItems.length) target.append(element('div','empty','Aucun élément dans cette page.'));
  for(const n of pageItems) {
    const btn=element('button',`record ${state.selection===n.id?'selected':''}`);btn.type='button';
    const content=element('main');content.append(element('strong','',isUnnamedForVisitor(n) ? `Notion sans nom · ${n.label}` : displayNode(n)));
    const description=state.localized?.get(n.id)?.definition || publicDescription(n.description);if(description)content.append(element('small','',short(description,140)));
    btn.append(content,element('em','',publicNodeKind(n.kind)));btn.addEventListener('click',()=>focusOn(n.id));container.append(btn);
  }
  target.append(container);
  if ((state.page+1)*60<nodes.length) {
    const more=element('button','button ghost','Afficher 60 éléments supplémentaires');
    more.addEventListener('click',()=>{ state.page++; render(); });target.append(more);
  }
  $('truncation').textContent=`${Math.min((state.page+1)*60,nodes.length).toLocaleString('fr-FR')} élément(s) affiché(s) · page ${state.page+1}`;
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
  const details=element('details','technical-details');details.append(element('summary','','Voir les empreintes, chemins et identifiants'));
  const raw=element('div','evidence');
  raw.append(evidence('Profil de données',d.format),
    ...(d.knowledge ? [evidence('Fichier du graphe source',d.knowledge.graph_path),
      evidence('Liens repris du graphe',`${d.knowledge.displayed_assertions} / ${d.knowledge.declared_assertions}`),
      evidence('Liens non repris',String(d.knowledge.omitted_assertions)),
      evidence('Identifiants des sources citées',String(d.knowledge.referenced_sources))] : []),
    evidence('Empreinte du contenu',d.surface_digest),
    evidence('Identifiant d’état',d.state_ref),
    evidence('Engagement déclaré',d.declared_commitment.digest),
    evidence('Vérification SHA-256 du fichier Web','Effectuée au chargement'),
    evidence('Signatures et activation','Non vérifiées ici'));
  details.append(raw);holder.append(details);target.append(holder);
  $('truncation').textContent='Contrôle d’intégrité ≠ validation des faits';
}

async function drawCompare(target){
  const versions=existingRevisions(state.slug).filter(x=>x.revision!==state.revision);
  if(!versions.length){target.append(element('div','empty','Une deuxième révision contrôlée du même Kristal est nécessaire pour comparer.'));$('truncation').textContent='Aucune comparaison artificielle';return;}
  const old=versions[versions.length-1];const heading=element('p','',`Comparaison de « ${state.revision} » avec « ${old.revision} »`);target.append(heading);
  try {const other=await loadPack(old); if(state.lens!=='compare')return;
    const identity=(n)=>n.kind+'\u0000'+n.label;
    const a=new Map(state.bundle.nodes.map(n=>[identity(n),n]));const b=new Map(other.nodes.map(n=>[identity(n),n]));
    const added=[...a.keys()].filter(k=>!b.has(k));const removed=[...b.keys()].filter(k=>!a.has(k));
    const changes=[...a.keys()].filter(k=>b.has(k)&&a.get(k).description!==b.get(k).description);
    const diff=element('div','diff-list');
    for(const [label,list,source] of [['Ajoutés',added,a],['Retirés',removed,b],['Métadonnées modifiées',changes,a]]){
      const card=evidence(`${label} (${list.length})`,list.length ? 'Différences visibles dans la projection' : 'Aucune différence détectée');
      for(const k of list.slice(0,24))card.append(element('span','diff-item',short(source.get(k).label,150)));
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
  target.append(element('span','kind',publicNodeKind(n.kind)),element('h3','',isUnnamedForVisitor(n) ? `Notion sans nom (${n.label})` : displayNode(n)));
  const localizedDefinition=state.localized?.get(n.id)?.definition;
  const description=localizedDefinition || publicDescription(n.description);
  if(description)target.append(element('p',localizedDefinition?'node-definition':'node-description',description));
  if(state.locale && !state.localized?.has(n.id)) target.append(element('p','subtle-hint',`Aucun texte révisé en ${state.locale} pour cette notion : affichage de la version d’origine.`));
  if(n.period||n.source){const info=element('dl','public-node-facts');
    if(n.period)addDefinition(info,'Période',n.period);
    if(n.source)addDefinition(info,'Source mentionnée',n.source);
    target.append(info);
  }
  const nodeById=new Map(d.nodes.map(x=>[x.id,x]));
  const related=(d.view_kind==='derived-semantic-preview'||isKnowledge() ? d.edges : [])
    .filter(e=>(e.from===n.id||e.to===n.id) &&
      (!isKnowledge() || state.showUnnamed || !nodeById.get(e.to)?.technical_identifier));
  if(related.length){
    target.append(element('h4','relation-heading',`Liens avec d’autres notions (${related.length.toLocaleString('fr-FR')})`));
    const list=element('div','relation-list');
    const addRelation=(edge)=>{
      const other=nodeById.get(edge.from===n.id?edge.to:edge.from);
      if(!other)return;
      const button=element('button','relation-entry');button.type='button';
      button.append(element('strong','',isUnnamedForVisitor(other)?`Notion sans nom (${other.label})`:displayNode(other)),
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
          button.append(element('strong','',isUnnamedForVisitor(other)?`Notion sans nom (${other.label})`:displayNode(other)),element('small','',displayRelation(edge.relation)));
          button.addEventListener('click',()=>focusOn(other.id));holder.append(button);
        }
        offset=limit;load.hidden=offset>=related.length;
      };
      more.addEventListener('toggle',()=>{if(more.open&&!more.dataset.loaded){more.dataset.loaded='1';append();}});
      load.addEventListener('click',append);more.append(holder,load);target.append(more);
    }
  } else if(isKnowledge()) target.append(element('p','subtle-hint','Aucun lien direct n’est affiché pour cette notion.'));
  const details=element('details','technical-details');details.append(element('summary','','Détails techniques et références'));
  const dl=element('dl');addDefinition(dl,'Identifiant exact',n.id);
  if(displayNode(n)!==n.label)addDefinition(dl,'Libellé original',n.label);
  if(n.technical_identifier&&n.property_code)addDefinition(dl,'Propriété d’identification',n.property_code);
  addDefinition(dl,'Type de donnée',n.kind);
  addDefinition(dl,'Relations entrantes',String(d.edges.filter(e=>e.to===n.id).length));
  addDefinition(dl,'Identifiant d’état',d.state_ref);
  if(isKnowledge())addDefinition(dl,'Fichier du graphe',d.knowledge.graph_path);
  if(d.discovery && n.kind==='hosted_state'){
    const m=d.discovery,c=m.classification;
    if(c.primary_archetype)addDefinition(dl,'Arketype',c.primary_archetype);
    if(c.primary_usage)addDefinition(dl,'Usage Arketype',c.primary_usage);
    if(c.usage_slug)addDefinition(dl,'Usage',c.usage_slug);
    if(c.domain)addDefinition(dl,'Domaine',c.domain);
    addDefinition(dl,'Organisation',m.organization);
    addDefinition(dl,'Profil de lecture',m.reader_profile);
    addDefinition(dl,'Accès recommandé',m.access_pattern);
  }
  const referenceLink=gitFileLink(d,n);
  if(referenceLink){const a=element('a','inspector-action','↗ Ouvrir le fichier d’origine');a.href=referenceLink;a.target='_blank';a.rel='noopener noreferrer';details.append(a);}
  if(isKnowledge() && d.source && /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+$/.test(d.source.repository) && /^[a-f\d]{40}$/.test(d.source.commit)){
    const rel=`kristals/${d.slug}/${d.knowledge.graph_path}`;
    const a=element('a','inspector-action','↗ Voir le graphe d’origine');
    a.href=`${d.source.repository}/blob/${d.source.commit}/${rel.split('/').map(encodeURIComponent).join('/')}`;
    a.target='_blank';a.rel='noopener noreferrer';details.append(a);
  }
  if(related.length){
    const provenance=element('details','provenance-details');provenance.append(element('summary','','Identifiants des relations et sources'));
    const provenanceList=element('div','provenance-rows');let generated=false;
    provenance.addEventListener('toggle',()=>{if(!provenance.open||generated)return;generated=true;
      for(const e of related){const other=nodeById.get(e.from===n.id?e.to:e.from);
        const item=element('div','provenance-item');
        item.append(element('strong','',other?displayNode(other):'Lien'),element('small','',`Propriété : ${e.relation}`));
        if(e.assertion_id)item.append(element('small','',`Assertion : ${e.assertion_id}`));
        if(e.source_refs?.length)item.append(element('small','',`Sources : ${e.source_refs.join(', ')}`));
        provenanceList.append(item);
      }
    });provenance.append(provenanceList);details.append(provenance);
  }
  details.insertBefore(dl, details.children[1] || null);target.append(details);
  if(d.source?.repository){const issue=element('a','inspector-action','Signaler un problème');
    const title=`Konstellation Light · ${d.slug} · ${short(n.label,70)}`;
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
  state.embed=params.get('embed')==='1';document.documentElement.classList.toggle('embed',state.embed);
  const back=params.get('retour');
  if(back && /^\/eleve\/(?:[a-z0-9._~!$&'()*+,;=:@%\/?-]*)$/i.test(back) && !back.includes('//')){ $('back-ekole').href=back; $('back-ekole').hidden=false; }
  else if(location.pathname.includes('/eleve/konstellation/')){ $('back-ekole').href='../'; $('back-ekole').hidden=false; }
  state.query=(params.get('q')||'').slice(0,250);$('search').value=state.query;
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
$('collection').addEventListener('change',()=>{const s=$('collection').value;state.page=0;state.query='';$('search').value='';setChoice(s,existingRevisions(s).at(-1).revision);});
$('revision').addEventListener('change',()=>{state.page=0;setChoice(state.slug,$('revision').value);});
$('localization').addEventListener('change',async()=>{
  const selected=$('localization').value;
  try{await loadLocalization(selected||null);state.requestedLocale=state.locale;
    $('localization-status').textContent=state.locale?`${state.locale} · contenu révisé`:'Texte d’origine du Kristal';
    state.page=0;render();urlState();
  }catch(e){$('localization-status').textContent=e.message;notify('Fichier de langue refusé : '+e.message);
    $('localization').value=state.locale||'';}
});
$('show-unnamed').addEventListener('change',()=>{state.showUnnamed=$('show-unnamed').checked;state.page=0;render();urlState();});
for(const btn of document.querySelectorAll('[data-lens]'))btn.addEventListener('click',()=>{state.lens=btn.dataset.lens;state.page=0;render();urlState();});
$('search').addEventListener('input',()=>{state.query=$('search').value.slice(0,250);state.page=0;render();urlState();});
document.addEventListener('keydown',e=>{if(e.key==='Escape' && state.portraitId){e.preventDefault();document.querySelector('.node-portrait-card .portrait-close')?.click();}});
$('satellites').addEventListener('input',()=>{state.satellites=clampSatellites($('satellites').value);render();urlState();});
$('graph-back').addEventListener('click',()=>{if(state.history.length<2)return;state.history.pop();state.selection=state.history.at(-1);render();urlState();});
$('graph-home').addEventListener('click',()=>{if(!state.bundle)return;const home=state.bundle.nodes.find(n=>!n.technical_identifier&&!isUnnamedForVisitor(n))||state.bundle.nodes[0];if(home)focusOn(home.id);});
$('reset').addEventListener('click',()=>{state.page=0;state.query='';$('search').value='';render();urlState();});
$('share').addEventListener('click',async()=>{urlState();try{await navigator.clipboard.writeText(location.href);notify('Lien de navigation copié.');}catch{notify(`Copiez l’URL du navigateur pour partager la vue.`);}});
$('export').addEventListener('click',()=>{if(!state.bundle)return;const text=JSON.stringify(selectionDescriptor(),null,2)+'\n';
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
