import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Toast } from '../../src/components/ui/Toast.jsx';

describe('Toast', () => {
  it('muestra el mensaje cuando está abierto', () => {
    render(<Toast open message="Operación exitosa" onClose={vi.fn()} />);

    expect(screen.getByText('Operación exitosa')).toBeInTheDocument();
  });

  it('no muestra contenido cuando está cerrado', () => {
    const { container } = render(
      <Toast open={false} message="Operación exitosa" onClose={vi.fn()} />
    );

    expect(container).toBeEmptyDOMElement();
  });
});
