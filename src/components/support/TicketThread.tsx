import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { TICKET_STATUS_LABELS } from '@shared/core';
import type { TicketView } from '@/types';
import { Button } from '@/components/ui/Button';
import { cn, formatDate } from '@/utils';

/** One ticket's messages with a reply box. Polls for new replies; no websockets. */
export function TicketThread({ id, load, reply, viewerIsStaff, actions }: { id: string; load: (id: string) => Promise<TicketView>; reply: (id: string, body: string) => Promise<TicketView>; viewerIsStaff: boolean; actions?: (t: TicketView) => React.ReactNode }) {
  const qc = useQueryClient();
  const key = ['ticket', viewerIsStaff ? 'staff' : 'me', id];
  const { data: t } = useQuery({ queryKey: key, queryFn: () => load(id), refetchInterval: 20_000 });
  const [body, setBody] = useState('');
  const send = useMutation({
    mutationFn: () => reply(id, body.trim()),
    onSuccess: (next) => {
      setBody('');
      qc.setQueryData(key, next);
      void qc.invalidateQueries({ queryKey: ['tickets'] });
    },
  });
  if (!t) return <div className="skeleton h-32 rounded-2xl" />;
  const closed = t.status === 'CLOSED' && !viewerIsStaff;
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-charcoal-500">{TICKET_STATUS_LABELS[t.status]}{t.orderNumber && ` · ${t.orderNumber}`}</p>
        {actions?.(t)}
      </div>
      <ol className="mt-3 space-y-2">
        {t.messages?.map((m) => {
          const mine = m.fromStaff === viewerIsStaff;
          return (
            <li key={m.id} className={cn('max-w-[85%] rounded-2xl px-4 py-2 text-sm', mine ? 'ml-auto bg-mint-100' : 'bg-ivory-100')}>
              <p className="whitespace-pre-wrap">{m.body}</p>
              <p className="mt-1 text-[0.7rem] text-charcoal-500">{m.fromStaff ? (m.author?.name ?? 'Store') : 'Customer'} · {formatDate(m.createdAt)}</p>
            </li>
          );
        })}
      </ol>
      {closed ? (
        <p className="mt-3 text-sm text-charcoal-500">This ticket is closed.</p>
      ) : (
        <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); send.mutate(); }}>
          <input aria-label="Reply" value={body} maxLength={2000} onChange={(e) => setBody(e.target.value)} placeholder="Write a reply" className="h-11 min-w-0 flex-1 rounded-full border border-line px-4 text-sm" />
          <Button type="submit" disabled={!body.trim()} loading={send.isPending}>Send</Button>
        </form>
      )}
      {send.error && <p className="mt-2 text-sm font-semibold text-tomato-500">{(send.error as Error).message}</p>}
    </div>
  );
}
