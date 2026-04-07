const express = require('express');
const {
  updateFavoritesController,
  getFavoritesController,
} = require('~/server/controllers/FavoritesController');
const {
  getUserSettingsController,
  updateUserSettingsController,
  patchUserSettingsController,
} = require('~/server/controllers/UserSettingsController');
const { requireJwtAuth } = require('~/server/middleware');

const router = express.Router();

router.get('/favorites', requireJwtAuth, getFavoritesController);
router.post('/favorites', requireJwtAuth, updateFavoritesController);

router.get('/user', requireJwtAuth, getUserSettingsController);
router.put('/user', requireJwtAuth, updateUserSettingsController);
router.patch('/user', requireJwtAuth, patchUserSettingsController);

module.exports = router;
