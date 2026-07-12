param(
  [string] $ProjectId = 'bukky-production',
  [string] $Region = 'us-central1',
  [string] $JobName = 'bukky-db-migrate'
)

$ErrorActionPreference = 'Stop'

$activeProject = (& gcloud config get-value project 2>$null).Trim()
if ($activeProject -ne $ProjectId) {
  throw "Proyecto activo incorrecto. Esperado: $ProjectId. Actual: $activeProject"
}

$jobJson = & gcloud run jobs describe $JobName --project $ProjectId --region $Region --format=json
if ($LASTEXITCODE -ne 0) {
  throw "No se pudo describir el Job $JobName."
}

$job = $jobJson | ConvertFrom-Json
$image = $job.spec.template.spec.template.spec.containers[0].image

Write-Host "Proyecto: $ProjectId"
Write-Host "Region: $Region"
Write-Host "Job: $JobName"
Write-Host "Imagen: $image"
Write-Host 'Esta accion ejecutara migraciones contra produccion.'

$confirmation = Read-Host 'Escribe EJECUTAR para confirmar'
if ($confirmation -ne 'EJECUTAR') {
  throw 'Operacion cancelada.'
}

& gcloud run jobs execute $JobName --project $ProjectId --region $Region --wait
if ($LASTEXITCODE -ne 0) {
  throw 'La ejecucion de migraciones fallo.'
}

Write-Host 'Logs:'
Write-Host "gcloud logging read `"resource.type=cloud_run_job AND resource.labels.job_name=$JobName`" --project=$ProjectId --limit=50 --format=`"value(textPayload)`""
