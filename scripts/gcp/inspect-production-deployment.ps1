param(
  [Parameter(Mandatory = $true)]
  [string]$ProjectId,

  [string]$Region = 'us-central1',
  [string]$BackendService = 'bukky-backend',
  [string]$FrontendService = 'bukky-frontend',
  [int]$RevisionLimit = 10
)

$ErrorActionPreference = 'Stop'

function Show-Service {
  param([Parameter(Mandatory = $true)][string]$ServiceName)

  Write-Host ""
  Write-Host "Service: $ServiceName"
  gcloud run services describe $ServiceName `
    --project $ProjectId `
    --region $Region `
    --format "table(metadata.name,status.url,status.latestReadyRevisionName,status.traffic)"

  Write-Host "Recent revisions:"
  gcloud run revisions list `
    --project $ProjectId `
    --region $Region `
    --service $ServiceName `
    --limit $RevisionLimit `
    --format "table(metadata.name,status.conditions[0].status,spec.containers[0].image,metadata.creationTimestamp)"
}

Show-Service -ServiceName $BackendService
Show-Service -ServiceName $FrontendService
