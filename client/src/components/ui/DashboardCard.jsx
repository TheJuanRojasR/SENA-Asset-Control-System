import { Paper, Box, Typography, Skeleton } from '@mui/material';
import { motion } from 'framer-motion';

const colorSchemes = {
  green: {
    bg: 'linear-gradient(135deg, #00A94F 0%, #007A3D 100%)',
    soft: '#E8F5E9',
    text: '#007A3D',
  },
  orange: {
    bg: 'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)',
    soft: '#FFF3E0',
    text: '#E65100',
  },
  red: {
    bg: 'linear-gradient(135deg, #EF5350 0%, #C62828 100%)',
    soft: '#FFEBEE',
    text: '#C62828',
  },
  blue: {
    bg: 'linear-gradient(135deg, #42A5F5 0%, #1565C0 100%)',
    soft: '#E3F2FD',
    text: '#1565C0',
  },
  purple: {
    bg: 'linear-gradient(135deg, #AB47BC 0%, #6A1B9A 100%)',
    soft: '#F3E5F5',
    text: '#6A1B9A',
  },
};

export function DashboardCard({
  icon,
  value,
  label,
  description,
  color = 'green',
  loading = false,
  onClick,
}) {
  const scheme = colorSchemes[color] ?? colorSchemes.green;
  const clickable = Boolean(onClick);

  return (
    <motion.div
      whileHover={clickable ? { y: -6, scale: 1.02 } : { y: -4 }}
      whileTap={clickable ? { scale: 0.98 } : undefined}
      transition={{ type: 'spring', stiffness: 300, damping: 18 }}
      className="h-full"
      onClick={onClick}
      style={{ cursor: clickable ? 'pointer' : 'default' }}
    >
      <Paper
        className="h-full p-5 rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative"
        sx={{ backgroundColor: '#ffffff' }}
      >
        <Box
          className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10 -mr-10 -mt-10"
          sx={{ background: scheme.bg }}
        />
        <Box className="flex items-start gap-4 relative">
          <Box
            className="p-3 rounded-xl shrink-0 text-white shadow-md"
            sx={{ background: scheme.bg }}
          >
            {icon}
          </Box>
          <Box className="flex-1 min-w-0">
            {loading ? (
              <Skeleton variant="text" width={60} height={40} />
            ) : (
              <Typography variant="h4" className="font-bold text-sena-black">
                {value}
              </Typography>
            )}
            <Typography variant="body2" className="text-gray-500 font-medium">
              {label}
            </Typography>
            {description && (
              <Typography
                variant="caption"
                className="block mt-2 font-semibold px-2 py-1 rounded-md w-fit"
                sx={{ backgroundColor: scheme.soft, color: scheme.text }}
              >
                {description}
              </Typography>
            )}
          </Box>
        </Box>
      </Paper>
    </motion.div>
  );
}
