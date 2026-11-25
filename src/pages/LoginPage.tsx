import { useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginInput } from '@shared';
import { useAuth } from '@/hooks/useAuth';
import { useContact } from '@/hooks/useStoreInfo';
import { TextField } from '@/components/forms/Field';
import { Button } from '@/components/ui/Button';
import { postLoginPath } from '@/auth/access';
import { AuthLayout } from './AuthLayout';

/** Only same-app relative paths are allowed as post-login redirects. */
export function safeNext(next: string | null, fallback = '/account') {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : fallback;
}

export default function LoginPage() {
  const { login, user } = useAuth();
  const { phoneDisplay } = useContact();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const next = safeNext(params.get('next'));
  const requested = params.get('next');
  const form = useForm<LoginInput>({ resolver: zodResolver(loginSchema), defaultValues: { identifier: '', password: '' } });
  const { errors } = form.formState;

  useEffect(() => {
    document.title = 'Sign in — Brio Cart';
  }, []);
  useEffect(() => {
    // Each role lands on its own home; a requested page is honoured only if the role may open it.
    if (user) navigate(postLoginPath(user.role, requested), { replace: true });
  }, [user, navigate, requested]);

  return (
    <AuthLayout title="Sign In to Your Account" subtitle="Get a faster, easier and more personalised shopping experience.">
      <form onSubmit={form.handleSubmit((v) => login.mutate({ identifier: v.identifier, password: v.password }))} noValidate className="space-y-4">
        <TextField label="Mobile number or email" autoComplete="username" inputMode="email" {...form.register('identifier')} error={errors.identifier?.message} />
        <TextField label="Password" type="password" autoComplete="current-password" {...form.register('password')} error={errors.password?.message} />
        <details className="group -mt-1 text-right text-sm">
          <summary className="cursor-pointer list-none font-semibold text-forest-700 hover:underline [&::-webkit-details-marker]:hidden">Forgot Password?</summary>
          <p className="mt-2 rounded-xl bg-mint-50 p-3 text-left text-charcoal-700">
            Call or WhatsApp <span className="select-all font-bold text-forest-800">{phoneDisplay}</span> from your registered number and we’ll reset it for you.
          </p>
        </details>
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
      <p className="mt-5 rounded-full border border-line bg-mint-50 px-4 py-2.5 text-center text-sm font-semibold text-forest-800">
        Delivery Partner?{' '}
        <Link to="/rider/register" className="font-bold underline underline-offset-2">
          Join as a Rider
        </Link>
      </p>
    </AuthLayout>
  );
}
