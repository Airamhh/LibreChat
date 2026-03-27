import { useEffect, useCallback, useRef } from 'react';
import { useAtom } from 'jotai';
import { useToastContext } from '@librechat/client';
import type { PinnedConversation } from '~/store/pinnedConversations';
import { useGetPinnedConversationsQuery, useUpdatePinnedConversationsMutation } from '~/data-provider';
import { pinnedConversationsAtom } from '~/store';
import { useLocalize } from '~/hooks';
import { logger } from '~/utils';

/** Maximum number of pinned conversations allowed (must match backend MAX_PINNED_CONVERSATIONS) */
const MAX_PINNED_CONVERSATIONS = 50;

/**
 * Hook for managing user pinned conversations.
 *
 * Pinned conversations are synchronized with the server via `/api/user/settings/pinned-conversations`.
 * Each entry is `{ conversationId: string }`.
 *
 * @returns Object containing pinned conversations state and helper methods for
 * adding, removing, toggling, reordering, and checking pinned conversations.
 */
export default function usePinnedConversations() {
  const localize = useLocalize();
  const { showToast } = useToastContext();
  const [pinnedConversations, setPinnedConversations] = useAtom(pinnedConversationsAtom);
  const getPinnedQuery = useGetPinnedConversationsQuery();
  const updatePinnedMutation = useUpdatePinnedConversationsMutation();

  const isMutatingRef = useRef(false);

  useEffect(() => {
    if (isMutatingRef.current || updatePinnedMutation.isLoading) {
      return;
    }
    if (getPinnedQuery.data) {
      if (Array.isArray(getPinnedQuery.data)) {
        setPinnedConversations(getPinnedQuery.data);
      } else {
        setPinnedConversations([]);
      }
    }
  }, [getPinnedQuery.data, setPinnedConversations, updatePinnedMutation.isLoading]);

  const getErrorMessage = useCallback(
    (error: unknown): string => {
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as {
          response?: { data?: { code?: string; limit?: number } };
        };
        const { code, limit } = axiosError.response?.data ?? {};

        if (code === 'MAX_PINNED_CONVERSATIONS_EXCEEDED') {
          return localize('com_ui_max_pinned_conversations_reached', {
            0: String(limit ?? MAX_PINNED_CONVERSATIONS),
          });
        }
      }
      return localize('com_ui_error');
    },
    [localize],
  );

  const savePinnedConversations = useCallback(
    async (newPinned: PinnedConversation[]) => {
      setPinnedConversations(newPinned);
      isMutatingRef.current = true;
      try {
        await updatePinnedMutation.mutateAsync(newPinned);
      } catch (error) {
        logger.error('Error updating pinned conversations:', error);
        showToast({ message: getErrorMessage(error), status: 'error' });
        getPinnedQuery.refetch();
      } finally {
        setTimeout(() => {
          isMutatingRef.current = false;
        }, 100);
      }
    },
    [setPinnedConversations, updatePinnedMutation, showToast, getErrorMessage, getPinnedQuery],
  );

  const addPinnedConversation = (conversationId: string) => {
    if (pinnedConversations.some((p) => p.conversationId === conversationId)) {
      return;
    }
    savePinnedConversations([...pinnedConversations, { conversationId }]);
  };

  const removePinnedConversation = (conversationId: string) => {
    savePinnedConversations(pinnedConversations.filter((p) => p.conversationId !== conversationId));
  };

  const isPinnedConversation = (conversationId: string | undefined | null) => {
    if (!conversationId) {
      return false;
    }
    return pinnedConversations.some((p) => p.conversationId === conversationId);
  };

  const togglePinnedConversation = (conversationId: string) => {
    if (isPinnedConversation(conversationId)) {
      removePinnedConversation(conversationId);
    } else {
      addPinnedConversation(conversationId);
    }
  };

  /**
   * Reorder pinned conversations and optionally persist the new order to the server.
   */
  const reorderPinnedConversations = useCallback(
    async (newPinned: PinnedConversation[], persist = false) => {
      setPinnedConversations(newPinned);
      if (persist) {
        isMutatingRef.current = true;
        try {
          await updatePinnedMutation.mutateAsync(newPinned);
        } catch (error) {
          logger.error('Error reordering pinned conversations:', error);
          showToast({ message: getErrorMessage(error), status: 'error' });
          getPinnedQuery.refetch();
        } finally {
          setTimeout(() => {
            isMutatingRef.current = false;
          }, 100);
        }
      }
    },
    [setPinnedConversations, updatePinnedMutation, showToast, getErrorMessage, getPinnedQuery],
  );

  return {
    pinnedConversations,
    addPinnedConversation,
    removePinnedConversation,
    isPinnedConversation,
    togglePinnedConversation,
    reorderPinnedConversations,
    /** Whether the pinned conversations query is currently loading */
    isLoading: getPinnedQuery.isLoading,
    /** Whether there was an error fetching pinned conversations */
    isError: getPinnedQuery.isError,
    /** Whether the update mutation is in progress */
    isUpdating: updatePinnedMutation.isLoading,
  };
}
