import importlib.util
import sqlite3
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location('audit_dik', Path(__file__).parents[1]/'scripts/audit-dik-active.py')
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)

class FixtureReader:
    def db(self):
        c = sqlite3.connect(':memory:')
        c.executescript("""CREATE TABLE workspace(slug,active,namespace_id);CREATE TABLE v52161_active_graph(slug,namespace_id,status);CREATE TABLE lexical(namespace_id,semantic_id,language_tag,preferred_term);
        INSERT INTO workspace VALUES ('a',1,'ns:a'),('b',1,'ns:b'),('c',1,'ns:c');
        INSERT INTO v52161_active_graph VALUES ('a','ns:a','QUALIFIED_ACTIVE_GRAPH'),('b','ns:b','PRIVATE_GRAPH_ONLY_LEXICAL_BLOCKED'),('c','ns:c','QUALIFIED_ACTIVE_GRAPH');
        INSERT INTO lexical VALUES ('ns:a','KQ1','en','SECRET'),('ns:a','KP1','en','SECRET'),('ns:a','KQ9','en','SECRET'),('ns:b','KQ1','fr','SECRET');""")
        return c
    def active_graph(self, ns):
        assert ns != 'ns:b'
        return {'payload': {'graph_sha256':'a'*64, 'graph':{'entities':['KQ1'],'properties':['KP1']}}}

class TestAudit(unittest.TestCase):
    def test_scope_and_no_private_content(self):
        public={'format':'light.reviewed-localization-audit/1','rows':[{'slug':x,'status':'VERIFIED_TRANSPORT_ONLY','namespace_id':'ns:'+x,'graph_sha256':'sha256:'+('a' if x=='a' else 'b')*64} for x in 'abcd']}
        report=m.compare(public,FixtureReader())
        self.assertEqual(report['rows'][0]['locales'],[{'locale':'en','nodes':1,'predicates':1}])
        self.assertEqual([x['status'] for x in report['rows']],['MATCHING_QUALIFIED_GRAPH_INDEX_ONLY','LOCAL_GRAPH_NOT_STRICTLY_QUALIFIED','LOCAL_PUBLIC_GRAPH_DIFFERENT','NO_ACTIVE_NAMESPACE'])
        self.assertNotIn('SECRET',str(report));self.assertFalse(report['publication_authorized'])
    def test_wrong_format(self):
        with self.assertRaises(ValueError): m.compare({},FixtureReader())

if __name__=='__main__':unittest.main()
