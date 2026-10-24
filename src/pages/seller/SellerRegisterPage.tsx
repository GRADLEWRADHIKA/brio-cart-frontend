import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { shopRegisterSchema } from '@shared';
import { authApi } from '@/api/endpoints';
import { tokenStore } from '@/services/token-store';
import { useStoreInfo } from '@/hooks/useStoreInfo';
import { SelectField, TextAreaField, TextField } from '@/components/forms/Field';
import { Button } from '@/components/ui/Button';
import { BrioMark } from '@/components/ui/Brand';

type In = z.input<typeof shopRegisterSchema>;
type Out = z.output<typeof shopRegisterSchema>;

/** Public sign-up for shop owners. There is no approval step: the shop can list products right away. */
export default function SellerRegisterPage() {
  const qc = useQueryClient();
  const { data: store } = useStoreInfo();
  const form = useForm<In, unknown, Out>({
    resolver: zodResolver(shopRegisterSchema),
    defaultValues: { name: '', phone: '', email: '', password: '', shop: { name: '', phone: '', address: '', areaId: '', description: '', prepMinutes: 30 } },
  });
  const signUp = useMutation({
    mutationFn: authApi.registerShop,
    onSuccess: async ({ user, token }) => {
      await tokenStore.set(token);
      // GuestOnly then sends the new owner to /seller.
      qc.setQueryData(['me'], user);
    },
  });
  const { errors } = form.formState;
  const fieldErrors = (signUp.error as { details?: { fields?: Record<string, string> } } | null)?.details?.fields;

  useEffect(() => {
    document.title = 'Sell on Brio Cart';
  }, []);

  return (
    <div className="min-h-dvh bg-ivory-100">
      <header className="safe-top grain bg-forest-900 text-ivory-50">
        <div className="relative z-10 mx-auto flex max-w-2xl items-center gap-2 px-4 py-4">
          <BrioMark className="size-8" tone="ivory" />
          <p className="font-display text-lg font-semibold">Brio Seller</p>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="font-display text-4xl font-semibold text-forest-900">Sell on Brio Cart</h1>
        <p className="mt-2 text-charcoal-500">
          List your shop’s products, accept the orders that come to you, and our riders collect and deliver them. You can start as soon as you sign up.
        </p>
        <form onSubmit={form.handleSubmit((v) => signUp.mutate(v))} noValidate className="mt-6 space-y-6">
          <section className="space-y-4 rounded-[1.75rem] bg-white p-5 shadow-soft">
            <h2 className="font-sans text-base font-extrabold text-forest-900">Your shop</h2>
            <TextField label="Shop name" placeholder="Sharma Kirana Store" {...form.register('shop.name')} error={errors.shop?.name?.message ?? fieldErrors?.['shop.name']} />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Shop phone" type="tel" inputMode="numeric" prefix="+91" {...form.register('shop.phone')} error={errors.shop?.phone?.message ?? fieldErrors?.['shop.phone']} />
              <SelectField label="Area" {...form.register('shop.areaId')} error={errors.shop?.areaId?.message ?? fieldErrors?.['shop.areaId']}>
                <option value="">Choose your area</option>
                {store?.areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </SelectField>
            </div>
            <TextField label="Shop address" placeholder="Shop no. 4, Kapoorthala Market" hint="Riders come here to collect orders." {...form.register('shop.address')} error={errors.shop?.address?.message ?? fieldErrors?.['shop.address']} />
            <TextAreaField label="About your shop" optional rows={2} {...form.register('shop.description')} error={errors.shop?.description?.message} />
            <TextField label="Usual preparation time (minutes)" type="number" min={5} max={240} {...form.register('shop.prepMinutes')} error={errors.shop?.prepMinutes?.message} />
          </section>
          <section className="space-y-4 rounded-[1.75rem] bg-white p-5 shadow-soft">
            <h2 className="font-sans text-base font-extrabold text-forest-900">Your account</h2>
            <TextField label="Your full name" autoComplete="name" {...form.register('name')} error={errors.name?.message ?? fieldErrors?.name} />
            <TextField label="Mobile number" type="tel" inputMode="numeric" prefix="+91" autoComplete="tel-national" hint="You sign in with this." {...form.register('phone')} error={errors.phone?.message ?? fieldErrors?.phone} />
            <TextField label="Email" type="email" optional autoComplete="email" {...form.register('email')} error={errors.email?.message ?? fieldErrors?.email} />
            <TextField label="Password" type="password" autoComplete="new-password" hint="At least 8 characters." {...form.register('password')} error={errors.password?.message ?? fieldErrors?.password} />
          </section>
          {signUp.error && !fieldErrors && (
            <p role="alert" className="rounded-2xl bg-tomato-100 p-3 text-sm font-semibold text-tomato-500">
              {(signUp.error as Error).message}
            </p>
          )}
          <Button type="submit" size="lg" block loading={signUp.isPending}>
            Create my shop
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-charcoal-500">
          Already selling?{' '}
          <Link to="/login?next=/seller" className="font-bold text-forest-700 underline underline-offset-2">
            Sign in
          </Link>
        </p>
      </main>
    </div>
  );
}
