param(
  [string]$Region = 'us-east-1',
  [string]$AvailabilityZone = 'us-east-1a',
  [string]$InstanceName = 'bukky-production-app',
  [string]$BlueprintId = 'ubuntu_24_04',
  [string]$KeyPairName = 'bukky-production',
  [Parameter(Mandatory)] [string]$AdminCidr
)

$ErrorActionPreference = 'Stop'

if (-not (Get-Command aws -ErrorAction SilentlyContinue)) {
  throw 'AWS CLI is required.'
}

$bundles = aws lightsail get-bundles --region $Region --include-inactive --output json | ConvertFrom-Json
$bundle = $bundles.bundles |
  Where-Object { $_.ramSizeInGb -eq 4 -and $_.price -eq 24 -and $_.supportedPlatforms -contains 'LINUX_UNIX' } |
  Select-Object -First 1

if (-not $bundle) {
  throw 'No active Lightsail Linux bundle with 4 GB RAM and public IPv4 at USD 24 was found.'
}

$blueprints = aws lightsail get-blueprints --region $Region --include-inactive --output json | ConvertFrom-Json
if (-not ($blueprints.blueprints | Where-Object { $_.blueprintId -eq $BlueprintId -and $_.isActive })) {
  throw "Blueprint '$BlueprintId' is not active in $Region. Run: aws lightsail get-blueprints --region $Region"
}

$existing = aws lightsail get-instance --region $Region --instance-name $InstanceName --output json 2>$null
if ($LASTEXITCODE -ne 0) {
  aws lightsail create-instances `
    --region $Region `
    --availability-zone $AvailabilityZone `
    --blueprint-id $BlueprintId `
    --bundle-id $bundle.bundleId `
    --instance-names $InstanceName `
    --key-pair-name $KeyPairName `
    --add-ons "addOnType=AutoSnapshot,autoSnapshotAddOnRequest={snapshotTimeOfDay=03:00}" | Out-Null
  do {
    Start-Sleep -Seconds 5
    $state = aws lightsail get-instance-state --region $Region --instance-name $InstanceName --query 'state.name' --output text
  } while ($state -ne 'running')
}

$staticIpName = 'bukky-production-ip'
aws lightsail allocate-static-ip --region $Region --static-ip-name $staticIpName 2>$null | Out-Null
aws lightsail attach-static-ip --region $Region --static-ip-name $staticIpName --instance-name $InstanceName | Out-Null

$ports = @(
  @{ fromPort = 22; toPort = 22; protocol = 'tcp'; cidrs = @($AdminCidr) },
  @{ fromPort = 80; toPort = 80; protocol = 'tcp'; cidrs = @('0.0.0.0/0') },
  @{ fromPort = 443; toPort = 443; protocol = 'tcp'; cidrs = @('0.0.0.0/0'); cidrListAliases = @() },
  @{ fromPort = 443; toPort = 443; protocol = 'udp'; cidrs = @('0.0.0.0/0'); cidrListAliases = @() }
)
$portsFile = Join-Path $env:TEMP 'bukky-lightsail-ports.json'
$ports | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $portsFile -Encoding utf8
try {
  aws lightsail put-instance-public-ports --region $Region --instance-name $InstanceName --port-infos "file://$portsFile" | Out-Null
} finally {
  Remove-Item -LiteralPath $portsFile -Force
}

$instance = aws lightsail get-instance --region $Region --instance-name $InstanceName --output json | ConvertFrom-Json
Write-Output "Instance: $InstanceName"
Write-Output "Bundle: $($bundle.bundleId) ($($bundle.ramSizeInGb) GB, USD $($bundle.price)/month)"
Write-Output "Public IP: $($instance.instance.publicIpAddress)"
Write-Output 'Next: point the app and API DNS records to this IP, connect by SSH, and run install-host.sh.'
