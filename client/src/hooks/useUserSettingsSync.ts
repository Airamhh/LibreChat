import { useEffect } from 'react';
import { useSetRecoilState } from 'recoil';
import type { UserPreferences } from 'librechat-data-provider';
import { useUserSettingsQuery } from '~/data-provider';
import store from '~/store';

/**
 * Hook to initialize settings from database into Recoil atoms
 */
export default function useUserSettingsSync(enabled: boolean) {
  const { data: userSettings, isSuccess } = useUserSettingsQuery({
    enabled,
  });

  const setEnterToSend = useSetRecoilState(store.enterToSend);
  const setMaximizeChatSpace = useSetRecoilState(store.maximizeChatSpace);
  const setChatDirection = useSetRecoilState(store.chatDirection);
  const setAutoExpandTools = useSetRecoilState(store.autoExpandTools);
  const setSaveDrafts = useSetRecoilState(store.saveDrafts);
  const setRememberDefaultFork = useSetRecoilState(store.rememberDefaultFork);
  const setShowThinking = useSetRecoilState(store.showThinking);
  const setEnableUserMsgMarkdown = useSetRecoilState(store.enableUserMsgMarkdown);
  const setModularChat = useSetRecoilState(store.modularChat);
  const setLaTeXParsing = useSetRecoilState(store.LaTeXParsing);
  const setAtCommand = useSetRecoilState(store.atCommand);
  const setPlusCommand = useSetRecoilState(store.plusCommand);
  const setSlashCommand = useSetRecoilState(store.slashCommand);
  const setUsernameDisplay = useSetRecoilState(store.UsernameDisplay);

  const setConversationMode = useSetRecoilState(store.conversationMode);
  const setAdvancedMode = useSetRecoilState(store.advancedMode);
  const setSpeechToText = useSetRecoilState(store.speechToText);
  const setEngineSTT = useSetRecoilState(store.engineSTT);
  const setLanguageSTT = useSetRecoilState(store.languageSTT);
  const setAutoTranscribeAudio = useSetRecoilState(store.autoTranscribeAudio);
  const setDecibelValue = useSetRecoilState(store.decibelValue);
  const setAutoSendText = useSetRecoilState(store.autoSendText);
  const setTextToSpeech = useSetRecoilState(store.textToSpeech);
  const setEngineTTS = useSetRecoilState(store.engineTTS);
  const setVoice = useSetRecoilState(store.voice);
  const setCloudBrowserVoices = useSetRecoilState(store.cloudBrowserVoices);
  const setLanguageTTS = useSetRecoilState(store.languageTTS);
  const setAutomaticPlayback = useSetRecoilState(store.automaticPlayback);
  const setPlaybackRate = useSetRecoilState(store.playbackRate);
  const setCacheTTS = useSetRecoilState(store.cacheTTS);

  useEffect(() => {
    if (!isSuccess || !userSettings?.preferences) {
      return;
    }

    const prefs = userSettings.preferences as UserPreferences;

    if (prefs.enterToSend !== undefined) {
      setEnterToSend(prefs.enterToSend);
    }
    if (prefs.maximizeChatSpace !== undefined) {
      setMaximizeChatSpace(prefs.maximizeChatSpace);
    }
    if (prefs.chatDirection !== undefined) {
      setChatDirection(prefs.chatDirection);
    }
    if (prefs.autoExpandTools !== undefined) {
      setAutoExpandTools(prefs.autoExpandTools);
    }
    if (prefs.saveDrafts !== undefined) {
      setSaveDrafts(prefs.saveDrafts);
    }
    if (prefs.rememberDefaultFork !== undefined) {
      setRememberDefaultFork(prefs.rememberDefaultFork);
    }
    if (prefs.showThinking !== undefined) {
      setShowThinking(prefs.showThinking);
    }
    if (prefs.enableUserMsgMarkdown !== undefined) {
      setEnableUserMsgMarkdown(prefs.enableUserMsgMarkdown);
    }
    if (prefs.modularChat !== undefined) {
      setModularChat(prefs.modularChat);
    }
    if (prefs.LaTeXParsing !== undefined) {
      setLaTeXParsing(prefs.LaTeXParsing);
    }
    if (prefs.atCommand !== undefined) {
      setAtCommand(prefs.atCommand);
    }
    if (prefs.plusCommand !== undefined) {
      setPlusCommand(prefs.plusCommand);
    }
    if (prefs.slashCommand !== undefined) {
      setSlashCommand(prefs.slashCommand);
    }
    if (prefs.usernameDisplay !== undefined) {
      setUsernameDisplay(prefs.usernameDisplay);
    }

    if (prefs.speech?.conversationMode !== undefined) {
      setConversationMode(prefs.speech.conversationMode);
    }
    if (prefs.speech?.advancedMode !== undefined) {
      setAdvancedMode(prefs.speech.advancedMode);
    }
    if (prefs.speech?.stt?.enabled !== undefined) {
      setSpeechToText(prefs.speech.stt.enabled);
    }
    if (prefs.speech?.stt?.engine !== undefined) {
      setEngineSTT(prefs.speech.stt.engine);
    }
    if (prefs.speech?.stt?.language !== undefined) {
      setLanguageSTT(prefs.speech.stt.language);
    }
    if (prefs.speech?.stt?.autoTranscribe !== undefined) {
      setAutoTranscribeAudio(prefs.speech.stt.autoTranscribe);
    }
    if (prefs.speech?.stt?.decibelValue !== undefined) {
      setDecibelValue(prefs.speech.stt.decibelValue);
    }
    if (prefs.speech?.stt?.autoSendText !== undefined) {
      setAutoSendText(prefs.speech.stt.autoSendText);
    }
    if (prefs.speech?.tts?.enabled !== undefined) {
      setTextToSpeech(prefs.speech.tts.enabled);
    }
    if (prefs.speech?.tts?.engine !== undefined) {
      setEngineTTS(prefs.speech.tts.engine);
    }
    if (prefs.speech?.tts?.voice !== undefined) {
      setVoice(prefs.speech.tts.voice);
    }
    if (prefs.speech?.tts?.cloudBrowserVoices !== undefined) {
      setCloudBrowserVoices(prefs.speech.tts.cloudBrowserVoices);
    }
    if (prefs.speech?.tts?.language !== undefined) {
      setLanguageTTS(prefs.speech.tts.language);
    }
    if (prefs.speech?.tts?.automaticPlayback !== undefined) {
      setAutomaticPlayback(prefs.speech.tts.automaticPlayback);
    }
    if (prefs.speech?.tts?.playbackRate !== undefined) {
      setPlaybackRate(prefs.speech.tts.playbackRate);
    }
    if (prefs.speech?.tts?.cacheTTS !== undefined) {
      setCacheTTS(prefs.speech.tts.cacheTTS);
    }
  }, [
    isSuccess,
    userSettings,
    setEnterToSend,
    setMaximizeChatSpace,
    setChatDirection,
    setAutoExpandTools,
    setSaveDrafts,
    setRememberDefaultFork,
    setShowThinking,
    setEnableUserMsgMarkdown,
    setModularChat,
    setLaTeXParsing,
    setAtCommand,
    setPlusCommand,
    setSlashCommand,
    setUsernameDisplay,
    setConversationMode,
    setAdvancedMode,
    setSpeechToText,
    setEngineSTT,
    setLanguageSTT,
    setAutoTranscribeAudio,
    setDecibelValue,
    setAutoSendText,
    setTextToSpeech,
    setEngineTTS,
    setVoice,
    setCloudBrowserVoices,
    setLanguageTTS,
    setAutomaticPlayback,
    setPlaybackRate,
    setCacheTTS,
  ]);
}
