import { useMemo, useState } from 'react';
import {
  Box,
  Chip,
  Grid,
  Paper,
  TextField,
  MenuItem,
  Button,
  Typography,
  CircularProgress,
  Alert,
  InputAdornment,
  Tooltip,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import InventoryIcon from '@mui/icons-material/Inventory';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { PageContainer } from '../../components/ui/PageContainer.jsx';
import { Toast } from '../../components/ui/Toast.jsx';
import { useToast } from '../../hooks/useToast.js';
import { itemsApi } from '../../api/items.api.js';
import { categoriesApi } from '../../api/categories.api.js';
import { useCartStore } from '../../stores/cartStore.js';
import { SENA_COLORS } from '../../constants/theme.js';
import { extractListData } from '../../utils/api.js';

/**
 * Badge de completitud para ítems compuestos: verde si todas las unidades
 * disponibles tienen sus componentes ensamblados, ámbar con detalle de
 * faltantes si alguna unidad está incompleta.
 */
function CompletenessBadge({ item }) {
  const isComposite = Array.isArray(item.components) && item.components.length > 0;
  if (!isComposite) return null;

  const incomplete = item.incomplete ?? 0;
  const details = Array.isArray(item.incompleteDetails) ? item.incompleteDetails : [];

  if (incomplete === 0) {
    return (
      <Chip
        icon={<CheckCircleIcon />}
        label="Completo"
        size="small"
        color="success"
        sx={{ position: 'absolute', top: 8, left: 8, fontWeight: 700 }}
      />
    );
  }

  const tooltipContent = (
    <Box className="p-1 max-w-xs">
      <Typography variant="caption" className="block font-bold mb-1">
        Componentes faltantes:
      </Typography>
      {details.slice(0, 3).map((detail) => (
        <Typography key={detail.unitId} variant="caption" className="block">
          {detail.serialNumber}:{' '}
          {detail.missingComponents
            .map((mc) => `${mc.itemName} (${mc.assembled}/${mc.required})`)
            .join(', ')}
        </Typography>
      ))}
      {details.length > 3 && (
        <Typography variant="caption" className="block text-gray-300">
          …y {details.length - 3} unidad(es) más
        </Typography>
      )}
    </Box>
  );

  return (
    <Tooltip title={tooltipContent} arrow placement="right">
      <Chip
        icon={<ReportProblemIcon />}
        label={`${incomplete} incompleto${incomplete !== 1 ? 's' : ''}`}
        size="small"
        color="warning"
        sx={{ position: 'absolute', top: 8, left: 8, fontWeight: 700, cursor: 'help' }}
      />
    </Tooltip>
  );
}

export function CatalogPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [quantities, setQuantities] = useState({});
  const [addedId, setAddedId] = useState(null);
  const addItem = useCartStore((state) => state.addItem);
  const cartItems = useCartStore((state) => state.items);
  const { toast, showToast, hideToast } = useToast();

  const {
    data: items,
    isLoading: itemsLoading,
    error: itemsError,
  } = useQuery({
    queryKey: ['items'],
    queryFn: () => itemsApi.getAll(),
    select: extractListData,
  });

  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.getAll(),
    select: extractListData,
  });

  const safeItems = useMemo(() => (Array.isArray(items) ? items : []), [items]);
  const safeCategories = useMemo(() => (Array.isArray(categories) ? categories : []), [categories]);

  // Unidades ya reservadas en el carrito por ítem, para descontar la
  // disponibilidad mostrada y evitar sobre-agregar.
  const cartQtyById = useMemo(
    () => new Map(cartItems.map((cartItem) => [cartItem.id, cartItem.quantity])),
    [cartItems]
  );

  const filteredItems = safeItems.filter((item) => {
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

  const handleAdd = (item, netAvailable) => {
    const qty = quantities[item.id] || 1;
    const result = addItem(item, Math.min(qty, netAvailable));

    if (!result.added) {
      showToast(`No hay unidades disponibles de ${item.name}`, 'warning');
      return;
    }

    if (result.capped) {
      showToast(`Solo quedan ${result.maxStock} unidades de ${item.name}`, 'info');
    } else {
      showToast(`${item.name} agregado al carrito`, 'success');
    }

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
              {safeCategories.map((category) => (
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
              const available = Math.max(0, Number(item.available ?? item.stock) || 0);
              const inCart = cartQtyById.get(item.id) ?? 0;
              const netAvailable = Math.max(0, available - inCart);
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
                      <Box className="h-40 bg-sena-green-light/30 flex items-center justify-center relative">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <InventoryIcon sx={{ fontSize: 64, color: SENA_COLORS.green }} />
                        )}
                        <CompletenessBadge item={item} />
                        {inCart > 0 && (
                          <Chip
                            label={`En carrito: ${inCart}`}
                            size="small"
                            color="primary"
                            sx={{
                              position: 'absolute',
                              top: 8,
                              right: 8,
                              fontWeight: 700,
                              backgroundColor: SENA_COLORS.green,
                            }}
                          />
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
                            <strong style={{ color: netAvailable === 0 ? '#D32F2F' : undefined }}>
                              {netAvailable}
                            </strong>
                            {(item.incomplete ?? 0) > 0 && (
                              <span className="text-amber-600">
                                {' '}
                                ({item.complete ?? 0} completo{item.complete !== 1 ? 's' : ''},{' '}
                                {item.incomplete} incompleto{item.incomplete !== 1 ? 's' : ''})
                              </span>
                            )}
                          </Typography>

                          <Box className="flex items-center gap-2">
                            <TextField
                              type="number"
                              size="small"
                              inputProps={{ min: 1, max: Math.max(1, netAvailable) }}
                              value={quantities[item.id] || 1}
                              onChange={(e) => handleQtyChange(item.id, e.target.value)}
                              disabled={netAvailable === 0}
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
                                onClick={() => handleAdd(item, netAvailable)}
                                disabled={netAvailable <= 0}
                                sx={{
                                  backgroundColor: SENA_COLORS.green,
                                  '&:hover': { backgroundColor: SENA_COLORS.greenDark },
                                }}
                              >
                                {netAvailable <= 0 ? 'Sin stock' : 'Agregar'}
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

      <Toast
        open={toast.open}
        message={toast.message}
        severity={toast.severity}
        onClose={hideToast}
      />
    </PageContainer>
  );
}
