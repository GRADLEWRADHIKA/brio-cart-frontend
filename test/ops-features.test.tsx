import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type { Permission, Role } from '@shared/core';
import { RequirePermission } from '@/auth/guards';
import { StockAdjustForm } from '@/pages/admin/Stock';
import { SlotRow } from '@/pages/admin/DeliverySlots';
import { SlotPicker } from '@/components/checkout/SlotPicker';
import { ReturnDecision } from '@/pages/admin/Returns';
import { ReturnRequestForm } from '@/components/account/OrderExtras';
import { NewTicketForm } from '@/components/support/SupportTab';
import { Bars } from '@/pages/admin/Analytics';
import { DeleteAccountForm } from '@/components/account/SecurityPanel';
import type { User } from '@/types';

function wrap(ui: ReactNode, role: Role | null) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  qc.setQueryData(['me'], role ? ({ id: `u-${role}`, name: role, phone: '9000000000', email: null, role } as unknown as User) : null);
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

/** Each new page and the roles that may open it. Every other role sees "Not available for your role". */
const PAGES: Array<[string, Permission, Role[]]> = [
  ['Stock', 'stock:view', ['ADMIN', 'SUPERADMIN']],
  ['Rider cash', 'settlement:manage', ['ADMIN', 'SUPERADMIN']],
  ['Cash in hand', 'cash:view_own', ['RIDER']],
  ['Delivery slots', 'slot:manage', ['ADMIN', 'SUPERADMIN']],
  ['Area fees', 'fee:manage', ['SUPERADMIN']],
  ['Returns', 'return:manage', ['ADMIN', 'SUPERADMIN']],
  ['Credit & returns', 'wallet:view_own', ['CUSTOMER']],
  ['Analytics', 'analytics:view', ['ADMIN', 'SUPERADMIN']],
  ['Support', 'support:manage', ['ADMIN', 'SUPERADMIN']],
  ['My support', 'support:open', ['CUSTOMER']],
  ['System status', 'system:status', ['SUPERADMIN']],
];
const ROLES: Role[] = ['CUSTOMER', 'RIDER', 'ADMIN', 'SUPERADMIN'];

describe('new page guards', () => {
  for (const [title, permission, allowed] of PAGES) {
    for (const role of ROLES) {
      const ok = allowed.includes(role);
      it(`${title} ${ok ? 'opens' : 'is blocked'} for ${role}`, () => {
        wrap(<RequirePermission permission={permission}><h1>{title}</h1></RequirePermission>, role);
        if (ok) expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
        else expect(screen.getByText('Not available for your role')).toBeInTheDocument();
      });
    }
  }
});

describe('stock adjustment form', () => {
  it('needs a whole quantity and cannot remove more than is in stock', () => {
    wrap(<StockAdjustForm item={{ variantId: 'v1', stockQty: 3 }} />, 'ADMIN');
    const save = screen.getByRole('button', { name: 'Save' });
    expect(save).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Quantity'), { target: { value: '5' } });
    expect(save).toBeEnabled();
    fireEvent.change(screen.getByLabelText('Add or remove'), { target: { value: 'remove' } });
    expect(save).toBeDisabled();
    expect(screen.getByText('Only 3 in stock.')).toBeInTheDocument();
  });
});

describe('delivery slot forms', () => {
  it('refuses a slot that ends before it starts', () => {
    wrap(<SlotRow />, 'ADMIN');
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '08:00' } });
    expect(screen.getByRole('button', { name: 'Add slot' })).toBeDisabled();
    expect(screen.getByText('End must be after start')).toBeInTheDocument();
  });

  it('does not let customers pick a full or past slot', () => {
    const slot = (id: string, available: boolean, reason: string | null) => ({ id, label: id, startMinute: 540, endMinute: 660, remaining: available ? 5 : 0, available, reason });
    let picked: unknown = null;
    wrap(<SlotPicker days={[{ date: '2026-10-20', slots: [slot('9am – 11am', false, 'FULL'), slot('11am – 1pm', true, null)] }]} value={null} onChange={(v) => (picked = v)} />, null);
    const radios = screen.getAllByRole('radio');
    expect(radios[0]).toBeDisabled();
    expect(screen.getByText('Full')).toBeInTheDocument();
    fireEvent.click(radios[1]!);
    expect(picked).toEqual({ slotId: '11am – 1pm', date: '2026-10-20' });
  });
});

describe('return forms', () => {
  it('needs a real reason before a customer can request a return', () => {
    wrap(<ReturnRequestForm orderNumber="BC-1" />, 'CUSTOMER');
    const btn = screen.getByRole('button', { name: 'Request return' });
    expect(btn).toBeDisabled();
    fireEvent.change(screen.getByLabelText('What went wrong?'), { target: { value: 'Milk was sour' } });
    expect(btn).toBeEnabled();
  });

  it('caps the refund at what the customer paid', () => {
    const r = { id: 'r1', orderId: 'o1', orderNumber: 'BC-1', orderTotal: 25000, reason: 'Sour', status: 'PENDING' as const, adminNote: null, refundMethod: null, refundAmount: null, decidedAt: null, createdAt: '2026-10-19T00:00:00Z' };
    wrap(<ReturnDecision r={r} />, 'ADMIN');
    expect(screen.getByRole('button', { name: 'Approve' })).toBeEnabled();
    fireEvent.change(screen.getByLabelText('Refund amount'), { target: { value: '300' } });
    expect(screen.getByRole('button', { name: 'Approve' })).toBeDisabled();
  });
});

describe('support and analytics', () => {
  it('needs a subject and message before opening a ticket', () => {
    wrap(<NewTicketForm />, 'CUSTOMER');
    const send = screen.getByRole('button', { name: 'Send to support' });
    expect(send).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Subject'), { target: { value: 'Late order' } });
    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'It has been two hours' } });
    expect(send).toBeEnabled();
  });

  it('scales bars to the largest value', () => {
    const { container } = wrap(<Bars rows={[{ label: 'a', value: 5 }, { label: 'b', value: 10 }]} />, 'ADMIN');
    const widths = [...container.querySelectorAll('span[style]')].map((el) => (el as HTMLElement).style.width);
    expect(widths).toEqual(['50%', '100%']);
  });
});

describe('account deletion', () => {
  it('needs the confirmation box and the password', () => {
    wrap(<DeleteAccountForm />, 'CUSTOMER');
    const btn = screen.getByRole('button', { name: 'Delete my account' });
    expect(btn).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Password to confirm'), { target: { value: 'secret' } });
    expect(btn).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox'));
    expect(btn).toBeEnabled();
  });
});
