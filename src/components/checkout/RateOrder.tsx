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
  const rate = useMutation({
    mutationFn: () => orderApi.rate(order.orderNumber, stars, comment.trim() || undefined, accessKey),
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
