import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { TICKET_STATUS_LABELS, TICKET_STATUSES } from '@shared/core';
import { adminApi } from '@/api/admin';
import { Card, PageHeader } from '@/components/admin/kit';
import { TicketThread } from '@/components/support/TicketThread';
import { cn, formatDate } from '@/utils';
import type { TicketView } from '@/types';

function StatusSelect({ t }: { t: TicketView }) {
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: (s: TicketView['status']) => adminApi.setTicketStatus(t.id, s),
    onSuccess: (next) => {
      qc.setQueryData(['ticket', 'staff', t.id], next);
      void qc.invalidateQueries({ queryKey: ['tickets'] });
    },
  });
  return (
    <select aria-label="Ticket status" value={t.status} disabled={m.isPending} onChange={(e) => m.mutate(e.target.value as TicketView['status'])} className="h-8 rounded-full border border-line bg-white px-3 text-xs font-bold">
      {TICKET_STATUSES.map((s) => <option key={s} value={s}>{TICKET_STATUS_LABELS[s]}</option>)}
    </select>
  );
}

export default function Tickets() {
  const [status, setStatus] = useState<string>('OPEN');
  const { data } = useQuery({ queryKey: ['tickets', 'staff', status], queryFn: () => adminApi.tickets(status || undefined), refetchInterval: 30_000 });
  const [open, setOpen] = useState<string | null>(null);
  return (
    <>
      <PageHeader
        title="Support"
        actions={
          <select aria-label="Status filter" value={status} onChange={(e) => setStatus(e.target.value)} className="h-10 rounded-full border border-line bg-white px-4 text-sm font-bold">
            {TICKET_STATUSES.map((s) => <option key={s} value={s}>{TICKET_STATUS_LABELS[s]}</option>)}
            <option value="">All</option>
          </select>
        }
      />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,22rem)_1fr]">
        <Card className="p-2 sm:p-2">
          <ol className="divide-y divide-line">
            {data?.map((t) => (
              <li key={t.id}>
                <button type="button" onClick={() => setOpen(t.id)} className={cn('w-full px-3 py-3 text-left text-sm', open === t.id && 'bg-mint-50')}>
                  <span className="block font-bold">{t.subject}</span>
                  <span className="text-xs text-charcoal-500">{t.customer.name} · {t.messageCount} messages · {formatDate(t.updatedAt)}</span>
                </button>
              </li>
            ))}
            {data?.length === 0 && <li className="p-6 text-center text-sm text-charcoal-500">No tickets.</li>}
          </ol>
        </Card>
        {open && (
          <Card>
            <TicketThread id={open} load={adminApi.ticket} reply={adminApi.replyTicket} viewerIsStaff actions={(t) => <StatusSelect t={t} />} />
          </Card>
        )}
      </div>
    </>
  );
}
