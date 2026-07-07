import { Box, Typography, Button } from '@mui/material';
import ConstructionIcon from '@mui/icons-material/Construction';
import { Link } from 'react-router-dom';

export function UnderConstructionPage() {
  return (
    <Box className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6">
      <Box className="bg-sena-green-light/30 p-6 rounded-full mb-6">
        <ConstructionIcon className="text-sena-green" sx={{ fontSize: 64 }} />
      </Box>
      <Typography variant="h4" className="font-bold text-sena-black mb-2">
        Página en construcción
      </Typography>
      <Typography variant="body1" className="text-gray-500 mb-6 max-w-md">
        Estamos trabajando para traerte esta funcionalidad muy pronto.
      </Typography>
      <Button
        component={Link}
        to="/"
        variant="contained"
        sx={{ backgroundColor: '#00A94F', '&:hover': { backgroundColor: '#007A3D' } }}
      >
        Volver al inicio
      </Button>
    </Box>
  );
}
