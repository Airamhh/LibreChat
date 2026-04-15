import { useMutation, useQueryClient } from '@tanstack/react-query';
import { QueryKeys, dataService } from 'librechat-data-provider';
import type { UseMutationResult } from '@tanstack/react-query';
import type { TBanner } from 'librechat-data-provider';

export interface UpdateBannerParams {
  bannerId: string;
  updates: Partial<TBanner>;
}

/**
 * Hook to update an existing banner
 */
export default function useUpdateBannerMutation(): UseMutationResult<
  TBanner,
  unknown,
  UpdateBannerParams
> {
  const queryClient = useQueryClient();

  return useMutation(
    ({ bannerId, updates }: UpdateBannerParams) =>
      dataService.updateBanner(bannerId, updates),
    {
      onSuccess: () => {
        queryClient.invalidateQueries([QueryKeys.adminBanners]);
        queryClient.invalidateQueries([QueryKeys.banners]);
        queryClient.invalidateQueries([QueryKeys.banner]);
      },
    },
  );
}
