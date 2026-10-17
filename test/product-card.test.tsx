import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProductCard } from '@/components/products/ProductCard';
import { useCart } from '@/store/cart';
import { combo, grapes, milk } from './fixtures';

function renderCard(product = milk) {
  const qc = new QueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <ProductCard product={product} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ProductCard', () => {
  beforeEach(() => useCart.setState({ lines: [] }));

  it('shows name, pack sizes and price, and adds the selected pack size', async () => {
    const user = userEvent.setup();
    renderCard();
    expect(screen.getByText('Amul Gold Full Cream Milk')).toBeInTheDocument();
    expect(screen.getByText('₹36')).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: '1 litre' }));
    expect(screen.getByText('₹72')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /add amul gold full cream milk 1 litre/i }));
    expect(useCart.getState().lines[0]).toMatchObject({ variantId: 'v-1l', quantity: 1 });
    // The add button becomes a quantity stepper.
    await user.click(screen.getByRole('button', { name: /increase/i }));
    expect(useCart.getState().lines[0]!.quantity).toBe(2);
    await user.click(screen.getByRole('button', { name: /decrease/i }));
    await user.click(screen.getByRole('button', { name: /remove/i }));
    expect(useCart.getState().lines).toHaveLength(0);
  });

  it('disables adding an out-of-stock product', () => {
    renderCard(grapes);
    expect(screen.getByText('Out of stock')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /grapes is out of stock/i })).toBeDisabled();
  });

  it('shows a discount only when the store set an old price', () => {
    renderCard(combo);
    expect(screen.getByText('29% OFF')).toBeInTheDocument();
    expect(screen.getByText('₹349')).toBeInTheDocument();
  });
});
