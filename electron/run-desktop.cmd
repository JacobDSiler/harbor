@echo off
REM Harbor desktop - run the Electron app on this PC (installs packages the first time).
setlocal
cd /d "%~dp0"
if not exist node_modules (
  echo Installing packages (first run, a minute or two)...
  call npm install
  if errorlevel 1 ( echo npm install failed & pause & exit /b 1 )
)
call npm start
endlocal
