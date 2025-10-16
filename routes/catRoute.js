const express = require('express');
const router = express.Router();
const catController = require('../controllers/catController');

router.get('/', catController.getAllChats);

module.exports = router;
