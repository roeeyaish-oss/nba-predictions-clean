# run_nba_update.ps1
# Activates the .venv virtual environment, runs the NBA data script,
# and logs the result (success/failure + timestamp) to nba_update.log.

$ProjectRoot = "C:\Users\RoeeYaish\Python Projects\nba-predictions"
$LogFile     = Join-Path $ProjectRoot "scripts\nba_update.log"
$PythonScript = Join-Path $ProjectRoot "scripts\nba_playoffs_to_supabase.py"
$Activate    = Join-Path $ProjectRoot ".venv\Scripts\Activate.ps1"

Set-Location $ProjectRoot

# Activate the virtual environment
. $Activate

$Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

try {
    $Output = python $PythonScript 2>&1
    $ExitCode = $LASTEXITCODE

    Add-Content -Path $LogFile -Value ""
    Add-Content -Path $LogFile -Value "[$Timestamp] $(if ($ExitCode -eq 0) { 'SUCCESS' } else { "FAILED (exit $ExitCode)" })"
    foreach ($line in $Output) {
        Add-Content -Path $LogFile -Value "    $line"
    }

    if ($ExitCode -ne 0) {
        exit $ExitCode
    }
} catch {
    Add-Content -Path $LogFile -Value ""
    Add-Content -Path $LogFile -Value "[$Timestamp] FAILED (exception: $_)"
    exit 1
}
