"""Browser acceptance for source-only labels: label and alias search, inspector, source link."""
import argparse,json,sys
from pathlib import Path
from urllib.parse import urlencode,urlsplit
from playwright.sync_api import sync_playwright,expect
LANGS=['fr','en','es','it','fi','de']
def run(url,samples):
 results=[]
 with sync_playwright() as pw:
  browser=None
  for opts in ({},{'channel':'msedge'},{'channel':'chrome'}):
   try:browser=pw.chromium.launch(headless=True,**opts);break
   except Exception:pass
  if not browser:raise RuntimeError('Browser unavailable')
  try:
   with browser.new_context(service_workers='block',viewport={'width':1440,'height':1000}) as ctx:
    ctx.route('**/*',lambda route:route.continue_() if urlsplit(route.request.url).netloc==urlsplit(url).netloc else route.abort())
    for lang in LANGS:
     choices=[x for x in samples if x['locale']==lang and x.get('alias')];choices.sort(key=lambda x:(x['slug']!='zoology',x['slug']))
     if not choices:results.append({'locale':lang,'status':'NO_ALIAS_SAMPLE'});continue
     s=choices[0];page=ctx.new_page();errors=[];page.on('pageerror',lambda err:errors.append(str(err)[:300]));r={'locale':lang,'slug':s['slug'],'status':'REVIEW','labelSearch':False,'aliasSearch':False,'inspector':False}
     try:
      page.goto(url+'?'+urlencode({'ui':lang,'k':s['slug'],'r':s['revision'],'lens':'registry','lang':lang}),wait_until='domcontentloaded',timeout=30000)
      expect(page.locator('#localization')).to_have_value(lang,timeout=20000)
      page.wait_for_function("document.querySelector('#localization-status')?.textContent.includes(' — ')",timeout=20000)
      selector='.ml-search-results .record[data-source-node-id="'+s['node']+'"]'
      for field,term in [('labelSearch',s['label']),('aliasSearch',s['alias'])]:
       page.locator('#search').fill(term);expect(page.locator(selector+' strong').first).to_have_text(s['label'],timeout=15000);r[field]=True
      page.locator(selector).first.click();expect(page.locator('#inspection h3').first).to_have_text(s['label'],timeout=15000);expect(page.locator('#inspection a[data-lexical-source="wikidata"]')).to_be_visible();r['inspector']=True
      r['status']='PASS' if not errors else 'REVIEW'
     except Exception as e:r['error']=str(e)[:800]
     finally:r['runtimeErrors']=errors;page.close()
     results.append(r);print('PUBLIC SOURCE',lang,r['status'],flush=True)
  finally:browser.close()
 return results
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--url',required=True);p.add_argument('--samples',required=True);p.add_argument('--out',required=True);a=p.parse_args();report=run(a.url,json.loads(Path(a.samples).read_text(encoding='utf-8')));Path(a.out).write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8');sys.exit(0 if len(report)==6 and all(x['status']=='PASS' for x in report) else 2)
