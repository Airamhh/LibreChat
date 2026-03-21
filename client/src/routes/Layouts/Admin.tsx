import React from 'react';
import { Navigate, NavLink, Outlet } from 'react-router-dom';
import { SystemRoles } from 'librechat-data-provider';
import { useAuthContext } from '~/hooks/AuthContext';
import { useLocalize } from '~/hooks';

export default function AdminLayout() {
  const { user, isAuthenticated } = useAuthContext();
  const localize = useLocalize();

  if (!isAuthenticated || user?.role !== SystemRoles.ADMIN) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex h-screen">
      <aside className="w-48 shrink-0 border-r border-border-medium bg-surface-primary p-4">
        <h1 className="mb-4 text-sm font-semibold text-token-text-primary">
          {localize('com_ui_admin_settings')}
        </h1>
        <nav className="space-y-1">
          <NavLink
            to="/admin/users"
            className={({ isActive }) =>
              `block rounded px-3 py-2 text-sm ${
                isActive
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100'
                  : 'text-token-text-primary hover:bg-surface-hover'
              }`
            }
          >
            {localize('com_admin_users')}
          </NavLink>
          <NavLink
            to="/admin/roles"
            className={({ isActive }) =>
              `block rounded px-3 py-2 text-sm ${
                isActive
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100'
                  : 'text-token-text-primary hover:bg-surface-hover'
              }`
            }
          >
            {localize('com_admin_roles')}
          </NavLink>
          <NavLink
            to="/admin/config"
            className={({ isActive }) =>
              `block rounded px-3 py-2 text-sm ${
                isActive
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100'
                  : 'text-token-text-primary hover:bg-surface-hover'
              }`
            }
          >
            {localize('com_admin_yaml_editor')}
          </NavLink>
        </nav>
      </aside>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
