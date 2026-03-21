import { useQuery } from '@tanstack/react-query';
import { QueryKeys, dataService } from 'librechat-data-provider';
import type { UseQueryOptions, QueryObserverResult } from '@tanstack/react-query';
import type { TRole, TAdminUsersParams, TAdminUsersResponse, TAdminBalance } from 'librechat-data-provider';

export const useListRoles = (
  config?: UseQueryOptions<TRole[]>,
): QueryObserverResult<TRole[]> => {
  return useQuery<TRole[]>([QueryKeys.adminRoles], () => dataService.listRoles(), {
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
    ...config,
  });
};

export const useListAdminUsers = (
  params?: TAdminUsersParams,
  config?: UseQueryOptions<TAdminUsersResponse>,
): QueryObserverResult<TAdminUsersResponse> => {
  return useQuery<TAdminUsersResponse>(
    [QueryKeys.adminUsers, params],
    () => dataService.listAdminUsers(params),
    {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: false,
      keepPreviousData: true,
      ...config,
    },
  );
};

export const useAdminUserBalance = (
  userId: string,
  config?: UseQueryOptions<TAdminBalance>,
): QueryObserverResult<TAdminBalance> => {
  return useQuery<TAdminBalance>(
    [QueryKeys.adminUsers, userId, 'balance'],
    () => dataService.getAdminUserBalance(userId),
    {
      refetchOnWindowFocus: false,
      enabled: !!userId,
      retry: false,
      ...config,
    },
  );
};
