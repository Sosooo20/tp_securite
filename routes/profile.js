const express = require('express');
const router = express.Router();
const ProfileController = require('../controllers/ProfileController');
const { requireAuth } = require('../middlewares/auth');
const upload = require('../middlewares/upload');

// Routes du profil (protégées par authentification)
router.get('/', requireAuth, ProfileController.redirectToEdit);
router.get('/edit', requireAuth, ProfileController.showEditForm);
router.post('/edit', requireAuth, upload.single('profileImage'), ProfileController.updateProfile);

module.exports = router;