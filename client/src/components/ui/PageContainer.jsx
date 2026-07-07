import { Box, Typography, Breadcrumbs, Link } from '@mui/material';
import { motion } from 'framer-motion';
import { Link as RouterLink } from 'react-router-dom';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';

export function PageContainer({ title, breadcrumbs = [], children }) {
  return (
    <Box>
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {breadcrumbs.length > 0 && (
          <Breadcrumbs
            separator={<NavigateNextIcon fontSize="small" />}
            className="mb-2 text-gray-500"
          >
            {breadcrumbs.map((crumb, index) => {
              const isLast = index === breadcrumbs.length - 1;
              return isLast || !crumb.to ? (
                <Typography key={crumb.label} color="text.primary">
                  {crumb.label}
                </Typography>
              ) : (
                <Link
                  key={crumb.label}
                  component={RouterLink}
                  to={crumb.to}
                  color="inherit"
                  underline="hover"
                >
                  {crumb.label}
                </Link>
              );
            })}
          </Breadcrumbs>
        )}
        <Typography variant="h4" component="h1" className="font-bold mb-6 text-sena-black">
          {title}
        </Typography>
      </motion.div>
      {children}
    </Box>
  );
}
