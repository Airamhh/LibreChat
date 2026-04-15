import { useMutation, useQueryClient } from '@tanstack/react-query';
import { QueryKeys, dataService } from 'librechat-data-provider';
import type { UseMutationResult } from '@tanstack/react-query';

/**
 * Hook to delete a banner
 */
export default function useDeleteBannerMutation(): UseMutationResult<void, unknown, string> {
  const queryClient = useQueryClient();

  return useMutation(
    (bannerId: string) => dataService.deleteBanner(bannerId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries([QueryKeys.adminBanners]);
        queryClient.invalidateQueries([QueryKeys.banners]);
        queryClient.invalidateQueries([QueryKeys.banner]);
      },
    },
  );
}
