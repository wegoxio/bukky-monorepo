param(
  [Parameter(Mandatory = $true)]
  [string]$ProjectId,

  [Parameter(Mandatory = $true)]
  [ValidateSet('backend', 'frontend')]
  [string]$Service,

  [Parameter(Mandatory = $true)]
  [string]$Image,

  [string]$Region = 'us-central1',
  [string]$BackendService = 'bukky-backend',
  [string]$FrontendService = 'bukky-frontend'
)

$ErrorActionPreference = 'Stop'

$serviceName = if ($Service -eq 'backend') { $BackendService } else { $FrontendService }

Write-Host "Rolling back $serviceName to image:"
Write-Host $Image
Write-Host ""
Write-Host "Important: this restores only the Cloud Run image. It does not revert database migrations."

gcloud run services update $serviceName `
  --project $ProjectId `
  --region $Region `
  --image $Image `
  --quiet

gcloud run services describe $serviceName `
  --project $ProjectId `
  --region $Region `
  --format "table(metadata.name,status.url,status.latestReadyRevisionName)"
