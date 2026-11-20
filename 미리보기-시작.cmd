@echo off
cd /d "%~dp0"
where /q node
if %errorlevel%==0 (
  set "RESEARCH_NODE=node"
) else (
  set "RESEARCH_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
)
if not exist "%RESEARCH_NODE%" if not "%RESEARCH_NODE%"=="node" (
  echo Node.js is required to run this preview.
  pause
  exit /b 1
)
start "" "http://127.0.0.1:4173/admin.html"
"%RESEARCH_NODE%" scripts\serve.cjs
pause
