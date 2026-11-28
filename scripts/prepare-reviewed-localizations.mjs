#!/usr/bin/env node
// Local, explicit handoff of reviewed curated dictionaries. No activation, no DB or network access.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {inspectGithubKristal,listGithubKristals} from '../shared/kristal-v10.mjs';
import {projectPublicKnowledge} from '../shared/public-knowledge.mjs';
import {validateLocalization,normalizeLocale} from '../shared/multilingual-read.mjs';
const sha=b=>'sha256:'+createHash('sha256').update(b).digest('hex');
const require=(ok,msg)=>{if(!ok)throw Error(msg);};
const str=(s,max=300)=>typeof s==='string'&&s.trim().length>0&&s.length<=max&&!/[\x00-\x1f\x7f]/.test(s);
const keys=(obj,allowed)=>obj&&typeof obj==='object'&&!Array.isArray(obj)&&Object.keys(obj).every(k=>allowed.includes(k));
const rel=s=>typeof s==='string'&&s.length<500&&!/[\\:\x00-\x1f]/.test(s)&&s.split('/').every(x=>x&&x!=='.'&&x!=='..');
function safeFile(root,name,max=16*1024*1024){
 require(rel(name),'Unsafe relative input path');let p=path.resolve(root);for(const part of name.split('/')){p=path.join(p,part);require(!fs.lstatSync(p).isSymbolicLink(),'Symlink refused');}
 const s=fs.statSync(p);require(s.isFile()&&s.size<=max,'Input file type or size refused');return fs.readFileSync(p);
}
function verifiedSurface(collection,slug){
 const checked=inspectGithubKristal({directory:collection,kristal:slug,maxBytes:128*1024*1024,maxFiles:4096},collection);
 const project=projectPublicKnowledge(checked,collection);
 if(!project)return {checked,project:null};
 const root=path.join(collection,'kristals',slug),graphPath=project.knowledge.graph_path;
 const raw=safeFile(root,graphPath);const digest=sha(raw);const listed=checked.files.find(x=>x.path===graphPath);
 require(listed?.sha256===digest,'Graph changed or not declared');const graph=JSON.parse(raw);
 require(str(graph.namespace_id),'Graph namespace missing');
 return {checked,project,graph,graphPath,graphSha256:digest,namespace:graph.namespace_id};
}
export function audit(collection){
 const items=listGithubKristals({directory:collection},collection),rows=[];
 for(const item of items){try{const v=verifiedSurface(collection,item.id);rows.push(v.project?{slug:item.id,status:'VERIFIED_TRANSPORT_ONLY',namespace_id:v.namespace,graph_path:v.graphPath,graph_sha256:v.graphSha256,graph_versions:v.project.knowledge.graph_versions_omitted+1,state_ref:v.checked.sync.state_ref,surface_digest:v.checked.sync.surface_digest,nodes:v.project.nodes.filter(n=>n.kind==='notion').length,relations:new Set(v.project.edges.map(e=>e.relation)).size}:{slug:item.id,status:'DOCUMENTARY_OR_NATIVE',state_ref:v.checked.sync.state_ref,surface_digest:v.checked.sync.surface_digest});}catch(e){rows.push({slug:item.id,status:'BLOCKED',reason:e.code||'ERROR',detail:e.message});}}
 return {format:'light.reviewed-localization-audit/1',authority:'transport_only_no_publication_authority',total:rows.length,counts:Object.fromEntries([...new Set(rows.map(r=>r.status))].map(s=>[s,rows.filter(r=>r.status===s).length])),rows};
}
export function convert(scope,dictionary,base){
 // The manifest is a caller-supplied explicit selection, not proof of reviewer identity or publication rights.
 require(scope.status==='REVIEWED_EXPORT_ADMITTED'&&str(scope.admission_ref)&&/^sha256:[a-f0-9]{64}$/.test(scope.dictionary_sha256),'Explicit reviewed export admission required');
 require(scope.namespace_id===base.namespace&&scope.graph_path===base.graphPath&&scope.graph_sha256===base.graphSha256&&scope.state_ref===base.checked.sync.state_ref&&scope.surface_digest===base.checked.sync.surface_digest,'Namespace, graph or surface mismatch');
 require(keys(dictionary,['schema_version','artifact_type','namespace_id','language','entries'])&&dictionary?.schema_version==='11.0'&&dictionary.artifact_type==='kristal_curated_dictionary'&&dictionary.namespace_id===base.namespace,'Curated dictionary in exact namespace required');
 require(dictionary.language===scope.locale&&normalizeLocale(scope.locale)===scope.locale,'Exact canonical locale required');
 require(Array.isArray(dictionary.entries)&&dictionary.entries.length<=12000,'Dictionary size or entries invalid');
 const nodes=new Set(base.project.nodes.filter(n=>n.kind==='notion').map(n=>n.id)),preds=new Set(base.project.edges.map(e=>e.relation));
 const graphNodes=new Set(base.graph.entities),graphPreds=new Set(base.graph.properties),seen=new Set(),entries=[],relations=[];let omitted=0;
 for(const row of dictionary.entries){const id=row?.semantic_id,review=row?.review;
  require(typeof id==='string'&&/^K[QP][1-9][0-9]*$/.test(id)&&!seen.has(id),'Invalid or duplicate scoped identity');seen.add(id);
  require(str(row.preferred_term,600)&&str(review?.decision_id)&&str(review?.reviewer)&&str(review?.reason,4000),'Missing curated review or label');
  require(keys(row,['semantic_id','preferred_term','alternate_terms','definition','review'])&&keys(review,['decision_id','reviewer','reason']),'Non-curated or candidate record refused');
  require(row.alternate_terms===undefined||(Array.isArray(row.alternate_terms)&&row.alternate_terms.every(x=>str(x,600))&&new Set(row.alternate_terms).size===row.alternate_terms.length),'Invalid alternate terms');
  require(row.definition===undefined||typeof row.definition==='string','Invalid definition');
  const isPred=id.startsWith('KP');require((isPred?graphPreds:graphNodes).has(id),'Dictionary identity outside exact graph');
  if(!(isPred?preds:nodes).has(id)){omitted++;continue;}
  const provenance={provider:'dik',source_refs:[scope.dictionary_sha256],review_status:'reviewed',review_ref:review.decision_id};
  (isPred?relations:entries).push(isPred?{relation_id:id,label:row.preferred_term,provenance}:{node_id:id,label:row.preferred_term,...(row.alternate_terms?.length?{aliases:row.alternate_terms}:{}),...(row.definition?.trim()?{definition:row.definition}:{}),provenance});
 }
 const doc={format:'konstellation.multilingual-read/1.0',authority:'derived_non_authoritative',slug:scope.slug,state_ref:scope.state_ref,surface_digest:scope.surface_digest,locale:scope.locale,entries,...(relations.length?{relations}:{})};
 validateLocalization(doc,{slug:scope.slug,state_ref:scope.state_ref,surface_digest:scope.surface_digest,nodes:base.project.nodes,edges:base.project.edges});
 return {doc,omitted,aliases_exported:entries.reduce((n,e)=>n+(e.aliases?.length||0),0)};
}
function disjointOutput(out,roots){const resolved=path.resolve(out);require(!fs.existsSync(resolved),'Output must be new');let p=path.dirname(resolved);while(!fs.existsSync(p)){const next=path.dirname(p);require(next!==p,'Missing output ancestor');p=next;}require(fs.realpathSync(p)===p,'Output ancestor symlink refused');for(const root of roots){const r=fs.realpathSync(root),relative=path.relative(r,resolved);require(relative.startsWith('..'+path.sep)||path.isAbsolute(relative),'Output inside input refused');}return resolved;}
export function prepare(collection,handoff,out,expectedSha){
 const raw=safeFile(handoff,'manifest.json',2*1024*1024);require(/^sha256:[a-f0-9]{64}$/.test(expectedSha)&&sha(raw)===expectedSha,'Handoff manifest digest mismatch');
 const plan=JSON.parse(raw);require(keys(plan,['format','items'])&&plan.format==='light.reviewed-dictionary-handoff/1'&&Array.isArray(plan.items)&&plan.items.length>0&&plan.items.length<=4096,'Handoff format invalid');
 const dest=disjointOutput(out,[collection,handoff]);const known=new Set(listGithubKristals({directory:collection},collection).map(x=>x.id));const scopes=new Map(),seen=new Set(),staged=[];
 for(const s of plan.items){require(keys(s,['slug','locale','namespace_id','graph_path','graph_sha256','state_ref','surface_digest','dictionary_path','dictionary_sha256','status','admission_ref']),'Unexpected handoff fields');require(known.has(s.slug)&&/^[a-z0-9][a-z0-9-]{0,99}$/.test(s.slug),'Unknown slug');const k=s.slug+'\0'+s.locale;require(!seen.has(k),'Duplicate Kristal/locale');seen.add(k);
  if(!scopes.has(s.slug))scopes.set(s.slug,verifiedSurface(collection,s.slug));const v=scopes.get(s.slug);require(v.project,'Not a verified knowledge graph');
  const b=safeFile(handoff,s.dictionary_path,4*1024*1024);require(sha(b)===s.dictionary_sha256,'Dictionary digest mismatch');const result=convert(s,JSON.parse(b),v);staged.push({s,...result});}
 // All validation completes before creating any output. Private preview files only, no publishing action.
 fs.mkdirSync(path.dirname(dest),{recursive:true});fs.mkdirSync(dest);const report=[];try{for(const {s,doc,omitted,aliases_exported} of staged){const b=Buffer.from(JSON.stringify(doc,null,2)+'\n');require(b.length<=4*1024*1024,'Sidecar byte budget exceeded');const dir=path.join(dest,'localizations',s.slug);fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,s.locale+'.json'),b,{flag:'wx'});report.push({slug:s.slug,locale:s.locale,namespace_id:s.namespace_id,graph_sha256:s.graph_sha256,dictionary_sha256:s.dictionary_sha256,admission_ref:s.admission_ref,aliases_exported,definitions:doc.entries.filter(e=>e.definition).length,nodes:doc.entries.length,relations:doc.relations?.length||0,omitted,sha256:sha(b)});}
 const r={format:'light.reviewed-dictionary-export-report/1',authority:'derived_non_authoritative',publication_authorized:false,activation_authorized:false,manifest_sha256:expectedSha,items:report};fs.writeFileSync(path.join(dest,'report.json'),JSON.stringify(r,null,2)+'\n',{flag:'wx'});return r;
 }catch(e){fs.rmSync(dest,{recursive:true,force:true});throw e;}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [mode,...args]=process.argv.slice(2);const o={};for(let i=0;i<args.length;i+=2){require(args[i]?.startsWith('--')&&args[i+1]&&!Object.hasOwn(o,args[i]),'Invalid arguments');o[args[i]]=args[i+1];}
 if(mode==='audit'){require(o['--collection']&&o['--out'],'audit --collection PATH --out NEW_JSON');const r=audit(path.resolve(o['--collection']));const out=disjointOutput(o['--out'],[o['--collection']]);fs.writeFileSync(out,JSON.stringify(r,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(r.counts));}
 else if(mode==='prepare'){require(o['--collection']&&o['--handoff']&&o['--out']&&o['--manifest-sha256'],'prepare --collection PATH --handoff PATH --manifest-sha256 sha256:... --out NEW_DIR');console.log(JSON.stringify(prepare(path.resolve(o['--collection']),path.resolve(o['--handoff']),o['--out'],o['--manifest-sha256'])));}
 else throw Error('Use audit or prepare');
}
