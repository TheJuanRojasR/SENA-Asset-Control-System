import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Grid, Paper, Box, Typography, Button, Chip, Skeleton } from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import InventoryIcon from '@mui/icons-material/Inventory';
import RequestQuoteIcon from '@mui/icons-material/RequestQuote';
import WarningIcon from '@mui/icons-material/Warning';
import AddIcon from '@mui/icons-material/Add';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import CategoryIcon from '@mui/icons-material/Category';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { PageContainer } from '../components/ui/PageContainer.jsx';
import { DashboardCard } from '../components/ui/DashboardCard.jsx';
import { useAuthStore } from '../stores/authStore.js';
import { usersApi } from '../api/users.api.js';
import { itemsApi } from '../api/items.api.js';
import { requestsApi } from '../api/requests.api.js';
import { extractListData } from '../utils/api.js';
import {
  REQUEST_STATUS_LABELS,
  REQUEST_STATUS_COLORS,
  REQUEST_STATUS,
} from '../constants/requests.js';
import { ROLES } from '../constants/roles.js';
import { SENA_COLORS } from '../constants/theme.js';

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  return date.toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function AdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['users', 'dashboard'],
    queryFn: () => usersApi.getAll({ role: ROLES.INSTRUCTOR }),
    select: extractListData,
  });

  const { data: items, isLoading: itemsLoading } = useQuery({
    queryKey: ['items', 'dashboard'],
    queryFn: () => itemsApi.getAll(),
    select: extractListData,
  });

  const { data: requests, isLoading: requestsLoading } = useQuery({
    queryKey: ['requests', 'dashboard'],
    queryFn: () => requestsApi.getAll(),
    select: extractListData,
  });

  const safeUsers = useMemo(() => (Array.isArray(users) ? users : []), [users]);
  const safeItems = useMemo(() => (Array.isArray(items) ? items : []), [items]);
  const safeRequests = useMemo(() => (Array.isArray(requests) ? requests : []), [requests]);

  const instructorsCount = safeUsers.length;
  const itemsCount = safeItems.length;
  const pendingRequestsCount = safeRequests.filter(
    (r) => r.status === REQUEST_STATUS.PENDING
  ).length;
  const lowStockItems = useMemo(
    () =>
      safeItems.filter((item) => {
        const stock = item.stock ?? 0;
        const min = item.minStock ?? 0;
        return stock <= min && min > 0;
      }),
    [safeItems]
  );

  const recentRequests = useMemo(() => {
    return [...safeRequests]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5);
  }, [safeRequests]);

  const isLoading = usersLoading || itemsLoading || requestsLoading;

  return (
    <PageContainer title={`Hola, ${user?.fullName?.split(' ')[0] || 'Administrador'}`}>
      <Typography variant="body1" className="text-gray-500 mb-6">
        Este es el estado actual del inventario del Ambiente 104.
      </Typography>

      <Grid container spacing={3} className="mb-8">
        <Grid item xs={12} sm={6} md={3}>
          <DashboardCard
            icon={<PeopleIcon />}
            value={instructorsCount}
            label="Instructores"
            description="Activos en el sistema"
            color="green"
            loading={usersLoading}
            onClick={() => navigate('/admin/instructores')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <DashboardCard
            icon={<InventoryIcon />}
            value={itemsCount}
            label="Ítems en catálogo"
            description="Referencia de inventario"
            color="blue"
            loading={itemsLoading}
            onClick={() => navigate('/admin/catalogo')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <DashboardCard
            icon={<RequestQuoteIcon />}
            value={pendingRequestsCount}
            label="Solicitudes pendientes"
            description="Por revisar"
            color="orange"
            loading={requestsLoading}
            onClick={() => navigate('/admin/solicitudes')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <DashboardCard
            icon={<WarningIcon />}
            value={lowStockItems.length}
            label="Alertas de stock"
            description="Ítems con stock bajo"
            color="red"
            loading={itemsLoading}
            onClick={() => navigate('/admin/inventario')}
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} lg={7}>
          <Paper className="p-5 rounded-2xl shadow-sm border border-gray-100 h-full">
            <Box className="flex justify-between items-center mb-4">
              <Typography variant="h6" className="font-bold">
                Actividad reciente
              </Typography>
              <Button
                size="small"
                endIcon={<ArrowForwardIcon />}
                onClick={() => navigate('/admin/solicitudes')}
                sx={{ color: SENA_COLORS.green, textTransform: 'none' }}
              >
                Ver todas
              </Button>
            </Box>

            {isLoading ? (
              <Box className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} variant="rounded" height={60} />
                ))}
              </Box>
            ) : recentRequests.length === 0 ? (
              <Box className="text-center py-10">
                <RequestQuoteIcon sx={{ fontSize: 48, color: SENA_COLORS.green, mb: 1 }} />
                <Typography variant="body1" className="text-gray-500">
                  Aún no hay solicitudes registradas.
                </Typography>
              </Box>
            ) : (
              <Box className="space-y-3">
                {recentRequests.map((request, index) => (
                  <motion.div
                    key={request.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.25, delay: index * 0.05 }}
                  >
                    <Box
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => navigate(`/admin/solicitudes/${request.id}`)}
                    >
                      <Box>
                        <Typography variant="subtitle2" className="font-bold text-sena-black">
                          {request.code || `Solicitud #${request.id}`}
                        </Typography>
                        <Typography variant="body2" className="text-gray-500">
                          {request.requesterName || request.requesterDocument || 'Instructor'} —{' '}
                          {formatDate(request.createdAt)}
                        </Typography>
                      </Box>
                      <Chip
                        label={REQUEST_STATUS_LABELS[request.status] || request.status}
                        color={REQUEST_STATUS_COLORS[request.status] || 'default'}
                        size="small"
                        sx={{ fontWeight: 600, width: 'fit-content' }}
                      />
                    </Box>
                  </motion.div>
                ))}
              </Box>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} lg={5}>
          <Paper className="p-5 rounded-2xl shadow-sm border border-gray-100 h-full">
            <Typography variant="h6" className="font-bold mb-4">
              Accesos rápidos
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <QuickActionCard
                  icon={<AddIcon />}
                  title="Crear instructor"
                  description="Agregar un nuevo instructor al sistema"
                  onClick={() => navigate('/admin/instructores')}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <QuickActionCard
                  icon={<MeetingRoomIcon />}
                  title="Ambientes"
                  description="Gestionar ambientes de formación"
                  onClick={() => navigate('/admin/ambientes')}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <QuickActionCard
                  icon={<CategoryIcon />}
                  title="Catálogo"
                  description="Ítems y categorías disponibles"
                  onClick={() => navigate('/admin/catalogo')}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <QuickActionCard
                  icon={<InventoryIcon />}
                  title="Inventario"
                  description="Unidades, seriales y estados"
                  onClick={() => navigate('/admin/inventario')}
                />
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </PageContainer>
  );
}

function QuickActionCard({ icon, title, description, onClick }) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 300 }}
      onClick={onClick}
      className="h-full cursor-pointer"
    >
      <Box className="p-4 rounded-xl border border-gray-100 bg-white hover:shadow-md transition-shadow h-full">
        <Box className="text-sena-green mb-2">{icon}</Box>
        <Typography variant="subtitle2" className="font-bold text-sena-black">
          {title}
        </Typography>
        <Typography variant="caption" className="text-gray-500 block">
          {description}
        </Typography>
      </Box>
    </motion.div>
  );
}
