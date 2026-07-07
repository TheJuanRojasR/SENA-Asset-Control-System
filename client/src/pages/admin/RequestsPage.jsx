import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Button,
  Chip,
  Paper,
  Tabs,
  Tab,
  Typography,
  InputAdornment,
  TextField,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import RequestQuoteIcon from '@mui/icons-material/RequestQuote';
import { motion, AnimatePresence } from 'framer-motion';
import { PageContainer } from '../../components/ui/PageContainer.jsx';
import { DataTable } from '../../components/ui/DataTable.jsx';
import { Toast } from '../../components/ui/Toast.jsx';
import { useToast } from '../../hooks/useToast.js';
import { requestsApi } from '../../api/requests.api.js';
import { extractListData } from '../../utils/api.js';
import {
  REQUEST_STATUS_LABELS,
  REQUEST_STATUS_COLORS,
  REQUEST_STATUS_LIST,
} from '../../constants/requests.js';
import { SENA_COLORS } from '../../constants/theme.js';

const breadcrumbs = [{ label: 'Inicio', to: '/admin' }, { label: 'Solicitudes' }];

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  return date.toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function RequestsPage() {
  const navigate = useNavigate();
  const { toast, showToast, hideToast } = useToast();
  const [activeTab, setActiveTab] = useState(0);
  const [search, setSearch] = useState('');

  const {
    data: requests,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['requests'],
    queryFn: () => requestsApi.getAll(),
    select: extractListData,
  });

  const safeRequests = useMemo(() => (Array.isArray(requests) ? requests : []), [requests]);
  const currentStatus = REQUEST_STATUS_LIST[activeTab];

  const filteredRequests = useMemo(() => {
    let result = safeRequests.filter((request) => request.status === currentStatus);
    if (!search.trim()) return result;
    const term = search.toLowerCase();
    return result.filter(
      (request) =>
        request.code?.toLowerCase().includes(term) ||
        request.requesterName?.toLowerCase().includes(term) ||
        request.requesterDocument?.toLowerCase().includes(term)
    );
  }, [safeRequests, currentStatus, search]);

  useEffect(() => {
    if (error) {
      showToast(error?.response?.data?.message || 'Error al cargar solicitudes', 'error');
    }
  }, [error, showToast]);

  const columns = [
    { field: 'code', headerName: 'Código' },
    { field: 'requesterName', headerName: 'Solicitante' },
    { field: 'requesterDocument', headerName: 'Documento' },
    {
      field: 'createdAt',
      headerName: 'Fecha',
      render: (value) => formatDate(value),
    },
    {
      field: 'items',
      headerName: 'Ítems',
      render: (value) => (Array.isArray(value) ? value.length : 0),
    },
    {
      field: 'status',
      headerName: 'Estado',
      render: (value) => (
        <Chip
          label={REQUEST_STATUS_LABELS[value] || value}
          color={REQUEST_STATUS_COLORS[value] || 'default'}
          size="small"
          sx={{ fontWeight: 600 }}
        />
      ),
    },
  ];

  const renderActions = (row) => (
    <Button
      variant="outlined"
      size="small"
      startIcon={<VisibilityIcon />}
      onClick={() => navigate(`/admin/solicitudes/${row.id}`)}
      sx={{
        color: SENA_COLORS.green,
        borderColor: SENA_COLORS.green,
        textTransform: 'none',
        '&:hover': { borderColor: SENA_COLORS.greenDark, color: SENA_COLORS.greenDark },
      }}
    >
      Ver detalle
    </Button>
  );

  return (
    <PageContainer title="Bandeja de solicitudes" breadcrumbs={breadcrumbs}>
      <Paper className="rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
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

        <Box className="p-4 border-b border-gray-100">
          <TextField
            placeholder="Buscar por código, solicitante o documento..."
            size="small"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon className="text-gray-400" />
                </InputAdornment>
              ),
            }}
            className="w-full md:w-96 bg-white"
          />
        </Box>

        <Box className="p-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStatus}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <DataTable
                columns={columns}
                rows={filteredRequests}
                loading={isLoading}
                emptyMessage={
                  <Box className="text-center py-8">
                    <RequestQuoteIcon sx={{ fontSize: 48, color: SENA_COLORS.green, mb: 1 }} />
                    <Typography variant="h6" className="font-bold mb-1">
                      No hay solicitudes {REQUEST_STATUS_LABELS[currentStatus].toLowerCase()}
                    </Typography>
                    <Typography variant="body2" className="text-gray-500">
                      Las solicitudes en este estado aparecerán aquí.
                    </Typography>
                  </Box>
                }
                actions
                renderActions={renderActions}
              />
            </motion.div>
          </AnimatePresence>
        </Box>
      </Paper>

      <Toast
        open={toast.open}
        message={toast.message}
        severity={toast.severity}
        onClose={hideToast}
      />
    </PageContainer>
  );
}
