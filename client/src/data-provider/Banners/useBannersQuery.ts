import { useQuery, type QueryObserverResult, type UseQueryOptions } from '@tanstack/react-query';
import { QueryKeys, dataService } from 'librechat-data-provider';
import type { TBanner } from 'librechat-data-provider';

/**
 * Hook to fetch all active banners for the current user
 */
export default function useBannersQuery(
  config?: UseQueryOptions<TBanner[]>,
): QueryObserverResult<TBanner[], unknown> {
  return useQuery<TBanner[]>(
    [QueryKeys.banners],
    () => dataService.getActiveBanners(),
    {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      ...config,
    },
  );
}
