"""Read-only local browser audit of the running Konstellation Light preview."""
import argparse, hashlib, json, re, tempfile, zipfile
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlsplit, parse_qs, urlencode
from urllib.request import urlopen

LANGS='fr en es it fi de'.split()
FIELDS=['#title','#subtitle','#panel-title','#panel-hint','#view-tag','#count','#truncation','#localization-status','#metric-members-label','#metric-relations-label','[data-ui="about"]','[data-ui="brand"]','#search-language-summary']
CONTEXT=['k','r','lens','focus','n','q','lang']
FRENCH=['Découvrir ce Kristal','Vue d’ensemble','Vue d\'ensemble','À propos','Lien déclaré','Document public répertorié','Aucun voisin affichable','Carte des liens','Documents répertoriés','LECTURE SOURCÉE','Vérification des données','Explorez visuellement','Affichage progressif','Repères réellement cités dans la présentation']

def params(url):
    return {k:v[0] for k,v in parse_qs(urlsplit(url).query,keep_blank_values=True).items()}

def main():
    p=argparse.ArgumentParser(); p.add_argument('--url',default='http://127.0.0.1:4177/');p.add_argument('--out',required=True);p.add_argument('--chromium');args=p.parse_args()
    base=args.url.rstrip('/')+'/'; u=urlsplit(base)
    if u.scheme!='http' or u.hostname not in ('127.0.0.1','localhost') or u.username or u.password or u.query or u.fragment: p.error('Use a local HTTP preview only')
    output=Path(args.out); output.mkdir(parents=True,exist_ok=True)
    stamp=datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S_%f'); folder=Path(tempfile.mkdtemp(prefix='LIGHT_ML_'+stamp+'_'))
    report={'format':'light-local-language-audit/1','utc':stamp,'url':base,'status':'BLOCKED','publicationAuthorized':False,'runs':[],'errors':[],'missingLocales':[],'scope':'visible UI samples; unchanged text is a review candidate, not proof of untranslated text; source text excluded from strict UI checks'}
    browser=None
    try:
        def get(rel):
            with urlopen(base+rel,timeout=10) as f: return f.read()
        catalog=json.loads(get('data/catalog.json')); entries=catalog['entries']; report['catalogEntries']=len(entries);report['localizedEntries']=sum(bool(e.get('localizations')) for e in entries)
        report['coverage']={l:{'graphs':0,'labels':0,'relations':0,'aliases':0,'definitions':0} for l in LANGS}
        report['publicGraphCount']=0; report['projectedNodes']=0; report['projectedRelations']=0; report['coverageByKristal']=[]
        for e in entries:
            bundle=json.loads(get(e['path'])); is_graph=bundle.get('view_kind')=='derived-public-knowledge'
            if not is_graph: continue
            n=sum(x.get('kind')=='notion' for x in bundle.get('nodes',[])); p=len(set(x['relation'] for x in bundle.get('edges',[])))
            report['publicGraphCount']+=1; report['projectedNodes']+=n; report['projectedRelations']+=p
            row={'slug':e['slug'],'nodes':n,'relations':p,'locales':{}}
            for l in LANGS:
                d=e.get('localizations',{}).get(l); doc=json.loads(get(d['path'])) if d else {'entries':[]}
                a={'graphs':int(bool(d)),'labels':sum(bool(x.get('label')) for x in doc['entries']),'relations':len(doc.get('relations',[])),'aliases':sum(len(x.get('aliases',[])) for x in doc['entries']),'definitions':sum(bool(x.get('definition')) for x in doc['entries'])}
                row['locales'][l]=a
                for k,v in a.items(): report['coverage'][l][k]+=v
            report['coverageByKristal'].append(row)
        report['assetSha256']={}
        for rel in ('index.html','app.js','ui-languages.mjs','data/catalog.json'):
            try: report['assetSha256'][rel]=hashlib.sha256(get(rel)).hexdigest()
            except Exception: report['assetSha256'][rel]=None
        from playwright.sync_api import sync_playwright, expect
        with sync_playwright() as pw:
            for opts in ([{'executable_path':args.chromium}] if args.chromium else [{},{'channel':'msedge'},{'channel':'chrome'}]):
                try: browser=pw.chromium.launch(headless=True,**opts);report['browser']=browser.version;report['browserChannel']=opts.get('channel','playwright chromium');break
                except Exception as e: report.setdefault('launchAttempts',[]).append(str(e)[:500])
            if browser is None: raise RuntimeError('No Playwright Chromium, Edge or Chrome available')
            ctx=browser.new_context(viewport={'width':1440,'height':1000},locale='fr-CA',service_workers='block')
            try:
                for slug in ('accounting','architecture'):
                    if slug not in {e['slug'] for e in entries}: report['errors'].append('Missing slug '+slug);continue
                    for lens in ('discover','constellation','registry','trace'):
                        page=ctx.new_page();page.set_default_timeout(12000);errs=[];page.on('pageerror',lambda e:errs.append(str(e)[:500]));base_values=None
                        try:
                            page.goto(base+'?'+urlencode({'k':slug,'ui':'fr','lens':lens,'n':6}),wait_until='domcontentloaded')
                            def ready(tag):
                                expect(page.locator('html')).to_have_attribute('lang',tag)
                                expect(page.locator('#collection')).to_have_value(slug)
                                page.wait_for_function("""() => document.querySelector('#visual')?.children.length > 0 && !document.querySelector('#visual .loading') && document.querySelector('#metric-members')?.textContent.trim() !== '—' && document.querySelector('#panel-title')?.textContent.trim()""")
                            ready('fr')
                            expect(page.locator('.brand-logo')).to_be_visible()
                            page.wait_for_function("() => {const i=document.querySelector('.brand-logo'); return i?.complete && i.naturalWidth>0}")
                            available=page.locator('#ui-language option').evaluate_all('(xs)=>xs.map(x=>x.value)');report['availableLocales']=available;report['missingLocales']=[x for x in LANGS if x not in available]; report['unexpectedLocales']=[x for x in available if x not in LANGS]
                            actual_lens=params(page.url).get('lens')
                            if actual_lens!=lens:
                                report['runs'].append({'slug':slug,'lens':lens,'status':'VIEW_NOT_AVAILABLE_OR_REDIRECTED','actualLens':actual_lens});continue
                            original=params(page.url)
                            for tag in ['fr']+[x for x in LANGS if x!='fr' and x in available]:
                                try:
                                    if tag!='fr': page.locator('#ui-language').select_option(tag);ready(tag)
                                    current=params(page.url);fields={s:page.locator(s).first.inner_text().strip() for s in FIELDS if page.locator(s).count() and page.locator(s).first.is_visible()}
                                    if tag=='fr':base_values=fields.copy()
                                    unchanged=[s for s,v in fields.items() if tag!='fr' and v and v==(base_values or {}).get(s)]
                                    mismatches={k:{'before':original.get(k),'after':current.get(k)} for k in CONTEXT if original.get(k)!=current.get(k)}
                                    # Only fixed UI fields, not original titles/documents/concepts.
                                    french=[{'selector':s,'text':v} for s,v in fields.items() if tag!='fr' and s!='#title' and any(t.casefold() in v.casefold() for t in FRENCH)]
                                    visual=page.locator('#visual')
                                    if tag!='fr' and lens=='discover':
                                        for heading in visual.locator('.v20-section > h3').all_inner_texts():
                                            if 'Repères réellement cités' in heading: french.append({'selector':'discover section heading','text':heading})
                                    failure=visual.locator('[data-reader-failure], .empty').all_inner_texts()
                                    render_errors=[x for x in failure if re.search(r'Lecture interrompue|not a function|Reading interrupted',x,re.I)]
                                    if visual.locator('[data-reader-failure]').count(): render_errors.append('Reader failure marker present')
                                    if lens=='discover' and (not visual.locator('.v20-intro').count() or not visual.locator('.v20-document').count()): render_errors.append('Discover content missing')
                                    row={'slug':slug,'lens':lens,'ui':tag,'status':'REVIEW' if french or mismatches or render_errors or errs else 'OBSERVED','fields':fields,'unchangedFromFrench':unchanged,'frenchUiCandidates':french,'contextDifferences':mismatches,'runtimeErrors':errs.copy(),'renderErrors':render_errors};report['runs'].append(row)
                                    if tag in ('fr','en','es') and lens in ('discover','constellation'):
                                        page.screenshot(path=str(folder/f'{slug}-{lens}-{tag}.png'),full_page=False)
                                    print(slug,lens,tag,row['status'],flush=True)
                                except Exception as e:report['errors'].append({'slug':slug,'lens':lens,'ui':tag,'error':str(e)[:1000]});break
                        except Exception as e:report['errors'].append({'slug':slug,'lens':lens,'error':str(e)[:1000]})
                        finally:page.close()
            finally:ctx.close();browser.close()
        report['status']='BLOCKED' if not any('ui' in x for x in report['runs']) else 'REVIEW' if report['errors'] or report['missingLocales'] or report.get('unexpectedLocales') or len(report['runs'])!=48 or any(x['status']!='OBSERVED' or x.get('runtimeErrors') or x.get('renderErrors') for x in report['runs']) else 'SAMPLE_OBSERVED'
    except Exception as e:report['errors'].append(str(e)[:1500])
    finally:
        (folder/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
        archive=output/('LIGHT_LANGUES_'+stamp+'.zip')
        with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as z:
            for f in sorted(folder.iterdir()):z.write(f,f.name)
        print('STATUS:',report['status']);print('REPORT:',archive)
    return 1 if report['status']=='BLOCKED' else 2 if report['status']=='REVIEW' else 0

if __name__=='__main__':raise SystemExit(main())
