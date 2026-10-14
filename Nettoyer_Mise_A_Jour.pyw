#!/usr/bin/env pythonw
"""Interface de nettoyage *manuel* et réversible après extraction ZIP.

Aucune suppression silencieuse : les anciens fichiers reconnus sont sauvegardés
hors du dépôt, puis retirés seulement après sélection et confirmation.
"""
from pathlib import Path
import tkinter as tk
from tkinter import messagebox, ttk
from tools.cleanup_update import inspect, archive_legacy

ROOT = Path(__file__).resolve().parent


class CleanupApp(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title('Konstellation-Light — Nettoyage après mise à jour')
        self.geometry('860x425')
        self.minsize(710, 350)
        self.option_add('*Font', ('Segoe UI', 10))
        top = ttk.Frame(self, padding=16)
        top.pack(fill='both', expand=True)
        ttk.Label(top, text='Nettoyage sécurisé des anciens fichiers',
                  font=('Segoe UI', 15, 'bold')).pack(anchor='w')
        ttk.Label(top, text='Dossier du projet : ' + str(ROOT), wraplength=820).pack(anchor='w', pady=(7, 3))
        ttk.Label(top, text='L’outil ne traite que des anciens fichiers connus et identiques au snapshot. '
                  'Les fichiers personnels ou modifiés sont ignorés. Sauvegarde hors dépôt AVANT retrait.',
                  wraplength=800).pack(anchor='w', pady=(0, 14))
        self.listing = ttk.Treeview(top, columns=('path','status'), show='headings', selectmode='extended', height=7)
        self.listing.heading('path', text='Fichier historique')
        self.listing.heading('status', text='État')
        self.listing.column('path', width=470)
        self.listing.column('status', width=310)
        self.listing.pack(fill='both', expand=True)
        self.info = tk.StringVar(value='')
        ttk.Label(top, textvariable=self.info, wraplength=800).pack(anchor='w', pady=(10,5))
        actions = ttk.Frame(top)
        actions.pack(fill='x', pady=5)
        ttk.Button(actions, text='Actualiser / prévisualiser', command=self.refresh).pack(side='left', padx=(0,10))
        self.clean = ttk.Button(actions, text='Sauvegarder puis retirer la sélection', command=self.apply)
        self.clean.pack(side='left')
        ttk.Button(actions, text='Fermer', command=self.destroy).pack(side='right')
        self.refresh()

    def refresh(self):
        self.listing.delete(*self.listing.get_children())
        rows = inspect(ROOT)
        self.allowed = {row['path'] for row in rows if row['eligible']}
        for row in rows:
            self.listing.insert('', 'end', iid=row['path'], values=(row['path'], row['status']))
        self.info.set(f'{len(self.allowed)} ancien(s) fichier(s) retirables. Aucun traitement automatique.')
        self.clean.configure(state='normal' if self.allowed else 'disabled')

    def apply(self):
        selected = list(self.listing.selection())
        if not selected:
            messagebox.showinfo('Sélection', 'Sélectionne les fichiers à retirer.', parent=self)
            return
        if any(path not in self.allowed for path in selected):
            messagebox.showwarning('Fichier protégé', 'Une sélection n’est pas éligible. Actualise la liste.', parent=self)
            return
        if not messagebox.askyesno('Confirmer la migration',
            'Retirer du dossier du projet les fichiers sélectionnés ?\n\n' + '\n'.join(selected)
            + '\n\nUne copie vérifiée sera conservée à côté du dépôt. Aucun autre fichier ne sera touché.',
            parent=self):
            return
        try:
            backup = archive_legacy(ROOT, selected)
        except Exception as ex:
            messagebox.showerror('Migration interrompue', str(ex), parent=self)
            self.refresh()
            return
        self.refresh()
        messagebox.showinfo('Nettoyage terminé',
                            'Fichiers retirés du dépôt. Sauvegarde :\n' + str(backup), parent=self)


if __name__ == '__main__':
    CleanupApp().mainloop()
