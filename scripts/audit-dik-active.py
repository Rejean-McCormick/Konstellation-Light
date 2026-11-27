"""Read-only comparison of public graph audit with a pinned V5.21.6.1 generation.
Outputs counts only, not labels, identities, private file paths or authorizations.
"""
import argparse
from collections import Counter, defaultdict
from contextlib import closing
import importlib.util
import json
from pathlib import Path
import re


def compare(public, reader):
    if public.get('format') != 'light.reviewed-localization-audit/1':
        raise ValueError('Use the public surface audit produced by prepare-reviewed-localizations.mjs')
    result = []
    for row in public['rows']:
        entry = {'slug': row['slug'], 'status': row['status'], 'locales': []}
        result.append(entry)
        if row['status'] != 'VERIFIED_TRANSPORT_ONLY':
            continue
        namespace = row['namespace_id']
        with closing(reader.db()) as db:
            matches = db.execute('SELECT g.status FROM v52161_active_graph g JOIN workspace w USING(slug) WHERE w.active=1 AND w.namespace_id=? AND g.namespace_id=w.namespace_id', (namespace,)).fetchall()
        if not matches:
            entry['status'] = 'NO_ACTIVE_NAMESPACE'
            continue
        if len(matches) != 1:
            raise ValueError('Ambiguous active namespace')
        if matches[0][0] != 'QUALIFIED_ACTIVE_GRAPH':
            entry['status'] = 'LOCAL_GRAPH_NOT_STRICTLY_QUALIFIED'
            continue
        graph = reader.active_graph(namespace)['payload']
        if 'sha256:' + graph['graph_sha256'] != row['graph_sha256']:
            entry['status'] = 'LOCAL_PUBLIC_GRAPH_DIFFERENT'
            continue
        entry['status'] = 'MATCHING_QUALIFIED_GRAPH_INDEX_ONLY'
        counts = defaultdict(Counter)
        nodes, predicates = set(graph['graph']['entities']), set(graph['graph']['properties'])
        with closing(reader.db()) as db:
            for ident, lang in db.execute('SELECT semantic_id,language_tag FROM lexical WHERE namespace_id=?', (namespace,)):
                if ident in nodes:
                    counts[lang]['nodes'] += 1
                elif ident in predicates:
                    counts[lang]['predicates'] += 1
        entry['locales'] = [{'locale': lang, 'nodes': c['nodes'], 'predicates': c['predicates']} for lang, c in sorted(counts.items())]
    return {'format': 'light.dik-active-audit/1', 'scope': 'Matching qualified active graph index metadata only; not reviewed export, license or publication approval.', 'publication_authorized': False, 'counts': dict(Counter(r['status'] for r in result)), 'rows': result}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ('framework', 'generation', 'public-audit', 'out'):
        parser.add_argument('--'+name, required=True, type=Path)
    parser.add_argument('--report-sha256', required=True)
    args = parser.parse_args()
    digest = args.report_sha256.removeprefix('sha256:')
    if not re.fullmatch('[0-9a-fA-F]{64}', digest):
        raise ValueError('Provide independently trusted report SHA-256')
    for source in (args.framework, args.generation.parent):
        if args.out.resolve().is_relative_to(source.resolve()):
            raise ValueError('Output must be outside the framework and private generations')
    if args.out.exists():
        raise FileExistsError(args.out)
    script = args.framework / 'tools/v11/lexical_compatibility_v52161.py'
    spec = importlib.util.spec_from_file_location('light_dik_reader_v52161', script)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    reader = module.Reader(args.generation, digest.lower(), 'active-only')
    public = json.loads(args.public_audit.read_text(encoding='utf-8'))
    report = compare(public, reader)
    with args.out.open('x', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
        f.write('\n')
    print(json.dumps(report['counts'], ensure_ascii=False))


if __name__ == '__main__':
    main()
