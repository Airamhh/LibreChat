import { useMemo, memo, type FC, useCallback, useEffect, useRef, useState } from 'react';
import throttle from 'lodash/throttle';
import { ChevronDown } from 'lucide-react';
import { useRecoilValue } from 'recoil';
import { Spinner, useMediaQuery } from '@librechat/client';
import { List, AutoSizer, CellMeasurer, CellMeasurerCache } from 'react-virtualized';
import type { TConversation } from 'librechat-data-provider';
import { useLocalize, TranslationKeys, useFavorites, usePinnedConversations, useShowMarketplace } from '~/hooks';
import PinnedConversationsList from '~/components/Nav/PinnedConversations';
import FavoritesList from '~/components/Nav/Favorites/FavoritesList';
import { useActiveJobs } from '~/data-provider';
import { groupConversationsByDate, cn } from '~/utils';
import Convo from './Convo';
import store from '~/store';

export type CellPosition = {
  columnIndex: number;
  rowIndex: number;
};

export type MeasuredCellParent = {
  invalidateCellSizeAfterRender?: ((cell: CellPosition) => void) | undefined;
  recomputeGridSize?: ((cell: CellPosition) => void) | undefined;
};

interface ConversationsProps {
  conversations: Array<TConversation | null>;
  moveToTop: () => void;
  toggleNav: () => void;
  containerRef: React.RefObject<List>;
  loadMoreConversations: () => void;
  isLoading: boolean;
  isSearchLoading: boolean;
  isChatsExpanded: boolean;
  setIsChatsExpanded: (expanded: boolean) => void;
  isPinnedAgentsExpanded: boolean;
  setIsPinnedAgentsExpanded: (expanded: boolean) => void;
  isPinnedChatsExpanded: boolean;
  setIsPinnedChatsExpanded: (expanded: boolean) => void;
}

interface MeasuredRowProps {
  cache: CellMeasurerCache;
  rowKey: string;
  parent: MeasuredCellParent;
  index: number;
  style: React.CSSProperties;
  children: React.ReactNode;
}

/** Reusable wrapper for virtualized row measurement */
const MeasuredRow: FC<MeasuredRowProps> = memo(
  ({ cache, rowKey, parent, index, style, children }) => (
    <CellMeasurer cache={cache} columnIndex={0} key={rowKey} parent={parent} rowIndex={index}>
      {({ registerChild }) => (
        <div ref={registerChild as React.LegacyRef<HTMLDivElement>} style={style} className="px-3">
          {children}
        </div>
      )}
    </CellMeasurer>
  ),
);

MeasuredRow.displayName = 'MeasuredRow';

const LoadingSpinner = memo(() => {
  const localize = useLocalize();

  return (
    <div className="mx-auto mt-2 flex items-center justify-center gap-2">
      <Spinner className="text-text-primary" />
      <span className="animate-pulse text-text-primary">{localize('com_ui_loading')}</span>
    </div>
  );
});

LoadingSpinner.displayName = 'LoadingSpinner';

interface SectionHeaderProps {
  label: string;
  isExpanded: boolean;
  onToggle: () => void;
}

/** Collapsible header for sections (Pinned Agents, Pinned Chats, Chats) */
const SectionHeader: FC<SectionHeaderProps> = memo(({ label, isExpanded, onToggle }) => {
  return (
    <button
      onClick={onToggle}
      className="group flex w-full items-center justify-between rounded-lg px-1 py-2 text-xs font-bold text-text-secondary outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-black dark:focus-visible:ring-white"
      type="button"
    >
      <span className="select-none">{label}</span>
      <ChevronDown
        className={cn('h-3 w-3 transition-transform duration-200', isExpanded ? 'rotate-180' : '')}
      />
    </button>
  );
});

SectionHeader.displayName = 'SectionHeader';

interface ChatsHeaderProps {
  isExpanded: boolean;
  onToggle: () => void;
}

/** Collapsible header for the Chats section */
const ChatsHeader: FC<ChatsHeaderProps> = memo(({ isExpanded, onToggle }) => {
  const localize = useLocalize();
  return (
    <div className="mt-2">
      <SectionHeader label={localize('com_ui_chats')} isExpanded={isExpanded} onToggle={onToggle} />
    </div>
  );
});

ChatsHeader.displayName = 'ChatsHeader';

const DateLabel: FC<{ groupName: string; isFirst?: boolean }> = memo(({ groupName, isFirst }) => {
  const localize = useLocalize();
  return (
    <h2
      aria-label={localize('com_a11y_chats_date_section', {
        date: localize(groupName as TranslationKeys) || groupName,
      })}
      className={cn('pl-1 pt-1 text-text-secondary', isFirst === true ? 'mt-0' : 'mt-2')}
      style={{ fontSize: '0.7rem' }}
    >
      {localize(groupName as TranslationKeys) || groupName}
    </h2>
  );
});

DateLabel.displayName = 'DateLabel';

type FlattenedItem =
  | { type: 'pinned-agents-header' }
  | { type: 'pinned-agents' }
  | { type: 'pinned-chats-header' }
  | { type: 'pinned-chats' }
  | { type: 'chats-header' }
  | { type: 'header'; groupName: string }
  | { type: 'convo'; convo: TConversation }
  | { type: 'loading' };

const MemoizedConvo = memo(
  ({
    conversation,
    retainView,
    toggleNav,
    isGenerating,
  }: {
    conversation: TConversation;
    retainView: () => void;
    toggleNav: () => void;
    isGenerating: boolean;
  }) => {
    return (
      <Convo
        conversation={conversation}
        retainView={retainView}
        toggleNav={toggleNav}
        isGenerating={isGenerating}
      />
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.conversation.conversationId === nextProps.conversation.conversationId &&
      prevProps.conversation.title === nextProps.conversation.title &&
      prevProps.conversation.endpoint === nextProps.conversation.endpoint &&
      prevProps.isGenerating === nextProps.isGenerating
    );
  },
);

const Conversations: FC<ConversationsProps> = ({
  conversations: rawConversations,
  moveToTop,
  toggleNav,
  containerRef,
  loadMoreConversations,
  isLoading,
  isSearchLoading,
  isChatsExpanded,
  setIsChatsExpanded,
  isPinnedAgentsExpanded,
  setIsPinnedAgentsExpanded,
  isPinnedChatsExpanded,
  setIsPinnedChatsExpanded,
}) => {
  const localize = useLocalize();
  const search = useRecoilValue(store.search);
  const { favorites, isLoading: isFavoritesLoading } = useFavorites();
  const { pinnedConversations, isLoading: isPinnedConversationsLoading } = usePinnedConversations();
  const isSmallScreen = useMediaQuery('(max-width: 768px)');
  const convoHeight = isSmallScreen ? 44 : 34;
  const showAgentMarketplace = useShowMarketplace();

  const favoritesContentKeyRef = useRef('');
  const pinnedContentKeyRef = useRef('');

  // Fetch active job IDs for showing generation indicators
  const { data: activeJobsData } = useActiveJobs();
  const activeJobIds = useMemo(
    () => new Set(activeJobsData?.activeJobIds ?? []),
    [activeJobsData?.activeJobIds],
  );

  // Determine if FavoritesList will render content
  const shouldShowPinnedAgents =
    !search.query && (isFavoritesLoading || favorites.length > 0 || showAgentMarketplace);

  favoritesContentKeyRef.current = `${favorites.length}-${showAgentMarketplace ? 1 : 0}-${isFavoritesLoading ? 1 : 0}`;

  // Determine if PinnedConversationsList will render content
  const shouldShowPinnedChats =
    !search.query && (isPinnedConversationsLoading || pinnedConversations.length > 0);

  pinnedContentKeyRef.current = `${pinnedConversations.length}-${isPinnedConversationsLoading ? 1 : 0}`;

  const pinnedConversationIds = useMemo(
    () => new Set(pinnedConversations.map((pc) => pc.conversationId)),
    [pinnedConversations],
  );

  const filteredConversations = useMemo(
    () =>
      (rawConversations.filter(Boolean) as TConversation[]).filter(
        (convo) => !pinnedConversationIds.has(convo.conversationId),
      ),
    [rawConversations, pinnedConversationIds],
  );

  const groupedConversations = useMemo(
    () => groupConversationsByDate(filteredConversations),
    [filteredConversations],
  );

  const flattenedItems = useMemo(() => {
    const items: FlattenedItem[] = [];

    // Only include pinned agents section if FavoritesList will render content
    if (shouldShowPinnedAgents) {
      items.push({ type: 'pinned-agents-header' });
      if (isPinnedAgentsExpanded) {
        items.push({ type: 'pinned-agents' });
      }
    }

    // Only include pinned chats section if PinnedConversationsList will render content
    if (shouldShowPinnedChats) {
      items.push({ type: 'pinned-chats-header' });
      if (isPinnedChatsExpanded) {
        items.push({ type: 'pinned-chats' });
      }
    }

    items.push({ type: 'chats-header' });

    if (isChatsExpanded) {
      groupedConversations.forEach(([groupName, convos]) => {
        items.push({ type: 'header', groupName });
        items.push(...convos.map((convo) => ({ type: 'convo' as const, convo })));
      });

      if (isLoading) {
        items.push({ type: 'loading' } as any);
      }
    }
    return items;
  }, [
    groupedConversations,
    isLoading,
    isChatsExpanded,
    shouldShowPinnedAgents,
    isPinnedAgentsExpanded,
    shouldShowPinnedChats,
    isPinnedChatsExpanded,
  ]);

  // Store flattenedItems in a ref for keyMapper to access without recreating cache
  const flattenedItemsRef = useRef(flattenedItems);
  flattenedItemsRef.current = flattenedItems;

  // Create a stable cache that doesn't depend on flattenedItems
  const cache = useMemo(
    () =>
      new CellMeasurerCache({
        fixedWidth: true,
        defaultHeight: convoHeight,
        keyMapper: (index) => {
          const item = flattenedItemsRef.current[index];
          if (!item) {
            return `unknown-${index}`;
          }
          if (item.type === 'pinned-agents-header') {
            return 'pinned-agents-header';
          }
          if (item.type === 'pinned-agents') {
            return `pinned-agents-${favoritesContentKeyRef.current}`;
          }
          if (item.type === 'pinned-chats-header') {
            return 'pinned-chats-header';
          }
          if (item.type === 'pinned-chats') {
            return `pinned-chats-${pinnedContentKeyRef.current}`;
          }
          if (item.type === 'chats-header') {
            return 'chats-header';
          }
          if (item.type === 'header') {
            return `header-${item.groupName}`;
          }
          if (item.type === 'convo') {
            return `convo-${item.convo.conversationId}`;
          }
          if (item.type === 'loading') {
            return 'loading';
          }
          return `unknown-${index}`;
        },
      }),
    [convoHeight],
  );

  const clearPinnedSectionsCache = useCallback(() => {
    if (cache) {
      cache.clear(0, 0);
      cache.clear(1, 0);
      if (containerRef.current && 'recomputeRowHeights' in containerRef.current) {
        containerRef.current.recomputeRowHeights(0);
      }
    }
  }, [cache, containerRef]);

  useEffect(() => {
    const frameId = requestAnimationFrame(() => {
      clearPinnedSectionsCache();
    });
    return () => cancelAnimationFrame(frameId);
  }, [
    favorites.length,
    isFavoritesLoading,
    showAgentMarketplace,
    pinnedConversations.length,
    isPinnedConversationsLoading,
    clearPinnedSectionsCache,
  ]);

  const rowRenderer = useCallback(
    ({ index, key, parent, style }) => {
      const item = flattenedItems[index];
      const rowProps = { cache, rowKey: key, parent, index, style };

      if (item.type === 'loading') {
        return (
          <MeasuredRow key={key} {...rowProps}>
            <LoadingSpinner />
          </MeasuredRow>
        );
      }

      if (item.type === 'pinned-agents-header') {
        return (
          <MeasuredRow key={key} {...rowProps}>
            <SectionHeader
              label={localize('com_ui_pinned_agents')}
              isExpanded={isPinnedAgentsExpanded}
              onToggle={() => setIsPinnedAgentsExpanded(!isPinnedAgentsExpanded)}
            />
          </MeasuredRow>
        );
      }

      if (item.type === 'pinned-agents') {
        return (
          <MeasuredRow key={key} {...rowProps}>
            <FavoritesList isSmallScreen={isSmallScreen} toggleNav={toggleNav} />
          </MeasuredRow>
        );
      }

      if (item.type === 'pinned-chats-header') {
        return (
          <MeasuredRow key={key} {...rowProps}>
            <SectionHeader
              label={localize('com_ui_pinned_chats')}
              isExpanded={isPinnedChatsExpanded}
              onToggle={() => setIsPinnedChatsExpanded(!isPinnedChatsExpanded)}
            />
          </MeasuredRow>
        );
      }

      if (item.type === 'pinned-chats') {
        return (
          <MeasuredRow key={key} {...rowProps}>
            <PinnedConversationsList toggleNav={toggleNav} />
          </MeasuredRow>
        );
      }

      if (item.type === 'chats-header') {
        return (
          <MeasuredRow key={key} {...rowProps}>
            <ChatsHeader
              isExpanded={isChatsExpanded}
              onToggle={() => setIsChatsExpanded(!isChatsExpanded)}
            />
          </MeasuredRow>
        );
      }

      if (item.type === 'header') {
        // Calculate first header index based on visible sections
        let firstHeaderIndex = 0;
        if (shouldShowPinnedAgents) {
          firstHeaderIndex += isPinnedAgentsExpanded ? 2 : 1;
        }
        if (shouldShowPinnedChats) {
          firstHeaderIndex += isPinnedChatsExpanded ? 2 : 1;
        }
        firstHeaderIndex += 1; // chats-header

        return (
          <MeasuredRow key={key} {...rowProps}>
            <DateLabel groupName={item.groupName} isFirst={index === firstHeaderIndex} />
          </MeasuredRow>
        );
      }

      if (item.type === 'convo') {
        const isGenerating = activeJobIds.has(item.convo.conversationId ?? '');
        return (
          <MeasuredRow key={key} {...rowProps}>
            <MemoizedConvo
              conversation={item.convo}
              retainView={moveToTop}
              toggleNav={toggleNav}
              isGenerating={isGenerating}
            />
          </MeasuredRow>
        );
      }

      return null;
    },
    [
      cache,
      flattenedItems,
      moveToTop,
      toggleNav,
      isSmallScreen,
      localize,
      isPinnedAgentsExpanded,
      setIsPinnedAgentsExpanded,
      isPinnedChatsExpanded,
      setIsPinnedChatsExpanded,
      isChatsExpanded,
      setIsChatsExpanded,
      shouldShowPinnedAgents,
      shouldShowPinnedChats,
      activeJobIds,
    ],
  );

  const getRowHeight = useCallback(
    ({ index }: { index: number }) => cache.getHeight(index, 0),
    [cache],
  );

  const throttledLoadMore = useMemo(
    () => throttle(loadMoreConversations, 300),
    [loadMoreConversations],
  );

  const handleRowsRendered = useCallback(
    ({ stopIndex }: { stopIndex: number }) => {
      if (stopIndex >= flattenedItems.length - 8) {
        throttledLoadMore();
      }
    },
    [flattenedItems.length, throttledLoadMore],
  );

  return (
    <div className="relative flex h-full min-h-0 flex-col pb-2 text-sm text-text-primary">
      {isSearchLoading ? (
        <div className="flex flex-1 items-center justify-center">
          <Spinner className="text-text-primary" />
          <span className="ml-2 text-text-primary">{localize('com_ui_loading')}</span>
        </div>
      ) : (
        <div className="flex-1">
          <AutoSizer>
            {({ width, height }) => (
              <List
                ref={containerRef}
                width={width}
                height={height}
                deferredMeasurementCache={cache}
                rowCount={flattenedItems.length}
                rowHeight={getRowHeight}
                rowRenderer={rowRenderer}
                overscanRowCount={10}
                aria-readonly={false}
                className="outline-none"
                aria-label="Conversations"
                onRowsRendered={handleRowsRendered}
                tabIndex={-1}
                style={{ outline: 'none' }}
                containerRole="rowgroup"
              />
            )}
          </AutoSizer>
        </div>
      )}
    </div>
  );
};

export { DateLabel };
export default memo(Conversations);
