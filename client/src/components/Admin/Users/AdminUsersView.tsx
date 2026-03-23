import React from 'react';
import { UserTable } from '~/components/Admin';
import { useLocalize } from '~/hooks';

export default function AdminUsersView() {
  const localize = useLocalize();
  return (
    <div className="p-6">
      <h2 className="mb-6 text-lg font-semibold text-token-text-primary">
        {localize('com_admin_users')}
      </h2>
      <UserTable />
    </div>
  );
}
