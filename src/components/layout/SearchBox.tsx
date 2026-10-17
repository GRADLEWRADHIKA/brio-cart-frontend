import { useEffect, useId, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Search, X } from 'lucide-react';
import { formatINR } from '@shared/core';
import { catalogApi } from '@/api/endpoints';
import { ProductImage } from '@/components/ui/misc';
import { tintFor } from '@/components/products/tints';
import { cn } from '@/utils';

function useDebounced<T>(value: T, ms = 220) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

const HINTS = ['aloo', 'paneer', 'doodh', 'palak', 'kinnaur apple', 'mushroom'];

/** Search with live suggestions (combobox pattern), supports English, Hinglish and Hindi. */
export function SearchBox({ className, autoFocus, onDone, variant = 'header' }: { className?: string; autoFocus?: boolean; onDone?: () => void; variant?: 'header' | 'sheet' }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const debounced = useDebounced(q.trim());
  const navigate = useNavigate();
  const listId = useId();
  const wrap = useRef<HTMLDivElement>(null);
  const [hint, setHint] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setHint((h) => (h + 1) % HINTS.length), 2600);
    return () => clearInterval(t);
  }, []);

  const { data, isFetching } = useQuery({
    queryKey: ['suggest', debounced],
    queryFn: ({ signal }) => catalogApi.products({ q: debounced, pageSize: 6 }, signal),
    enabled: debounced.length >= 2,
    staleTime: 60_000,
  });
  const items = debounced.length >= 2 ? (data?.items ?? []) : [];

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const go = (path: string) => {
    setOpen(false);
    setActive(-1);
    onDone?.();
    navigate(path);
  };
  const submit = () => {
    if (active >= 0 && items[active]) return go(`/product/${items[active]!.slug}`);
    if (q.trim()) go(`/shop?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <div ref={wrap} className={cn('relative', className)}>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className={cn(
          'flex items-center gap-2 rounded-full border transition focus-within:border-leaf-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-leaf-500/15',
          variant === 'header' ? 'h-12 border-line bg-ivory-100 pl-4 pr-1.5' : 'h-14 border-line bg-white pl-5 pr-2 shadow-soft',
        )}
      >
        <Search className="size-5 shrink-0 text-charcoal-500" aria-hidden />
        <input
          type="search"
          value={q}
          autoFocus={autoFocus}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setActive((a) => Math.min(a + 1, items.length - 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, -1));
            } else if (e.key === 'Escape') setOpen(false);
          }}
          placeholder={`Search “${HINTS[hint]}”, fruits, dairy…`}
          aria-label="Search groceries"
          role="combobox"
          aria-expanded={open && items.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          className="h-full min-w-0 flex-1 bg-transparent text-[0.95rem] font-medium outline-none placeholder:text-charcoal-400 [&::-webkit-search-cancel-button]:hidden"
        />
        {q && (
          <button type="button" onClick={() => setQ('')} className="grid size-8 place-items-center rounded-full text-charcoal-500 hover:bg-ivory-200" aria-label="Clear search">
            <X className="size-4" />
          </button>
        )}
        <button type="submit" className="grid size-9 shrink-0 place-items-center rounded-full bg-forest-800 text-ivory-50 transition hover:bg-forest-700" aria-label="Search">
          <ArrowRight className="size-4" />
        </button>
      </form>

      {open && debounced.length >= 2 && (
        <div className="absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-3xl border border-line bg-white shadow-lift">
          {items.length > 0 ? (
            <ul id={listId} role="listbox" className="max-h-[60vh] overflow-y-auto p-2">
              {items.map((p, i) => (
                <li key={p.id} id={`${listId}-${i}`} role="option" aria-selected={i === active}>
                  <button
                    type="button"
                    onMouseEnter={() => setActive(i)}
                    onClick={() => go(`/product/${p.slug}`)}
                    className={cn('flex w-full items-center gap-3 rounded-2xl p-2 text-left', i === active && 'bg-mint-50')}
                  >
                    <ProductImage src={p.imageUrl} alt="" className={cn('size-12 shrink-0 rounded-xl p-1', tintFor(p.category.slug).plate)} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-bold">{p.name}</span>
                      <span className="block truncate text-xs text-charcoal-500">
                        {p.nameHi && <span lang="hi">{p.nameHi} · </span>}
                        {p.category.name}
                      </span>
                    </span>
                    <span className="text-sm font-extrabold tabular-nums">{p.fromPrice !== null ? formatINR(p.fromPrice) : ''}</span>
                  </button>
                </li>
              ))}
              <li>
                <button type="button" onClick={submit} className="mt-1 w-full rounded-2xl px-3 py-2.5 text-left text-sm font-bold text-forest-700 hover:bg-mint-50">
                  See all results for “{q.trim()}” →
                </button>
              </li>
            </ul>
          ) : (
            <p className="p-5 text-sm text-charcoal-500" role="status">
              {isFetching ? 'Searching…' : `No matches for “${debounced}”. Try “aloo”, “milk” or “apple”.`}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
