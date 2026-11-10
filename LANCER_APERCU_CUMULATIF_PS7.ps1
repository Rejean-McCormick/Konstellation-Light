# Windows PowerShell 7 option: .\LANCER_APERCU_CUMULATIF_PS7.ps1
$ErrorActionPreference='Stop'
Set-Location -LiteralPath $PSScriptRoot
$python = if (Get-Command py -ErrorAction SilentlyContinue) { 'py' } else { 'python' }
if ($python -eq 'py') { & py -3 (Join-Path $PSScriptRoot 'preparer_apercu.py') --serve }
else { & python (Join-Path $PSScriptRoot 'preparer_apercu.py') --serve }
if ($LASTEXITCODE -ne 0) { throw 'Preparation de l apercu interrompue. Voir le diagnostic ci-dessus.' }
