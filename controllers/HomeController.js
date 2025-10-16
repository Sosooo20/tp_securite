/**
 * Contrôleur pour les pages principales
 */
class HomeController {
  /**
   * Affiche la page d'accueil
   */
  static showHome(req, res) {
    // Helper pour échapper HTML (protection XSS supplémentaire)
    const escapeHtml = (text) => {
      const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
      };
      return text ? text.replace(/[&<>"']/g, (m) => map[m]) : '';
    };

    res.render('layout', {
      title: 'Accueil - Rent a Cat',
      body: `
        <div class="container welcome-content">
          <h1>Bienvenue sur Rent a Cat</h1>
          <p>La plateforme sécurisée pour louer un chat pour la journée!</p>
          ${req.session.userId ? 
            `<div class="welcome-content">
               <p>✅ Connecté en tant que: <strong>${escapeHtml(req.session.userName)}</strong></p>
               <p>📧 Email: <strong>${escapeHtml(req.session.userEmail)}</strong></p>
               <div class="nav-links">
                 <a href="/reservations" class="btn btn-primary">Mes Réservations</a>
                 <a href="/profile" class="btn btn-secondary">Mon Profil</a>
               </div>
             </div>` :
            `<div class="welcome-content">
               <p>Connectez-vous pour accéder à toutes les fonctionnalités !</p>
               <div class="nav-links">
                 <a href="/login" class="btn btn-primary">Se connecter</a>
                 <a href="/register" class="btn btn-secondary">Créer un compte</a>
               </div>
             </div>`
          }
        </div>
      `
    });
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