import { dataService } from 'librechat-data-provider';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseQueryOptions } from '@tanstack/react-query';
import type { PinnedConversationsState } from '~/store/pinnedConversations';

export const useGetPinnedConversationsQuery = (
  config?: Omit<UseQueryOptions<PinnedConversationsState, Error>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery<PinnedConversationsState, Error>(
    ['pinnedConversations'],
    () => dataService.getPinnedConversations() as Promise<PinnedConversationsState>,
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
      onMutate: async (newPinnedConversations) => {
        await queryClient.cancelQueries(['pinnedConversations']);

        const previousPinnedConversations = queryClient.getQueryData<PinnedConversationsState>(['pinnedConversations']);
        queryClient.setQueryData(['pinnedConversations'], newPinnedConversations);

        return { previousPinnedConversations };
      },
      onError: (_err, _newPinnedConversations, context) => {
        if (context?.previousPinnedConversations) {
          queryClient.setQueryData(['pinnedConversations'], context.previousPinnedConversations);
        }
      },
    },
  );
};
