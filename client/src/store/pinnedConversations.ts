import { createTabIsolatedAtom } from './jotai-utils';

export type PinnedConversation = {
  conversationId: string;
};

export type PinnedConversationsState = PinnedConversation[];

/**
 * This atom stores the user's pinned conversations
 */
export const pinnedConversationsAtom = createTabIsolatedAtom<PinnedConversationsState>(
  'pinnedConversations',
  [],
);
