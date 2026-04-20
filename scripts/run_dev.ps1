# ScamSentinel MY — Development Runner
# Starts both Backend and Frontend in separate windows

Write-Host "Starting ScamSentinel MY Development Environment..." -ForegroundColor Cyan

# 1. Start Backend
Write-Host "Launching Backend (FastAPI) on port 8080..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "uvicorn src.main:app --reload --port 8080"

# 2. Start Frontend
Write-Host "Launching Frontend (Vite) on port 5173..." -ForegroundColor Green
Set-Location frontend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev"

Write-Host "Environment is booting up. Check the new windows for logs." -ForegroundColor Yellow
Write-Host "Backend: http://localhost:8080"
Write-Host "Frontend: http://localhost:5173"
