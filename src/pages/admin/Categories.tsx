import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { adminApi, type AdminCategory } from '@/api/admin';
import { Card, PageHeader, Toggle } from '@/components/admin/kit';
import { TextField } from '@/components/forms/Field';
import { Button } from '@/components/ui/Button';
import { ProductImage } from '@/components/ui/misc';

function Row({ c, onDone }: { c?: AdminCategory; onDone: () => void }) {
  const qc = useQueryClient();
  const [v, setV] = useState({ name: c?.name ?? '', nameHi: c?.nameHi ?? '', description: c?.description ?? '', imageUrl: c?.imageUrl ?? '', sortOrder: c?.sortOrder ?? 0, isActive: c?.isActive ?? true });
  const save = useMutation({
    mutationFn: () => adminApi.saveCategory({ ...v, sortOrder: Number(v.sortOrder) }, c?.id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'categories'] });
      void qc.invalidateQueries({ queryKey: ['categories'] });
      onDone();
    },
  });
  return (
    <div className="grid gap-3 rounded-2xl border border-line p-4 sm:grid-cols-6">
      <TextField label="Name" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} className="sm:col-span-2" />
      <TextField label="Hindi name" optional lang="hi" value={v.nameHi} onChange={(e) => setV({ ...v, nameHi: e.target.value })} className="sm:col-span-2" />
      <TextField label="Sort" type="number" value={v.sortOrder} onChange={(e) => setV({ ...v, sortOrder: Number(e.target.value) })} />
      <label className="flex items-end gap-2 pb-3 text-sm font-bold"><Toggle checked={v.isActive} label="Active" onChange={(isActive) => setV({ ...v, isActive })} /> Active</label>
      <TextField label="Description" optional value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} className="sm:col-span-3" />
      <TextField label="Image URL" optional value={v.imageUrl} onChange={(e) => setV({ ...v, imageUrl: e.target.value })} className="sm:col-span-3" />
      {save.error && <p className="text-sm font-semibold text-tomato-500 sm:col-span-6">{(save.error as Error).message}</p>}
      <div className="flex gap-2 sm:col-span-6">
        <Button size="sm" loading={save.isPending} onClick={() => save.mutate()}>Save</Button>
        <Button size="sm" variant="ghost" onClick={onDone}>Cancel</Button>
      </div>
    </div>
  );
}

export default function Categories() {
  const { data } = useQuery({ queryKey: ['admin', 'categories'], queryFn: adminApi.categories });
  const [editing, setEditing] = useState<string | null>(null);
  return (
    <>
      <PageHeader title="Categories" subtitle="Inactive categories and their products are hidden from customers." actions={<Button icon={<Plus className="size-4" />} onClick={() => setEditing('new')}>New category</Button>} />
      <Card>
        <div className="space-y-3">
          {editing === 'new' && <Row onDone={() => setEditing(null)} />}
          {data?.map((c) =>
            editing === c.id ? (
              <Row key={c.id} c={c} onDone={() => setEditing(null)} />
            ) : (
              <div key={c.id} className="flex items-center gap-4 rounded-2xl p-2 hover:bg-ivory-50">
                <ProductImage src={c.imageUrl} alt="" className="size-12 shrink-0 rounded-xl bg-ivory-100" />
                <div className="flex-1">
                  <p className="font-bold">{c.name} {!c.isActive && <span className="ml-2 rounded-full bg-ivory-200 px-2 py-0.5 text-xs">Inactive</span>}</p>
                  <p className="text-sm text-charcoal-500">{c._count.products} products · /{c.slug}</p>
                </div>
                <Button size="sm" variant="secondary" onClick={() => setEditing(c.id)}>Edit</Button>
              </div>
            ),
          )}
        </div>
      </Card>
    </>
  );
}
