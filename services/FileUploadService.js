const path = require('path');
const fs = require('fs');

/**
 * Service pour la gestion sécurisée des uploads de fichiers
 */
class FileUploadService {
  /**
   * Valide et traite un fichier image uploadé
   * @param {Object} file - Fichier multer
   * @param {number} userId - ID de l'utilisateur
   * @returns {Promise<string>} - Chemin de l'image traitée
   */
  static async processProfileImage(file, userId) {
    if (!file) {
      throw new Error('Aucun fichier fourni.');
    }

    try {
      // Vérification du type MIME côté serveur
      const { fileTypeFromFile } = await import('file-type');
      const fileType = await fileTypeFromFile(file.path);
      
      if (!fileType || !['image/jpeg', 'image/png', 'image/webp'].includes(fileType.mime)) {
        // Supprimer le fichier non valide
        this.cleanupFile(file.path);
        throw new Error('Type de fichier non autorisé. Utilisez JPG, PNG ou WebP.');
      }

      // Déplacer l'image dans le dossier public
      const publicImagePath = path.join(__dirname, '..', 'public', 'images', 'profiles');
      if (!fs.existsSync(publicImagePath)) {
        fs.mkdirSync(publicImagePath, { recursive: true });
      }

      const newImageName = 'profile-' + userId + '-' + Date.now() + path.extname(file.filename);
      const newImagePath = path.join(publicImagePath, newImageName);
      
      fs.renameSync(file.path, newImagePath);
      
      return '/images/profiles/' + newImageName;

    } catch (error) {
      // Nettoyer le fichier en cas d'erreur
      this.cleanupFile(file.path);
      throw error;
    }
  }

  /**
   * Supprime un fichier temporaire
   * @param {string} filePath 
   */
  static cleanupFile(filePath) {
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (error) {
        console.error('Erreur lors de la suppression du fichier temporaire:', error);
      }
    }
  }

  /**
   * Supprime une ancienne image de profil
   * @param {string} imagePath 
   */
  static removeOldProfileImage(imagePath) {
    if (!imagePath || imagePath === '/images/default-avatar.png') {
      return; // Ne pas supprimer l'avatar par défaut
    }

    const fullPath = path.join(__dirname, '..', 'public', imagePath);
    this.cleanupFile(fullPath);
  }

  /**
   * Valide la taille et le type d'un fichier avant upload
   * @param {Object} file 
   * @returns {Object}
   */
  static validateFile(file) {
    if (!file) {
      return { valid: false, message: 'Aucun fichier sélectionné.' };
    }

    // Vérification de la taille (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      return { valid: false, message: 'Le fichier est trop volumineux. Taille maximum: 2MB.' };
    }

    // Vérification de l'extension
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (!allowedExtensions.includes(ext)) {
      return { valid: false, message: 'Format de fichier non autorisé. Utilisez JPG, PNG ou WebP.' };
    }

    return { valid: true };
  }
}

module.exports = FileUploadService;