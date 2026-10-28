import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { ImageUp } from 'lucide-react';
import { shopApi, type MyShop, type ShopProfilePayload } from '@/api/shop';
import { ApiError } from '@/api/client';
import { useStoreInfo } from '@/hooks/useStoreInfo';
import { Card, PageHeader, Toggle } from '@/components/admin/kit';
import { SelectField, TextAreaField, TextField } from '@/components/forms/Field';
import { Button } from '@/components/ui/Button';
import { ProductImage } from '@/components/ui/misc';
import { SellingArea } from '@/components/seller/SellingArea';
import { PickupLocation } from '@/components/seller/PickupLocation';
import { DeliveryTimings } from '@/components/seller/DeliveryTimings';

type FormValues = Omit<ShopProfilePayload, 'description' | 'imageUrl' | 'prepMinutes'> & { description: string; imageUrl: string; prepMinutes: string };

const toForm = (s?: MyShop): FormValues => ({
  name: s?.name ?? '',
  phone: s?.phone ?? '',
  address: s?.address ?? '',
  areaId: s?.area?.id ?? '',
  description: s?.description ?? '',
  prepMinutes: String(s?.prepMinutes ?? 30),
  imageUrl: s?.rawImageUrl ?? '',
});

export default function SellerSettings() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const { data: shop } = useQuery({ queryKey: ['seller', 'me'], queryFn: shopApi.me });
  const { data: store } = useStoreInfo();
  const form = useForm<FormValues>({ defaultValues: toForm() });
  const { register, handleSubmit, reset, setValue, watch, setError, formState } = form;
  useEffect(() => {
    if (shop) reset(toForm(shop));
  }, [shop, reset]);

  const onSaved = (s: MyShop) => {
    qc.setQueryData(['seller', 'me'], s);
    void qc.invalidateQueries({ queryKey: ['seller', 'summary'] });
  };
  const save = useMutation({
    mutationFn: (v: FormValues) => shopApi.saveProfile({ ...v, description: v.description || undefined, imageUrl: v.imageUrl || null, prepMinutes: Number(v.prepMinutes) || 30 }),
    onSuccess: (s) => {
      onSaved(s);
      reset(toForm(s));
    },
    onError: (e) => {
      const fields = e instanceof ApiError ? e.details?.fields : undefined;
      if (fields) for (const [k, m] of Object.entries(fields)) setError(k as never, { message: m });
    },
  });
  const setOpen = useMutation({ mutationFn: shopApi.setOpen, onSuccess: onSaved });
  const upload = useMutation({
    mutationFn: shopApi.upload,
    onSuccess: (r) => {
      setValue('imageUrl', r.url, { shouldDirty: true });
      setUploadError(null);
    },
    onError: (e) => setUploadError((e as Error).message),
  });

  if (!shop) return <div className="skeleton h-80 rounded-3xl" />;
  const e = formState.errors;
  return (
    <>
      <PageHeader title="Shop settings" subtitle="What customers and riders see about your shop." />
      <Card title="Taking orders" className="mb-6">
        <label className="flex items-center gap-3 text-sm font-bold">
          <Toggle checked={shop.isOpen} label="Shop open for orders" disabled={setOpen.isPending} onChange={(v) => setOpen.mutate(v)} />
          {shop.isOpen ? 'Open: customers can order your products' : 'Closed: your products show as unavailable'}
        </label>
        <p className="mt-3 text-sm text-charcoal-500">Brio Cart keeps {shop.commissionPercent}% of your item sales as commission{shop.hasOwnCommission ? ' (your shop’s own rate)' : ''}.</p>
      </Card>
      <SellingArea shop={shop} />
      <PickupLocation shop={shop} />
      <DeliveryTimings shop={shop} />
      <form onSubmit={handleSubmit((v) => save.mutate(v))} noValidate>
        <Card title="Shop details">
          <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
            <div>
              <ProductImage src={watch('imageUrl') || null} alt="Shop photo" className="aspect-square rounded-2xl bg-ivory-100" />
              <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={(ev) => ev.target.files?.[0] && upload.mutate(ev.target.files[0])} />
              <Button type="button" size="sm" variant="outline" className="mt-2 w-full" icon={<ImageUp className="size-4" />} loading={upload.isPending} onClick={() => fileRef.current?.click()}>
                Photo
              </Button>
              {uploadError && <p className="mt-1 text-xs font-semibold text-tomato-500">{uploadError}</p>}
            </div>
            <div className="space-y-4">
              <TextField label="Shop name" {...register('name')} error={e.name?.message} />
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField label="Shop phone" type="tel" prefix="+91" {...register('phone')} error={e.phone?.message} />
                <SelectField label="Area" {...register('areaId')} error={e.areaId?.message}>
                  {store?.areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </SelectField>
              </div>
              <TextField label="Shop address" hint="Riders come here to collect orders." {...register('address')} error={e.address?.message} />
              <TextAreaField label="About your shop" optional rows={3} {...register('description')} error={e.description?.message} />
              <TextField label="Usual preparation time (minutes)" type="number" min={5} max={240} {...register('prepMinutes')} error={e.prepMinutes?.message} />
            </div>
          </div>
          {save.error && !(save.error instanceof ApiError && save.error.details?.fields) && <p className="mt-3 text-sm font-semibold text-tomato-500">{(save.error as Error).message}</p>}
          {save.isSuccess && !formState.isDirty && <p className="mt-3 text-sm font-semibold text-forest-700" role="status">Saved.</p>}
          <Button type="submit" className="mt-4" loading={save.isPending} disabled={!formState.isDirty}>Save changes</Button>
        </Card>
      </form>
    </>
  );
}
