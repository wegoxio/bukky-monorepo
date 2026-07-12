param(
  [string] $ProjectId = 'bukky-production',
  [string] $Region = 'us-central1',
  [string] $Repository = 'bukky',
  [string] $ImageName = 'bukky-backend-ops'
)

$ErrorActionPreference = 'Stop'

function Assert-Command($Name) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "No se encontro el comando requerido: $Name"
  }
}

Assert-Command gcloud
Assert-Command git

$activeProject = (& gcloud config get-value project 2>$null).Trim()
if ($activeProject -ne $ProjectId) {
  throw "Proyecto activo incorrecto. Esperado: $ProjectId. Actual: $activeProject"
}

$shortSha = (& git rev-parse --short=12 HEAD).Trim()
if (-not $shortSha) {
  throw 'No se pudo resolver el hash corto de git.'
}

$dirty = (& git status --porcelain).Trim()
if ($dirty) {
  throw 'El worktree tiene cambios sin commit. Para que el tag de imagen corresponda al hash, commitea los cambios o usa un commit limpio antes de publicar.'
}

$imageUri = "$Region-docker.pkg.dev/$ProjectId/$Repository/$ImageName`:$shortSha"

& gcloud builds submit `
  --project $ProjectId `
  --config cloudbuild-operations.yaml `
  --substitutions "_REGION=$Region,_ARTIFACT_REPOSITORY=$Repository,_IMAGE_NAME=$ImageName,_GIT_SHA=$shortSha" `
  .

if ($LASTEXITCODE -ne 0) {
  throw 'Cloud Build fallo al construir la imagen de operaciones.'
}

Write-Host "Imagen operations publicada:"
Write-Host $imageUri
