import { Paper, Box, Typography } from '@mui/material';
import { motion } from 'framer-motion';

export function StatCard({ icon, value, label, color = '#00A94F' }) {
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 300 }}
      className="h-full"
    >
      <Paper className="p-5 rounded-xl flex items-center gap-4 shadow-sm border border-gray-100 h-full">
        <Box className="p-3 rounded-full text-white shrink-0" sx={{ backgroundColor: color }}>
          {icon}
        </Box>
        <div>
          <Typography variant="h5" className="font-bold text-sena-black">
            {value}
          </Typography>
          <Typography variant="body2" className="text-gray-500">
            {label}
          </Typography>
        </div>
      </Paper>
    </motion.div>
  );
}
