const {
  getUserSettingsService,
  updateUserSettingsService,
  patchUserSettingsService,
} = require('@librechat/api');
const {
  getUserSettings,
  updateUserSettings,
  patchUserSettings,
} = require('~/models');

/**
 * GET /api/settings/user
 * Get user settings
 */
const getUserSettingsController = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('[getUserSettingsController] Fetching settings for userId:', userId);
    const settings = await getUserSettingsService({ getUserSettings }, userId);

    if (!settings) {
      console.log('[getUserSettingsController] No settings found, returning empty preferences');
      return res.status(200).json({
        userId,
        version: 1,
        preferences: {},
      });
    }

    console.log('[getUserSettingsController] Settings found:', JSON.stringify(settings));
    res.status(200).json(settings);
  } catch (error) {
    console.error('[getUserSettingsController] Error fetching user settings:', error);
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

    console.log('[updateUserSettingsController] userId:', userId);
    console.log('[updateUserSettingsController] preferences:', JSON.stringify(preferences));

    if (!preferences) {
      return res.status(400).json({ message: 'Preferences data is required' });
    }

    if (typeof preferences !== 'object' || Array.isArray(preferences)) {
      return res.status(400).json({ message: 'Preferences must be an object' });
    }

    const settings = await updateUserSettingsService({ updateUserSettings }, userId, preferences);

    console.log('[updateUserSettingsController] Update successful:', JSON.stringify(settings));
    res.status(200).json(settings);
  } catch (error) {
    console.error('[updateUserSettingsController] Error updating user settings:', error);

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

    console.log('[patchUserSettingsController] userId:', userId);
    console.log('[patchUserSettingsController] preferences:', JSON.stringify(preferences));

    if (!preferences) {
      return res.status(400).json({ message: 'Preferences data is required' });
    }

    if (typeof preferences !== 'object' || Array.isArray(preferences)) {
      return res.status(400).json({ message: 'Preferences must be an object' });
    }

    const settings = await patchUserSettingsService({ patchUserSettings }, userId, preferences);

    console.log('[patchUserSettingsController] Patch successful:', JSON.stringify(settings));
    res.status(200).json(settings);
  } catch (error) {
    console.error('[patchUserSettingsController] Error patching user settings:', error);

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
