@echo off
rem GAMBLE launcher. Double-click to play.
rem Each run fetches the latest game from main (download only, sends nothing),
rem keeps the copy in this folder when offline, then opens it in the default browser.
setlocal
pushd "%~dp0"

set "GAME=gamble.html"
set "NEW=gamble.download"
set "SRC=https://raw.githubusercontent.com/dudwlstjr3-maker/gamble/main/index.html"

echo Checking for the latest version...
if exist "%NEW%" del /q "%NEW%"
curl.exe -fsSL --connect-timeout 5 --max-time 30 -o "%NEW%" "%SRC%" >nul 2>&1 && findstr /l /c:"gamble-v1" "%NEW%" >nul 2>&1 && move /y "%NEW%" "%GAME%" >nul
if exist "%NEW%" del /q "%NEW%"

if not exist "%GAME%" if exist "..\index.html" copy /y "..\index.html" "%GAME%" >nul

if not exist "%GAME%" (
  echo.
  echo Game file not found. Connect to the internet and run start.bat again.
  pause
  popd
  exit /b 1
)

start "" "%CD%\%GAME%"
popd
endlocal
