#!/bin/bash

# ================================
# SCRIPT DE DÉMARRAGE DOCKER
# SIGB UdM - Université des Montagnes
# ================================

set -e

echo "🚀 ================================"
echo "📚 SIGB UdM - Démarrage Docker"
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

# Vérifier si Docker est installé
if ! command -v docker &> /dev/null; then
    log_error "Docker n'est pas installé. Veuillez installer Docker d'abord."
    exit 1
fi

# Vérifier si Docker Compose est installé
if ! command -v docker-compose &> /dev/null; then
    log_error "Docker Compose n'est pas installé. Veuillez installer Docker Compose d'abord."
    exit 1
fi

# Validation préalable de la configuration
log_info "Validation de la configuration..."
if [ -f "docker-validate.sh" ]; then
    chmod +x docker-validate.sh
    if ! ./docker-validate.sh; then
        log_error "Validation échouée. Veuillez corriger les erreurs."
        exit 1
    fi
else
    log_warning "Script de validation non trouvé, continuation..."
fi

# Créer les répertoires nécessaires
log_info "Création des répertoires nécessaires..."
mkdir -p data/mysql
mkdir -p logs/nginx
mkdir -p public/uploads
mkdir -p public/documents

# Définir les permissions
chmod 755 data/mysql
chmod 755 logs
chmod 755 public/uploads
chmod 755 public/documents

log_success "Répertoires créés avec succès"

# Arrêter les conteneurs existants
log_info "Arrêt des conteneurs existants..."
docker-compose down --remove-orphans

# Construire et démarrer les services
log_info "Construction et démarrage des services..."
docker-compose up --build -d

# Attendre que les services soient prêts
log_info "Attente du démarrage des services..."
sleep 30

# Vérifier l'état des services
log_info "Vérification de l'état des services..."

if docker-compose ps | grep -q "Up"; then
    log_success "Services démarrés avec succès !"
    
    echo ""
    echo "🌐 ================================"
    echo "📊 ÉTAT DES SERVICES"
    echo "================================"
    docker-compose ps
    
    echo ""
    echo "🔗 ================================"
    echo "📱 ACCÈS À L'APPLICATION"
    echo "================================"
    echo "🌐 Application Web: http://localhost:3000"
    echo "🗄️  Base de données: localhost:3306"
    echo "📊 Logs: docker-compose logs -f"
    echo "🛑 Arrêt: docker-compose down"
    echo "================================"
    
else
    log_error "Erreur lors du démarrage des services"
    echo ""
    echo "📋 Logs des erreurs:"
    docker-compose logs
    exit 1
fi

log_success "SIGB UdM démarré avec succès ! 🎉"
