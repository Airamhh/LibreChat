import { useQuery, type QueryObserverResult, type UseQueryOptions } from '@tanstack/react-query';
import { QueryKeys, dataService } from 'librechat-data-provider';
import type { TBannersResponse } from 'librechat-data-provider';

export interface AdminBannersQueryParams {
  page?: number;
  limit?: number;
  audienceMode?: 'global' | 'role' | 'group' | 'user';
  isActive?: boolean;
}

export interface AdminBannersQueryResult {
  banners: TBannersResponse;
  total: number;
  page: number;
  totalPages: number;
}

/**
 * Hook to fetch all banners for admin panel (paginated)
 */
export default function useAdminBannersQuery(
  params: AdminBannersQueryParams = {},
  config?: UseQueryOptions<AdminBannersQueryResult>,
): QueryObserverResult<AdminBannersQueryResult, unknown> {
  return useQuery<AdminBannersQueryResult>(
    [QueryKeys.adminBanners, params],
    () => dataService.getAdminBanners(params),
    {
      staleTime: 1000 * 60 * 2, // 2 minutes
      refetchOnWindowFocus: false,
      ...config,
    },
  );
}
