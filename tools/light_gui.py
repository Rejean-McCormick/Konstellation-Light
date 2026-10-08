"""Graphical launchers for Windows: no shell window and no pip dependencies."""
from __future__ import annotations

from pathlib import Path
import subprocess
import threading
import tkinter as tk
from tkinter import ttk, filedialog, messagebox, scrolledtext
import webbrowser
from tools.light_core import (ROOT, LightError, build_public_collection, site_dir, validated_site,
                              start_preview, export_site_zip, prepare_checkout, generate_gitbook_note)


class Console(tk.Tk):
    def __init__(self, initial="welcome"):
        super().__init__()
        self.title("Konstellation Light — Outils de déploiement")
        self.geometry("815x660")
        self.minsize(700, 580)
        self.option_add("*Font", ("Segoe UI", 10))
        self.preview_server = None
        self.collection = tk.StringVar(value="")
        self.revision = tk.StringVar(value="public-v1")
        self.append = tk.BooleanVar(value=False)
        self.intent = tk.BooleanVar(value=False)
        self.repository = tk.StringVar(value="")
        self.commit = tk.StringVar(value="")
        self.checkout = tk.StringVar(value="")
        self.public_url = tk.StringVar(value="")
        self.tabs = ttk.Notebook(self)
        self.tabs.pack(fill="both", expand=True, padx=12, pady=12)
        self._make_welcome()
        self._make_build()
        self._make_preview()
        self._make_deploy()
        self._make_gitbook()
        self.log = scrolledtext.ScrolledText(self, height=7, font=("Consolas", 9), wrap="word")
        self.log.pack(fill="x", padx=12, pady=(0,10))
        self._write("Projet: " + str(ROOT))
        pages = {"welcome":0,"build":1,"preview":2,"deploy":3,"gitbook":4}
        self.tabs.select(pages.get(initial,0))
        self.protocol("WM_DELETE_WINDOW", self._close)

    def _write(self, s):
        self.log.insert("end", str(s) + "\n")
        self.log.see("end")

    def _worker(self, title, fn):
        self._write("▶ " + title)
        def work():
            try:
                result=fn()
                self.after(0, lambda: self._finish(True,title,str(result)))
            except Exception as exc:
                self.after(0, lambda: self._finish(False,title,str(exc)))
        threading.Thread(target=work,daemon=True).start()

    def _finish(self, ok, title, msg):
        self._write(("✓ " if ok else "✖ ") + msg)
        if ok: messagebox.showinfo(title, msg)
        else: messagebox.showerror(title, msg)

    def _frame(self, name, description):
        frame=ttk.Frame(self.tabs, padding=20)
        self.tabs.add(frame,text=name)
        ttk.Label(frame,text=name,font=("Segoe UI",17,"bold")).pack(anchor="w",pady=(0,9))
        ttk.Label(frame,text=description,wraplength=650,justify="left").pack(anchor="w",pady=(0,16))
        return frame

    def _field(self, parent, title, var, browse=None):
        ttk.Label(parent,text=title).pack(anchor="w",pady=(5,2))
        line=ttk.Frame(parent);line.pack(fill="x",pady=(0,4))
        ttk.Entry(line,textvariable=var).pack(side="left",fill="x",expand=True)
        if browse:ttk.Button(line,text="Parcourir...",command=browse).pack(side="left",padx=(8,0))

    def _make_welcome(self):
        f=self._frame("Accueil", "Site Light autonome — lecture de surfaces Kristal v10, sans serveur de production.")
        ttk.Label(f,text="Destination Windows prévue :",font=("Segoe UI",10,"bold")).pack(anchor="w")
        ttk.Label(f,text=r"C:\mycode\Konstellation\Konstellation-Light",font=("Consolas",11)).pack(anchor="w",pady=8)
        for line in ["1. Prévisualiser : ouvre le site de démonstration en local.",
                     "2. Construire : sélectionne une collection publique v10 vérifiée (Node.js requis).",
                     "3. Déployer : exporte un ZIP ou prépare un dépôt Git local sous docs/konstellation-light.",
                     "4. GitBook : génère un lien d'intégration vers une URL déjà publique."]:
            ttk.Label(f,text=line,wraplength=650).pack(anchor="w",pady=6)
        ttk.Label(f,text="Aucun outil ne pousse de code sur GitHub, n'active un Kristal, ni ne publie secrètement une collection privée.",
                  foreground="#905a20",wraplength=650).pack(anchor="w",pady=20)
        ttk.Button(f,text="Ouvrir le guide d'installation",command=lambda: self._open_file(ROOT/'README.md')).pack(anchor="w")

    def _make_build(self):
        f=self._frame("Construire", "Compiler une collection synchronisée au format Kristal v10 en bundle de navigation statique.")
        self._field(f,"Dossier de collection (contient kristals/index.json)",self.collection,lambda:self._folder(self.collection))
        self._field(f,"Libellé de révision",self.revision)
        self._field(f,"URL GitHub de la collection (optionnel)",self.repository)
        self._field(f,"SHA complet du commit GitHub (optionnel, avec URL)",self.commit)
        ttk.Checkbutton(f,text="Conserver les révisions déjà présentes",variable=self.append).pack(anchor="w",pady=7)
        ttk.Checkbutton(f,text="Je confirme que les fichiers de cette collection peuvent être diffusés PUBLICEMENT.",
                        variable=self.intent).pack(anchor="w",pady=9)
        ttk.Button(f,text="Compiler et vérifier",command=self._build).pack(anchor="w",pady=7)

    def _make_preview(self):
        f=self._frame("Prévisualiser", "Ouvrir le site statique en local. Aucun serveur Node.js requis pour la prévisualisation.")
        ttk.Label(f,text="Site : light/site",font=("Consolas",11)).pack(anchor="w",pady=12)
        ttk.Button(f,text="Ouvrir Konstellation Light",command=self._preview).pack(anchor="w",pady=12)
        ttk.Button(f,text="Vérifier les bundles statiques",command=lambda:self._worker("Vérification du site",lambda: validated_site(site_dir(ROOT)))).pack(anchor="w",pady=5)
        ttk.Label(f,text="La prévisualisation écoute uniquement sur 127.0.0.1:4177.").pack(anchor="w",pady=14)

    def _make_deploy(self):
        f=self._frame("Déployer", "Deux méthodes : ZIP statique pour un hébergeur ou copie contrôlée dans un dépôt Git local.")
        ttk.Button(f,text="Exporter un ZIP du site",command=self._export).pack(anchor="w",pady=10)
        ttk.Separator(f,orient="horizontal").pack(fill="x",pady=16)
        self._field(f,"Dépôt Git local (dossier contenant .git)",self.checkout,lambda:self._folder(self.checkout))
        ttk.Label(f,text="Cible : docs/konstellation-light/ ; sauvegarde HORS du dépôt Git.",wraplength=650).pack(anchor="w",pady=7)
        ttk.Button(f,text="Préparer GitHub Pages dans ce dépôt",command=self._deploy).pack(anchor="w",pady=8)
        ttk.Label(f,text="Aucune commande git commit/push ; tu gardes le contrôle sur la publication publique.",wraplength=650).pack(anchor="w",pady=8)

    def _make_gitbook(self):
        f=self._frame("GitBook", "Créer des liens publics et un exemple d'iframe pour GitBook ou une autre documentation.")
        self._field(f,"URL HTTPS du site déjà déployé",self.public_url)
        ttk.Button(f,text="Créer la fiche GitBook",command=self._gitbook).pack(anchor="w",pady=9)
        ttk.Label(f,text="GitBook peut imposer ses règles de CSP ou refuser du HTML brut. Utiliser si possible son bloc Embed/Webframe.",
                  wraplength=650).pack(anchor="w",pady=12)

    def _folder(self,var):
        chosen=filedialog.askdirectory(parent=self)
        if chosen:var.set(chosen)

    def _open_file(self,file):
        import os
        try:os.startfile(str(file))
        except Exception:messagebox.showinfo("Fichier",str(file))

    def _build(self):
        if not self.intent.get():
            messagebox.showwarning("Publication publique", "Cocher explicitement la confirmation PUBLIC avant la compilation.")
            return
        collection=self.collection.get(); revision=self.revision.get()
        append=self.append.get(); repository=self.repository.get().strip(); commit=self.commit.get().strip()
        if not messagebox.askyesno("Export PUBLIC", "Les bundles produits pourront être publiés sur un site accessible à tous. Continuer ?"):
            return
        self._worker("Compilation Kristal v10",lambda:build_public_collection(Path(collection),revision,append=append,repository=repository,commit=commit))

    def _preview(self):
        try:
            if self.preview_server is None:
                self.preview_server,url=start_preview(site_dir(ROOT))
            else:url="http://127.0.0.1:4177/"
            self._write("Prévisualisation : " + url)
            webbrowser.open(url)
        except Exception as exc:
            messagebox.showerror("Prévisualisation impossible",str(exc))

    def _export(self):
        dest=filedialog.asksaveasfilename(defaultextension=".zip",filetypes=[("ZIP","*.zip")],
                 initialfile="Konstellation-Light-Site-Public.zip")
        if dest:self._worker("Export statique",lambda:export_site_zip(site_dir(ROOT),Path(dest)))

    def _deploy(self):
        selected=self.checkout.get().strip()
        if not selected:messagebox.showerror("Dépôt requis","Choisir un dépôt Git local.");return
        if not messagebox.askyesno("Préparer GitHub Pages", "Copier le site dans docs/konstellation-light du dépôt sélectionné ? Une version existante sera sauvegardée. Aucun push automatique."):
            return
        self._worker("Copie vers Git local",lambda:prepare_checkout(site_dir(ROOT),Path(selected)))

    def _gitbook(self):
        url=self.public_url.get().strip()
        self._worker("Fiche GitBook",lambda:generate_gitbook_note(url,ROOT/'exports'/'GitBook-Embed.md'))

    def _close(self):
        if self.preview_server is not None:
            self.preview_server.shutdown();self.preview_server.server_close()
        self.destroy()


def main(initial="welcome"):
    try:Console(initial).mainloop()
    except Exception as exc:
        root=tk.Tk();root.withdraw();messagebox.showerror("Konstellation Light",str(exc));root.destroy()
