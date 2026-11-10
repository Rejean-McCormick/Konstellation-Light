import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest
import zipfile

ROOT = Path(__file__).resolve().parents[1]
SUT = ROOT / 'preparer_apercu.py'
sys.path.insert(0,str(ROOT))
from preparer_apercu import prepare, patch_app, read_site, read_candidates, read_priorities, digest
SITE = Path(os.environ.get('KONSTELLATION_TEST_SITE','/mnt/data/work_visual_20261109/light_snapshot/light/site'))

class PreviewIntegration(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.t = Path(self.temp.name)
    def tearDown(self):
        self.temp.cleanup()
    def test_real_preview_126_kristals_and_2354_candidates(self):
        if not SITE.exists(): self.skipTest('Real site fixture unavailable')
        report=prepare(SITE,self.t/'preview')
        self.assertEqual(report['kristals_visible'],126)
        self.assertEqual(report['kristals_quarantined'],0)
        self.assertEqual(report['candidates_displayable'],2354)
        self.assertEqual(report['candidates_priorite'],407)
        self.assertEqual(report['editorial_reviewed'],0)
        catalog=json.loads((self.t/'preview/data/catalog.json').read_text())
        self.assertEqual(len(catalog['entries']),126)
        manifest=json.loads((self.t/'preview/data/candidates-catalog.json').read_text())
        self.assertEqual(len(manifest['entries']),10)
        self.assertIn('CANDIDATE_PREVIEW_OVERLAY_V2',(self.t/'preview/app.js').read_text())
        self.assertTrue((self.t/'preview/definitions.html').is_file())
        self.assertTrue((self.t/'preview/definitions.mjs').is_file())
        self.assertEqual(report['viewer_integration'],'inspector_et_catalogue')
        self.assertFalse((SITE/'data/candidates-catalog.json').exists())
        self.assertFalse((SITE/'definitions.html').exists())
        self.assertEqual(report['candidate_errors'],[])
    def test_quarantine_corrupt_graph_continues(self):
        if not SITE.exists(): self.skipTest('Real site fixture unavailable')
        local=self.t/'source'
        shutil.copytree(SITE,local)
        catalog=json.loads((local/'data/catalog.json').read_text('utf-8'))
        row=next(x for x in catalog['entries'] if x['slug']=='aerospace')
        (local/row['path']).write_bytes(b'TAMPERED')
        r=prepare(local,self.t/'preview')
        self.assertEqual(r['kristals_visible'],125)
        self.assertEqual(r['kristals_quarantined'],1)
        self.assertEqual(r['quarantine'][0]['slug'],'aerospace')
        self.assertEqual(r['candidates_displayable'],2354-241)
        self.assertEqual((local/row['path']).read_bytes(),b'TAMPERED')
    def test_repeated_run_backup(self):
        if not SITE.exists(): self.skipTest('Real site fixture unavailable')
        out=self.t/'preview'
        r1=prepare(SITE,out)
        (out/'marker-user.txt').write_text('local notes')
        r2=prepare(SITE,out)
        self.assertEqual(r1['candidates_displayable'],r2['candidates_displayable'])
        backups=list(self.t.glob('preview-sauvegarde-*'))
        self.assertEqual(len(backups),1)
        self.assertEqual((backups[0]/'marker-user.txt').read_text(),'local notes')
        self.assertFalse((out/'marker-user.txt').exists())
    def test_wrong_assertion_is_skipped(self):
        if not SITE.exists(): self.skipTest('Real site fixture unavailable')
        lots=self.t/'lots';shutil.copytree(ROOT/'lots',lots)
        path=sorted(lots.glob('*.zip'))[0]
        with zipfile.ZipFile(path) as zin:
            rows={n:zin.read(n) for n in zin.namelist()}
        records=[json.loads(x) for x in rows['CANDIDATS.jsonl'].splitlines()]
        records[0]['node_id']='KQ_NOT_AN_EXISTING_NODE'
        payload=('\n'.join(json.dumps(x,ensure_ascii=False,sort_keys=True) for x in records)+'\n').encode()
        rows['CANDIDATS.jsonl']=payload
        rows['EMPREINTES_SHA256.json']=json.dumps({'CANDIDATS.jsonl':digest(payload),'RAPPORT.json':digest(rows['RAPPORT.json'])}).encode()
        with zipfile.ZipFile(path,'w',compression=zipfile.ZIP_DEFLATED) as zout:
            for name,data in rows.items():zout.writestr(name,data)
        r=prepare(SITE,self.t/'preview',candidates_dir=lots)
        self.assertEqual(r['candidates_displayable'],2353)
        self.assertIn('non concordantes',r['candidate_errors'][0]['reason'])
    def test_fallback_maintains_unknown_light_and_shows_standalone_catalog(self):
        if not SITE.exists(): self.skipTest('Real site fixture unavailable')
        local=self.t/'source'; shutil.copytree(SITE,local)
        app=local/'app.js'; app.write_text("console.log('new Light interface');\n",encoding='utf8')
        r=prepare(local,self.t/'preview')
        self.assertEqual(r['kristals_visible'],126)
        self.assertEqual(r['candidates_displayable'],2354)
        self.assertEqual(r['viewer_integration'],'catalogue_autonome')
        self.assertEqual((self.t/'preview/app.js').read_bytes(),app.read_bytes())
        self.assertTrue((self.t/'preview/definitions.html').exists())
        self.assertIn('definitions.html',(self.t/'preview/index.html').read_text('utf8'))
        self.assertTrue(any(x.get('severity')=='light_inspector_unchanged' for x in r['candidate_errors']))

    def test_multilingual_light_inspector_variant(self):
        source=Path('/mnt/data/work_visual_20261109/multilang_payload/payload/light/light/src/app.js')
        if not source.exists():self.skipTest('Multilingual version unavailable')
        patched=patch_app(source.read_text('utf8'))
        self.assertIn('CANDIDATE_PREVIEW_OVERLAY_V2',patched)
        self.assertIn('const reviewedDefinition=',patched)
        self.assertIn('const description=localizedDefinition || (candidate ? null : publicDescription(n.description));',patched)
        self.assertIn('state.candidates = pendingCandidates.entries',patched)
        self.assertEqual(patch_app(patched),patched)
        if shutil.which('node'):
            module=self.t/'test_multilingual.mjs';module.write_text(patched,'utf8')
            subprocess.run(['node','--check',str(module)],check=True)

    def test_patching_old_and_new_light(self):
        old=(SITE/'app.js').read_text('utf-8')
        patch=patch_app(old)
        self.assertIn('candidate=state.candidates?.get(n.id)',patch)
        self.assertEqual(patch_app(patch),patch)
        newer=Path('/mnt/data/work_visual_20261109/multilang_payload/payload/light/light/src/app.js')
        if newer.exists():
            new=patch_app(newer.read_text('utf-8'))
            self.assertIn('if(candidate && !reviewedDefinition)appendCandidateView',new)
            self.assertIn('state.candidates = pendingCandidates.entries',new)
            (self.t/'new-app.mjs').write_text(new)
            (self.t/'candidate-visual.mjs').write_bytes((ROOT/'candidate-visual.mjs').read_bytes())
            if shutil.which('node'):
                subprocess.run(['node','--check',str(self.t/'new-app.mjs')],check=True)

if __name__=='__main__':
    unittest.main(verbosity=2)
