#!/usr/bin/env node
// Optional, reviewable adapter from one *specific* Ekole autonomous encyclopedia
// into Konstellation Light's LOCAL candidate curation. No automatic publication.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
const args={};for(let i=2;i<process.argv.length;i+=2){if(!process.argv[i]?.startsWith('--')||!process.argv[i+1])throw Error('Arguments invalides.');args[process.argv[i].slice(2)]=process.argv[i+1];}
if(args.local!=='YES'||!args.kristal||!args.out)throw Error('Utiliser --kristal FICHIER --out FICHIER --local YES.');
const input=path.resolve(args.kristal),output=path.resolve(args.out);
if(fs.existsSync(output))throw Error('Le fichier de projection existe déjà; ne pas écraser une revue manuelle.');
const b=fs.readFileSync(input);
if(b.length>6*1024*1024)throw Error('Kristal trop volumineux.');
const raw=JSON.parse(b),p=raw.payload||raw;
if(p.format!=='kristal.encyclopedie-societes/4.0'||p.slug!=='societes-autochtones-quebec'||!Array.isArray(p.articles)||!Array.isArray(p.themes)||!Array.isArray(p.sources))throw Error('Format du Kristal autonome v4 non reconnu.');
const safe=x=>typeof x==='string'&&/^[a-z0-9][a-z0-9._:-]{0,119}$/i.test(x);
const nodes=[],edges=[],nodeIds=new Set(),edgeKeys=new Set();
function node(n){if(!safe(n.id)||nodeIds.has(n.id))throw Error('Identifiant dupliqué ou non sûr : '+n.id);nodeIds.add(n.id);nodes.push(n);}
function edge(a,b,r){if(!nodeIds.has(a)||!nodeIds.has(b))return;const k=`${a}|${b}|${r}`;if(edgeKeys.has(k))return;edgeKeys.add(k);edges.push({from:a,to:b,relation:r});}
node({id:'racine',kind:'notion',label:'Sociétés autochtones du Québec',description:'Navigation candidate issue du Kristal autonome; contenu encore soumis à une revue documentaire, culturelle et pédagogique.'});
for(const t of p.themes){if(!safe(t.id)||typeof t.titre!=='string')throw Error('Thème invalide');node({id:'theme:'+t.id,kind:'notion',label:t.titre.slice(0,220),description:'Chapitre thématique du Kristal autonome, non un résumé d’une nation entière.'});}
for(const s of p.sources){if(!safe(s.id)||typeof s.titre!=='string')throw Error('Source invalide');node({id:'source:'+s.id,kind:'source',label:s.titre.slice(0,220),description:('Référence documentaire déclarée. '+(s.ancrage||'')).slice(0,1500)});}
for(const a of p.articles){if(!safe(a.id)||!safe(a.theme)||typeof a.question!=='string'||typeof a.reponse_courte!=='string')throw Error('Fiche invalide');
 node({id:a.id,kind:'notion',label:a.question.slice(0,220),description:a.reponse_courte.slice(0,1500),...(a.epoque?{period:String(a.epoque)}:{})});}
for(const t of p.themes)edge('racine','theme:'+t.id,'comprend_theme');
for(const a of p.articles){edge('theme:'+a.theme,a.id,'contient_connaissance');
 for(const link of a.prerequis||[])if(safe(link))edge(a.id,link,'prerequis_pedagogique');
 for(const l of a.liens_semantiques||[])if(safe(l.cible)&&safe(l.relation))edge(a.id,l.cible,l.relation);
 for(const ref of a.sources||[])if(safe(ref.id))edge(a.id,'source:'+ref.id,'cite_source');
}
const d={format:'konstellation.semantic-curation/1.0',visibility:'local-preview',slug:'societes-autochtones-quebec-candidat',title:'Sociétés autochtones — lecture locale candidate',
 nodes,edges};
fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(d,null,2)+'\n');
console.log(`${nodes.length} nœuds et ${edges.length} relations · source SHA256 ${createHash('sha256').update(b).digest('hex')} · À RÉVISER AVANT DIFFUSION`);
