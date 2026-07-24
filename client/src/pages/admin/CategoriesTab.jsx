import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  InputAdornment,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import { motion } from 'framer-motion';
import { DataTable } from '../../components/ui/DataTable.jsx';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.jsx';
import { Toast } from '../../components/ui/Toast.jsx';
import { useToast } from '../../hooks/useToast.js';
import { categoriesApi } from '../../api/categories.api.js';
import { extractListData } from '../../utils/api.js';

const categorySchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  description: z.string().optional(),
});

const emptyValues = {
  name: '',
  description: '',
};

export function CategoriesTab() {
  const queryClient = useQueryClient();
  const { toast, showToast, hideToast } = useToast();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data: categories, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.getAll(),
    select: extractListData,
  });

  const createMutation = useMutation({
    mutationFn: categoriesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      showToast('Categoría creada correctamente', 'success');
      handleCloseDialog();
    },
    onError: (error) => {
      showToast(error?.response?.data?.message || 'Error al crear categoría', 'error');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => categoriesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      showToast('Categoría actualizada correctamente', 'success');
      handleCloseDialog();
    },
    onError: (error) => {
      showToast(error?.response?.data?.message || 'Error al actualizar categoría', 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => categoriesApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      showToast('Categoría eliminada correctamente', 'success');
      setDeleteTarget(null);
    },
    onError: (error) => {
      showToast(error?.response?.data?.message || 'Error al eliminar categoría', 'error');
    },
  });

  const safeCategories = useMemo(() => (Array.isArray(categories) ? categories : []), [categories]);

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return safeCategories;
    const term = search.toLowerCase();
    return safeCategories.filter(
      (c) => c.name?.toLowerCase().includes(term) || c.description?.toLowerCase().includes(term)
    );
  }, [safeCategories, search]);

  const handleOpenCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (category) => {
    setEditing(category);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditing(null);
  };

  const handleSubmit = (data) => {
    if (editing) {
      updateMutation.mutate({ id: editing.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleConfirmDelete = () => {
    if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
  };

  const columns = [
    { field: 'name', headerName: 'Nombre' },
    { field: 'description', headerName: 'Descripción' },
  ];

  return (
    <Box>
      <Box className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <TextField
          placeholder="Buscar categoría..."
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
          sx={{
            backgroundColor: '#00A94F',
            '&:hover': { backgroundColor: '#007A3D' },
            textTransform: 'none',
          }}
        >
          Crear categoría
        </Button>
      </Box>

      <DataTable
        columns={columns}
        rows={filteredCategories}
        loading={isLoading}
        emptyMessage="No se encontraron categorías."
        onEdit={handleOpenEdit}
        onDelete={setDeleteTarget}
      />

      <CategoryFormDialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        initialData={editing}
        onSubmit={handleSubmit}
        loading={createMutation.isPending || updateMutation.isPending}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Eliminar categoría"
        message={`¿Estás seguro de eliminar la categoría ${deleteTarget?.name}? Esta acción no se puede deshacer.`}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleteMutation.isPending}
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

function CategoryFormDialog({ open, onClose, initialData, onSubmit, loading }) {
  const isEditing = Boolean(initialData);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(categorySchema),
    defaultValues: emptyValues,
  });

  useEffect(() => {
    if (open) {
      reset(initialData ? { ...emptyValues, ...initialData } : emptyValues);
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
        {isEditing ? 'Editar categoría' : 'Crear categoría'}
      </DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent className="space-y-4">
          <TextField
            {...register('name')}
            label="Nombre"
            fullWidth
            size="small"
            error={!!errors.name}
            helperText={errors.name?.message}
          />
          <TextField
            {...register('description')}
            label="Descripción"
            fullWidth
            multiline
            rows={3}
            size="small"
            error={!!errors.description}
            helperText={errors.description?.message}
          />
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
            {isEditing ? 'Guardar cambios' : 'Crear categoría'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
