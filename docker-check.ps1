# Script de validation Docker SIGB UdM
Write-Host "=== VALIDATION DOCKER SIGB UdM ===" -ForegroundColor Blue

$TestsTotal = 0
$TestsPassed = 0

# Test fichiers
Write-Host "Verification des fichiers..." -ForegroundColor Cyan
if (Test-Path "Dockerfile") {
    Write-Host "✅ Dockerfile existe" -ForegroundColor Green
    $TestsPassed++
} else {
    Write-Host "❌ Dockerfile manquant" -ForegroundColor Red
}
$TestsTotal++

if (Test-Path "docker-compose.yml") {
    Write-Host "✅ docker-compose.yml existe" -ForegroundColor Green
    $TestsPassed++
} else {
    Write-Host "❌ docker-compose.yml manquant" -ForegroundColor Red
}
$TestsTotal++

if (Test-Path ".env.docker") {
    Write-Host "✅ .env.docker existe" -ForegroundColor Green
    $TestsPassed++
} else {
    Write-Host "❌ .env.docker manquant" -ForegroundColor Red
}
$TestsTotal++

# Test configuration
Write-Host "Verification de la configuration..." -ForegroundColor Cyan
$envContent = Get-Content ".env.docker" -ErrorAction SilentlyContinue
if ($envContent -and ($envContent | Select-String "JWT_SECRET=udm-sigb")) {
    Write-Host "✅ JWT_SECRET configure" -ForegroundColor Green
    $TestsPassed++
} else {
    Write-Host "❌ JWT_SECRET non configure" -ForegroundColor Red
}
$TestsTotal++

if ($envContent -and ($envContent | Select-String "AD_SERVER=ldap://ad.udm.edu.cm")) {
    Write-Host "✅ Serveur AD configure" -ForegroundColor Green
    $TestsPassed++
} else {
    Write-Host "❌ Serveur AD non configure" -ForegroundColor Red
}
$TestsTotal++

# Test Docker
Write-Host "Verification Docker..." -ForegroundColor Cyan
try {
    $dockerCmd = Get-Command docker -ErrorAction Stop
    Write-Host "✅ Docker installe" -ForegroundColor Green
    $TestsPassed++
} catch {
    Write-Host "❌ Docker non installe" -ForegroundColor Red
}
$TestsTotal++

# Résultats
Write-Host ""
Write-Host "=== RESULTATS ===" -ForegroundColor Blue
Write-Host "Tests reussis: $TestsPassed/$TestsTotal" -ForegroundColor White

if ($TestsPassed -eq $TestsTotal) {
    Write-Host "🎉 Configuration Docker validee!" -ForegroundColor Green
    Write-Host "Commande de demarrage: docker-compose up -d" -ForegroundColor Cyan
} else {
    Write-Host "⚠️ Configuration incomplete" -ForegroundColor Yellow
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        Write-Host "Installer Docker Desktop depuis: https://www.docker.com/products/docker-desktop" -ForegroundColor Yellow
    }
}
