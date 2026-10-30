import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarClock, CornerDownRight, House, Plus } from 'lucide-react';
import { adminApi, type AdminCategory } from '@/api/admin';
import { Card, PageHeader, Toggle } from '@/components/admin/kit';
import { SelectField, TextField } from '@/components/forms/Field';
import { Button } from '@/components/ui/Button';
import { ProductImage } from '@/components/ui/misc';
import { categoryOptions, pathOf } from '@/utils/categories';
import { cn, formatDate } from '@/utils';

/** yyyy-mm-dd (India time) for a date input, or '' when unset. */
const dayInput = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) : '');
/** Start of that day in India time. */
const dayIso = (d: string) => (d ? new Date(`${d}T00:00:00+05:30`).toISOString() : null);

function Row({ c, all, parentId, onDone }: { c?: AdminCategory; all: AdminCategory[]; parentId?: string | null; onDone: () => void }) {
  const qc = useQueryClient();
  const [v, setV] = useState({
    name: c?.name ?? '',
    nameHi: c?.nameHi ?? '',
    description: c?.description ?? '',
    imageUrl: c?.imageUrl ?? '',
    sortOrder: c?.sortOrder ?? 0,
    isActive: c?.isActive ?? true,
    parentId: c?.parentId ?? parentId ?? '',
    showOnHome: c?.showOnHome ?? true,
    homeFrom: dayInput(c?.homeFrom ?? null),
    homeUntil: dayInput(c?.homeUntil ?? null),
  });
  const save = useMutation({
    mutationFn: () =>
      adminApi.saveCategory(
        { ...v, sortOrder: Number(v.sortOrder), parentId: v.parentId || null, homeFrom: dayIso(v.homeFrom), homeUntil: dayIso(v.homeUntil) },
        c?.id,
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'categories'] });
      void qc.invalidateQueries({ queryKey: ['categories'] });
      onDone();
    },
  });
  // A category can't go under itself or its own sub-categories, and the tree is 3 levels at most.
  const below = c ? new Set(all.filter((x) => pathOf(all, x.id).some((p) => p.id === c.id)).map((x) => x.id)) : new Set<string>();
  const parents = categoryOptions(all).filter((o) => o.depth < 2 && !below.has(o.category.id));
  const isMain = !v.parentId;
  return (
    <div className="grid gap-3 rounded-2xl border border-line bg-white p-4 sm:grid-cols-6" data-testid="category-form">
      <TextField label="Name" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} className="sm:col-span-2" />
      <TextField label="Hindi name" optional lang="hi" value={v.nameHi} onChange={(e) => setV({ ...v, nameHi: e.target.value })} className="sm:col-span-2" />
      <TextField label="Sort" type="number" value={v.sortOrder} onChange={(e) => setV({ ...v, sortOrder: Number(e.target.value) })} />
      <label className="flex items-end gap-2 pb-3 text-sm font-bold"><Toggle checked={v.isActive} label="Active" onChange={(isActive) => setV({ ...v, isActive })} /> Active</label>
      <SelectField label="Inside" value={v.parentId} onChange={(e) => setV({ ...v, parentId: e.target.value })} className="sm:col-span-3" hint="Pick a category to make this a sub-category of it.">
        <option value="">— Main category —</option>
        {parents.map((o) => (
          <option key={o.category.id} value={o.category.id}>{o.label}</option>
        ))}
      </SelectField>
      <TextField label="Image URL" optional value={v.imageUrl} onChange={(e) => setV({ ...v, imageUrl: e.target.value })} className="sm:col-span-3" hint="Empty: the best-selling product’s photo is used." />
      <TextField label="Description" optional value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} className="sm:col-span-6" />
      {isMain && (
        <div className="grid gap-3 rounded-2xl bg-ivory-100 p-3 sm:col-span-6 sm:grid-cols-3">
          <label className="flex items-center gap-2 text-sm font-bold sm:col-span-3">
            <Toggle checked={v.showOnHome} label="Show on the home page" onChange={(showOnHome) => setV({ ...v, showOnHome })} /> Show as a tile on the home page
          </label>
          {v.showOnHome && (
            <>
              <TextField label="Show from" type="date" optional value={v.homeFrom} onChange={(e) => setV({ ...v, homeFrom: e.target.value })} />
              <TextField label="Until" type="date" optional value={v.homeUntil} onChange={(e) => setV({ ...v, homeUntil: e.target.value })} hint="For festivals: leave both empty to always show." />
            </>
          )}
        </div>
      )}
      {save.error && <p className="text-sm font-semibold text-tomato-500 sm:col-span-6">{(save.error as Error).message}</p>}
      <div className="flex gap-2 sm:col-span-6">
        <Button size="sm" loading={save.isPending} onClick={() => save.mutate()}>Save</Button>
        <Button size="sm" variant="ghost" onClick={onDone}>Cancel</Button>
      </div>
    </div>
  );
}

function homeNote(c: AdminCategory) {
  if (c.parentId) return null;
  if (!c.showOnHome) return 'Not on home';
  const now = Date.now();
  if (c.homeFrom && new Date(c.homeFrom).getTime() > now) return `On home from ${formatDate(c.homeFrom, false)}`;
  if (c.homeUntil && new Date(c.homeUntil).getTime() <= now) return `Was on home until ${formatDate(c.homeUntil, false)}`;
  return c.homeUntil ? `On home until ${formatDate(c.homeUntil, false)}` : 'On home';
}

export default function Categories() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['admin', 'categories'], queryFn: adminApi.categories });
  const [editing, setEditing] = useState<string | null>(null);
  // Soft delete; the server refuses while the category still has products or sub-categories.
  const remove = useMutation({
    mutationFn: adminApi.deleteCategory,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'categories'] });
      void qc.invalidateQueries({ queryKey: ['categories'] });
    },
  });
  const all = data ?? [];
  return (
    <>
      <PageHeader
        title="Categories"
        subtitle="Main categories, their sub-categories (up to 3 levels, e.g. Fresh › Vegetables › Exotic) and which show on the home page. Inactive ones are hidden from customers."
        actions={<Button icon={<Plus className="size-4" />} onClick={() => setEditing('new')}>New main category</Button>}
      />
      {remove.error && <p className="mb-4 rounded-2xl bg-tomato-100 p-3 text-sm font-semibold text-tomato-500">{(remove.error as Error).message}</p>}
      <Card>
        <div className="space-y-2">
          {editing === 'new' && <Row all={all} onDone={() => setEditing(null)} />}
          {categoryOptions(all).map(({ category: c, depth }) => (
            <div key={c.id} style={{ marginLeft: `${depth * 1.75}rem` }}>
              {editing === c.id ? (
                <Row c={c} all={all} onDone={() => setEditing(null)} />
              ) : (
                <div className={cn('flex flex-wrap items-center gap-3 rounded-2xl p-2 hover:bg-ivory-50', depth > 0 && 'border-l-2 border-dashed border-line pl-3')} data-testid="category-row">
                  {depth > 0 && <CornerDownRight className="size-4 shrink-0 text-charcoal-400" />}
                  <ProductImage src={c.imageUrl} alt="" className="size-11 shrink-0 rounded-xl bg-ivory-100" />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold">
                      {c.name} {!c.isActive && <span className="ml-2 rounded-full bg-ivory-200 px-2 py-0.5 text-xs">Inactive</span>}
                    </p>
                    <p className="flex flex-wrap items-center gap-x-2 text-sm text-charcoal-500">
                      <span>
                        {c._count.products} products{c._count.children ? ` · ${c._count.children} sub-categor${c._count.children === 1 ? 'y' : 'ies'}` : ''} · /{c.slug}
                      </span>
                      {homeNote(c) && (
                        <span className="inline-flex items-center gap-1 font-semibold text-leaf-600">
                          {c.homeFrom || c.homeUntil ? <CalendarClock className="size-3.5" /> : <House className="size-3.5" />} {homeNote(c)}
                        </span>
                      )}
                    </p>
                  </div>
                  {depth < 2 && (
                    <Button size="sm" variant="ghost" icon={<Plus className="size-4" />} onClick={() => setEditing(`sub:${c.id}`)}>
                      Sub-category
                    </Button>
                  )}
                  <Button size="sm" variant="secondary" onClick={() => setEditing(c.id)}>Edit</Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-tomato-500"
                    disabled={c._count.products > 0 || c._count.children > 0}
                    loading={remove.isPending && remove.variables === c.id}
                    onClick={() => window.confirm(`Delete ${c.name}?`) && remove.mutate(c.id)}
                  >
                    Delete
                  </Button>
                </div>
              )}
              {editing === `sub:${c.id}` && (
                <div className="mt-2" style={{ marginLeft: '1.75rem' }}>
                  <Row all={all} parentId={c.id} onDone={() => setEditing(null)} />
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}
