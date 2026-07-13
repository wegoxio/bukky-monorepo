param(
  [Parameter(Mandatory = $true)]
  [string]$ProjectId,

  [Parameter(Mandatory = $true)]
  [string]$ProjectNumber,

  [Parameter(Mandatory = $true)]
  [string]$GitHubOwner,

  [Parameter(Mandatory = $true)]
  [string]$GitHubRepository,

  [string]$Region = 'us-central1',
  [string]$PoolId = 'github-actions',
  [string]$ProviderId = 'github',
  [string]$DeployServiceAccountId = 'github-production-deployer',
  [string]$CloudBuildServiceAccountId = 'bukky-cloud-build',
  [string]$ArtifactRepository = 'bukky',
  [string[]]$RuntimeServiceAccounts = @()
)

$ErrorActionPreference = 'Stop'

function Invoke-Gcloud {
  param([Parameter(Mandatory = $true)][string[]]$Arguments)
  & gcloud @Arguments
}

function Test-Gcloud {
  param([Parameter(Mandatory = $true)][string[]]$Arguments)
  & gcloud @Arguments 1>$null 2>$null
  return $LASTEXITCODE -eq 0
}

$repo = "$GitHubOwner/$GitHubRepository"
$deployServiceAccountEmail = "$DeployServiceAccountId@$ProjectId.iam.gserviceaccount.com"
$cloudBuildServiceAccountEmail = "$CloudBuildServiceAccountId@$ProjectId.iam.gserviceaccount.com"
$providerResource = "projects/$ProjectNumber/locations/global/workloadIdentityPools/$PoolId/providers/$ProviderId"
$principalSet = "principalSet://iam.googleapis.com/projects/$ProjectNumber/locations/global/workloadIdentityPools/$PoolId/attribute.repository/$repo"

Write-Host "Preparing Workload Identity Federation for $repo in project $ProjectId."

if (-not (Test-Gcloud -Arguments @('iam', 'service-accounts', 'describe', $deployServiceAccountEmail, '--project', $ProjectId))) {
  Invoke-Gcloud -Arguments @('iam', 'service-accounts', 'create', $DeployServiceAccountId, '--project', $ProjectId, '--display-name', 'GitHub production deployer')
}

if (-not (Test-Gcloud -Arguments @('iam', 'service-accounts', 'describe', $cloudBuildServiceAccountEmail, '--project', $ProjectId))) {
  Invoke-Gcloud -Arguments @('iam', 'service-accounts', 'create', $CloudBuildServiceAccountId, '--project', $ProjectId, '--display-name', 'Bukky Cloud Build executor')
}

if (-not (Test-Gcloud -Arguments @('iam', 'workload-identity-pools', 'describe', $PoolId, '--project', $ProjectId, '--location', 'global'))) {
  Invoke-Gcloud -Arguments @('iam', 'workload-identity-pools', 'create', $PoolId, '--project', $ProjectId, '--location', 'global', '--display-name', 'GitHub Actions')
}

if (-not (Test-Gcloud -Arguments @('iam', 'workload-identity-pools', 'providers', 'describe', $ProviderId, '--project', $ProjectId, '--location', 'global', '--workload-identity-pool', $PoolId))) {
  Invoke-Gcloud -Arguments @(
    'iam', 'workload-identity-pools', 'providers', 'create-oidc', $ProviderId,
    '--project', $ProjectId,
    '--location', 'global',
    '--workload-identity-pool', $PoolId,
    '--display-name', 'GitHub',
    '--issuer-uri', 'https://token.actions.githubusercontent.com',
    '--attribute-mapping', 'google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository,attribute.ref=assertion.ref',
    '--attribute-condition', "assertion.repository == '$repo'"
  )
}

Invoke-Gcloud -Arguments @(
  'iam', 'service-accounts', 'add-iam-policy-binding', $deployServiceAccountEmail,
  '--project', $ProjectId,
  '--role', 'roles/iam.workloadIdentityUser',
  '--member', $principalSet
)

Invoke-Gcloud -Arguments @('projects', 'add-iam-policy-binding', $ProjectId, '--member', "serviceAccount:$deployServiceAccountEmail", '--role', 'roles/cloudbuild.builds.editor')
Invoke-Gcloud -Arguments @('projects', 'add-iam-policy-binding', $ProjectId, '--member', "serviceAccount:$cloudBuildServiceAccountEmail", '--role', 'roles/artifactregistry.writer')
Invoke-Gcloud -Arguments @('projects', 'add-iam-policy-binding', $ProjectId, '--member', "serviceAccount:$cloudBuildServiceAccountEmail", '--role', 'roles/run.admin')
Invoke-Gcloud -Arguments @('projects', 'add-iam-policy-binding', $ProjectId, '--member', "serviceAccount:$cloudBuildServiceAccountEmail", '--role', 'roles/logging.logWriter')

foreach ($runtimeServiceAccount in $RuntimeServiceAccounts) {
  Invoke-Gcloud -Arguments @(
    'iam', 'service-accounts', 'add-iam-policy-binding', $runtimeServiceAccount,
    '--project', $ProjectId,
    '--role', 'roles/iam.serviceAccountUser',
    '--member', "serviceAccount:$cloudBuildServiceAccountEmail"
  )
}

Write-Host ''
Write-Host 'GitHub Environment variable values:'
Write-Host "GCP_WORKLOAD_IDENTITY_PROVIDER=$providerResource"
Write-Host "GCP_DEPLOY_SERVICE_ACCOUNT=$deployServiceAccountEmail"
Write-Host "Cloud Build executor service account: $cloudBuildServiceAccountEmail"
Write-Host "Configure Cloud Build triggers/builds to use the executor service account when needed."
