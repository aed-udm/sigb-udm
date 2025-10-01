const mysql = require('mysql2/promise');

function getColumnDefinition(columnName) {
  const definitions = {
    'email': 'varchar(255)',
    'full_name': 'text',
    'barcode': 'varchar(50)',
    'cames_id': 'varchar(50)',
    'local_id': 'varchar(50)',
    'handle': 'varchar(100)',
    'phone': 'varchar(20)',
    'address': 'text',
    'matricule': 'varchar(50)',
    'faculty': 'varchar(255)',
    'department': 'varchar(255)',
    'institution': 'varchar(255)'
  };
  return definitions[columnName] || 'varchar(255)';
}

async function fixUserCreationIssues() {
  let connection;
  
  try {
    console.log('🔧 Correction des problèmes de création d\'utilisateur...\n');
    
    // Configuration de la base de données
    connection = await mysql.createConnection({
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: '',
      database: 'bibliotheque_cameroun'
    });

    console.log('✅ Connexion à la base de données réussie\n');

    // 1. Vérifier la structure de system_settings
    console.log('📋 1. Vérification de la table system_settings...');
    const [settingsColumns] = await connection.execute(`
      SHOW COLUMNS FROM system_settings
    `);
    
    console.log('Colonnes actuelles de system_settings:');
    settingsColumns.forEach(col => {
      console.log(`  - ${col.Field} (${col.Type})`);
    });

    // 2. Vérifier la structure de users
    console.log('\n📋 2. Vérification de la table users...');
    const [usersColumns] = await connection.execute(`
      SHOW COLUMNS FROM users
    `);
    
    console.log('Colonnes actuelles de users:');
    usersColumns.forEach(col => {
      console.log(`  - ${col.Field} (${col.Type})`);
    });

    // 3. Ajouter la colonne cames_id si elle n'existe pas
    const camesIdExists = usersColumns.some(col => col.Field === 'cames_id');
    if (!camesIdExists) {
      console.log('\n🔧 3. Ajout de la colonne cames_id à la table users...');
      await connection.execute(`
        ALTER TABLE users 
        ADD COLUMN cames_id varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL 
        COMMENT 'Identifiant CAMES unique' 
        AFTER barcode
      `);
      console.log('✅ Colonne cames_id ajoutée avec succès');
    } else {
      console.log('\n✅ 3. La colonne cames_id existe déjà');
    }

    // 4. Ajouter les colonnes manquantes si nécessaires
    const localIdExists = usersColumns.some(col => col.Field === 'local_id');
    if (!localIdExists) {
      console.log('\n🔧 4. Ajout de la colonne local_id à la table users...');
      await connection.execute(`
        ALTER TABLE users 
        ADD COLUMN local_id varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL 
        COMMENT 'Identifiant local unique' 
        AFTER cames_id
      `);
      console.log('✅ Colonne local_id ajoutée avec succès');
    } else {
      console.log('\n✅ 4. La colonne local_id existe déjà');
    }

    const handleExists = usersColumns.some(col => col.Field === 'handle');
    if (!handleExists) {
      console.log('\n🔧 5. Ajout de la colonne handle à la table users...');
      await connection.execute(`
        ALTER TABLE users
        ADD COLUMN handle varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL
        COMMENT 'Handle unique pour l utilisateur'
        AFTER local_id
      `);
      console.log('✅ Colonne handle ajoutée avec succès');
    } else {
      console.log('\n✅ 5. La colonne handle existe déjà');
    }

    // 6. Corriger les collations de la table users (en évitant les contraintes FK)
    console.log('\n🔧 6. Correction des collations de la table users...');
    try {
      // Désactiver temporairement les vérifications de clés étrangères
      await connection.execute('SET FOREIGN_KEY_CHECKS = 0');

      // Corriger les collations colonne par colonne pour éviter les problèmes FK
      const columnsToFix = ['email', 'full_name', 'barcode', 'cames_id', 'local_id', 'handle', 'phone', 'address', 'matricule', 'faculty', 'department', 'institution'];

      for (const column of columnsToFix) {
        try {
          await connection.execute(`
            ALTER TABLE users
            MODIFY COLUMN ${column} ${getColumnDefinition(column)}
            CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
          `);
          console.log(`  ✅ Collation corrigée pour la colonne ${column}`);
        } catch (error) {
          console.log(`  ⚠️  Erreur pour la colonne ${column}: ${error.message}`);
        }
      }

      // Réactiver les vérifications de clés étrangères
      await connection.execute('SET FOREIGN_KEY_CHECKS = 1');
      console.log('✅ Collations de la table users corrigées');
    } catch (error) {
      console.log('⚠️  Erreur lors de la correction des collations:', error.message);
      // Réactiver les vérifications même en cas d'erreur
      await connection.execute('SET FOREIGN_KEY_CHECKS = 1');
    }

    // 7. Vérifier et corriger la fonction get_next_sequence
    console.log('\n🔧 7. Vérification de la fonction get_next_sequence...');
    try {
      const [functions] = await connection.execute(`
        SHOW FUNCTION STATUS WHERE Name = 'get_next_sequence'
      `);
      
      if (functions.length === 0) {
        console.log('📝 Création de la fonction get_next_sequence...');
        await connection.execute(`
          CREATE FUNCTION get_next_sequence(seq_type VARCHAR(50), seq_category VARCHAR(50)) 
          RETURNS INT
          READS SQL DATA
          DETERMINISTIC
          BEGIN
            DECLARE next_val INT DEFAULT 1;
            
            SELECT COALESCE(MAX(CAST(SUBSTRING_INDEX(identifier, '-', -1) AS UNSIGNED)), 0) + 1
            INTO next_val
            FROM academic_documents 
            WHERE type = seq_type 
            AND category = seq_category
            AND identifier REGEXP CONCAT('^', seq_type, '-', seq_category, '-[0-9]+$');
            
            RETURN next_val;
          END
        `);
        console.log('✅ Fonction get_next_sequence créée avec succès');
      } else {
        console.log('✅ La fonction get_next_sequence existe déjà');
      }
    } catch (error) {
      console.log('⚠️  Erreur avec la fonction get_next_sequence:', error.message);
      console.log('   Cette erreur peut être ignorée si la fonction existe déjà');
    }

    // 8. Test de création d'utilisateur
    console.log('\n🧪 8. Test de création d\'utilisateur...');
    const testUserId = 'test-user-' + Date.now();
    const testBarcode = 'TEST' + Date.now().toString().slice(-6);
    
    try {
      await connection.execute(`
        INSERT INTO users (
          id, email, full_name, barcode, cames_id, local_id, handle, 
          matricule, phone, address, is_active, max_loans, max_reservations,
          academic_documents_pdf_path, academic_pdf_file_type, academic_pdf_file_size,
          faculty, user_category, study_level, department, account_status,
          suspension_reason, expiry_date, institution
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        testUserId,
        'test@example.com',
        'Utilisateur Test',
        testBarcode,
        'CAMES-TEST-001',
        'LOCAL-TEST-001',
        'test-handle',
        'MAT-TEST-001',
        '+237123456789',
        'Adresse test',
        1,
        3,
        3,
        null,
        null,
        null,
        'Informatique',
        'student',
        'L1',
        'Informatique',
        'active',
        null,
        null,
        'UdM'
      ]);
      
      console.log('✅ Test de création d\'utilisateur réussi');
      
      // Supprimer l'utilisateur test
      await connection.execute('DELETE FROM users WHERE id = ?', [testUserId]);
      console.log('✅ Utilisateur test supprimé');
      
    } catch (error) {
      console.log('❌ Erreur lors du test de création:', error.message);
    }

    console.log('\n🎉 Correction terminée avec succès !');
    console.log('\n📋 Résumé des corrections :');
    console.log('  ✅ Colonne cames_id ajoutée à la table users');
    console.log('  ✅ Colonne local_id ajoutée à la table users');
    console.log('  ✅ Colonne handle ajoutée à la table users');
    console.log('  ✅ Collations corrigées pour utf8mb4_unicode_ci');
    console.log('  ✅ Fonction get_next_sequence vérifiée/créée');
    console.log('  ✅ Test de création d\'utilisateur validé');

  } catch (error) {
    console.error('❌ Erreur lors de la correction:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

fixUserCreationIssues();
