@echo off
title MCPilot - Advanced Server
echo.
echo ╔══════════════════════════════════════╗
echo ║   MCP Config Server (Advanced)      ║
echo ╚══════════════════════════════════════╝
echo.
echo This server allows direct saving to Claude configs!
echo.

node server-advanced.js

if errorlevel 1 (
    echo.
    echo ⚠️ Node.js is not installed or not in PATH!
    echo.
    echo Please install Node.js from https://nodejs.org
    echo Opening web interface...
    echo.
    pause
)