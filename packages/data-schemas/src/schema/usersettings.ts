import { Schema } from 'mongoose';
import type { IUserSettingsDocument } from '~/types';

const SpeechToTextSchema = new Schema(
  {
    enabled: { type: Boolean, default: true },
    engine: { type: String, default: 'browser' },
    language: { type: String, default: '' },
    autoTranscribe: { type: Boolean, default: false },
    decibelValue: { type: Number, default: -45 },
    autoSendText: { type: Number, default: -1 },
  },
  { _id: false },
);

const TextToSpeechSchema = new Schema(
  {
    enabled: { type: Boolean, default: true },
    engine: { type: String, default: 'browser' },
    voice: { type: String, default: undefined },
    cloudBrowserVoices: { type: Boolean, default: false },
    language: { type: String, default: '' },
    automaticPlayback: { type: Boolean, default: false },
    playbackRate: { type: Number, default: null },
    cacheTTS: { type: Boolean, default: true },
  },
  { _id: false },
);

const SpeechSettingsSchema = new Schema(
  {
    conversationMode: { type: Boolean, default: false },
    advancedMode: { type: Boolean, default: false },
    stt: { type: SpeechToTextSchema, default: () => ({}) },
    tts: { type: TextToSpeechSchema, default: () => ({}) },
  },
  { _id: false },
);

const PromptsSettingsSchema = new Schema(
  {
    autoSend: { type: Boolean, default: true },
    alwaysMakeProd: { type: Boolean, default: true },
    editorMode: { type: String, default: 'simple' },
  },
  { _id: false },
);

const UserPreferencesSchema = new Schema(
  {
    enterToSend: { type: Boolean, default: true },
    maximizeChatSpace: { type: Boolean, default: false },
    chatDirection: { type: String, enum: ['LTR', 'RTL'], default: 'LTR' },
    autoExpandTools: { type: Boolean, default: false },
    saveDrafts: { type: Boolean, default: true },
    rememberDefaultFork: { type: Boolean, default: false },
    showThinking: { type: Boolean, default: false },
    enableUserMsgMarkdown: { type: Boolean, default: true },
    modularChat: { type: Boolean, default: true },
    LaTeXParsing: { type: Boolean, default: true },
    atCommand: { type: Boolean, default: true },
    plusCommand: { type: Boolean, default: true },
    slashCommand: { type: Boolean, default: true },
    speech: { type: SpeechSettingsSchema, default: () => ({}) },
    fontSize: { type: String, default: 'text-base' },
    language: { type: String, default: '' },
    usernameDisplay: { type: Boolean, default: true },
    prompts: { type: PromptsSettingsSchema, default: () => ({}) },
    defaultTemporaryChat: { type: Boolean, default: false },
    colorTheme: { type: String, default: 'system' },
    themeName: { type: String, default: undefined },
    autoScroll: { type: Boolean, default: false },
    sidebarExpanded: { type: Boolean, default: undefined },
    keepScreenAwake: { type: Boolean, default: true },
    showScrollButton: { type: Boolean, default: true },
    forkSetting: { type: String, default: '' },
    splitAtTarget: { type: Boolean, default: false },
    saveBadgesState: { type: Boolean, default: false },
    centerFormOnLanding: { type: Boolean, default: true },
    showFooter: { type: Boolean, default: true },
  },
  { _id: false },
);

const userSettingsSchema = new Schema<IUserSettingsDocument>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    tenantId: {
      type: String,
      index: true,
    },
    version: {
      type: Number,
      default: 1,
      required: true,
    },
    preferences: {
      type: UserPreferencesSchema,
      default: () => ({}),
    },
  },
  { timestamps: true },
);

userSettingsSchema.index({ userId: 1, tenantId: 1 }, { unique: true });
userSettingsSchema.index({ tenantId: 1 });
userSettingsSchema.index({ updatedAt: 1 });

export default userSettingsSchema;
