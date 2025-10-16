const express = require('express');
const argon2 = require('argon2');
const rateLimit = require('express-rate-limit');
const { getPool } = require('../config/database');

const router = express.Router();

// Rate limiting spécifique pour les tentatives de login
const loginLimiter = rateLimit({
  windowMs: 30 * 1000, // 30 secondes
  max: 3, // Maximum 3 tentatives
  message: { error: 'Trop de tentatives de connexion. Veuillez attendre 30 secondes.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.ip + ':' + (req.body?.email || 'unknown');
  }
});

// Fonction de validation des données
function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
}

function validatePassword(password) {
  // Au moins 8 caractères, au moins une lettre et un chiffre
  return password && password.length >= 8 && /^(?=.*[A-Za-z])(?=.*\d)/.test(password);
}

function validateName(name) {
  return name && name.length >= 2 && name.length <= 100 && /^[a-zA-ZÀ-ÿ\s'-]+$/.test(name);
}

// Route GET /login - Afficher le formulaire de connexion
router.get('/login', (req, res) => {
  if (req.session.userId) {
    return res.redirect('/');
  }

  res.render('login', {
    title: 'Connexion - Rent a Cat',
    error: null,
    csrfToken: res.locals.generateCSRFToken('login')
  });
});

// Route POST /login - Traiter la connexion
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { email, password, csrf_token } = req.body;

    // Vérification du token CSRF
    if (!req.verifyCSRFToken('login', csrf_token)) {
      return res.status(403).render('login', {
        title: 'Connexion - Rent a Cat',
        error: 'Token de sécurité invalide. Veuillez réessayer.',
        csrfToken: res.locals.generateCSRFToken('login')
      });
    }

    // Validation des données
    if (!email || !password) {
      return res.status(400).render('login', {
        title: 'Connexion - Rent a Cat',
        error: 'Email et mot de passe requis.',
        csrfToken: res.locals.generateCSRFToken('login')
      });
    }

    if (!validateEmail(email)) {
      return res.status(400).render('login', {
        title: 'Connexion - Rent a Cat',
        error: 'Format d\'email invalide.',
        csrfToken: res.locals.generateCSRFToken('login')
      });
    }

    const pool = getPool();
    
    // Rechercher l'utilisateur avec requête préparée (protection SQL injection)
    const [users] = await pool.execute(
      'SELECT id, nom, prenom, email, mot_de_passe FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).render('login', {
        title: 'Connexion - Rent a Cat',
        error: 'Email ou mot de passe incorrect.',
        csrfToken: res.locals.generateCSRFToken('login')
      });
    }

    const user = users[0];

    // Vérifier le mot de passe avec Argon2
    const isValidPassword = await argon2.verify(user.mot_de_passe, password);
    
    if (!isValidPassword) {
      return res.status(401).render('login', {
        title: 'Connexion - Rent a Cat',
        error: 'Email ou mot de passe incorrect.',
        csrfToken: res.locals.generateCSRFToken('login')
      });
    }

    // Connexion réussie - créer la session
    req.session.userId = user.id;
    req.session.userEmail = user.email;
    req.session.userName = `${user.prenom} ${user.nom}`;

    console.log(`Connexion réussie pour l'utilisateur: ${user.email} (ID: ${user.id})`);
    
    res.redirect('/');

  } catch (error) {
    console.error('Erreur lors de la connexion:', error);
    res.status(500).render('login', {
      title: 'Connexion - Rent a Cat',
      error: 'Erreur serveur. Veuillez réessayer plus tard.',
      csrfToken: res.locals.generateCSRFToken('login')
    });
  }
});

// Route GET /register - Afficher le formulaire d'inscription
router.get('/register', (req, res) => {
  if (req.session.userId) {
    return res.redirect('/');
  }

  res.render('register', {
    title: 'Inscription - Rent a Cat',
    error: null,
    success: null,
    csrfToken: res.locals.generateCSRFToken('register')
  });
});

// Route POST /register - Traiter l'inscription
router.post('/register', async (req, res) => {
  try {
    const { nom, prenom, email, password, confirm_password, csrf_token } = req.body;

    // Vérification du token CSRF
    if (!req.verifyCSRFToken('register', csrf_token)) {
      return res.status(403).render('register', {
        title: 'Inscription - Rent a Cat',
        error: 'Token de sécurité invalide. Veuillez réessayer.',
        success: null,
        csrfToken: res.locals.generateCSRFToken('register')
      });
    }

    // Validation des données
    if (!nom || !prenom || !email || !password || !confirm_password) {
      return res.status(400).render('register', {
        title: 'Inscription - Rent a Cat',
        error: 'Tous les champs sont requis.',
        success: null,
        csrfToken: res.locals.generateCSRFToken('register')
      });
    }

    if (!validateName(nom)) {
      return res.status(400).render('register', {
        title: 'Inscription - Rent a Cat',
        error: 'Le nom doit contenir entre 2 et 100 caractères et uniquement des lettres.',
        success: null,
        csrfToken: res.locals.generateCSRFToken('register')
      });
    }

    if (!validateName(prenom)) {
      return res.status(400).render('register', {
        title: 'Inscription - Rent a Cat',
        error: 'Le prénom doit contenir entre 2 et 100 caractères et uniquement des lettres.',
        success: null,
        csrfToken: res.locals.generateCSRFToken('register')
      });
    }

    if (!validateEmail(email)) {
      return res.status(400).render('register', {
        title: 'Inscription - Rent a Cat',
        error: 'Format d\'email invalide.',
        success: null,
        csrfToken: res.locals.generateCSRFToken('register')
      });
    }

    if (!validatePassword(password)) {
      return res.status(400).render('register', {
        title: 'Inscription - Rent a Cat',
        error: 'Le mot de passe doit contenir au moins 8 caractères, avec au moins une lettre et un chiffre.',
        success: null,
        csrfToken: res.locals.generateCSRFToken('register')
      });
    }

    if (password !== confirm_password) {
      return res.status(400).render('register', {
        title: 'Inscription - Rent a Cat',
        error: 'Les mots de passe ne correspondent pas.',
        success: null,
        csrfToken: res.locals.generateCSRFToken('register')
      });
    }

    const pool = getPool();

    // Vérifier si l'email existe déjà
    const [existingUsers] = await pool.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(409).render('register', {
        title: 'Inscription - Rent a Cat',
        error: 'Un compte avec cet email existe déjà.',
        success: null,
        csrfToken: res.locals.generateCSRFToken('register')
      });
    }

    // Hasher le mot de passe avec Argon2id
    const hashedPassword = await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 2 ** 16, // 64 MB
      timeCost: 3,
      parallelism: 1,
    });

    // Insérer le nouvel utilisateur avec requête préparée
    const [result] = await pool.execute(
      'INSERT INTO users (nom, prenom, email, mot_de_passe) VALUES (?, ?, ?, ?)',
      [nom, prenom, email, hashedPassword]
    );

    console.log(`Nouvel utilisateur créé: ${email} (ID: ${result.insertId})`);

    res.render('register', {
      title: 'Inscription - Rent a Cat',
      error: null,
      success: 'Inscription réussie ! Vous pouvez maintenant vous connecter.',
      csrfToken: res.locals.generateCSRFToken('register')
    });

  } catch (error) {
    console.error('Erreur lors de l\'inscription:', error);
    res.status(500).render('register', {
      title: 'Inscription - Rent a Cat',
      error: 'Erreur serveur. Veuillez réessayer plus tard.',
      success: null,
      csrfToken: res.locals.generateCSRFToken('register')
    });
  }
});

module.exports = router;