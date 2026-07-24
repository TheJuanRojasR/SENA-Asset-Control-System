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
  FormControlLabel,
  Switch,
  TextField,
  InputAdornment,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import { motion } from 'framer-motion';
import { PageContainer } from '../../components/ui/PageContainer.jsx';
import { DataTable } from '../../components/ui/DataTable.jsx';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.jsx';
import { Toast } from '../../components/ui/Toast.jsx';
import { useToast } from '../../hooks/useToast.js';
import { environmentsApi } from '../../api/environments.api.js';
import { extractListData } from '../../utils/api.js';

const environmentSchema = z.object({
  code: z.string().min(2, 'El código debe tener al menos 2 caracteres'),
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  location: z.string().min(3, 'La ubicación debe tener al menos 3 caracteres'),
  isActive: z.boolean().default(true),
});

const emptyValues = {
  code: '',
  name: '',
  location: '',
  isActive: true,
};

const breadcrumbs = [{ label: 'Inicio', to: '/admin' }, { label: 'Ambientes' }];

export function EnvironmentsPage() {
  const queryClient = useQueryClient();
  const { toast, showToast, hideToast } = useToast();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data: environments, isLoading } = useQuery({
    queryKey: ['environments'],
    queryFn: () => environmentsApi.getAll(),
    select: extractListData,
  });

  const createMutation = useMutation({
    mutationFn: environmentsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['environments'] });
      showToast('Ambiente creado correctamente', 'success');
      handleCloseDialog();
    },
    onError: (error) => {
      showToast(error?.response?.data?.message || 'Error al crear ambiente', 'error');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => environmentsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['environments'] });
      showToast('Ambiente actualizado correctamente', 'success');
      handleCloseDialog();
    },
    onError: (error) => {
      showToast(error?.response?.data?.message || 'Error al actualizar ambiente', 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => environmentsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['environments'] });
      showToast('Ambiente eliminado correctamente', 'success');
      setDeleteTarget(null);
    },
    onError: (error) => {
      showToast(error?.response?.data?.message || 'Error al eliminar ambiente', 'error');
    },
  });

  const safeEnvironments = useMemo(
    () => (Array.isArray(environments) ? environments : []),
    [environments]
  );

  const filteredEnvironments = useMemo(() => {
    if (!search.trim()) return safeEnvironments;
    const term = search.toLowerCase();
    return safeEnvironments.filter(
      (e) =>
        e.code?.toLowerCase().includes(term) ||
        e.name?.toLowerCase().includes(term) ||
        e.location?.toLowerCase().includes(term)
    );
  }, [safeEnvironments, search]);

  const handleOpenCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (environment) => {
    setEditing(environment);
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
    { field: 'code', headerName: 'Código' },
    { field: 'name', headerName: 'Nombre' },
    { field: 'location', headerName: 'Ubicación' },
    { field: 'isActive', headerName: 'Estado' },
  ];

  return (
    <PageContainer title="Gestión de ambientes" breadcrumbs={breadcrumbs}>
      <Box className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <TextField
          placeholder="Buscar por código, nombre o ubicación..."
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
          Crear ambiente
        </Button>
      </Box>

      <DataTable
        columns={columns}
        rows={filteredEnvironments}
        loading={isLoading}
        emptyMessage="No se encontraron ambientes."
        onEdit={handleOpenEdit}
        onDelete={setDeleteTarget}
      />

      <EnvironmentFormDialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        initialData={editing}
        onSubmit={handleSubmit}
        loading={createMutation.isPending || updateMutation.isPending}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Eliminar ambiente"
        message={`¿Estás seguro de eliminar el ambiente ${deleteTarget?.name}? Esta acción no se puede deshacer.`}
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
    </PageContainer>
  );
}

function EnvironmentFormDialog({ open, onClose, initialData, onSubmit, loading }) {
  const isEditing = Boolean(initialData);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(environmentSchema),
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
        {isEditing ? 'Editar ambiente' : 'Crear ambiente'}
      </DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent className="space-y-4">
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
          <TextField
            {...register('location')}
            label="Ubicación"
            fullWidth
            size="small"
            error={!!errors.location}
            helperText={errors.location?.message}
          />
          <FormControlLabel
            control={<Switch {...register('isActive')} defaultChecked />}
            label="Activo"
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
            {isEditing ? 'Guardar cambios' : 'Crear ambiente'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
