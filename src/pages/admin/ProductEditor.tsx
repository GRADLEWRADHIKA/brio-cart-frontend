import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useFieldArray, useForm } from 'react-hook-form';
import { ArrowDown, ArrowLeft, ArrowUp, ImageUp, Plus, Trash2 } from 'lucide-react';
import {
  AGE_GROUP_LABELS,
  AGE_GROUPS,
  COLLECTIONS,
  HEALTH_TAG_LABELS,
  HEALTH_TAGS,
  INDIAN_STATES,
  SECTION_LABELS,
  SHIP_SCOPE_LABELS,
  SHIP_SCOPES,
  TASTE_LABELS,
  TASTES,
  type ShipScope,
} from '@shared/core';
import { type AdminProduct, type ProductPayload } from '@/api/admin';
import { ApiError } from '@/api/client';
import { Card, PageHeader, Toggle } from '@/components/admin/kit';
import { Checkbox, SelectField, TextAreaField, TextField } from '@/components/forms/Field';
import { Button } from '@/components/ui/Button';
import { useCatalogScope } from '@/components/admin/CatalogScope';
import { categoryOptions } from '@/utils/categories';
import { ProductImage } from '@/components/ui/misc';
import { ChipGroup, IMAGE_ACCEPT } from '@/components/admin/Pickers';
import { useStoreInfo } from '@/hooks/useStoreInfo';

type AgeGroup = (typeof AGE_GROUPS)[number];
type Taste = (typeof TASTES)[number];
type HealthTag = (typeof HEALTH_TAGS)[number];

/** Extra photos after the main one. */
const MAX_EXTRA_IMAGES = 7;

const pick = <T extends string>(all: readonly T[], v: string[] | undefined): T[] => (v ?? []).filter((x): x is T => (all as readonly string[]).includes(x));

interface FormValues {
  name: string;
  nameHi: string;
  slug: string;
  description: string;
  highlight: string;
  imageUrl: string;
  categoryId: string;
  collections: string[];
  keywords: string;
  isActive: boolean;
  sortOrder: number;
  variants: Array<{ id?: string; label: string; price: string; mrp: string; isAvailable: boolean; trackInventory: boolean; stockQty: number; maxPerOrder: number }>;
  images: string[];
  origin: string;
  storageTips: string;
  benefits: string;
  areaIds: string[];
  shipScope: ShipScope;
  shipStates: string[];
  ageGroups: AgeGroup[];
  tastes: Taste[];
  healthTags: HealthTag[];
}

const emptyExtras = { images: [], origin: '', storageTips: '', benefits: '', areaIds: [], shipScope: 'AUTO' as ShipScope, shipStates: [], ageGroups: [], tastes: [], healthTags: [] };

const emptyVariant = { label: '', price: '', mrp: '', isAvailable: true, trackInventory: false, stockQty: 0, maxPerOrder: 10 };

function toForm(p?: AdminProduct): FormValues {
  if (!p) return { name: '', nameHi: '', slug: '', description: '', highlight: '', imageUrl: '', categoryId: '', collections: [], keywords: '', isActive: true, sortOrder: 0, variants: [{ ...emptyVariant }], ...emptyExtras };
  return {
    name: p.name,
    nameHi: p.nameHi ?? '',
    slug: p.slug,
    description: p.description ?? '',
    highlight: p.highlight ?? '',
    imageUrl: p.rawImageUrl ?? '',
    categoryId: p.category.id,
    collections: p.collections,
    keywords: p.keywords,
    isActive: p.isActive,
    sortOrder: p.sortOrder,
    variants: p.adminVariants.map((v) => ({ ...v, price: String(v.price / 100), mrp: v.mrp ? String(v.mrp / 100) : '' })),
    images: p.rawImages ?? [],
    origin: p.origin ?? '',
    storageTips: p.storageTips ?? '',
    benefits: p.benefits ?? '',
    areaIds: p.areaIds ?? [],
    shipScope: SHIP_SCOPES.includes(p.shipScope as ShipScope) ? (p.shipScope as ShipScope) : 'AUTO',
    shipStates: p.shipStates ?? [],
    ageGroups: pick(AGE_GROUPS, p.tags?.ageGroups),
    tastes: pick(TASTES, p.tags?.tastes),
    healthTags: pick(HEALTH_TAGS, p.tags?.health),
  };
}

export default function ProductEditor() {
  const scope = useCatalogScope();
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const extraRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const { data: store } = useStoreInfo();
  const { data: categories } = useQuery({ queryKey: [scope.key, 'categories'], queryFn: scope.api.categories });
  const { data: product, isLoading } = useQuery({ queryKey: [scope.key, 'product', id], queryFn: () => scope.api.product(id!), enabled: !isNew });

  const form = useForm<FormValues>({ defaultValues: toForm() });
  const { register, control, handleSubmit, reset, setValue, watch, setError, formState } = form;
  const variants = useFieldArray({ control, name: 'variants' });
  useEffect(() => {
    if (product) reset(toForm(product));
  }, [product, reset]);

  const save = useMutation({
    mutationFn: (v: FormValues) => {
      const payload: ProductPayload = {
        name: v.name,
        nameHi: v.nameHi || null,
        slug: isNew ? undefined : v.slug || undefined,
        description: v.description || null,
        highlight: v.highlight || null,
        imageUrl: v.imageUrl || null,
        categoryId: v.categoryId,
        collections: v.collections,
        keywords: v.keywords,
        isActive: v.isActive,
        sortOrder: Number(v.sortOrder) || 0,
        variants: v.variants.map((x) => ({
          id: x.id,
          label: x.label,
          price: Number(x.price),
          mrp: x.mrp ? Number(x.mrp) : null,
          isAvailable: x.isAvailable,
          trackInventory: x.trackInventory,
          stockQty: Number(x.stockQty) || 0,
          maxPerOrder: Number(x.maxPerOrder) || 10,
        })),
        // The editor owns these: always sent, so clearing one saves it cleared.
        images: v.images.map((x) => x.trim()).filter(Boolean).slice(0, MAX_EXTRA_IMAGES),
        origin: v.origin.trim() || null,
        storageTips: v.storageTips.trim() || null,
        benefits: v.benefits.trim() || null,
        areaIds: v.areaIds,
        shipScope: v.shipScope,
        shipStates: v.shipScope === 'STATES' ? v.shipStates : [],
        ageGroups: v.ageGroups,
        tastes: v.tastes,
        healthTags: v.healthTags,
      };
      return isNew ? scope.api.createProduct(payload) : scope.api.updateProduct(id!, payload);
    },
    onSuccess: (p) => {
      void qc.invalidateQueries({ queryKey: [scope.key, 'products'] });
      qc.setQueryData([scope.key, 'product', p.id], p);
      if (isNew) navigate(`${scope.base}/products/${p.id}`, { replace: true });
    },
    onError: (e) => {
      const fields = e instanceof ApiError ? e.details?.fields : undefined;
      if (fields) for (const [k, m] of Object.entries(fields)) setError(k as never, { message: m });
    },
  });
  /** Soft delete: hidden from the store and this list, kept in past orders. */
  const remove = useMutation({
    mutationFn: (reason?: string) => scope.api.deleteProduct(id!, reason),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [scope.key, 'products'] });
      navigate(`${scope.base}/products`);
    },
  });
  const upload = useMutation({
    mutationFn: scope.api.upload,
    onSuccess: (r) => {
      setValue('imageUrl', r.url, { shouldDirty: true });
      setUploadError(null);
    },
    onError: (e) => setUploadError((e as Error).message),
  });
  /** Extra photos: uploaded in the order picked, appended after the current ones. */
  const uploadExtra = useMutation({
    mutationFn: async (files: File[]) => {
      const urls: string[] = [];
      for (const f of files) urls.push((await scope.api.upload(f)).url);
      return urls;
    },
    onSuccess: (urls) => {
      setValue('images', [...form.getValues('images'), ...urls].slice(0, MAX_EXTRA_IMAGES), { shouldDirty: true });
    },
  });
  const setImages = (next: string[]) => setValue('images', next, { shouldDirty: true });

  const confirmDelete = () => {
    if (!scope.moderation) return window.confirm('Delete this product? It disappears from the store but stays in past orders.') && remove.mutate(undefined);
    const reason = window.prompt(`Delete this product from ${scope.owner ?? 'the shop'}? It disappears from the store but stays in past orders. The shop is told.

Reason (shown to the shop):`);
    if (reason !== null) remove.mutate(reason.trim() || undefined);
  };

  if (!isNew && isLoading) return <div className="skeleton h-96 rounded-3xl" />;
  const imageUrl = watch('imageUrl');
  const images = watch('images');
  const areaIds = watch('areaIds');
  const shipScope = watch('shipScope');
  const shipStates = watch('shipStates');
  const areas = store?.areas ?? [];
  const e = formState.errors;
  const fieldError = (k: string) => (e as Record<string, { message?: string } | undefined>)[k]?.message;

  return (
    <form onSubmit={handleSubmit((v) => save.mutate(v))} noValidate>
      <Link to={`${scope.base}/products`} className="mb-3 inline-flex items-center gap-1 text-sm font-bold text-forest-700"><ArrowLeft className="size-4" /> Products</Link>
      <PageHeader
        title={isNew ? 'New product' : (product?.name ?? 'Edit product')}
        subtitle={
          <>
            {scope.owner && <>Listed by {scope.owner} · </>}
            {!isNew && product ? <a href={`/product/${product.slug}`} target="_blank" rel="noreferrer" className="underline">View in store</a> : 'Prices are entered in rupees.'}
          </>
        }
        actions={
          <>
            {!isNew && product && scope.can('delete') && (
              <Button variant="outline" className="text-tomato-500" loading={remove.isPending} onClick={confirmDelete}>
                Delete
              </Button>
            )}
            <Button type="submit" loading={save.isPending}>{isNew ? 'Create product' : 'Save changes'}</Button>
          </>
        }
      />
      {scope.moderation && <p className="mb-4 rounded-2xl bg-ivory-100 p-3 text-sm font-semibold text-charcoal-700">You’re editing {scope.owner ?? 'a shop'}’s listing. The shop is notified when you save or delete it.</p>}
      {product?.staffHidden && (
        <p className="mb-4 rounded-2xl bg-tomato-100 p-3 text-sm font-semibold text-tomato-500" role="status">
          Hidden by Brio Cart{product.staffHiddenReason ? `: ${product.staffHiddenReason}` : ''}.{' '}
          {scope.moderation ? 'Unhide it from the products list to put it back on sale.' : 'You can still edit it, but it stays off the store until Brio Cart makes it visible again. Contact support if you think this is a mistake.'}
        </p>
      )}
      {remove.error && <p className="mb-4 rounded-2xl bg-tomato-100 p-3 text-sm font-semibold text-tomato-500" role="alert">{(remove.error as Error).message}</p>}
      {save.error && <p className="mb-4 rounded-2xl bg-tomato-100 p-3 text-sm font-semibold text-tomato-500" role="alert">{(save.error as Error).message}</p>}
      {save.isSuccess && !formState.isDirty && <p className="mb-4 rounded-2xl bg-mint-100 p-3 text-sm font-semibold text-forest-700" role="status">Saved.</p>}

      <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          <Card title="Details">
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Name" {...register('name', { required: 'Name is required', minLength: { value: 2, message: 'Too short' } })} error={e.name?.message} />
              <TextField label="Hindi name" optional lang="hi" {...register('nameHi')} />
              <SelectField label="Category" {...register('categoryId', { required: 'Choose a category' })} error={e.categoryId?.message}>
                <option value="">Choose…</option>
                {categoryOptions(categories).map((o) => <option key={o.category.id} value={o.category.id}>{o.label}</option>)}
              </SelectField>
              <TextField label="Highlight" optional placeholder="e.g. Vitamin C Rich" maxLength={60} {...register('highlight')} />
              <TextAreaField label="Description" optional rows={8} maxLength={3000} hint="Line breaks are kept as you type them. Up to 3000 characters." {...register('description')} error={e.description?.message} className="sm:col-span-2" />
              <TextAreaField label="Origin / where it's from" optional rows={3} maxLength={600} placeholder="e.g. Grown on partner farms near Malihabad" {...register('origin')} error={e.origin?.message} className="sm:col-span-2" />
              <TextAreaField label="Freshness & storage" optional rows={3} maxLength={600} placeholder="e.g. Keep refrigerated; best within 3 days" {...register('storageTips')} error={e.storageTips?.message} />
              <TextAreaField label="Benefits" optional rows={3} maxLength={600} placeholder="e.g. Rich in vitamin C and fibre" {...register('benefits')} error={e.benefits?.message} />
              <TextField label="Search keywords" optional placeholder="Hindi/Hinglish names, e.g. aloo alu" {...register('keywords')} className="sm:col-span-2" />
              {!isNew && <TextField label="URL slug" {...register('slug')} error={e.slug?.message} />}
              <TextField label="Sort order" type="number" min={0} {...register('sortOrder')} hint="Lower numbers appear first." />
            </div>
          </Card>

          <Card title="Pack sizes, prices & inventory" actions={<Button size="sm" variant="secondary" icon={<Plus className="size-4" />} onClick={() => variants.append({ ...emptyVariant })}>Add pack size</Button>}>
            <p className="mb-4 text-sm text-charcoal-500">
              Leave “Track stock” off when you don’t count stock — availability is then controlled by the switch. “Old price” shows a strikethrough only when set.
            </p>
            <div className="space-y-4">
              {variants.fields.map((f, i) => {
                const track = watch(`variants.${i}.trackInventory`);
                return (
                  <div key={f.id} className="rounded-2xl border border-line p-4">
                    <div className="grid gap-3 sm:grid-cols-4">
                      <TextField label="Pack size" placeholder="3 pieces, 500 g, 1 dozen" hint="What the customer gets. A plain number is saved as pieces." {...register(`variants.${i}.label`, { required: 'Required' })} error={e.variants?.[i]?.label?.message} />
                      <TextField label="Price (₹)" type="number" step="0.01" min="0" {...register(`variants.${i}.price`, { required: 'Required', validate: (v) => Number(v) > 0 || 'Must be > 0' })} error={e.variants?.[i]?.price?.message} />
                      <TextField label="Old price (₹)" optional type="number" step="0.01" min="0" {...register(`variants.${i}.mrp`)} />
                      <TextField label="Max per order" type="number" min="1" max="99" {...register(`variants.${i}.maxPerOrder`)} />
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-5">
                      <label className="flex items-center gap-2 text-sm font-bold">
                        <Toggle checked={watch(`variants.${i}.isAvailable`)} label="Available" onChange={(v) => setValue(`variants.${i}.isAvailable`, v, { shouldDirty: true })} /> Available
                      </label>
                      <label className="flex items-center gap-2 text-sm font-bold">
                        <Toggle checked={track} label="Track stock" onChange={(v) => setValue(`variants.${i}.trackInventory`, v, { shouldDirty: true })} /> Track stock
                      </label>
                      {track && (
                        <label className="flex items-center gap-2 text-sm font-bold">
                          In stock
                          <input type="number" min={0} {...register(`variants.${i}.stockQty`)} className="h-9 w-24 rounded-xl border border-line px-3" />
                        </label>
                      )}
                      {variants.fields.length > 1 && (
                        <button type="button" onClick={() => variants.remove(i)} className="ml-auto inline-flex items-center gap-1 text-sm font-bold text-tomato-500">
                          <Trash2 className="size-4" /> Remove
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card title="Where it’s sold">
            <p className="mb-2 text-sm font-extrabold text-charcoal-700">Brio Cart delivery areas</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <Checkbox label="All areas" description="Also any area added later." checked={areaIds.length === 0} onChange={() => setValue('areaIds', [], { shouldDirty: true })} />
              {areas.map((a) => (
                <Checkbox
                  key={a.id}
                  label={a.name}
                  description={a.pincode ?? undefined}
                  checked={areaIds.includes(a.id)}
                  onChange={(ev) => setValue('areaIds', ev.target.checked ? [...areaIds, a.id] : areaIds.filter((x) => x !== a.id), { shouldDirty: true })}
                />
              ))}
            </div>
            {areaIds.some((id) => !areas.some((a) => a.id === id)) && (
              <p className="mt-2 text-xs text-charcoal-500">Also kept: {areaIds.filter((id) => !areas.some((a) => a.id === id)).length} area(s) that are switched off.</p>
            )}

            <SelectField
              label="Courier delivery outside the delivery areas"
              className="mt-5"
              {...register('shipScope')}
              hint={product?.section ? `This product is in ${SECTION_LABELS[product.section]}.` : 'Fresh items stay local by default; Grocery and Handmade ship across India.'}
            >
              {SHIP_SCOPES.map((k) => <option key={k} value={k}>{SHIP_SCOPE_LABELS[k]}</option>)}
            </SelectField>
            {shipScope === 'STATES' && (
              <div className="mt-3">
                <div className="mb-2 flex items-baseline justify-between gap-2">
                  <p className="text-sm font-extrabold text-charcoal-700">Ship to these states ({shipStates.length})</p>
                  {shipStates.length > 0 && <button type="button" className="text-xs font-bold text-forest-700" onClick={() => setValue('shipStates', [], { shouldDirty: true })}>Clear</button>}
                </div>
                <div className="grid max-h-64 gap-2 overflow-y-auto rounded-2xl border border-line p-3 sm:grid-cols-2 lg:grid-cols-3">
                  {INDIAN_STATES.map(([code, name]) => (
                    <Checkbox
                      key={code}
                      label={name}
                      checked={shipStates.includes(code)}
                      onChange={(ev) => setValue('shipStates', ev.target.checked ? [...shipStates, code] : shipStates.filter((x) => x !== code), { shouldDirty: true })}
                    />
                  ))}
                </div>
                {shipStates.length === 0 && <p className="mt-2 text-[0.8rem] font-semibold text-tomato-500">Choose at least one state, or it is sold in the delivery areas only.</p>}
                {fieldError('shipStates') && <p className="mt-2 text-[0.8rem] font-semibold text-tomato-500">{fieldError('shipStates')}</p>}
              </div>
            )}
          </Card>

          <Card title="Personalisation tags">
            <p className="mb-4 text-sm text-charcoal-500">
              These drive “Recommended for you” for shoppers who answered the first-visit questions (who they shop for, tastes and health needs). Leave a group empty when it doesn’t apply.
            </p>
            <div className="space-y-4">
              <div>
                <p className="mb-2 text-sm font-extrabold text-charcoal-700">Good for</p>
                <ChipGroup label="Good for" options={AGE_GROUPS} labels={AGE_GROUP_LABELS} value={watch('ageGroups')} onChange={(v) => setValue('ageGroups', v, { shouldDirty: true })} />
              </div>
              <div>
                <p className="mb-2 text-sm font-extrabold text-charcoal-700">Taste</p>
                <ChipGroup label="Taste" options={TASTES} labels={TASTE_LABELS} value={watch('tastes')} onChange={(v) => setValue('tastes', v, { shouldDirty: true })} />
              </div>
              <div>
                <p className="mb-2 text-sm font-extrabold text-charcoal-700">Health</p>
                <ChipGroup label="Health" options={HEALTH_TAGS} labels={HEALTH_TAG_LABELS} value={watch('healthTags')} onChange={(v) => setValue('healthTags', v, { shouldDirty: true })} />
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Image">
            <ProductImage src={imageUrl || null} alt="Product preview" className="aspect-square rounded-2xl bg-ivory-100" />
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="hidden" onChange={(ev) => ev.target.files?.[0] && upload.mutate(ev.target.files[0])} />
            <Button block variant="secondary" className="mt-3" icon={<ImageUp className="size-4" />} loading={upload.isPending} onClick={() => fileRef.current?.click()}>
              Upload image
            </Button>
            {uploadError && <p className="mt-2 text-sm font-semibold text-tomato-500">{uploadError}</p>}
            <TextField label="…or image URL" optional placeholder="https://…" {...register('imageUrl')} className="mt-3" hint="Any shape works: uploads are fitted to a square without cropping. Max 5 MB." />
          </Card>
          <Card title={`More photos (${images.length}/${MAX_EXTRA_IMAGES})`}>
            <p className="mb-3 text-sm text-charcoal-500">Use square photos of at least 1200 × 1200 px; 2–4 photos per product. Shown after the main image, in this order.</p>
            {images.length > 0 && (
              <ul className="mb-3 space-y-2">
                {images.map((src, i) => (
                  <li key={i} className="flex items-center gap-2 rounded-2xl border border-line p-2">
                    <ProductImage src={src || null} alt={`Photo ${i + 2}`} className="size-14 shrink-0 rounded-xl bg-ivory-100" sizes="56px" />
                    <input
                      value={src}
                      placeholder="https://…"
                      onChange={(ev) => setImages(images.map((x, j) => (j === i ? ev.target.value : x)))}
                      aria-label={`Photo ${i + 2} link`}
                      className="h-9 min-w-0 flex-1 rounded-xl border border-line px-2 text-xs"
                    />
                    <button type="button" disabled={i === 0} onClick={() => setImages(images.map((x, j) => (j === i - 1 ? images[i] : j === i ? images[i - 1] : x)))} className="grid size-8 place-items-center rounded-xl hover:bg-ivory-100 disabled:opacity-30" aria-label="Move up"><ArrowUp className="size-4" /></button>
                    <button type="button" disabled={i === images.length - 1} onClick={() => setImages(images.map((x, j) => (j === i + 1 ? images[i] : j === i ? images[i + 1] : x)))} className="grid size-8 place-items-center rounded-xl hover:bg-ivory-100 disabled:opacity-30" aria-label="Move down"><ArrowDown className="size-4" /></button>
                    <button type="button" onClick={() => setImages(images.filter((_, j) => j !== i))} className="grid size-8 place-items-center rounded-xl text-tomato-500 hover:bg-tomato-100" aria-label="Remove photo"><Trash2 className="size-4" /></button>
                  </li>
                ))}
              </ul>
            )}
            {(fieldError('images') || uploadExtra.error) && <p className="mb-2 text-sm font-semibold text-tomato-500">{fieldError('images') ?? (uploadExtra.error as Error).message}</p>}
            <input
              ref={extraRef}
              type="file"
              multiple
              accept={IMAGE_ACCEPT}
              className="hidden"
              onChange={(ev) => {
                const files = Array.from(ev.target.files ?? []).slice(0, MAX_EXTRA_IMAGES - images.length);
                ev.target.value = '';
                if (files.length) uploadExtra.mutate(files);
              }}
            />
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" icon={<ImageUp className="size-4" />} loading={uploadExtra.isPending} disabled={images.length >= MAX_EXTRA_IMAGES} onClick={() => extraRef.current?.click()}>
                Upload photos
              </Button>
              <Button size="sm" variant="ghost" icon={<Plus className="size-4" />} disabled={images.length >= MAX_EXTRA_IMAGES} onClick={() => setImages([...images, ''])}>
                Add by link
              </Button>
            </div>
          </Card>
          <Card title="Visibility">
            <Checkbox
              label="Visible in store"
              description={product?.staffHidden ? 'Hidden by Brio Cart.' : 'Turn off to archive.'}
              disabled={!!product?.staffHidden}
              {...register('isActive')}
            />
            <p className="mb-2 mt-5 text-sm font-extrabold text-charcoal-700">Homepage collections</p>
            <div className="space-y-2">
              {COLLECTIONS.map((c) => (
                <Checkbox key={c.key} label={c.label} value={c.key} {...register('collections')} />
              ))}
            </div>
          </Card>
        </div>
      </div>
    </form>
  );
}
