@echo off
title Installation Raccourci Bureau - SCOOPS BIR SAA
color 0A
cd /d "%~dp0"

echo ======================================================================
echo       CREATION DU RACCOURCI BUREAU - SCOOPS BIR SAA
echo ======================================================================
echo.

set "TARGET=%~dp0Lancer_SCOOPS_BIR_SAA.bat"
set "ICON=%~dp0public\assets\app_icon.ico"
set "DESKTOP=%USERPROFILE%\Desktop"

powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut([System.IO.Path]::Combine([Environment]::GetFolderPath('Desktop'), 'SCOOPS BIR SAA.lnk')); $s.TargetPath = '%TARGET%'; $s.WorkingDirectory = '%~dp0'; if (Test-Path '%ICON%') { $s.IconLocation = '%ICON%,0' }; $s.Description = 'SCOOPS BIR SAA - Gestion de Provenderie & Caisse POS'; $s.Save()"

rem Nettoyer l'ancien raccourci s'il existait
if exist "%DESKTOP%\COOPS BIR SAA.lnk" (
    del /f /q "%DESKTOP%\COOPS BIR SAA.lnk" >nul 2>&1
)
if exist "%DESKTOP%\COOPS BIR SAA — Gestion de Provenderie & Caisse POS.lnk" (
    del /f /q "%DESKTOP%\COOPS BIR SAA — Gestion de Provenderie & Caisse POS.lnk" >nul 2>&1
)

if %errorlevel% equ 0 (
    echo [OK] Le raccourci 'SCOOPS BIR SAA' a ete cree avec succes sur votre Bureau avec la nouvelle icone !
    echo Vous pouvez desormais lancer l'application directement depuis votre Bureau.
) else (
    echo [ERREUR] Impossible de creer le raccourci automatiquement.
)

echo.
pause
