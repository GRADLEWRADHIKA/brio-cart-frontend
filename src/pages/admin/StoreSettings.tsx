import { useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { CreditCard, Plus, Trash2, Truck } from 'lucide-react';
import { adminApi, type AdminCampaign, type AdminSettings, type AdminSettingsResponse } from '@/api/admin';
import { ApiError } from '@/api/client';
import { Card, PageHeader } from '@/components/admin/kit';
import { ImageInput } from '@/components/admin/Pickers';
import { Checkbox, SelectField, TextAreaField, TextField } from '@/components/forms/Field';
import { Button } from '@/components/ui/Button';
import { cn, formatDate } from '@/utils';

/** Text and link settings where an empty box means "not set" (sent as null). */
const NULLABLE_TEXT = [
  'heroTitle',
  'heroSubtitle',
  'heroImageUrl',
  'homeVideoUrl',
  'homeVideoPoster',
  'homeVideoTitle',
  'homeVideoText',
  'aboutStory',
  'aboutStoryImage',
  'aboutChemicalFree',
  'aboutChemicalImage',
] as const;
type NullableText = (typeof NULLABLE_TEXT)[number];

const nullIfEmpty = (v: string | null | undefined) => (v && v.trim() ? v.trim() : null);

/** A read-only line saying whether a service is set up on the server. */
function ServiceStatus({ icon, ok, name, okText, offText }: { icon: ReactNode; ok: boolean; name: string; okText: string; offText: ReactNode }) {
  return (
    <div className={cn('flex items-start gap-3 rounded-2xl p-4 text-sm', ok ? 'bg-mint-100 text-forest-800' : 'border border-dashed border-line bg-ivory-50')}>
      <span className={cn('mt-0.5', ok ? 'text-forest-700' : 'text-charcoal-400')}>{icon}</span>
      <p>
        <strong>{name}:</strong> {ok ? okText : offText}
      </p>
    </div>
  );
}

function SettingsForm({ initial, status }: { initial: AdminSettings; status: Omit<AdminSettingsResponse, 'settings'> }) {
  const qc = useQueryClient();
  const [slots, setSlots] = useState<string[]>(initial.deliverySlots);
  const form = useForm<AdminSettings>({ defaultValues: initial });
  const save = useMutation({
    mutationFn: (v: AdminSettings) =>
      adminApi.saveSettings({ ...v, deliveryFee: Number(v.deliveryFee), freeDeliveryThreshold: Number(v.freeDeliveryThreshold), minOrderAmount: Number(v.minOrderAmount), riderPayoutPerDelivery: Number(v.riderPayoutPerDelivery), defaultCommissionPercent: Number(v.defaultCommissionPercent), lowStockThreshold: Number(v.lowStockThreshold), orderConfirmTimeoutMinutes: Number(v.orderConfirmTimeoutMinutes), riderAcceptTimeoutMinutes: Number(v.riderAcceptTimeoutMinutes), dispatchOfferSeconds: Number(v.dispatchOfferSeconds), dispatchRadiusKm: Number(v.dispatchRadiusKm), dispatchMaxOffers: Number(v.dispatchMaxOffers), batchMaxOrders: Number(v.batchMaxOrders), batchRadiusKm: Number(v.batchRadiusKm), gstRatePercent: Number(v.gstRatePercent), returnWindowHours: Number(v.returnWindowHours), gstin: v.gstin || null, storeAddress: v.storeAddress || null, deliverySlots: slots.map((s) => s.trim()).filter(Boolean), supportEmail: v.supportEmail || null, deliveryNote: v.deliveryNote || null, etaLocal: v.etaLocal.trim(), etaCity: v.etaCity.trim(), etaIndia: v.etaIndia.trim(), ...(Object.fromEntries(NULLABLE_TEXT.map((k) => [k, nullIfEmpty(v[k])])) as Record<NullableText, string | null>) }),
    onSuccess: (s) => {
      form.reset(s);
      setSlots(s.deliverySlots);
      void qc.invalidateQueries({ queryKey: ['store'] });
    },
  });
  const fields = save.error instanceof ApiError ? save.error.details?.fields : undefined;
  const { register } = form;
  /** Image settings, with the admin uploader. */
  const image = (k: 'heroImageUrl' | 'homeVideoPoster' | 'aboutStoryImage' | 'aboutChemicalImage', label: string, hint?: string) => (
    <ImageInput label={label} hint={hint} value={form.watch(k) ?? ''} onChange={(v) => form.setValue(k, v, { shouldDirty: true })} upload={adminApi.upload} error={fields?.[k]} />
  );
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
          <TextField label="Offer each order to the nearest rider for (seconds)" type="number" min={0} max={600} step="1" {...register('dispatchOfferSeconds')} error={fields?.dispatchOfferSeconds} hint="Then the next nearest. 0 = off: every order opens to all riders at once." />
          <TextField label="Nearby rider distance (km)" type="number" min={0.5} max={50} step="0.5" {...register('dispatchRadiusKm')} error={fields?.dispatchRadiusKm} hint="Straight-line distance from the pickup point." />
          <TextField label="Riders to offer before opening to all" type="number" min={1} max={10} step="1" {...register('dispatchMaxOffers')} error={fields?.dispatchMaxOffers} />
          <TextField label="Orders a rider can carry at once" type="number" min={1} max={10} step="1" {...register('batchMaxOrders')} error={fields?.batchMaxOrders} hint="A busy rider is offered more only for the same slot and a nearby drop. 1 = one at a time." />
          <TextField label="Batch: drops within (km)" type="number" min={0.2} max={20} step="0.1" {...register('batchRadiusKm')} error={fields?.batchRadiusKm} hint="How close a new order’s drop must be to one the rider already has." />
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
      <Card title="Delivery times shown to shoppers">
        <p className="mb-4 text-sm text-charcoal-500">Shown on product pages, the cart and checkout, so shoppers know when to expect their order.</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <TextField label="Brio Cart delivery areas" maxLength={40} {...register('etaLocal')} error={fields?.etaLocal} hint="Our own riders, e.g. “Next morning”" />
          <TextField label="Rest of Lucknow (courier)" maxLength={40} {...register('etaCity')} error={fields?.etaCity} hint="e.g. “1–3 days”" />
          <TextField label="Rest of India (courier)" maxLength={40} {...register('etaIndia')} error={fields?.etaIndia} hint="e.g. “Within 7 days”" />
        </div>
        <div className="mt-4">
          <ServiceStatus
            icon={<Truck className="size-5" />}
            ok={status.shiprocketConfigured}
            name="Shiprocket"
            okText="connected. Courier rates and booking are available on the Courier orders page."
            offText={<>not set up. Add SHIPROCKET_EMAIL and SHIPROCKET_PASSWORD to the server .env to get rates and book couriers from the dashboard.</>}
          />
        </div>
      </Card>
      <Card title="Home page">
        <p className="mb-2 text-sm font-extrabold text-charcoal-700">Front banner</p>
        <div className="grid gap-4">
          <TextField label="Banner title" optional maxLength={80} {...register('heroTitle')} error={fields?.heroTitle} hint="Leave empty for the standard title." />
          <TextAreaField label="Banner subtitle" optional rows={2} maxLength={200} {...register('heroSubtitle')} error={fields?.heroSubtitle} />
          {image('heroImageUrl', 'Banner photo', 'A wide photo, at least 1600 px across. Leave empty for the standard one.')}
        </div>
        <p className="mb-2 mt-6 text-sm font-extrabold text-charcoal-700">Video</p>
        <div className="grid gap-4">
          <TextField label="Video link" optional placeholder="https://youtu.be/… or https://…/video.mp4" {...register('homeVideoUrl')} error={fields?.homeVideoUrl} hint="YouTube link or a direct .mp4 link; leave empty to hide the video" />
          <TextField label="Video title" optional maxLength={80} {...register('homeVideoTitle')} error={fields?.homeVideoTitle} />
          <TextAreaField label="Video text" optional rows={3} maxLength={300} {...register('homeVideoText')} error={fields?.homeVideoText} />
          {image('homeVideoPoster', 'Video cover photo', 'Shown before the video plays.')}
        </div>
      </Card>
      <Card title="About page">
        <p className="mb-2 text-sm font-extrabold text-charcoal-700">Our Brand Story</p>
        <div className="grid gap-4">
          <TextAreaField label="Brand story" optional rows={8} maxLength={4000} {...register('aboutStory')} error={fields?.aboutStory} hint="Line breaks are kept. Leave empty for the standard text." />
          {image('aboutStoryImage', 'Brand story photo')}
        </div>
        <p className="mb-2 mt-6 text-sm font-extrabold text-charcoal-700">Chemical Free</p>
        <div className="grid gap-4">
          <TextAreaField label="Chemical-free text" optional rows={8} maxLength={4000} {...register('aboutChemicalFree')} error={fields?.aboutChemicalFree} hint="Line breaks are kept. Leave empty for the standard text." />
          {image('aboutChemicalImage', 'Chemical-free photo')}
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
          <ServiceStatus
            icon={<CreditCard className="size-5" />}
            ok={status.onlinePaymentConfigured}
            name="Razorpay"
            okText={`connected${status.onlinePaymentTestMode ? ' (test mode: no real money moves)' : ' (live)'}. Shoppers can pay online at checkout.`}
            offText={<>not set up. Add the Razorpay keys to the server .env before online payment can be offered. See the README → “Online payments”.</>}
          />
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
        <div>{isLoading || !data ? <div className="skeleton h-96 rounded-3xl" /> : <SettingsForm initial={data.settings} status={data} />}</div>
        <div>
          <Campaigns />
        </div>
      </div>
    </>
  );
}
