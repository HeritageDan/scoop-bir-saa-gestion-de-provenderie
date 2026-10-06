@echo off
title COOPS BIR SAA - Application de Caisse POS & Gestion
color 0A
cd /d "%~dp0"

echo ======================================================================
echo           COOPS BIR SAA - GESTION DE PROVENDERIE & CAISSE POS
echo ======================================================================
echo.

rem 1. Configurer le PATH pour Node.js et npm
set "PATH=C:\Program Files\nodejs;%PATH%"

echo [1/3] Verification de l'environnement systeme...
where node >nul 2>nul
if %errorlevel% neq 0 (
    if exist "C:\Program Files\nodejs\node.exe" (
        set "PATH=C:\Program Files\nodejs;%PATH%"
    ) else (
        echo [ERREUR] Node.js n'a pas ete detecte.
        echo Veuillez verifier que Node.js est installe dans C:\Program Files\nodejs.
        pause
        exit /b 1
    )
)
echo [OK] Moteur d'execution detecte.

rem 2. Verifier si les dependances sont installees
if not exist "node_modules" (
    echo [INFO] Premier lancement detecte: installation des composants...
    call npm.cmd install
    if %errorlevel% neq 0 (
        echo [ERREUR] Echec de l'installation des dependances.
        pause
        exit /b 1
    )
)

echo.
echo [2/3] Verification du serveur local de caisse...

rem Verifier si le serveur Vite tourne deja sur le port 3000
netstat -ano | findstr ":3000" >nul
if %errorlevel% neq 0 (
    echo [INFO] Lancement du serveur local COOPS BIR SAA...
    start /min "COOPS-BIR-SERVER" cmd /c "npm.cmd run dev"
    timeout /t 3 >nul
) else (
    echo [OK] Serveur local deja actif et pret sur le port 3000.
)

echo.
echo [3/3] Lancement de l'application en mode Bureau natif...

set BROWSER_FOUND=0

rem Tester Microsoft Edge (Standard Windows 10/11)
if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" (
    start "" "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --app="http://localhost:3000"
    set BROWSER_FOUND=1
) else if exist "C:\Program Files\Microsoft\Edge\Application\msedge.exe" (
    start "" "C:\Program Files\Microsoft\Edge\Application\msedge.exe" --app="http://localhost:3000"
    set BROWSER_FOUND=1
)

rem Tester Google Chrome si Edge n'a pas ete trouve
if %BROWSER_FOUND% equ 0 (
    if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
        start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --app="http://localhost:3000"
        set BROWSER_FOUND=1
    ) else if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" (
        start "" "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" --app="http://localhost:3000"
        set BROWSER_FOUND=1
    )
)

rem Navigateur par defaut en dernier recours
if %BROWSER_FOUND% equ 0 (
    start http://localhost:3000
)

echo.
echo ======================================================================
echo   COOPS BIR SAA est maintenant ouvert et pret a l'emploi !
echo.
echo   * Identifiant Unique par Defaut : dev@coopsbir.com
echo   * Mot de passe : devpassword2026
echo   * Mode Hors-Ligne (Offline First) : Actif
echo   * Caisse POS & Tickets Thermiques (58mm / 80mm) : Operationnels
echo.
echo   [ASTUCE] Pour installer l'icone permanente sur votre Bureau :
echo   Dans la fenetre de l'application, cliquez sur l'icone
echo   'Installer l'application' dans la barre de titre (ou menu ... ^> Installer).
echo ======================================================================
echo.
timeout /t 5 >nul
exit /b 0
