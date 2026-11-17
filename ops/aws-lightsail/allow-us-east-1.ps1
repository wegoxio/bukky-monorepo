$ErrorActionPreference = 'Stop'

$expectedManagementAccount = '529921977190'
$bukkyAccount = '293968602385'
$policyName = 'AdvancedModeRegionRestrictionSecurityControlPolicy'
$requiredExceptions = @('lightsail:*', 's3:*')

$accountId = aws sts get-caller-identity --query Account --output text
if ($LASTEXITCODE -ne 0 -or $accountId.Trim() -ne $expectedManagementAccount) {
  throw "Run this script while authenticated to management account $expectedManagementAccount."
}

$policies = aws organizations list-policies --filter SERVICE_CONTROL_POLICY --output json | ConvertFrom-Json
$summary = $policies.Policies | Where-Object Name -eq $policyName | Select-Object -First 1
if (-not $summary) {
  throw "SCP '$policyName' was not found."
}

$response = aws organizations describe-policy --policy-id $summary.Id --output json | ConvertFrom-Json
$policy = $response.Policy.Content | ConvertFrom-Json
$usEastStatement = $policy.Statement | Where-Object Sid -eq 'UsEast1Partitional' | Select-Object -First 1
if (-not $usEastStatement -or $usEastStatement.Effect -ne 'Deny') {
  throw "Expected Deny statement 'UsEast1Partitional' was not found; refusing to modify the SCP."
}

$existingBukkyStatement = $policy.Statement | Where-Object Sid -eq 'UsEast1PartitionalBukky' | Select-Object -First 1
if ($existingBukkyStatement) {
  Write-Output 'Bukky-specific us-east-1 policy statement already exists; no update required.'
  exit 0
}

$backupDirectory = Join-Path $PSScriptRoot '..\..\.local\aws-policy-backups'
$backupDirectory = [System.IO.Path]::GetFullPath($backupDirectory)
[System.IO.Directory]::CreateDirectory($backupDirectory) | Out-Null
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$backupPath = Join-Path $backupDirectory "$($summary.Id)-$timestamp.json"
$originalJson = $policy | ConvertTo-Json -Depth 100
[System.IO.File]::WriteAllText($backupPath, $originalJson, [System.Text.UTF8Encoding]::new($false))

$bukkyExceptions = [System.Collections.Generic.List[string]]::new()
foreach ($action in $usEastStatement.NotAction) {
  $bukkyExceptions.Add([string]$action)
}
foreach ($action in $requiredExceptions) {
  if (-not $bukkyExceptions.Contains($action)) {
    $bukkyExceptions.Add($action)
  }
}

$usEastStatement.Condition | Add-Member -NotePropertyName StringNotEquals -NotePropertyValue ([pscustomobject]@{
  'aws:PrincipalAccount' = $bukkyAccount
}) -Force

$bukkyStatement = [pscustomobject]@{
  Sid = 'UsEast1PartitionalBukky'
  Effect = 'Deny'
  NotAction = @($bukkyExceptions | Sort-Object -Unique)
  Resource = '*'
  Condition = [pscustomobject]@{
    StringEquals = [pscustomobject]@{
      'aws:RequestedRegion' = 'us-east-1'
      'aws:PrincipalAccount' = $bukkyAccount
    }
  }
}
$policy.Statement = @($policy.Statement) + $bukkyStatement

$updatedJson = $policy | ConvertTo-Json -Depth 100 -Compress
$temporaryPolicy = Join-Path ([System.IO.Path]::GetTempPath()) "bukky-$($summary.Id)-updated.json"
[System.IO.File]::WriteAllText($temporaryPolicy, $updatedJson, [System.Text.UTF8Encoding]::new($false))
try {
  aws organizations update-policy --policy-id $summary.Id --content "file://$temporaryPolicy" --output json
  if ($LASTEXITCODE -ne 0) {
    throw 'AWS Organizations rejected the policy update.'
  }
}
finally {
  Remove-Item -LiteralPath $temporaryPolicy -Force -ErrorAction SilentlyContinue
}

Write-Output "Updated $($summary.Id). Backup: $backupPath"
