import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  TextField,
  InputAdornment,
  Alert,
  Checkbox,
  Paper,
  Typography,
  Skeleton,
  IconButton,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ArchiveIcon from '@mui/icons-material/Archive';
import RestoreFromTrashIcon from '@mui/icons-material/RestoreFromTrash';
import VisibilityIcon from '@mui/icons-material/Visibility';
import BuildIcon from '@mui/icons-material/Build';
import { motion } from 'framer-motion';
import { PageContainer } from '../../components/ui/PageContainer.jsx';
import { DataTable } from '../../components/ui/DataTable.jsx';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.jsx';
import { Toast } from '../../components/ui/Toast.jsx';
import { useToast } from '../../hooks/useToast.js';
import { inventoryApi } from '../../api/inventory.api.js';
import { itemsApi } from '../../api/items.api.js';
import { environmentsApi } from '../../api/environments.api.js';
import { extractListData } from '../../utils/api.js';
import {
  PHYSICAL_STATE_OPTIONS,
  INVENTORY_STATUS_OPTIONS,
  INVENTORY_STATUS,
} from '../../constants/inventory.js';

const inventorySchema = z.object({
  itemId: z.string().min(1, 'Selecciona un ítem'),
  environmentId: z.string().min(1, 'Selecciona un ambiente'),
  serialNumber: z.string().optional(),
  physicalState: z.string().min(1, 'Selecciona un estado físico'),
});

const editSchema = inventorySchema.extend({
  status: z.string().min(1, 'Selecciona un estado'),
});

const emptyValues = {
  itemId: '',
  environmentId: '',
  serialNumber: '',
  physicalState: '',
  status: INVENTORY_STATUS.AVAILABLE,
};

const breadcrumbs = [{ label: 'Inicio', to: '/admin' }, { label: 'Inventario' }];

export function InventoryPage() {
  const queryClient = useQueryClient();
  const { toast, showToast, hideToast } = useToast();
  const [search, setSearch] = useState('');
  const [filterItem, setFilterItem] = useState('');
  const [filterEnvironment, setFilterEnvironment] = useState('');
  const [filterPhysicalState, setFilterPhysicalState] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [retireTarget, setRetireTarget] = useState(null);
  const [restoreTarget, setRestoreTarget] = useState(null);
  const [detailUnit, setDetailUnit] = useState(null);
  const [assembleUnit, setAssembleUnit] = useState(null);
  const [selectedChildUnits, setSelectedChildUnits] = useState([]);

  const { data: inventory, isLoading: inventoryLoading } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => inventoryApi.getAll(),
    select: extractListData,
  });

  const { data: items, isLoading: itemsLoading } = useQuery({
    queryKey: ['items'],
    queryFn: () => itemsApi.getAll(),
    select: extractListData,
  });

  const { data: environments, isLoading: environmentsLoading } = useQuery({
    queryKey: ['environments'],
    queryFn: () => environmentsApi.getAll(),
    select: extractListData,
  });

  const { data: unitDetail, isLoading: unitDetailLoading } = useQuery({
    queryKey: ['inventory-unit-detail', detailUnit?.id],
    queryFn: () => inventoryApi.getDetail(detailUnit.id),
    select: (res) => res?.data?.data?.unit ?? null,
    enabled: Boolean(detailUnit?.id),
  });

  const createMutation = useMutation({
    mutationFn: inventoryApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      showToast('Unidad creada correctamente', 'success');
      handleCloseDialog();
    },
    onError: (error) => {
      showToast(error?.response?.data?.message || 'Error al crear unidad', 'error');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => inventoryApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      showToast('Unidad actualizada correctamente', 'success');
      handleCloseDialog();
    },
    onError: (error) => {
      showToast(error?.response?.data?.message || 'Error al actualizar unidad', 'error');
    },
  });

  const retireMutation = useMutation({
    mutationFn: (id) => inventoryApi.update(id, { status: INVENTORY_STATUS.DISPOSED }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      showToast('Unidad dada de baja correctamente', 'success');
      setRetireTarget(null);
    },
    onError: (error) => {
      showToast(error?.response?.data?.message || 'Error al dar de baja la unidad', 'error');
    },
  });

  const restoreMutation = useMutation({
    mutationFn: (id) => inventoryApi.restore(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      showToast('Unidad restablecida correctamente', 'success');
      setRestoreTarget(null);
    },
    onError: (error) => {
      showToast(error?.response?.data?.message || 'Error al restablecer la unidad', 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => inventoryApi.hardRemove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      showToast('Unidad eliminada permanentemente', 'success');
      setDeleteTarget(null);
    },
    onError: (error) => {
      showToast(error?.response?.data?.message || 'Error al eliminar unidad', 'error');
    },
  });

  const assembleMutation = useMutation({
    mutationFn: ({ id, childUnitIds }) => inventoryApi.assemble(id, childUnitIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      showToast('Unidades ensambladas correctamente', 'success');
      setAssembleUnit(null);
      setSelectedChildUnits([]);
    },
    onError: (error) => {
      showToast(error?.response?.data?.message || 'Error al ensamblar unidades', 'error');
    },
  });

  const disassembleMutation = useMutation({
    mutationFn: ({ id, childUnitIds }) => inventoryApi.disassemble(id, childUnitIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      showToast('Unidades desensambladas correctamente', 'success');
      setDetailUnit(null);
    },
    onError: (error) => {
      showToast(error?.response?.data?.message || 'Error al desensamblar unidades', 'error');
    },
  });

  const safeInventory = useMemo(() => (Array.isArray(inventory) ? inventory : []), [inventory]);
  const safeItems = useMemo(() => (Array.isArray(items) ? items : []), [items]);
  const safeEnvironments = useMemo(
    () => (Array.isArray(environments) ? environments : []),
    [environments]
  );

  const enrichedInventory = useMemo(() => {
    return safeInventory.map((unit) => {
      const item = safeItems.find((i) => i.id === unit.itemId);
      return {
        ...unit,
        itemName: item?.name || unit.itemId,
        environmentName:
          safeEnvironments.find((e) => e.id === unit.environmentId)?.name || unit.environmentId,
        itemHasComponents: Array.isArray(item?.components) && item.components.length > 0,
      };
    });
  }, [safeInventory, safeItems, safeEnvironments]);

  const filteredInventory = useMemo(() => {
    return enrichedInventory.filter((unit) => {
      const matchesSearch =
        !search.trim() ||
        unit.serialNumber?.toLowerCase().includes(search.toLowerCase()) ||
        unit.itemName?.toLowerCase().includes(search.toLowerCase()) ||
        unit.environmentName?.toLowerCase().includes(search.toLowerCase());
      const matchesItem = !filterItem || unit.itemId === filterItem;
      const matchesEnvironment = !filterEnvironment || unit.environmentId === filterEnvironment;
      const matchesPhysicalState =
        !filterPhysicalState || unit.physicalState === filterPhysicalState;
      const matchesStatus = !filterStatus || unit.status === filterStatus;
      return (
        matchesSearch && matchesItem && matchesEnvironment && matchesPhysicalState && matchesStatus
      );
    });
  }, [enrichedInventory, search, filterItem, filterEnvironment, filterPhysicalState, filterStatus]);

  const handleOpenCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (unit) => {
    setEditing(unit);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditing(null);
  };

  const handleSubmit = (data) => {
    const payload = {
      ...data,
      itemId: Number(data.itemId),
      environmentId: Number(data.environmentId),
      serialNumber: data.serialNumber?.trim() || undefined,
    };

    if (editing) {
      updateMutation.mutate({ id: editing.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleConfirmDelete = () => {
    if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
  };

  const handleConfirmRetire = () => {
    if (retireTarget) retireMutation.mutate(retireTarget.id);
  };

  const handleConfirmRestore = () => {
    if (restoreTarget) restoreMutation.mutate(restoreTarget.id);
  };

  const renderStatusAction = (row) => {
    if (row.status === 'DISPOSED') {
      return (
        <IconButton
          size="small"
          onClick={() => setRestoreTarget(row)}
          aria-label="Restablecer unidad"
          className="text-blue-600 hover:text-blue-800"
        >
          <RestoreFromTrashIcon fontSize="small" />
        </IconButton>
      );
    }

    return (
      <IconButton
        size="small"
        onClick={() => setRetireTarget(row)}
        aria-label="Dar de baja"
        className="text-amber-600 hover:text-amber-800"
      >
        <ArchiveIcon fontSize="small" />
      </IconButton>
    );
  };

  const handleChildUnitToggle = (childId, isSelected) => {
    setSelectedChildUnits((prev) =>
      isSelected ? prev.filter((id) => id !== childId) : [...prev, childId]
    );
  };

  let detailContent = null;
  let assemblyStatusChip = null;

  if (unitDetail?.isComplete) {
    assemblyStatusChip = <Chip label="Completo" size="small" color="success" />;
  } else if (unitDetail) {
    assemblyStatusChip = <Chip label="Incompleto" size="small" color="warning" />;
  }

  if (unitDetailLoading) {
    detailContent = (
      <Box className="space-y-2">
        <Skeleton variant="text" />
        <Skeleton variant="text" />
      </Box>
    );
  } else if (unitDetail) {
    detailContent = (
      <>
        <Box className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextField
            label="Ítem"
            value={unitDetail.item?.name || ''}
            fullWidth
            size="small"
            InputProps={{ readOnly: true }}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="Serial"
            value={unitDetail.serialNumber || ''}
            fullWidth
            size="small"
            InputProps={{ readOnly: true }}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="Ambiente"
            value={unitDetail.environment?.name || '-'}
            fullWidth
            size="small"
            InputProps={{ readOnly: true }}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="Estado"
            value={unitDetail.status || ''}
            fullWidth
            size="small"
            InputProps={{ readOnly: true }}
            InputLabelProps={{ shrink: true }}
          />
        </Box>

        {unitDetail.parentUnit && (
          <Alert severity="info">
            Esta unidad pertenece a{' '}
            <strong>
              {unitDetail.parentUnit.item?.name} #{unitDetail.parentUnit.serialNumber}
            </strong>
          </Alert>
        )}

        {unitDetail.itemHasComponents && (
          <Box>
            <Box className="flex items-center gap-2 mb-2">
              <Typography variant="subtitle2" className="font-bold">
                Estado del ensamble:
              </Typography>
              {assemblyStatusChip}
            </Box>

            {unitDetail.childUnits && unitDetail.childUnits.length > 0 && (
              <Box className="space-y-2 mb-3">
                <Typography variant="body2" className="font-semibold">
                  Componentes ensamblados:
                </Typography>
                {unitDetail.childUnits.map((child) => (
                  <Paper
                    key={child.id}
                    className="p-2 flex justify-between items-center border border-gray-100"
                  >
                    <Box>
                      <Typography variant="body2" className="font-medium">
                        {child.item?.name}
                      </Typography>
                      <Typography variant="caption" className="text-gray-500">
                        Serial: {child.serialNumber}
                      </Typography>
                    </Box>
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      onClick={() =>
                        disassembleMutation.mutate({
                          id: unitDetail.id,
                          childUnitIds: [child.id],
                        })
                      }
                      disabled={disassembleMutation.isPending}
                      sx={{ textTransform: 'none' }}
                    >
                      Desensamblar
                    </Button>
                  </Paper>
                ))}
              </Box>
            )}

            {unitDetail.missingComponents && unitDetail.missingComponents.length > 0 && (
              <Box>
                <Typography variant="body2" className="font-semibold text-amber-700 mb-1">
                  Componentes requeridos faltantes:
                </Typography>
                {unitDetail.missingComponents.map((comp) => (
                  <Paper
                    key={comp.childItemId}
                    className="p-2 mb-2 border border-amber-200 bg-amber-50"
                  >
                    <Typography variant="body2">
                      {comp.childItem?.name} (cantidad: {comp.quantity})
                    </Typography>
                  </Paper>
                ))}
              </Box>
            )}
          </Box>
        )}
      </>
    );
  } else {
    detailContent = (
      <Typography variant="body2" className="text-gray-500">
        No se pudo cargar el detalle.
      </Typography>
    );
  }

  const columns = [
    { field: 'itemName', headerName: 'Ítem' },
    { field: 'environmentName', headerName: 'Ambiente' },
    { field: 'serialNumber', headerName: 'Serial' },
    {
      field: 'physicalState',
      headerName: 'Estado físico',
      render: (value) => PHYSICAL_STATE_OPTIONS.find((s) => s.value === value)?.label || value,
    },
    {
      field: 'status',
      headerName: 'Estado',
      render: (value) => INVENTORY_STATUS_OPTIONS.find((s) => s.value === value)?.label || value,
    },
    {
      field: 'parentUnit',
      headerName: 'Ensamble',
      render: (value, row) => (
        <Box component="span">
          {value ? (
            <Chip
              size="small"
              label={`Dentro de ${value.item?.name || 'unidad'}`}
              sx={{ backgroundColor: '#E3F2FD', color: '#1565C0', fontWeight: 600 }}
            />
          ) : row.itemHasComponents ? (
            <Chip
              size="small"
              label="Puede ensamblar"
              sx={{ backgroundColor: '#E8F5E9', color: '#007A3D', fontWeight: 600 }}
            />
          ) : (
            '-'
          )}
        </Box>
      ),
    },
  ];

  const isLoading = inventoryLoading || itemsLoading || environmentsLoading;
  return (
    <PageContainer title="Gestión de inventario" breadcrumbs={breadcrumbs}>
      <Box className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
        <Box className="flex flex-col lg:flex-row gap-3 flex-wrap">
          <TextField
            placeholder="Buscar unidad..."
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
            className="w-full lg:w-64 bg-white"
          />
          <TextField
            select
            label="Ítem"
            size="small"
            value={filterItem}
            onChange={(e) => setFilterItem(e.target.value)}
            className="w-full lg:w-48 bg-white"
          >
            <MenuItem value="">Todos</MenuItem>
            {safeItems.map((item) => (
              <MenuItem key={item.id} value={item.id}>
                {item.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Ambiente"
            size="small"
            value={filterEnvironment}
            onChange={(e) => setFilterEnvironment(e.target.value)}
            className="w-full lg:w-48 bg-white"
          >
            <MenuItem value="">Todos</MenuItem>
            {safeEnvironments.map((env) => (
              <MenuItem key={env.id} value={env.id}>
                {env.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Estado físico"
            size="small"
            value={filterPhysicalState}
            onChange={(e) => setFilterPhysicalState(e.target.value)}
            className="w-full lg:w-44 bg-white"
          >
            <MenuItem value="">Todos</MenuItem>
            {PHYSICAL_STATE_OPTIONS.map((state) => (
              <MenuItem key={state.value} value={state.value}>
                {state.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Estado"
            size="small"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full lg:w-40 bg-white"
          >
            <MenuItem value="">Todos</MenuItem>
            {INVENTORY_STATUS_OPTIONS.map((status) => (
              <MenuItem key={status.value} value={status.value}>
                {status.label}
              </MenuItem>
            ))}
          </TextField>
          <Box className="flex-1" />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenCreate}
            disabled={itemsLoading || environmentsLoading}
            sx={{
              backgroundColor: '#00A94F',
              '&:hover': { backgroundColor: '#007A3D' },
              textTransform: 'none',
            }}
          >
            Crear unidad
          </Button>
        </Box>
      </Box>

      <DataTable
        columns={columns}
        rows={filteredInventory}
        loading={isLoading}
        emptyMessage="No se encontraron unidades de inventario."
        onEdit={handleOpenEdit}
        onDelete={setDeleteTarget}
        onRetire={setRetireTarget}
        renderActions={(row) => (
          <Box className="flex justify-end gap-1">
            <IconButton
              size="small"
              onClick={() => setDetailUnit(row)}
              aria-label="Ver detalle"
              className="text-blue-600 hover:text-blue-800"
            >
              <VisibilityIcon fontSize="small" />
            </IconButton>
            {row.itemHasComponents && row.status === 'AVAILABLE' && !row.parentUnitId && (
              <IconButton
                size="small"
                onClick={() => {
                  setAssembleUnit(row);
                  setSelectedChildUnits([]);
                }}
                aria-label="Ensamblar"
                className="text-sena-green hover:text-sena-greenDark"
              >
                <BuildIcon fontSize="small" />
              </IconButton>
            )}
            <IconButton
              size="small"
              onClick={() => handleOpenEdit(row)}
              aria-label="Editar"
              className="text-sena-green hover:text-sena-greenDark"
            >
              <EditIcon fontSize="small" />
            </IconButton>
            {renderStatusAction(row)}
            <IconButton
              size="small"
              onClick={() => setDeleteTarget(row)}
              aria-label="Eliminar"
              className="text-red-500 hover:text-red-700"
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Box>
        )}
      />

      <InventoryFormDialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        initialData={editing}
        onSubmit={handleSubmit}
        loading={createMutation.isPending || updateMutation.isPending}
        items={safeItems}
        environments={safeEnvironments}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Eliminar permanentemente"
        message={`¿Estás seguro de eliminar permanentemente esta unidad de inventario? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleteMutation.isPending}
        confirmColor="error"
      />

      <ConfirmDialog
        open={Boolean(retireTarget)}
        title="Dar de baja unidad"
        message={`¿Estás seguro de dar de baja la unidad con serial ${retireTarget?.serialNumber || ''}?`}
        confirmText="Dar de baja"
        onConfirm={handleConfirmRetire}
        onCancel={() => setRetireTarget(null)}
        loading={retireMutation.isPending}
        confirmColor="warning"
      />

      <ConfirmDialog
        open={Boolean(restoreTarget)}
        title="Restablecer unidad"
        message={`¿Estás seguro de restablecer la unidad con serial ${restoreTarget?.serialNumber || ''}?`}
        confirmText="Restablecer"
        onConfirm={handleConfirmRestore}
        onCancel={() => setRestoreTarget(null)}
        loading={restoreMutation.isPending}
        confirmColor="primary"
      />

      <Toast
        open={toast.open}
        message={toast.message}
        severity={toast.severity}
        onClose={hideToast}
      />

      <Dialog
        open={Boolean(detailUnit)}
        onClose={() => setDetailUnit(null)}
        maxWidth="md"
        fullWidth
        PaperProps={{ className: 'rounded-xl', sx: { backgroundColor: '#ffffff' } }}
      >
        <DialogTitle className="font-bold text-sena-black">Detalle de unidad</DialogTitle>
        <DialogContent className="space-y-4">{detailContent}</DialogContent>
        <DialogActions className="px-6 pb-4">
          <Button onClick={() => setDetailUnit(null)} variant="outlined" color="inherit">
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(assembleUnit)}
        onClose={() => {
          setAssembleUnit(null);
          setSelectedChildUnits([]);
        }}
        maxWidth="sm"
        fullWidth
        PaperProps={{ className: 'rounded-xl', sx: { backgroundColor: '#ffffff' } }}
      >
        <DialogTitle className="font-bold text-sena-black">
          Ensamblar {assembleUnit?.itemName}
        </DialogTitle>
        <DialogContent className="space-y-4">
          <Typography variant="body2" className="text-gray-600">
            Selecciona las unidades hijas disponibles que quieres vincular a{' '}
            <strong>{assembleUnit?.serialNumber}</strong>.
          </Typography>

          {(() => {
            const parentItem = safeItems.find((i) => i.id === assembleUnit?.itemId);
            const allowedChildItemIds = new Set(
              (parentItem?.components || []).map((c) => c.childItemId)
            );
            const availableChildren = safeInventory.filter(
              (u) =>
                allowedChildItemIds.has(u.itemId) &&
                u.status === 'AVAILABLE' &&
                !u.parentUnitId &&
                u.id !== assembleUnit?.id
            );

            if (availableChildren.length === 0) {
              return (
                <Alert severity="info">No hay unidades hijas disponibles para ensamblar.</Alert>
              );
            }

            return (
              <Box className="space-y-2 max-h-80 overflow-y-auto">
                {availableChildren.map((child) => {
                  const isSelected = selectedChildUnits.includes(child.id);
                  return (
                    <Paper
                      key={child.id}
                      className={`p-3 border cursor-pointer transition-colors ${isSelected ? 'border-sena-green bg-sena-green-light/10' : 'border-gray-100'}`}
                      onClick={() => handleChildUnitToggle(child.id, isSelected)}
                    >
                      <Box className="flex items-center gap-2">
                        <Checkbox checked={isSelected} />
                        <Box>
                          <Typography variant="body2" className="font-semibold">
                            {child.itemName}
                          </Typography>
                          <Typography variant="caption" className="text-gray-500">
                            Serial: {child.serialNumber}
                          </Typography>
                        </Box>
                      </Box>
                    </Paper>
                  );
                })}
              </Box>
            );
          })()}
        </DialogContent>
        <DialogActions className="px-6 pb-4">
          <Button
            onClick={() => {
              setAssembleUnit(null);
              setSelectedChildUnits([]);
            }}
            variant="outlined"
            color="inherit"
          >
            Cancelar
          </Button>
          <Button
            onClick={() =>
              assembleMutation.mutate({
                id: assembleUnit.id,
                childUnitIds: selectedChildUnits,
              })
            }
            disabled={selectedChildUnits.length === 0 || assembleMutation.isPending}
            variant="contained"
            sx={{
              backgroundColor: '#00A94F',
              '&:hover': { backgroundColor: '#007A3D' },
              textTransform: 'none',
            }}
          >
            Ensamblar seleccionados
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
}

function InventoryFormDialog({
  open,
  onClose,
  initialData,
  onSubmit,
  loading,
  items,
  environments,
}) {
  const isEditing = Boolean(initialData);
  const schema = isEditing ? editSchema : inventorySchema;
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: emptyValues,
  });

  useEffect(() => {
    if (open) {
      reset(
        initialData
          ? {
              ...emptyValues,
              ...initialData,
              itemId: String(initialData.itemId ?? ''),
              environmentId: String(initialData.environmentId ?? ''),
            }
          : emptyValues
      );
    }
  }, [open, initialData, reset]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperComponent={motion.div}
      PaperProps={{
        initial: { opacity: 0, scale: 0.94, y: 16 },
        animate: { opacity: 1, scale: 1, y: 0 },
        transition: { duration: 0.25 },
        className: 'rounded-xl',
        sx: { backgroundColor: '#ffffff' },
      }}
    >
      <DialogTitle className="font-bold text-sena-black">
        {isEditing ? 'Editar unidad' : 'Crear unidad'}
      </DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent className="space-y-4">
          <Controller
            name="itemId"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                select
                label="Ítem"
                fullWidth
                size="small"
                value={field.value ?? ''}
                error={!!errors.itemId}
                helperText={errors.itemId?.message}
                disabled={isEditing}
              >
                {items.map((item) => (
                  <MenuItem key={item.id} value={String(item.id)}>
                    {item.name}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />
          <Controller
            name="environmentId"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                select
                label="Ambiente"
                fullWidth
                size="small"
                value={field.value ?? ''}
                error={!!errors.environmentId}
                helperText={errors.environmentId?.message}
              >
                {environments.map((env) => (
                  <MenuItem key={env.id} value={String(env.id)}>
                    {env.name}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />
          <TextField
            {...register('serialNumber')}
            label="Número de serial (opcional)"
            fullWidth
            size="small"
            error={!!errors.serialNumber}
            helperText={errors.serialNumber?.message}
          />
          <Controller
            name="physicalState"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                select
                label="Estado físico"
                fullWidth
                size="small"
                value={field.value ?? ''}
                error={!!errors.physicalState}
                helperText={errors.physicalState?.message}
              >
                {PHYSICAL_STATE_OPTIONS.map((state) => (
                  <MenuItem key={state.value} value={state.value}>
                    {state.label}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />
          {isEditing && (
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  label="Estado"
                  fullWidth
                  size="small"
                  value={field.value ?? ''}
                  error={!!errors.status}
                  helperText={errors.status?.message}
                >
                  {INVENTORY_STATUS_OPTIONS.map((status) => (
                    <MenuItem key={status.value} value={status.value}>
                      {status.label}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
          )}
        </DialogContent>
        <DialogActions className="px-6 pb-4">
          <Button onClick={onClose} disabled={loading} variant="outlined" color="inherit">
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading}
            sx={{
              backgroundColor: '#00A94F',
              '&:hover': { backgroundColor: '#007A3D' },
              textTransform: 'none',
            }}
          >
            {isEditing ? 'Guardar cambios' : 'Crear unidad'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
