"""Migration locale post-update: exact-match old paths only, with restorable backups.

No recursive deletes, no network operations, no scanning arbitrary folders.
"""
from __future__ import annotations

from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import shutil
from uuid import uuid4

# This fingerprint is from the user's 2026-10-13 10:43 Konstellation-Light snapshot.
LEGACY = {
    'server/integrations/kristal-v10.mjs': {
        'sha256': '0accd51e00ed5ff721778fa152e90c14dd8912e8ed9410ec7abe5c28b876f56e',
        'reason': 'Lecteur déplacé vers shared/kristal-v10.mjs ; anciens imports remplacés.',
        'replacement': 'shared/kristal-v10.mjs',
        'replacement_sha256': 'c4fdb864cef3f3b38200a88bb1108d48eb40f654c6e49bbc532f2700b02fb71c',
    }
}


def _sha(path: Path) -> str:
    h = hashlib.sha256()
    with path.open('rb') as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()


def _safe_path(root: Path, rel: str) -> Path:
    if rel not in LEGACY:
        raise ValueError('Chemin de migration non autorisé.')
    root = Path(root).absolute()
    if root.is_symlink() or not root.is_dir():
        raise ValueError('La racine doit être un dossier réel.')
    curr = root
    for part in Path(rel).parts:
        curr = curr / part
        if curr.is_symlink():
            raise ValueError(f'Lien symbolique interdit : {rel}')
    return curr


def inspect(root: Path) -> list[dict]:
    result = []
    for rel, meta in LEGACY.items():
        try:
            target = _safe_path(root, rel)
            if not target.exists():
                status = 'Absent : rien à faire'
                eligible = False
            elif not target.is_file():
                status = 'Type inattendu : ignoré'
                eligible = False
            elif _sha(target) != meta['sha256']:
                status = 'Modifié localement : PROTÉGÉ'
                eligible = False
            else:
                replacement = Path(root).absolute() / meta['replacement']
                if not replacement.is_file() or replacement.is_symlink() or _sha(replacement)!=meta['replacement_sha256']:
                    status = 'Remplacement absent : PROTÉGÉ'
                    eligible = False
                else:
                    status = 'Ancien fichier vérifié : retirable'
                    eligible = True
        except (OSError, ValueError) as ex:
            status = f'Protégé : {ex}'
            eligible = False
        result.append({'path': rel, 'status': status, 'eligible': eligible,
                       'reason': meta['reason']})
    return result


def archive_legacy(root: Path, selected: list[str]) -> Path | None:
    """Remove legacy files from project by saving their *exact* bytes outside project.

    Relocation rather than permanent destruction: no user data loss and easy rollback.
    Designed to be called only after an explicit confirmation in the GUI.
    """
    root = Path(root).absolute()
    if not selected:
        return None
    if len(set(selected)) != len(selected) or any(s not in LEGACY for s in selected):
        raise ValueError('Sélection non autorisée ou doublonnée.')
    statuses = {x['path']:x for x in inspect(root)}
    if any(not statuses[s]['eligible'] for s in selected):
        raise ValueError('Fichier différent du snapshot ou remplacement manquant. Aucune migration faite.')
    stamp = datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')
    backup_root = root.parent / f'{root.name}_sauvegardes_migration'
    if backup_root.is_symlink():
        raise ValueError('Destination de sauvegarde liée : refus.')
    backup = backup_root / f'{stamp}-{uuid4().hex[:8]}'
    backup.mkdir(parents=True, exist_ok=False)
    copied = []
    removed = []
    try:
        for rel in selected:
            src = _safe_path(root, rel)
            if not src.is_file() or _sha(src) != LEGACY[rel]['sha256']:
                raise ValueError('Ancien fichier modifié en cours de migration : ' + rel)
            dst = backup / rel
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src, dst)
            if _sha(dst) != LEGACY[rel]['sha256']:
                raise ValueError('Erreur de vérification de sauvegarde : ' + rel)
            copied.append(rel)
        # All backups validated before the first removal; no recursive deletion.
        for rel in selected:
            src = _safe_path(root, rel)
            if not src.is_file() or _sha(src) != LEGACY[rel]['sha256']:
                raise ValueError('Ancien fichier modifié : ' + rel)
            src.unlink()
            removed.append(rel)
        report = {'format':'konstellation-light.local-cleanup/1.0',
                  'project': str(root), 'moved_to_backup':removed,
                  'original_sha256': {rel:LEGACY[rel]['sha256'] for rel in removed}}
        (backup/'rapport.json').write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
        return backup
    except Exception:
        # Restore only files absent from the original project, never overwrite edits.
        for rel in removed:
            source = backup / rel
            target = root / rel
            if source.is_file() and not target.exists():
                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(source, target)
        raise
