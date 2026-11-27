#!/usr/bin/env node
// Read-only audit of a generated Light site. No inference, export or publication.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {validateLocalization,validateLocaleDescriptor,MAX_CATALOG_LANGUAGES,normalizeLocale} from '../shared/multilingual-read.mjs';
const sha=b=>'sha256:'+createHash('sha256').update(b).digest('hex');
function safeRead(root,rel,max){
 const file=path.join(root,rel);
 if(!fs.lstatSync(file).isFile()||fs.lstatSync(file).isSymbolicLink()||fs.statSync(file).size>max)throw Error('Fichier absent, lié ou trop volumineux : '+rel);
 const real=fs.realpathSync(file);if(!real.startsWith(root+path.sep))throw Error('Fichier hors du site.');
 return fs.readFileSync(file);
}
export function auditMultilingual(site){
 const root=fs.realpathSync(site),catalogBytes=safeRead(root,'data/catalog.json',32*1024*1024),catalog=JSON.parse(catalogBytes);
 if(catalog.format!=='konstellation.light-catalog/1.0'||!Array.isArray(catalog.entries)||!catalog.entries.length||catalog.entries.length>1000)throw Error('Catalogue invalide.');
 const kristals=[],languages=new Map(),seen=new Set();
 for(const e of catalog.entries){
  if(!e||typeof e.slug!=='string'||typeof e.revision!=='string'||!/^data\/pack-[a-f0-9]{64}\.json$/.test(e.path)||e.sha256!=='sha256:'+e.path.slice(10,-5))throw Error('Référence de pack invalide.');
  const key=e.slug+'\0'+e.revision;if(seen.has(key))throw Error('Révision dupliquée.');seen.add(key);
  const raw=safeRead(root,e.path,8*1024*1024);if(raw.length!==e.bytes||sha(raw)!==e.sha256)throw Error('Pack modifié : '+e.slug);
  const b=JSON.parse(raw);if(b.slug!==e.slug||b.revision!==e.revision||b.state_ref!==e.state_ref||b.surface_digest!==e.surface_digest||!Array.isArray(b.nodes)||!Array.isArray(b.edges)||b.semantic_authority!==false)throw Error('Pack incompatible : '+e.slug);
  const canonical_nodes=b.nodes.filter(n=>typeof n.id==='string'&&n.id.startsWith('KQ')).length;
  const canonical_predicates=new Set(b.edges.filter(x=>typeof x.relation==='string'&&x.relation.startsWith('KP')).map(x=>x.relation)).size;
  const descriptors=e.localizations??{};if(!descriptors||typeof descriptors!=='object'||Array.isArray(descriptors)||Object.keys(descriptors).length>MAX_CATALOG_LANGUAGES)throw Error('Catalogue linguistique invalide.');
  const localeRows=[];const tags=new Set();
  for(const [tag,d] of Object.entries(descriptors)){
    validateLocaleDescriptor(tag,d);const normalized=normalizeLocale(tag);if(!normalized||tags.has(normalized))throw Error('Langue ambiguë : '+tag);tags.add(normalized);
    const bytes=safeRead(root,d.path,4*1024*1024);if(bytes.length!==d.bytes||sha(bytes)!==d.sha256)throw Error('Langue modifiée : '+tag);
    const doc=validateLocalization(JSON.parse(bytes),b);if(doc.locale!==tag)throw Error('Langue incompatible : '+tag);
    const counts={locale:tag,entries:doc.entries.length,labels:doc.entries.filter(x=>x.label).length,definitions:doc.entries.filter(x=>x.definition).length,relations:(doc.relations||[]).length,bytes:d.bytes};
    localeRows.push(counts);
    let total=languages.get(tag);if(!total){total={locale:tag,revisions:0,entries:0,labels:0,definitions:0,relations:0,bytes:0};languages.set(tag,total);}
    total.revisions++;for(const k of ['entries','labels','definitions','relations','bytes'])total[k]+=counts[k];
  }
  kristals.push({slug:e.slug,revision:e.revision,view_kind:b.view_kind,state_ref:e.state_ref,surface_digest:e.surface_digest,pack_sha256:e.sha256,graph_path:b.knowledge?.graph_path??null,canonical_nodes_prefix_KQ:canonical_nodes,canonical_predicates_prefix_KP:canonical_predicates,nodes:b.nodes.length,declared_predicates:new Set(b.edges.map(x=>x.relation)).size,languages:localeRows});
 }
 return {format:'konstellation.light-multilingual-audit/0.1',catalog_sha256:sha(catalogBytes),kristals:new Set(kristals.map(x=>x.slug)).size,revisions:kristals.length,localized_revisions:kristals.filter(x=>x.languages.length).length,sidecars:kristals.reduce((n,x)=>n+x.languages.length,0),language_totals:[...languages.values()].sort((a,b)=>a.locale.localeCompare(b.locale)),entries:kristals,scope:'Only verified generated-site sidecars; KQ/KP prefix counts are descriptive, not identity validation. No diK database coverage, no C1/C2/C3/C4 authorization, no inferred language, no changes.'};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 try{if(process.argv.length!==4||process.argv[2]!=='--site')throw Error('Usage: node scripts/audit-multilingual.mjs --site PATH');console.log(JSON.stringify(auditMultilingual(process.argv[3]),null,2));}catch(e){console.error(e.message);process.exitCode=1;}
}
