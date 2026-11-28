import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';
import {prepare} from './prepare-reviewed-localizations.mjs';
import {PRIORITY_LANGUAGES} from '../light/src/ui-languages.mjs';
const [collection,handoff,out,expected]=process.argv.slice(2);
if(!collection||!handoff||!out||!/^sha256:[a-f0-9]{64}$/.test(expected||''))throw Error('Usage: prepare-ml6-handoff.mjs COLLECTION HANDOFF OUTPUT sha256:...');
const f=path.join(handoff,'manifest.json');if(!fs.lstatSync(f).isFile()||fs.lstatSync(f).isSymbolicLink()||fs.statSync(f).size>2*1024*1024)throw Error('Invalid manifest file');
const bytes=fs.readFileSync(f);if('sha256:'+createHash('sha256').update(bytes).digest('hex')!==expected)throw Error('Manifest digest mismatch');
const manifest=JSON.parse(bytes);if(!Array.isArray(manifest.items)||!manifest.items.length||manifest.items.some(x=>!PRIORITY_LANGUAGES.includes(x.locale)))throw Error('Only the six priority languages are admitted to this path');
console.log(JSON.stringify(prepare(path.resolve(collection),path.resolve(handoff),path.resolve(out),expected).items.map(x=>({slug:x.slug,locale:x.locale,nodes:x.nodes,relations:x.relations,aliases:x.aliases_exported,definitions:x.definitions}))));
