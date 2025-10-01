const fetch = require('node-fetch');

async function testAnalyticsExport() {
  console.log('🧪 Test des exports Analytics...\n');

  try {
    // 1. Tester l'API analytics
    console.log('📊 Test de l\'API analytics...');
    const analyticsResponse = await fetch('http://localhost:3000/api/analytics');
    
    if (!analyticsResponse.ok) {
      console.error('❌ Erreur API analytics:', analyticsResponse.status, analyticsResponse.statusText);
      return;
    }

    const analyticsData = await analyticsResponse.json();
    console.log('✅ API analytics fonctionne');
    console.log('📈 Données reçues:', {
      statistics: analyticsData.statistics ? 'Présent' : 'Manquant',
      monthly_loans: analyticsData.monthly_loans ? `${analyticsData.monthly_loans.length} mois` : 'Manquant',
      popular_books: analyticsData.popular_books ? `${analyticsData.popular_books.length} livres` : 'Manquant',
      active_users: analyticsData.active_users ? `${analyticsData.active_users.length} utilisateurs` : 'Manquant'
    });

    // 2. Vérifier la structure des données
    console.log('\n🔍 Structure des statistiques:');
    if (analyticsData.statistics) {
      console.log('✅ Statistiques générales:', Object.keys(analyticsData.statistics));
    } else {
      console.log('❌ Pas de statistiques générales');
    }

    // 3. Simuler un export
    console.log('\n📤 Simulation d\'export...');
    const exportData = {
      metadata: {
        exportDate: new Date().toISOString(),
        month: 'Test',
        source: 'SIGB UdM - Analytics'
      },
      statistics: analyticsData.statistics || {},
      monthly_data: analyticsData.monthly_loans || [],
      popular_books: analyticsData.popular_books || [],
      active_users: analyticsData.active_users || []
    };

    console.log('✅ Structure d\'export créée');
    console.log('📋 Contenu export:', {
      metadata: 'OK',
      statistics: Object.keys(exportData.statistics).length + ' propriétés',
      monthly_data: exportData.monthly_data.length + ' mois',
      popular_books: exportData.popular_books.length + ' livres',
      active_users: exportData.active_users.length + ' utilisateurs'
    });

    // 4. Vérifier les dépendances d'export
    console.log('\n📦 Vérification des dépendances...');
    try {
      const XLSX = require('xlsx');
      console.log('✅ XLSX disponible');
    } catch (error) {
      console.log('❌ XLSX manquant:', error.message);
    }

    try {
      const jsPDF = require('jspdf');
      console.log('✅ jsPDF disponible');
    } catch (error) {
      console.log('❌ jsPDF manquant:', error.message);
    }

    console.log('\n🎯 Test terminé avec succès !');

  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  }
}

// Exécuter le test
testAnalyticsExport();
