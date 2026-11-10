@echo off
setlocal
cd /d "%~dp0"
echo KONSTELLATION - APERCU LOCAL DES DEFINITIONS CANDIDATES
echo 126 Kristals si tous lisibles. Zero GitHub, zero Ollama.
echo.
where py >nul 2>nul
if not errorlevel 1 goto utiliser_py
python "%~dp0preparer_apercu.py" --serve
goto fin
:utiliser_py
py -3 "%~dp0preparer_apercu.py" --serve
:fin
if errorlevel 1 (
  echo.
  echo Echec de preparation : voir le message ci-dessus.
)
pause
