const chatModel = require('../models/ajoutModel');

module.exports = {
    // Afficher le formulaire
    showAddForm: (req, res) => {
        res.render('addChat', { title: 'Ajouter un chat' });
    },

    // Ajouter un chat dans la DB
    addChat: async (req, res) => {
        try {
            const { nom, age, race, couleur, caractere, jouet_prefere, prix, description, disponible } = req.body;

            await chatModel.addChat({
                nom,
                age: parseInt(age),
                race,
                couleur,
                caractere,
                jouet_prefere,
                prix: parseFloat(prix),
                description,
                disponible: disponible === 'true'
            });

            res.redirect('/');
        } catch (err) {
            console.error(err);
            res.status(500).render('addChat', { title: 'Ajouter un chat', error: 'Erreur lors de l\'ajout' });
        }
    }
};
