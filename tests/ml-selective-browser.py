"""Optional Chromium integration test. Requires Python Playwright and Chromium.
Uses synthetic v10 fixture and browser request interception, no live server or internet.
Run from repository root: python tests/ml-selective-browser.py [--chromium PATH]
"""
import argparse
import json
import mimetypes
import subprocess
import tempfile
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright, expect

ROOT=Path(__file__).resolve().parents[1]
FIXTURE_JS=r'''
import fs from 'node:fs';import path from 'node:path';import {spawnSync} from 'node:child_process';import {fixture} from './tests/helpers/light-fixture.mjs';
const d=process.argv[1],collection=path.join(d,'collection'),site=path.join(d,'site'),lang=path.join(d,'langs/example');
fs.mkdirSync(collection);fixture(collection);fs.mkdirSync(lang,{recursive:true});
const build=(...extra)=>{const r=spawnSync(process.execPath,['scripts/build-light.mjs','--collection',collection,'--out',site,'--public','YES',...extra],{encoding:'utf8'});if(r.status!==0)throw Error(r.stderr);};build();
const c=JSON.parse(fs.readFileSync(path.join(site,'data/catalog.json')));const base=JSON.parse(fs.readFileSync(path.join(site,c.entries[0].path)));const [a,b]=base.nodes.filter(n=>n.kind==='hosted_file');
const tags=['fr','en','de',...Array.from({length:297},(_,i)=>'qaa-x-'+i)];
for(const locale of tags){const entries=[{node_id:a.id,label:locale==='de'?'Zelle':locale==='fr'||locale==='en'?'Cell':'Synthetic '+locale}];if(locale==='en')entries.push({node_id:b.id,label:'Cell'});const doc={format:'konstellation.multilingual-read/1.0',authority:'derived_non_authoritative',slug:base.slug,state_ref:base.state_ref,surface_digest:base.surface_digest,locale,entries:entries.map(x=>({...x,provenance:{provider:'editorial',source_refs:[],review_status:'reviewed',review_ref:'test-only-not-real-review'}}))};fs.writeFileSync(path.join(lang,locale+'.json'),JSON.stringify(doc));}
build('--localizations',path.join(d,'langs'));
'''

def main():
    parser=argparse.ArgumentParser(); parser.add_argument('--chromium'); args=parser.parse_args()
    with tempfile.TemporaryDirectory(prefix='ml-browser-') as tmp:
        subprocess.run(['node','--input-type=module','-e',FIXTURE_JS,tmp],cwd=ROOT,check=True)
        site=Path(tmp)/'site'; c=json.loads((site/'data/catalog.json').read_text()); entry=c['entries'][0]
        lang_paths={'/'+v['path']:k for k,v in entry['localizations'].items()}; requests=[]; errors=[]
        with sync_playwright() as pw:
            browser=pw.chromium.launch(executable_path=args.chromium,args=['--no-sandbox'])
            context=browser.new_context(service_workers='block'); page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
            def route(r):
                u=urlparse(r.request.url); rel=u.path.lstrip('/') or 'index.html'; f=(site/rel).resolve()
                if u.netloc!='localhost:8765' or site not in f.parents or not f.is_file(): return r.abort()
                if u.path in lang_paths: requests.append(lang_paths[u.path])
                mime='text/javascript' if f.suffix in ('.js','.mjs') else mimetypes.guess_type(f.name)[0] or 'application/octet-stream'
                r.fulfill(status=200,body=f.read_bytes(),content_type=mime)
            context.route('**/*',route)
            page.goto('http://localhost:8765/')
            expect(page.locator('#search-language-status')).to_contain_text('Seules les ressources')
            assert requests==['fr'],requests # automatic display pack only; search stays selective
            assert page.locator('#ui-language option').count()==6
            assert page.locator('#localization option').count()==5
            assert page.locator('#search-language-add option').count()==2
            page.locator('#search').fill('cell'); expect(page.locator('.ml-search-results .record')).to_have_count(2)
            assert set(requests)=={'fr','en'},requests
            expect(page.locator('.ml-search-results .record').first).to_contain_text('fr')
            expect(page.locator('.ml-search-results .record').first).to_contain_text('en')
            page.locator('#localization').select_option('de'); expect(page.locator('#localization-status')).to_contain_text('Texte révisé')
            assert set(requests)=={'fr','en','de'},requests
            page.locator('#search').fill('Zelle');expect(page.locator('#visual')).to_contain_text('Aucun résultat')
            page.locator('#search-language-summary').click();page.locator('#search-language-add').select_option('de');expect(page.locator('.ml-search-results .record')).to_have_count(1)
            expect(page.locator('.ml-search-results .record')).to_contain_text('Zelle')
            page.reload();expect(page.locator('.ml-search-results .record')).to_have_count(1)
            page.locator('#search-language-summary').click();page.locator('#search-language-extras button').click();expect(page.locator('#visual')).to_contain_text('Aucun résultat')
            assert not (set(requests)-{'fr','en','de'}),requests
            page.locator('#ui-language').select_option('de')
            expect(page.locator('html')).to_have_attribute('lang','de')
            expect(page.locator('#search-language-summary')).to_contain_text('Suchsprachen')
            expect(page.locator('.ml-search-results .record')).to_have_count(1)
            expect(page.locator('#search-language-summary')).to_contain_text('Deutsch')
            assert page.locator('#localization option').count()==5
            assert not (set(requests)-{'fr','en','de'}),requests
            assert not errors,errors
            print('PASS: Chromium — 300 descriptors; default FR+EN only; DE display independent; add/remove; persistence; deduplication; homonyms; no unselected requests.')
            print('Requested locales:',requests)
            browser.close()
if __name__=='__main__':main()
