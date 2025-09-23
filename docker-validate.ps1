# ================================
# SCRIPT DE VALIDATION DOCKER WINDOWS
# SIGB UdM - Validation complète PowerShell
# ================================

Write-Host "🔍 ================================" -ForegroundColor Blue
Write-Host "✅ Validation Docker SIGB UdM" -ForegroundColor Blue
Write-Host "🏫 Université des Montagnes" -ForegroundColor Blue
Write-Host "⏰ $(Get-Date)" -ForegroundColor Blue
Write-Host "================================" -ForegroundColor Blue

# Compteurs
$TestsTotal = 0
$TestsPassed = 0
$TestsFailed = 0

# Fonction de test
function Run-Test {
    param(
        [string]$TestName,
        [scriptblock]$TestCommand
    )
    
    $script:TestsTotal++
    Write-Host "ℹ️  Test: $TestName" -ForegroundColor Cyan
    
    try {
        $result = & $TestCommand
        if ($result -or $LASTEXITCODE -eq 0) {
            Write-Host "✅ $TestName - RÉUSSI" -ForegroundColor Green
            $script:TestsPassed++
            return $true
        } else {
            Write-Host "❌ $TestName - ÉCHEC" -ForegroundColor Red
            $script:TestsFailed++
            return $false
        }
    } catch {
        Write-Host "❌ $TestName - ÉCHEC: $($_.Exception.Message)" -ForegroundColor Red
        $script:TestsFailed++
        return $false
    }
}

Write-Host ""
Write-Host "🔍 VALIDATION DES FICHIERS DE CONFIGURATION" -ForegroundColor Blue
Write-Host "================================" -ForegroundColor Blue

# Test 1: Vérifier l'existence des fichiers Docker
Run-Test "Dockerfile existe" { Test-Path "Dockerfile" }
Run-Test "docker-compose.yml existe" { Test-Path "docker-compose.yml" }
Run-Test ".env.docker existe" { Test-Path ".env.docker" }
Run-Test ".dockerignore existe" { Test-Path ".dockerignore" }

Write-Host ""
Write-Host "📋 VALIDATION DE LA CONFIGURATION" -ForegroundColor Blue
Write-Host "================================" -ForegroundColor Blue

# Test 2: Vérifier les variables d'environnement critiques
if (Get-Content ".env.docker" | Select-String "JWT_SECRET=udm-sigb-2024-production") {
    Write-Host "✅ JWT_SECRET configuré correctement" -ForegroundColor Green
    $TestsPassed++
} else {
    Write-Host "❌ JWT_SECRET non configuré" -ForegroundColor Red
    $TestsFailed++
}
$TestsTotal++

if (Get-Content ".env.docker" | Select-String "AD_SERVER=ldap://ad.udm.edu.cm") {
    Write-Host "✅ Serveur AD configuré correctement" -ForegroundColor Green
    $TestsPassed++
} else {
    Write-Host "❌ Serveur AD non configuré" -ForegroundColor Red
    $TestsFailed++
}
$TestsTotal++

if (Get-Content ".env.docker" | Select-String "EMAIL_API_KEY=SG\.") {
    Write-Host "✅ SendGrid configuré correctement" -ForegroundColor Green
    $TestsPassed++
} else {
    Write-Host "❌ SendGrid non configuré" -ForegroundColor Red
    $TestsFailed++
}
$TestsTotal++

Write-Host ""
Write-Host "🐳 VALIDATION DE L'ENVIRONNEMENT DOCKER" -ForegroundColor Blue
Write-Host "================================" -ForegroundColor Blue

# Test 3: Vérifier Docker
$dockerInstalled = Run-Test "Docker installé" { Get-Command docker -ErrorAction SilentlyContinue }
if ($dockerInstalled) {
    Run-Test "Docker actif" { docker info 2>$null }
    Run-Test "Docker Compose installé" { Get-Command docker-compose -ErrorAction SilentlyContinue }
} else {
    Write-Host "⚠️  Docker n'est pas installé. Installation requise pour le déploiement." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🌐 VALIDATION DE LA CONNECTIVITÉ" -ForegroundColor Blue
Write-Host "================================" -ForegroundColor Blue

# Test 4: Connectivité réseau
Run-Test "Connectivité Internet" { Test-NetConnection -ComputerName "8.8.8.8" -Port 53 -InformationLevel Quiet }

# Test 5: Résolution DNS UdM (si accessible)
$adDns = Run-Test "DNS ad.udm.edu.cm" { Resolve-DnsName "ad.udm.edu.cm" -ErrorAction SilentlyContinue }
if ($adDns) {
    Write-Host "✅ Serveur AD UdM accessible via DNS" -ForegroundColor Green
} else {
    Write-Host "⚠️  Serveur AD UdM non accessible - utilisation du fallback IP" -ForegroundColor Yellow
}

$filesDns = Run-Test "DNS files.udm.edu.cm" { Resolve-DnsName "files.udm.edu.cm" -ErrorAction SilentlyContinue }
if ($filesDns) {
    Write-Host "✅ Serveur de fichiers UdM accessible via DNS" -ForegroundColor Green
} else {
    Write-Host "⚠️  Serveur de fichiers UdM non accessible - utilisation du fallback IP" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📊 ================================" -ForegroundColor Blue
Write-Host "📈 RÉSULTATS DE LA VALIDATION" -ForegroundColor Blue
Write-Host "================================" -ForegroundColor Blue
Write-Host "🧪 Tests total: $TestsTotal" -ForegroundColor White
Write-Host "✅ Tests réussis: $TestsPassed" -ForegroundColor Green
Write-Host "❌ Tests échoués: $TestsFailed" -ForegroundColor Red

if ($TestsFailed -eq 0) {
    Write-Host ""
    Write-Host "🎉 VALIDATION COMPLÈTE RÉUSSIE !" -ForegroundColor Green
    Write-Host "🚀 Votre configuration Docker est prête pour le déploiement !" -ForegroundColor Green
    Write-Host ""
    Write-Host "🔗 Commandes de démarrage:" -ForegroundColor Cyan
    Write-Host "   docker-compose up -d" -ForegroundColor White
    Write-Host "   http://localhost:3000" -ForegroundColor White
    exit 0
} else {
    Write-Host ""
    Write-Host "⚠️  Validation partiellement réussie" -ForegroundColor Yellow
    Write-Host "🔧 Veuillez corriger les erreurs avant le déploiement" -ForegroundColor Yellow
    
    if (-not $dockerInstalled) {
        Write-Host ""
        Write-Host "📥 INSTALLATION DOCKER REQUISE:" -ForegroundColor Yellow
        Write-Host "1. Telecharger Docker Desktop: https://www.docker.com/products/docker-desktop" -ForegroundColor White
        Write-Host "2. Installer Docker Desktop" -ForegroundColor White
        Write-Host "3. Redemarrer votre ordinateur" -ForegroundColor White
        Write-Host "4. Relancer ce script de validation" -ForegroundColor White
    }
    
    exit 1
}
