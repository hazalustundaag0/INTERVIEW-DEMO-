# dev.ps1 — Frontend geliştirme komutları (Windows / PowerShell). Sahibi: 81 Frontend Platform.
#   .\scripts\dev.ps1            → statik sunucu http://localhost:3000 (Ctrl+C ile durur)
#   .\scripts\dev.ps1 serve      → aynı
#   .\scripts\dev.ps1 seed       → demo guru + 1.500 TRY fiyat (ADMIN_PASSWORD, DEMO_GURU_PASSWORD env gerekli)
#   .\scripts\dev.ps1 check      → tüm JS dosyalarında node --check
#   .\scripts\dev.ps1 stack-mail      → Docker yığınının mail volume'unu tests/e2e/output/stack-mail'e yansıtır
#                                      (testler MAIL_DIR ile okur; Etap 5). Durdurmak: stack-mail-stop
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
  # Etap 5: Docker yığını (deploy/, proje interview-demo-stack) log e-postalarını adlandırılmış volume'a yazar.
  # Doğrulama betikleri / e2e bağlantıları dosyadan okuduğu için volume salt-okunur bağlanıp host klasörüne
  # kopyalanır (0,3 sn'de bir). Yalnız bu yığının volume'una dokunur; konteyner adı interview-demo-stack-mailmirror.
  'stack-mail' {
    $out = Join-Path $root 'tests\e2e\output\stack-mail'
    New-Item -ItemType Directory -Force $out | Out-Null
    docker rm -f interview-demo-stack-mailmirror 2>$null | Out-Null
    docker run -d --name interview-demo-stack-mailmirror -v interview-demo-stack_mail:/m:ro -v "${out}:/out" alpine:3.24 `
      sh -c 'while :; do cp -pn /m/*.txt /out/ 2>/dev/null; sleep 0.3; done' | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'mail yansıtma konteyneri başlatılamadı' }
    Write-Host "Mail yansıtılıyor → $out"
    Write-Host "Testler için: `$env:MAIL_DIR = '$out'"
  }
  'stack-mail-stop' {
    docker rm -f interview-demo-stack-mailmirror 2>$null | Out-Null
    Write-Host 'Mail yansıtma durduruldu.'
  }
  default { throw "Bilinmeyen hedef: $Target (serve | seed | check | stack-mail | stack-mail-stop)" }
}
