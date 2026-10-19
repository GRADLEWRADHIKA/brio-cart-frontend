import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { hasPermission } from '@shared/core';
import { accountApi } from '@/api/endpoints';
import { useAuth } from '@/hooks/useAuth';
import { tokenStore } from '@/services/token-store';
import { Button } from '@/components/ui/Button';
import { formatDate } from '@/utils';

/** Account deletion with password confirmation. Exported for tests. */
export function DeleteAccountForm({ onDeleted }: { onDeleted?: () => void }) {
  const qc = useQueryClient();
  const [password, setPassword] = useState('');
  const [sure, setSure] = useState(false);
  const del = useMutation({
    mutationFn: () => accountApi.deleteAccount(password),
    onSuccess: async () => {
      await tokenStore.set(null);
      qc.setQueryData(['me'], null);
      onDeleted?.();
    },
  });
  return (
    <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); del.mutate(); }}>
      <p className="text-sm text-charcoal-700">Your name, phone, email and addresses are removed. Past orders stay in the store's records without your contact details on your account.</p>
      <label className="flex items-center gap-2 text-sm font-bold">
        <input type="checkbox" checked={sure} onChange={(e) => setSure(e.target.checked)} className="size-4 accent-forest-700" /> I understand this can't be undone
      </label>
      <input type="password" aria-label="Password to confirm" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" autoComplete="current-password" className="h-11 w-full rounded-full border border-line px-4 text-sm" />
      <Button type="submit" variant="outline" disabled={!sure || !password} loading={del.isPending}>Delete my account</Button>
      {del.error && <p className="text-sm font-semibold text-tomato-500">{(del.error as Error).message}</p>}
    </form>
  );
}

/** Active sessions, "log out other devices", data export and account deletion. */
export function SecurityPanel() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const sessions = useQuery({ queryKey: ['account', 'sessions'], queryFn: accountApi.sessions });
  const others = useMutation({
    mutationFn: accountApi.logoutOthers,
    onSuccess: async (r) => {
      await tokenStore.set(r.token);
      void qc.invalidateQueries({ queryKey: ['account', 'sessions'] });
    },
  });
  const exp = useMutation({
    mutationFn: accountApi.exportData,
    onSuccess: (data) => {
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'brio-cart-my-data.json';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
  });
  const [deleting, setDeleting] = useState(false);
  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-2">
      <section className="rounded-[1.75rem] border border-line bg-white p-5 sm:p-7">
        <h2 className="font-display text-2xl font-semibold text-forest-900">Signed-in devices</h2>
        <ol className="mt-3 divide-y divide-line">
          {sessions.data?.map((s) => (
            <li key={s.id} className="py-2 text-sm">
              <span className="font-bold">{s.userAgent?.slice(0, 60) ?? 'Unknown device'}</span>
              {s.current && <span className="ml-2 rounded-full bg-mint-100 px-2 py-0.5 text-xs font-bold">This device</span>}
              <span className="block text-xs text-charcoal-500">Last active {formatDate(s.lastSeenAt)}</span>
            </li>
          ))}
        </ol>
        <Button className="mt-3" variant="outline" loading={others.isPending} onClick={() => others.mutate()}>Log out other devices</Button>
        {others.isSuccess && <p className="mt-2 text-sm text-leaf-600">Other devices are signed out.</p>}
      </section>
      <section className="rounded-[1.75rem] border border-line bg-white p-5 sm:p-7">
        <h2 className="font-display text-2xl font-semibold text-forest-900">Your data</h2>
        <Button className="mt-3" variant="outline" loading={exp.isPending} onClick={() => exp.mutate()}>Download my data (JSON)</Button>
        {exp.error && <p className="mt-2 text-sm font-semibold text-tomato-500">{(exp.error as Error).message}</p>}
        {hasPermission(user?.role, 'account:delete') && (
          <div className="mt-5 border-t border-line pt-4">
            {deleting ? <DeleteAccountForm /> : <Button variant="outline" onClick={() => setDeleting(true)}>Delete my account…</Button>}
          </div>
        )}
      </section>
    </div>
  );
}
