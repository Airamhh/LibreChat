import type { Model } from 'mongoose';
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
  return {
    getUserSettings: (userId: string) => getUserSettings(mongoose, userId),
    createUserSettings: (data: Partial<IUserSettings>) => createUserSettings(mongoose, data),
    updateUserSettings: (userId: string, preferences: UserPreferences) =>
      updateUserSettings(mongoose, userId, preferences),
    patchUserSettings: (userId: string, partialPreferences: Partial<UserPreferences>) =>
      patchUserSettings(mongoose, userId, partialPreferences),
    deleteUserSettings: (userId: string) => deleteUserSettings(mongoose, userId),
    userSettingsExist: (userId: string) => userSettingsExist(mongoose, userId),
  };
}

/**
 * Get user settings by user ID
 */
async function getUserSettings(
  mongoose: typeof import('mongoose'),
  userId: string,
): Promise<IUserSettingsDocument | null> {
  console.log('[getUserSettings] DB method called for userId:', userId);
  const UserSettings = mongoose.models.UserSettings as Model<IUserSettingsDocument>;
  const result = await UserSettings.findOne({ userId }).lean();
  console.log('[getUserSettings] DB result:', result ? 'found' : 'not found');
  return result;
}

/**
 * Create new user settings
 */
async function createUserSettings(
  mongoose: typeof import('mongoose'),
  data: Partial<IUserSettings>,
): Promise<IUserSettingsDocument> {
  const UserSettings = mongoose.models.UserSettings as Model<IUserSettingsDocument>;
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
  mongoose: typeof import('mongoose'),
  userId: string,
  preferences: UserPreferences,
): Promise<IUserSettingsDocument | null> {
  console.log('[updateUserSettings] DB method called for userId:', userId);
  console.log('[updateUserSettings] Preferences keys:', Object.keys(preferences));
  const UserSettings = mongoose.models.UserSettings as Model<IUserSettingsDocument>;
  const result = await UserSettings.findOneAndUpdate(
    { userId },
    {
      $set: {
        preferences,
        version: 1,
      },
      $setOnInsert: {
        userId,
      },
    },
    { new: true, upsert: true },
  ).lean();
  console.log('[updateUserSettings] DB upsert result:', result ? 'success' : 'failed', result?._id);
  return result;
}

/**
 * Update user settings (partial update)
 */
async function patchUserSettings(
  mongoose: typeof import('mongoose'),
  userId: string,
  partialPreferences: Partial<UserPreferences>,
): Promise<IUserSettingsDocument | null> {
  console.log('[patchUserSettings] DB method called for userId:', userId);
  console.log('[patchUserSettings] Partial preferences keys:', Object.keys(partialPreferences));
  const UserSettings = mongoose.models.UserSettings as Model<IUserSettingsDocument>;
  const updates: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(partialPreferences)) {
    updates[`preferences.${key}`] = value;
  }

  console.log('[patchUserSettings] DB updates:', Object.keys(updates));
  const result = await UserSettings.findOneAndUpdate(
    { userId },
    {
      $set: updates,
      $setOnInsert: {
        userId,
      },
    },
    { new: true, upsert: true },
  ).lean();
  console.log('[patchUserSettings] DB upsert result:', result ? 'success' : 'failed', result?._id);
  return result;
}

/**
 * Delete user settings
 */
async function deleteUserSettings(
  mongoose: typeof import('mongoose'),
  userId: string,
): Promise<boolean> {
  const UserSettings = mongoose.models.UserSettings as Model<IUserSettingsDocument>;
  const result = await UserSettings.deleteOne({ userId });
  return result.deletedCount > 0;
}

/**
 * Check if user settings exist
 */
async function userSettingsExist(
  mongoose: typeof import('mongoose'),
  userId: string,
): Promise<boolean> {
  const UserSettings = mongoose.models.UserSettings as Model<IUserSettingsDocument>;
  const count = await UserSettings.countDocuments({ userId }).limit(1);
  return count > 0;
}
