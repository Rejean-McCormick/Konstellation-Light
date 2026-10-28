# Konstellation Light — explore Ekole with a double-click (v0.3)

## For you — no terminal required

1. **Close** the old `Previsualiser-Light.pyw` if open.
2. **Back up** `C:\mycode\Konstellation\Konstellation-Light` and extract the v0.3 ZIP into it. Do not extract it into Ekole.
3. Double-click **`Explorer-Ekole-Autochtones.pyw`**.
4. The program searches `C:\mycode\Ekole` (or the directory next to Konstellation), then **automatically builds and opens** the standalone Kristal map.
5. If Ekole is not found, click **Browse** and select the **root Ekole directory**, not the JSON file.

The original **`Previsualiser-Light.pyw` still works**: choose the **“Ekole · Graphe” (Ekole · Graph)** tab and click **“Créer / actualiser et OUVRIR le graphe” (Create/update and OPEN graph)**. `Previsualiser-Ekole.pyw` directly opens this tab, without automatic preparation until you click.

The **3–25 bubbles** slider, recentering, and Back/Home buttons remain as in Light v0.2.

## What is automated

- Detects `kristals/societes-autochtones-quebec/canon/domain/encyclopedie-v4.json`.
- Validates the path and runs **Node.js locally**: semantic projection followed by static site build. No commands to type.
- Stores output under `previews/ekole-autochtones-local/<fingerprint>/`; subsequent launches reuse it as long as the Kristal and code remain unchanged.
- The program **never deletes** an existing or modified projection and does not alter Kristal files.
- Starts an HTTP server **bound to 127.0.0.1 only** (port 4177, then 4178 and up if needed) and opens the browser.
- Displays a **local candidate preview, not published v10** notice.

**Requirements:** Windows, Python 3.10+ with tkinter (Konstellation Light `.pyw` launchers), and installed **Node.js**. Internet access is not required.

The server stays available while the launcher window is open. Closing the window stops its server; relaunching reopens the same cached data.

## Optional — add to Ekole Student

In the Ekole tab, after **reviewing and approving content intended for students**, check the confirmation box and click **“Copier le site dans Ekole (sans rien écraser)” (Copy site into Ekole)**. The static site is copied into `Ekole/site/eleve/konstellation` **only if the directory does not exist**. No automatic replacement or changes to Kristals or courses. Start Ekole separately on port 8765 and open:

`http://127.0.0.1:8765/eleve/konstellation/`

**Warning:** installing on the Ekole server may expose content on a local network. A candidate projection does not become culturally or historically approved simply because it can be browsed. For an entire school, use an isolated Student export rather than the Core server.

## Troubleshooting

- **Node.js not found:** install Node.js, then reopen the `.pyw`.
- **Ekole directory not found:** manually select `C:\mycode\Ekole` (root containing `kristals`).
- **Destination already exists:** the system protects your data. Move the old output directory to keep a backup; there is no forced overwrite.
- **Window open, nothing in browser:** check the log below, then enter `http://127.0.0.1:4177/` or the indicated port.
- **Old Previsualiser already running:** this is not blocking; the map chooses another free port.

## Validation tests

```powershell
py -3 -m unittest discover -s tests -p "test*.py" -v
node --test tests/*.test.mjs
```

The `.pyw` uses both v0.2 compilers; the bubble slider and rendering engine are not replaced.
