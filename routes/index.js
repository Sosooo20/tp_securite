const express = require('express');
const router = express.Router();
const HomeController = require('../controllers/HomeController');
const { requireAuth } = require('../middlewares/auth');

// Route principale
router.get('/', HomeController.showHome);

// Route des réservations (protégée)
router.get('/reservations', requireAuth, HomeController.showReservations);

module.exports = router;