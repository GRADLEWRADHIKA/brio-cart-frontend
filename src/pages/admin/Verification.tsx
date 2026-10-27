import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle2, ExternalLink, XCircle } from 'lucide-react';
import { ROLE_LABELS } from '@shared/core';
import { reviewApi, type VerificationSummary } from '@/api/verification';
import { Card, PageHeader, td, th } from '@/components/admin/kit';
import { Button } from '@/components/ui/Button';
import { cn, formatDate } from '@/utils';

const tone = (status: string) =>
  status === 'APPROVED' ? 'bg-mint-100 text-forest-800' : status === 'REJECTED' ? 'bg-tomato-100 text-tomato-500' : status === 'PENDING' ? 'bg-turmeric-100 text-[#6b4500]' : 'bg-ivory-200 text-charcoal-500';
const statusWord = (status: string) => ({ APPROVED: 'Verified', REJECTED: 'Rejected', PENDING: 'To review', NOT_SUBMITTED: 'Not submitted' })[status] ?? status;

/** Super admin: shop owners' and riders' verification documents. */
export default function Verification() {
  const { userId } = useParams();
  return userId ? <Detail userId={userId} /> : <Queue />;
}

function Queue() {
  const { data, isLoading, error } = useQuery({ queryKey: ['admin', 'verification'], queryFn: reviewApi.queue, refetchInterval: 60_000 });
  return (
    <>
      <PageHeader title="Verification" subtitle="Shops and riders upload their documents here. Shops sell, and riders get orders, only after you approve them." />
      {error && <p className="mb-4 text-sm font-semibold text-tomato-500">{(error as Error).message}</p>}
      <Card className="overflow-hidden p-0 sm:p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-sm">
            <thead className="border-b border-line bg-ivory-50">
              <tr>
                <th className={th}>Name</th>
                <th className={th}>Type</th>
                <th className={th}>Documents waiting</th>
                <th className={th}>Last upload</th>
                <th className={th}>Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {isLoading && (
                <tr>
                  <td colSpan={5} className="p-6"><div className="skeleton h-10 rounded-xl" /></td>
                </tr>
              )}
              {data?.map((u) => (
                <tr key={u.userId} className="hover:bg-ivory-50">
                  <td className={td}>
                    <Link to={`/admin/verification/${u.userId}`} className="font-bold text-forest-700 hover:underline">{u.shop?.name ?? u.name}</Link>
                    <p className="text-xs text-charcoal-500">{u.shop ? `${u.name} · ` : ''}+91 {u.phone}</p>
                  </td>
                  <td className={td}>{u.role === 'SHOP_OWNER' ? 'Shop' : ROLE_LABELS[u.role]}</td>
                  <td className={cn(td, 'tabular-nums', u.pendingDocuments > 0 && 'font-bold text-[#8a5a00]')}>{u.pendingDocuments}</td>
                  <td className={td}>{u.lastUpload ? formatDate(u.lastUpload) : '—'}</td>
                  <td className={td}><span className={cn('rounded-full px-2.5 py-0.5 text-xs font-extrabold', tone(u.status))}>{statusWord(u.status)}</span></td>
                </tr>
              ))}
              {data && data.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-charcoal-500">No documents uploaded yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

function DocumentReview({ row, onDone }: { row: VerificationSummary['documents'][number]; onDone: (s: VerificationSummary) => void }) {
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState('');
  const review = useMutation({
    mutationFn: (decision: 'APPROVED' | 'REJECTED') => reviewApi.review(row.document!.id, decision, decision === 'REJECTED' ? note : undefined),
    onSuccess: (s) => {
      setRejecting(false);
      setNote('');
      onDone(s);
    },
  });
  const d = row.document;
  return (
    <li className="py-4" data-testid={`review-${row.kind}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-bold">{row.name} {!row.required && <span className="text-xs font-semibold text-charcoal-500">(if applicable)</span>}</p>
          {d ? (
            <p className="text-sm text-charcoal-500">
              Uploaded {formatDate(d.createdAt)}{d.reference ? ` · ${d.reference}` : ''}
            </p>
          ) : (
            <p className="text-sm text-charcoal-500">{row.required ? 'Not uploaded yet' : 'Not provided'}</p>
          )}
        </div>
        {d && <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-extrabold', tone(d.status))}>{d.status === 'PENDING' ? 'To review' : d.status === 'APPROVED' ? 'Approved' : 'Rejected'}</span>}
      </div>
      {d?.note && <p className="mt-2 text-sm text-tomato-500">Reason given: {d.note}</p>}
      {d && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <a href={reviewApi.fileUrl(d.id)} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line px-4 text-sm font-bold hover:border-forest-700">
            <ExternalLink className="size-4" /> View {d.mimeType === 'application/pdf' ? 'PDF' : 'photo'}
          </a>
          {d.status !== 'APPROVED' && (
            <Button size="sm" icon={<CheckCircle2 className="size-4" />} loading={review.isPending && review.variables === 'APPROVED'} onClick={() => review.mutate('APPROVED')}>
              Approve
            </Button>
          )}
          {d.status !== 'REJECTED' && (
            <Button size="sm" variant="outline" className="text-tomato-500" icon={<XCircle className="size-4" />} onClick={() => setRejecting(true)}>
              Reject
            </Button>
          )}
        </div>
      )}
      {rejecting && (
        <div className="mt-3 flex flex-wrap gap-2">
          <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="What’s wrong? They see this." aria-label="Reason" className="h-10 min-w-0 flex-1 rounded-2xl border border-line px-3 text-sm" />
          <Button size="sm" variant="outline" className="text-tomato-500" disabled={note.trim().length < 3} loading={review.isPending && review.variables === 'REJECTED'} onClick={() => review.mutate('REJECTED')}>
            Reject document
          </Button>
        </div>
      )}
      {review.error && <p className="mt-2 text-sm font-semibold text-tomato-500">{(review.error as Error).message}</p>}
    </li>
  );
}

function Detail({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const key = ['admin', 'verification', userId];
  const { data, isLoading, error } = useQuery({ queryKey: key, queryFn: () => reviewApi.detail(userId) });
  const [note, setNote] = useState('');
  const onSummary = (summary: VerificationSummary) => {
    qc.setQueryData(key, (old: typeof data) => (old ? { ...old, summary } : old));
    void qc.invalidateQueries({ queryKey: ['admin', 'verification'], exact: true });
  };
  const decide = useMutation({ mutationFn: (approve: boolean) => reviewApi.decide(userId, approve, approve ? undefined : note), onSuccess: onSummary });

  if (isLoading) return <div className="skeleton h-80 rounded-3xl" />;
  if (error || !data) return <p className="text-tomato-500">{(error as Error)?.message ?? 'Not found'}</p>;
  const { user, summary: s } = data;
  return (
    <>
      <Link to="/admin/verification" className="mb-3 inline-flex items-center gap-1 text-sm font-bold text-forest-700"><ArrowLeft className="size-4" /> Verification</Link>
      <PageHeader
        title={user.shop?.name ?? user.name}
        subtitle={`${user.role === 'SHOP_OWNER' ? `Shop owned by ${user.name}` : `Rider${user.vehicleNumber ? ` · ${user.vehicleNumber}` : ''}`} · +91 ${user.phone} · joined ${formatDate(user.createdAt, false)}`}
        actions={<span className={cn('rounded-full px-3 py-1 text-sm font-extrabold', tone(s.status))}>{statusWord(s.status)}</span>}
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <Card title="Documents">
          <ul className="divide-y divide-line">
            {s.documents.map((row) => (
              <DocumentReview key={row.kind} row={row} onDone={onSummary} />
            ))}
          </ul>
        </Card>
        <div className="space-y-6">
          <Card title="Agreement">
            {s.agreement ? <p className="text-sm">Signed by <span className="font-bold">{s.agreement.name}</span> on {formatDate(s.agreement.at)}</p> : <p className="text-sm text-charcoal-500">Not accepted yet.</p>}
          </Card>
          <Card title="Decision">
            <p className="text-sm text-charcoal-500">
              {s.allApproved ? 'Every required document is approved.' : 'Approve every required document first; the agreement must be accepted.'}
            </p>
            <Button className="mt-3 w-full" icon={<CheckCircle2 className="size-4" />} disabled={!s.allApproved || s.status === 'APPROVED'} loading={decide.isPending && decide.variables === true} onClick={() => decide.mutate(true)}>
              {s.role === 'SHOP_OWNER' ? 'Verify shop: products go live' : 'Approve rider'}
            </Button>
            <div className="mt-4 border-t border-line pt-4">
              <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="Reason for rejecting (they see this)" aria-label="Reason for rejecting" className="h-10 w-full rounded-2xl border border-line px-3 text-sm" />
              <Button className="mt-2 w-full text-tomato-500" variant="outline" disabled={note.trim().length < 3 || s.status === 'REJECTED'} loading={decide.isPending && decide.variables === false} onClick={() => decide.mutate(false)}>
                Reject
              </Button>
            </div>
            {decide.error && <p className="mt-2 text-sm font-semibold text-tomato-500">{(decide.error as Error).message}</p>}
          </Card>
        </div>
      </div>
    </>
  );
}
