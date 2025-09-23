/**
 * 🖥️ TESTS DES INTERFACES UTILISATEUR - SIGB UdM
 * ===============================================
 * 
 * Tests des interfaces web, accessibilité et expérience utilisateur
 */

const fetch = require('node-fetch');

class InterfaceTests {
  constructor(baseUrl = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
    this.results = [];
  }

  async runAllTests() {
    console.log('🖥️ DÉMARRAGE DES TESTS D\'INTERFACES');
    
    await this.testPageAccessibility();
    await this.testResponsiveDesign();
    await this.testNavigationFlow();
    await this.testFormValidation();
    await this.testSearchFunctionality();
    await this.testUserExperience();
    
    return this.generateReport();
  }

  async testPageAccessibility() {
    console.log('♿ Tests d\'accessibilité des pages...');
    
    const pages = [
      { name: 'Page d\'accueil', path: '/', critical: true },
      { name: 'Catalogue public', path: '/catalog', critical: true },
      { name: 'Connexion', path: '/auth/login', critical: true },
      { name: 'Dashboard', path: '/dashboard', critical: false },
      { name: 'Profil', path: '/profile', critical: false },
      { name: 'Livres', path: '/books', critical: false },
      { name: 'Thèses', path: '/theses', critical: false },
      { name: 'Mémoires', path: '/memoires', critical: false },
      { name: 'Rapports de stage', path: '/stage-reports', critical: false },
      { name: 'Emprunts', path: '/loans', critical: false },
      { name: 'Réservations', path: '/reservations', critical: false },
      { name: 'Administration', path: '/admin', critical: false }
    ];

    for (const page of pages) {
      await this.testPageAccess(page);
    }
  }

  async testPageAccess(page) {
    const start = Date.now();
    
    try {
      const response = await fetch(`${this.baseUrl}${page.path}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      const duration = Date.now() - start;
      const contentType = response.headers.get('content-type');
      
      if (response.ok) {
        // Vérifier que c'est du HTML
        const isHTML = contentType && contentType.includes('text/html');
        
        if (isHTML) {
          this.addResult(`Page ${page.name}`, 'passed', {
            status: response.status,
            duration,
            contentType,
            critical: page.critical
          });
        } else {
          this.addResult(`Page ${page.name}`, 'failed', {
            error: 'Contenu non-HTML',
            status: response.status,
            contentType,
            critical: page.critical
          });
        }
      } else {
        // Pour les pages protégées, 401/403 peut être normal
        if ((response.status === 401 || response.status === 403) && !page.critical) {
          this.addResult(`Page ${page.name}`, 'passed', {
            status: response.status,
            message: 'Page protégée (normal)',
            duration,
            critical: page.critical
          });
        } else {
          this.addResult(`Page ${page.name}`, 'failed', {
            error: `HTTP ${response.status}`,
            status: response.status,
            duration,
            critical: page.critical
          });
        }
      }
      
    } catch (error) {
      const duration = Date.now() - start;
      this.addResult(`Page ${page.name}`, 'failed', {
        error: error.message,
        duration,
        critical: page.critical
      });
    }
  }

  async testResponsiveDesign() {
    console.log('📱 Tests de design responsive...');
    
    const viewports = [
      { name: 'Mobile', width: 375, height: 667 },
      { name: 'Tablet', width: 768, height: 1024 },
      { name: 'Desktop', width: 1920, height: 1080 }
    ];

    // Test basique de responsive (vérification des meta tags)
    try {
      const response = await fetch(`${this.baseUrl}/`);
      const html = await response.text();
      
      const hasViewportMeta = html.includes('viewport');
      const hasResponsiveMeta = html.includes('width=device-width');
      
      this.addResult('Meta Viewport', hasViewportMeta && hasResponsiveMeta ? 'passed' : 'failed', {
        hasViewportMeta,
        hasResponsiveMeta,
        message: hasViewportMeta && hasResponsiveMeta ? 'Meta tags responsive présents' : 'Meta tags manquants'
      });
      
    } catch (error) {
      this.addResult('Meta Viewport', 'failed', { error: error.message });
    }

    // Test des CSS responsive
    await this.testCSSResponsive();
  }

  async testCSSResponsive() {
    try {
      const response = await fetch(`${this.baseUrl}/`);
      const html = await response.text();
      
      // Vérifier la présence de Tailwind CSS (framework responsive utilisé)
      const hasTailwind = html.includes('tailwind') || html.includes('tw-');
      const hasResponsiveClasses = html.includes('sm:') || html.includes('md:') || html.includes('lg:');
      
      this.addResult('CSS Responsive', hasTailwind || hasResponsiveClasses ? 'passed' : 'failed', {
        hasTailwind,
        hasResponsiveClasses,
        message: 'Framework CSS responsive détecté'
      });
      
    } catch (error) {
      this.addResult('CSS Responsive', 'failed', { error: error.message });
    }
  }

  async testNavigationFlow() {
    console.log('🧭 Tests de navigation...');
    
    // Test des liens de navigation principaux
    const navigationTests = [
      { name: 'Accueil vers Catalogue', from: '/', to: '/catalog' },
      { name: 'Catalogue vers Connexion', from: '/catalog', to: '/auth/login' },
      { name: 'Navigation breadcrumb', from: '/books', to: '/' }
    ];

    for (const nav of navigationTests) {
      await this.testNavigationLink(nav);
    }
  }

  async testNavigationLink(nav) {
    try {
      // Vérifier que la page source existe
      const sourceResponse = await fetch(`${this.baseUrl}${nav.from}`);
      
      if (sourceResponse.ok) {
        const html = await sourceResponse.text();
        
        // Vérifier la présence du lien de destination
        const hasLink = html.includes(`href="${nav.to}"`) || html.includes(`href='${nav.to}'`);
        
        this.addResult(`Navigation ${nav.name}`, hasLink ? 'passed' : 'failed', {
          from: nav.from,
          to: nav.to,
          linkFound: hasLink
        });
      } else {
        this.addResult(`Navigation ${nav.name}`, 'failed', {
          error: `Page source inaccessible: ${sourceResponse.status}`
        });
      }
      
    } catch (error) {
      this.addResult(`Navigation ${nav.name}`, 'failed', { error: error.message });
    }
  }

  async testFormValidation() {
    console.log('📝 Tests de validation des formulaires...');
    
    // Test du formulaire de connexion
    await this.testLoginForm();
    
    // Test du formulaire de recherche
    await this.testSearchForm();
  }

  async testLoginForm() {
    try {
      const response = await fetch(`${this.baseUrl}/auth/login`);
      const html = await response.text();
      
      // Vérifier la présence des champs requis
      const hasUsernameField = html.includes('name="username"') || html.includes('id="username"');
      const hasPasswordField = html.includes('name="password"') || html.includes('id="password"');
      const hasSubmitButton = html.includes('type="submit"') || html.includes('button');
      
      const formComplete = hasUsernameField && hasPasswordField && hasSubmitButton;
      
      this.addResult('Formulaire de connexion', formComplete ? 'passed' : 'failed', {
        hasUsernameField,
        hasPasswordField,
        hasSubmitButton,
        message: formComplete ? 'Formulaire complet' : 'Champs manquants'
      });
      
    } catch (error) {
      this.addResult('Formulaire de connexion', 'failed', { error: error.message });
    }
  }

  async testSearchForm() {
    try {
      const response = await fetch(`${this.baseUrl}/catalog`);
      const html = await response.text();
      
      // Vérifier la présence du champ de recherche
      const hasSearchField = html.includes('type="search"') || 
                           html.includes('placeholder="Rechercher"') ||
                           html.includes('name="search"');
      
      this.addResult('Formulaire de recherche', hasSearchField ? 'passed' : 'failed', {
        hasSearchField,
        message: hasSearchField ? 'Champ de recherche présent' : 'Champ de recherche manquant'
      });
      
    } catch (error) {
      this.addResult('Formulaire de recherche', 'failed', { error: error.message });
    }
  }

  async testSearchFunctionality() {
    console.log('🔍 Tests de fonctionnalité de recherche...');
    
    const searchTerms = [
      { term: 'test', expectedResults: true },
      { term: 'livre', expectedResults: true },
      { term: 'xyznoresult', expectedResults: false }
    ];

    for (const search of searchTerms) {
      await this.testSearch(search);
    }
  }

  async testSearch(search) {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/public/catalog?search=${encodeURIComponent(search.term)}`
      );
      
      const data = await response.json();
      
      if (response.ok && data.data) {
        const hasResults = Array.isArray(data.data) && data.data.length > 0;
        const expectationMet = search.expectedResults ? hasResults : !hasResults;
        
        this.addResult(`Recherche "${search.term}"`, expectationMet ? 'passed' : 'failed', {
          term: search.term,
          resultsFound: hasResults,
          resultCount: data.data.length,
          expectedResults: search.expectedResults
        });
      } else {
        this.addResult(`Recherche "${search.term}"`, 'failed', {
          error: `API error: ${response.status}`,
          term: search.term
        });
      }
      
    } catch (error) {
      this.addResult(`Recherche "${search.term}"`, 'failed', {
        error: error.message,
        term: search.term
      });
    }
  }

  async testUserExperience() {
    console.log('👤 Tests d\'expérience utilisateur...');
    
    // Test de la page d'accueil
    await this.testHomepageUX();
    
    // Test des messages d'erreur
    await this.testErrorMessages();
    
    // Test de la performance perçue
    await this.testPerceivedPerformance();
  }

  async testHomepageUX() {
    try {
      const response = await fetch(`${this.baseUrl}/`);
      const html = await response.text();
      
      // Vérifier les éléments UX importants
      const hasTitle = html.includes('<title>') && !html.includes('<title></title>');
      const hasDescription = html.includes('description') || html.includes('subtitle');
      const hasNavigation = html.includes('nav') || html.includes('menu');
      const hasCallToAction = html.includes('button') || html.includes('Découvrir') || html.includes('Commencer');
      
      const uxScore = [hasTitle, hasDescription, hasNavigation, hasCallToAction].filter(Boolean).length;
      
      this.addResult('UX Page d\'accueil', uxScore >= 3 ? 'passed' : 'failed', {
        hasTitle,
        hasDescription,
        hasNavigation,
        hasCallToAction,
        uxScore: `${uxScore}/4`
      });
      
    } catch (error) {
      this.addResult('UX Page d\'accueil', 'failed', { error: error.message });
    }
  }

  async testErrorMessages() {
    try {
      // Test d'une page inexistante
      const response = await fetch(`${this.baseUrl}/page-inexistante`);
      
      if (response.status === 404) {
        const html = await response.text();
        const hasCustomError = html.includes('404') || html.includes('Page non trouvée') || html.includes('Not Found');
        
        this.addResult('Messages d\'erreur 404', hasCustomError ? 'passed' : 'failed', {
          status: response.status,
          hasCustomError,
          message: hasCustomError ? 'Page d\'erreur personnalisée' : 'Page d\'erreur générique'
        });
      } else {
        this.addResult('Messages d\'erreur 404', 'failed', {
          error: `Status inattendu: ${response.status}`,
          expected: 404
        });
      }
      
    } catch (error) {
      this.addResult('Messages d\'erreur 404', 'failed', { error: error.message });
    }
  }

  async testPerceivedPerformance() {
    const start = Date.now();
    
    try {
      const response = await fetch(`${this.baseUrl}/`);
      const duration = Date.now() - start;
      
      // Performance perçue : < 1s excellent, < 3s bon, > 3s à améliorer
      const performanceLevel = duration < 1000 ? 'excellent' : 
                              duration < 3000 ? 'bon' : 'à améliorer';
      
      this.addResult('Performance perçue', duration < 3000 ? 'passed' : 'failed', {
        loadTime: duration,
        performanceLevel,
        acceptable: duration < 3000
      });
      
    } catch (error) {
      this.addResult('Performance perçue', 'failed', { error: error.message });
    }
  }

  addResult(testName, status, details = {}) {
    this.results.push({
      name: testName,
      status,
      details,
      timestamp: new Date().toISOString()
    });
    
    const statusIcon = status === 'passed' ? '✅' : status === 'failed' ? '❌' : '⏭️';
    console.log(`${statusIcon} ${testName}: ${status.toUpperCase()}`);
  }

  generateReport() {
    const summary = {
      total: this.results.length,
      passed: this.results.filter(r => r.status === 'passed').length,
      failed: this.results.filter(r => r.status === 'failed').length,
      skipped: this.results.filter(r => r.status === 'skipped').length
    };

    const report = {
      title: 'Tests des Interfaces SIGB UdM',
      timestamp: new Date().toISOString(),
      summary,
      tests: this.results
    };

    console.log('\n📊 RÉSUMÉ DES TESTS D\'INTERFACES');
    console.log(`Total: ${summary.total}`);
    console.log(`Réussis: ${summary.passed}`);
    console.log(`Échoués: ${summary.failed}`);
    console.log(`Ignorés: ${summary.skipped}`);

    return report;
  }
}

// Exécution si appelé directement
if (require.main === module) {
  const interfaceTests = new InterfaceTests();
  interfaceTests.runAllTests()
    .then(report => {
      console.log('\n🎯 Tests des interfaces terminés');
      process.exit(report.summary.failed > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('❌ Erreur dans les tests d\'interfaces:', error);
      process.exit(1);
    });
}

module.exports = InterfaceTests;
