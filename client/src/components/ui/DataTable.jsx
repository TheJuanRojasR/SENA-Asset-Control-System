import {
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Paper,
  IconButton,
  Box,
  Pagination,
  Skeleton,
  Chip,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ArchiveIcon from '@mui/icons-material/Archive';
import { motion } from 'framer-motion';

export function DataTable({
  columns,
  rows,
  loading = false,
  emptyMessage = 'No hay registros disponibles.',
  page = 1,
  rowsPerPage = 10,
  totalRows = 0,
  onPageChange,
  onEdit,
  onHardDelete,
  onRetire,
  renderActions,
  actions = true,
}) {
  const safeRows = Array.isArray(rows) ? rows : [];
  const safeTotalRows = typeof totalRows === 'number' ? totalRows : safeRows.length;
  const totalPages = Math.max(1, Math.ceil(safeTotalRows / rowsPerPage));

  const renderCell = (column, row) => {
    const value = row[column.field];
    if (column.render) return column.render(value, row);
    if (typeof value === 'boolean') {
      return (
        <Chip
          label={value ? 'Activo' : 'Inactivo'}
          size="small"
          sx={{
            backgroundColor: value ? '#E8F5E9' : '#FFEBEE',
            color: value ? '#007A3D' : '#C62828',
            fontWeight: 600,
          }}
        />
      );
    }
    return value ?? '-';
  };

  return (
    <Paper className="rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow className="bg-gray-50">
              {columns.map((column) => (
                <TableCell
                  key={column.field}
                  className="font-bold text-gray-700 uppercase text-xs"
                  style={{ width: column.width }}
                >
                  {column.headerName}
                </TableCell>
              ))}
              {actions && (
                <TableCell className="font-bold text-gray-700 uppercase text-xs" align="right">
                  Acciones
                </TableCell>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              Array.from({ length: rowsPerPage }).map((_, index) => (
                <TableRow key={index}>
                  {columns.map((column) => (
                    <TableCell key={column.field}>
                      <Skeleton variant="text" />
                    </TableCell>
                  ))}
                  {actions && (
                    <TableCell align="right">
                      <Skeleton variant="circular" width={32} height={32} />
                    </TableCell>
                  )}
                </TableRow>
              ))
            ) : safeRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length + (actions ? 1 : 0)} align="center">
                  <Box className="py-10 text-gray-500" component="div">
                    {emptyMessage}
                  </Box>
                </TableCell>
              </TableRow>
            ) : (
              safeRows.map((row, index) => (
                <motion.tr
                  key={row.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.03 }}
                  className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-sena-light/10 transition-colors`}
                >
                  {columns.map((column) => (
                    <TableCell key={column.field} className="text-gray-700">
                      {renderCell(column, row)}
                    </TableCell>
                  ))}
                  {actions && (
                    <TableCell align="right">
                      {renderActions ? (
                        renderActions(row)
                      ) : (
                        <Box className="flex justify-end gap-1">
                          {onEdit && (
                            <IconButton
                              size="small"
                              onClick={() => onEdit(row)}
                              aria-label="Editar"
                              className="text-sena-green hover:text-sena-greenDark"
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          )}
                          {onRetire && (
                            <IconButton
                              size="small"
                              onClick={() => onRetire(row)}
                              aria-label="Dar de baja"
                              className="text-amber-600 hover:text-amber-800"
                            >
                              <ArchiveIcon fontSize="small" />
                            </IconButton>
                          )}
                          {onHardDelete && (
                            <IconButton
                              size="small"
                              onClick={() => onHardDelete(row)}
                              aria-label="Eliminar permanentemente"
                              className="text-red-500 hover:text-red-700"
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          )}
                        </Box>
                      )}
                    </TableCell>
                  )}
                </motion.tr>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      {safeTotalRows > rowsPerPage && onPageChange && (
        <Box className="flex justify-end p-3 border-t border-gray-100">
          <Pagination
            page={page}
            count={totalPages}
            onChange={(_, value) => onPageChange(value)}
            color="primary"
            shape="rounded"
            size="small"
          />
        </Box>
      )}
    </Paper>
  );
}
