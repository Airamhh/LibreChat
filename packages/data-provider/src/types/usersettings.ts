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
}
