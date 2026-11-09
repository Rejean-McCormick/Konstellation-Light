// Reader sidecars carry translations only; never alter canonical graph identities.
const localeRE=/^[A-Za-z]{2,8}(?:-[A-Za-z0-9]{1,8})*$/;
const slugRE=/^[a-z0-9][a-z0-9-]{0,99}$/;
const digestRE=/^sha256:[a-f0-9]{64}$/;
const text=(x,max,multiline=false)=>typeof x==='string'&&x.trim().length>0&&x.length<=max&&!(multiline?/[\u0000-\u0009\u000b-\u001f\u007f]/:/[\u0000-\u001f\u007f]/).test(x);
export function validateLocalization(obj, base, { reviewed = true } = {}) {
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
       Object.keys(item).some(k=>!['node_id','label','definition','provenance'].includes(k))||
       !text(item.node_id,300)||seen.has(item.node_id)||
       (known&&!known.has(item.node_id))||
       (item.label===undefined&&item.definition===undefined)||
       (item.label!==undefined&&!text(item.label,600))||
       (item.definition!==undefined&&!text(item.definition,4000,true))) throw Error('Notion linguistique inconnue ou invalide.');
    seen.add(item.node_id);
    const pr=item.provenance;
    if(!pr||typeof pr!=='object'||Array.isArray(pr)||
       Object.keys(pr).some(k=>!['provider','source_refs','review_status','review_ref','runtime_set_id'].includes(k))||
       !['dik','semantik_architect','spek','editorial'].includes(pr.provider)||
       !['candidate','reviewed'].includes(pr.review_status)||
       (reviewed&&pr.review_status!=='reviewed')||
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
         !['dik','semantik_architect','spek','editorial'].includes(pr.provider)||
         !['candidate','reviewed'].includes(pr.review_status)||
         (reviewed&&pr.review_status!=='reviewed')||
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
