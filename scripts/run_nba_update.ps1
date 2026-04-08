# run_nba_update.ps1
# Activates the .venv virtual environment, runs the NBA data script,
# and logs the result (success/failure + timestamp) to nba_update.log.

$ProjectRoot = "C:\Users\RoeeYaish\Python Projects\nba-predictions"
$LogFile     = Join-Path $ProjectRoot "scripts\nba_update.log"
$PythonScript = Join-Path $ProjectRoot "scripts\nba_playoffs_to_supabase.py"
$Activate    = Join-Path $ProjectRoot ".venv\Scripts\Activate.ps1"

function Send-UpdateEmail {
    param (
        [Parameter(Mandatory = $true)]
        [string]$Subject,
        [Parameter(Mandatory = $true)]
        [string]$Body
    )

    if ([string]::IsNullOrWhiteSpace($env:GMAIL_USER) -or [string]::IsNullOrWhiteSpace($env:GMAIL_APP_PASSWORD)) {
        Add-Content -Path $LogFile -Value "    Email skipped: GMAIL_USER or GMAIL_APP_PASSWORD is not set."
        return
    }

    try {
        $SecurePassword = ConvertTo-SecureString $env:GMAIL_APP_PASSWORD -AsPlainText -Force
        $Credential = New-Object System.Management.Automation.PSCredential ($env:GMAIL_USER, $SecurePassword)

        Send-MailMessage `
            -SmtpServer "smtp.gmail.com" `
            -Port 587 `
            -UseSsl `
            -Credential $Credential `
            -From $env:GMAIL_USER `
            -To $env:GMAIL_USER `
            -Subject $Subject `
            -Body $Body

        Add-Content -Path $LogFile -Value "    Email notification sent to $($env:GMAIL_USER)."
    } catch {
        Add-Content -Path $LogFile -Value "    Email notification failed: $($_.Exception.Message)"
    }
}

Set-Location $ProjectRoot

# Activate the virtual environment
. $Activate

$Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$RunSummary = $null
$ExitCode = 0
$SuccessSubject = "$([char]0x2705) Court Night -- Data Updated"
$FailureSubject = "$([char]0x274C) Court Night -- Script Failed"

try {
    $Output = python $PythonScript 2>&1
    $ExitCode = $LASTEXITCODE
    $StatusLine = if ($ExitCode -eq 0) { "SUCCESS" } else { "FAILED (exit $ExitCode)" }

    Add-Content -Path $LogFile -Value ""
    Add-Content -Path $LogFile -Value "[$Timestamp] $StatusLine"
    foreach ($line in $Output) {
        Add-Content -Path $LogFile -Value "    $line"
    }

    $RunSummary = @(
        "Timestamp: $Timestamp"
        "Status: $StatusLine"
        ""
        "Log output:"
        ($Output | ForEach-Object { "$_" })
    ) -join [Environment]::NewLine

    if ($ExitCode -eq 0) {
        Send-UpdateEmail -Subject $SuccessSubject -Body $RunSummary
    } else {
        Send-UpdateEmail -Subject $FailureSubject -Body $RunSummary
    }

    if ($ExitCode -ne 0) {
        exit $ExitCode
    }
} catch {
    $ErrorMessage = $_ | Out-String

    Add-Content -Path $LogFile -Value ""
    Add-Content -Path $LogFile -Value "[$Timestamp] FAILED (exception: $_)"

    $RunSummary = @(
        "Timestamp: $Timestamp"
        "Status: FAILED (exception)"
        ""
        "Error:"
        $ErrorMessage.Trim()
    ) -join [Environment]::NewLine

    Send-UpdateEmail -Subject $FailureSubject -Body $RunSummary
    exit 1
}
