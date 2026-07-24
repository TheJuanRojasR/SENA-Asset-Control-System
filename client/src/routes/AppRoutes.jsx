import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore.js';
import { ProtectedRoute } from '../components/common/ProtectedRoute.jsx';
import { Layout } from '../components/common/Layout.jsx';
import { LoginPage } from '../pages/LoginPage.jsx';
import { AdminDashboard } from '../pages/AdminDashboard.jsx';
import { InstructorDashboard } from '../pages/InstructorDashboard.jsx';
import { NotFoundPage } from '../pages/NotFoundPage.jsx';
import { ROLES } from '../constants/roles.js';

// Admin pages
import { InstructorsPage } from '../pages/admin/InstructorsPage.jsx';
import { EnvironmentsPage } from '../pages/admin/EnvironmentsPage.jsx';
import { CatalogPage as AdminCatalogPage } from '../pages/admin/CatalogPage.jsx';
import { InventoryPage } from '../pages/admin/InventoryPage.jsx';
import { RequestsPage } from '../pages/admin/RequestsPage.jsx';
import { RequestReviewPage } from '../pages/admin/RequestReviewPage.jsx';
import { LoansPage } from '../pages/admin/LoansPage.jsx';

// Instructor pages
import { CatalogPage as InstructorCatalogPage } from '../pages/instructor/CatalogPage.jsx';
import { MyRequestsPage } from '../pages/instructor/MyRequestsPage.jsx';
import { CartPage } from '../pages/instructor/CartPage.jsx';

export function AppRoutes() {
  const { isAuthenticated, user } = useAuthStore();

  return (
    <Routes>
      <Route
        path="/login"
        element={
          isAuthenticated ? (
            <Navigate to={user?.role === ROLES.ADMIN ? '/admin' : '/instructor'} replace />
          ) : (
            <LoginPage />
          )
        }
      />

      <Route element={<ProtectedRoute allowedRoles={[ROLES.ADMIN]} />}>
        <Route element={<Layout />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/instructores" element={<InstructorsPage />} />
          <Route path="/admin/catalogo" element={<AdminCatalogPage />} />
          <Route path="/admin/inventario" element={<InventoryPage />} />
          <Route path="/admin/solicitudes" element={<RequestsPage />} />
          <Route path="/admin/solicitudes/:id" element={<RequestReviewPage />} />
          <Route path="/admin/prestamos" element={<LoansPage />} />
          <Route path="/admin/ambientes" element={<EnvironmentsPage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute allowedRoles={[ROLES.INSTRUCTOR]} />}>
        <Route element={<Layout />}>
          <Route path="/instructor" element={<InstructorDashboard />} />
          <Route path="/instructor/catalogo" element={<InstructorCatalogPage />} />
          <Route path="/instructor/solicitudes" element={<MyRequestsPage />} />
          <Route path="/instructor/carrito" element={<CartPage />} />
        </Route>
      </Route>

      <Route
        path="/"
        element={
          isAuthenticated ? (
            <Navigate to={user?.role === ROLES.ADMIN ? '/admin' : '/instructor'} replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
