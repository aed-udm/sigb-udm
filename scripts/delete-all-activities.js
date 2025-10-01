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

async function deleteAllActivities() {
  let connection;
  
  try {
    console.log('🗑️  Suppression de toutes les activités récentes...\n');
    
    // Connexion à la base de données
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connexion à la base de données réussie\n');

    // 1. Afficher les activités existantes avant suppression
    console.log('📋 Activités existantes avant suppression:');
    const [existingActivities] = await connection.execute(`
      SELECT 
        'user' as type,
        full_name as name,
        created_at,
        TIMESTAMPDIFF(MINUTE, created_at, NOW()) as minutes_ago
      FROM users 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      
      UNION ALL
      
      SELECT 
        'loan' as type,
        CONCAT(u.full_name, ' - ', b.title) as name,
        l.loan_date as created_at,
        TIMESTAMPDIFF(MINUTE, l.loan_date, NOW()) as minutes_ago
      FROM loans l
      JOIN users u ON l.user_id = u.id
      JOIN books b ON l.book_id = b.id
      WHERE l.loan_date >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      
      UNION ALL
      
      SELECT 
        'return' as type,
        CONCAT(u.full_name, ' - ', b.title) as name,
        l.return_date as created_at,
        TIMESTAMPDIFF(MINUTE, l.return_date, NOW()) as minutes_ago
      FROM loans l
      JOIN users u ON l.user_id = u.id
      JOIN books b ON l.book_id = b.id
      WHERE l.return_date >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      
      ORDER BY created_at DESC
    `);
    
    if (existingActivities.length > 0) {
      console.table(existingActivities);
    } else {
      console.log('ℹ️  Aucune activité récente trouvée');
    }

    // 2. Supprimer toutes les réservations récentes AVANT les utilisateurs (contrainte FK)
    console.log('\n🗑️  Suppression des réservations récentes...');
    const [deletedReservations] = await connection.execute(`
      DELETE FROM reservations
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
    `);
    console.log(`✅ ${deletedReservations.affectedRows} réservations supprimées`);

    // 3. Supprimer tous les emprunts récents (dernières 24h)
    console.log('\n🗑️  Suppression des emprunts récents...');
    const [deletedLoans] = await connection.execute(`
      DELETE FROM loans
      WHERE loan_date >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      OR return_date >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
    `);
    console.log(`✅ ${deletedLoans.affectedRows} emprunts supprimés`);

    // 4. Supprimer tous les utilisateurs récents (dernières 24h) sauf les utilisateurs système
    console.log('\n🗑️  Suppression des utilisateurs récents...');
    const [deletedUsers] = await connection.execute(`
      DELETE FROM users
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      AND email NOT LIKE '%@system.local'
      AND full_name NOT LIKE '%admin%'
      AND full_name NOT LIKE '%system%'
    `);
    console.log(`✅ ${deletedUsers.affectedRows} utilisateurs supprimés`);

    // 5. Nettoyer les documents académiques récents si nécessaire
    console.log('\n🗑️  Suppression des documents académiques récents...');

    // Vérifier si les tables existent avant de supprimer
    try {
      const [deletedTheses] = await connection.execute(`
        DELETE FROM theses
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      `);
      console.log(`✅ ${deletedTheses.affectedRows} thèses supprimées`);
    } catch (error) {
      console.log('ℹ️  Table theses non trouvée ou vide');
    }

    try {
      const [deletedMemoires] = await connection.execute(`
        DELETE FROM memoires
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      `);
      console.log(`✅ ${deletedMemoires.affectedRows} mémoires supprimés`);
    } catch (error) {
      console.log('ℹ️  Table memoires non trouvée ou vide');
    }

    try {
      const [deletedReports] = await connection.execute(`
        DELETE FROM stage_reports
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      `);
      console.log(`✅ ${deletedReports.affectedRows} rapports de stage supprimés`);
    } catch (error) {
      console.log('ℹ️  Table stage_reports non trouvée ou vide');
    }

    // 6. Vérifier qu'il n'y a plus d'activités récentes
    console.log('\n📋 Vérification après suppression:');
    const [remainingActivities] = await connection.execute(`
      SELECT 
        'user' as type,
        full_name as name,
        created_at
      FROM users 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      
      UNION ALL
      
      SELECT 
        'loan' as type,
        CONCAT(u.full_name, ' - ', b.title) as name,
        l.loan_date as created_at
      FROM loans l
      JOIN users u ON l.user_id = u.id
      JOIN books b ON l.book_id = b.id
      WHERE l.loan_date >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      
      ORDER BY created_at DESC
    `);
    
    if (remainingActivities.length > 0) {
      console.log('⚠️  Activités restantes:');
      console.table(remainingActivities);
    } else {
      console.log('✅ Toutes les activités récentes ont été supprimées');
    }

    console.log('\n🎉 Suppression terminée avec succès !');
    console.log('🔄 Rafraîchissez votre dashboard pour voir les changements.');

  } catch (error) {
    console.error('❌ Erreur lors de la suppression:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Connexion fermée');
    }
  }
}

// Exécuter le script
deleteAllActivities();
