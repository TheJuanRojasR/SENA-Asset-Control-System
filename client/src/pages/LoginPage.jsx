import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Box, Paper, TextField, Button, Typography, Alert, CircularProgress } from '@mui/material';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore.js';
import { Logo } from '../components/common/Logo.jsx';
import { DotField } from '../components/reactbits/DotField.jsx';
import { ROLES } from '../constants/roles.js';

const loginSchema = z.object({
  email: z.string().email('Correo inválido'),
  password: z.string().min(1, 'Ingrese su contraseña'),
});

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { staggerChildren: 0.12 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut' },
  },
};

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data) => {
    setLoading(true);
    setError(null);
    const result = await login(data);
    setLoading(false);

    if (result.success) {
      const user = useAuthStore.getState().user;
      navigate(user?.role === ROLES.ADMIN ? '/admin' : '/instructor', { replace: true });
    } else {
      setError(result.message);
    }
  };

  return (
    <Box className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-sena-green-dark to-sena-green">
      <DotField />

      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="relative z-10 w-full max-w-md px-4"
      >
        <Paper elevation={8} className="glass w-full p-8 rounded-2xl">
          <Box className="flex flex-col items-center mb-6">
            <motion.div variants={itemVariants}>
              <Logo className="h-20 mb-4" />
            </motion.div>
            <motion.div variants={itemVariants}>
              <Typography
                variant="h5"
                component="h1"
                className="font-bold text-sena-black text-center"
              >
                Sistema de Gestión de Inventario
              </Typography>
            </motion.div>
            <motion.div variants={itemVariants}>
              <Typography variant="body2" className="text-gray-600 text-center mt-1">
                Ambiente 104 · SENA Quirigüa
              </Typography>
            </motion.div>
          </Box>

          {error && (
            <Alert severity="error" className="mb-4">
              {error}
            </Alert>
          )}

          <motion.form
            variants={itemVariants}
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4"
          >
            <TextField
              fullWidth
              label="Correo institucional"
              type="email"
              {...register('email')}
              error={!!errors.email}
              helperText={errors.email?.message}
            />
            <TextField
              fullWidth
              label="Contraseña"
              type="password"
              {...register('password')}
              error={!!errors.password}
              helperText={errors.password?.message}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loading}
              sx={{ backgroundColor: '#00A94F', '&:hover': { backgroundColor: '#007A3D' } }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Iniciar sesión'}
            </Button>
          </motion.form>

          <motion.div variants={itemVariants}>
            <Typography variant="caption" className="block text-center mt-4 text-gray-600">
              ¿Problemas para acceder? Contacta al administrador
            </Typography>
          </motion.div>
        </Paper>
      </motion.div>
    </Box>
  );
}
