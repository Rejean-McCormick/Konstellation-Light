"""One-click LOCAL candidate preview of Ekole's autonomous Indigenous encyclopedia.

No publication, no write in a Kristal, no answer-key export. Node is used to run
Konstellation Light's existing reviewed projection/build scripts, not to serve it.
"""
from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import time
import uuid
import zipfile
import stat

from tools.light_core import ROOT, LightError, start_preview, validated_site

RELATIVE_KRISTAL = Path('kristals/societes-autochtones-quebec/canon/domain/encyclopedie-v4.json')
LOCAL_DIR = Path('previews/ekole-autochtones-local')
ASSETS = (
    'scripts/project-ekole-encyclopedia.mjs',
    'scripts/build-semantic-preview.mjs',
    'light/src/app.js', 'light/src/graph-core.mjs', 'light/src/profile.mjs',
    'light/src/index.html', 'light/src/style.css', 'light/src/sw.js',
)


def kristal_file(ekole: Path) -> Path:
    """Canonical location of the autonomous Kristal. Never copy it under the course."""
    return Path(ekole).expanduser().resolve() / RELATIVE_KRISTAL


def valid_ekole(path: Path) -> bool:
    """Complete Ekole source tree including the v4 encyclopedia."""
    try:
        return kristal_file(path).is_file()
    except (ValueError, OSError):
        return False


def ekole_root_exists(path: Path) -> bool:
    """Recognize Ekole even when a Kristal is missing (old detector failed this)."""
    try:
        p = Path(path).expanduser().resolve()
        return (p / 'kristals').is_dir() and (p / 'site' / 'eleve').is_dir()
    except (ValueError, OSError):
        return False


def ekole_diagnosis(path: Path) -> dict:
    """Provide a meaningful diagnosis with no file moves or silent fallbacks."""
    p = Path(path).expanduser().resolve()
    expected = kristal_file(p)
    if valid_ekole(p):
        return {'status': 'ready', 'root': p, 'expected': expected,
                'message': 'Kristal autonome v4 trouvé. Graphe prêt à compiler.'}
    if not ekole_root_exists(p):
        for nested in sorted(p.glob('*/kristals/societes-autochtones-quebec/canon/domain/encyclopedie-v4.json')) if p.is_dir() else []:
            return {'status':'nested', 'root':p,'expected':expected,
                    'message':f'Snapshot extrait dans un sous-dossier. Sélectionner plutôt sa racine : {nested.parents[4]}'}
        return {'status': 'wrong_root', 'root': p, 'expected': expected,
                'message': 'Ce dossier ne contient pas ensemble kristals/ et site/eleve/. Sélectionner la racine Ekole.'}
    for nested in sorted(p.glob('*/kristals/societes-autochtones-quebec/canon/domain/encyclopedie-v4.json')):
        return {'status':'nested','root':p,'expected':expected,
                'message':f'Kristal retrouvé dans un Ekole imbriqué. Vérifier ce dossier : {nested.parents[4]}'}
    return {'status': 'missing', 'root': p, 'expected': expected,
            'message':f'Ekole trouvé, mais le Kristal autonome manque ici : {expected}. Utiliser « Restaurer depuis un ZIP Ekole ».'}


def find_ekole(*, project: Path = ROOT, environ=None) -> Path | None:
    """Detect the real Ekole root; offer an incomplete Ekole for repair as fallback."""
    project = Path(project).resolve()
    env = environ if environ is not None else os.environ
    possibilities = []
    for key in ('EKOLE_ROOT', 'EKOLE_HOME'):
        if env.get(key):
            possibilities.append(Path(env[key]))
    possibilities += [
        project.parent.parent / 'Ekole',
        project.parent / 'Ekole',
        project.parent.parent / 'EKOLE',
        Path.home() / 'mycode' / 'Ekole',
    ]
    if os.name == 'nt':
        possibilities += [Path(r'C:\mycode\Ekole'), Path(r'C:\mycode\EKOLE')]
    # A complete, valid workspace wins; otherwise show an incomplete one for repair.
    for candidate in possibilities:
        if valid_ekole(candidate):
            return candidate.resolve()
    for candidate in possibilities:
        if ekole_root_exists(candidate):
            return candidate.resolve()
    return None


def restore_autochtones_from_zip(archive: Path, ekole: Path) -> dict:
    """Restore ONLY missing autonomous Kristal, atomically, never replacing a file.

    ZIP can be the complete Ekole snapshot. No publishing and no changing course
    references. A partly present Kristal is left untouched for manual review.
    """
    ekole = Path(ekole).expanduser().resolve()
    archive = Path(archive).expanduser().resolve()
    if not ekole_root_exists(ekole):
        raise LightError('Choisir un dossier Ekole existant (kristals/ et site/eleve/).')
    target = ekole / 'kristals' / 'societes-autochtones-quebec'
    if target.exists() or target.is_symlink():
        raise LightError('Le dossier du Kristal existe déjà. Aucun mélange ni écrasement automatique :\n'
                         + str(target) + '\nFaire une sauvegarde et examiner les fichiers présents.')
    prefix = 'kristals/societes-autochtones-quebec/'
    try:
        with zipfile.ZipFile(archive) as z:
            infos = [i for i in z.infolist() if i.filename.startswith(prefix) and not i.is_dir()]
            required = {prefix+'canon/domain/encyclopedie-v4.json',prefix+'kristal.workspace.json'}
            names = [i.filename for i in infos]
            if not required.issubset(names):
                raise LightError('Ce ZIP ne contient pas le Kristal autochtone autonome v4 à son emplacement canonique.')
            if len(names) != len(set(names)) or len(names) > 150 or sum(i.file_size for i in infos) > 20*1024*1024:
                raise LightError('Archive suspecte : doublons, nombre ou taille de fichiers non conformes.')
            for i in infos:
                rel=i.filename[len(prefix):]
                parts=rel.split('/')
                mode=(i.external_attr >> 16) & 0o170000
                if (not rel or any(x in ('','.','..') for x in parts) or '\\' in rel
                        or ':' in rel or mode == stat.S_IFLNK):
                    raise LightError('Entrée ZIP non autorisée : ' + i.filename)
            source = json.loads(z.read(prefix+'canon/domain/encyclopedie-v4.json').decode('utf-8'))
            if source.get('slug')!='societes-autochtones-quebec' or source.get('format')!='kristal.encyclopedie-societes/4.0':
                raise LightError('Le contenu de l’encyclopédie ne correspond pas au Kristal attendu.')
            stage = ekole / 'kristals' / ('.autochtones-stage-' + uuid.uuid4().hex)
            try:
                stage.mkdir()
                for i in infos:
                    path=stage.joinpath(*i.filename[len(prefix):].split('/'))
                    path.parent.mkdir(parents=True, exist_ok=True)
                    with z.open(i) as src, path.open('xb') as dest:
                        shutil.copyfileobj(src,dest)
                # Atomic rename: preserves every existing file, never merges old and new states.
                if target.exists() or target.is_symlink():
                    raise LightError('Le dossier du Kristal est apparu pendant la restauration; opération annulée.')
                stage.rename(target)
                stage=None
            finally:
                if stage is not None and stage.exists():
                    shutil.rmtree(stage)
            return {'target':target,'files':len(infos),'source':kristal_file(ekole)}
    except (zipfile.BadZipFile, OSError, UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise LightError('Échec de lecture du ZIP Ekole : '+str(exc)) from exc


def node_executable() -> str:
    candidate = shutil.which('node') or shutil.which('node.exe')
    if candidate:
        return candidate
    if os.name == 'nt':
        for candidate in (r'C:\Program Files\nodejs\node.exe',r'C:\nodejs\node.exe'):
            if Path(candidate).is_file():
                return candidate
    raise LightError('Node.js introuvable. Installer Node.js et relancer le lanceur; aucun terminal n’est nécessaire ensuite.')


def _sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _run_node(script: str, args: list[str], *, project: Path, node: str) -> str:
    kwargs = {'cwd': project, 'capture_output': True, 'text': True,
              'encoding':'utf-8', 'errors':'replace', 'timeout':90}
    if sys.platform == 'win32':
        kwargs['creationflags'] = subprocess.CREATE_NO_WINDOW
    r = subprocess.run([node,str(project / script),*args],**kwargs)
    if r.returncode:
        raise LightError((r.stderr or r.stdout or f'Échec {script}').strip()[-3000:])
    return (r.stdout or '').strip()


def preview_plan(ekole: Path, *, project: Path = ROOT) -> dict:
    project = Path(project).resolve()
    source = kristal_file(ekole)
    if not source.is_file():
        raise LightError(ekole_diagnosis(ekole)['message'])
    if source.stat().st_size > 6*1024*1024:
        raise LightError('Kristal trop volumineux (> 6 Mo).')
    for asset in ASSETS:
        if not (project / asset).is_file():
            raise LightError('Konstellation Light v0.2 incomplet : ' + asset)
    source_hash = _sha(source.read_bytes())
    version = hashlib.sha256(bytes.fromhex(source_hash))
    for asset in ASSETS:
        version.update(bytes.fromhex(_sha((project / asset).read_bytes())))
    signature = version.hexdigest()
    root = project / LOCAL_DIR / signature[:24]
    return {'source': source, 'source_sha256':source_hash,
            'signature':signature, 'root':root, 'curation':root/'curation.json',
            'site':root/'site', 'meta':root/'meta.json'}


def _check_reuse(plan: dict) -> bool:
    if not plan['meta'].is_file() or not plan['curation'].is_file() or not plan['site'].is_dir():
        return False
    try:
        meta=json.loads(plan['meta'].read_text(encoding='utf-8'))
        return (meta.get('signature')==plan['signature'] and
                meta.get('source_sha256')==plan['source_sha256'] and
                meta.get('curation_sha256')==_sha(plan['curation'].read_bytes()) and
                meta.get('catalog_sha256')==_sha((plan['site']/'data/catalog.json').read_bytes()) and
                validated_site(plan['site'])['revisions']==1)
    except (ValueError, OSError, KeyError, TypeError):
        return False


def build_local_preview(ekole: Path, *, project: Path = ROOT, node: str | None = None) -> dict:
    """Idempotent on same source+compiler; never overwrite/edit manual curations."""
    project = Path(project).resolve()
    plan=preview_plan(ekole,project=project)
    node = node or node_executable()
    if _check_reuse(plan):
        return {**plan,'cached':True,'stats':_stats(plan['site'])}
    if plan['root'].exists():
        # Content could have been curated manually. Never overwrite it.
        raise LightError('Prévisualisation déjà présente mais modifiée ou incomplète :\n'
                         +str(plan['root'])+'\nDéplacer ce dossier ailleurs pour régénérer sans perdre tes modifications.')
    plan['root'].mkdir(parents=True,exist_ok=False)
    try:
        _run_node('scripts/project-ekole-encyclopedia.mjs',
                  ['--kristal',str(plan['source']),'--out',str(plan['curation']),'--local','YES'],
                  project=project,node=node)
        _run_node('scripts/build-semantic-preview.mjs',
                  ['--input',str(plan['curation']),'--out',str(plan['site']),'--local','YES'],
                  project=project,node=node)
        stats=_stats(plan['site'])
        plan['meta'].write_text(json.dumps({
            'signature':plan['signature'],'source_sha256':plan['source_sha256'],
            'curation_sha256':_sha(plan['curation'].read_bytes()),
            'catalog_sha256':_sha((plan['site']/'data/catalog.json').read_bytes()),
            'kind':'LOCAL CANDIDATE — NOT PUBLISHED v10',
            'nodes':stats['nodes'],'edges':stats['edges'],
        },ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        return {**plan,'cached':False,'stats':stats}
    except Exception:
        # Incomplete builds are never mistaken for a valid cache.
        # Keep the directory for debugging rather than destroying user files.
        raise


def _stats(site: Path) -> dict:
    validated_site(site)
    cat=json.loads((site/'data/catalog.json').read_text(encoding='utf-8'))
    entry=cat['entries'][0]
    data=json.loads((site/entry['path']).read_text(encoding='utf-8'))
    if (entry.get('mode')!='semantic_preview' or
        data.get('view_kind')!='derived-semantic-preview' or
        data.get('semantic_authority') is not False):
        raise LightError('Le site n’est pas une prévisualisation locale de connaissances.')
    return {'nodes':len(data['nodes']),'edges':len(data['edges'])}


def start_available_preview(site: Path, *, first=4177, last=4197):
    for port in range(first,last+1):
        try:
            return start_preview(site, port=port)
        except OSError as exc:
            # Reuse another port only for unavailable socket binds, not malformed sites.
            if exc.errno in (48,98,10048,13,10013):
                continue
            raise
    raise LightError(f'Les ports {first} à {last} sont occupés. Fermer un ancien serveur de prévisualisation.')


def install_in_ekole(plan: dict, ekole: Path) -> Path:
    """Explicitly authorized by caller after human review; never replaces existing target."""
    site=plan['site'].resolve()
    _stats(site)
    ekole=Path(ekole).resolve()
    if not valid_ekole(ekole):
        raise LightError('Dossier Ekole non reconnu.')
    parent=ekole/'site'/'eleve'
    if not parent.is_dir() or parent.is_symlink():
        raise LightError('Dossier site/eleve d’Ekole manquant ou invalide.')
    target=parent/'konstellation'
    if target.exists() or target.is_symlink():
        raise LightError('Le dossier Eleve/konstellation existe déjà. Aucun écrasement automatique :\n'+str(target))
    stage=parent/('.konstellation-light-stage-'+uuid.uuid4().hex)
    try:
        shutil.copytree(site,stage,symlinks=False)
        _stats(stage)
        stage.rename(target)
    finally:
        if stage.exists():
            shutil.rmtree(stage)
    return target
