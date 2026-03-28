import React, { useState } from 'react';
import * as Menu from '@ariakit/react/menu';
import { PinOff, Ellipsis } from 'lucide-react';
import { DropdownPopup } from '@librechat/client';
import { useParams } from 'react-router-dom';
import { Constants } from 'librechat-data-provider';
import type { TConversation } from 'librechat-data-provider';
import EndpointIcon from '~/components/Endpoints/EndpointIcon';
import { usePinnedConversations, useLocalize, useNavigateToConvo } from '~/hooks';
import { useGetEndpointsQuery } from '~/data-provider';
import { cn } from '~/utils';

type PinnedChatItemProps = {
  conversation: TConversation;
  onRemoveFocus?: () => void;
  onNavigated?: () => void;
};

export default function PinnedChatItem({ conversation, onRemoveFocus, onNavigated }: PinnedChatItemProps) {
  const params = useParams();
  const localize = useLocalize();
  const { navigateToConvo } = useNavigateToConvo();
  const { removePinnedConversation } = usePinnedConversations();
  const { data: endpointsConfig } = useGetEndpointsQuery();
  const [isPopoverActive, setIsPopoverActive] = useState(false);

  const { conversationId, title } = conversation;
  const currentConvoId = params.conversationId;
  const displayTitle = title || localize('com_ui_new_chat');

  const handleSelect = () => {
    if (currentConvoId === conversationId || isPopoverActive) {
      return;
    }

    if (typeof title === 'string' && title.length > 0) {
      document.title = title;
    }

    navigateToConvo(conversation, {
      currentConvoId,
      resetLatestMessage: !(conversationId ?? '') || conversationId === Constants.NEW_CONVO,
    });
    onNavigated?.();
  };

  const handleClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-testid="pinned-chat-options-button"]')) {
      return;
    }
    handleSelect();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleSelect();
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (conversationId) {
      removePinnedConversation(conversationId);
    }
    setIsPopoverActive(false);
    requestAnimationFrame(() => {
      onRemoveFocus?.();
    });
  };

  const menuId = React.useId();

  const dropdownItems = [
    {
      label: localize('com_ui_unpin'),
      onClick: handleRemove,
      icon: <PinOff className="h-4 w-4 text-text-secondary" />,
    },
  ];

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={displayTitle}
      className={cn(
        'group relative flex w-full cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm text-text-primary outline-none hover:bg-surface-active-alt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-black dark:focus-visible:ring-white',
        isPopoverActive ? 'bg-surface-active-alt' : '',
      )}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      data-testid="pinned-chat-item"
    >
      <div className="flex flex-1 items-center truncate pr-6">
        <div className="mr-2 h-5 w-5 flex-shrink-0">
          <EndpointIcon
            conversation={conversation}
            endpointsConfig={endpointsConfig}
            size={20}
            context="menu-item"
          />
        </div>
        <span className="truncate">{displayTitle}</span>
      </div>

      <div
        className={cn(
          'absolute right-2 flex items-center',
          isPopoverActive
            ? 'pointer-events-auto opacity-100'
            : 'pointer-events-none opacity-0 group-focus-within:pointer-events-auto group-focus-within:opacity-100 group-hover:pointer-events-auto group-hover:opacity-100',
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <DropdownPopup
          portal={true}
          mountByState={true}
          isOpen={isPopoverActive}
          setIsOpen={setIsPopoverActive}
          className="z-[125]"
          trigger={
            <Menu.MenuButton
              className={cn(
                'inline-flex h-7 w-7 items-center justify-center rounded-md border-none p-0 text-sm font-medium ring-ring-primary transition-all duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50',
                isPopoverActive
                  ? 'opacity-100'
                  : 'opacity-0 focus:opacity-100 group-focus-within:opacity-100 group-hover:opacity-100 data-[open]:opacity-100',
              )}
              aria-label={localize('com_nav_convo_menu_options')}
              data-testid="pinned-chat-options-button"
              onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.stopPropagation();
              }}
              onKeyDown={(e: React.KeyboardEvent<HTMLButtonElement>) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.stopPropagation();
                }
              }}
            >
              <Ellipsis className="icon-md text-text-secondary" aria-hidden={true} />
            </Menu.MenuButton>
          }
          items={dropdownItems}
          menuId={menuId}
        />
      </div>
    </div>
  );
}
