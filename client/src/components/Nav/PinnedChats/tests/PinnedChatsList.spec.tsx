import React from 'react';
import { render, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RecoilRoot } from 'recoil';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { BrowserRouter } from 'react-router-dom';
import { dataService } from 'librechat-data-provider';
import type t from 'librechat-data-provider';

// Mock store before importing PinnedChatsList
jest.mock('~/store', () => {
  const { atom } = jest.requireActual('recoil');
  return {
    __esModule: true,
    default: {
      search: atom({
        key: 'mock-search-atom-pinned',
        default: { query: '' },
      }),
    },
  };
});

import PinnedChatsList from '../PinnedChatsList';

type PinnedItem = { conversationId: string };

// Mock dataService
jest.mock('librechat-data-provider', () => ({
  ...jest.requireActual('librechat-data-provider'),
  dataService: {
    getConversationById: jest.fn(),
  },
}));

// Mock hooks
const mockPinnedConversations: PinnedItem[] = [];
const mockUsePinnedConversations = jest.fn(() => ({
  pinnedConversations: mockPinnedConversations,
  reorderPinnedConversations: jest.fn(),
  isLoading: false,
}));

jest.mock('~/hooks', () => ({
  usePinnedConversations: () => mockUsePinnedConversations(),
  useLocalize: () => (key: string) => key,
  useNavigateToConvo: () => ({ navigateToConvo: jest.fn() }),
  useFavorites: () => ({ favorites: [], isLoading: false }),
}));

jest.mock('~/data-provider', () => ({
  useGetEndpointsQuery: () => ({ data: {} }),
}));

jest.mock('../PinnedChatItem', () => ({
  __esModule: true,
  default: ({ conversation }: { conversation: t.TConversation }) => (
    <div data-testid="pinned-chat-item" data-id={conversation.conversationId}>
      {conversation.title}
    </div>
  ),
}));

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

const renderWithProviders = (ui: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <RecoilRoot>
        <BrowserRouter>
          <DndProvider backend={HTML5Backend}>{ui}</DndProvider>
        </BrowserRouter>
      </RecoilRoot>
    </QueryClientProvider>,
  );
};

describe('PinnedChatsList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPinnedConversations.length = 0;
  });

  describe('rendering', () => {
    it('should render nothing when pinned conversations is empty', () => {
      const { container } = renderWithProviders(<PinnedChatsList />);
      expect(container.firstChild).toBeNull();
    });

    it('should render skeleton while loading', () => {
      mockUsePinnedConversations.mockReturnValueOnce({
        pinnedConversations: [],
        reorderPinnedConversations: jest.fn(),
        isLoading: true,
      });

      const { container } = renderWithProviders(<PinnedChatsList />);
      expect(container.firstChild).not.toBeNull();
      expect(container.innerHTML).toContain('div');
    });
  });

  describe('missing conversation handling', () => {
    it('should exclude deleted conversations (404) from rendered list', async () => {
      const validConvo: t.TConversation = {
        conversationId: 'valid-convo',
        title: 'Valid Chat',
        endpoint: null,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      } as t.TConversation;

      mockPinnedConversations.push(
        { conversationId: 'valid-convo' },
        { conversationId: 'deleted-convo' },
      );

      (dataService.getConversationById as jest.Mock).mockImplementation((id: string) => {
        if (id === 'valid-convo') {
          return Promise.resolve(validConvo);
        }
        if (id === 'deleted-convo') {
          return Promise.reject({ response: { status: 404 } });
        }
        return Promise.reject(new Error('Unknown conversation'));
      });

      const { findAllByTestId } = renderWithProviders(<PinnedChatsList />);

      const items = await findAllByTestId('pinned-chat-item');

      expect(items).toHaveLength(1);
      expect(items[0]).toHaveAttribute('data-id', 'valid-convo');
    });

    it('should treat 403 the same as 404 — conversation not rendered', async () => {
      const validConvo: t.TConversation = {
        conversationId: 'valid-convo',
        title: 'Valid Chat',
        endpoint: null,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      } as t.TConversation;

      mockPinnedConversations.push(
        { conversationId: 'valid-convo' },
        { conversationId: 'forbidden-convo' },
      );

      (dataService.getConversationById as jest.Mock).mockImplementation((id: string) => {
        if (id === 'valid-convo') {
          return Promise.resolve(validConvo);
        }
        if (id === 'forbidden-convo') {
          return Promise.reject({ response: { status: 403 } });
        }
        return Promise.reject(new Error('Unknown conversation'));
      });

      const { findAllByTestId } = renderWithProviders(<PinnedChatsList />);

      const items = await findAllByTestId('pinned-chat-item');
      expect(items).toHaveLength(1);
      expect(items[0]).toHaveAttribute('data-id', 'valid-convo');
    });

    it('should not show infinite loading when conversation returns 404', async () => {
      mockPinnedConversations.push({ conversationId: 'deleted-convo' });

      (dataService.getConversationById as jest.Mock).mockRejectedValue({
        response: { status: 404 },
      });

      const { queryAllByTestId } = renderWithProviders(<PinnedChatsList />);

      await waitFor(() => {
        expect(dataService.getConversationById as jest.Mock).toHaveBeenCalledWith('deleted-convo');
      });

      expect(queryAllByTestId('pinned-chat-item')).toHaveLength(0);
    });

    it('should call reorderPinnedConversations to persist removal of stale conversations', async () => {
      const mockReorderPinnedConversations = jest.fn().mockResolvedValue(undefined);
      mockUsePinnedConversations.mockReturnValue({
        pinnedConversations: [{ conversationId: 'deleted-convo' }],
        reorderPinnedConversations: mockReorderPinnedConversations,
        isLoading: false,
      });

      (dataService.getConversationById as jest.Mock).mockRejectedValue({
        response: { status: 404 },
      });

      renderWithProviders(<PinnedChatsList />);

      await waitFor(() => {
        expect(mockReorderPinnedConversations).toHaveBeenCalledWith([], true);
      });
    });

    it('should only attempt cleanup once even when pinned conversations revert to stale state', async () => {
      const mockReorderPinnedConversations = jest.fn().mockResolvedValue(undefined);

      mockUsePinnedConversations.mockReturnValue({
        pinnedConversations: [{ conversationId: 'deleted-convo' }],
        reorderPinnedConversations: mockReorderPinnedConversations,
        isLoading: false,
      });

      (dataService.getConversationById as jest.Mock).mockRejectedValue({
        response: { status: 404 },
      });

      const { rerender } = renderWithProviders(<PinnedChatsList />);

      await waitFor(() => {
        expect(mockReorderPinnedConversations).toHaveBeenCalledWith([], true);
      });

      expect(mockReorderPinnedConversations).toHaveBeenCalledTimes(1);

      rerender(
        <QueryClientProvider client={createTestQueryClient()}>
          <RecoilRoot>
            <BrowserRouter>
              <DndProvider backend={HTML5Backend}>
                <PinnedChatsList />
              </DndProvider>
            </BrowserRouter>
          </RecoilRoot>
        </QueryClientProvider>,
      );

      await new Promise((r) => setTimeout(r, 50));

      expect(mockReorderPinnedConversations).toHaveBeenCalledTimes(1);
    });
  });
});
