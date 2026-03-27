const { updateUser, getUserById } = require('~/models');

const MAX_PINNED_CONVERSATIONS = 50;
const MAX_STRING_LENGTH = 256;

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
        return res.status(400).json({
          message: 'Each pinned conversation must have a conversationId',
        });
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
  updatePinnedConversationsController,
  getPinnedConversationsController,
};
