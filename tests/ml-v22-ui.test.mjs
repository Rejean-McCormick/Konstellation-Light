import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PRIORITY_LANGUAGES,uiText,uiFormat,messageKeys,localizedTitle,searchProfile} from '../light/src/ui-languages.mjs';
const app=fs.readFileSync(new URL('../light/src/app.js',import.meta.url),'utf8');
test('6 locales cover all explicit messages and static UI call sites',()=>{
 assert.equal(PRIORITY_LANGUAGES.length,6);
 for(const k of messageKeys())for(const l of PRIORITY_LANGUAGES)assert.ok(uiText(l,k)?.trim(),`${l}/${k}`);
 for(const [,k] of app.matchAll(/\bt\('([^']+)'\)/g))for(const l of PRIORITY_LANGUAGES)assert.ok(uiText(l,k));
 for(const l of PRIORITY_LANGUAGES)assert.equal(searchProfile(l)[0],l);
});
test('domain titles are presentation only; unknown translations retain original',()=>{
 assert.equal(localizedTitle('es','accounting','Accounting','Comptabilité'),'Contabilidad');
 assert.equal(localizedTitle('en','accounting','Accounting','Comptabilité'),'Accounting');
 assert.equal(localizedTitle('de','architecture','Architecture','Architecture'),'Architektur');
 assert.equal(localizedTitle('et','other','Source title','Titre français'),'Source title');
 assert.equal(localizedTitle('fr','other','Source title','Titre français'),'Titre français');
});
test('interface language and explicit original mode are separate URL choices',()=>{
 assert.match(app,/params\.get\('lang'\)==='original'\?null/);
 assert.match(app,/state\.requestedLocale==='auto'\)p\.delete\('lang'\)/);
 assert.match(app,/tags\.includes\(activeUi\)\?activeUi:null/);
 assert.match(app,/validateLocalization\(doc,bundle\)/);
});

test('observed counters and trace labels are localized without changing counts',()=>{
 for(const l of PRIORITY_LANGUAGES){
  for(const [k,values] of [['mapDocSummary',{a:4,b:3}],['mapGraphSummary',{a:3,b:7,c:12}],['registryGraphSummary',{a:25,b:2,c:9}],['countDocs',{a:33}],['countGraph',{a:25}]]){
   const msg=uiFormat(l,k,values);assert.ok(!msg.includes('{'));for(const n of Object.values(values))assert.ok(msg.includes(String(n)));
  }
 }
 for(const k of ['traceHint','integritySummary','registryDocSummary','countDocs','countGraph','mapGraphSummary'])assert.notEqual(uiText('en',k),uiText('fr',k));
 for(const [,k] of app.matchAll(/\bfmt\('([^']+)'/g))assert.ok(uiText('en',k));
});

// Exercise the actual renderer with a small DOM double, not merely its message keys.
import vm from 'node:vm';
test('Discover renders real topic links and documents in all 6 languages',()=>{
 const start=app.indexOf('function drawDiscover(target){');
 const end=app.indexOf('\nfunction ',start+1);
 assert.ok(start>=0 && end>start);
 const code=app.slice(start,end);
 const node=(tag,cls='',text='')=>({tag,cls,text,children:[],dataset:{},append(...xs){this.children.push(...xs);}});
 const walk=n=>[n,...n.children.flatMap(walk)];
 for(const lang of PRIORITY_LANGUAGES){
  const target=node('root'), truncation={};
  const context={state:{bundle:{slug:'accounting',title:'Source',nodes:[],reading:{intro:'Original',overview_path:'README.md',topics:[{title:'Topic original',detail:'Detail original',section:'Section',line:2}],documents:[{title:'Document original',excerpt:'Excerpt original',sections:[{title:'Section original',line:3}],path:'README.md',heading_line:1}]}},query:''},element:node,t:k=>uiText(lang,k),displayKristalTitle:()=> 'Title',sourceAnchor:(text,path,line)=>({...node('a','source',text),path,line}),drawGuidedReading:()=>{},isKnowledge:()=>false,actionButton:label=>node('button','',label),$:()=>truncation,target};
  vm.runInNewContext(code+'\ndrawDiscover(target);',context);
  const nodes=walk(target);assert.ok(nodes.some(n=>n.cls==='v20-intro'));assert.ok(nodes.some(n=>n.cls==='v20-topic'));assert.ok(nodes.some(n=>n.cls==='v20-document'));
  assert.ok(nodes.some(n=>n.tag==='a'&&n.line===2&&n.text===uiText(lang,'sourceLink')));
  assert.ok(nodes.some(n=>n.text==='Topic original'));assert.match(truncation.textContent,/1\/1/);
 }
});
