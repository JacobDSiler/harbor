@echo off
REM Harbor desktop - build the Windows installer + portable exe locally into electron\dist.
REM (GitHub Actions does this for you on every push that touches electron\; this is for a local build.)
setlocal
cd /d "%~dp0"
call npm install
if errorlevel 1 ( echo npm install failed & pause & exit /b 1 )
call npm run dist
echo.
echo Done. Look in %~dp0dist
pause
endlocal
