import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Button,
  Chip,
  Divider,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  TextField,
  CircularProgress,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import InventoryIcon from '@mui/icons-material/Inventory';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import { motion } from 'framer-motion';
import { PageContainer } from '../../components/ui/PageContainer.jsx';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.jsx';
import { Toast } from '../../components/ui/Toast.jsx';
import { useToast } from '../../hooks/useToast.js';
import { requestsApi } from '../../api/requests.api.js';
import { extractRecordData } from '../../utils/api.js';
import {
  REQUEST_STATUS,
  REQUEST_STATUS_LABELS,
  REQUEST_STATUS_COLORS,
} from '../../constants/requests.js';
import { SHIFT_OPTIONS } from '../../constants/inventory.js';
import { SENA_COLORS } from '../../constants/theme.js';

const breadcrumbs = [
  { label: 'Inicio', to: '/admin' },
  { label: 'Solicitudes', to: '/admin/solicitudes' },
];

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  return date.toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getShiftLabel(value) {
  return SHIFT_OPTIONS.find((shift) => shift.value === value)?.label || value || '-';
}

export function RequestReviewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast, showToast, hideToast } = useToast();
  const [dialog, setDialog] = useState({ open: false, action: null });
  const [rejectionReason, setRejectionReason] = useState('');

  const {
    data: response,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['request', id],
    queryFn: () => requestsApi.getById(id),
    select: (res) => extractRecordData(res, 'request'),
    enabled: Boolean(id),
  });

  const request = response ?? null;

  useEffect(() => {
    if (error) {
      showToast(error?.response?.data?.message || 'Error al cargar la solicitud', 'error');
    }
  }, [error, showToast]);

  const mutationOptions = useMemo(
    () => ({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['requests'] });
        queryClient.invalidateQueries({ queryKey: ['request', id] });
        showToast('Solicitud actualizada correctamente', 'success');
        setDialog({ open: false, action: null });
        setRejectionReason('');
      },
      onError: (mutationError) => {
        showToast(
          mutationError?.response?.data?.message || 'Error al actualizar la solicitud',
          'error'
        );
        setDialog({ open: false, action: null });
      },
    }),
    [queryClient, id, showToast]
  );

  const approveMutation = useMutation({
    mutationFn: () => requestsApi.approve(id),
    ...mutationOptions,
  });

  const rejectMutation = useMutation({
    mutationFn: () => requestsApi.reject(id, rejectionReason.trim()),
    ...mutationOptions,
  });

  const packMutation = useMutation({
    mutationFn: () => requestsApi.pack(id),
    ...mutationOptions,
  });

  const deliverMutation = useMutation({
    mutationFn: () => requestsApi.deliver(id),
    ...mutationOptions,
  });

  const completeMutation = useMutation({
    mutationFn: () => requestsApi.complete(id),
    ...mutationOptions,
  });

  const isMutating =
    approveMutation.isPending ||
    rejectMutation.isPending ||
    packMutation.isPending ||
    deliverMutation.isPending ||
    completeMutation.isPending;

  const handleOpenDialog = (action) => {
    setRejectionReason('');
    setDialog({ open: true, action });
  };

  const handleCloseDialog = () => {
    if (isMutating) return;
    setDialog({ open: false, action: null });
    setRejectionReason('');
  };

  const handleConfirm = () => {
    switch (dialog.action) {
      case 'approve':
        approveMutation.mutate();
        break;
      case 'reject':
        if (!rejectionReason.trim()) {
          showToast('Debes indicar un motivo de rechazo', 'error');
          return;
        }
        rejectMutation.mutate();
        break;
      case 'pack':
        packMutation.mutate();
        break;
      case 'deliver':
        deliverMutation.mutate();
        break;
      case 'complete':
        completeMutation.mutate();
        break;
      default:
        break;
    }
  };

  const dialogConfig = {
    approve: {
      title: 'Aprobar solicitud',
      message: '¿Estás seguro de aprobar esta solicitud? El instructor podrá continuar el proceso.',
      confirmText: 'Aprobar',
      confirmColor: 'success',
    },
    reject: {
      title: 'Rechazar solicitud',
      message: 'Indica el motivo por el cual rechazas esta solicitud.',
      confirmText: 'Rechazar',
      confirmColor: 'error',
    },
    pack: {
      title: 'Marcar como empacada',
      message: '¿Confirmas que los ítems de esta solicitud están empacados y listos para entrega?',
      confirmText: 'Empacar',
      confirmColor: 'info',
    },
    deliver: {
      title: 'Marcar como entregada',
      message: '¿Confirmas que los ítems fueron entregados al instructor?',
      confirmText: 'Entregar',
      confirmColor: 'primary',
    },
    complete: {
      title: 'Completar solicitud',
      message: '¿Confirmas que los ítems fueron devueltos y la solicitud finaliza?',
      confirmText: 'Completar',
      confirmColor: 'success',
    },
  };

  const currentDialog = dialogConfig[dialog.action] || {};

  const renderActionButtons = () => {
    if (!request) return null;

    const buttons = {
      [REQUEST_STATUS.PENDING]: [
        {
          label: 'Aprobar',
          action: 'approve',
          icon: <CheckCircleIcon />,
          color: 'success',
        },
        {
          label: 'Rechazar',
          action: 'reject',
          icon: <CancelIcon />,
          color: 'error',
        },
      ],
      [REQUEST_STATUS.APPROVED]: [
        {
          label: 'Empacar',
          action: 'pack',
          icon: <InventoryIcon />,
          color: 'info',
        },
      ],
      [REQUEST_STATUS.PACKED]: [
        {
          label: 'Entregar',
          action: 'deliver',
          icon: <LocalShippingIcon />,
          color: 'primary',
        },
      ],
      [REQUEST_STATUS.DELIVERED]: [
        {
          label: 'Completar',
          action: 'complete',
          icon: <AssignmentTurnedInIcon />,
          color: 'success',
        },
      ],
    };

    const statusButtons = buttons[request.status] || [];

    if (statusButtons.length === 0) {
      return (
        <Typography variant="body2" className="text-gray-500 italic">
          No hay acciones disponibles para esta solicitud.
        </Typography>
      );
    }

    return (
      <Box className="flex flex-wrap gap-3">
        {statusButtons.map((button) => (
          <Button
            key={button.action}
            variant="contained"
            startIcon={button.icon}
            disabled={isMutating}
            onClick={() => handleOpenDialog(button.action)}
            sx={{
              backgroundColor:
                button.color === 'primary'
                  ? SENA_COLORS.green
                  : button.color === 'info'
                    ? undefined
                    : undefined,
              '&:hover': {
                backgroundColor: button.color === 'primary' ? SENA_COLORS.greenDark : undefined,
              },
              textTransform: 'none',
            }}
            color={button.color}
          >
            {button.label}
          </Button>
        ))}
      </Box>
    );
  };

  if (isLoading) {
    return (
      <PageContainer title="Detalle de solicitud" breadcrumbs={breadcrumbs}>
        <Box className="flex justify-center py-20">
          <CircularProgress sx={{ color: SENA_COLORS.green }} />
        </Box>
      </PageContainer>
    );
  }

  if (error || !request) {
    return (
      <PageContainer title="Detalle de solicitud" breadcrumbs={breadcrumbs}>
        <Paper className="p-8 rounded-xl text-center">
          <Typography variant="h6" className="font-bold mb-2">
            No se pudo cargar la solicitud
          </Typography>
          <Typography variant="body2" className="text-gray-500 mb-4">
            {error?.response?.data?.message || 'La solicitud no existe o no tienes acceso.'}
          </Typography>
          <Button
            variant="contained"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/admin/solicitudes')}
            sx={{
              backgroundColor: SENA_COLORS.green,
              '&:hover': { backgroundColor: SENA_COLORS.greenDark },
            }}
          >
            Volver a solicitudes
          </Button>
        </Paper>
      </PageContainer>
    );
  }

  const items = Array.isArray(request.items) ? request.items : [];

  return (
    <PageContainer
      title={`Solicitud ${request.code || request.id}`}
      breadcrumbs={[
        { label: 'Inicio', to: '/admin' },
        { label: 'Solicitudes', to: '/admin/solicitudes' },
        { label: 'Detalle' },
      ]}
    >
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <Box className="mb-4">
          <Button
            variant="outlined"
            size="small"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/admin/solicitudes')}
            sx={{
              color: SENA_COLORS.green,
              borderColor: SENA_COLORS.green,
              textTransform: 'none',
              '&:hover': { borderColor: SENA_COLORS.greenDark, color: SENA_COLORS.greenDark },
            }}
          >
            Volver
          </Button>
        </Box>

        <Grid container spacing={3}>
          <Grid item xs={12} lg={4}>
            <Paper className="p-5 rounded-xl shadow-sm border border-gray-100 h-full">
              <Box className="flex justify-between items-start mb-4">
                <Typography variant="h6" className="font-bold">
                  Información general
                </Typography>
                <Chip
                  label={REQUEST_STATUS_LABELS[request.status] || request.status}
                  color={REQUEST_STATUS_COLORS[request.status] || 'default'}
                  size="small"
                  sx={{ fontWeight: 600 }}
                />
              </Box>

              <InfoRow label="Código" value={request.code || request.id} />
              <InfoRow label="Solicitante" value={request.requesterName || '-'} />
              <InfoRow label="Documento" value={request.requesterDocument || '-'} />
              <InfoRow label="Correo" value={request.requesterEmail || '-'} />
              <InfoRow
                label="Ambiente"
                value={request.environmentName || request.environmentId || '-'}
              />
              <InfoRow label="Jornada" value={getShiftLabel(request.shift)} />
              <InfoRow label="Fecha de solicitud" value={formatDate(request.createdAt)} />

              {request.status === REQUEST_STATUS.REJECTED && request.rejectionReason && (
                <>
                  <Divider className="my-3" />
                  <Typography variant="body2" className="font-bold text-red-600 mb-1">
                    Motivo de rechazo
                  </Typography>
                  <Typography variant="body2" className="text-gray-700">
                    {request.rejectionReason}
                  </Typography>
                </>
              )}

              <Divider className="my-4" />

              <Typography variant="subtitle2" className="font-bold mb-3">
                Acciones
              </Typography>
              {renderActionButtons()}
            </Paper>
          </Grid>

          <Grid item xs={12} lg={8}>
            <Paper className="p-5 rounded-xl shadow-sm border border-gray-100">
              <Typography variant="h6" className="font-bold mb-4">
                Ítems solicitados
              </Typography>

              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow className="bg-gray-50">
                      <TableCell className="font-bold text-gray-700 uppercase text-xs">
                        Ítem
                      </TableCell>
                      <TableCell className="font-bold text-gray-700 uppercase text-xs">
                        Código
                      </TableCell>
                      <TableCell
                        className="font-bold text-gray-700 uppercase text-xs"
                        align="right"
                      >
                        Cantidad
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} align="center" className="text-gray-500 py-8">
                          No hay ítems en esta solicitud.
                        </TableCell>
                      </TableRow>
                    ) : (
                      items.map((item, index) => (
                        <motion.tr
                          key={item.id || index}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2, delay: index * 0.05 }}
                          className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                        >
                          <TableCell className="text-gray-700">
                            {item.itemName || item.name || '-'}
                          </TableCell>
                          <TableCell className="text-gray-700">
                            {item.itemCode || item.code || '-'}
                          </TableCell>
                          <TableCell align="right" className="text-gray-700 font-bold">
                            {item.quantity}
                          </TableCell>
                        </motion.tr>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>
        </Grid>
      </motion.div>

      <ConfirmDialog
        open={dialog.open}
        title={currentDialog.title}
        message={currentDialog.message}
        confirmText={currentDialog.confirmText}
        confirmColor={currentDialog.confirmColor}
        onConfirm={handleConfirm}
        onCancel={handleCloseDialog}
        loading={isMutating}
      >
        {dialog.action === 'reject' && (
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Motivo de rechazo"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            margin="normal"
            size="small"
            required
          />
        )}
      </ConfirmDialog>

      <Toast
        open={toast.open}
        message={toast.message}
        severity={toast.severity}
        onClose={hideToast}
      />
    </PageContainer>
  );
}

function InfoRow({ label, value }) {
  return (
    <Box className="flex justify-between py-2 border-b border-gray-100 last:border-b-0">
      <Typography variant="body2" className="text-gray-500">
        {label}
      </Typography>
      <Typography variant="body2" className="font-medium text-gray-900 text-right">
        {value}
      </Typography>
    </Box>
  );
}
