import { NavLink, useLocation } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Tooltip,
  Box,
  IconButton,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import InventoryIcon from '@mui/icons-material/Inventory';
import PeopleIcon from '@mui/icons-material/People';
import CategoryIcon from '@mui/icons-material/Category';
import RequestQuoteIcon from '@mui/icons-material/RequestQuote';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import MenuOpenIcon from '@mui/icons-material/MenuOpen';
import AssignmentReturnIcon from '@mui/icons-material/AssignmentReturn';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useAuthStore } from '../../stores/authStore.js';
import { ROLES } from '../../constants/roles.js';

const DRAWER_WIDTH_EXPANDED = 260;
const DRAWER_WIDTH_COLLAPSED = 72;

const adminMenu = [
  { label: 'Dashboard', path: '/admin', icon: <DashboardIcon /> },
  { label: 'Instructores', path: '/admin/instructores', icon: <PeopleIcon /> },
  { label: 'Catálogo', path: '/admin/catalogo', icon: <CategoryIcon /> },
  { label: 'Inventario', path: '/admin/inventario', icon: <InventoryIcon /> },
  { label: 'Solicitudes', path: '/admin/solicitudes', icon: <RequestQuoteIcon /> },
  { label: 'Préstamos', path: '/admin/prestamos', icon: <AssignmentReturnIcon /> },
  { label: 'Ambientes', path: '/admin/ambientes', icon: <MeetingRoomIcon /> },
];

const instructorMenu = [
  { label: 'Dashboard', path: '/instructor', icon: <DashboardIcon /> },
  { label: 'Catálogo', path: '/instructor/catalogo', icon: <CategoryIcon /> },
  { label: 'Mis Solicitudes', path: '/instructor/solicitudes', icon: <RequestQuoteIcon /> },
  { label: 'Carrito', path: '/instructor/carrito', icon: <ShoppingCartIcon /> },
];

export function Sidebar({ mobileOpen, onClose, collapsed, onToggleCollapse }) {
  const { user } = useAuthStore();
  const location = useLocation();
  const menu = user?.role === ROLES.ADMIN ? adminMenu : instructorMenu;

  const renderDrawerContent = (isCollapsed) => (
    <Box className="h-full flex flex-col">
      <Toolbar />
      <List className="flex-1 py-2 px-2">
        {menu.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <ListItem key={item.path} disablePadding className="mb-1">
              <ListItemButton
                component={NavLink}
                to={item.path}
                end={item.path === '/admin' || item.path === '/instructor'}
                selected={isActive}
                onClick={onClose}
                sx={{
                  borderRadius: 1.5,
                  justifyContent: isCollapsed ? 'center' : 'flex-start',
                  px: isCollapsed ? 1.5 : 2,
                  py: 1.2,
                  boxSizing: 'border-box',
                  '&.Mui-selected': {
                    backgroundColor: '#E8F5E9',
                    borderLeft: '4px solid #00A94F',
                  },
                  '&.Mui-selected:hover': {
                    backgroundColor: '#C8E6C9',
                  },
                }}
              >
                <Tooltip title={isCollapsed ? item.label : ''} placement="right" arrow>
                  <ListItemIcon
                    sx={{
                      minWidth: 0,
                      mr: isCollapsed ? 0 : 2,
                      justifyContent: 'center',
                      color: isActive ? '#00A94F' : '#555555',
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                </Tooltip>
                <ListItemText
                  primary={item.label}
                  sx={{
                    maxWidth: isCollapsed ? 0 : 160,
                    opacity: isCollapsed ? 0 : 1,
                    overflow: 'hidden',
                    transition: 'max-width 0.3s ease, opacity 0.25s ease',
                    '& .MuiTypography-root': {
                      whiteSpace: 'nowrap',
                      fontWeight: isActive ? 700 : 500,
                      color: isActive ? '#00A94F' : '#333333',
                    },
                  }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
      <Box className="p-2 hidden lg:flex justify-center">
        <IconButton
          onClick={onToggleCollapse}
          aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'}
          sx={{ color: '#00A94F' }}
        >
          {collapsed ? <ChevronRightIcon /> : <MenuOpenIcon />}
        </IconButton>
      </Box>
    </Box>
  );

  return (
    <>
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', lg: 'none' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: DRAWER_WIDTH_EXPANDED,
          },
        }}
      >
        {renderDrawerContent(false)}
      </Drawer>
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', lg: 'block' },
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: collapsed ? DRAWER_WIDTH_COLLAPSED : DRAWER_WIDTH_EXPANDED,
            transition: 'width 0.3s ease',
            overflowX: 'hidden',
          },
        }}
        open
      >
        {renderDrawerContent(collapsed)}
      </Drawer>
    </>
  );
}
