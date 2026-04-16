import { useMemo } from 'react';
import DOMPurify from 'dompurify';
import { Edit2, Trash2, Power, Globe, Users, User, Shield } from 'lucide-react';
import { Button, cn } from '@librechat/client';
import { useLocalize } from '~/hooks';
import type { TBanner } from 'librechat-data-provider';

export interface BannerListItemProps {
    banner: TBanner;
    onEdit: () => void;
    onDelete: () => void;
    onToggle: () => void;
}

const AUDIENCE_ICONS = {
    global: Globe,
    role: Shield,
    group: Users,
    user: User,
} as const;

export const BannerListItem = ({ banner, onEdit, onDelete, onToggle }: BannerListItemProps) => {
    const localize = useLocalize();
    const sanitizedMessage = useMemo(
        () => DOMPurify.sanitize(banner.message),
        [banner.message],
    );

    const AudienceIcon = AUDIENCE_ICONS[banner.audienceMode || 'global'];

    return (
        <div
            className={cn(
                'rounded-lg border border-border-medium bg-surface-primary p-4 transition-colors hover:bg-surface-hover',
                !banner.isActive && 'opacity-60',
            )}
        >
            <div className="flex items-start gap-4">
                {/* Status indicator */}
                <div className="flex flex-col items-center gap-1">
                    <div
                        className={cn(
                            'h-3 w-3 rounded-full',
                            banner.isActive ? 'bg-green-500' : 'bg-gray-400',
                        )}
                        title={banner.isActive ? 'Active' : 'Inactive'}
                    />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    {/* Message */}
                    <div
                        className="mb-2 line-clamp-2 text-text-primary [&_a]:text-blue-600 [&_a]:underline"
                        dangerouslySetInnerHTML={{ __html: sanitizedMessage }}
                    />

                    {/* Metadata */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-text-secondary">
                        {/* Audience */}
                        <div className="flex items-center gap-1">
                            <AudienceIcon className="h-3 w-3" />
                            <span className="capitalize">{banner.audienceMode || 'global'}</span>
                        </div>

                        {/* Priority */}
                        <div className="flex items-center gap-1">
                            <span>Priority: {banner.priority ?? 50}</span>
                        </div>

                        {/* Dates */}
                        {banner.displayFrom && (
                            <div>
                                From: {new Date(banner.displayFrom).toLocaleDateString()}
                            </div>
                        )}
                        {banner.displayTo && (
                            <div>
                                Until: {new Date(banner.displayTo).toLocaleDateString()}
                            </div>
                        )}

                        {/* Stats */}
                        {(banner.viewCount !== undefined || banner.dismissCount !== undefined) && (
                            <div className="ml-auto flex gap-3">
                                {banner.viewCount !== undefined && (
                                    <span>👁️ {banner.viewCount}</span>
                                )}
                                {banner.dismissCount !== undefined && (
                                    <span>✕ {banner.dismissCount}</span>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onToggle}
                        title={banner.isActive ? 'Deactivate' : 'Activate'}
                    >
                        <Power className={cn('h-4 w-4', banner.isActive && 'text-green-600')} />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onEdit}
                        title={localize('com_ui_edit') || 'Edit'}
                    >
                        <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onDelete}
                        title={localize('com_ui_delete') || 'Delete'}
                        className="text-red-600 hover:text-red-700"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
};
