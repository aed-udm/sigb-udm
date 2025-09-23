#!/bin/bash

# ================================
# SCRIPT DE TEST DE CONNECTIVITÉ
# SIGB UdM - Vérification AD et FTP
# ================================

set -e

echo "🔍 ================================"
echo "🧪 Test de connectivité SIGB UdM"
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

# Variables de configuration (depuis votre .env.local)
AD_SERVER="ad.udm.edu.cm"
AD_PORT="389"
AD_FALLBACK="192.168.107.52"
FILE_SERVER="files.udm.edu.cm"
FTP_PORT="21"
FILE_SERVER_FALLBACK="192.168.107.52"

echo ""
log_info "🔍 Test de résolution DNS..."

# Test DNS pour AD
if nslookup $AD_SERVER > /dev/null 2>&1; then
    log_success "DNS AD résolu: $AD_SERVER"
else
    log_warning "DNS AD non résolu: $AD_SERVER, utilisation du fallback"
    AD_SERVER=$AD_FALLBACK
fi

# Test DNS pour serveur de fichiers
if nslookup $FILE_SERVER > /dev/null 2>&1; then
    log_success "DNS Serveur de fichiers résolu: $FILE_SERVER"
else
    log_warning "DNS Serveur de fichiers non résolu: $FILE_SERVER, utilisation du fallback"
    FILE_SERVER=$FILE_SERVER_FALLBACK
fi

echo ""
log_info "🌐 Test de connectivité réseau..."

# Test connectivité AD
if timeout 5 bash -c "echo >/dev/tcp/$AD_SERVER/$AD_PORT" 2>/dev/null; then
    log_success "Connectivité AD OK: $AD_SERVER:$AD_PORT"
else
    log_error "Connectivité AD ÉCHEC: $AD_SERVER:$AD_PORT"
fi

# Test connectivité FTP
if timeout 5 bash -c "echo >/dev/tcp/$FILE_SERVER/$FTP_PORT" 2>/dev/null; then
    log_success "Connectivité FTP OK: $FILE_SERVER:$FTP_PORT"
else
    log_error "Connectivité FTP ÉCHEC: $FILE_SERVER:$FTP_PORT"
fi

echo ""
log_info "🐳 Test des services Docker..."

# Vérifier si Docker est en cours d'exécution
if docker ps > /dev/null 2>&1; then
    log_success "Docker est actif"
    
    # Vérifier les conteneurs SIGB
    if docker-compose ps | grep -q "Up"; then
        log_success "Services SIGB UdM actifs"
        
        # Test de l'API de santé
        sleep 5
        if curl -f http://localhost:3000/api/health/database > /dev/null 2>&1; then
            log_success "API de santé répond correctement"
        else
            log_warning "API de santé ne répond pas (normal si premier démarrage)"
        fi
        
    else
        log_warning "Services SIGB UdM non actifs"
    fi
else
    log_error "Docker n'est pas actif"
fi

echo ""
log_info "📊 Résumé des tests de connectivité:"
echo "================================"
echo "🏢 Active Directory: $AD_SERVER:$AD_PORT"
echo "📁 Serveur de fichiers: $FILE_SERVER:$FTP_PORT"
echo "🗄️  Base de données: localhost:3306 (Docker)"
echo "🌐 Application: http://localhost:3000"
echo "================================"

echo ""
log_success "Tests de connectivité terminés ! 🎉"
