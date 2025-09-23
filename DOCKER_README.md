# 🐳 SIGB UdM - Guide Docker

## 📋 Vue d'ensemble

Ce guide vous permet de déployer le **Système Intégré de Gestion de Bibliothèque (SIGB)** de l'Université des Montagnes en utilisant Docker.

## 🚀 Démarrage rapide

### Prérequis
- Docker 20.10+
- Docker Compose 2.0+
- 4GB RAM minimum
- 10GB espace disque

### Installation en une commande

```bash
# Linux/macOS
chmod +x docker-start.sh && ./docker-start.sh

# Windows (PowerShell)
docker-compose up --build -d
```

## 🏗️ Architecture Docker

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Nginx Proxy   │    │   SIGB UdM App  │    │   MySQL 8.0     │
│   Port: 80/443  │────│   Port: 3000    │────│   Port: 3306    │
│   (Optionnel)   │    │   Next.js 15    │    │   UTF8MB4       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📦 Services inclus

### 1. **sigb-udm** (Application principale)
- **Image**: Custom build from Dockerfile
- **Port**: 3000
- **Technologie**: Next.js 15 + TypeScript
- **Fonctionnalités**:
  - Interface web moderne
  - API REST complète
  - Authentification Active Directory
  - Gestion documentaire
  - Standards CAMES/DICAMES

### 2. **mysql-db** (Base de données)
- **Image**: mysql:8.0
- **Port**: 3306
- **Configuration**:
  - UTF8MB4 encoding
  - Optimisations performance
  - Healthcheck intégré
  - Persistence des données

### 3. **nginx** (Proxy - Optionnel)
- **Image**: nginx:alpine
- **Ports**: 80, 443
- **Fonctionnalités**:
  - SSL/TLS termination
  - Load balancing
  - Compression gzip

## 🔧 Configuration

### Variables d'environnement

Créez un fichier `.env` pour personnaliser la configuration :

```env
# Base de données
DB_HOST=mysql-db
DB_NAME=bibliotheque_cameroun
DB_USER=sigb_user
DB_PASSWORD=votre_mot_de_passe_securise

# Active Directory
AD_SERVER=ldap://votre-serveur-ad.com
AD_ADMIN_USER=admin@votre-domaine.com
AD_ADMIN_PASSWORD=votre_mot_de_passe_ad

# JWT
JWT_SECRET=votre_cle_jwt_ultra_securisee

# Serveur de fichiers
FTP_HOST=votre-serveur-ftp.com
FTP_USER=utilisateur_ftp
FTP_PASSWORD=mot_de_passe_ftp
```

## 🚀 Commandes utiles

### Démarrage
```bash
# Démarrage complet
docker-compose up -d

# Avec reconstruction
docker-compose up --build -d

# Avec Nginx
docker-compose --profile with-nginx up -d
```

### Monitoring
```bash
# Voir les logs
docker-compose logs -f

# Logs d'un service spécifique
docker-compose logs -f sigb-udm

# État des services
docker-compose ps

# Statistiques ressources
docker stats
```

### Maintenance
```bash
# Arrêt
docker-compose down

# Arrêt avec suppression des volumes
docker-compose down -v

# Nettoyage complet
docker system prune -a
```

## 📊 Monitoring et santé

### Healthchecks intégrés
- **Application**: `GET /api/health/database`
- **MySQL**: `mysqladmin ping`
- **Nginx**: Status page

### Logs
- **Application**: `./logs/app.log`
- **Nginx**: `./logs/nginx/`
- **MySQL**: Logs Docker

## 🔒 Sécurité

### Bonnes pratiques appliquées
- ✅ Utilisateur non-root dans les conteneurs
- ✅ Secrets via variables d'environnement
- ✅ Réseau isolé
- ✅ Volumes avec permissions restreintes
- ✅ Healthchecks pour la disponibilité

### Recommandations production
1. Utilisez des secrets Docker pour les mots de passe
2. Configurez SSL/TLS avec des certificats valides
3. Activez les logs centralisés
4. Configurez des sauvegardes automatiques
5. Surveillez les métriques avec Prometheus/Grafana

## 🗄️ Persistence des données

### Volumes Docker
- `mysql-data`: Données MySQL persistantes
- `./public/uploads`: Fichiers uploadés
- `./public/documents`: Documents de la bibliothèque
- `./logs`: Logs de l'application

### Sauvegarde
```bash
# Sauvegarde MySQL
docker-compose exec mysql-db mysqldump -u sigb_user -p bibliotheque_cameroun > backup.sql

# Sauvegarde complète
tar -czf sigb-backup-$(date +%Y%m%d).tar.gz data/ public/ logs/
```

## 🐛 Dépannage

### Problèmes courants

**1. Port 3000 déjà utilisé**
```bash
# Changer le port dans docker-compose.yml
ports:
  - "3001:3000"  # Utiliser le port 3001
```

**2. Erreur de connexion MySQL**
```bash
# Vérifier les logs MySQL
docker-compose logs mysql-db

# Redémarrer MySQL
docker-compose restart mysql-db
```

**3. Problème de permissions**
```bash
# Corriger les permissions
sudo chown -R $USER:$USER data/ logs/ public/
```

## 📈 Performance

### Optimisations incluses
- Multi-stage build pour réduire la taille
- Cache des dépendances Node.js
- Configuration MySQL optimisée
- Compression gzip via Nginx
- Images Alpine Linux légères

### Métriques typiques
- **Taille image finale**: ~200MB
- **Temps de démarrage**: ~30 secondes
- **RAM utilisée**: ~512MB
- **CPU**: 1-2 cores recommandés

## 🆘 Support

Pour obtenir de l'aide :
1. Consultez les logs : `docker-compose logs`
2. Vérifiez la configuration réseau
3. Contactez l'équipe SIGB UdM

---

**🏫 Université des Montagnes - SIGB UdM v8.2.216**
