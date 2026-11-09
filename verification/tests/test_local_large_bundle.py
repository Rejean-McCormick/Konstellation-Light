"""Integration: localhost preview serves a large immutable bundle byte-for-byte."""
from pathlib import Path
import hashlib
import http.client
import json
import tempfile
import threading
import unittest
from tools.light_core import LocalSiteHandler
from http.server import ThreadingHTTPServer

class LargeBundlePreviewTest(unittest.TestCase):
    def test_verified_large_bundle_transfer(self):
        with tempfile.TemporaryDirectory() as tmp:
            site = Path(tmp)
            (site/'data').mkdir()
            content = b'{' + b'"content":"' + b'x' * (4*1024*1024) + b'"}'
            sha = hashlib.sha256(content).hexdigest()
            fname = f'pack-{sha}.json'
            (site/'data'/fname).write_bytes(content)
            handler = type('Test', (LocalSiteHandler,), {'site_root':site})
            server = ThreadingHTTPServer(('127.0.0.1',0), handler)
            thread=threading.Thread(target=server.serve_forever,daemon=True)
            thread.start()
            try:
                conn=http.client.HTTPConnection('127.0.0.1',server.server_address[1],timeout=15)
                conn.request('GET', f'/data/{fname}')
                resp=conn.getresponse()
                self.assertEqual(resp.status,200)
                self.assertEqual(int(resp.getheader('Content-Length')),len(content))
                streamed=resp.read()
                self.assertEqual(hashlib.sha256(streamed).hexdigest(),sha)
                conn.close()
                conn=http.client.HTTPConnection('127.0.0.1',server.server_address[1],timeout=15)
                conn.request('HEAD', f'/data/{fname}')
                resp=conn.getresponse()
                self.assertEqual(resp.status,200)
                self.assertEqual(int(resp.getheader('Content-Length')),len(content))
                self.assertEqual(resp.read(),b'')
                conn.close()
            finally:
                server.shutdown();server.server_close()
