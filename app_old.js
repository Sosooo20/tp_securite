const express = require('express');
const session = require('express-session');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const path = require('path');
const crypto = require('crypto');
const argon2 = require('argon2');
const { initDatabase, getPool } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuration des sessions sécurisées
const sessionConfig = {
  secret: process.env.SESSION_SECRET || crypto.randomBytes(64).toString('hex'),
  name: 'sessionId', // Nom personnalisé pour éviter les noms par défaut
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS en production
    httpOnly: true, // Empêche l'accès via JavaScript
    maxAge: 1000 * 60 * 60 * 2, // 2 heures
    sameSite: 'strict' // Protection CSRF
  }
};

// Rate limiting pour les tentatives de connexion
const loginLimiter = rateLimit({
  windowMs: 30 * 1000, // 30 secondes
  max: 3, // 3 tentatives maximum
  message: {
    error: 'Trop de tentatives de connexion. Veuillez attendre 30 secondes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Identifier par IP + email pour plus de précision
  keyGenerator: (req) => {
    return req.ip + ':' + (req.body?.email || 'unknown');
  }
});

// Rate limiting général
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requêtes par IP
  message: 'Trop de requêtes depuis cette IP'
});

// Configuration Helmet pour les headers de sécurité
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // Pour le CSS inline temporaire
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false // Pour éviter les problèmes avec certains navigateurs
}));

// Middlewares
app.use(generalLimiter);
app.use(express.urlencoded({ extended: false, limit: '10mb' }));
app.use(express.json({ limit: '10mb' }));
app.use(session(sessionConfig));
app.use(express.static('public'));

// Configuration EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware pour générer les tokens CSRF
app.use((req, res, next) => {
  if (!req.session.csrfTokens) {
    req.session.csrfTokens = {};
  }
  
  // Rendre les informations de session disponibles dans toutes les vues
  res.locals.session = req.session;
  res.locals.user = req.session.userId ? {
    id: req.session.userId,
    email: req.session.userEmail,
    name: req.session.userName
  } : null;
  
  // Fonction pour générer un nouveau token CSRF
  res.locals.generateCSRFToken = (formName) => {
    const token = crypto.randomBytes(32).toString('hex');
    req.session.csrfTokens[formName] = {
      token: token,
      expires: Date.now() + (10 * 60 * 1000) // 10 minutes
    };
    return token;
  };

  // Fonction pour vérifier un token CSRF
  req.verifyCSRFToken = (formName, submittedToken) => {
    const storedToken = req.session.csrfTokens[formName];
    if (!storedToken || storedToken.expires < Date.now()) {
      delete req.session.csrfTokens[formName];
      return false;
    }
    
    const isValid = storedToken.token === submittedToken;
    if (isValid) {
      // Token utilisé, le supprimer
      delete req.session.csrfTokens[formName];
    }
    return isValid;
  };

  next();
});

// Middleware d'authentification
const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.redirect('/login');
  }
  next();
};

// Helper pour échapper HTML (protection XSS supplémentaire)
const escapeHtml = (text) => {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text ? text.replace(/[&<>"']/g, (m) => map[m]) : '';
};

// Rendre escapeHtml disponible dans toutes les vues
app.locals.escapeHtml = escapeHtml;

// Routes
app.get('/', (req, res) => {
  res.render('layout', {
    title: 'Accueil - Rent a Cat',
    body: `
      <div class="container welcome-content">
        <h1>Bienvenue sur Rent a Cat</h1>
        <p>La plateforme sécurisée pour louer un chat pour la journée!</p>
        ${req.session.userId ? 
          `<div class="welcome-content">
             <p>✅ Connecté en tant que: <strong>${escapeHtml(req.session.userName)}</strong></p>
             <p>📧 Email: <strong>${escapeHtml(req.session.userEmail)}</strong></p>
             <div class="nav-links">
               <a href="/reservations" class="btn btn-primary">Mes Réservations</a>
               <a href="/profile" class="btn btn-secondary">Mon Profil</a>
             </div>
           </div>` :
          `<div class="welcome-content">
             <p>Connectez-vous pour accéder à toutes les fonctionnalités !</p>
             <div class="nav-links">
               <a href="/login" class="btn btn-primary">Se connecter</a>
               <a href="/register" class="btn btn-secondary">Créer un compte</a>
             </div>
           </div>`
        }
      </div>
    `
  });
});



// Configuration de Multer pour l'upload de fichiers sécurisé
const multer = require('multer');
const fs = require('fs');

// Créer le dossier uploads s'il n'existe pas
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    // Générer un nom unique et sécurisé
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, 'profile-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB max
    files: 1
  },
  fileFilter: function (req, file, cb) {
    // Vérification des extensions autorisées
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Format de fichier non autorisé. Utilisez JPG, PNG ou WebP.'));
    }
  }
});

// Route GET /profile/edit - Afficher le formulaire d'édition
app.get('/profile/edit', requireAuth, async (req, res) => {
  try {
    const { getPool } = require('./config/database');
    const pool = getPool();
    const result = await pool.query(
      'SELECT nom, prenom, email, image, description, created_at FROM users WHERE id = $1',
      [req.session.userId]
    );
    
    const user = result.rows[0];
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
                          `<img src="${escapeHtml(user.image)}" alt="Photo de profil" class="profile-image" id="currentImage">` :
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
                        <input type="text" id="nom" name="nom" value="${escapeHtml(user.nom)}" required maxlength="100">
                    </div>
                    <div class="form-group">
                        <label for="prenom">Prénom *</label>
                        <input type="text" id="prenom" name="prenom" value="${escapeHtml(user.prenom)}" required maxlength="100">
                    </div>
                </div>

                <!-- Email -->
                <div class="form-group">
                    <label for="email">Email *</label>
                    <input type="email" id="email" name="email" value="${escapeHtml(user.email)}" required maxlength="255">
                </div>

                <!-- Description -->
                <div class="form-group">
                    <label for="description">Description</label>
                    <textarea id="description" name="description" placeholder="Parlez-nous un peu de vous..." maxlength="1000">${escapeHtml(user.description || '')}</textarea>
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
    res.status(500).redirect('/profile?error=Erreur lors du chargement de la page');
  }
});

// Route POST /profile/edit - Traiter les modifications
app.post('/profile/edit', requireAuth, upload.single('profileImage'), async (req, res) => {
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
    if (!nom || !prenom || !email) {
      return res.status(400).json({
        success: false,
        message: 'Tous les champs obligatoires doivent être remplis.'
      });
    }

    // Validation du nom et prénom
    if (!validateName(nom) || !validateName(prenom)) {
      return res.status(400).json({
        success: false,
        message: 'Le nom et prénom doivent contenir entre 2 et 100 caractères et uniquement des lettres.'
      });
    }

    // Validation de l'email
    if (!validateEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Format d\'email invalide.'
      });
    }

    const { getPool } = require('./config/database');
    const pool = getPool();

    // Vérifier si l'email existe déjà pour un autre utilisateur
    const emailCheckResult = await pool.query(
      'SELECT id FROM users WHERE email = $1 AND id != $2',
      [email, req.session.userId]
    );

    if (emailCheckResult.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Un autre compte utilise déjà cet email.'
      });
    }

    let imagePath = null;

    // Traitement de l'image si fournie
    if (req.file) {
      try {
        // Vérification du type MIME côté serveur
        const { fileTypeFromFile } = await import('file-type');
        const fileType = await fileTypeFromFile(req.file.path);
        
        if (!fileType || !['image/jpeg', 'image/png', 'image/webp'].includes(fileType.mime)) {
          // Supprimer le fichier non valide
          fs.unlinkSync(req.file.path);
          return res.status(400).json({
            success: false,
            message: 'Type de fichier non autorisé. Utilisez JPG, PNG ou WebP.'
          });
        }

        // Déplacer l'image dans le dossier public
        const publicImagePath = path.join(__dirname, 'public', 'images', 'profiles');
        if (!fs.existsSync(publicImagePath)) {
          fs.mkdirSync(publicImagePath, { recursive: true });
        }

        const newImageName = 'profile-' + req.session.userId + '-' + Date.now() + path.extname(req.file.filename);
        const newImagePath = path.join(publicImagePath, newImageName);
        
        fs.renameSync(req.file.path, newImagePath);
        imagePath = '/images/profiles/' + newImageName;

        // Supprimer l'ancienne image si elle existe
        const oldUser = await pool.query('SELECT image FROM users WHERE id = $1', [req.session.userId]);
        if (oldUser.rows[0].image && oldUser.rows[0].image !== '/images/default-avatar.png') {
          const oldImagePath = path.join(__dirname, 'public', oldUser.rows[0].image);
          if (fs.existsSync(oldImagePath)) {
            fs.unlinkSync(oldImagePath);
          }
        }

      } catch (error) {
        console.error('Erreur lors du traitement de l\'image:', error);
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(500).json({
          success: false,
          message: 'Erreur lors du traitement de l\'image.'
        });
      }
    }

    // Mise à jour de la base de données
    let updateQuery = 'UPDATE users SET nom = $1, prenom = $2, email = $3, description = $4';
    let queryParams = [nom, prenom, email, description || null];

    if (imagePath) {
      updateQuery += ', image = $5';
      queryParams.push(imagePath);
    }

    updateQuery += ' WHERE id = $' + (queryParams.length + 1);
    queryParams.push(req.session.userId);

    await pool.query(updateQuery, queryParams);

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
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      message: 'Erreur serveur. Veuillez réessayer plus tard.'
    });
  }
});

// Fonctions de validation (réutilisées depuis auth.js)
function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
}

function validateName(name) {
  return name && name.length >= 2 && name.length <= 100 && /^[a-zA-ZÀ-ÿ\s'-]+$/.test(name);
}

// Route de déconnexion
app.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Erreur lors de la déconnexion:', err);
    }
    res.redirect('/');
  });
});

// Routes d'authentification (à créer dans le fichier suivant)
const authRoutes = require('./routes/auth');
app.use('/', authRoutes);

// Middleware de gestion d'erreur
app.use((err, req, res, next) => {
  console.error('Erreur serveur:', err);
  res.status(500).render('layout', {
    title: 'Erreur Serveur',
    body: '<div class="container"><h1>Erreur Serveur</h1><p>Une erreur est survenue. Veuillez réessayer plus tard.</p></div>'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).render('layout', {
    title: 'Page non trouvée',
    body: '<div class="container"><h1>404 - Page non trouvée</h1><p>La page que vous cherchez n\'existe pas.</p><a href="/">Retour à l\'accueil</a></div>'
  });
});

// Démarrage du serveur
async function startServer() {
  try {
    await initDatabase();
    app.listen(PORT, () => {
      console.log(`Serveur démarré sur http://localhost:${PORT}`);
      console.log('Sécurités actives:');
      console.log('✓ Headers de sécurité (Helmet)');
      console.log('✓ Rate limiting (3 tentatives login / 30s)');
      console.log('✓ Sessions sécurisées');
      console.log('✓ Protection CSRF');
      console.log('✓ Protection XSS');
      console.log('✓ Protection contre les injections SQL');
    });
  } catch (error) {
    console.error('Erreur lors du démarrage du serveur:', error);
    process.exit(1);
  }
}

startServer();

module.exports = app;