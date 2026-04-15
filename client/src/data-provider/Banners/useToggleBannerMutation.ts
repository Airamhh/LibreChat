import { useMutation, useQueryClient } from '@tanstack/react-query';
import { QueryKeys, dataService } from 'librechat-data-provider';
import type { UseMutationResult } from '@tanstack/react-query';
import type { TBanner } from 'librechat-data-provider';

/**
 * Hook to toggle banner active status
 */
export default function useToggleBannerMutation(): UseMutationResult<TBanner, unknown, string> {
  const queryClient = useQueryClient();

  return useMutation(
    (bannerId: string) => dataService.toggleBanner(bannerId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries([QueryKeys.adminBanners]);
        queryClient.invalidateQueries([QueryKeys.banners]);
        queryClient.invalidateQueries([QueryKeys.banner]);
      },
    },
  );
}
