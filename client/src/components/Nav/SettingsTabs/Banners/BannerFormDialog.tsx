import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
    OGDialog,
    OGDialogTitle,
    OGDialogContent,
    Button,
    Input,
    Label,
    Textarea,
    Switch,
} from '@librechat/client';
import {
    useCreateBannerMutation,
    useUpdateBannerMutation,
} from '~/data-provider';
import { useLocalize } from '~/hooks';
import type { TBanner } from 'librechat-data-provider';

export interface BannerFormDialogProps {
    banner?: TBanner | null;
    onClose: () => void;
}

interface BannerFormData {
    message: string;
    audienceMode: 'global' | 'role' | 'group' | 'user';
    targetRoleIds: string;
    targetGroupIds: string;
    targetUserIds: string;
    priority: number;
    isActive: boolean;
    persistable: boolean;
    displayFrom: string;
    displayTo: string;
}

export const BannerFormDialog = ({ banner, onClose }: BannerFormDialogProps) => {
    const localize = useLocalize();
    const [open, setOpen] = useState(true);
    const createBanner = useCreateBannerMutation();
    const updateBanner = useUpdateBannerMutation();

    const {
        control,
        handleSubmit,
        watch,
        formState: { errors, isSubmitting },
    } = useForm<BannerFormData>({
        defaultValues: {
            message: banner?.message || '',
            audienceMode: banner?.audienceMode || 'global',
            targetRoleIds: banner?.targetRoleIds?.join(', ') || '',
            targetGroupIds: banner?.targetGroupIds?.join(', ') || '',
            targetUserIds: banner?.targetUserIds?.join(', ') || '',
            priority: banner?.priority ?? 50,
            isActive: banner?.isActive ?? true,
            persistable: banner?.persistable ?? false,
            displayFrom: banner?.displayFrom
                ? new Date(banner.displayFrom).toISOString().slice(0, 16)
                : '',
            displayTo: banner?.displayTo
                ? new Date(banner.displayTo).toISOString().slice(0, 16)
                : '',
        },
    });

    const audienceMode = watch('audienceMode');

    const handleClose = () => {
        setOpen(false);
        setTimeout(onClose, 200);
    };

    const onSubmit = async (data: BannerFormData) => {
        try {
            const bannerData: Partial<TBanner> = {
                message: data.message,
                audienceMode: data.audienceMode,
                priority: data.priority,
                isActive: data.isActive,
                persistable: data.persistable,
                displayFrom: data.displayFrom ? new Date(data.displayFrom).toISOString() : undefined,
                displayTo: data.displayTo ? new Date(data.displayTo).toISOString() : undefined,
            };

            // Add audience-specific fields
            if (data.audienceMode === 'role' && data.targetRoleIds.trim()) {
                bannerData.targetRoleIds = data.targetRoleIds.split(',').map((id) => id.trim());
            }
            if (data.audienceMode === 'group' && data.targetGroupIds.trim()) {
                bannerData.targetGroupIds = data.targetGroupIds.split(',').map((id) => id.trim());
            }
            if (data.audienceMode === 'user' && data.targetUserIds.trim()) {
                bannerData.targetUserIds = data.targetUserIds.split(',').map((id) => id.trim());
            }

            if (banner) {
                await updateBanner.mutateAsync({
                    bannerId: banner.bannerId,
                    updates: bannerData,
                });
            } else {
                await createBanner.mutateAsync(bannerData);
            }

            handleClose();
        } catch (error) {
            console.error('Error saving banner:', error);
        }
    };

    return (
        <OGDialog open={open} onOpenChange={setOpen}>
            <OGDialogContent className="max-h-[90vh] overflow-y-auto">
                <OGDialogTitle>
                    {banner
                        ? localize('com_ui_edit_banner') || 'Edit Banner'
                        : localize('com_ui_create_banner') || 'Create Banner'}
                </OGDialogTitle>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    {/* Message */}
                    <div>
                        <Label htmlFor="message">
                            {localize('com_ui_message') || 'Message'} *
                        </Label>
                        <Controller
                            name="message"
                            control={control}
                            rules={{ required: 'Message is required' }}
                            render={({ field }) => (
                                <Textarea
                                    {...field}
                                    id="message"
                                    placeholder="Enter banner message"
                                    rows={3}
                                    className={errors.message ? 'border-red-500' : ''}
                                />
                            )}
                        />
                        {errors.message && (
                            <p className="mt-1 text-xs text-red-500">{errors.message.message}</p>
                        )}
                    </div>

                    {/* Audience Mode */}
                    <div>
                        <Label htmlFor="audienceMode">
                            {localize('com_ui_audience') || 'Audience'}
                        </Label>
                        <Controller
                            name="audienceMode"
                            control={control}
                            render={({ field }) => (
                                <select
                                    {...field}
                                    id="audienceMode"
                                    className="w-full rounded-lg border border-border-medium bg-surface-primary px-3 py-2 text-text-primary"
                                >
                                    <option value="global">{localize('com_ui_global') || 'Global (All Users)'}</option>
                                    <option value="role">{localize('com_ui_role') || 'Specific Roles'}</option>
                                    <option value="group">{localize('com_ui_group') || 'Specific Groups'}</option>
                                    <option value="user">{localize('com_ui_user') || 'Specific Users'}</option>
                                </select>
                            )}
                        />
                    </div>

                    {/* Conditional Audience Fields */}
                    {audienceMode === 'role' && (
                        <div>
                            <Label htmlFor="targetRoleIds">
                                {localize('com_ui_role_ids') || 'Role Names (comma-separated)'}
                            </Label>
                            <Controller
                                name="targetRoleIds"
                                control={control}
                                render={({ field }) => (
                                    <Input
                                        {...field}
                                        id="targetRoleIds"
                                        placeholder="e.g., ADMIN, MODERATOR"
                                    />
                                )}
                            />
                        </div>
                    )}

                    {audienceMode === 'group' && (
                        <div>
                            <Label htmlFor="targetGroupIds">
                                {localize('com_ui_group_ids') || 'Group IDs (comma-separated)'}
                            </Label>
                            <Controller
                                name="targetGroupIds"
                                control={control}
                                render={({ field }) => (
                                    <Input
                                        {...field}
                                        id="targetGroupIds"
                                        placeholder="e.g., 507f1f77bcf86cd799439011"
                                    />
                                )}
                            />
                        </div>
                    )}

                    {audienceMode === 'user' && (
                        <div>
                            <Label htmlFor="targetUserIds">
                                {localize('com_ui_user_ids') || 'User IDs (comma-separated)'}
                            </Label>
                            <Controller
                                name="targetUserIds"
                                control={control}
                                render={({ field }) => (
                                    <Input
                                        {...field}
                                        id="targetUserIds"
                                        placeholder="e.g., 507f1f77bcf86cd799439011"
                                    />
                                )}
                            />
                        </div>
                    )}

                    {/* Priority */}
                    <div>
                        <Label htmlFor="priority">
                            {localize('com_ui_priority') || 'Priority'} (0-100)
                        </Label>
                        <Controller
                            name="priority"
                            control={control}
                            rules={{ min: 0, max: 100 }}
                            render={({ field }) => (
                                <Input
                                    {...field}
                                    id="priority"
                                    type="number"
                                    min="0"
                                    max="100"
                                    onChange={(e) => field.onChange(Number(e.target.value))}
                                />
                            )}
                        />
                    </div>

                    {/* Date Range */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="displayFrom">
                                {localize('com_ui_display_from') || 'Display From'}
                            </Label>
                            <Controller
                                name="displayFrom"
                                control={control}
                                render={({ field }) => (
                                    <Input
                                        {...field}
                                        id="displayFrom"
                                        type="datetime-local"
                                    />
                                )}
                            />
                        </div>
                        <div>
                            <Label htmlFor="displayTo">
                                {localize('com_ui_display_until') || 'Display Until'}
                            </Label>
                            <Controller
                                name="displayTo"
                                control={control}
                                render={({ field }) => (
                                    <Input
                                        {...field}
                                        id="displayTo"
                                        type="datetime-local"
                                    />
                                )}
                            />
                        </div>
                    </div>

                    {/* Switches */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="isActive">
                                {localize('com_ui_active') || 'Active'}
                            </Label>
                            <Controller
                                name="isActive"
                                control={control}
                                render={({ field }) => (
                                    <Switch
                                        id="isActive"
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                    />
                                )}
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <Label htmlFor="persistable">
                                {localize('com_ui_persistable') || 'Always Show (Cannot be Dismissed)'}
                            </Label>
                            <Controller
                                name="persistable"
                                control={control}
                                render={({ field }) => (
                                    <Switch
                                        id="persistable"
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                    />
                                )}
                            />
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-2 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleClose}
                            disabled={isSubmitting}
                        >
                            {localize('com_ui_cancel') || 'Cancel'}
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting
                                ? localize('com_ui_saving') || 'Saving...'
                                : localize('com_ui_save') || 'Save'}
                        </Button>
                    </div>
                </form>
            </OGDialogContent>
        </OGDialog>
    );
};
