/**
 * Service de validation pour les données utilisateur
 */
class ValidationService {
  /**
   * Valide une adresse email
   * @param {string} email 
   * @returns {boolean}
   */
  static validateEmail(email) {
    if (!email || typeof email !== 'string') return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 255;
  }

  /**
   * Valide un nom ou prénom
   * @param {string} name 
   * @returns {boolean}
   */
  static validateName(name) {
    if (!name || typeof name !== 'string') return false;
    return name.length >= 2 && name.length <= 100 && /^[a-zA-ZÀ-ÿ\s'-]+$/.test(name);
  }

  /**
   * Valide un mot de passe
   * @param {string} password 
   * @returns {Object}
   */
  static validatePassword(password) {
    if (!password || typeof password !== 'string') {
      return { valid: false, message: 'Le mot de passe est requis.' };
    }

    if (password.length < 8) {
      return { valid: false, message: 'Le mot de passe doit contenir au moins 8 caractères.' };
    }

    if (password.length > 100) {
      return { valid: false, message: 'Le mot de passe ne peut pas dépasser 100 caractères.' };
    }

    // Vérifier la présence d'au moins une majuscule, une minuscule et un chiffre
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);

    if (!hasUppercase || !hasLowercase || !hasNumber) {
      return { 
        valid: false, 
        message: 'Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre.' 
      };
    }

    return { valid: true };
  }

  /**
   * Valide une description
   * @param {string} description 
   * @returns {boolean}
   */
  static validateDescription(description) {
    if (!description) return true; // Description optionnelle
    return typeof description === 'string' && description.length <= 1000;
  }

  /**
   * Valide les données complètes d'un utilisateur
   * @param {Object} userData 
   * @returns {Object}
   */
  static validateUserData(userData) {
    const errors = [];
    const { nom, prenom, email, password, description } = userData;

    if (!this.validateName(nom)) {
      errors.push('Le nom doit contenir entre 2 et 100 caractères et uniquement des lettres.');
    }

    if (!this.validateName(prenom)) {
      errors.push('Le prénom doit contenir entre 2 et 100 caractères et uniquement des lettres.');
    }

    if (!this.validateEmail(email)) {
      errors.push('Format d\'email invalide.');
    }

    if (password !== undefined) {
      const passwordValidation = this.validatePassword(password);
      if (!passwordValidation.valid) {
        errors.push(passwordValidation.message);
      }
    }

    if (!this.validateDescription(description)) {
      errors.push('La description ne peut pas dépasser 1000 caractères.');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

module.exports = ValidationService;