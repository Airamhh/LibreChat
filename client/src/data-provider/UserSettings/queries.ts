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
    () => dataService.getUserSettings(),
    {
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      ...config,
      enabled: (config?.enabled ?? true) === true && queriesEnabled,
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
    (data: UpdateUserSettingsRequest) => dataService.updateUserSettings(data),
    {
      onSuccess: (data) => {
        queryClient.setQueryData([QueryKeys.userSettings], data);
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
      onSuccess: (data) => {
        queryClient.setQueryData([QueryKeys.userSettings], data);
      },
    },
  );
};
