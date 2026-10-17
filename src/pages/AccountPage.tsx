import { useEffect, useState } from 'react';
import { Link, Navigate, NavLink, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Bell, ChevronRight, LogOut, MapPin, Package, Pencil, Plus, RotateCcw, Star, Trash2, UserRound } from 'lucide-react';
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

const TABS = [
  { key: 'orders', label: 'Orders', icon: Package },
  { key: 'addresses', label: 'Addresses', icon: MapPin },
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
    <div className="container-page py-8 sm:py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-leaf-600">My account</p>
          <h1 className="mt-2 font-display text-4xl font-semibold text-forest-900 sm:text-5xl">Namaste, {user.name.split(' ')[0]}</h1>
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
      <nav className="no-scrollbar mt-8 flex gap-2 overflow-x-auto" aria-label="Account sections">
        {TABS.map(({ key, label, icon: Icon }) => (
          <NavLink
            key={key}
            to={key === 'orders' ? '/account' : `/account/${key}`}
            end
            className={() => cn('inline-flex shrink-0 items-center gap-2 rounded-full px-5 py-2.5 font-bold transition', tab === key ? 'bg-forest-800 text-ivory-50' : 'bg-white text-charcoal-700 ring-1 ring-line hover:ring-forest-700/40')}
          >
            <Icon className="size-4" /> {label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-8">
        {tab === 'orders' && <OrdersTab />}
        {tab === 'addresses' && <AddressesTab />}
        {tab === 'profile' && <ProfileTab />}
      </div>
    </div>
  );
}

function OrdersTab() {
  const { data, isLoading } = useQuery({ queryKey: ['account', 'orders'], queryFn: accountApi.orders });
  const reorder = useReorder();
  if (isLoading) return <div className="skeleton h-40 rounded-[1.75rem]" />;
  if (!data?.length)
    return (
      <EmptyState icon={<Package className="size-10" strokeWidth={1.5} />} title="No orders yet" action={<ButtonLink to="/shop">Start shopping</ButtonLink>}>
        Orders you place while signed in will appear here.
      </EmptyState>
    );
  return (
    <ul className="grid gap-4 md:grid-cols-2">
      {data.map((o) => (
        <li key={o.id}>
          <Link to={`/orders/${o.orderNumber}`} className="group block rounded-[1.75rem] border border-line bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-lift">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono font-bold">{o.orderNumber}</p>
                <p className="text-sm text-charcoal-500">{formatDate(o.createdAt)}</p>
              </div>
              <StatusPill status={o.status} />
            </div>
            <div className="mt-4 flex -space-x-3">
              {o.items.slice(0, 5).map((i) => (
                <ProductImage key={i.id} src={i.imageUrl} alt="" className="size-12 rounded-full bg-ivory-100 p-1 ring-2 ring-white" />
              ))}
              {o.items.length > 5 && <span className="grid size-12 place-items-center rounded-full bg-ivory-200 text-xs font-bold ring-2 ring-white">+{o.items.length - 5}</span>}
            </div>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm text-charcoal-500">
                {o.items.reduce((n, i) => n + i.quantity, 0)} items · {o.customer.areaName}
              </span>
              <span className="flex items-center gap-1 font-extrabold tabular-nums">
                {formatINR(o.total)} <ChevronRight className="size-4 text-charcoal-400 transition group-hover:translate-x-0.5" />
              </span>
            </div>
          </Link>
          {(o.status === 'DELIVERED' || o.status === 'CANCELLED') && (
            <Button
              size="sm"
              variant="secondary"
              className="mt-2"
              icon={<RotateCcw className="size-4" />}
              loading={reorder.isPending && reorder.variables?.items === o.items}
              onClick={() => reorder.mutate(o)}
            >
              Reorder
            </Button>
          )}
        </li>
      ))}
    </ul>
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
      ? { label: initial.label ?? '', name: initial.name, phone: initial.phone, areaId: initial.area.isActive ? initial.areaId : '', house: initial.house, street: initial.street, landmark: initial.landmark ?? '', isDefault: initial.isDefault }
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
