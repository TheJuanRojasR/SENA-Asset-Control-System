import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Button,
  TextField,
  IconButton,
  Divider,
  Alert,
  CircularProgress,
  MenuItem,
  Stack,
  Chip,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import SendIcon from '@mui/icons-material/Send';
import InventoryIcon from '@mui/icons-material/Inventory';
import { motion, AnimatePresence } from 'framer-motion';
import { PageContainer } from '../../components/ui/PageContainer.jsx';
import { Toast } from '../../components/ui/Toast.jsx';
import { useToast } from '../../hooks/useToast.js';
import { useCartValidation } from '../../hooks/useCartValidation.js';
import { useCartStore } from '../../stores/cartStore.js';
import { useAuthStore } from '../../stores/authStore.js';
import { requestsApi } from '../../api/requests.api.js';
import { environmentsApi } from '../../api/environments.api.js';
import { extractListData } from '../../utils/api.js';
import { parseApiError, API_ERROR_TYPES } from '../../utils/errorHandler.js';
import { SENA_COLORS } from '../../constants/theme.js';
import { SHIFT_OPTIONS } from '../../constants/inventory.js';

export function CartPage() {
  const { items, updateQty, removeItem, clearCart, syncWithCatalog, getTotalItems } =
    useCartStore();
  const { user } = useAuthStore();
  const [message, setMessage] = useState(null);
  const [environmentId, setEnvironmentId] = useState('');
  const [shift, setShift] = useState(user?.shift || '');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast, showToast, hideToast } = useToast();
  const totalItems = getTotalItems();

  const { data: environments, isLoading: environmentsLoading } = useQuery({
    queryKey: ['environments'],
    queryFn: () => environmentsApi.getAll(),
    select: extractListData,
  });

  // Validación de stock en tiempo real contra el catálogo (caché compartido).
  const { issues, hasIssues, isValidating, validationFailed, freshItems } =
    useCartValidation(items);

  // Reconcilia el carrito cuando llega el stock fresco: ajusta cantidades que
  // ya no tienen disponibilidad y notifica los cambios aplicados.
  useEffect(() => {
    if (freshItems.length === 0) return;
    const adjustments = syncWithCatalog(freshItems);
    if (adjustments.length > 0) {
      const removed = adjustments.filter((a) => a.newQty === 0);
      showToast(
        removed.length > 0
          ? `${removed.length} ítem(s) se quitaron por falta de disponibilidad`
          : 'Se ajustaron cantidades según la disponibilidad actual',
        'info'
      );
    }
  }, [freshItems, showToast, syncWithCatalog]);

  const safeEnvironments = useMemo(
    () => (Array.isArray(environments) ? environments : []),
    [environments]
  );

  useEffect(() => {
    if (user?.shift && !shift) {
      setShift(user.shift);
    }
  }, [user?.shift, shift]);

  const isValid = useMemo(
    () => items.length > 0 && environmentId && shift,
    [items.length, environmentId, shift]
  );

  const createRequestMutation = useMutation({
    mutationFn: (payload) => requestsApi.create(payload),
    retry: (failureCount, error) => {
      // Reintentar solo fallos de red o 5xx; nunca errores de negocio (4xx).
      const status = error?.response?.status;
      const retryable = !status || status >= 500;
      return retryable && failureCount < 2;
    },
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
    onSuccess: () => {
      clearCart();
      // Stock y listas cambiaron: refrescar catálogo y solicitudes.
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['my-requests'] });
      navigate('/instructor/solicitudes', {
        state: { toast: { message: 'Solicitud enviada correctamente', severity: 'success' } },
      });
    },
    onError: (error) => {
      const parsed = parseApiError(error, 'Error al enviar la solicitud. Inténtalo de nuevo.');
      setMessage({
        severity: parsed.type === API_ERROR_TYPES.NETWORK ? 'warning' : 'error',
        text: parsed.message,
      });
    },
  });

  const handleConfirm = () => {
    if (!isValid || createRequestMutation.isPending) return;

    setMessage(null);
    createRequestMutation.mutate({
      environmentId,
      shift,
      items: items.map(({ id, quantity }) => ({
        itemId: id,
        requestedQty: Number(quantity),
      })),
    });
  };

  const submitDisabled = createRequestMutation.isPending || !isValid || isValidating || hasIssues;

  return (
    <PageContainer
      title="Carrito de solicitudes"
      breadcrumbs={[{ label: 'Instructor', to: '/instructor' }, { label: 'Carrito' }]}
    >
      {message && (
        <Alert severity={message.severity} className="mb-4" onClose={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}

      {validationFailed && (
        <Alert severity="warning" className="mb-4">
          No se pudo verificar el stock actual. Puedes enviar la solicitud; el sistema la validará
          al confirmar.
        </Alert>
      )}

      {hasIssues && (
        <Alert severity="error" className="mb-4">
          <Typography variant="body2" className="font-bold mb-1">
            Algunos ítems ya no están disponibles:
          </Typography>
          <ul className="list-disc pl-5">
            {issues.map((issue) => (
              <li key={issue.itemId}>
                {issue.name} — solicitado: {issue.requested}, disponible: {issue.available}
                {issue.missing && (
                  <>
                    {' '}
                    <Button
                      size="small"
                      color="error"
                      onClick={() => removeItem(issue.itemId)}
                      sx={{ textTransform: 'none', fontWeight: 700 }}
                    >
                      Quitar
                    </Button>
                  </>
                )}
              </li>
            ))}
          </ul>
        </Alert>
      )}

      {items.length === 0 ? (
        <Paper className="p-8 text-center rounded-xl shadow-sm border border-gray-100">
          <ShoppingCartIcon sx={{ fontSize: 64, color: SENA_COLORS.green, mb: 2 }} />
          <Typography variant="h6" className="font-bold mb-2">
            Tu carrito está vacío
          </Typography>
          <Typography variant="body2" className="text-gray-500 mb-4">
            Explora el catálogo para agregar ítems a tu solicitud.
          </Typography>
          <Button
            variant="contained"
            size="large"
            onClick={() => navigate('/instructor/catalogo')}
            sx={{
              backgroundColor: SENA_COLORS.green,
              '&:hover': { backgroundColor: SENA_COLORS.greenDark },
            }}
          >
            Ver catálogo
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <AnimatePresence mode="popLayout">
              {items.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.25 }}
                >
                  <Paper className="p-4 mb-3 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
                    <Box className="h-16 w-16 rounded-lg bg-sena-green-light/30 flex items-center justify-center shrink-0">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="h-full w-full object-cover rounded-lg"
                        />
                      ) : (
                        <InventoryIcon sx={{ color: SENA_COLORS.green }} />
                      )}
                    </Box>

                    <Box className="flex-1 min-w-0">
                      <Typography variant="subtitle1" className="font-bold truncate">
                        {item.name}
                      </Typography>
                      <Typography variant="body2" className="text-gray-500">
                        Código: {item.code || 'N/A'}
                      </Typography>
                      <Chip
                        label={`Disponible: ${item.stock ?? 0}`}
                        size="small"
                        variant="outlined"
                        color={(item.stock ?? 0) > 0 ? 'success' : 'error'}
                        sx={{ mt: 0.5 }}
                      />
                    </Box>

                    <TextField
                      type="number"
                      size="small"
                      inputProps={{ min: 1, max: item.stock ?? 0 }}
                      value={item.quantity}
                      onChange={(e) => updateQty(item.id, e.target.value)}
                      className="w-20"
                      aria-label={`Cantidad de ${item.name}`}
                    />

                    <IconButton
                      onClick={() => removeItem(item.id)}
                      aria-label={`Eliminar ${item.name} del carrito`}
                      sx={{ color: '#D32F2F' }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Paper>
                </motion.div>
              ))}
            </AnimatePresence>
          </Grid>

          <Grid item xs={12} md={4}>
            <Paper className="p-5 rounded-xl shadow-sm border border-gray-100 sticky top-6">
              <Typography variant="h6" className="font-bold mb-4">
                Resumen
              </Typography>

              <Box className="flex justify-between mb-2">
                <Typography variant="body1">Total de ítems</Typography>
                <Typography variant="body1" className="font-bold">
                  {totalItems}
                </Typography>
              </Box>

              <Divider className="my-3" />

              <Stack spacing={2}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Ambiente"
                  value={environmentId}
                  onChange={(e) => setEnvironmentId(e.target.value)}
                  disabled={environmentsLoading}
                  className="mb-4"
                >
                  <MenuItem value="">
                    <em>Selecciona un ambiente</em>
                  </MenuItem>
                  {safeEnvironments.map((environment) => (
                    <MenuItem key={environment.id} value={environment.id}>
                      {environment.name}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Jornada"
                  value={shift}
                  onChange={(e) => setShift(e.target.value)}
                >
                  <MenuItem value="">
                    <em>Selecciona una jornada</em>
                  </MenuItem>
                  {SHIFT_OPTIONS.map((shiftOption) => (
                    <MenuItem key={shiftOption.value} value={shiftOption.value}>
                      {shiftOption.label}
                    </MenuItem>
                  ))}
                </TextField>

                {!isValid && (
                  <Alert severity="info" size="small">
                    Selecciona ambiente y jornada para continuar.
                  </Alert>
                )}

                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  endIcon={
                    createRequestMutation.isPending ? (
                      <CircularProgress size={20} color="inherit" />
                    ) : (
                      <SendIcon />
                    )
                  }
                  disabled={submitDisabled}
                  onClick={handleConfirm}
                  sx={{
                    backgroundColor: SENA_COLORS.green,
                    '&:hover': { backgroundColor: SENA_COLORS.greenDark },
                  }}
                >
                  {createRequestMutation.isPending ? 'Enviando...' : 'Confirmar solicitud'}
                </Button>

                <Button
                  fullWidth
                  variant="outlined"
                  onClick={() => navigate('/instructor/catalogo')}
                  sx={{
                    color: SENA_COLORS.green,
                    borderColor: SENA_COLORS.green,
                    '&:hover': {
                      borderColor: SENA_COLORS.greenDark,
                      color: SENA_COLORS.greenDark,
                    },
                  }}
                >
                  Seguir agregando
                </Button>
              </Stack>
            </Paper>
          </Grid>
        </Grid>
      )}

      <Toast
        open={toast.open}
        message={toast.message}
        severity={toast.severity}
        onClose={hideToast}
      />
    </PageContainer>
  );
}
