import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { CreditCard, Plus, Trash2 } from 'lucide-react';
import { adminApi, type AdminCampaign, type AdminSettings } from '@/api/admin';
import { ApiError } from '@/api/client';
import { Card, PageHeader } from '@/components/admin/kit';
import { Checkbox, SelectField, TextAreaField, TextField } from '@/components/forms/Field';
import { Button } from '@/components/ui/Button';
import { cn, formatDate } from '@/utils';

function SettingsForm({ initial }: { initial: AdminSettings }) {
  const qc = useQueryClient();
  const [slots, setSlots] = useState<string[]>(initial.deliverySlots);
  const form = useForm<AdminSettings>({ defaultValues: initial });
  const save = useMutation({
    mutationFn: (v: AdminSettings) =>
      adminApi.saveSettings({ ...v, deliveryFee: Number(v.deliveryFee), freeDeliveryThreshold: Number(v.freeDeliveryThreshold), minOrderAmount: Number(v.minOrderAmount), riderPayoutPerDelivery: Number(v.riderPayoutPerDelivery), defaultCommissionPercent: Number(v.defaultCommissionPercent), lowStockThreshold: Number(v.lowStockThreshold), orderConfirmTimeoutMinutes: Number(v.orderConfirmTimeoutMinutes), riderAcceptTimeoutMinutes: Number(v.riderAcceptTimeoutMinutes), gstRatePercent: Number(v.gstRatePercent), returnWindowHours: Number(v.returnWindowHours), gstin: v.gstin || null, storeAddress: v.storeAddress || null, deliverySlots: slots.map((s) => s.trim()).filter(Boolean), supportEmail: v.supportEmail || null, deliveryNote: v.deliveryNote || null }),
    onSuccess: (s) => {
      form.reset(s);
      setSlots(s.deliverySlots);
      void qc.invalidateQueries({ queryKey: ['store'] });
    },
  });
  const fields = save.error instanceof ApiError ? save.error.details?.fields : undefined;
  const { register } = form;
  return (
    <form onSubmit={form.handleSubmit((v) => save.mutate(v))} noValidate className="space-y-6">
      <Card title="Store & contact">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Store name" {...register('storeName')} error={fields?.storeName} />
          <TextField label="Tagline" {...register('tagline')} />
          <TextField label="Announcement bar" {...register('announcement')} className="sm:col-span-2" />
          <TextField label="WhatsApp number" {...register('whatsappNumber')} error={fields?.whatsappNumber} hint="Used for all “Order on WhatsApp” buttons." />
          <TextField label="Support phone" {...register('supportPhone')} error={fields?.supportPhone} />
          <TextField label="Support email" optional {...register('supportEmail')} />
          <div className="flex items-end pb-2">
            <Checkbox label="Accepting new orders" description="Turn off to pause checkout (e.g. holidays)." {...register('acceptingOrders')} />
          </div>
        </div>
      </Card>
      <Card title="Delivery & pricing">
        <div className="grid gap-4 sm:grid-cols-3">
          <TextField label="Delivery fee (₹)" type="number" min={0} step="0.01" {...register('deliveryFee')} error={fields?.deliveryFee} />
          <TextField label="Free delivery from (₹)" type="number" min={0} step="0.01" {...register('freeDeliveryThreshold')} hint="0 = never free" />
          <TextField label="Minimum order (₹)" type="number" min={0} step="0.01" {...register('minOrderAmount')} hint="0 = no minimum" />
          <TextField label="Shop commission (%)" type="number" min={0} max={50} step="0.5" {...register('defaultCommissionPercent')} error={fields?.defaultCommissionPercent} hint="Share of each shop’s item sales Brio Cart keeps. Applies to new orders; a shop can have its own rate (Shops page)." />
          <TextField label="Rider payout per delivery (₹)" type="number" min={0} step="0.01" {...register('riderPayoutPerDelivery')} error={fields?.riderPayoutPerDelivery} hint="Shown on the rider earnings page. Applies to deliveries completed after saving." />
          <TextField label="Low-stock alert at (units)" type="number" min={0} step="1" {...register('lowStockThreshold')} error={fields?.lowStockThreshold} />
          <TextField label="Auto-cancel unconfirmed orders after (minutes)" type="number" min={0} step="1" {...register('orderConfirmTimeoutMinutes')} error={fields?.orderConfirmTimeoutMinutes} hint="0 = never. Stock is returned." />
          <TextField label="Reassign if rider hasn't accepted in (minutes)" type="number" min={0} step="1" {...register('riderAcceptTimeoutMinutes')} error={fields?.riderAcceptTimeoutMinutes} hint="0 = never. Admins are notified." />
          <TextField label="Return window (hours after delivery)" type="number" min={0} step="1" {...register('returnWindowHours')} error={fields?.returnWindowHours} hint="0 = returns off" />
          <TextField label="GSTIN" optional {...register('gstin')} error={fields?.gstin} hint="Shown on invoices" />
          <TextField label="GST rate (%)" type="number" min={0} max={28} step="0.5" {...register('gstRatePercent')} error={fields?.gstRatePercent} hint="Prices include GST; the invoice shows the split" />
          <TextField label="Invoice prefix" {...register('invoicePrefix')} error={fields?.invoicePrefix} />
          <TextField label="Store address (for invoices)" optional {...register('storeAddress')} error={fields?.storeAddress} className="sm:col-span-2" />
          <TextField label="Delivery note" optional {...register('deliveryNote')} className="sm:col-span-3" />
        </div>
        <p className="mb-2 mt-5 text-sm font-extrabold text-charcoal-700">Delivery slots</p>
        <div className="space-y-2">
          {slots.map((s, i) => (
            <div key={i} className="flex gap-2">
              <input value={s} onChange={(e) => setSlots(slots.map((x, j) => (j === i ? e.target.value : x)))} className="h-11 flex-1 rounded-2xl border border-line px-4" aria-label={`Slot ${i + 1}`} />
              <button type="button" onClick={() => setSlots(slots.filter((_, j) => j !== i))} className="grid size-11 place-items-center rounded-2xl text-tomato-500 hover:bg-tomato-100" aria-label="Remove slot"><Trash2 className="size-4" /></button>
            </div>
          ))}
          <Button size="sm" variant="secondary" icon={<Plus className="size-4" />} onClick={() => setSlots([...slots, ''])}>Add slot</Button>
        </div>
      </Card>
      <Card title="Presentation (demo) mode">
        <Checkbox
          label="Enable demo mode"
          description="Shows the demo online-payment screens and lets you run a simulated delivery on the tracking map. Everything is labelled DEMO and no money is ever charged. Turn this OFF before taking real orders."
          {...register('demoMode')}
        />
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <TextField label="Store latitude" type="number" step="0.0001" {...register('storeLat', { valueAsNumber: true })} hint="Dispatch point on tracking maps" />
          <TextField label="Store longitude" type="number" step="0.0001" {...register('storeLng', { valueAsNumber: true })} />
        </div>
      </Card>
      <Card title="Payment methods">
        <div className="space-y-3">
          <Checkbox label="Cash on Delivery" {...register('codEnabled')} />
          <Checkbox label="UPI on Delivery" {...register('upiOnDeliveryEnabled')} />
          <div className="flex items-start gap-3 rounded-2xl border border-dashed border-line bg-ivory-50 p-4 text-sm">
            <CreditCard className="mt-0.5 size-5 text-charcoal-400" />
            <p><strong>Real online payments: not configured.</strong> A payment gateway (e.g. Razorpay) must be set up on the server before online payment can be offered. See the README → “Online payments”.</p>
          </div>
        </div>
      </Card>
      {save.error && <p className="rounded-2xl bg-tomato-100 p-3 text-sm font-semibold text-tomato-500" role="alert">{(save.error as Error).message}</p>}
      {save.isSuccess && <p className="rounded-2xl bg-mint-100 p-3 text-sm font-semibold text-forest-700" role="status">Settings saved.</p>}
      <Button type="submit" size="lg" loading={save.isPending}>Save settings</Button>
    </form>
  );
}

const toLocal = (iso: string) => {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

interface CampaignFormValues {
  title: string;
  headline: string;
  subcopy: string;
  signature: string;
  ctaLabel: string;
  ctaHref: string;
  theme: string;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
}

function CampaignForm({ c, onDone }: { c?: AdminCampaign; onDone: () => void }) {
  const qc = useQueryClient();
  const now = new Date().toISOString();
  const form = useForm<CampaignFormValues>({
    defaultValues: {
      title: c?.title ?? '',
      headline: c?.headline ?? '',
      subcopy: c?.subcopy ?? '',
      signature: c?.signature ?? 'Brio Cart — Fresh • Safe • Responsible',
      ctaLabel: c?.ctaLabel ?? '',
      ctaHref: c?.ctaHref ?? '',
      theme: c?.theme ?? 'festive',
      startsAt: toLocal(c?.startsAt ?? now),
      endsAt: toLocal(c?.endsAt ?? new Date(Date.now() + 7 * 864e5).toISOString()),
      isActive: c?.isActive ?? true,
    },
  });
  const save = useMutation({
    mutationFn: (v: CampaignFormValues) =>
      adminApi.saveCampaign({ ...v, subcopy: v.subcopy || null, signature: v.signature || null, ctaLabel: v.ctaLabel || null, ctaHref: v.ctaHref || null, startsAt: new Date(v.startsAt).toISOString(), endsAt: new Date(v.endsAt).toISOString() }, c?.id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'campaigns'] });
      void qc.invalidateQueries({ queryKey: ['store'] });
      onDone();
    },
  });
  const fields = save.error instanceof ApiError ? save.error.details?.fields : undefined;
  const { register } = form;
  return (
    <form onSubmit={form.handleSubmit((v) => save.mutate(v))} noValidate className="grid gap-4 rounded-2xl border border-line p-4 sm:grid-cols-2">
      <TextField label="Internal title" {...register('title')} error={fields?.title} />
      <SelectField label="Theme" {...register('theme')}>
        <option value="festive">Festive (marigold & diya)</option>
        <option value="fresh">Fresh (green)</option>
      </SelectField>
      <TextAreaField label="Headline" rows={2} {...register('headline')} error={fields?.headline} className="sm:col-span-2" />
      <TextAreaField label="Supporting copy" optional rows={2} {...register('subcopy')} className="sm:col-span-2" />
      <TextField label="Signature" optional {...register('signature')} />
      <TextField label="Button label" optional {...register('ctaLabel')} />
      <TextField label="Button link" optional placeholder="/product/navratri-combo" {...register('ctaHref')} error={fields?.ctaHref} />
      <div />
      <TextField label="Starts" type="datetime-local" {...register('startsAt')} />
      <TextField label="Ends" type="datetime-local" {...register('endsAt')} error={fields?.endsAt} hint="The banner disappears automatically after this." />
      <Checkbox label="Enabled" {...register('isActive')} />
      {save.error && !fields && <p className="text-sm font-semibold text-tomato-500 sm:col-span-2">{(save.error as Error).message}</p>}
      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit" size="sm" loading={save.isPending}>Save campaign</Button>
        <Button size="sm" variant="ghost" onClick={onDone}>Cancel</Button>
      </div>
    </form>
  );
}

function Campaigns() {
  const { data } = useQuery({ queryKey: ['admin', 'campaigns'], queryFn: adminApi.campaigns });
  const [editing, setEditing] = useState<string | null>(null);
  const now = data ? new Date(data.now) : new Date();
  return (
    <Card title="Seasonal campaigns" actions={<Button size="sm" variant="secondary" icon={<Plus className="size-4" />} onClick={() => setEditing('new')}>New campaign</Button>}>
      <p className="mb-4 text-sm text-charcoal-500">The homepage shows the enabled campaign whose dates include today. Expired campaigns are never shown.</p>
      <div className="space-y-3">
        {editing === 'new' && <CampaignForm onDone={() => setEditing(null)} />}
        {data?.items.map((c) => {
          const live = c.isActive && new Date(c.startsAt) <= now && new Date(c.endsAt) > now;
          const ended = new Date(c.endsAt) <= now;
          return editing === c.id ? (
            <CampaignForm key={c.id} c={c} onDone={() => setEditing(null)} />
          ) : (
            <div key={c.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-line p-4">
              <span className={cn('rounded-full px-2.5 py-1 text-xs font-extrabold uppercase', live ? 'bg-leaf-500 text-white' : ended ? 'bg-ivory-200 text-charcoal-500' : 'bg-turmeric-100 text-[#7a4f00]')}>
                {live ? 'Live' : ended ? 'Ended' : c.isActive ? 'Scheduled' : 'Disabled'}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-bold">{c.title}</p>
                <p lang="hi" className="truncate text-sm text-charcoal-500">{c.headline}</p>
                <p className="text-xs text-charcoal-400">{formatDate(c.startsAt)} → {formatDate(c.endsAt)}</p>
              </div>
              <Button size="sm" variant="secondary" onClick={() => setEditing(c.id)}>Edit</Button>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export default function StoreSettingsPage() {
  const { data, isLoading } = useQuery({ queryKey: ['admin', 'settings'], queryFn: adminApi.settings });

  return (
    <>
      <PageHeader title="Settings & campaigns" subtitle="Changes apply to the store and app immediately." />
      <div className="grid gap-6 xl:grid-cols-2">
        <div>{isLoading || !data ? <div className="skeleton h-96 rounded-3xl" /> : <SettingsForm initial={data} />}</div>
        <div>
          <Campaigns />
        </div>
      </div>
    </>
  );
}
