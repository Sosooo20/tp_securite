
const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.redirect('/login');
  }
  next();
};
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