import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck } from 'lucide-react';
import { authApi } from '@/api/endpoints';
import { tokenStore } from '@/services/token-store';
import { TextField } from '@/components/forms/Field';
import { Button } from '@/components/ui/Button';
import { BrioMark } from '@/components/ui/Brand';

/**
 * One-time store setup: creates the first super admin. It needs the SETUP_CODE from the server's .env
 * and switches itself off for good once a super admin exists. Admins are then added from Admin → Users.
 */
export default function SetupPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const status = useQuery({ queryKey: ['setup'], queryFn: authApi.setupStatus });
  const [f, setF] = useState({ name: '', phone: '', email: '', password: '', confirm: '', code: '' });
  const [mismatch, setMismatch] = useState(false);
  const setup = useMutation({
    mutationFn: () => authApi.setup({ name: f.name, phone: f.phone, email: f.email || undefined, password: f.password, code: f.code }),
    onSuccess: async ({ user, token }) => {
      await tokenStore.set(token);
      qc.setQueryData(['me'], user);
      navigate('/admin', { replace: true });
    },
  });
  const fields = (setup.error as { details?: { fields?: Record<string, string> } } | null)?.details?.fields;
  useEffect(() => {
    document.title = 'Set up your store — Brio Cart';
  }, []);

  const shell = (children: React.ReactNode) => (
    <div className="min-h-dvh bg-ivory-100">
      <header className="grain bg-forest-900 text-ivory-50">
        <div className="relative z-10 mx-auto flex max-w-lg items-center gap-2 px-4 py-4">
          <BrioMark className="size-8" tone="ivory" />
          <p className="font-display text-lg font-semibold">Brio Cart setup</p>
        </div>
      </header>
      <main className="mx-auto max-w-lg px-4 py-8">{children}</main>
    </div>
  );

  if (status.isLoading) return shell(<div className="skeleton h-60 rounded-3xl" />);
  if (status.data && !status.data.needed) {
    return shell(
      <>
        <div className="rounded-[1.75rem] bg-white p-6 shadow-soft">
          <h1 className="font-display text-3xl font-semibold text-forest-900">Already set up</h1>
          <p className="mt-2 text-charcoal-500">This store already has a super admin. Sign in, and add staff from Admin → Users.</p>
          <Link to="/login?next=/admin" className="mt-4 inline-block font-bold text-forest-700 underline">Sign in</Link>
        </div>
        <ResetSuperAdmin codeSet={status.data.codeSet} />
      </>,
    );
  }
  if (status.data && !status.data.enabled) {
    return shell(
      <div className="rounded-[1.75rem] bg-white p-6 shadow-soft">
        <h1 className="font-display text-3xl font-semibold text-forest-900">Setup is switched off</h1>
        <p className="mt-2 text-charcoal-500">
          Add a line <code className="rounded bg-ivory-100 px-1">SETUP_CODE=your-own-long-code</code> to the API’s <code className="rounded bg-ivory-100 px-1">.env</code> on the server, restart the API, then reload this page.
        </p>
      </div>,
    );
  }

  return shell(
    <>
      <h1 className="font-display text-4xl font-semibold text-forest-900">Create the super admin</h1>
      <p className="mt-2 text-charcoal-500">The owner account with full access. This page works once: after this, add admins from Admin → Users.</p>
      <form
        noValidate
        className="mt-6 space-y-4 rounded-[1.75rem] bg-white p-5 shadow-soft"
        onSubmit={(e) => {
          e.preventDefault();
          setMismatch(f.password !== f.confirm);
          if (f.password === f.confirm) setup.mutate();
        }}
      >
        <TextField label="Setup code" hint="The SETUP_CODE from the server’s .env." value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} autoComplete="off" />
        <TextField label="Full name" autoComplete="name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} error={fields?.name} />
        <TextField label="Mobile number" type="tel" inputMode="numeric" prefix="+91" hint="You sign in with this." value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} error={fields?.phone} />
        <TextField label="Email" type="email" optional value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} error={fields?.email} />
        <TextField label="Password" type="password" autoComplete="new-password" hint="At least 12 characters." value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} error={fields?.password} />
        <TextField label="Confirm password" type="password" autoComplete="new-password" value={f.confirm} onChange={(e) => setF({ ...f, confirm: e.target.value })} error={mismatch ? 'Passwords do not match' : undefined} />
        {setup.error && !fields && <p role="alert" className="rounded-2xl bg-tomato-100 p-3 text-sm font-semibold text-tomato-500">{(setup.error as Error).message}</p>}
        <Button type="submit" size="lg" block icon={<ShieldCheck className="size-5" />} loading={setup.isPending}>Create super admin</Button>
      </form>
    </>,
  );
}

/** Forgotten super admin login: reset it with the server's SETUP_CODE. */
function ResetSuperAdmin({ codeSet }: { codeSet: boolean }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [f, setF] = useState({ code: '', identifier: '', password: '', confirm: '', newEmail: '' });
  const [mismatch, setMismatch] = useState(false);
  const reset = useMutation({
    mutationFn: () => authApi.resetSuperAdmin({ code: f.code, identifier: f.identifier, password: f.password, newEmail: f.newEmail || undefined }),
    onSuccess: async ({ user, token }) => {
      await tokenStore.set(token);
      qc.setQueryData(['me'], user);
      navigate('/admin', { replace: true });
    },
  });
  const fields = (reset.error as { details?: { fields?: Record<string, string> } } | null)?.details?.fields;

  return (
    <section className="mt-6 rounded-[1.75rem] bg-white p-6 shadow-soft" aria-label="Reset the super admin">
      <h2 className="font-display text-2xl font-semibold text-forest-900">Forgot the super admin login?</h2>
      {!codeSet ? (
        <p className="mt-2 text-sm text-charcoal-500">
          Add <code className="rounded bg-ivory-100 px-1">SETUP_CODE=your-own-long-code</code> to the API’s <code className="rounded bg-ivory-100 px-1">.env</code> on the server, restart the API, then reload this page to reset it here.
        </p>
      ) : (
        <form
          noValidate
          className="mt-4 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            setMismatch(f.password !== f.confirm);
            if (f.password === f.confirm) reset.mutate();
          }}
        >
          <TextField label="Setup code" hint="The SETUP_CODE from the server’s .env." value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} autoComplete="off" />
          <TextField label="Super admin’s mobile number or email" value={f.identifier} onChange={(e) => setF({ ...f, identifier: e.target.value })} />
          <TextField label="New password" type="password" autoComplete="new-password" hint="At least 12 characters." value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} error={fields?.password} />
          <TextField label="Confirm new password" type="password" autoComplete="new-password" value={f.confirm} onChange={(e) => setF({ ...f, confirm: e.target.value })} error={mismatch ? 'Passwords do not match' : undefined} />
          <TextField label="New email" type="email" optional hint="Leave empty to keep the current email." value={f.newEmail} onChange={(e) => setF({ ...f, newEmail: e.target.value })} error={fields?.newEmail} />
          {reset.error && !fields && <p role="alert" className="rounded-2xl bg-tomato-100 p-3 text-sm font-semibold text-tomato-500">{(reset.error as Error).message}</p>}
          <Button type="submit" size="lg" block loading={reset.isPending}>Reset and sign in</Button>
        </form>
      )}
    </section>
  );
}
