const { getPool } = require('../config/database');

/**
 * Modèle pour la gestion des chats
 */
class Chat {
  /**
   * Récupère tous les chats disponibles
   */
  static async findAll() {
    try {
      const pool = getPool();
      const result = await pool.query(
        'SELECT id, nom, race, age, caractere, jouet_prefere, prix, description, image, disponible FROM chats WHERE disponible = true ORDER BY nom'
      );
      return result.rows;
    } catch (error) {
      console.error('Erreur lors de la récupération des chats:', error);
      throw error;
    }
  }

  /**
   * Récupère un chat par son ID
   */
  static async findById(id) {
    try {
      const pool = getPool();
      const result = await pool.query(
        'SELECT * FROM chats WHERE id = $1',
        [id]
      );
      return result.rows[0];
    } catch (error) {
      console.error('Erreur lors de la récupération du chat:', error);
      throw error;
    }
  }

  /**
   * Crée un nouveau chat
   */
  static async create(chatData) {
    try {
      const pool = getPool();
      const { nom, race, age, caractere, jouet_prefere, prix, description, image } = chatData;
      
      const result = await pool.query(
        `INSERT INTO chats (nom, race, age, caractere, jouet_prefere, prix, description, image, disponible) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true) 
         RETURNING *`,
        [nom, race, age, caractere, jouet_prefere, prix, description, image]
      );
      
      return result.rows[0];
    } catch (error) {
      console.error('Erreur lors de la création du chat:', error);
      throw error;
    }
  }

  /**
   * Met à jour un chat
   */
  static async update(id, chatData) {
    try {
      const pool = getPool();
      const { nom, race, age, caractere, jouet_prefere, prix, description, image, disponible } = chatData;
      
      const result = await pool.query(
        `UPDATE chats 
         SET nom = $1, race = $2, age = $3, caractere = $4, jouet_prefere = $5, 
             prix = $6, description = $7, image = $8, disponible = $9, updated_at = CURRENT_TIMESTAMP
         WHERE id = $10 
         RETURNING *`,
        [nom, race, age, caractere, jouet_prefere, prix, description, image, disponible, id]
      );
      
      return result.rows[0];
    } catch (error) {
      console.error('Erreur lors de la mise à jour du chat:', error);
      throw error;
    }
  }

  /**
   * Supprime un chat
   */
  static async delete(id) {
    try {
      const pool = getPool();
      const result = await pool.query(
        'DELETE FROM chats WHERE id = $1 RETURNING *',
        [id]
      );
      return result.rowCount > 0;
    } catch (error) {
      console.error('Erreur lors de la suppression du chat:', error);
      throw error;
    }
  }
}

module.exports = Chat;