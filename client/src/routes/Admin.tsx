import { Navigate } from 'react-router-dom';
import AdminUsersView from '~/components/Admin/Users/AdminUsersView';
import AdminRolesView from '~/components/Admin/Roles/AdminRolesView';
import AdminConfigView from '~/components/Admin/Config/AdminConfigView';
import AdminLayout from './Layouts/Admin';

const adminRoutes = {
  path: 'admin',
  element: <AdminLayout />,
  children: [
    {
      index: true,
      element: <Navigate to="/admin/users" replace />,
    },
    {
      path: 'users',
      element: <AdminUsersView />,
    },
    {
      path: 'roles',
      element: <AdminRolesView />,
    },
    {
      path: 'config',
      element: <AdminConfigView />,
    },
  ],
};

export default adminRoutes;
