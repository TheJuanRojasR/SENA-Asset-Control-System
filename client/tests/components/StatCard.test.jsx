import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import { StatCard } from '../../src/components/ui/StatCard.jsx';

describe('StatCard', () => {
  it('renderiza el valor y la etiqueta', () => {
    render(
      <StatCard
        icon={<ShoppingCartIcon data-testid="cart-icon" />}
        value={7}
        label="Elementos en carrito"
      />
    );

    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText('Elementos en carrito')).toBeInTheDocument();
    expect(screen.getByTestId('cart-icon')).toBeInTheDocument();
  });
});
