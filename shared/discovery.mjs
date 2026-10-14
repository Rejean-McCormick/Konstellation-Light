// Optional, allow-listed Authoring Kit 3.3 reader metadata projection.
// This is build-time only: it is neither a declaration of rights nor a publication receipt.
// The v10 collection reader MUST verify the entire synchronized surface before this module runs.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const D='kristal.discovery.json', I='derived/reader-inventory.json', P='derived/reader-profile.json';
const SHA=/^sha256:[a-f0-9]{64}$/;
const isObject=x=>x!==null && typeof x==='object' && !Array.isArray(x);
const text=(x,max=120)=>typeof x==='string'&&x.length>0&&x.length<=max&&!/[\x00-\x1f\x7f]/.test(x);
const requireSafe=(ok,msg)=>{if(!ok) throw Error(`Discovery 3.3 refusé : ${msg}`);};
const digest=x=>'sha256:'+createHash('sha256').update(x).digest('hex');
const subset=(x,keys)=>Object.fromEntries(keys.filter(k=>Object.prototype.hasOwnProperty.call(x,k)).map(k=>[k,x[k]]));

function safeBoundedText(value, max, re, label) {
  if (value===undefined) return undefined;
  requireSafe(text(value,max) && (!re||re.test(value)),`champ ${label} invalide`);
  return value;
}
function projectClassification(raw) {
  requireSafe(isObject(raw),'classification invalide');
  const fields={
    arketype_version:[25,/^[0-9]+(?:\.[0-9]+){1,3}$/],
    primary_archetype:[30,/^ARK-[0-9]{2,}$/],
    primary_usage:[30,/^PRF-[0-9]{2,}$/],
    usage_slug:[90,/^[a-z0-9][a-z0-9-]*$/],
    usage_family:[90,/^[a-z0-9][a-z0-9_-]*$/],
    domain:[90,/^[a-z0-9][a-z0-9_-]*$/],
  };
  const out={};
  for(const [key,[max,re]] of Object.entries(fields)) {
    const value=safeBoundedText(raw[key],max,re,key);
    if(value!==undefined)out[key]=value;
  }
  if(raw.supporting_archetypes!==undefined) {
    requireSafe(Array.isArray(raw.supporting_archetypes)&&raw.supporting_archetypes.length<=20&&
      raw.supporting_archetypes.every(x=>text(x,30)&&/^ARK-[0-9]{2,}$/.test(x))&&
      new Set(raw.supporting_archetypes).size===raw.supporting_archetypes.length,'supporting_archetypes invalide');
    out.supporting_archetypes=[...raw.supporting_archetypes];
  }
  return out;
}
function verifiedJson(root, slug, rows, rel, maxBytes) {
  const entry=rows.get(rel);
  requireSafe(entry&&Number.isSafeInteger(entry.size)&&entry.size>=0&&entry.size<=maxBytes&&SHA.test(entry.sha256),`manifest ${rel} manquant ou hors budget`);
  // Slug came from the validated v10 index; rel is one of three fixed literals above.
  const collection=path.resolve(root), base=fs.realpathSync(collection);
  requireSafe(!fs.lstatSync(collection).isSymbolicLink(),'racine collection liée');
  let at=base;
  for(const name of ['kristals',slug,...rel.split('/')]){
    at=path.join(at,name);
    requireSafe(!fs.lstatSync(at).isSymbolicLink(),`lien symbolique ${rel}`);
  }
  requireSafe(fs.statSync(at).isFile()&&fs.statSync(at).size===entry.size,`taille ${rel} incorrecte`);
  const bytes=fs.readFileSync(at);
  requireSafe(bytes.length===entry.size&&digest(bytes)===entry.sha256,`empreinte ${rel} divergente`);
  try{return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}
  catch {throw Error(`Discovery 3.3 refusé : JSON ou UTF-8 invalide : ${rel}`);}
}

export function discoveryProjection(checked, collectionRoot) {
  const rows=new Map(checked.files.map(r=>[r.path,r]));
  const present=[D,I,P].filter(rel=>rows.has(rel));
  if(!present.length)return null; // Old Kristals remain readable without profiles.
  requireSafe(present.length===3,'ensemble incomplet : discovery + inventory + profile requis');
  const [discovery, inventory, profile]=[
    verifiedJson(collectionRoot,checked.slug,rows,D,65536),
    verifiedJson(collectionRoot,checked.slug,rows,I,2*1024*1024),
    verifiedJson(collectionRoot,checked.slug,rows,P,2*1024*1024),
  ];
  const ref=checked.sync.state_ref;
  const fp=discovery?.source_fingerprint;
  requireSafe(isObject(discovery)&&discovery.format==='kristal.discovery/1.0'&&discovery.state_ref===ref&&SHA.test(fp)&&
    discovery.authority==='noncanonical_derived_metadata_not_access_or_publication_authority', 'format, identité, empreinte ou autorité du manifeste');
  requireSafe(isObject(discovery.data_layout)&&discovery.data_layout.inventory_ref===I&&
    text(discovery.data_layout.organization,40)&&
    (discovery.data_layout.native_kind===null || discovery.data_layout.native_kind===undefined || text(discovery.data_layout.native_kind,120))&&
    (discovery.data_layout.state_architecture===null||discovery.data_layout.state_architecture===undefined||text(discovery.data_layout.state_architecture,80)), 'data_layout invalide');
  requireSafe(isObject(discovery.reader)&&discovery.reader.hints_ref===P&&text(discovery.reader.profile,120)&&
    /^kristal\.reader\/[a-z0-9][a-z0-9-]{0,100}$/.test(discovery.reader.profile), 'reader invalide');
  requireSafe(isObject(discovery.size)&&['tiny','small','medium','large','massive'].includes(discovery.size.class)&&
    Number.isSafeInteger(discovery.size.tracked_local_bytes)&&discovery.size.tracked_local_bytes>=0&&
    ['measured_referenced_local_files','partial'].includes(discovery.size.completeness), 'taille invalide');
  requireSafe(isObject(inventory)&&inventory.format==='kristal.reader-inventory/1.0'&&inventory.state_ref===ref&&
    inventory.source_fingerprint===fp&&inventory.size_class===discovery.size.class&&Array.isArray(inventory.files)&&
    Array.isArray(inventory.segments), 'inventaire incompatible');
  requireSafe(isObject(profile)&&profile.format==='kristal.reader-profile/1.0'&&profile.state_ref===ref&&
    profile.source_fingerprint===fp&&profile.configuration_status==='advisory_only'&&
    text(profile.access_pattern,80)&&text(profile.specialization,120)&&
    profile.specialization===discovery.reader.profile&&Array.isArray(profile.artifact_strategies)&&
    Array.isArray(profile.parser_candidates), 'profil de lecture incompatible');
  // Intentionally omit source_fingerprint, artifact paths, per-file hashes, strategy commands,
  // paths, materialization profiles and any other non-allowlisted or private data.
  return {
    format:'konstellation.light-discovery-projection/1.0',
    authority:'noncanonical_advisory_only',
    provenance:'verified_v10_transport',
    freshness:'not_independently_verified',
    classification:projectClassification(discovery.classification),
    organization:discovery.data_layout.organization,
    native_kind:discovery.data_layout.native_kind??null,
    reader_profile:discovery.reader.profile,
    access_pattern:profile.access_pattern,
    size_class:discovery.size.class,
    tracked_local_bytes:discovery.size.tracked_local_bytes,
    measurement_completeness:discovery.size.completeness,
  };
}

export function validProjectedDiscovery(d) {
  if(!isObject(d)||d.format!=='konstellation.light-discovery-projection/1.0'||d.authority!=='noncanonical_advisory_only'||
     d.provenance!=='verified_v10_transport'||d.freshness!=='not_independently_verified'||!isObject(d.classification))return false;
  try {
    const cls=projectClassification(d.classification);
    if(JSON.stringify(cls)!==JSON.stringify(d.classification))return false;
    return text(d.organization,40) && (d.native_kind===null||text(d.native_kind,120)) &&
      text(d.reader_profile,120)&&/^kristal\.reader\/[a-z0-9][a-z0-9-]{0,100}$/.test(d.reader_profile)&&
      text(d.access_pattern,80)&&['tiny','small','medium','large','massive'].includes(d.size_class)&&
      Number.isSafeInteger(d.tracked_local_bytes)&&d.tracked_local_bytes>=0&&
      ['measured_referenced_local_files','partial'].includes(d.measurement_completeness)&&
      Object.keys(d).every(k=>['format','authority','provenance','freshness','classification','organization','native_kind','reader_profile','access_pattern','size_class','tracked_local_bytes','measurement_completeness'].includes(k));
  }catch{return false;}
}
