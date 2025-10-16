const User = require('../models/User');
const ValidationService = require('../services/ValidationService');
const FileUploadService = require('../services/FileUploadService');

/**
 * Contrôleur pour la gestion du profil utilisateur
 */
class ProfileController {
  /**
   * Redirige vers la page d'édition du profil
   */
  static redirectToEdit(req, res) {
    res.redirect('/profile/edit');
  }

  /**
   * Affiche le formulaire d'édition du profil
   */
  static async showEditForm(req, res) {
    try {
      const user = await User.findById(req.session.userId);
      if (!user) {
        return res.status(404).redirect('/');
      }

      const csrfToken = res.locals.generateCSRFToken('profile-edit');
      
      res.render('layout', {
        title: 'Modifier mon profil - ChatRental',
        body: `
          <!-- Profil de l'utilisateur -->
          <div class="profile-container">
              <!-- En-tête du profil -->
              <div class="profile-header">
                  <div class="profile-image-section">
                      <div class="profile-image-container" onclick="document.getElementById('profileImageInput').click()">
                          ${user.image ? 
                            `<img src="${res.locals.escapeHtml ? res.locals.escapeHtml(user.image) : user.image}" alt="Photo de profil" class="profile-image" id="currentImage">` :
                            `<img src="/images/default-avatar.png" alt="Avatar par défaut" class="profile-image" id="currentImage">`
                          }
                          <div class="image-overlay">
                              📷 Changer la photo
                          </div>
                      </div>
                  </div>
                  
                  <div class="profile-info">
                      <h1>Modifier mon profil</h1>
                      <p>Mettez à jour vos informations personnelles</p>
                      <p><strong>Membre depuis:</strong> ${new Date(user.created_at).toLocaleDateString('fr-FR')}</p>
                  </div>
              </div>

              <!-- Formulaire d'édition -->
              <form id="profileForm" enctype="multipart/form-data">
                  <input type="hidden" name="csrf_token" value="${csrfToken}">
                  
                  <!-- Input caché pour l'image -->
                  <input type="file" id="profileImageInput" name="profileImage" class="hidden-file-input" accept="image/jpeg,image/jpg,image/png,image/webp">
                  
                  <!-- Nom et Prénom -->
                  <div class="form-row">
                      <div class="form-group">
                          <label for="nom">Nom *</label>
                          <input type="text" id="nom" name="nom" value="${user.nom}" required maxlength="100">
                      </div>
                      <div class="form-group">
                          <label for="prenom">Prénom *</label>
                          <input type="text" id="prenom" name="prenom" value="${user.prenom}" required maxlength="100">
                      </div>
                  </div>

                  <!-- Email -->
                  <div class="form-group">
                      <label for="email">Email *</label>
                      <input type="email" id="email" name="email" value="${user.email}" required maxlength="255">
                  </div>

                  <!-- Description -->
                  <div class="form-group">
                      <label for="description">Description</label>
                      <textarea id="description" name="description" placeholder="Parlez-nous un peu de vous..." maxlength="1000">${user.description || ''}</textarea>
                  </div>

                  <!-- Boutons -->
                  <div class="btn-container">
                      <a href="/" class="btn btn-secondary">Annuler</a>
                      <button type="submit" class="btn btn-primary">Enregistrer les modifications</button>
                  </div>
              </form>
          </div>

          <!-- Toast pour les notifications -->
          <div id="toast" class="toast"></div>

          <script>
          // Prévisualisation de l'image
          document.getElementById('profileImageInput').addEventListener('change', function(e) {
              const file = e.target.files[0];
              if (file) {
                  // Vérification de la taille (2MB max)
                  if (file.size > 2 * 1024 * 1024) {
                      showToast('Le fichier est trop volumineux. Taille maximum: 2MB', 'error');
                      return;
                  }
                  
                  // Vérification du type
                  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
                  if (!allowedTypes.includes(file.type)) {
                      showToast('Format non supporté. Utilisez JPG, PNG ou WebP', 'error');
                      return;
                  }
                  
                  // Prévisualisation
                  const reader = new FileReader();
                  reader.onload = function(e) {
                      document.getElementById('currentImage').src = e.target.result;
                  };
                  reader.readAsDataURL(file);
              }
          });

          // Soumission du formulaire
          document.getElementById('profileForm').addEventListener('submit', async function(e) {
              e.preventDefault();
              
              const formData = new FormData(this);
              const submitBtn = this.querySelector('button[type="submit"]');
              
              // Désactiver le bouton pendant la soumission
              submitBtn.disabled = true;
              submitBtn.textContent = 'Enregistrement...';
              
              try {
                  const response = await fetch('/profile/edit', {
                      method: 'POST',
                      body: formData
                  });
                  
                  const result = await response.json();
                  
                  if (result.success) {
                      showToast(result.message, 'success');
                      // Redirection après 2 secondes
                      setTimeout(() => {
                          window.location.href = '/';
                      }, 2000);
                  } else {
                      showToast(result.message, 'error');
                  }
              } catch (error) {
                  console.error('Erreur:', error);
                  showToast('Erreur réseau. Veuillez réessayer.', 'error');
              } finally {
                  // Réactiver le bouton
                  submitBtn.disabled = false;
                  submitBtn.textContent = 'Enregistrer les modifications';
              }
          });

          // Fonction pour afficher les toasts
          function showToast(message, type) {
              const toast = document.getElementById('toast');
              toast.textContent = message;
              toast.className = 'toast ' + type;
              toast.classList.add('show');
              
              setTimeout(() => {
                  toast.classList.remove('show');
              }, 4000);
          }

          // Validation en temps réel
          document.getElementById('nom').addEventListener('input', function() {
              validateName(this);
          });

          document.getElementById('prenom').addEventListener('input', function() {
              validateName(this);
          });

          document.getElementById('email').addEventListener('input', function() {
              validateEmail(this);
          });

          function validateName(input) {
              const name = input.value.trim();
              const isValid = name.length >= 2 && name.length <= 100 && /^[a-zA-ZÀ-ÿ\\s'-]+$/.test(name);
              
              if (name.length > 0 && !isValid) {
                  input.style.borderColor = '#dc3545';
              } else {
                  input.style.borderColor = '#ddd';
              }
              
              return isValid;
          }

          function validateEmail(input) {
              const email = input.value.trim();
              const isValid = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email) && email.length <= 255;
              
              if (email.length > 0 && !isValid) {
                  input.style.borderColor = '#dc3545';
              } else {
                  input.style.borderColor = '#ddd';
              }
              
              return isValid;
          }
          </script>
        `
      });
    } catch (error) {
      console.error('Erreur lors du chargement de la page d\'édition:', error);
      res.status(500).redirect('/?error=Erreur lors du chargement de la page');
    }
  }

  /**
   * Traite la mise à jour du profil
   */
  static async updateProfile(req, res) {
    try {
      const { nom, prenom, email, description, csrf_token } = req.body;

      // Vérification du token CSRF
      if (!req.verifyCSRFToken('profile-edit', csrf_token)) {
        return res.status(403).json({
          success: false,
          message: 'Token de sécurité invalide. Veuillez réessayer.'
        });
      }

      // Validation des données
      const validation = ValidationService.validateUserData({ nom, prenom, email, description });
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: validation.errors.join(' ')
        });
      }

      // Vérifier si l'email existe déjà pour un autre utilisateur
      const emailExists = await User.emailExists(email, req.session.userId);
      if (emailExists) {
        return res.status(409).json({
          success: false,
          message: 'Un autre compte utilise déjà cet email.'
        });
      }

      let imagePath = null;

      // Traitement de l'image si fournie
      if (req.file) {
        try {
          // Récupérer l'ancienne image pour la supprimer
          const oldUser = await User.findById(req.session.userId);
          
          // Traiter la nouvelle image
          imagePath = await FileUploadService.processProfileImage(req.file, req.session.userId);
          
          // Supprimer l'ancienne image
          if (oldUser && oldUser.image) {
            FileUploadService.removeOldProfileImage(oldUser.image);
          }

        } catch (error) {
          console.error('Erreur lors du traitement de l\'image:', error);
          return res.status(500).json({
            success: false,
            message: error.message || 'Erreur lors du traitement de l\'image.'
          });
        }
      }

      // Mise à jour de la base de données
      const updateData = { nom, prenom, email, description };
      if (imagePath) {
        updateData.image = imagePath;
      }

      await User.update(req.session.userId, updateData);

      // Mise à jour des informations de session
      req.session.userEmail = email;
      req.session.userName = `${prenom} ${nom}`;

      console.log(`Profil mis à jour pour l'utilisateur: ${email} (ID: ${req.session.userId})`);

      res.json({
        success: true,
        message: 'Profil mis à jour avec succès !'
      });

    } catch (error) {
      console.error('Erreur lors de la mise à jour du profil:', error);
      
      // Nettoyer le fichier uploadé en cas d'erreur
      if (req.file) {
        FileUploadService.cleanupFile(req.file.path);
      }

      res.status(500).json({
        success: false,
        message: 'Erreur serveur. Veuillez réessayer plus tard.'
      });
    }
  }
}

module.exports = ProfileController;