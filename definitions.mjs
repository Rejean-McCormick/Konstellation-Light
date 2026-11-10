/* Lecteur autonome. Aucune dépendance aux détails internes de l'interface Light. */
import {loadCandidatePreview, appendCandidateView} from './candidate-visual.mjs';

const $=id=>document.getElementById(id);
const SHA=/^sha256:[0-9a-f]{64}$/;
const PATH=/^data\/pack-[0-9a-f]{64}\.json$/;
const state={catalog:null,candidates:null,row:null,graph:null,all:[],filtered:[],selected:null};
const collator=new Intl.Collator('fr-CA',{sensitivity:'base',numeric:true});
const parameters=new URLSearchParams(location.search);

function signal(message){$('status').textContent=message;}
function fail(error){$('error').textContent=String(error?.message||error);signal('Le lecteur n’a pas pu ouvrir ces définitions.');}
async function retrieveJSON(path){const r=await fetch('./'+path,{cache:'no-store'});if(!r.ok)throw Error('Fichier absent : '+path);return await r.json();}
function byName(a,b){return collator.compare(a.label,b.label);}
function nameOf(node){return String(node.label||node.id||'Notion sans nom');}
async function verifiedGraph(row){
  if(!PATH.test(row.path)||!SHA.test(row.sha256)||row.sha256.slice(7)!==row.path.slice(10,-5))throw Error('Référence du graphe non conforme.');
  if(!Number.isSafeInteger(row.bytes)||row.bytes<1||row.bytes>8*1024*1024)throw Error('Taille de graphe non conforme.');
  const response=await fetch('./'+row.path,{cache:'no-store'});
  if(!response.ok)throw Error('Graphe indisponible.');
  const data=await response.arrayBuffer();
  if(data.byteLength!==row.bytes)throw Error('Taille du graphe modifiée.');
  const bytes=await crypto.subtle.digest('SHA-256',data);
  const actual='sha256:'+Array.from(new Uint8Array(bytes),x=>x.toString(16).padStart(2,'0')).join('');
  if(actual!==row.sha256)throw Error('Empreinte du graphe incorrecte.');
  const graph=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(data));
  if(graph.format!=='konstellation.light-navigation/1.0'||graph.slug!==row.slug||graph.state_ref!==row.state_ref||graph.surface_digest!==row.surface_digest||!Array.isArray(graph.nodes)||!Array.isArray(graph.edges))throw Error('Identité du graphe non conforme.');
  return graph;
}
function renderList(){
  const search=$('search').value.trim().toLocaleLowerCase('fr-CA');
  state.filtered=state.all.filter(r=>!search||`${r.label} ${r.definition.text}`.toLocaleLowerCase('fr-CA').includes(search));
  $('counter').textContent=`${state.filtered.length.toLocaleString('fr-CA')} notion(s) avec définition${search?' correspondante(s)':''}`;
  const list=$('notions');list.replaceChildren();
  for(const row of state.filtered){
    const button=document.createElement('button');button.type='button';button.textContent=row.label;
    button.setAttribute('aria-current',String(state.selected===row.node.id));
    if(row.definition.editorial_status==='priority_review'){const mark=document.createElement('span');mark.className='warning';mark.textContent=' · à revoir';button.append(mark);}
    button.addEventListener('click',()=>showDefinition(row.node.id));
    list.append(button);
  }
}
function showDefinition(id){
  state.selected=id;
  const row=state.all.find(r=>r.node.id===id);
  $('candidate-body').replaceChildren();
  if(!row){$('notion-title').textContent='Choisir une notion';return;}
  $('notion-title').textContent=row.label;
  $('domain-description').textContent=state.row.title+' · langue à déterminer · statut candidat';
  appendCandidateView($('candidate-body'),row.definition);
  const link=$('open-graph');link.href='./index.html?k='+encodeURIComponent(state.row.slug);
  renderList();
  const url=new URL(location.href);url.searchParams.set('k',state.row.slug);url.searchParams.set('n',id);history.replaceState(null,'',url);
}
async function chooseKristal(slug){
  $('error').textContent='';$('candidate-body').replaceChildren();$('notions').replaceChildren();state.selected=null;
  const row=state.catalog.entries.find(r=>r.slug===slug);
  if(!row)throw Error('Kristal introuvable.');
  $('kristal').value=row.slug;
  signal('Vérification du graphe et de ses définitions…');
  const graph=await verifiedGraph(row);
  const result=await loadCandidatePreview(row,graph);
  state.row=row;state.graph=graph;
  state.all=graph.nodes.filter(n=>result.entries.has(n.id)).map(node=>({node,label:nameOf(node),definition:result.entries.get(node.id)})).sort(byName);
  if(!state.all.length){signal('Aucune définition candidate disponible pour ce Kristal.');renderList();return;}
  const desired=parameters.get('k')===slug?parameters.get('n'):null;
  const chosen=state.all.find(r=>r.node.id===desired)||state.all[0];
  signal(`${state.all.length.toLocaleString('fr-CA')} notions disponibles dans ${row.title}.`);
  showDefinition(chosen.node.id);
}
async function initialize(){
  try{
    const [catalog,candidates]=await Promise.all([retrieveJSON('data/catalog.json'),retrieveJSON('data/candidates-catalog.json')]);
    if(catalog.format!=='konstellation.light-catalog/1.0'||!Array.isArray(catalog.entries)||candidates.format!=='konstellation.candidate-catalog/1.0'||candidates.publication!==false||candidates.authority!=='candidate_unreviewed_non_authoritative')throw Error('Catalogue des candidats non reconnu.');
    state.catalog=catalog;state.candidates=candidates;
    const rows=catalog.entries.filter(r=>candidates.entries[r.slug]);
    if(!rows.length)throw Error('Aucun Kristal ne contient de définition candidate exploitable.');
    const selector=$('kristal');
    for(const row of rows){
      const opt=document.createElement('option');opt.value=row.slug;
      opt.textContent=`${row.title} · ${candidates.entries[row.slug].count||0}`;
      selector.append(opt);
    }
    selector.addEventListener('change',async()=>{try{await chooseKristal(selector.value);}catch(ex){fail(ex);}});
    $('search').addEventListener('input',()=>renderList());
    const desired=rows.some(r=>r.slug===parameters.get('k'))?parameters.get('k'):rows[0].slug;
    await chooseKristal(desired);
  }catch(ex){fail(ex);}
}
initialize();
