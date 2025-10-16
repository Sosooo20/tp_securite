const Chat = require('../models/Chat');

/**
 * Contrôleur pour les pages principales
 */
class HomeController {
  /**
   * Affiche la page d'accueil avec la liste des chats
   */
  static async showHome(req, res) {
    try {
      // Récupérer tous les chats disponibles
      const chats = await Chat.findAll();

      res.render('home', {
        title: 'Accueil - Rent a Cat',
        chats: chats,
        session: req.session
      });
    } catch (error) {
      console.error('Erreur lors du chargement de la page d\'accueil:', error);
      res.status(500).render('layout', {
        title: 'Erreur - Rent a Cat',
        body: `
          <div class="container">
            <h1>Erreur</h1>
            <div class="error">Une erreur est survenue lors du chargement de la page.</div>
            <a href="/" class="btn btn-secondary">Réessayer</a>
          </div>
        `
      });
    }
  }

  /**
   * Affiche la page des réservations
   */
  static showReservations(req, res) {
    res.render('layout', {
      title: 'Mes Réservations - Rent a Cat',
      body: `
        <div class="container">
          <h1>Mes Réservations</h1>
          <p>Voici la liste de vos réservations de chats.</p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>🐱 Réservation #001</h3>
            <p><strong>Chat:</strong> Minou le Persan</p>
            <p><strong>Date:</strong> 20 octobre 2025</p>
            <p><strong>Statut:</strong> <span style="color: #28a745;">✅ Confirmée</span></p>
            <button class="btn btn-danger" style="margin-top: 10px;">Annuler la réservation</button>
          </div>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>🐱 Réservation #002</h3>
            <p><strong>Chat:</strong> Garfield le Maine Coon</p>
            <p><strong>Date:</strong> 25 octobre 2025</p>
            <p><strong>Statut:</strong> <span style="color: #ffc107;">⏳ En attente</span></p>
            <button class="btn btn-danger" style="margin-top: 10px;">Annuler la réservation</button>
          </div>
          
          <div class="nav-links">
            <a href="/" class="btn btn-secondary">Retour à l'accueil</a>
            <a href="/catalogue" class="btn btn-primary">Nouvelle réservation</a>
          </div>
        </div>
      `
    });
  }
}

module.exports = HomeController;