const chatModel = require('../models/catModel');

async function getAllChats(req, res) {
    try {
        const chats = await chatModel.getAllChats();
        res.render('layout', {   // on rend layout
            title: 'Accueil - Réservation de chats',
            chats: chats || [],   // toujours définir chats
            user: {
                id: req.session.userId,
                email: req.session.userEmail
            }
        });
    } catch (error) {
        console.error('Erreur récupération chats:', error.message);
        res.status(500).render('layout', {
            title: 'Erreur Serveur',
            chats: [],
            user: null
        });
    }
}

module.exports = { getAllChats };
