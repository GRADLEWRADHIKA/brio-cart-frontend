import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useFieldArray, useForm } from 'react-hook-form';
import { ArrowLeft, ImageUp, Plus, Trash2 } from 'lucide-react';
import { COLLECTIONS } from '@shared/core';
import { adminApi, type AdminProduct, type ProductPayload } from '@/api/admin';
import { ApiError } from '@/api/client';
import { Card, PageHeader, Toggle } from '@/components/admin/kit';
import { Checkbox, SelectField, TextAreaField, TextField } from '@/components/forms/Field';
import { Button } from '@/components/ui/Button';
import { ProductImage } from '@/components/ui/misc';

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
}

const emptyVariant = { label: '', price: '', mrp: '', isAvailable: true, trackInventory: false, stockQty: 0, maxPerOrder: 10 };

function toForm(p?: AdminProduct): FormValues {
  if (!p) return { name: '', nameHi: '', slug: '', description: '', highlight: '', imageUrl: '', categoryId: '', collections: [], keywords: '', isActive: true, sortOrder: 0, variants: [{ ...emptyVariant }] };
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
  };
}

export default function ProductEditor() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const { data: categories } = useQuery({ queryKey: ['admin', 'categories'], queryFn: adminApi.categories });
  const { data: product, isLoading } = useQuery({ queryKey: ['admin', 'product', id], queryFn: () => adminApi.product(id!), enabled: !isNew });

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
      };
      return isNew ? adminApi.createProduct(payload) : adminApi.updateProduct(id!, payload);
    },
    onSuccess: (p) => {
      void qc.invalidateQueries({ queryKey: ['admin', 'products'] });
      qc.setQueryData(['admin', 'product', p.id], p);
      if (isNew) navigate(`/admin/products/${p.id}`, { replace: true });
    },
    onError: (e) => {
      const fields = e instanceof ApiError ? e.details?.fields : undefined;
      if (fields) for (const [k, m] of Object.entries(fields)) setError(k as never, { message: m });
    },
  });
  const archive = useMutation({
    mutationFn: () => adminApi.archiveProduct(id!),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'products'] });
      navigate('/admin/products');
    },
  });
  const upload = useMutation({
    mutationFn: adminApi.upload,
    onSuccess: (r) => {
      setValue('imageUrl', r.url, { shouldDirty: true });
      setUploadError(null);
    },
    onError: (e) => setUploadError((e as Error).message),
  });

  if (!isNew && isLoading) return <div className="skeleton h-96 rounded-3xl" />;
  const imageUrl = watch('imageUrl');
  const e = formState.errors;

  return (
    <form onSubmit={handleSubmit((v) => save.mutate(v))} noValidate>
      <Link to="/admin/products" className="mb-3 inline-flex items-center gap-1 text-sm font-bold text-forest-700"><ArrowLeft className="size-4" /> Products</Link>
      <PageHeader
        title={isNew ? 'New product' : (product?.name ?? 'Edit product')}
        subtitle={!isNew && product ? <a href={`/product/${product.slug}`} target="_blank" rel="noreferrer" className="underline">View in store</a> : 'Prices are entered in rupees.'}
        actions={
          <>
            {!isNew && product?.isActive && (
              <Button variant="outline" className="text-tomato-500" loading={archive.isPending} onClick={() => window.confirm('Archive this product? It will be hidden from customers.') && archive.mutate()}>
                Archive
              </Button>
            )}
            <Button type="submit" loading={save.isPending}>{isNew ? 'Create product' : 'Save changes'}</Button>
          </>
        }
      />
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
                {categories?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </SelectField>
              <TextField label="Highlight" optional placeholder="e.g. Vitamin C Rich" maxLength={60} {...register('highlight')} />
              <TextAreaField label="Description" optional rows={3} {...register('description')} className="sm:col-span-2" />
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
                      <TextField label="Pack size" placeholder="500 g" {...register(`variants.${i}.label`, { required: 'Required' })} error={e.variants?.[i]?.label?.message} />
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
        </div>

        <div className="space-y-6">
          <Card title="Image">
            <ProductImage src={imageUrl || null} alt="Product preview" className="aspect-square rounded-2xl bg-ivory-100" />
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="hidden" onChange={(ev) => ev.target.files?.[0] && upload.mutate(ev.target.files[0])} />
            <Button block variant="secondary" className="mt-3" icon={<ImageUp className="size-4" />} loading={upload.isPending} onClick={() => fileRef.current?.click()}>
              Upload image
            </Button>
            {uploadError && <p className="mt-2 text-sm font-semibold text-tomato-500">{uploadError}</p>}
            <TextField label="…or image URL" optional placeholder="https://…" {...register('imageUrl')} className="mt-3" hint="Square photos look best. Max 5 MB." />
          </Card>
          <Card title="Visibility">
            <Checkbox label="Visible in store" description="Turn off to archive." {...register('isActive')} />
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
