$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

function Write-Step {
  param([string]$Message)
  Write-Host ""
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Remove-PathIfExists {
  param([string]$RelativePath)

  $fullPath = Join-Path $projectRoot $RelativePath
  if (-not (Test-Path -LiteralPath $fullPath)) {
    return
  }

  Write-Host "Removendo $RelativePath"
  try {
    Remove-Item -LiteralPath $fullPath -Recurse -Force
  } catch {
    Write-Warning "Nao foi possivel remover $RelativePath. Continuando build. Detalhe: $($_.Exception.Message)"
  }
}

function Remove-CxxIfExists {
  $cxxPath = Join-Path $projectRoot 'android\app\.cxx'
  if (-not (Test-Path -LiteralPath $cxxPath)) {
    return
  }

  Write-Host "Removendo android\app\.cxx"
  try {
    Remove-Item -LiteralPath $cxxPath -Recurse -Force
  } catch {
    Write-Warning "Nao foi possivel remover android\app\.cxx. Continuando build. Detalhe: $($_.Exception.Message)"
  }
}

function Ensure-Command {
  param([string]$CommandName)

  if (-not (Get-Command $CommandName -ErrorAction SilentlyContinue)) {
    throw "Comando obrigatorio nao encontrado: $CommandName"
  }
}

Write-Step "Validando ambiente"
Ensure-Command npm
Ensure-Command npx

if (-not $env:JAVA_HOME -or -not (Test-Path -LiteralPath $env:JAVA_HOME)) {
  $defaultJavaHome = 'C:\Program Files\Java\jdk-17'
  if (Test-Path -LiteralPath $defaultJavaHome) {
    $env:JAVA_HOME = $defaultJavaHome
  } else {
    throw "JAVA_HOME nao configurado. Instale o JDK 17 ou defina JAVA_HOME."
  }
}

if (-not $env:ANDROID_HOME) {
  $env:ANDROID_HOME = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
}
if (-not $env:ANDROID_SDK_ROOT) {
  $env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
}
if (-not (Test-Path -LiteralPath $env:ANDROID_HOME)) {
  throw "ANDROID_HOME invalido: $($env:ANDROID_HOME)"
}

$env:Path = "$($env:JAVA_HOME)\bin;$($env:ANDROID_HOME)\platform-tools;$env:Path"

Write-Host "JAVA_HOME=$($env:JAVA_HOME)"
Write-Host "ANDROID_HOME=$($env:ANDROID_HOME)"
java -version

Write-Step "Limpando caches nativos e builds antigos"
Remove-CxxIfExists
Remove-PathIfExists 'android\app\build'
Remove-PathIfExists 'android\build'

Write-Step "Instalando dependencias JS"
npm install --legacy-peer-deps

Write-Step "Executando prebuild Android"
npx expo prebuild --platform android

Write-Step "Gravando android\local.properties"
$sdkEscaped = $env:ANDROID_HOME -replace '\\', '\\'
Set-Content -LiteralPath (Join-Path $projectRoot 'android\local.properties') -Value "sdk.dir=$sdkEscaped"

Write-Step "Gerando APK release"
Push-Location (Join-Path $projectRoot 'android')
try {
  .\gradlew clean
  .\gradlew assembleRelease
} finally {
  Pop-Location
}

$apkPath = Join-Path $projectRoot 'android\app\build\outputs\apk\release\app-release.apk'
Write-Step "Build finalizada"
if (Test-Path -LiteralPath $apkPath) {
  Write-Host "APK gerado em: $apkPath" -ForegroundColor Green
} else {
  throw "Build terminou sem encontrar o APK em $apkPath"
}
