"""Konstellation Light: build/preview/export helpers for Windows .pyw launchers.

No GitHub credentials, Git push, or semantic mutations. Standard library only.
"""
from __future__ import annotations

import hashlib
import html
import http.server
import json
import mimetypes
import os
from pathlib import Path
import re
import shutil
import socketserver
import subprocess
import threading
import uuid
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit, unquote
from zipfile import ZipFile, ZIP_DEFLATED

ROOT = Path(__file__).resolve().parents[1]
SHA256 = re.compile(r"sha256:[0-9a-f]{64}\Z")
PACK_PATH = re.compile(r"data/pack-[0-9a-f]{64}\.json\Z")
SITE_FIXED = {".nojekyll", "index.html", "app.js", "style.css", "sw.js", "data/catalog.json"}


class LightError(ValueError):
    pass


def site_dir(project: Path = ROOT) -> Path:
    return Path(project) / "light" / "site"


def _load_json(p: Path):
    return json.loads(p.read_text(encoding="utf-8"))


def validated_site(site: Path) -> dict:
    """Validate *local* bundle consistency before serving/publishing.

    This does NOT validate semantic commitments, signatures, or activation.
    """
    site = Path(site)
    if not site.is_dir() or site.is_symlink():
        raise LightError("Dossier du site manquant ou lien symbolique interdit.")
    catalog_path = site / "data" / "catalog.json"
    if not catalog_path.is_file() or catalog_path.is_symlink():
        raise LightError("Catalogue du site manquant.")
    catalog = _load_json(catalog_path)
    if not isinstance(catalog, dict) or catalog.get("format") != "konstellation.light-catalog/1.0":
        raise LightError("Format du catalogue non reconnu.")
    entries = catalog.get("entries")
    if not isinstance(entries, list) or not entries:
        raise LightError("Catalogue vide ou invalide.")
    permitted = set(SITE_FIXED)
    seen = set()
    for entry in entries:
        if not isinstance(entry, dict):
            raise LightError("Entrée de catalogue invalide.")
        rel = entry.get("path")
        expected = entry.get("sha256")
        size = entry.get("bytes")
        key = (entry.get("slug"), entry.get("revision"))
        if not isinstance(rel, str) or not PACK_PATH.fullmatch(rel):
            raise LightError("Chemin de bundle non autorisé.")
        if not isinstance(expected, str) or not SHA256.fullmatch(expected) or expected[7:] != rel[10:-5]:
            raise LightError("Empreinte de bundle invalide ou incohérente.")
        if key in seen or not all(isinstance(k, str) and k for k in key):
            raise LightError("Révisions dupliquées ou invalides.")
        seen.add(key)
        if not isinstance(size, int) or isinstance(size, bool) or size < 0 or size > 8 * 1024 * 1024:
            raise LightError("Taille de bundle invalide.")
        file = site / rel
        if not file.is_file() or file.is_symlink():
            raise LightError(f"Bundle manquant ou dangereux : {rel}")
        payload = file.read_bytes()
        if len(payload) != size or "sha256:" + hashlib.sha256(payload).hexdigest() != expected:
            raise LightError(f"Bundle altéré : {rel}")
        parsed = json.loads(payload)
        if parsed.get("format") != "konstellation.light-navigation/1.0" or parsed.get("semantic_authority") is not False:
            raise LightError(f"Données de navigation invalides : {rel}")
        permitted.add(rel)
    seen_files = set()
    for entry in site.rglob("*"):
        if entry.is_symlink():
            raise LightError("Lien symbolique interdit dans le site.")
        if entry.is_file():
            rel = entry.relative_to(site).as_posix()
            seen_files.add(rel)
            if rel not in permitted:
                raise LightError(f"Fichier non déclaré dans le site : {rel}")
    if seen_files != permitted:
        raise LightError(f"Fichiers attendus absents : {sorted(permitted - seen_files)}")
    return {"revisions": len(entries), "kristals": len({x['slug'] for x in entries}), "files": len(permitted)}


def build_public_collection(collection: Path, revision: str, *, append=False,
                            repository="", commit="", project: Path = ROOT) -> str:
    project = Path(project).resolve()
    collection = Path(collection).resolve()
    if not (collection / "kristals" / "index.json").is_file():
        raise LightError("Collection v10 invalide : kristals/index.json absent.")
    if not re.fullmatch(r"[A-Za-z0-9._-]{1,70}", revision):
        raise LightError("Révision invalide (1 à 70 caractères : lettres, chiffres, . _ -).")
    binary = shutil.which("node")
    if not binary:
        raise LightError("Node.js introuvable. Installer Node.js, puis relancer l'application.")
    command = [binary, str(project / "scripts" / "build-light.mjs"), "--collection", str(collection),
               "--out", str(site_dir(project)), "--public", "YES", "--revision", revision]
    if append:
        command += ["--append", "YES"]
    if repository or commit:
        if not repository or not commit:
            raise LightError("URL du dépôt GitHub et commit complet obligatoires ensemble.")
        command += ["--repository", repository, "--commit", commit]
    result = subprocess.run(command, cwd=project, capture_output=True, text=True,
                            encoding="utf-8", errors="replace", timeout=180)
    if result.returncode:
        raise LightError((result.stderr or result.stdout or "Échec du compilateur").strip()[-4500:])
    valid = validated_site(site_dir(project))
    return (result.stdout or "Build terminé").strip() + f"\n{valid['revisions']} révision(s) vérifiée(s)."


def export_site_zip(site: Path, destination: Path) -> Path:
    site = Path(site)
    validated_site(site)
    destination = Path(destination).resolve()
    if destination.is_dir():
        raise LightError("Choisir un fichier ZIP, pas un dossier.")
    destination.parent.mkdir(parents=True, exist_ok=True)
    if site.resolve() in destination.parents:
        raise LightError("Ne pas enregistrer le ZIP dans le dossier du site.")
    temp = destination.with_name(destination.name + ".part")
    try:
        with ZipFile(temp, "w", ZIP_DEFLATED, compresslevel=9) as z:
            for file in sorted((p for p in site.rglob("*") if p.is_file()), key=lambda p:p.relative_to(site).as_posix()):
                z.write(file, file.relative_to(site).as_posix())
            if z.testzip() is not None:
                raise LightError("Archive défectueuse.")
        os.replace(temp, destination)
    finally:
        temp.unlink(missing_ok=True)
    return destination


def prepare_checkout(site: Path, checkout: Path) -> Path:
    """Stages a static site at <checked-out Git repo>/docs/konstellation-light.

    Never runs git push/commit, never edits repository root docs/index.html.
    Existing Light folder is backed up outside the Git checkout.
    """
    site = Path(site).resolve()
    validated_site(site)
    checkout = Path(checkout).resolve()
    if checkout == site or checkout in site.parents or site in checkout.parents:
        raise LightError("Le dépôt cible ne peut pas contenir le dossier source (ni l'inverse).")
    if not checkout.is_dir() or not (checkout / ".git").exists():
        raise LightError("Sélectionner un dépôt Git local existant (.git requis).")
    docs = checkout / "docs"
    if docs.is_symlink():
        raise LightError("Dossier docs symbolique interdit.")
    docs.mkdir(exist_ok=True)
    output = docs / "konstellation-light"
    if output.is_symlink():
        raise LightError("Destination symbolique interdite.")
    stage = docs / (".konstellation-light-stage-" + uuid.uuid4().hex)
    backup = None
    try:
        shutil.copytree(site, stage, symlinks=False)
        validated_site(stage)
        if output.exists():
            backup_root = checkout.parent / ("." + checkout.name + "-Konstellation-Light-backups")
            backup_root.mkdir(parents=True, exist_ok=True)
            backup = backup_root / ("konstellation-light.backup-" + uuid.uuid4().hex[:10])
            output.rename(backup)
        try:
            stage.rename(output)
        except Exception:
            if backup is not None:
                backup.rename(output)
            raise
    finally:
        if stage.exists():
            shutil.rmtree(stage)
    return output


def generate_gitbook_note(url: str, target: Path) -> Path:
    parts = urlsplit(url.strip())
    if parts.scheme != "https" or not parts.netloc or parts.username or parts.password:
        raise LightError("Fournir une URL publique HTTPS du site Konstellation Light.")
    query = dict(parse_qsl(parts.query, keep_blank_values=True))
    query["embed"] = "1"
    embed_url = urlunsplit((parts.scheme, parts.netloc, parts.path, urlencode(query), ""))
    target = Path(target)
    target.parent.mkdir(parents=True, exist_ok=True)
    content = f"""# Intégration GitBook — Konstellation Light\n\nLien public (plein écran) : {url.strip()}\n\nLien d'intégration à coller dans un bloc GitBook **Embed** :\n\n{embed_url}\n\nExemple HTML pour une page qui autorise explicitement les iframes (GitBook peut filtrer le HTML brut) :\n\n```html\n<iframe src=\"{html.escape(embed_url, quote=True)}\" title=\"Konstellation Light\" loading=\"lazy\" width=\"100%\" height=\"520\"></iframe>\n```\n\nLe site doit déjà être publié. Vérifier les politiques CSP/frame-ancestors du site et de GitBook.\nNe jamais intégrer un corpus privé par ce mécanisme.\n"""
    target.write_text(content, encoding="utf-8")
    return target


class LocalSiteHandler(http.server.BaseHTTPRequestHandler):
    """Localhost-only static preview with symlinks/dotfiles/traversal blocked."""
    site_root: Path
    def do_GET(self): self._serve(head=False)
    def do_HEAD(self): self._serve(head=True)
    def _serve(self, *, head=False):
        raw = urlsplit(self.path).path
        decoded = unquote(raw)
        components = decoded.split("/")
        if "\\" in decoded or any(x in (".", "..") or x.startswith(".") for x in components if x):
            self.send_error(404); return
        if not raw.startswith("/"):
            self.send_error(404); return
        target = self.site_root.joinpath(*(x for x in components if x))
        if target.is_dir():
            target = target / "index.html"
        if not target.is_file() or target.is_symlink():
            self.send_error(404); return
        try:
            relative_parts = target.relative_to(self.site_root).parts
            if any((self.site_root.joinpath(*relative_parts[:i])).is_symlink() for i in range(1,len(relative_parts)+1)):
                self.send_error(404); return
        except ValueError:
            self.send_error(404); return
        payload = target.read_bytes()
        media = mimetypes.guess_type(target.name)[0] or "application/octet-stream"
        if target.suffix in {".js", ".json"}: media += "; charset=utf-8"
        self.send_response(200)
        self.send_header("Content-Type", media)
        self.send_header("Content-Length", str(len(payload)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        if not head:
            self.wfile.write(payload)
    def log_message(self, *args):
        pass


def start_preview(site: Path, port: int=4177):
    site = Path(site).resolve()
    validated_site(site)
    if port < 1024 or port > 65535:
        raise LightError("Port invalide.")
    handler = type("LightPreviewHandler", (LocalSiteHandler,), {"site_root": site})
    server = http.server.ThreadingHTTPServer(("127.0.0.1", port), handler)
    thread = threading.Thread(target=server.serve_forever, name="light-preview", daemon=True)
    thread.start()
    return server, f"http://127.0.0.1:{port}/"
