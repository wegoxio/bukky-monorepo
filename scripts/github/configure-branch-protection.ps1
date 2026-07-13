param(
  [Parameter(Mandatory = $true)]
  [string]$Owner,

  [Parameter(Mandatory = $true)]
  [string]$Repository
)

$ErrorActionPreference = 'Stop'

function Set-Protection {
  param(
    [Parameter(Mandatory = $true)][string]$Branch,
    [Parameter(Mandatory = $true)][int]$RequiredReviews
  )

  $body = @{
    required_status_checks        = @{
      strict   = $true
      contexts = @('CI Required')
    }
    enforce_admins                = $true
    required_pull_request_reviews = @{
      required_approving_review_count = $RequiredReviews
      dismiss_stale_reviews           = $true
      require_code_owner_reviews      = $false
    }
    restrictions                  = $null
    allow_force_pushes            = $false
    allow_deletions               = $false
    required_conversation_resolution = $true
  } | ConvertTo-Json -Depth 10

  $tempFile = New-TemporaryFile
  Set-Content -LiteralPath $tempFile -Value $body -Encoding UTF8

  try {
    gh api `
      --method PUT `
      -H "Accept: application/vnd.github+json" `
      "/repos/$Owner/$Repository/branches/$Branch/protection" `
      --input $tempFile
  } finally {
    Remove-Item -LiteralPath $tempFile -Force
  }
}

Write-Host "Configuring branch protection for $Owner/$Repository."
Set-Protection -Branch develop -RequiredReviews 1
Set-Protection -Branch main -RequiredReviews 1
Write-Host "Review GitHub Rulesets manually if your plan supports source-branch restrictions."
