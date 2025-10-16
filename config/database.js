const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'localhost',
  user: 'root', 
  password: '',
  database: 'tp_securite_chat',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4'
};

let pool;

async function initDatabase() {
  try {
    console.log('🔄 Tentative de connexion à MySQL...');
    
    // Créer la connexion sans spécifier la base pour la créer si elle n'existe pas
    const connection = await mysql.createConnection({
      host: dbConfig.host,
      user: dbConfig.user,
      password: dbConfig.password
    });

    console.log('✅ Connexion MySQL établie');

    // Créer la base de données si elle n'existe pas
    await connection.execute(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log(`✅ Base de données "${dbConfig.database}" créée/vérifiée`);
    
    await connection.end();

    // Créer le pool de connexions
    pool = mysql.createPool(dbConfig);

    // Créer la table users si elle n'existe pas
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nom VARCHAR(100) NOT NULL,
        prenom VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        mot_de_passe VARCHAR(255) NOT NULL,
        image VARCHAR(255) NULL,
        description TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_email (email)
      ) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);

    console.log('✅ Table "users" créée/vérifiée');
    console.log('✅ Base de données initialisée avec succès');
    return pool;
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation de la base de données:', error.message);
    console.error('\n📋 Instructions de configuration MySQL:');
    console.error('1. Vérifiez que MySQL Server est démarré');
    console.error('2. Vérifiez les paramètres de connexion dans config/database.js:');
    console.error(`   - Host: ${dbConfig.host}`);
    console.error(`   - User: ${dbConfig.user}`);
    console.error(`   - Password: ${dbConfig.password ? '[CONFIGURÉ]' : '[NON CONFIGURÉ]'}`);
    console.error('3. Pour MySQL par défaut sur macOS (Homebrew): brew services start mysql');
    console.error('4. Pour créer un utilisateur: mysql -u root -p');
    console.error('   puis: CREATE USER \'votre_user\'@\'localhost\' IDENTIFIED BY \'votre_password\';');
    console.error('   puis: GRANT ALL PRIVILEGES ON *.* TO \'votre_user\'@\'localhost\';');
    throw error;
  }
}

function getPool() {
  if (!pool) {
    throw new Error('La base de données n\'est pas initialisée. Appelez initDatabase() d\'abord.');
  }
  return pool;
}

module.exports = {
  initDatabase,
  getPool,
  dbConfig
};