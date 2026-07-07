import { useState } from 'react';
import {
  Box,
  Grid,
  Paper,
  TextField,
  MenuItem,
  Button,
  Typography,
  CircularProgress,
  Alert,
  InputAdornment,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import InventoryIcon from '@mui/icons-material/Inventory';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { PageContainer } from '../../components/ui/PageContainer.jsx';
import { itemsApi } from '../../api/items.api.js';
import { categoriesApi } from '../../api/categories.api.js';
import { useCartStore } from '../../stores/cartStore.js';
import { SENA_COLORS } from '../../constants/theme.js';

function extractData(response) {
  return response?.data?.data ?? response?.data ?? [];
}

export function CatalogPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [quantities, setQuantities] = useState({});
  const [addedId, setAddedId] = useState(null);
  const addItem = useCartStore((state) => state.addItem);

  const {
    data: itemsResponse,
    isLoading: itemsLoading,
    error: itemsError,
  } = useQuery({
    queryKey: ['items'],
    queryFn: () => itemsApi.getAll(),
  });

  const { data: categoriesResponse, isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.getAll(),
  });

  const items = extractData(itemsResponse);
  const categories = extractData(categoriesResponse);

  const filteredItems = items.filter((item) => {
    const categoryId = item.categoryId || item.category?.id || item.category;
    const matchesCategory = selectedCategory ? categoryId === selectedCategory : true;

    const term = searchTerm.toLowerCase();
    const matchesSearch =
      !term || item.name?.toLowerCase().includes(term) || item.code?.toLowerCase().includes(term);

    return matchesCategory && matchesSearch;
  });

  const handleQtyChange = (itemId, value) => {
    const qty = Math.max(1, Number(value) || 1);
    setQuantities((prev) => ({ ...prev, [itemId]: qty }));
  };

  const handleAdd = (item) => {
    const qty = quantities[item.id] || 1;
    addItem(item, qty);
    setAddedId(item.id);
    window.setTimeout(() => setAddedId(null), 600);
  };

  const isLoading = itemsLoading || categoriesLoading;

  return (
    <PageContainer
      title="Catálogo de ítems"
      breadcrumbs={[{ label: 'Instructor', to: '/instructor' }, { label: 'Catálogo' }]}
    >
      <Paper className="p-4 mb-6 rounded-xl shadow-sm border border-gray-100">
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              placeholder="Buscar por nombre o código"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon className="text-gray-400" />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              select
              fullWidth
              label="Categoría"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <MenuItem value="">Todas las categorías</MenuItem>
              {categories.map((category) => (
                <MenuItem key={category.id} value={category.id}>
                  {category.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
        </Grid>
      </Paper>

      {isLoading && (
        <Box className="flex justify-center py-12">
          <CircularProgress sx={{ color: SENA_COLORS.green }} />
        </Box>
      )}

      {itemsError && (
        <Alert severity="error" className="mb-4">
          No se pudo cargar el catálogo. Intenta de nuevo más tarde.
        </Alert>
      )}

      {!isLoading && !itemsError && filteredItems.length === 0 && (
        <Alert severity="info">No se encontraron ítems con los filtros aplicados.</Alert>
      )}

      {!isLoading && !itemsError && filteredItems.length > 0 && (
        <Grid container spacing={3}>
          <AnimatePresence>
            {filteredItems.map((item, index) => {
              const available = item.available ?? item.stock ?? 0;
              const total = item.stock ?? 0;
              const isAdded = addedId === item.id;

              return (
                <Grid item xs={12} sm={6} md={4} lg={3} key={item.id}>
                  <motion.div
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    whileHover={{ y: -6 }}
                    className="h-full"
                  >
                    <Paper className="h-full flex flex-col rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                      <Box className="h-40 bg-sena-green-light/30 flex items-center justify-center">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <InventoryIcon sx={{ fontSize: 64, color: SENA_COLORS.green }} />
                        )}
                      </Box>

                      <Box className="p-4 flex-1 flex flex-col">
                        <Typography variant="overline" className="text-sena-green font-semibold">
                          {item.category?.name || item.category || 'Sin categoría'}
                        </Typography>
                        <Typography variant="h6" className="font-bold text-sena-black line-clamp-1">
                          {item.name}
                        </Typography>
                        <Typography variant="body2" className="text-gray-500 mb-2">
                          Código: {item.code || 'N/A'}
                        </Typography>

                        <Box className="mt-auto">
                          <Typography variant="body2" className="mb-3">
                            Disponible:{' '}
                            <strong>
                              {available} / {total}
                            </strong>
                          </Typography>

                          <Box className="flex items-center gap-2">
                            <TextField
                              type="number"
                              size="small"
                              inputProps={{ min: 1, max: total }}
                              value={quantities[item.id] || 1}
                              onChange={(e) => handleQtyChange(item.id, e.target.value)}
                              className="w-20"
                            />
                            <motion.div
                              className="flex-1"
                              whileTap={{ scale: 0.96 }}
                              animate={isAdded ? { scale: [1, 1.12, 1] } : {}}
                              transition={{ duration: 0.35 }}
                            >
                              <Button
                                fullWidth
                                variant="contained"
                                size="small"
                                startIcon={<AddShoppingCartIcon />}
                                onClick={() => handleAdd(item)}
                                disabled={total <= 0}
                                sx={{
                                  backgroundColor: SENA_COLORS.green,
                                  '&:hover': { backgroundColor: SENA_COLORS.greenDark },
                                }}
                              >
                                Agregar
                              </Button>
                            </motion.div>
                          </Box>
                        </Box>
                      </Box>
                    </Paper>
                  </motion.div>
                </Grid>
              );
            })}
          </AnimatePresence>
        </Grid>
      )}
    </PageContainer>
  );
}
