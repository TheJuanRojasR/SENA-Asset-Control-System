import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Switch,
  TextField,
  InputAdornment,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import { motion } from 'framer-motion';
import { DataTable } from '../../components/ui/DataTable.jsx';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.jsx';
import { Toast } from '../../components/ui/Toast.jsx';
import { useToast } from '../../hooks/useToast.js';
import { itemsApi } from '../../api/items.api.js';
import { categoriesApi } from '../../api/categories.api.js';
import { extractListData } from '../../utils/api.js';
import { UNIT_OPTIONS } from '../../constants/inventory.js';

const itemSchema = z.object({
  code: z.string().min(2, 'El código debe tener al menos 2 caracteres'),
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  description: z.string().optional(),
  categoryId: z.coerce.number().int().positive('Selecciona una categoría'),
  minStock: z.coerce.number().min(0, 'Debe ser mayor o igual a 0'),
  unit: z.string().min(1, 'Selecciona una unidad'),
  initialQty: z.coerce.number().min(0, 'Debe ser mayor o igual a 0'),
  imageUrl: z.string().url('URL inválida').optional().or(z.literal('')),
});

const emptyValues = {
  code: '',
  name: '',
  description: '',
  categoryId: '',
  minStock: 0,
  unit: '',
  initialQty: 0,
  imageUrl: '',
};

export function ItemsTab() {
  const queryClient = useQueryClient();
  const { toast, showToast, hideToast } = useToast();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [softDeleteTarget, setSoftDeleteTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data: items, isLoading: itemsLoading } = useQuery({
    queryKey: ['items'],
    queryFn: () => itemsApi.getAll(),
    select: extractListData,
  });

  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.getAll(),
    select: extractListData,
  });

  const createMutation = useMutation({
    mutationFn: itemsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      showToast('Ítem creado correctamente', 'success');
      handleCloseDialog();
    },
    onError: (error) => {
      showToast(error?.response?.data?.message || 'Error al crear ítem', 'error');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => itemsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      showToast('Ítem actualizado correctamente', 'success');
      handleCloseDialog();
    },
    onError: (error) => {
      showToast(error?.response?.data?.message || 'Error al actualizar ítem', 'error');
    },
  });

  const softDeleteMutation = useMutation({
    mutationFn: (id) => itemsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      showToast('Ítem desactivado correctamente', 'success');
      setSoftDeleteTarget(null);
    },
    onError: (error) =>
      showToast(error?.response?.data?.message || 'Error al desactivar ítem', 'error'),
  });

  const hardDeleteMutation = useMutation({
    mutationFn: (id) => itemsApi.hardDelete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      showToast('Ítem eliminado permanentemente', 'success');
      setDeleteTarget(null);
    },
    onError: (error) =>
      showToast(error?.response?.data?.message || 'Error al eliminar ítem', 'error'),
  });

  const safeItems = useMemo(() => (Array.isArray(items) ? items : []), [items]);
  const safeCategories = useMemo(() => (Array.isArray(categories) ? categories : []), [categories]);

  const filteredItems = useMemo(() => {
    if (!search.trim()) return safeItems;
    const term = search.toLowerCase();
    return safeItems.filter(
      (i) =>
        i.code?.toLowerCase().includes(term) ||
        i.name?.toLowerCase().includes(term) ||
        i.description?.toLowerCase().includes(term)
    );
  }, [safeItems, search]);

  const handleOpenCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditing(item);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditing(null);
  };

  const handleSubmit = (data) => {
    const payload = {
      ...data,
      imageUrl: data.imageUrl || undefined,
    };
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleConfirmSoftDelete = () => {
    if (softDeleteTarget) softDeleteMutation.mutate(softDeleteTarget.id);
  };

  const handleConfirmDelete = () => {
    if (deleteTarget) hardDeleteMutation.mutate(deleteTarget.id);
  };

  const getCategoryName = (categoryId) => {
    return safeCategories.find((c) => c.id === categoryId)?.name || categoryId;
  };

  const columns = [
    { field: 'code', headerName: 'Código' },
    { field: 'name', headerName: 'Nombre' },
    {
      field: 'categoryId',
      headerName: 'Categoría',
      render: (value) => getCategoryName(value),
    },
    {
      field: 'minStock',
      headerName: 'Stock mínimo',
      render: (value, row) =>
        `${value} ${UNIT_OPTIONS.find((u) => u.value === row.unit)?.label || row.unit || ''}`,
    },
    {
      field: 'unit',
      headerName: 'Unidad',
      render: (value) => UNIT_OPTIONS.find((u) => u.value === value)?.label || value,
    },
    {
      field: 'isActive',
      headerName: 'Estado',
      render: (value) =>
        value === false ? (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
            Inactivo
          </span>
        ) : (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
            Activo
          </span>
        ),
    },
    {
      field: 'components',
      headerName: 'Tipo',
      render: (value) =>
        Array.isArray(value) && value.length > 0 ? (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-sena-green-light text-sena-greenDark">
            Compuesto
          </span>
        ) : (
          <span className="text-gray-500 text-xs">Simple</span>
        ),
    },
  ];

  return (
    <Box>
      <Box className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <TextField
          placeholder="Buscar ítem..."
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
          className="w-full md:w-80 bg-white"
        />
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenCreate}
          disabled={categoriesLoading}
          sx={{
            backgroundColor: '#00A94F',
            '&:hover': { backgroundColor: '#007A3D' },
            textTransform: 'none',
          }}
        >
          Crear ítem
        </Button>
      </Box>

      <DataTable
        columns={columns}
        rows={filteredItems}
        loading={itemsLoading}
        emptyMessage="No se encontraron ítems."
        onEdit={handleOpenEdit}
        onRetire={setSoftDeleteTarget}
        onHardDelete={setDeleteTarget}
      />

      <ItemFormDialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        initialData={editing}
        onSubmit={handleSubmit}
        loading={createMutation.isPending || updateMutation.isPending}
        categories={safeCategories}
        items={safeItems}
      />

      <ConfirmDialog
        open={Boolean(softDeleteTarget)}
        title={softDeleteTarget?.isActive === false ? 'Activar ítem' : 'Desactivar ítem'}
        message={
          softDeleteTarget?.isActive === false
            ? `¿Estás seguro de activar el ítem ${softDeleteTarget?.name}?`
            : `¿Estás seguro de desactivar el ítem ${softDeleteTarget?.name}?`
        }
        confirmText={softDeleteTarget?.isActive === false ? 'Activar' : 'Desactivar'}
        onConfirm={handleConfirmSoftDelete}
        onCancel={() => setSoftDeleteTarget(null)}
        loading={softDeleteMutation.isPending}
        confirmColor={softDeleteTarget?.isActive === false ? 'primary' : 'warning'}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Eliminar ítem"
        message={`¿Estás seguro de eliminar el ítem ${deleteTarget?.name}? Esta acción no se puede deshacer.`}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={hardDeleteMutation.isPending}
        confirmColor="error"
      />

      <Toast
        open={toast.open}
        message={toast.message}
        severity={toast.severity}
        onClose={hideToast}
      />
    </Box>
  );
}

function ItemFormDialog({ open, onClose, initialData, onSubmit, loading, categories, items }) {
  const isEditing = Boolean(initialData);
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(itemSchema),
    defaultValues: emptyValues,
  });
  const [components, setComponents] = useState([]);
  const [selectedChild, setSelectedChild] = useState('');

  useEffect(() => {
    if (open) {
      reset(
        initialData
          ? {
              ...emptyValues,
              ...initialData,
              categoryId: initialData?.categoryId ?? initialData?.category?.id ?? '',
              unit: initialData.unit || '',
              initialQty:
                initialData?.initialQty ??
                initialData?.stock ??
                initialData?.inventoryUnits?.length ??
                0,
              imageUrl: initialData.imageUrl || '',
            }
          : emptyValues
      );
      setComponents(
        initialData?.components?.map((c) => ({
          childItemId: c.childItem?.id ?? c.childItemId,
          quantity: c.quantity,
          isRequired: c.isRequired,
        })) || []
      );
    }
  }, [open, initialData, reset]);

  const currentItemId = initialData?.id;
  const availableChildren = items.filter(
    (item) => item.id !== currentItemId && !components.some((c) => c.childItemId === item.id)
  );

  const addComponent = () => {
    if (!selectedChild) return;
    setComponents((prev) => [
      ...prev,
      { childItemId: Number(selectedChild), quantity: 1, isRequired: true },
    ]);
    setSelectedChild('');
  };

  const updateComponent = (index, field, value) => {
    setComponents((prev) => prev.map((c, i) => (i === index ? { ...c, [field]: value } : c)));
  };

  const removeComponent = (index) => {
    setComponents((prev) => prev.filter((_, i) => i !== index));
  };

  const handleFormSubmit = (data) => {
    const payload = {
      code: data.code,
      name: data.name,
      description: data.description,
      categoryId: Number(data.categoryId),
      minStock: Number(data.minStock),
      unit: data.unit,
      initialQty: Number(data.initialQty),
      imageUrl: data.imageUrl,
      components: components.length > 0 ? components : undefined,
    };
    onSubmit(payload);
  };

  return (
    <Dialog
      key={initialData?.id ?? 'new-item'}
      open={open}
      onClose={onClose}
      maxWidth="md"
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
        {isEditing ? 'Editar ítem' : 'Crear ítem'}
      </DialogTitle>
      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <DialogContent className="space-y-4">
          <Box className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextField
              {...register('code')}
              label="Código"
              fullWidth
              size="small"
              error={!!errors.code}
              helperText={errors.code?.message}
            />
            <TextField
              {...register('name')}
              label="Nombre"
              fullWidth
              size="small"
              error={!!errors.name}
              helperText={errors.name?.message}
            />
          </Box>
          <TextField
            {...register('description')}
            label="Descripción"
            fullWidth
            multiline
            rows={2}
            size="small"
            error={!!errors.description}
            helperText={errors.description?.message}
          />
          <Box className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Controller
              name="categoryId"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  label="Categoría"
                  fullWidth
                  size="small"
                  value={field.value === '' || field.value == null ? '' : String(field.value)}
                  error={!!errors.categoryId}
                  helperText={errors.categoryId?.message}
                  onChange={(event) =>
                    field.onChange(event.target.value === '' ? '' : Number(event.target.value))
                  }
                >
                  {categories.map((category) => (
                    <MenuItem key={category.id} value={String(category.id)}>
                      {category.name}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
            <Controller
              name="unit"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  label="Unidad"
                  fullWidth
                  size="small"
                  value={field.value ?? ''}
                  error={!!errors.unit}
                  helperText={errors.unit?.message}
                >
                  {UNIT_OPTIONS.map((unit) => (
                    <MenuItem key={unit.value} value={unit.value}>
                      {unit.label}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
          </Box>
          <Box className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextField
              {...register('minStock')}
              label="Stock mínimo"
              type="number"
              fullWidth
              size="small"
              error={!!errors.minStock}
              helperText={errors.minStock?.message}
            />
            <TextField
              {...register('initialQty')}
              label="Cantidad inicial"
              type="number"
              fullWidth
              size="small"
              error={!!errors.initialQty}
              helperText={errors.initialQty?.message}
            />
          </Box>
          <TextField
            {...register('imageUrl')}
            label="URL de imagen"
            fullWidth
            size="small"
            error={!!errors.imageUrl}
            helperText={errors.imageUrl?.message}
          />
          <Box className="border border-gray-200 rounded-xl p-4 space-y-3">
            <Typography variant="subtitle2" className="font-bold text-sena-black">
              Componentes (opcional)
            </Typography>
            <Typography variant="caption" className="text-gray-500 block">
              Define los ítems que componen este ítem. Útil para equipos como torres de computador.
            </Typography>

            <Box className="flex gap-2 items-start">
              <TextField
                select
                label="Ítem hijo"
                size="small"
                value={selectedChild}
                onChange={(e) => setSelectedChild(e.target.value)}
                className="flex-1"
              >
                <MenuItem value="">Selecciona un ítem</MenuItem>
                {availableChildren.map((item) => (
                  <MenuItem key={item.id} value={item.id}>
                    {item.name} ({item.code})
                  </MenuItem>
                ))}
              </TextField>
              <Button
                variant="outlined"
                onClick={addComponent}
                disabled={!selectedChild}
                sx={{ color: '#00A94F', borderColor: '#00A94F', textTransform: 'none' }}
              >
                Agregar
              </Button>
            </Box>

            {components.length > 0 && (
              <Box className="space-y-2">
                {components.map((component, index) => {
                  const child = items.find((i) => i.id === component.childItemId);
                  return (
                    <Box
                      key={component.childItemId}
                      className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg"
                    >
                      <Typography variant="body2" className="flex-1 font-medium">
                        {child?.name || component.childItemId}
                      </Typography>
                      <TextField
                        type="number"
                        label="Cantidad"
                        size="small"
                        value={component.quantity}
                        onChange={(e) =>
                          updateComponent(
                            index,
                            'quantity',
                            Math.max(1, Number(e.target.value) || 1)
                          )
                        }
                        className="w-24"
                      />
                      <FormControlLabel
                        control={
                          <Switch
                            checked={component.isRequired}
                            onChange={(e) => updateComponent(index, 'isRequired', e.target.checked)}
                          />
                        }
                        label="Requerido"
                      />
                      <Button
                        size="small"
                        color="error"
                        onClick={() => removeComponent(index)}
                        sx={{ textTransform: 'none' }}
                      >
                        Quitar
                      </Button>
                    </Box>
                  );
                })}
              </Box>
            )}
          </Box>
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
            {isEditing ? 'Guardar cambios' : 'Crear ítem'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
