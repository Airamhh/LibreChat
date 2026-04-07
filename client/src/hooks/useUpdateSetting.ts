import { useCallback } from 'react';
import type { UserPreferences } from 'librechat-data-provider';
import { usePatchUserSettingsMutation } from '~/data-provider';

type SettingPath = keyof UserPreferences | `speech.${string}`;

/**
 * Hook to update user settings with dual-write to localStorage and database
 */
export default function useUpdateSetting() {
  const patchSettings = usePatchUserSettingsMutation();

  const updateSetting = useCallback(
    async (path: SettingPath, value: unknown) => {
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
      } catch (error) {
        console.error('Failed to update settings in database:', error);
      }
    },
    [patchSettings],
  );

  return { updateSetting, isUpdating: patchSettings.isPending };
}
