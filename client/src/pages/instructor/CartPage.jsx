import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
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
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import SendIcon from '@mui/icons-material/Send';
import InventoryIcon from '@mui/icons-material/Inventory';
import { motion, AnimatePresence } from 'framer-motion';
import { PageContainer } from '../../components/ui/PageContainer.jsx';
import { useCartStore } from '../../stores/cartStore.js';
import { useAuthStore } from '../../stores/authStore.js';
import { requestsApi } from '../../api/requests.api.js';
import { environmentsApi } from '../../api/environments.api.js';
import { extractListData } from '../../utils/api.js';
import { SENA_COLORS } from '../../constants/theme.js';
import { SHIFT_OPTIONS } from '../../constants/inventory.js';

export function CartPage() {
  const { items, updateQty, removeItem, clearCart, getTotalItems } = useCartStore();
  const { user } = useAuthStore();
  const [message, setMessage] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [environmentId, setEnvironmentId] = useState('');
  const [shift, setShift] = useState(user?.shift || '');
  const navigate = useNavigate();
  const totalItems = getTotalItems();

  const { data: environments, isLoading: environmentsLoading } = useQuery({
    queryKey: ['environments'],
    queryFn: () => environmentsApi.getAll(),
    select: extractListData,
  });

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

  const handleConfirm = async () => {
    if (items.length === 0 || !isValid) return;

    setSubmitting(true);
    setMessage(null);

    try {
      const payload = {
        environmentId,
        shift,
        items: items.map(({ id, quantity }) => ({
          itemId: id,
          requestedQty: Number(quantity),
        })),
      };

      await requestsApi.create(payload);
      clearCart();
      navigate('/instructor/solicitudes', {
        state: { toast: { message: 'Solicitud enviada correctamente', severity: 'success' } },
      });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error?.response?.data?.message || 'Error al enviar la solicitud. Inténtalo de nuevo.',
      });
      setSubmitting(false);
    }
  };

  return (
    <PageContainer
      title="Carrito de solicitudes"
      breadcrumbs={[{ label: 'Instructor', to: '/instructor' }, { label: 'Carrito' }]}
    >
      {message && (
        <Alert severity={message.type} className="mb-4">
          {message.text}
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
                    </Box>

                    <TextField
                      type="number"
                      size="small"
                      inputProps={{ min: 1, max: item.stock ?? 0 }}
                      value={item.quantity}
                      onChange={(e) => updateQty(item.id, e.target.value)}
                      className="w-20"
                    />

                    <IconButton
                      onClick={() => removeItem(item.id)}
                      aria-label="Eliminar ítem"
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
                    submitting ? <CircularProgress size={20} color="inherit" /> : <SendIcon />
                  }
                  disabled={submitting || !isValid}
                  onClick={handleConfirm}
                  sx={{
                    backgroundColor: SENA_COLORS.green,
                    '&:hover': { backgroundColor: SENA_COLORS.greenDark },
                  }}
                >
                  {submitting ? 'Enviando...' : 'Confirmar solicitud'}
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
    </PageContainer>
  );
}
