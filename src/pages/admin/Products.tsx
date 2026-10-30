import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Check, Eye, EyeOff, Pencil, Plus, Search, X } from 'lucide-react';
import { formatINR } from '@shared/core';
import { type AdminProduct } from '@/api/admin';
import { PageHeader, Toggle, td, th } from '@/components/admin/kit';
import { Button, ButtonLink } from '@/components/ui/Button';
import { ProductImage } from '@/components/ui/misc';
import { useCatalogScope } from '@/components/admin/CatalogScope';
import { categoryOptions } from '@/utils/categories';
import { cn } from '@/utils';

export default function Products() {
  const scope = useCatalogScope();
  const qc = useQueryClient();
  const canCreate = scope.can('create');
  const canEdit = scope.can('update');
  const canStock = scope.can('inventory');
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [archived, setArchived] = useState<'false' | 'true'>('false');
  const { data: categories } = useQuery({ queryKey: [scope.key, 'categories'], queryFn: scope.api.categories });
  const { data, isLoading } = useQuery({
    queryKey: [scope.key, 'products', q, category, archived],
    queryFn: () => scope.api.products({ q: q || undefined, category: category || undefined, archived }),
  });
  const toggle = useMutation({
    mutationFn: ({ id, isAvailable }: { id: string; isAvailable: boolean }) => scope.api.patchVariant(id, { isAvailable }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [scope.key, 'products'] }),
  });
  const canModerate = !!scope.moderation && !!scope.api.setHidden && canStock;
  const hide = useMutation({
    mutationFn: ({ id, hidden, reason }: { id: string; hidden: boolean; reason?: string }) => scope.api.setHidden!(id, hidden, reason),
    onSuccess: () => qc.invalidateQueries({ queryKey: [scope.key, 'products'] }),
  });
  const askHide = (p: AdminProduct) => {
    const reason = window.prompt(`Hide “${p.name}” from customers? ${scope.owner ?? 'The shop'} is told, and can’t put it back on sale until you unhide it.

Reason (shown to the shop):`);
    if (reason !== null) hide.mutate({ id: p.id, hidden: true, reason: reason.trim() || undefined });
  };

  return (
    <>
      {scope.back && <Link to={scope.back.to} className="mb-3 inline-flex items-center gap-1 text-sm font-bold text-forest-700"><ArrowLeft className="size-4" /> {scope.back.label}</Link>}
      <PageHeader
        title={scope.owner ? `${scope.owner}: products` : 'Products'}
        subtitle={data ? `${data.length} products${scope.moderation ? ' · the shop is notified of every change you make' : ''}` : undefined} actions={canCreate ? <ButtonLink to={`${scope.base}/products/new`} icon={<Plus className="size-4" />}>New product</ButtonLink> : undefined} />
      <div className="mb-4 flex flex-wrap gap-2">
        <label className="flex h-10 min-w-60 flex-1 items-center gap-2 rounded-full border border-line bg-white px-4">
          <Search className="size-4 text-charcoal-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products" className="w-full bg-transparent text-sm outline-none" aria-label="Search products" />
        </label>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="h-10 rounded-full border border-line bg-white px-4 text-sm font-bold" aria-label="Category">
          <option value="">All categories</option>
          {categoryOptions(categories).map((o) => <option key={o.category.id} value={o.category.id}>{o.label}</option>)}
        </select>
        <select value={archived} onChange={(e) => setArchived(e.target.value as 'true' | 'false')} className="h-10 rounded-full border border-line bg-white px-4 text-sm font-bold" aria-label="Status">
          <option value="false">Active</option>
          <option value="true">Archived</option>
        </select>
      </div>
      {hide.error && <p className="mb-4 rounded-2xl bg-tomato-100 p-3 text-sm font-semibold text-tomato-500" role="alert">{(hide.error as Error).message}</p>}
      <div className="overflow-x-auto rounded-3xl border border-line bg-white">
        <table className="w-full min-w-[54rem] text-sm">
          <thead className="border-b border-line bg-ivory-50">
            <tr>
              <th className={th}>Product</th>
              <th className={th}>Category</th>
              <th className={th}>Pack sizes · price · availability</th>
              <th className={th}>Sold</th>
              {canModerate && <th className={th}><span className="sr-only">Visibility</span></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {isLoading && <tr><td colSpan={5} className="p-8"><div className="skeleton h-6" /></td></tr>}
            {data?.map((p) => (
              <tr key={p.id} className="hover:bg-ivory-50">
                <td className={td}>
                  {canEdit ? (
                    <Link to={`${scope.base}/products/${p.id}`} className="flex items-center gap-3">
                      <ProductImage src={p.imageUrl} alt="" className="size-12 shrink-0 rounded-xl bg-ivory-100" />
                      <span>
                        <span className="block font-bold text-forest-800 hover:underline">{p.name}</span>
                        {p.nameHi && <span lang="hi" className="text-xs text-charcoal-500">{p.nameHi}</span>}
                      </span>
                    </Link>
                  ) : (
                    <div className="flex items-center gap-3">
                      <ProductImage src={p.imageUrl} alt="" className="size-12 shrink-0 rounded-xl bg-ivory-100" />
                      <span>
                        <span className="block font-bold text-forest-800">{p.name}</span>
                        {p.nameHi && <span lang="hi" className="text-xs text-charcoal-500">{p.nameHi}</span>}
                      </span>
                    </div>
                  )}
                  {p.staffHidden && (
                    <p className="mt-1.5 text-xs font-semibold text-tomato-500">
                      Hidden by Brio Cart{p.staffHiddenReason ? `: ${p.staffHiddenReason}` : ''}
                    </p>
                  )}
                </td>
                <td className={td}>{p.category.name}</td>
                <td className={td}>
                  <ul className="space-y-1.5">
                    {p.adminVariants.map((v) => (
                      <li key={v.id} className="flex items-center gap-3">
                        <Toggle checked={v.isAvailable} label={`${p.name} ${v.label} available`} onChange={(isAvailable) => toggle.mutate({ id: v.id!, isAvailable })} />
                        <span className={cn('w-28 font-semibold', !v.isAvailable && 'text-charcoal-400 line-through')}>{v.label}</span>
                        <VariantPriceStock variant={v} name={`${p.name} ${v.label}`} editable={canStock} />
                      </li>
                    ))}
                  </ul>
                </td>
                <td className={`${td} tabular-nums`}>{p.soldCount}</td>
                {canModerate && (
                  <td className={td}>
                    {p.staffHidden ? (
                      <Button size="sm" variant="outline" icon={<Eye className="size-4" />} disabled={hide.isPending} onClick={() => hide.mutate({ id: p.id, hidden: false })}>Unhide</Button>
                    ) : (
                      <Button size="sm" variant="outline" className="text-tomato-500" icon={<EyeOff className="size-4" />} disabled={hide.isPending} onClick={() => askHide(p)}>Hide</Button>
                    )}
                  </td>
                )}
              </tr>
            ))}
            {data?.length === 0 && <tr><td colSpan={5} className="p-10 text-center text-charcoal-500">No products found.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}

type AdminVariant = AdminProduct['adminVariants'][number];

/** Price and stock for one pack size, editable inline by staff with inventory access. */
function VariantPriceStock({ variant: v, name, editable }: { variant: AdminVariant; name: string; editable: boolean }) {
  const scope = useCatalogScope();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const save = useMutation({
    mutationFn: () => {
      const data: { price?: number; stockQty?: number } = {};
      const rupees = Number(price);
      if (price !== '' && Number.isFinite(rupees) && Math.round(rupees * 100) !== v.price) data.price = rupees;
      if (v.trackInventory && stock !== '' && Number(stock) !== v.stockQty) data.stockQty = Math.max(0, Math.round(Number(stock)));
      return scope.api.patchVariant(v.id!, data);
    },
    onSuccess: () => {
      setEditing(false);
      qc.invalidateQueries({ queryKey: [scope.key, 'products'] });
    },
  });

  if (editing) {
    return (
      <form
        className="flex flex-wrap items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <label className="flex items-center gap-1">
          <span className="text-xs text-charcoal-500">₹</span>
          <input type="number" inputMode="decimal" min={0} step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} aria-label={`${name} price`} className="h-8 w-20 rounded-lg border border-line px-2 tabular-nums" />
        </label>
        {v.trackInventory && (
          <label className="flex items-center gap-1">
            <input type="number" inputMode="numeric" min={0} step={1} value={stock} onChange={(e) => setStock(e.target.value)} aria-label={`${name} stock`} className="h-8 w-16 rounded-lg border border-line px-2 tabular-nums" />
            <span className="text-xs text-charcoal-500">in stock</span>
          </label>
        )}
        <button type="submit" disabled={save.isPending} aria-label="Save" className="grid size-8 place-items-center rounded-full bg-forest-700 text-white disabled:opacity-50"><Check className="size-4" /></button>
        <button type="button" onClick={() => setEditing(false)} aria-label="Cancel" className="grid size-8 place-items-center rounded-full border border-line"><X className="size-4" /></button>
        {save.isError && <span className="text-xs text-tomato-500">{(save.error as Error).message}</span>}
      </form>
    );
  }

  return (
    <>
      <span className="tabular-nums">{formatINR(v.price)}</span>
      {v.trackInventory && <span className={cn('rounded-full px-2 py-0.5 text-xs font-bold', v.stockQty > 5 ? 'bg-mint-100 text-forest-700' : 'bg-tomato-100 text-tomato-500')}>{v.stockQty} in stock</span>}
      {editable && (
        <button
          type="button"
          onClick={() => {
            setPrice(String(v.price / 100));
            setStock(String(v.stockQty));
            setEditing(true);
          }}
          aria-label={`Edit ${name} price and stock`}
          className="grid size-7 place-items-center rounded-full text-charcoal-500 hover:bg-ivory-100"
        >
          <Pencil className="size-3.5" />
        </button>
      )}
    </>
  );
}
