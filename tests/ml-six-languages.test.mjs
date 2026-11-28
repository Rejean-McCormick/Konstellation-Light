import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PRIORITY_LANGUAGES,priorityLocale,searchProfile,eligibleDescriptors,initialUi,uiText,translateShell} from '../light/src/ui-languages.mjs';
import {selectedDescriptors,loadSearchResources} from '../light/src/multilingual-read.mjs';
test('Six exact locales; default UI + English; no implicit variants or other languages',()=>{
 assert.deepEqual(PRIORITY_LANGUAGES,['fr','en','es','it','fi','de']);
 for(const tag of PRIORITY_LANGUAGES)assert.deepEqual(searchProfile(tag),tag==='en'?['en']:[tag,'en']);
 assert.deepEqual(searchProfile('de',['fr','es','it','fi','nl','fr-CA','EN','DE','und']),['de','en','fr','es','it','fi']);
 for(const tag of ['fr-CA','ru','und','en-US','bad tag',null])assert.equal(priorityLocale(tag),null);
 assert.equal(initialUi('pt','fi'),'fi');assert.equal(initialUi('IT','fr'),'it');assert.equal(initialUi(null,'pt'),'fr');
});
test('300 catalog entries: six allowed, only explicit selections fetched; duplicate normalized tags fail closed',async()=>{
 const descriptors=Object.fromEntries(Array.from({length:294},(_,i)=>['qaa-x-'+i,{i}]));for(const tag of PRIORITY_LANGUAGES)descriptors[tag]={tag};
 assert.equal(Object.keys(eligibleDescriptors(descriptors)).length,6);assert.equal(Object.keys(descriptors).length,300);
 const calls=[];await loadSearchResources(searchProfile('fi',['es','qaa-x-1']),eligibleDescriptors(descriptors),async r=>{calls.push(r.tag);return {entries:[]};});
 assert.deepEqual(calls,['fi','en','es']);assert.deepEqual(selectedDescriptors(['fr'],eligibleDescriptors({'fr-CA':{}})),[]);
 assert.throws(()=>selectedDescriptors(['fr'],eligibleDescriptors({fr:{},FR:{}})),/ambiguës/);
});
test('Every explicit shell message exists for all six locales; source text and input controls stay untouched',()=>{
 const html=fs.readFileSync(new URL('../light/src/index.html',import.meta.url),'utf8');const keys=[...html.matchAll(/data-ui(?:-tail|-placeholder|-aria)?="([^"]+)"/g)].map(x=>x[1]);
 assert(keys.length>=30);for(const tag of PRIORITY_LANGUAGES)for(const key of keys)assert.ok(uiText(tag,key).trim());
 assert.throws(()=>uiText('fr','nonexistent'));
 const title={dataset:{ui:'ui'},textContent:'old'};const checkbox={checked:true};const tail={textContent:'old'};const label={dataset:{uiTail:'original'},lastChild:tail,firstChild:checkbox};const input={dataset:{uiPlaceholder:'search'},setAttribute(k,v){this[k]=v;}};const source={textContent:'Original source'};
 translateShell({querySelectorAll:s=>({'[data-ui]':[title],'[data-ui-tail]':[label],'[data-ui-placeholder]':[input],'[data-ui-aria]':[]})[s]},'de');
 assert.equal(title.textContent,'Sprache der Oberfläche');assert.equal(label.firstChild,checkbox);assert.equal(checkbox.checked,true);assert.equal(tail.textContent,' '+uiText('de','original'));assert.equal(input.placeholder,uiText('de','search'));assert.equal(source.textContent,'Original source');
});
