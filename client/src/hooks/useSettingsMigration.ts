import { useEffect, useRef } from 'react';
import type { UserPreferences } from 'librechat-data-provider';
import { useUpdateUserSettingsMutation, useUserSettingsQuery } from '~/data-provider';

/**
 * Maps localStorage keys to UserPreferences field names
 */
const settingsMapping: Record<string, keyof UserPreferences> = {
  enterToSend: 'enterToSend',
  maximizeChatSpace: 'maximizeChatSpace',
  chatDirection: 'chatDirection',
  autoExpandTools: 'autoExpandTools',
  saveDrafts: 'saveDrafts',
  rememberDefaultFork: 'rememberDefaultFork',
  showThinking: 'showThinking',
  enableUserMsgMarkdown: 'enableUserMsgMarkdown',
  modularChat: 'modularChat',
  LaTeXParsing: 'LaTeXParsing',
  atCommand: 'atCommand',
  plusCommand: 'plusCommand',
  slashCommand: 'slashCommand',
  UsernameDisplay: 'usernameDisplay',
  'color-theme': 'colorTheme',
  'theme-name': 'themeName',
  fontSize: 'fontSize',
  lang: 'language',
  autoScroll: 'autoScroll',
  unifiedSidebarExpanded: 'sidebarExpanded',
  keepScreenAwake: 'keepScreenAwake',
  showScrollButton: 'showScrollButton',
  forkSetting: 'forkSetting',
  splitAtTarget: 'splitAtTarget',
  saveBadgesState: 'saveBadgesState',
  centerFormOnLanding: 'centerFormOnLanding',
  showFooter: 'showFooter',
};

/**
 * Maps speech-related localStorage keys to nested speech settings
 */
const speechMapping = {
  conversationMode: 'speech.conversationMode',
  advancedMode: 'speech.advancedMode',
  speechToText: 'speech.stt.enabled',
  engineSTT: 'speech.stt.engine',
  languageSTT: 'speech.stt.language',
  autoTranscribeAudio: 'speech.stt.autoTranscribe',
  decibelValue: 'speech.stt.decibelValue',
  autoSendText: 'speech.stt.autoSendText',
  textToSpeech: 'speech.tts.enabled',
  engineTTS: 'speech.tts.engine',
  voice: 'speech.tts.voice',
  cloudBrowserVoices: 'speech.tts.cloudBrowserVoices',
  languageTTS: 'speech.tts.language',
  automaticPlayback: 'speech.tts.automaticPlayback',
  playbackRate: 'speech.tts.playbackRate',
  cacheTTS: 'speech.tts.cacheTTS',
};

/**
 * Sets a nested property on an object using dot notation
 */
function setNestedProperty(obj: Record<string, unknown>, path: string, value: unknown): void {
  const keys = path.split('.');
  let current = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!current[key] || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }

  current[keys[keys.length - 1]] = value;
}

/**
 * Reads a value from localStorage and parses it
 */
function getLocalStorageValue(key: string): unknown {
  try {
    const value = localStorage.getItem(key);
    if (value === null) {
      return undefined;
    }
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

/**
 * Hook that creates user settings from localStorage if they don't exist in DB
 * If settings exist in DB, this hook does nothing (useUserSettingsSync handles it)
 */
export default function useSettingsMigration(enabled: boolean) {
  const migrationAttempted = useRef(false);
  const updateUserSettings = useUpdateUserSettingsMutation();
  const { data: userSettings, isSuccess } = useUserSettingsQuery({
    enabled,
  });

  useEffect(() => {
    console.log('[useSettingsMigration] Effect triggered', {
      enabled,
      attempted: migrationAttempted.current,
      isSuccess,
      hasPreferences: !!userSettings?.preferences
    });

    if (!enabled || migrationAttempted.current || !isSuccess) {
      return;
    }

    // If settings already exist in database (non-empty preferences), don't migrate
    const hasExistingSettings = userSettings?.preferences &&
      Object.keys(userSettings.preferences).length > 0;

    if (hasExistingSettings) {
      console.log('[useSettingsMigration] Settings already exist in DB, skipping migration');
      migrationAttempted.current = true;
      return;
    }

    const migrateSettings = async () => {
      try {
        console.log('[useSettingsMigration] No settings in DB, creating from localStorage...');
        const preferences: Record<string, unknown> = {};

        for (const [localKey, prefKey] of Object.entries(settingsMapping)) {
          const value = getLocalStorageValue(localKey);
          if (value !== undefined) {
            console.log(`[useSettingsMigration] Found ${localKey} = ${JSON.stringify(value)}`);
            preferences[prefKey] = value;
          }
        }

        for (const [localKey, prefPath] of Object.entries(speechMapping)) {
          const value = getLocalStorageValue(localKey);
          if (value !== undefined) {
            console.log(`[useSettingsMigration] Found ${localKey} = ${JSON.stringify(value)}`);
            setNestedProperty(preferences, prefPath, value);
          }
        }

        console.log('[useSettingsMigration] Collected preferences', preferences);

        // Always create settings (even if empty) to establish the user's preferences document
        console.log('[useSettingsMigration] Creating settings in database');
        await updateUserSettings.mutateAsync({
          preferences: preferences as UserPreferences,
        });

        console.log('[useSettingsMigration] Migration successful');
        migrationAttempted.current = true;
      } catch (error) {
        console.error('[useSettingsMigration] Migration failed:', error);
        migrationAttempted.current = true;
      }
    };

    void migrateSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, isSuccess, userSettings]);
}
