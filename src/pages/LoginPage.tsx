import { useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginInput } from '@shared';
import { useAuth } from '@/hooks/useAuth';
import { TextField } from '@/components/forms/Field';
import { Button } from '@/components/ui/Button';
import { AuthLayout } from './AuthLayout';

/** Only same-app relative paths are allowed as post-login redirects. */
export function safeNext(next: string | null, fallback = '/account') {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : fallback;
}

export default function LoginPage() {
  const { login, user } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const next = safeNext(params.get('next'));
  const form = useForm<LoginInput>({ resolver: zodResolver(loginSchema), defaultValues: { identifier: '', password: '' } });
  const { errors } = form.formState;

  useEffect(() => {
    document.title = 'Sign in — Brio Cart';
  }, []);
  useEffect(() => {
    if (!user) return;
    const home = user.role === 'ADMIN' ? '/admin' : user.role === 'RIDER' ? '/rider' : '/account';
    navigate(next === '/account' ? home : next, { replace: true });
  }, [user, navigate, next]);

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to see your orders, saved addresses and faster checkout.">
      <form onSubmit={form.handleSubmit((v) => login.mutate({ identifier: v.identifier, password: v.password }))} noValidate className="space-y-4">
        <TextField label="Mobile number or email" autoComplete="username" inputMode="email" {...form.register('identifier')} error={errors.identifier?.message} />
        <TextField label="Password" type="password" autoComplete="current-password" {...form.register('password')} error={errors.password?.message} />
        {login.error && (
          <p role="alert" className="rounded-2xl bg-tomato-100 p-3 text-sm font-semibold text-tomato-500">
            {(login.error as Error).message}
          </p>
        )}
        <Button type="submit" size="lg" block loading={login.isPending}>
          Sign in
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-charcoal-500">
        New to Brio Cart?{' '}
        <Link to={`/register${params.get('next') ? `?next=${encodeURIComponent(next)}` : ''}`} className="font-bold text-forest-700 underline underline-offset-2">
          Create an account
        </Link>
      </p>
      <p className="mt-2 text-center text-xs text-charcoal-400">You can also check out as a guest — no account needed.</p>
    </AuthLayout>
  );
}
