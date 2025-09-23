const fetch = require('node-fetch');

async function testAuthAPI() {
  try {
    console.log('Test de l\'API de test d\'authentification...');
    
    const response = await fetch('http://localhost:3000/api/auth/test-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'kenne@udm.edu.cm'
      })
    });

    console.log('Statut:', response.status);
    console.log('Headers:', response.headers.raw());
    
    const data = await response.text();
    console.log('Réponse brute:', data);
    
    try {
      const jsonData = JSON.parse(data);
      console.log('Réponse JSON:', JSON.stringify(jsonData, null, 2));
    } catch (e) {
      console.log('Erreur parsing JSON:', e.message);
    }

  } catch (error) {
    console.error('Erreur:', error);
  }
}

testAuthAPI();
