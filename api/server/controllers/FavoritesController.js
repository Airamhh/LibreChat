const { updateUser, getUserById } = require('~/models');

const MAX_FAVORITES = 50;
const MAX_STRING_LENGTH = 256;
const MAX_PINNED_CONVERSATIONS = 50;

const updateFavoritesController = async (req, res) => {
  try {
    const { favorites } = req.body;
    const userId = req.user.id;

    if (!favorites) {
      return res.status(400).json({ message: 'Favorites data is required' });
    }

    if (!Array.isArray(favorites)) {
      return res.status(400).json({ message: 'Favorites must be an array' });
    }

    if (favorites.length > MAX_FAVORITES) {
      return res.status(400).json({
        code: 'MAX_FAVORITES_EXCEEDED',
        message: `Maximum ${MAX_FAVORITES} favorites allowed`,
        limit: MAX_FAVORITES,
      });
    }

    for (const fav of favorites) {
      const hasAgent = !!fav.agentId;
      const hasModel = !!(fav.model && fav.endpoint);

      if (fav.agentId && fav.agentId.length > MAX_STRING_LENGTH) {
        return res
          .status(400)
          .json({ message: `agentId exceeds maximum length of ${MAX_STRING_LENGTH}` });
      }
      if (fav.model && fav.model.length > MAX_STRING_LENGTH) {
        return res
          .status(400)
          .json({ message: `model exceeds maximum length of ${MAX_STRING_LENGTH}` });
      }
      if (fav.endpoint && fav.endpoint.length > MAX_STRING_LENGTH) {
        return res
          .status(400)
          .json({ message: `endpoint exceeds maximum length of ${MAX_STRING_LENGTH}` });
      }

      if (!hasAgent && !hasModel) {
        return res.status(400).json({
          message: 'Each favorite must have either agentId or model+endpoint',
        });
      }

      if (hasAgent && hasModel) {
        return res.status(400).json({
          message: 'Favorite cannot have both agentId and model/endpoint',
        });
      }
    }

    const user = await updateUser(userId, { favorites });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json(user.favorites);
  } catch (error) {
    console.error('Error updating favorites:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const getFavoritesController = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await getUserById(userId, 'favorites');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    let favorites = user.favorites || [];

    if (!Array.isArray(favorites)) {
      favorites = [];
      await updateUser(userId, { favorites: [] });
    }

    res.status(200).json(favorites);
  } catch (error) {
    console.error('Error fetching favorites:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const updatePinnedConversationsController = async (req, res) => {
  try {
    const { pinnedConversations } = req.body;
    const userId = req.user.id;

    if (!pinnedConversations) {
      return res.status(400).json({ message: 'Pinned conversations data is required' });
    }

    if (!Array.isArray(pinnedConversations)) {
      return res.status(400).json({ message: 'Pinned conversations must be an array' });
    }

    if (pinnedConversations.length > MAX_PINNED_CONVERSATIONS) {
      return res.status(400).json({
        code: 'MAX_PINNED_CONVERSATIONS_EXCEEDED',
        message: `Maximum ${MAX_PINNED_CONVERSATIONS} pinned conversations allowed`,
        limit: MAX_PINNED_CONVERSATIONS,
      });
    }

    for (const pinned of pinnedConversations) {
      if (!pinned.conversationId) {
        return res
          .status(400)
          .json({ message: 'Each pinned conversation must have a conversationId' });
      }

      if (typeof pinned.conversationId !== 'string') {
        return res.status(400).json({ message: 'conversationId must be a string' });
      }

      if (pinned.conversationId.length > MAX_STRING_LENGTH) {
        return res
          .status(400)
          .json({ message: `conversationId exceeds maximum length of ${MAX_STRING_LENGTH}` });
      }
    }

    const user = await updateUser(userId, { pinnedConversations });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json(user.pinnedConversations);
  } catch (error) {
    console.error('Error updating pinned conversations:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const getPinnedConversationsController = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await getUserById(userId, 'pinnedConversations');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    let pinnedConversations = user.pinnedConversations || [];

    if (!Array.isArray(pinnedConversations)) {
      pinnedConversations = [];
      await updateUser(userId, { pinnedConversations: [] });
    }

    res.status(200).json(pinnedConversations);
  } catch (error) {
    console.error('Error fetching pinned conversations:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  updateFavoritesController,
  getFavoritesController,
  updatePinnedConversationsController,
  getPinnedConversationsController,
};
