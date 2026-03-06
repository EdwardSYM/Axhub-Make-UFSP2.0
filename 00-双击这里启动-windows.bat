@echo off
setlocal EnableExtensions

cd /d "%~dp0"
if errorlevel 1 goto :fail_cd

where node >nul 2>nul
if errorlevel 1 goto :fail_node

node "%~dp0scripts\windows-start.mjs"
set "EXIT_CODE=%ERRORLEVEL%"
if not "%EXIT_CODE%"=="0" goto :pause_fail

exit /b 0

:fail_cd
echo Cannot enter project directory. Please right-click and open with Terminal, then retry.
set "EXIT_CODE=1"
goto :pause_fail

:fail_node
echo Node.js is not found in PATH. Please install Node.js LTS and reopen terminal.
set "EXIT_CODE=1"
goto :pause_fail

:pause_fail
echo.
echo Start failed. Press any key to close this window.
pause >nul
exit /b %EXIT_CODE%
