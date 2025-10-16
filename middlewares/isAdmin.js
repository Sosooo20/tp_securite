// middlewares/auth.js
function isAdmin(req, res, next) {
    if (req.session && req.session.admin === 1) {
        next();
    } else {
        res.status(403).render('layout', {
            title: 'Accès refusé',
            body: `
        <div class="container">
          <div class="error">Accès refusé : cette page est réservée aux administrateurs.</div>
          <a href="/" class="btn btn-secondary">Retour à l'accueil</a>
        </div>
      `
        });
    }
}

module.exports = { isAdmin };
