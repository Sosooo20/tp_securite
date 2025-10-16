const crypto = require('crypto');

/**
 * Middleware pour générer et vérifier les tokens CSRF
 */
const csrfMiddleware = (req, res, next) => {
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
};

module.exports = csrfMiddleware;