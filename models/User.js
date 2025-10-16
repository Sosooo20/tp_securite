const { getPool } = require('../config/database');

class User {
  /**
   * Trouve un utilisateur par email
   * @param {string} email 
   * @returns {Promise<Object|null>}
   */
  static async findByEmail(email) {
    try {
      const pool = getPool();
      const result = await pool.query(
        'SELECT * FROM users WHERE email = $1',
        [email]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('Erreur lors de la recherche par email:', error);
      throw error;
    }
  }

  /**
   * Trouve un utilisateur par ID
   * @param {number} id 
   * @returns {Promise<Object|null>}
   */
  static async findById(id) {
    try {
      const pool = getPool();
      const result = await pool.query(
        'SELECT id, nom, prenom, email, image, description, created_at FROM users WHERE id = $1',
        [id]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('Erreur lors de la recherche par ID:', error);
      throw error;
    }
  }

  /**
   * Crée un nouveau utilisateur
   * @param {Object} userData 
   * @returns {Promise<Object>}
   */
  static async create(userData) {
    try {
      const pool = getPool();
      const { nom, prenom, email, password } = userData;
      
      const result = await pool.query(
        'INSERT INTO users (nom, prenom, email, mot_de_passe, administrateur, perso) VALUES ($1, $2, $3, $4, 0, 1) RETURNING id, nom, prenom, email, created_at, administrateur, perso',
        [nom, prenom, email, password]
      );
      
      return result.rows[0];
    } catch (error) {
      console.error('Erreur lors de la création de l\'utilisateur:', error);
      throw error;
    }
  }

  /**
   * Met à jour les informations d'un utilisateur
   * @param {number} id 
   * @param {Object} updateData 
   * @returns {Promise<Object>}
   */
  static async update(id, updateData) {
    try {
      const pool = getPool();
      const { nom, prenom, email, description, image } = updateData;
      
      let query = 'UPDATE users SET nom = $1, prenom = $2, email = $3, description = $4';
      let params = [nom, prenom, email, description || null];
      
      if (image) {
        query += ', image = $5';
        params.push(image);
      }
      
      query += ' WHERE id = $' + (params.length + 1) + ' RETURNING id, nom, prenom, email, image, description';
      params.push(id);
      
      const result = await pool.query(query, params);
      return result.rows[0];
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'utilisateur:', error);
      throw error;
    }
  }

  /**
   * Vérifie si un email existe déjà pour un autre utilisateur
   * @param {string} email 
   * @param {number} excludeId 
   * @returns {Promise<boolean>}
   */
  static async emailExists(email, excludeId = null) {
    try {
      const pool = getPool();
      let query = 'SELECT id FROM users WHERE email = $1';
      let params = [email];
      
      if (excludeId) {
        query += ' AND id != $2';
        params.push(excludeId);
      }
      
      const result = await pool.query(query, params);
      return result.rows.length > 0;
    } catch (error) {
      console.error('Erreur lors de la vérification de l\'email:', error);
      throw error;
    }
  }
}

module.exports = User;