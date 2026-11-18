$ErrorActionPreference = "Stop"

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Definition
$appName = "livro-ibs-cbs"
$ngConfig = "protheus"

$projeto = Resolve-Path (Join-Path $scriptPath "..")
$distPath = Join-Path $projeto "dist\$appName"
$browserPath = Join-Path $distPath "browser"
$resourcePath = Join-Path $projeto "Protheus\Resource"
$folderToZip = Join-Path $resourcePath $appName
$zipPath = Join-Path $resourcePath "$appName.zip"
$appPath = Join-Path $resourcePath "$appName.app"

Push-Location $projeto

try {
  Write-Host "Executando build ($ngConfig)..." -ForegroundColor Cyan
  npm run build:protheus

  if (!(Test-Path $distPath)) {
    throw "Build falhou ou pasta de saída não foi encontrada: $distPath"
  }

  $sourcePath = $browserPath
  if (!(Test-Path $sourcePath)) {
    $sourcePath = $distPath
  }

  if (!(Test-Path $resourcePath)) {
    New-Item -ItemType Directory -Path $resourcePath -Force | Out-Null
  }

  if (Test-Path $folderToZip) { Remove-Item $folderToZip -Recurse -Force }
  New-Item -ItemType Directory -Path $folderToZip -Force | Out-Null
  Copy-Item "$sourcePath\*" -Destination $folderToZip -Recurse -Force

  if (Test-Path $browserPath) { Remove-Item $browserPath -Recurse -Force }
  if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
  if (Test-Path $appPath) { Remove-Item $appPath -Force }

  Compress-Archive -Path $folderToZip -DestinationPath $zipPath -Force
  Rename-Item -Path $zipPath -NewName (Split-Path $appPath -Leaf) -Force

  Write-Host "App gerado em: $appPath" -ForegroundColor Green
} finally {
  Pop-Location
}
