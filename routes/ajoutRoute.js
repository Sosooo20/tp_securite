const express = require('express');
const router = express.Router();
const chatController = require('../controllers/ajoutController');

router.get('/ajout', chatController.showAddForm);
router.post('/ajout', chatController.addChat);

module.exports = router;
