import { createTabIsolatedAtom } from '~/store/utils/tabManager';

export type PinnedConversation = {
  conversationId: string;
};

export type PinnedConversationsState = PinnedConversation[];

export const pinnedConversationsAtom = createTabIsolatedAtom<PinnedConversationsState>('pinnedConversations', []);
