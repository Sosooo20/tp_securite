const { getPool } = require('../config/database');

// Récupérer tous les chats
async function getAllChats() {
    const pool = getPool();
    const result = await pool.query('SELECT * FROM chats ORDER BY nom');
    return result.rows; // retourne un tableau d'objets
}

module.exports = {getAllChats};
