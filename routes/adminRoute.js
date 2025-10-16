const { isAdmin } = require('../middlewares/auth');
const express = require("express");
const router = express.Router();

router.get('/ajout', isAdmin, ChatController.showAddChatForm);
