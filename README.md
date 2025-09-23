# Système de Gestion de Bibliothèque Cameroun

Une application moderne et immersive de gestion de bibliothèque camerounaise construite avec Next.js 15, TypeScript, MySQL et Tailwind CSS. Conforme aux standards CAMES/DICAMES.

## 🚀 Fonctionnalités

### ✨ Fonctionnalités Principales
- **Gestion des Livres** : Cataloguez et gérez votre collection avec des informations détaillées (MFN, titre, auteur, éditeur, etc.)
- **Gestion des Thèses** : Organisez et archivez les thèses avec métadonnées complètes
- **Gestion des Usagers** : Administrez les comptes utilisateurs avec codes-barres uniques
- **Système d'Emprunts** : Gérez les emprunts avec limitation (3 livres max par défaut)
- **Suivi des Retards** : Détection automatique des retards et notifications
- **Statistiques** : Tableaux de bord avec analyses et rapports détaillés

### �️ Conformité CAMES/DICAMES
- **Export Dublin Core** : Métadonnées standardisées pour l'interopérabilité
- **Protocole OAI-PMH** : Moissonnage automatique par les systèmes externes
- **Validation PDF/A** : Archivage long terme conforme ISO 19005
- **Dépôt DICAMES** : Export automatique vers l'archive scientifique CAMES
- **Métadonnées Bilingues** : Support français/anglais pour la recherche internationale
- **Classification Documentaire** : Dewey, CDU et vedettes-matières

### �🎨 Design & UX
- **Interface Immersive** : Design moderne avec animations fluides (Framer Motion)
- **Responsive** : Compatible mobile, tablette et desktop
- **Mode Sombre** : Thème sombre/clair avec transition automatique
- **Accessibilité** : Conforme aux standards WCAG
- **Glass Morphism** : Effets visuels modernes et élégants

### 🔧 Technologies Utilisées
- **Frontend** : Next.js 15 (App Router), TypeScript, React 19
- **Styling** : Tailwind CSS, Shadcn/ui, Framer Motion
- **Backend** : MySQL 8.0, APIs REST personnalisées
- **State Management** : TanStack Query (React Query)
- **Validation** : Zod
- **Forms** : React Hook Form
- **Icons** : Lucide React
- **Standards** : CAMES/DICAMES, Dublin Core, OAI-PMH, PDF/A

## 📋 Prérequis

- Node.js 18+
- npm ou yarn
- MySQL 8.0+ ou XAMPP
- 4GB RAM minimum

## 🛠️ Installation

1. **Cloner le projet**
```bash
git clone <repository-url>
cd projet8tutorer
```

2. **Installer les dépendances**
```bash
npm install
```

3. **Configuration MySQL**
   - Installez MySQL Server sur votre machine
   - Copiez `.env.example` vers `.env.local`
   - Remplissez les variables d'environnement :

```env
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=bibliotheque_app
MYSQL_PASSWORD=your_mysql_password
MYSQL_DATABASE=bibliotheque_cameroun
```

4. **Initialiser la base de données**
   - Exécutez le script SQL dans `mysql/schema.sql` pour créer la structure
   - Optionnel : Ajoutez les données de test avec `mysql/seed.sql`

5. **Démarrer l'application**
```bash
npm run dev
```

L'application sera accessible sur [http://localhost:3000](http://localhost:3000)

## 📊 Structure de la Base de Données

### Tables Principales
- **books** : Catalogue des livres avec métadonnées complètes
- **theses** : Archive des thèses avec informations académiques
- **users** : Utilisateurs de la bibliothèque avec codes-barres
- **loans** : Historique des emprunts et retours

### Fonctionnalités Avancées
- **Triggers automatiques** : Mise à jour des disponibilités
- **Contraintes métier** : Limitation des emprunts, validation des données
- **Index optimisés** : Recherche full-text en français
- **RLS (Row Level Security)** : Sécurité au niveau des lignes

## 🎯 Utilisation

### Connexion de Démonstration
- **Email** : `admin@bibliotheque.cm`
- **Mot de passe** : `admin123`

### Comptes de Test Disponibles
| Email | Mot de passe | Rôle | Accès |
|-------|--------------|------|-------|
| `admin@bibliotheque.cm` | `admin123` | Administrateur | Accès complet |
| `bibliothecaire@udm.cm` | `biblio123` | Bibliothécaire | Gestion catalogue |
| `circulation@udm.cm` | `circulation123` | Agent Circulation | Emprunts/retours |
| `enregistrement@udm.cm` | `enregistrement123` | Agent Enregistrement | Gestion usagers |

### Navigation
1. **Accueil** : Vue d'ensemble et accès rapide
2. **Dashboard** : Statistiques et activités récentes
3. **Livres** : Gestion du catalogue
4. **Thèses** : Archive académique
5. **Usagers** : Gestion des utilisateurs
6. **Emprunts** : Suivi des prêts

## 🔒 Sécurité

- **Authentification** : Système custom avec JWT et bcrypt
- **Validation** : Schémas Zod côté client et serveur
- **Sanitisation** : Protection contre les injections SQL
- **HTTPS** : Chiffrement des communications
- **Rôles** : Système de permissions granulaires

## 📱 Responsive Design

L'application est entièrement responsive avec :
- **Mobile First** : Optimisé pour les petits écrans
- **Breakpoints** : sm, md, lg, xl, 2xl
- **Touch Friendly** : Interactions tactiles optimisées
- **Performance** : Chargement rapide sur tous les appareils

## 🚀 Déploiement

### Vercel (Recommandé)
```bash
npm run build
vercel --prod
```

### Docker
```bash
docker build -t bibliotheque-app .
docker run -p 3000:3000 bibliotheque-app
```

## 🤝 Contribution

1. Fork le projet
2. Créez une branche feature (`git checkout -b feature/AmazingFeature`)
3. Commit vos changements (`git commit -m 'Add some AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrez une Pull Request

## 📞 **SUPPORT ET AIDE**

### **🆘 Besoin d'aide ?**
1. **Consultez** la [documentation appropriée](docs/README.md)
2. **Exécutez** les scripts de diagnostic
3. **Vérifiez** les logs et rapports générés
4. **Contactez** l'équipe de support

### **📚 Ressources**
- **[Documentation complète](docs/README.md)** - Tous les guides
- **[Scripts utilitaires](scripts/README.md)** - Outils de maintenance
- **[Rapports techniques](docs/technical-reports/)** - Analyses détaillées
- **[Issues GitHub](https://github.com/votre-repo/issues)** - Support communautaire

## 📄 **LICENCE**

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## 🙏 **REMERCIEMENTS**

- **CAMES** pour les standards bibliographiques africains
- **Bibliothèque nationale de France** pour l'API BNF
- **Communauté open source** pour les outils utilisés
- **Bibliothèques camerounaises** pour les retours et tests

---

**🌟 Développé avec ❤️ pour les bibliothèques camerounaises et africaines**

**📊 Projet parfaitement organisé** - Consultez **[RAPPORT_ORGANISATION_FINALE_COMPLETE.md](docs/technical-reports/RAPPORT_ORGANISATION_FINALE_COMPLETE.md)** pour les détails de l'organisation.
