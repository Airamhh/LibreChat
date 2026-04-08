import { useCallback } from 'react';
import type { UserPreferences } from 'librechat-data-provider';
import { usePatchUserSettingsMutation } from '~/data-provider';

type SettingPath = keyof UserPreferences | `speech.${string}`;

/**
 * Hook to update user settings with persistence to database
 * The database is the source of truth, and settings sync back via useUserSettingsSync
 */
export default function useUpdateSetting() {
  const patchSettings = usePatchUserSettingsMutation();

  const updateSetting = useCallback(
    async (path: SettingPath, value: unknown) => {
      console.log('[useUpdateSetting] Updating setting:', path, '=', value);
      const preferences: Partial<UserPreferences> = {};

      if (path.startsWith('speech.')) {
        const speechPath = path.replace('speech.', '');
        const parts = speechPath.split('.');

        if (parts.length === 2 && (parts[0] === 'stt' || parts[0] === 'tts')) {
          const category = parts[0];
          const field = parts[1];

          preferences.speech = {
            [category]: {
              [field]: value,
            },
          } as UserPreferences['speech'];
        } else if (parts.length === 1) {
          preferences.speech = {
            [parts[0]]: value,
          } as UserPreferences['speech'];
        }
      } else {
        preferences[path as keyof UserPreferences] = value as never;
      }

      try {
        await patchSettings.mutateAsync({ preferences });
        console.log('[useUpdateSetting] Successfully updated setting in database');
      } catch (error) {
        console.error('[useUpdateSetting] Failed to update settings in database:', error);
      }
    },
    [patchSettings],
  );

  return { updateSetting, isUpdating: patchSettings.isPending };
}
