import React from 'react';
import { UserTable } from '~/components/Admin';

export default function AdminUsersView() {
  return (
    <div className="container mx-auto p-6">
      <UserTable />
    </div>
  );
}
