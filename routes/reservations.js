const express = require('express');
const router = express.Router();
const ReservationController = require('../controllers/ReservationController');
const authMiddleware = require('../middlewares/auth');

// Middleware d'authentification pour toutes les routes de réservation
router.use(authMiddleware.requireAuth);

// POST /api/reservations - Créer une nouvelle réservation
router.post('/', ReservationController.create);

// GET /api/reservations - Obtenir les réservations de l'utilisateur
router.get('/', ReservationController.getUserReservations);

// GET /api/reservations/:id - Obtenir une réservation par ID
router.get('/:id', ReservationController.getReservationById);

// PUT /api/reservations/:id/cancel - Annuler une réservation
router.put('/:id/cancel', ReservationController.cancelReservation);

module.exports = router;