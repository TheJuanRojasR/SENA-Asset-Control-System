import { useState } from 'react';
import {
  AppBar,
  Badge,
  Toolbar,
  Typography,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Box,
  Divider,
  Tooltip,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../stores/authStore.js';
import LogoUrl from '../../assets/SENA_SENA BLANCO.png';
import { useCartStore, selectTotalItems } from '../../stores/cartStore.js';
import { Logo } from './Logo.jsx';
import { MiniCartDrawer } from './MiniCartDrawer.jsx';
import { ROLE_LABELS, ROLES } from '../../constants/roles.js';

export function Navbar({ onMenuToggle }) {
  const { user, logout } = useAuthStore();
  const [anchorEl, setAnchorEl] = useState(null);
  const [cartOpen, setCartOpen] = useState(false);
  const totalCartItems = useCartStore(selectTotalItems);
  const isInstructor = user?.role === ROLES.INSTRUCTOR;

  const handleOpen = (event) => setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);
  const handleLogout = () => {
    handleClose();
    logout();
  };

  return (
    <AppBar
      position="fixed"
      sx={{
        backgroundColor: '#00A94F',
        zIndex: (theme) => theme.zIndex.drawer + 1,
      }}
    >
      <Toolbar className="flex justify-between">
        <Box className="flex items-center gap-3">
          <IconButton
            edge="start"
            color="inherit"
            onClick={onMenuToggle}
            aria-label="Alternar menú"
          >
            <MenuIcon />
          </IconButton>
          <img src={LogoUrl} alt="Logo SENA" className="h-10" />
          <Typography variant="h6" component="div" className="hidden sm:block font-bold">
            Inventario SENA
          </Typography>
        </Box>

        <Box className="flex items-center gap-3">
          {isInstructor && (
            <Tooltip title="Ver carrito">
              <IconButton
                color="inherit"
                onClick={() => setCartOpen(true)}
                aria-label={`Abrir carrito, ${totalCartItems} unidades`}
              >
                <motion.span
                  key={totalCartItems}
                  initial={{ scale: 1.4 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                  style={{ display: 'inline-flex' }}
                >
                  <Badge badgeContent={totalCartItems} color="error" max={99} overlap="circular">
                    <ShoppingCartIcon />
                  </Badge>
                </motion.span>
              </IconButton>
            </Tooltip>
          )}

          <Typography variant="body2" className="hidden md:block">
            {user?.fullName} — {ROLE_LABELS[user?.role]}
          </Typography>
          <IconButton onClick={handleOpen} color="inherit" aria-label="Menú de usuario">
            <Avatar sx={{ bgcolor: '#007A3D' }}>{user?.fullName?.charAt(0) || 'U'}</Avatar>
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          >
            <Box className="px-4 py-2">
              <Typography variant="subtitle2" className="font-bold">
                {user?.fullName}
              </Typography>
              <Typography variant="caption" className="text-gray-500">
                {ROLE_LABELS[user?.role]}
              </Typography>
            </Box>
            <Divider />
            <MenuItem onClick={handleLogout}>Cerrar sesión</MenuItem>
          </Menu>
        </Box>
      </Toolbar>

      {isInstructor && <MiniCartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />}
    </AppBar>
  );
}
