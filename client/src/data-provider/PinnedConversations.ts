import { dataService, QueryKeys } from 'librechat-data-provider';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseQueryOptions } from '@tanstack/react-query';
import type { PinnedConversationsState } from '~/store/pinnedConversations';

export const useGetPinnedConversationsQuery = (
  config?: Omit<UseQueryOptions<PinnedConversationsState, Error>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery<PinnedConversationsState, Error>(
    [QueryKeys.pinnedConversations],
    () =>
      dataService.getPinnedConversations() as Promise<PinnedConversationsState>,
    {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      ...config,
    },
  );
};

export const useUpdatePinnedConversationsMutation = () => {
  const queryClient = useQueryClient();
  return useMutation(
    (pinnedConversations: PinnedConversationsState) =>
      dataService.updatePinnedConversations(pinnedConversations) as Promise<PinnedConversationsState>,
    {
      onMutate: async (newPinned) => {
        await queryClient.cancelQueries([QueryKeys.pinnedConversations]);

        const previousPinned =
          queryClient.getQueryData<PinnedConversationsState>([QueryKeys.pinnedConversations]);
        queryClient.setQueryData([QueryKeys.pinnedConversations], newPinned);

        return { previousPinned };
      },
      onError: (_err, _newPinned, context) => {
        if (context?.previousPinned) {
          queryClient.setQueryData([QueryKeys.pinnedConversations], context.previousPinned);
        }
      },
    },
  );
};
