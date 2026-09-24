@echo off
setlocal

echo ===============================
echo   ChatDiWa Launcher
echo ===============================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 goto :node_missing
goto :run

:node_missing
echo Node.js was not found on this computer. ChatDiWa needs it to run.
echo.
choice /C YN /M "Try to install Node.js automatically now"
if errorlevel 2 goto :manual_install
if errorlevel 1 goto :auto_install
goto :manual_install

:auto_install
where winget >nul 2>nul
if %errorlevel% neq 0 (
  echo winget was not found on this computer, so automatic install is not possible.
  goto :manual_install
)
echo.
echo Installing Node.js via winget...
winget install -e --id OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements
if %errorlevel% neq 0 (
  echo The automatic install did not succeed.
  goto :manual_install
)
echo.
echo Node.js has been installed.
echo Please close this window and double-click run.bat again.
echo (A new window is needed so it picks up the newly installed "node" command.)
pause
exit /b

:manual_install
echo.
echo Please install Node.js yourself (choose the LTS version) from the page that just opened.
start https://nodejs.org
echo Once it's installed, double-click this run.bat file again.
pause
exit /b

:run
echo Node.js found. Starting ChatDiWa (always fetches the latest version from GitHub)...
echo npm may ask "Ok to proceed? (y)" the first time on this download - type y and press Enter.
echo.
call npx github:Babyferret/chatdiwa
echo.
echo ChatDiWa has stopped.
pause
