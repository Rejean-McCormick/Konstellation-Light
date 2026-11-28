// Reader sidecars carry translations only; never alter canonical graph identities.
const localeRE=/^[A-Za-z]{2,8}(?:-[A-Za-z0-9]{1,8})*$/;
const slugRE=/^[a-z0-9][a-z0-9-]{0,99}$/;
const digestRE=/^sha256:[a-f0-9]{64}$/;
const text=(x,max,multiline=false)=>typeof x==='string'&&x.trim().length>0&&x.length<=max&&!(multiline?/[\u0000-\u0009\u000b-\u001f\u007f]/:/[\u0000-\u001f\u007f]/).test(x);
// Source-only publication is a distinct explicit beta path. Never a review decision.
export function isPublicSourceProvenance(pr) {
 return pr?.provider==='wikidata' && pr.review_status==='public_source' && pr.review_ref===undefined && pr.runtime_set_id===undefined && Array.isArray(pr.source_refs) && pr.source_refs.length===4 && /^wikidata:[QP][1-9]\d*@\d+$/.test(pr.source_refs[0]) && /^wbgetentities-sha256-[a-f0-9]{64}$/.test(pr.source_refs[1]) && pr.source_refs.slice(2).every(x=>digestRE.test(x));
}
export function validateLocalization(obj, base, { reviewed = true, publicSource = false } = {}) {
  if (!obj||typeof obj!=='object'||Array.isArray(obj)||
      Object.keys(obj).some(k=>!['authority','entries','relations','format','locale','slug','state_ref','surface_digest'].includes(k)) ||
      obj.format!=='konstellation.multilingual-read/1.0'||
      obj.authority!=='derived_non_authoritative'||!slugRE.test(obj.slug)||
      !localeRE.test(obj.locale)||!text(obj.state_ref,300)||!digestRE.test(obj.surface_digest)||
      !Array.isArray(obj.entries)||obj.entries.length>12000) throw Error('Format de lecture multilingue invalide.');
  if(base && (obj.slug!==base.slug||obj.state_ref!==base.state_ref||obj.surface_digest!==base.surface_digest))
    throw Error('Langue liée à un autre Kristal, état ou empreinte de surface.');
  const known=base?.nodes ? new Set(base.nodes.map(x=>x.id)) : null;
  const seen=new Set();
  for(const item of obj.entries){
    if(!item||typeof item!=='object'||Array.isArray(item)||
       Object.keys(item).some(k=>!['node_id','label','definition','aliases','provenance'].includes(k))||
       !text(item.node_id,300)||seen.has(item.node_id)||
       (known&&!known.has(item.node_id))||
       (item.label===undefined&&item.definition===undefined)||
       (item.label!==undefined&&!text(item.label,600))||
       (item.aliases!==undefined&&(!Array.isArray(item.aliases)||item.aliases.length>80||item.aliases.some(x=>!text(x,600))||new Set(item.aliases).size!==item.aliases.length))||
       (item.definition!==undefined&&!text(item.definition,4000,true))) throw Error('Notion linguistique inconnue ou invalide.');
    seen.add(item.node_id);
    const pr=item.provenance;
    if(!pr||typeof pr!=='object'||Array.isArray(pr)||
       Object.keys(pr).some(k=>!['provider','source_refs','review_status','review_ref','runtime_set_id'].includes(k))||
       (!['dik','semantik_architect','spek','editorial'].includes(pr.provider)&&!(publicSource&&isPublicSourceProvenance(pr)))||
       (!['candidate','reviewed'].includes(pr.review_status)&&!(publicSource&&isPublicSourceProvenance(pr)))||
       (reviewed&&pr.review_status!=='reviewed'&&!(publicSource&&isPublicSourceProvenance(pr)))||
       (pr.review_status==='reviewed'&&!text(pr.review_ref,300))||
       (pr.review_ref!==undefined&&!text(pr.review_ref,300))||
       (pr.runtime_set_id!==undefined&&!text(pr.runtime_set_id,300))||
       !Array.isArray(pr.source_refs)||pr.source_refs.length>80||(item.definition!==undefined&&pr.source_refs.length===0)||
       !pr.source_refs.every(s=>text(s,300))) throw Error('Provenance ou revue linguistique invalide.');
  }
  if(obj.relations!==undefined){
    if(!Array.isArray(obj.relations)||obj.relations.length>5000)throw Error('Relations multilingues invalides.');
    const relationIds=base?.edges ? new Set(base.edges.map(x=>x.relation)) : null;
    const seenRelations=new Set();
    for(const item of obj.relations){
      if(!item||typeof item!=='object'||Array.isArray(item)||
         Object.keys(item).sort().join(',')!=='label,provenance,relation_id'||
         !text(item.relation_id,180)||!text(item.label,600)||seenRelations.has(item.relation_id)||
         (relationIds&&!relationIds.has(item.relation_id)))throw Error('Libellé de relation inconnu ou répété.');
      seenRelations.add(item.relation_id);
      const pr=item.provenance;
      if(!pr||typeof pr!=='object'||Array.isArray(pr)||
         Object.keys(pr).some(k=>!['provider','source_refs','review_status','review_ref','runtime_set_id'].includes(k))||
         (!['dik','semantik_architect','spek','editorial'].includes(pr.provider)&&!(publicSource&&isPublicSourceProvenance(pr)))||
         (!['candidate','reviewed'].includes(pr.review_status)&&!(publicSource&&isPublicSourceProvenance(pr)))||
         (reviewed&&pr.review_status!=='reviewed'&&!(publicSource&&isPublicSourceProvenance(pr)))||
         (pr.review_status==='reviewed'&&!text(pr.review_ref,300))||
         !Array.isArray(pr.source_refs)||pr.source_refs.length>80||
         !pr.source_refs.every(x=>text(x,300)))throw Error('Revue de relation invalide.');
    }
  }
  return obj;
}
export function localizationMap(obj) {return new Map(obj.entries.map(x=>[x.node_id,x]));}
export function relationLocalizationMap(obj){return new Map((obj.relations||[]).map(x=>[x.relation_id,x]));}
export function validateLocaleDescriptor(tag, d) {
  if(!localeRE.test(tag)||!d||typeof d!=='object'||Array.isArray(d)||
     Object.keys(d).sort().join(',')!=='bytes,path,sha256'||
     !/^data\/lang-[a-f0-9]{64}\.json$/.test(d.path)||
     !digestRE.test(d.sha256)||d.path.slice(10,-5)!==d.sha256.slice(7)||
     !Number.isSafeInteger(d.bytes)||d.bytes<1||d.bytes>4*1024*1024)
    throw Error('Référence de langue invalide.');
  return d;
}
export {localeRE};

// Selective multilingual search. A sidecar is a presentation resource, never an identity decision.
export const MAX_CATALOG_LANGUAGES=512;
export const MAX_SEARCH_LANGUAGES=16;
export function normalizeLocale(tag){
  if(typeof tag!=='string'||!localeRE.test(tag))return null;
  try{return Intl.getCanonicalLocales(tag)[0]||null;}catch{return null;}
}
export function selectedSearchLocales(uiLocale, extras=[]){
  const defaults=[normalizeLocale(uiLocale)||'fr','en'];
  return [...new Set([...defaults,...(Array.isArray(extras)?extras:[]).map(normalizeLocale).filter(Boolean)])].slice(0,MAX_SEARCH_LANGUAGES);
}
export function selectedDescriptors(tags, descriptors={}){
  // Only exact BCP47 matches (case/canonical aliases normalized); no implicit fallback to other languages.
  const available=new Map();
  for(const tag of Object.keys(descriptors)){
    const canonical=normalizeLocale(tag);
    if(!canonical)continue;
    if(available.has(canonical))throw Error('Références de langue ambiguës.');
    available.set(canonical,tag);
  }
  return tags.flatMap(locale=>available.has(locale)?[{locale,tag:available.get(locale),descriptor:descriptors[available.get(locale)]}]:[]);
}
export function searchNormalize(value, locale){
  const text=String(value||'').normalize('NFC');
  try{return text.toLocaleLowerCase(locale||undefined).normalize('NFC').trim();}catch{return text.toLowerCase().trim();}
}
// Match all query terms within one language, not across unrelated lexical forms.
export function searchMatches(query, rows, {uiLocale='fr'}={}){
  const results=new Map();
  for(const row of rows){
    const q=searchNormalize(query,row.locale), terms=q.split(/\s+/).filter(Boolean);
    if(!terms.length||!row.node_id)continue;
    const label=searchNormalize(row.label,row.locale), definition=searchNormalize(row.definition,row.locale);
    const aliases=(Array.isArray(row.aliases)?row.aliases:[]).map(a=>searchNormalize(a,row.locale));
    const combined=[label,...aliases,definition].join(' ');
    if(!terms.every(t=>combined.includes(t)))continue;
    const exact=label===q, labelMatch=terms.every(t=>label.includes(t));
    // Exact label, then other label matches, then definition; UI language breaks ties.
    const aliasMatch=aliases.some(a=>terms.every(t=>a.includes(t)));
    const rank=(exact?0:labelMatch?2:aliasMatch?3:4)+(row.locale===uiLocale?0:1);
    const match={locale:row.locale,label:row.label||'',definition:row.definition||'',rank};
    let item=results.get(row.node_id);
    if(!item){item={node_id:row.node_id,rank,matches:[]};results.set(row.node_id,item);}
    item.rank=Math.min(item.rank,rank);item.matches.push(match);
  }
  for(const item of results.values())item.matches.sort((a,b)=>a.rank-b.rank);
  return [...results.values()].sort((a,b)=>a.rank-b.rank||String(a.node_id).localeCompare(String(b.node_id),'en'));
}

// Selection is completed before invoking the loader. The caller supplies an integrity-checked reader.
export async function loadSearchResources(tags,descriptors,load,{signal}={}){
  const requested=selectedDescriptors(tags,descriptors), resources=[], failures=[];
  for(let i=0;i<requested.length;i+=3){
    if(signal?.aborted)break;
    const batch=requested.slice(i,i+3);
    const outcomes=await Promise.allSettled(batch.map(async r=>({locale:r.locale,doc:await load(r)})));
    if(signal?.aborted)break;
    outcomes.forEach((outcome,j)=>outcome.status==='fulfilled'?resources.push(outcome.value):failures.push({locale:batch[j].locale,error:String(outcome.reason)}));
  }
  return {resources,failures,aborted:Boolean(signal?.aborted)};
}
