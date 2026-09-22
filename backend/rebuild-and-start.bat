@echo off
echo ============================================
echo  Machinichi Backend - Rebuild and Start
echo ============================================
echo.
echo Step 1: Compiling TypeScript (src -^> dist)...
call npm run build
if %ERRORLEVEL% NEQ 0 (
  echo.
  echo ============================================
  echo  BUILD FAILED. See errors above.
  echo  The server will NOT be restarted.
  echo ============================================
  pause
  exit /b 1
)
echo.
echo Build succeeded. dist/ now matches src/.
echo.
echo Step 2: Starting server from dist/server.js...
echo (Press Ctrl+C to stop the server)
echo.
call npm start
pause
