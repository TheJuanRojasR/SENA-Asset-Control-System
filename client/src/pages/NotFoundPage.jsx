import { Box, Typography, Button } from '@mui/material';
import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <Box className="min-h-screen flex flex-col items-center justify-center text-center p-6">
      <Typography variant="h1" className="font-bold text-sena-green text-9xl">
        404
      </Typography>
      <Typography variant="h5" className="mt-4 mb-6">
        Página no encontrada
      </Typography>
      <Button component={Link} to="/" variant="contained" sx={{ backgroundColor: '#00A94F' }}>
        Volver al inicio
      </Button>
    </Box>
  );
}
