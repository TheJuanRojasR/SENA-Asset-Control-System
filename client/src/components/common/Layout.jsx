import { useState } from 'react';
import { Box, Toolbar, useMediaQuery } from '@mui/material';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar.jsx';
import { Sidebar } from './Sidebar.jsx';

const DRAWER_WIDTH_EXPANDED = 260;
const DRAWER_WIDTH_COLLAPSED = 72;

export function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const isDesktop = useMediaQuery((theme) => theme.breakpoints.up('lg'));

  const handleSidebarToggle = () => {
    if (isDesktop) {
      setCollapsed((prev) => !prev);
    } else {
      setMobileOpen(true);
    }
  };

  const sidebarWidth = collapsed ? DRAWER_WIDTH_COLLAPSED : DRAWER_WIDTH_EXPANDED;

  return (
    <Box className="min-h-screen flex flex-col">
      <Navbar onMenuToggle={handleSidebarToggle} />
      <Box className="flex flex-1">
        <Sidebar
          mobileOpen={mobileOpen}
          onClose={() => setMobileOpen(false)}
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((prev) => !prev)}
        />
        <Box
          component="main"
          className="flex-1 p-6 transition-all duration-300"
          sx={{
            ml: { lg: `${sidebarWidth}px` },
            width: { lg: `calc(100% - ${sidebarWidth}px)` },
          }}
        >
          <Toolbar />
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
