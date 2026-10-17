import { useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { registerSchema } from '@shared';
import { useAuth } from '@/hooks/useAuth';
import { TextField } from '@/components/forms/Field';
import { Button } from '@/components/ui/Button';
import { AuthLayout } from './AuthLayout';
import { postLoginPath } from '@/auth/access';

type In = z.input<typeof registerSchema>;
type Out = z.output<typeof registerSchema>;

export default function RegisterPage() {
  const { register: signUp, user } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const requested = params.get('next');
  const form = useForm<In, unknown, Out>({ resolver: zodResolver(registerSchema), defaultValues: { name: '', phone: '', email: '', password: '' } });
  const { errors } = form.formState;

  useEffect(() => {
    document.title = 'Create account — Brio Cart';
  }, []);
  useEffect(() => {
    if (user) navigate(postLoginPath(user.role, requested), { replace: true });
  }, [user, navigate, requested]);

  const fieldErrors = (signUp.error as { details?: { fields?: Record<string, string> } } | null)?.details?.fields;

  return (
    <AuthLayout title="Create your account" subtitle="Save addresses, reorder quickly and track every delivery.">
      <form onSubmit={form.handleSubmit((v) => signUp.mutate(v))} noValidate className="space-y-4">
        <TextField label="Full name" autoComplete="name" {...form.register('name')} error={errors.name?.message ?? fieldErrors?.name} />
        <TextField label="Mobile number" type="tel" inputMode="numeric" prefix="+91" autoComplete="tel-national" {...form.register('phone')} error={errors.phone?.message ?? fieldErrors?.phone} />
        <TextField label="Email" type="email" optional autoComplete="email" {...form.register('email')} error={errors.email?.message ?? fieldErrors?.email} />
        <TextField label="Password" type="password" autoComplete="new-password" hint="At least 8 characters." {...form.register('password')} error={errors.password?.message ?? fieldErrors?.password} />
        {signUp.error && !fieldErrors && (
          <p role="alert" className="rounded-2xl bg-tomato-100 p-3 text-sm font-semibold text-tomato-500">
            {(signUp.error as Error).message}
          </p>
        )}
        <Button type="submit" size="lg" block loading={signUp.isPending}>
          Create account
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-charcoal-500">
        Already have an account?{' '}
        <Link to="/login" className="font-bold text-forest-700 underline underline-offset-2">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
