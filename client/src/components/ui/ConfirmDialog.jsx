import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  CircularProgress,
} from '@mui/material';
import { motion } from 'framer-motion';

export function ConfirmDialog({
  open,
  title = 'Confirmar acción',
  message = '¿Estás seguro de realizar esta acción?',
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  onConfirm,
  onCancel,
  loading = false,
  confirmColor = 'error',
  children,
}) {
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      PaperComponent={motion.div}
      PaperProps={{
        initial: { opacity: 0, scale: 0.92, y: 12 },
        animate: { opacity: 1, scale: 1, y: 0 },
        transition: { duration: 0.2 },
        className: 'rounded-xl',
        sx: { backgroundColor: '#ffffff' },
      }}
    >
      <DialogTitle className="font-bold text-sena-black">{title}</DialogTitle>
      <DialogContent>
        <DialogContentText className="text-gray-600">{message}</DialogContentText>
        {children}
      </DialogContent>
      <DialogActions className="px-6 pb-4">
        <Button onClick={onCancel} disabled={loading} variant="outlined" color="inherit">
          {cancelText}
        </Button>
        <Button
          onClick={onConfirm}
          disabled={loading}
          variant="contained"
          color={confirmColor}
          startIcon={loading ? <CircularProgress size={18} color="inherit" /> : null}
          sx={{
            backgroundColor: confirmColor === 'primary' ? '#00A94F' : undefined,
            '&:hover': { backgroundColor: confirmColor === 'primary' ? '#007A3D' : undefined },
          }}
        >
          {confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
