# dev.ps1 — Frontend geliştirme komutları (Windows / PowerShell). Sahibi: 81 Frontend Platform.
#   .\scripts\dev.ps1            → statik sunucu http://localhost:3000 (Ctrl+C ile durur)
#   .\scripts\dev.ps1 serve      → aynı
#   .\scripts\dev.ps1 seed       → demo guru + 1.500 TRY fiyat (ADMIN_PASSWORD, DEMO_GURU_PASSWORD env gerekli)
#   .\scripts\dev.ps1 check      → tüm JS dosyalarında node --check
param([string]$Target = 'serve')
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot

switch ($Target) {
  'serve' { node (Join-Path $PSScriptRoot 'dev-server.mjs') }
  'seed'  { node (Join-Path $PSScriptRoot 'seed-demo.mjs') }
  'check' {
    $failed = 0
    Get-ChildItem -Path (Join-Path $root 'demo'), (Join-Path $root 'scripts') -Recurse -Include *.js, *.mjs |
      Where-Object { $_.FullName -notmatch 'gradient-ui-ux-landing-page-template|stitch_' } |
      ForEach-Object {
        node --check $_.FullName
        if ($LASTEXITCODE -ne 0) { $failed++ }
      }
    if ($failed -gt 0) { throw "$failed dosyada sözdizimi hatası" }
    Write-Host 'node --check: tüm dosyalar temiz'
  }
  default { throw "Bilinmeyen hedef: $Target (serve | seed | check)" }
}
