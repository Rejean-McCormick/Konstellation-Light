@echo off
setlocal
if not exist "%LOCALAPPDATA%\Konstellation-Light\A_DEPOSER_ICI_RAPPORT_PRODUCTION_VISUELLE.zip" (
  echo Aucun rapport cree. Lancez d'abord LANCER_APERCU_CUMULATIF.cmd
  pause
  exit /b 1
)
explorer.exe /select,"%LOCALAPPDATA%\Konstellation-Light\A_DEPOSER_ICI_RAPPORT_PRODUCTION_VISUELLE.zip"
