import React, { useState } from 'react';
import { useLocalize } from '~/hooks';
import { useUpdateAdminUserMutation, useBanUserMutation, useUnbanUserMutation } from '~/data-provider/Admin';
import type { TAdminUser } from 'librechat-data-provider';

interface UserEditFormProps {
  user: TAdminUser;
  onClose: () => void;
}

export default function UserEditForm({ user, onClose }: UserEditFormProps) {
  const localize = useLocalize();
  const updateUser = useUpdateAdminUserMutation();
  const banUser = useBanUserMutation();
  const unbanUser = useUnbanUserMutation();

  const [name, setName] = useState(user.name ?? '');
  const [email, setEmail] = useState(user.email);
  const [role, setRole] = useState(user.role ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await updateUser.mutateAsync({ userId: user._id, updates: { name, email, role } });
      onClose();
    } catch {
      setError(localize('com_admin_save_error'));
    } finally {
      setSaving(false);
    }
  };

  const handleBan = async () => {
    if (!window.confirm(localize('com_admin_confirm_ban_user'))) {
      return;
    }
    try {
      await banUser.mutateAsync({ userId: user._id });
      onClose();
    } catch {
      setError(localize('com_admin_save_error'));
    }
  };

  const handleUnban = async () => {
    try {
      await unbanUser.mutateAsync(user._id);
      onClose();
    } catch {
      setError(localize('com_admin_save_error'));
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-token-text-primary">
        {localize('com_admin_edit_user')}
      </h3>

      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-token-text-secondary">
            {localize('com_auth_full_name')}
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded border border-border-medium bg-surface-primary px-3 py-1.5 text-sm text-token-text-primary focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-token-text-secondary">
            {localize('com_auth_email')}
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded border border-border-medium bg-surface-primary px-3 py-1.5 text-sm text-token-text-primary focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-token-text-secondary">
            {localize('com_admin_role')}
          </label>
          <input
            type="text"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="mt-1 w-full rounded border border-border-medium bg-surface-primary px-3 py-1.5 text-sm text-token-text-primary focus:outline-none"
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? localize('com_ui_saving') : localize('com_ui_save')}
        </button>
        <button
          onClick={handleBan}
          className="rounded bg-red-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-700"
        >
          {localize('com_admin_ban_user')}
        </button>
        <button
          onClick={handleUnban}
          className="rounded bg-yellow-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-yellow-700"
        >
          {localize('com_admin_unban_user')}
        </button>
        <button
          onClick={onClose}
          className="rounded border border-border-medium px-4 py-1.5 text-sm font-medium text-token-text-primary hover:bg-surface-hover"
        >
          {localize('com_ui_cancel')}
        </button>
      </div>
    </div>
  );
}
