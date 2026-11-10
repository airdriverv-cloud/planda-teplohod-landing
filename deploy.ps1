# Публикация лендинга на GitHub Pages
# Запуск: powershell -File deploy.ps1
$ErrorActionPreference = "Stop"
$repo = "planda-teplohod-landing"
$owner = (gh api user --jq .login)

Set-Location $PSScriptRoot

if (-not (Test-Path ".git")) {
  git init -b main | Out-Null
  git config user.name "PLANDA"
  git config user.email "event@plan-da.ru"
}

git add -A
git commit -m "Лендинг: новогодний корпоратив на теплоходе" --quiet
if ($LASTEXITCODE -ne 0) { Write-Host "нечего коммитить" }

$exists = gh repo view "$owner/$repo" 2>$null
if (-not $exists) {
  gh repo create "$owner/$repo" --public --source=. --remote=origin --push
} else {
  git push -u origin main
}

gh api -X POST "repos/$owner/$repo/pages" -f "source[branch]=main" -f "source[path]=/" 2>$null | Out-Null
Start-Sleep 20
Write-Host "Сайт: https://$owner.github.io/$repo/"
