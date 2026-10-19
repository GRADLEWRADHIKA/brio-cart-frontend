import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { TICKET_STATUS_LABELS } from '@shared/core';
import { accountApi } from '@/api/endpoints';
import { Button } from '@/components/ui/Button';
import { cn, formatDate } from '@/utils';
import { TicketThread } from './TicketThread';

/** New-ticket form. Exported for tests. */
export function NewTicketForm({ onDone }: { onDone?: (id: string) => void }) {
  const qc = useQueryClient();
  const [v, setV] = useState({ subject: '', body: '', orderNumber: '' });
  const m = useMutation({
    mutationFn: () => accountApi.openTicket({ subject: v.subject.trim(), body: v.body.trim(), orderNumber: v.orderNumber.trim() || undefined }),
    onSuccess: (t) => {
      setV({ subject: '', body: '', orderNumber: '' });
      void qc.invalidateQueries({ queryKey: ['tickets'] });
      onDone?.(t.id);
    },
  });
  const ok = v.subject.trim().length >= 3 && v.body.trim().length >= 5;
  return (
    <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); m.mutate(); }}>
      <input aria-label="Subject" value={v.subject} maxLength={120} onChange={(e) => setV({ ...v, subject: e.target.value })} placeholder="Subject" className="h-11 w-full rounded-full border border-line px-4 text-sm" />
      <input aria-label="Order number" value={v.orderNumber} maxLength={40} onChange={(e) => setV({ ...v, orderNumber: e.target.value.toUpperCase() })} placeholder="Order number (optional)" className="h-11 w-full rounded-full border border-line px-4 text-sm" />
      <textarea aria-label="Message" value={v.body} maxLength={2000} rows={4} onChange={(e) => setV({ ...v, body: e.target.value })} placeholder="How can we help?" className="w-full rounded-2xl border border-line p-3 text-sm" />
      <Button type="submit" disabled={!ok} loading={m.isPending}>Send to support</Button>
      {m.error && <p className="text-sm font-semibold text-tomato-500">{(m.error as Error).message}</p>}
    </form>
  );
}

export function SupportTab() {
  const { data } = useQuery({ queryKey: ['tickets', 'mine'], queryFn: accountApi.tickets, refetchInterval: 30_000 });
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-[1.75rem] border border-line bg-white p-5 sm:p-7">
        <h2 className="mb-3 font-display text-2xl font-semibold text-forest-900">Contact support</h2>
        <NewTicketForm onDone={setOpen} />
        <ol className="mt-5 divide-y divide-line">
          {data?.map((t) => (
            <li key={t.id}>
              <button type="button" onClick={() => setOpen(t.id)} className={cn('w-full py-3 text-left text-sm', open === t.id && 'font-bold')}>
                {t.subject} <span className="text-charcoal-500">· {TICKET_STATUS_LABELS[t.status]} · {formatDate(t.updatedAt)}</span>
              </button>
            </li>
          ))}
        </ol>
      </section>
      {open && (
        <section className="rounded-[1.75rem] border border-line bg-white p-5 sm:p-7">
          <TicketThread id={open} load={accountApi.ticket} reply={accountApi.replyTicket} viewerIsStaff={false} />
        </section>
      )}
    </div>
  );
}
