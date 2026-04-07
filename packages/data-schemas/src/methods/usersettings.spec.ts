import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import type * as t from '~/types';
import { createUserSettingsMethods } from './usersettings';
import userSettingsSchema from '~/schema/usersettings';

let mongoServer: MongoMemoryServer;
let UserSettings: mongoose.Model<t.IUserSettingsDocument>;
let methods: ReturnType<typeof createUserSettingsMethods>;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);

  UserSettings =
    mongoose.models.UserSettings ||
    mongoose.model<t.IUserSettingsDocument>('UserSettings', userSettingsSchema);

  methods = createUserSettingsMethods(mongoose);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await mongoose.connection.dropDatabase();
});

describe('UserSettings Methods - Database Tests', () => {
  const testUserId = 'user123';
  const testPreferences: t.UserPreferences = {
    enterToSend: true,
    chatDirection: 'LTR',
    fontSize: 'text-base',
    language: 'en',
  };

  describe('getUserSettings', () => {
    test('should return null when settings do not exist', async () => {
      const settings = await methods.getUserSettings('nonexistent');
      expect(settings).toBeNull();
    });

    test('should return settings when they exist', async () => {
      await UserSettings.create({
        userId: testUserId,
        version: 1,
        preferences: testPreferences,
      });

      const settings = await methods.getUserSettings(testUserId);

      expect(settings).toBeDefined();
      expect(settings?.userId).toBe(testUserId);
      expect(settings?.preferences?.enterToSend).toBe(true);
      expect(settings?.preferences?.chatDirection).toBe('LTR');
    });
  });

  describe('createUserSettings', () => {
    test('should create new settings with default version', async () => {
      const created = await methods.createUserSettings({
        userId: testUserId,
        preferences: testPreferences,
      });

      expect(created).toBeDefined();
      expect(created.userId).toBe(testUserId);
      expect(created.version).toBe(1);
      expect(created.preferences?.enterToSend).toBe(true);
    });

    test('should create settings with custom version', async () => {
      const created = await methods.createUserSettings({
        userId: testUserId,
        version: 2,
        preferences: testPreferences,
      });

      expect(created.version).toBe(2);
    });
  });

  describe('updateUserSettings', () => {
    test('should create settings if they do not exist (upsert)', async () => {
      const updated = await methods.updateUserSettings(testUserId, testPreferences);

      expect(updated).toBeDefined();
      expect(updated?.userId).toBe(testUserId);
      expect(updated?.preferences?.enterToSend).toBe(true);
    });

    test('should update existing settings', async () => {
      await UserSettings.create({
        userId: testUserId,
        version: 1,
        preferences: { enterToSend: false, language: 'es' },
      });

      const updated = await methods.updateUserSettings(testUserId, testPreferences);

      expect(updated?.preferences?.enterToSend).toBe(true);
      expect(updated?.preferences?.language).toBe('en');
    });

    test('should replace all preferences', async () => {
      await UserSettings.create({
        userId: testUserId,
        version: 1,
        preferences: {
          enterToSend: false,
          language: 'es',
          showThinking: true,
        },
      });

      const newPreferences: t.UserPreferences = {
        enterToSend: true,
        language: 'en',
      };

      const updated = await methods.updateUserSettings(testUserId, newPreferences);

      expect(updated?.preferences?.enterToSend).toBe(true);
      expect(updated?.preferences?.language).toBe('en');
      expect(updated?.preferences?.showThinking).toBeUndefined();
    });
  });

  describe('patchUserSettings', () => {
    test('should partially update existing settings', async () => {
      await UserSettings.create({
        userId: testUserId,
        version: 1,
        preferences: {
          enterToSend: false,
          language: 'es',
          showThinking: true,
        },
      });

      const patched = await methods.patchUserSettings(testUserId, {
        enterToSend: true,
      });

      expect(patched?.preferences?.enterToSend).toBe(true);
      expect(patched?.preferences?.language).toBe('es');
      expect(patched?.preferences?.showThinking).toBe(true);
    });

    test('should create settings if they do not exist (upsert)', async () => {
      const patched = await methods.patchUserSettings(testUserId, {
        enterToSend: true,
      });

      expect(patched).toBeDefined();
      expect(patched?.preferences?.enterToSend).toBe(true);
    });

    test('should update nested speech settings', async () => {
      await UserSettings.create({
        userId: testUserId,
        version: 1,
        preferences: {
          speech: {
            conversationMode: false,
            advancedMode: false,
            stt: {
              enabled: true,
              engine: 'browser',
              language: 'en',
              autoTranscribe: false,
              decibelValue: -45,
              autoSendText: -1,
            },
            tts: {
              enabled: true,
              engine: 'browser',
              cloudBrowserVoices: false,
              language: 'en',
              automaticPlayback: false,
              cacheTTS: true,
            },
          },
        },
      });

      const patched = await methods.patchUserSettings(testUserId, {
        speech: {
          conversationMode: true,
          advancedMode: false,
          stt: {
            enabled: true,
            engine: 'openai',
            language: 'es',
            autoTranscribe: true,
            decibelValue: -40,
            autoSendText: 1000,
          },
          tts: {
            enabled: true,
            engine: 'elevenlabs',
            cloudBrowserVoices: false,
            language: 'es',
            automaticPlayback: true,
            cacheTTS: false,
          },
        },
      });

      expect(patched?.preferences?.speech?.conversationMode).toBe(true);
      expect(patched?.preferences?.speech?.stt?.engine).toBe('openai');
      expect(patched?.preferences?.speech?.tts?.engine).toBe('elevenlabs');
    });
  });

  describe('deleteUserSettings', () => {
    test('should delete existing settings and return true', async () => {
      await UserSettings.create({
        userId: testUserId,
        version: 1,
        preferences: testPreferences,
      });

      const deleted = await methods.deleteUserSettings(testUserId);
      expect(deleted).toBe(true);

      const check = await methods.getUserSettings(testUserId);
      expect(check).toBeNull();
    });

    test('should return false when settings do not exist', async () => {
      const deleted = await methods.deleteUserSettings('nonexistent');
      expect(deleted).toBe(false);
    });
  });

  describe('userSettingsExist', () => {
    test('should return true when settings exist', async () => {
      await UserSettings.create({
        userId: testUserId,
        version: 1,
        preferences: testPreferences,
      });

      const exists = await methods.userSettingsExist(testUserId);
      expect(exists).toBe(true);
    });

    test('should return false when settings do not exist', async () => {
      const exists = await methods.userSettingsExist('nonexistent');
      expect(exists).toBe(false);
    });
  });

  describe('tenant isolation', () => {
    test('should isolate settings by tenantId', async () => {
      await UserSettings.create({
        userId: testUserId,
        tenantId: 'tenant1',
        version: 1,
        preferences: { language: 'en' },
      });

      await UserSettings.create({
        userId: testUserId,
        tenantId: 'tenant2',
        version: 1,
        preferences: { language: 'es' },
      });

      const allSettings = await UserSettings.find({ userId: testUserId });
      expect(allSettings).toHaveLength(2);
    });
  });

  describe('unique constraint', () => {
    test('should enforce unique userId per tenant', async () => {
      await UserSettings.create({
        userId: testUserId,
        tenantId: 'tenant1',
        version: 1,
        preferences: testPreferences,
      });

      await expect(
        UserSettings.create({
          userId: testUserId,
          tenantId: 'tenant1',
          version: 1,
          preferences: { language: 'es' },
        }),
      ).rejects.toThrow();
    });
  });
});
