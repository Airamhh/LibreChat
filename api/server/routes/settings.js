const express = require('express');
const {
  updateFavoritesController,
  getFavoritesController,
} = require('~/server/controllers/FavoritesController');
const {
  updatePinnedConversationsController,
  getPinnedConversationsController,
} = require('~/server/controllers/PinnedConversationsController');
const { requireJwtAuth } = require('~/server/middleware');

const router = express.Router();

router.get('/favorites', requireJwtAuth, getFavoritesController);
router.post('/favorites', requireJwtAuth, updateFavoritesController);

router.get('/pinnedConversations', requireJwtAuth, getPinnedConversationsController);
router.post('/pinnedConversations', requireJwtAuth, updatePinnedConversationsController);

module.exports = router;
