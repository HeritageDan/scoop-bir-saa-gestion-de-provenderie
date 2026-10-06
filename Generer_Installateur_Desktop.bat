@echo off
title COOPS BIR SAA - Generation du Package Desktop Standalone (.EXE)
color 0B
cd /d "%~dp0"

echo ======================================================================
echo    COOPS BIR SAA - GENERATION DU SETUP / INSTALLATEUR WINDOWS (.EXE)
echo ======================================================================
echo.

set "PATH=C:\Program Files\nodejs;%PATH%"

echo [1/3] Verification de Node.js et des dependances...
node -v >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERREUR] Node.js n'a pas ete detecte.
    pause
    exit /b 1
)

echo [2/3] Compilation des fichiers source (Vite Production Build)...
call npm.cmd run build
if %errorlevel% neq 0 (
    echo [ERREUR] Echec de la compilation Vite.
    pause
    exit /b 1
)

echo.
echo [3/3] Emballage du binaire Windows autonome (.exe portable / installable)...
echo       (Ce processus peut prendre de 1 a 2 minutes selon votre machine)
call npx.cmd electron-builder --win portable
if %errorlevel% neq 0 (
    echo [ERREUR] Echec de l'emballage electron-builder.
    pause
    exit /b 1
)

echo.
echo ======================================================================
echo   FELICITATIONS ! VOTRE APPLICATION STANDALONE EST PRETE !
echo.
echo   Le fichier executable autonome est disponible dans le dossier :
echo   %~dp0dist-electron\
echo.
echo   Cet executable (.exe) fonctionne sur N'IMPORTE QUELLE machine Windows,
echo   sans necessiter d'installation prealable de Node.js ou d'Internet !
echo ======================================================================
echo.
pause
