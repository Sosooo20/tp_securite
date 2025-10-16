const { Pool } = require('pg');

const dbConfig = {
    host: 'localhost',
    user: 'postgres', // Utilisateur PostgreSQL
    password: 'root',  // À remplacer par ton mot de passe
    database: 'tp_securite_chat',
    port: 5432,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 20000,
};

let pool;

async function initDatabase() {
    try {
        console.log('🔄 Tentative de connexion à PostgreSQL...');
        console.log(`📍 Configuration: ${dbConfig.user}@${dbConfig.host}:${dbConfig.port}`);

        // Connexion temporaire pour créer la base si elle n'existe pas
        const tempPool = new Pool({
            host: dbConfig.host,
            user: dbConfig.user,
            password: dbConfig.password,
            port: dbConfig.port,
            database: 'postgres',
            max: 1
        });

        console.log('✅ Connexion PostgreSQL établie');

        // Vérifier si la base existe
        const checkDbQuery = `SELECT 1 FROM pg_database WHERE datname = $1`;
        const result = await tempPool.query(checkDbQuery, [dbConfig.database]);
        if (result.rows.length === 0) {
            await tempPool.query(`CREATE DATABASE "${dbConfig.database}" WITH ENCODING 'UTF8'`);
            console.log(`✅ Base de données "${dbConfig.database}" créée`);
        } else {
            console.log(`✅ Base de données "${dbConfig.database}" existe déjà`);
        }
        await tempPool.end();

        // Connexion à la vraie base
        pool = new Pool(dbConfig);

        const client = await pool.connect();
        await client.query('SELECT NOW()');
        client.release();

        // --- TABLE USERS ---
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

        await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)
    `);

        // --- TABLE CHATS ---
        await pool.query(`
            CREATE TABLE IF NOT EXISTS chats (
                                                 id SERIAL PRIMARY KEY,
                                                 nom VARCHAR(255) NOT NULL,
                age INT,
                race VARCHAR(255),
                couleur VARCHAR(255),
                caractere VARCHAR(255),
                jouet_prefere VARCHAR(255),
                prix INT,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
        `);

        // --- TABLE RESERVATIONS (many-to-many) ---
        await pool.query(`
      CREATE TABLE IF NOT EXISTS reservations (
        id_user INT NOT NULL,
        id_chat INT NOT NULL,
        date_debut DATE NOT NULL,
        date_fin DATE NOT NULL,
        PRIMARY KEY (id_user, id_chat),
        CONSTRAINT fk_res_user FOREIGN KEY (id_user) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_res_chat FOREIGN KEY (id_chat) REFERENCES chats(id) ON DELETE CASCADE
      )
    `);

        console.log('✅ Tables "users", "chats" et "reservations" créées/vérifiées');

        // --- TRIGGERS POUR updated_at ---
        await pool.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql'
    `);

        // Triggers sur users et chats
        for (const table of ['users', 'chats']) {
            await pool.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_${table}_updated_at') THEN
            CREATE TRIGGER update_${table}_updated_at
              BEFORE UPDATE ON ${table}
              FOR EACH ROW
              EXECUTE FUNCTION update_updated_at_column();
          END IF;
        END
        $$;
      `);
        }

        console.log('✅ Triggers créés pour users et chats');
        console.log('✅ Base de données PostgreSQL initialisée avec succès');
        return pool;
    } catch (error) {
        console.error('❌ Erreur lors de l\'initialisation de la base de données:', error.message);
        console.error('\n📋 CONFIGURATION POSTGRESQL:');
        console.error(`- Host: ${dbConfig.host}`);
        console.error(`- Port: ${dbConfig.port}`);
        console.error(`- User: ${dbConfig.user}`);
        console.error(`- Database: ${dbConfig.database}`);
        throw error;
    }
}

function getPool() {
    if (!pool) {
        throw new Error('La base de données n\'est pas initialisée. Appelez initDatabase() d\'abord.');
    }
    return pool;
}

// Test de connectivité (debug)
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
