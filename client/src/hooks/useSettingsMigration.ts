import { useEffect, useRef } from 'react';
import { useRecoilState } from 'recoil';
import { LocalStorageKeys } from 'librechat-data-provider';
import type { UserPreferences } from 'librechat-data-provider';
import { useUpdateUserSettingsMutation } from '~/data-provider';
import store from '~/store';

const MIGRATION_KEY = 'settingsMigratedToDb';

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
 * Hook that performs one-time migration of settings from localStorage to database
 */
export default function useSettingsMigration(enabled: boolean) {
  const migrationAttempted = useRef(false);
  const [, setAutoScroll] = useRecoilState(store.autoScroll);
  const updateUserSettings = useUpdateUserSettingsMutation();

  useEffect(() => {
    if (!enabled || migrationAttempted.current) {
      return;
    }

    const hasMigrated = localStorage.getItem(MIGRATION_KEY) === 'true';
    if (hasMigrated) {
      migrationAttempted.current = true;
      return;
    }

    const migrateSettings = async () => {
      try {
        const preferences: Record<string, unknown> = {};

        for (const [localKey, prefKey] of Object.entries(settingsMapping)) {
          const value = getLocalStorageValue(localKey);
          if (value !== undefined) {
            preferences[prefKey] = value;
          }
        }

        for (const [localKey, prefPath] of Object.entries(speechMapping)) {
          const value = getLocalStorageValue(localKey);
          if (value !== undefined) {
            setNestedProperty(preferences, prefPath, value);
          }
        }

        if (Object.keys(preferences).length === 0) {
          localStorage.setItem(MIGRATION_KEY, 'true');
          migrationAttempted.current = true;
          return;
        }

        await updateUserSettings.mutateAsync({
          preferences: preferences as UserPreferences,
        });

        localStorage.setItem(MIGRATION_KEY, 'true');
        migrationAttempted.current = true;

        setAutoScroll(false);
        setTimeout(() => setAutoScroll(true), 100);
      } catch (error) {
        console.error('Failed to migrate settings to database:', error);
      }
    };

    void migrateSettings();
  }, [enabled, updateUserSettings, setAutoScroll]);
}
