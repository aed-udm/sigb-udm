const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');

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

async function createRecentActivities() {
  let connection;
  
  try {
    console.log('🔧 Création d\'activités récentes pour test...\n');
    
    // Connexion à la base de données
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connexion à la base de données réussie\n');

    // Obtenir l'heure actuelle du Cameroun
    const now = new Date();
    const cameroonTime = new Date(now.getTime() + (60 * 60 * 1000)); // UTC+1
    
    console.log('🕐 Heure actuelle Cameroun:', cameroonTime.toISOString());

    // 1. Créer un nouvel utilisateur (il y a 5 minutes)
    const user5MinAgo = new Date(cameroonTime.getTime() - (5 * 60 * 1000));
    const userId = uuidv4();
    
    await connection.execute(`
      INSERT INTO users (id, full_name, email, matricule, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      userId,
      'Test User Recent',
      'test.recent@example.com',
      'TEST2025',
      user5MinAgo.toISOString().slice(0, 19).replace('T', ' '),
      user5MinAgo.toISOString().slice(0, 19).replace('T', ' ')
    ]);
    
    console.log('✅ Utilisateur créé il y a 5 minutes');

    // 2. Créer un emprunt récent (il y a 10 minutes)
    const loan10MinAgo = new Date(cameroonTime.getTime() - (10 * 60 * 1000));
    const loanId = uuidv4();
    
    // Récupérer un utilisateur et un livre existants
    const [users] = await connection.execute('SELECT id FROM users LIMIT 1');
    const [books] = await connection.execute('SELECT id FROM books LIMIT 1');
    
    if (users.length > 0 && books.length > 0) {
      await connection.execute(`
        INSERT INTO loans (id, user_id, book_id, loan_date, due_date, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        loanId,
        users[0].id,
        books[0].id,
        loan10MinAgo.toISOString().slice(0, 19).replace('T', ' '),
        new Date(loan10MinAgo.getTime() + (21 * 24 * 60 * 60 * 1000)).toISOString().slice(0, 19).replace('T', ' '), // +21 jours
        'active',
        loan10MinAgo.toISOString().slice(0, 19).replace('T', ' '),
        loan10MinAgo.toISOString().slice(0, 19).replace('T', ' ')
      ]);
      
      console.log('✅ Emprunt créé il y a 10 minutes');
    }

    // 3. Créer un retour récent (il y a 2 minutes)
    const return2MinAgo = new Date(cameroonTime.getTime() - (2 * 60 * 1000));
    
    // Récupérer un emprunt actif pour le marquer comme retourné
    const [activeLoans] = await connection.execute(`
      SELECT id FROM loans WHERE status = 'active' LIMIT 1
    `);
    
    if (activeLoans.length > 0) {
      await connection.execute(`
        UPDATE loans 
        SET status = 'returned', 
            return_date = ?, 
            updated_at = ?
        WHERE id = ?
      `, [
        return2MinAgo.toISOString().slice(0, 19).replace('T', ' '),
        return2MinAgo.toISOString().slice(0, 19).replace('T', ' '),
        activeLoans[0].id
      ]);
      
      console.log('✅ Retour créé il y a 2 minutes');
    }

    // 4. Vérifier les nouvelles données
    console.log('\n📋 Vérification des nouvelles activités:');
    
    const [recentActivities] = await connection.execute(`
      SELECT 
        'user' as type,
        full_name as name,
        created_at,
        TIMESTAMPDIFF(MINUTE, created_at, NOW()) as minutes_ago
      FROM users 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
      
      UNION ALL
      
      SELECT 
        'loan' as type,
        CONCAT(u.full_name, ' - ', b.title) as name,
        l.loan_date as created_at,
        TIMESTAMPDIFF(MINUTE, l.loan_date, NOW()) as minutes_ago
      FROM loans l
      JOIN users u ON l.user_id = u.id
      JOIN books b ON l.book_id = b.id
      WHERE l.loan_date >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
      
      UNION ALL
      
      SELECT 
        'return' as type,
        CONCAT(u.full_name, ' - ', b.title) as name,
        l.return_date as created_at,
        TIMESTAMPDIFF(MINUTE, l.return_date, NOW()) as minutes_ago
      FROM loans l
      JOIN users u ON l.user_id = u.id
      JOIN books b ON l.book_id = b.id
      WHERE l.return_date >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
      
      ORDER BY created_at DESC
    `);
    
    console.table(recentActivities);

    console.log('\n🎉 Activités récentes créées avec succès !');
    console.log('🔄 Rafraîchissez maintenant votre dashboard pour voir les nouvelles heures.');

  } catch (error) {
    console.error('❌ Erreur lors de la création:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Connexion fermée');
    }
  }
}

// Exécuter le script
createRecentActivities();
