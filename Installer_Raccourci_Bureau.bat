@echo off
title Installation Raccourci Bureau - COOPS BIR SAA
color 0A
cd /d "%~dp0"

echo ======================================================================
echo       CREATION DU RACCOURCI BUREAU - COOPS BIR SAA
echo ======================================================================
echo.

set "TARGET=%~dp0Lancer_COOPS_BIR_SAA.bat"
set "ICON=%~dp0public\assets\icon-192.png"
set "DESKTOP=%USERPROFILE%\Desktop"

powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut([System.IO.Path]::Combine([Environment]::GetFolderPath('Desktop'), 'COOPS BIR SAA.lnk')); $s.TargetPath = '%TARGET%'; $s.WorkingDirectory = '%~dp0'; $s.Description = 'COOPS BIR SAA - Gestion de Provenderie & Caisse POS'; $s.Save()"

if %errorlevel% equ 0 (
    echo [OK] Le raccourci 'COOPS BIR SAA' a ete cree avec succes sur votre Bureau !
    echo Vous pouvez desormais lancer l'application directement depuis votre Bureau.
) else (
    echo [ERREUR] Impossible de creer le raccourci automatiquement.
)

echo.
pause
