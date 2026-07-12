param(
  [Parameter(Mandatory = $true)]
  [string] $ImageUri,
  [string] $ProjectId = 'bukky-production',
  [string] $Region = 'us-central1',
  [string] $ServiceName = 'bukky-backend',
  [string] $ServiceAccount = 'bukky-backend-runtime@bukky-production.iam.gserviceaccount.com',
  [string] $MigrationJobName = 'bukky-db-migrate',
  [string] $SeedJobName = 'bukky-seed-superadmin',
  [string] $SuperadminEmailSecret = 'bukky-superadmin-email',
  [string] $SuperadminPasswordSecret = 'bukky-superadmin-password',
  [string] $SuperadminNameSecret = ''
)

$ErrorActionPreference = 'Stop'

function Assert-Command($Name) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "No se encontro el comando requerido: $Name"
  }
}

function Assert-GcpProject($ExpectedProject) {
  $activeProject = (& gcloud config get-value project 2>$null).Trim()
  if ($activeProject -ne $ExpectedProject) {
    throw "Proyecto activo incorrecto. Esperado: $ExpectedProject. Actual: $activeProject"
  }
}

function Get-ServiceContainer($Service) {
  if ($Service.spec -and $Service.spec.template -and $Service.spec.template.spec.containers) {
    return $Service.spec.template.spec.containers[0]
  }
  if ($Service.template -and $Service.template.containers) {
    return $Service.template.containers[0]
  }
  throw 'No se pudo encontrar el contenedor del servicio Cloud Run.'
}

function Get-ServiceAnnotations($Service) {
  if ($Service.spec -and $Service.spec.template -and $Service.spec.template.metadata.annotations) {
    return $Service.spec.template.metadata.annotations
  }
  if ($Service.template -and $Service.template.annotations) {
    return $Service.template.annotations
  }
  return $null
}

function Convert-EnvRefs($Container, [string[]] $Names) {
  $plain = New-Object System.Collections.Generic.List[string]
  $secrets = New-Object System.Collections.Generic.List[string]

  foreach ($name in $Names) {
    $env = @($Container.env) | Where-Object { $_.name -eq $name } | Select-Object -First 1
    if (-not $env) {
      Write-Warning "El servicio no define $name; no se copiara al Job."
      continue
    }

    if ($env.valueFrom -and $env.valueFrom.secretKeyRef) {
      $secret = $env.valueFrom.secretKeyRef.name
      $version = $env.valueFrom.secretKeyRef.key
      $secrets.Add("$name=${secret}:${version}")
      continue
    }

    if ($env.valueSource -and $env.valueSource.secretKeyRef) {
      $secret = $env.valueSource.secretKeyRef.secret
      $version = $env.valueSource.secretKeyRef.version
      $secrets.Add("$name=${secret}:${version}")
      continue
    }

    if ($null -ne $env.value) {
      $plain.Add("$name=$($env.value)")
    }
  }

  return @{
    Plain = $plain.ToArray()
    Secrets = $secrets.ToArray()
  }
}

function Add-NetworkArgs($Args, $Annotations) {
  if (-not $Annotations) {
    return
  }

  $cloudSql = $Annotations.'run.googleapis.com/cloudsql-instances'
  if ($cloudSql) {
    $Args.Add('--add-cloudsql-instances')
    $Args.Add($cloudSql)
  }

  $connector = $Annotations.'run.googleapis.com/vpc-access-connector'
  if ($connector) {
    $Args.Add('--vpc-connector')
    $Args.Add($connector)
  }

  $egress = $Annotations.'run.googleapis.com/vpc-access-egress'
  if ($egress) {
    $Args.Add('--vpc-egress')
    $Args.Add($egress)
  }
}

function Upsert-Job($JobName, [string[]] $CommandArgs, [string[]] $PlainEnv, [string[]] $SecretEnv, $Annotations) {
  $exists = $false
  & gcloud run jobs describe $JobName --project $ProjectId --region $Region *> $null
  if ($LASTEXITCODE -eq 0) {
    $exists = $true
  }

  $args = New-Object System.Collections.Generic.List[string]
  if ($exists) {
    $args.AddRange(@('run', 'jobs', 'update', $JobName))
  } else {
    $args.AddRange(@('run', 'jobs', 'create', $JobName))
  }

  $args.AddRange(@(
      '--project', $ProjectId,
      '--region', $Region,
      '--image', $ImageUri,
      '--service-account', $ServiceAccount,
      '--tasks', '1',
      '--parallelism', '1',
      '--max-retries', '0',
      '--task-timeout', '15m',
      '--memory', '1Gi',
      '--cpu', '1',
      '--command', 'pnpm',
      '--args', ($CommandArgs -join ',')
    ))

  if ($PlainEnv.Count -gt 0) {
    $args.Add('--set-env-vars')
    $args.Add(($PlainEnv -join ','))
  }

  if ($SecretEnv.Count -gt 0) {
    $args.Add('--set-secrets')
    $args.Add(($SecretEnv -join ','))
  }

  Add-NetworkArgs $args $Annotations

  & gcloud @args
  if ($LASTEXITCODE -ne 0) {
    throw "No se pudo crear o actualizar el Job $JobName."
  }
}

Assert-Command gcloud
Assert-GcpProject $ProjectId

$serviceJson = & gcloud run services describe $ServiceName --project $ProjectId --region $Region --format=json
$service = $serviceJson | ConvertFrom-Json
$container = Get-ServiceContainer $service
$annotations = Get-ServiceAnnotations $service

$dbEnvNames = @(
  'DB_HOST',
  'DB_PORT',
  'DB_USER',
  'DB_PASSWORD',
  'DB_NAME',
  'DB_SSL',
  'DB_LOGGING',
  'DB_POOL_MAX',
  'DB_POOL_IDLE_TIMEOUT_MS',
  'DB_POOL_CONNECTION_TIMEOUT_MS',
  'DB_POOL_KEEP_ALIVE'
)

$dbRefs = Convert-EnvRefs $container $dbEnvNames

$seedSecrets = New-Object System.Collections.Generic.List[string]
$seedSecrets.Add("SUPERADMIN_EMAIL=${SuperadminEmailSecret}:latest")
$seedSecrets.Add("SUPERADMIN_PASSWORD=${SuperadminPasswordSecret}:latest")
if ($SuperadminNameSecret) {
  $seedSecrets.Add("SUPERADMIN_NAME=${SuperadminNameSecret}:latest")
}

Upsert-Job $MigrationJobName @('run', 'migration:run') $dbRefs.Plain $dbRefs.Secrets $annotations
Upsert-Job $SeedJobName @('run', 'seed:superadmin') $dbRefs.Plain ($dbRefs.Secrets + $seedSecrets.ToArray()) $annotations

Write-Host 'Jobs de base de datos creados o actualizados.'
Write-Host "Migraciones: $MigrationJobName"
Write-Host "Seed superadmin: $SeedJobName"
