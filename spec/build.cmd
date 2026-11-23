@echo off
setlocal
set "MIKTEX=%LOCALAPPDATA%\Programs\MiKTeX\miktex\bin\x64"
set "PATH=%SystemRoot%\System32;%MIKTEX%"
cd /d "%~dp0"
xelatex -interaction=nonstopmode -halt-on-error spec.tex >nul
xelatex -interaction=nonstopmode -halt-on-error spec.tex >nul
if errorlevel 1 (
  echo Build failed. Last lines of the log:
  "%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -Command "Get-Content spec.log -Tail 30"
  pause
  exit /b 1
)
echo Built spec.pdf
start "" spec.pdf
pause
