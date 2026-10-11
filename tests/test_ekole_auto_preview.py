"""Headless end-to-end tests for the Windows one-click assistant."""
from __future__ import annotations
import json
import os
from pathlib import Path
import shutil
import tempfile
import unittest
import zipfile
from urllib.request import urlopen
from tools.ekole_auto_preview import (
    RELATIVE_KRISTAL, build_local_preview, find_ekole, install_in_ekole,
    preview_plan, start_available_preview, ekole_diagnosis, restore_autochtones_from_zip,
)
from tools.light_core import ROOT, LightError

FIXTURE = {
    'payload':{
        'format':'kristal.encyclopedie-societes/4.0',
        'slug':'societes-autochtones-quebec',
        'themes':[{'id':'habitat','titre':'Habitat'}],
        'sources':[{'id':'src1','titre':'Source documentaire','ancrage':'Chapitre'}],
        'articles':[{'id':'fiche1','theme':'habitat','question':'Pourquoi des villages?',
                    'reponse_courte':'Une réponse contextualisée.',
                    'epoque':'vers 1500','prerequis':[],'liens_semantiques':[],
                    'sources':[{'id':'src1'}]}],
        'entrainements':[{'correction':'CORRIGE CONFIDENTIEL','bonne_option':'secrete'}]
    }
}

class OneClickTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory(prefix='ekole-one-click-')
        self.addCleanup(self.tmp.cleanup)
        self.base=Path(self.tmp.name)
        self.project=self.base/'Konstellation'/'Konstellation-Light'
        self.project.mkdir(parents=True)
        for asset in ('scripts/project-ekole-encyclopedia.mjs','scripts/build-semantic-preview.mjs',
                      'light/src/app.js','light/src/graph-core.mjs','light/src/index.html',
                      'light/src/style.css','light/src/sw.js'):
            dest=self.project/asset
            dest.parent.mkdir(parents=True,exist_ok=True)
            shutil.copy2(ROOT/asset,dest)
        self.ekole=self.base/'Ekole'
        self.source=self.ekole/RELATIVE_KRISTAL
        self.source.parent.mkdir(parents=True)
        self.source.write_text(json.dumps(FIXTURE,ensure_ascii=False),encoding='utf-8')
        (self.ekole/'site/eleve').mkdir(parents=True)

    def test_find_ekole_from_sibling_or_env(self):
        self.assertEqual(find_ekole(project=self.project, environ={}),self.ekole)
        self.assertEqual(find_ekole(project=self.project, environ={'EKOLE_ROOT':str(self.ekole)}),self.ekole)
        bogus=self.base/'wrong'
        bogus.mkdir()
        self.assertEqual(find_ekole(project=self.project,environ={'EKOLE_ROOT':str(bogus)}),self.ekole)

    def test_missing_kristal_shows_correct_root_and_restoration(self):
        self.source.unlink()
        diagnosis=ekole_diagnosis(self.ekole)
        self.assertEqual(diagnosis['status'],'missing')
        self.assertIn('Restaurer',diagnosis['message'])
        # An incomplete Ekole still appears as the default folder.
        self.assertEqual(find_ekole(project=self.project,environ={}),self.ekole)
        archive=self.base/'snapshot.zip'
        prefix='kristals/societes-autochtones-quebec/'
        with zipfile.ZipFile(archive,'w') as z:
            z.writestr(prefix+'canon/domain/encyclopedie-v4.json',json.dumps(FIXTURE['payload']))
            z.writestr(prefix+'kristal.workspace.json','{}')
            z.writestr(prefix+'docs/guide.txt','Guide')
            z.writestr('kristals/qc-pri-ma-001/private.json','CONFIDENTIEL')
        # Directory exists from the fixture: intentional refusal rather than silent merge.
        with self.assertRaisesRegex(LightError,'existe déjà'):
            restore_autochtones_from_zip(archive,self.ekole)
        shutil.rmtree(self.source.parents[2])
        result=restore_autochtones_from_zip(archive,self.ekole)
        self.assertEqual(result['files'],3)
        self.assertTrue(result['source'].is_file())
        self.assertFalse((self.ekole/'kristals/qc-pri-ma-001').exists())
        self.assertEqual(ekole_diagnosis(self.ekole)['status'],'ready')
        with self.assertRaisesRegex(LightError,'existe déjà'):
            restore_autochtones_from_zip(archive,self.ekole)

    def test_archive_rejects_traversal_or_wrong_identity(self):
        target=self.source.parents[2]
        shutil.rmtree(target)
        prefix='kristals/societes-autochtones-quebec/'
        bad=self.base/'bad.zip'
        with zipfile.ZipFile(bad,'w') as z:
            z.writestr(prefix+'canon/domain/encyclopedie-v4.json',json.dumps(FIXTURE['payload']))
            z.writestr(prefix+'kristal.workspace.json','{}')
            z.writestr(prefix+'../../outside.txt','injected')
        with self.assertRaisesRegex(LightError,'non autorisée'):
            restore_autochtones_from_zip(bad,self.ekole)
        self.assertFalse(target.exists())
        self.assertFalse((self.ekole/'outside.txt').exists())

    def test_detects_nested_snapshot_instead_of_misleading_missing(self):
        folder=self.ekole/'Ekole_Pack'/'kristals/societes-autochtones-quebec/canon/domain'
        folder.mkdir(parents=True)
        (folder/'encyclopedie-v4.json').write_text('{}')
        self.source.unlink()
        info=ekole_diagnosis(self.ekole)
        self.assertEqual(info['status'],'nested')
        self.assertIn('Ekole_Pack',info['message'])

    def test_compile_cache_and_source_updates(self):
        p=build_local_preview(self.ekole,project=self.project)
        self.assertFalse(p['cached']); self.assertEqual(p['stats'],{'nodes':4,'edges':3})
        self.assertTrue((p['site']/'index.html').is_file())
        c=(p['site']/'data/catalog.json').read_text(encoding='utf-8')
        self.assertIn('semantic_preview',c)
        self.assertNotIn('CORRIGE CONFIDENTIEL',(p['curation']).read_text(encoding='utf-8'))
        second=build_local_preview(self.ekole,project=self.project)
        self.assertTrue(second['cached']);self.assertEqual(second['site'],p['site'])
        d=json.loads(self.source.read_text());d['payload']['articles'][0]['reponse_courte']='Réponse actualisée.'
        self.source.write_text(json.dumps(d),encoding='utf-8')
        third=build_local_preview(self.ekole,project=self.project)
        self.assertNotEqual(third['site'],p['site'])
        self.assertTrue(p['site'].exists())
        self.assertFalse(third['cached'])

    def test_modified_curation_is_never_overwritten(self):
        p=build_local_preview(self.ekole,project=self.project)
        with p['curation'].open('a',encoding='utf8') as f:f.write(' ')
        with self.assertRaisesRegex(LightError,'modifiée'):
            build_local_preview(self.ekole,project=self.project)

    def test_local_http_and_install_guardrails(self):
        p=build_local_preview(self.ekole,project=self.project)
        server,url=start_available_preview(p['site'],first=48971,last=48973)
        self.addCleanup(server.server_close)
        self.addCleanup(server.shutdown)
        with urlopen(url,timeout=3) as resp:
            html=resp.read().decode('utf-8')
        self.assertIn('Konstellation Light',html)
        with urlopen(url+'data/catalog.json',timeout=3) as resp:
            catalog=json.loads(resp.read())
        self.assertEqual(catalog['entries'][0]['revision'],'candidate-local')
        self.assertEqual(catalog['entries'][0]['mode'],'semantic_preview')
        target=install_in_ekole(p,self.ekole)
        self.assertTrue((target/'index.html').is_file())
        with self.assertRaisesRegex(LightError,'existe déjà'):
            install_in_ekole(p,self.ekole)

    def test_fails_when_missing_or_wrong_kristal(self):
        self.source.unlink()
        with self.assertRaisesRegex(LightError,'manque'):
            preview_plan(self.ekole,project=self.project)

if __name__=='__main__':unittest.main()
