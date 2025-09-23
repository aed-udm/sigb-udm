#!/bin/bash

# ================================
# SCRIPT DE VALIDATION DOCKER
# SIGB UdM - Validation complète
# ================================

set -e

echo "🔍 ================================"
echo "✅ Validation Docker SIGB UdM"
echo "🏫 Université des Montagnes"
echo "⏰ $(date)"
echo "================================"

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction pour afficher les messages
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Compteurs
TESTS_TOTAL=0
TESTS_PASSED=0
TESTS_FAILED=0

# Fonction de test
run_test() {
    local test_name="$1"
    local test_command="$2"
    
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    log_info "Test: $test_name"
    
    if eval "$test_command" > /dev/null 2>&1; then
        log_success "$test_name - RÉUSSI"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        log_error "$test_name - ÉCHEC"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
}

echo ""
log_info "🔍 VALIDATION DES FICHIERS DE CONFIGURATION"
echo "================================"

# Test 1: Vérifier l'existence des fichiers Docker
run_test "Dockerfile existe" "test -f Dockerfile"
run_test "docker-compose.yml existe" "test -f docker-compose.yml"
run_test ".env.docker existe" "test -f .env.docker"
run_test ".dockerignore existe" "test -f .dockerignore"

# Test 2: Vérifier la syntaxe des fichiers
run_test "Syntaxe docker-compose.yml" "docker-compose config > /dev/null"

echo ""
log_info "🐳 VALIDATION DE L'ENVIRONNEMENT DOCKER"
echo "================================"

# Test 3: Vérifier Docker
run_test "Docker installé" "command -v docker"
run_test "Docker actif" "docker info"
run_test "Docker Compose installé" "command -v docker-compose"

echo ""
log_info "🌐 VALIDATION DE LA CONNECTIVITÉ"
echo "================================"

# Test 4: Connectivité réseau (si possible)
run_test "Connectivité Internet" "ping -c 1 8.8.8.8"

# Test 5: Résolution DNS UdM (si accessible)
if run_test "DNS ad.udm.edu.cm" "nslookup ad.udm.edu.cm"; then
    log_success "Serveur AD UdM accessible via DNS"
else
    log_warning "Serveur AD UdM non accessible - utilisation du fallback IP"
fi

if run_test "DNS files.udm.edu.cm" "nslookup files.udm.edu.cm"; then
    log_success "Serveur de fichiers UdM accessible via DNS"
else
    log_warning "Serveur de fichiers UdM non accessible - utilisation du fallback IP"
fi

echo ""
log_info "📋 VALIDATION DE LA CONFIGURATION"
echo "================================"

# Test 6: Vérifier les variables d'environnement critiques
if grep -q "JWT_SECRET=udm-sigb-2024-production" .env.docker; then
    log_success "JWT_SECRET configuré correctement"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    log_error "JWT_SECRET non configuré"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi
TESTS_TOTAL=$((TESTS_TOTAL + 1))

if grep -q "AD_SERVER=ldap://ad.udm.edu.cm" .env.docker; then
    log_success "Serveur AD configuré correctement"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    log_error "Serveur AD non configuré"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi
TESTS_TOTAL=$((TESTS_TOTAL + 1))

if grep -q "EMAIL_API_KEY=SG\." .env.docker; then
    log_success "SendGrid configuré correctement"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    log_error "SendGrid non configuré"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi
TESTS_TOTAL=$((TESTS_TOTAL + 1))

echo ""
log_info "🏗️ TEST DE BUILD DOCKER"
echo "================================"

# Test 7: Build de l'image Docker
if run_test "Build image Docker" "docker-compose build --no-cache sigb-udm"; then
    log_success "Image Docker construite avec succès"
else
    log_error "Échec du build Docker"
fi

echo ""
echo "📊 ================================"
echo "📈 RÉSULTATS DE LA VALIDATION"
echo "================================"
echo "🧪 Tests total: $TESTS_TOTAL"
echo "✅ Tests réussis: $TESTS_PASSED"
echo "❌ Tests échoués: $TESTS_FAILED"

if [ $TESTS_FAILED -eq 0 ]; then
    echo ""
    log_success "🎉 VALIDATION COMPLÈTE RÉUSSIE !"
    log_success "🚀 Votre configuration Docker est prête pour le déploiement !"
    echo ""
    echo "🔗 Commandes de démarrage:"
    echo "   docker-compose up -d"
    echo "   http://localhost:3000"
    exit 0
else
    echo ""
    log_warning "⚠️  Validation partiellement réussie"
    log_warning "🔧 Veuillez corriger les erreurs avant le déploiement"
    exit 1
fi
