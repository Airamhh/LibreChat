import React, { useState } from 'react';
import { SystemRoles } from 'librechat-data-provider';
import { useListRoles, useCreateRoleMutation, useDeleteRoleMutation } from '~/data-provider/Admin';
import { useLocalize } from '~/hooks';
import PermissionsEditor from './PermissionsEditor';

export default function RoleList() {
  const localize = useLocalize();
  const { data: roles, isLoading } = useListRoles();
  const createRole = useCreateRoleMutation();
  const deleteRole = useDeleteRoleMutation();
  const [newRoleName, setNewRoleName] = useState('');
  const [creating, setCreating] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  const handleCreate = async () => {
    const trimmed = newRoleName.trim();
    if (!trimmed) {
      return;
    }
    try {
      setCreating(true);
      await createRole.mutateAsync({ name: trimmed });
      setNewRoleName('');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (name: string) => {
    if (!window.confirm(localize('com_admin_confirm_delete_role'))) {
      return;
    }
    await deleteRole.mutateAsync(name);
    if (selectedRole === name) {
      setSelectedRole(null);
    }
  };

  if (isLoading) {
    return <div className="p-4 text-sm text-token-text-secondary">{localize('com_ui_loading')}</div>;
  }

  return (
    <div className="flex gap-6">
      <div className="w-64 shrink-0 space-y-4">
        <h2 className="text-base font-semibold text-token-text-primary">
          {localize('com_admin_roles')}
        </h2>

        <div className="flex gap-2">
          <input
            type="text"
            value={newRoleName}
            onChange={(e) => setNewRoleName(e.target.value)}
            placeholder={localize('com_admin_role_name')}
            className="flex-1 rounded border border-border-medium bg-surface-primary px-2 py-1 text-sm text-token-text-primary focus:outline-none"
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          />
          <button
            onClick={handleCreate}
            disabled={creating || !newRoleName.trim()}
            className="rounded bg-blue-600 px-3 py-1 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {localize('com_ui_add')}
          </button>
        </div>

        <ul className="space-y-1">
          {(roles ?? []).map((role) => {
            const isSystem = role.name === SystemRoles.ADMIN || role.name === SystemRoles.USER;
            return (
              <li
                key={role.name}
                className={`flex cursor-pointer items-center justify-between rounded px-3 py-2 text-sm ${
                  selectedRole === role.name
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100'
                    : 'text-token-text-primary hover:bg-surface-hover'
                }`}
                onClick={() => setSelectedRole(role.name)}
              >
                <span>{role.name}</span>
                {!isSystem && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(role.name);
                    }}
                    className="ml-2 text-red-500 hover:text-red-700"
                    aria-label={localize('com_ui_delete')}
                  >
                    ×
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <div className="flex-1">
        {selectedRole ? (
          <PermissionsEditor roleName={selectedRole} />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-token-text-secondary">
            {localize('com_admin_select_role')}
          </div>
        )}
      </div>
    </div>
  );
}
