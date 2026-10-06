@echo off
title COOPS BIR SAA - Application de Caisse & Gestion
color 0A
cd /d "%~dp0"

echo ======================================================================
echo           COOPS BIR SAA - GESTION DE PROVENDERIE & CAISSE POS
echo ======================================================================
echo.

rem Configurer le PATH pour Node.js et npm
set "PATH=C:\Program Files\nodejs;%PATH%"

echo [1/3] Verification de l'environnement Node.js...
node -v >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERREUR] Node.js n'a pas ete trouve dans C:\Program Files\nodejs.
    echo Veuillez verifier que Node.js est installe.
    pause
    exit /b 1
)

echo [OK] Node.js detecte.

rem Verifier si les dependances sont installees
if not exist "node_modules" (
    echo [2/3] Installation des dependances (premier lancement uniquement)...
    call npm.cmd install
    if %errorlevel% neq 0 (
        echo [ERREUR] Echec de npm install.
        pause
        exit /b 1
    )
)

echo.
echo [2/3] Demarrage du serveur local COOPS BIR SAA...

rem Verifier si le port 3000 est deja actif
netstat -ano | findstr :3000 | findstr LISTENING >nul
if %errorlevel% neq 0 (
    start /b "" npm.cmd run dev
    timeout /t 3 >nul
) else (
    echo [OK] Le serveur local est deja en cours d'execution sur le port 3000.
)

echo.
echo [3/3] Ouverture de l'application COOPS BIR SAA en mode Bureau...
start msedge --app="http://localhost:3000" 2>nul || start chrome --app="http://localhost:3000" 2>nul || start http://localhost:3000

echo.
echo ======================================================================
echo   COOPS BIR SAA est maintenant ouvert et pret a l'emploi !
echo.
echo   * URL Locale : http://localhost:3000
echo   * Mode Hors-Ligne (Offline First) : Actif
echo   * Impression Thermique POS (58 mm / 80 mm) : Prete
echo.
echo   [ASTUCE] Pour installer l'icone sur votre Bureau et Barre des taches:
echo   Dans la fenetre ouverte, cliquez sur l'icone 'Installer'
echo   dans la barre superieure (ou menu ... ^> Applications ^> Installer).
echo ======================================================================
echo.
echo (Laissez cette fenetre ouverte ou reduisez-la pendant que vous travaillez)
echo Appuyez sur une touche pour fermer cette fenetre...
pause >nul
