# ChatRental - Plateforme sécurisée de location de chats

## Description

ChatRental est une application web sécurisée permettant de louer un chat pour la journée. Ce projet a été développé avec un focus particulier sur la sécurité web.

## Prérequis

- Node.js (version 14 ou supérieure)
- MySQL Server (version 5.7 ou supérieure)
- npm (généralement installé avec Node.js)

## Installation

1. **Cloner le projet**
   ```bash
   git clone <url-du-repo>
   cd tp_securite
   ```

2. **Installer les dépendances**
   ```bash
   npm install
   ```

3. **Configuration de la base de données**
   - Démarrer MySQL Server
   - Modifier les paramètres de connexion dans `config/database.js` :
     ```javascript
     const dbConfig = {
       host: 'localhost',
       user: 'votre_utilisateur_mysql',
       password: 'votre_mot_de_passe_mysql',
       database: 'tp_securite_chat'
     };
     ```

4. **Démarrage de l'application**
   ```bash
   npm start
   ```

5. **Accéder à l'application**
   - Ouvrir votre navigateur et aller sur `http://localhost:3000`

## Structure du projet

```
tp_securite/
├── app.js              # Serveur principal avec middlewares de sécurité
├── package.json        # Dépendances et scripts
├── config/
│   └── database.js     # Configuration et initialisation de la base de données
├── routes/
│   └── auth.js         # Routes d'authentification (login/register)
├── views/
│   ├── layout.ejs      # Template de base
│   ├── login.ejs       # Page de connexion
│   └── register.ejs    # Page d'inscription
└── public/             # Fichiers statiques (CSS, JS, images)
```

## Sécurités implémentées

### 1. Authentification et gestion des mots de passe
- **Hash Argon2id** : Les mots de passe sont hashés avec Argon2id (résistant aux attaques par GPU)
- **Validation forte** : Mots de passe d'au moins 8 caractères avec lettres et chiffres
- **Sessions sécurisées** : Gestion des sessions côté serveur avec cookies sécurisés

### 2. Protection contre les attaques par force brute
- **Rate limiting** : Maximum 3 tentatives de connexion par 30 secondes par IP+email
- **Rate limiting général** : 100 requêtes par IP toutes les 15 minutes

### 3. Protection CSRF (Cross-Site Request Forgery)
- **Tokens CSRF uniques** : Un token différent par formulaire
- **Expiration rapide** : Tokens valides 10 minutes maximum
- **Usage unique** : Tokens invalidés après utilisation

### 4. Protection XSS (Cross-Site Scripting)
- **Échappement automatique** : Toutes les sorties sont échappées avec `escapeHtml()`
- **Templates sécurisés** : Utilisation d'EJS avec échappement par défaut
- **Validation des entrées** : Regex strictes pour noms, emails, etc.

### 5. Protection contre l'injection SQL
- **Requêtes préparées** : Toutes les requêtes utilisent `pool.execute()` avec paramètres
- **Validation des données** : Validation stricte avant insertion en base

### 6. Headers de sécurité (Helmet.js)
- **CSP (Content Security Policy)** : Politique stricte `default-src 'self'`
- **X-Content-Type-Options** : Protection contre le MIME sniffing
- **X-Frame-Options** : Protection contre le clickjacking
- **Referrer-Policy** : Contrôle des informations de référence

### 7. Configuration des cookies
- **HttpOnly** : Empêche l'accès JavaScript aux cookies
- **Secure** : Transmission uniquement en HTTPS (production)
- **SameSite=Strict** : Protection supplémentaire CSRF

## Structure de la base de données

### Table `users`
```sql
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nom VARCHAR(100) NOT NULL,
  prenom VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  mot_de_passe VARCHAR(255) NOT NULL,
  image VARCHAR(255) NULL,
  description TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email)
);
```

## Comptes de test

Après le premier démarrage, vous pouvez créer un compte via l'interface d'inscription à l'adresse `/register`.

## Variables d'environnement (Optionnel)

Créer un fichier `.env` pour la production :
```env
NODE_ENV=production
SESSION_SECRET=votre_secret_session_tres_long_et_aleatoire
PORT=3000
```

## Logs de sécurité

L'application log automatiquement :
- Connexions réussies avec ID utilisateur
- Créations de nouveaux comptes
- Erreurs d'authentification dans la console

## Tests de sécurité recommandés

1. **Test CSRF** : Tentative de soumission de formulaires sans token
2. **Test XSS** : Injection de scripts dans les champs de saisie
3. **Test Rate Limiting** : Multiples tentatives de connexion rapides
4. **Test SQL Injection** : Caractères spéciaux dans les champs
5. **Test Headers** : Vérification avec outils comme SecurityHeaders.com

## Dépendances principales

- **express** : Framework web minimaliste
- **mysql2** : Driver MySQL avec support des requêtes préparées
- **argon2** : Fonction de hachage sécurisée
- **express-session** : Gestion des sessions
- **express-rate-limit** : Limitation du taux de requêtes
- **helmet** : Headers de sécurité
- **ejs** : Moteur de templates

## Support

Pour toute question ou problème de sécurité, veuillez consulter la documentation ou créer une issue sur le repository.