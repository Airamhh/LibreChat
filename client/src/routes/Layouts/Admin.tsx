import React from 'react';
import { Navigate, NavLink, Outlet, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { SystemRoles } from 'librechat-data-provider';
import { useAuthContext } from '~/hooks/AuthContext';
import { useLocalize } from '~/hooks';

export default function AdminLayout() {
  const { user, isAuthenticated } = useAuthContext();
  const localize = useLocalize();

  if (!isAuthenticated || user?.role !== SystemRoles.ADMIN) {
    return <Navigate to="/" replace />;
  }

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
      isActive
        ? 'bg-blue-600 text-white'
        : 'text-token-text-secondary hover:bg-surface-hover hover:text-token-text-primary'
    }`;

  return (
    <div className="flex h-screen bg-surface-secondary">
      <aside className="flex w-52 shrink-0 flex-col border-r border-border-medium bg-surface-primary">
        <div className="border-b border-border-medium p-4">
          <h1 className="text-sm font-bold text-token-text-primary">
            {localize('com_ui_admin_settings')}
          </h1>
          <p className="mt-0.5 text-xs text-token-text-tertiary">{user?.email}</p>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          <NavLink to="/admin/users" className={navLinkClass}>
            {localize('com_admin_users')}
          </NavLink>
          <NavLink to="/admin/roles" className={navLinkClass}>
            {localize('com_admin_roles')}
          </NavLink>
          <NavLink to="/admin/config" className={navLinkClass}>
            {localize('com_admin_config')}
          </NavLink>
        </nav>

        <div className="border-t border-border-medium p-3">
          <Link
            to="/"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-token-text-secondary transition-colors hover:bg-surface-hover hover:text-token-text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            {localize('com_admin_back_to_chat')}
          </Link>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
