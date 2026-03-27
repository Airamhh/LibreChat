import React, { useRef, useCallback, useMemo, useEffect } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { useRecoilValue } from 'recoil';
import { useQueries, useQueryClient } from '@tanstack/react-query';
import { Skeleton } from '@librechat/client';
import { QueryKeys, dataService } from 'librechat-data-provider';
import type { TConversation } from 'librechat-data-provider';
import type { PinnedConversation } from '~/store/pinnedConversations';
import { usePinnedConversations, useLocalize } from '~/hooks';
import { useActiveJobs } from '~/data-provider';
import Convo from '~/components/Conversations/Convo';
import store from '~/store';

type ConversationQueryResult = { found: true; conversation: TConversation } | { found: false };

const PinnedConversationSkeleton = () => (
  <div className="flex h-12 w-full items-center rounded-lg py-2 md:h-9">
    <Skeleton className="mr-2 h-5 w-5 rounded-full" />
    <Skeleton className="h-4 w-32" />
  </div>
);

interface DraggablePinnedConversationProps {
  id: string;
  index: number;
  moveItem: (dragIndex: number, hoverIndex: number) => void;
  onDrop: () => void;
  children: React.ReactNode;
}

const DraggablePinnedConversation = ({
  id,
  index,
  moveItem,
  onDrop,
  children,
}: DraggablePinnedConversationProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [{ handlerId }, drop] = useDrop<{ index: number; id: string }, unknown, { handlerId: any }>(
    {
      accept: 'pinned-conversation',
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
    },
  );

  const [{ isDragging }, drag] = useDrag({
    type: 'pinned-conversation',
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

export default function PinnedConversationsList({
  toggleNav,
}: {
  toggleNav?: () => void;
}) {
  const localize = useLocalize();
  const search = useRecoilValue(store.search);
  const {
    pinnedConversations,
    reorderPinnedConversations,
    isLoading: isPinnedLoading,
  } = usePinnedConversations();

  const safePinnedConversations = useMemo(
    () => (Array.isArray(pinnedConversations) ? pinnedConversations : []),
    [pinnedConversations],
  );

  const allConversationIds = useMemo(
    () => safePinnedConversations.map((pc) => pc.conversationId).filter(Boolean) as string[],
    [safePinnedConversations],
  );

  const queryClient = useQueryClient();

  const conversationQueries = useQueries({
    queries: allConversationIds.map((conversationId) => ({
      queryKey: [QueryKeys.conversation, conversationId],
      queryFn: async (): Promise<ConversationQueryResult> => {
        try {
          const cachedConvo = queryClient.getQueryData<TConversation>([
            QueryKeys.conversation,
            conversationId,
          ]);
          if (cachedConvo) {
            return { found: true, conversation: cachedConvo };
          }
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

  const staleConversationIdsKey = useMemo(() => {
    const ids: string[] = [];
    for (let i = 0; i < allConversationIds.length; i++) {
      const query = conversationQueries[i];
      if (query.data && !query.data.found) {
        ids.push(allConversationIds[i]);
      }
    }
    return ids.sort().join(',');
  }, [allConversationIds, conversationQueries]);

  const cleanupAttemptedRef = useRef('');

  useEffect(() => {
    if (!staleConversationIdsKey || cleanupAttemptedRef.current === staleConversationIdsKey) {
      return;
    }
    const staleSet = new Set(staleConversationIdsKey.split(','));
    const cleaned = safePinnedConversations.filter(
      (pc) => !staleSet.has(pc.conversationId),
    );
    if (cleaned.length < safePinnedConversations.length) {
      cleanupAttemptedRef.current = staleConversationIdsKey;
      reorderPinnedConversations(cleaned, true);
    }
  }, [staleConversationIdsKey, safePinnedConversations, reorderPinnedConversations]);

  const conversationsMap = useMemo(() => {
    const map: Record<string, TConversation> = {};
    conversationQueries.forEach((query) => {
      if (query.data?.found) {
        map[query.data.conversation.conversationId] = query.data.conversation;
      }
    });
    return map;
  }, [conversationQueries]);

  const isConversationsLoading =
    allConversationIds.length > 0 &&
    conversationQueries.some((q) => q.isLoading);

  const draggedPinnedConversationsRef = useRef(safePinnedConversations);

  const moveItem = useCallback(
    (dragIndex: number, hoverIndex: number) => {
      const newPinnedConversations = [...draggedPinnedConversationsRef.current];
      const [draggedItem] = newPinnedConversations.splice(dragIndex, 1);
      newPinnedConversations.splice(hoverIndex, 0, draggedItem);
      draggedPinnedConversationsRef.current = newPinnedConversations;
      reorderPinnedConversations(newPinnedConversations, false);
    },
    [reorderPinnedConversations],
  );

  const handleDrop = useCallback(() => {
    reorderPinnedConversations(draggedPinnedConversationsRef.current, true);
  }, [reorderPinnedConversations]);

  useEffect(() => {
    draggedPinnedConversationsRef.current = safePinnedConversations;
  }, [safePinnedConversations]);

  const retainView = useCallback(() => {}, []);

  const { data: activeJobsData } = useActiveJobs();
  const activeJobIds = useMemo(
    () => new Set(activeJobsData?.activeJobIds ?? []),
    [activeJobsData?.activeJobIds],
  );

  if (search.query) {
    return null;
  }

  if (!isPinnedLoading && safePinnedConversations.length === 0) {
    return null;
  }

  if (isPinnedLoading) {
    return (
      <div className="mb-2 flex flex-col pb-2">
        <div className="mt-1 flex flex-col gap-1">
          <PinnedConversationSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="mb-2 flex flex-col">
      <div className="mt-1 flex flex-col gap-1">
        {isConversationsLoading ? (
          <>
            {safePinnedConversations.map((_, index) => (
              <PinnedConversationSkeleton key={`skeleton-${index}`} />
            ))}
          </>
        ) : (
          <>
            {safePinnedConversations.map((pc, index) => {
              const conversation = conversationsMap[pc.conversationId];
              if (!conversation) {
                return null;
              }
              const isGenerating = activeJobIds.has(conversation.conversationId);
              return (
                <DraggablePinnedConversation
                  key={pc.conversationId}
                  id={pc.conversationId}
                  index={index}
                  moveItem={moveItem}
                  onDrop={handleDrop}
                >
                  <Convo
                    conversation={conversation}
                    retainView={retainView}
                    toggleNav={toggleNav ?? (() => {})}
                    isGenerating={isGenerating}
                  />
                </DraggablePinnedConversation>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
