param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$DescriptionParts
)

$deploymentId = "AKfycbxUJ7nUXJ4dAU1DgyKUsaped-WhgaA_3vc6P3q3wGote41qNj0V3H4uSw21TYOg3ak5"
$webAppUrl = "https://script.google.com/a/macros/firecurtaintech.com/s/AKfycbxUJ7nUXJ4dAU1DgyKUsaped-WhgaA_3vc6P3q3wGote41qNj0V3H4uSw21TYOg3ak5/exec"
$Description = if ($DescriptionParts -and $DescriptionParts.Count -gt 0) {
  ($DescriptionParts -join " ").Trim()
} else {
  "Update deployment"
}

Write-Host "RootDir de clasp: app"
Write-Host "Subiendo cambios a Apps Script..."
clasp.cmd push

if ($LASTEXITCODE -ne 0) {
  Write-Error "No se pudo subir el proyecto con clasp push."
  exit $LASTEXITCODE
}

Write-Host "Creando nueva version de Apps Script..."
$versionOutput = clasp.cmd version $Description

if ($LASTEXITCODE -ne 0) {
  Write-Error "No se pudo crear la version de Apps Script."
  exit $LASTEXITCODE
}

$versionMatch = [regex]::Match(($versionOutput | Out-String), "\b(\d+)\b")

if (-not $versionMatch.Success) {
  Write-Error "No pude detectar el numero de version generado por clasp."
  exit 1
}

$versionNumber = $versionMatch.Groups[1].Value

Write-Host "Actualizando deployment existente..."
clasp.cmd redeploy $deploymentId --versionNumber $versionNumber --description "$Description"

if ($LASTEXITCODE -ne 0) {
  Write-Error "No se pudo actualizar el deployment $deploymentId."
  exit $LASTEXITCODE
}

Write-Host "Deployment actualizado: $deploymentId"
Write-Host "Version publicada: $versionNumber"
Write-Host "Web App URL estable: $webAppUrl"
