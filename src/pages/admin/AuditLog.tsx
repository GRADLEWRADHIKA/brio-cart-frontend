import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { ROLE_LABELS } from '@shared/core';
import { adminApi } from '@/api/admin';
import { PageHeader } from '@/components/admin/kit';
import { Button } from '@/components/ui/Button';
import { formatDate } from '@/utils';

const ENTITIES = ['', 'Order', 'Product', 'ProductVariant', 'Category', 'User', 'Coupon', 'DeliveryArea', 'StoreSettings', 'Campaign'];

function details(d: unknown) {
  if (d == null) return null;
  const text = typeof d === 'string' ? d : JSON.stringify(d);
  return text.length > 160 ? `${text.slice(0, 160)}…` : text;
}

/** Super admin: read-only view of the AuditLog. */
export default function AuditLog() {
  const [entity, setEntity] = useState('');
  const [q, setQ] = useState('');
  const [action, setAction] = useState('');
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'audit', entity, action, page],
    queryFn: () => adminApi.audit({ entity: entity || undefined, action: action || undefined, page }),
    placeholderData: keepPreviousData,
  });
  return (
    <>
      <PageHeader title="Audit log" subtitle={data ? `${data.total} entries` : undefined} />
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <select value={entity} onChange={(e) => { setEntity(e.target.value); setPage(1); }} className="h-10 rounded-full border border-line bg-white px-4 text-sm font-bold" aria-label="Entity">
          {ENTITIES.map((e) => <option key={e} value={e}>{e || 'All records'}</option>)}
        </select>
        <form className="flex flex-1" onSubmit={(e) => { e.preventDefault(); setAction(q.trim()); setPage(1); }}>
          <label className="flex h-10 w-full items-center gap-2 rounded-full border border-line bg-white px-4 sm:max-w-xs">
            <Search className="size-4 text-charcoal-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Action, e.g. product.delete" className="w-full bg-transparent text-sm outline-none" aria-label="Filter by action" />
          </label>
        </form>
      </div>
      {isLoading && <div className="skeleton h-40 rounded-3xl" />}
      <ol className="divide-y divide-line overflow-hidden rounded-3xl border border-line bg-white">
        {data?.items.map((a) => (
          <li key={a.id} className="grid gap-1 px-4 py-3 text-sm sm:grid-cols-[11rem_1fr]">
            <span className="text-xs text-charcoal-500">{formatDate(a.createdAt)}</span>
            <span className="min-w-0">
              <span className="font-mono font-bold text-forest-800">{a.action}</span>{' '}
              <span className="text-charcoal-500">
                on {a.entity}
                {a.entityId ? ` ${a.entityId}` : ''}
              </span>
              <span className="block text-xs text-charcoal-700">
                by {a.actor ? `${a.actor.name} (${ROLE_LABELS[a.actor.role] ?? a.actor.role})` : 'system'}
              </span>
              {details(a.details) && <span className="mt-0.5 block break-all font-mono text-[0.7rem] text-charcoal-400">{details(a.details)}</span>}
            </span>
          </li>
        ))}
        {data?.items.length === 0 && <li className="p-8 text-center text-charcoal-500">No entries.</li>}
      </ol>
      {data && data.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Newer</Button>
          <span className="text-sm font-semibold">Page {page} of {data.totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>Older</Button>
        </div>
      )}
    </>
  );
}
