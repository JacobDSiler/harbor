@echo off
title Harbor watcher
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0hs-start-watcher.ps1"
