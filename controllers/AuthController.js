const User = require('../models/User');
const ValidationService = require('../services/ValidationService');
const AuthService = require('../services/AuthService');

/**
 * Contrôleur pour l'authentification
 */
class AuthController {
  /**
   * Affiche la page de connexion
   */
  static showLogin(req, res) {
    res.render('layout', {
      title: 'Connexion - Rent a Cat',
      body: `
        <div class="container">
          <h1>Connexion</h1>
          <form method="POST" action="/login">
            <input type="hidden" name="csrf_token" value="${res.locals.generateCSRFToken('login')}">
            
            <div class="form-group">
              <label for="email">Email</label>
              <input type="email" id="email" name="email" required>
            </div>
            
            <div class="form-group">
              <label for="password">Mot de passe</label>
              <input type="password" id="password" name="password" required>
            </div>
            
            <button type="submit" class="btn btn-primary">Se connecter</button>
          </form>
          
          <div class="nav-links">
            <p>Pas encore de compte ? <a href="/register">Créer un compte</a></p>
            <a href="/">Retour à l'accueil</a>
          </div>
        </div>
      `
    });
  }

  /**
   * Traite la connexion
   */
  static async processLogin(req, res) {
    try {
      const { email, password, csrf_token } = req.body;

      // Vérification du token CSRF
      if (!req.verifyCSRFToken('login', csrf_token)) {
        return res.status(403).render('layout', {
          title: 'Connexion - Rent a Cat',
          body: `
            <div class="container">
              <div class="error">Token de sécurité invalide. Veuillez réessayer.</div>
              <a href="/login" class="btn btn-secondary">Retour à la connexion</a>
            </div>
          `
        });
      }

      // Validation des données
      if (!email || !password) {
        return res.status(400).render('layout', {
          title: 'Connexion - Rent a Cat',
          body: `
            <div class="container">
              <div class="error">Tous les champs sont obligatoires.</div>
              <a href="/login" class="btn btn-secondary">Retour à la connexion</a>
            </div>
          `
        });
      }

      // Recherche de l'utilisateur
      const user = await User.findByEmail(email);
      if (!user) {
        return res.status(401).render('layout', {
          title: 'Connexion - Rent a Cat',
          body: `
            <div class="container">
              <div class="error">Email ou mot de passe incorrect.</div>
              <a href="/login" class="btn btn-secondary">Retour à la connexion</a>
            </div>
          `
        });
      }

      const isPasswordValid = await AuthService.verifyPassword(user.mot_de_passe, password);
      if (!isPasswordValid) {
        return res.status(401).render('layout', {
          title: 'Connexion - Rent a Cat',
          body: `
            <div class="container">
              <div class="error">Email ou mot de passe incorrect.</div>
              <a href="/login" class="btn btn-secondary">Retour à la connexion</a>
            </div>
          `
        });
      }

      // Créer la session
      AuthService.createUserSession(req, user);

      console.log(`Connexion réussie pour l'utilisateur: ${email} (ID: ${user.id})`);
      res.redirect('/');

    } catch (error) {
      console.error('Erreur lors de la connexion:', error);
      res.status(500).render('layout', {
        title: 'Erreur - Rent a Cat',
        body: `
          <div class="container">
            <div class="error">Erreur serveur. Veuillez réessayer plus tard.</div>
            <a href="/login" class="btn btn-secondary">Retour à la connexion</a>
          </div>
        `
      });
    }
  }

  /**
   * Affiche la page d'inscription
   */
  static showRegister(req, res) {
    res.render('layout', {
      title: 'Inscription - Rent a Cat',
      body: `
        <div class="container">
          <h1>Inscription</h1>
          <form method="POST" action="/register">
            <input type="hidden" name="csrf_token" value="${res.locals.generateCSRFToken('register')}">
            
            <div class="form-row">
              <div class="form-group">
                <label for="nom">Nom</label>
                <input type="text" id="nom" name="nom" required maxlength="100">
              </div>
              <div class="form-group">
                <label for="prenom">Prénom</label>
                <input type="text" id="prenom" name="prenom" required maxlength="100">
              </div>
            </div>
            
            <div class="form-group">
              <label for="email">Email</label>
              <input type="email" id="email" name="email" required maxlength="255">
            </div>
            
            <div class="form-group">
              <label for="password">Mot de passe</label>
              <input type="password" id="password" name="password" required minlength="8" maxlength="100">
              <small>Au moins 8 caractères avec une majuscule, une minuscule et un chiffre</small>
            </div>
            
            <button type="submit" class="btn btn-primary">Créer mon compte</button>
          </form>
          
          <div class="nav-links">
            <p>Déjà un compte ? <a href="/login">Se connecter</a></p>
            <a href="/">Retour à l'accueil</a>
          </div>
        </div>
      `
    });
  }

  /**
   * Traite l'inscription
   */
  static async processRegister(req, res) {
    try {
      const { nom, prenom, email, password, csrf_token } = req.body;

      // Vérification du token CSRF
      if (!req.verifyCSRFToken('register', csrf_token)) {
        return res.status(403).render('layout', {
          title: 'Inscription - Rent a Cat',
          body: `
            <div class="container">
              <div class="error">Token de sécurité invalide. Veuillez réessayer.</div>
              <a href="/register" class="btn btn-secondary">Retour à l'inscription</a>
            </div>
          `
        });
      }

      // Validation des données
      const validation = ValidationService.validateUserData({ nom, prenom, email, password });
      if (!validation.valid) {
        return res.status(400).render('layout', {
          title: 'Inscription - Rent a Cat',
          body: `
            <div class="container">
              <div class="error">
                <ul>
                  ${validation.errors.map(error => `<li>${error}</li>`).join('')}
                </ul>
              </div>
              <a href="/register" class="btn btn-secondary">Retour à l'inscription</a>
            </div>
          `
        });
      }

      // Vérifier si l'email existe déjà
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return res.status(409).render('layout', {
          title: 'Inscription - Rent a Cat',
          body: `
            <div class="container">
              <div class="error">Un compte avec cet email existe déjà.</div>
              <a href="/register" class="btn btn-secondary">Retour à l'inscription</a>
              <a href="/login" class="btn btn-primary">Se connecter</a>
            </div>
          `
        });
      }

      // Hacher le mot de passe
      const hashedPassword = await AuthService.hashPassword(password);

      // Créer l'utilisateur
      const newUser = await User.create({
        nom,
        prenom,
        email,
        password: hashedPassword
      });

      // Créer la session
      AuthService.createUserSession(req, newUser);

      console.log(`Nouvel utilisateur créé: ${email} (ID: ${newUser.id})`);
      res.redirect('/');

    } catch (error) {
      console.error('Erreur lors de l\'inscription:', error);
      res.status(500).render('layout', {
        title: 'Erreur - Rent a Cat',
        body: `
          <div class="container">
            <div class="error">Erreur serveur. Veuillez réessayer plus tard.</div>
            <a href="/register" class="btn btn-secondary">Retour à l'inscription</a>
          </div>
        `
      });
    }
  }

  /**
   * Déconnexion
   */
  static async logout(req, res) {
    try {
      await AuthService.destroyUserSession(req);
      res.redirect('/');
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
      res.redirect('/');
    }
  }
}

module.exports = AuthController;