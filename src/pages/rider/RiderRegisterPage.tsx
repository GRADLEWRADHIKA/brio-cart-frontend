import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { riderRegisterSchema } from '@shared';
import { authApi } from '@/api/endpoints';
import { tokenStore } from '@/services/token-store';
import { TextField } from '@/components/forms/Field';
import { Button } from '@/components/ui/Button';
import { BrioMark } from '@/components/ui/Brand';

type In = z.input<typeof riderRegisterSchema>;
type Out = z.output<typeof riderRegisterSchema>;

/** Public sign-up for delivery partners. New riders wait for a super admin's approval. */
export default function RiderRegisterPage() {
  const qc = useQueryClient();
  const form = useForm<In, unknown, Out>({
    resolver: zodResolver(riderRegisterSchema),
    defaultValues: { name: '', phone: '', email: '', password: '', vehicleNumber: '' },
  });
  const signUp = useMutation({
    mutationFn: authApi.registerRider,
    onSuccess: async ({ user, token }) => {
      await tokenStore.set(token);
      // GuestOnly sends the new rider to /rider, which shows "waiting for approval".
      qc.setQueryData(['me'], user);
    },
  });
  const { errors } = form.formState;
  const fieldErrors = (signUp.error as { details?: { fields?: Record<string, string> } } | null)?.details?.fields;

  useEffect(() => {
    document.title = 'Become a delivery partner — Brio Cart';
  }, []);

  return (
    <div className="min-h-dvh bg-ivory-100">
      <header className="safe-top grain bg-forest-900 text-ivory-50">
        <div className="relative z-10 mx-auto flex max-w-lg items-center gap-2 px-4 py-4">
          <BrioMark className="size-8" tone="ivory" />
          <p className="font-display text-lg font-semibold">Brio Rider</p>
        </div>
      </header>
      <main className="mx-auto max-w-lg px-4 py-8">
        <h1 className="font-display text-4xl font-semibold text-forest-900">Deliver with Brio Cart</h1>
        <p className="mt-2 text-charcoal-500">Sign up as a delivery partner. The store reviews every application before you can receive orders.</p>
        <form onSubmit={form.handleSubmit((v) => signUp.mutate(v))} noValidate className="mt-6 space-y-4 rounded-[1.75rem] bg-white p-5 shadow-soft">
          <TextField label="Full name" autoComplete="name" {...form.register('name')} error={errors.name?.message ?? fieldErrors?.name} />
          <TextField label="Mobile number" type="tel" inputMode="numeric" prefix="+91" autoComplete="tel-national" {...form.register('phone')} error={errors.phone?.message ?? fieldErrors?.phone} />
          <TextField label="Vehicle number" placeholder="UP32 AB 1234" autoCapitalize="characters" {...form.register('vehicleNumber')} error={errors.vehicleNumber?.message ?? fieldErrors?.vehicleNumber} />
          <TextField label="Email" type="email" optional autoComplete="email" {...form.register('email')} error={errors.email?.message ?? fieldErrors?.email} />
          <TextField label="Password" type="password" autoComplete="new-password" hint="At least 8 characters." {...form.register('password')} error={errors.password?.message ?? fieldErrors?.password} />
          {signUp.error && !fieldErrors && (
            <p role="alert" className="rounded-2xl bg-tomato-100 p-3 text-sm font-semibold text-tomato-500">
              {(signUp.error as Error).message}
            </p>
          )}
          <Button type="submit" size="lg" block loading={signUp.isPending}>
            Apply as rider
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-charcoal-500">
          Already a rider?{' '}
          <Link to="/login?next=/rider" className="font-bold text-forest-700 underline underline-offset-2">
            Sign in
          </Link>
        </p>
      </main>
    </div>
  );
}
