const argon2 = require('argon2');

/**
 * Service pour la gestion de l'authentification
 */
class AuthService {
  /**
   * Hache un mot de passe
   * @param {string} password 
   * @returns {Promise<string>}
   */
  static async hashPassword(password) {
    try {
      return await argon2.hash(password);
    } catch (error) {
      console.error('Erreur lors du hachage du mot de passe:', error);
      throw new Error('Erreur lors du traitement du mot de passe.');
    }
  }

  /**
   * Vérifie un mot de passe
   * @param {string} hashedPassword 
   * @param {string} plainPassword 
   * @returns {Promise<boolean>}
   */
  static async verifyPassword(hashedPassword, plainPassword) {
    try {
      return await argon2.verify(hashedPassword, plainPassword);
    } catch (error) {
      console.error('Erreur lors de la vérification du mot de passe:', error);
      return false;
    }
  }

  /**
   * Crée une session utilisateur
   * @param {Object} req 
   * @param {Object} user 
   */
  static createUserSession(req, user) {
    req.session.userId = user.id;
    req.session.userEmail = user.email;
    req.session.userName = `${user.prenom} ${user.nom}`;
      req.session.admin = user.administrateur;
      req.session.perso = user.perso;
  }

  /**
   * Détruit une session utilisateur
   * @param {Object} req 
   * @returns {Promise<void>}
   */
  static destroyUserSession(req) {
    return new Promise((resolve, reject) => {
      req.session.destroy((err) => {
        if (err) {
          console.error('Erreur lors de la déconnexion:', err);
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Vérifie si une session est valide
   * @param {Object} req 
   * @returns {boolean}
   */
  static isAuthenticated(req) {
    return !!(req.session && req.session.userId);
  }
}

module.exports = AuthService;