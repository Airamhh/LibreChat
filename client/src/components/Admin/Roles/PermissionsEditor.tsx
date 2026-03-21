import React, { useEffect, useState } from 'react';
import { Switch } from '@librechat/client';
import { PermissionTypes, Permissions } from 'librechat-data-provider';
import { useGetRole } from '~/data-provider/roles';
import {
  useUpdatePromptPermissionsMutation,
  useUpdateAgentPermissionsMutation,
  useUpdateMemoryPermissionsMutation,
  useUpdatePeoplePickerPermissionsMutation,
  useUpdateMCPServersPermissionsMutation,
  useUpdateMarketplacePermissionsMutation,
  useUpdateRemoteAgentsPermissionsMutation,
} from '~/data-provider/roles';
import { useLocalize } from '~/hooks';

const permissionTypeLabels: Record<string, string> = {
  [PermissionTypes.PROMPTS]: 'com_admin_permission_prompts',
  [PermissionTypes.BOOKMARKS]: 'com_admin_permission_bookmarks',
  [PermissionTypes.MEMORIES]: 'com_admin_permission_memories',
  [PermissionTypes.AGENTS]: 'com_admin_permission_agents',
  [PermissionTypes.MULTI_CONVO]: 'com_admin_permission_multi_convo',
  [PermissionTypes.TEMPORARY_CHAT]: 'com_admin_permission_temporary_chat',
  [PermissionTypes.RUN_CODE]: 'com_admin_permission_run_code',
  [PermissionTypes.WEB_SEARCH]: 'com_admin_permission_web_search',
  [PermissionTypes.PEOPLE_PICKER]: 'com_admin_permission_people_picker',
  [PermissionTypes.MARKETPLACE]: 'com_admin_permission_marketplace',
  [PermissionTypes.FILE_SEARCH]: 'com_admin_permission_file_search',
  [PermissionTypes.FILE_CITATIONS]: 'com_admin_permission_file_citations',
  [PermissionTypes.MCP_SERVERS]: 'com_admin_permission_mcp_servers',
  [PermissionTypes.REMOTE_AGENTS]: 'com_admin_permission_remote_agents',
};

const permissionLabels: Record<string, string> = {
  [Permissions.USE]: 'com_admin_perm_use',
  [Permissions.CREATE]: 'com_admin_perm_create',
  [Permissions.UPDATE]: 'com_admin_perm_update',
  [Permissions.READ]: 'com_admin_perm_read',
  [Permissions.SHARE]: 'com_admin_perm_share',
  [Permissions.SHARE_PUBLIC]: 'com_admin_perm_share_public',
  [Permissions.OPT_OUT]: 'com_admin_perm_opt_out',
  [Permissions.VIEW_USERS]: 'com_admin_perm_view_users',
  [Permissions.VIEW_GROUPS]: 'com_admin_perm_view_groups',
  [Permissions.VIEW_ROLES]: 'com_admin_perm_view_roles',
};

const permissionTypeToMutation: Record<string, string> = {
  [PermissionTypes.PROMPTS]: 'prompts',
  [PermissionTypes.AGENTS]: 'agents',
  [PermissionTypes.MEMORIES]: 'memories',
  [PermissionTypes.PEOPLE_PICKER]: 'people-picker',
  [PermissionTypes.MCP_SERVERS]: 'mcp-servers',
  [PermissionTypes.MARKETPLACE]: 'marketplace',
  [PermissionTypes.REMOTE_AGENTS]: 'remote-agents',
};

interface PermissionsEditorProps {
  roleName: string;
}

export default function PermissionsEditor({ roleName }: PermissionsEditorProps) {
  const localize = useLocalize();
  const { data: role, isLoading, isError } = useGetRole(roleName);
  const [localPerms, setLocalPerms] = useState<Record<string, Record<string, boolean>>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const promptMutation = useUpdatePromptPermissionsMutation();
  const agentMutation = useUpdateAgentPermissionsMutation();
  const memoryMutation = useUpdateMemoryPermissionsMutation();
  const peoplePickerMutation = useUpdatePeoplePickerPermissionsMutation();
  const mcpServersMutation = useUpdateMCPServersPermissionsMutation();
  const marketplaceMutation = useUpdateMarketplacePermissionsMutation();
  const remoteAgentsMutation = useUpdateRemoteAgentsPermissionsMutation();

  useEffect(() => {
    if (role?.permissions) {
      setLocalPerms(role.permissions as Record<string, Record<string, boolean>>);
    }
  }, [role]);

  if (isLoading) {
    return <div className="p-4 text-sm text-token-text-secondary">{localize('com_ui_loading')}</div>;
  }

  if (isError || !role) {
    return (
      <div className="p-4 text-sm text-red-500">
        {localize('com_admin_role_not_found')}
      </div>
    );
  }

  const handleToggle = (permType: string, perm: string, value: boolean) => {
    setLocalPerms((prev) => ({
      ...prev,
      [permType]: {
        ...prev[permType],
        [perm]: value,
      },
    }));
  };

  const getMutationForType = (permType: string) => {
    switch (permType) {
      case PermissionTypes.PROMPTS:
        return promptMutation;
      case PermissionTypes.AGENTS:
        return agentMutation;
      case PermissionTypes.MEMORIES:
        return memoryMutation;
      case PermissionTypes.PEOPLE_PICKER:
        return peoplePickerMutation;
      case PermissionTypes.MCP_SERVERS:
        return mcpServersMutation;
      case PermissionTypes.MARKETPLACE:
        return marketplaceMutation;
      case PermissionTypes.REMOTE_AGENTS:
        return remoteAgentsMutation;
      default:
        return null;
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    const savableTypes = Object.keys(permissionTypeToMutation);
    try {
      await Promise.all(
        savableTypes.map((permType) => {
          const mutation = getMutationForType(permType);
          if (!mutation || !localPerms[permType]) {
            return Promise.resolve();
          }
          return mutation.mutateAsync({
            roleName,
            updates: localPerms[permType],
          });
        }),
      );
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      setSaveError(localize('com_admin_save_error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-token-text-primary">
          {localize('com_admin_permissions_editor')} — {roleName}
        </h2>
        <div className="flex items-center gap-2">
          {saveSuccess && (
            <span className="text-sm text-green-500">{localize('com_ui_saved')}</span>
          )}
          {saveError && <span className="text-sm text-red-500">{saveError}</span>}
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded bg-green-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {saving ? localize('com_ui_saving') : localize('com_ui_save')}
          </button>
        </div>
      </div>

      {Object.values(PermissionTypes).map((permType) => {
        const perms = localPerms[permType] ?? {};
        const permKeys = Object.keys(perms);

        if (permKeys.length === 0) {
          return null;
        }

        return (
          <div key={permType} className="rounded-lg border border-border-medium p-4">
            <h3 className="mb-3 text-sm font-medium text-token-text-primary">
              {localize(permissionTypeLabels[permType] as Parameters<typeof localize>[0]) || permType}
            </h3>
            <div className="space-y-2">
              {permKeys.map((perm) => (
                <div key={perm} className="flex items-center justify-between">
                  <span className="text-sm text-token-text-secondary">
                    {localize(permissionLabels[perm] as Parameters<typeof localize>[0]) || perm}
                  </span>
                  <Switch
                    checked={!!perms[perm]}
                    onCheckedChange={(val) => handleToggle(permType, perm, val)}
                    aria-label={perm}
                  />
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
