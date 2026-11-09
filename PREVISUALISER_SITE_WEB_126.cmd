@echo off
setlocal
cd /d "%~dp0"
set "PORT=4188"
echo Serveur local sur http://127.0.0.1:4188/ (Ctrl+C pour fermer).
start "" "http://127.0.0.1:4188/"
node "scripts\serve-light.mjs" "%LOCALAPPDATA%\Konstellation-Light\site-web-126-a-valider"
