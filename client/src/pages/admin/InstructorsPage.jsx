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
  MenuItem,
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
import { usersApi } from '../../api/users.api.js';
import { extractListData } from '../../utils/api.js';
import { ROLES, ROLE_LABELS } from '../../constants/roles.js';
import { SHIFT_OPTIONS } from '../../constants/inventory.js';

const baseSchema = z.object({
  fullName: z.string().min(3, 'El nombre completo debe tener al menos 3 caracteres'),
  email: z.string().email('Correo electrónico inválido'),
  role: z.enum([ROLES.ADMIN, ROLES.INSTRUCTOR], 'Selecciona un rol'),
  shift: z.string().optional(),
  phone: z.string().optional(),
  document: z.string().min(5, 'El documento debe tener al menos 5 caracteres'),
  isActive: z.boolean().default(true),
});

const createSchema = baseSchema
  .extend({
    password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  })
  .refine((data) => data.role !== ROLES.INSTRUCTOR || !!data.shift, {
    message: 'El turno es obligatorio para instructores',
    path: ['shift'],
  });

const editSchema = baseSchema
  .extend({
    password: z.string().optional(),
  })
  .refine((data) => data.role !== ROLES.INSTRUCTOR || !!data.shift, {
    message: 'El turno es obligatorio para instructores',
    path: ['shift'],
  });

const emptyValues = {
  fullName: '',
  email: '',
  password: '',
  role: ROLES.INSTRUCTOR,
  shift: '',
  phone: '',
  document: '',
  isActive: true,
};

const breadcrumbs = [{ label: 'Inicio', to: '/admin' }, { label: 'Instructores' }];

export function InstructorsPage() {
  const queryClient = useQueryClient();
  const { toast, showToast, hideToast } = useToast();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.getAll({ role: ROLES.INSTRUCTOR }),
    select: extractListData,
  });

  const createMutation = useMutation({
    mutationFn: usersApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      showToast('Instructor creado correctamente', 'success');
      handleCloseDialog();
    },
    onError: (error) => {
      showToast(error?.response?.data?.message || 'Error al crear instructor', 'error');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => usersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      showToast('Instructor actualizado correctamente', 'success');
      handleCloseDialog();
    },
    onError: (error) => {
      showToast(error?.response?.data?.message || 'Error al actualizar instructor', 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => usersApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      showToast('Instructor eliminado correctamente', 'success');
      setDeleteTarget(null);
    },
    onError: (error) => {
      showToast(error?.response?.data?.message || 'Error al eliminar instructor', 'error');
    },
  });

  const safeUsers = useMemo(() => (Array.isArray(users) ? users : []), [users]);

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return safeUsers;
    const term = search.toLowerCase();
    return safeUsers.filter(
      (u) =>
        u.fullName?.toLowerCase().includes(term) ||
        u.email?.toLowerCase().includes(term) ||
        u.document?.toLowerCase().includes(term)
    );
  }, [safeUsers, search]);

  const handleOpenCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (user) => {
    setEditing(user);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditing(null);
  };

  const handleSubmit = (data) => {
    const payload = { ...data };
    if (payload.role !== ROLES.INSTRUCTOR) {
      payload.shift = undefined;
    }
    if (editing) {
      if (!payload.password) delete payload.password;
      updateMutation.mutate({ id: editing.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleConfirmDelete = () => {
    if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
  };

  const columns = [
    { field: 'document', headerName: 'Documento' },
    { field: 'fullName', headerName: 'Nombre completo' },
    { field: 'email', headerName: 'Correo' },
    {
      field: 'role',
      headerName: 'Rol',
      render: (value) => ROLE_LABELS[value] || value,
    },
    {
      field: 'shift',
      headerName: 'Turno',
      render: (value) => SHIFT_OPTIONS.find((s) => s.value === value)?.label || value || '-',
    },
    { field: 'phone', headerName: 'Teléfono' },
    { field: 'isActive', headerName: 'Estado' },
  ];

  return (
    <PageContainer title="Gestión de instructores" breadcrumbs={breadcrumbs}>
      <Box className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <TextField
          placeholder="Buscar por nombre, correo o documento..."
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
          Crear instructor
        </Button>
      </Box>

      <DataTable
        columns={columns}
        rows={filteredUsers}
        loading={isLoading}
        emptyMessage="No se encontraron instructores."
        onEdit={handleOpenEdit}
        onDelete={setDeleteTarget}
      />

      <InstructorFormDialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        initialData={editing}
        onSubmit={handleSubmit}
        loading={createMutation.isPending || updateMutation.isPending}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Eliminar instructor"
        message={`¿Estás seguro de eliminar a ${deleteTarget?.fullName}? Esta acción no se puede deshacer.`}
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

function InstructorFormDialog({ open, onClose, initialData, onSubmit, loading }) {
  const isEditing = Boolean(initialData);
  const schema = isEditing ? editSchema : createSchema;
  const {
    register,
    handleSubmit,
    watch,
    reset,
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
              password: '',
            }
          : emptyValues
      );
    }
  }, [open, initialData, reset]);

  const role = watch('role');

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
        {isEditing ? 'Editar instructor' : 'Crear instructor'}
      </DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent className="space-y-4">
          <TextField
            {...register('fullName')}
            label="Nombre completo"
            fullWidth
            size="small"
            error={!!errors.fullName}
            helperText={errors.fullName?.message}
          />
          <TextField
            {...register('email')}
            label="Correo electrónico"
            fullWidth
            size="small"
            error={!!errors.email}
            helperText={errors.email?.message}
          />
          {!isEditing && (
            <TextField
              {...register('password')}
              label="Contraseña"
              type="password"
              fullWidth
              size="small"
              error={!!errors.password}
              helperText={errors.password?.message}
            />
          )}
          {isEditing && (
            <TextField
              {...register('password')}
              label="Nueva contraseña (opcional)"
              type="password"
              fullWidth
              size="small"
              error={!!errors.password}
              helperText={errors.password?.message}
            />
          )}
          <TextField
            {...register('document')}
            label="Documento"
            fullWidth
            size="small"
            error={!!errors.document}
            helperText={errors.document?.message}
          />
          <TextField
            {...register('phone')}
            label="Teléfono"
            fullWidth
            size="small"
            error={!!errors.phone}
            helperText={errors.phone?.message}
          />
          <TextField
            {...register('role')}
            select
            label="Rol"
            fullWidth
            size="small"
            error={!!errors.role}
            helperText={errors.role?.message}
          >
            <MenuItem value={ROLES.INSTRUCTOR}>{ROLE_LABELS[ROLES.INSTRUCTOR]}</MenuItem>
            <MenuItem value={ROLES.ADMIN}>{ROLE_LABELS[ROLES.ADMIN]}</MenuItem>
          </TextField>
          {role === ROLES.INSTRUCTOR && (
            <TextField
              {...register('shift')}
              select
              label="Turno"
              fullWidth
              size="small"
              error={!!errors.shift}
              helperText={errors.shift?.message}
            >
              {SHIFT_OPTIONS.map((shift) => (
                <MenuItem key={shift.value} value={shift.value}>
                  {shift.label}
                </MenuItem>
              ))}
            </TextField>
          )}
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
            {isEditing ? 'Guardar cambios' : 'Crear instructor'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
