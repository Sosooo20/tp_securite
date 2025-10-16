const Reservation = require('../models/Reservation');
const Chat = require('../models/Chat');

class ReservationController {
    // Créer une nouvelle réservation
    static async create(req, res) {
        try {
            const { chatId, dateDebut, dateFin, prixTotal } = req.body;
            const userId = req.session.userId;

            // Vérifier que l'utilisateur est connecté
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Vous devez être connecté pour faire une réservation'
                });
            }

            // Valider les données
            if (!chatId || !dateDebut || !dateFin) {
                return res.status(400).json({
                    success: false,
                    message: 'Données manquantes: chatId, dateDebut et dateFin sont requis'
                });
            }

            // Vérifier que le chat existe
            const chat = await Chat.findById(chatId);
            if (!chat) {
                return res.status(404).json({
                    success: false,
                    message: 'Chat non trouvé'
                });
            }

            // Vérifier que les dates sont valides
            const startDate = new Date(dateDebut);
            const endDate = new Date(dateFin);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (startDate < today) {
                return res.status(400).json({
                    success: false,
                    message: 'La date de début ne peut pas être dans le passé'
                });
            }

            if (endDate <= startDate) {
                return res.status(400).json({
                    success: false,
                    message: 'La date de fin doit être après la date de début'
                });
            }

            // Vérifier les conflits de dates
            const hasConflict = await Reservation.checkDateConflict(chatId, dateDebut, dateFin);
            if (hasConflict) {
                return res.status(409).json({
                    success: false,
                    message: 'Ce chat est déjà réservé pour cette période'
                });
            }

            // Calculer le prix si non fourni
            let calculatedPrice = prixTotal;
            if (!calculatedPrice) {
                const diffTime = Math.abs(endDate - startDate);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                calculatedPrice = diffDays * chat.prix;
            }

            // Créer la réservation
            const reservation = await Reservation.create(
                userId,
                chatId,
                dateDebut,
                dateFin,
                calculatedPrice
            );

            res.json({
                success: true,
                message: 'Réservation créée avec succès',
                reservationId: reservation.id,
                reservation: reservation
            });

        } catch (error) {
            console.error('Erreur lors de la création de la réservation:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur serveur lors de la création de la réservation'
            });
        }
    }

    // Obtenir les réservations de l'utilisateur connecté
    static async getUserReservations(req, res) {
        try {
            const userId = req.session.userId;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Vous devez être connecté'
                });
            }

            const reservations = await Reservation.findByUserId(userId);

            res.json({
                success: true,
                reservations: reservations
            });

        } catch (error) {
            console.error('Erreur lors de la récupération des réservations:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur serveur'
            });
        }
    }

    // Obtenir une réservation par ID
    static async getReservationById(req, res) {
        try {
            const { id } = req.params;
            const userId = req.session.userId;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Vous devez être connecté'
                });
            }

            const reservation = await Reservation.findById(id);

            if (!reservation) {
                return res.status(404).json({
                    success: false,
                    message: 'Réservation non trouvée'
                });
            }

            // Vérifier que la réservation appartient à l'utilisateur
            if (reservation.id_user !== userId) {
                return res.status(403).json({
                    success: false,
                    message: 'Accès non autorisé à cette réservation'
                });
            }

            res.json({
                success: true,
                reservation: reservation
            });

        } catch (error) {
            console.error('Erreur lors de la récupération de la réservation:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur serveur'
            });
        }
    }

    // Annuler une réservation
    static async cancelReservation(req, res) {
        try {
            const { id } = req.params;
            const userId = req.session.userId;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Vous devez être connecté'
                });
            }

            const reservation = await Reservation.findById(id);

            if (!reservation) {
                return res.status(404).json({
                    success: false,
                    message: 'Réservation non trouvée'
                });
            }

            // Vérifier que la réservation appartient à l'utilisateur
            if (reservation.id_user !== userId) {
                return res.status(403).json({
                    success: false,
                    message: 'Accès non autorisé à cette réservation'
                });
            }

            // Vérifier que la réservation peut être annulée (date future)
            const startDate = new Date(reservation.date_debut);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (startDate <= today) {
                return res.status(400).json({
                    success: false,
                    message: 'Impossible d\'annuler une réservation déjà commencée'
                });
            }

            // Mettre à jour le statut
            const updatedReservation = await Reservation.updateStatus(id, 'annule');

            res.json({
                success: true,
                message: 'Réservation annulée avec succès',
                reservation: updatedReservation
            });

        } catch (error) {
            console.error('Erreur lors de l\'annulation de la réservation:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur serveur'
            });
        }
    }
}

module.exports = ReservationController;