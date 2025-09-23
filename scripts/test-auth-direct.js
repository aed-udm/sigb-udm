const fetch = require('node-fetch');

async function testAuthentication() {
  console.log('🔐 Test d\'authentification directe...\n');

  // Test avec différents comptes
  const testAccounts = [
    { username: 'administrator@udm.edu.cm', password: 'Franck55', description: 'Compte administrateur' },
    { username: 'kenne@udm.edu.cm', password: 'Franck55', description: 'Compte étudiant' },
    { username: 'admin', password: 'Franck55', description: 'Compte admin simple' },
    { username: 'administrator', password: 'Franck55', description: 'Administrateur sans domaine' }
  ];

  for (const account of testAccounts) {
    console.log(`\n📋 Test: ${account.description}`);
    console.log(`   Username: ${account.username}`);
    
    try {
      const response = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: account.username,
          password: account.password
        })
      });

      const data = await response.json();
      
      console.log(`   Statut: ${response.status}`);
      
      if (response.ok) {
        console.log('   ✅ SUCCÈS !');
        console.log(`   Utilisateur: ${data.user?.username || 'Inconnu'}`);
        console.log(`   Rôle: ${data.user?.role || 'Non défini'}`);
        console.log(`   Token généré: ${!!data.token}`);
        
        // Test du profil avec ce token
        if (data.token) {
          console.log('\n   🔍 Test du profil avec ce token...');
          const profileResponse = await fetch('http://localhost:3000/api/profile', {
            headers: { 'Authorization': `Bearer ${data.token}` }
          });
          
          const profileData = await profileResponse.json();
          console.log(`   Profil statut: ${profileResponse.status}`);
          
          if (profileResponse.ok) {
            console.log('   ✅ Profil accessible');
            console.log(`   Nom complet: ${profileData.user?.fullName || 'Inconnu'}`);
          } else {
            console.log('   ❌ Profil inaccessible');
            console.log(`   Erreur: ${profileData.error?.message || 'Inconnue'}`);
          }
        }
        
        break; // Arrêter au premier succès
      } else {
        console.log('   ❌ ÉCHEC');
        console.log(`   Erreur: ${data.error?.message || 'Inconnue'}`);
        console.log(`   Code: ${data.error?.code || 'Inconnu'}`);
      }
      
    } catch (error) {
      console.log('   ❌ ERREUR RÉSEAU');
      console.log(`   Message: ${error.message}`);
    }
  }
}

testAuthentication();
