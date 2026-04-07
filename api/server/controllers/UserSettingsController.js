const {
  getUserSettingsService,
  updateUserSettingsService,
  patchUserSettingsService,
} = require('@librechat/api');

/**
 * GET /api/settings/user
 * Get user settings
 */
const getUserSettingsController = async (req, res) => {
  try {
    const userId = req.user.id;
    const settings = await getUserSettingsService(req.app.locals, userId);

    if (!settings) {
      return res.status(404).json({ message: 'User settings not found' });
    }

    res.status(200).json(settings);
  } catch (error) {
    console.error('Error fetching user settings:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * PUT /api/settings/user
 * Update user settings (full replace)
 */
const updateUserSettingsController = async (req, res) => {
  try {
    const { preferences } = req.body;
    const userId = req.user.id;

    if (!preferences) {
      return res.status(400).json({ message: 'Preferences data is required' });
    }

    if (typeof preferences !== 'object' || Array.isArray(preferences)) {
      return res.status(400).json({ message: 'Preferences must be an object' });
    }

    const settings = await updateUserSettingsService(req.app.locals, userId, preferences);

    res.status(200).json(settings);
  } catch (error) {
    console.error('Error updating user settings:', error);

    if (error.message && error.message.includes('Validation failed')) {
      return res.status(400).json({ message: error.message });
    }

    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * PATCH /api/settings/user
 * Partially update user settings
 */
const patchUserSettingsController = async (req, res) => {
  try {
    const { preferences } = req.body;
    const userId = req.user.id;

    if (!preferences) {
      return res.status(400).json({ message: 'Preferences data is required' });
    }

    if (typeof preferences !== 'object' || Array.isArray(preferences)) {
      return res.status(400).json({ message: 'Preferences must be an object' });
    }

    const settings = await patchUserSettingsService(req.app.locals, userId, preferences);

    res.status(200).json(settings);
  } catch (error) {
    console.error('Error patching user settings:', error);

    if (error.message && error.message.includes('Validation failed')) {
      return res.status(400).json({ message: error.message });
    }

    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  getUserSettingsController,
  updateUserSettingsController,
  patchUserSettingsController,
};
