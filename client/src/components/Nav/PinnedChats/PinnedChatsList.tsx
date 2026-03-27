import React, { useRef, useCallback, useMemo, useEffect } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { Skeleton } from '@librechat/client';
import { useQueries } from '@tanstack/react-query';
import { useRecoilValue } from 'recoil';
import { QueryKeys, dataService } from 'librechat-data-provider';
import type t from 'librechat-data-provider';
import { usePinnedConversations } from '~/hooks';
import PinnedChatItem from './PinnedChatItem';
import store from '~/store';

type ConvoQueryResult = { found: true; conversation: t.TConversation } | { found: false };

/** Height intentionally matches PinnedChatItem (px-3 py-2 + h-5 icon) */
const PinnedChatItemSkeleton = () => (
  <div className="flex w-full items-center rounded-lg px-3 py-2">
    <Skeleton className="mr-2 h-5 w-5 rounded-full" />
    <Skeleton className="h-4 w-32" />
  </div>
);

interface DraggablePinnedChatItemProps {
  id: string;
  index: number;
  moveItem: (dragIndex: number, hoverIndex: number) => void;
  onDrop: () => void;
  children: React.ReactNode;
}

const DraggablePinnedChatItem = ({
  id,
  index,
  moveItem,
  onDrop,
  children,
}: DraggablePinnedChatItemProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [{ handlerId }, drop] = useDrop<
    { index: number; id: string },
    unknown,
    { handlerId: unknown }
  >({
    accept: 'pinned-chat-item',
    collect(monitor) {
      return {
        handlerId: monitor.getHandlerId(),
      };
    },
    hover(item, monitor) {
      if (!ref.current) {
        return;
      }
      const dragIndex = item.index;
      const hoverIndex = index;

      if (dragIndex === hoverIndex) {
        return;
      }

      const hoverBoundingRect = ref.current?.getBoundingClientRect();
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      const clientOffset = monitor.getClientOffset();
      if (!clientOffset) {
        return;
      }
      const hoverClientY = clientOffset.y - hoverBoundingRect.top;

      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
        return;
      }

      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
        return;
      }

      moveItem(dragIndex, hoverIndex);
      item.index = hoverIndex;
    },
  });

  const [{ isDragging }, drag] = useDrag({
    type: 'pinned-chat-item',
    item: () => {
      return { id, index };
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    end: () => {
      onDrop();
    },
  });

  const opacity = isDragging ? 0 : 1;
  drag(drop(ref));

  return (
    <div ref={ref} style={{ opacity }} data-handler-id={handlerId}>
      {children}
    </div>
  );
};

export default function PinnedChatsList({
  isSmallScreen,
  toggleNav,
}: {
  isSmallScreen?: boolean;
  toggleNav?: () => void;
}) {
  const search = useRecoilValue(store.search);
  const {
    pinnedConversations,
    reorderPinnedConversations,
    isLoading: isPinnedLoading,
  } = usePinnedConversations();

  const listContainerRef = useRef<HTMLDivElement>(null);

  const handleNavigated = useCallback(() => {
    if (isSmallScreen && toggleNav) {
      toggleNav();
    }
  }, [isSmallScreen, toggleNav]);

  const handleRemoveFocus = useCallback(() => {
    const nextItem = listContainerRef.current?.querySelector<HTMLElement>(
      '[data-testid="pinned-chat-item"]',
    );
    if (nextItem) {
      nextItem.focus();
      return;
    }
    const newChatButton = document.querySelector<HTMLElement>('[data-testid="nav-new-chat-button"]');
    newChatButton?.focus();
  }, []);

  const safePinned = useMemo(
    () => (Array.isArray(pinnedConversations) ? pinnedConversations : []),
    [pinnedConversations],
  );

  const conversationQueries = useQueries({
    queries: safePinned.map(({ conversationId }) => ({
      queryKey: [QueryKeys.conversation, conversationId],
      queryFn: async (): Promise<ConvoQueryResult> => {
        try {
          const conversation = await dataService.getConversationById(conversationId);
          return { found: true, conversation };
        } catch (error) {
          if (error && typeof error === 'object' && 'response' in error) {
            const axiosError = error as { response?: { status?: number } };
            const status = axiosError.response?.status;
            if (status === 404 || status === 403) {
              return { found: false };
            }
          }
          throw error;
        }
      },
      staleTime: 1000 * 60 * 5,
    })),
  });

  const { staleConvoIdsKey, conversationMap } = useMemo(() => {
    const staleIds: string[] = [];
    const map: Record<string, t.TConversation> = {};
    for (let i = 0; i < conversationQueries.length; i++) {
      const query = conversationQueries[i];
      if (!query.data) {
        continue;
      }
      if (query.data.found) {
        map[query.data.conversation.conversationId ?? ''] = query.data.conversation;
      } else {
        staleIds.push(safePinned[i].conversationId);
      }
    }
    return { staleConvoIdsKey: staleIds.sort().join(','), conversationMap: map };
  }, [safePinned, conversationQueries]);

  const cleanupAttemptedRef = useRef('');

  useEffect(() => {
    if (!staleConvoIdsKey || cleanupAttemptedRef.current === staleConvoIdsKey) {
      return;
    }
    const staleSet = new Set(staleConvoIdsKey.split(','));
    const cleaned = safePinned.filter((p) => !staleSet.has(p.conversationId));
    if (cleaned.length < safePinned.length) {
      cleanupAttemptedRef.current = staleConvoIdsKey;
      reorderPinnedConversations(cleaned, true);
    }
  }, [staleConvoIdsKey, safePinned, reorderPinnedConversations]);

  const isConversationsLoading =
    safePinned.length > 0 && conversationQueries.some((q) => q.isLoading);

  const draggedPinnedRef = useRef(safePinned);

  const moveItem = useCallback(
    (dragIndex: number, hoverIndex: number) => {
      const newPinned = [...draggedPinnedRef.current];
      const [draggedItem] = newPinned.splice(dragIndex, 1);
      newPinned.splice(hoverIndex, 0, draggedItem);
      draggedPinnedRef.current = newPinned;
      reorderPinnedConversations(newPinned, false);
    },
    [reorderPinnedConversations],
  );

  const handleDrop = useCallback(() => {
    reorderPinnedConversations(draggedPinnedRef.current, true);
  }, [reorderPinnedConversations]);

  useEffect(() => {
    draggedPinnedRef.current = safePinned;
  }, [safePinned]);

  if (search.query) {
    return null;
  }

  if (!isPinnedLoading && safePinned.length === 0) {
    return null;
  }

  if (isPinnedLoading) {
    return (
      <div className="mb-2 flex flex-col pb-2">
        <div className="mt-1 flex flex-col gap-1">
          <PinnedChatItemSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="mb-2 flex flex-col">
      <div ref={listContainerRef} className="mt-1 flex flex-col gap-1">
        {isConversationsLoading ? (
          safePinned.map((_, index) => <PinnedChatItemSkeleton key={`skeleton-${index}`} />)
        ) : (
          safePinned.map(({ conversationId }, index) => {
            const conversation = conversationMap[conversationId];
            if (!conversation) {
              return null;
            }
            return (
              <DraggablePinnedChatItem
                key={conversationId}
                id={conversationId}
                index={index}
                moveItem={moveItem}
                onDrop={handleDrop}
              >
                <PinnedChatItem
                  conversation={conversation}
                  onRemoveFocus={handleRemoveFocus}
                  onNavigated={handleNavigated}
                />
              </DraggablePinnedChatItem>
            );
          })
        )}
      </div>
    </div>
  );
}
