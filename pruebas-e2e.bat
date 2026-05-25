@echo off
title SIGECOP - Pruebas E2E
cd /d "%~dp0frontend"

:menu
cls
echo ==============================================
echo    SIGECOP - Pruebas E2E (Playwright)
echo ==============================================
echo.
echo   1. Ver en vivo (headed)  - el robot se mueve solo
echo   2. Paso a paso (debug)   - avanzas accion por accion
echo   3. Modo UI (interfaz visual con time-travel)
echo   4. Correr rapido (sin ventana, solo verificar)
echo   5. Abrir el ultimo reporte HTML
echo   6. Salir
echo.
set /p "opcion=Elige una opcion (1-6): "

if "%opcion%"=="1" goto headed
if "%opcion%"=="2" goto debug
if "%opcion%"=="3" goto ui
if "%opcion%"=="4" goto rapido
if "%opcion%"=="5" goto reporte
if "%opcion%"=="6" exit
goto menu

:headed
call npm run test:e2e:headed
pause
goto menu

:debug
call npm run test:e2e:debug
pause
goto menu

:ui
call npm run test:e2e:ui
goto menu

:rapido
call npm run test:e2e
pause
goto menu

:reporte
call npx playwright show-report
goto menu
