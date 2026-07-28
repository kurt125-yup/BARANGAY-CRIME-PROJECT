@echo off
setlocal EnableExtensions

rem ===========================================================================
rem  BARANGAY-CRIME-PROJECT launcher
rem
rem  Double-click this file to start the website. It will:
rem    1. verify Node.js is installed
rem    2. install npm dependencies if node_modules is missing
rem    3. create .env from .env.example on a fresh clone
rem    4. create + seed the MySQL database if it is not ready yet
rem    5. start the server and open the site in your browser
rem
rem  Closing this window stops the server.
rem ===========================================================================

cd /d "%~dp0"
title Barangay 179 Crime Project - Server

echo ===========================================================
echo  BARANGAY 179 - CRIME RECORD MANAGEMENT
echo ===========================================================
echo.

rem --- 1. Node.js -----------------------------------------------------------
where node >nul 2>&1
if errorlevel 1 (
    echo [X] Node.js was not found on this machine.
    echo     Install the LTS build from https://nodejs.org and run this file again.
    goto :fail
)
for /f "delims=" %%v in ('node --version') do set "NODE_VERSION=%%v"
echo [1/5] Node.js %NODE_VERSION%

rem --- 2. Dependencies ------------------------------------------------------
if not exist "node_modules\" (
    echo [2/5] Installing dependencies ^(first run, this takes a moment^)...
    call npm install --no-fund --no-audit
    if errorlevel 1 (
        echo [X] npm install failed.
        goto :fail
    )
) else (
    echo [2/5] Dependencies already installed
)

rem --- 3. Environment file --------------------------------------------------
if not exist ".env" (
    if exist ".env.example" (
        copy /y ".env.example" ".env" >nul
        echo [3/5] Created .env from .env.example
        echo.
        echo     ^>^> Open .env and set DB_PASSWORD to your MySQL password,
        echo        then run this file again.
        goto :fail
    ) else (
        echo [X] No .env and no .env.example to copy from.
        goto :fail
    )
) else (
    echo [3/5] Using existing .env
)

rem --- 4. Database ----------------------------------------------------------
echo [4/5] Checking MySQL...
node server\scripts\ready.js
set "DB_STATE=%errorlevel%"

if "%DB_STATE%"=="4" (
    echo.
    echo [X] Could not reach MySQL.
    echo     - Is the MySQL service running? ^(services.msc -^> MySQL80^)
    echo     - Do DB_PORT / DB_USER / DB_PASSWORD in .env match your server?
    goto :fail
)

if "%DB_STATE%"=="2" (
    echo     Setting up the database...
    call npm run db:setup
    if errorlevel 1 goto :dbfail
    call npm run db:seed
    if errorlevel 1 goto :dbfail
)

if "%DB_STATE%"=="3" (
    echo     Database is empty, loading test data...
    call npm run db:seed
    if errorlevel 1 goto :dbfail
)

rem --- 5. Serve -------------------------------------------------------------
echo [5/5] Starting server...
echo.
echo ===========================================================
echo  Website:  http://localhost:4000
echo  Login:    admin / admin123
echo.
echo  Close this window or press Ctrl+C to stop the server.
echo ===========================================================
echo.

rem Opens the browser once /api/health answers, without blocking the server.
start "" /b node server\scripts\open-browser.js

call npm start

echo.
echo Server stopped.
pause
exit /b 0

:dbfail
echo.
echo [X] Database setup failed - see the messages above.

:fail
echo.
pause
exit /b 1
