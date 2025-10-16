const db = require('../config/database');

class Reservation {
    // Créer une nouvelle réservation
    static async create(idUser, idChat, dateDebut, dateFin, prixTotal) {
        try {
            const query = `
                INSERT INTO reservations (id_user, id_chat, date_debut, date_fin, prix_total, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
                RETURNING *
            `;
            
            const result = await db.query(query, [idUser, idChat, dateDebut, dateFin, prixTotal]);
            return result.rows[0];
        } catch (error) {
            console.error('Erreur lors de la création de la réservation:', error);
            throw error;
        }
    }

    // Trouver toutes les réservations d'un utilisateur
    static async findByUserId(userId) {
        try {
            const query = `
                SELECT r.*, c.nom as chat_nom, c.race, c.image
                FROM reservations r
                JOIN chats c ON r.id_chat = c.id
                WHERE r.id_user = $1
                ORDER BY r.created_at DESC
            `;
            
            const result = await db.query(query, [userId]);
            return result.rows;
        } catch (error) {
            console.error('Erreur lors de la récupération des réservations:', error);
            throw error;
        }
    }

    // Trouver une réservation par ID
    static async findById(id) {
        try {
            const query = `
                SELECT r.*, c.nom as chat_nom, c.race, c.image, u.nom as user_nom, u.email
                FROM reservations r
                JOIN chats c ON r.id_chat = c.id
                JOIN users u ON r.id_user = u.id
                WHERE r.id = $1
            `;
            
            const result = await db.query(query, [id]);
            return result.rows[0];
        } catch (error) {
            console.error('Erreur lors de la récupération de la réservation:', error);
            throw error;
        }
    }

    // Vérifier les conflits de dates pour un chat
    static async checkDateConflict(chatId, dateDebut, dateFin, excludeReservationId = null) {
        try {
            let query = `
                SELECT * FROM reservations 
                WHERE id_chat = $1 
                AND (
                    (date_debut <= $2 AND date_fin >= $2) OR
                    (date_debut <= $3 AND date_fin >= $3) OR
                    (date_debut >= $2 AND date_fin <= $3)
                )
                AND statut != 'annule'
            `;
            
            const params = [chatId, dateDebut, dateFin];
            
            if (excludeReservationId) {
                query += ' AND id != $4';
                params.push(excludeReservationId);
            }
            
            const result = await db.query(query, params);
            return result.rows.length > 0;
        } catch (error) {
            console.error('Erreur lors de la vérification des conflits:', error);
            throw error;
        }
    }

    // Mettre à jour le statut d'une réservation
    static async updateStatus(id, statut) {
        try {
            const query = `
                UPDATE reservations 
                SET statut = $1, updated_at = NOW()
                WHERE id = $2
                RETURNING *
            `;
            
            const result = await db.query(query, [statut, id]);
            return result.rows[0];
        } catch (error) {
            console.error('Erreur lors de la mise à jour du statut:', error);
            throw error;
        }
    }

    // Supprimer une réservation
    static async delete(id) {
        try {
            const query = 'DELETE FROM reservations WHERE id = $1 RETURNING *';
            const result = await db.query(query, [id]);
            return result.rows[0];
        } catch (error) {
            console.error('Erreur lors de la suppression de la réservation:', error);
            throw error;
        }
    }
}

module.exports = Reservation;