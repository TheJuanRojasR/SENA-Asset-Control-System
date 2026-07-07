import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Box, Button, Chip, Grid, IconButton, Paper, Tabs, Tab, Typography } from '@mui/material';
import RequestQuoteIcon from '@mui/icons-material/RequestQuote';
import CancelIcon from '@mui/icons-material/Cancel';
import { motion, AnimatePresence } from 'framer-motion';
import { PageContainer } from '../../components/ui/PageContainer.jsx';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.jsx';
import { Toast } from '../../components/ui/Toast.jsx';
import { useToast } from '../../hooks/useToast.js';
import { requestsApi } from '../../api/requests.api.js';
import { extractListData } from '../../utils/api.js';
import {
  REQUEST_STATUS,
  REQUEST_STATUS_LABELS,
  REQUEST_STATUS_COLORS,
  REQUEST_STATUS_LIST,
} from '../../constants/requests.js';
import { SENA_COLORS } from '../../constants/theme.js';

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  return date.toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function MyRequestsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { toast, showToast, hideToast } = useToast();
  const [activeTab, setActiveTab] = useState(0);
  const [cancelTarget, setCancelTarget] = useState(null);

  useEffect(() => {
    const stateToast = location.state?.toast;
    if (stateToast?.message) {
      showToast(stateToast.message, stateToast.severity || 'success');
      window.history.replaceState({}, document.title);
    }
  }, [location.state, showToast]);

  const {
    data: requests,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['my-requests'],
    queryFn: () => requestsApi.getAll(),
    select: extractListData,
  });

  const cancelMutation = useMutation({
    mutationFn: (id) => requestsApi.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-requests'] });
      showToast('Solicitud cancelada correctamente', 'success');
      setCancelTarget(null);
    },
    onError: (mutationError) => {
      showToast(
        mutationError?.response?.data?.message || 'Error al cancelar la solicitud',
        'error'
      );
      setCancelTarget(null);
    },
  });

  const safeRequests = useMemo(() => requests ?? [], [requests]);
  const currentStatus = REQUEST_STATUS_LIST[activeTab];

  const filteredRequests = useMemo(
    () => safeRequests.filter((request) => request.status === currentStatus),
    [safeRequests, currentStatus]
  );

  useEffect(() => {
    if (error) {
      showToast(error?.response?.data?.message || 'Error al cargar tus solicitudes', 'error');
    }
  }, [error, showToast]);

  const handleConfirmCancel = () => {
    if (cancelTarget) cancelMutation.mutate(cancelTarget.id);
  };

  return (
    <PageContainer
      title="Mis solicitudes"
      breadcrumbs={[{ label: 'Instructor', to: '/instructor' }, { label: 'Mis solicitudes' }]}
    >
      <Paper className="rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <Tabs
          value={activeTab}
          onChange={(_event, value) => setActiveTab(value)}
          textColor="primary"
          indicatorColor="primary"
          variant="scrollable"
          scrollButtons="auto"
        >
          {REQUEST_STATUS_LIST.map((status) => (
            <Tab
              key={status}
              label={REQUEST_STATUS_LABELS[status]}
              sx={{ textTransform: 'none' }}
            />
          ))}
        </Tabs>

        <Box className="p-5 min-h-[300px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStatus}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {isLoading ? (
                <Grid container spacing={3}>
                  {Array.from({ length: 3 }).map((_, index) => (
                    <Grid item xs={12} sm={6} md={4} key={index}>
                      <Paper className="p-4 rounded-xl border border-gray-100 shadow-sm h-40 animate-pulse bg-gray-100" />
                    </Grid>
                  ))}
                </Grid>
              ) : filteredRequests.length === 0 ? (
                <Box className="text-center py-10">
                  <RequestQuoteIcon sx={{ fontSize: 64, color: SENA_COLORS.green, mb: 2 }} />
                  <Typography variant="h6" className="font-bold mb-1">
                    No hay solicitudes {REQUEST_STATUS_LABELS[currentStatus].toLowerCase()}
                  </Typography>
                  <Typography variant="body2" className="text-gray-500 mb-4">
                    Cuando realices una solicitud aparecerá aquí.
                  </Typography>
                  <Button
                    variant="contained"
                    onClick={() => navigate('/instructor/catalogo')}
                    sx={{
                      backgroundColor: SENA_COLORS.green,
                      '&:hover': { backgroundColor: SENA_COLORS.greenDark },
                    }}
                  >
                    Nueva solicitud
                  </Button>
                </Box>
              ) : (
                <Grid container spacing={3}>
                  {filteredRequests.map((request, index) => (
                    <Grid item xs={12} sm={6} md={4} key={request.id}>
                      <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25, delay: index * 0.05 }}
                      >
                        <Paper className="p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                          <Box className="flex justify-between items-start mb-3">
                            <Typography variant="subtitle1" className="font-bold truncate">
                              {request.code || `Solicitud #${request.id}`}
                            </Typography>
                            {request.status === REQUEST_STATUS.PENDING && (
                              <IconButton
                                size="small"
                                onClick={() => setCancelTarget(request)}
                                aria-label="Cancelar solicitud"
                                sx={{ color: '#D32F2F' }}
                              >
                                <CancelIcon fontSize="small" />
                              </IconButton>
                            )}
                          </Box>

                          <Box className="mb-3">
                            <Chip
                              label={REQUEST_STATUS_LABELS[request.status] || request.status}
                              color={REQUEST_STATUS_COLORS[request.status] || 'default'}
                              size="small"
                              sx={{ fontWeight: 600 }}
                            />
                          </Box>

                          <Typography variant="body2" className="text-gray-500 mb-1">
                            Fecha: {formatDate(request.createdAt)}
                          </Typography>
                          <Typography variant="body2" className="text-gray-500 mb-3">
                            Ítems: {Array.isArray(request.items) ? request.items.length : 0}
                          </Typography>

                          {request.status === REQUEST_STATUS.REJECTED &&
                            request.rejectionReason && (
                              <Typography
                                variant="caption"
                                className="block text-red-600 bg-red-50 p-2 rounded mb-3"
                              >
                                Motivo: {request.rejectionReason}
                              </Typography>
                            )}
                        </Paper>
                      </motion.div>
                    </Grid>
                  ))}
                </Grid>
              )}
            </motion.div>
          </AnimatePresence>
        </Box>
      </Paper>

      <ConfirmDialog
        open={Boolean(cancelTarget)}
        title="Cancelar solicitud"
        message={`¿Estás seguro de cancelar la solicitud ${cancelTarget?.code || cancelTarget?.id}? Esta acción no se puede deshacer.`}
        confirmText="Cancelar solicitud"
        onConfirm={handleConfirmCancel}
        onCancel={() => setCancelTarget(null)}
        loading={cancelMutation.isPending}
        confirmColor="error"
      />

      <Toast
        open={toast.open}
        message={toast.message}
        severity={toast.severity}
        onClose={hideToast}
      />
    </PageContainer>
  );
}
