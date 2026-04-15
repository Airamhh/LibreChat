import { useMutation, useQueryClient } from '@tanstack/react-query';
import { QueryKeys, dataService } from 'librechat-data-provider';
import type { UseMutationResult } from '@tanstack/react-query';
import type { TBanner } from 'librechat-data-provider';

/**
 * Hook to create a new banner
 */
export default function useCreateBannerMutation(): UseMutationResult<
  TBanner,
  unknown,
  Partial<TBanner>
> {
  const queryClient = useQueryClient();

  return useMutation(
    (bannerData: Partial<TBanner>) => dataService.createBanner(bannerData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries([QueryKeys.adminBanners]);
        queryClient.invalidateQueries([QueryKeys.banners]);
        queryClient.invalidateQueries([QueryKeys.banner]);
      },
    },
  );
}
