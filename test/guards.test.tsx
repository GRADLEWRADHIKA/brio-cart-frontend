import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { homePathFor, type Role } from '@shared/core';
import { GuestOnly, RequirePermission, RequireRole } from '@/auth/guards';
import { pathAllowedFor, postLoginPath } from '@/auth/access';
import type { User } from '@/types';

function userWith(role: Role): User {
  return { id: `u-${role}`, name: `${role} user`, phone: '9000000000', email: null, role } as unknown as User;
}

/** Shows where the router ended up, including the query string. */
function Where() {
  const loc = useLocation();
  return <div data-testid="where">{loc.pathname + loc.search}</div>;
}

function Page({ title }: { title: string }) {
  return (
    <>
      <h1>{title}</h1>
      <Where />
    </>
  );
}

function renderAt(path: string, role: Role | null) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  qc.setQueryData(['me'], role ? userWith(role) : null);
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/admin/*" element={<RequireRole roles={['ADMIN', 'SUPERADMIN']}><Page title="Admin area" /></RequireRole>} />
          <Route path="/admin-users" element={<RequireRole roles={['ADMIN', 'SUPERADMIN']}><RequirePermission permission="user:manage"><Page title="User management" /></RequirePermission></RequireRole>} />
          <Route path="/rider/register" element={<GuestOnly><Page title="Rider sign-up" /></GuestOnly>} />
          <Route path="/rider/*" element={<RequireRole roles={['RIDER']}><Page title="Rider app" /></RequireRole>} />
          <Route path="/account" element={<RequireRole roles={['CUSTOMER']}><Page title="My account" /></RequireRole>} />
          <Route path="/checkout" element={<RequireRole roles={['CUSTOMER']} allowGuest><Page title="Checkout" /></RequireRole>} />
          <Route path="*" element={<Where />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('route guards', () => {
  it.each([
    ['/admin', 'ADMIN', 'Admin area'],
    ['/admin/orders', 'SUPERADMIN', 'Admin area'],
    ['/rider', 'RIDER', 'Rider app'],
    ['/account', 'CUSTOMER', 'My account'],
    ['/checkout', 'CUSTOMER', 'Checkout'],
    ['/checkout', null, 'Checkout'],
    ['/rider/register', null, 'Rider sign-up'],
    ['/admin-users', 'SUPERADMIN', 'User management'],
  ] as const)('%s opens for %s', (path, role, heading) => {
    renderAt(path, role);
    expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument();
  });

  it.each(['/admin', '/rider', '/account'])('%s sends guests to sign-in with a return path', (path) => {
    renderAt(path, null);
    expect(screen.getByTestId('where')).toHaveTextContent(`/login?next=${encodeURIComponent(path)}`);
  });

  it.each([
    ['/admin', 'CUSTOMER', '/'],
    ['/admin', 'RIDER', '/rider'],
    ['/rider', 'CUSTOMER', '/'],
    ['/rider', 'ADMIN', '/admin'],
    ['/account', 'RIDER', '/rider'],
    ['/account', 'SUPERADMIN', '/admin'],
    ['/checkout', 'RIDER', '/rider'],
    ['/checkout', 'ADMIN', '/admin'],
    ['/rider/register', 'CUSTOMER', '/'],
  ] as const)('%s sends %s to %s', (path, role, home) => {
    renderAt(path, role);
    expect(screen.getByTestId('where')).toHaveTextContent(new RegExp(`^${home}$`));
  });

  it('shows a not-available page when an admin opens a super-admin-only page', () => {
    renderAt('/admin-users', 'ADMIN');
    expect(screen.getByText('Not available for your role')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'User management' })).not.toBeInTheDocument();
  });
});

describe('role redirects after sign-in', () => {
  it('sends each role to its home by default', () => {
    expect(homePathFor('SUPERADMIN')).toBe('/admin');
    expect(homePathFor('ADMIN')).toBe('/admin');
    expect(homePathFor('RIDER')).toBe('/rider');
    expect(homePathFor('CUSTOMER')).toBe('/');
    expect(postLoginPath('ADMIN', null)).toBe('/admin');
    expect(postLoginPath('RIDER', null)).toBe('/rider');
    expect(postLoginPath('CUSTOMER', null)).toBe('/');
  });

  it('honours a return path only when the role may open it', () => {
    expect(postLoginPath('CUSTOMER', '/checkout')).toBe('/checkout');
    expect(postLoginPath('ADMIN', '/admin/orders/abc')).toBe('/admin/orders/abc');
    expect(postLoginPath('CUSTOMER', '/admin/orders')).toBe('/');
    expect(postLoginPath('RIDER', '/checkout')).toBe('/rider');
    expect(postLoginPath('ADMIN', '/account/orders')).toBe('/admin');
    expect(postLoginPath('SUPERADMIN', '/')).toBe('/admin');
  });

  it('ignores unsafe return paths', () => {
    expect(postLoginPath('CUSTOMER', '//evil.example')).toBe('/');
    expect(postLoginPath('ADMIN', 'https://evil.example')).toBe('/admin');
  });

  it('matches the allowed-path map', () => {
    expect(pathAllowedFor(null, '/rider/register')).toBe(true);
    expect(pathAllowedFor('RIDER', '/rider/register')).toBe(false);
    expect(pathAllowedFor('CUSTOMER', '/notifications')).toBe(true);
    expect(pathAllowedFor('RIDER', '/product/milk')).toBe(true);
    expect(pathAllowedFor('ADMIN', '/admin?tab=x')).toBe(true);
  });
});
