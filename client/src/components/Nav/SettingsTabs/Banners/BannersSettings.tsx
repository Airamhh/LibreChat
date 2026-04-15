import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@librechat/client';
import { useAdminBannersQuery, useDeleteBannerMutation, useToggleBannerMutation } from '~/data-provider';
import { useLocalize } from '~/hooks';
import { BannerListItem } from './BannerListItem';
import { BannerFormDialog } from './BannerFormDialog';
import type { TBanner } from 'librechat-data-provider';

export const BannersSettings = () => {
    const localize = useLocalize();
    const [page, setPage] = useState(1);
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [editingBanner, setEditingBanner] = useState<TBanner | null>(null);

    const { data, isLoading } = useAdminBannersQuery({ page, limit: 20 });
    const deleteBanner = useDeleteBannerMutation();
    const toggleBanner = useToggleBannerMutation();

    const handleDelete = async (bannerId: string) => {
        if (!confirm(localize('com_ui_banner_delete_confirm') || 'Delete this banner?')) {
            return;
        }

        try {
            await deleteBanner.mutateAsync(bannerId);
        } catch (error) {
            console.error('Error deleting banner:', error);
        }
    };

    const handleToggle = async (bannerId: string) => {
        try {
            await toggleBanner.mutateAsync(bannerId);
        } catch (error) {
            console.error('Error toggling banner:', error);
        }
    };

    const handleEdit = (banner: TBanner) => {
        setEditingBanner(banner);
    };

    const handleCloseDialog = () => {
        setShowCreateDialog(false);
        setEditingBanner(null);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="text-text-secondary">{localize('com_ui_loading')}...</div>
            </div>
        );
    }

    const banners = data?.banners || [];
    const totalPages = data?.totalPages || 1;

    return (
        <div className="flex h-full flex-col">
            {/* Header */}
            <div className="mb-4 flex items-center justify-between border-b border-border-medium pb-4">
                <div>
                    <h2 className="text-xl font-semibold text-text-primary">
                        {localize('com_ui_banners') || 'Banners'}
                    </h2>
                    <p className="text-sm text-text-secondary">
                        {localize('com_ui_banners_description') || 'Manage system-wide announcement banners'}
                    </p>
                </div>
                <Button
                    onClick={() => setShowCreateDialog(true)}
                    className="flex items-center gap-2"
                >
                    <Plus className="h-4 w-4" />
                    {localize('com_ui_create_banner') || 'Create Banner'}
                </Button>
            </div>

            {/* Banner List */}
            <div className="flex-1 space-y-2 overflow-y-auto">
                {banners.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 text-center">
                        <p className="mb-4 text-text-secondary">
                            {localize('com_ui_no_banners') || 'No banners created yet'}
                        </p>
                        <Button onClick={() => setShowCreateDialog(true)}>
                            {localize('com_ui_create_first_banner') || 'Create your first banner'}
                        </Button>
                    </div>
                ) : (
                    banners.map((banner) => (
                        <BannerListItem
                            key={banner.bannerId}
                            banner={banner}
                            onEdit={() => handleEdit(banner)}
                            onDelete={() => handleDelete(banner.bannerId)}
                            onToggle={() => handleToggle(banner.bannerId)}
                        />
                    ))
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-center gap-2 border-t border-border-medium pt-4">
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={page === 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                        {localize('com_ui_prev') || 'Previous'}
                    </Button>
                    <span className="text-sm text-text-secondary">
                        {localize('com_ui_page') || 'Page'} {page} {localize('com_ui_of') || 'of'} {totalPages}
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={page === totalPages}
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    >
                        {localize('com_ui_next') || 'Next'}
                    </Button>
                </div>
            )}

            {/* Create/Edit Dialog */}
            {(showCreateDialog || editingBanner) && (
                <BannerFormDialog
                    banner={editingBanner}
                    onClose={handleCloseDialog}
                />
            )}
        </div>
    );
};
