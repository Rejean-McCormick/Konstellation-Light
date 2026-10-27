#!/usr/bin/env node
// Explicit, curated, local-only projection for Ekole; NEVER a Kristal v10 publication.
// Accepts no arbitrary Kristal directory and does not infer facts from filenames.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const args={};
for(let i=2;i<process.argv.length;i+=2){if(!process.argv[i]?.startsWith('--')||!process.argv[i+1])throw Error('Arguments --input FILE --out DOSSIER --local YES requis.');args[process.argv[i].slice(2)]=process.argv[i+1];}
if(args.local!=='YES'||!args.input||!args.out)throw Error('Prévisualisation locale uniquement : --input FILE --out DOSSIER --local YES.');
const input=path.resolve(args.input),out=path.resolve(args.out);
const official=path.resolve(root,'light/site');
if(out===official || out.startsWith(official+path.sep))throw Error('Ne pas remplacer la distribution publique Light avec un graphe candidat.');
if(out===root||out===path.parse(out).root||out===path.dirname(input))throw Error('Destination de prévisualisation non sûre.');
if(!fs.statSync(input).isFile()||fs.statSync(input).size>5*1024*1024)throw Error('Fichier de curation absent ou trop volumineux.');
const d=JSON.parse(fs.readFileSync(input,'utf8'));
const text=(x,max)=>typeof x==='string'&&x.trim().length>0&&x.length<=max;
const simple=(x)=>typeof x==='string'&&/^[a-z0-9][a-z0-9._:-]{0,119}$/i.test(x);
if(d.format!=='konstellation.semantic-curation/1.0'||d.visibility!=='local-preview'||!text(d.title,180)||!simple(d.slug)||!Array.isArray(d.nodes)||!Array.isArray(d.edges)||d.nodes.length<1||d.nodes.length>3000||d.edges.length>6000)throw Error('Format de curation invalide.');
const kinds=new Set(['notion','societe','role','tache','ressource','territoire','periode','evenement','source','cours','competence','pratique','institution','person','personne','human','place','location','lieu','city','country','region']);
// Only explicitly supplied local raster files are copied. No network requests,
// untrusted SVG/HTML, symbolic-link traversal or parent-directory traversal.
const portraitFiles = new Map();
function readPortrait(reference) {
  if (typeof reference !== 'string' || !/^portraits\/[a-z0-9][a-z0-9_.-]{0,100}\.(png|jpg|jpeg|webp|gif)$/i.test(reference))
    throw Error('Portrait local invalide : utiliser portraits/nom.png (JPG, PNG, WEBP, GIF).');
  const declared = path.resolve(path.dirname(input), reference);
  if (fs.lstatSync(declared).isSymbolicLink() || !fs.statSync(declared).isFile() || fs.statSync(declared).size > 2 * 1024 * 1024)
    throw Error('Portrait absent, lié ou trop volumineux.');
  const physical = fs.realpathSync(declared);
  const inputDir = fs.realpathSync(path.dirname(input));
  if (!physical.startsWith(inputDir + path.sep)) throw Error('Portrait hors de la curation.');
  const bytes = fs.readFileSync(physical);
  const ext = path.extname(reference).slice(1).toLowerCase();
  const jpg = bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const png = bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  const gif = ['GIF87a','GIF89a'].includes(bytes.toString('ascii',0,6));
  const webp = bytes.toString('ascii',0,4) === 'RIFF' && bytes.toString('ascii',8,12) === 'WEBP';
  if (!((['jpg','jpeg'].includes(ext) && jpg) || (ext==='png' && png) || (ext==='gif' && gif) || (ext==='webp' && webp)))
    throw Error('Signature du fichier image incompatible avec son extension.');
  const name = `images/${createHash('sha256').update(bytes).digest('hex')}.${ext}`;
  portraitFiles.set(name,bytes);
  return `./${name}`;
}
const ids=new Set();const nodes=d.nodes.map(n=>{
 if(!simple(n.id)||ids.has(n.id)||!kinds.has(n.kind)||!text(n.label,220)||!text(n.description,1500)|| (n.period!==undefined&&!text(n.period,120))||(n.source!==undefined&&!text(n.source,250))||(n.disambiguation!==undefined&&!text(n.disambiguation,250))||(n.location!==undefined&&!text(n.location,250))||(n.aliases!==undefined&&(!Array.isArray(n.aliases)||n.aliases.length>8||!n.aliases.every(a=>text(a,150)))))throw Error('Nœud invalide, doublonné ou sans description.');
 ids.add(n.id);
 return {id:n.id,kind:n.kind,label:n.label,description:n.description,...(n.period?{period:n.period}:{}),...(n.source?{source:n.source}:{}),...(n.disambiguation?{disambiguation:n.disambiguation}:{}),...(n.location?{location:n.location}:{}),...(n.aliases?{aliases:n.aliases}:{}),...(n.portrait!==undefined?{portrait:readPortrait(n.portrait)}:{})};
});
const edges=d.edges.map(e=>{
 if(!ids.has(e.from)||!ids.has(e.to)||!simple(e.relation)||e.from===e.to)throw Error('Relation invalide ou référence manquante.');
 return {from:e.from,to:e.to,relation:e.relation};
});
const digest=b=>createHash('sha256').update(b).digest('hex');
const json=v=>Buffer.from(JSON.stringify(v,null,2)+'\n');
const bundle={format:'konstellation.light-navigation/1.0',view_kind:'derived-semantic-preview',semantic_authority:false,
 title:d.title,slug:d.slug,revision:'candidate-local',state_ref:'local-curated-not-a-v10-publication',surface_digest:'sha256:'+digest(fs.readFileSync(input)),
 declared_commitment:{digest:'not-claimed'},verification:{byteDigestsVerified:false,semanticCommitmentVerified:false},
 metrics:{members:nodes.length,files:0,bytes:0},nodes,edges};
const bytes=json(bundle),hash=digest(bytes);const row={slug:d.slug,title:d.title,revision:'candidate-local',state_ref:bundle.state_ref,
 surface_digest:bundle.surface_digest,path:`data/pack-${hash}.json`,sha256:`sha256:${hash}`,bytes:bytes.length,members:nodes.length,files:0,mode:'semantic_preview'};
const catalog={format:'konstellation.light-catalog/1.0',notice:'PRÉVISUALISATION LOCALE DE CURATION — PAS UNE PUBLICATION KRISTAL v10.',entries:[row]};
// No symlinked ancestors and no overwrite: this protects existing user and school sites.
for(let p=out;;p=path.dirname(p)){if(fs.existsSync(p)&&fs.lstatSync(p).isSymbolicLink())throw Error('Destination via lien symbolique interdite.');if(path.dirname(p)===p)break;}
if(fs.existsSync(out))throw Error('Destination déjà présente. Choisir un nouveau dossier; ne pas écraser Ekole.');
fs.mkdirSync(path.dirname(out),{recursive:true});const tmp=fs.mkdtempSync(path.join(path.dirname(out),'.konstellation-preview-'));
try {
 fs.mkdirSync(path.join(tmp,'data'));
 if(portraitFiles.size)fs.mkdirSync(path.join(tmp,'images'));
 for(const [name,bytes] of portraitFiles)fs.writeFileSync(path.join(tmp,name),bytes);
 for(const name of ['index.html','app.js','style.css','sw.js','graph-core.mjs','profile.mjs','semantic-display.mjs'])fs.copyFileSync(path.join(root,'light/src',name),path.join(tmp,name));
 fs.writeFileSync(path.join(tmp,row.path),bytes);fs.writeFileSync(path.join(tmp,'data/catalog.json'),json(catalog));fs.writeFileSync(path.join(tmp,'.nojekyll'),'');
 fs.renameSync(tmp,out);
}finally{if(fs.existsSync(tmp))fs.rmSync(tmp,{recursive:true,force:true});}
console.log(`Prévisualisation locale créée : ${out} · ${nodes.length} nœuds / ${edges.length} relations · NON PUBLIÉE`);
