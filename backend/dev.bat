@echo off
echo ============================================
echo  Machinichi Backend - Dev Mode
echo  (runs directly from src/ via nodemon+ts-node
echo   no build step, always up to date)
echo ============================================
echo.
call npm run dev
pause
