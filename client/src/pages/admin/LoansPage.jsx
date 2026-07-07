import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  TextField,
  Typography,
  Checkbox,
  InputAdornment,
  Skeleton,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AssignmentReturnIcon from '@mui/icons-material/AssignmentReturn';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { PageContainer } from '../../components/ui/PageContainer.jsx';
import { Toast } from '../../components/ui/Toast.jsx';
import { useToast } from '../../hooks/useToast.js';
import { loansApi } from '../../api/loans.api.js';
import { extractListData } from '../../utils/api.js';
import { PHYSICAL_STATE_OPTIONS } from '../../constants/inventory.js';
import { SENA_COLORS } from '../../constants/theme.js';

const breadcrumbs = [{ label: 'Inicio', to: '/admin' }, { label: 'Préstamos' }];

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function LoansPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast, showToast, hideToast } = useToast();
  const [activeTab, setActiveTab] = useState(0);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [returnDialog, setReturnDialog] = useState(false);
  const [physicalState, setPhysicalState] = useState('GOOD');

  const statusFilter = activeTab === 0 ? 'LOANED' : 'RETURNED';

  const { data: loans, isLoading } = useQuery({
    queryKey: ['loans', statusFilter],
    queryFn: () => loansApi.getAll({ status: statusFilter }),
    select: extractListData,
  });

  const safeLoans = useMemo(() => (Array.isArray(loans) ? loans : []), [loans]);

  const returnMutation = useMutation({
    mutationFn: (payload) => loansApi.returnUnits(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.invalidateQueries({ queryKey: ['requests'] });
      showToast('Unidades devueltas correctamente', 'success');
      setSelected(new Set());
      setReturnDialog(false);
    },
    onError: (error) => {
      showToast(error?.response?.data?.message || 'Error al devolver unidades', 'error');
    },
  });

  const filteredLoans = useMemo(() => {
    if (!search.trim()) return safeLoans;
    const term = search.toLowerCase();
    return safeLoans.filter((loan) => {
      const request = loan.requestItem?.request;
      const unit = loan.inventoryUnit;
      return (
        request?.code?.toLowerCase().includes(term) ||
        request?.requester?.fullName?.toLowerCase().includes(term) ||
        unit?.serialNumber?.toLowerCase().includes(term) ||
        unit?.item?.name?.toLowerCase().includes(term)
      );
    });
  }, [safeLoans, search]);

  const toggleSelection = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === filteredLoans.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredLoans.map((l) => l.id)));
    }
  };

  const handleReturn = () => {
    returnMutation.mutate({
      unitIds: Array.from(selected),
      physicalStateReturned: physicalState,
    });
  };

  return (
    <PageContainer title="Préstamos activos" breadcrumbs={breadcrumbs}>
      <Tabs
        value={activeTab}
        onChange={(_, value) => {
          setActiveTab(value);
          setSelected(new Set());
        }}
        className="mb-4"
        textColor="primary"
        indicatorColor="primary"
        sx={{
          '& .Mui-selected': { color: '#00A94F !important', fontWeight: 700 },
          '& .MuiTabs-indicator': { backgroundColor: '#00A94F' },
        }}
      >
        <Tab label="En préstamo" />
        <Tab label="Devueltos" />
      </Tabs>

      <Paper className="p-4 rounded-2xl shadow-sm border border-gray-100 mb-4">
        <Box className="flex flex-col md:flex-row gap-3 justify-between items-start md:items-center">
          <TextField
            placeholder="Buscar por solicitud, instructor, serial o ítem..."
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
            className="w-full md:w-96"
          />
          {activeTab === 0 && selected.size > 0 && (
            <Button
              variant="contained"
              startIcon={<AssignmentReturnIcon />}
              onClick={() => setReturnDialog(true)}
              sx={{
                backgroundColor: SENA_COLORS.green,
                '&:hover': { backgroundColor: SENA_COLORS.greenDark },
                textTransform: 'none',
              }}
            >
              Devolver {selected.size} seleccionado{selected.size !== 1 ? 's' : ''}
            </Button>
          )}
        </Box>
      </Paper>

      <Paper className="rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow className="bg-gray-50">
                {activeTab === 0 && (
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={filteredLoans.length > 0 && selected.size === filteredLoans.length}
                      indeterminate={selected.size > 0 && selected.size < filteredLoans.length}
                      onChange={toggleAll}
                    />
                  </TableCell>
                )}
                <TableCell className="font-bold text-gray-700 uppercase text-xs">
                  Solicitud
                </TableCell>
                <TableCell className="font-bold text-gray-700 uppercase text-xs">
                  Instructor
                </TableCell>
                <TableCell className="font-bold text-gray-700 uppercase text-xs">
                  Ítem / Serial
                </TableCell>
                <TableCell className="font-bold text-gray-700 uppercase text-xs">
                  Pertenece a
                </TableCell>
                <TableCell className="font-bold text-gray-700 uppercase text-xs">
                  Ambiente
                </TableCell>
                <TableCell className="font-bold text-gray-700 uppercase text-xs">
                  Fecha préstamo
                </TableCell>
                <TableCell className="font-bold text-gray-700 uppercase text-xs">Estado</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton variant="text" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filteredLoans.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" className="py-10 text-gray-500">
                    No hay préstamos {activeTab === 0 ? 'activos' : 'devueltos'}.
                  </TableCell>
                </TableRow>
              ) : (
                <AnimatePresence>
                  {filteredLoans.map((loan, index) => {
                    const request = loan.requestItem?.request;
                    const unit = loan.inventoryUnit;
                    const isSelected = selected.has(loan.id);

                    return (
                      <motion.tr
                        key={loan.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2, delay: index * 0.03 }}
                        className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-sena-light/10 transition-colors cursor-pointer`}
                        onClick={() => request && navigate(`/admin/solicitudes/${request.id}`)}
                      >
                        {activeTab === 0 && (
                          <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={isSelected}
                              onChange={() => toggleSelection(loan.id)}
                            />
                          </TableCell>
                        )}
                        <TableCell>
                          <Typography variant="subtitle2" className="font-bold text-sena-black">
                            {request?.code || `SOL-${loan.id}`}
                          </Typography>
                        </TableCell>
                        <TableCell>{request?.requester?.fullName || '-'}</TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="body2" className="font-semibold">
                              {unit?.item?.name || '-'}
                            </Typography>
                            <Typography variant="caption" className="text-gray-500">
                              {unit?.serialNumber || '-'}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          {unit?.parentUnit ? (
                            <Chip
                              size="small"
                              label={`${unit.parentUnit.item?.name} #${unit.parentUnit.serialNumber}`}
                              sx={{ backgroundColor: '#E8F5E9', color: '#007A3D', fontWeight: 600 }}
                            />
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>
                          {request?.environment?.name || unit?.environment?.name || '-'}
                        </TableCell>
                        <TableCell>{formatDate(loan.loanedAt || request?.deliveredAt)}</TableCell>
                        <TableCell>
                          {loan.returnedAt ? (
                            <Chip
                              label="Devuelto"
                              size="small"
                              color="default"
                              sx={{ fontWeight: 600 }}
                            />
                          ) : (
                            <Chip
                              label="En préstamo"
                              size="small"
                              sx={{ backgroundColor: '#FFF3E0', color: '#E65100', fontWeight: 600 }}
                            />
                          )}
                        </TableCell>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog
        open={returnDialog}
        onClose={() => !returnMutation.isPending && setReturnDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ className: 'rounded-xl', sx: { backgroundColor: '#ffffff' } }}
      >
        <DialogTitle className="font-bold text-sena-black">Devolver unidades</DialogTitle>
        <DialogContent className="space-y-4">
          <Typography variant="body2" className="text-gray-600">
            Vas a devolver {selected.size} unidad{selected.size !== 1 ? 'es' : ''}. Indica el estado
            físico en el que se reciben.
          </Typography>
          <FormControl fullWidth size="small">
            <InputLabel>Estado físico</InputLabel>
            <Select
              value={physicalState}
              label="Estado físico"
              onChange={(e) => setPhysicalState(e.target.value)}
            >
              {PHYSICAL_STATE_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions className="px-6 pb-4">
          <Button
            onClick={() => setReturnDialog(false)}
            disabled={returnMutation.isPending}
            variant="outlined"
            color="inherit"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleReturn}
            disabled={returnMutation.isPending}
            variant="contained"
            sx={{
              backgroundColor: SENA_COLORS.green,
              '&:hover': { backgroundColor: SENA_COLORS.greenDark },
              textTransform: 'none',
            }}
          >
            Confirmar devolución
          </Button>
        </DialogActions>
      </Dialog>

      <Toast
        open={toast.open}
        message={toast.message}
        severity={toast.severity}
        onClose={hideToast}
      />
    </PageContainer>
  );
}
