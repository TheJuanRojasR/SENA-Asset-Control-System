import {
  Box,
  Button,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  Tooltip,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import InventoryIcon from '@mui/icons-material/Inventory';
import ProductionQuantityLimitsIcon from '@mui/icons-material/ProductionQuantityLimits';
import ShoppingCartCheckoutIcon from '@mui/icons-material/ShoppingCartCheckout';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useCartStore, selectTotalItems } from '../../stores/cartStore.js';
import { SENA_COLORS } from '../../constants/theme.js';

/**
 * Vista rápida del carrito accesible desde cualquier página.
 * Todas las acciones (cambiar cantidad, eliminar) son inmediatas y
 * reactivas porque operan sobre el store local de Zustand.
 */
export function MiniCartDrawer({ open, onClose }) {
  const navigate = useNavigate();
  const items = useCartStore((state) => state.items);
  const updateQty = useCartStore((state) => state.updateQty);
  const removeItem = useCartStore((state) => state.removeItem);
  const clearCart = useCartStore((state) => state.clearCart);
  const totalItems = useCartStore(selectTotalItems);

  const goTo = (path) => {
    onClose();
    navigate(path);
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: { width: { xs: '100%', sm: 380 }, display: 'flex', flexDirection: 'column' },
      }}
    >
      <Box className="flex items-center justify-between px-4 py-3">
        <Box>
          <Typography variant="h6" className="font-bold">
            Tu carrito
          </Typography>
          <Typography variant="caption" className="text-gray-500">
            {totalItems} {totalItems === 1 ? 'unidad' : 'unidades'}
          </Typography>
        </Box>
        <IconButton onClick={onClose} aria-label="Cerrar carrito">
          <CloseIcon />
        </IconButton>
      </Box>

      <Divider />

      {items.length === 0 ? (
        <Box className="flex-1 flex flex-col items-center justify-center gap-2 p-8 text-center">
          <ProductionQuantityLimitsIcon sx={{ fontSize: 56, color: SENA_COLORS.green }} />
          <Typography variant="subtitle1" className="font-bold">
            El carrito está vacío
          </Typography>
          <Typography variant="body2" className="text-gray-500 mb-3">
            Agrega ítems desde el catálogo para crear tu solicitud.
          </Typography>
          <Button
            variant="contained"
            onClick={() => goTo('/instructor/catalogo')}
            sx={{
              backgroundColor: SENA_COLORS.green,
              '&:hover': { backgroundColor: SENA_COLORS.greenDark },
            }}
          >
            Ver catálogo
          </Button>
        </Box>
      ) : (
        <>
          <List className="flex-1 overflow-y-auto py-2" disablePadding>
            <AnimatePresence initial={false}>
              {items.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 24 }}
                  transition={{ duration: 0.2 }}
                >
                  <ListItem className="flex items-start gap-3 px-4 py-3">
                    <Box className="h-14 w-14 rounded-lg bg-sena-green-light/30 flex items-center justify-center shrink-0 overflow-hidden">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <InventoryIcon sx={{ color: SENA_COLORS.green }} />
                      )}
                    </Box>

                    <Box className="flex-1 min-w-0">
                      <Typography variant="body2" className="font-bold truncate">
                        {item.name}
                      </Typography>
                      <Typography variant="caption" className="text-gray-500 block mb-1">
                        Disponible: {item.stock ?? 0}
                      </Typography>

                      <Box className="flex items-center gap-1">
                        <IconButton
                          size="small"
                          onClick={() => updateQty(item.id, item.quantity - 1)}
                          aria-label={`Disminuir cantidad de ${item.name}`}
                          sx={{ border: '1px solid #E0E0E0' }}
                        >
                          <RemoveIcon fontSize="small" />
                        </IconButton>
                        <Typography
                          variant="body2"
                          className="font-bold w-8 text-center"
                          aria-live="polite"
                        >
                          {item.quantity}
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={() => updateQty(item.id, item.quantity + 1)}
                          disabled={item.quantity >= (item.stock ?? 0)}
                          aria-label={`Aumentar cantidad de ${item.name}`}
                          sx={{ border: '1px solid #E0E0E0' }}
                        >
                          <AddIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </Box>

                    <Tooltip title="Quitar del carrito">
                      <IconButton
                        size="small"
                        onClick={() => removeItem(item.id)}
                        aria-label={`Quitar ${item.name} del carrito`}
                        sx={{ color: '#D32F2F' }}
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </ListItem>
                  <Divider component="li" />
                </motion.div>
              ))}
            </AnimatePresence>
          </List>

          <Box className="p-4 border-t border-gray-100">
            <Box className="flex justify-between mb-3">
              <Typography variant="body2" className="text-gray-500">
                Total de unidades
              </Typography>
              <Typography variant="subtitle1" className="font-bold">
                {totalItems}
              </Typography>
            </Box>

            <Button
              fullWidth
              variant="contained"
              size="large"
              startIcon={<ShoppingCartCheckoutIcon />}
              onClick={() => goTo('/instructor/carrito')}
              sx={{
                backgroundColor: SENA_COLORS.green,
                '&:hover': { backgroundColor: SENA_COLORS.greenDark },
                mb: 1,
              }}
            >
              Ir al carrito
            </Button>
            <Button
              fullWidth
              variant="text"
              size="small"
              onClick={clearCart}
              sx={{ color: '#757575' }}
            >
              Vaciar carrito
            </Button>
          </Box>
        </>
      )}
    </Drawer>
  );
}
