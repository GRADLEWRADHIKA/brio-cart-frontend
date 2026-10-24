import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LogOut, Plus, Search } from 'lucide-react';
import { ROLE_LABELS, ROLES, type Role } from '@shared/core';
import { adminApi, type AdminUser } from '@/api/admin';
import { ApiError } from '@/api/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, PageHeader, Toggle } from '@/components/admin/kit';
import { SelectField, TextField } from '@/components/forms/Field';
import { Button } from '@/components/ui/Button';
import { cn, formatDate } from '@/utils';

/** Shop owners only come from sign-up, with their shop; staff can't create or convert one. */
const ASSIGNABLE_ROLES = ROLES.filter((r) => r !== 'SHOP_OWNER');

const ROLE_TONE: Record<Role, string> = {
  SUPERADMIN: 'bg-forest-800 text-lime-300',
  ADMIN: 'bg-mint-100 text-forest-800',
  RIDER: 'bg-turmeric-100 text-[#6b4500]',
  SHOP_OWNER: 'bg-tomato-100 text-tomato-500',
  CUSTOMER: 'bg-ivory-200 text-charcoal-700',
};

function NewUser({ onDone }: { onDone: () => void }) {
  const [form, setForm] = useState({ name: '', phone: '', email: '', password: '', role: 'ADMIN' as Role, vehicleNumber: '' });
  const create = useMutation({
    mutationFn: () => adminApi.createUser({ ...form, email: form.email || undefined, vehicleNumber: form.vehicleNumber || undefined }),
    onSuccess: onDone,
  });
  const fields = create.error instanceof ApiError ? create.error.details?.fields : undefined;
  return (
    <Card title="New user" className="mb-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={fields?.name} />
        <TextField label="Mobile number" prefix="+91" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} error={fields?.phone} />
        <TextField label="Email" optional value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} error={fields?.email} />
        <SelectField label="Role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
          {ASSIGNABLE_ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </SelectField>
        {form.role === 'RIDER' && <TextField label="Vehicle number" optional value={form.vehicleNumber} onChange={(e) => setForm({ ...form, vehicleNumber: e.target.value.toUpperCase() })} />}
        <TextField label="Temporary password" type="password" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} error={fields?.password} hint="Share it privately. At least 8 characters." />
      </div>
      {create.error && !fields && <p className="mt-3 text-sm font-semibold text-tomato-500">{(create.error as Error).message}</p>}
      <div className="mt-4 flex gap-2">
        <Button loading={create.isPending} onClick={() => create.mutate()}>
          Create user
        </Button>
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </Card>
  );
}

function UserRow({ u, self }: { u: AdminUser; self: boolean }) {
  const qc = useQueryClient();
  const [done, setDone] = useState<string | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ['admin', 'users'] });
  const update = useMutation({ mutationFn: (d: { isActive?: boolean; role?: Role }) => adminApi.updateUser(u.id, d), onSuccess: refresh });
  const logout = useMutation({ mutationFn: () => adminApi.forceLogout(u.id), onSuccess: () => setDone('Signed out everywhere') });
  const error = update.error ?? logout.error;
  return (
    <li className="rounded-3xl border border-line bg-white p-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 font-extrabold">
            <span className="truncate">{u.name}</span>
            <span className={cn('rounded-full px-2 py-0.5 text-[0.65rem] font-extrabold uppercase tracking-wider', ROLE_TONE[u.role])}>{ROLE_LABELS[u.role]}</span>
            {u.role === 'RIDER' && u.riderStatus && u.riderStatus !== 'APPROVED' && <span className="rounded-full bg-tomato-100 px-2 py-0.5 text-[0.65rem] font-extrabold uppercase text-tomato-500">{u.riderStatus}</span>}
            {self && <span className="text-xs font-semibold text-charcoal-400">(you)</span>}
          </p>
          <p className="text-sm text-charcoal-500">
            +91 {u.phone}
            {u.email ? ` · ${u.email}` : ''} · joined {formatDate(u.createdAt, false)}
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm font-bold">
          <Toggle checked={u.isActive} disabled={self || update.isPending} label={`${u.name} active`} onChange={(isActive) => update.mutate({ isActive })} />
          {u.isActive ? 'Active' : 'Deactivated'}
        </label>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select
          value={u.role}
          disabled={self || update.isPending || u.role === 'SHOP_OWNER'}
          onChange={(e) => window.confirm(`Change ${u.name}'s role to ${ROLE_LABELS[e.target.value as Role]}? They will be signed out.`) && update.mutate({ role: e.target.value as Role })}
          className="h-9 rounded-full border border-line bg-white px-3 text-sm font-bold disabled:opacity-50"
          aria-label={`Role for ${u.name}`}
        >
          {ROLES.map((r) => (
            <option key={r} value={r} disabled={r === 'SHOP_OWNER' && u.role !== 'SHOP_OWNER'}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </select>
        <Button size="sm" variant="outline" icon={<LogOut className="size-4" />} loading={logout.isPending} onClick={() => logout.mutate()}>
          Force logout
        </Button>
        {done && <span className="text-xs font-bold text-leaf-600">{done}</span>}
      </div>
      {error && <p className="mt-2 text-sm font-semibold text-tomato-500">{(error as Error).message}</p>}
    </li>
  );
}

export default function Users() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [role, setRole] = useState<Role | undefined>();
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'users', role, search, page],
    queryFn: () => adminApi.users({ role, q: search || undefined, page }),
    placeholderData: keepPreviousData,
  });
  const pill = (active: boolean) => cn('shrink-0 rounded-full px-4 py-2 text-sm font-bold transition', active ? 'bg-forest-800 text-ivory-50' : 'bg-white text-charcoal-700 ring-1 ring-line hover:ring-forest-700/40');

  return (
    <>
      <PageHeader
        title="Users"
        subtitle="Create staff accounts, change roles, deactivate accounts or sign someone out of every device."
        actions={<Button icon={<Plus className="size-4" />} onClick={() => setAdding(true)}>New user</Button>}
      />
      {adding && (
        <NewUser
          onDone={() => {
            setAdding(false);
            void qc.invalidateQueries({ queryKey: ['admin', 'users'] });
          }}
        />
      )}
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="no-scrollbar flex gap-2 overflow-x-auto">
          <button type="button" className={pill(!role)} onClick={() => { setRole(undefined); setPage(1); }}>All</button>
          {ROLES.map((r) => (
            <button key={r} type="button" className={pill(role === r)} onClick={() => { setRole(r); setPage(1); }}>
              {ROLE_LABELS[r]}
            </button>
          ))}
        </div>
        <form className="flex flex-1 lg:justify-end" onSubmit={(e) => { e.preventDefault(); setSearch(q.trim()); setPage(1); }}>
          <label className="flex h-10 w-full items-center gap-2 rounded-full border border-line bg-white px-4 lg:max-w-xs">
            <Search className="size-4 text-charcoal-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, phone or email" className="w-full bg-transparent text-sm outline-none" aria-label="Search users" />
          </label>
        </form>
      </div>
      {isLoading && <div className="skeleton h-24 rounded-3xl" />}
      <ul className="space-y-3">{data?.items.map((u) => <UserRow key={u.id} u={u} self={u.id === user?.id} />)}</ul>
      {data?.items.length === 0 && <p className="p-8 text-center text-sm text-charcoal-500">No users match.</p>}
      {data && data.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          <span className="text-sm font-semibold">Page {page} of {data.totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      )}
    </>
  );
}
