// Minimal v10 GitHub read-surface fixture matching the upstream integrity rules.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
const hash = x => 'sha256:'+createHash('sha256').update(x).digest('hex');
const cp=(a,b)=>{const x=Array.from(a,c=>c.codePointAt(0)),y=Array.from(b,c=>c.codePointAt(0));for(let i=0;i<Math.min(x.length,y.length);i++)if(x[i]!==y[i])return x[i]-y[i];return x.length-y.length};
const jcs=(x)=>x===null||typeof x!=='object'?JSON.stringify(x):Array.isArray(x)?'['+x.map(jcs).join(',')+']':'{'+Object.keys(x).sort(cp).map(k=>JSON.stringify(k)+':'+jcs(x[k])).join(',')+'}';
function put(root,rel,bytes) {const p=path.join(root,rel);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,bytes);}
export function fixture(root, title='Light Example') {
 const slug='example', dir=`kristals/${slug}`;
 const commitment={profile:'kristal.state-commitment/jcs-sha256-v1',digest:hash('demo-state')};
 const state={schema_version:'9.0',artifact_type:'kristal_state_snapshot',state_ref:'urn:kristal:state:light-demo',logical_commitment:commitment,members:[{artifact_id:'urn:kristal:artifact:test',logical_commitment:{profile:'kristal.logical/jcs-sha256-v1',digest:hash('artifact')}}],references:[]};
 const aiManifest={format:'kristal.portable-ai/1.0',state_ref:state.state_ref,state_logical_commitment:commitment,read_order:['AI_START_HERE.md','ai/INDEX.json']};
 const material={path:'canon/domain/core.json',role:'canonical_content',size:2,sha256:hash('{}')};
 const aiIndex={format:'kristal.ai-index/1.0',state_ref:state.state_ref,state_logical_commitment:commitment,files:[material],materialization_blobs:[]};
 const content={'AI_START_HERE.md':'# Entry\n','AI_MANIFEST.json':JSON.stringify(aiManifest),'ai/INDEX.json':JSON.stringify(aiIndex),'state/state-snapshot.json':JSON.stringify(state),'canon/domain/core.json':'{}'};
 const rows=Object.entries(content).map(([p,t])=>({path:p,role:p==='canon/domain/core.json'?'canonical_content':'documentation',size:Buffer.byteLength(t),sha256:hash(t)})).sort((a,b)=>Buffer.compare(Buffer.from(a.path),Buffer.from(b.path)));
 const sync={format:'kristal.github-sync-manifest/1.0',slug,title,target_root:dir,entrypoint:'AI_START_HERE.md',state_ref:state.state_ref,state_logical_commitment:commitment,file_count:rows.length,total_bytes:rows.reduce((s,r)=>s+r.size,0),materialization_object_count:0,files:rows,policy:{derived_read_surface:true,sync_is_not_publication:true,activation_is_separate:true,materialization_blobs_are_not_implicitly_copied:true}};
 sync.surface_digest=hash(jcs({format:'kristal.github-read-surface/1.0',slug,state_ref:sync.state_ref,state_logical_commitment:commitment,entrypoint:sync.entrypoint,files:rows,materialization_objects:[]}));
 const kr={slug,title,path:dir,entrypoint:`${dir}/AI_START_HERE.md`,state_ref:state.state_ref,state_logical_commitment:commitment,surface_digest:sync.surface_digest,file_count:rows.length,total_bytes:sync.total_bytes,materialization_object_count:0};
 const idx={format:'kristal.github-collection-index/1.0',kristals:[kr],count:1,index_digest:hash(jcs({format:'kristal.github-collection-index/1.0',kristals:[kr]}))};
 for(const [p,t] of Object.entries(content)) put(root,`${dir}/${p}`,t);
 put(root,`${dir}/.kristal/sync-manifest.json`,JSON.stringify(sync));put(root,'kristals/index.json',JSON.stringify(idx));
 return {slug,dir,sync,kr,content};
}
