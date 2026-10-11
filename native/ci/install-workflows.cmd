@echo off
REM Harbor - one-time: copy the CI build workflows into .github\workflows (Android now; desktop optional).
REM Then tick the canary / run push.cmd and the builds start on GitHub.
setlocal
set "REPO=%~dp0..\.."
if not exist "%REPO%\.github\workflows" mkdir "%REPO%\.github\workflows"
copy /Y "%~dp0build-android.yml" "%REPO%\.github\workflows\build-android.yml"
if exist "%REPO%\electron\ci\build-desktop.yml" (
  choice /M "Also install the optional Windows desktop (Electron) build"
  if not errorlevel 2 copy /Y "%REPO%\electron\ci\build-desktop.yml" "%REPO%\.github\workflows\build-desktop.yml"
)
echo.
echo Done. Now run push.cmd (or tick the canary if the watcher is running).
pause
endlocal
