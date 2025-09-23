/**
 * 🚀 TESTS RAPIDES - SIGB UdM
 * ===========================
 * 
 * Tests rapides pour vérifier les fonctionnalités critiques
 * Idéal pour les vérifications avant déploiement
 */

const fetch = require('node-fetch');

class QuickTests {
  constructor(baseUrl = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
    this.results = [];
  }

  async runQuickTests() {
    console.log('🚀 TESTS RAPIDES SIGB UdM');
    console.log('========================');
    
    // Tests critiques uniquement
    await this.testServerHealth();
    await this.testPublicCatalog();
    await this.testHomepage();
    await this.testLoginPage();
    await this.testAPIResponses();
    
    return this.generateQuickReport();
  }

  async testServerHealth() {
    console.log('🏥 Test de santé du serveur...');
    
    try {
      const start = Date.now();
      const response = await fetch(`${this.baseUrl}/`);
      const duration = Date.now() - start;
      
      if (response.ok) {
        this.addResult('Serveur en ligne', 'passed', {
          status: response.status,
          responseTime: duration,
          message: 'Serveur accessible'
        });
      } else {
        this.addResult('Serveur en ligne', 'failed', {
          status: response.status,
          responseTime: duration
        });
      }
    } catch (error) {
      this.addResult('Serveur en ligne', 'failed', {
        error: error.message
      });
    }
  }

  async testPublicCatalog() {
    console.log('📚 Test du catalogue public...');
    
    try {
      const response = await fetch(`${this.baseUrl}/api/public/catalog?limit=5`);
      const data = await response.json();
      
      if (response.ok && data.data && Array.isArray(data.data)) {
        this.addResult('Catalogue public', 'passed', {
          itemCount: data.data.length,
          hasData: data.data.length > 0,
          message: 'Catalogue accessible avec données'
        });
      } else {
        this.addResult('Catalogue public', 'failed', {
          status: response.status,
          error: 'Données invalides ou manquantes'
        });
      }
    } catch (error) {
      this.addResult('Catalogue public', 'failed', {
        error: error.message
      });
    }
  }

  async testHomepage() {
    console.log('🏠 Test de la page d\'accueil...');
    
    try {
      const response = await fetch(`${this.baseUrl}/`);
      const html = await response.text();
      
      const hasTitle = html.includes('<title>') && !html.includes('<title></title>');
      const hasUdMLogo = html.includes('UdM') || html.includes('Université des Montagnes');
      const hasNavigation = html.includes('nav') || html.includes('menu');
      
      const score = [hasTitle, hasUdMLogo, hasNavigation].filter(Boolean).length;
      
      this.addResult('Page d\'accueil', score >= 2 ? 'passed' : 'failed', {
        hasTitle,
        hasUdMLogo,
        hasNavigation,
        score: `${score}/3`,
        message: score >= 2 ? 'Page bien structurée' : 'Éléments manquants'
      });
      
    } catch (error) {
      this.addResult('Page d\'accueil', 'failed', {
        error: error.message
      });
    }
  }

  async testLoginPage() {
    console.log('🔐 Test de la page de connexion...');
    
    try {
      const response = await fetch(`${this.baseUrl}/auth/login`);
      const html = await response.text();
      
      const hasUsernameField = html.includes('username') || html.includes('email');
      const hasPasswordField = html.includes('password');
      const hasSubmitButton = html.includes('submit') || html.includes('Se connecter');
      
      const formComplete = hasUsernameField && hasPasswordField && hasSubmitButton;
      
      this.addResult('Page de connexion', formComplete ? 'passed' : 'failed', {
        hasUsernameField,
        hasPasswordField,
        hasSubmitButton,
        message: formComplete ? 'Formulaire complet' : 'Champs manquants'
      });
      
    } catch (error) {
      this.addResult('Page de connexion', 'failed', {
        error: error.message
      });
    }
  }

  async testAPIResponses() {
    console.log('🌐 Test des APIs critiques...');
    
    const criticalAPIs = [
      { name: 'Analytics', endpoint: '/api/analytics' },
      { name: 'Livres', endpoint: '/api/books' },
      { name: 'Thèses', endpoint: '/api/theses' },
      { name: 'Emprunts', endpoint: '/api/loans' },
      { name: 'Réservations', endpoint: '/api/reservations' }
    ];

    let passedAPIs = 0;
    const apiResults = [];

    for (const api of criticalAPIs) {
      try {
        const response = await fetch(`${this.baseUrl}${api.endpoint}`);
        
        if (response.ok || response.status === 401) {
          // 401 est acceptable pour les APIs protégées
          passedAPIs++;
          apiResults.push(`✅ ${api.name}`);
        } else {
          apiResults.push(`❌ ${api.name} (${response.status})`);
        }
      } catch (error) {
        apiResults.push(`❌ ${api.name} (erreur)`);
      }
    }

    const successRate = (passedAPIs / criticalAPIs.length) * 100;
    
    this.addResult('APIs critiques', successRate >= 80 ? 'passed' : 'failed', {
      passedAPIs,
      totalAPIs: criticalAPIs.length,
      successRate: `${successRate.toFixed(1)}%`,
      details: apiResults,
      message: successRate >= 80 ? 'APIs fonctionnelles' : 'Problèmes détectés'
    });
  }

  addResult(testName, status, details = {}) {
    this.results.push({
      name: testName,
      status,
      details,
      timestamp: new Date().toISOString()
    });
    
    const statusIcon = status === 'passed' ? '✅' : '❌';
    console.log(`${statusIcon} ${testName}: ${status.toUpperCase()}`);
  }

  generateQuickReport() {
    const summary = {
      total: this.results.length,
      passed: this.results.filter(r => r.status === 'passed').length,
      failed: this.results.filter(r => r.status === 'failed').length
    };

    const successRate = ((summary.passed / summary.total) * 100).toFixed(1);
    
    console.log('\n📊 RÉSUMÉ DES TESTS RAPIDES');
    console.log('===========================');
    console.log(`Total: ${summary.total}`);
    console.log(`Réussis: ${summary.passed}`);
    console.log(`Échoués: ${summary.failed}`);
    console.log(`Taux de réussite: ${successRate}%`);
    
    console.log('\n🎯 STATUT:');
    if (successRate >= 90) {
      console.log('🎉 EXCELLENT! Système prêt.');
    } else if (successRate >= 70) {
      console.log('⚠️ ACCEPTABLE! Quelques améliorations.');
    } else {
      console.log('🚨 PROBLÉMATIQUE! Corrections nécessaires.');
    }

    // Détails des échecs
    const failures = this.results.filter(r => r.status === 'failed');
    if (failures.length > 0) {
      console.log('\n❌ ÉCHECS DÉTECTÉS:');
      failures.forEach(failure => {
        console.log(`- ${failure.name}: ${failure.details.error || failure.details.message || 'Erreur inconnue'}`);
      });
    }

    return {
      title: 'Tests Rapides SIGB UdM',
      timestamp: new Date().toISOString(),
      summary,
      successRate: parseFloat(successRate),
      tests: this.results,
      status: successRate >= 90 ? 'excellent' : successRate >= 70 ? 'acceptable' : 'problematique'
    };
  }
}

// Exécution si appelé directement
if (require.main === module) {
  const quickTests = new QuickTests();
  quickTests.runQuickTests()
    .then(report => {
      console.log('\n🎯 Tests rapides terminés');
      process.exit(report.summary.failed > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('❌ Erreur dans les tests rapides:', error);
      process.exit(1);
    });
}

module.exports = QuickTests;
