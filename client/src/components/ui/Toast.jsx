import { Snackbar, Alert } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';

export function Toast({ open, message, severity = 'success', onClose, autoHideDuration = 4000 }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.25 }}
        >
          <Snackbar
            open={open}
            autoHideDuration={autoHideDuration}
            onClose={onClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          >
            <Alert
              onClose={onClose}
              severity={severity}
              variant="filled"
              sx={{ width: '100%', borderRadius: 2 }}
            >
              {message}
            </Alert>
          </Snackbar>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
