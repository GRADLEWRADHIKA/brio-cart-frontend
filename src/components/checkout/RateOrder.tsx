import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Heart, Star } from 'lucide-react';
import { orderApi } from '@/api/endpoints';
import type { Order } from '@/types';
import { Button } from '@/components/ui/Button';
import { cn } from '@/utils';

const LABELS = ['', 'Poor', 'Could be better', 'Good', 'Great', 'Loved it!'];

/** Real customer feedback after delivery (stored on the order; nothing is pre-filled). */
export function RateOrder({ order, accessKey, queryKey }: { order: Order; accessKey?: string; queryKey: unknown[] }) {
  const qc = useQueryClient();
  const [stars, setStars] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  /** Quality per item (optional): becomes the product's rating. */
  const [itemStars, setItemStars] = useState<Record<string, number>>({});
  const rate = useMutation({
    mutationFn: () =>
      orderApi.rate(order.orderNumber, stars, comment.trim() || undefined, accessKey, Object.entries(itemStars).map(([itemId, s]) => ({ itemId, stars: s }))),
    onSuccess: (o) => qc.setQueryData(queryKey, o),
  });

  if (order.status !== 'DELIVERED') return null;
  if (order.rating) {
    return (
      <section className="flex items-center gap-4 rounded-[1.75rem] bg-mint-50 p-5">
        <span className="grid size-12 place-items-center rounded-full bg-white text-tomato-500">
          <Heart className="size-6 fill-current" />
        </span>
        <div>
          <p className="font-extrabold text-forest-900">Thanks for your feedback!</p>
          <p className="flex items-center gap-0.5 text-turmeric-400" aria-label={`${order.rating.stars} out of 5 stars`}>
            {Array.from({ length: 5 }, (_, i) => (
              <Star key={i} className={cn('size-4', i < order.rating!.stars ? 'fill-current' : 'text-ivory-300')} />
            ))}
          </p>
        </div>
      </section>
    );
  }

  const shown = hover || stars;
  return (
    <section className="rounded-[1.75rem] border border-line bg-white p-5 sm:p-6" aria-labelledby="rate-h">
      <h2 id="rate-h" className="font-display text-2xl font-semibold text-forest-900">How was your order?</h2>
      <p className="mt-1 text-sm text-charcoal-500">Your rating helps Brio Cart keep every basket fresh.</p>
      <div className="mt-4 flex items-center gap-1" role="radiogroup" aria-label="Rating" onMouseLeave={() => setHover(0)}>
        {Array.from({ length: 5 }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={stars === n}
            aria-label={`${n} star${n > 1 ? 's' : ''}`}
            onMouseEnter={() => setHover(n)}
            onClick={() => setStars(n)}
            className="rounded-full p-1 transition-transform hover:scale-110 active:scale-95"
          >
            <Star className={cn('size-9 transition-colors', n <= shown ? 'fill-turmeric-400 text-turmeric-400' : 'text-ivory-300')} />
          </button>
        ))}
        <span className="ml-2 text-sm font-bold text-charcoal-700">{LABELS[shown]}</span>
      </div>
      {stars > 0 && (
        <>
          <div className="mt-5" data-testid="rate-items">
            <p className="text-sm font-extrabold text-charcoal-700">Rate the quality of each item <span className="font-semibold text-charcoal-400">(optional)</span></p>
            <ul className="mt-2 divide-y divide-line rounded-2xl border border-line">
              {order.items.filter((it) => it.productId).map((it) => (
                <li key={it.id} className="flex flex-wrap items-center gap-3 p-3">
                  <span className="min-w-0 flex-1 text-sm font-bold">
                    {it.productName} <span className="font-semibold text-charcoal-500">· {it.variantLabel}</span>
                  </span>
                  <span className="flex" role="radiogroup" aria-label={`Quality of ${it.productName}`}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        role="radio"
                        aria-checked={itemStars[it.id] === n}
                        aria-label={`${it.productName}: ${n} star${n > 1 ? 's' : ''}`}
                        onClick={() => setItemStars((m) => ({ ...m, [it.id]: n }))}
                        className="rounded-full p-0.5 transition-transform hover:scale-110"
                      >
                        <Star className={cn('size-6', n <= (itemStars[it.id] ?? 0) ? 'fill-turmeric-400 text-turmeric-400' : 'text-ivory-300')} />
                      </button>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={500}
            rows={2}
            placeholder="Anything we should know? (optional)"
            className="mt-4 w-full rounded-2xl border border-line p-3 text-sm focus:border-leaf-500 focus:outline-none focus:ring-4 focus:ring-leaf-500/15"
            aria-label="Feedback"
          />
          <Button className="mt-3" loading={rate.isPending} onClick={() => rate.mutate()}>
            Submit rating
          </Button>
          {rate.error && <p className="mt-2 text-sm font-semibold text-tomato-500">{(rate.error as Error).message}</p>}
        </>
      )}
    </section>
  );
}
