/**
 * Middleware d'authentification
 * Vérifie si l'utilisateur est connecté avant d'accéder aux routes protégées
 */
const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.redirect('/login');
  }
  next();
};

/**
 * Middleware pour les routes accessibles uniquement aux invités (non connectés)
 */
const requireGuest = (req, res, next) => {
  if (req.session.userId) {
    return res.redirect('/');
  }
  next();
};

module.exports = {
  requireAuth,
  requireGuest
};