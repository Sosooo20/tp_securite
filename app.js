const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const path = require('path');
const crypto = require('crypto');
const { initDatabase } = require('./config/database');

// Import des middlewares
const csrfMiddleware = require('./middlewares/csrf');
const { generalLimiter } = require('./middlewares/rateLimiter');

// Import des routes
const indexRoutes = require('./routes/index');
const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');

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

// Middlewares de base
app.use(generalLimiter);
app.use(express.urlencoded({ extended: false, limit: '10mb' }));
app.use(express.json({ limit: '10mb' }));
app.use(session(sessionConfig));
app.use(express.static('public'));

// Configuration EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware CSRF
app.use(csrfMiddleware);

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
app.use('/', indexRoutes);
app.use('/', authRoutes);
app.use('/profile', profileRoutes);

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
      console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
      console.log('📁 Architecture restructurée avec:');
      console.log('   ├── 📂 controllers/');
      console.log('   ├── 📂 middlewares/');
      console.log('   ├── 📂 routes/');
      console.log('   ├── 📂 services/');
      console.log('   └── 📂 models/');
      console.log('🔒 Sécurités actives:');
      console.log('   ✓ Headers de sécurité (Helmet)');
      console.log('   ✓ Rate limiting (3 tentatives login / 30s)');
      console.log('   ✓ Sessions sécurisées');
      console.log('   ✓ Protection CSRF');
      console.log('   ✓ Protection XSS');
      console.log('   ✓ Protection contre les injections SQL');
    });
  } catch (error) {
    console.error('❌ Erreur lors du démarrage du serveur:', error);
    process.exit(1);
  }
}

startServer();

module.exports = app;