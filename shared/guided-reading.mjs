// V21: curated source passages for the Konstellation guided visit.
// This module projects only literal excerpts from SHA-verified README.md files.
// It does not create graph nodes, claims, translations or semantic authority.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

export const GUIDED_SOURCE = Object.freeze({
  repository:'https://github.com/Rejean-McCormick/kristal-public',
  commit:'538b4d559f6c7cdd022283f5a21ef728b332c52a',
});

export const GUIDED_SCENES = Object.freeze([
  {scene:3, slug:'craft', line:5, title:'Matière, outil, geste, opération, objet', quote:'matière → outil → geste → opération → objet'},
  {scene:4, slug:'craft', line:11, title:'Le geste et l’opération', quote:'Un geste est une action corporelle contrôlée; une opération est une transformation délimitée.'},
  {scene:5, slug:'craft', line:32, title:'La finition ne suffit pas', quote:'finition ≠ état « fini »'},
  {scene:6, slug:'accounting', line:5, title:'Le chemin de la comptabilité', quote:'événement économique → écriture → compte → période → état financier'},
  {scene:7, slug:'accounting', line:26, title:'Écriture et trésorerie', quote:'journal_entry != cash_flow', explanation:'Une écriture comptable n’est pas nécessairement un flux de trésorerie. Reformulation pédagogique, non citation.'},
  {scene:8, slug:'accounting', line:28, title:'Grand livre et état financier', quote:'ledger_account != financial_statement_line_item', explanation:'Un compte du grand livre ne se confond pas avec une ligne d’état financier. Reformulation pédagogique, non citation.'},
  {scene:9, slug:'biology', line:5, title:'Les échelles du vivant', quote:'cellule → tissu → organisme → population'},
  {scene:10, slug:'biology', line:16, title:'Division et reproduction', quote:'division cellulaire ≠ reproduction de l\'organisme'},
  {scene:11, slug:'biology', line:17, title:'Sélection et évolution', quote:'sélection naturelle ≠ évolution'},
  {scene:12, slug:'anthropology', line:5, title:'Comparer sans essentialiser', quote:'Kristal-Anthropology représente des systèmes culturels comparables sans les réduire à des essences.'},
  {scene:13, slug:'anthropology', line:17, title:'L’observation dépend du contexte', quote:'observé_dans(X, contexte) n’implique jamais essentiel_à(X).'},
  {scene:14, slug:'anthropology', line:5, title:'Quatre repères', quote:'Chaque assertion est attachée à une population, un lieu, une portée temporelle et une source.'},
  {scene:15, slug:'bible', line:9, title:'Six plans pour lire le corpus biblique', quote:'Témoins source — WLC hébreu/araméen, LXX grecque, NT grec historique;', related:[
    {line:10,text:'Corpus — œuvres et localisateurs;'},
    {line:11,text:'Observations textuelles — descriptions proches des passages;'},
    {line:12,text:'Modèles humains — mécanismes, dynamiques, émotions, désir, pouvoir, transformations;'},
    {line:13,text:'Polyphonie — voix, tensions, contre-modèles et stress-tests;'},
    {line:14,text:'Herméneutique — lectures symboliques/spirituelles explicitement marquées.'}
  ]},
  {scene:16, slug:'bible', line:16, title:'Référent, assertion, preuve et projection', quote:'référent → assertion → preuve/provenance → projection'},
  {scene:17, slug:'bible', line:55, title:'Texte et interprétation', quote:'passage ≠ interprétation'},
  {scene:19, slug:'bible', line:61, title:'Sens et navigation', quote:'connexion sémantique ≠ affinité de navigation'},
]);

export const guidedSceneId = scene => `lecture-scene-${String(scene).padStart(2,'0')}`;

export function textFromMarkdownLine(line){
  return String(line).replace(/^\s*(?:[-*+]\s+|\d+\.\s+)/,'')
    .replace(/\*\*|__|`/g,'')
    .replace(/\s+/g,' ').trim();
}

function validatedReadme(checked, collection){
  const f=checked.files.find(f=>f.path==='README.md');
  if(!f || f.size>96*1024 || f.size<1 || !/^sha256:[a-f0-9]{64}$/.test(f.sha256))
    throw Error(`README vérifié requis pour ${checked.slug}.`);
  const file=path.join(collection,'kristals',checked.slug,'README.md');
  if(fs.lstatSync(file).isSymbolicLink() || !fs.statSync(file).isFile())
    throw Error('README source non régulier.');
  const bytes=fs.readFileSync(file);
  if(bytes.length!==f.size || `sha256:${createHash('sha256').update(bytes).digest('hex')}`!==f.sha256)
    throw Error(`README source modifié : ${checked.slug}.`);
  const lines=new TextDecoder('utf-8',{fatal:true}).decode(bytes)
    .replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n').split('\n');
  return {lines,sha256:f.sha256};
}

export function projectGuidedReading(checked,collection,{repository='',commit=''}={}){
  if(repository!==GUIDED_SOURCE.repository || commit!==GUIDED_SOURCE.commit)return null;
  const relevant=GUIDED_SCENES.filter(row=>row.slug===checked.slug);
  if(!relevant.length)return null;
  const {lines,sha256}=validatedReadme(checked,collection);
  const passages=relevant.map(row=>{
    const line=lines[row.line-1];
    if(typeof line!=='string' || !textFromMarkdownLine(line).includes(row.quote))
      throw Error(`Lecture ${guidedSceneId(row.scene)} introuvable à ${checked.slug}/README.md:${row.line}. `+
        'Le contenu du README n’est pas celui du plan épinglé.');
    const related=(row.related||[]).map(part=>{
      const raw=lines[part.line-1];
      if(typeof raw!=='string' || !textFromMarkdownLine(raw).includes(part.text))
        throw Error(`Lecture ${guidedSceneId(row.scene)} : rubrique introuvable à ${checked.slug}/README.md:${part.line}.`);
      return {line:part.line,text:part.text};
    });
    return {id:guidedSceneId(row.scene),scene:row.scene,title:row.title,text:row.quote,
      ...(related.length?{related}:{}),
      ...(row.explanation?{explanation:row.explanation}:{}),
      source_path:'README.md',line:row.line,sha256};
  });
  return {format:'konstellation.light-guided-reading/1.0',
    status:'verbatim-source-unqualified',semantic_assertions_created:0,
    source_commit:GUIDED_SOURCE.commit,passages};
}
