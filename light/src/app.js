import {clampSatellites, graphNeighborhood, navigationPath, buildNeighborIndex, previewNeighbors} from './graph-core.mjs';
import {portraitFor, orbitPreview} from './profile.mjs';
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
const state = { catalog: null, bundle: null, selection: null, query: '', lens: 'constellation', slug: null, revision: null, embed: false, page: 0, satellites:8, history: [], portraitId: null };
let toastTimeout;
let portraitOpener = null;
function notify(message) { const t = $('toast'); t.textContent = message; t.hidden = false; clearTimeout(toastTimeout); toastTimeout = setTimeout(() => t.hidden = true, 3300); }
function urlState() {
  const p = new URLSearchParams(location.search);
  p.set('k', state.slug || ''); p.set('r', state.revision || ''); p.set('lens', state.lens); p.set('n', String(state.satellites));
  if (state.selection) p.set('focus', state.selection); else p.delete('focus');
  if (state.query) p.set('q', state.query); else p.delete('q');
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
  const response = await fetch(`./${entry.path}`, { cache: 'no-cache' });
  if (!response.ok) throw Error(`Bundle indisponible : HTTP ${response.status}`);
  const bytes = await response.arrayBuffer();
  if (bytes.byteLength > 8 * 1024 * 1024 || bytes.byteLength !== entry.bytes) throw Error('Taille du bundle incorrecte.');
  if (`sha256:${await sha256(bytes)}` !== entry.sha256) throw Error('Échec de contrôle SHA-256 du bundle.');
  const obj = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  if (obj.format !== 'konstellation.light-navigation/1.0' || obj.semantic_authority !== false ||
      !['derived-hosting-navigation','derived-semantic-preview'].includes(obj.view_kind) || obj.slug !== entry.slug || obj.revision !== entry.revision ||
      obj.surface_digest !== entry.surface_digest || !Array.isArray(obj.nodes) || !Array.isArray(obj.edges) ||
      obj.nodes.length > 12000 || obj.edges.length > 12000) throw Error('Format ou identité du bundle non conforme.');
  const semantic = obj.view_kind === 'derived-semantic-preview';
  if (semantic && (entry.mode !== 'semantic_preview' || obj.revision !== 'candidate-local' || obj.state_ref !== 'local-curated-not-a-v10-publication')) throw Error('Prévisualisation non autorisée.');
  if (!semantic && entry.mode === 'semantic_preview') throw Error('Mode du catalogue incohérent.');
  const semanticKinds = new Set(['notion','societe','role','tache','ressource','territoire','periode','evenement','source','cours','competence','pratique','institution','person','personne','human','place','location','lieu','city','country','region']);
  const ids = new Set();
  for (const n of obj.nodes) {
    if (typeof n.id !== 'string' || n.id.length > 300 || ids.has(n.id) || typeof n.label !== 'string' ||
        n.label.length > 600 || !(semantic ? semanticKinds.has(n.kind) : ['hosted_state','logical_artifact','hosted_file'].includes(n.kind))) throw Error('Nœud du bundle invalide.');
    if (semantic && n.portrait !== undefined && !/^\.\/images\/[a-f0-9]{64}\.(?:png|jpe?g|webp|gif)$/.test(n.portrait)) throw Error('Image de fiche non conforme.');
    ids.add(n.id);
  }
  for (const e of obj.edges) {
    if (!ids.has(e.from) || !ids.has(e.to) || !(semantic ? /^[a-z0-9][a-z0-9._:-]{0,119}$/i.test(e.relation) : ['lists_file','has_member'].includes(e.relation))) throw Error('Relation dérivée invalide.');
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
async function setChoice(slug, revision, { keepFocus = false } = {}) {
  const row = lookup(slug, revision);
  if (!row) return;
  $('visual').replaceChildren(element('div', 'loading', 'Vérification de l’intégrité du bundle…'));
  try {
    const data = await loadPack(row);
    state.slug = slug; state.revision = revision; state.bundle = data; state.portraitId = null;
    const validFocus = keepFocus && data.nodes.some(n => n.id === state.selection);
    if (!validFocus) state.selection = data.nodes[0]?.id || null;
    state.history = state.selection ? [state.selection] : [];
    fillSelect($('collection'), [...new Set(state.catalog.entries.map(e => e.slug))].map(s => [s, state.catalog.entries.find(e=>e.slug===s).title]), slug);
    fillSelect($('revision'), existingRevisions(slug).map(x => [x.revision, x.revision]), revision);
    render(); urlState();
  } catch (e) { showFailure(e); }
}
function showFailure(err) {
  state.bundle = null;
  $('visual').replaceChildren(element('div', 'empty', `Lecture interrompue : ${err.message}`));
  $('metric-verified').textContent = 'Non vérifié';
  notify('Lecture refusée : intégrité ou format incorrect.');
}
function filteredNodes() {
  const q = state.query.toLocaleLowerCase('fr').trim();
  if (!q) return state.bundle.nodes;
  const terms = q.split(/\s+/).filter(Boolean);
  return state.bundle.nodes.filter(n => terms.every(t => `${n.label} ${n.description || ''} ${n.kind}`.toLocaleLowerCase('fr').includes(t)));
}
function focusOn(id) {
  if (!state.bundle.nodes.some(n => n.id === id)) return;
  state.portraitId = null; state.selection = id; state.history = navigationPath(state.history, id); render(); urlState();
}
function lensMeta() {
  return {
    constellation: ['Carte des relations', state.bundle.view_kind === 'derived-semantic-preview' ? 'Navigation sur une curation de connaissances candidate, non validée ni publiée.' : 'Relations techniques déclarées entre état, artefacts et fichiers.'],
    registry: ['Répertoire des données du bundle', 'Liste complète des éléments techniques présents dans le bundle.'],
    trace: ['Chaîne de traçabilité', 'Empreintes de surface et engagements déclarés, sans validation d’autorité.'],
    compare: ['Comparaison de versions', 'Différences observées entre deux bundles du même Kristal.'],
  }[state.lens];
}
function render() {
  const data = state.bundle; if (!data) return;
  $('title').textContent = data.title;
  const semantic = data.view_kind === 'derived-semantic-preview';
  $('subtitle').textContent = semantic ? 'PRÉVISUALISATION LOCALE · Graphe sémantique candidat · Pas une collection v10 publiée' : `Révision ${data.revision} · État ${short(data.state_ref, 85)} · Lecture opérationnelle sans mutation`;
  $('metric-files').textContent = semantic ? '—' : String(data.metrics.files);
  $('metric-members').textContent = String(data.metrics.members);
  $('metric-relations').textContent = String(data.edges.length);
  $('metric-verified').textContent = semantic ? '⚠ Candidat local (SHA-256 de transport)' : data.verification.byteDigestsVerified ? '✓ Octets conformes au manifeste' : 'Non vérifié';
  $('graph-controls').hidden = state.lens !== 'constellation';
  $('satellites').value = String(state.satellites); $('satellites-count').textContent = String(state.satellites);
  $('graph-back').disabled = state.history.length < 2;
  const [heading, hint] = lensMeta(); $('panel-title').textContent = heading; $('panel-hint').textContent = hint;
  $('view-tag').textContent = state.lens.toUpperCase();
  document.querySelectorAll('[data-lens]').forEach(btn => { btn.classList.toggle('active', btn.dataset.lens === state.lens); btn.setAttribute('aria-pressed', String(btn.dataset.lens === state.lens)); });
  const visible = filteredNodes(); $('count').textContent = `${visible.length} / ${data.nodes.length}`;
  const view = $('visual'); view.replaceChildren();
  if (state.lens === 'constellation') drawGraph(view, visible);
  if (state.lens === 'registry') drawRegistry(view, visible);
  if (state.lens === 'trace') drawTrace(view);
  if (state.lens === 'compare') drawCompare(view);
  drawInspection();
}
function profileCard(target, node, opener = null) {
  target.querySelector('.node-portrait-card')?.remove();
  const profile=portraitFor(node);
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
  const view=graphNeighborhood(all,state.bundle.edges,selected.id,state.satellites,matched);
  const neighborIndex=buildNeighborIndex(all,state.bundle.edges);
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
    const tooltip=svgElement('title');tooltip.textContent=edge.relation.replaceAll('_',' ');line.append(tooltip);svg.append(line);
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
      name.textContent=short(child.label,19);previewGroup.append(name);
    }
    svg.append(previewGroup);
  };
  for(const n of shown){const p=xy.get(n.id),central=n.id===selected.id;
    const group=svgElement('g',{class:'graph-node','data-kind':n.kind,'data-selected':String(central),role:'button',tabindex:'0','aria-label':`${central?'Notion centrale':'Explorer'} : ${n.label}`});
    group.append(svgElement('circle',{cx:p.x,cy:p.y,r:central?43:23}));
    const sym=svgElement('text',{x:p.x,y:p.y+5,class:'type-mark'});sym.textContent=central?'✳':'◇';group.append(sym);
    const label=svgElement('text',{x:p.x,y:p.y+(central?59:38)});label.textContent=short(n.label,central?32:24);group.append(label);
    const tip=svgElement('title');tip.textContent=n.description||n.label;group.append(tip);
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
      'aria-label':`Ouvrir la fiche de ${n.label}`});
    const x=p.x+(central?33:19),y=p.y-(central?31:18);
    badge.append(svgElement('circle',{cx:x,cy:y,r:central?12:10}));
    const mark=svgElement('text',{x,y:y+4});mark.textContent='i';badge.append(mark);
    const open=(e)=>{e.stopPropagation();clearPreview();state.portraitId=n.id;profileCard(target,n,badge);};
    badge.addEventListener('click',open);
    badge.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open(e);}});
    svg.append(badge);
  }
  target.append(svg);
  target.append(element('p','graph-hint','Survolez ou focalisez une bulle pour voir ses satellites · Le bouton « i » ouvre sa fiche.'));
  if(state.portraitId){const node=all.find(n=>n.id===state.portraitId);if(node)profileCard(target,node);}
  if(view.degree===0) target.append(element('p','graph-empty',state.query?'Aucun voisin correspondant à la recherche. Effacer la recherche pour voir les relations.':'Aucun lien direct déclaré pour cette notion.'));
  $('truncation').textContent=`${shown.length-1} / ${view.degree} bulles voisines visibles · ${state.satellites} maximum · ${state.bundle.edges.length} relations déclarées`;
}
function drawRegistry(target, nodes) {
  const container=element('div','record-list');
  const pageItems=nodes.slice(0,(state.page+1)*60);
  if (!pageItems.length) target.append(element('div','empty','Aucun élément dans cette page.'));
  for(const n of pageItems) {
    const btn=element('button',`record ${state.selection===n.id?'selected':''}`);btn.type='button';
    const content=element('main');content.append(element('strong','',n.label),element('small','',short(n.description||n.id,140)));
    btn.append(content,element('em','',n.kind.replaceAll('_',' ')));btn.addEventListener('click',()=>focusOn(n.id));container.append(btn);
  }
  target.append(container);
  if ((state.page+1)*60<nodes.length) {
    const more=element('button','button ghost','Afficher 60 éléments supplémentaires');
    more.addEventListener('click',()=>{ state.page++; render(); });target.append(more);
  }
  $('truncation').textContent=`Page ${state.page+1} · ${Math.min((state.page+1)*60,nodes.length)} / ${nodes.length} éléments`;
}
function evidence(label,value,good=false) {
  const div=element('div','evidence-item');div.append(element('small','',label),element('strong',good?'ok':'',value));return div;
}
function drawTrace(target){ const d=state.bundle,holder=element('div','evidence');
  holder.append(evidence('Profil du bundle',d.format),evidence('Nature de la vue','Surface opérationnelle dérivée — non normative'),
    evidence('Surface digest annoncé',d.surface_digest),evidence('State ref',d.state_ref),
    evidence('Engagement logique déclaré',d.declared_commitment.digest),
    evidence('Vérification des octets au build',d.verification.byteDigestsVerified?'Oui — octets conformes au manifeste':'Non',true),
    evidence('Vérification cryptographique dans le navigateur','SHA-256 du bundle statique',true),
    evidence('Publication, signatures et activation','Non vérifiées'),
    evidence('Autorité épistémique','Non établie par cette vue'));
  target.append(holder);$('truncation').textContent='SHA-256 ≠ signature ≠ preuve d’autorité';
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
  if (!n){target.append(element('p','','Sélectionnez un élément.'));return;}
  target.append(element('span','kind',n.kind.replaceAll('_',' ')),element('h3','',n.label),element('p','',n.description||'Aucune description déclarée.'));
  const dl=element('dl');addDefinition(dl,'Identifiant de navigation',n.id);
  addDefinition(dl,'Type de projection',n.kind);
  addDefinition(dl,'Relations entrantes',d.edges.filter(e=>e.to===n.id).length);
  addDefinition(dl,'State ref',short(d.state_ref,100));
  if(d.discovery && n.kind==='hosted_state') {
    const meta=d.discovery, c=meta.classification;
    if(c.primary_archetype)addDefinition(dl,'Arketype déclaré',c.primary_archetype);
    if(c.primary_usage)addDefinition(dl,'Usage Arketype déclaré',c.primary_usage);
    if(c.usage_slug)addDefinition(dl,'Usage',c.usage_slug);
    if(c.domain)addDefinition(dl,'Domaine déclaré',c.domain);
    addDefinition(dl,'Organisation',meta.organization);
    addDefinition(dl,'Lecteur conseillé (non exécuté)',meta.reader_profile);
    addDefinition(dl,'Accès suggéré',meta.access_pattern);
    addDefinition(dl,'Taille des fichiers référencés',`${meta.tracked_local_bytes.toLocaleString('fr-FR')} octets · ${meta.size_class}`);
    addDefinition(dl,'Fraîcheur du profil','Non établie indépendamment');
  }
  if(n.period)addDefinition(dl,'Période',n.period);
  if(n.source)addDefinition(dl,'Source déclarée (non vérifiée)',n.source);
  if(d.view_kind==='derived-semantic-preview') {
    const related=d.edges.filter(e=>e.from===n.id||e.to===n.id).slice(0,30);
    for(const e of related) {const other=d.nodes.find(x=>x.id===(e.from===n.id?e.to:e.from));
      if(other)addDefinition(dl,e.relation.replaceAll('_',' '),other.label);}
  }
  target.append(dl);
  const href=gitFileLink(d,n);
  if(href){const a=element('a','inspector-action','↗ Fichier au commit GitHub');a.href=href;a.target='_blank';a.rel='noopener noreferrer';target.append(a);}
  target.append(element('p','note',d.view_kind==='derived-semantic-preview' ? 'Curation de prévisualisation locale : ni autorité historique, ni collection v10 publiée. Les sources demandent une revue éditoriale.' : 'Cette entité n’est pas une assertion validée. Le graphe décrit la navigation et l’hébergement, pas le degré de vérité.'));
  if(d.source?.repository){const issue=element('a','inspector-action','⌁ Proposer un signalement');
    const title=`Konstellation Light · ${d.slug} · ${short(n.label,70)}`;
    const body=`Révision: ${d.revision}\nState ref: ${d.state_ref}\nSurface digest: ${d.surface_digest}\nEntité: ${n.id}\nLien: ${location.href}\n\nObservation (à compléter) :`;
    issue.href=`${d.source.repository}/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;issue.target='_blank';issue.rel='noopener noreferrer';target.append(issue);
  }
}
function selectionDescriptor() {
 const d=state.bundle;
 return { format:'konstellation.light-selection/1.0', note:'Sélection de navigation dérivée, sans engagement sémantique',slug:d.slug,revision:d.revision,
  state_ref:d.state_ref,surface_digest:d.surface_digest,lens:state.lens,focus:state.selection,query:state.query,satellites:state.satellites };
}
async function main(){
  const params=new URLSearchParams(location.search);
  state.embed=params.get('embed')==='1';document.documentElement.classList.toggle('embed',state.embed);
  const back=params.get('retour');
  if(back && /^\/eleve\/(?:[a-z0-9._~!$&'()*+,;=:@%\/?-]*)$/i.test(back) && !back.includes('//')){ $('back-ekole').href=back; $('back-ekole').hidden=false; }
  else if(location.pathname.includes('/eleve/konstellation/')){ $('back-ekole').href='../'; $('back-ekole').hidden=false; }
  state.query=(params.get('q')||'').slice(0,250);$('search').value=state.query;
  state.lens=['constellation','registry','trace','compare'].includes(params.get('lens'))?params.get('lens'):'constellation';
  state.selection=params.get('focus'); state.satellites=clampSatellites(params.get('n')||8);
  try {
    const res=await fetch('./data/catalog.json',{cache:'no-cache'});if(!res.ok)throw Error('Catalogue indisponible');
    const catalog=await res.json();
    if(catalog.format!=='konstellation.light-catalog/1.0'||!Array.isArray(catalog.entries)||catalog.entries.length===0||catalog.entries.length>1000)throw Error('Catalogue invalide');
    state.catalog=catalog;
    const first=catalog.entries[0];const slug=catalog.entries.some(x=>x.slug===params.get('k'))?params.get('k'):first.slug;
    const revision=lookup(slug,params.get('r'))?params.get('r'):existingRevisions(slug).at(-1).revision;
    if(!params.has('lens')) { const stats=lookup(slug,revision); state.lens=(stats.files+stats.members)>150 ? 'registry' : 'constellation'; }
    await setChoice(slug,revision,{keepFocus:true});
  }catch(e){showFailure(e);}
}
$('collection').addEventListener('change',()=>{const s=$('collection').value;state.page=0;state.query='';$('search').value='';setChoice(s,existingRevisions(s).at(-1).revision);});
$('revision').addEventListener('change',()=>{state.page=0;setChoice(state.slug,$('revision').value);});
for(const btn of document.querySelectorAll('[data-lens]'))btn.addEventListener('click',()=>{state.lens=btn.dataset.lens;state.page=0;render();urlState();});
$('search').addEventListener('input',()=>{state.query=$('search').value.slice(0,250);state.page=0;render();urlState();});
document.addEventListener('keydown',e=>{if(e.key==='Escape' && state.portraitId){e.preventDefault();document.querySelector('.node-portrait-card .portrait-close')?.click();}});
$('satellites').addEventListener('input',()=>{state.satellites=clampSatellites($('satellites').value);render();urlState();});
$('graph-back').addEventListener('click',()=>{if(state.history.length<2)return;state.history.pop();state.selection=state.history.at(-1);render();urlState();});
$('graph-home').addEventListener('click',()=>{if(!state.bundle)return;focusOn(state.bundle.nodes[0].id);});
$('reset').addEventListener('click',()=>{state.page=0;state.query='';$('search').value='';render();urlState();});
$('share').addEventListener('click',async()=>{urlState();try{await navigator.clipboard.writeText(location.href);notify('Lien de navigation copié.');}catch{notify(`Copiez l’URL du navigateur pour partager la vue.`);}});
$('export').addEventListener('click',()=>{if(!state.bundle)return;const text=JSON.stringify(selectionDescriptor(),null,2)+'\n';
 const href=URL.createObjectURL(new Blob([text],{type:'application/json'}));const a=element('a');a.href=href;a.download='konstellation-light-selection.json';a.click();setTimeout(()=>URL.revokeObjectURL(href),3000);notify('Descripteur de sélection exporté.');});
$('offline').addEventListener('click',async()=>{
 if(!('serviceWorker' in navigator)){notify('Mode hors ligne indisponible dans ce navigateur.');return;}
 try{const reg=await navigator.serviceWorker.register('./sw.js',{scope:'./'});await navigator.serviceWorker.ready;
 const row=lookup(state.slug,state.revision);const worker=reg.active||reg.waiting||reg.installing;
 worker?.postMessage({type:'KEEP',urls:['./data/catalog.json',`./${row.path}`]});notify('Cache local public activé. Revérifiez les versions après reconnexion.');}
 catch(e){notify(`Mode hors ligne non activé : ${e.message}`);}
});
const networkStatus = () => { $('mode-label').textContent = navigator.onLine ? 'Lecture statique · sans API' : 'Copie hors ligne · fraîcheur non confirmée'; };
window.addEventListener('online',networkStatus);window.addEventListener('offline',networkStatus);networkStatus();
window.addEventListener('popstate',()=>location.reload());
main();
