const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/AuthController');
const { requireGuest } = require('../middlewares/auth');
const { loginLimiter } = require('../middlewares/rateLimiter');

// Routes d'authentification (accessibles uniquement aux invités)
router.get('/login', requireGuest, AuthController.showLogin);
router.post('/login', requireGuest, loginLimiter, AuthController.processLogin);

router.get('/register', requireGuest, AuthController.showRegister);
router.post('/register', requireGuest, AuthController.processRegister);

// Route de déconnexion
router.post('/logout', AuthController.logout);

module.exports = router;