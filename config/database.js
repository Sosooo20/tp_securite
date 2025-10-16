const { Pool } = require('pg');

const dbConfig = {
  host: 'localhost',
  user: 'postgres', // Utilisateur par défaut PostgreSQL
  password: '', // À modifier selon votre config
  database: 'tp_securite_chat',
  port: 5432, // Port par défaut PostgreSQL
  max: 10, // Nombre maximum de connexions dans le pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 20000,
};

let pool;

async function initDatabase() {
  try {
    console.log('🔄 Tentative de connexion à PostgreSQL...');
    console.log(`📍 Configuration: ${dbConfig.user}@${dbConfig.host}:${dbConfig.port}`);
    
    // Créer une connexion temporaire sans spécifier la base pour la créer si elle n'existe pas
    const tempPool = new Pool({
      host: dbConfig.host,
      user: dbConfig.user,
      password: dbConfig.password,
      port: dbConfig.port,
      database: 'postgres', // Base par défaut pour créer d'autres bases
      max: 1
    });

    console.log('✅ Connexion PostgreSQL établie');

    // Vérifier si la base de données existe, sinon la créer
    try {
      const checkDbQuery = `SELECT 1 FROM pg_database WHERE datname = $1`;
      const result = await tempPool.query(checkDbQuery, [dbConfig.database]);
      
      if (result.rows.length === 0) {
        // La base n'existe pas, la créer
        await tempPool.query(`CREATE DATABASE "${dbConfig.database}" WITH ENCODING 'UTF8'`);
        console.log(`✅ Base de données "${dbConfig.database}" créée`);
      } else {
        console.log(`✅ Base de données "${dbConfig.database}" existe déjà`);
      }
    } catch (error) {
      console.log(`ℹ️ La base "${dbConfig.database}" existe peut-être déjà`);
    }
    
    await tempPool.end();

    // Créer le pool de connexions pour la base de données spécifique
    pool = new Pool(dbConfig);

    // Test de connexion
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();

    // Créer la table users si elle n'existe pas
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        nom VARCHAR(100) NOT NULL,
        prenom VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        mot_de_passe VARCHAR(255) NOT NULL,
        image VARCHAR(255) NULL,
        description TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Créer l'index sur email s'il n'existe pas
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)
    `);

    // Créer un trigger pour updated_at automatique
    await pool.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql'
    `);

    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_users_updated_at') THEN
          CREATE TRIGGER update_users_updated_at
            BEFORE UPDATE ON users
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
        END IF;
      END
      $$
    `);

    console.log('✅ Table "users" créée/vérifiée');
    console.log('✅ Index et triggers créés');
    console.log('✅ Base de données PostgreSQL initialisée avec succès');
    return pool;
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation de la base de données:', error.message);
    console.error('\n📋 INSTRUCTIONS POSTGRESQL:');
    console.error('================================');
    
    if (error.code === 'ECONNREFUSED') {
      console.error('🔴 PostgreSQL Server n\'est pas démarré ou n\'est pas installé');
      console.error('\n📥 INSTALLATION:');
      console.error('🍺 macOS (Homebrew): brew install postgresql && brew services start postgresql');
      console.error('🐧 Ubuntu/Debian: sudo apt install postgresql postgresql-contrib');
      console.error('🪟 Windows: https://www.postgresql.org/download/windows/');
      console.error('\n⚡ DÉMARRAGE POSTGRESQL:');
      console.error('- macOS: brew services start postgresql');
      console.error('- Linux: sudo systemctl start postgresql');
      console.error('- Windows: Démarrer le service PostgreSQL via services.msc');
    }
    
    if (error.code === '28P01') {
      console.error('🔴 Erreur d\'authentification PostgreSQL');
      console.error('Vérifiez le nom d\'utilisateur et mot de passe dans config/database.js');
    }
    
    console.error('\n🔧 CONFIGURATION:');
    console.error(`- Host: ${dbConfig.host}`);
    console.error(`- Port: ${dbConfig.port}`);
    console.error(`- User: ${dbConfig.user}`);
    console.error(`- Password: ${dbConfig.password ? '[CONFIGURÉ]' : '[VIDE - à configurer]'}`);
    console.error(`- Database: ${dbConfig.database}`);
    
    console.error('\n🛠️ PREMIÈRE CONFIGURATION POSTGRESQL:');
    console.error('1. Installer PostgreSQL (voir liens ci-dessus)');
    console.error('2. Démarrer le service PostgreSQL');
    console.error('3. Configurer un utilisateur: createuser -s -P votre_user');
    console.error('4. Ou utiliser l\'utilisateur par défaut "postgres"');
    console.error('5. Mettre à jour le mot de passe dans config/database.js');
    console.error('6. Tester la connexion: psql -U postgres -h localhost');
    
    throw error;
  }
}

function getPool() {
  if (!pool) {
    throw new Error('La base de données n\'est pas initialisée. Appelez initDatabase() d\'abord.');
  }
  return pool;
}

// Test de connectivité (utilitaire de debug)
async function testConnection() {
  try {
    const testPool = new Pool({
      host: dbConfig.host,
      user: dbConfig.user,
      password: dbConfig.password,
      port: dbConfig.port,
      database: 'postgres',
      max: 1,
      connectionTimeoutMillis: 5000
    });
    
    const client = await testPool.connect();
    await client.query('SELECT 1');
    client.release();
    await testPool.end();
    
    console.log('✅ Test de connexion PostgreSQL réussi');
    return true;
  } catch (error) {
    console.error('❌ Test de connexion PostgreSQL échoué:', error.message);
    return false;
  }
}

module.exports = {
  initDatabase,
  getPool,
  dbConfig,
  testConnection
};