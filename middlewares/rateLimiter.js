const rateLimit = require('express-rate-limit');

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

module.exports = {
  loginLimiter,
  generalLimiter
};