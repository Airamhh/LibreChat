const express = require('express');
const {
  updateFavoritesController,
  getFavoritesController,
  updatePinnedConversationsController,
  getPinnedConversationsController,
} = require('~/server/controllers/FavoritesController');
const { requireJwtAuth } = require('~/server/middleware');

const router = express.Router();

router.get('/favorites', requireJwtAuth, getFavoritesController);
router.post('/favorites', requireJwtAuth, updateFavoritesController);
router.get('/pinned-conversations', requireJwtAuth, getPinnedConversationsController);
router.post('/pinned-conversations', requireJwtAuth, updatePinnedConversationsController);

module.exports = router;
