import { createTabIsolatedAtom } from './jotai-utils';

export type PinnedConversation = {
  conversationId: string;
};

export type PinnedConversationsState = PinnedConversation[];

export const pinnedConversationsAtom = createTabIsolatedAtom<PinnedConversationsState>('pinnedConversations', []);
