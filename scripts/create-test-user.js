const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');

async function createTestUser() {
  let connection;
  
  try {
    // Configuration de la base de données depuis .env.local
    connection = await mysql.createConnection({
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: '',
      database: 'bibliotheque_cameroun'
    });

    console.log('✅ Connexion à la base de données réussie');

    // Vérifier si l'utilisateur existe déjà dans synced_users
    const [existingUsers] = await connection.execute(
      'SELECT * FROM synced_users WHERE ad_username = ?',
      ['kenne@udm.edu.cm']
    );

    if (existingUsers.length > 0) {
      console.log('✅ Utilisateur kenne@udm.edu.cm existe déjà dans synced_users');
      console.log('Utilisateur:', existingUsers[0]);
      return;
    }

    // Créer l'utilisateur dans synced_users
    const userId = uuidv4();
    const userData = {
      id: userId,
      ad_username: 'kenne@udm.edu.cm',
      email: 'kenne@udm.edu.cm',
      full_name: 'Kenne Cedric Franck',
      role: 'etudiant',
      permissions: JSON.stringify({
        books: { view: true, create: false, edit: false, delete: false },
        loans: { view: true, create: false, edit: false, delete: false },
        reservations: { view: true, create: true, edit: false, delete: false }
      }),
      department: 'Informatique',
      position: 'Étudiant',
      is_active: 1,
      ad_groups: JSON.stringify(['CN=Etudiants,OU=Groups,DC=udm,DC=edu,DC=cm']),
      distinguished_name: 'CN=Kenne Cedric Franck,OU=Etudiants,DC=udm,DC=edu,DC=cm',
      user_account_control: 512,
      manual_role_override: 0
    };

    await connection.execute(`
      INSERT INTO synced_users (
        id, ad_username, email, full_name, role, permissions, department, position,
        is_active, ad_groups, distinguished_name, user_account_control, 
        manual_role_override, last_sync, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), NOW())
    `, [
      userData.id, userData.ad_username, userData.email, userData.full_name, 
      userData.role, userData.permissions, userData.department, userData.position,
      userData.is_active, userData.ad_groups, userData.distinguished_name, 
      userData.user_account_control, userData.manual_role_override
    ]);

    console.log('✅ Utilisateur kenne@udm.edu.cm créé dans synced_users');
    console.log('ID:', userId);
    console.log('Rôle:', userData.role);
    console.log('Département:', userData.department);

    // Vérifier la création
    const [newUser] = await connection.execute(
      'SELECT * FROM synced_users WHERE ad_username = ?',
      ['kenne@udm.edu.cm']
    );

    console.log('✅ Vérification - Utilisateur créé:', {
      id: newUser[0].id,
      ad_username: newUser[0].ad_username,
      email: newUser[0].email,
      full_name: newUser[0].full_name,
      role: newUser[0].role,
      is_active: newUser[0].is_active
    });

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

createTestUser();
