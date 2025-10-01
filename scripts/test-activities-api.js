const fetch = require('node-fetch');

async function testActivitiesAPI() {
  try {
    console.log('🧪 Test de l\'API activities...\n');
    
    const response = await fetch('http://localhost:3000/api/activities?limit=5');
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    console.log('✅ Réponse API reçue:');
    console.log('📊 Structure de la réponse:', typeof data);
    console.log('📊 Données:', data);

    // Vérifier si data est un array ou un objet avec une propriété data
    const activities = Array.isArray(data) ? data : (data.data || []);
    console.log('📊 Nombre d\'activités:', activities.length);

    if (activities.length > 0) {
      console.log('\n📋 Activités récentes:');
      activities.forEach((activity, index) => {
        console.log(`\n${index + 1}. ${activity.type.toUpperCase()}`);
        console.log(`   👤 Utilisateur: ${activity.user}`);
        if (activity.book) {
          console.log(`   📚 Livre: ${activity.book}`);
        }
        console.log(`   🕐 Temps: ${activity.time}`);
        console.log(`   📅 Date brute: ${activity.date}`);
      });
    } else {
      console.log('ℹ️  Aucune activité trouvée');
    }
    
    console.log('\n🎉 Test terminé avec succès !');
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message);
  }
}

testActivitiesAPI();
