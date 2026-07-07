import { useState } from 'react';
import { Box, Tabs, Tab } from '@mui/material';
import CategoryIcon from '@mui/icons-material/Category';
import ListAltIcon from '@mui/icons-material/ListAlt';
import { PageContainer } from '../../components/ui/PageContainer.jsx';
import { CategoriesTab } from './CategoriesTab.jsx';
import { ItemsTab } from './ItemsTab.jsx';

const breadcrumbs = [{ label: 'Inicio', to: '/admin' }, { label: 'Catálogo' }];

export function CatalogPage() {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <PageContainer title="Catálogo" breadcrumbs={breadcrumbs}>
      <Box className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <Tabs
          value={activeTab}
          onChange={(_, value) => setActiveTab(value)}
          textColor="primary"
          indicatorColor="primary"
          className="border-b border-gray-100"
          sx={{
            '& .MuiTabs-indicator': { backgroundColor: '#00A94F' },
            '& .Mui-selected': { color: '#00A94F !important', fontWeight: 700 },
          }}
        >
          <Tab icon={<CategoryIcon />} iconPosition="start" label="Categorías" />
          <Tab icon={<ListAltIcon />} iconPosition="start" label="Ítems" />
        </Tabs>
        <Box className="p-6">
          {activeTab === 0 && <CategoriesTab />}
          {activeTab === 1 && <ItemsTab />}
        </Box>
      </Box>
    </PageContainer>
  );
}
