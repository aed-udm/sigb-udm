const mysql = require('mysql2/promise');

// Configuration de la base de données
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'bibliotheque_cameroun',
  charset: 'utf8mb4',
  timezone: '+01:00', // Timezone du Cameroun (WAT - West Africa Time)
};

async function testTimezoneActivities() {
  let connection;
  
  try {
    console.log('🔧 Test de diagnostic des timestamps et timezone...\n');
    
    // Connexion à la base de données
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connexion à la base de données réussie\n');

    // 1. Vérifier les paramètres de timezone de la base de données
    console.log('📋 1. Paramètres de timezone de la base de données:');
    const [timezoneResults] = await connection.execute(`
      SELECT
        @@global.time_zone as global_timezone,
        @@session.time_zone as session_timezone,
        NOW() as server_time
    `);
    console.table(timezoneResults);

    // 2. Vérifier les données récentes dans la table loans
    console.log('\n📋 2. Données récentes dans la table loans:');
    const [loanResults] = await connection.execute(`
      SELECT 
        l.id,
        l.loan_date,
        l.return_date,
        l.status,
        u.full_name as user_name,
        b.title as book_title,
        DATE_ADD(l.loan_date, INTERVAL 1 HOUR) as loan_date_cameroon,
        TIMESTAMPDIFF(HOUR, l.loan_date, NOW()) as hours_since_loan
      FROM loans l
      JOIN users u ON l.user_id COLLATE utf8mb4_unicode_ci = u.id COLLATE utf8mb4_unicode_ci
      JOIN books b ON l.book_id = b.id
      ORDER BY l.loan_date DESC
      LIMIT 5
    `);
    console.table(loanResults);

    // 3. Vérifier les données récentes dans la table users
    console.log('\n📋 3. Utilisateurs récents:');
    const [userResults] = await connection.execute(`
      SELECT 
        id,
        full_name,
        created_at,
        DATE_ADD(created_at, INTERVAL 1 HOUR) as created_at_cameroon,
        TIMESTAMPDIFF(HOUR, created_at, NOW()) as hours_since_creation
      FROM users
      ORDER BY created_at DESC
      LIMIT 5
    `);
    console.table(userResults);

    // 4. Test de la fonction getTimeAgo en JavaScript
    console.log('\n📋 4. Test de calcul de temps écoulé:');
    
    function getTimeAgo(date) {
      let inputDate;
      
      if (typeof date === 'string') {
        const dateStr = date.includes('+') ? date : date + '+01:00';
        inputDate = new Date(dateStr);
      } else {
        inputDate = new Date(date);
      }
      
      if (isNaN(inputDate.getTime())) {
        return "Date invalide";
      }
      
      const now = new Date();
      const cameroonTime = new Date(now.toLocaleString("en-US", {timeZone: "Africa/Douala"}));
      const diffInMs = cameroonTime.getTime() - inputDate.getTime();
      
      if (diffInMs < 0) {
        return "À l'instant";
      }
      
      const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
      const diffInMinutes = Math.floor((diffInMs % (1000 * 60 * 60)) / (1000 * 60));
      
      if (diffInHours < 24) {
        return `Il y a ${diffInHours} heure${diffInHours > 1 ? 's' : ''} ${diffInMinutes} min`;
      } else {
        const diffInDays = Math.floor(diffInHours / 24);
        return `Il y a ${diffInDays} jour${diffInDays > 1 ? 's' : ''}`;
      }
    }

    // Tester avec les données réelles
    if (loanResults.length > 0) {
      console.log('\nTest avec emprunt récent:');
      const loan = loanResults[0];
      console.log('Date brute DB:', loan.loan_date);
      console.log('Date Cameroun DB:', loan.loan_date_cameroon);
      console.log('Heures depuis emprunt (DB):', loan.hours_since_loan);
      console.log('Temps calculé JS:', getTimeAgo(loan.loan_date));
      console.log('Temps calculé JS (Cameroun):', getTimeAgo(loan.loan_date_cameroon));
    }

    if (userResults.length > 0) {
      console.log('\nTest avec utilisateur récent:');
      const user = userResults[0];
      console.log('Date brute DB:', user.created_at);
      console.log('Date Cameroun DB:', user.created_at_cameroon);
      console.log('Heures depuis création (DB):', user.hours_since_creation);
      console.log('Temps calculé JS:', getTimeAgo(user.created_at));
      console.log('Temps calculé JS (Cameroun):', getTimeAgo(user.created_at_cameroon));
    }

    // 5. Comparaison des heures
    console.log('\n📋 5. Comparaison des heures:');
    const now = new Date();
    console.log('Heure système Node.js:', now.toISOString());
    console.log('Heure Cameroun (Node.js):', now.toLocaleString("en-US", {timeZone: "Africa/Douala"}));
    console.log('Heure DB (NOW()):', timezoneResults[0].server_time);

    console.log('\n🎉 Test terminé avec succès !');

  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Connexion fermée');
    }
  }
}

// Exécuter le test
testTimezoneActivities();
