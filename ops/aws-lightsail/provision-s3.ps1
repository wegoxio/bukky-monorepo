param(
  [Parameter(Mandatory)] [string]$AssetsBucket,
  [Parameter(Mandatory)] [string]$BackupsBucket,
  [string]$Region = 'us-east-1',
  [string]$IamUserName = 'bukky-production-storage',
  [Parameter(Mandatory)] [string]$CredentialOutputPath
)

$ErrorActionPreference = 'Stop'

function New-BucketIfMissing([string]$Name) {
  $existingBuckets = aws s3api list-buckets --query 'Buckets[].Name' --output text
  if (-not (($existingBuckets -split '\s+') -contains $Name)) {
    if ($Region -eq 'us-east-1') {
      aws s3api create-bucket --bucket $Name --region $Region | Out-Null
    } else {
      aws s3api create-bucket --bucket $Name --region $Region --create-bucket-configuration "LocationConstraint=$Region" | Out-Null
    }
  }

  $encryptionFile = Join-Path $env:TEMP "bukky-$Name-encryption.json"
  [System.IO.File]::WriteAllText($encryptionFile, '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}', [System.Text.UTF8Encoding]::new($false))
  try {
    aws s3api put-bucket-encryption --bucket $Name --server-side-encryption-configuration "file://$encryptionFile" | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Failed to configure encryption for $Name." }
  } finally {
    Remove-Item -LiteralPath $encryptionFile -Force -ErrorAction SilentlyContinue
  }
}

New-BucketIfMissing $AssetsBucket
New-BucketIfMissing $BackupsBucket

aws s3api put-public-access-block --bucket $AssetsBucket --public-access-block-configuration 'BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=false,RestrictPublicBuckets=false' | Out-Null
$assetsPolicy = @{
  Version = '2012-10-17'
  Statement = @(@{
    Sid = 'PublicReadAssets'
    Effect = 'Allow'
    Principal = '*'
    Action = 's3:GetObject'
    Resource = "arn:aws:s3:::$AssetsBucket/*"
  })
} | ConvertTo-Json -Depth 8 -Compress
$assetsPolicyFile = Join-Path $env:TEMP 'bukky-assets-policy.json'
[System.IO.File]::WriteAllText($assetsPolicyFile, $assetsPolicy, [System.Text.UTF8Encoding]::new($false))
aws s3api put-bucket-policy --bucket $AssetsBucket --policy "file://$assetsPolicyFile" | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Failed to apply the public assets bucket policy.' }

aws s3api put-public-access-block --bucket $BackupsBucket --public-access-block-configuration 'BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true' | Out-Null
aws s3api put-bucket-versioning --bucket $BackupsBucket --versioning-configuration Status=Enabled | Out-Null
$lifecycle = '{"Rules":[{"ID":"ExpireDatabaseBackups","Status":"Enabled","Filter":{"Prefix":"postgres/"},"Expiration":{"Days":30},"NoncurrentVersionExpiration":{"NoncurrentDays":7}}]}'
$lifecycleFile = Join-Path $env:TEMP 'bukky-backups-lifecycle.json'
[System.IO.File]::WriteAllText($lifecycleFile, $lifecycle, [System.Text.UTF8Encoding]::new($false))
aws s3api put-bucket-lifecycle-configuration --bucket $BackupsBucket --lifecycle-configuration "file://$lifecycleFile" | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Failed to configure the backup lifecycle.' }

$existingUsers = aws iam list-users --query 'Users[].UserName' --output text
if (-not (($existingUsers -split '\s+') -contains $IamUserName)) {
  aws iam create-user --user-name $IamUserName | Out-Null
}

$iamPolicy = @{
  Version = '2012-10-17'
  Statement = @(
    @{ Effect = 'Allow'; Action = @('s3:PutObject','s3:DeleteObject'); Resource = "arn:aws:s3:::$AssetsBucket/*" },
    @{ Effect = 'Allow'; Action = @('s3:ListBucket'); Resource = "arn:aws:s3:::$AssetsBucket" },
    @{ Effect = 'Allow'; Action = @('s3:PutObject'); Resource = "arn:aws:s3:::$BackupsBucket/postgres/*" },
    @{ Effect = 'Allow'; Action = @('s3:ListBucket'); Resource = "arn:aws:s3:::$BackupsBucket" }
  )
} | ConvertTo-Json -Depth 8 -Compress
$iamPolicyFile = Join-Path $env:TEMP 'bukky-storage-iam-policy.json'
[System.IO.File]::WriteAllText($iamPolicyFile, $iamPolicy, [System.Text.UTF8Encoding]::new($false))
aws iam put-user-policy --user-name $IamUserName --policy-name BukkyProductionStorage --policy-document "file://$iamPolicyFile" | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Failed to apply the storage IAM policy.' }

try {
  $resolvedOutput = [System.IO.Path]::GetFullPath($CredentialOutputPath)
  if (-not (Test-Path -LiteralPath $resolvedOutput)) {
    $key = aws iam create-access-key --user-name $IamUserName --output json | ConvertFrom-Json
    $credentials = "AWS_ACCESS_KEY_ID=$($key.AccessKey.AccessKeyId)`nAWS_SECRET_ACCESS_KEY=$($key.AccessKey.SecretAccessKey)`n"
    [System.IO.File]::WriteAllText($resolvedOutput, $credentials, [System.Text.UTF8Encoding]::new($false))
  }
  Write-Output "Storage credentials saved to $resolvedOutput"
} finally {
  Remove-Item -LiteralPath $assetsPolicyFile -Force -ErrorAction SilentlyContinue
  Remove-Item -LiteralPath $iamPolicyFile -Force -ErrorAction SilentlyContinue
  Remove-Item -LiteralPath $lifecycleFile -Force -ErrorAction SilentlyContinue
}
