import hashlib
from pathlib import Path
import tempfile
import unittest
from tools.cleanup_update import inspect, archive_legacy, LEGACY


class CleanupTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root=Path(self.tmp.name)/'Konstellation-Light'
        self.root.mkdir()
        (self.root/'shared').mkdir()
        (self.root/'shared/kristal-v10.mjs').write_bytes((Path(__file__).parents[1]/'shared/kristal-v10.mjs').read_bytes())
        self.legacy='server/integrations/kristal-v10.mjs'
        # From the same source snapshot as this upgrade; test first-party migration only.
        # Construct a test-eligible version by replacing the SHA only during test (not production).
        self.src=self.root/self.legacy
        self.src.parent.mkdir(parents=True)
        self.src.write_bytes(b'historical copy')
        self.orig=LEGACY[self.legacy]
        LEGACY[self.legacy]={**self.orig,'sha256':hashlib.sha256(b'historical copy').hexdigest()}
        self.addCleanup(lambda:LEGACY.__setitem__(self.legacy,self.orig))

    def test_archives_only_exact_known_bytes_with_recovery_copy(self):
        self.assertTrue(inspect(self.root)[0]['eligible'])
        backup=archive_legacy(self.root,[self.legacy])
        self.assertFalse(self.src.exists())
        self.assertEqual((backup/self.legacy).read_bytes(),b'historical copy')
        self.assertTrue((backup/'rapport.json').is_file())
        self.assertFalse(inspect(self.root)[0]['eligible'])

    def test_modified_file_preserved(self):
        self.src.write_bytes(b'user modifications')
        self.assertFalse(inspect(self.root)[0]['eligible'])
        with self.assertRaises(ValueError):archive_legacy(self.root,[self.legacy])
        self.assertEqual(self.src.read_bytes(),b'user modifications')

    def test_removal_refused_without_new_reader(self):
        (self.root/'shared/kristal-v10.mjs').unlink()
        self.assertFalse(inspect(self.root)[0]['eligible'])

    def test_unknown_or_symlinked_paths_rejected(self):
        with self.assertRaises(ValueError):archive_legacy(self.root,['README.md'])
        self.src.unlink()
        try:self.src.symlink_to(self.root/'shared/kristal-v10.mjs')
        except (OSError, NotImplementedError):self.skipTest('Symlinks unavailable')
        self.assertFalse(inspect(self.root)[0]['eligible'])

if __name__=='__main__':unittest.main()
