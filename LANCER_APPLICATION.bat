@echo off
title Les Gourmandises de Ange Noel - Business Manager POS
chcp 65001 >nul
cls
echo ======================================================================
echo    LES GOURMANDISES DE ANGE NOEL - BUSINESS MANAGER & CAISSE POS
echo ======================================================================
echo.
echo Lancement du serveur et de l'application...
echo.

python serveur.py
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [INFO] Python n'est pas installe ou pas dans le PATH.
    echo Ouverture directe de index.html dans le navigateur...
    start index.html
)
pause
