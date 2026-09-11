@echo off
title Puente de escaner - AM Seguridad
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0escaner-am.ps1"
pause
