import type { IUserSettings, IUserSettingsDocument, UserPreferences } from '~/types';

export interface UserSettingsMethods {
  getUserSettings: (userId: string) => Promise<IUserSettingsDocument | null>;
  createUserSettings: (data: Partial<IUserSettings>) => Promise<IUserSettingsDocument>;
  updateUserSettings: (
    userId: string,
    preferences: UserPreferences,
  ) => Promise<IUserSettingsDocument | null>;
  patchUserSettings: (
    userId: string,
    partialPreferences: Partial<UserPreferences>,
  ) => Promise<IUserSettingsDocument | null>;
  deleteUserSettings: (userId: string) => Promise<boolean>;
  userSettingsExist: (userId: string) => Promise<boolean>;
}

export function createUserSettingsMethods(
  mongoose: typeof import('mongoose'),
): UserSettingsMethods {
  const { UserSettings } = require('~/models').createModels(mongoose);

  return {
    getUserSettings: (userId: string) => getUserSettings(UserSettings, userId),
    createUserSettings: (data: Partial<IUserSettings>) => createUserSettings(UserSettings, data),
    updateUserSettings: (userId: string, preferences: UserPreferences) =>
      updateUserSettings(UserSettings, userId, preferences),
    patchUserSettings: (userId: string, partialPreferences: Partial<UserPreferences>) =>
      patchUserSettings(UserSettings, userId, partialPreferences),
    deleteUserSettings: (userId: string) => deleteUserSettings(UserSettings, userId),
    userSettingsExist: (userId: string) => userSettingsExist(UserSettings, userId),
  };
}

/**
 * Get user settings by user ID
 */
async function getUserSettings(
  UserSettings: ReturnType<typeof import('~/models/usersettings').createUserSettingsModel>,
  userId: string,
): Promise<IUserSettingsDocument | null> {
  return await UserSettings.findOne({ userId }).lean();
}

/**
 * Create new user settings
 */
async function createUserSettings(
  UserSettings: ReturnType<typeof import('~/models/usersettings').createUserSettingsModel>,
  data: Partial<IUserSettings>,
): Promise<IUserSettingsDocument> {
  const settings = new UserSettings({
    ...data,
    version: data.version ?? 1,
  });
  return await settings.save();
}

/**
 * Update user settings (full replace)
 */
async function updateUserSettings(
  UserSettings: ReturnType<typeof import('~/models/usersettings').createUserSettingsModel>,
  userId: string,
  preferences: UserPreferences,
): Promise<IUserSettingsDocument | null> {
  return await UserSettings.findOneAndUpdate(
    { userId },
    {
      $set: {
        preferences,
        version: 1,
      },
    },
    { new: true, upsert: true },
  ).lean();
}

/**
 * Update user settings (partial update)
 */
async function patchUserSettings(
  UserSettings: ReturnType<typeof import('~/models/usersettings').createUserSettingsModel>,
  userId: string,
  partialPreferences: Partial<UserPreferences>,
): Promise<IUserSettingsDocument | null> {
  const updates: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(partialPreferences)) {
    updates[`preferences.${key}`] = value;
  }

  return await UserSettings.findOneAndUpdate(
    { userId },
    { $set: updates },
    { new: true, upsert: true },
  ).lean();
}

/**
 * Delete user settings
 */
async function deleteUserSettings(
  UserSettings: ReturnType<typeof import('~/models/usersettings').createUserSettingsModel>,
  userId: string,
): Promise<boolean> {
  const result = await UserSettings.deleteOne({ userId });
  return result.deletedCount > 0;
}

/**
 * Check if user settings exist
 */
async function userSettingsExist(
  UserSettings: ReturnType<typeof import('~/models/usersettings').createUserSettingsModel>,
  userId: string,
): Promise<boolean> {
  const count = await UserSettings.countDocuments({ userId }).limit(1);
  return count > 0;
}
