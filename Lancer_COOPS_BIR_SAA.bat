@echo off
title COOPS BIR SAA - Application de Caisse & Gestion
color 0A
cd /d "%~dp0"

echo ======================================================================
echo           COOPS BIR SAA - GESTION DE PROVENDERIE & CAISSE POS
echo ======================================================================
echo.
echo [1/3] Verification de l'environnement local...

rem Verifier si node est installe
where node >nul 2>nul
if %errorlevel% neq 0 (
    if exist "C:\Users\HP\AppData\Local\studio_app\app-1.14.0\resources\bin\node.exe" (
        set "PATH=C:\Users\HP\AppData\Local\studio_app\app-1.14.0\resources\bin;%PATH%"
    ) else (
        echo [ATTENTION] Node.js n'a pas ete detecte dans le PATH Windows standard.
        echo Si le lancement echoue, installez Node.js depuis https://nodejs.org
    )
)

rem Verifier les dependances
if not exist "node_modules" (
    echo.
    echo [2/3] Installation initiale des dependances (veuillez patienter)...
    call npm install
    if %errorlevel% neq 0 (
        echo.
        echo [ERREUR] Echec de npm install. Verifiez votre connexion Internet pour le premier lancement.
        pause
        exit /b 1
    )
)

echo.
echo [2/3] Demarrage du serveur local hors-ligne (Port 3000)...
start /b cmd /c "npm run dev"

echo.
echo [3/3] Lancement de COOPS BIR SAA en mode Bureau autonome...
timeout /t 3 >nul

rem Tenter le lancement en fenetre application sans barre de navigateur (Edge ou Chrome)
start msedge --app="http://localhost:3000" 2>nul || start chrome --app="http://localhost:3000" 2>nul || start http://localhost:3000

echo.
echo ======================================================================
echo   Application demarree avec succes !
echo   - Mode Hors-Ligne actif
echo   - Base locale IndexedDB prete
echo   - Impression thermique 58/80 mm prete
echo ======================================================================
echo (Vous pouvez minimiser cette fenetre pendant l'utilisation)
echo.
