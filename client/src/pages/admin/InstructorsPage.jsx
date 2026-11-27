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
  IconButton,
  MenuItem,
  TextField,
  InputAdornment,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import LockResetIcon from '@mui/icons-material/LockReset';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { motion } from 'framer-motion';
import { PageContainer } from '../../components/ui/PageContainer.jsx';
import { DataTable } from '../../components/ui/DataTable.jsx';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.jsx';
import { Toast } from '../../components/ui/Toast.jsx';
import { useToast } from '../../hooks/useToast.js';
import { usersApi } from '../../api/users.api.js';
import { extractListData } from '../../utils/api.js';
import { ROLES } from '../../constants/roles.js';
import { SHIFT_OPTIONS } from '../../constants/inventory.js';
import { DOCUMENT_TYPES } from '../../constants/users.js';

/**
 * RN-USR-02: nombre, tipo de documento, número de documento, teléfono celular, turno y correo
 * son obligatorios en el alta; la foto es opcional (AC-USR-01-2/3).
 * RN-USR-09 / AC-USR-06-2: la aplicación nunca crea administradores, así que esta pantalla
 * solo da de alta INSTRUCTOR y no ofrece selector de rol.
 */
const baseSchema = z.object({
  fullName: z.string().min(3, 'El nombre completo debe tener al menos 3 caracteres'),
  email: z.string().email('Correo electrónico inválido'),
  documentType: z.string().min(2, 'Selecciona el tipo de documento'),
  document: z.string().min(5, 'El documento debe tener al menos 5 caracteres'),
  phone: z.string().min(7, 'El teléfono celular debe tener al menos 7 caracteres'),
  shift: z.string().min(1, 'El turno es obligatorio'),
});

const createSchema = baseSchema.extend({
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

// AC-USR-02-3: editar los datos del padrón no toca la contraseña; el restablecimiento es una
// acción aparte (AC-USR-05-1).
const editSchema = baseSchema;

const emptyValues = {
  fullName: '',
  email: '',
  password: '',
  shift: '',
  phone: '',
  document: '',
  documentType: 'CC',
};

const breadcrumbs = [{ label: 'Inicio', to: '/admin' }, { label: 'Instructores' }];

const documentTypeLabel = (value) =>
  DOCUMENT_TYPES.find((type) => type.value === value)?.label || value || '-';

export function InstructorsPage() {
  const queryClient = useQueryClient();
  const { toast, showToast, hideToast } = useToast();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [passwordTarget, setPasswordTarget] = useState(null);
  const [passwordValue, setPasswordValue] = useState('');

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
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      // RN-USR-08: si el instructor tiene historial, el backend lo desactiva y lo informa.
      showToast(response?.data?.message || 'Instructor eliminado correctamente', 'success');
      setDeleteTarget(null);
    },
    onError: (error) => {
      showToast(error?.response?.data?.message || 'Error al eliminar instructor', 'error');
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, isActive }) => usersApi.updateStatus(id, isActive),
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      showToast(
        response?.data?.message ||
          (variables.isActive ? 'Instructor reactivado' : 'Instructor desactivado'),
        'success'
      );
    },
    onError: (error) => {
      showToast(error?.response?.data?.message || 'Error al cambiar el estado', 'error');
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: ({ id, newPassword }) => usersApi.resetPassword(id, newPassword),
    onSuccess: () => {
      showToast('Contraseña restablecida correctamente', 'success');
      setPasswordTarget(null);
      setPasswordValue('');
    },
    onError: (error) => {
      showToast(error?.response?.data?.message || 'Error al restablecer la contraseña', 'error');
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
    if (editing) {
      const payload = { ...data };
      delete payload.password;
      updateMutation.mutate({ id: editing.id, data: payload });
      return;
    }
    createMutation.mutate({ ...data, role: ROLES.INSTRUCTOR });
  };

  const handleConfirmDelete = () => {
    if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
  };

  const handleToggleStatus = (user) => {
    statusMutation.mutate({ id: user.id, isActive: !user.isActive });
  };

  const handleConfirmResetPassword = () => {
    if (passwordTarget && passwordValue.length >= 6) {
      resetPasswordMutation.mutate({ id: passwordTarget.id, newPassword: passwordValue });
    }
  };

  const closePasswordDialog = () => {
    setPasswordTarget(null);
    setPasswordValue('');
  };

  const columns = [
    {
      field: 'documentType',
      headerName: 'Tipo doc.',
      width: 110,
      render: (value) => documentTypeLabel(value),
    },
    { field: 'document', headerName: 'Documento' },
    { field: 'fullName', headerName: 'Nombre completo' },
    { field: 'email', headerName: 'Correo' },
    {
      field: 'shift',
      headerName: 'Turno',
      render: (value) => SHIFT_OPTIONS.find((s) => s.value === value)?.label || value || '-',
    },
    { field: 'phone', headerName: 'Teléfono' },
    { field: 'isActive', headerName: 'Estado' },
  ];

  const renderRowActions = (row) => (
    <Box className="flex justify-end gap-1">
      <IconButton
        size="small"
        onClick={() => handleOpenEdit(row)}
        aria-label="Editar"
        className="text-sena-green hover:text-sena-greenDark"
      >
        <EditIcon fontSize="small" />
      </IconButton>
      <IconButton
        size="small"
        onClick={() => handleToggleStatus(row)}
        disabled={statusMutation.isPending}
        aria-label={row.isActive ? 'Desactivar' : 'Reactivar'}
        className={row.isActive ? 'text-amber-600 hover:text-amber-800' : 'text-sena-green'}
      >
        {row.isActive ? <BlockIcon fontSize="small" /> : <CheckCircleIcon fontSize="small" />}
      </IconButton>
      <IconButton
        size="small"
        onClick={() => setPasswordTarget(row)}
        aria-label="Restablecer contraseña"
        className="text-blue-600 hover:text-blue-800"
      >
        <LockResetIcon fontSize="small" />
      </IconButton>
      <IconButton
        size="small"
        onClick={() => setDeleteTarget(row)}
        aria-label="Eliminar"
        className="text-red-500 hover:text-red-700"
      >
        <DeleteIcon fontSize="small" />
      </IconButton>
    </Box>
  );

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
        renderActions={renderRowActions}
      />

      <InstructorFormDialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        initialData={editing}
        onSubmit={handleSubmit}
        loading={createMutation.isPending || updateMutation.isPending}
      />

      <Dialog open={Boolean(passwordTarget)} onClose={closePasswordDialog} maxWidth="xs" fullWidth>
        <DialogTitle className="font-bold text-sena-black">Restablecer contraseña</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label={`Nueva contraseña para ${passwordTarget?.fullName || ''}`}
            type="password"
            fullWidth
            size="small"
            value={passwordValue}
            onChange={(event) => setPasswordValue(event.target.value)}
            helperText="El instructor deberá iniciar sesión con esta contraseña; se cierran sus sesiones."
          />
        </DialogContent>
        <DialogActions className="px-6 pb-4">
          <Button onClick={closePasswordDialog} color="inherit" variant="outlined">
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleConfirmResetPassword}
            disabled={passwordValue.length < 6 || resetPasswordMutation.isPending}
            sx={{ backgroundColor: '#00A94F', '&:hover': { backgroundColor: '#007A3D' } }}
          >
            Restablecer
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Eliminar instructor"
        message={`¿Estás seguro de eliminar a ${deleteTarget?.fullName}? Si tiene historial (solicitudes o préstamos), el sistema lo desactivará en lugar de borrarlo.`}
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
              documentType: initialData.documentType || 'CC',
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
          <TextField
            {...register('documentType')}
            select
            label="Tipo de documento"
            fullWidth
            size="small"
            error={!!errors.documentType}
            helperText={errors.documentType?.message}
          >
            {DOCUMENT_TYPES.map((type) => (
              <MenuItem key={type.value} value={type.value}>
                {type.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            {...register('document')}
            label="Número de documento"
            fullWidth
            size="small"
            error={!!errors.document}
            helperText={errors.document?.message}
          />
          <TextField
            {...register('phone')}
            label="Teléfono celular"
            fullWidth
            size="small"
            error={!!errors.phone}
            helperText={errors.phone?.message}
          />
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
