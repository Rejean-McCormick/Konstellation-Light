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
const state = { catalog: null, bundle: null, selection: null, query: '', lens: 'constellation', slug: null, revision: null, embed: false, page: 0 };
let toastTimeout;
function notify(message) { const t = $('toast'); t.textContent = message; t.hidden = false; clearTimeout(toastTimeout); toastTimeout = setTimeout(() => t.hidden = true, 3300); }
function urlState() {
  const p = new URLSearchParams(location.search);
  p.set('k', state.slug || ''); p.set('r', state.revision || ''); p.set('lens', state.lens);
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
      obj.view_kind !== 'derived-hosting-navigation' || obj.slug !== entry.slug || obj.revision !== entry.revision ||
      obj.surface_digest !== entry.surface_digest || !Array.isArray(obj.nodes) || !Array.isArray(obj.edges) ||
      obj.nodes.length > 12000 || obj.edges.length > 12000) throw Error('Format ou identité du bundle non conforme.');
  const ids = new Set();
  for (const n of obj.nodes) {
    if (typeof n.id !== 'string' || n.id.length > 300 || ids.has(n.id) || typeof n.label !== 'string' ||
        n.label.length > 600 || !['hosted_state','logical_artifact','hosted_file'].includes(n.kind)) throw Error('Nœud du bundle invalide.');
    ids.add(n.id);
  }
  for (const e of obj.edges) {
    if (!ids.has(e.from) || !ids.has(e.to) || !['lists_file','has_member'].includes(e.relation)) throw Error('Relation dérivée invalide.');
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
    state.slug = slug; state.revision = revision; state.bundle = data;
    const validFocus = keepFocus && data.nodes.some(n => n.id === state.selection);
    if (!validFocus) state.selection = data.nodes[0]?.id || null;
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
  state.selection = id; render(); urlState();
}
function lensMeta() {
  return {
    constellation: ['Carte des relations', 'Relations techniques déclarées entre état, artefacts et fichiers.'],
    registry: ['Répertoire vérifié', 'Liste complète des éléments techniques présents dans le bundle.'],
    trace: ['Chaîne de traçabilité', 'Empreintes de surface et engagements déclarés, sans validation d’autorité.'],
    compare: ['Comparaison de versions', 'Différences observées entre deux bundles du même Kristal.'],
  }[state.lens];
}
function render() {
  const data = state.bundle; if (!data) return;
  $('title').textContent = data.title;
  $('subtitle').textContent = `Révision ${data.revision} · État ${short(data.state_ref, 85)} · Lecture opérationnelle sans mutation`;
  $('metric-files').textContent = String(data.metrics.files);
  $('metric-members').textContent = String(data.metrics.members);
  $('metric-relations').textContent = String(data.edges.length);
  $('metric-verified').textContent = data.verification.byteDigestsVerified ? '✓ Octets vérifiés au build' : 'Non vérifié';
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
function drawGraph(target, visible) {
  if (!visible.length) { target.append(element('div', 'empty', 'Aucun résultat pour cette recherche.')); return; }
  const root = state.bundle.nodes.find(n => n.kind === 'hosted_state') || state.bundle.nodes[0];
  const others = visible.filter(n=>n.id !== root.id);
  // Favor the currently selected record to preserve context while enforcing a tight visual budget.
  const ordered = state.selection && others.some(n => n.id === state.selection) ? [others.find(n=>n.id===state.selection), ...others.filter(n=>n.id!==state.selection)] : others;
  const shown = [root, ...ordered.slice(0, Math.min(state.embed ? 15 : 26, ordered.length))];
  const svg = svgElement('svg', { viewBox:'0 0 730 380', role:'group', 'aria-label':'Graphe de navigation technique : sélectionner un nœud ouvre son inspecteur' });
  const xy = new Map([[root.id,{x:365,y:190}]]);
  const count = shown.length - 1;
  shown.slice(1).forEach((n,i)=> {const t=(i / Math.max(1,count))*2*Math.PI-Math.PI/2, ring=count>13 && i>=13 ? 148 : 112;
    xy.set(n.id,{x:365+Math.cos(t)*ring*1.9,y:190+Math.sin(t)*ring});});
  for(const edge of state.bundle.edges){ if(!xy.has(edge.from)||!xy.has(edge.to))continue;
    const a=xy.get(edge.from),b=xy.get(edge.to);
    svg.append(svgElement('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,class:'graph-link'})); }
  for(const n of shown){ const p=xy.get(n.id), central=n.id===root.id;
    const group=svgElement('g',{class:'graph-node','data-kind':n.kind,'data-selected':String(state.selection===n.id),role:'button',tabindex:'0','aria-label':`Inspecter ${n.label}`});
    group.append(svgElement('circle',{cx:p.x,cy:p.y,r:central?36:20}));
    const sym=svgElement('text',{x:p.x,y:p.y+4,class:'type-mark'});sym.textContent=central?'✳':n.kind==='hosted_file'?'▤':'◇';group.append(sym);
    const label=svgElement('text',{x:p.x,y:p.y+(central?53:35)});label.textContent=short(n.label,central?29:20);group.append(label);
    group.addEventListener('click',()=>focusOn(n.id));
    group.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();focusOn(n.id);}});
    svg.append(group);
  }
  target.append(svg);
  $('truncation').textContent = `Graphe borné : ${shown.length} / ${visible.length} nœuds affichés · Répertoire pour la liste complète`;
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
  if(!versions.length){target.append(element('div','empty','Une deuxième révision vérifiée du même Kristal est nécessaire pour comparer.'));$('truncation').textContent='Aucune comparaison artificielle';return;}
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
  addDefinition(dl,'State ref',short(d.state_ref,100));target.append(dl);
  const href=gitFileLink(d,n);
  if(href){const a=element('a','inspector-action','↗ Fichier au commit GitHub');a.href=href;a.target='_blank';a.rel='noopener noreferrer';target.append(a);}
  target.append(element('p','note','Cette entité n’est pas une assertion validée. Le graphe décrit la navigation et l’hébergement, pas le degré de vérité.'));
  if(d.source?.repository){const issue=element('a','inspector-action','⌁ Proposer un signalement');
    const title=`Konstellation Light · ${d.slug} · ${short(n.label,70)}`;
    const body=`Révision: ${d.revision}\nState ref: ${d.state_ref}\nSurface digest: ${d.surface_digest}\nEntité: ${n.id}\nLien: ${location.href}\n\nObservation (à compléter) :`;
    issue.href=`${d.source.repository}/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;issue.target='_blank';issue.rel='noopener noreferrer';target.append(issue);
  }
}
function selectionDescriptor() {
 const d=state.bundle;
 return { format:'konstellation.light-selection/1.0', note:'Sélection de navigation dérivée, sans engagement sémantique',slug:d.slug,revision:d.revision,
  state_ref:d.state_ref,surface_digest:d.surface_digest,lens:state.lens,focus:state.selection,query:state.query };
}
async function main(){
  const params=new URLSearchParams(location.search);
  state.embed=params.get('embed')==='1';document.documentElement.classList.toggle('embed',state.embed);
  state.query=(params.get('q')||'').slice(0,250);$('search').value=state.query;
  state.lens=['constellation','registry','trace','compare'].includes(params.get('lens'))?params.get('lens'):'constellation';
  state.selection=params.get('focus');
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
