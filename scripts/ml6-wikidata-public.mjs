// Separate explicit public beta: only selected exact mappings in already-public graphs.
// diK is used locally to select public IDs, never as a public payload or CI dependency.
import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';import {fileURLToPath} from 'node:url';
import {inspectGithubKristal,verifyCollectionIndex} from '../shared/kristal-v10.mjs';
import {projectPublicKnowledge} from '../shared/public-knowledge.mjs';
import {validateLocalization} from '../shared/multilingual-read.mjs';
import {inspectSite} from './c4-publication-gate.mjs';
export const LANGS=['fr','en','es','it','fi','de'];
const MARK='wikidata-public-cc0-v1', FORMAT='light.wikidata-public-scope/1';
const sha=b=>'sha256:'+createHash('sha256').update(b).digest('hex');const json=o=>Buffer.from(JSON.stringify(o,null,2)+'\n');
const need=(ok,msg)=>{if(!ok)throw Error(msg)};const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const txt=(s,n=600)=>typeof s==='string'&&s.trim().length>0&&s.length<=n&&!/[\x00-\x1f\x7f]/.test(s);
const exactKeys=(o,keys)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).sort().join(',')===[...keys].sort().join(',');
const identity=(id,q)=>/^K[QP][1-9]\d*$/.test(id||'')&&/^[QP][1-9]\d*$/.test(q||'')&&id[1]===q[0];
const idx=c=>verifyCollectionIndex(read(path.join(c,'kristals/index.json')));
export function exactMappings(graph,mappings,projection){
 const a=new Map(),nodes=new Set(projection.nodes.filter(x=>x.kind==='notion'&&!x.technical_identifier).map(x=>x.id)),preds=new Set(projection.edges.map(x=>x.relation));
 for(const m of mappings){const id=m.local_ref?.id,q=m.external_ref?.id;
  if(m.status!=='accepted'||m.relation!=='exactMatch'||m.local_ref?.namespace_id!==graph.namespace_id||m.external_ref?.system!=='wikidata'||!txt(m.review?.decision_id,300)||!identity(id,q))continue;
  if(!a.has(id))a.set(id,new Set());a.get(id).add(q);
 }
 return new Map([...a].filter(([id,qs])=>qs.size===1&&(id[1]==='Q'?nodes.has(id)&&graph.entities.includes(id):preds.has(id)&&graph.properties.includes(id))).map(([id,qs])=>[id,[...qs][0]]));
}
function context(collection,row,bundle){
 if(bundle.view_kind!=='derived-public-knowledge')return null;
 const checked=inspectGithubKristal({directory:collection,kristal:row.slug,maxBytes:128*1024*1024,maxFiles:4096},collection);
 need(checked.sync.state_ref===bundle.state_ref&&checked.sync.surface_digest===bundle.surface_digest,'Public graph surface mismatch');
 const project=projectPublicKnowledge(checked,collection);need(project,'Graph projection missing');
 const readVerified=rel=>{const f=checked.files.find(x=>x.path===rel);if(!f)return null;const b=fs.readFileSync(path.join(collection,'kristals',row.slug,rel));need(sha(b)===f.sha256&&b.length===f.size,'Public file changed');return {obj:JSON.parse(b),hash:f.sha256};};
 const gp=project.knowledge.graph_path,g=readVerified(gp),si=readVerified('canon/state.index.json');const cp=path.posix.join(path.posix.dirname(gp),'crosswalk.json');
 if(!g||!si?.obj.canonical_artifacts?.some(a=>a.path===cp&&a.logical_contract?.id==='kristal.v11.external-crosswalk'))return null;
 const cross=readVerified(cp);if(!cross||cross.obj.artifact_type!=='kristal_external_crosswalk'||!Array.isArray(cross.obj.mappings))return null;
 return {namespace:g.obj.namespace_id,graph_sha256:g.hash,crosswalk_sha256:cross.hash,accepted:exactMappings(g.obj,cross.obj.mappings,project)};
}
function bundles(site){const cat=read(path.join(site,'data/catalog.json'));return {cat,rows:cat.entries.map(row=>{const b=fs.readFileSync(path.join(site,row.path));need(sha(b)===row.sha256&&b.length===row.bytes,'Bundle changed');return {row,bundle:JSON.parse(b)}})};}
export function makeScope(collection,site,source){
 need(inspectSite(site).integrity==='PASS','Fresh base integrity failed');need(source.format==='light.private-dik-source/1'&&Array.isArray(source.rows),'Pinned diK records required');
 const {rows}=bundles(site), groups=[];
 for(const {row,bundle} of rows){const c=context(collection,row,bundle);if(!c)continue;const selected=new Map();
  for(const r of source.rows){if(r.namespace_id!==c.namespace||!LANGS.includes(r.language)||c.accepted.get(r.semantic_id)!==r.external_id||!/^wbgetentities-sha256-[a-f0-9]{64}$/.test(r.source_snapshot||'')||!Number.isSafeInteger(r.source_revision)||r.source_revision<1||!txt(r.preferred_term))continue;selected.set(r.semantic_id,r.external_id);}
  if(selected.size)groups.push({slug:row.slug,state_ref:bundle.state_ref,surface_digest:bundle.surface_digest,graph_sha256:c.graph_sha256,crosswalk_sha256:c.crosswalk_sha256,identities:[...selected].sort((a,b)=>a[0].localeCompare(b[0],'en')).map(([id,wikidata])=>({id,wikidata}))});
 }
 need(groups.length,'No exact public mapping selected');return {format:FORMAT,index_digest:idx(collection).index_digest,groups};
}
export function checkScope(collection,site,plan){
 need(exactKeys(plan,['format','index_digest','groups'])&&plan.format===FORMAT&&plan.index_digest===idx(collection).index_digest&&Array.isArray(plan.groups)&&plan.groups.length>0&&plan.groups.length<=127,'Scope/index mismatch');
 const {cat,rows}=bundles(site), map=new Map(rows.map(x=>[x.row.slug,x])),seen=new Set(),selected=[];
 for(const g of plan.groups){need(exactKeys(g,['slug','state_ref','surface_digest','graph_sha256','crosswalk_sha256','identities'])&&!seen.has(g.slug)&&map.has(g.slug)&&Array.isArray(g.identities)&&g.identities.length>0,'Invalid public scope group');seen.add(g.slug);
  const {row,bundle}=map.get(g.slug),c=context(collection,row,bundle);need(c&&g.state_ref===bundle.state_ref&&g.surface_digest===bundle.surface_digest&&g.graph_sha256===c.graph_sha256&&g.crosswalk_sha256===c.crosswalk_sha256,'Stale public graph scope');const ids=new Set();
  for(const x of g.identities){need(exactKeys(x,['id','wikidata'])&&identity(x.id,x.wikidata)&&!ids.has(x.id)&&c.accepted.get(x.id)===x.wikidata,'Mapping not uniquely accepted in projected public graph');ids.add(x.id);}
  selected.push({g,row,bundle});
 }
 need(selected.reduce((n,x)=>n+x.g.identities.length,0)<=10000,'Scope budget exceeded');return {cat,selected};
}
export function parseEntityResponse(bytes,requested){
 const raw=JSON.parse(bytes);need(raw&&raw.entities&&!raw.error,'Wikidata returned an invalid response');const out=new Map(),hash='wbgetentities-'+sha(bytes).replace(':','-');
 for(const id of requested){const e=raw.entities[id];if(!e||Object.hasOwn(e,'missing')||e.id!==id||!Number.isSafeInteger(e.lastrevid)||e.lastrevid<1)continue;
  const terms={};for(const l of LANGS){const label=e.labels?.[l];if(label?.language!==l||!txt(label.value))continue;
   const aliases=Array.isArray(e.aliases?.[l])?[...new Set(e.aliases[l].filter(x=>x.language===l&&txt(x.value)&&x.value!==label.value).map(x=>x.value))].slice(0,80):[];
   const d=e.descriptions?.[l];terms[l]={label:label.value,aliases,description:d?.language===l&&txt(d.value,4000)?d.value:null};}
  out.set(id,{revision:e.lastrevid,snapshot:hash,terms});
 }return out;
}
export async function fetchTerms(ids,fetcher=fetch,wait=ms=>new Promise(r=>setTimeout(r,ms))){
 const unique=[...new Set(ids)].sort();need(unique.length>0&&unique.length<=2000&&unique.every(x=>/^[QP][1-9]\d*$/.test(x)),'Public query budget exceeded');const result=new Map();
 for(let i=0;i<unique.length;i+=40){const batch=unique.slice(i,i+40),u=new URL('https://www.wikidata.org/w/api.php');u.search=new URLSearchParams({action:'wbgetentities',ids:batch.join('|'),props:'info|labels|aliases|descriptions',languages:LANGS.join('|'),format:'json',maxlag:'5'}).toString();let bytes;
  for(let attempt=0;attempt<7;attempt++){let retryAfter=0;try{const response=await fetcher(u,{headers:{'User-Agent':'Konstellation-Light/2.3.1 (https://github.com/Rejean-McCormick/Konstellation-Light)','Accept':'application/json'},signal:AbortSignal.timeout(60000),redirect:'error'});const header=response.headers?.get('retry-after');if(header){const seconds=Number(header);retryAfter=Number.isFinite(seconds)?Math.max(0,seconds*1000):Math.max(0,Date.parse(header)-Date.now())||0;}need(response.ok,'Wikidata HTTP '+response.status);const b=Buffer.from(await response.arrayBuffer());need(b.length<=12*1024*1024,'Wikidata response too large');const j=JSON.parse(b);need(!j.error,'Wikidata API error: '+(j.error?.code||''));bytes=b;break;}catch(e){if(attempt===6||retryAfter>120000)throw e;const delay=Math.max(retryAfter,Math.min(60000,5000*2**attempt));console.warn('WIKIDATA RETRY:',e.message,'in',delay,'ms');await wait(delay);}}
  for(const [id,row] of parseEntityResponse(bytes,batch))result.set(id,row);console.log('WIKIDATA:',Math.min(i+40,unique.length),'/',unique.length);if(i+40<unique.length)await wait(400);
 }return result;
}
export function stageTerms(checked,terms){const {cat,selected}=checked,files=new Map(),samples=[],details=[];
 need(cat.lexical_source===undefined&&cat.entries.every(x=>!Object.keys(x.localizations||{}).length),'Fresh unlocalized site required');
 for(const {g,row,bundle} of selected)for(const locale of LANGS){const entries=[],relations=[];
  for(const x of g.identities){const e=terms.get(x.wikidata),t=e?.terms[locale];if(!t)continue;const provenance={provider:'wikidata',review_status:'public_source',source_refs:[`wikidata:${x.wikidata}@${e.revision}`,e.snapshot,g.graph_sha256,g.crosswalk_sha256]};
   if(x.id[1]==='P')relations.push({relation_id:x.id,label:t.label,provenance});else entries.push({node_id:x.id,label:t.label,...(t.aliases.length?{aliases:t.aliases}:{}),...(t.description?{definition:t.description}:{}),provenance});}
  if(!entries.length&&!relations.length)continue;
  const doc={format:'konstellation.multilingual-read/1.0',authority:'derived_non_authoritative',slug:g.slug,state_ref:g.state_ref,surface_digest:g.surface_digest,locale,entries,...(relations.length?{relations}:{})};validateLocalization(doc,bundle,{publicSource:true});let refused=false;try{validateLocalization(doc,bundle)}catch{refused=true}need(refused,'Reviewed-only gate must refuse source');
  const bytes=json(doc),hash=sha(bytes),rel=`data/lang-${hash.slice(7)}.json`;need(bytes.length<=4*1024*1024,'Language budget');files.set(rel,bytes);row.localizations??={};row.localizations[locale]={path:rel,sha256:hash,bytes:bytes.length};
  details.push({slug:g.slug,locale,labels:entries.length,relations:relations.length,aliases:entries.reduce((n,e)=>n+(e.aliases?.length||0),0),definitions:entries.filter(x=>x.definition).length});
  const sample=entries.find(e=>e.label.length>=3&&e.label.length<=200&&e.aliases?.some(a=>a.length>=3&&a.length<=200))||entries.find(e=>e.label.length>=3&&e.label.length<=200);if(sample)samples.push({slug:g.slug,revision:row.revision,locale,node:sample.node_id,label:sample.label,alias:sample.aliases?.find(a=>a.length>=3&&a.length<=200)||null});
 }
 need(LANGS.every(l=>samples.some(x=>x.locale===l)),'No sample in one or more languages');cat.lexical_source=MARK;
 return {cat,files,samples,details};
}
export function attach(collection,site,plan,terms){need(inspectSite(site).integrity==='PASS','Base integrity failed');const result=stageTerms(checkScope(collection,site,plan),terms);
 for(const [rel,b] of result.files)fs.writeFileSync(path.join(site,rel),b,{flag:'wx'});fs.writeFileSync(path.join(site,'data/catalog.json'),json(result.cat));
 need(inspectSite(site,undefined,{publicSource:true}).github_pages_gate==='BLOCK_REAL_COLLECTION','C4 must stay blocked');let denied=false;try{inspectSite(site)}catch{denied=true}need(denied,'Ordinary gate must refuse source-only beta');
 verifyAttached(collection,site,plan);return result;
}
export function verifyAttached(collection,site,plan){need(inspectSite(site,undefined,{publicSource:true}).github_pages_gate==='BLOCK_REAL_COLLECTION','Source-only integrity failed');const {cat,selected}=checkScope(collection,site,plan);need(cat.lexical_source===MARK,'Source marker absent');const allowed=new Map(selected.map(x=>[x.g.slug,x.g]));let n=0;
 for(const row of cat.entries)for(const [l,d] of Object.entries(row.localizations||{})){const g=allowed.get(row.slug);need(g&&LANGS.includes(l),'Unexpected localization');const ids=new Map(g.identities.map(x=>[x.id,x.wikidata])),doc=read(path.join(site,d.path));for(const x of [...doc.entries,...(doc.relations||[])]){const p=x.provenance,ref=p.source_refs[0],id=x.node_id||x.relation_id;need(ids.has(id)&&p.review_status==='public_source'&&ref.startsWith('wikidata:'+ids.get(id)+'@')&&p.source_refs[2]===g.graph_sha256&&p.source_refs[3]===g.crosswalk_sha256,'Source not bound to approved mapping');n++;}}
 need(n>0,'No source records');return n;
}
function planRead(p,h){const b=fs.readFileSync(p);need(b.length<=2*1024*1024&&sha(b)===h,'Scope SHA256 mismatch');return JSON.parse(b);}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [mode,collection,site,input,hash,out]=process.argv.slice(2);
 if(mode==='scope'){const plan=makeScope(collection,site,read(input));const b=json(plan);fs.writeFileSync(hash,b,{flag:'wx'});console.log('SCOPE_SHA256:',sha(b));}
 else if(mode==='attach'){const plan=planRead(input,hash);need(inspectSite(site).integrity==='PASS','Base integrity failed');const {selected}=checkScope(collection,site,plan);const terms=await fetchTerms(selected.flatMap(x=>x.g.identities.map(y=>y.wikidata)));const r=attach(collection,site,plan,terms);fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'samples.json'),json(r.samples));fs.writeFileSync(path.join(out,'coverage.json'),json({status:'PUBLIC_SOURCE_BETA_CANDIDATE',publicationAuthorized:false,scopeSha256:hash,details:r.details,matchedGraphs:new Set(r.details.map(x=>x.slug)).size,sourceEntities:terms.size}));console.log('PUBLIC_SOURCE_CANDIDATE:',r.details.length,'packs');}
 else if(mode==='verify'){console.log('SOURCE_RECORDS_VERIFIED:',verifyAttached(collection,site,planRead(input,hash)));}
 else throw Error('scope COLLECTION SITE RECORDS OUTPUT | attach COLLECTION SITE SCOPE SHA256 REPORT_DIR | verify COLLECTION SITE SCOPE SHA256');
}
