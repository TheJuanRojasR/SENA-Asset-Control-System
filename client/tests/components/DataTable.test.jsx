import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DataTable } from '../../src/components/ui/DataTable.jsx';

const columns = [
  { field: 'code', headerName: 'Código' },
  { field: 'name', headerName: 'Nombre' },
];

const rows = [
  { id: 1, code: 'A001', name: 'Ambiente 1' },
  { id: 2, code: 'A002', name: 'Ambiente 2' },
];

describe('DataTable', () => {
  it('renderiza encabezados y filas', () => {
    render(<DataTable columns={columns} rows={rows} />);

    expect(screen.getByText('Código')).toBeInTheDocument();
    expect(screen.getByText('Nombre')).toBeInTheDocument();
    expect(screen.getByText('A001')).toBeInTheDocument();
    expect(screen.getByText('Ambiente 2')).toBeInTheDocument();
  });

  it('muestra mensaje cuando no hay datos', () => {
    render(<DataTable columns={columns} rows={[]} emptyMessage="Sin registros" />);

    expect(screen.getByText('Sin registros')).toBeInTheDocument();
  });

  it('llama a onEdit, onDelete y onRetire al interactuar con acciones', async () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const onRetire = vi.fn();
    render(
      <DataTable
        columns={columns}
        rows={rows}
        onEdit={onEdit}
        onDelete={onDelete}
        onRetire={onRetire}
      />
    );

    const editButtons = screen.getAllByRole('button', { name: /Editar/i });
    const deleteButtons = screen.getAllByRole('button', { name: /Eliminar/i });
    const retireButtons = screen.getAllByRole('button', { name: /Dar de baja/i });

    await act(async () => {
      await userEvent.click(editButtons[0]);
    });
    expect(onEdit).toHaveBeenCalledWith(rows[0]);

    await act(async () => {
      await userEvent.click(deleteButtons[1]);
    });
    expect(onDelete).toHaveBeenCalledWith(rows[1]);

    await act(async () => {
      await userEvent.click(retireButtons[0]);
    });
    expect(onRetire).toHaveBeenCalledWith(rows[0]);
  });
});
