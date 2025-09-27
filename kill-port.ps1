param([int]$Port = 3000)

Write-Host "Checking processes using port $Port..."
$processes = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue

if ($processes) {
    $uniqueProcesses = $processes | Select-Object OwningProcess -Unique | Where-Object {$_.OwningProcess -ne 0}

    foreach ($proc in $uniqueProcesses) {
        Write-Host "Killing process ID: $($proc.OwningProcess)"
        Stop-Process -Id $proc.OwningProcess -Force -ErrorAction SilentlyContinue
    }
    Write-Host "All processes using port $Port have been terminated."
} else {
    Write-Host "No processes found using port $Port."
}