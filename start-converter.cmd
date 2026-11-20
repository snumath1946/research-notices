@echo off
setlocal EnableExtensions
pushd "%~dp0"
if errorlevel 1 exit /b 1
where node >nul 2>&1
if errorlevel 1 (
  echo Install the LTS version of Node.js from https://nodejs.org/ and run this file again.
  if not "%~1"=="--check" pause
  popd
  exit /b 1
)
node "scripts\start-converter.mjs" %*
set "converter_exit=%errorlevel%"
if not "%converter_exit%"=="0" if not "%~1"=="--check" pause
popd
exit /b %converter_exit%
