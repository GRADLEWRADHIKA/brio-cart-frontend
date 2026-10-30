/**
 * Categories come as one flat list; sub-categories point at their parent (`parentId`).
 * Main category → sub-category → its sub-category: three levels at most.
 */
interface CategoryNode {
  id: string;
  slug?: string;
  name: string;
  parentId?: string | null;
}

export const mainCategories = <T extends CategoryNode>(all: T[] | undefined) => (all ?? []).filter((c) => !c.parentId);

export const subCategories = <T extends CategoryNode>(all: T[] | undefined, parentId: string) => (all ?? []).filter((c) => c.parentId === parentId);

/** Main category first, the category itself last. */
export function pathOf<T extends CategoryNode>(all: T[] | undefined, id: string | undefined): T[] {
  const byId = new Map((all ?? []).map((c) => [c.id, c]));
  const path: T[] = [];
  for (let c = id ? byId.get(id) : undefined; c && path.length < 4; c = c.parentId ? byId.get(c.parentId) : undefined) path.unshift(c);
  return path;
}

/** Tree order for pick lists, with each sub-category indented under its parent. */
export function categoryOptions<T extends CategoryNode>(all: T[] | undefined): Array<{ category: T; depth: number; label: string }> {
  const out: Array<{ category: T; depth: number; label: string }> = [];
  const walk = (parentId: string | null, depth: number) => {
    for (const c of (all ?? []).filter((x) => (x.parentId ?? null) === parentId)) {
      out.push({ category: c, depth, label: `${'   '.repeat(depth)}${depth ? '› ' : ''}${c.name}` });
      if (depth < 3) walk(c.id, depth + 1);
    }
  };
  walk(null, 0);
  // Anything whose parent is missing (e.g. switched off) still appears, at the end.
  for (const c of all ?? []) if (!out.some((o) => o.category.id === c.id)) out.push({ category: c, depth: 0, label: c.name });
  return out;
}
