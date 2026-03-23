import React from 'react';
import { RoleList } from '~/components/Admin';
import { useLocalize } from '~/hooks';

export default function AdminRolesView() {
  const localize = useLocalize();
  return (
    <div className="p-6">
      <h2 className="mb-6 text-lg font-semibold text-token-text-primary">
        {localize('com_admin_roles')}
      </h2>
      <RoleList />
    </div>
  );
}
