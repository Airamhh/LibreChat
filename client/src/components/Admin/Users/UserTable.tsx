import React, { useState } from 'react';
import { useLocalize } from '~/hooks';
import { useListAdminUsers } from '~/data-provider/Admin';
import type { TAdminUser } from 'librechat-data-provider';
import UserEditForm from './UserEditForm';

export default function UserTable() {
  const localize = useLocalize();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [selectedUser, setSelectedUser] = useState<TAdminUser | null>(null);

  const { data, isLoading } = useListAdminUsers({ page, limit: 20, search });

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
  };

  return (
    <div className="space-y-4">
      {selectedUser ? (
        <UserEditForm user={selectedUser} onClose={() => setSelectedUser(null)} />
      ) : (
        <>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-token-text-primary">
              {localize('com_admin_users')}
            </h2>
            <div className="ml-auto flex gap-2">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={localize('com_nav_search')}
                className="rounded border border-border-medium bg-surface-primary px-3 py-1.5 text-sm text-token-text-primary focus:outline-none"
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <button
                onClick={handleSearch}
                className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
              >
                {localize('com_nav_search')}
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="text-sm text-token-text-secondary">{localize('com_ui_loading')}</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border-medium text-token-text-secondary">
                      <th className="pb-2 pr-4 font-medium">{localize('com_auth_full_name')}</th>
                      <th className="pb-2 pr-4 font-medium">{localize('com_auth_email')}</th>
                      <th className="pb-2 pr-4 font-medium">{localize('com_admin_role')}</th>
                      <th className="pb-2 font-medium">{localize('com_ui_actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.users ?? []).map((user) => (
                      <tr
                        key={user._id}
                        className="border-b border-border-light text-token-text-primary"
                      >
                        <td className="py-2 pr-4">{user.name ?? '—'}</td>
                        <td className="py-2 pr-4">{user.email}</td>
                        <td className="py-2 pr-4">{user.role ?? '—'}</td>
                        <td className="py-2">
                          <button
                            onClick={() => setSelectedUser(user)}
                            className="text-blue-500 hover:underline"
                          >
                            {localize('com_ui_edit')}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between text-sm text-token-text-secondary">
                <span>
                  {localize('com_admin_total_users')}: {data?.total ?? 0}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="rounded border border-border-medium px-3 py-1 hover:bg-surface-hover disabled:opacity-50"
                  >
                    ‹
                  </button>
                  <span>
                    {page} / {data?.pages ?? 1}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(data?.pages ?? 1, p + 1))}
                    disabled={page >= (data?.pages ?? 1)}
                    className="rounded border border-border-medium px-3 py-1 hover:bg-surface-hover disabled:opacity-50"
                  >
                    ›
                  </button>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
