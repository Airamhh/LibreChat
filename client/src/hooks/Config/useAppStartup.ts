import { useEffect, useContext } from 'react';
import { useRecoilState } from 'recoil';
import TagManager from 'react-gtm-module';
import { LocalStorageKeys, PermissionTypes, Permissions } from 'librechat-data-provider';
import type { TStartupConfig, TUser } from 'librechat-data-provider';
import { useMCPToolsQuery, useMCPServersQuery } from '~/data-provider';
import { ThemeContext } from '@librechat/client';
import { cleanupTimestampedStorage } from '~/utils/timestamps';
import useUserSettingsSync from '../useUserSettingsSync';
import useSettingsMigration from '../useSettingsMigration';
import useSpeechSettingsInit from './useSpeechSettingsInit';
import useUpdateSetting from '../useUpdateSetting';
import { useHasAccess } from '~/hooks';
import store from '~/store';

export default function useAppStartup({
  startupConfig,
  user,
}: {
  startupConfig?: TStartupConfig;
  user?: TUser;
}) {
  const [defaultPreset, setDefaultPreset] = useRecoilState(store.defaultPreset);
  const { setDbUpdateCallback } = useContext(ThemeContext);
  const { updateSetting } = useUpdateSetting();
  const canUseMcp = useHasAccess({
    permissionType: PermissionTypes.MCP_SERVERS,
    permission: Permissions.USE,
  });

  useSpeechSettingsInit(!!user);
  useUserSettingsSync(!!user);
  useSettingsMigration(!!user);

  // Set up database update callback for theme changes
  useEffect(() => {
    if (!user || !setDbUpdateCallback) {
      return;
    }

    const callback = (theme: string) => {
      console.log('[useAppStartup] Theme changed, updating database:', theme);
      void updateSetting('colorTheme', theme);
    };

    setDbUpdateCallback(callback);

    return () => {
      setDbUpdateCallback(null);
    };
  }, [user, setDbUpdateCallback, updateSetting]);

  const { data: loadedServers, isLoading: serversLoading } = useMCPServersQuery({
    enabled: canUseMcp,
  });

  useMCPToolsQuery({
    enabled:
      canUseMcp &&
      !serversLoading &&
      !!loadedServers &&
      Object.keys(loadedServers).length > 0 &&
      !!user,
  });

  /** Clean up old localStorage entries on startup */
  useEffect(() => {
    cleanupTimestampedStorage();
  }, []);

  /** Set the app title */
  useEffect(() => {
    const appTitle = startupConfig?.appTitle ?? '';
    if (!appTitle) {
      return;
    }
    document.title = appTitle;
    localStorage.setItem(LocalStorageKeys.APP_TITLE, appTitle);
  }, [startupConfig]);

  /** Set the default spec's preset as default */
  useEffect(() => {
    if (defaultPreset && defaultPreset.spec != null) {
      return;
    }

    const modelSpecs = startupConfig?.modelSpecs?.list;

    if (!modelSpecs || !modelSpecs.length) {
      return;
    }

    const defaultSpec = modelSpecs.find((spec) => spec.default);

    if (!defaultSpec) {
      return;
    }

    setDefaultPreset({
      ...defaultSpec.preset,
      iconURL: defaultSpec.iconURL,
      spec: defaultSpec.name,
    });
  }, [defaultPreset, setDefaultPreset, startupConfig?.modelSpecs?.list]);

  useEffect(() => {
    if (startupConfig?.analyticsGtmId != null && typeof window.google_tag_manager === 'undefined') {
      const tagManagerArgs = {
        gtmId: startupConfig.analyticsGtmId,
      };
      TagManager.initialize(tagManagerArgs);
    }
  }, [startupConfig?.analyticsGtmId]);
}
