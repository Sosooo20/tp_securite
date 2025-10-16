const db = require('../config/database');

module.exports = {
    addChat: async (chatData) => {
        const { nom, age, race, couleur, caractere, jouet_prefere, prix, description, disponible } = chatData;
        const query = `
      INSERT INTO chats (nom, age, race, couleur, caractere, jouet_prefere, prix, description, disponible)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id
    `;
        const params = [nom, age, race, couleur, caractere, jouet_prefere, prix, description, disponible];

        try {
            const result = await db.query(query, params);
            return result.rows[0]; // retourne { id: ... }
        } catch (err) {
            console.error('Erreur ajout chat :', err.message);
            throw err;
        }
    }
};
