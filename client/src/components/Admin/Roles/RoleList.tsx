import React, { useState } from 'react';
import { Lock, Trash2, Pencil, Check, X, Plus } from 'lucide-react';
import { SystemRoles } from 'librechat-data-provider';
import {
  useListRoles,
  useCreateRoleMutation,
  useDeleteRoleMutation,
  useRenameRoleMutation,
} from '~/data-provider/Admin';
import { useLocalize } from '~/hooks';
import PermissionsEditor from './PermissionsEditor';

export default function RoleList() {
  const localize = useLocalize();
  const { data: roles, isLoading } = useListRoles();
  const createRole = useCreateRoleMutation();
  const deleteRole = useDeleteRoleMutation();
  const renameRole = useRenameRoleMutation();

  const [newRoleName, setNewRoleName] = useState('');
  const [creating, setCreating] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [renamingRole, setRenamingRole] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

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

  const handleStartRename = (name: string) => {
    setRenamingRole(name);
    setRenameValue(name);
  };

  const handleConfirmRename = async () => {
    if (!renamingRole || !renameValue.trim() || renameValue.trim() === renamingRole) {
      setRenamingRole(null);
      return;
    }
    await renameRole.mutateAsync({ name: renamingRole, newName: renameValue.trim() });
    if (selectedRole === renamingRole) {
      setSelectedRole(renameValue.trim());
    }
    setRenamingRole(null);
  };

  if (isLoading) {
    return <div className="p-4 text-sm text-token-text-secondary">{localize('com_ui_loading')}</div>;
  }

  const roleList = roles ?? [];
  const { system: systemRoles, custom: customRoles } = roleList.reduce<{
    system: typeof roleList;
    custom: typeof roleList;
  }>(
    (acc, r) => {
      if (r.name === SystemRoles.ADMIN || r.name === SystemRoles.USER) {
        acc.system.push(r);
      } else {
        acc.custom.push(r);
      }
      return acc;
    },
    { system: [], custom: [] },
  );

  const renderRoleCard = (role: { name: string }) => {
    const isSystem = role.name === SystemRoles.ADMIN || role.name === SystemRoles.USER;
    const isSelected = selectedRole === role.name;
    const isRenaming = renamingRole === role.name;

    return (
      <div
        key={role.name}
        onClick={() => !isRenaming && setSelectedRole(role.name)}
        className={`group relative flex cursor-pointer flex-col rounded-lg border p-3 transition-colors ${
          isSelected
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
            : 'border-border-medium bg-surface-primary hover:bg-surface-hover'
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          {isRenaming ? (
            <input
              autoFocus
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleConfirmRename();
                } else if (e.key === 'Escape') {
                  setRenamingRole(null);
                }
              }}
              className="flex-1 rounded border border-border-medium bg-surface-primary px-1.5 py-0.5 text-sm text-token-text-primary focus:outline-none"
            />
          ) : (
            <span className="truncate text-sm font-medium text-token-text-primary">{role.name}</span>
          )}

          {isSystem && (
            <Lock
              className="h-3.5 w-3.5 shrink-0 text-token-text-tertiary"
              aria-label={localize('com_admin_system_role')}
            />
          )}

          {!isSystem && !isRenaming && (
            <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleStartRename(role.name);
                }}
                className="rounded p-0.5 text-token-text-secondary hover:bg-surface-hover hover:text-token-text-primary"
                aria-label={localize('com_admin_rename')}
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(role.name);
                }}
                className="rounded p-0.5 text-red-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
                aria-label={localize('com_ui_delete')}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {isRenaming && (
            <div className="flex shrink-0 items-center gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleConfirmRename();
                }}
                className="rounded p-0.5 text-green-500 hover:bg-green-50 dark:hover:bg-green-950"
                aria-label={localize('com_ui_save')}
              >
                <Check className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setRenamingRole(null);
                }}
                className="rounded p-0.5 text-token-text-secondary hover:bg-surface-hover"
                aria-label={localize('com_ui_cancel')}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        {isSystem && (
          <span className="mt-1 text-xs text-token-text-tertiary">{localize('com_admin_system_role')}</span>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* System Roles */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-token-text-secondary">
            {localize('com_admin_roles')} — System
          </h3>
          <div className="space-y-2">{systemRoles.map(renderRoleCard)}</div>
        </div>

        {/* Custom Roles */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-token-text-secondary">
            {localize('com_admin_roles')} — Custom
          </h3>
          <div className="space-y-2">
            {customRoles.length === 0 ? (
              <p className="text-sm text-token-text-tertiary">{localize('com_admin_no_roles')}</p>
            ) : (
              customRoles.map(renderRoleCard)
            )}
          </div>

          {/* Create new role */}
          <div className="flex gap-2 pt-1">
            <input
              type="text"
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
              placeholder={localize('com_admin_role_name')}
              className="flex-1 rounded border border-border-medium bg-surface-primary px-2 py-1.5 text-sm text-token-text-primary focus:outline-none"
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
            <button
              onClick={handleCreate}
              disabled={creating || !newRoleName.trim()}
              className="flex items-center gap-1 rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5" />
              {localize('com_ui_add')}
            </button>
          </div>
        </div>

        {/* Permissions Editor */}
        <div className="space-y-3 lg:col-span-1">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-token-text-secondary">
            {localize('com_admin_permissions_editor')}
          </h3>
          {selectedRole ? (
            <PermissionsEditor roleName={selectedRole} />
          ) : (
            <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-border-medium text-sm text-token-text-tertiary">
              {localize('com_admin_select_role')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
