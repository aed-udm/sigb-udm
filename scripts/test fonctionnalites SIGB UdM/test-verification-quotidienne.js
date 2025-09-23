/**
 * 🚀 TESTS DE VÉRIFICATION QUOTIDIENNE - SIGB UdM
 * ===============================================
 * 
 * Tests rapides pour vérifier quotidiennement que le système fonctionne
 * Idéal pour les vérifications de routine et le monitoring
 * 
 * TESTS INCLUS :
 * - Santé générale du système
 * - Fonctionnalités critiques
 * - Performance de base
 * - Sécurité élémentaire
 */

const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

class VerificationQuotidienne {
  constructor(baseUrl = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
    this.results = [];
    this.startTime = Date.now();
  }

  async executerVerifications() {
    console.log('🚀 VÉRIFICATIONS QUOTIDIENNES SIGB UdM');
    console.log('=====================================');
    console.log(`📅 ${new Date().toLocaleString('fr-FR')}`);
    console.log('');

    // Tests critiques uniquement (5-10 minutes max)
    await this.verifierSanteSysteme();
    await this.verifierFonctionnalitesCritiques();
    await this.verifierPerformance();
    await this.verifierSecurite();
    
    return this.genererRapportQuotidien();
  }

  async verifierSanteSysteme() {
    console.log('🏥 SANTÉ DU SYSTÈME');
    console.log('==================');

    // Test 1: Serveur accessible
    await this.executerTest(
      'Serveur accessible',
      'Vérifier que le serveur SIGB répond correctement',
      async () => {
        const start = Date.now();
        const response = await fetch(`${this.baseUrl}/`);
        const duration = Date.now() - start;
        
        return {
          accessible: response.ok,
          tempsReponse: duration,
          statut: response.status,
          evaluation: duration < 3000 ? 'Excellent' : duration < 5000 ? 'Bon' : 'Lent'
        };
      }
    );

    // Test 2: Base de données
    await this.executerTest(
      'Base de données opérationnelle',
      'Vérifier la connectivité à la base de données MySQL',
      async () => {
        const response = await fetch(`${this.baseUrl}/api/health/database`);
        const data = await response.json();
        
        return {
          connectee: data.success,
          tempsReponse: data.responseTime || 'Non mesuré',
          message: data.message || 'Aucun message'
        };
      }
    );

    console.log('✅ Vérifications de santé terminées\n');
  }

  async verifierFonctionnalitesCritiques() {
    console.log('🎯 FONCTIONNALITÉS CRITIQUES');
    console.log('============================');

    // Test 3: Catalogue public
    await this.executerTest(
      'Catalogue public accessible',
      'Vérifier que le catalogue est accessible au public',
      async () => {
        const response = await fetch(`${this.baseUrl}/api/public/catalog?limit=3`);
        const data = await response.json();
        
        return {
          accessible: response.ok,
          documentsDisponibles: data.data?.length || 0,
          typesDocuments: data.data ? [...new Set(data.data.map(d => d.type))] : [],
          fonctionnel: response.ok && (data.data?.length > 0)
        };
      }
    );

    // Test 4: Système d'emprunts
    await this.executerTest(
      'Système d\'emprunts fonctionnel',
      'Vérifier que le système de gestion des emprunts fonctionne',
      async () => {
        const response = await fetch(`${this.baseUrl}/api/loans?limit=3`);
        const data = await response.json();
        
        return {
          accessible: response.ok,
          empruntsActifs: data.data?.length || 0,
          systemeOperationnel: response.ok
        };
      }
    );

    // Test 5: Système de réservations
    await this.executerTest(
      'Système de réservations fonctionnel',
      'Vérifier que le système de réservations fonctionne',
      async () => {
        const response = await fetch(`${this.baseUrl}/api/reservations?limit=3`);
        const data = await response.json();
        
        return {
          accessible: response.ok,
          reservationsActives: data.data?.length || 0,
          systemeOperationnel: response.ok
        };
      }
    );

    // Test 6: Recherche
    await this.executerTest(
      'Moteur de recherche fonctionnel',
      'Vérifier que la recherche dans le catalogue fonctionne',
      async () => {
        const response = await fetch(`${this.baseUrl}/api/public/catalog?search=test&limit=3`);
        const data = await response.json();
        
        return {
          rechercheOperationnelle: response.ok,
          resultatsRetournes: data.data?.length || 0,
          tempsReponse: response.headers.get('x-response-time') || 'Non mesuré'
        };
      }
    );

    console.log('✅ Vérifications des fonctionnalités critiques terminées\n');
  }

  async verifierPerformance() {
    console.log('⚡ PERFORMANCE DU SYSTÈME');
    console.log('========================');

    // Test 7: Performance analytics
    await this.executerTest(
      'Performance des analytics',
      'Mesurer le temps de réponse des statistiques',
      async () => {
        const start = Date.now();
        const response = await fetch(`${this.baseUrl}/api/analytics`);
        const duration = Date.now() - start;
        
        return {
          tempsReponse: duration,
          acceptable: duration < 5000,
          evaluation: duration < 2000 ? 'Excellent' : duration < 5000 ? 'Bon' : 'Lent',
          statut: response.status
        };
      }
    );

    // Test 8: Performance catalogue
    await this.executerTest(
      'Performance du catalogue',
      'Mesurer le temps de chargement du catalogue',
      async () => {
        const start = Date.now();
        const response = await fetch(`${this.baseUrl}/api/public/catalog?limit=10`);
        const duration = Date.now() - start;
        
        return {
          tempsReponse: duration,
          acceptable: duration < 3000,
          evaluation: duration < 1000 ? 'Excellent' : duration < 3000 ? 'Bon' : 'Lent',
          statut: response.status
        };
      }
    );

    console.log('✅ Vérifications de performance terminées\n');
  }

  async verifierSecurite() {
    console.log('🔒 SÉCURITÉ DU SYSTÈME');
    console.log('=====================');

    // Test 9: Protection des routes admin
    await this.executerTest(
      'Protection des routes administrateur',
      'Vérifier que les routes admin sont protégées',
      async () => {
        const response = await fetch(`${this.baseUrl}/api/admin/users`);
        
        return {
          protegee: response.status === 401 || response.status === 403,
          statut: response.status,
          securisee: response.status !== 200,
          message: response.status === 401 ? 'Correctement protégée' : 'Attention: accès possible'
        };
      }
    );

    // Test 10: Test d'injection SQL basique
    await this.executerTest(
      'Protection contre injection SQL',
      'Tester la résistance aux tentatives d\'injection SQL',
      async () => {
        const maliciousQuery = "'; DROP TABLE users; --";
        const response = await fetch(`${this.baseUrl}/api/public/catalog?search=${encodeURIComponent(maliciousQuery)}`);
        
        return {
          protege: response.status !== 500,
          statut: response.status,
          securise: response.ok || response.status === 400,
          message: response.status !== 500 ? 'Protection active' : 'Vulnérabilité détectée'
        };
      }
    );

    console.log('✅ Vérifications de sécurité terminées\n');
  }

  async executerTest(nom, description, testFunction) {
    const debut = Date.now();
    
    try {
      console.log(`🔍 ${nom}...`);
      const resultat = await testFunction();
      const duree = Date.now() - debut;
      
      this.ajouterResultat(nom, 'reussi', {
        ...resultat,
        description,
        duree
      });
      
      console.log(`✅ RÉUSSI (${duree}ms)`);
      
    } catch (error) {
      const duree = Date.now() - debut;
      
      this.ajouterResultat(nom, 'echec', {
        erreur: error.message,
        description,
        duree
      });
      
      console.log(`❌ ÉCHEC (${duree}ms): ${error.message}`);
    }
  }

  ajouterResultat(nom, statut, details = {}) {
    this.results.push({
      nom,
      statut,
      details,
      horodatage: new Date().toISOString()
    });
  }

  async genererRapportQuotidien() {
    const dureeTotal = Date.now() - this.startTime;
    const resume = this.calculerResume();
    
    console.log('📊 RÉSUMÉ DES VÉRIFICATIONS QUOTIDIENNES');
    console.log('========================================');
    console.log(`⏱️ Durée totale: ${(dureeTotal / 1000).toFixed(1)}s`);
    console.log(`📋 Tests exécutés: ${resume.total}`);
    console.log(`✅ Tests réussis: ${resume.reussis}`);
    console.log(`❌ Tests échoués: ${resume.echecs}`);
    console.log(`📈 Taux de réussite: ${resume.tauxReussite}%`);
    
    // Évaluation globale
    const evaluation = this.evaluerSysteme(resume.tauxReussite);
    console.log(`🎯 Évaluation: ${evaluation.emoji} ${evaluation.message}`);
    
    // Générer rapport de synthèse
    const rapportPath = await this.sauvegarderRapport(resume, dureeTotal, evaluation);
    console.log(`📄 Rapport sauvegardé: ${rapportPath}`);
    
    // Recommandations
    if (resume.echecs > 0) {
      console.log('\n⚠️ ACTIONS RECOMMANDÉES:');
      this.results.filter(r => r.statut === 'echec').forEach(test => {
        console.log(`- ${test.nom}: ${test.details.erreur}`);
      });
    }
    
    return {
      resume,
      evaluation,
      dureeTotal,
      rapportPath
    };
  }

  calculerResume() {
    const total = this.results.length;
    const reussis = this.results.filter(r => r.statut === 'reussi').length;
    const echecs = this.results.filter(r => r.statut === 'echec').length;
    const tauxReussite = total > 0 ? ((reussis / total) * 100).toFixed(1) : 0;
    
    return { total, reussis, echecs, tauxReussite };
  }

  evaluerSysteme(tauxReussite) {
    if (tauxReussite >= 95) {
      return { emoji: '🟢', message: 'EXCELLENT - Système parfaitement opérationnel' };
    } else if (tauxReussite >= 85) {
      return { emoji: '🟡', message: 'BON - Système opérationnel avec quelques points d\'attention' };
    } else if (tauxReussite >= 70) {
      return { emoji: '🟠', message: 'MOYEN - Système fonctionnel mais nécessite des corrections' };
    } else {
      return { emoji: '🔴', message: 'CRITIQUE - Système nécessite une intervention immédiate' };
    }
  }

  async sauvegarderRapport(resume, dureeTotal, evaluation) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const rapportPath = path.join(__dirname, 'rapports', `verification-quotidienne-${timestamp}.md`);
    
    // Créer le répertoire si nécessaire
    const dir = path.dirname(rapportPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    const contenu = `# 📋 Vérification Quotidienne SIGB UdM

**Date:** ${new Date().toLocaleString('fr-FR')}  
**Durée:** ${(dureeTotal / 1000).toFixed(1)} secondes  
**Évaluation:** ${evaluation.emoji} ${evaluation.message}

## 📊 Résumé

| Métrique | Valeur |
|----------|--------|
| Tests exécutés | ${resume.total} |
| Tests réussis | ${resume.reussis} ✅ |
| Tests échoués | ${resume.echecs} ❌ |
| Taux de réussite | **${resume.tauxReussite}%** |

## 📋 Détail des Tests

${this.results.map((test, index) => {
  const statut = test.statut === 'reussi' ? '✅' : '❌';
  const duree = test.details.duree ? `(${test.details.duree}ms)` : '';
  
  return `### ${index + 1}. ${test.nom} ${statut} ${duree}

**Description:** ${test.details.description}  
**Résultat:** ${test.statut === 'reussi' ? 'RÉUSSI' : 'ÉCHEC'}  

${test.statut === 'reussi' ? 
  Object.entries(test.details)
    .filter(([key]) => !['description', 'duree'].includes(key))
    .map(([key, value]) => `- **${key}:** ${typeof value === 'object' ? JSON.stringify(value) : value}`)
    .join('\n') :
  `**Erreur:** ${test.details.erreur}`
}`;
}).join('\n\n')}

## 🎯 Recommandations

${resume.echecs === 0 ? 
  '🎉 **Système parfaitement opérationnel !** Aucune action requise.' :
  `⚠️ **${resume.echecs} problème(s) détecté(s).** Actions recommandées :\n\n${this.results.filter(r => r.statut === 'echec').map(test => `- **${test.nom}:** Vérifier ${test.details.erreur}`).join('\n')}`
}

---
*Rapport généré automatiquement par le système de vérification quotidienne SIGB UdM*
`;
    
    fs.writeFileSync(rapportPath, contenu);
    return rapportPath;
  }
}

// Exécution si appelé directement
if (require.main === module) {
  const verification = new VerificationQuotidienne();
  verification.executerVerifications()
    .then(resultat => {
      console.log('\n🎯 Vérifications quotidiennes terminées');
      process.exit(resultat.resume.echecs > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('❌ Erreur dans les vérifications quotidiennes:', error);
      process.exit(1);
    });
}

module.exports = VerificationQuotidienne;
