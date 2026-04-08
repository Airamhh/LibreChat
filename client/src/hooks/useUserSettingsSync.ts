import { useEffect, useContext } from 'react';
import { useSetRecoilState } from 'recoil';
import { useSetAtom } from 'jotai';
import type { UserPreferences } from 'librechat-data-provider';
import { applyFontSize, ThemeContext } from '@librechat/client';
import { useUserSettingsQuery } from '~/data-provider';
import { fontSizeAtom } from '~/store/fontSize';
import language from '~/store/language';
import store from '~/store';

/**
 * Hook to initialize settings from database into Recoil atoms
 */
export default function useUserSettingsSync(enabled: boolean) {
  const { data: userSettings, isSuccess } = useUserSettingsQuery({
    enabled,
  });

  const { setTheme } = useContext(ThemeContext);
  const setFontSize = useSetAtom(fontSizeAtom);
  const setLanguage = useSetRecoilState(language.lang);

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

  const setAutoScroll = useSetRecoilState(store.autoScroll);
  const setSidebarExpanded = useSetRecoilState(store.sidebarExpanded);
  const setKeepScreenAwake = useSetRecoilState(store.keepScreenAwake);
  const setShowScrollButton = useSetRecoilState(store.showScrollButton);
  const setForkSetting = useSetRecoilState(store.forkSetting);
  const setSplitAtTarget = useSetRecoilState(store.splitAtTarget);
  const setSaveBadgesState = useSetRecoilState(store.saveBadgesState);
  const setCenterFormOnLanding = useSetRecoilState(store.centerFormOnLanding);
  const setShowFooter = useSetRecoilState(store.showFooter);

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

    if (prefs.colorTheme !== undefined && setTheme) {
      setTheme(prefs.colorTheme);
    }
    if (prefs.fontSize !== undefined) {
      setFontSize(prefs.fontSize);
      applyFontSize(prefs.fontSize);
    }
    if (prefs.language !== undefined) {
      setLanguage(prefs.language);
    }

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

    if (prefs.autoScroll !== undefined) {
      setAutoScroll(prefs.autoScroll);
    }
    if (prefs.sidebarExpanded !== undefined) {
      setSidebarExpanded(prefs.sidebarExpanded);
    }
    if (prefs.keepScreenAwake !== undefined) {
      setKeepScreenAwake(prefs.keepScreenAwake);
    }
    if (prefs.showScrollButton !== undefined) {
      setShowScrollButton(prefs.showScrollButton);
    }
    if (prefs.forkSetting !== undefined) {
      setForkSetting(prefs.forkSetting);
    }
    if (prefs.splitAtTarget !== undefined) {
      setSplitAtTarget(prefs.splitAtTarget);
    }
    if (prefs.saveBadgesState !== undefined) {
      setSaveBadgesState(prefs.saveBadgesState);
    }
    if (prefs.centerFormOnLanding !== undefined) {
      setCenterFormOnLanding(prefs.centerFormOnLanding);
    }
    if (prefs.showFooter !== undefined) {
      setShowFooter(prefs.showFooter);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuccess, userSettings]);
}
