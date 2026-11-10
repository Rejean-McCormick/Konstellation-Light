#!/usr/bin/env python3
"""Build an isolated, local-only visual preview of existing, UNREVIEWED definitions.

No dependency on Ollama or network; does not mutate repositories, canonical Kristals,
or the existing 126-Kristal preview. Per-Kristal failures are quarantined.
"""
from __future__ import annotations
import argparse
import datetime as dt
import hashlib
import http.server
import json
import mimetypes
import os
from pathlib import Path
import re
import shutil
import sys
import tempfile
import webbrowser
import zipfile
from collections import Counter, defaultdict

ROOT = Path(__file__).resolve().parent
DATA = ROOT / 'lots'
AUDIT = ROOT / 'validation' / 'REVISION_PRIORITAIRE.jsonl'
SHA = re.compile(r'^sha256:[a-f0-9]{64}$')
PACK_PATH = re.compile(r'^data/pack-([a-f0-9]{64})\.json$')
VALID_SLUG = re.compile(r'^[a-z0-9][a-z0-9-]{0,99}$')
FORMAT = 'konstellation.candidate-visual/1.0'
SOURCE_FORMAT = 'konstellation.definition-candidate/1.0'


def digest(data: bytes) -> str:
    return 'sha256:' + hashlib.sha256(data).hexdigest()


def render_json(obj) -> bytes:
    return (json.dumps(obj, ensure_ascii=False, indent=2, sort_keys=True) + '\n').encode('utf-8')


def strict_json(data: bytes):
    return json.loads(data.decode('utf-8'))


def read_priorities(path=AUDIT):
    issues = {}
    if not path.is_file():
        return issues
    for raw in path.read_text('utf-8').splitlines():
        if not raw.strip():
            continue
        row = json.loads(raw)
        if row.get('slug') and row.get('assertion_id'):
            issues[(row['slug'], row['assertion_id'])] = [x for x in row.get('raisons', []) if isinstance(x, str)][:30]
    return issues


def read_site(source: Path):
    if not source.is_dir() or source.is_symlink():
        raise ValueError('Site Light source introuvable ou lien symbolique interdit : ' + str(source))
    catpath = source / 'data' / 'catalog.json'
    catalog = strict_json(catpath.read_bytes())
    if catalog.get('format') != 'konstellation.light-catalog/1.0' or not isinstance(catalog.get('entries'), list):
        raise ValueError('Catalogue Light absent ou format non reconnu.')
    good, bundles, quarantines = [], {}, []
    seen = set()
    for row in catalog['entries']:
        slug = row.get('slug') if isinstance(row, dict) else ''
        reason = None
        try:
            if not VALID_SLUG.fullmatch(str(slug)) or slug == 'pitheory-prime-bridge':
                raise ValueError('identité interdite ou invalide')
            key = (slug,row.get('revision'))
            if key in seen:
                raise ValueError('version répétée')
            seen.add(key)
            m = PACK_PATH.fullmatch(str(row.get('path')))
            if not m or row.get('sha256') != 'sha256:' + m.group(1):
                raise ValueError('chemin ou empreinte de bundle invalide')
            f = source / row['path']
            if f.is_symlink() or not f.is_file():
                raise ValueError('fichier de graphe absent ou lien symbolique')
            if f.stat().st_size > 8*1024*1024 or f.stat().st_size != row.get('bytes'):
                raise ValueError('taille du graphe incohérente')
            data = f.read_bytes()
            if digest(data) != row['sha256']:
                raise ValueError('empreinte SHA-256 du graphe incorrecte')
            bundle = strict_json(data)
            if bundle.get('format') != 'konstellation.light-navigation/1.0' or bundle.get('semantic_authority') is not False:
                raise ValueError('format de graphe non reconnu')
            for keyname in ('slug','revision','state_ref','surface_digest'):
                if bundle.get(keyname) != row.get(keyname):
                    raise ValueError('identité du graphe non concordante : ' + keyname)
            if not isinstance(bundle.get('nodes'),list) or not isinstance(bundle.get('edges'),list):
                raise ValueError('noeuds ou relations invalides')
            if len(bundle['nodes']) > 12000 or len(bundle['edges']) > 12000:
                raise ValueError('limites du lecteur dépassées')
            ids = [x.get('id') for x in bundle['nodes']]
            if len(set(ids)) != len(ids):
                raise ValueError('nœuds répétés')
            known = set(ids)
            for e in bundle['edges']:
                if e.get('from') not in known or e.get('to') not in known:
                    raise ValueError('relation vers un nœud absent')
            good.append(row)
            bundles[slug] = (row,bundle)
        except (OSError, KeyError, TypeError, ValueError, UnicodeError, json.JSONDecodeError) as ex:
            reason = str(ex)[:350]
        if reason is not None:
            quarantines.append({'slug':str(slug)[:100], 'revision':str(row.get('revision',''))[:100] if isinstance(row,dict) else '', 'kind':'graphe_illisible', 'reason':reason})
    if not good:
        raise ValueError('Aucun Kristal lisible dans le catalogue. Préservation du site actuel; rien publié.')
    catalog['entries'] = good
    return catalog, bundles, quarantines


def read_candidates(dirpath: Path, priorities: dict):
    """Verify signed-by-hash payload integrity; never mark editorial approval."""
    records = []
    reports = []
    warnings = []
    seen_ids = set()
    zips = sorted(dirpath.glob('A_DEPOSER_ICI_DEFINITIONS_EXISTANTES_*.zip'))
    for zip_path in zips:
        try:
            with zipfile.ZipFile(zip_path) as z:
                if set(z.namelist()) != {'CANDIDATS.jsonl','RAPPORT.json','EMPREINTES_SHA256.json'}:
                    raise ValueError('membres ZIP inattendus')
                raw = {name:z.read(name) for name in z.namelist()}
                checks = strict_json(raw['EMPREINTES_SHA256.json'])
                if any(digest(raw[name]) != checks.get(name) for name in ('CANDIDATS.jsonl','RAPPORT.json')):
                    raise ValueError('empreinte interne incorrecte')
                info = strict_json(raw['RAPPORT.json'])
                if info.get('format') != 'konstellation.existing-definitions-export/1.0' or info.get('approval') is not False or info.get('publication') is not False:
                    raise ValueError('rapport non candidat ou publication présumée')
                entries = [strict_json(row) for row in raw['CANDIDATS.jsonl'].splitlines() if row.strip()]
                if len(entries) != info.get('candidates_in_lot'):
                    raise ValueError('nombre de candidats incohérent')
                # Validate the whole ZIP before accepting ANY member.
                local_ids = set()
                for c in entries:
                    if c.get('format') != SOURCE_FORMAT or c.get('reviewed') is not False or c.get('status') != 'candidate' or c.get('locale') != 'und':
                        raise ValueError('candidat de format ou de statut incorrect')
                    if not VALID_SLUG.fullmatch(str(c.get('slug'))) or c.get('slug') == 'pitheory-prime-bridge':
                        raise ValueError('slug candidat invalide')
                    if not isinstance(c.get('text'),str) or not (5 <= len(c['text']) <= 4000):
                        raise ValueError('texte candidat absent ou trop long')
                    if not isinstance(c.get('source_refs'),list) or not 1 <= len(c['source_refs']) <= 80:
                        raise ValueError('provenance absente')
                    if not all(isinstance(x,str) and 0 < len(x) < 300 for x in c['source_refs']):
                        raise ValueError('source de format incorrect')
                    if c.get('assertion_id') in local_ids or c.get('assertion_id') in seen_ids:
                        raise ValueError('assertion dupliquée')
                    local_ids.add(c['assertion_id'])
                records.extend(entries)
                seen_ids.update(local_ids)
                reports.append({'name':zip_path.name,'count':len(entries),'sha256':digest(zip_path.read_bytes())})
        except (OSError, ValueError, KeyError, zipfile.BadZipFile, UnicodeError, json.JSONDecodeError) as ex:
            warnings.append({'archive':zip_path.name,'reason':str(ex)[:300],'severity':'archive_ignored'})
    return records, reports, warnings


def prepare(source: Path, output: Path, *, candidates_dir=DATA, audit=AUDIT, serve=False):
    source=source.resolve();output=output.resolve()
    if source == output or output.is_relative_to(source) or source.is_relative_to(output):
        raise ValueError('L’aperçu candidat doit être distinct du site source.')
    catalog, bundles, quarantines = read_site(source)
    warnings=[]
    priorities=read_priorities(audit)
    records, archives, rejected=read_candidates(candidates_dir,priorities)
    warnings.extend(rejected)
    items=defaultdict(list)
    stat=Counter()
    for c in records:
        slug=c['slug']
        if slug not in bundles:
            warnings.append({'slug':slug,'assertion_id':c['assertion_id'],'reason':'Kristal absent ou exclu','severity':'candidate_ignored'})
            continue
        row,bundle=bundles[slug]
        if c.get('state_ref') != bundle['state_ref'] or c.get('surface_digest') != bundle['surface_digest']:
            warnings.append({'slug':slug,'assertion_id':c['assertion_id'],'reason':'état ou empreinte de surface différente','severity':'candidate_ignored'})
            continue
        # Match exact canonical assertion, value, predicate and provenance -- never merely a matching label.
        edges={e.get('assertion_id'):e for e in bundle['edges']}
        edge=edges.get(c['assertion_id'])
        if (edge is None or edge.get('from')!=c.get('node_id') or edge.get('to')!=c.get('value_id') or
                edge.get('relation')!=c.get('predicate_id') or edge.get('source_refs')!=c.get('source_refs')):
            warnings.append({'slug':slug,'assertion_id':c['assertion_id'],'reason':'assertion, valeur ou références non concordantes','severity':'candidate_ignored'})
            continue
        flags=[x for x in c.get('quality_flags',[]) if isinstance(x,str) and len(x)<180]
        flags+=priorities.get((slug,c['assertion_id']),[])
        flags=list(dict.fromkeys(flags))[:30]
        priority=bool(flags) or (slug,c['assertion_id']) in priorities
        items[slug].append({
            'node_id':c['node_id'],'assertion_id':c['assertion_id'], 'value_id':c['value_id'],
            'predicate_id':c['predicate_id'],'text':c['text'],'source_refs':c['source_refs'],
            'quality_flags':flags,'locale':'und','reviewed':False,
            'editorial_status':'priority_review' if priority else 'candidate_for_display'
        })
        stat['priority' if priority else 'candidate']+=1
    if not archives:
        warnings.append({'reason':'Aucun ZIP de candidats valide disponible; affichage des graphes seulement.','severity':'no_candidates'})
    output.parent.mkdir(parents=True,exist_ok=True)
    temp = Path(tempfile.mkdtemp(prefix='konstellation-candidates-tmp-',dir=output.parent))
    try:
        # Copy the existing *static preview*, never regenerate or modify canonical Kristals.
        shutil.copytree(source,temp,dirs_exist_ok=True,symlinks=False)
        (temp/'data'/'catalog.json').write_bytes(render_json(catalog))
        # The source snapshot may omit the SVG while referring to it. Preserve an existing one.
        logo=temp/'assets'/'logo_k.svg'
        if not logo.exists():
            logo.parent.mkdir(parents=True,exist_ok=True)
            logo.write_bytes((ROOT/'brand'/'logo_k.svg').read_bytes())
        manifest={}
        for slug,rows in sorted(items.items()):
            source_entry,base=bundles[slug]
            obj={'format':FORMAT, 'authority':'candidate_unreviewed_non_authoritative',
                 'slug':slug,'state_ref':base['state_ref'],'surface_digest':base['surface_digest'],
                 'entries':rows}
            raw=render_json(obj); hashval=digest(raw)
            filename='data/candidate-'+hashval[7:]+'.json'
            (temp/filename).write_bytes(raw)
            manifest[slug]={'path':filename,'sha256':hashval,'bytes':len(raw),
                            'state_ref':base['state_ref'],'surface_digest':base['surface_digest'],
                            'count':len(rows),'priority':sum(r['editorial_status']=='priority_review' for r in rows)}
        cat={'format':'konstellation.candidate-catalog/1.0','publication':False,
             'authority':'candidate_unreviewed_non_authoritative','entries':manifest}
        (temp/'data'/'candidates-catalog.json').write_bytes(render_json(cat))
        (temp/'candidate-visual.mjs').write_bytes((ROOT/'candidate-visual.mjs').read_bytes())
        # Prefer the inspector integration. For newer Light variants, preserve app.js
        # byte-for-byte and provide a full candidate browser at definitions.html.
        integration='inspector_et_catalogue'
        original_app=(temp/'app.js').read_text('utf-8')
        try:
            patched_app=patch_app(original_app,default_slug=next(iter(sorted(items)),None))
        except ValueError as ex:
            patched_app=original_app
            integration='catalogue_autonome'
            warnings.append({'severity':'light_inspector_unchanged',
                             'reason':str(ex) + ' Les définitions restent accessibles dans definitions.html.'})
        (temp/'app.js').write_text(patched_app,encoding='utf-8')
        (temp/'definitions.html').write_bytes((ROOT/'definitions.html').read_bytes())
        (temp/'definitions.mjs').write_bytes((ROOT/'definitions.mjs').read_bytes())
        (temp/'index.html').write_text(patch_html((temp/'index.html').read_text('utf-8')),encoding='utf-8')
        (temp/'style.css').write_text(patch_style((temp/'style.css').read_text('utf-8')),encoding='utf-8')
        # Do not touch C4/workflows; this isolated site is never a deployable authorization.
        report={'format':'konstellation.candidate-production-report/1.0',
                'generated_at':dt.datetime.now(dt.timezone.utc).isoformat(),
                'source_preview':str(source),'candidate_preview':str(output),
                'kristals_input':len(bundles)+len(quarantines),'kristals_visible':len(catalog['entries']),
                'kristals_quarantined':len(quarantines),'quarantine':quarantines,
                'candidate_archives_accepted':archives,'candidate_records_loaded':len(records),
                'candidates_displayable':sum(map(len,items.values())),'candidates_priorite':stat['priority'],
                'candidates_sans_alerte_prioritaire':stat['candidate'], 'candidate_errors':warnings, 'viewer_integration':integration,
                'languages_generated':0,'language_of_unreviewed_candidates':'und',
                'editorial_reviewed':0,'publication_authorized':False,
                'graph_changes':0,'git_changes':0,'pages_deployment':False,
                'note':'Aperçu local uniquement; chiffres de qualité indicatifs et non vérification scientifique.'}
        (temp/'RAPPORT_PRODUCTION_VISUELLE.json').write_bytes(render_json(report))
        # This text is safe to open as-is without a local web server.
        (temp/'LIRE_RAPPORT.txt').write_text('Kristals visibles : '+str(report['kristals_visible'])+'\n'
            'Kristals en quarantaine : '+str(report['kristals_quarantined'])+'\n'
            'Définitions candidates visibles : '+str(report['candidates_displayable'])+'\n'
            'À revoir en priorité : '+str(report['candidates_priorite'])+'\n'
            'Révisées : 0\nPublication : non\n',encoding='utf-8')
        # Atomic swap with full rollback on failure, retaining backup of an existing preview.
        backup=None
        if output.exists():
            stamp=dt.datetime.now().strftime('%Y%m%d-%H%M%S')
            backup=output.parent/(output.name+'-sauvegarde-'+stamp)
            if backup.exists():
                raise ValueError('Sauvegarde déjà présente : réessayer.')
            output.rename(backup)
        try:
            temp.rename(output)
        except Exception:
            if backup is not None and backup.exists() and not output.exists():
                backup.rename(output)
            raise
        # Compact trace to return for the next editorial pass; never auto-upload.
        diagnostic_zip = output.parent / 'A_DEPOSER_ICI_RAPPORT_PRODUCTION_VISUELLE.zip'
        tmp_zip = diagnostic_zip.with_suffix('.zip.tmp')
        quarantine_json = render_json({'format':'konstellation.local-quarantine/1.0','entries':quarantines})
        issues_json = render_json({'format':'konstellation.local-candidate-issues/1.0','entries':warnings})
        report_json = render_json(report)
        payloads = {'RAPPORT_PRODUCTION_VISUELLE.json':report_json,
                    'QUARANTAINE.json':quarantine_json,
                    'AVERTISSEMENTS_CANDIDATS.json':issues_json}
        payloads['EMPREINTES_SHA256.json'] = render_json({k:digest(v) for k,v in payloads.items()})
        with zipfile.ZipFile(tmp_zip,'w',compression=zipfile.ZIP_DEFLATED) as z:
            for name, raw in payloads.items(): z.writestr(name,raw)
        os.replace(tmp_zip,diagnostic_zip)
        print('\nAPERÇU LOCAL PRÊT :')
        print('  Kristals visibles :',report['kristals_visible'])
        print('  Kristals isolés :',report['kristals_quarantined'])
        print('  Définitions candidates :',report['candidates_displayable'])
        print('  Textes prioritaires :',report['candidates_priorite'])
        print('  Rapport :',output/'RAPPORT_PRODUCTION_VISUELLE.json')
        print('  ZIP à me transmettre :',diagnostic_zip)
        print('  Catalogue des définitions :',output/'definitions.html')
        print('  Raccordement à Light :',integration)
        print('  Révisées : 0 · GitHub : aucune action · Graphes sources : inchangés')
        if serve:
            serve_site(output)
        return report
    finally:
        if temp.exists():
            shutil.rmtree(temp,ignore_errors=True)


def patch_app(src: str, default_slug=None) -> str:
    """Optional bridge with Light inspector, robust to both unlocalized and multilingual versions.

    If the user site has a newer structure we do *not* guess or alter that app:
    `prepare` keeps it unchanged, while definitions.html works independently.
    """
    stamp='/* CANDIDATE_PREVIEW_OVERLAY_V2 */'
    if stamp in src or '/* CANDIDATE_PREVIEW_OVERLAY_V1 */' in src:
        return src
    load='    const data = await loadPack(row);'
    state='state.bundle = data; state.portraitId = null;'
    inspector='function drawInspection(){'
    if src.count(load)!=1 or src.count(state)!=1 or src.count(inspector)!=1:
        raise ValueError('Points de raccordement Light non reconnus; lecteur original préservé.')

    src=stamp+'\n'+"import {loadCandidatePreview,appendCandidateView} from './candidate-visual.mjs';\n"+src
    src=src.replace(load,load+"\n    const pendingCandidates = await loadCandidatePreview(row, data).catch(err => ({entries:new Map(), error:err.message}));",1)
    src=src.replace(state,state+' state.candidates = pendingCandidates.entries; state.candidateError = pendingCandidates.error;',1)

    # Locate only the inspector's introductory portion; don't rely on an exact description block.
    start=src.index(inspector)
    end=src.find('  const nodeById=',start)
    if end<0 or end-start>6000:
        raise ValueError('Ancre inspecteur Light non reconnue; lecteur original préservé.')
    before=src[:start]
    head=src[start:end]
    after=src[end:]
    if 'const n=d.nodes.find(x=>x.id===state.selection);' not in head:
        raise ValueError('Sélection inspecteur Light non reconnue; lecteur original préservé.')

    candidate_block=(
        "  const candidate=state.candidates?.get(n.id);\n"
        "  const reviewedDefinition=state.localized?.get(n.id)?.definition;\n"
        "  if(candidate && !reviewedDefinition)appendCandidateView(target,candidate);\n"
        "  if(state.candidateError)target.append(element('p','subtle-hint','Définitions candidates indisponibles : '+state.candidateError));\n"
    )
    # Insert before native descriptions so the candidate appears near the notion's title.
    insertion=None
    for anchor in ('  const localizedDefinition=', '  const description=', '  if(n.period||n.source)'):
        if anchor in head:
            insertion=anchor
            break
    if not insertion:
        raise ValueError('Insertion inspecteur Light non reconnue; lecteur original préservé.')
    head=head.replace(insertion,candidate_block+insertion,1)
    head=head.replace('  const description=publicDescription(n.description);',
                      '  const description=candidate ? null : publicDescription(n.description);',1)
    head=head.replace('  const description=localizedDefinition || publicDescription(n.description);',
                      '  const description=localizedDefinition || (candidate ? null : publicDescription(n.description));',1)
    # If a new inspector has no recognized fallback description, we still retain its own behavior.
    src=before+head+after

    # Optional focus: no exact parsing of existing `data.nodes.find` expression is necessary.
    lines=src.splitlines(keepends=True)
    matches=[i for i,line in enumerate(lines) if line.lstrip().startswith('if (!validFocus) state.selection =')]
    if len(matches)==1:
        i=matches[0]
        ending='\r\n' if lines[i].endswith('\r\n') else '\n'
        addition=(
            '    if (!validFocus) {\n'
            '      const candidateStarter = data.nodes.find(n => state.candidates?.has(n.id) && !n.technical_identifier);\n'
            '      if (candidateStarter) state.selection = candidateStarter.id;\n'
            '    }\n'
        ).replace('\n',ending)
        lines.insert(i+1,addition)
        src=''.join(lines)

    if default_slug:
        # Nonessential: the dedicated candidate browser always lists all valid domains.
        first='const first=catalog.entries[0];'
        if src.count(first)==1:
            src=src.replace(first,"const first=catalog.entries.find(x => x.slug === "+json.dumps(default_slug)+") || catalog.entries[0];",1)

    # Search candidate texts where the known search expression can be changed safely.
    original="${n.description || ''} ${state.localized?.get(n.id)?.definition||''}"
    if original in src:
        src=src.replace(original,original+" ${state.candidates?.get(n.id)?.text||''}",1)
    else:
        original="${n.description || ''} ${n.kind}"
        if original in src:
            src=src.replace(original,"${n.description || ''} ${state.candidates?.get(n.id)?.text||''} ${n.kind}",1)
    return src


def patch_html(src: str) -> str:
    if 'candidate-banner' in src:
        return src
    # Accept `<body>` or `<body class="...">`, retaining the site's own attributes.
    body=re.search(r'<body\b[^>]*>', src, flags=re.IGNORECASE)
    if not body:
        # A future Light may use a different entrypoint: the standalone page works anyway.
        return src
    banner=('\n<div class="candidate-banner" role="note"><strong>Définitions candidates · aperçu local</strong>'
            ' · <a href="./definitions.html">Explorer les définitions</a>'
            ' · <a href="./RAPPORT_PRODUCTION_VISUELLE.json" target="_blank" rel="noopener noreferrer">Rapport et quarantaines</a>'
            ' · Textes non révisés; aucune publication.</div>')
    return src[:body.end()]+banner+src[body.end():]


def patch_style(src: str) -> str:
    if '/* CANDIDATE_PREVIEW_STYLE_V1 */' in src: return src
    return src + '''\n/* CANDIDATE_PREVIEW_STYLE_V1 */
.candidate-banner {padding:11px 22px;background:#102923;color:#d6eee8;border-bottom:1px solid #24766a;font-size:13px;line-height:1.5;}
.candidate-banner strong{color:#b2f4dc}.candidate-banner a{color:#b2f4dc;text-decoration:underline}
.candidate-definition{margin:12px 0 18px;padding:15px 16px;border:1px solid #4d786f;border-left:4px solid #70cbb8;border-radius:9px;background:#102722;color:#edf7f3}
.candidate-status{font-size:12px;letter-spacing:.01em;color:#aae4d4}.candidate-text{line-height:1.6;white-space:pre-wrap;margin:11px 0!important;font-size:15px}
.candidate-disclaimer{display:block;line-height:1.45;color:#b6cfc6}.candidate-flags{padding-left:20px;margin:10px 0 4px;color:#ffd5a1;line-height:1.5}
.candidate-sources{margin-top:12px;font-size:12px;color:#b6cfc6;overflow-wrap:anywhere}.candidate-sources summary{cursor:pointer}.candidate-sources p{line-height:1.5}
'''


def serve_site(output:Path):
    from functools import partial
    mimetypes.add_type('text/javascript','.mjs')
    class Reader(http.server.SimpleHTTPRequestHandler):
        def log_message(self, fmt,*args):
            pass
    for port in range(4187,4200):
        try:
            server=http.server.ThreadingHTTPServer(('127.0.0.1',port),partial(Reader,directory=str(output)))
            break
        except OSError:
            continue
    else:
        raise OSError('Aucun port local disponible entre 4187 et 4199.')
    url=f'http://127.0.0.1:{port}/definitions.html'
    print('APERÇU OUVERT :',url)
    print('Fermer cette fenêtre pour arrêter le serveur local. Les fichiers restent disponibles.')
    webbrowser.open(url)
    try:
        server.serve_forever(poll_interval=.1)
    except KeyboardInterrupt:
        print('Aperçu arrêté, fichiers conservés.')
    finally:
        server.server_close()


def main(argv=None):
    home=Path(os.environ.get('LOCALAPPDATA',str(Path.home()/'AppData'/'Local')))/'Konstellation-Light'
    p=argparse.ArgumentParser(description='Prépare un aperçu local candidat, sans modifier les Kristals ni les dépôts.')
    p.add_argument('--source',type=Path,default=home/'site-web-126-a-valider')
    p.add_argument('--out',type=Path,default=home/'site-web-candidats-a-valider')
    p.add_argument('--lots',type=Path,default=DATA)
    p.add_argument('--audit',type=Path,default=AUDIT)
    p.add_argument('--serve',action='store_true')
    a=p.parse_args(argv)
    try:
        prepare(a.source,a.out,candidates_dir=a.lots,audit=a.audit,serve=a.serve)
        return 0
    except Exception as exc:
        print('ERREUR : '+str(exc),file=sys.stderr)
        return 1

if __name__=='__main__':
    sys.exit(main())
