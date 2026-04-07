import { useRecoilValue } from 'recoil';
import { QueryKeys, MutationKeys, dataService } from 'librechat-data-provider';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  QueryObserverResult,
  UseMutationResult,
  UseQueryOptions,
} from '@tanstack/react-query';
import type {
  UserSettingsResponse,
  UpdateUserSettingsRequest,
  PatchUserSettingsRequest,
} from 'librechat-data-provider';
import store from '~/store';

/**
 * Hook to get user settings from the database
 */
export const useUserSettingsQuery = (
  config?: UseQueryOptions<UserSettingsResponse>,
): QueryObserverResult<UserSettingsResponse> => {
  const queriesEnabled = useRecoilValue<boolean>(store.queriesEnabled);
  return useQuery<UserSettingsResponse>(
    [QueryKeys.userSettings],
    () => {
      console.log('[useUserSettingsQuery] Fetching user settings...');
      return dataService.getUserSettings();
    },
    {
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      ...config,
      enabled: (config?.enabled ?? true) === true && queriesEnabled,
      onSuccess: (data) => {
        console.log('[useUserSettingsQuery] Success:', data);
        config?.onSuccess?.(data);
      },
      onError: (error) => {
        console.error('[useUserSettingsQuery] Error:', error);
        config?.onError?.(error);
      },
    },
  );
};

/**
 * Hook to update user settings (full replacement)
 */
export const useUpdateUserSettingsMutation = (): UseMutationResult<
  UserSettingsResponse,
  Error,
  UpdateUserSettingsRequest
> => {
  const queryClient = useQueryClient();

  return useMutation<UserSettingsResponse, Error, UpdateUserSettingsRequest>(
    [MutationKeys.updateUserSettings],
    (data: UpdateUserSettingsRequest) => {
      console.log('[updateUserSettings] Mutation called with data:', data);
      return dataService.updateUserSettings(data);
    },
    {
      onMutate: async (variables) => {
        console.log('[updateUserSettings] onMutate', variables);
        await queryClient.cancelQueries([QueryKeys.userSettings]);
        const previousSettings = queryClient.getQueryData<UserSettingsResponse>([
          QueryKeys.userSettings,
        ]);

        if (previousSettings) {
          queryClient.setQueryData<UserSettingsResponse>([QueryKeys.userSettings], {
            ...previousSettings,
            preferences: variables.preferences,
          });
        }

        return { previousSettings };
      },
      onError: (error, _variables, context) => {
        console.error('[updateUserSettings] onError', error);
        if (context?.previousSettings) {
          queryClient.setQueryData([QueryKeys.userSettings], context.previousSettings);
        }
      },
      onSuccess: (data) => {
        console.log('[updateUserSettings] onSuccess', data);
        queryClient.setQueryData([QueryKeys.userSettings], data);
      },
      onSettled: () => {
        console.log('[updateUserSettings] onSettled');
        void queryClient.invalidateQueries([QueryKeys.userSettings]);
      },
    },
  );
};

/**
 * Hook to partially update user settings
 */
export const usePatchUserSettingsMutation = (): UseMutationResult<
  UserSettingsResponse,
  Error,
  PatchUserSettingsRequest
> => {
  const queryClient = useQueryClient();

  return useMutation<UserSettingsResponse, Error, PatchUserSettingsRequest>(
    [MutationKeys.patchUserSettings],
    (data: PatchUserSettingsRequest) => dataService.patchUserSettings(data),
    {
      onMutate: async (variables) => {
        await queryClient.cancelQueries([QueryKeys.userSettings]);
        const previousSettings = queryClient.getQueryData<UserSettingsResponse>([
          QueryKeys.userSettings,
        ]);

        if (previousSettings) {
          const mergedPreferences = { ...previousSettings.preferences };

          for (const [key, value] of Object.entries(variables.preferences)) {
            if (key === 'speech' && value && typeof value === 'object') {
              mergedPreferences.speech = {
                ...mergedPreferences.speech,
                ...value,
              } as typeof mergedPreferences.speech;
            } else {
              (mergedPreferences as Record<string, unknown>)[key] = value;
            }
          }

          queryClient.setQueryData<UserSettingsResponse>([QueryKeys.userSettings], {
            ...previousSettings,
            preferences: mergedPreferences,
          });
        }

        return { previousSettings };
      },
      onError: (_error, _variables, context) => {
        if (context?.previousSettings) {
          queryClient.setQueryData([QueryKeys.userSettings], context.previousSettings);
        }
      },
      onSuccess: (data) => {
        queryClient.setQueryData([QueryKeys.userSettings], data);
      },
      onSettled: () => {
        void queryClient.invalidateQueries([QueryKeys.userSettings]);
      },
    },
  );
};
