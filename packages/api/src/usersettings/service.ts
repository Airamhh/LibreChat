import type { UserPreferences, IUserSettingsDocument } from '@librechat/data-schemas';

const MAX_SETTINGS_STRING_LENGTH = 512;

/**
 * Validates user preferences data
 */
export function validateUserPreferences(preferences: Partial<UserPreferences>): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (preferences.chatDirection && !['LTR', 'RTL'].includes(preferences.chatDirection)) {
    errors.push('chatDirection must be either "LTR" or "RTL"');
  }

  if (preferences.fontSize && typeof preferences.fontSize !== 'string') {
    errors.push('fontSize must be a string');
  }

  if (preferences.fontSize && preferences.fontSize.length > MAX_SETTINGS_STRING_LENGTH) {
    errors.push(`fontSize exceeds maximum length of ${MAX_SETTINGS_STRING_LENGTH}`);
  }

  if (preferences.language && typeof preferences.language !== 'string') {
    errors.push('language must be a string');
  }

  if (preferences.language && preferences.language.length > MAX_SETTINGS_STRING_LENGTH) {
    errors.push(`language exceeds maximum length of ${MAX_SETTINGS_STRING_LENGTH}`);
  }

  if (preferences.speech) {
    if (preferences.speech.stt) {
      const { engine, language } = preferences.speech.stt;
      if (engine && typeof engine !== 'string') {
        errors.push('speech.stt.engine must be a string');
      }
      if (engine && engine.length > MAX_SETTINGS_STRING_LENGTH) {
        errors.push(`speech.stt.engine exceeds maximum length of ${MAX_SETTINGS_STRING_LENGTH}`);
      }
      if (language && typeof language !== 'string') {
        errors.push('speech.stt.language must be a string');
      }
      if (language && language.length > MAX_SETTINGS_STRING_LENGTH) {
        errors.push(
          `speech.stt.language exceeds maximum length of ${MAX_SETTINGS_STRING_LENGTH}`,
        );
      }
    }

    if (preferences.speech.tts) {
      const { engine, voice, language } = preferences.speech.tts;
      if (engine && typeof engine !== 'string') {
        errors.push('speech.tts.engine must be a string');
      }
      if (engine && engine.length > MAX_SETTINGS_STRING_LENGTH) {
        errors.push(`speech.tts.engine exceeds maximum length of ${MAX_SETTINGS_STRING_LENGTH}`);
      }
      if (voice && typeof voice !== 'string') {
        errors.push('speech.tts.voice must be a string');
      }
      if (voice && voice.length > MAX_SETTINGS_STRING_LENGTH) {
        errors.push(`speech.tts.voice exceeds maximum length of ${MAX_SETTINGS_STRING_LENGTH}`);
      }
      if (language && typeof language !== 'string') {
        errors.push('speech.tts.language must be a string');
      }
      if (language && language.length > MAX_SETTINGS_STRING_LENGTH) {
        errors.push(
          `speech.tts.language exceeds maximum length of ${MAX_SETTINGS_STRING_LENGTH}`,
        );
      }
    }
  }

  if (preferences.prompts) {
    if (
      preferences.prompts.editorMode &&
      typeof preferences.prompts.editorMode !== 'string'
    ) {
      errors.push('prompts.editorMode must be a string');
    }
    if (
      preferences.prompts.editorMode &&
      preferences.prompts.editorMode.length > MAX_SETTINGS_STRING_LENGTH
    ) {
      errors.push(
        `prompts.editorMode exceeds maximum length of ${MAX_SETTINGS_STRING_LENGTH}`,
      );
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Get user settings by user ID
 */
export async function getUserSettingsService(
  methods: { getUserSettings: (userId: string) => Promise<IUserSettingsDocument | null> },
  userId: string,
): Promise<IUserSettingsDocument | null> {
  return await methods.getUserSettings(userId);
}

/**
 * Update user settings (full replace)
 */
export async function updateUserSettingsService(
  methods: {
    updateUserSettings: (
      userId: string,
      preferences: UserPreferences,
    ) => Promise<IUserSettingsDocument | null>;
  },
  userId: string,
  preferences: UserPreferences,
): Promise<IUserSettingsDocument | null> {
  const validation = validateUserPreferences(preferences);

  if (!validation.isValid) {
    throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
  }

  return await methods.updateUserSettings(userId, preferences);
}

/**
 * Patch user settings (partial update)
 */
export async function patchUserSettingsService(
  methods: {
    patchUserSettings: (
      userId: string,
      partialPreferences: Partial<UserPreferences>,
    ) => Promise<IUserSettingsDocument | null>;
  },
  userId: string,
  partialPreferences: Partial<UserPreferences>,
): Promise<IUserSettingsDocument | null> {
  const validation = validateUserPreferences(partialPreferences);

  if (!validation.isValid) {
    throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
  }

  return await methods.patchUserSettings(userId, partialPreferences);
}
