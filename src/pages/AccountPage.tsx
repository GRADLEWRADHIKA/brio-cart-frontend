import { CreditTab } from '@/components/account/CreditTab';
import { SupportTab } from '@/components/support/SupportTab';
import { SecurityPanel } from '@/components/account/SecurityPanel';
import { useEffect, useState } from 'react';
import { Link, Navigate, NavLink, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Bell, ChevronRight, LogOut, MapPin, Package, Pencil, Plus, RotateCcw, Star, Trash2, LifeBuoy, UserRound, Wallet } from 'lucide-react';
import { useReorder } from '@/hooks/useReorder';
import { addressSchema, formatINR, profileSchema } from '@shared';
import { accountApi } from '@/api/endpoints';
import { useAuth } from '@/hooks/useAuth';
import { useStoreInfo } from '@/hooks/useStoreInfo';
import { tokenStore } from '@/services/token-store';
import type { Address } from '@/types';
import { Checkbox, SelectField, TextField } from '@/components/forms/Field';
import { Button, ButtonLink } from '@/components/ui/Button';
import { EmptyState, ProductImage } from '@/components/ui/misc';
import { StatusPill } from '@/components/checkout/OrderStatusTracker';
import { PageFallback } from '@/components/layout/AppShell';
import { cn, formatDate } from '@/utils';
import { PinLocation } from '@/components/checkout/PinLocation';

const TABS = [
  { key: 'orders', label: 'Orders', icon: Package },
  { key: 'addresses', label: 'Addresses', icon: MapPin },
  { key: 'credit', label: 'Credit & returns', icon: Wallet },
  { key: 'support', label: 'Support', icon: LifeBuoy },
  { key: 'profile', label: 'Profile', icon: UserRound },
] as const;

export default function AccountPage() {
  const { user, loading, logout } = useAuth();
  const { tab = 'orders' } = useParams();
  useEffect(() => {
    document.title = 'My account — Brio Cart';
  }, []);
  if (loading) return <PageFallback />;
  if (!user) return <Navigate to={`/login?next=/account${tab !== 'orders' ? `/${tab}` : ''}`} replace />;

  return (
    <div className="container-page py-6 sm:py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <nav aria-label="Breadcrumb" className="text-sm text-charcoal-500">
            <Link to="/" className="hover:text-forest-700">Home</Link> <span aria-hidden>›</span>{' '}
            <span className="text-charcoal-900">{tab === 'orders' ? 'My Orders' : 'My Account'}</span>
          </nav>
          <h1 className="mt-1 font-display text-3xl font-bold text-forest-900 sm:text-4xl">{tab === 'orders' ? 'My Orders' : 'My Account'}</h1>
          <p className="mt-1 text-sm text-charcoal-500">Namaste, {user.name.split(' ')[0]}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ButtonLink to="/notifications" variant="outline" icon={<Bell className="size-4" />}>
            Notifications
          </ButtonLink>
          {user.role === 'ADMIN' && (
            <ButtonLink to="/admin" variant="secondary">
              Store dashboard
            </ButtonLink>
          )}
          <Button variant="outline" icon={<LogOut className="size-4" />} loading={logout.isPending} onClick={() => logout.mutate()}>
            Sign out
          </Button>
        </div>
      </div>
      <nav className="no-scrollbar mt-6 flex gap-1 overflow-x-auto border-b border-line" aria-label="Account sections">
        {TABS.map(({ key, label, icon: Icon }) => (
          <NavLink
            key={key}
            to={key === 'orders' ? '/account' : `/account/${key}`}
            end
            className={() => cn('-mb-px inline-flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition', tab === key ? 'border-forest-800 text-forest-800' : 'border-transparent text-charcoal-500 hover:text-charcoal-900')}
          >
            <Icon className="size-4" /> {label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-6">
        {tab === 'orders' && <OrdersTab />}
        {tab === 'addresses' && <AddressesTab />}
        {tab === 'profile' && (
          <>
            <ProfileTab />
            <SecurityPanel />
          </>
        )}
        {tab === 'credit' && <CreditTab />}
        {tab === 'support' && <SupportTab />}
      </div>
    </div>
  );
}

const ORDER_FILTERS = [
  { key: 'all', label: 'All Orders', match: () => true },
  { key: 'processing', label: 'Processing', match: (s: string) => s === 'PENDING' || s === 'CONFIRMED' || s === 'PREPARING' },
  { key: 'out', label: 'Out for Delivery', match: (s: string) => s === 'OUT_FOR_DELIVERY' },
  { key: 'delivered', label: 'Delivered', match: (s: string) => s === 'DELIVERED' },
  { key: 'cancelled', label: 'Cancelled', match: (s: string) => s === 'CANCELLED' },
] as const;

function statusLine(status: string, updatedAt: string | undefined) {
  if (status === 'DELIVERED') return `Delivered${updatedAt ? ` on ${formatDate(updatedAt)}` : ''}.`;
  if (status === 'CANCELLED') return `This order was cancelled${updatedAt ? ` on ${formatDate(updatedAt)}` : ''}.`;
  if (status === 'OUT_FOR_DELIVERY') return 'Your order is on the way.';
  if (status === 'PENDING') return 'Waiting for the store to confirm your order.';
  return 'Your order is being packed and will be out for delivery soon.';
}

function OrdersTab() {
  const { data, isLoading } = useQuery({ queryKey: ['account', 'orders'], queryFn: accountApi.orders });
  const reorder = useReorder();
  const [filter, setFilter] = useState<(typeof ORDER_FILTERS)[number]['key']>('all');
  if (isLoading) return <div className="skeleton h-40 rounded-2xl" />;
  if (!data?.length)
    return (
      <EmptyState icon={<Package className="size-10" strokeWidth={1.5} />} title="No orders yet" action={<ButtonLink to="/shop">Start shopping</ButtonLink>}>
        Orders you place while signed in will appear here.
      </EmptyState>
    );
  const active = ORDER_FILTERS.find((f) => f.key === filter)!;
  const shown = data.filter((o) => active.match(o.status));
  return (
    <div>
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Filter orders">
        {ORDER_FILTERS.map((f) => {
          const n = data.filter((o) => f.match(o.status)).length;
          return (
            <button
              key={f.key}
              type="button"
              aria-pressed={filter === f.key}
              onClick={() => setFilter(f.key)}
              className={cn('shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition', filter === f.key ? 'border-forest-800 bg-forest-800 text-white' : 'border-line bg-white text-charcoal-900 hover:border-forest-700/40')}
            >
              {f.label} ({n})
            </button>
          );
        })}
      </div>
      {shown.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-line p-8 text-center text-charcoal-500">No orders here.</p>
      ) : (
        <ul className="mt-5 space-y-4">
          {shown.map((o) => {
            const done = o.status === 'DELIVERED' || o.status === 'CANCELLED';
            const items = o.items.reduce((n, i) => n + i.quantity, 0);
            return (
              <li key={o.id} className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-4 shadow-soft md:flex-row md:items-center md:p-5">
                <div className="flex min-w-0 items-center gap-4 md:w-[22rem] md:shrink-0 md:border-r md:border-line md:pr-5">
                  <ProductImage src={o.items[0]?.imageUrl} alt="" className="size-20 shrink-0 rounded-xl bg-ivory-100" />
                  <div className="min-w-0">
                    <p className="truncate font-bold text-charcoal-900">Order #{o.orderNumber}</p>
                    <p className="text-xs text-charcoal-500">Placed on {formatDate(o.createdAt)}</p>
                    <p className="mt-1.5 text-sm">
                      <span className="text-lg font-extrabold tabular-nums">{formatINR(o.total)}</span>
                      <span className="mx-2 text-line">|</span>
                      <span className="text-charcoal-500">{items} items</span>
                    </p>
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <StatusPill status={o.status} />
                  <p className="mt-2 text-sm text-charcoal-700">{statusLine(o.status, (o as { updatedAt?: string }).updatedAt)}</p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  {done ? (
                    <Button
                      size="sm"
                      variant="outline"
                      icon={<RotateCcw className="size-4" />}
                      loading={reorder.isPending && reorder.variables?.items === o.items}
                      onClick={() => reorder.mutate(o)}
                    >
                      Buy Again
                    </Button>
                  ) : (
                    <ButtonLink size="sm" variant="outline" to={`/orders/${o.orderNumber}`} icon={<MapPin className="size-4" />}>
                      Track Order
                    </ButtonLink>
                  )}
                  <Link to={`/orders/${o.orderNumber}`} className="inline-flex h-9 items-center gap-1 rounded-full border border-line px-4 text-sm font-semibold text-charcoal-900 hover:border-forest-700/40">
                    View Details <ChevronRight className="size-4" />
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

type AddrIn = z.input<typeof addressSchema>;
type AddrOut = z.output<typeof addressSchema>;

function AddressForm({ initial, onDone }: { initial?: Address; onDone: () => void }) {
  const { data: store } = useStoreInfo();
  const qc = useQueryClient();
  const form = useForm<AddrIn, unknown, AddrOut>({
    resolver: zodResolver(addressSchema),
    defaultValues: initial
      ? {
          label: initial.label ?? '',
          name: initial.name,
          phone: initial.phone,
          areaId: initial.area.isActive ? initial.areaId : '',
          house: initial.house,
          street: initial.street,
          landmark: initial.landmark ?? '',
          isDefault: initial.isDefault,
          ...(initial.lat != null && initial.lng != null ? { lat: initial.lat, lng: initial.lng } : {}),
        }
      : { label: '', name: '', phone: '', areaId: '', house: '', street: '', landmark: '', isDefault: false },
  });
  const save = useMutation({
    mutationFn: (v: AddrOut) => (initial ? accountApi.updateAddress(initial.id, v) : accountApi.createAddress(v)),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['account', 'addresses'] });
      onDone();
    },
  });
  const e = form.formState.errors;
  const [pinLat, pinLng] = form.watch(['lat', 'lng']);
  return (
    <form onSubmit={form.handleSubmit((v) => save.mutate(v))} noValidate className="grid gap-4 rounded-[1.75rem] border border-line bg-white p-5 sm:grid-cols-2 sm:p-6">
      <TextField label="Label" optional placeholder="Home, Office…" {...form.register('label')} />
      <TextField label="Recipient name" {...form.register('name')} error={e.name?.message} />
      <TextField label="Mobile number" type="tel" prefix="+91" {...form.register('phone')} error={e.phone?.message} />
      <SelectField label="Delivery area" {...form.register('areaId')} error={e.areaId?.message}>
        <option value="">Choose locality</option>
        {store?.areas.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      </SelectField>
      <TextField label="House / building" {...form.register('house')} error={e.house?.message} />
      <TextField label="Street / area" {...form.register('street')} error={e.street?.message} />
      <TextField label="Landmark" optional {...form.register('landmark')} className="sm:col-span-2" />
      <PinLocation
        value={pinLat != null && pinLng != null ? { lat: pinLat, lng: pinLng } : null}
        onChange={(p) => {
          form.setValue('lat', p?.lat, { shouldDirty: true });
          form.setValue('lng', p?.lng, { shouldDirty: true });
        }}
        className="sm:col-span-2"
      />
      <Checkbox label="Make this my default address" {...form.register('isDefault')} className="sm:col-span-2" />
      {save.error && <p className="text-sm font-semibold text-tomato-500 sm:col-span-2">{(save.error as Error).message}</p>}
      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit" loading={save.isPending}>
          Save address
        </Button>
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function AddressesTab() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['account', 'addresses'], queryFn: accountApi.addresses });
  const [editing, setEditing] = useState<Address | 'new' | null>(null);
  const del = useMutation({
    mutationFn: accountApi.deleteAddress,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['account', 'addresses'] }),
  });
  if (isLoading) return <div className="skeleton h-40 rounded-[1.75rem]" />;
  if (editing) return <AddressForm initial={editing === 'new' ? undefined : editing} onDone={() => setEditing(null)} />;
  return (
    <div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {data?.map((a) => (
          <div key={a.id} className="rounded-[1.75rem] border border-line bg-white p-5">
            <div className="flex items-center justify-between">
              <p className="font-extrabold">{a.label ?? 'Address'}</p>
              {a.isDefault && (
                <span className="inline-flex items-center gap-1 rounded-full bg-mint-100 px-2 py-0.5 text-xs font-bold text-forest-700">
                  <Star className="size-3" /> Default
                </span>
              )}
            </div>
            <p className="mt-2 text-sm text-charcoal-700">
              {a.name}, +91 {a.phone}
              <br />
              {a.house}, {a.street}
              {a.landmark && `, ${a.landmark}`}
              <br />
              {a.area.name}, Lucknow
            </p>
            {!a.area.isActive && <p className="mt-2 text-xs font-bold text-tomato-500">We no longer deliver to this area.</p>}
            <div className="mt-4 flex gap-2">
              <Button size="sm" variant="secondary" icon={<Pencil className="size-3.5" />} onClick={() => setEditing(a)}>
                Edit
              </Button>
              <Button size="sm" variant="ghost" icon={<Trash2 className="size-3.5" />} onClick={() => window.confirm('Delete this address?') && del.mutate(a.id)}>
                Delete
              </Button>
            </div>
          </div>
        ))}
        <button type="button" onClick={() => setEditing('new')} className="grid min-h-44 place-items-center rounded-[1.75rem] border-2 border-dashed border-line text-charcoal-500 transition hover:border-forest-700/40 hover:text-forest-700">
          <span className="flex flex-col items-center gap-2 font-bold">
            <Plus className="size-6" /> Add address
          </span>
        </button>
      </div>
    </div>
  );
}

function ProfileTab() {
  const { user } = useAuth();
  const qc = useQueryClient();
  type PIn = z.input<typeof profileSchema>;
  type POut = z.output<typeof profileSchema>;
  const form = useForm<PIn, unknown, POut>({ resolver: zodResolver(profileSchema), defaultValues: { name: user?.name ?? '', email: user?.email ?? '' } });
  const save = useMutation({ mutationFn: accountApi.updateProfile, onSuccess: (u) => qc.setQueryData(['me'], u) });

  const pwSchema = z.object({ currentPassword: z.string().min(1, 'Enter your current password'), newPassword: z.string().min(8, 'At least 8 characters').max(72) });
  const pw = useForm<z.infer<typeof pwSchema>>({ resolver: zodResolver(pwSchema), defaultValues: { currentPassword: '', newPassword: '' } });
  const changePw = useMutation({
    mutationFn: (v: z.infer<typeof pwSchema>) => accountApi.changePassword(v.currentPassword, v.newPassword),
    onSuccess: async (r) => {
      await tokenStore.set(r.token);
      pw.reset();
    },
  });

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form onSubmit={form.handleSubmit((v) => save.mutate(v))} noValidate className="space-y-4 rounded-[1.75rem] border border-line bg-white p-5 sm:p-6">
        <h2 className="font-display text-2xl font-semibold text-forest-900">Profile</h2>
        <TextField label="Full name" {...form.register('name')} error={form.formState.errors.name?.message} />
        <TextField label="Mobile number" value={`+91 ${user?.phone ?? ''}`} disabled hint="Contact us to change your registered mobile number." />
        <TextField label="Email" type="email" optional {...form.register('email')} error={form.formState.errors.email?.message} />
        {save.error && <p className="text-sm font-semibold text-tomato-500">{(save.error as Error).message}</p>}
        {save.isSuccess && <p className="text-sm font-semibold text-leaf-600" role="status">Profile saved.</p>}
        <Button type="submit" loading={save.isPending}>
          Save changes
        </Button>
      </form>
      <form onSubmit={pw.handleSubmit((v) => changePw.mutate(v))} noValidate className="space-y-4 rounded-[1.75rem] border border-line bg-white p-5 sm:p-6">
        <h2 className="font-display text-2xl font-semibold text-forest-900">Change password</h2>
        <TextField label="Current password" type="password" autoComplete="current-password" {...pw.register('currentPassword')} error={pw.formState.errors.currentPassword?.message} />
        <TextField label="New password" type="password" autoComplete="new-password" {...pw.register('newPassword')} error={pw.formState.errors.newPassword?.message} hint="Changing your password signs you out on other devices." />
        {changePw.error && <p className="text-sm font-semibold text-tomato-500">{(changePw.error as Error).message}</p>}
        {changePw.isSuccess && <p className="text-sm font-semibold text-leaf-600" role="status">Password updated.</p>}
        <Button type="submit" variant="secondary" loading={changePw.isPending}>
          Update password
        </Button>
      </form>
    </div>
  );
}
