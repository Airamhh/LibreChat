import type { Document } from 'mongoose';

export interface SpeechToTextSettings {
  enabled: boolean;
  engine: string;
  language: string;
  autoTranscribe: boolean;
  decibelValue: number;
  autoSendText: number;
}

export interface TextToSpeechSettings {
  enabled: boolean;
  engine: string;
  voice?: string;
  cloudBrowserVoices: boolean;
  language: string;
  automaticPlayback: boolean;
  playbackRate?: number;
  cacheTTS: boolean;
}

export interface SpeechSettings {
  conversationMode: boolean;
  advancedMode: boolean;
  stt: SpeechToTextSettings;
  tts: TextToSpeechSettings;
}

export interface PromptsSettings {
  autoSend: boolean;
  alwaysMakeProd: boolean;
  editorMode: string;
}

export interface UserPreferences {
  enterToSend?: boolean;
  maximizeChatSpace?: boolean;
  chatDirection?: 'LTR' | 'RTL';
  autoExpandTools?: boolean;
  saveDrafts?: boolean;
  rememberDefaultFork?: boolean;
  showThinking?: boolean;
  enableUserMsgMarkdown?: boolean;
  modularChat?: boolean;
  LaTeXParsing?: boolean;
  atCommand?: boolean;
  plusCommand?: boolean;
  slashCommand?: boolean;
  speech?: SpeechSettings;
  fontSize?: string;
  language?: string;
  usernameDisplay?: boolean;
  prompts?: PromptsSettings;
  defaultTemporaryChat?: boolean;
  colorTheme?: string;
  themeName?: string;
  autoScroll?: boolean;
  sidebarExpanded?: boolean;
  keepScreenAwake?: boolean;
  showScrollButton?: boolean;
  forkSetting?: string;
  splitAtTarget?: boolean;
  saveBadgesState?: boolean;
  centerFormOnLanding?: boolean;
  showFooter?: boolean;
}

export interface IUserSettings {
  userId: string;
  tenantId?: string;
  version: number;
  preferences: UserPreferences;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IUserSettingsDocument extends IUserSettings, Document {
  _id: string;
  createdAt: Date;
  updatedAt: Date;
}
