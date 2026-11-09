@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  echo Node.js est requis pour construire Konstellation Light.
  pause
  exit /b 1
)
echo Konstellation Light - preparation des 126 Kristals publics
node "scripts\preparer-site-web-126.mjs"
if errorlevel 1 (
  echo.
  echo Echec de preparation. Aucun git add, commit, push ni Pages n'a ete lance.
  pause
  exit /b 1
)
echo.
echo Le site a ete prepare HORS du depot Git. AUCUN deploiement public.
echo Ouverture d'une previsualisation locale...
call "%~dp0PREVISUALISER_SITE_WEB_126.cmd"
echo.
echo Verification C4 : en attente de C1/C2/C3 avant publication Pages.
pause
