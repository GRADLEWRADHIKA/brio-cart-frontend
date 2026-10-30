import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ImageUp, Megaphone, Plus } from 'lucide-react';
import { adminApi, type AdminBanner, type BannerInput } from '@/api/admin';
import { Card, PageHeader, Toggle } from '@/components/admin/kit';
import { SelectField, TextField } from '@/components/forms/Field';
import { Button } from '@/components/ui/Button';
import { EmptyState, ProductImage } from '@/components/ui/misc';
import { categoryOptions } from '@/utils/categories';
import { cn, formatDate } from '@/utils';

const THEMES = [
  { value: 'forest', label: 'Forest green', swatch: 'bg-forest-900' },
  { value: 'lime', label: 'Lime', swatch: 'bg-lime-300' },
  { value: 'tomato', label: 'Tomato red', swatch: 'bg-tomato-500' },
  { value: 'turmeric', label: 'Turmeric', swatch: 'bg-turmeric-100' },
];
/** yyyy-mm-dd (India time) for a date input. */
const dayInput = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) : '');
const dayIso = (d: string, end = false) => (d ? new Date(`${d}T${end ? '23:59:59' : '00:00:00'}+05:30`).toISOString() : null);

function BannerForm({ b, onDone }: { b?: AdminBanner; onDone: () => void }) {
  const qc = useQueryClient();
  const [v, setV] = useState({
    title: b?.title ?? '',
    subtitle: b?.subtitle ?? '',
    imageUrl: b?.rawImageUrl ?? '',
    ctaLabel: b?.rawCtaLabel ?? '',
    productId: b?.productId ?? '',
    categoryId: b?.categoryId ?? '',
    showOnHome: b?.showOnHome ?? true,
    theme: b?.theme ?? 'forest',
    startsAt: dayInput(b?.startsAt ?? null),
    endsAt: dayInput(b?.endsAt ?? null),
    isActive: b?.isActive ?? true,
    sortOrder: b?.sortOrder ?? 0,
  });
  const [search, setSearch] = useState(b?.productName ?? '');
  const products = useQuery({ queryKey: ['admin', 'products', { q: search }], queryFn: () => adminApi.products({ q: search }), enabled: search.trim().length >= 2 });
  const { data: categories } = useQuery({ queryKey: ['admin', 'categories'], queryFn: adminApi.categories });
  const picked = products.data?.find((p) => p.id === v.productId);
  const fileRef = useRef<HTMLInputElement>(null);
  const upload = useMutation({ mutationFn: adminApi.upload, onSuccess: (r) => setV((x) => ({ ...x, imageUrl: r.url })) });
  const save = useMutation({
    mutationFn: () => {
      const body: BannerInput = {
        ...v,
        subtitle: v.subtitle || null,
        imageUrl: v.imageUrl || null,
        ctaLabel: v.ctaLabel || null,
        productId: v.productId || null,
        categoryId: v.categoryId || null,
        startsAt: dayIso(v.startsAt),
        endsAt: dayIso(v.endsAt, true),
        sortOrder: Number(v.sortOrder) || 0,
      };
      return adminApi.saveBanner(body, b?.id);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'banners'] });
      void qc.invalidateQueries({ queryKey: ['banners'] });
      onDone();
    },
  });

  return (
    <div className="grid gap-3 rounded-2xl border border-line bg-white p-4 sm:grid-cols-6" data-testid="banner-form">
      <TextField label="Headline" value={v.title} maxLength={80} placeholder="e.g. Kinnaur apples are here" onChange={(e) => setV({ ...v, title: e.target.value })} className="sm:col-span-3" />
      <TextField label="Button text" optional maxLength={30} placeholder="Shop now" value={v.ctaLabel} onChange={(e) => setV({ ...v, ctaLabel: e.target.value })} className="sm:col-span-3" />
      <TextField label="Line below" optional maxLength={160} placeholder="e.g. Crisp, sweet and only ₹169/kg this week" value={v.subtitle} onChange={(e) => setV({ ...v, subtitle: e.target.value })} className="sm:col-span-6" />

      <div className="sm:col-span-3">
        <TextField label="Product to promote" placeholder="Type to search…" value={search} onChange={(e) => setSearch(e.target.value)} hint={v.productId ? `Promoting: ${picked?.name ?? b?.productName ?? 'selected product'}` : 'Tapping the banner opens this product.'} />
        {search.trim().length >= 2 && !picked && (
          <ul className="mt-1 max-h-44 overflow-y-auto rounded-2xl border border-line bg-white text-sm">
            {(products.data ?? []).slice(0, 8).map((p) => (
              <li key={p.id}>
                <button type="button" className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-mint-50" onClick={() => { setV({ ...v, productId: p.id }); setSearch(p.name); }}>
                  <ProductImage src={p.imageUrl} alt="" className="size-8 rounded-lg bg-ivory-100" /> {p.name}
                </button>
              </li>
            ))}
            {products.data?.length === 0 && <li className="px-3 py-2 text-charcoal-500">No products match.</li>}
          </ul>
        )}
      </div>
      <SelectField label="Also show on category page" optional value={v.categoryId} onChange={(e) => setV({ ...v, categoryId: e.target.value })} className="sm:col-span-3" hint="Shows on that category and its sub-categories.">
        <option value="">— None —</option>
        {categoryOptions(categories).map((o) => (
          <option key={o.category.id} value={o.category.id}>{o.label}</option>
        ))}
      </SelectField>

      <div className="flex items-center gap-3 sm:col-span-3">
        <ProductImage src={v.imageUrl || picked?.imageUrl || b?.imageUrl || null} alt="" className="size-16 shrink-0 rounded-2xl bg-ivory-100" />
        <div>
          <Button size="sm" variant="outline" icon={<ImageUp className="size-4" />} loading={upload.isPending} onClick={() => fileRef.current?.click()}>
            {v.imageUrl ? 'Change picture' : 'Own picture'}
          </Button>
          <p className="mt-1 text-xs text-charcoal-500">Optional: the product’s photo is used otherwise.</p>
          {v.imageUrl && <button type="button" className="text-xs font-bold text-tomato-500" onClick={() => setV({ ...v, imageUrl: '' })}>Use product photo</button>}
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="hidden" onChange={(ev) => ev.target.files?.[0] && upload.mutate(ev.target.files[0])} />
        </div>
      </div>
      <fieldset className="sm:col-span-3">
        <legend className="text-sm font-bold text-charcoal-700">Colour</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {THEMES.map((t) => (
            <button key={t.value} type="button" onClick={() => setV({ ...v, theme: t.value })} aria-pressed={v.theme === t.value} className={cn('flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-bold', v.theme === t.value ? 'border-forest-800 bg-mint-50' : 'border-line')}>
              <span className={cn('size-4 rounded-full ring-1 ring-black/10', t.swatch)} /> {t.label}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="flex items-center gap-2 text-sm font-bold sm:col-span-2"><Toggle checked={v.showOnHome} label="Show on the home page" onChange={(showOnHome) => setV({ ...v, showOnHome })} /> On the home page</label>
      <TextField label="From" type="date" optional value={v.startsAt} onChange={(e) => setV({ ...v, startsAt: e.target.value })} />
      <TextField label="Until" type="date" optional value={v.endsAt} onChange={(e) => setV({ ...v, endsAt: e.target.value })} />
      <TextField label="Order" type="number" value={v.sortOrder} onChange={(e) => setV({ ...v, sortOrder: Number(e.target.value) })} />
      <label className="flex items-end gap-2 pb-3 text-sm font-bold"><Toggle checked={v.isActive} label="Active" onChange={(isActive) => setV({ ...v, isActive })} /> Active</label>

      {(save.error || upload.error) && <p className="text-sm font-semibold text-tomato-500 sm:col-span-6">{((save.error ?? upload.error) as Error).message}</p>}
      <div className="flex gap-2 sm:col-span-6">
        <Button size="sm" loading={save.isPending} onClick={() => save.mutate()}>Save banner</Button>
        <Button size="sm" variant="ghost" onClick={onDone}>Cancel</Button>
      </div>
    </div>
  );
}

function status(b: AdminBanner) {
  const now = Date.now();
  if (!b.isActive) return { label: 'Off', tone: 'bg-ivory-200 text-charcoal-500' };
  if (b.productId && !b.productLive) return { label: 'Product not on sale', tone: 'bg-tomato-100 text-tomato-500' };
  if (b.startsAt && new Date(b.startsAt).getTime() > now) return { label: `Starts ${formatDate(b.startsAt, false)}`, tone: 'bg-turmeric-100 text-[#6b4500]' };
  if (b.endsAt && new Date(b.endsAt).getTime() <= now) return { label: 'Ended', tone: 'bg-ivory-200 text-charcoal-500' };
  return { label: b.endsAt ? `Live until ${formatDate(b.endsAt, false)}` : 'Live', tone: 'bg-mint-100 text-forest-800' };
}

export default function Banners() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['admin', 'banners'], queryFn: adminApi.banners });
  const [editing, setEditing] = useState<string | null>(null);
  const remove = useMutation({
    mutationFn: adminApi.deleteBanner,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'banners'] });
      void qc.invalidateQueries({ queryKey: ['banners'] });
    },
  });
  return (
    <>
      <PageHeader
        title="Product banners"
        subtitle="Promote a product with a banner on the home page and/or a category page. Banners can run between dates, and hide themselves if the product goes off sale."
        actions={<Button icon={<Plus className="size-4" />} onClick={() => setEditing('new')}>New banner</Button>}
      />
      <Card>
        <div className="space-y-3">
          {editing === 'new' && <BannerForm onDone={() => setEditing(null)} />}
          {!isLoading && !data?.length && editing !== 'new' && (
            <EmptyState icon={<Megaphone className="size-10" />} title="No banners yet" action={<Button onClick={() => setEditing('new')}>Create the first one</Button>}>
              Pick a product, write a headline, and it appears at the top of the home page.
            </EmptyState>
          )}
          {data?.map((b) => {
            const st = status(b);
            return editing === b.id ? (
              <BannerForm key={b.id} b={b} onDone={() => setEditing(null)} />
            ) : (
              <div key={b.id} className="flex flex-wrap items-center gap-4 rounded-2xl p-2 hover:bg-ivory-50" data-testid="banner-row">
                <ProductImage src={b.imageUrl} alt="" className="size-14 shrink-0 rounded-xl bg-ivory-100" />
                <div className="min-w-0 flex-1">
                  <p className="font-bold">{b.title} <span className={cn('ml-2 rounded-full px-2 py-0.5 text-xs font-extrabold', st.tone)}>{st.label}</span></p>
                  <p className="text-sm text-charcoal-500">
                    {b.productName ? `Promotes ${b.productName}` : `Links to ${b.categoryName}`} · {[b.showOnHome && 'Home page', b.categoryName && `${b.categoryName} page`].filter(Boolean).join(' + ')}
                  </p>
                </div>
                <Button size="sm" variant="secondary" onClick={() => setEditing(b.id)}>Edit</Button>
                <Button size="sm" variant="ghost" className="text-tomato-500" loading={remove.isPending && remove.variables === b.id} onClick={() => window.confirm(`Delete “${b.title}”?`) && remove.mutate(b.id)}>
                  Delete
                </Button>
              </div>
            );
          })}
        </div>
      </Card>
    </>
  );
}
