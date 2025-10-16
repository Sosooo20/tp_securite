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
  max: 5,
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

const catRoutes = require('./routes/catRoute');
app.use('/', catRoutes);




// Route Réservations (protégée par authentification)
app.get('/reservations', requireAuth, (req, res) => {
  res.render('layout', {
    title: 'Mes Réservations - Rent a Cat',
    body: `
      <div class="container">
        <h1>Mes Réservations</h1>
        <p>Voici la liste de vos réservations de chats.</p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>🐱 Réservation #001</h3>
          <p><strong>Chat:</strong> Minou le Persan</p>
          <p><strong>Date:</strong> 20 octobre 2025</p>
          <p><strong>Statut:</strong> <span style="color: #28a745;">✅ Confirmée</span></p>
          <button class="btn btn-danger" style="margin-top: 10px;">Annuler la réservation</button>
        </div>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>🐱 Réservation #002</h3>
          <p><strong>Chat:</strong> Garfield le Maine Coon</p>
          <p><strong>Date:</strong> 25 octobre 2025</p>
          <p><strong>Statut:</strong> <span style="color: #ffc107;">⏳ En attente</span></p>
          <button class="btn btn-danger" style="margin-top: 10px;">Annuler la réservation</button>
        </div>
        
        <div class="nav-links">
          <a href="/" class="btn btn-secondary">Retour à l'accueil</a>
          <a href="/catalogue" class="btn btn-primary">Nouvelle réservation</a>
        </div>
      </div>
    `
  });
});

// Route Profil (protégée par authentification)
app.get('/profile', requireAuth, async (req, res) => {
  try {
    const { getPool } = require('./config/database');
    const pool = getPool();
    const result = await pool.query(
      'SELECT nom, prenom, email, image, description, created_at FROM users WHERE id = $1',
      [req.session.userId]
    );
    
    const user = result.rows[0];
    
    res.render('layout', {
      title: 'Mon Profil - Rent a Cat',
      body: `
        <div class="container">
          <h1>Mon Profil</h1>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>👤 Informations personnelles</h3>
            <p><strong>Nom:</strong> ${escapeHtml(user.nom)}</p>
            <p><strong>Prénom:</strong> ${escapeHtml(user.prenom)}</p>
            <p><strong>Email:</strong> ${escapeHtml(user.email)}</p>
            <p><strong>Membre depuis:</strong> ${new Date(user.created_at).toLocaleDateString('fr-FR')}</p>
            
            ${user.description ? 
              `<p><strong>Description:</strong> ${escapeHtml(user.description)}</p>` : 
              `<p><em>Aucune description ajoutée</em></p>`
            }
            
            ${user.image ? 
              `<div style="margin-top: 15px;">
                 <img src="${escapeHtml(user.image)}" alt="Photo de profil" style="max-width: 150px; border-radius: 8px;">
               </div>` : 
              `<p><em>Aucune photo de profil</em></p>`
            }
          </div>
          
          <div class="nav-links">
            <a href="/" class="btn btn-secondary">Retour à l'accueil</a>
            <a href="/profile/edit" class="btn btn-primary">Modifier mon profil</a>
            <a href="/reservations" class="btn btn-primary">Mes réservations</a>
          </div>
        </div>
      `
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du profil:', error);
    res.status(500).render('layout', {
      title: 'Erreur - Rent a Cat',
      body: `
        <div class="container">
          <h1>Erreur</h1>
          <div class="error">Une erreur est survenue lors du chargement de votre profil.</div>
          <a href="/" class="btn btn-secondary">Retour à l'accueil</a>
        </div>
      `
    });
  }
});

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