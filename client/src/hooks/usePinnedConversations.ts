import { useEffect, useCallback, useRef } from 'react';
import { useAtom } from 'jotai';
import { useToastContext } from '@librechat/client';
import type { PinnedConversation } from '~/store/pinnedConversations';
import { useGetPinnedConversationsQuery, useUpdatePinnedConversationsMutation } from '~/data-provider';
import { pinnedConversationsAtom } from '~/store';
import { useLocalize } from '~/hooks';
import { logger } from '~/utils';

const MAX_PINNED_CONVERSATIONS = 50;

const cleanPinnedConversations = (pinnedConversations: PinnedConversation[]): PinnedConversation[] => {
  if (!Array.isArray(pinnedConversations)) {
    return [];
  }
  return pinnedConversations
    .filter((pc) => pc.conversationId)
    .map((pc) => ({ conversationId: pc.conversationId }));
};

export default function usePinnedConversations() {
  const localize = useLocalize();
  const { showToast } = useToastContext();
  const [pinnedConversations, setPinnedConversations] = useAtom(pinnedConversationsAtom);
  const getPinnedConversationsQuery = useGetPinnedConversationsQuery();
  const updatePinnedConversationsMutation = useUpdatePinnedConversationsMutation();

  const isMutatingRef = useRef(false);

  useEffect(() => {
    if (isMutatingRef.current || updatePinnedConversationsMutation.isLoading) {
      return;
    }
    if (getPinnedConversationsQuery.data) {
      if (Array.isArray(getPinnedConversationsQuery.data)) {
        setPinnedConversations(getPinnedConversationsQuery.data);
      } else {
        setPinnedConversations([]);
      }
    }
  }, [getPinnedConversationsQuery.data, setPinnedConversations, updatePinnedConversationsMutation.isLoading]);

  const getErrorMessage = useCallback(
    (error: unknown): string => {
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as {
          response?: { data?: { code?: string; limit?: number } };
        };
        const { code, limit } = axiosError.response?.data ?? {};

        if (code === 'MAX_PINNED_CONVERSATIONS_EXCEEDED') {
          return localize('com_ui_max_pinned_conversations_reached', { 0: String(limit ?? MAX_PINNED_CONVERSATIONS) });
        }
      }
      return localize('com_ui_error');
    },
    [localize],
  );

  const savePinnedConversations = useCallback(
    async (newPinnedConversations: typeof pinnedConversations) => {
      const cleaned = cleanPinnedConversations(newPinnedConversations);
      setPinnedConversations(cleaned);
      isMutatingRef.current = true;
      try {
        await updatePinnedConversationsMutation.mutateAsync(cleaned);
      } catch (error) {
        logger.error('Error updating pinned conversations:', error);
        showToast({ message: getErrorMessage(error), status: 'error' });
        getPinnedConversationsQuery.refetch();
      } finally {
        setTimeout(() => {
          isMutatingRef.current = false;
        }, 100);
      }
    },
    [setPinnedConversations, updatePinnedConversationsMutation, showToast, getErrorMessage, getPinnedConversationsQuery],
  );

  const addPinnedConversation = (conversationId: string) => {
    if (pinnedConversations.some((pc) => pc.conversationId === conversationId)) return;
    const newPinnedConversations = [...pinnedConversations, { conversationId }];
    savePinnedConversations(newPinnedConversations);
  };

  const removePinnedConversation = (conversationId: string) => {
    const newPinnedConversations = pinnedConversations.filter((pc) => pc.conversationId !== conversationId);
    savePinnedConversations(newPinnedConversations);
  };

  const isPinnedConversation = (conversationId: string | undefined | null) => {
    if (!conversationId) {
      return false;
    }
    return pinnedConversations.some((pc) => pc.conversationId === conversationId);
  };

  const togglePinnedConversation = (conversationId: string) => {
    if (isPinnedConversation(conversationId)) {
      removePinnedConversation(conversationId);
    } else {
      addPinnedConversation(conversationId);
    }
  };

  const reorderPinnedConversations = useCallback(
    async (newPinnedConversations: typeof pinnedConversations, persist = false) => {
      const cleaned = cleanPinnedConversations(newPinnedConversations);
      setPinnedConversations(cleaned);
      if (persist) {
        isMutatingRef.current = true;
        try {
          await updatePinnedConversationsMutation.mutateAsync(cleaned);
        } catch (error) {
          logger.error('Error reordering pinned conversations:', error);
          showToast({ message: getErrorMessage(error), status: 'error' });
          getPinnedConversationsQuery.refetch();
        } finally {
          setTimeout(() => {
            isMutatingRef.current = false;
          }, 100);
        }
      }
    },
    [setPinnedConversations, updatePinnedConversationsMutation, showToast, getErrorMessage, getPinnedConversationsQuery],
  );

  return {
    pinnedConversations,
    addPinnedConversation,
    removePinnedConversation,
    isPinnedConversation,
    togglePinnedConversation,
    reorderPinnedConversations,
    isLoading: getPinnedConversationsQuery.isLoading,
    isError: getPinnedConversationsQuery.isError,
    isUpdating: updatePinnedConversationsMutation.isLoading,
    fetchError: getPinnedConversationsQuery.error,
    updateError: updatePinnedConversationsMutation.error,
  };
}
