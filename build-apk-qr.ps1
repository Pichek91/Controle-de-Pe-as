
<# 
  build-apk-qr.ps1 (versão final e robusta • param no topo)
  Funções:
    - Habilita caminhos longos (Windows + Git)
    - (Opcional) define GRADLE_USER_HOME curto
    - (Opcional) desativa New Architecture (codegen) para evitar GLOB mismatch
    - Limpa artefatos (build/.cxx)
    - Compila APK (Debug/Release) com checagem de erro do Gradle
    - Sobe servidor local (Python, se existir; senão PowerShell)
    - Gera QR Code para baixar o APK no celular

  Uso:
    PowerShell -ExecutionPolicy Bypass -File ".\build-apk-qr.ps1" `
      -ProjectRoot "C:\Users\rafael.pichek\Documents\aplicativos\controle-pecas" `
      -Port 8000

    PowerShell -ExecutionPolicy Bypass -File ".\build-apk-qr.ps1" `
      -ProjectRoot "C:\Users\rafael.pichek\Documents\aplicativos\controle-pecas" `
      -Release -Port 8000 -SetGradleHome

    (Se quiser evitar erros de codegen/NA)
    PowerShell -ExecutionPolicy Bypass -File ".\build-apk-qr.ps1" `
      -ProjectRoot "C:\Users\rafael.pichek\Documents\aplicativos\controle-pecas" `
      -Port 8000 -DisableNewArch
#>

[CmdletBinding()]
param(
  [Parameter(Mandatory=$true)]
  [string]$ProjectRoot,

  [Parameter()]
  [int]$Port = 8000,

  [Parameter()]
  [switch]$Release,

  [Parameter()]
  [switch]$SetGradleHome,

  [Parameter()]
  [switch]$DisableNewArch
)

# Pare na primeira falha não tratada
$ErrorActionPreference = 'Stop'

function Test-Admin {
  $principal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
  return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Enable-LongPaths {
  Write-Host "Habilitando caminhos longos (Windows + Git)..." -ForegroundColor Cyan
  New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name "LongPathsEnabled" -Value 1 -PropertyType DWord -Force | Out-Null
  try { git config --system core.longpaths true } catch { Write-Warning "Git não encontrado ou sem permissão. Ignorando." }
}

function Set-GradleHome {
  param([string]$Path)
  Write-Host ("Definindo GRADLE_USER_HOME: {0}" -f $Path) -ForegroundColor Cyan
  setx GRADLE_USER_HOME $Path | Out-Null
}

function Update-GradleProperties {
  param([string]$ProjectRoot, [bool]$DisableNewArch)

  $gp = Join-Path $ProjectRoot "android\gradle.properties"
  if (-not (Test-Path $gp)) {
    Write-Warning ("gradle.properties não encontrado em: {0}" -f $gp)
    return
  }

  $text = Get-Content $gp -Raw
  if ($DisableNewArch) {
    Write-Host "Desativando newArchEnabled em gradle.properties..." -ForegroundColor Cyan
    if ($text -match "newArchEnabled\s*=\s*true") {
      $text = $text -replace "newArchEnabled\s*=\s*true", "newArchEnabled=false"
    } elseif ($text -notmatch "newArchEnabled\s*=") {
      $text = $text + "`r`nnewArchEnabled=false`r`n"
    }
    Set-Content $gp $text
  }
}

function Clear-AndroidBuild {
  Write-Host "Limpando artefatos anteriores..." -ForegroundColor Cyan

  $relativeTargets = @(
    "android\app\.cxx",
    "android\app\build",
    "android\build"
  )

  foreach ($rel in $relativeTargets) {
    $full = Join-Path $ProjectRoot $rel
    if (Test-Path $full) {
      try {
        Remove-Item -Recurse -Force $full
        Write-Host ("Removido: {0}" -f $full) -ForegroundColor DarkGray
      } catch {
        Write-Warning ("Falha ao remover {0}: {1}" -f $full, $_.Exception.Message)
      }
    }
  }
}

function Invoke-AndroidBuild {
  $androidDir = Join-Path $ProjectRoot "android"
  $gradlew = Join-Path $androidDir "gradlew"
  if (-not (Test-Path $gradlew)) { throw ("gradlew não encontrado em: {0}" -f $androidDir) }

  Push-Location $androidDir
  Write-Host "Executando: ./gradlew clean" -ForegroundColor Cyan
  ./gradlew clean
  if ($LASTEXITCODE -ne 0) { Pop-Location; throw ("Gradle clean falhou (exit={0}). Verifique logs acima." -f $LASTEXITCODE) }

  if ($Release) {
    Write-Host "Compilando APK Release..." -ForegroundColor Green
    ./gradlew assembleRelease --no-daemon
    if ($LASTEXITCODE -ne 0) { Pop-Location; throw ("Gradle assembleRelease falhou (exit={0})." -f $LASTEXITCODE) }
    $apkPath = Join-Path $androidDir "app\build\outputs\apk\release\app-release.apk"
  } else {
    Write-Host "Compilando APK Debug..." -ForegroundColor Green
    ./gradlew assembleDebug --no-daemon
    if ($LASTEXITCODE -ne 0) { Pop-Location; throw ("Gradle assembleDebug falhou (exit={0})." -f $LASTEXITCODE) }
    $apkPath = Join-Path $androidDir "app\build\outputs\apk\debug\app-debug.apk"
  }

  Pop-Location

  if (-not (Test-Path $apkPath)) { throw ("APK não encontrado em: {0}" -f $apkPath) }
  Write-Host ("APK gerado: {0}" -f $apkPath) -ForegroundColor Green
  return $apkPath
}

function Get-LocalIPv4 {
  $ips = Get-NetIPAddress -AddressFamily IPv4 |
    Where-Object { $_.IPAddress -notmatch '^169\.254\.' -and $_.IPAddress -ne '127.0.0.1' } |
    Select-Object -ExpandProperty IPAddress
  if ($ips) { return $ips[0] } else { return "127.0.0.1" }
}

function Enable-FirewallPort {
  param([int]$Port)
  Write-Host ("Abrindo porta {0} no firewall..." -f $Port) -ForegroundColor Cyan
  try {
    New-NetFirewallRule -DisplayName ("APK Server {0}" -f $Port) -Direction Inbound -LocalPort $Port -Protocol TCP -Action Allow -Profile Any | Out-Null
  } catch {
    Write-Warning ("Não foi possível criar regra de firewall: {0}" -f $_.Exception.Message)
  }
}

function Start-PythonServer {
  param([string]$RootDir, [int]$Port)
  Write-Host ("Iniciando servidor Python na porta {0}..." -f $Port) -ForegroundColor Green
  $job = Start-Job -ScriptBlock {
    param($dir,$p)
    Set-Location $dir
    python -m http.server $p
  } -ArgumentList $RootDir, $Port
  return $job
}

function Start-HttpServer {
  param([string]$FilePath, [int]$Port)

  $prefix = ("http://+:{0}/" -f $Port)
  try { & netsh http add urlacl url=$prefix user=Everyone listen=yes > $null 2>&1 } catch {}

  Write-Host ("Iniciando servidor HTTP em PowerShell na porta {0}..." -f $Port) -ForegroundColor Green
  $job = Start-Job -ScriptBlock {
    param($apk,$p)
    Add-Type -AssemblyName System.Net
    Add-Type -AssemblyName System.IO
    $listener = New-Object System.Net.HttpListener
    $listener.Prefixes.Add(("http://+:{0}/" -f $p))
    $listener.Start()
    Write-Output ("HTTP server on port {0}. Serving: {1}" -f $p, $apk)
    while ($true) {
      $ctx = $listener.GetContext()
      $res = $ctx.Response
      try {
        if (Test-Path $apk) {
          $bytes = [System.IO.File]::ReadAllBytes($apk)
          $res.ContentType = "application/vnd.android.package-archive"
          $res.ContentLength64 = $bytes.Length
          $res.OutputStream.Write($bytes, 0, $bytes.Length)
          $res.StatusCode = 200
        } else {
          $msg = [System.Text.Encoding]::UTF8.GetBytes("APK não encontrado.")
          $res.StatusCode = 404
          $res.ContentType = "text/plain"
          $res.ContentLength64 = $msg.Length
          $res.OutputStream.Write($msg,0,$msg.Length)
        }
      } catch {
        $res.StatusCode = 500
      } finally {
        $res.OutputStream.Close()
      }
    }
  } -ArgumentList $FilePath, $Port
  return $job
}

function New-QRCode {
  param([string]$Url, [string]$OutPath)
  Write-Host ("Gerando QR Code para: {0}" -f $Url) -ForegroundColor Cyan
  try {
    $encoded = [System.Uri]::EscapeDataString($Url)
    $qrUrl = ("https://chart.googleapis.com/chart?chs=512x512&cht=qr&chl={0}&choe=UTF-8" -f $encoded)
    Invoke-WebRequest -Uri $qrUrl -OutFile $OutPath -UseBasicParsing
    Write-Host ("QR salvo em: {0}" -f $OutPath) -ForegroundColor Green
  } catch {
    Write-Warning ("Falha ao gerar QR. Verifique sua conexão. Erro: {0}" -f $_.Exception.Message)
  }
}

# ===== Execução =====

if (-not (Test-Admin)) {
  Write-Error "Abra o PowerShell como **Administrador** e rode novamente."
  exit 1
}

Enable-LongPaths

if ($SetGradleHome) {
  Set-GradleHome -Path "C:\gradle"
}

Update-GradleProperties -ProjectRoot $ProjectRoot -DisableNewArch:$DisableNewArch

Clear-AndroidBuild

$apk = Invoke-AndroidBuild

$apkDir = Split-Path $apk -Parent
$localIp = Get-LocalIPv4
Enable-FirewallPort -Port $Port

# Servidor: Python se disponível; caso contrário, PowerShell
$pythonCmd = Get-Command python -ErrorAction SilentlyContinue
if ($pythonCmd) {
  $serverJob = Start-PythonServer -RootDir $apkDir -Port $Port
  $apkFileName = Split-Path $apk -Leaf
  $apkUrl = ("http://{0}:{1}/{2}" -f $localIp, $Port, $apkFileName)
  Write-Host ("Servidor Python iniciado (Job Id: {0})" -f $serverJob.Id) -ForegroundColor Cyan
} else {
  $serverJob = Start-HttpServer -FilePath $apk -Port $Port
  $apkUrl = ("http://{0}:{1}/" -f $localIp, $Port)
  Write-Host ("Servidor PowerShell iniciado (Job Id: {0})" -f $serverJob.Id) -ForegroundColor Cyan
}

Write-Host ("`nURL do APK (mesma rede): {0}" -f $apkUrl) -ForegroundColor Yellow

$qrPath = Join-Path $apkDir "apk_qrcode.png"
New-QRCode -Url $apkUrl -OutPath $qrPath

Write-Host ("`nPronto! Escaneie o QR ({0}) no celular para baixar e instalar o APK." -f $qrPath) -ForegroundColor Green
Write-Host "Para encerrar o servidor: Get-Job | Stop-Job ; Get-Job | Remove-Job" -ForegroundColor Cyan
