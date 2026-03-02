# Start both the backend and frontend dev servers

$root = $PSScriptRoot

# Start backend (from root)
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root'; npm run dev" -WindowStyle Normal

# Start frontend (from client/)
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\client'; npm run dev" -WindowStyle Normal

Write-Host "Both servers are starting..." -ForegroundColor Green
Write-Host "  Backend:  http://localhost:3000  (or whichever port is in .env)" -ForegroundColor Cyan
Write-Host "  Frontend: http://localhost:5173  (Vite default)" -ForegroundColor Cyan
