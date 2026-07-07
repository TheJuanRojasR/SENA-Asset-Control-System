import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Grid, Paper, Box, Typography, Button, Chip, Skeleton } from '@mui/material';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import RequestQuoteIcon from '@mui/icons-material/RequestQuote';
import InventoryIcon from '@mui/icons-material/Inventory';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { PageContainer } from '../components/ui/PageContainer.jsx';
import { DashboardCard } from '../components/ui/DashboardCard.jsx';
import { useAuthStore } from '../stores/authStore.js';
import { useCartStore } from '../stores/cartStore.js';
import { requestsApi } from '../api/requests.api.js';
import { extractListData } from '../utils/api.js';
import {
  REQUEST_STATUS_LABELS,
  REQUEST_STATUS_COLORS,
  REQUEST_STATUS,
} from '../constants/requests.js';
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

const FINAL_STATUSES = [
  REQUEST_STATUS.COMPLETED,
  REQUEST_STATUS.CANCELLED,
  REQUEST_STATUS.REJECTED,
];

export function InstructorDashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { getTotalItems } = useCartStore();
  const cartCount = getTotalItems();

  const { data: requests, isLoading: requestsLoading } = useQuery({
    queryKey: ['my-requests', 'dashboard'],
    queryFn: () => requestsApi.getAll(),
    select: extractListData,
  });

  const safeRequests = useMemo(() => (Array.isArray(requests) ? requests : []), [requests]);

  const activeRequestsCount = useMemo(
    () => safeRequests.filter((r) => !FINAL_STATUSES.includes(r.status)).length,
    [safeRequests]
  );

  const pendingReturnsCount = useMemo(
    () => safeRequests.filter((r) => r.status === REQUEST_STATUS.DELIVERED).length,
    [safeRequests]
  );

  const recentRequests = useMemo(() => {
    return [...safeRequests]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 4);
  }, [safeRequests]);

  return (
    <PageContainer title={`Hola, ${user?.fullName?.split(' ')[0] || 'Instructor'}`}>
      <Typography variant="body1" className="text-gray-500 mb-6">
        Aquí puedes ver el resumen de tu actividad y el estado de tus solicitudes.
      </Typography>

      <Grid container spacing={3} className="mb-8">
        <Grid item xs={12} sm={6} md={4}>
          <DashboardCard
            icon={<ShoppingCartIcon />}
            value={cartCount}
            label="Elementos en carrito"
            description={cartCount > 0 ? 'Listos para solicitar' : 'Carrito vacío'}
            color="green"
            onClick={() => navigate('/instructor/carrito')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <DashboardCard
            icon={<RequestQuoteIcon />}
            value={activeRequestsCount}
            label="Solicitudes activas"
            description="En curso"
            color="blue"
            loading={requestsLoading}
            onClick={() => navigate('/instructor/solicitudes')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <DashboardCard
            icon={<InventoryIcon />}
            value={pendingReturnsCount}
            label="Devoluciones pendientes"
            description="Ítems entregados"
            color="orange"
            loading={requestsLoading}
            onClick={() => navigate('/instructor/solicitudes')}
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} lg={7}>
          <Paper className="p-5 rounded-2xl shadow-sm border border-gray-100 h-full">
            <Box className="flex justify-between items-center mb-4">
              <Typography variant="h6" className="font-bold">
                Tus solicitudes recientes
              </Typography>
              <Button
                size="small"
                endIcon={<ArrowForwardIcon />}
                onClick={() => navigate('/instructor/solicitudes')}
                sx={{ color: SENA_COLORS.green, textTransform: 'none' }}
              >
                Ver todas
              </Button>
            </Box>

            {requestsLoading ? (
              <Box className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} variant="rounded" height={60} />
                ))}
              </Box>
            ) : recentRequests.length === 0 ? (
              <Box className="text-center py-10">
                <RequestQuoteIcon sx={{ fontSize: 48, color: SENA_COLORS.green, mb: 1 }} />
                <Typography variant="body1" className="text-gray-500 mb-3">
                  Aún no tienes solicitudes registradas.
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => navigate('/instructor/catalogo')}
                  sx={{
                    backgroundColor: SENA_COLORS.green,
                    '&:hover': { backgroundColor: SENA_COLORS.greenDark },
                    textTransform: 'none',
                  }}
                >
                  Crear solicitud
                </Button>
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
                      onClick={() => navigate('/instructor/solicitudes')}
                    >
                      <Box>
                        <Typography variant="subtitle2" className="font-bold text-sena-black">
                          {request.code || `Solicitud #${request.id}`}
                        </Typography>
                        <Typography variant="body2" className="text-gray-500">
                          {formatDate(request.createdAt)} —{' '}
                          {Array.isArray(request.items) ? request.items.length : 0} ítems
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
                  title="Nueva solicitud"
                  description="Agregar ítems del catálogo"
                  onClick={() => navigate('/instructor/catalogo')}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <QuickActionCard
                  icon={<VisibilityIcon />}
                  title="Ver catálogo"
                  description="Explorar ítems disponibles"
                  onClick={() => navigate('/instructor/catalogo')}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <QuickActionCard
                  icon={<ShoppingCartIcon />}
                  title="Carrito"
                  description={`${cartCount} elemento${cartCount !== 1 ? 's' : ''} agregado${cartCount !== 1 ? 's' : ''}`}
                  onClick={() => navigate('/instructor/carrito')}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <QuickActionCard
                  icon={<RequestQuoteIcon />}
                  title="Mis solicitudes"
                  description="Revisar estado y devoluciones"
                  onClick={() => navigate('/instructor/solicitudes')}
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
