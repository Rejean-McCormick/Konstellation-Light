import hashlib
import http.client
import json
from pathlib import Path
import shutil
import tempfile
import unittest
from zipfile import ZipFile
from tools.light_core import (ROOT, LightError, build_public_collection, export_site_zip,
                              generate_gitbook_note, prepare_checkout, site_dir, start_preview,
                              validated_site)


class WindowsToolsTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.tmp = Path(self.temp.name)
        self.site = self.tmp / 'site'
        shutil.copytree(site_dir(ROOT), self.site)

    def test_demo_is_valid_and_site_zip_is_extractable(self):
        self.assertEqual(validated_site(self.site)['revisions'], 1)
        archive = export_site_zip(self.site, self.tmp / 'public.zip')
        with ZipFile(archive) as z:
            self.assertIsNone(z.testzip())
            self.assertIn('index.html', z.namelist())
            self.assertIn('data/catalog.json', z.namelist())
            self.assertNotIn('light/site/index.html', z.namelist())

    def test_cannot_export_corrupt_bundle(self):
        catalog = json.loads((self.site/'data/catalog.json').read_text())
        with (self.site / catalog['entries'][0]['path']).open('ab') as f: f.write(b'garbage')
        with self.assertRaisesRegex(LightError, 'altéré'):
            export_site_zip(self.site, self.tmp/'bad.zip')
        self.assertFalse((self.tmp/'bad.zip').exists())

    def test_no_undeclared_files(self):
        (self.site/'oops.html').write_text('not in site')
        with self.assertRaisesRegex(LightError, 'non déclaré'):
            validated_site(self.site)

    def test_prepare_local_git_checkout_and_backup(self):
        checkout = self.tmp/'checkout'
        (checkout/'.git').mkdir(parents=True)
        dest = prepare_checkout(self.site, checkout)
        self.assertEqual(dest, checkout/'docs'/'konstellation-light')
        self.assertEqual(validated_site(dest)['revisions'], 1)
        old=dest/'old.note'
        old.write_text('previous edition')
        dest2=prepare_checkout(self.site, checkout)
        self.assertEqual(dest2,dest)
        backups=list((checkout.parent / ('.'+checkout.name+'-Konstellation-Light-backups')).glob('konstellation-light.backup-*'))
        self.assertEqual(len(backups),1)
        self.assertEqual((backups[0]/'old.note').read_text(),'previous edition')

    def test_checkout_must_be_git(self):
        checkout = self.tmp/'not_a_git_repo'; checkout.mkdir()
        with self.assertRaisesRegex(LightError,'dépôt Git'):
            prepare_checkout(self.site, checkout)

    def test_gitbook_https_and_safe_embed(self):
        note = generate_gitbook_note('https://example.github.io/light/?lens=trace', self.tmp/'embed.md')
        content=note.read_text()
        self.assertIn('lens=trace&embed=1', content)
        with self.assertRaisesRegex(LightError,'HTTPS'):
            generate_gitbook_note('javascript:alert(1)', self.tmp/'no.md')

    def test_preview_http_and_no_dotfiles(self):
        server,url=start_preview_on_ephemeral(self.site)
        try:
            host='127.0.0.1'; port=server.server_address[1]
            c=http.client.HTTPConnection(host,port,timeout=2)
            c.request('GET','/'); r=c.getresponse(); self.assertEqual(r.status,200); self.assertIn(b'Konstellation',r.read());c.close()
            c=http.client.HTTPConnection(host,port,timeout=2)
            c.request('GET','/%2e%2e/secret'); r=c.getresponse(); self.assertNotEqual(r.status,200);r.read();c.close()
            c=http.client.HTTPConnection(host,port,timeout=2)
            c.request('GET','/.nojekyll'); r=c.getresponse(); self.assertNotEqual(r.status,200);r.read();c.close()
        finally:
            server.shutdown();server.server_close()


def start_preview_on_ephemeral(site):
    # Bind an ephemeral port without reserving it in advance.
    from tools.light_core import LocalSiteHandler
    import http.server
    handler=type('TestHandler',(LocalSiteHandler,),{'site_root':site})
    server=http.server.ThreadingHTTPServer(('127.0.0.1',0),handler)
    import threading
    threading.Thread(target=server.serve_forever,daemon=True).start()
    return server, f'http://127.0.0.1:{server.server_address[1]}/'

if __name__ == '__main__':unittest.main()
