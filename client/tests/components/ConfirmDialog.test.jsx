import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmDialog } from '../../src/components/ui/ConfirmDialog.jsx';

describe('ConfirmDialog', () => {
  it('renderiza el título y el mensaje', () => {
    render(
      <ConfirmDialog
        open
        title="Eliminar"
        message="¿Estás seguro?"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByText('Eliminar')).toBeInTheDocument();
    expect(screen.getByText('¿Estás seguro?')).toBeInTheDocument();
  });

  it('llama a onCancel y onConfirm desde los botones', async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        open
        title="Eliminar"
        message="¿Estás seguro?"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );

    await act(async () => {
      await userEvent.click(screen.getByRole('button', { name: /Cancelar/i }));
    });
    expect(onCancel).toHaveBeenCalled();

    await act(async () => {
      await userEvent.click(screen.getByRole('button', { name: /Confirmar/i }));
    });
    expect(onConfirm).toHaveBeenCalled();
  });
});
