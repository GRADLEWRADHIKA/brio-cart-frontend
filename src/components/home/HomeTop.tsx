import { Link } from 'react-router-dom';
import { BadgePercent, Boxes, Gift, PartyPopper, ShoppingBasket, Sparkles, type LucideIcon } from 'lucide-react';
import { useCategories } from '@/hooks/useStoreInfo';
import { LocationPicker } from '@/components/layout/LocationPicker';
import { SearchBox } from '@/components/layout/SearchBox';
import { ProductImage } from '@/components/ui/misc';
import { tintFor } from '@/components/products/tints';
import { mainCategories } from '@/utils/categories';
import { cn } from '@/utils';
import { assetUrl } from '@/config/env';

/** Icon and colour for categories that have no picture yet. */
const ART: Array<{ match: RegExp; Icon: LucideIcon; plate: string }> = [
  { match: /wholesale|bulk/, Icon: Boxes, plate: 'bg-[#e7eefc] text-[#2b4c8c]' },
  { match: /gift/, Icon: Gift, plate: 'bg-[#fde8ef] text-[#a3245a]' },
  { match: /festiv|diwali|holi/, Icon: PartyPopper, plate: 'bg-turmeric-100 text-[#8a5a00]' },
  { match: /personal|care|beauty/, Icon: Sparkles, plate: 'bg-[#efe9fb] text-[#5b3aa6]' },
  { match: /clearance|sale|offer/, Icon: BadgePercent, plate: 'bg-tomato-100 text-tomato-500' },
];
const artFor = (slug: string) => ART.find((a) => a.match.test(slug)) ?? { Icon: ShoppingBasket, plate: 'bg-mint-100 text-forest-700' };

/**
 * Top of the front page: location and search (phones; the header has them on bigger screens),
 * then a row of category tiles. Staff choose the tiles and can schedule festival ones by date.
 */
export function HomeTop() {
  const { data: categories, isLoading } = useCategories();
  const tiles = mainCategories(categories)
    .filter((c) => c.onHome ?? true)
    .map((c) => {
      const art = artFor(c.slug);
      return { key: c.id, to: `/shop?category=${c.slug}`, name: c.name, image: c.coverUrl ?? c.imageUrl, plate: c.coverUrl || c.imageUrl ? tintFor(c.slug).plate : art.plate, Icon: art.Icon };
    });
  // Daily Essentials is a hand-picked collection rather than a category; it sits third, as in the store's list.
  tiles.splice(Math.min(2, tiles.length), 0, { key: 'essentials', to: '/shop?collection=essentials', name: 'Daily Essentials', image: assetUrl('/uploads/products/onion.webp'), plate: 'bg-turmeric-100', Icon: ShoppingBasket });

  return (
    <section className="container-page pt-4 sm:pt-6" aria-label="Shop by category">
      <div className="space-y-3 md:hidden">
        <LocationPicker />
        <SearchBox />
      </div>
      <div className="mt-4 flex items-baseline justify-between md:mt-0">
        <h2 className="font-sans text-sm font-extrabold uppercase tracking-widest text-charcoal-500">Shop by category</h2>
        <Link to="/shop" className="text-sm font-bold text-forest-700 hover:underline">
          See all
        </Link>
      </div>
      <ul className="no-scrollbar -mx-4 mt-3 flex gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-4 sm:overflow-visible sm:px-0 lg:grid-cols-8" data-testid="home-category-tiles">
        {isLoading
          ? Array.from({ length: 6 }, (_, i) => <li key={i} className="skeleton h-32 w-24 shrink-0 rounded-3xl sm:w-auto" />)
          : tiles.map((c) => (
              <li key={c.key} className="w-24 shrink-0 sm:w-auto">
                <Link to={c.to} className="group flex flex-col items-center gap-2 text-center">
                  <span className={cn('grid aspect-square w-full place-items-center overflow-hidden rounded-3xl p-2 transition duration-300 group-hover:-translate-y-1 group-hover:shadow-lift', c.plate)}>
                    {c.image ? (
                      <ProductImage src={c.image} alt="" className="size-full rounded-2xl transition-transform duration-500 group-hover:scale-105" />
                    ) : (
                      // No picture yet (a new category without products): a drawn icon instead of an empty box.
                      <c.Icon className="size-1/2 transition-transform duration-500 group-hover:scale-110" strokeWidth={1.6} aria-hidden />
                    )}
                  </span>
                  <span className="line-clamp-2 text-[0.8rem] font-extrabold leading-tight text-charcoal-900 sm:text-sm">{c.name}</span>
                </Link>
              </li>
            ))}
        <li aria-hidden className="w-1 shrink-0 sm:hidden" />
      </ul>
    </section>
  );
}
