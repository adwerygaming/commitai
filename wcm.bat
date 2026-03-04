@echo off
set "ORIGINAL_CALL_DIR=%CD%"

cd /d "C:\Devan\Programming\commitai" || exit /b 1

set "CALL_FROM=%ORIGINAL_CALL_DIR%"
npm run start -- %*