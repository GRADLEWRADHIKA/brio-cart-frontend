import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Clock, FileText, ShieldCheck, Upload, XCircle } from 'lucide-react';
import { RIDER_AGREEMENT, SELLER_AGREEMENT, type DocumentKind } from '@shared/core';
import { verificationApi, type VerificationSummary } from '@/api/verification';
import { Button } from '@/components/ui/Button';
import { cn, formatDate } from '@/utils';

const STATUS = {
  APPROVED: { label: 'Approved', tone: 'bg-mint-100 text-forest-800', icon: CheckCircle2 },
  PENDING: { label: 'Waiting for review', tone: 'bg-turmeric-100 text-[#6b4500]', icon: Clock },
  REJECTED: { label: 'Upload again', tone: 'bg-tomato-100 text-tomato-500', icon: XCircle },
} as const;

/** What the whole account's status means, in one line. */
function overall(s: VerificationSummary) {
  const who = s.role === 'SHOP_OWNER' ? 'Your shop' : 'Your account';
  if (s.status === 'APPROVED') return { tone: 'bg-mint-100 text-forest-800', text: `${who} is verified.${s.role === 'SHOP_OWNER' ? ' Your products are live.' : ''}` };
  if (s.status === 'REJECTED') return { tone: 'bg-tomato-100 text-tomato-500', text: `${who} was not verified${s.note ? `: ${s.note}` : ''}. Fix the documents marked below.` };
  if (s.complete) return { tone: 'bg-turmeric-100 text-[#6b4500]', text: 'Thanks! Brio Cart is checking your documents. We’ll notify you once they are approved.' };
  return {
    tone: 'bg-ivory-200 text-charcoal-700',
    text: s.role === 'SHOP_OWNER' ? 'Upload the required documents and accept the seller agreement. Your products go live once Brio Cart approves them.' : 'Upload the required documents and accept the rider agreement. You can take orders once Brio Cart approves them.',
  };
}

function DocumentRow({ row }: { row: VerificationSummary['documents'][number] }) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [reference, setReference] = useState(row.document?.reference ?? '');
  const upload = useMutation({
    mutationFn: (file: File) => verificationApi.upload(row.kind as DocumentKind, file, reference.trim() || undefined),
    onSuccess: (s) => qc.setQueryData(['verification'], s),
  });
  const d = row.document;
  const st = d ? STATUS[d.status] : null;
  return (
    <li className="py-4" data-testid={`doc-${row.kind}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-bold">
            {row.name} {!row.required && <span className="text-xs font-semibold text-charcoal-500">(if applicable)</span>}
          </p>
          <p className="text-sm text-charcoal-500">{row.hint}</p>
        </div>
        {st ? (
          <span className={cn('inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-extrabold', st.tone)}>
            <st.icon className="size-3.5" aria-hidden /> {st.label}
          </span>
        ) : (
          <span className="shrink-0 rounded-full bg-ivory-200 px-2.5 py-1 text-xs font-extrabold text-charcoal-500">{row.required ? 'Required' : 'Optional'}</span>
        )}
      </div>
      {d?.status === 'REJECTED' && d.note && <p className="mt-2 rounded-xl bg-tomato-100 p-2 text-sm font-semibold text-tomato-500">{d.note}</p>}
      {d && (
        <p className="mt-2 flex items-center gap-2 text-sm text-charcoal-700">
          <FileText className="size-4" aria-hidden />
          <a href={verificationApi.fileUrl(d.id)} target="_blank" rel="noreferrer" className="font-semibold text-forest-700 underline">
            View uploaded file
          </a>
          <span className="text-charcoal-500">· {formatDate(d.createdAt)}{d.reference ? ` · ${d.reference}` : ''}</span>
        </p>
      )}
      {d?.status !== 'APPROVED' && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {row.reference && (
            <input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              maxLength={80}
              placeholder={row.reference}
              aria-label={`${row.name}: ${row.reference}`}
              className="h-10 min-w-0 flex-1 rounded-2xl border border-line px-3 text-sm"
            />
          )}
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="sr-only" aria-label={`Upload ${row.name}`} onChange={(e) => e.target.files?.[0] && upload.mutate(e.target.files[0])} />
          <Button size="sm" variant={d ? 'outline' : 'primary'} icon={<Upload className="size-4" />} loading={upload.isPending} onClick={() => fileRef.current?.click()}>
            {d ? 'Replace' : 'Upload photo or PDF'}
          </Button>
        </div>
      )}
      {upload.error && <p className="mt-2 text-sm font-semibold text-tomato-500" role="alert">{(upload.error as Error).message}</p>}
    </li>
  );
}

/** Documents a shop owner or rider must provide, with the declaration to accept. Used in the seller portal and the rider app. */
export function VerificationPanel({ className }: { className?: string }) {
  const qc = useQueryClient();
  const { data: s, isLoading, error } = useQuery({ queryKey: ['verification'], queryFn: verificationApi.summary });
  const [name, setName] = useState('');
  const [ticked, setTicked] = useState(false);
  const accept = useMutation({ mutationFn: () => verificationApi.accept(name), onSuccess: (r) => qc.setQueryData(['verification'], r) });

  if (error) return <p className="text-tomato-500">{(error as Error).message}</p>;
  if (isLoading || !s) return <div className="skeleton h-60 rounded-3xl" />;
  const o = overall(s);
  const points = s.role === 'SHOP_OWNER' ? SELLER_AGREEMENT : RIDER_AGREEMENT;
  return (
    <div className={cn('space-y-4', className)}>
      <p className={cn('flex gap-2 rounded-2xl p-3 text-sm font-semibold', o.tone)} role="status">
        <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden /> {o.text}
      </p>
      <section className="rounded-3xl border border-line bg-white p-5">
        <h2 className="font-sans text-base font-extrabold text-forest-900">Documents</h2>
        <p className="mt-1 text-sm text-charcoal-500">A clear photo or PDF of each, up to 5 MB. Only you and Brio Cart’s verification team can see them.</p>
        <ul className="divide-y divide-line">
          {s.documents.map((row) => (
            <DocumentRow key={row.kind} row={row} />
          ))}
        </ul>
      </section>
      <section className="rounded-3xl border border-line bg-white p-5">
        <h2 className="font-sans text-base font-extrabold text-forest-900">{s.role === 'SHOP_OWNER' ? 'Declaration and seller agreement' : 'Rider declaration'}</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-charcoal-700">
          {points.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
        {s.agreement ? (
          <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-forest-700">
            <CheckCircle2 className="size-4" aria-hidden /> Accepted by {s.agreement.name} on {formatDate(s.agreement.at)}
          </p>
        ) : (
          <form
            className="mt-4 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              accept.mutate();
            }}
          >
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" checked={ticked} onChange={(e) => setTicked(e.target.checked)} className="mt-1" />I have read and agree to the above.
            </label>
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="Type your full name to sign" aria-label="Full name to sign" className="h-11 w-full rounded-2xl border border-line px-4 text-sm" />
            <Button type="submit" size="sm" loading={accept.isPending} disabled={!ticked || name.trim().length < 2}>Accept and sign</Button>
            {accept.error && <p className="text-sm font-semibold text-tomato-500">{(accept.error as Error).message}</p>}
          </form>
        )}
      </section>
    </div>
  );
}
