import { useMutation, useQueryClient } from '@tanstack/react-query';
import { QueryKeys, dataService } from 'librechat-data-provider';
import type { UseMutationResult } from '@tanstack/react-query';
import type {
  TRole,
  TAdminUser,
  TAdminUserUpdate,
  TAdminBanPayload,
  TAdminBalance,
  TAdminBalanceUpdate,
  TCreateRolePayload,
  TError,
} from 'librechat-data-provider';

export const useCreateRoleMutation = (): UseMutationResult<
  TRole,
  TError,
  TCreateRolePayload
> => {
  const queryClient = useQueryClient();
  return useMutation(
    (payload) => dataService.createRole(payload),
    {
      onSuccess: () => {
        queryClient.invalidateQueries([QueryKeys.adminRoles]);
      },
    },
  );
};

export const useDeleteRoleMutation = (): UseMutationResult<void, TError, string> => {
  const queryClient = useQueryClient();
  return useMutation((name) => dataService.deleteRole(name), {
    onSuccess: () => {
      queryClient.invalidateQueries([QueryKeys.adminRoles]);
    },
  });
};

export const useRenameRoleMutation = (): UseMutationResult<
  TRole,
  TError,
  { name: string; newName: string }
> => {
  const queryClient = useQueryClient();
  return useMutation(({ name, newName }) => dataService.renameRole(name, newName), {
    onSuccess: () => {
      queryClient.invalidateQueries([QueryKeys.adminRoles]);
    },
  });
};

export const useUpdateAdminUserMutation = (): UseMutationResult<
  TAdminUser,
  TError,
  { userId: string; updates: TAdminUserUpdate }
> => {
  const queryClient = useQueryClient();
  return useMutation(
    ({ userId, updates }) => dataService.updateAdminUser(userId, updates),
    {
      onSuccess: () => {
        queryClient.invalidateQueries([QueryKeys.adminUsers]);
      },
    },
  );
};

export const useBanUserMutation = (): UseMutationResult<
  void,
  TError,
  { userId: string; payload?: TAdminBanPayload }
> => {
  const queryClient = useQueryClient();
  return useMutation(
    ({ userId, payload }) => dataService.banUser(userId, payload),
    {
      onSuccess: () => {
        queryClient.invalidateQueries([QueryKeys.adminUsers]);
      },
    },
  );
};

export const useUnbanUserMutation = (): UseMutationResult<void, TError, string> => {
  const queryClient = useQueryClient();
  return useMutation((userId) => dataService.unbanUser(userId), {
    onSuccess: () => {
      queryClient.invalidateQueries([QueryKeys.adminUsers]);
    },
  });
};

export const useUpdateAdminUserBalanceMutation = (): UseMutationResult<
  TAdminBalance,
  TError,
  { userId: string; updates: TAdminBalanceUpdate }
> => {
  const queryClient = useQueryClient();
  return useMutation(
    ({ userId, updates }) => dataService.updateAdminUserBalance(userId, updates),
    {
      onSuccess: (_data, { userId }) => {
        queryClient.invalidateQueries([QueryKeys.adminUsers, userId, 'balance']);
      },
    },
  );
};

export const useUpdateAdminConfigMutation = (): UseMutationResult<
  { message: string },
  TError,
  string
> => {
  return useMutation((yamlContent) => dataService.updateAdminConfig(yamlContent));
};
