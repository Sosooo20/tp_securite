const express = require('express');
const router = express.Router();
const HomeController = require('../controllers/HomeController');
const { requireAuth } = require('../middlewares/auth');

// Route principale
router.get('/', HomeController.showHome);

// Route des réservations (protégée)
router.get('/reservations', requireAuth, HomeController.showReservations);

// Route de réservation d'un chat spécifique
router.get('/reservation/:chatId', HomeController.showReservationPage);

module.exports = router;